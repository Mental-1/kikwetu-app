import type { Database } from "@/utils/supabase/database.types";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useQuery as useSupabaseQuery } from "@supabase-cache-helpers/postgrest-react-query";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type SubCategory = Database["public"]["Tables"]["subcategories"]["Row"];
export const useCategories = () => {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
  });
};

export const useSubcategories = (categoryId: number | null) => {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async (): Promise<SubCategory[]> => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("parent_category_id", categoryId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCategoriesWithRealtime = () => {
  const supabase = getSupabaseClient();

  return useSupabaseQuery(
    supabase.from("categories").select("*").order("name"),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );
};
