import { getSupabaseServer } from "@/utils/supabase/server";
import { searchSchema } from "@/lib/validations";
import { get } from "react-hook-form";

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      return {
        id: user.id,
        email: user.email,
        ...profile,
      };
    },

    listing: async (_: any, { id }: { id: string }) => {
      const supabase = await getSupabaseServer();

      const { data: listing } = await supabase
        .from("listings")
        .select(
          `
          *,
          category:categories(*),
          subcategory:subcategories(*),
          seller:profiles(*)
        `,
        )
        .eq("id", id)
        .eq("status", "active")
        .single();

      return listing;
    },

    listings: async (_: any, { input }: { input: any }) => {
      const supabase = await getSupabaseServer();
      const validatedInput = searchSchema.parse(input || {});

      const { data: listings } = await supabase.rpc("search_listings", {
        search_query: validatedInput.query,
        category_filter: validatedInput.categoryId,
        subcategory_filter: validatedInput.subcategoryId,
        location_filter: validatedInput.location,
        min_price_filter: validatedInput.minPrice,
        max_price_filter: validatedInput.maxPrice,
        condition_filter: validatedInput.condition,
        user_lat: validatedInput.userLat,
        user_lng: validatedInput.userLng,
        radius_km: validatedInput.radius || 50,
        sort_by: validatedInput.sortBy,
        page_limit: validatedInput.limit,
        page_offset: (validatedInput.page - 1) * validatedInput.limit,
      });

      const totalCount = listings?.length || 0;
      const hasNextPage = totalCount === validatedInput.limit;

      return {
        listings: listings || [],
        totalCount,
        hasNextPage,
      };
    },

    categories: async () => {
      const supabase = await getSupabaseServer();
      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .order("id");

      return categories || [];
    },

    savedListings: async () => {
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data: savedListings } = await supabase
        .from("saved_listings")
        .select(
          `
          listing:listings(
            *,
            category:categories(*),
            subcategory:subcategories(*),
            seller:profiles(*)
          )
        `,
        )
        .eq("user_id", user.id);

      return savedListings?.map((item) => item.listing) || [];
    },
  },

  Mutation: {
    createListing: async (_: any, { input }: { input: any }, context: any) => {
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Authentication required");

      const { data: listing } = await supabase
        .from("listings")
        .insert({
          ...input,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      return listing;
    },

    updateProfile: async (_: any, { input }: { input: any }) => {
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Authentication required");

      const { data: profile } = await supabase
        .from("profiles")
        .update(input)
        .eq("id", user.id)
        .select()
        .single();

      return {
        id: user.id,
        email: user.email,
        ...profile,
      };
    },

    incrementViews: async (_: any, { listingId }: { listingId: string }) => {
      const supabase = await getSupabaseServer();

      await supabase.rpc("increment_listing_views", {
        listing_uuid: listingId,
      });

      return true;
    },
  },
};
