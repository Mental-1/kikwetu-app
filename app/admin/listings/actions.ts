"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PostHog } from "posthog-node";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

type ActionResponse = { success: string } | { error: string };

// Example: Update a listing's status (e.g., to 'approved' or 'rejected')
export async function updateListingStatus(listingId: string, status: string): Promise<ActionResponse> {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthogKey) {
    logger.error('NEXT_PUBLIC_POSTHOG_KEY is required for analytics');
    return { error: "Configuration error." };
  }
  const posthog = new PostHog(posthogKey);
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("listings")
    .update({ status: status })
    .eq("id", listingId);

  if (error) {
    logger.error({ error, listingId, status }, "Error updating listing status");
    return { error: "Failed to update listing." };
  }

  revalidatePath("/admin/listings");

  // Track event with PostHog
  try {
    posthog.capture({
      distinctId: "system",
      event: "listing_moderated",
      properties: {
        listing_id: listingId,
        status: status,
      },
    });
  } finally {
    await posthog.shutdown();
  }

  return { success: "Listing status updated." };
}
export async function approveListing(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing listing ID" };
  return await updateListingStatus(id, "approved");
}

export async function rejectListing(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing listing ID" };
  return await updateListingStatus(id, "rejected");
}
