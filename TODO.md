# next.config.mjs - Content Security Policy (CSP) Improvements

This document outlines the necessary changes to `next.config.mjs` to implement a more robust and secure Content Security Policy, specifically addressing the dynamic inclusion of Supabase URLs and proper `frame-ancestors` directives.

## Current State

The `next.config.mjs` currently has a hardcoded `Content-Security-Policy` string.

## Goal

To refactor the CSP to:
1.  Dynamically include the Supabase URL for `img-src` and `connect-src`.
2.  Implement a precise `frame-ancestors` directive to allow embedding from trusted social media domains while mitigating clickjacking risks.

## Proposed Changes

### 1. Dynamic Supabase URL for CSP

The Supabase URL needs to be extracted and formatted correctly for inclusion in the CSP.

**Location:** Before the `async headers()` function.

**Code to add:**

```javascript
const supabaseHost =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://cvnertrkcwjjdrnnjswk.supabase.co")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
const supabaseOrigin = `https://${supabaseHost}`;
```

### 2. Constructing the CSP String

The CSP string should be constructed using an array of directives, making it easier to manage and read.

**Location:** Before the `async headers()` function, after the `supabaseHost` and `supabaseOrigin` declarations.

**Code to add:**

```javascript
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${supabaseOrigin}`,
  `font-src 'self' data:`, 
  `connect-src 'self' https://api.routteme.com ${supabaseOrigin}`,
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self' https://www.facebook.com https://www.instagram.com https://www.tiktok.com https://twitter.com",
].join("; ");
```

### 3. Applying the CSP in Headers

Replace the hardcoded CSP value with the dynamically generated `csp` variable.

**Location:** Inside the `headers` array, within the `Content-Security-Policy` object.

**Code to modify:**

```javascript
          {
            key: "Content-Security-Policy",
            value: csp, // Replace the existing long string with this variable
          },
```

## Implementation Notes & Considerations

*   **Placement:** Ensure `supabaseHost`, `supabaseOrigin`, and `csp` are declared at a scope accessible by the `headers()` function, ideally just before it.
*   **Testing:** After implementing these changes, thoroughly test the application, especially:
    *   Image loading from Supabase.
    *   API calls to Supabase.
    *   Embedding of YouTube/Vimeo videos.
    *   Embedding of content from Facebook, Instagram, TikTok, and Twitter.
    *   General application functionality to ensure no other CSP-related issues arise.
*   **`frame-ancestors`:** The `frame-ancestors` directive is crucial for preventing clickjacking. The current proposed value allows specific social media domains. If further restrictions are needed, this directive should be tightened.
