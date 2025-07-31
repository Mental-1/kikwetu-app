import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type IncrementListingViewsResult = {
  views: number;
};
type IncrementListingViewsArg = {
  Args: { listing_id: string };
  Returns: undefined;
};

/**
 * Handles a POST request to increment the view count of a listing by its ID.
 *
 * Increments the view count for the specified listing using a Supabase remote procedure call. Returns the updated view count on success, or an error response if the listing is not found or a server/database error occurs.
 *
 * @param request - The incoming HTTP request
 * @param params - An object containing the listing ID as `id`
 * @returns A JSON response with the updated view count or an error message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseRouteHandler(cookies);

    // Increment view count using RPC function
    const { data, error } = await supabase.rpc("increment_listing_views", {
      listing_uuid: id,
    });

    if (error) {
      return NextResponse.json({ error: "Database Error" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, views: data[0].views });
  } catch (error) {
    console.error("Error in view endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
