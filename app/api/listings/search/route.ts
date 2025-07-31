import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { searchSchema } from "@/lib/validations";
import { generalApiLimiter, getClientIdentifier } from "@/utils/rate-limiting";
import { createAuditLogger } from "@/utils/audit-logger";
import { toast } from "sonner";
import { cookies } from "next/headers";

/**
 * Handles search requests for listings with rate limiting, input validation, audit logging, and pagination.
 *
 * Processes search parameters from the request, validates them, and queries the listings database using a remote procedure. Returns a structured JSON response containing paginated listings, metadata, and relevant headers for caching and rate limiting. Responds with appropriate error messages and status codes for validation failures, rate limit violations, or unexpected errors.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = generalApiLimiter.check(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime,
            ).toISOString(),
          },
        },
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse parameters using your existing approach
    const input = {
      query: searchParams.get("q") || undefined,
      categoryId: searchParams.get("category")
        ? Number.parseInt(searchParams.get("category")!)
        : undefined,
      subcategoryId: searchParams.get("subcategory")
        ? Number.parseInt(searchParams.get("subcategory")!)
        : undefined,
      location: searchParams.get("location") || undefined,
      minPrice: searchParams.get("minPrice")
        ? Number.parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number.parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      condition: searchParams.get("condition") || undefined,
      userLat: searchParams.get("lat")
        ? Number.parseFloat(searchParams.get("lat")!)
        : undefined,
      userLng: searchParams.get("lng")
        ? Number.parseFloat(searchParams.get("lng")!)
        : undefined,
      radius: searchParams.get("radius")
        ? Number.parseInt(searchParams.get("radius")!)
        : 50,
      sortBy: searchParams.get("sort") || "relevance",
      page: searchParams.get("page")
        ? Number.parseInt(searchParams.get("page")!)
        : 1,
      limit: Math.min(
        searchParams.get("limit")
          ? Number.parseInt(searchParams.get("limit")!)
          : 20,
        50, // Enforce maximum limit
      ),
    };

    // Enhanced validation with better error messages
    try {
      const validatedInput = searchSchema.parse(input);
      const supabase = await getSupabaseRouteHandler(cookies);

      // Log search for analytics (optional)
      const auditLogger = createAuditLogger({
        ip_address: clientId,
      });

      await auditLogger.log({
        action: "search_listings",
        resource_type: "search",
        metadata: {
          query: validatedInput.query,
          filters: {
            category: validatedInput.categoryId,
            location: validatedInput.location,
            priceRange: [validatedInput.minPrice, validatedInput.maxPrice],
          },
        },
      });

      // Use your existing RPC function
      const { data: listings, error } = await supabase.rpc("search_listings", {
        search_query: validatedInput.query,
        category_filter: validatedInput.categoryId,
        subcategory_filter: validatedInput.subcategoryId,
        location_filter: validatedInput.location,
        min_price_filter: validatedInput.minPrice,
        max_price_filter: validatedInput.maxPrice,
        condition_filter: validatedInput.condition,
        user_lat: validatedInput.userLat,
        user_lng: validatedInput.userLng,
        radius_km: validatedInput.radius,
        sort_by: validatedInput.sortBy,
        page_limit: validatedInput.limit,
        page_offset: (validatedInput.page - 1) * validatedInput.limit,
      });

      if (error) {
        console.error("Search error:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Search failed",
            message: "Unable to complete search. Please try again.",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          },
          { status: 500 },
        );
      }
      // Fetch one extra record to determine if there is a next page
      const limitPlusOne = validatedInput.limit + 1;
      const offset = (validatedInput.page - 1) * validatedInput.limit;
      const { data: listingsPage, error: errorPage } = await supabase
        .from("listings")
        .select("*")
        .range(offset, offset + limitPlusOne - 1);

      if (errorPage) {
        // ...handle error...
        toast.error("Failed to fetch listings. Please try again later.");
      }

      // Determine if there is a next page
      let hasNextPage = false;
      let paginatedListings = listingsPage ?? [];

      if (paginatedListings.length > validatedInput.limit) {
        hasNextPage = true;
        paginatedListings = paginatedListings.slice(0, validatedInput.limit);
      }

      const totalCount = paginatedListings.length;

      // Enhanced response with your existing structure plus additional metadata
      const response = NextResponse.json({
        success: true,
        listings: paginatedListings,
        totalCount,
        hasNextPage,
        page: validatedInput.page,
        limit: validatedInput.limit,
        // Additional metadata for better client handling
        meta: {
          searchQuery: validatedInput.query,
          appliedFilters: {
            category: validatedInput.categoryId,
            subcategory: validatedInput.subcategoryId,
            location: validatedInput.location,
            priceRange: {
              min: validatedInput.minPrice,
              max: validatedInput.maxPrice,
            },
            condition: validatedInput.condition,
            radius: validatedInput.radius,
          },
          sortBy: validatedInput.sortBy,
          timestamp: new Date().toISOString(),
        },
      });

      // Add caching headers for better performance
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString(),
      );

      return response;
    } catch (validationError) {
      // Handle Zod validation errors
      if (
        typeof validationError === "object" &&
        validationError !== null &&
        "errors" in validationError
      ) {
        const errorDetails = (validationError as any).errors.map(
          (err: any) => ({
            path: err.path.join("."),
            message: err.message,
          }),
        );
        return NextResponse.json(
          { error: "Invalid search parameters", details: errorDetails },
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      // If it's not a validation error, handle as internal server error
      console.error("Search API error:", validationError);
      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          message: "An unexpected error occurred. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error in search route:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
