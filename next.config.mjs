import {withSentryConfig} from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import withBundleAnalyzer from "@next/bundle-analyzer";

/** Handle __filename and __dirname in ESM */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Bundle Analyzer wrapper */
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(
            /\/.*$/,
            "",
          ) || "cvnertrkcwjjdrnnjswk.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/listings/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NEXT_PUBLIC_CORS_ORIGIN || "https://routteme.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: process.env.NEXT_PUBLIC_SUPABASE_URL; font-src 'self' data:; connect-src 'self' https://api.routteme.com; frame-src 'self' https://www.youtube.com https://player.vimeo.com; frame-ancestors 'self' *.facebook.com *.twitter.com *.instagram.com *.tiktok.com;",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  webpack(config, { isServer }) {
    config.cache = {
      type: "filesystem",
      compression: false,
      allowCollectingMemory: true,
      buildDependencies: {
        config: [`${__dirname}/next.config.mjs`],
      },
    };

    return config;
  },
};

export default withSentryConfig(withAnalyzer(nextConfig), {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "routteme",
project: "bidsy",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});