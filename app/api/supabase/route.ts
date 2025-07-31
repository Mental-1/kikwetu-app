import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";
import { createRateLimiter } from "@/utils/rate-limiting";
import { createCache } from "@/utils/caching";
import { validateRequest } from "@/lib/request-validation";
import { NextRequest } from "next/server";

const sessionRateLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60000,
});

const sessionCache = createCache({
  ttl: 10000,
  maxSize: 100,
});

export async function GET(request: NextRequest) {
  const validation = await validateRequest(request, {
    method: "GET",
    allowedHeaders: [
      "authorization",
      "content-type",
      "cookie",
      "dnt",
      "referer",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "sec-ch-ua-platform",
      "sec-fetch-dest",
      "sec-fetch-mode",
      "sec-fetch-site",
      "sec-gpc",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-port",
      "x-forwarded-proto",
      "x-request-id",
    ],
  });

  if (!validation.isValid) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.errors },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  if (!sessionRateLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ session: null });
  }

  const cacheKey = `session-${user.id}`;

  const cachedSession = sessionCache.get(cacheKey);
  if (cachedSession) {
    return NextResponse.json({ session: cachedSession });
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to get session from Supabase:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 },
    );
  }

  if (session) {
    sessionCache.set(cacheKey, session);
  }

  return NextResponse.json({ session });
}
