"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { useQuery } from "@tanstack/react-query";
import { getSellerProfileData } from "@/app/actions/user";
import { useAuth } from "@/contexts/auth-context";
import { followUser, unfollowUser } from "@/app/actions/user";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";

const SellerProfile = ({ seller }: { seller: { id: string } }) => {
  const { user } = useAuth();
  const { toast } = useToast();

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
      <div className="bg-card p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24 border-4 border-primary">
            <AvatarImage src={sellerProfile.avatar_url || "/placeholder.svg"} alt={sellerProfile.full_name} />
            <AvatarFallback>{sellerProfile.full_name?.substring(0, 2).toUpperCase() || "SE"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{sellerProfile.full_name}</h1>
            <p className="text-muted-foreground">@{sellerProfile.username}</p>
            <p className="text-muted-foreground">{sellerProfile.location}</p>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <span className="font-bold">{followersCount}</span> Followers
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">{averageRating.toFixed(1)}</span> ({ratingCount} ratings) 
              </div>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {user && user.id !== seller.id && (
                <Button variant="outline" onClick={handleFollowToggle}>
                    {isFollowing ? "Unfollow" : "Follow"}
                </Button>
            )}
            <Button>Message</Button>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Listings from {sellerProfile.full_name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sellerProfile.listings.map((listing: any) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default SellerProfile;