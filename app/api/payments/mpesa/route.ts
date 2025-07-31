import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { mpesaPaymentSchema } from "@/lib/validations";
import { cookies } from "next/headers";
import pino from "pino";
import z from "zod";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

/**
 * Initiates an M-Pesa STK Push payment in response to a POST request.
 *
 * Validates the request body, authenticates the user, sanitizes the phone number, obtains an M-Pesa access token, and sends an STK Push payment request to Safaricom. On successful initiation, records the transaction in the database and returns payment initiation details. Returns appropriate error responses for authentication, validation, or payment initiation failures.
 *
 * @returns A JSON response indicating success with payment and transaction details, or an error message with the appropriate HTTP status code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug({ body }, "Received M-Pesa STK Push request body");
    const validatedData = mpesaPaymentSchema.safeParse(body);

    if (!validatedData.success) {
      logger.error(
        { errors: z.treeifyError(validatedData.error) },
        "M-Pesa STK Push request body validation failed:",
      );
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: z.treeifyError(validatedData.error),
        },
        { status: 400 },
      );
    }
    const { phoneNumber, amount, listingId } = validatedData.data;

    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error({ authError }, "Authentication error for M-Pesa STK Push");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sanitize phone number is now handled by Zod schema
    const sanitizedPhoneNumber = phoneNumber;

    // M-Pesa STK Push implementation
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${process.env.MPESA_BUSINESS_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`,
    ).toString("base64");

    // Get access token
    const authUrl =
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const authHeader = `Basic ${Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64")}`;

    logger.info("Attempting to fetch M-Pesa access token...");
    logger.debug({ authUrl }, "M-Pesa Auth URL:");
    logger.debug(
      `Authorization Header (masked): ${authHeader.substring(0, 20)}...`,
    ); // Mask for security
    logger.debug(
      `MPESA_BUSINESS_SHORT_CODE: ${process.env.MPESA_BUSINESS_SHORT_CODE}`,
    );
    logger.debug(
      `MPESA_PASSKEY (masked): ${process.env.MPESA_PASSKEY ? `${process.env.MPESA_PASSKEY.substring(0, 5)}...` : "not set"}`,
    );
    logger.debug(`MPESA_USERNAME: ${process.env.MPESA_USERNAME}`);
    logger.debug(`MPESA_CALLBACK_URL: ${process.env.MPESA_CALLBACK_URL}`);
    logger.debug(
      `MPESA_CONSUMER_KEY (masked): ${process.env.MPESA_CONSUMER_KEY ? `${process.env.MPESA_CONSUMER_KEY.substring(0, 5)}...` : "not set"}`,
    );
    logger.debug(
      `MPESA_CONSUMER_SECRET (masked): ${process.env.MPESA_CONSUMER_SECRET ? `${process.env.MPESA_CONSUMER_SECRET.substring(0, 5)}...` : "not set"}`,
    );

    let authResponse;
    try {
      authResponse = await fetch(authUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });
      logger.info("M-Pesa access token fetch completed.");
    } catch (error) {
      logger.error({ error }, "Error during M-Pesa access token fetch:");
      throw error;
    }

    // Check if the auth response is ok
    if (!authResponse.ok) {
      const authResponseText = await authResponse.text();
      logger.error(
        {
          status: authResponse.status,
          statusText: authResponse.statusText,
          body: authResponseText,
        },
        "M-Pesa auth response not OK:",
      );
      throw new Error(
        `M-Pesa authentication failed: ${authResponse.statusText}. Details: ${authResponseText}`,
      );
    }

    let authData;
    try {
      authData = await authResponse.json();
    } catch (error) {
      logger.error({ error }, "Failed to parse auth response:");
      throw new Error("Invalid authentication response from M-Pesa");
    }

    if (!authData.access_token) {
      logger.error({ authData }, "Auth response missing access token:");
      throw new Error("Failed to get M-Pesa access token");
    }

    // Initiate STK Push
    const stkPayload = {
      BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
      Password: password,
      Username: process.env.MPESA_USERNAME,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: sanitizedPhoneNumber,
      PartyB: process.env.MPESA_PARTY_B,
      PhoneNumber: sanitizedPhoneNumber,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: listingId ? `RouteMe-${user.id}-${listingId}` : `RouteMe-${user.id}`,
      TransactionDesc: "RouteMe Payment",
    };
    logger.debug({ stkPayload }, "STK Push Payload:");

    const stkResponse = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
    );

    // Check if the STK response is ok
    if (!stkResponse.ok) {
      logger.error(
        { status: stkResponse.status, statusText: stkResponse.statusText },
        "M-Pesa STK response not OK:",
      );
      const stkResponseText = await stkResponse.text();
      logger.error({ body: stkResponseText }, "STK response body:");
      throw new Error(`M-Pesa STK push failed: ${stkResponse.statusText}`);
    }

    let stkData;
    try {
      stkData = await stkResponse.json();
    } catch (error) {
      logger.error({ error }, "Failed to parse STK response:");
      throw new Error("Invalid STK push response from M-Pesa");
    }

    if (!stkData.ResponseCode) {
      logger.error({ stkData }, "STK response missing ResponseCode:");
      throw new Error("Invalid STK push response format");
    }

    if (stkData.ResponseCode !== "0") {
      logger.error(
        { stkData },
        "M-Pesa STK push failed with non-zero ResponseCode:",
      );
      throw new Error(stkData.ResponseDescription || "M-Pesa payment failed");
    }

    logger.info(
      {
        CheckoutRequestID: stkData.CheckoutRequestID,
        MerchantRequestID: stkData.MerchantRequestID,
      },
      "STK Push initiated successfully.",
    );

    // Save transaction to database
    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        payment_method: "mpesa",
        amount: validatedData.data.amount,
        status: "pending",
        phone_number: validatedData.data.phoneNumber,
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
      })
      .select()
      .single();

    if (dbError) {
      logger.error({ dbError }, "Failed to save transaction to database:");
      throw new Error("Failed to save transaction");
    }

    logger.info(
      { transactionId: transaction.id },
      "Transaction saved to database.",
    );

    return NextResponse.json({
      success: true,
      message: "Payment initiated successfully",
      checkoutRequestId: stkData.CheckoutRequestID,
      transaction: transaction,
    });
  } catch (error) {
    logger.error({ error }, "M-Pesa payment error:");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment failed" },
      { status: 500 },
    );
  }
}