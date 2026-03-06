# TexQtic Tenancy Review Rules

## Canonical Boundary
- `org_id` is the canonical tenant boundary across request context and data isolation.
- `tenantId` may appear in code and schema as legacy/local aliasing.
- Do not classify aliasing alone as a doctrine violation.

## RLS-Sensitive Review Posture
- Treat tenant data paths as RLS-sensitive by default.
- Do not recommend bypassing or weakening RLS/auth patterns.
- Separate app-layer scope checks from DB-level RLS behavior in findings.

## Route/Auth vs DB Scoping
- Inspect route-level auth and role guards independently from query scoping.
- A passing auth guard does not prove safe tenant scoping in downstream data access.
- RLS-only protection can be valid, but may still be a defense-in-depth review note when doctrine expects explicit app-layer filters.

## Superadmin and Global Access Caution
- Do not assume superadmin/global-read behavior exists.
- Classify broader access as safe only when explicit implementation and governance backing are visible.
- If broader access intent is unclear, request governance or policy clarification.

## Evidence Thresholds
- Confirmed leak: direct evidence of cross-tenant read/write exposure path.
- Plausible risk: credible path widening risk without direct leak proof.
- Likely safe aliasing: tenantId/org_id naming differences with consistent boundary enforcement evidence.
- If policy/config (RLS policy SQL, runtime role config, environment controls) is not visible, state that limit explicitly and lower confidence.

## Non-Speculative Reporting
- Avoid speculative claims about unseen policies, schema behavior, or environment setup.
- Use precise confidence labels and call out missing evidence.
