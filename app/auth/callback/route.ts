import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Receives a session object from the client and sets the authentication session on the server.
 *
 * Expects a JSON body containing `access_token` and `refresh_token`, which are used to synchronize the session with server-side cookies.
 * @returns A JSON response indicating success.
 */
export async function POST(request: Request) {
  try {
    const session = await request.json();

    // Validate required fields
    if (!session?.access_token || !session?.refresh_token) {
      return NextResponse.json(
        { error: "Missing required session tokens" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseRouteHandler(cookies);

    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting session:", error);
    return NextResponse.json(
      { error: "Failed to set session" },
      { status: 500 },
    );
  }
}

/**
 * Handles Supabase OAuth callbacks by exchanging the authorization code for a session.
 *
 * This function is called by Supabase after a successful OAuth authentication (e.g., Google sign-in).
 * It extracts the 'code' from the URL, exchanges it for a user session, and redirects to the origin.
 *
 * @param request The NextRequest object containing the URL with the 'code' parameter.
 * @returns A redirect response to the origin or an error response.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseRouteHandler(cookies);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
