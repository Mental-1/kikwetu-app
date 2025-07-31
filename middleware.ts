import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware that enforces Supabase authentication and route protection in a Next.js application.
 *
 * Assigns a unique request ID to each incoming request, synchronizes authentication cookies, and restricts access to protected routes. Unauthenticated users attempting to access protected routes are redirected to the authentication page with a redirect parameter. Authenticated users are redirected away from authentication pages to the main dashboard.
 */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Admin route protection
  if (path.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/auth", request.url);
      redirectUrl.searchParams.set("redirectTo", path);
      return NextResponse.redirect(redirectUrl);
    }

    // Check for admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      // Redirect non-admins to the home page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const protectedRoutes = ["/dashboard", "/account", "/messages", "/settings"];

  if (protectedRoutes.some((r) => path.startsWith(r)) && !user) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
