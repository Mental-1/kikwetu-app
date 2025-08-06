import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// This route is used for manually checking the status of a transaction.
// It is called by the payment page when a user clicks the "I have paid" button.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkoutRequestId = searchParams.get("checkoutRequestId");

  if (!checkoutRequestId) {
    return NextResponse.json({ error: "checkoutRequestId is required" }, { status: 400 });
  }

  const supabase = await getSupabaseRouteHandler(cookies);
  try {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("status")
      .eq("checkout_request_id", checkoutRequestId)
      .single();

    if (error || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ status: transaction.status });

  } catch (error) {
      console.error("Error fetching transaction status:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
