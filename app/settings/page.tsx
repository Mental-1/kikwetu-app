"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveSettings,
  getSettings,
  UserSettings,
} from "./actions/settings-actions";
import { deleteAccountById, exportUserData } from "./actions/account-actions";
import { getAvailableLanguages } from "./actions/language-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Bell, Shield, Globe, Download, Trash2, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { shallow } from "zustand/shallow";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const defaultSettings: UserSettings = {
  notifications: {
    email_notifications: false,
    push_notifications: false,
    sms_notifications: false,
    new_messages: false,
    listing_updates: false,
    marketing_emails: false,
    price_alerts: false,
  },
  privacy: {
    profile_visibility: "public",
    show_phone: false,
    show_email: false,
    show_last_seen: false,
  },
  preferences: {
    language: "en",
    currency: "USD",
    timezone: "UTC",
    theme: "system",
  },
};

/**
 * Renders the user account settings page, allowing authenticated users to view and manage their notification, privacy, preference, and data settings.
 *
 * Displays loading indicators while user or settings data is being fetched. If the user is not authenticated, prompts for login or account creation. Provides controls for updating notification preferences, privacy options, language, currency, timezone, exporting user data, and deleting the account.
 */
import { AuthState, useAuthStore } from "@/stores/authStore";

export default function SettingsPage() {
  const { user, isUserLoading } = useAuthStore(
    (s: AuthState) => ({ user: s.user, isUserLoading: s.loading }),
    shallow
  );
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery<UserSettings>({
    queryKey: ["userSettings", user?.id],
    queryFn: async () => {
      if (!user) return defaultSettings; // Return default if no user
      const fetchedSettings = await getSettings();
      return fetchedSettings || defaultSettings; // Ensure a default is always returned
    },
    enabled: !!user, // Only run this query if user is available
    initialData: defaultSettings, // Provide initial data to prevent undefined
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: availableLanguages,
    isLoading: isLanguagesLoading,
    error: languagesError,
  } = useQuery<{ code: string; name: string }[]>({
    queryKey: ["availableLanguages"],
    queryFn: getAvailableLanguages,
    staleTime: Infinity, // Languages are static, so never stale
    gcTime: Infinity, // Never garbage collect
  });

  // Use a local state to manage form changes, initialized from query data
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveSettings(localSettings);
      toast({
        title: "Success",
        description: "Your settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user.id] }); // Invalidate to refetch latest
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete your account.",
          variant: "destructive",
        });
        return;
      }
      try {
        await deleteAccountById(user.id);
        toast({
          title: "Success",
          description: "Your account has been deleted.",
        });
        router.push("/"); // Redirect to home or login page
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete account.",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportData = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to export data.",
        variant: "destructive",
      });
      return;
    }
    try {
      await exportUserData(user.id);
      toast({
        title: "Success",
        description: "Your data export has started.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  if (isUserLoading || isSettingsLoading || isLanguagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (settingsError || languagesError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error loading settings: {settingsError?.message || languagesError?.message}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>You must be logged in to view this page.</p>
          <Button
            className="p-3 text-white border border-primary mt-3"
            onClick={() => router.push("/auth")}
          >
            Create an account or log in.
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and privacy settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={localSettings.notifications?.email_notifications}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        email_notifications: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={localSettings.notifications?.push_notifications}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        push_notifications: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={localSettings.notifications?.sms_notifications}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        sms_notifications: checked,
                      },
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="new-messages">New Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new messages
                  </p>
                </div>
                <Switch
                  id="new-messages"
                  checked={localSettings.notifications?.new_messages}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        new_messages: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="listing-updates">Listing Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about your listing activity
                  </p>
                </div>
                <Switch
                  id="listing-updates"
                  checked={localSettings.notifications?.listing_updates}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        listing_updates: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Opt in to receive promotional emails and updates
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={localSettings.notifications?.marketing_emails}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        marketing_emails: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                <div>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>
                    Control your privacy and security settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Who can see your profile
                  </p>
                </div>
                <Select
                  value={localSettings.privacy?.profile_visibility}
                  onValueChange={(value) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        profile_visibility: value as
                          | "public"
                          | "private"
                          | "friends",
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-phone">Show Phone Number</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your phone number on your profile
                  </p>
                </div>
                <Switch
                  id="show-phone"
                  checked={localSettings.privacy?.show_phone}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      privacy: { ...prev.privacy, show_phone: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-email">Show Email Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your email address on your profile
                  </p>
                </div>
                <Switch
                  id="show-email"
                  checked={localSettings.privacy?.show_email}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      privacy: { ...prev.privacy, show_email: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-last-seen">Show Last Seen</Label>
                  <p className="text-sm text-muted-foreground">
                    Show when you were last active
                  </p>
                </div>
                <Switch
                  id="show-last-seen"
                  checked={localSettings.privacy?.show_last_seen}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      privacy: { ...prev.privacy, show_last_seen: checked },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                <div>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Customize your app experience
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={localSettings.preferences?.language}
                    onValueChange={(value) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, language: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages?.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={localSettings.preferences?.currency}
                    onValueChange={(value) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, currency: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="UGX">UGX (USh)</SelectItem>
                      <SelectItem value="TZS">TZS (TSh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={localSettings.preferences?.timezone}
                    onValueChange={(value) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, timezone: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Africa/Nairobi">
                        East Africa Time
                      </SelectItem>
                      <SelectItem value="Africa/Lagos">
                        West Africa Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                <div>
                  <CardTitle>Data & Privacy</CardTitle>
                  <CardDescription>
                    Manage your data and account
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of your data
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings}>Save All Settings</Button>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
