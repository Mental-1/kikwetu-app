import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { serializeCookieHeader } from "@supabase/ssr";

type Schema = Database["public"];

/** SSR client for Server Components (read-only cookies) */
export async function getSupabaseServer(): Promise<SupabaseClient<Schema>> {
  const cookieStore = await nextCookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }

  const client = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: async () => await cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
  // *This cast is the magic bullet:*
  return client as unknown as SupabaseClient<Schema>;
}

/** Route Handler client */
export async function getSupabaseRouteHandler(
  cookiesFn: typeof nextCookies,
): Promise<SupabaseClient<Schema>> {
  const cookieStore = await cookiesFn();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }

  const client = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: async () => await cookieStore.getAll(),
        setAll: (c) =>
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
  return client as unknown as SupabaseClient<Schema>;
}

/** Middleware client */
export function getSupabaseMiddleware(request: Request): {
  supabase: SupabaseClient<Schema>;
  response: Response;
} {
  const response = new Response();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const map = new Map<string, string>();
          request.headers
            .get("cookie")
            ?.split(";")
            .forEach((c) => {
              const [n, v] = c.trim().split("=");
              if (n && v) map.set(n, decodeURIComponent(v));
            });
          return Array.from(map.entries()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll: (c) =>
          c.forEach(({ name, value, options }) =>
            response.headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            ),
          ),
      },
    },
  );
  return {
    supabase: client as unknown as SupabaseClient<Schema>,
    response,
  };
}

/** Service Role client */
export function getSupabaseServiceRole(): SupabaseClient<Schema> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
  return client as unknown as SupabaseClient<Schema>;
}
