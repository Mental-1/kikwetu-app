# Changes Made by Gemini CLI (Referral System Implementation)

This document summarizes all file system modifications performed during the session to implement the referral and discount code system.

**Project Root:** `/home/zen/Downloads/Kikwetu/`

---

## Database Schema & Functions (Manual Execution Required)

The following changes were provided as SQL scripts for manual execution in your Supabase SQL editor.

*   **Type:** `ALTER TABLE`
*   **File:** `public.profiles` table
*   **Description:** Added `referral_code` column (TEXT, UNIQUE) to store each user's unique referral identifier.

*   **Type:** `CREATE TABLE`
*   **File:** `public.discount_codes` table
*   **Description:** Created to store all types of discount codes (promotional, temporary, referral-generated). Includes `id`, `code`, `type` (ENUM), `value`, `expires_at`, `max_uses`, `use_count`, `is_active`, `created_by_user_id`.

*   **Type:** `CREATE TABLE`
*   **File:** `public.user_applied_codes` table
*   **Description:** Created to track which user has applied which discount code.

*   **Type:** `ALTER TABLE`
*   **File:** `public.transactions` table
*   **Description:** Added `discount_code_id` (BIGINT FK to `discount_codes.id`) to link transactions to specific discount codes.

*   **Type:** `CREATE OR REPLACE FUNCTION` (Modified)
*   **File:** `public.handle_new_user()` function
*   **Description:** Modified to automatically generate a unique `referral_code` for every new user and store it in their `public.profiles` entry. It also captures `referrer_code` passed during sign-up via `raw_user_meta_data`.

*   **Type:** `CREATE OR REPLACE FUNCTION` (Modified)
*   **File:** `public.process_webhook_events()` function
*   **Description:** Modified to include logic for applying `EXTRA_LISTING_DAYS` discounts to listings, incrementing `use_count` for used discount codes, and recording usage in `user_applied_codes` upon successful payment confirmation.

---

## File System Changes (Automated by CLI)

### Created Files:

*   **`app/api/payments/apply-discount/route.ts`**
    *   **Description:** New API endpoint for validating and returning discount code details.
*   **`app/api/auth/complete-referral-signup/route.ts`**
    *   **Description:** New API endpoint for applying referral rewards to new users and referrers after sign-up.
*   **`app/api/admin/discount-codes/route.ts`**
    *   **Description:** New API endpoint for admin users to manage discount codes (GET, POST, PATCH, DELETE).
*   **`app/api/admin/users/search/route.ts`**
    *   **Description:** New API endpoint for admin users to search for user profiles.
*   **`components/referral-card.tsx`**
    *   **Description:** New React component to display a user's unique referral link on their dashboard.
*   **`app/admin/admin-client-layout.tsx`**
    *   **Description:** New Client Component containing the original admin layout UI, refactored from `app/admin/layout.tsx`.
*   **`app/admin/referrals/page.tsx`**
    *   **Description:** New page for the admin dashboard to manage referral and discount codes.
*   **`components/admin/create-discount-code-form.tsx`**
    *   **Description:** New React component for creating and editing discount codes in the admin dashboard, including user search functionality.

### Updated Files:

*   **`app/admin/layout.tsx`**
    *   **Description:** Overwritten to become a Server Component responsible for server-side admin role checking and redirecting unauthorized users. It now renders `AdminClientLayout`.
*   **`app/admin/admin-client-layout.tsx`**
    *   **Description:** Modified to include a new "Referrals" link in the sidebar navigation with the `Gift` icon.
*   **`app/dashboard/page.tsx`**
    *   **Description:** Integrated the `ReferralCard` component to display the user's referral link.
*   **`app/post-ad/page.tsx`**
    *   **Description:**
        *   Modified `PaymentMethodStep` to include a checkbox to show/hide the discount code input section.
        *   Added conditional red border styling to the discount code input for invalid codes.
        *   Passed `appliedDiscount` and `discountCodeId` to `processPayment` function.
        *   Styled the "Apply" button in `PaymentMethodStep` to be green.
        *   (Planned for next session) Will style "Pay & Publish" and "Next" buttons to be green.
*   **`lib/validations.ts`**
    *   **Description:** Added `discountCodeId` as an optional number field to `mpesaPaymentSchema`.
*   **`app/api/payments/mpesa/route.ts`**
    *   **Description:** Modified to accept `discountCodeId` from the request body and store it in the `transactions` table.
*   **`components/auth/auth-form.tsx`**
    *   **Description:**
        *   Reads `referral_code` from URL and stores it in `localStorage`.
        *   Passes `referrer_code` to `supabase.auth.signUp` options.
        *   Calls `/api/auth/complete-referral-signup` after successful sign-up.
        *   Clears `referral_code` from URL using `router.replace`.

---
