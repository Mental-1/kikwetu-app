import { Profile } from "./profile";

export interface DisplayListingItem {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  views: number | null;
  images: string[] | null;
  condition: string | null;
  distance?: string;
}

export interface ListingsItem {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  condition: string | null;
  featured: boolean | null;
  images: string[] | null;
  views: number | null;
  created_at: string | null;
  updated_at: string | null;
  category_id: number | null;
  category_name: string | null;
  subcategory_id: number | null;
  subcategory_name: string | null;
  user_id: string | null;
  seller_name: string | null;
  seller_username: string | null;
  seller_avatar: string | null;
  distance_km: number | null;
}

export type Review = {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: Profile;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: {
    id: number;
    name: string;
  };
  subcategory_id?: number;
  condition: "new" | "used" | "like_new" | "refurbished";
  location: string;
  latitude?: number;
  longitude?: number;
  negotiable: boolean;
  images: string[];
  user_id: string;
  status: "pending" | "approved" | "rejected" | "expired" | "active";
  payment_status: "paid" | "unpaid";
  plan: "free" | "basic" | "premium";
  views: number;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  profiles: Profile;
  reviews: Review[];
  featured: boolean;
  featured_until?: string;
};

export type Category = {
  id: number;
  name: string;
};
