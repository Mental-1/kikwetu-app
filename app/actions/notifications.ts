"use server";

import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import type { Database } from "@/utils/supabase/database.types";
import { getSupabaseServiceRole } from "@/utils/supabase/server";
import { cookies } from "next/headers";

import nodemailer from "nodemailer";

type NotificationType =
  | "ad_posted"
  | "review"
  | "update"
  | "policy"
  | "expiry_warning"
  | "expired";

/**
 * Creates a new notification for a user in the database.
 *
 * Inserts a notification record with the specified title, message, type, and optional listing association. The notification is marked as unread by default.
 *
 * @param userId - The ID of the user to receive the notification
 * @param title - The notification title
 * @param message - The notification message content
 * @param type - The category of the notification
 * @param listingId - The associated listing ID, if applicable
 * @returns An object indicating success or failure, with an error message if creation fails
 */
export async function createNotification({
  userId,
  title,
  message,
  type,
  listingId = null,
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  listingId?: string | null;
}) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    listing_id: listingId,
    read: false,
  });

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Marks a specific notification as read by updating its status in the database.
 *
 * @param notificationId - The unique identifier of the notification to mark as read
 * @returns An object indicating success or failure, with an error message if applicable
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Marks all unread notifications for the specified user as read.
 *
 * @param userId - The ID of the user whose notifications will be updated
 * @returns An object indicating success or containing an error message if the update fails
 */
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await getSupabaseRouteHandler(cookies);

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Notifies a user that a listing is nearing expiration via in-app notification and, if enabled, email.
 *
 * Creates an in-app notification for the user about the upcoming listing expiration. If the user has enabled email notifications and an email address is available, also sends an email alert with renewal instructions.
 *
 * @param userId - The ID of the user to notify
 * @param listingId - The ID of the expiring listing
 * @param listingTitle - The title of the expiring listing
 * @param daysRemaining - The number of days left before the listing expires
 * @returns An object indicating success
 */
export async function sendExpiryNotification(
  userId: string,
  listingId: string,
  listingTitle: string,
  daysRemaining: number,
) {
  // Create in-app notification
  await createNotification({
    userId,
    title: `Listing Expiring Soon`,
    message: `Your listing "${listingTitle}" will expire in ${daysRemaining} days. Renew now to keep it active.`,
    type: "expiry_warning",
    listingId,
  });

  // Get user email preferences
  const supabase = await getSupabaseRouteHandler(cookies);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email_notifications, id")
    .eq("id", userId)
    .single();

  // Get user email from Supabase Auth
  let userEmail: string | null = null;
  try {
    const serviceClient = getSupabaseServiceRole();
    const { data: userData, error: userError } =
      await serviceClient.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.email) {
      userEmail = userData.user.email;
    }
  } catch (e) {
    console.error("Error fetching user email from Supabase Auth:", e);
  }

  // Send email if user has enabled email notifications and we have an email
  if (!profileError && profile?.email_notifications === true && userEmail) {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
    await transporter.sendMail({
      from: "no-reply@kikwetu.com",
      to: userEmail,
      subject: `Your listing is expiring soon`,
      text: `Your listing "${listingTitle}" will expire in ${daysRemaining} days. Renew now to keep it active.`,
      html: `<p>Your listing <b>${listingTitle}</b> will expire in <b>${daysRemaining} days</b>. <a href="https://routeme.com/dashboard">Renew now</a> to keep it active.</p>`,
    });
  }

  return { success: true };
}

/**
 * Marks a listing as expired and notifies the listing owner.
 *
 * Updates the specified listing's status to "expired" and creates a notification for the owner informing them that the listing is no longer visible and can be renewed. Returns a success or error object based on the outcome.
 *
 * @param listingId - The unique identifier of the listing to expire
 * @returns An object indicating success or containing error details if the operation fails
 */
export async function markListingAsExpired(listingId: string) {
  const supabase = await getSupabaseRouteHandler(cookies);

  // Get listing details
  const { data: listing } = await supabase
    .from("listings")
    .select("title, user_id")
    .eq("id", listingId)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update listing status
  const { error } = await supabase
    .from("listings")
    .update({ status: "expired" })
    .eq("id", listingId);

  if (error) {
    console.error("Error marking listing as expired:", error);
    return { success: false, error: error.message };
  }

  if (!listing.user_id) {
    return { success: false, error: "Listing user_id is missing" };
  }

  // Notify user
  await createNotification({
    userId: listing.user_id,
    title: "Listing Expired",
    message: `Your listing "${listing.title}" has expired and is no longer visible to buyers. Renew it to make it active again.`,
    type: "expired",
    listingId,
  });

  return { success: true };
}
