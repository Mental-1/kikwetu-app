import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { RoleManagementView } from "./roles-view";

export type User = {
  id: string;
  email: string;
  role: string;
};

async function getUsersWithRoles(): Promise<{ users?: User[]; error?: string }> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: "Supabase URL or service role key is not defined." };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role");

  if (error) {
    console.error("Error fetching users with roles:", error);
    return { error: "Failed to fetch users with roles." };
  }

  return { users: data as User[] };
}

export default async function RoleManagementPage() {
  const result = await getUsersWithRoles();

  if (result.error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return <RoleManagementView users={result.users || []} />;
}
