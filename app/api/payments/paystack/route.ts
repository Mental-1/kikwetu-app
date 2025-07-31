import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { paystackPaymentSchema } from "@/lib/validations";
import { cookies } from "next/headers";
import z from "zod";
import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

/**
 * Handles PayStack payment initialization and records the transaction.
 *
 * Parses and validates the incoming payment request, authenticates the user, initializes a PayStack transaction, and saves the transaction details to the database. Returns a JSON response with the PayStack authorization URL and transaction information, or an error message if any step fails.
 */
export async function POST(request: NextRequest) {
  logger.info("--- PayStack Payment Initialization Request Received ---");
  try {
    const body = await request.json();
    logger.debug({ body }, "Request body parsed.");

    const validatedData = paystackPaymentSchema.safeParse(body);

    if (!validatedData.success) {
      logger.error({ errors: validatedData.error }, "Invalid request body validation failed.");
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: z.treeifyError(validatedData.error),
        },
        { status: 400 },
      );
    }
    logger.info("Request body validated successfully.");

    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error({ authError }, "Unauthorized: User authentication failed.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.info({ userId: user.id }, "User authenticated successfully.");

    // Initialize PayStack transaction
    logger.info("Attempting to initialize PayStack transaction.");
    const paystackRequestBody = JSON.stringify({
      email: validatedData.data.email,
      amount: validatedData.data.amount * 100,
      currency: "KES",
      reference: `bidsy_${user.id}_${Date.now()}`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paystack/callback`,
      metadata: {
        user_id: user.id,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: user.id,
          },
        ],
      },
    });
    logger.debug({ paystackRequestBody }, "PayStack API Request Body:");

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: paystackRequestBody,
      },
    );

    const data = await response.json();
    logger.debug({ paystackApiResponse: data }, "PayStack API Response:");

    if (!data.status) {
      logger.error({ paystackError: data.message }, "PayStack initialization failed.");
      throw new Error(data.message || "PayStack initialization failed");
    }
    logger.info("PayStack transaction initialized successfully.");

    // Save transaction to database
    logger.info("Attempting to save transaction to database.");
    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        payment_method: "paystack",
        amount: validatedData.data.amount,
        status: "pending",
        email: validatedData.data.email,
        reference: data.data.reference,
      })
      .select()
      .single();

    if (dbError) {
      logger.error({ dbError }, "Failed to save transaction to database.");
      throw new Error("Failed to save transaction");
    }
    logger.info({ transactionId: transaction.id }, "Transaction saved to database successfully.");

    logger.info("Returning success response with authorization URL.");
    return NextResponse.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      transaction: transaction,
    });
  } catch (error) {
    logger.error({ error }, "PayStack payment error caught in catch block:");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment failed" },
      { status: 500 },
    );
  }
}
