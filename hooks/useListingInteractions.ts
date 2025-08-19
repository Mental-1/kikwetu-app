import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { getSupabaseClient } from "@/utils/supabase/client";

const useListingInteractions = (listingId: string, sellerId: string) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ["listingInteractions", listingId, user?.id],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      
      // Fetch like status and count
      const { data: likes, count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact" })
        .eq("listing_id", listingId);
      
      const isLiked = user ? likes?.some(like => like.user_id === user.id) : false;
      
      // Fetch follow status
      let isFollowing = false;
      if (user && user.id !== sellerId) {
        const { data: followData } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", sellerId)
          .single();
        isFollowing = !!followData;
      }
      
      return { isLiked, likeCount: likeCount || 0, isFollowing };
    },
    enabled: !!listingId,
  });
};

export default useListingInteractions;
