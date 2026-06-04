/**
 * FTR-OPS-001B — Backend Sentry initialization
 *
 * Privacy posture: error-only, no performance tracing, no profiling,
 * no PII capture, no auto-user capture.
 *
 * Initializes only when SENTRY_DSN is present in the environment.
 * No-ops cleanly when DSN is absent (local dev without DSN configured).
 *
 * Imported as a side-effect at the earliest entrypoint of each backend
 * process (api/index.ts for Vercel, server/src/index.ts for local dev).
 */
import * as Sentry from '@sentry/node';

const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'production',
    // sendDefaultPii: false — never attach user IP, request bodies, or cookies automatically
    sendDefaultPii: false,
    // No performance tracing
    tracesSampleRate: 0,
    // No profiling
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

      return event;
    },
  });
}
