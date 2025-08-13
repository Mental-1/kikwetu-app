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

// Validate environment at startup
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
}
if (!NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
}
if (!PAYSTACK_SECRET_KEY.startsWith("sk_")) {
  logger.warn("PayStack secret key might be invalid - should start with 'sk_'");
}

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
 * Reverses a PayStack transaction to prevent orphaned transactions.
 * @param reference The reference of the transaction to reverse.
 */
async function reversePaystackTransaction(reference: string) {
  logger.info({ reference }, "Reversing PayStack transaction due to database error.");

  try {
    const response = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: reference,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      logger.error(
        {
          reference,
          statusCode: response.status,
          response: responseData,
        },
        "PayStack refund API call failed."
      );
    } else {
      logger.info(
        {
          reference,
          response: responseData,
        },
        "PayStack transaction successfully reversed."
      );
    }
  } catch (error) {
    logger.error(
      {
        reference,
        error,
      },
      "An unexpected error occurred during PayStack transaction reversal."
    );
  }
}

/**
 * Handles PayStack payment initialization and records the transaction.
 */
export async function POST(request: NextRequest) {
  logger.info("--- PayStack Payment Initialization Request Received ---");

  try {
    const body = await request.json();
    logger.debug(
      {
        body,
        bodyKeys: Object.keys(body),
      },
      "Request body parsed.",
    );

    const validatedData = paystackPaymentSchema.safeParse(body);

    logger.debug(
      {
        rawBody: body,
        validationSuccess: validatedData.success,
        validatedData: validatedData.success ? validatedData.data : null,
        validationErrors: validatedData.success
          ? null
          : validatedData.error.issues,
      },
      "Schema validation details",
    );

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

    // Enhanced amount validation with logging
    logger.debug(
      {
        originalAmount: amount,
        amountType: typeof amount,
        amountString: amount.toString(),
      },
      "Amount validation details",
    );

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
      logger.error(
        {
          authError,
          hasUser: !!user,
          userId: user?.id,
        },
        "Unauthorized: User authentication failed.",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.info({ userId: user.id }, "User authenticated successfully.");

    // Generate secure reference
    const reference = generateSecureReference(user.id);
    logger.debug({ reference }, "Generated transaction reference");

    // Verify listing exists and user has permission (optional but recommended)
    logger.debug({ listingId }, "Fetching listing details");
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, price")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      logger.error(
        {
          listingError,
          listingId,
          listingErrorCode: listingError?.code,
          listingErrorMessage: listingError?.message,
        },
        "Listing not found",
      );
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    logger.debug(
      {
        listingId: listing.id,
        listingPrice: listing.price,
        providedAmount: amount,
      },
      "Listing details retrieved",
    );

    // Optional: Verify amount matches listing price
    const PRICE_TOLERANCE = 1; // Allow 1 KES difference for rounding
    if (listing.price && Math.abs(listing.price - amount) > PRICE_TOLERANCE) {
      logger.error(
        {
          providedAmount: amount,
          listingPrice: listing.price,
          difference: Math.abs(listing.price - amount),
          tolerance: PRICE_TOLERANCE,
        },
        "Amount mismatch with listing price",
      );
      return NextResponse.json(
        { error: "Amount does not match listing price" },
        { status: 400 },
      );
    }

    // Enhanced amount conversion to kobo (PayStack requires amount in kobo for KES)
    // Use string manipulation to avoid floating-point precision issues
    const amountStr = amount.toString();
    const [whole, decimal = "0"] = amountStr.split(".");
    const paddedDecimal = decimal.padEnd(2, "0").slice(0, 2);
    const amountInKobo = parseInt(whole + paddedDecimal, 10);

    logger.debug(
      {
        originalAmount: amount,
        amountInKobo: amountInKobo,
        conversionMultiplier: 100,
      },
      "Amount conversion to kobo",
    );

    // Initialize PayStack transaction
    logger.info("Attempting to initialize PayStack transaction.");
    const paystackRequestBody = {
      email: email,
      amount: amountInKobo, // Use converted amount
      currency: "KES",
      reference: reference,
      callback_url: `${NEXT_PUBLIC_APP_URL}/api/payments/paystack/callback`,
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

    logger.debug(
      {
        paystackRequestBody,
        callbackUrl: paystackRequestBody.callback_url,
      },
      "PayStack API Request Body:",
    );

    // Enhanced PayStack API call with detailed error handling
    let response: Response;
    let responseText: string;

    try {
      logger.info(
        {
          url: "https://api.paystack.co/transaction/initialize",
          hasSecretKey: !!PAYSTACK_SECRET_KEY,
          secretKeyPrefix: PAYSTACK_SECRET_KEY?.substring(0, 7),
          method: "POST",
        },
        "Making PayStack API request",
      );

      response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackRequestBody),
      });

      // Get response text first for better error handling
      responseText = await response.text();

      logger.debug(
        {
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseBody: responseText,
          responseOk: response.ok,
        },
        "Raw PayStack API response",
      );
    } catch (fetchError) {
      logger.error(
        {
          error: fetchError,
          errorMessage:
            fetchError instanceof Error
              ? fetchError.message
              : "Unknown fetch error",
          errorName: fetchError instanceof Error ? fetchError.name : undefined,
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
        },
        "Network error during PayStack API call",
      );
      throw new Error(
        `Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
      );
    }

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
          headers: Object.fromEntries(response.headers.entries()),
        },
        "PayStack API request failed with detailed error",
      );
      throw new Error(
        `PayStack API request failed: ${response.status} - ${responseText}`,
      );
    }

    // Parse the JSON response
    let data: PayStackInitializeResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error(
        {
          parseError,
          responseText,
        },
        "Failed to parse PayStack API response as JSON",
      );
      throw new Error("Invalid JSON response from PayStack API");
    }

    logger.debug(
      { paystackApiResponse: data },
      "PayStack API Response parsed:",
    );

    if (!data.status || !data.data) {
      logger.error(
        {
          paystackError: data.message,
          paystackStatus: data.status,
          paystackData: data.data,
        },
        "PayStack initialization failed.",
      );
      throw new Error(data.message || "PayStack initialization failed");
    }
    logger.info("PayStack transaction initialized successfully.");

    // Save transaction to database with additional metadata and enhanced error handling
    logger.info("Attempting to save transaction to database.");

    const transactionData = {
      user_id: user.id,
      payment_method: "paystack",
      amount: amount,
      status: "pending",
      email: email,
      reference: reference,
      listing_id: listingId,
      paystack_access_code: data.data.access_code,
      created_at: new Date().toISOString(),
    };

    logger.debug(
      {
        insertData: transactionData,
      },
      "About to insert transaction",
    );

    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (dbError) {
      logger.error(
        {
          dbError,
          errorCode: dbError.code,
          errorMessage: dbError.message,
          errorDetails: dbError.details,
          errorHint: dbError.hint,
          insertData: transactionData,
        },
        "Database insert failed with detailed error",
      );

      // Automatically reverse the PayStack transaction
      await reversePaystackTransaction(reference);

      throw new Error(`Failed to save transaction: ${dbError.message}`);
    }

    logger.info(
      {
        transactionId: transaction.id,
        reference: transaction.reference,
      },
      "Transaction saved to database successfully.",
    );

    const successResponse = {
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      transaction: transaction,
    };

    logger.info(
      {
        response: successResponse,
      },
      "Returning success response with authorization URL.",
    );

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorName: error instanceof Error ? error.name : undefined,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
      },
      "PayStack payment error caught in catch block:",
    );

    // Return appropriate error responses based on error type
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
          success: false,
        },
        { status: 400 },
      );
    }

    // Enhanced error response
    const errorMessage =
      error instanceof Error ? error.message : "Payment initialization failed";
    const errorResponse = {
      error: errorMessage,
      success: false,
      timestamp: new Date().toISOString(),
    };

    // Add additional context for debugging only in development
    if (process.env.NODE_ENV === "development") {
      (errorResponse as any).debug = {
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      };
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
