# Gemini Agent Changelog

This document outlines the major architectural changes and feature improvements implemented by the Gemini agent.

## Core Architectural Refinements

### 1. Server-Side Data Fetching for Pages

- **Change:** Refactored the primary data-fetching mechanism for page loads to use Next.js Server Components.
- **Reasoning:** The original implementation used client-side hooks (`useSearch`, `useQuery`) to fetch initial data, which caused server errors and hydration mismatches. The new pattern fetches data directly on the server and passes it as props to client components. This is more performant, eliminates unnecessary client-server roundtrips, and aligns with modern Next.js best practices.
- **Affected Files:**
  - `app/listings/page.tsx`
  - `app/listings/[id]/page.tsx`
  - `lib/data/listings.ts` (new file for server-side data access)

### 2. Real-Time Payment Flow via Webhooks

- **Change:** Replaced the client-side polling mechanism (`pollTransactionStatus`) for payment confirmation with a fully webhook-driven, real-time flow using Supabase Realtime.
- **Reasoning:** The polling method was unreliable, as it depended on the user keeping their browser window open. The new webhook-driven approach is more robust and provides a better user experience with instant UI updates upon payment confirmation.
- **Affected Files:**
  - `app/post-ad/page.tsx`
  - `app/api/payments/mpesa/callback/route.ts` (verified existing webhook)
  - `app/api/payments/paystack/callback/route.ts` (verified existing webhook)

### 3. Database Function Sanitization

- **Change:** Updated the `get_filtered_listings` PostgreSQL function to use `COALESCE` on all critical fields (`title`, `price`, `location`, `condition`, `images`, etc.).
- **Reasoning:** To prevent hydration errors caused by `NULL` values in the database. By sanitizing the data at the source, we guarantee that the API always returns clean, predictable data, making the frontend more resilient.

## Feature & UI Enhancements

### 1. Improved Ad Posting Flow

- **Change:** Reordered the steps in the "Post Ad" process to a more logical sequence: `Details` -> `Plan` -> `Media` -> `Preview` -> `Method`.
- **Reasoning:** This ensures the user can fully preview and approve their ad *before* committing to payment, which is a more user-friendly workflow.
- **Affected Files:** `app/post-ad/page.tsx`

### 2. Upgraded Price Filter Control

- **Change:** Replaced the price range `Slider` with `min` and `max` number `Input` fields in the listings filter.
- **Reasoning:** Provides more granular control for users and prevents accidental filtering of high-value items. The maximum price limit was also increased to 10 billion to accommodate items like real estate.
- **Affected Files:**
  - `components/listings/filter-sidebar.tsx`
  - `lib/search-utils.ts`

### 3. Centralized `PAGE_SIZE` Constant

- **Change:** Created a single, shared `PAGE_SIZE` constant for pagination.
- **Reasoning:** Follows the Don't Repeat Yourself (DRY) principle, making the code easier to maintain and ensuring consistency across the application.
- **Affected Files:**
  - `lib/search-utils.ts`
  - `app/listings/page.tsx`
  - `app/listings/listings-client.tsx`

## Code Cleanup & Bugfixes

- **Repository History:** Resolved a critical Git issue where multiple, disconnected commit histories were causing deployment failures on Vercel. The project was migrated to a new, clean repository.
- **Component Cleanup:** Removed obsolete components (`listings-display.tsx`) and corrected component import paths to resolve build errors.
- **Performance:** Addressed a React performance warning by memoizing the `listings` array in the client component to prevent unnecessary re-renders.
