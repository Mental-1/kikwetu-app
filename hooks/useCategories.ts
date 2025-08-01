import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/utils/supabase/client";

const supabase = getSupabaseClient();

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface Subcategory {
  id: number;
  name: string;
  parent_category_id: number;
}

// Service functions with proper error handling
const fetchCategories = async (): Promise<Category[]> => {
  console.log("Fetching categories from Supabase...");

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Supabase categories error:", error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  // Ensure we always return an array
  return data || [];
};

const fetchSubcategories = async (): Promise<Subcategory[]> => {
  console.log("Fetching subcategories from Supabase...");

  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Supabase subcategories error:", error);
    throw new Error(`Failed to fetch subcategories: ${error.message}`);
  }

  return data || [];
};

// Main hooks
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable background refetch when data becomes stale
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSubcategories = () => {
  return useQuery({
    queryKey: ["subcategories"],
    queryFn: fetchSubcategories,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Derived hooks for filtered data
export const useSubcategoriesByCategory = (categoryId: number | null) => {
  const {
    data: allSubcategories,
    isLoading,
    error,
    ...rest
  } = useSubcategories();

  const filteredSubcategories =
    categoryId && allSubcategories
      ? allSubcategories.filter((sub) => sub.parent_category_id === categoryId)
      : [];

  return {
    data: filteredSubcategories,
    isLoading,
    error,
    ...rest,
  };
};

// Get specific category by ID
export const useCategory = (categoryId: number | null) => {
  const { data: categories, isLoading, error, ...rest } = useCategories();

  const category =
    categoryId && categories
      ? categories.find((cat) => cat.id === categoryId) || null
      : null;

  return {
    data: category,
    isLoading,
    error,
    ...rest,
  };
};

// Get specific subcategory by ID
export const useSubcategory = (subcategoryId: number | null) => {
  const { data: subcategories, isLoading, error, ...rest } = useSubcategories();

  const subcategory =
    subcategoryId && subcategories
      ? subcategories.find((sub) => sub.id === subcategoryId) || null
      : null;

  return {
    data: subcategory,
    isLoading,
    error,
    ...rest,
  };
};

// Utility hooks for cache management
export const useCategoryMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["subcategories"] });
  };

  const prefetchCategories = () => {
    queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: fetchCategories,
      staleTime: 1000 * 60 * 60,
    });
  };

  const prefetchSubcategories = () => {
    queryClient.prefetchQuery({
      queryKey: ["subcategories"],
      queryFn: fetchSubcategories,
      staleTime: 1000 * 60 * 60,
    });
  };

  // Optimistically update categories cache (useful for admin operations)
  const updateCategoryInCache = (
    categoryId: number,
    updates: Partial<Category>,
  ) => {
    queryClient.setQueryData(
      ["categories"],
      (oldData: Category[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((category) =>
          category.id === categoryId ? { ...category, ...updates } : category,
        );
      },
    );
  };

  const addCategoryToCache = (newCategory: Category) => {
    queryClient.setQueryData(
      ["categories"],
      (oldData: Category[] | undefined) => {
        if (!oldData) return [newCategory];
        return [...oldData, newCategory].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      },
    );
  };

  const removeCategoryFromCache = (categoryId: number) => {
    queryClient.setQueryData(
      ["categories"],
      (oldData: Category[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((category) => category.id !== categoryId);
      },
    );
  };

  return {
    invalidateCategories,
    prefetchCategories,
    prefetchSubcategories,
    updateCategoryInCache,
    addCategoryToCache,
    removeCategoryFromCache,
  };
};

// Hook for getting category breadcrumbs (useful for navigation)
export const useCategoryBreadcrumbs = (
  categoryId?: number,
  subcategoryId?: number,
) => {
  const { data: category } = useCategory(categoryId || null);
  const { data: subcategory } = useSubcategory(subcategoryId || null);

  const breadcrumbs = [];

  if (category) {
    breadcrumbs.push({
      id: category.id,
      name: category.name,
      type: "category" as const,
    });
  }

  if (subcategory) {
    breadcrumbs.push({
      id: subcategory.id,
      name: subcategory.name,
      type: "subcategory" as const,
    });
  }

  return breadcrumbs;
};
