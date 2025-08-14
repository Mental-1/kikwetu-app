import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = await getSupabaseRouteHandler(cookies);
  const { code } = await req.json();

  const factorId = cookies.get("2fa_factor_id")?.value;

  if (!factorId) {
    return NextResponse.json(
      { error: "2FA factor ID not found. Please try again." },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  try {
    const { error: challengeError, data: challengeData } = await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      console.error("2FA challenge error:", challengeError);
      return NextResponse.json({ error: challengeError.message }, { status: 400 });
    }

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error("2FA verification error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    cookieStore.delete("2fa_factor_id");

    return NextResponse.json({ success: true, session: data });
  } catch (error) {
    console.error("Unexpected error during 2FA verification:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
