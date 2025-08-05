'use server';

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { PostHog } from "posthog-node";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export async function reportUser(listingId: string, ownerId: string) {
  const supabase = await getSupabaseServer();

  // Ensure a user is logged in to report
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to report a user." };
  }

  // Flag the profile
  const { error } = await supabase
    .from("profiles")
    .update({ is_flagged: true })
    .eq("id", ownerId);

  if (error) {
    logger.error({ error, ownerId, listingId }, "Error flagging user");
    return { error: "Failed to report user." };
  }

  // Track event with PostHog
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthogKey) {
    logger.warn("PostHog key not configured, skipping event tracking");
    return { success: "User has been reported for review." };
  }
  const posthog = new PostHog(posthogKey);
  try {
    posthog.capture({
      distinctId: user.id,
      event: 'user_reported',
      properties: {
        reported_user_id: ownerId,
        reporting_user_id: user.id,
        listing_id: listingId,
      },
    });
  } finally {
    await posthog.shutdown();
  }

  return { success: "User has been reported for review." };
}

export async function toggleSaveListing(listingId: string, userId: string) {
  const supabase = await getSupabaseServer();

  const { data: savedListing, error: fetchError } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 means no rows found, which is fine.
    return { success: false, error: 'Failed to check saved status.' };
  }

  if (savedListing) {
    // Unsave the listing
    const { error: deleteError } = await supabase
      .from('saved_listings')
      .delete()
      .eq('id', savedListing.id);

    if (deleteError) {
      return { success: false, error: 'Failed to unsave listing.' };
    }

    revalidatePath(`/listings/${listingId}`);
    return { success: true, saved: false };
  } else {
    // Save the listing
    const { error: insertError } = await supabase
      .from('saved_listings')
      .insert({ listing_id: listingId, user_id: userId });

    if (insertError) {
      return { success: false, error: 'Failed to save listing.' };
    }

    revalidatePath(`/listings/${listingId}`);
    return { success: true, saved: true };
  }
}

export async function isListingSaved(listingId: string, userId: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return false;
  }

  return !!data;
}
