'use client';

import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';


export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = `${window.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      posthog.capture('$pageview', { url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogAuthWrapper({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
      });
    } else {
      posthog.reset(); // Clear user identification on logout
    }
  }, [user]);

  return <>{children}</>;
}
