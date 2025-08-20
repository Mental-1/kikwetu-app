import { create } from 'zustand';
import { getFilteredListingsAction } from '@/app/actions/search';
import { DEFAULT_FILTERS } from '@/lib/search-utils';
import { ListingsItem } from '@/lib/types/listing';

interface DiscoverState {
  listings: ListingsItem[];
  filters: any; // Define a more specific type for filters later
  activeItemIndex: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: string | null;
  hasNextPage: boolean;
  page: number;
  setListings: (listings: ListingsItem[]) => void;
  setFilters: (filters: any) => void;
  setActiveItemIndex: (index: number) => void;
  fetchListings: (userLocation: { lat: number; lon: number } | null, refresh?: boolean) => Promise<void>;
  fetchNextPage: (userLocation: { lat: number; lon: number } | null) => Promise<void>;
}

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  listings: [],
  filters: DEFAULT_FILTERS,
  activeItemIndex: 0,
  isLoading: false,
  isFetchingNextPage: false,
  error: null,
  hasNextPage: true,
  page: 1,

  setListings: (listings) => set({ listings }),
  setFilters: (filters) => set({ filters }),
  setActiveItemIndex: (index) => set({ activeItemIndex: index }),

  fetchListings: async (userLocation, refresh = false) => {
    set({ isLoading: true, isFetchingNextPage: false, error: null });
    try {
      const currentPage = refresh ? 1 : get().page;
      const { data, hasMore } = await getFilteredListingsAction({
        page: currentPage,
        pageSize: 20, // Increased page size
        filters: get().filters,
        sortBy: "newest",
        userLocation,
      });

      set((state) => ({
        listings: refresh ? data : [...state.listings, ...data],
        hasNextPage: hasMore,
        page: currentPage + 1,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch listings", isLoading: false });
    }
  },

  fetchNextPage: async (userLocation) => {
    if (!get().hasNextPage || get().isLoading || get().isFetchingNextPage) return;
    set({ isFetchingNextPage: true });
    try {
      const { data, hasMore } = await getFilteredListingsAction({
        page: get().page,
        pageSize: 20,
        filters: get().filters,
        sortBy: "newest",
        userLocation,
      });

      set((state) => ({
        listings: [...state.listings, ...data],
        hasNextPage: hasMore,
        page: state.page + 1,
        isFetchingNextPage: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch more listings", isFetchingNextPage: false });
    }
  },
}));
