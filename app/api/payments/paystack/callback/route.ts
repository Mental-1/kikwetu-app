import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/utils/supabase/server";
import crypto from "crypto";
import pino from "pino";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
}

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

/**
 * Handles Paystack webhook POST requests by storing them in webhook_events table
 * for processing by the cron job worker.
 */
export async function POST(request: NextRequest) {
  logger.info("--- Paystack Webhook Received ---");

  try {
    const body = await request.clone().text();
    const signature = request.headers.get("x-paystack-signature");

    logger.debug(
      { signature: signature?.substring(0, 20) + "..." },
      "Paystack webhook signature (masked):",
    );

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      logger.error("Paystack webhook signature verification failed.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    logger.info("Paystack webhook signature verified successfully.");

    let parsedEvent;
    try {
      parsedEvent = await request.json();
    } catch (parseError) {
      logger.error(
        { parseError },
        "Failed to parse Paystack webhook body.",
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate required fields
    if (!parsedEvent.id || !parsedEvent.event) {
      logger.error(
        "Missing required fields in Paystack webhook (id or event).",
      );
      return NextResponse.json(
        { error: "Invalid webhook structure" },
        { status: 400 },
      );
    }

    logger.debug(
      {
        eventId: parsedEvent.id,
        event: parsedEvent.event,
        reference: parsedEvent.data?.reference,
      },
      "Paystack webhook event details:",
    );

    const supabase = getSupabaseServiceRole();

    // Insert webhook event for processing by cron job
    const { data: webhookEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        psp_event_id: parsedEvent.id, // Paystack provides unique event IDs
        psp: "paystack",
        status: "received",
        payload: parsedEvent,
        next_retry_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate event
      if (insertError.code === "23505") {
        // Unique constraint violation
        logger.warn(
          {
            paystackEventId: parsedEvent.id,
            event: parsedEvent.event,
            reference: parsedEvent.data?.reference,
          },
          "Duplicate Paystack webhook event received, ignoring.",
        );
        return NextResponse.json({
          success: true,
          message: "Duplicate event ignored",
        });
      }

      logger.error(
        {
          insertError,
          paystackEventId: parsedEvent.id,
          event: parsedEvent.event,
        },
        "Failed to insert Paystack webhook event:",
      );
      return NextResponse.json(
        { error: "Failed to store webhook event" },
        { status: 500 },
      );
    }

    logger.info(
      {
        webhookEventId: webhookEvent.id,
        paystackEventId: parsedEvent.id,
        event: parsedEvent.event,
        reference: parsedEvent.data?.reference,
      },
      "Paystack webhook event stored successfully for processing.",
    );

    // Acknowledge the webhook immediately
    return NextResponse.json({
      success: true,
      message: "Webhook received and queued for processing",
      event_id: webhookEvent.id,
    });
  } catch (error) {
    logger.error({ error }, "Paystack webhook error:");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
