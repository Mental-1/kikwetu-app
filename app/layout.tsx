import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import ReactQueryClientProvider from "@/components/reactQueryClientProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "./providers";
import {
  PostHogPageview,
  PostHogAuthWrapper,
} from "@/components/posthog-provider";

const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Ki-Kwetu Classifieds",
  description: "Free and paid classifieds for all your Kenyan business needs.",
  keywords:
    "Jiji, OLX, classifieds, ads, marketplace, direction, rentals near me,routteme, ki-kwetu, kikwetu classifieds, kikwetu ads, kikwetu marketplace",
};

/**
 * Defines the root layout for the application, providing global context providers, navigation, footer, and toast notifications.
 *
 * Wraps the main content with React Query, theme, and authentication providers, and applies global styles and metadata.
 *
 * @param children - The content to be rendered within the main layout area
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={lato.className}>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <ReactQueryClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <PostHogAuthWrapper>
                  {" "}
                  <div className="flex min-h-screen flex-col">
                    <Navigation />
                    <main className="flex-1">
                      {/* Add error boundary for React Query errors */}
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center min-h-[400px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        }
                      >
                        {children}
                      </Suspense>
                    </main>
                    <Footer />
                  </div>
                  <Toaster />
                </PostHogAuthWrapper>
              </AuthProvider>
            </ThemeProvider>
          </ReactQueryClientProvider>
          <SpeedInsights />
        </PostHogProvider>
      </body>
    </html>
  );
}
