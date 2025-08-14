"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

import {
  DashboardData,
  ListingItem,
  TransactionItem,
  RecentActivityItem,
} from "@/lib/types/dashboard-types";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const [ { data: allListings, error: listingsError }, { data: transactions, error: transactionsError } ] = await Promise.all([
    supabase.from("listings").select("id, title, description, price, images, condition, location, views, category_id, subcategory_id, created_at, status").eq("user_id", user.id),
    supabase.from("transactions").select("*, listings:listing_id(id, title)").eq("user_id", user.id)
  ]);

  if (listingsError) {
    console.error("Failed to fetch listings:", listingsError);
    throw new Error("Failed to fetch listings data");
  }

  if (transactionsError) {
    console.error("Failed to fetch transactions:", transactionsError);
    throw new Error("Failed to fetch transactions data");
  }

  // This is a placeholder for recent activity
  const recentActivity: RecentActivityItem[] = [];

  const activeListings =
    allListings?.filter((listing) => listing.status === "active") || [];
  const pendingListings =
    allListings?.filter((listing) => listing.status === "pending") || [];
  const expiredListings =
    allListings?.filter((listing) => listing.status === "expired") || [];

  return {
    activeListings,
    pendingListings,
    expiredListings,
    transactions: (transactions as TransactionItem[]) || [],
    recentActivity,
  };
}


