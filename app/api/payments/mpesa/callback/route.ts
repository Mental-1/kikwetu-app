import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

/**
 * Handles M-Pesa payment callback POST requests, verifies request authenticity, updates transaction status, and sends user notifications.
 *
 * Validates the HMAC SHA-256 signature of the incoming callback, parses and verifies the callback data, updates the corresponding transaction record in the database, and, if the payment is successful, notifies the user of the completed payment.
 *
 * @param request - The incoming HTTP request containing the M-Pesa callback data
 * @returns A JSON response indicating success or an error with the appropriate HTTP status code
 */
export async function POST(request: NextRequest) {
  logger.info("--- M-Pesa Callback Received ---");
  try {
    const signature = request.headers.get("x-mpesa-signature");
    logger.debug({ signature }, "Callback Signature:");

    const body = await request.text();
    logger.debug({ body }, "Raw Callback Body:");

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.MPESA_SECRET_KEY ||
          (() => {
            logger.error("MPESA_SECRET_KEY environment variable is required");
            throw new Error("Configuration error");
          })(),
      )
      .update(body)
      .digest("hex");

    logger.debug({ expectedSignature }, "Expected Signature:");

    if (!signature || signature !== expectedSignature) {
      logger.error("Signature validation failed.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    logger.info("Signature validation successful.");

    logger.debug("Attempting to parse callback body.");
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      logger.debug({ parsedBody }, "Parsed Callback Body successfully:");
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
    logger.debug({ CallbackMetadata }, "CallbackMetadata:");

    const supabase = await getSupabaseRouteHandler(cookies);

    logger.info({ CheckoutRequestID }, "Checking for existing transaction in database.");
    // Check for duplicate callbacks (idempotency)
    const { data: existingTransaction, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (fetchError) {
      logger.error({ fetchError, CheckoutRequestID }, "Error fetching existing transaction:");
      // Do not return here, continue to attempt update if fetch failed but no existing transaction was found
    } else if (existingTransaction) {
      logger.info({ CheckoutRequestID, status: existingTransaction.status }, "Existing transaction found.");
      if (existingTransaction.status === "completed") {
        logger.warn(
          { CheckoutRequestID },
          "Duplicate M-Pesa callback received for already processed transaction.",
        );
        return NextResponse.json({ success: true });
      }
    } else {
      logger.info({ CheckoutRequestID }, "No existing transaction found with 'completed' status. Proceeding with update.");
    }

    // Update transaction status
    const status = ResultCode === 0 ? "completed" : "failed";
    logger.info(`Attempting to update transaction status to: ${status} for CheckoutRequestID: ${CheckoutRequestID}`);

    let reference = null;
    if (CallbackMetadata?.Item) {
      const mpesaReceiptNumberItem = CallbackMetadata.Item.find(
        (item: any) => item.Name === "MpesaReceiptNumber",
      );
      if (mpesaReceiptNumberItem) {
        reference = mpesaReceiptNumberItem.Value;
        logger.info({ reference }, "MpesaReceiptNumber found:");
      } else {
        logger.warn("MpesaReceiptNumber not found in CallbackMetadata.");
      }
    }

    // Attempt to update the transaction status from 'pending'
    const { data: updatedTransaction, error } = await supabase
      .from("transactions")
      .update({
        status,
        reference,
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID)
      .eq("status", "pending") // Only update if current status is pending
      .select()
      .single();

    if (error) {
      logger.error({ error, CheckoutRequestID }, "Failed to update transaction in database:");
      throw new Error("Failed to update transaction"); // Re-throw for other errors
    } else if (!updatedTransaction) {
      // This case handles when no row was updated because it wasn't 'pending'
      logger.warn(
        { CheckoutRequestID },
        "Transaction not updated, likely already processed by another callback (status not pending).",
      );
      return NextResponse.json({ success: true }); // Acknowledge callback
    } else {
      logger.info(
        `Transaction with CheckoutRequestID ${CheckoutRequestID} updated successfully to status: ${status}.`,
      );
    }

    if (status === "completed") {
      logger.info("Payment completed. Preparing to activate listing and send notification.");
      const { data: transaction, error: fetchTransactionError } = await supabase
        .from("transactions")
        .select("user_id, amount, listing_id")
        .eq("checkout_request_id", CheckoutRequestID)
        .single();

      if (fetchTransactionError || !transaction) {
        logger.error({ fetchTransactionError, CheckoutRequestID }, "Failed to fetch transaction for notification and listing activation.");
      } else {
        // Activate the listing
        if (transaction.listing_id) {
          const { error: updateError } = await supabase
            .from('listings')
            .update({ status: 'active', payment_status: 'paid' })
            .eq('id', transaction.listing_id);

          if (updateError) {
            logger.error({ updateError, listingId: transaction.listing_id }, "Failed to activate listing.");
          } else {
            logger.info({ listingId: transaction.listing_id }, "Listing activated successfully.");
          }
        }

        // Send notification to user
        if (transaction.user_id) {
          logger.info(`Sending notification to user ${transaction.user_id} for CheckoutRequestID: ${CheckoutRequestID}`);
          const { error: notificationError } = await supabase.from("notifications").insert({
            user_id: transaction.user_id,
            title: "Payment Successful",
            message: `Your payment of KES ${transaction.amount} has been processed successfully.`,
            type: "payment",
          });
          if (notificationError) {
            logger.error({ notificationError, userId: transaction.user_id }, "Failed to send notification.");
          } else {
            logger.info(`Notification sent successfully to user ${transaction.user_id}.`);
          }
        } else {
          logger.warn({ CheckoutRequestID }, "User ID not found for transaction, skipping notification.");
        }
      }
    }

    logger.info("--- M-Pesa Callback Processing Finished ---");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "M-Pesa callback error:");
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
