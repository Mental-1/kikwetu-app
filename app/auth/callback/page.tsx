"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      const supabase = getSupabaseClient();
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("Error exchanging code for session:", error);
          // Redirect to an error page or show an error message
          router.push("/auth?error=oauth_failed");
        } else if (data.session) {
          setUser(data.session.user);
          // Redirect to the original intended page or dashboard
          const redirectTo = searchParams.get("redirectTo") || "/";
          router.push(redirectTo);
        } else {
          // No session data, but no error - might happen if user cancels or similar
          router.push("/auth?error=no_session");
        }
      });
    } else {
      // No code in URL, redirect to auth page
      router.push("/auth");
    }
  }, [router, searchParams, setUser]);

  // You can render a loading state here while the code is being exchanged
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="mt-4">Loading...</p>
      </div>
    </div>
  );
}
