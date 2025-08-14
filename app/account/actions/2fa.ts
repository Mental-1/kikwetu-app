"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

type Enable2FAResponse = 
  | { success: true; message: string; qrCode: string; secret: string; } 
  | { success: false; message: string; qrCode: null; secret: null; };

export async function enable2FA(): Promise<Enable2FAResponse> {
  const supabase = await getSupabaseServer();
  // Add the 2FA enrollment logic here directly
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });
  
  if (enrollError) {
    return {
      success: false,
      message: "Failed to enroll 2FA.",
      qrCode: null,
      secret: null,
    };
  }

  if (!enrollData?.totp?.qr_code || !enrollData?.totp?.secret || !enrollData.id) {
    return {
      success: false,
      message: "Failed to enroll 2FA: Missing QR code or secret.",
      qrCode: null,
      secret: null,
    };
  }

  return {
    success: true,
    message: "Scan the QR code with your authenticator app and enter the code to verify.",
    qrCode: enrollData.totp.qr_code,
    secret: enrollData.totp.secret,
  };
}

export async function verify2FA(code: string) {
  const supabase = await getSupabaseServer();
  // Add the verification logic here directly
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return { success: false, message: 'Failed to verify 2FA.' };
  }
  
  const unverifiedFactor = factorsData.totp.find(f => f.status === 'unverified');
  if (!unverifiedFactor) {
    return { success: false, message: "No pending 2FA factor found." };
  }
  
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: unverifiedFactor.id,
    code,
  });

  if (verifyError) {
    return {
      success: false,
      message: verifyError.message || "Invalid verification code. Please try again.",
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
    console.error('Could not list MFA factors:', factorsError);
    return { success: false, message: 'Failed to disable 2FA. Please try again.' };
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
    console.error('Invalid verification code:', challengeError);
    return { success: false, message: 'Invalid verification code. Please try again.' };
  }

  const { error: unenrollError } = await supabase.auth.mfa.unenroll({
    factorId: verifiedFactor.id,
  });

  if (unenrollError) {
    console.error('Failed to unenroll 2FA:', unenrollError);
    return {
      success: false,
      message: 'Failed to disable 2FA. Please try again.',
    };
  }

  revalidatePath("/account");
  return {
    success: true,
    message: "2FA has been successfully disabled.",
  };
}