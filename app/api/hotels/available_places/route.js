import { Hotel } from "@/lib/db/models";

// Force dynamic rendering - this route cannot be statically generated
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Log minimal request details
  try {
    console.log("Available places API called", {
      url: req.url,
      method: req.method,
    });
  } catch (logErr) {
    console.log("Available places API called - unable to log request details", String(logErr));
  }

  const searchParams = Object.fromEntries(new URL(req.url).searchParams);

  const limit = Number(searchParams?.limit) || 10;
  const searchQuery = searchParams?.searchQuery?.trim().toLowerCase() || "";

  const Places = [
    { city: "Chennai", country: "IN", code: "553248633981715834" },
    { city: "Delhi", country: "IN", code: "180000" },
    { city: "Bengaluru", country: "IN", code: "553248633981715864" },
  ];

  // Helper function → filter Places list using searchQuery
  const filterPlaces = (query) => {
    if (!query) return Places;

    return Places.filter((place) =>
      place.city.toLowerCase().includes(query) ||
      place.country.toLowerCase().includes(query)
    );
  };

  try {
    // ----------------------------------------
    // CASE 1: No search query → return DB places or default Places
    // ----------------------------------------
    if (!searchQuery) {
      const hotell = await Hotel.find({})
        .limit(limit)
        .select("address -_id")
        .exec();

      const hotels =
        hotell?.length === 0
          ? Places
          : hotell.map((hotel) => ({
              city: hotel.address.city,
              country: hotel.address.country,
              code: hotel.address.code,
            }));

      return Response.json({
        success: true,
        message: "Available places fetched successfully",
        data: hotels.map((h) => ({
          city: h.city,
          country: h.country,
          type: "place",
          code: h.code,
        })),
      });
    }

    // ----------------------------------------
    // CASE 2: Search DB + search Places list
    // ----------------------------------------

    const safeRegex = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Search from MongoDB
    const hotels = await Hotel.find({
      $or: [
        {
          $expr: {
            $regexMatch: {
              input: { $toLower: "$address.city" },
              regex: safeRegex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toLower: "$address.country" },
              regex: safeRegex,
            },
          },
        },
      ],
    })
      .limit(limit)
      .select("address -_id")
      .exec();

    const hotelResults = hotels.map((hotel) => ({
      city: hotel.address.city,
      country: hotel.address.country,
      type: "place",
    }));

    // Search Places list
    const placeResults = filterPlaces(searchQuery).map((p) => ({
      city: p.city,
      country: p.country,
      type: "place",
      code: p.code,
    }));

    // Merge + remove duplicates (object-based to avoid Map usage)
    const combined = [...hotelResults, ...placeResults];
    const keyed = {};
    for (const item of combined) {
      keyed[`${item.city}-${item.country}`] = item;
    }
    const finalData = Object.values(keyed);

    return Response.json({
      success: true,
      message: "Available places fetched successfully",
      data: finalData,
    });
  } catch (e) {
    console.error('Available places API error', e && e.stack ? e.stack : e);
    return Response.json(
      {
        success: false,
        message: "Error getting available places",
      },
      { status: 500 }
    );
  }
}
