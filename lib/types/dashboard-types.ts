export interface ListingItem {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  condition: string | null;
  location: string | null;
  views: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  created_at: string | null;
  status: string | null;
}

export interface TransactionItem {
  id: string;
  created_at: string | number;
  payment_method: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  listings?: {
    id: string;
    title: string;
  }[];
}

export interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string; // e.g., 'check', 'clock', 'eye' etc.
  amount?: number;
}

export interface DashboardData {
  activeListings: ListingItem[];
  pendingListings: ListingItem[];
  expiredListings: ListingItem[];
  transactions: TransactionItem[];
  recentActivity: RecentActivityItem[];
}
