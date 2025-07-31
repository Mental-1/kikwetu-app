import { SearchFilters } from "@/lib/types/search";

export const PAGE_SIZE = 20;

export const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  subcategories: [],
  conditions: [],
  priceRange: {
    min: 0,
    max: 10000000000,
  },
  maxDistance: 50,
  searchQuery: "",
};

export const parseSearchParams = (
  searchParams: URLSearchParams,
): SearchFilters => {
  return {
    categories:
      searchParams
        .get("categories")
        ?.split(",")
        .map(Number)
        .filter((n) => !isNaN(n)) || [],
    subcategories:
      searchParams
        .get("subcategories")
        ?.split(",")
        .map(Number)
        .filter((n) => !isNaN(n)) || [],
    conditions:
      searchParams
        .get("conditions")
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [],
    priceRange: {
      min: Number(searchParams.get("priceMin")) || 0,
      max: Number(searchParams.get("priceMax")) || 10000000000,
    },
    maxDistance: Number(searchParams.get("maxDistance")) || 50,
    searchQuery: searchParams.get("search") || "",
  };
};

export const filtersToSearchParams = (
  filters: SearchFilters,
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.categories.length > 0) {
    params.set("categories", filters.categories.join(","));
  }

  if (filters.subcategories.length > 0) {
    params.set("subcategories", filters.subcategories.join(","));
  }

  if (filters.conditions.length > 0) {
    params.set("conditions", filters.conditions.join(","));
  }

  if (filters.priceRange.min > 0) {
    params.set("priceMin", filters.priceRange.min.toString());
  }

  if (filters.priceRange.max < 10000000000) {
    params.set("priceMax", filters.priceRange.max.toString());
  }

  if (filters.maxDistance !== 50) {
    params.set("maxDistance", filters.maxDistance.toString());
  }

  if (filters.searchQuery.trim()) {
    params.set("search", filters.searchQuery.trim());
  }

  return params;
};

export const createListingsQueryKey = (
  filters: SearchFilters,
  sortBy: string,
  userLocation: { lat: number; lon: number } | null,
) => {
  return [
    "listings",
    {
      filters: {
        ...filters,
        categories: [...filters.categories].sort(),
        subcategories: [...filters.subcategories].sort(),
        conditions: [...filters.conditions].sort(),
      },
      sortBy,
      userLocation,
    },
  ] as const;
};
