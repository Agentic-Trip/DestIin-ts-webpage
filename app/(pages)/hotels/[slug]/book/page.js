import { BreadcrumbUI } from "@/components/local-ui/breadcrumb";
import { AuthenticationCard } from "@/components/AuthenticationCard";

import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import NotFound from "@/app/not-found";
import routes from "@/data/routes.json";
import { HotelBookingSteps } from "@/components/pages/hotels.book/HotelBookingSteps";
import { getHotel } from "@/lib/services/hotels";
import validateHotelSearchParams from "@/lib/zodSchemas/hotelSearchParams";
import { getUserDetails } from "@/lib/services/user";
import Designation from "@/data/Destination";
import { formatCurrency, formatDateToYYYYMMDD, groupBy } from "@/lib/utils";

export default async function HotelBookPage({ params }) {
  console.log("params", params);
  const session = await auth();
  const loggedIn = !!session?.user;
  const slug = params.slug;

  if (!loggedIn) {
    return (
      <main className="mx-auto my-12 w-[95%] text-secondary">
        <AuthenticationCard />
      </main>
    );
  }

  const searchState = JSON.parse(
    cookies().get("hotelSearchState")?.value || "{}",
  );
  const validate = validateHotelSearchParams(searchState);

  if (!validate.success) {
    return (
      <NotFound
        whatHappened="Error in search state"
        explanation="Sorry, we couldn't retrieve your hotel search context or there was an error in search state. Thus we couldn't retrieve the hotel details. Please search again."
        navigateTo={{ path: routes.hotels.path, title: routes.hotels.title }}
      />
    );
  }

  // const hotelDetails = await getHotel(slug, searchState);
    const payload ={
       "country": Designation.find(des => des.city === searchState.city)?.country || "",
          cityCode: Number(Designation.find(des => des.city === searchState.city)?.code || ""),
      "fromDate": formatDateToYYYYMMDD(new Date(Number(searchState.checkIn))),
      "toDate": formatDateToYYYYMMDD(new Date(Number(searchState.checkOut))),
      "sort": 1,
      "currency": "EUR",
      "occupancy": [
          {
              "adults": searchState?.guests,
              "roomCount": searchState?.rooms,
              "childAges": []
          }
      ],
      "employee_id": "HR-EMP-00001",
  }
    const hotelDetailsRes = await fetch(`${process.env.BACKEND_URL}/hotels/dida/${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const hotelDetailss = await hotelDetailsRes.json();
    console.log("hotelDetailss:", hotelDetailss);
    const hotelDetails = {
      ...hotelDetailss?.data,
      images:hotelDetailss?.data?.thumbnails.map(img=>img?.value),
      rooms: hotelDetailss?.data?.rooms?.map((room) => ({
        ...room,
        hotelId: hotelDetailss?.data?._id || "6746b60b0f952c93060c5715", // Static fallback
      })),
    };

  if (!hotelDetails || Object.keys(hotelDetails).length === 0)
    return notFound();

  const userDetails = await getUserDetails(session.user.id);

  return (
    <>
      <main className="mx-auto my-12 w-[95%] text-secondary">
        <BreadcrumbUI />

        <HotelBookingSteps
          hotelDetails={hotelDetails}
          searchState={searchState}
          userDetails={{
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
            email: userDetails.email,
            phone: userDetails.phoneNumbers?.[0] || {
              dialCode: "",
              number: "",
            },
          }}
        />
      </main>
    </>
  );
}
