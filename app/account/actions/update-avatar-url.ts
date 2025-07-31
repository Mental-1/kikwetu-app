"use server";

import { toast } from "@/components/ui/use-toast";

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
    try {
      const response = await fetch("/api/account/avatar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, avatarUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update avatar URL");
      }
      toast({
        title: "Success",
        description: "Profile picture updated successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }
  