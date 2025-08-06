import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import pino from "pino";

const logger = pino({
  level: "info", // Force info level for all environments to ensure visibility
});

/**
 * Retrieves listing data, either a single listing by ID or a paginated list of listings.
 *
 * If an `id` query parameter is provided, returns the corresponding listing with additional mocked fields (`distance`, `rating`, `reviews`). If not found, responds with 404. Without an `id`, returns a paginated list of listings ordered by creation date, including total count, pagination metadata, and the same mocked fields for each listing.
 *
 * @returns A JSON response containing either a single formatted listing or a paginated list of listings with metadata.
 */
export async function GET(request: Request) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const { searchParams } = new URL(request.url);

  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "8", 10);

  try {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("listings")
      .select(
        `
        id,
        title,
        price,
        location,
        latitude,
        longitude,
        condition,
        status,
        featured,
        images,
        created_at,
        category:categories (name)
      `,
        { count: "exact" },
      )
      .eq("status", "active") // Only show active listings
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      return NextResponse.json(
        { error: "An error occurred while fetching listings" },
        { status: 500 },
      );
    }

    const formattedListings =
      data?.map((listing) => ({
        ...listing,
        id: String(listing.id),
        location: {
          lat: listing.latitude,
          lng: listing.longitude,
        },
        rating: 0,
        reviews: 0,
      })) || [];

    const hasMore = count ? offset + formattedListings.length < count : false;

    return NextResponse.json(
      {
        listings: formattedListings,
        totalCount: count,
        hasMore,
        currentPage: page,
        limit,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=59",
        },
      },
    );
  } catch (err: any) {
    console.error("Server error in GET /api/listings:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Creates a new listing associated with the authenticated user.
 *
 * Authenticates the user, validates and sanitizes the request body, and inserts a new listing into the database. Returns the created listing data with a 201 status on success, or an error response if authentication fails or an internal error occurs.
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized. Please log in to create a listing." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    logger.info({ body }, "Received POST /api/listings request body");

    // 1. Fetch the category from the database using the ID
    const categoryId = body.category_id;
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      console.error("Error fetching category:", categoryError);
      return NextResponse.json(
        { error: `Category '${categoryId}' not found.` },
        { status: 400 },
      );
    }

    const ALLOWED_STATUSES = [
      "active",
      "inactive",
      "pending",
      "expired",
    ] as const;

    // 2. Construct a clean listing data object, ensuring all IDs are numeric
    const listingData = {
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: String(body.title) || "Untitled Listing",
      description: String(body.description) || "No description provided",
      price: Number(body.price) || 0,
      location: body.location || "Unknown Location",
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      category_id: category.id, // Use the fetched numeric category ID
      subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,
      status: ALLOWED_STATUSES.includes(body.status) ? body.status : "active",
      images: Array.isArray(body.images) ? body.images : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      condition: body.condition || "used",
      plan_id: body.plan_id || null,
    };

    logger.debug({ listingData }, "Listing data before insertion:");

    const { data, error } = await supabase
      .from("listings")
      .insert([listingData])
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Error creating listing:");
      return NextResponse.json(
        { error: "Internal server error occurred while creating listing" },
        { status: 500 },
      );
    }

    // Increment the user's listing count
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("listing_count")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logger.error(
        { profileError },
        "Error fetching user profile for listing count:",
      );
      // Log the error but don't block the listing creation response
    }

    const currentListingCount = profile?.listing_count || 0;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ listing_count: currentListingCount + 1 })
      .eq("id", user.id);

    if (updateError) {
      logger.error({ updateError }, "Error updating user listing count:");
    }

    revalidatePath("/listings");
    revalidatePath("/");

    return NextResponse.json(
      { message: "Listing created successfully", listing: data },
      { status: 201 },
    );
  } catch (err: any) {
    logger.error({ err }, "Server error in POST /api/listings:");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handles updating an existing listing after verifying user authentication and ownership.
 *
 * Expects a JSON body containing the listing `id` and fields to update. Returns appropriate error responses for missing ID, unauthorized access, forbidden ownership, not found, or server errors. On success, returns the updated listing data.
 */
export async function PUT(request: Request) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized. Please log in to update a listing." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Listing ID is required for update." },
        { status: 400 },
      );
    }
    const { data: existingListing, error: fetchError } = await supabase
      .from("listings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { message: "Listing not found" },
        { status: 404 },
      );
    }
    if (fetchError) {
      console.error("Error checking listing ownership:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existingListing.user_id !== user.id) {
      return NextResponse.json(
        {
          message:
            "Forbidden. You do not have permission to update this listing.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("listings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating listing:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Listing updated successfully", listing: data },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Server error in PUT /api/listings:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Deletes a listing by ID after verifying user authentication and ownership.
 *
 * Requires the authenticated user to own the listing. Returns appropriate error responses for missing ID, unauthorized access, forbidden action, not found, or server errors. On success, returns a confirmation message with the deleted listing ID.
 */
export async function DELETE(request: Request) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const { searchParams } = new URL(request.url);

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized. Please log in to delete a listing." },
      { status: 401 },
    );
  }

  try {
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Listing ID is required for deletion." },
        { status: 400 },
      );
    }

    // First, fetch the listing to verify ownership before deleting
    const { data: existingListing, error: fetchError } = await supabase
      .from("listings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { message: "Listing not found" },
        { status: 404 },
      );
    }
    if (fetchError) {
      console.error("Error checking listing ownership:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Authorization check: Ensure the authenticated user owns the listing
    if (existingListing.user_id !== user.id) {
      return NextResponse.json(
        {
          message:
            "Forbidden. You do not have permission to delete this listing.",
        },
        { status: 403 },
      );
    }

    // Perform the deletion
    const { error } = await supabase.from("listings").delete().eq("id", id);

    if (error) {
      console.error("Error deleting listing:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrement the user's listing count
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("listing_count")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Error fetching user profile for listing count decrement:",
        profileError,
      );
      // Log the error but don't block the listing deletion response
    }

    const currentListingCount = profile?.listing_count || 0;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ listing_count: Math.max(0, currentListingCount - 1) })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Error updating user listing count after deletion:",
        updateError,
      );
      // Log the error but don't block the listing deletion response
    }

    // Supabase delete operation doesn't return data by default,
    // so we return a success message.
    return NextResponse.json(
      { message: `Listing with ID ${id} deleted successfully` },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Server error in DELETE /api/listings:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
