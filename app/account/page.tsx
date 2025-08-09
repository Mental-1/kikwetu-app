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
import { cn } from "@/lib/utils";
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
  TriangleAlert,
  Clock,
  Clipboard,
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
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { TwoFAProvider, useTwoFA } from '@/contexts/two-fa-context';
import { copyText } from '@/lib/utils/clipboard';
import dynamic from "next/dynamic";

const EmailVerificationModal = dynamic(() => import('@/components/verifications/VerificationModals').then(mod => mod.EmailVerificationModal), {
  loading: () => null,
  ssr: false
});

const PhoneVerificationModal = dynamic(() => import('@/components/verifications/VerificationModals').then(mod => mod.PhoneVerificationModal), {
  loading: () => null,
  ssr: false
});

const IdentityVerificationModal = dynamic(() => import('@/components/verifications/VerificationModals').then(mod => mod.IdentityVerificationModal), {
  loading: () => null,
  ssr: false
});

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
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { qrCode, secret, setQrCode, setSecret, clearTwoFAState } = useTwoFA();

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
  const [is2FAEnabled, setIs2FAEnabled] = useState(profile?.mfa_enabled ?? false);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [verificationCodeError, setVerificationCodeError] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'deleting' | 'success'>('confirm');
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [showIdentityVerificationModal, setShowIdentityVerificationModal] = useState(false);
  const [showSecret, setShowSecret] = useState(false);


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
    await refreshProfile();
    setSaving(false);
    toast({
      title: "Success",
      description: "Your account has been updated.",
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirmation = async () => {
    if (deleteConfirmation !== "delete") {
      toast({
        title: "Error",
        description: "Please type 'delete' to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    setDeleteStep('deleting');

    try {
      const result = await deleteAccount();
      if (result?.success) {
        setDeleteStep('success');
        setTimeout(() => {
          router.replace('/');
        }, 2000);
      } else {
        throw new Error(result?.message || 'Failed to delete account.');
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to delete account.",
        variant: "destructive",
      });
      setDeleteStep('confirm');
    } finally {
      setIsDeleting(false);
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
        await refreshProfile();
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
    try {
      const { success, message, qrCode, secret } = await enable2FA();
      if (success && qrCode && secret) {
        setQrCode(qrCode);
        // Consider not persisting `secret` in context; if kept, auto-clear via TTL (see snippet below).
        setSecret(secret);
        toast({ title: "Success", description: message });
      } else {
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to enable 2FA.", variant: "destructive" });
    } finally {
      setTwoFASaving(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) {
      setVerificationCodeError(true);
      toast({
        title: "Error",
        description: "Verification code is required.",
        variant: "destructive",
      });
      return;
    }
    setVerificationCodeError(false);
    setTwoFASaving(true);
    try {
      const { success, message } = await verify2FA(verificationCode);
      if (success) {
        setIs2FAEnabled(true);
        setShow2FAModal(false);
        setVerificationCode("");
        clearTwoFAState();
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
    } catch {
      toast({ title: "Error", description: "Failed to verify 2FA.", variant: "destructive" });
    } finally {
      setTwoFASaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode) {
      setVerificationCodeError(true);
      toast({
        title: "Error",
        description: "Verification code is required to disable 2FA.",
        variant: "destructive",
      });
      return;
    }
    setVerificationCodeError(false);
    setTwoFASaving(true);
    try {
      const { success, message } = await disable2FA(verificationCode);
      if (success) {
        setIs2FAEnabled(false);
        setShow2FAModal(false);
        setVerificationCode("");
        toast({ title: "Success", description: message });
      } else {
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to disable 2FA.", variant: "destructive" });
    } finally {
      setTwoFASaving(false);
      clearTwoFAState();
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
                    {accountData.formData?.full_name || "User"}
                  </h3>
                  <p className="text-muted-foreground">
                    @{accountData.formData?.username || "username"}
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
                        {profile?.email_verified ? "Your email is verified" : "Your email is not verified"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowEmailVerificationModal(true)}>
                    {profile?.email_verified ? "Resend verification" : "Verify"}
                  </Button>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPhoneVerificationModal(true)}
                  >
                    {profile?.phone_verified ? "Change number" : "Verify"}
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
                  <Button variant="outline" size="sm" disabled title="Coming soon">
                    Coming soon
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
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Change Password</DialogTitle>
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
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordSaving} className="mb-4">
              {passwordSaving ? "Saving..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!is2FAEnabled ? (
              qrCode ? (
                <div className="text-center">
                  <p className="mb-4">
                    Scan the QR code with your authenticator app:
                  </p>
                  <Separator className="my-4" />
                  <Image
                    src={qrCode}
                    alt="QR Code"
                    width={192}
                    height={192}
                    className="mx-auto w-48 h-48"
                  />
                  <Separator className="my-4" />
                  <div className="text-center text-sm text-muted-foreground break-all">
                    <p className="mb-2">Or copy this code into your authenticator app:</p>
                    <div className="relative flex items-center justify-center max-w-full group">
                      <div className={cn("overflow-x-auto whitespace-nowrap break-normal rounded-md bg-muted p-2 pr-8 font-mono text-xs sm:text-sm select-all",
                        !showSecret && "blur-sm group-hover:blur-none transition"
                      )}>
                        {secret}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Copy 2FA secret"
                        title="Copy 2FA secret"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-full"
                        onClick={async () => {
                          if (!secret) return;
                          try {
                            await copyText(secret);
                            toast({ title: "Copied to clipboard" });
                          } catch {
                            toast({ title: "Copy failed", description: "Please copy the code manually.", variant: "destructive" });
                          }
                        }}
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                      className="mt-2"
                    >
                      {showSecret ? "Hide" : "Reveal"}
                    </Button>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        setVerificationCodeError(false);
                      }}
                      placeholder="Enter code from app"
                      className={cn("w-full", { "border-destructive": verificationCodeError })}
                    />
                    {verificationCodeError && (
                      <p className="text-sm text-destructive mt-1">Verification code is required.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4">
                    Enable two-factor authentication for added security.
                  </p>
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
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      setVerificationCodeError(false);
                    }}
                    placeholder="Enter code from app to disable"
                    className={verificationCodeError ? "border-destructive" : ""}
                  />
                  {verificationCodeError && (
                    <p className="text-sm text-destructive mt-1">Verification code is required.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2">
            {!is2FAEnabled ? (
              qrCode ? (
                <Button
                  onClick={handleVerify2FA}
                  disabled={twoFASaving}
                >
                  {twoFASaving ? "Verifying..." : "Verify and Enable 2FA"}
                </Button>
              ) : (
                <Button onClick={handleEnable2FA} disabled={twoFASaving}>
                  {twoFASaving ? "Generating..." : "Enable 2FA"}
                </Button>
              )
            ) : (
              <Button
                onClick={handleDisable2FA}
                disabled={twoFASaving}
                variant="destructive"
              >
                {twoFASaving ? "Disabling..." : "Disable 2FA"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShow2FAModal(false);
                clearTwoFAState();
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Change Email Address</DialogTitle>
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
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailChange} disabled={emailSaving} className="mb-4">
              {emailSaving ? "Saving..." : "Change Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!isDeleting) setShowDeleteModal(open);
          if (!open) {
            setDeleteStep('confirm');
            setDeleteConfirmation('');
            setIsDeleting(false);
          }
        }}
      >
        <DialogContent
          className="w-[75%] mx-auto rounded-lg sm:max-w-[425px]"
          onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
          onInteractOutside={(e) => isDeleting && e.preventDefault()}
        >
          {deleteStep === 'confirm' && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-center text-destructive">Are you sure?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 text-center">
                <TriangleAlert className="h-16 w-16 text-destructive mx-auto" />
                <p className="text-muted-foreground">
                  This action is permanent and cannot be undone.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">Please type &quot;delete&quot; to confirm.</Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirmation}
                  disabled={deleteConfirmation !== "delete"}
                >
                  Delete Me
                </Button>
              </DialogFooter>
            </div>
          )}

          {deleteStep === 'deleting' && (
            <div className="flex flex-col items-center space-y-4 py-4 text-center">
              <Clock
                className="h-16 w-16 text-destructive mx-auto animate-pulse"
                aria-hidden="true"
              />
              <span className="text-destructive">Deleting...</span>
            </div>
          )}

          {deleteStep === 'success' && (
            <div className="space-y-4 py-4 text-center">
              <h2 className="text-2xl font-bold">Goodbye 👋</h2>
              <p className="text-muted-foreground">Till we meet again.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showEmailVerificationModal && (
        <EmailVerificationModal showModal={showEmailVerificationModal} setShowModal={setShowEmailVerificationModal} userEmail={user?.email || ""} />
      )}
      {showPhoneVerificationModal && (
        <PhoneVerificationModal showModal={showPhoneVerificationModal} setShowModal={setShowPhoneVerificationModal} />
      )}
      {showIdentityVerificationModal && (
        <IdentityVerificationModal showModal={showIdentityVerificationModal} setShowModal={setShowIdentityVerificationModal} />
      )}
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
      <TwoFAProvider>
        <AccountDetails />
      </TwoFAProvider>
    </Suspense>
  );
}
