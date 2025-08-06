import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

/**
 * Handles Paystack webhook POST requests to process payment events.
 */
export async function POST(request: NextRequest) {
  logger.info("--- Paystack Webhook Received ---");
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    logger.debug(
      { signature: signature?.substring(0, 20) + "..." },
      "Webhook signature (masked):",
    );

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      logger.error("Paystack webhook signature verification failed.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    logger.info("Paystack webhook signature verified successfully.");

    const event = JSON.parse(body);
    logger.debug(
      { event: event.event, reference: event.data?.reference },
      "Webhook event:",
    );

    if (event.event === "charge.success") {
      const { reference, status, amount, gateway_response } = event.data;

      logger.info(
        { reference, status, amount },
        "Processing successful charge:",
      );

      const supabase = await getSupabaseRouteHandler(cookies);

      // Get the existing transaction with listing_id
      const { data: existingTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("reference", reference)
        .single();

      if (fetchError || !existingTransaction) {
        logger.error({ fetchError, reference }, "Transaction not found:");
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      if (existingTransaction.status === "completed") {
        logger.warn({ reference }, "Transaction already processed.");
        return NextResponse.json({ success: true });
      }

      // Update transaction status
      const transactionStatus = status === "success" ? "completed" : "failed";
      logger.info(
        { reference, transactionStatus },
        "Updating transaction status:",
      );

      const { error: transactionUpdateError } = await supabase
        .from("transactions")
        .update({
          status: transactionStatus,
          reference: gateway_response || reference,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference);

      if (transactionUpdateError) {
        logger.error(
          { transactionUpdateError, reference },
          "Failed to update transaction:",
        );
        return NextResponse.json(
          { error: "Failed to update transaction" },
          { status: 500 },
        );
      }

      logger.info({ reference }, "Transaction updated successfully.");

      // If payment successful and we have a listing_id, activate the listing
      if (transactionStatus === "completed" && existingTransaction.listing_id) {
        logger.info(
          { listingId: existingTransaction.listing_id },
          "Activating listing:",
        );

        const { error: listingError } = await supabase
          .from("listings")
          .update({
            status: "active",
            payment_status: "paid",
            payment_method: "paystack",
          })
          .eq("id", existingTransaction.listing_id);

        if (listingError) {
          logger.error(
            { listingError, listingId: existingTransaction.listing_id },
            "Failed to activate listing:",
          );
        } else {
          logger.info(
            { listingId: existingTransaction.listing_id },
            "Listing activated successfully.",
          );
        }

        // Send notification to user
        if (existingTransaction.user_id) {
          logger.info(
            { userId: existingTransaction.user_id },
            "Sending notification:",
          );

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: existingTransaction.user_id,
              title: "Payment Successful",
              message: `Your payment of Ksh${amount / 100} has been processed successfully. Your listing is now live!`,
              type: "payment",
            });

          if (notificationError) {
            logger.error({ notificationError }, "Failed to send notification:");
          } else {
            logger.info(
              { userId: existingTransaction.user_id },
              "Notification sent successfully.",
            );
          }
        }
      }
    } else {
      logger.info({ eventType: event.event }, "Ignoring non-success event:");
    }

    logger.info("--- Paystack Webhook Processing Complete ---");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "PayStack webhook error:");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
