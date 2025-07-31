"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (process.env.NODE_ENV === "development" && posthogKey) {
      console.log(`PostHog key found, initializing with key: ${posthogKey.substring(0, 8)}...`);
    }

    if (!posthogKey) {
      console.error("NEXT_PUBLIC_POSTHOG_KEY is not defined. PostHog will not be initialized.");
      return;
    }

    try {
      posthog.init(posthogKey, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "identified_only",
      });
    } catch (error) {
      console.error("Failed to initialize PostHog:", error);
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
