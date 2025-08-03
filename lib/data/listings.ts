import "server-only";
import { getSupabaseServer } from "@/utils/supabase/server";

export async function getListingById(id: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `*,
      category:categories(*),
      profiles(*),
      reviews(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch listing:", error);
    // In a real app, you might want to log this error to a service
    return null;
  }

  // Supabase returns related tables as arrays, even for a single related record.
  // We need to transform the data to match our Listing type.
  const transformedData = {
    ...data,
    category: Array.isArray(data.category) ? data.category[0] : data.category,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
  };

  return transformedData;
}
