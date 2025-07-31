import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Handles GET requests to retrieve subcategories from the database, optionally filtered by a parent category ID.
 *
 * Extracts the `category_id` query parameter from the request URL. If provided, only subcategories with a matching `parent_category_id` are returned. Results are ordered by name.
 *
 * @param request - The incoming HTTP request
 * @returns A JSON response containing the list of subcategories or an error message with a 500 status code on failure
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const supabase = await getSupabaseRouteHandler(cookies);

    let query = supabase.from("subcategories").select("*").order("name");

    if (categoryId) {
      query = query.eq("parent_category_id", Number(categoryId));
    }

    const { data: subcategories, error } = await query;

    if (error) {
      console.error("Error fetching subcategories:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategories" },
        { status: 500 },
      );
    }

    return NextResponse.json(subcategories);
  } catch (error) {
    console.error("Subcategories API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
