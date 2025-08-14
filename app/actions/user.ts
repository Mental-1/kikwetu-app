"use server";

import { getSupabaseServer } from "@/utils/supabase/server";

export async function followUser(userIdToFollow: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to follow a user.");
  }
  if (user.id === userIdToFollow) {
    throw new Error("You cannot follow yourself.");
  }

  const { data, error } = await supabase
    .from("followers")
    .upsert(
      [{ follower_id: user.id, following_id: userIdToFollow }],
      { onConflict: "follower_id,following_id" }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function unfollowUser(userIdToUnfollow: string) {
    const supabase = await getSupabaseServer();
    const { data: { user } = {} } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to unfollow a user.");
    }

    const { data, error } = await supabase
        .from("followers")
        .delete()
        .match({ follower_id: user.id, following_id: userIdToUnfollow });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function getSellerProfileData(sellerId: string) {
    const supabase = await getSupabaseServer();

    const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, listings!status=eq.active(*)")
        .eq("id", sellerId)
        .limit(20, { foreignTable: "listings" })
        .order("created_at", { foreignTable: "listings", ascending: false })
        .single();

    if (profileError) {
        console.error("Failed to fetch seller profile", profileError);
        throw new Error(profileError.message);
    }

    const { count: followersCount, error: followersError } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", sellerId);

    if (followersError) {
        console.error("Failed to fetch followers count", followersError);
    }

    const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", sellerId);

    if (reviewsError) {
        console.error("Failed to fetch reviews data", reviewsError);
    }

    let averageRating = 0;
    let ratingCount = 0;

    if (reviewsData && reviewsData.length > 0) {
        ratingCount = reviewsData.length;
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / ratingCount;
    }

    return {
        profile: profileData,
        followersCount: followersCount || 0,
        averageRating: averageRating,
        ratingCount: ratingCount,
    };
}

export async function toggleLikeListing(listingId: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to like/unlike a listing.");
  }

  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(checkError.message);
  }

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .match({ user_id: user.id, listing_id: listingId });

    if (deleteError) {
      throw new Error(deleteError.message);
    }
    return { liked: false };
  } else {
    const { error: insertError } = await supabase
      .from("likes")
      .insert([
        { user_id: user.id, listing_id: listingId },
      ]);

    if (insertError) {
      throw new Error(insertError.message);
    }
    return { liked: true };
  }
}
