
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = await getSupabaseRouteHandler(cookies);

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const unverifiedFactor = data.totp.find(f => f.status === 'unverified');

  if (!unverifiedFactor) {
    return new Response(JSON.stringify({ error: "No unverified 2FA factor found." }), { status: 404 });
  }

  // The secret is not available from listFactors, so we can't return it.
  // However, we can re-enroll to get a new secret and QR code.
  // This will invalidate the old secret and QR code.
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (enrollError) {
    return new Response(JSON.stringify({ error: enrollError.message }), { status: 500 });
  }

  if (!enrollData?.totp?.qr_code || !enrollData?.totp?.secret || !enrollData.id) {
    return new Response(JSON.stringify({ error: "Failed to enroll 2FA." }), { status: 500 });
  }

  const { qr_code, secret } = enrollData.totp;
  const factor_id = enrollData.id;

  cookieStore.set('2fa_factor_id', factor_id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', sameSite: 'strict' });

  return new Response(JSON.stringify({ qrCode: qr_code, secret: secret }), {
    headers: { "Content-Type": "application/json" },
  });
}
