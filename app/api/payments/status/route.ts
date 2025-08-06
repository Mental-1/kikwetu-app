import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
});

// This route is used for manually checking the status of a transaction.
// It is called by the payment page when a user clicks the "I have paid" button.
export async function GET(request: NextRequest) {
  logger.info("GET /api/payments/status: Invoked");
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("id");

  if (!transactionId) {
    logger.warn("GET /api/payments/status: Missing transaction ID");
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  const supabase = await getSupabaseRouteHandler(cookies);
  try {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .single();

    if (error || !transaction) {
      logger.error({ error, transactionId }, "Error fetching transaction status");
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    logger.info({ transactionId, status: transaction.status }, "Fetched transaction status successfully");
    return NextResponse.json({ status: transaction.status });

  } catch (error) {
      logger.error({ error }, "Server error in GET /api/payments/status");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
