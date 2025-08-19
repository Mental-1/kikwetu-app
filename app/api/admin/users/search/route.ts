import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";

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
    const query = searchParams.get("query");

    if (!query || query.trim() === "") {
      return NextResponse.json([], { status: 200 }); // Return empty array if no query
    }

    const searchQuery = `%${query.trim().toLowerCase()}%`;

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, username, email, full_name")
      .or(`username.ilike.${searchQuery},email.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
      .limit(10); // Limit results for performance

    if (error) {
      console.error("Error searching users:", error);
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/admin/users/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
