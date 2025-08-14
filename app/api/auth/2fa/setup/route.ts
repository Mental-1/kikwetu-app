
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await getSupabaseRouteHandler(cookies);

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!data?.totp?.qr_code || !data?.totp?.secret || !data.id) {
    return new Response(JSON.stringify({ error: "Failed to enroll 2FA." }), { status: 500 });
  }

  const { qr_code, secret } = data.totp;
  const factor_id = data.id;

  cookieStore.set('2fa_factor_id', factor_id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', sameSite: 'strict' });

  return new Response(JSON.stringify({ qrCode: qr_code, secret: secret }), {
    headers: { "Content-Type": "application/json" },
  });
}
