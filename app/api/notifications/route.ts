import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { notificationSchema } from "@/lib/validations";
import { cookies } from "next/headers";

/**
 * Handles GET requests to retrieve paginated notifications for the authenticated user.
 *
 * Supports optional filtering by notification type and unread status. Returns a JSON response containing the notifications and pagination metadata. Responds with 401 if the user is not authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const unreadOnly = searchParams.get("unread") === "true";

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type) {
      query = query.eq("type", type);
    }

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handles POST requests to create a new notification for the authenticated user.
 *
 * Validates the request body, invokes a Supabase remote procedure to create the notification, and returns the notification ID on success. Returns appropriate error responses for authentication failure, validation errors, or server issues.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, data } = notificationSchema.parse(body);

    const { data: notification, error } = await supabase.rpc(
      "create_notification",
      {
        target_user_id: user.id,
        notification_type: type,
        notification_title: title,
        notification_message: message,
        notification_data: data,
      },
    );

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, notificationId: notification });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
