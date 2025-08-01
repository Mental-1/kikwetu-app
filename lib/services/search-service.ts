import { getSupabaseServer } from "@/utils/supabase/server";
import { SearchParams, ListingsResponse } from "@/lib/types/search";
import { ListingsItem } from "@/lib/types/listing";

export class SearchService {
  static async getFilteredListings(
    params: SearchParams,
  ): Promise<ListingsResponse> {
    const supabase = await getSupabaseServer();

    try {
      console.log("SearchService.getFilteredListings called with:", params);

      // Call your RPC function. It's expected to return an object
      // containing both the listings and the total count.
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

      // The RPC is expected to return an object like: { listings: [...], total_count: ... }
      const listings = data?.listings || [];
      const totalCount = data?.total_count || 0;

      // Sanitize the data to prevent hydration issues
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

      // Determine if there are more pages to fetch
      const hasMore = params.page * params.pageSize < totalCount;

      console.log("SearchService.getFilteredListings result:", {
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
      console.error("SearchService.getFilteredListings error:", error);
      throw error;
    }
  }

  static async getCategories() {
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

  static async getSubcategories() {
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
}
