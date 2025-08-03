import "server-only";
import { getSupabaseServer } from "@/utils/supabase/server";

export async function getListingById(id: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id, title, description, price, location, latitude, longitude, condition, featured, images, views, created_at, updated_at, category_id, subcategory_id, user_id, negotiable, status, payment_status, plan, expiry_date,
      profiles (id, username, avatar_url),
      category:categories (id, name),
      reviews (id, rating, comment, created_at, user_id)
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
