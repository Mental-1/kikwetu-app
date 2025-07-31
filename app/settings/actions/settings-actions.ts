"use client";

import { toast } from "@/components/ui/use-toast";

export interface UserSettings {
  notifications?: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    sms_notifications?: boolean;
    marketing_emails?: boolean;
    new_messages?: boolean;
    listing_updates?: boolean;
    price_alerts?: boolean;
  };
  privacy?: {
    profile_visibility?: "public" | "private" | "friends";
    show_phone?: boolean;
    show_email?: boolean;
    show_last_seen?: boolean;
  };
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
    theme?: string;
  };
}

/**
 * Retrieves the current user's settings from the server.
 *
 * @returns The user settings object if successful, or `null` if the fetch fails.
 */
export async function getSettings() {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    toast({
      title: "Error",
      description: "Could not fetch your settings.",
      variant: "destructive",
    });
    return null;
  }
}

/**
 * Saves the provided user settings to the server.
 *
 * Sends a POST request with the given settings data. Displays a success notification on completion or an error notification if the operation fails.
 *
 * @param settings - The user settings data to be saved
 */
export async function saveSettings(settings: UserSettings) {
  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error("Failed to save settings");
    }
    toast({
      title: "Success",
      description: "Your settings have been saved.",
    });
  } catch (error) {
    console.error(error);
    toast({
      title: "Error",
      description: "Could not save your settings.",
      variant: "destructive",
    });
  }
}

export async function updateSetting(setting: any) {
  try {
    const response = await fetch(`/api/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(setting),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update setting");
    }

    toast({
      title: "Success",
      description: "Setting updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update setting:", error);
    toast({
      title: "Error",
      description: (error as Error).message,
      variant: "destructive",
    });
  }
}
