"use server";

import { getSupabaseServer } from "@/utils/supabase/server";
import { SearchParams, ListingsResponse } from "@/lib/types/search";
import { ListingsItem } from "@/lib/types/listing";

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

    const sanitizedData: ListingsItem[] = (listings as any[]).map((item) => ({
      ...item,
      id: item.id || '',
      title: item.title || "Untitled Listing",
      description: item.description || null,
      price: item.price || null,
      location: item.location || null,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      condition: item.condition || null,
      featured: item.featured || false,
      images: Array.isArray(item.images) ? item.images : [],
      views: item.views || 0,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
      category_id: item.category_id || null,
      category_name: item.category_name || null,
      subcategory_id: item.subcategory_id || null,
      subcategory_name: item.subcategory_name || null,
      user_id: item.user_id || null,
      seller_name: item.seller_name || null,
      seller_username: item.seller_username || null,
      seller_avatar: item.seller_avatar || null,
      distance_km: item.distance_km || null,
    }));

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
