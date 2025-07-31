"use client";

import { z } from "zod";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { AuthError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "../ui/use-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const signUpSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  full_name: z.string().min(2),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  phone_number: z
    .string()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9\- ]+$/, "Invalid phone number"),
});

interface MFAError extends AuthError {
  next_step?: {
    type: string;
    challenge_id: string;
    factor_id: string;
  };
}
/**
 * Displays an authentication form supporting both sign-in and sign-up modes with client-side validation and Supabase integration.
 *
 * Allows users to sign in with email and password or register a new account by providing email, username, full name, phone number, and password. Handles input validation, error and informational messaging, password visibility toggling, and mode switching. On successful authentication, synchronizes the session and redirects the user as appropriate.
 */
export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [full_name, setFullName] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Input validation
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setError("Please enter a valid email and password (min 8 chars).");
      setLoading(false);
      return;
    }

    try {
      if (!supabase) {
        setError("Supabase client not initialized.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message ===
          "A multi-factor authentication challenge is required"
        ) {
          const mfaError: MFAError = error;

          if (
            mfaError.next_step &&
            mfaError.next_step.type === "mfa_required" &&
            mfaError.next_step.challenge_id &&
            mfaError.next_step.factor_id
          ) {
            setChallengeId(mfaError.next_step.challenge_id);
            setFactorId(mfaError.next_step.factor_id);
            setShow2FAModal(true);
            setMessage(
              "Multi-factor authentication required. Please enter your 2FA code.",
            );
            setLoading(false);
            return;
          } else {
            throw new Error("MFA required but missing challenge or factor ID.");
          }
        } else {
          throw error;
        }
      }

      if (data.session) {
        const res = await fetch("/auth/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data.session),
        });

        if (res.ok) {
          router.push("/");
        } else {
          const errorData = await res.text();
          throw new Error(`Session sync failed: ${errorData}`);
        }
      } else {
        throw new Error("No session returned from sign-in");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!factorId || !challengeId) {
      setError("2FA factor ID or challenge ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ factorId, challengeId, code: twoFACode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify 2FA code");
      }

      if (result.success) {
        setMessage("2FA code verified successfully. Signing in...");
        await supabase.auth.setSession(result.session);
        setShow2FAModal(false);
        router.push("/");
      } else {
        setError("Invalid 2FA code.");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during 2FA verification");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || "An error occurred during Google sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Input validation
    const result = signUpSchema.safeParse({
      email,
      username,
      full_name,
      password,
      confirmPassword: showConfirmPassword,
      phone_number,
    });
    if (!result.success) {
      setError(
        "Please fill all fields correctly. Passwords must match and be at least 8 characters. Phone number is required.",
      );
      setLoading(false);
      return;
    }
    if (password !== showConfirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    if (!username || !full_name) {
      setError("Username and full name are required");
      setLoading(false);
      return;
    }
    try {
      if (!supabase) {
        setError("Supabase client not initialized.");
        setLoading(false);
        return;
      }
      // Sign up the user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: full_name,
            phone_number: phone_number,
          },
        },
      });
      if (authError) {
        console.error("Signup error details:", authError);
        throw authError;
      }

      setAuthMode("sign-in");
    } catch (error: any) {
      setError(error.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to RouteMe</CardTitle>
        <CardDescription>
          {authMode === "sign-in"
            ? "Sign in to your account to continue"
            : "Create a new account to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={authMode}
          onValueChange={(value) => setAuthMode(value as "sign-in" | "sign-up")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="sign-in">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
                <div className="flex justify-start font-semibold mt-2 mb-2">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </TabsContent>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Google"
            )}
          </Button>

          <TabsContent value="sign-up">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="John Doe"
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. +254712345678"
                  value={phone_number}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <div className="relative">
                  <Input
                    id="password-signup"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={showConfirmPassword}
                  onChange={(e) => setShowConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {authMode === "sign-in"
            ? "Don't have an account? Switch to Sign Up"
            : "Already have an account? Switch to Sign In"}
        </p>
      </CardFooter>

      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter 2FA Code</DialogTitle>
            <DialogDescription>
              Please enter the 6-digit code from your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="two-fa-code">2FA Code</Label>
              <Input
                id="two-fa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Verify Code"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
