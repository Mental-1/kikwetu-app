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

// TODO: Implement POST for initiating new subscriptions
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
}

// TODO: Implement PATCH for upgrades/downgrades/cancellations
export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
}

// TODO: Implement Webhook handler for payment gateway updates
export async function PUT(request: NextRequest) { // Using PUT for webhooks as they are often idempotent updates
  return NextResponse.json({ message: "Not Implemented" }, { status: 501 });
}