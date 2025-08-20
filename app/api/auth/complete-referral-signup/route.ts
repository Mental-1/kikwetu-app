import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";
import { z } from "zod";

const referralCompletionSchema = z.object({
  new_user_id: z.string().uuid(),
  referrer_code: z.string().min(3).max(50),
});

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json();

  // Validate input first
  const validatedData = referralCompletionSchema.safeParse(body);
  if (!validatedData.success) {
    return NextResponse.json({ error: "Invalid request body", details: validatedData.error.flatten() }, { status: 400 });
  }

  const { new_user_id, referrer_code } = validatedData.data;

  // Then check caller identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== new_user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    // 1. Find the referrer's ID using their referral_code
    const { data: referrerProfile, error: referrerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referrer_code)
      .single();

    if (referrerError || !referrerProfile) {
      console.error("Referrer not found or error fetching referrer:", referrerError);
      // Do not return an error to the client for an invalid referrer code
      // Just proceed without applying referral rewards
      return NextResponse.json({ message: "Referral code not found or invalid, but signup successful." }, { status: 200 });
    }

    const referrer_id = referrerProfile.id;

    // Prevent self-referral
    if (new_user_id === referrer_id) {
      return NextResponse.json({ message: "Self-referral is not allowed." }, { status: 400 });
    }

    // Check if this referral has already been processed for the new user
    // Step 1: Find discount codes created by the referrer
    const { data: referrerDiscountCodes, error: referrerCodesError } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("created_by_user_id", referrer_id);

    if (referrerCodesError) {
      console.error("Error fetching referrer's discount codes:", referrerCodesError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const referrerCodeIds = referrerDiscountCodes.map(code => code.id);
    // Step 2: Check user_applied_codes for new_user_id and any of these code_ids (if any exist)
    let existingReferral: { id: string } | null = null;
    if (referrerCodeIds.length > 0) {
      const { data: existing, error: existingReferralError } = await supabase
        .from("user_applied_codes")
        .select("id")
        .eq("user_id", new_user_id)
        .in("code_id", referrerCodeIds)
        .maybeSingle();
      if (existingReferralError) {
        console.error("Error checking existing referral:", existingReferralError);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
      existingReferral = existing;
    }

    if (existingReferralError) {
      console.error("Error checking existing referral:", existingReferralError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (existingReferral) {
      return NextResponse.json({ message: "Referral already processed for this user." }, { status: 200 });
    }

    // --- Reward New User ---
    // Create a one-time discount code for the new user (e.g., 10% off first purchase)
    const { data: newUserDiscountCode, error: newUserDiscountError } = await supabase
      .from("discount_codes")
      .insert({
        code: `NEWUSER-${new_user_id.substring(0, 8)}-${Date.now().toString(36).slice(-4)}`,
        type: "PERCENTAGE_DISCOUNT",
        value: 10, // 10% off
        max_uses: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 30 days
        created_by_user_id: referrer_id, // Link this code to the referrer
      })
      .select("id")
      .single();

    if (newUserDiscountError) {
      console.error("Error creating new user discount code:", newUserDiscountError);
      throw new Error("Failed to create new user discount.");
    }

    // Record that the new user received this code
    const { error: recordNewUserCodeError } = await supabase
      .from("user_applied_codes")
      .insert({
        user_id: new_user_id,
        code_id: newUserDiscountCode.id,
        // We might need a new column in user_applied_codes to store referrer_id directly
        // For now, created_by_user_id on discount_codes links it.
      });

    if (recordNewUserCodeError) {
      console.error("Error recording new user discount code usage:", recordNewUserCodeError);
      throw new Error("Failed to record new user discount usage.");
    }

    // --- Reward Referrer (e.g., with a $5 fixed discount) ---
    const { data: referrerRewardCode, error: referrerRewardError } = await supabase
      .from("discount_codes")
      .insert({
        code: `REFERRER-${referrer_id.substring(0, 8)}-${Date.now().toString().slice(-5)}`,
        type: "FIXED_AMOUNT_DISCOUNT",
        value: 5, // $5 fixed discount
        max_uses: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 90 days
        created_by_user_id: referrer_id, // Link this code to the referrer
      })
      .select("id")
      .single();

    if (referrerRewardError) {
      console.error("Error creating referrer reward code:", referrerRewardError);
      throw new Error("Failed to create referrer reward.");
    }

    // Record that the referrer received this code
    const { error: recordReferrerCodeError } = await supabase
      .from("user_applied_codes")
      .insert({
        user_id: referrer_id,
        code_id: referrerRewardCode.id,
      });

    if (recordReferrerCodeError) {
      console.error("Error recording referrer reward code usage:", recordReferrerCodeError);
      throw new Error("Failed to record referrer reward usage.");
    }

    return NextResponse.json({ success: true, message: "Referral rewards applied." }, { status: 200 });

  } catch (error) {
    console.error("Error in /api/auth/complete-referral-signup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
