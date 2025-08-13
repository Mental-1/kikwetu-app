import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const listingId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10); // Default pageSize to 10

  logger.info({ listingId, page, pageSize }, "Fetching reviews for listing");

  try {
    const supabase = await getSupabaseRouteHandler(cookies);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;

    const { data: reviews, error, count } = await supabase
      .from("reviews")
      .select(
        `
        id,
        rating,
        review,
        created_at,
        reviewer:profiles(id, username, avatar_url)
      `,
        { count: "exact" },
      )
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      logger.error({ error }, "Error fetching reviews");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count || 0;
    const hasMore = endIndex + 1 < totalCount;

    return NextResponse.json({
      data: reviews,
      totalCount,
      hasMore,
    });
  } catch (error) {
    logger.error({ error }, "Unhandled error fetching reviews");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const listingId = params.id;
  logger.info({ listingId }, "Submitting review for listing");

  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error({ authError }, "Unauthorized review submission");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }
    if (typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        reviewer_id: user.id,
        listing_id: listingId,
        rating: rating,
        review: comment,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Error inserting review");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info({ reviewId: data.id }, "Review submitted successfully");
    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    logger.error({ error }, "Unhandled error submitting review");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}