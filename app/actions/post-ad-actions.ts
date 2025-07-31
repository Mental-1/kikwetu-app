"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { z } from "zod";
import { getSupabaseServer } from "@/utils/supabase/server";
import { createSanitizedString } from "@/lib/input-sanitization";

import { handleActionError, AppError } from "@/utils/errorhandler";
import { createAuditLogger } from "@/utils/audit-logger";
import { createListingLimiter } from "@/utils/rate-limiting";
import { checkUserPlanLimit } from "@/utils/subscriptions/check_user_limits";
import { PostHog } from "posthog-node";

import type {
  AdDetailsFormData,
  ActionResponse,
  ListingCreateData,
} from "@/lib/types/form-types";

const createListingSchema = z.object({
  title: createSanitizedString({ min: 5, max: 100 }),
  description: createSanitizedString({ min: 20, max: 2000 }),
  price: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) throw new Error("Invalid price");
    return num;
  }),
  category: z.number().min(1),
  subcategory: z.number().optional(),
  condition: z.enum(["new", "used", "refurbished"]),
  location: createSanitizedString({ min: 2, max: 100 }),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  negotiable: z.boolean().default(false),
  phone: createSanitizedString({ required: false, max: 20 }).optional(),
  email: z.string().email().optional(),
});

type CreateListingInput = z.infer<typeof createListingSchema>;

/**
 * Retrieves the currently authenticated user and their profile from the database.
 *
 * @returns An object containing the authenticated user and their profile.
 * @throws AppError if no user is authenticated.
 */
async function getUserContext() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

/**
 * Validates that the specified category exists and, if provided, that the subcategory exists and belongs to the category.
 *
 * @param categoryId - The ID of the category to validate
 * @param subcategoryId - Optional ID of the subcategory to validate
 * @returns An object containing the validated category and, if applicable, subcategory
 * @throws AppError if the category or subcategory is invalid
 */
async function validateCategories(categoryId: number, subcategoryId?: number) {
  const supabase = await getSupabaseServer();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (!category)
    throw new AppError("Invalid category", 400, "INVALID_CATEGORY");

  let subcategory = null;
  if (subcategoryId) {
    const { data: subcat } = await supabase
      .from("subcategories")
      .select("*")
      .eq("id", subcategoryId)
      .eq("parent_category_id", categoryId)
      .single();

    if (!subcat) {
      throw new AppError("Invalid subcategory", 400, "INVALID_SUBCATEGORY");
    }
    subcategory = subcat;
  }

  return { category, subcategory };
}

/**
 * Validates a list of image URLs for a listing, ensuring at least one and no more than ten images are provided and that each image URL contains the user's ID to verify ownership.
 *
 * @param imageUrls - Array of image URLs to validate
 * @param userId - The ID of the user submitting the images
 * @returns The validated array of image URLs
 * @throws AppError if no images are provided, more than ten images are submitted, or any image URL does not contain the user's ID
 */
async function processImages(imageUrls: string[], userId: string) {
  if (!imageUrls?.length) {
    throw new AppError("At least one image is required", 400, "NO_IMAGES");
  }

  if (imageUrls.length > 10) {
    throw new AppError("Max 10 images allowed", 400, "TOO_MANY_IMAGES");
  }

  for (const url of imageUrls) {
    if (!url.includes(userId)) {
      throw new AppError("Invalid image detected", 400, "INVALID_IMAGE");
    }
  }

  return imageUrls;
}

/**
 * Handles the complete workflow for creating a new listing, including validation, authentication, rate limiting, payment confirmation, auditing, and database insertion.
 *
 * Validates the provided listing data, enforces user plan and rate limits, checks payment status, processes images, and inserts the listing into the database. Updates the user's profile listing count, logs audit events, generates a slug, and triggers cache revalidation for relevant pages. Returns a success response with the new listing's ID and slug, or a failure response with error details.
 *
 * @param formData - The listing details, associated image URLs, and payment confirmation status.
 * @returns An object indicating success or failure, with the new listing's ID and slug on success.
 */
export async function createListingAction(
  formData: AdDetailsFormData & {
    mediaUrls: string[];
    paymentConfirmed: boolean;
  },
): Promise<ActionResponse<{ id: string; slug: string }>> {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    const ip =
      headersList.get("x-real-ip") ||
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-client-ip") ||
      "unknown";

    const rateLimitResult = createListingLimiter.check(ip);
    if (!rateLimitResult.allowed) {
      throw new AppError(
        "Too many attempts. Please wait.",
        429,
        "RATE_LIMIT_EXCEEDED",
      );
    }

    const { user, profile } = await getUserContext();

    const auditLogger = createAuditLogger({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
    });

    await checkUserPlanLimit(user.id);

    const validationData = {
      ...formData,
      phone: profile?.phone || undefined,
      email: user.email || undefined,
    };

    const validationResult = createListingSchema.safeParse(validationData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });

      await auditLogger.log({
        action: "create_listing_validation_failed",
        resource_type: "listing",
        metadata: { errors },
      });

      return {
        success: false,
        errors,
        message: "Please correct the errors and try again",
      };
    }

    const validatedData = validationResult.data;

    if (!formData.paymentConfirmed) {
      return {
        success: false,
        message: "Payment failed. Please try again.",
      };
    }

    const { category, subcategory } = await validateCategories(
      validatedData.category,
      validatedData.subcategory,
    );

    const processedImages = await processImages(formData.mediaUrls, user.id);

    const DEFAULT_PLAN = "free";
    const DEFAULT_LISTING_DURATION_DAYS = 30;
    const supabase = await getSupabaseServer();

    const plan = DEFAULT_PLAN;
    const expiry_date = new Date(
      Date.now() + DEFAULT_LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const listingData: ListingCreateData = {
      title: validatedData.title,
      description: validatedData.description,
      price: validatedData.price,
      category_id: category.id,
      subcategory_id: subcategory?.id,
      condition: validatedData.condition,
      location: validatedData.location,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      negotiable: validatedData.negotiable,
      images: processedImages,
      user_id: user.id,
      status: "pending",
      payment_status: plan === "free" ? "unpaid" : "paid",
      plan: plan,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expiry_date,
    };

    const { data: listing, error } = await supabase
      .from("listings")
      .insert(listingData)
      .select()
      .single();

    if (error) {
      await auditLogger.log({
        action: "create_listing_failed",
        resource_type: "listing",
        metadata: { error: error.message },
      });
      return {
        success: false,
        message: "Failed to create listing. Please try again later.",
      };
    }

    await supabase
      .from("profiles")
      .update({
        listing_count: (profile?.listing_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await auditLogger.log({
      action: "create_listing_success",
      resource_type: "listing",
      resource_id: listing.id,
      new_values: listingData,
    });

    const slug = `${validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${listing.id.slice(-8)}`;

    revalidatePath("/");
    revalidatePath("/listings");
    revalidatePath(`/listings/${listing.id}`);
    revalidatePath("/dashboard");

    // Track event with PostHog
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) {
      console.warn("PostHog key not configured, skipping event tracking");
      return {
        success: true,
        data: { id: listing.id, slug },
        message: "Listing created successfully!",
      };
    }
    
    const posthog = new PostHog(posthogKey);
    try {
      posthog.capture({
        distinctId: user.id,
        event: 'listing_created',
        properties: {
          listing_id: listing.id,
          listing_title: listingData.title,
          listing_category_id: listingData.category_id,
          listing_price: listingData.price,
          listing_plan: listingData.plan,
        }
      });
    } finally {
      await posthog.shutdown();
    }

    return {
      success: true,
      data: { id: listing.id, slug },
      message: "Listing created successfully!",
    };
  } catch (error) {
    return handleActionError(error, {
      action: "create_listing",
      userId: "user.id",
      ip: "unknown",
    });
  }
}
