"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { useQuery } from "@tanstack/react-query";
import { getSellerProfileData } from "@/app/actions/user";
import { useAuthStore } from "@/stores/authStore";
import { followUser, unfollowUser } from "@/app/actions/user";
import { useToast } from "@/components/ui/use-toast";
import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Added

const LazyMessageAction = React.lazy(() => import('@/components/common/LazyMessageAction'));

const SellerProfile = ({ seller }: { seller: { id: string } }) => {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sellerProfile", seller.id],
    queryFn: () => getSellerProfileData(seller.id),
  });

  const [isFollowing, setIsFollowing] = useState(false); // This should be fetched from backend

  useEffect(() => {
    // In a real app, you'd check if user.id follows sellerId from your 'followers' table
    // For now, let's just set it to false by default
    if (user && user.id !== seller.id) {
        // You would fetch the actual follow status here
        setIsFollowing(false); // Placeholder
    }
  }, [user, seller.id]);

  const handleFollowToggle = async () => {
    if (!user) {
        toast({
            title: "Login Required",
            description: "Please login to follow users.",
            variant: "destructive",
        });
        return;
    }
    if (user.id === seller.id) {
        toast({
            title: "Cannot Follow Yourself",
            description: "You cannot follow your own profile.",
            variant: "destructive",
        });
        return;
    }

    try {
        if (isFollowing) {
            await unfollowUser(seller.id);
            setIsFollowing(false);
            toast({
                title: "Unfollowed",
                description: "You have unfollowed this user.",
            });
        } else {
            await followUser(seller.id);
            setIsFollowing(true);
            toast({
                title: "Following",
                description: "You are now following this user.",
            });
        }
        refetch(); // Refetch seller data to update follower count
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to perform action.",
            variant: "destructive",
        });
    }
  };

  

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Loading seller profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        Error loading seller profile: {error.message}
      </div>
    );
  }

  const sellerProfile = data?.profile;
  const followersCount = data?.followersCount ?? 0;
  const averageRating = data?.averageRating ?? 0;
  const ratingCount = data?.ratingCount ?? 0;

  if (!sellerProfile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Seller not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-card p-6 rounded-lg shadow-md mb-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-24 h-24 border-4 border-primary">
            <AvatarImage src={sellerProfile.avatar_url || "/placeholder.svg"} alt={sellerProfile.full_name} />
            <AvatarFallback>{sellerProfile.full_name?.substring(0, 2).toUpperCase() || "SE"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center break-words">{sellerProfile.full_name} <span className="text-muted-foreground text-lg sm:text-xl">@{sellerProfile.username}</span></h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">{averageRating.toFixed(1)}</span> ({ratingCount} ratings)
              </div>
              <p className="text-muted-foreground">{followersCount} followers</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full px-4 sm:w-auto">
            {user && user.id !== seller.id && (
                <Button variant="outline" onClick={handleFollowToggle} className="rounded-full px-6 w-full sm:w-auto">
                    {isFollowing ? "Unfollow" : "Follow"}
                </Button>
            )}
            <Suspense fallback={null}>
              <LazyMessageAction
                sellerId={seller.id}
                renderButton={(onClick) => (
                  <Button className="rounded-full px-6 w-full sm:w-auto" onClick={onClick}>Message</Button>
                )}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Seller&apos;s Listings</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sellerProfile.listings.map((listing: any) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default SellerProfile;