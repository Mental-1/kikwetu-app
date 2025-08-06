import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { paystackPaymentSchema } from "@/lib/validations";
import { cookies } from "next/headers";
import z from "zod";
import pino from "pino";
import crypto from "crypto";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

// PayStack API response types for better type safety
interface PayStackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Generates a secure, unique reference for PayStack transactions
 */
function generateSecureReference(userId: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString("hex");
  return `bidsy_${userId}_${timestamp}_${randomBytes}`;
}

/**
 * Validates PayStack environment variables
 */
function validatePayStackConfig(): void {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }
}

/**
 * Handles PayStack payment initialization and records the transaction.
 */
export async function POST(request: NextRequest) {
  logger.info("--- PayStack Payment Initialization Request Received ---");

  try {
    // Validate environment configuration first
    validatePayStackConfig();

    const body = await request.json();
    logger.debug({ body }, "Request body parsed.");

    const validatedData = paystackPaymentSchema.safeParse(body);

    if (!validatedData.success) {
      logger.error(
        { errors: validatedData.error },
        "Invalid request body validation failed.",
      );
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: z.treeifyError(validatedData.error),
        },
        { status: 400 },
      );
    }
    logger.info("Request body validated successfully.");

    const { email, amount, listingId } = validatedData.data;

    // Validate amount is positive
    if (amount <= 0) {
      logger.error({ amount }, "Invalid amount: must be positive");
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 },
      );
    }

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

    // Generate secure reference
    const reference = generateSecureReference(user.id);

    // Verify listing exists and user has permission (optional but recommended)
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, price")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      logger.error({ listingError, listingId }, "Listing not found");
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Optional: Verify amount matches listing price
    if (listing.price && Math.abs(listing.price - amount) > 0.01) {
      logger.error(
        {
          providedAmount: amount,
          listingPrice: listing.price,
        },
        "Amount mismatch with listing price",
      );
      return NextResponse.json(
        { error: "Amount does not match listing price" },
        { status: 400 },
      );
    }

    // Initialize PayStack transaction
    logger.info("Attempting to initialize PayStack transaction.");
    const paystackRequestBody = {
      email: email,
      amount: Math.round(amount * 100), // Ensure integer kobo/cents
      currency: "KES",
      reference: reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paystack/callback`,
      metadata: {
        user_id: user.id,
        listing_id: listingId,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: user.id,
          },
          {
            display_name: "Listing ID",
            variable_name: "listing_id",
            value: listingId,
          },
        ],
      },
    };

    logger.debug({ paystackRequestBody }, "PayStack API Request Body:");

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackRequestBody),
      },
    );

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        "PayStack API request failed",
      );
      throw new Error(`PayStack API request failed: ${response.status}`);
    }

    const data: PayStackInitializeResponse = await response.json();
    logger.debug({ paystackApiResponse: data }, "PayStack API Response:");

    if (!data.status || !data.data) {
      logger.error(
        { paystackError: data.message },
        "PayStack initialization failed.",
      );
      throw new Error(data.message || "PayStack initialization failed");
    }
    logger.info("PayStack transaction initialized successfully.");

    // Save transaction to database with additional metadata
    logger.info("Attempting to save transaction to database.");
    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        payment_method: "paystack",
        amount: amount,
        status: "pending",
        email: email,
        reference: reference,
        listing_id: listingId,
        paystack_access_code: data.data.access_code,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      logger.error({ dbError }, "Failed to save transaction to database.");

      // Consider reversing the PayStack transaction here if needed
      // This would require implementing a cleanup mechanism

      throw new Error("Failed to save transaction");
    }
    logger.info(
      { transactionId: transaction.id },
      "Transaction saved to database successfully.",
    );

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

    // Return appropriate error responses based on error type
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
