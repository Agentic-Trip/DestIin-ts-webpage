"use server";

import { cookies } from "next/headers";
import { auth } from "../auth";
import validateGuestForm from "../zodSchemas/hotelGuestsFormValidation";
import { isRoomAvailable } from "../services/hotels";
import { addMinutes } from "date-fns";
import { createManyDocs, createOneDoc } from "../db/createOperationDB";
import { multiRoomCombinedFareBreakDown } from "../helpers/hotels/priceCalculation";
import { ObjectId } from "mongodb";
import { connection } from "mongoose";
import { revalidateTag } from "next/cache";

/**
 * This function is responsible for reserving a hotel room based on the provided booking data.
 *
 * @param {{
 *   guests: Array<Object>,
 *   selectedRooms: Array<Object>
 * }} bookingData - The data required to reserve a hotel room, including guest information,
 * room selection, and any other necessary booking details.
 *
 * @returns {Promise<Object>} - Returns a promise that resolves with the result of the reservation action,
 * which may include confirmation details or error information.
 */

export default async function hotelRoomReserveAction(bookingData) {
  const session = await auth();
  const loggedIn = !!session?.user;
  if (!loggedIn) return { success: false, message: "Please login first" };

  //validation
  const { guests, selectedRooms } = bookingData;
  const searchState = cookies().get("hotelSearchState")?.value;

  const defaultSearchState = JSON.stringify({
    checkIn: new Date().getTime(),
    checkOut: new Date().getTime() + 86400000, // +1 day
    guests: 1,
    rooms: 1,
  });

  const parsedSearchState = JSON.parse(searchState || defaultSearchState);

  let key = 0;
  let err = {};
  let guestsData = {};

  const guestsArr = guests.length
    ? guests
    : Array(parsedSearchState.guests).fill({});

  for (const guestForm of guestsArr) {
    const validate = validateGuestForm(guestForm);
    if (validate.success === false) {
      err = JSON.parse(JSON.stringify(err));
      err[key] = validate.errors;
    }
    if (validate.success) {
      guestsData = JSON.parse(JSON.stringify(guestsData));
      guestsData[key] = validate.data;
    }
    key++;
  }

  let roomsError = {};
  if (!selectedRooms.length) {
    roomsError = { message: "Please select a room" };
  }

  if (Object.keys(err).length || Object.keys(roomsError).length) {
    return {
      success: false,
      errors: { guestInfo: err, roomInfo: roomsError },
      message: "Please fill in all the required fields",
    };
  }

  const reserveredRooms = [];

  for (const room of selectedRooms) {
    const roomId = room?._id;
    const isAvailable = await isRoomAvailable(
      roomId,
      parsedSearchState.checkIn,
      parsedSearchState.checkOut,
    );

    if (!isAvailable) {
      reserveredRooms.push(roomId);
    }
  }

  if (reserveredRooms.length) {
    return {
      success: false,
      message: "Some rooms have already been reserved by other users",
      reservedRooms: reserveredRooms,
    };
  }

  guestsData = Object.values(guestsData);

  const priceBrekdown = multiRoomCombinedFareBreakDown(
    selectedRooms,
    guestsData.length,
  );

  const hotelBookingId = new ObjectId();
  const hotelGuestsObj = guestsData.map((guest) => ({
    _id: new ObjectId(),
    userId: session.user.id,
    hotelBookingId: hotelBookingId,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.isPrimary ? guest.email : null,
    phone: guest.isPrimary ? guest.phone.dialCode + guest.phone.number : null,
    guestType: guest.guestType,
    age: guest.age,
    isPrimary: guest.isPrimary,
  }));

  const bookingObj = {
    _id: hotelBookingId,
    userId: session.user.id,
    hotelId: selectedRooms[0]?.hotelId,
    rooms: selectedRooms
      .map((room) => {
        try {
          return new ObjectId(room._id);
        } catch (e) {
          console.error("Invalid room ID:", room._id);
          return null;
        }
      })
      .filter(id => id !== null),
    checkInDate: new Date(parsedSearchState.checkIn),
    checkOutDate: new Date(parsedSearchState.checkOut),
    guests: hotelGuestsObj.map((guest) => guest._id),
    fareBreakdown: priceBrekdown.fareBreakdowns,
    totalPrice: priceBrekdown.total,
    bookingStatus: "pending",
    paymentStatus: "pending",
    guaranteedReservationUntil: addMinutes(new Date(), 10),
  };

  // Validate that we have at least one valid room
  if (bookingObj.rooms.length === 0) {
    return {
      success: false,
      message: "No valid room IDs found. Please select rooms again.",
    };
  }

  try {
    await createManyDocs("HotelGuest", hotelGuestsObj);
    await createOneDoc("HotelBooking", bookingObj);

    revalidateTag("hotelBookings");
    return {
      success: true,
      message: "Booking created successfully",
    };
  } catch (error) {
    console.error("Error creating booking:", error);

    return {
      success: false,
      message: `Error creating booking: ${error.message}`,
    };
  }
}
