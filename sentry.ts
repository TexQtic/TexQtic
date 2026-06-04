/**
 * FTR-OPS-001B — Frontend Sentry initialization
 *
 * Privacy posture: error-only, no session replay, no performance tracing,
 * no profiling, no PII capture, no analytics.
 *
 * Initializes only when VITE_SENTRY_DSN is present in the environment.
 * No-ops cleanly when DSN is absent (local dev without DSN configured).
 */
import * as Sentry from '@sentry/react';

// Access via bracket notation to avoid strict ImportMetaEnv type constraint.
// VITE_SENTRY_DSN must be set in Vercel environment variables (not committed).
const env = import.meta.env as Record<string, string | undefined>;
const dsn = env['VITE_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    // Use Vite's MODE for environment (development / production / preview)
    environment: import.meta.env.MODE ?? 'production',
    // sendDefaultPii: false — never attach user IP, email, or cookies automatically
    sendDefaultPii: false,
    // No performance tracing
    tracesSampleRate: 0,
    // No session replay, no profiling — integrations array left empty
    integrations: [],
    beforeSend(event) {
      // Strip user identity — never send org_id, email, user UUID, or name
      delete event.user;

      // Scrub sensitive request headers from captured events
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        for (const key of Object.keys(headers)) {
          const lk = key.toLowerCase();
          if (
            lk === 'authorization' ||
            lk === 'cookie' ||
            lk.includes('token') ||
            lk.includes('secret') ||
            lk.includes('api_key') ||
            lk.includes('password')
          ) {
            delete headers[key];
          }
        }
      }

      // Scrub any extra context fields that may hold sensitive values
      if (event.extra) {
        const extra = event.extra as Record<string, unknown>;
        for (const key of Object.keys(extra)) {
          const lk = key.toLowerCase();
          if (
            lk.includes('password') ||
            lk.includes('secret') ||
            lk.includes('token') ||
            lk.includes('api_key')
          ) {
            delete extra[key];
          }
        }
      }

      return event;
    },
  });
}
