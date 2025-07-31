import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id: listingId } = await params;
  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 },
      );
    }

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Unexpected error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id: listingId } = await params;
  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, comment } = await request.json();

    if (!rating || !comment) {
      return NextResponse.json(
        { error: "Rating and comment are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        listing_id: listingId,
        user_id: session.user.id,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting review:", error);
      return NextResponse.json(
        { error: "Failed to submit review" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error submitting review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
// laptop okay post ad, mobile not okay ...
// change choose location background color
// listings filter issue hiding new listings ...
// map overlay with nearby listings button
// category filtering issue with search functionality and listings , sortby filter fixes .
//
