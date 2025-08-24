import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { LRUCache } from "lru-cache";
import { createRateLimiter, getClientIdentifier } from "@/utils/rate-limiting";
import { z, ZodError } from "zod";

// Define Zod schemas for validation
const notificationsSchema = z.object({
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  marketing_emails: z.boolean(),
  new_messages: z.boolean(),
  listing_updates: z.boolean(),
  price_alerts: z.boolean(),
});

const privacySchema = z.object({
  profile_visibility: z.enum(["public", "private", "friends"]),
  show_phone: z.boolean(),
  show_email: z.boolean(),
  show_last_seen: z.boolean(),
});

const preferencesSchema = z.object({
  language: z.string(),
  currency: z.string(),
  timezone: z.string(),
  theme: z.string(),
});

const settingsSchema = z.object({
  notifications: notificationsSchema,
  privacy: privacySchema,
  preferences: preferencesSchema,
});

// LRU Cache for settings
const settingsCache = new LRUCache<string, any>({
  max: 500, // Cache settings for up to 500 users
  ttl: 1000 * 60 * 15, // 15 minutes
});

// Rate limiter for settings updates (once per day)
const settingsUpdateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 10,
});

async function getUserId() {
  const supabase = await getSupabaseRouteHandler(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check cache first
  const cachedSettings = settingsCache.get(userId);
  if (cachedSettings) {
    return NextResponse.json(cachedSettings);
  }

  // Fetch from database if not in cache
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email_notifications, push_notifications, sms_notifications, marketing_emails, new_messages, listing_updates, price_alerts, profile_visibility, show_phone, show_email, show_last_seen, language, currency, timezone, theme",
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  const settings = {
    notifications: {
      email_notifications: data.email_notifications,
      push_notifications: data.push_notifications,
      sms_notifications: data.sms_notifications,
      marketing_emails: data.marketing_emails,
      new_messages: data.new_messages,
      listing_updates: data.listing_updates,
      price_alerts: data.price_alerts,
    },
    privacy: {
      profile_visibility: data.profile_visibility,
      show_phone: data.show_phone,
      show_email: data.show_email,
      show_last_seen: data.show_last_seen,
    },
    preferences: {
      language: data.language,
      currency: data.currency,
      timezone: data.timezone,
      theme: data.theme,
    },
  };

  // Store in cache
  settingsCache.set(userId, settings);

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const userId = await getUserId();
  const identifier = getClientIdentifier(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { allowed, remaining, resetTime } =
    settingsUpdateLimiter.check(identifier);
  if (!allowed) {
    const hoursRemaining = Math.ceil(
      (resetTime - Date.now()) / (1000 * 60 * 60),
    );
    return NextResponse.json(
      {
        error: `Too many requests. Please try again in ${hoursRemaining} hour${hoursRemaining > 1 ? "s" : ""}.`,
        retryAfter: resetTime - Date.now(),
      },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const validatedSettings = settingsSchema.parse(body);

    const { notifications, privacy, preferences } = validatedSettings;

    const updateData = {
        ...notifications,
        ...privacy,
        ...preferences,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Error updating settings:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Invalidate cache
    settingsCache.delete(userId);

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseRouteHandler(cookies);
  const userId = await getUserId();
  const identifier = getClientIdentifier(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { allowed } = settingsUpdateLimiter.check(identifier);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const validatedSettings = settingsSchema.partial().parse(body);

    const updateData = {
      ...(validatedSettings.notifications && { ...validatedSettings.notifications }),
      ...(validatedSettings.privacy && { ...validatedSettings.privacy }),
      ...(validatedSettings.preferences && { ...validatedSettings.preferences }),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Error partially updating settings:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Invalidate cache
    settingsCache.delete(userId);

    return NextResponse.json({
      message: "Settings partially updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
