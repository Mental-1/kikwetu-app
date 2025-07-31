"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function requestReReview(listingId: string) {
  const supabase = await getSupabaseServer();

  // 1. Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required. Please log in." };
  }

  // 2. Fetch listing and verify ownership
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("id, user_id, status")
    .eq("id", listingId)
    .single();

  if (fetchError || !listing) {
    console.error("Error fetching listing for re-review:", fetchError);
    return { error: "Listing not found or you do not have permission to access it." };
  }

  if (listing.user_id !== user.id) {
    return { error: "Unauthorized: You do not own this listing." };
  }

  // 3. Validate current status for re-review eligibility
  if (listing.status === "active" || listing.status === "pending") {
    return { error: `Listing is already ${listing.status}. Re-review not needed.` };
  }

  // 4. Proceed with status update
  const { error: updateError } = await supabase
    .from("listings")
    .update({ status: "pending" })
    .eq("id", listingId);

  if (updateError) {
    console.error("Error updating listing status for re-review:", updateError);
    return { error: "Failed to request re-review due to an update error." };
  }

  revalidatePath("/dashboard/listings");
  return { success: "Re-review requested successfully. Listing is now pending." };
}