import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Handles Paystack webhook POST requests to process payment events.
 *
 * Verifies the webhook signature, updates the transaction status in the database, and sends a notification to the user upon successful payment.
 *
 * @param request - The incoming Next.js API request containing the Paystack webhook payload.
 * @returns A JSON response indicating success or an error message with the appropriate HTTP status code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, status, amount } = event.data;

      const supabase = await getSupabaseRouteHandler(cookies);

      // Update transaction status
      const { error } = await supabase
        .from("transactions")
        .update({
          status: status === "success" ? "completed" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference);

      if (error) {
        console.error("Failed to update transaction:", error);
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
      }

      // Fulfill the order
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .update({ status: "active" })
        .eq("transaction_id", event.data.reference)
        .select()
        .single();

      if (listingError) {
        console.error("Failed to update listing:", listingError);
        // Handle this reconciliation later
      }

      // Send notification to user
      if (status === "success") {
        const { data: transaction } = await supabase
          .from("transactions")
          .select("user_id")
          .eq("reference", reference)
          .single();

        if (transaction) {
          await supabase.from("notifications").insert({
            user_id: transaction.user_id,
            title: "Payment Successful",
            message: `Your payment of Ksh${amount / 100} has been processed successfully.`,
            type: "payment",
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayStack callback error:", error);
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
