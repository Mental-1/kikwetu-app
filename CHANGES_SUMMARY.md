# Codebase Changes Summary

This document summarizes all the modifications, additions, and removals made to the codebase during our interaction.

---

## 1. Account Settings & Profile Update Fixes

### `app/account/page.tsx`
- **Modified:** `FormData` interface.
  - **Added:** `avatar_url: string | null;` to the interface.
- **Modified:** `handleFileChange` function.
  - **Removed:** Call to `updateAvatarUrl` server action.
  - **Removed:** `queryClient.invalidateQueries` and `fetchProfile` calls.
  - **Added:** `setFormData` call to update local state with new `avatar_url`.
  - **Changed:** Toast message to "Avatar changed" and instructed user to "Click 'Save Changes' to apply the new avatar."
- **Modified:** `AvatarImage` src attribute.
  - **Changed:** Prioritized `formData?.avatar_url` for display.

### `app/account/actions/update-account.ts`
- **No direct changes by me:** This file was reviewed, but no modifications were made to its content.

### `app/account/actions/update-avatar-url.ts`
- **Removed:** The entire file.
  - **Reason:** This file contained a redundant server action for updating only the avatar URL, which was causing data inconsistencies with the main profile update.

### `app/api/account/route.ts`
- **Modified:** `accountSchema` Zod schema.
  - **Added:** `avatar_url: z.string().url("Invalid URL").optional(),` to the schema.
  - **Reason:** The `avatar_url` was being stripped during validation, preventing it from being saved to the database.

---

## 2. Settings Page Fixes

### `app/api/settings/route.ts`
- **Modified:** `POST` handler.
  - **Changed:** Logic to use a spread operator (`...notifications`, `...privacy`, `...preferences`) to correctly map nested objects to flat database columns.
- **Modified:** `PATCH` handler.
  - **Changed:** Logic to use a spread operator (`...validatedSettings.notifications`, etc.) to correctly map nested objects to flat database columns.
  - **Reason:** Previous implementation had incorrect data mapping, leading to "stale data" issues.

---

## 3. Notifications Feature

### `components/theme-toggle.tsx`
- **No direct changes by me:** This component was moved.

### `components/navigation.tsx`
- **Modified:** Imports.
  - **Removed:** `import { ThemeToggle } from "@/components/theme-toggle";`
  - **Added:** `import { NotificationDropdown } from "@/components/notifications/notification-dropdown";`
- **Modified:** JSX.
  - **Removed:** All instances of `<ThemeToggle />`.
  - **Added:** `<NotificationDropdown />` in place of `ThemeToggle` in both desktop and mobile navigation sections.

### `app/settings/page.tsx`
- **Modified:** Imports.
  - **Added:** `import { ThemeToggle } from "@/components/theme-toggle";`
- **Modified:** JSX.
  - **Added:** `<ThemeToggle />` component to the "Preferences" card.

### `components/notifications/notifications-bell.tsx`
- **Removed:** The entire file.
  - **Reason:** This component was created but deemed redundant as `notification-dropdown.tsx` already contained the necessary trigger and logic.

### `components/notifications/notification-dropdown.tsx`
- **Modified:** Component signature and props.
  - **Removed:** `unreadCount` and `setUnreadCountAction` from `NotificationDropdownProps` interface and function signature.
- **Modified:** State management.
  - **Added:** `const [unreadCount, setUnreadCount] = useState(0);`
- **Added:** `fetchUnreadCount` function.
  - **Function:** Fetches unread notification count directly from the `notifications` table using a Supabase query (`.select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false)`).
- **Modified:** `useEffect` hooks.
  - **Added:** Call to `fetchUnreadCount` on component mount.
  - **Added:** Real-time Supabase channel subscription to `notifications` table to trigger `fetchUnreadCount` on changes.
- **Modified:** `markAsRead`, `markAllAsRead`, and `deleteNotification` functions.
  - **Changed:** Calls to `setUnreadCountAction` replaced with `fetchUnreadCount()` to update the internal state.
- **Modified:** JSX for `DropdownMenuTrigger`.
  - **Ensured:** The `Button` with the `Bell` icon and `Badge` for `unreadCount` remains the trigger for the dropdown.
- **Modified:** `react/no-unescaped-entities` error fix.
  - **Changed:** `/{isAnnual ? &apos;year&apos; : &apos;month&apos;}` to `/{isAnnual ? 'year' : 'month'}`. (Note: This was a repeated fix attempt, the final correct solution was to use a variable for the string to avoid linter issues, which was applied in `PlanUpgradeModal.tsx` but not directly in this file's `span` content as it was already using a variable).

---

## 4. Subscription Model Implementation

### `app/dashboard/page.tsx`
- **Modified:** Dashboard navigation.
  - **Added:** A new "Payments and Billing" link below the "Settings" link, redirecting to `/plans`.

### `app/plans/page.tsx`
- **Added:** New directory `app/plans`.
- **Created:** Placeholder `page.tsx` with basic structure.
- **Modified:** Content to fetch plans dynamically.
  - **Removed:** Hardcoded plan data.
  - **Added:** `useEffect` hook to call `getPlans()` from `app/post-ad/actions.ts`.
  - **Added:** State management for `isAnnual`, `selectedPlan`, `isUpgradeModalOpen`, `isPaymentModalOpen`, and `plans`.
  - **Rendered:** `PlanCard` components by mapping over fetched `plans`.
  - **Rendered:** `PlanUpgradeModal` and `PaymentMethodsModal`.
- **Modified:** `PlanCard` props passing.
  - **Changed:** `annualPrice` calculation from `plan.price * 10` to `Math.round(plan.price * 12 * 0.85)` to reflect a 15% discount.

### `components/plans/PlanCard.tsx`
- **Added:** New directory `components/plans`.
- **Created:** `PlanCard.tsx` component based on provided template.
- **Modified:** `PlanCardProps` interface.
  - **Changed:** `description` prop from `string` to `string?` (optional).
- **Modified:** JSX for `CardDescription`.
  - **Added:** Fallback `{"No description available."}` if `description` prop is missing.

### `components/plans/PlanUpgradeModal.tsx`
- **Created:** `PlanUpgradeModal.tsx` component based on provided template.
- **Modified:** JSX for price display.
  - **Added:** `periodText` variable (`isAnnual ? 'year' : 'month'`) to correctly display billing period and resolve linter issues.

### `components/plans/PaymentMethodsModal.tsx`
- **Created:** `PaymentMethodsModal.tsx` component based on `PaymentMethodStep` from `app/post-ad/page.tsx`.
- **Modified:** Store usage.
  - **Changed:** `usePostAdStore` to `useSubscriptionStore`.
- **Implemented:** `processPayment` function (adapted for subscription flow, using `planId` instead of `listingId`).
- **Implemented:** `handlePay` function to initiate payment.
- **Implemented:** State management for `paymentStatus`, `currentTransactionId`, `showRetryButton`, `showSupportDetails`.
- **Integrated:** `checkTransactionStatus` function.
- **Integrated:** `useEffect` hooks for polling and real-time Supabase channel updates on `transactions` table.
- **Added:** Logic to call `/api/payments/subscriptions` endpoint upon successful payment completion.
- **Modified:** UI to conditionally render based on `paymentStatus`.
- **Modified:** Modal styling to `w-[90%] mx-auto rounded-xl sm:max-w-lg`.

### `stores/subscriptionStore.ts`
- **Created:** New Zustand store to manage state for the subscription payment flow (`formData`, `discountCodeInput`, `appliedDiscount`, `discountMessage`).

### `app/api/payments/subscriptions/route.ts`
- **Modified:** `POST` handler.
  - **Changed:** From "Not Implemented" placeholder to full implementation.
  - **Added:** Logic to validate `planId` and `transactionId`.
  - **Added:** Logic to insert a new record into the `subscriptions` table.
  - **Added:** Logic to update the user's `profiles` table with `current_plan_id` and `subscription_status`.
- **Removed:** `// TODO:` comments for `POST`, `PATCH`, and `PUT` handlers.

---

## 5. Database Migrations (User Handled)

- **Created:** `supabase/migrations/20250823120000_create_subscriptions_table.sql`
  - **Added:** `subscriptions` table with `id`, `user_id`, `plan_id`, `transaction_id`, `status`, `start_date`, `end_date`, `created_at`, `updated_at` columns.
  - **Added:** Row Level Security (RLS) policies for `SELECT` and `INSERT` for users, and `ALL` for admins.
- **Created:** `supabase/migrations/20250823120001_add_subscription_columns_to_profiles.sql`
  - **Added:** `current_plan_id` and `subscription_status` columns to the `profiles` table.
- **Note:** These migrations were created by me, but the user explicitly stated they would handle applying them to the Supabase database.

---

## 6. Redundancy Removal

### `app/api/subscriptions/route.ts`
- **Removed:** The entire file.
  - **Reason:** This was an older, redundant implementation for creating subscriptions without proper payment gateway integration, using hardcoded plan data.

### `PlanCard.tsx` (root)
- **Removed:** The file from the root directory.
  - **Reason:** Its content was moved to `components/plans/PlanCard.tsx`.

### `PlanUpgradeModal.tsx` (root)
- **Removed:** The file from the root directory.
  - **Reason:** Its content was moved to `components/plans/PlanUpgradeModal.tsx`.

### `index.css` (root)
- **Removed:** The file from the root directory.
  - **Reason:** Unused and contributed to codebase clutter.

---

## 7. Error/Warning Fixes

- **`components/plans/PaymentMethodsModal.tsx`:**
  - **Fixed:** `useEffect` missing dependencies warning by adding `setDiscountCodeInput`, `setAppliedDiscount`, `setDiscountMessage`, and `updateFormData` to the dependency array.
- **`components/plans/PlanUpgradeModal.tsx`:**
  - **Fixed:** `react/no-unescaped-entities` error by using a `periodText` variable to handle the dynamic string content, avoiding direct unescaped apostrophes in JSX.

---
