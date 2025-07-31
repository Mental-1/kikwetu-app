import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PUT(request: Request) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 },
    );
  }
  const { userId, avatarUrl } = await request.json();

  // Validate avatar URL format
  try {
    new URL(avatarUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid avatar URL format" },
      { status: 400 },
    );
  }

  const allowedDomains = ["www.routteme.com"];
  const avatarDomain = new URL(avatarUrl).hostname;
  if (!allowedDomains.includes(avatarDomain)) {
    return NextResponse.json(
      { error: "Avatar URL must be from an allowed domain" },
      { status: 400 },
    );
  }

  if (!userId || !avatarUrl) {
    return NextResponse.json(
      { error: "User ID and avatar URL are required" },
      { status: 400 },
    );
  }
  if (user.id !== userId) {
    return NextResponse.json(
      { error: "Forbidden. You can only update your own avatar." },
      { status: 403 },
    );
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile avatar:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Avatar URL updated successfully" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
