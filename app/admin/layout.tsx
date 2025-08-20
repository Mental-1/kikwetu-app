export const dynamic = "force-dynamic";

import { getSupabaseServer } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminClientLayout from "./admin-client-layout"; // This will be the renamed existing layout

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth"); // Redirect unauthenticated users
  }

  // Fetch user profile to check role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    if (error) {
      console.warn("Admin role check error:", { userId: user?.id, errorMessage: error.message, errorCode: error.code, context: "Supabase profile lookup failed" });
    }
    console.warn("Unauthorized access attempt to admin area by user:", user?.id);
    redirect("/"); // Redirect non-admin users
  }

  return (
    <AdminClientLayout 
      user={{
        id: user.id,
        email: user.email || undefined,
        full_name: user.user_metadata?.full_name || null,
      }}
    >
      {children}
    </AdminClientLayout>
  );
}