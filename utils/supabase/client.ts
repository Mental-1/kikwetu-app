import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/database.types";

// Corrected schema instantiation
type Schema = Database["public"];

// Maintain a singleton instance
let supabaseClient: ReturnType<typeof createBrowserClient<Schema>> | null =
  null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Schema>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return supabaseClient;
};
