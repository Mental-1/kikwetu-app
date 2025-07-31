"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function updateEmail(newEmail: string) {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });
  
    if (error) {
      console.error("Email update error:", error);
      return { success: false, message: error.message };
    }
  
    // Supabase sends a verification email to the new address.
    // The user will remain logged in with the old email until verified.
    return { success: true, message: "Verification email sent to your new address. Please verify to complete the change." };
  }
  