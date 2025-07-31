"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function getAccountData() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formData: null };
  }

  const { data: formData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to fetch user profile", error);
    return { formData: null };
  }

  return { formData };
}
