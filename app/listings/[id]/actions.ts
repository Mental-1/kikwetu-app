"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PostHog } from "posthog-node";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export async function reportUser(listingId: string, ownerId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  );

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

  // Optional: You could also create a notification for admins here

  revalidatePath(`/listings/${listingId}`);

  // Track event with PostHog
  const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!);
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
