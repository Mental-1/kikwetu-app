"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export async function getNearbyListings(
  latitude: number,
  longitude: number,
  radius: number,
) {
  // Validate input parameters
  if (latitude < -90 || latitude > 90) {
    throw new Error("Invalid latitude: must be between -90 and 90");
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error("Invalid longitude: must be between -180 and 180");
  }
  if (radius <= 0 || radius > 1000) { // Assuming a reasonable max radius of 1000 km
    throw new Error("Invalid radius: must be between 0 and 1000 km");
  }


  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => {
          return cookieStore.getAll();
        },
      },
    },
  );

  const { data, error } = await supabase.rpc("get_listings_within_radius", {
    lat: latitude,
    long: longitude,
    radius: radius * 1000, // Convert km to meters
  });

  if (error) {
    logger.error({ error, latitude, longitude, radius }, "Error fetching nearby listings");
    return [];
  }

  return data as MapListing[];
}

export interface MapListing {
  id: number;
  title: string;
  price: number;
  image_url: string;
  distance_km: number;
  lat: number;
  lng: number;
}
