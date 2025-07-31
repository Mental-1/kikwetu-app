import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "enable": {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) {
        console.error("Enable 2FA error:", error);
        return NextResponse.json(
          { success: false, message: error.message, qrCode: null },
          { status: 500 },
        );
      }

      if (!data || !data.totp) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to get QR code for 2FA.",
            qrCode: null,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Scan QR code to enable 2FA.",
        qrCode: data.totp.qr_code,
      });
    }

    case "disable": {
      const { code: disableCode } = body;
      const { data: factorsDataDisable, error: fetchErrorDisable } =
        await supabase.auth.mfa.listFactors();

      if (fetchErrorDisable || !factorsDataDisable || !factorsDataDisable.all) {
        console.error("Fetch factors error:", fetchErrorDisable);
        return NextResponse.json(
          {
            success: false,
            message: fetchErrorDisable?.message || "Failed to fetch factors",
          },
          { status: 500 },
        );
      }

      const totpFactorDisable = factorsDataDisable.all.find(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "verified",
      );

      if (!totpFactorDisable) {
        return NextResponse.json(
          { success: false, message: "No verified TOTP factor found." },
          { status: 400 },
        );
      }

      const { error: challengeErrorDisable } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: totpFactorDisable.id,
          code: disableCode,
        });

      if (challengeErrorDisable) {
        console.error(
          "2FA challenge error during disable:",
          challengeErrorDisable,
        );
        return NextResponse.json(
          { success: false, message: challengeErrorDisable.message },
          { status: 400 },
        );
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactorDisable.id,
      });

      if (unenrollError) {
        console.error("Disable 2FA error:", unenrollError);
        return NextResponse.json(
          { success: false, message: unenrollError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "2FA disabled successfully.",
      });
    }
    case "verify": {
      const { token } = body;
      const { data: factorsDataVerify, error: fetchErrorVerify } =
        await supabase.auth.mfa.listFactors();

      if (fetchErrorVerify || !factorsDataVerify || !factorsDataVerify.all) {
        console.error("Fetch factors error:", fetchErrorVerify);
        return NextResponse.json(
          {
            success: false,
            message: fetchErrorVerify?.message || "Failed to fetch factors",
          },
          { status: 500 },
        );
      }

      const totpFactorVerify = factorsDataVerify.all.find(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "unverified",
      );

      if (!totpFactorVerify) {
        return NextResponse.json(
          { success: false, message: "No unverified TOTP factor found." },
          { status: 400 },
        );
      }

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify(
        {
          factorId: totpFactorVerify.id,
          code: token,
        },
      );

      if (verifyError) {
        console.error("Verify 2FA error:", verifyError);
        return NextResponse.json(
          { success: false, message: verifyError.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "2FA enabled successfully.",
      });
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
