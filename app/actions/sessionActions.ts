// import {
//   sessionOptions,
//   SessionData,
//   defaultSession,
// } from "@/lib/types/form-types";
// import { getIronSession } from "iron-session";
// import { cookies } from "next/headers";
// import { getSupabaseServer } from "@/utils/supabase/server";
// import { redirect } from "next/navigation";
// import { signInSchema, signUpSchema, validateForm } from "@/lib/validations";
// import { revalidatePath } from "next/cache";
// import bcrypt from "bcryptjs";
// import { SignJWT, jwtVerify } from "jose";
// import { get } from "react-hook-form";

// // Security constants
// const JWT_SECRET = new TextEncoder().encode(
//   process.env.JWT_SECRET ||
//     (() => {
//       throw new Error("JWT_SECRET environment variable is required");
//     })(),
// );
// const BCRYPT_ROUNDS = 12;
// const MAX_LOGIN_ATTEMPTS = 5;
// const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// // Types for enhanced security
// interface LoginAttempt {
//   count: number;
//   lastAttempt: number;
//   lockedUntil?: number;
// }

// interface SecureUserData {
//   id: string;
//   email: string;
//   emailVerified: boolean;
//   lastLoginAt: string;
//   loginAttempts?: LoginAttempt;
// }

// // Utility functions for security
// const hashData = async (data: string): Promise<string> => {
//   return bcrypt.hash(data, BCRYPT_ROUNDS);
// };

// const verifyHash = async (data: string, hash: string): Promise<boolean> => {
//   return bcrypt.compare(data, hash);
// };

// const createSecureJWT = async (payload: any): Promise<string> => {
//   return new SignJWT(payload)
//     .setProtectedHeader({ alg: "HS256" })
//     .setIssuedAt()
//     .setExpirationTime("24h")
//     .sign(JWT_SECRET);
// };

// const verifySecureJWT = async (token: string): Promise<any> => {
//   try {
//     const { payload } = await jwtVerify(token, JWT_SECRET);
//     return payload;
//   } catch (error) {
//     return null;
//   }
// };

// const sanitizeError = (error: any): string => {
//   // Return generic error messages to prevent information leakage
//   const secureErrors: Record<string, string> = {
//     "Invalid login credentials": "Invalid email or password",
//     "Email not confirmed": "Please verify your email address",
//     "Too many requests": "Too many attempts. Please try again later",
//     "User already registered": "An account with this email already exists",
//     "Weak password": "Password does not meet security requirements",
//     "Invalid email": "Please enter a valid email address",
//   };

//   const errorMessage = error?.message || "An error occurred";
//   return (
//     secureErrors[errorMessage] || "Authentication failed. Please try again."
//   );
// };

// const logSecurityEvent = (
//   event: string,
//   details: any,
//   level: "info" | "warn" | "error" = "info",
// ) => {
//   const timestamp = new Date().toISOString();
//   const logData = {
//     timestamp,
//     event,
//     level,
//     details: {
//       ...details,
//       password: details.password ? "[REDACTED]" : undefined,
//       email: details.email
//         ? details.email.replace(/(.{2}).*(@.*)/, "$1***$2")
//         : undefined,
//     },
//   };

//   console.log(`[AUTH-${level.toUpperCase()}]`, JSON.stringify(logData));
// };

// // Rate limiting utilities
// const loginAttempts = new Map<string, LoginAttempt>();

// const checkRateLimit = (
//   identifier: string,
// ): { allowed: boolean; remainingAttempts?: number } => {
//   const attempts = loginAttempts.get(identifier);
//   const now = Date.now();

//   if (!attempts) {
//     return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
//   }

//   // Reset if lockout period has passed
//   if (attempts.lockedUntil && now > attempts.lockedUntil) {
//     loginAttempts.delete(identifier);
//     return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
//   }

//   // Check if still locked out
//   if (attempts.lockedUntil && now < attempts.lockedUntil) {
//     return { allowed: false };
//   }

//   // Check if we need to reset attempts (after 1 hour of no attempts)
//   if (now - attempts.lastAttempt > 60 * 60 * 1000) {
//     loginAttempts.delete(identifier);
//     return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
//   }

//   const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts.count;
//   return {
//     allowed: attempts.count < MAX_LOGIN_ATTEMPTS,
//     remainingAttempts: Math.max(0, remainingAttempts),
//   };
// };

// const recordFailedAttempt = (identifier: string) => {
//   const attempts = loginAttempts.get(identifier) || {
//     count: 0,
//     lastAttempt: 0,
//   };
//   attempts.count += 1;
//   attempts.lastAttempt = Date.now();

//   if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
//     attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
//     logSecurityEvent("ACCOUNT_LOCKED", { identifier }, "warn");
//   }

//   loginAttempts.set(identifier, attempts);
// };

// const clearFailedAttempts = (identifier: string) => {
//   loginAttempts.delete(identifier);
// };

// // Session management
// export const getSession = async () => {
//   "use server";

//   try {
//     const cookieStore = await cookies();
//     const session = await getIronSession<SessionData>(
//       cookieStore,
//       sessionOptions,
//     );

//     if (!session.isLoggedIn) {
//       Object.assign(session, defaultSession);
//     }

//     return session;
//   } catch (error) {
//     logSecurityEvent("SESSION_ERROR", { error: error.message }, "error");
//     throw new Error("Session unavailable");
//   }
// };

// // Sign In Action
// export const SignIn = async (formData: FormData) => {
//   "use server";

//   const rawData = {
//     email: formData.get("email") as string,
//     password: formData.get("password") as string,
//   };

//   // Validate input
//   const validation = validateForm(signInSchema, rawData);
//   if (!validation.success) {
//     logSecurityEvent(
//       "SIGNIN_VALIDATION_FAILED",
//       { errors: validation.errors },
//       "warn",
//     );
//     return { success: false, errors: validation.errors };
//   }

//   const { email, password } = validation.data;

//   // Rate limiting
//   const rateLimit = checkRateLimit(email);
//   if (!rateLimit.allowed) {
//     logSecurityEvent("SIGNIN_RATE_LIMITED", { email }, "warn");
//     return {
//       success: false,
//       errors: {
//         email: "Too many failed attempts. Account temporarily locked.",
//       },
//     };
//   }

//   try {
//     const supabase = await getSupabaseServer();

//     // Sign in with Supabase
//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       recordFailedAttempt(email);
//       const sanitizedError = sanitizeError(error);

//       logSecurityEvent(
//         "SIGNIN_FAILED",
//         {
//           email,
//           error: error.message,
//           remainingAttempts: rateLimit.remainingAttempts! - 1,
//         },
//         "warn",
//       );

//       return {
//         success: false,
//         errors: { email: sanitizedError },
//       };
//     }

//     // Clear failed attempts on successful login
//     clearFailedAttempts(email);

//     // Create secure session data
//     const secureUserData: SecureUserData = {
//       id: data.user!.id,
//       email: data.user!.email!,
//       emailVerified: !!data.user!.email_confirmed_at,
//       lastLoginAt: new Date().toISOString(),
//     };

//     // Create custom JWT for additional security
//     const customToken = await createSecureJWT(secureUserData);

//     // Create iron session
//     const cookieStore = await cookies();
//     const session = await getIronSession<SessionData>(
//       cookieStore,
//       sessionOptions,
//     );

//     Object.assign(session, {
//       isLoggedIn: true,
//       user_id: data.user!.id,
//       id: data.session!.access_token,
//       expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
//       created_at: new Date().toISOString(),
//       isPaid: false,
//       isVerified: !!data.user!.email_confirmed_at,
//       customToken, // Store our custom JWT
//     });

//     await session.save();

//     logSecurityEvent("SIGNIN_SUCCESS", { userId: data.user!.id }, "info");

//     return { success: true, user: data.user };
//   } catch (error: any) {
//     recordFailedAttempt(email);
//     logSecurityEvent("SIGNIN_ERROR", { email, error: error.message }, "error");

//     return {
//       success: false,
//       errors: { email: "Authentication failed. Please try again." },
//     };
//   }
// };

// // Sign Up Action
// export const SignUp = async (formData: FormData) => {
//   "use server";

//   const rawData = {
//     email: formData.get("email") as string,
//     password: formData.get("password") as string,
//     confirmPassword: formData.get("confirmPassword") as string,
//     fullName: formData.get("fullName") as string,
//     username: formData.get("username") as string,
//     phoneNumber: formData.get("phoneNumber") as string,
//     birthDate: formData.get("birthDate") as string,
//     nationality: formData.get("nationality") as string,
//   };

//   // Validate input
//   const validation = validateForm(signUpSchema, rawData);
//   if (!validation.success) {
//     logSecurityEvent(
//       "SIGNUP_VALIDATION_FAILED",
//       { errors: validation.errors },
//       "warn",
//     );
//     return { success: false, errors: validation.errors };
//   }

//   const {
//     email,
//     password,
//     fullName,
//     username,
//     phoneNumber,
//     birthDate,
//     nationality,
//   } = validation.data;

//   try {
//     const supabase = await getSupabaseServer();

//     // Check if username already exists
//     const { data: existingUser } = await supabase
//       .from("profiles")
//       .select("username")
//       .eq("username", username)
//       .single();

//     if (existingUser) {
//       logSecurityEvent("SIGNUP_USERNAME_EXISTS", { username }, "warn");
//       return {
//         success: false,
//         errors: { username: "Username is already taken" },
//       };
//     }

//     // Encrypt sensitive data before storing
//     const encryptedPhone = phoneNumber ? await hashData(phoneNumber) : null;

//     // Register the user with Supabase
//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: {
//           full_name: fullName,
//           username: username,
//           phone_number: phoneNumber,
//           phone_number_hash: encryptedPhone,
//           birth_date: birthDate,
//           nationality: nationality,
//         },
//       },
//     });

//     if (error) {
//       const sanitizedError = sanitizeError(error);
//       logSecurityEvent(
//         "SIGNUP_FAILED",
//         {
//           email,
//           username,
//           error: error.message,
//         },
//         "warn",
//       );

//       return {
//         success: false,
//         errors: { email: sanitizedError },
//       };
//     }

//     logSecurityEvent(
//       "SIGNUP_SUCCESS",
//       {
//         userId: data.user?.id,
//         email,
//         username,
//       },
//       "info",
//     );

//     return {
//       success: true,
//       user: data.user,
//       message:
//         "Account created successfully! Please check your email to verify your account.",
//     };
//   } catch (error: any) {
//     logSecurityEvent(
//       "SIGNUP_ERROR",
//       {
//         email,
//         username,
//         error: error.message,
//       },
//       "error",
//     );

//     return {
//       success: false,
//       errors: { email: "Registration failed. Please try again." },
//     };
//   }
// };

// // Sign In with Google Action
// export const SignInWithGoogle = async () => {
//   "use server";

//   try {
//     const supabase = await getSupabaseServer();

//     const { data, error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
//         queryParams: {
//           access_type: "offline",
//           prompt: "consent",
//         },
//       },
//     });

//     if (error) {
//       logSecurityEvent(
//         "GOOGLE_SIGNIN_FAILED",
//         { error: error.message },
//         "warn",
//       );
//       return {
//         success: false,
//         error: "Google sign-in failed. Please try again.",
//       };
//     }

//     logSecurityEvent("GOOGLE_SIGNIN_INITIATED", {}, "info");

//     return { success: true, data };
//   } catch (error: any) {
//     logSecurityEvent("GOOGLE_SIGNIN_ERROR", { error: error.message }, "error");
//     return {
//       success: false,
//       error: "Authentication service unavailable.",
//     };
//   }
// };

// // Sign Out Action
// export const SignOut = async () => {
//   "use server";

//   try {
//     const session = await getSession();
//     const userId = session.user_id;

//     const supabase = await getSupabaseServer();
//     await supabase.auth.signOut();

//     // Clear iron session
//     const cookieStore = await cookies();
//     const ironSession = await getIronSession<SessionData>(
//       cookieStore,
//       sessionOptions,
//     );
//     ironSession.destroy();

//     logSecurityEvent("SIGNOUT_SUCCESS", { userId }, "info");
//   } catch (error: any) {
//     logSecurityEvent("SIGNOUT_ERROR", { error: error.message }, "error");
//     // Continue with redirect even if there's an error
//   }

//   revalidatePath("/");
//   redirect("/");
// };

// // Verify Session Action
// export const VerifySession = async (): Promise<{
//   valid: boolean;
//   user?: any;
// }> => {
//   "use server";

//   try {
//     const session = await getSession();

//     if (!session.isLoggedIn || !session.customToken) {
//       return { valid: false };
//     }

//     // Verify custom JWT
//     const payload = await verifySecureJWT(session.customToken);
//     if (!payload) {
//       logSecurityEvent(
//         "SESSION_INVALID_JWT",
//         { userId: session.user_id },
//         "warn",
//       );
//       return { valid: false };
//     }

//     // Additional verification with Supabase
//     const supabase = await getSupabaseServer();
//     const {
//       data: { user },
//       error,
//     } = await supabase.auth.getUser();

//     if (error || !user) {
//       logSecurityEvent(
//         "SESSION_INVALID_USER",
//         { userId: session.user_id },
//         "warn",
//       );
//       return { valid: false };
//     }

//     return { valid: true, user };
//   } catch (error: any) {
//     logSecurityEvent(
//       "SESSION_VERIFICATION_ERROR",
//       { error: error.message },
//       "error",
//     );
//     return { valid: false };
//   }
// };

// // Password Reset Action
// export const RequestPasswordReset = async (formData: FormData) => {
//   "use server";

//   const email = formData.get("email") as string;

//   if (!email) {
//     return { success: false, error: "Email is required" };
//   }

//   try {
//     const supabase = await getSupabaseServer();

//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//       redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
//     });

//     if (error) {
//       logSecurityEvent(
//         "PASSWORD_RESET_FAILED",
//         { email, error: error.message },
//         "warn",
//       );
//       // Don't reveal if email exists or not
//       return {
//         success: true,
//         message:
//           "If an account with that email exists, we've sent a password reset link.",
//       };
//     }

//     logSecurityEvent("PASSWORD_RESET_REQUESTED", { email }, "info");

//     return {
//       success: true,
//       message:
//         "If an account with that email exists, we've sent a password reset link.",
//     };
//   } catch (error: any) {
//     logSecurityEvent(
//       "PASSWORD_RESET_ERROR",
//       { email, error: error.message },
//       "error",
//     );
//     return {
//       success: false,
//       error: "Password reset unavailable. Please try again later.",
//     };
//   }
// };
