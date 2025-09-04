import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*, plans(*)") // Select subscription details and join with plan details
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError) {
      console.error("Error fetching subscription:", subscriptionError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Fetch all available plans
    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    if (plansError) {
      console.error("Error fetching plans:", plansError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ currentSubscription: subscription, availablePlans: plans }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/payments/subscriptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schema = z.object({
    planId: z.string().uuid(),
    transactionId: z.string().uuid(),
  });

  try {
    const body = await request.json();
    const { planId, transactionId } = schema.parse(body);

    // 1. Verify the transaction status (optional but recommended)
    // You might want to fetch the transaction from your 'transactions' table
    // and ensure it's 'completed' before activating the subscription.
    // For this implementation, we'll assume the frontend has already verified.

    // 2. Create a new subscription record
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        transaction_id: transactionId,
        status: "active",
        // Calculate end_date based on plan duration if available, or set to null for indefinite
        end_date: null, // Placeholder: needs to be calculated based on plan duration
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    // 3. Update the user's profile with the new plan and subscription status
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        current_plan_id: planId,
        subscription_status: "active",
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("Error updating user profile with subscription:", profileUpdateError);
      return NextResponse.json({ error: "Failed to update user profile with subscription" }, { status: 500 });
    }

    return NextResponse.json({ message: "Subscription activated successfully", subscription: newSubscription }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error in POST /api/payments/subscriptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// TODO: Implement PATCH for upgrades/downgrades/cancellations
export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
}

// TODO: Implement Webhook handler for payment gateway updates
export async function PUT(request: NextRequest) { // Using PUT for webhooks as they are often idempotent updates
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
}