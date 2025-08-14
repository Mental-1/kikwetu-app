import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const CACHE_DURATION = 60 * 5; // 5 minutes
const MAX_CACHE_SIZE = 100;
const cache = new Map();

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.timestamp + CACHE_DURATION * 1000 < now) {
      cache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}
export async function GET(req: NextRequest) {
  cleanupCache();
  const { searchParams } = new URL(req.url);
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = 12;
  const offset = (page - 1) * limit;

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const cacheKey = `transactions-page-${page}-start-${startDate}-end-${endDate}`;

  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    if (cachedData.timestamp + CACHE_DURATION * 1000 > Date.now()) {
      return NextResponse.json(cachedData.data);
    }
  }

  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    let query = supabase
      .from("transactions")
      .select(
        "*, listings:listing_id(id, title)",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 },
      );
    }

    const response = {
      data,
      totalPages: Math.ceil((count || 0) / limit),
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error fetching transactions:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
