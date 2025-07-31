import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { parseSearchParams, filtersToSearchParams } from "@/lib/search-utils";
import { SearchFilters } from "@/lib/types/search";

export const useSearchState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = parseSearchParams(searchParams);
  const sortBy = searchParams.get("sortBy") || "newest";

  const updateFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      const newSearchParams = filtersToSearchParams(updatedFilters);

      // Preserve sortBy if it exists
      if (sortBy !== "newest") {
        newSearchParams.set("sortBy", sortBy);
      }

      const newUrl = `${pathname}?${newSearchParams.toString()}`;
      router.push(newUrl);
    },
    [filters, sortBy, pathname, router],
  );

  const updateSortBy = useCallback(
    (newSortBy: string) => {
      const searchParamsObj = filtersToSearchParams(filters);
      if (newSortBy !== "newest") {
        searchParamsObj.set("sortBy", newSortBy);
      }

      const newUrl = `${pathname}?${searchParamsObj.toString()}`;
      router.push(newUrl);
    },
    [filters, pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return {
    filters,
    sortBy,
    updateFilters,
    updateSortBy,
    clearFilters,
  };
};
