import { z } from "zod";
import {
  createSanitizedString,
  createSanitizedEmail,
  createSanitizedUrl,
  createSanitizedPhone,
  createSecurePassword,
} from "./input-sanitization";

// Enhanced Auth schemas with sanitization
export const passwordSchema = createSecurePassword();
export const signUpSchema = z
  .object({
    email: createSanitizedEmail(),
    password: createSecurePassword(),
    confirmPassword: z.string(),
    fullName: createSanitizedString({ min: 2, max: 100 }),
    username: createSanitizedString({ min: 3, max: 30 }).refine(
      (val) => /^[a-zA-Z0-9_]+$/.test(val),
      "Username can only contain letters, numbers, and underscores",
    ),
    phoneNumber: createSanitizedPhone(),
    birthDate: z.string().refine((val) => {
      const date = new Date(val);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 13 && age <= 120;
    }, "You must be between 13 and 120 years old"),
    nationality: createSanitizedString({ min: 2, max: 50 }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: createSanitizedEmail(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: createSanitizedEmail(),
});

// export const resetPasswordSchema = z
//   .object({
//     password: createSecurePassword(),
//     confirmPassword: z.string(),
//   })
//   .refine((data) => data.password === data.confirmPassword, {
//     message: "Passwords don't match",
//     path: ["confirmPassword"],
//   });

// Enhanced Profile schemas
export const profileSchema = z.object({
  fullName: createSanitizedString({ min: 2, max: 100 }),
  username: createSanitizedString({ min: 3, max: 30 }).refine(
    (val) => /^[a-zA-Z0-9_]+$/.test(val),
    "Username can only contain letters, numbers, and underscores",
  ),
  bio: createSanitizedString({ max: 500, required: false }),
  phone: createSanitizedPhone(),
  location: createSanitizedString({ min: 2, max: 100, required: false }),
  website: createSanitizedUrl().optional(),
});

// Enhanced Listing schemas
export const listingSchema = z.object({
  title: createSanitizedString({ min: 5, max: 100 }),
  description: createSanitizedString({ min: 20, max: 2000, allowHtml: false }),
  price: z
    .number()
    .min(0, "Price must be positive")
    .max(1000000, "Price is too high")
    .refine((val) => Number.isFinite(val), "Invalid price format"),
  negotiable: z.boolean().default(false),
  condition: z.enum(["new", "like_new", "good", "fair", "poor", "refurbished"]),
  category: createSanitizedString({ min: 1, max: 50 }),
  subcategory: createSanitizedString({ max: 50, required: false }),
  location: createSanitizedString({ min: 2, max: 100 }),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  shippingAvailable: z.boolean().default(false),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  shippingCost: z.number().min(0).optional(),
});

// Enhanced Payment schemas
export const mpesaPaymentSchema = z.object({
  phoneNumber: z
    .string()
    .transform((val) => {
      let sanitized = val.replace(/[^\d]/g, "");
      if (sanitized.startsWith("0")) {
        sanitized = `254${sanitized.substring(1)}`;
      }
      return sanitized;
    })
    .refine(
      (val) => /^254[0-9]{9}$/.test(val),
      "Invalid M-Pesa phone number (format: 254XXXXXXXXX)",
    ),
  amount: z
    .number()
    .min(1, "Amount must be at least 1 KES")
    .max(450000, "Amount exceeds M-Pesa limit"),
  listingId: z.string().uuid(), // Made required
  discountCodeId: z.number().optional(),
});

export const paystackPaymentSchema = z.object({
  email: createSanitizedEmail(),
  amount: z
    .number()
    .min(10, "Amount must be at least 10 KES")
    .max(10000000, "Amount exceeds limit"),
  listingId: z.string().uuid(), // Added listingId
});

export const paypalPaymentSchema = z.object({
  amount: z
    .number()
    .min(1, "Amount must be at least $1")
    .max(10000, "Amount exceeds limit"),
  currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
});

// Enhanced Message schema
export const messageSchema = z.object({
  content: createSanitizedString({ min: 1, max: 1000 }),
  listingId: z.string().uuid().optional(),
  recipientId: z.string().uuid(),
});

// Enhanced Review schema
export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: createSanitizedString({ min: 10, max: 500 }),
  sellerId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
});

// Notification preferences validation
export const notificationPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  marketing_emails: z.boolean().default(false),
  listing_updates: z.boolean().default(true),
  message_notifications: z.boolean().default(true),
});

// Enhanced Search schema
export const searchSchema = z.object({
  query: createSanitizedString({ required: false, max: 100 }),
  categoryId: z.number().optional(),
  subcategoryId: z.number().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  condition: z
    .enum(["new", "like_new", "good", "fair", "poor", "refurbished"])
    .optional(),
  location: createSanitizedString({ required: false, max: 100 }),
  radius: z.number().min(1).max(100).optional(),
  userLat: z.number().optional(), // Add this
  userLng: z.number().optional(), // Add this
  sortBy: z
    .enum(["relevance", "newest", "price_low", "price_high", "distance"])
    .default("relevance"),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

// Notification schema
export const notificationSchema = z.object({
  type: z.enum(["listing", "account", "marketing", "message"]),
  title: createSanitizedString({ min: 1, max: 255 }),
  message: createSanitizedString({ min: 1, max: 1000 }),
  data: z.record(z.string(), z.any()).default({}),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024, // 5MB
      "File size must be less than 5MB",
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be a JPEG, PNG, or WebP image",
    ),
});
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type MpesaPaymentInput = z.infer<typeof mpesaPaymentSchema>;
export type PaystackPaymentInput = z.infer<typeof paystackPaymentSchema>;
export type PaypalPaymentInput = z.infer<typeof paypalPaymentSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;

// Validation helper functions
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

export function getFieldError(
  errors: Record<string, string>,
  field: string,
): string | undefined {
  return errors[field];
}

export function hasFieldError(
  errors: Record<string, string>,
  field: string,
): boolean {
  return field in errors;
}
