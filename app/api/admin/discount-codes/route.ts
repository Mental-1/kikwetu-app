import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";
import { z } from "zod";

// Schema for creating a new discount code
const createDiscountCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Code can only contain letters, numbers, and underscores"),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "EXTRA_LISTING_DAYS"]),
  value: z.number().min(0),
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  created_by_user_id: z.string().uuid().nullable().optional(),
});

const updateDiscountCodeSchema = z.object({
  id: z.number().int(),
  code: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Code can only contain letters, numbers, and underscores").optional(),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "EXTRA_LISTING_DAYS"]).optional(),
  value: z.number().min(0).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
}).partial(); // All fields are optional for update

export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: discountCodes, error } = await supabase
      .from("discount_codes")
      .select("*", { count: "exact" });

    if (error) {
      console.error("Error fetching discount codes:", error);
      return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 });
    }

    return NextResponse.json(discountCodes, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/admin/discount-codes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = createDiscountCodeSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: "Invalid request body", details: validatedData.error.flatten() }, { status: 400 });
    }

    const { data: newCode, error } = await supabase
      .from("discount_codes")
      .insert(validatedData.data)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ error: "Discount code already exists" }, { status: 409 });
      }
      console.error("Error creating discount code:", error);
      return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 });
    }

    return NextResponse.json(newCode, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/discount-codes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = updateDiscountCodeSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: "Invalid request body", details: validatedData.error.flatten() }, { status: 400 });
    }

    const { id, ...updateData } = validatedData.data;

    if (!id) {
      return NextResponse.json({ error: "Discount code ID is required for update" }, { status: 400 });
    }

    const { data: updatedCode, error } = await supabase
      .from("discount_codes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating discount code:", error);
      return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 });
    }

    if (!updatedCode) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    return NextResponse.json(updatedCode, { status: 200 });
  } catch (error) {
    console.error("Error in PATCH /api/admin/discount-codes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Discount code ID is required for deletion" }, { status: 400 });
    }

    const { error, count } = await supabase
      .from("discount_codes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting discount code:", error);
      return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Discount code deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/admin/discount-codes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
