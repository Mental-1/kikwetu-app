import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/utils/supabase/server";
import pino from "pino";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MPESA_CALLBACK_TOKEN = process.env.MPESA_CALLBACK_TOKEN;
if (!MPESA_CALLBACK_TOKEN) {
  throw new Error("MPESA_CALLBACK_TOKEN environment variable is required");
}

const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
});

/**
 * Handles M-Pesa payment callback POST requests by storing them in webhook_events table
 * for processing by the cron job worker.
 */
export async function POST(request: NextRequest) {
  logger.info("--- M-Pesa Callback Route Invoked ---");

  const callbackToken = request.nextUrl.searchParams.get("token");

  if (callbackToken !== MPESA_CALLBACK_TOKEN) {
    logger.warn(
      "Unauthorized M-Pesa callback attempt. Invalid or missing token.",
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.text();
    logger.debug({ body }, "Raw M-Pesa Callback Body:");

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      logger.debug({ parsedBody }, "Parsed M-Pesa Callback Body:");
    } catch (parseError) {
      logger.error(
        { parseError, body },
        "Failed to parse M-Pesa callback body.",
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate callback structure
    const { Body } = parsedBody;
    if (!Body?.stkCallback) {
      logger.error("Invalid M-Pesa callback data: 'stkCallback' missing.");
      return NextResponse.json(
        { error: "Invalid callback structure" },
        { status: 400 },
      );
    }

    const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;

    if (!CheckoutRequestID) {
      logger.error("Missing CheckoutRequestID in M-Pesa callback.");
      return NextResponse.json(
        { error: "Missing CheckoutRequestID" },
        { status: 400 },
      );
    }

    logger.info(
      { CheckoutRequestID, ResultCode, ResultDesc },
      "M-Pesa Callback Details:",
    );

    // Generate a unique PSP event ID for M-Pesa (they don't provide one)
    const pspEventId = `mpesa_${CheckoutRequestID}_${randomUUID()}`;

    const supabase = getSupabaseServiceRole();

    // Insert webhook event for processing by cron job
    const { data: webhookEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        psp_event_id: pspEventId,
        psp: "mpesa",
        status: "received",
        payload: parsedBody,
        next_retry_at: new Date(Date.now() + 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate event
      if (insertError.code === "23505") {
        // Unique constraint violation
        logger.warn(
          { CheckoutRequestID, pspEventId },
          "Duplicate M-Pesa webhook event received, ignoring.",
        );
        return NextResponse.json({
          success: true,
          message: "Duplicate event ignored",
        });
      }

      logger.error(
        { insertError, CheckoutRequestID },
        "Failed to insert M-Pesa webhook event:",
      );
      return NextResponse.json(
        { error: "Failed to store webhook event" },
        { status: 500 },
      );
    }

    logger.info(
      {
        webhookEventId: webhookEvent.id,
        CheckoutRequestID,
        pspEventId,
      },
      "M-Pesa webhook event stored successfully for processing.",
    );

    // Immediately acknowledge the callback
    return NextResponse.json({
      success: true,
      message: "Callback received and queued for processing",
      event_id: webhookEvent.id,
    });
  } catch (error) {
    logger.error({ error }, "M-Pesa callback error:");
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
