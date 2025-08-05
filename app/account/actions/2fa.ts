"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function enable2FA() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error) {
    return {
      success: false,
      message: `Failed to enroll 2FA: ${error.message}`,
      qrCode: null,
    };
  }

  return {
    success: true,
    message: "Scan the QR code with your authenticator app and enter the code to verify.",
    qrCode: data.totp.qr_code,
  };
}

export async function verify2FA(code: string) {
  const supabase = await getSupabaseServer();

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return { success: false, message: `Could not list MFA factors: ${factorsError.message}` };
  }

  const unverifiedFactor = factorsData.totp.find(f => f.status === 'unverified');
  if (!unverifiedFactor) {
    return { success: false, message: "No unverified 2FA factor found to verify. Please try enabling it again." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: unverifiedFactor.id,
    code,
  });

  if (error) {
    return {
      success: false,
      message: `Failed to verify 2FA: ${error.message}`,
    };
  }

  revalidatePath("/account");
  return {
    success: true,
    message: "2FA has been successfully enabled.",
  };
}

export async function disable2FA(code: string) {
  const supabase = await getSupabaseServer();

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
      return { success: false, message: `Could not list MFA factors: ${factorsError.message}` };
  }

  const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
  if (!verifiedFactor) {
      return { success: false, message: "No verified 2FA factor found to disable." };
  }

  const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: verifiedFactor.id,
    code,
  });

  if (challengeError) {
    return { success: false, message: `Invalid verification code: ${challengeError.message}` };
  }

  const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
  });

  if (unenrollError) {
      return {
          success: false,
          message: `Failed to unenroll 2FA: ${unenrollError.message}`,
      };
  }

  revalidatePath("/account");
  return {
      success: true,
      message: "2FA has been successfully disabled.",
  };
}