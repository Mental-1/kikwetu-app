import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .single();

    if (error) {
      logger.error({ error }, "Error fetching transaction status:");
      return NextResponse.json({ error: "Failed to fetch transaction status" }, { status: 500 });
    }

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ status: transaction.status });
  } catch (error) {
    logger.error({ error }, "Unexpected error in payment status API:");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
