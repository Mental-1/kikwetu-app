"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { AppError } from "@/utils/errorhandler";

/**
 * Checks whether a user has exceeded the allowed number of active listings based on their subscription plan.
 *
 * Throws an error if the user has reached or surpassed their plan's active listing limit, or if plan information cannot be determined.
 *
 * @param userId - The unique identifier of the user to check
 * @returns An object containing the maximum allowed listings (`maxListings`) and the current count of active listings (`activeListings`)
 */
export async function checkUserPlanLimit(userId: string) {
  const supabase = await getSupabaseServer();

  const { count: activeListings, error: countError } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (countError) {
    throw new AppError("Failed to fetch listings", 500, "FETCH_ERROR");
  }

  const { data: latestListing, error: listingError } = await supabase
    .from("listings")
    .select("plan_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (listingError || !latestListing?.plan_id) {
    throw new AppError("Could not determine active plan", 400, "NO_PLAN_FOUND");
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("max_listings")
    .eq("id", latestListing.plan_id)
    .single();

  if (planError || plan?.max_listings == null) {
    throw new AppError(
      "Plan is invalid or missing max listing count",
      400,
      "INVALID_PLAN",
    );
  }

  if ((activeListings || 0) >= plan.max_listings) {
    throw new AppError(
      `You have reached your limit of ${plan.max_listings} active listings for your plan.`,
      403,
      "LISTING_LIMIT_EXCEEDED",
    );
  }

  return {
    maxListings: plan.max_listings,
    activeListings: activeListings || 0,
  };
}
// //TODO: {*/
// // + // Alternative: Single query with JOIN
// + const { data: planData, error: planError } = await supabase
// +   .from("user_subscriptions")
// +   .select(`
// +     plan_id,
// +     plans!inner(max_listings)
// +   `)
// +   .eq("user_id", userId)
// +   .eq("status", "active")
// +   .single();
// //
// - const { data: latestListing, error: listingError } = await supabase
// -   .from("listings")
// -   .select("plan_id")
// -   .eq("user_id", userId)
// -   .order("created_at", { ascending: false })
// -   .limit(1)
// -   .single();
// -
// - if (listingError || !latestListing?.plan_id) {
// -   throw new AppError("Could not determine active plan", 400, "NO_PLAN_FOUND");
// - }
// + const { data: userSubscription, error: subscriptionError } = await supabase
// +   .from("user_subscriptions")
// +   .select("plan_id")
// +   .eq("user_id", userId)
// +   .eq("status", "active")
// +   .single();
// +
// + if (subscriptionError || !userSubscription?.plan_id) {
// +   throw new AppError("Could not determine active plan", 400, "NO_PLAN_FOUND");
// + }
//  /*}
