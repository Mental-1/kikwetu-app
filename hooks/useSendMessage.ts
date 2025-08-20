import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import React from "react";

interface UseSendMessageOptions {
  sellerId: string;
  listingId?: string; // Optional, for when a message is related to a specific listing
}

export const useSendMessage = ({ sellerId, listingId }: UseSendMessageOptions) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const sendMessage = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages.",
        variant: "destructive",
      });
      return;
    }

    // Prevent sending message to self
    if (user.id === sellerId) {
      toast({
        title: "Cannot Message Yourself",
        description: "You cannot send a message to your own profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerId,
          ...(listingId && { listingId }), // Conditionally add listingId
        }),
      });

      if (response.ok) {
        const { conversationId } = await response.json();
        router.push(`/dashboard/messages?conversationId=${conversationId}`);
      } else {
        if (response.status === 401) {
          toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
          router.push("/auth");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: (errorData as any).error || "Failed to start conversation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation.",
        variant: "destructive",
      });
    }
  }, [user, sellerId, listingId, router, toast]);

  return { sendMessage };
};
