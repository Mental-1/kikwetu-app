import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const { factorId, challengeId, code } = await req.json();

  if (!factorId || !challengeId || !code) {
    return NextResponse.json(
      { error: "Factor ID, challenge ID, and code are required" },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      console.error("2FA verification error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: data });
  } catch (error) {
    console.error("Unexpected error during 2FA verification:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
