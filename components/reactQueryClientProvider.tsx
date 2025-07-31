"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function ReactQueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Increased stale time for better performance
            staleTime: 1000 * 60 * 5,

            // Cache time for how long inactive queries stay in memory
            gcTime: 1000 * 60 * 30,

            // Smart retry logic
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors (client errors)
              if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (
                  errorMessage.includes("400") ||
                  errorMessage.includes("401") ||
                  errorMessage.includes("403") ||
                  errorMessage.includes("404")
                ) {
                  return false;
                }
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },

            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),

            // Disable refetch on window focus for better UX (especially on mobile)
            refetchOnWindowFocus: false,

            // Refetch on reconnect when user comes back online
            refetchOnReconnect: true,

            // Refetch on mount only if data is stale
            refetchOnMount: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,

            // Retry delay for mutations
            retryDelay: 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
