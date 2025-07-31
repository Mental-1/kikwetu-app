import "server-only";
import { getSupabaseServer } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function getListingById(id: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      profiles (*),
      category (*),
      reviews (*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch listing:", error);
    // In a real app, you might want to log this error to a service
    return null;
  }

  return data;
}
