// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Parse console log levels from env (default to error only for production)
const logLevels = (process.env.NEXT_PUBLIC_SENTRY_LOG_LEVELS || "error")
  .split(",")
  .map(level => level.trim()) as Array<"log" | "info" | "warn" | "error" | "debug">;

Sentry.init({
  dsn: "https://f43933de42b9c6a9f5f65efd7ea93fc9@o4510144881557504.ingest.us.sentry.io/4510144882802688",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Capture console logs automatically (configurable via NEXT_PUBLIC_SENTRY_LOG_LEVELS)
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: logLevels }),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});

