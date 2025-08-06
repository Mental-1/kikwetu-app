import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: "debug",
});

/**
 * Handles M-Pesa payment callback POST requests, updates transaction status, and activates listings.
 *
 * FIXED: Removed signature verification since M-Pesa doesn't send signatures by default.
 * If you have signature verification configured with Safaricom, re-enable the signature check.
 */
export async function POST(request: NextRequest) {
  logger.info("--- M-Pesa Callback Route Invoked ---");
  try {
    const body = await request.text();
    logger.debug({ body }, "Raw Callback Body:");
    logger.info("Processing M-Pesa callback...");

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      logger.debug({ parsedBody }, "Parsed Callback Body:");
    } catch (parseError) {
      logger.error({ parseError, body }, "Failed to parse callback body.");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { Body } = parsedBody;

    if (!Body?.stkCallback) {
      logger.error("Invalid callback data: 'stkCallback' missing.");
      return NextResponse.json(
        { error: "Invalid callback data" },
        { status: 400 },
      );
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      Body.stkCallback;

    logger.info(
      { CheckoutRequestID, ResultCode, ResultDesc },
      "M-Pesa Callback Details:",
    );

    const supabase = await getSupabaseRouteHandler(cookies);

    // Check for existing transaction
    const { data: existingTransaction, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (fetchError) {
      logger.error(
        { fetchError, CheckoutRequestID },
        "Error fetching existing transaction:",
      );
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (
      existingTransaction.status === "completed" ||
      existingTransaction.status === "failed"
    ) {
      logger.warn(
        { CheckoutRequestID, currentStatus: existingTransaction.status },
        "Transaction already processed.",
      );
      return NextResponse.json({ success: true });
    }

    // Determine transaction status
    const status = ResultCode === 0 ? "completed" : "failed";
    logger.info(`Updating transaction status to: ${status}`);

    // Extract M-Pesa receipt number
    let reference = null;
    if (CallbackMetadata?.Item) {
      const mpesaReceiptItem = CallbackMetadata.Item.find(
        (item: any) => item.Name === "MpesaReceiptNumber",
      );
      if (mpesaReceiptItem) {
        reference = mpesaReceiptItem.Value;
        logger.info({ reference }, "M-Pesa Receipt Number found:");
      }
    }

    // Update transaction status
    const { data: updatedTransaction, error: updateError } = await supabase
      .from("transactions")
      .update({
        status,
        reference,
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID)
      .eq("status", "pending") // Only update if still pending
      .select()
      .single();

    if (updateError) {
      logger.error(
        { updateError, CheckoutRequestID },
        "Failed to update transaction:",
      );
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    if (!updatedTransaction) {
      logger.warn(
        { CheckoutRequestID },
        "No transaction updated - likely already processed.",
      );
      return NextResponse.json({ success: true });
    }

    logger.info(
      { transactionId: updatedTransaction.id, status },
      "Transaction updated successfully.",
    );

    // If payment successful, activate the listing
    if (status === "completed" && existingTransaction.listing_id) {
      logger.info(
        { listingId: existingTransaction.listing_id },
        "Activating listing...",
      );

      const { error: listingUpdateError } = await supabase
        .from("listings")
        .update({
          status: "active",
          payment_status: "paid",
          payment_method: "mpesa",
        })
        .eq("id", existingTransaction.listing_id);

      if (listingUpdateError) {
        logger.error(
          { listingUpdateError, listingId: existingTransaction.listing_id },
          "Failed to activate listing:",
        );
      } else {
        logger.info(
          { listingId: existingTransaction.listing_id },
          "Listing activated successfully.",
        );
      }

      // Send notification
      if (existingTransaction.user_id) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: existingTransaction.user_id,
            title: "Payment Successful",
            message: `Your payment of KES ${existingTransaction.amount} has been processed successfully. Your listing is now live!`,
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

    logger.info("--- M-Pesa Callback Processing Complete ---");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "M-Pesa callback error:");
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
