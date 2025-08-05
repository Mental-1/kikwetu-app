import "server-only";
import { getSupabaseServer } from "@/utils/supabase/server";

import { validate as isValidUUID } from 'uuid';

export async function getListingById(id: string) {
  if (!id || !isValidUUID(id)) {
    console.error("Invalid listing ID format:", id);
    return null;
  }

  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `*,
      category:categories(*),
      profiles(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Failed to fetch listing with ID "${id}":`, error);
    return null;
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("*, profiles(full_name, avatar_url)")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    console.error(`Failed to fetch reviews for listing ID "${id}":`, reviewsError);
    // We can still return the listing data even if reviews fail to load
  }

  if (!data) {
    console.warn(`No listing found with ID "${id}"`);
    return null;
  }

  // Supabase returns related tables as arrays, even for a single related record.
  // We need to transform the data to match our Listing type.
  const transformedData = {
    ...data,
    category: Array.isArray(data.category) ? data.category[0] : data.category,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
    reviews: reviews || [],
  };

  return transformedData;
}
