"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function followUser(userIdToFollow: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to follow a user.");
  }

  const { data, error } = await supabase
    .from("followers")
    .insert([
      { follower_id: user.id, following_id: userIdToFollow },
    ]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/seller/${userIdToFollow}`); // Revalidate the seller page
  revalidatePath("/discover"); // Revalidate the discover page

  return data;
}

export async function unfollowUser(userIdToUnfollow: string) {
    const supabase = await getSupabaseServer();
    const { data: { user } = {} } = await supabase.auth.getUser(); // Destructure with default empty object

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

    revalidatePath(`/seller/${userIdToUnfollow}`); // Revalidate the seller page
    revalidatePath("/discover"); // Revalidate the discover page

    return data;
}

export async function getSellerProfileData(sellerId: string) {
    const supabase = await getSupabaseServer();

    // Fetch seller profile
    const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, listings(*)") // Fetch listings associated with the profile
        .eq("id", sellerId)
        .single();

    if (profileError) {
        console.error("Failed to fetch seller profile", profileError);
        throw new Error(profileError.message);
    }

    // Fetch follower count
    const { count: followersCount, error: followersError } = await supabase
        .from("followers")
        .select("*", { count: "exact" })
        .eq("following_id", sellerId);

    if (followersError) {
        console.error("Failed to fetch followers count", followersError);
        // Don't throw, just log and proceed without count
    }

    // Fetch average rating and rating count (assuming a 'reviews' table)
    const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", sellerId);

    if (reviewsError) {
        console.error("Failed to fetch reviews data", reviewsError);
        // Don't throw, just log and proceed without reviews
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