import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";
import { logger } from "@/lib/utils/logger";

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
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("query");
    const query = rawQuery?.trim() || "";

    // Require at least 2 characters to search
    if (query.length < 2) {
      return NextResponse.json([], { status: 200 }); // Return empty array if no query
    }

    const searchQuery = `%${query.toLowerCase()}%`;

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, username, email, full_name")
      .or(`username.ilike.${searchQuery},email.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
      .order("full_name", { ascending: true })
      .order("id", { ascending: true })
      .limit(10); // Limit results for performance

    if (error) {
      logger.error({ route: "/api/admin/users/search", adminId: user.id, query, queryLength: query.length, error }, "Error searching users");
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    logger.error({ route: "/api/admin/users/search", error }, "Error in GET /api/admin/users/search");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
