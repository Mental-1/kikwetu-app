import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SearchService } from "@/lib/services/search-service";
import { SearchFilters, SearchParams, ListingsResponse } from "@/lib/types/search";
import { createListingsQueryKey } from "@/lib/search-utils";

interface UseSearchOptions {
  filters: SearchFilters;
  sortBy: string;
  userLocation?: { lat: number; lon: number } | null;
  pageSize?: number;
  enabled?: boolean;
  initialData?: ListingsResponse;
}

export const useSearch = ({
  filters,
  sortBy,
  userLocation = null,
  pageSize = 20,
  enabled = true,
  initialData,
}: UseSearchOptions) => {
  return useInfiniteQuery({
    queryKey: createListingsQueryKey(filters, sortBy, userLocation),
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams: SearchParams = {
        page: pageParam,
        pageSize,
        filters,
        sortBy,
        userLocation,
      };

      const result = await SearchService.getFilteredListings(searchParams);
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has more items, we can fetch the next page
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    initialData: initialData ? { pages: [initialData], pageParams: [1] } : undefined,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: SearchService.getCategories,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useSubcategories = () => {
  return useQuery({
    queryKey: ["subcategories"],
    queryFn: SearchService.getSubcategories,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};