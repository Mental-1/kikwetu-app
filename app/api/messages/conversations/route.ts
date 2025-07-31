import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        id,
        encryption_key,
        seller:seller_id(id, username, avatar_url),
        buyer:buyer_id(id, username, avatar_url),
        listing:listing_id(id, title)
      `,
      )
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error fetching conversations:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
