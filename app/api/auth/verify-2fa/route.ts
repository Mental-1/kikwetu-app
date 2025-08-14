import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); // Await cookies() here
  const supabase = await getSupabaseRouteHandler(cookies); // Pass cookies function

  const { code } = await req.json();

  const factorId = cookieStore.get("2fa_factor_id")?.value; // Use cookieStore

  if (!factorId) {
    const response = NextResponse.json(
      { error: "2FA factor ID not found. Please try again." },
      { status: 400 },
    );
    response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
    return response;
  }

  if (!code) {
    const response = NextResponse.json({ error: "Code is required" }, { status: 400 });
    response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
    return response;
  }

  try {
    const { error: challengeError, data: challengeData } = await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      console.error("2FA challenge error:", challengeError);
      const response = NextResponse.json({ error: challengeError.message }, { status: 400 });
      response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
      return response;
    }

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error("2FA verification error:", error);
      const response = NextResponse.json({ error: error.message }, { status: 400 });
      response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
      return response;
    }

    // Delete the cookie by setting it with an expired date
    const response = NextResponse.json({ success: true, session: data });
    response.cookies.set('2fa_factor_id', '', {
      expires: new Date(0),
      path: '/',
    });
    response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
    return response;
  } catch (error) {
    console.error("Unexpected error during 2FA verification:", error);
    const response = NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
    response.cookies.set('2fa_in_progress', '', { expires: new Date(0), path: '/' });
    return response;
  }
}