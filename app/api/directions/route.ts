import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const directionsSchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originLat, originLng, destLat, destLng } =
      directionsSchema.parse(body);

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.error("Mapbox token not configured");

      // Fallback to direct map URLs without route calculation
      const googleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`;
      const appleMapsUrl = `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;

      return NextResponse.json({
        route: null,
        externalUrls: {
          googleMaps: googleMapsUrl,
          appleMaps: appleMapsUrl,
        },
        fallback: true,
      });
    }

    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&access_token=${mapboxToken}&overview=full&steps=true`;

    const response = await fetch(mapboxUrl);

    if (!response.ok) {
      console.error("Mapbox API error:", response.status, response.statusText);
      throw new Error("Mapbox API request failed");
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error("No routes found in Mapbox response");
      throw new Error("No route found");
    }

    const route = data.routes[0];

    const googleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`;
    const appleMapsUrl = `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;

    return NextResponse.json({
      route: {
        coordinates: route.geometry.coordinates,
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
      },
      externalUrls: {
        googleMaps: googleMapsUrl,
        appleMaps: appleMapsUrl,
      },
      fallback: false,
    });
  } catch (error) {
    console.error("Directions API error:", error);

    try {
      const body = await request.json();
      const { originLat, originLng, destLat, destLng } =
        directionsSchema.parse(body);

      const googleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`;
      const appleMapsUrl = `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to get directions",
          externalUrls: {
            googleMaps: googleMapsUrl,
            appleMaps: appleMapsUrl,
          },
          fallback: true,
        },
        { status: 200 },
      ); // Return 200 since we have fallback URLs
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request data",
        },
        { status: 400 },
      );
    }
  }
}
