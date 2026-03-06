# TexQtic Audit Rules

## Governing Policy
- Read `AGENTS.md` first and follow it as the repo policy source of truth.
- Keep scope narrow and evidence-based; avoid speculative architecture claims.

## Tenancy Doctrine
- Canonical tenant boundary is `org_id`.
- `tenantId` can appear as legacy/local naming in APIs, Prisma fields, and comments.
- Do not treat naming alone as doctrine inconsistency without direct behavioral evidence.

## RLS-Sensitive Review Posture
- Treat tenant data paths as RLS-sensitive by default.
- Do not recommend bypassing RLS or weakening tenant isolation controls.
- Flag cross-tenant risk only when evidence shows potential data exposure paths.

## Classification Discipline
- Separate broken wiring from product-incomplete surfaces.
- Prefer `product-defined stub / intentional incompleteness` when code explicitly signals unfinished scope.
- Prefer `missing implementation` when expected behavior exists in UX/path design but no executable path exists.
- Prefer `contract mismatch` when request/response shapes or semantics diverge across layers.

## Evidence and Confidence
- Do not assume schema/status/auth behavior not shown in code or contracts.
- Use minimal-confidence language when evidence is incomplete.
- Mark uncertain findings clearly and request narrow follow-up verification when needed.
