import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
/**
 * Handles a GET request to process expired listings via a Supabase RPC, requiring authorization.
 *
 * Verifies the request using a secret token, then invokes the "handle_expired_listings" RPC to process expired listings in the database. Returns a JSON response indicating success or an appropriate error message.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await getSupabaseRouteHandler(cookies);

    const { error } = await supabase.rpc("handle_expired_listings");

    if (error) {
      console.error("Error handling expired listings:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Expired listings processed successfully",
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
