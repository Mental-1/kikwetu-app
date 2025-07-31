"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PostHog } from "posthog-node";

let posthogClient: PostHog | undefined;

function getPosthogClient() {
  if (!posthogClient) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) {
      console.error('NEXT_PUBLIC_POSTHOG_KEY is required for analytics');
      throw new Error("Configuration error.");
    }
    posthogClient = new PostHog(posthogKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return posthogClient;
}

async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
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

export async function updateUserRole(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;
  const supabase = await getSupabaseAdmin();
  const posthog = getPosthogClient();

  // Update the user's role in the profiles table
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user role:", error);
    return { error: "Failed to update user role." };
  }

  revalidatePath("/admin/roles");

  // Track event with PostHog
  posthog.capture({
    distinctId: "system",
    event: "user_role_updated",
    properties: {
      target_user_id: userId,
      new_role: role,
    },
  });

  return { success: "User role has been updated." };
}
