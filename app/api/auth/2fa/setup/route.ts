import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); // Await not required, but harmless
  const supabase = await getSupabaseRouteHandler(cookies); // Pass cookies function
  // Guard: Don't enroll if 2FA already enabled
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return NextResponse.json({ error: factorsError.message }, { status: 500 });
  }
  if (factorsData?.totp?.some((f) => f.status === "verified")) {
    return NextResponse.json({ error: "2FA is already enabled." }, { status: 409 });
  }
  const existingUnverified = factorsData?.totp?.find((f) => f.status === "unverified");
  if (existingUnverified) {
    // Optional: clean up the stale unverified factor to avoid confusion
    try {
      await supabase.auth.mfa.unenroll({ factorId: existingUnverified.id });
    } catch (e) {
      // Non-fatal; proceed to enroll a new factor
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.totp?.qr_code || !data?.totp?.secret || !data.id) {
    return NextResponse.json({ error: "Failed to enroll 2FA." }, { status: 500 });
  }

  const { qr_code, secret } = data.totp;
  const factor_id = data.id;

  const response = NextResponse.json({ qrCode: qr_code, secret: secret });
  response.cookies.set('2fa_factor_id', factor_id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', sameSite: 'strict' });
  response.cookies.set('2fa_in_progress', 'true', { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', sameSite: 'strict' });
  return response;
}
