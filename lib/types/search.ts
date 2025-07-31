import { ListingsItem } from "./listing";

export interface SearchFilters {
  categories: number[];
  subcategories: number[];
  conditions: string[];
  priceRange: {
    min: number;
    max: number;
  };
  maxDistance: number;
  searchQuery: string;
}

export interface SearchParams {
  page: number;
  pageSize: number;
  filters: SearchFilters;
  sortBy: string;
  userLocation?: {
    lat: number;
    lon: number;
  } | null;
}

export interface ListingsResponse {
  data: ListingsItem[];
  totalCount: number;
  hasMore: boolean;
}
