"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { SearchParams, ListingsResponse } from "@/lib/types/search";
import { ListingsItem } from "@/lib/types/listing";

interface RawListing {
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

function sanitizeListing(raw: RawListing): ListingsItem {
  return {
    id: raw.id || '',
    title: raw.title || "Untitled Listing",
    description: raw.description || null,
    price: raw.price || null,
    location: raw.location || null,
    latitude: raw.latitude || null,
    longitude: raw.longitude || null,
    condition: raw.condition || null,
    featured: raw.featured || false,
    images: Array.isArray(raw.images) ? raw.images : [],
    views: raw.views || 0,
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    category_id: raw.category_id || null,
    category_name: raw.category_name || null,
    subcategory_id: raw.subcategory_id || null,
    subcategory_name: raw.subcategory_name || null,
    user_id: raw.user_id || null,
    seller_name: raw.seller_name || null,
    seller_username: raw.seller_username || null,
    seller_avatar: raw.seller_avatar || null,
    distance_km: raw.distance_km || null,
  };
}

export async function getFilteredListingsAction(
  params: SearchParams,
): Promise<ListingsResponse> {
  const supabase = await getSupabaseServer();

  try {
    console.log("getFilteredListingsAction called with:", params);

    const { data, error } = await supabase.rpc("get_filtered_listings", {
      p_page: params.page,
      p_page_size: params.pageSize,
      p_categories:
        params.filters.categories.length > 0
          ? params.filters.categories
          : null,
      p_subcategories:
        params.filters.subcategories.length > 0
          ? params.filters.subcategories
          : null,
      p_conditions:
        params.filters.conditions.length > 0
          ? params.filters.conditions
          : null,
      p_min_price: params.filters.priceRange.min,
      p_max_price: params.filters.priceRange.max,
      p_radius_km: params.filters.maxDistance,
      p_search_query: params.filters.searchQuery || null,
      p_sort_by: params.sortBy,
      p_user_latitude: params.userLocation?.lat || null,
      p_user_longitude: params.userLocation?.lon || null,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }

    const listings = data?.listings || [];
    const totalCount = data?.total_count || 0;

    const sanitizedData: ListingsItem[] = listings.map(sanitizeListing);

    const hasMore = params.page * params.pageSize < totalCount;

    console.log("getFilteredListingsAction result:", {
      dataLength: sanitizedData.length,
      totalCount,
      hasMore,
    });

    return {
      data: sanitizedData,
      totalCount,
      hasMore,
    };
  } catch (error) {
    console.error("getFilteredListingsAction error:", error);
    throw error;
  }
}

export async function getCategoriesAction() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

export async function getSubcategoriesAction() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching subcategories:", error);
    throw new Error(`Failed to fetch subcategories: ${error.message}`);
  }

  return data || [];
}
