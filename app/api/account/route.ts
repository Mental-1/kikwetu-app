import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { z, ZodError } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/utils/supabase/database.types";
import { logger } from "@/lib/utils/logger";


type Schema = Database["public"];

const phoneRegex = new RegExp(
  /^(\+?[1-9]\d{0,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/,
);
const accountSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters long"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  bio: z.string().max(160, "Bio must be less than 160 characters").optional(),
  phone_number: z.string().regex(phoneRegex, "Invalid phone number").optional(),
  location: z.string().optional(),
  website: z.string().url("Invalid URL").optional(),
});

async function getUserId(supabase: SupabaseClient<Schema>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const userId = await getUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, bio, phone_number, location, website")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error({ error }, "Error fetching account data");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const userId = await getUserId(supabase);

  // On success, log structured event with route context
  const log = logger.child({ route: "account:POST", userId });

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = accountSchema.parse(body);

    // Check if username is available
    if (validatedData.username) {
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", validatedData.username)
        .neq("id", userId);

      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(validatedData)
      .eq("id", userId);

    if (error) {
      logger.error({ error }, "Error updating account");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    log.info({ updated: true }, "Account updated successfully");
    return NextResponse.json({ message: "Account updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logger.error({ error }, "Error parsing request body");
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const userId = await getUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    logger.error({ error }, "Error deleting account");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Account deleted successfully" });
}
