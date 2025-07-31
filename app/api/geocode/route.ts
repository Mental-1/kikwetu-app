import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { z } from "zod";
import { cookies } from "next/headers";

const geocodeSchema = z.object({
  address: z.string().min(1),
});

const reverseGeocodeSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * Processes a geocoding request by converting an address string into geographic coordinates and address components.
 *
 * Accepts a JSON body with an `address` field, validates the input, and checks for a cached geocoding result in Supabase. If not cached, queries the Mapbox API, extracts geocoding data, caches the result, and returns latitude, longitude, formatted address, city, state, country, postal code, and a cache status flag. Responds with a 404 error if the address is not found, or a 500 error if geocoding fails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = geocodeSchema.parse(body);

    const supabase = await getSupabaseRouteHandler(cookies);

    // First check cache
    const { data: cached } = await supabase
      .from("geocoded_locations")
      .select("*")
      .eq("address", address)
      .single();

    if (cached) {
      return NextResponse.json({
        latitude: cached.latitude,
        longitude: cached.longitude,
        formatted_address: cached.formatted_address,
        city: cached.city,
        state: cached.state,
        country: cached.country,
        postal_code: cached.postal_code,
        cached: true,
      });
    }

    // Use external geocoding service
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;
    const formattedAddress = feature.place_name;

    // Extract address components
    const context = feature.context || [];
    let city = null;
    let state = null;
    let country = null;
    let postalCode = null;

    context.forEach((component: any) => {
      if (component.id.startsWith("place")) city = component.text;
      if (component.id.startsWith("region")) state = component.text;
      if (component.id.startsWith("country")) country = component.text;
      if (component.id.startsWith("postcode")) postalCode = component.text;
    });

    // Cache the result
    await supabase.from("geocoded_locations").insert({
      address,
      formatted_address: formattedAddress,
      latitude,
      longitude,
      city,
      state,
      country,
      postal_code: postalCode,
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    return NextResponse.json({
      latitude,
      longitude,
      formatted_address: formattedAddress,
      city,
      state,
      country,
      postal_code: postalCode,
      cached: false,
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}

/**
 * Handles reverse geocoding requests by latitude and longitude.
 *
 * Attempts to retrieve a cached address for the provided coordinates from Supabase. If no cached result is found, queries the Mapbox API for reverse geocoding and returns the formatted address. Returns a 404 error if the location cannot be resolved, or a 500 error on failure.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number.parseFloat(searchParams.get("lat") || "");
    const lng = Number.parseFloat(searchParams.get("lng") || "");

    const { lat: latitude, lng: longitude } = reverseGeocodeSchema.parse({
      lat,
      lng,
    });

    const supabase = await getSupabaseRouteHandler(cookies);

    // Check for nearby cached results
    const { data: cached } = await supabase.rpc("reverse_geocode", {
      lat: latitude,
      lng: longitude,
    });

    if (cached && cached.length > 0) {
      return NextResponse.json(cached[0]);
    }

    // Use external reverse geocoding service
    const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(reverseUrl);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const feature = data.features[0];
    const formattedAddress = feature.place_name;

    return NextResponse.json({
      formatted_address: formattedAddress,
      city: null,
      state: null,
      country: null,
      postal_code: null,
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return NextResponse.json(
      { error: "Reverse geocoding failed" },
      { status: 500 },
    );
  }
}
