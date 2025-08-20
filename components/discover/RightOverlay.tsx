"use client";

import { Heart, MessageCircle, Share2, Star, Bookmark, Plus, Check } from "lucide-react";
import ActionButton from "./ActionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { followUser, unfollowUser, toggleLikeListing } from "@/app/actions/user";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RightOverlayProps {
    sellerId: string;
    sellerAvatar: string;
    listingId: string;
}

const RightOverlay = ({ sellerId, sellerAvatar, listingId }: RightOverlayProps) => {
    const user = useAuthStore((s) => s.user);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isFollowing, setIsFollowing] = useState(false); // This should be fetched from backend
    const [isLiked, setIsLiked] = useState(false); // This should be fetched from backend
    const [likeCount, setLikeCount] = useState(0); // This should be fetched from backend

    // Dummy check for now, in real app, fetch from DB
    useEffect(() => {
        // Simulate fetching follow status
        if (user && user.id !== sellerId) {
            // You would fetch the actual follow status here
            setIsFollowing(false); // Placeholder
        }
        // Simulate fetching like status and count
        setIsLiked(false); // Placeholder
        setLikeCount(Math.floor(Math.random() * 100)); // Placeholder
    }, [user, sellerId, listingId]);

    const handleFollowToggle = async () => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to follow users.",
                variant: "destructive",
            });
            return;
        }
        if (user.id === sellerId) {
            toast({
                title: "Cannot Follow Yourself",
                description: "You cannot follow your own profile.",
                variant: "destructive",
            });
            return;
        }

        try {
            if (isFollowing) {
                await unfollowUser(sellerId);
                setIsFollowing(false);
                toast({
                    title: "Unfollowed",
                    description: "You have unfollowed this user.",
                });
            } else {
                await followUser(sellerId);
                setIsFollowing(true);
                toast({
                    title: "Following",
                    description: "You are now following this user.",
                });
            }
            // Invalidate seller profile query to update follower count
            queryClient.invalidateQueries({ queryKey: ["sellerProfile", sellerId] });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to perform action.",
                variant: "destructive",
            });
        }
    };

    const likeMutation = useMutation({
        mutationFn: toggleLikeListing,
        onMutate: async () => {
            // Optimistically update the UI
            const previousLiked = isLiked;
            const previousLikeCount = likeCount;

            setIsLiked(!previousLiked);
            setLikeCount((prev) => (previousLiked ? prev - 1 : prev + 1));

            return { previousLiked, previousLikeCount };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            setIsLiked(context?.previousLiked || false);
            setLikeCount(context?.previousLikeCount || 0);
            toast({
                title: "Error",
                description: err.message || "Failed to like/unlike listing.",
                variant: "destructive",
            });
        },
        onSettled: () => {
            // Invalidate discover listings query to refetch and ensure consistency
            queryClient.invalidateQueries({ queryKey: ["discoverListings"] });
        },
    });

    const handleLikeToggle = () => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to like listings.",
                variant: "destructive",
            });
            return;
        }
        likeMutation.mutate(listingId);
    };

  return (
    <div className="absolute bottom-24 right-2 flex flex-col items-center gap-4">
        <div className="relative">
            <Link href={`/seller/${sellerId}`}>
                <Avatar className="w-12 h-12 border-2 border-white cursor-pointer">
                    <AvatarImage src={sellerAvatar || "https://github.com/shadcn.png"} alt="Seller Avatar" />
                    <AvatarFallback>SE</AvatarFallback>
                </Avatar>
            </Link>
            {user && user.id !== sellerId && (
                <Button
                    size="icon"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full" 
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "default" : "secondary"}
                >
                    {isFollowing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
            )}
        </div>
      <ActionButton icon={<Heart className="w-6 h-6" />} label={likeCount.toString()} onClick={handleLikeToggle} activeColor={isLiked ? "text-red-500" : ""} />
      <ActionButton icon={<Star className="w-6 h-6" />} label="Review" activeColor="text-yellow-500" />
      <ActionButton icon={<MessageCircle className="w-6 h-6" />} label="Message" activeColor="text-blue-500" />
      <ActionButton icon={<Share2 className="w-6 h-6" />} label="Share" />
      <ActionButton icon={<Bookmark className="w-6 h-6" />} label="Save" activeColor="text-blue-500" />
    </div>
  );
};

export default RightOverlay;