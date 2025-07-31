"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  User,
  ShoppingBag,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { z, ZodError } from "zod";

const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(["message", "listing", "account", "marketing"]),
  title: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).nullable(),
  read: z.boolean().nullable().default(false),
  created_at: z.string().default(new Date().toISOString()),
});

type Notification = z.infer<typeof NotificationSchema>;

interface NotificationDropdownProps {
  unreadCount: number;
  setUnreadCountAction: (count: number) => void;
}

/**
 * Displays a dropdown menu for user notifications with options to view, mark as read, and delete notifications.
 *
 * Fetches notifications from the backend when opened, validates them, and manages their read and deletion state. Provides visual cues for unread notifications and allows marking all or individual notifications as read. Notifies users of errors or successful actions via toast messages.
 *
 * @param unreadCount - The current number of unread notifications to display in the badge.
 * @param setUnreadCountAction - Callback to update the unread notification count externally.
 */
export function NotificationDropdown({
  unreadCount,
  setUnreadCountAction,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const supabase = getSupabaseClient();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedData = NotificationSchema.array().parse(data || []);
      setNotifications(typedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Notification data validation failed:", error.issues);
      } else {
        console.error("Error fetching notifications:", error);
      }
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, setNotifications, toast]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc("mark_notification_as_read", {
        notification_id: notificationId,
      });

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif,
        ),
      );

      setUnreadCountAction(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc("mark_all_notifications_as_read");

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true })),
      );
      setUnreadCountAction(0);

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId),
      );

      if (notification && !notification.read) {
        setUnreadCountAction(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "listing":
        return <ShoppingBag className="h-4 w-4" />;
      case "account":
        return <User className="h-4 w-4" />;
      case "marketing":
        return <Megaphone className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "listing":
        return "text-blue-600";
      case "account":
        return "text-green-600";
      case "marketing":
        return "text-purple-600";
      case "message":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="notification-badge" variant="destructive">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 ${getNotificationColor(notification.type)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-none">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true },
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center">
          <Button variant="ghost" size="sm" className="w-full">
            View all notifications
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
