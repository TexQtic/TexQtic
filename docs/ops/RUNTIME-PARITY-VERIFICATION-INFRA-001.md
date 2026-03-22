# RUNTIME-PARITY-VERIFICATION-INFRA-001

## Purpose

This note defines the bounded deployed-runtime verification capability introduced for
runtime-sensitive follow-on audits.

It does not authorize product remediation, auth fixes, AdminRBAC expansion, G-026 expansion,
schema work, or broad CI/test rollout.

## Canonical Verification Target

- Target class: `preview`
- Deployment mechanism: manual GitHub Actions workflow
- Workflow: `.github/workflows/runtime-parity-preview.yml`
- Intended use: produce one deployed URL that a follow-on audit can use for effective runtime
  verification of browser entry, auth/session parity, route exposure, middleware-sensitive paths,
  and tenant/control-plane reachability

Preview is the default target class because it is the narrowest deployed surface that exercises the
Vercel serverless entrypoint and Edge middleware path without opening production changes.

## GitHub Secrets Required For Deployment Linkage

The manual deployment workflow requires these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

If any of these secrets are missing, deployment capability is environment-blocked.

## Vercel Preview Env Contract

The workflow pulls preview env values via `vercel pull` and validates presence of the required
contract keys without printing secret values.

Required preview env keys:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ADMIN_ACCESS_SECRET`
- `JWT_ADMIN_REFRESH_SECRET`
- `GEMINI_API_KEY`
- `CORS_ALLOWED_ORIGINS`
- `TEXQTIC_RESOLVER_SECRET`

Recommended preview env keys:

- `FRONTEND_URL`
- `TEXQTIC_PLATFORM_DOMAINS`

Frontend env posture:

- `VITE_API_BASE_URL` should be unset for same-origin preview usage, or set to a deployed URL
- `VITE_API_BASE_URL` must not point to `localhost` in preview

## Verification Procedure

1. Trigger `Runtime Parity Preview Deploy` manually from GitHub Actions.
2. Wait for the workflow to complete the Vercel preview deployment.
3. Read the workflow summary and capture the deployed preview URL.
4. Confirm the workflow route checks passed for:
   - `/`
   - `/api/health`
   - `/verify-email?token=parity-check`
5. Use the deployed preview URL as the effective runtime surface for the next audit.
6. Run the follow-on audit against the preview target in a live browser to verify:
   - deployed browser entry behavior
   - auth/session runtime parity
   - route exposure and deep-link behavior
   - middleware/runtime-sensitive behavior
   - control-plane and tenant surface reachability

## Evidence Produced By The Workflow

The workflow records:

- target class: `preview`
- deployed preview URL
- root entry reachability check
- `/api/health` route exposure check
- SPA deep-link check for `/verify-email?token=parity-check`
- preview env contract validation result

This is sufficient to establish a usable deployed verification surface for a follow-on audit.

## Remaining Limitations

- The workflow establishes deployment capability; it does not prove product workflow correctness.
- The workflow does not close audit findings such as CORS/auth defects or UI truth defects.
- Preview is not equivalent to custom-domain or production traffic shape.
- A follow-on audit is still required for closure-grade browser/runtime truth.
