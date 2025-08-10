import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

export const runtime = "nodejs";

const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
});

async function processMpesaCallback(parsedBody: any) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const { Body } = parsedBody;

  if (!Body?.stkCallback) {
    logger.error("Invalid callback data: 'stkCallback' missing.");
    return;
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
    Body.stkCallback;

  logger.info(
    { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata },
    "M-Pesa Callback Details:",
  );

  let existingTransaction = null;
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 500; // 0.5 seconds

  for (let i = 0; i < MAX_RETRIES; i++) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (!error && data) {
      existingTransaction = data;
      logger.info({ transactionId: data.id, retryAttempt: i }, "Found transaction by CheckoutRequestID");
      break; // Found, exit loop
    }

    if (i < MAX_RETRIES - 1) {
      const withJitter = (base: number) => base + Math.floor(Math.random() * base * 0.5);
      const delay = withJitter(RETRY_DELAY_MS);
      if (i === 0 || i === MAX_RETRIES - 2) {
        logger.warn({ CheckoutRequestID, retryAttempt: i, delay }, "Transaction not found, retrying...");
      } else {
        logger.debug({ CheckoutRequestID, retryAttempt: i, delay }, "Transaction not found, retrying...");
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // FINAL FALLBACK: If no transaction found by CheckoutRequestID or transactionToken
  if (!existingTransaction) {
    // Store for investigation
    const { error: orphanError } = await supabase
      .from("orphaned_callbacks")
      .insert({
        checkout_request_id: CheckoutRequestID,
        result_code: ResultCode,
        result_description: ResultDesc,
        callback_metadata: CallbackMetadata,
        raw_callback: parsedBody,
        transaction_token: transactionToken,
        created_at: new Date().toISOString(),
      });

    logger.error(
      {
        CheckoutRequestID,
        orphanStored: !orphanError,
      },
      "CRITICAL: All matching methods failed",
    );
    return;
  }

  if (
    existingTransaction.status === "completed" ||
    existingTransaction.status === "failed"
  ) {
    logger.warn(
      { CheckoutRequestID, currentStatus: existingTransaction.status },
      "Transaction already processed.",
    );
    return;
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
      ...(reference ? { reference } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingTransaction.id)
    .eq("status", "pending")
    .select()
    .single();

  if (updateError) {
    logger.error(
      { updateError, CheckoutRequestID },
      "Failed to update transaction:",
    );
    return;
  }

  if (!updatedTransaction) {
    logger.warn(
      { CheckoutRequestID },
      "No transaction updated - likely already processed.",
    );
    return;
  }

  logger.info(
    { transactionId: updatedTransaction.id, status },
    "Transaction updated successfully.",
  );

  logger.info({ existingTransaction, status }, "Checking if listing should be activated");
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
}


/**
 * Handles M-Pesa payment callback POST requests, updates transaction status, and activates listings.
 *
 * FIXED: Removed signature verification since M-Pesa doesn't send signatures by default.
 * If you have signature verification configured with Safaricom, re-enable the signature check.
 */
export async function POST(request: NextRequest) {
  logger.info("--- M-Pesa Callback Route Invoked ---");

  const expectedToken = process.env.MPESA_CALLBACK_TOKEN;
  const callbackToken = request.nextUrl.searchParams.get("token");

  if (!expectedToken || callbackToken !== expectedToken) {
    logger.warn("Unauthorized M-Pesa callback attempt. Invalid or missing token.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

    // Process the callback asynchronously
    processMpesaCallback(parsedBody).catch(error => {
        logger.error({ error }, "Error in background M-Pesa callback processing");
    });

    // Immediately acknowledge the callback
    return NextResponse.json({ success: true, message: "Callback received" });

  } catch (error) {
    logger.error({ error }, "M-Pesa callback error:");
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
