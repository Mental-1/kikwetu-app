"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface UserAnalyticsData {
  users: Array<{ created_at: string }>;
}

export interface ListingCategoryData {
  name: string;
}

interface ListingAnalyticsData {
  created_at: string;
  categories: ListingCategoryData[];
  plan_name: string | null;
}

interface AnalyticsDataSuccess {
  usersData: UserAnalyticsData;
  listingsData: ListingAnalyticsData[];
}

interface AnalyticsDataError {
  error: { usersError: any; listingsError: any };
}

export async function getAnalyticsData(): Promise<
  AnalyticsDataSuccess | AnalyticsDataError
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // Ensure consistent UTC time for database queries
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const { data: usersData, error: usersError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Assuming 1000 users per page is sufficient for analytics over 7 days. Adjust as needed.
    });
  const { data: listingsData, error: listingsError } = await supabase
    .from("listings")
    .select("created_at, categories (name), plan_name")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (usersError || listingsError) {
    console.error("Error fetching analytics data:", {
      usersError,
      listingsError,
    });
    return { error: { usersError, listingsError } };
  }

  return { usersData, listingsData };
}
