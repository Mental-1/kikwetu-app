// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://e435ec348b0e91b4fd9fc89110ef3c96@o4509619077382144.ingest.us.sentry.io/4509687939727360",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
