"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
) {
  const supabase = await getSupabaseServer();
  const { data: userResponse, error: userError } = await supabase.auth.getUser();

  if (userError || !userResponse.user || !userResponse.user.email) {
    return { success: false, message: "Authentication required or user email not found." };
  }

  const userEmail = userResponse.user.email;

  // Re-authenticate the user with their current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });

  if (signInError) {
    console.error("Re-authentication failed:", signInError);
    return { success: false, message: "Incorrect current password." };
  }

  // Proceed with password update only if re-authentication succeeds
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Password update error:", error);
    return { success: false, message: error.message };
  }

  // Sign out the user after successful password change
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error("Error signing out after password change:", signOutError);
    return { success: false, message: "Password updated, but failed to log out. Please log out manually." };
  }

  return { success: true, message: "Password updated successfully. Please log in with your new password." };
}
