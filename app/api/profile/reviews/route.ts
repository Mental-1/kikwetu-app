import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reviewCountCache } from "@/utils/lru-cache"; // Import the LRU cache instance

// GET: Fetch review count for a specific user_id
// Example usage: GET /api/reviews?userId=some-user-id
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({
        message: "User ID is required",
        status: "error",
        code: 400,
      });
    }

    // --- Cache Lookup ---
    const cachedCount = reviewCountCache.get(userId);
    if (cachedCount !== undefined) {
      console.log(`Cache hit for user ${userId} review count.`);
      return NextResponse.json({
        message: "Review count fetched successfully from cache.",
        status: "success",
        code: 200,
        data: {
          reviewsCount: cachedCount,
        },
      });
    }

    // --- Database Fetch if not in cache ---
    const { count, error: countError } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Error fetching review count from DB:", countError);
      return NextResponse.json({
        message: "Failed to fetch review count.",
        status: "error",
        code: 500,
      });
    }

    const reviewsCount = count ?? 0;

    // --- Cache Set ---
    reviewCountCache.set(userId, reviewsCount);
    console.log(
      `Cache miss for user ${userId}, data fetched from DB and cached.`,
    );

    return NextResponse.json({
      message: "Review count fetched successfully.",
      status: "success",
      code: 200,
      data: {
        reviewsCount,
      },
    });
  } catch (error) {
    console.error("An unexpected error occurred in GET /api/reviews:", error);
    return NextResponse.json({
      message: "An unexpected error occurred.",
      status: "error",
      code: 500,
    });
  }
}

// POST: Create a new review
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  try {
    const body = await request.json();
    const { userId, reviewContent, rating, sellerId } = body;

    if (!userId || !reviewContent || !rating || !sellerId) {
      return NextResponse.json({
        message: "User ID, review content, rating, and seller ID are required.",
        status: "error",
        code: 400,
      });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        message: "Rating must be between 1 and 5.",
        status: "error",
        code: 400,
      });
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        reviewer_id: userId,
        comment: reviewContent,
        rating: rating,
        seller_id: sellerId,
      })
      .select();

    if (error) {
      console.error("Error creating review:", error);
      return NextResponse.json({
        message: "Review creation failed.",
        status: "error",
        code: 400,
      });
    }

    // --- Cache Invalidation ---
    reviewCountCache.delete(sellerId);
    console.log(
      `Cache invalidated for user ${sellerId} review count after POST.`,
    );

    return NextResponse.json({
      message: "Review created successfully.",
      status: "success",
      code: 201,
      data: {
        reviewId: data && data.length > 0 ? data[0].id : null,
        insertedReview: data && data.length > 0 ? data[0] : null,
      },
    });
  } catch (error) {
    console.error("An unexpected error occurred in POST /api/reviews:", error);
    return NextResponse.json({
      message: "An unexpected error occurred.",
      status: "error",
      code: 500,
    });
  }
}

// PUT: Update an existing review
// Example usage: PUT /api/reviews?reviewId=some-review-id
export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({
      message: "Unauthorized",
      status: "error",
      code: 401,
    });
  }

  try {
    const reviewId = request.nextUrl.searchParams.get("reviewId");
    const body = await request.json();
    const { reviewContent, userId } = body;

    if (!reviewId || !reviewContent || !userId) {
      return NextResponse.json({
        message: "Review ID, review content, and User ID are required.",
        status: "error",
        code: 400,
      });
    }

    // First, fetch the review to verify ownership
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("reviewer_id, seller_id")
      .eq("id", reviewId)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json({
        message: "Review not found",
        status: "error",
        code: 404,
      });
    }

    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json({
        message: "Forbidden: You can only update your own reviews",
        status: "error",
        code: 403,
      });
    }

    const { data, error } = await supabase
      .from("reviews")
      .update({
        comment: reviewContent,
      })
      .eq("id", reviewId)
      .select();

    if (error) {
      console.error("Error updating review:", error);
      return NextResponse.json({
        message: "Review update failed.",
        status: "error",
        code: 400,
      });
    }

    // --- Cache Invalidation (if caching individual reviews or lists) ---
    // If you had `userReviewsListCache`, you'd invalidate it here:
    // userReviewsListCache.delete(userId);
    // console.log(`Cache invalidated for user ${userId} review list after PUT.`);
    // Invalidate seller's review count cache since review content might affect aggregations
    if (existingReview?.seller_id) {
      reviewCountCache.delete(existingReview.seller_id);
    }
    return NextResponse.json({
      message: "Review updated successfully.",
      status: "success",
      code: 200,
      data: {
        reviewId: data && data.length > 0 ? data[0].id : null,
        updatedReview: data && data.length > 0 ? data[0] : null,
      },
    });
  } catch (error) {
    console.error("An unexpected error occurred in PUT /api/reviews:", error);
    return NextResponse.json({
      message: "An unexpected error occurred.",
      status: "error",
      code: 500,
    });
  }
}

// DELETE: Delete a review
// Example usage: DELETE /api/reviews?reviewId=some-review-id&userId=some-user-id
export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);

  try {
    const reviewId = request.nextUrl.searchParams.get("reviewId");
    const userId = request.nextUrl.searchParams.get("userId"); // Crucial for cache invalidation

    if (!reviewId || !userId) {
      return NextResponse.json({
        message: "Review ID and User ID are required.",
        status: "error",
        code: 400,
      });
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      console.error("Error deleting review:", error);
      return NextResponse.json({
        message: "Review deletion failed.",
        status: "error",
        code: 400,
      });
    }

    // --- Cache Invalidation ---
    reviewCountCache.delete(userId);
    console.log(
      `Cache invalidated for user ${userId} review count after DELETE.`,
    );

    return NextResponse.json({
      message: "Review deleted successfully.",
      status: "success",
      code: 200,
    });
  } catch (error) {
    console.error(
      "An unexpected error occurred in DELETE /api/reviews:",
      error,
    );
    return NextResponse.json({
      message: "An unexpected error occurred.",
      status: "error",
      code: 500,
    });
  }
}
