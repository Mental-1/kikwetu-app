"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import {
  Camera,
  Star,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getAccountData } from "./actions";
import { deleteAccount } from "./actions/delete-account";
import { updateAccount } from "./actions/update-account";
import { updatePassword } from "./actions/update-password";
import { updateEmail } from "./actions/update-email";
import { updateAvatarUrl } from "./actions/update-avatar-url";
import { enable2FA, disable2FA, verify2FA } from "./actions/2fa";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";

// Type definitions
interface FormData {
  full_name: string | null;
  username: string | null;
  bio: string | null;
  phone_number: string | null;
  location: string | null;
  website: string | null;
}

function AccountDetails() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: accountData } = useSuspenseQuery({
    queryKey: ["accountData", user?.id],
    queryFn: getAccountData,
  });

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(
    accountData.formData,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading: isUploading } = useFileUpload({
    uploadType: "profiles",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFASaving, setTwoFASaving] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (accountData?.formData) {
      setFormData(accountData.formData);
    }
  }, [accountData]);

  const handleSave = async () => {
    if (!user || !formData) return;

    setSaving(true);
    await updateAccount(formData);
    await queryClient.invalidateQueries({ queryKey: ["accountData", user.id] });
    setSaving(false);
    toast({
      title: "Success",
      description: "Your account has been updated.",
    });
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete your account?")) {
      await deleteAccount();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const result = await uploadFile(file);
      if (result?.url && user) {
        await updateAvatarUrl(user.id, result.url);
        await queryClient.invalidateQueries({
          queryKey: ["accountData", user.id],
        });
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been successfully updated.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: "Failed to update profile picture.",
          variant: "destructive",
        });
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    setPasswordSaving(true);
    const { success, message } = await updatePassword(
      currentPassword,
      newPassword,
    );
    setPasswordSaving(false);
    if (success) {
      toast({
        title: "Success",
        description: message,
      });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEmailChange = async () => {
    setEmailSaving(true);
    const { success, message } = await updateEmail(newEmail);
    setEmailSaving(false);
    if (success) {
      toast({
        title: "Success",
        description: message,
      });
      setShowEmailModal(false);
      setNewEmail("");
    } else {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEnable2FA = async () => {
    setTwoFASaving(true);
    const { success, message, qrCode } = await enable2FA();
    setTwoFASaving(false);
    if (success && qrCode) {
      setQrCode(qrCode);
      toast({
        title: "Success",
        description: message,
      });
    } else {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleVerify2FA = async () => {
    setTwoFASaving(true);
    const { success, message } = await verify2FA(verificationCode);
    setTwoFASaving(false);
    if (success) {
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setQrCode(null);
      setVerificationCode("");
      toast({
        title: "Success",
        description: message,
      });
    } else {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDisable2FA = async () => {
    setTwoFASaving(true);
    const { success, message } = await disable2FA(verificationCode);
    setTwoFASaving(false);
    if (success) {
      setIs2FAEnabled(false);
      setShow2FAModal(false);
      setVerificationCode("");
      toast({
        title: "Success",
        description: message,
      });
    } else {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4">Loading Form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground">
            Manage your profile and account settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={
                          user?.user_metadata?.avatar_url ||
                          "/placeholder.svg?height=96&width=96"
                        }
                        alt={profile?.full_name || "User"}
                      />
                      <AvatarFallback>
                        {profile?.full_name?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <h3 className="text-xl font-semibold mt-4">
                    {profile?.full_name || "User"}
                  </h3>
                  <p className="text-muted-foreground">
                    @{profile?.username || "username"}
                  </p>

                  <div className="flex items-center mt-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-medium">{profile?.rating || 0}</span>
                    <span className="text-muted-foreground text-sm ml-1">
                      ({profile?.reviews_count || 0} reviews)
                    </span>
                  </div>

                  <Badge variant="secondary" className="mt-2">
                    {profile?.verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    {user?.email}
                  </div>
                  {profile?.phone_number && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      {profile.phone_number}
                    </div>
                  )}
                  {profile?.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      {profile.location}
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    Joined{" "}
                    {new Date(
                      profile?.created_at || user?.created_at || "",
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground">Items Sold</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{profile?.listing_count || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Active Listings
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground">Saved Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          phone_number: e.target.value,
                        }))
                      }
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Enter your location"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    placeholder="Enter your website URL"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Address</h4>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailModal(true)}
                  >
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Last changed 3 months ago
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShow2FAModal(true)}
                  >
                    {is2FAEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verification</CardTitle>
                <CardDescription>
                  Verify your account to build trust with other users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Email Verification</h4>
                      <p className="text-sm text-muted-foreground">
                        Your email is verified
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Verified</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                      <Phone className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Phone Verification</h4>
                      <p className="text-sm text-muted-foreground">
                        Verify your phone number
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Verify
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Identity Verification</h4>
                      <p className="text-sm text-muted-foreground">
                        Verify your identity with ID
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>
                  These actions are permanent and cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-destructive">
                      Delete Account
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? "Saving..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!is2FAEnabled ? (
              qrCode ? (
                <div className="text-center">
                  <p className="mb-4">
                    Scan the QR code with your authenticator app:
                  </p>
                  <Image
                    src={qrCode}
                    alt="QR Code"
                    width={192}
                    height={192}
                    className="mx-auto w-48 h-48"
                  />
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter code from app"
                    />
                  </div>
                  <Button
                    onClick={handleVerify2FA}
                    disabled={twoFASaving}
                    className="mt-4"
                  >
                    {twoFASaving ? "Verifying..." : "Verify and Enable 2FA"}
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4">
                    Enable two-factor authentication for added security.
                  </p>
                  <Button onClick={handleEnable2FA} disabled={twoFASaving}>
                    {twoFASaving ? "Generating..." : "Enable 2FA"}
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center">
                <p className="mb-4">
                  Two-Factor Authentication is currently enabled.
                </p>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="disable-code">Verification Code</Label>
                  <Input
                    id="disable-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter code from app to disable"
                  />
                </div>
                <Button
                  onClick={handleDisable2FA}
                  disabled={twoFASaving}
                  variant="destructive"
                  className="mt-4"
                >
                  {twoFASaving ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FAModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your new email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailChange} disabled={emailSaving}>
              {emailSaving ? "Saving..." : "Change Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Displays and manages the user's account page, allowing profile editing, avatar upload, password and email changes, two-factor authentication management, and account deletion.
 *
 * Renders profile information, account security settings, verification status, and provides interactive modals for updating sensitive information and enabling or disabling security features.
 */
export default function AccountPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>You must be logged in to view this page.</p>
          <Button className="p-3 text-white border border-primary mt-3">
            <Link href="/auth">Sign up</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
            <p className="mt-4">Loading Account Details...</p>
          </div>
        </div>
      }
    >
      <AccountDetails />
    </Suspense>
  );
}
