"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function deleteAccount() {
  try {
    const response = await fetch("/api/account", {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete account");
    }
    return { success: true, message: "Your account has been deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Could not delete your account." };
  }
}
