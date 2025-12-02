
import { connectToDB } from "@/lib/db/utilsDB";
import dataModels from "@/lib/db/models";
import { mongoose } from "mongoose";

export async function GET(req) {
  try {
    await connectToDB();
    const { Airline, Airport, FlightItinerary, FlightBooking, User } = dataModels;

    // 1. Create Airline
    let airline = await Airline.findOne({ iataCode: "TEST" });
    if (!airline) {
        airline = await Airline.create({
            _id: "TEST",
            iataCode: "TEST",
            name: "Test Airline",
            contact: { phone: "123", email: "test@test.com", website: "test.com" },
            airlinePolicy: { 
                cancellationPolicy: {},
                flightType: "International" // Required field
            }
        });
    }

    // 2. Create Airport
    let airport = await Airport.findOne({ iataCode: "TST" });
    if (!airport) {
        airport = await Airport.create({
            _id: "TST",
            iataCode: "TST",
            name: "Test Airport",
            city: "Test City",
            country: "Test Country",
            timezone: "UTC"
        });
    }

    // 3. Create FlightItinerary
    const date = new Date();
    date.setHours(date.getHours() + 24); // Tomorrow
    
    let flight = await FlightItinerary.findOne({ flightCode: "TEST101" });
    if (!flight) {
        flight = await FlightItinerary.create({
            flightCode: "TEST101",
            date: date,
            carrierInCharge: airline._id,
            departureAirportId: airport._id,
            arrivalAirportId: airport._id,
            segmentIds: [], // Empty for now or create segments if needed
            totalDurationMinutes: 120,
            layovers: [],
            // baggageAllowance is optional - omit it to avoid validation errors
            status: "scheduled",
            expireAt: new Date(Date.now() + 86400000 * 365)
        });
    }

    // 4. Get User
    const user = await User.findOne({});
    if (!user) {
        return Response.json({ success: false, message: "No user found" });
    }

    // 5. Create FlightBooking
    const booking = await FlightBooking.create({
        pnrCode: "PNR" + Date.now(),
        userId: user._id,
        flightItineraryId: flight._id,
        segmentIds: [],
        passengers: [], // Need passengers?
        selectedSeats: [],
        totalFare: 100,
        currency: "USD",
        paymentStatus: "pending",
        ticketStatus: "pending"
    });

    return Response.json({
        success: true,
        bookingId: booking._id,
        flightNumber: flight.flightCode,
        flightDateTimestamp: new Date(flight.date).getTime()
    });

  } catch (error) {
    console.error(error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
