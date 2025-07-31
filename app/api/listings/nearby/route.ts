import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Handles GET requests to retrieve active listings near specified geographic coordinates within a given radius.
 *
 * Accepts `lat`, `lng`, and `radius` as query parameters, returning listings within the radius (in kilometers) of the provided latitude and longitude. If the optimized RPC call fails, falls back to a manual geospatial query, and finally to recent listings if necessary. Returns a JSON response containing the listings or an error message.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);

    // Input validation
    const url = new URL(request.url);
    const lat = Number.parseFloat(url.searchParams.get("lat") || "0");
    const lng = Number.parseFloat(url.searchParams.get("lng") || "0");
    const radius = Number.parseFloat(url.searchParams.get("radius") || "3");
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json(
        { error: "Invalid latitude, longitude, or radius" },
        { status: 400 },
      );
    }

    // Convert radius from km to meters
    const radiusMeters = radius * 1000;

    // Try to use the RPC function if available
    try {
      const { data, error } = await supabase.rpc("get_listings_within_radius", {
        user_latitude: lat,
        user_longitude: lng,
        radius_km: radius,
      });

      if (!error) {
        return NextResponse.json({ listings: data });
      }

      // If RPC fails, fall back to manual calculation
      console.warn(
        "RPC function failed, falling back to manual calculation:",
        error,
      );
    } catch (err) {
      console.warn("RPC function not available, using manual calculation");
    }

    // Manual calculation using PostgreSQL's earth_distance
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        earth_distance(
          ll_to_earth(latitude, longitude),
          ll_to_earth(${lat}, ${lng})
        ) as distance
      `,
      )
      .eq("status" as const, "active" as const)
      .lt(
        `earth_distance(
          ll_to_earth(latitude, longitude),
          ll_to_earth(${lat}, ${lng})
        )`,
        radiusMeters,
      )
      .order(
        `earth_distance(
          ll_to_earth(latitude, longitude),
          ll_to_earth(${lat}, ${lng})
        )`,
        { ascending: true },
      )
      .limit(50);

    if (error) {
      console.error("Error fetching nearby listings:", error);

      // Final fallback - just get recent listings
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch listings" },
          { status: 500 },
        );
      }

      return NextResponse.json({ listings: fallbackData });
    }

    return NextResponse.json({ listings: data });
  } catch (error) {
    console.error("Error in nearby listings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
