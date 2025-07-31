"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function enable2FA() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });
  console.log("Supabase MFA Enroll Data:", data);

  if (error) {
    console.error("Enable 2FA error:", error);
    return { success: false, message: error.message, qrCode: null };
  }

  // Ensure data and data.totp exist before accessing qr_code
  if (!data || !data.totp) {
    return {
      success: false,
      message: "Failed to get QR code for 2FA.",
      qrCode: null,
    };
  }

  return {
    success: true,
    message: "Scan QR code to enable 2FA.",
    qrCode: data.totp.qr_code,
  };
}

export async function verify2FA(code: string) {
  const supabase = await getSupabaseServer();
  const { data, error: fetchError } = await supabase.auth.mfa.listFactors();

  if (fetchError || !data || !data.all) {
    console.error("Fetch factors error:", fetchError);
    return {
      success: false,
      message: fetchError?.message || "Failed to fetch factors",
    };
  }

  const totpFactor = data.all.find(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified",
  );

  if (!totpFactor) {
    return { success: false, message: "No unverified TOTP factor found." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totpFactor.id,
    code,
  });

  if (error) {
    console.error("Verify 2FA error:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "2FA enabled successfully." };
}

export async function disable2FA(code: string) {
  const supabase = await getSupabaseServer();
  const { data, error: fetchError } = await supabase.auth.mfa.listFactors();

  if (fetchError || !data || !data.all) {
    console.error("Fetch factors error:", fetchError);
    return {
      success: false,
      message: fetchError?.message || "Failed to fetch factors",
    };
  }

  const totpFactor = data.all.find(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

  if (!totpFactor) {
    return { success: false, message: "No verified TOTP factor found." };
  }

  // Before un-enrolling, verify the code
  const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totpFactor.id,
    code,
  });

  if (challengeError) {
    console.error("2FA challenge error during disable:", challengeError);
    return { success: false, message: challengeError.message };
  }

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: totpFactor.id,
  });

  if (error) {
    console.error("Disable 2FA error:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "2FA disabled successfully." };
}
