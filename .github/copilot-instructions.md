# TexQtic Copilot Operating Instructions

## Mandatory TECS Authority

Follow TECS v2.0.1 for all work in this repository. The TECS authority document is the source of truth for execution discipline, launch readiness, cost control, validation, and governance.

Authority path: `TECS.md`.

If a user prompt conflicts with TECS v2.0.1, stop and ask for clarification rather than proceeding.

## Before Any Work

Every task must declare:

- Unit ID
- Execution lane: Lane A / B / C / D / E
- Cost class: LOW / MEDIUM / HIGH
- Evidence tier: Tier 1 / Tier 2 / Tier 3
- Product intent
- UX pattern, if launch-facing
- Public/private boundary, if relevant
- File modify allowlist
- Forbidden files/actions
- Stop condition
- Validation plan
- Runtime QA script, if runtime-visible
- Hub impact assessment

If any required field is missing for an implementation task, do not implement. Ask for the missing information.

## Cost Gate

- LOW means read-only, verification, triage, or governance only. No source changes.
- MEDIUM means one bounded fix in 1-3 source files, no DB/schema/RLS.
- HIGH means launch-facing UX, public surface, auth/security, DB/schema/RLS, architecture, or multi-surface implementation. HIGH requires explicit Paresh approval before implementation.

If scope grows beyond the declared cost class, stop and report. Do not auto-expand.

## Launch Feature Gate

No launch-facing implementation may begin until the Feature Intake Gate is complete:

- user role
- tenant/session
- route/page
- product intent
- UX pattern
- data model touched
- public/private boundary
- acceptance criteria
- runtime QA script
- launch-blocking conditions
- expected file surface
- stop conditions

## Readiness Rule

Do not mark a launch-facing unit READY unless all three pass:

1. repo truth
2. runtime truth
3. product/manual QA truth

Technical functionality alone is not launch readiness.

## Verification Rule

- Backend units require tests.
- Frontend/auth/runtime-visible units require deployed/Vercel verification when behavior can differ from local.
- Shared shell changes require neighbor-path smoke checks.
- Shared shell changes that are frontend/runtime-visible require both neighbor-path smoke and deployed runtime verification.

Production-dependent units follow:

implement -> commit -> deploy -> verify -> post-unit truth sync

Never close production-dependent work on local proof alone.

## DB / SQL / RLS Rule

Do not modify DB schema, Prisma schema, SQL, RLS, grants, or production DB state unless the prompt explicitly authorizes a DB-governed unit with SQL, apply method, rollback plan, and proof queries.

## Adjacent Findings

Do not merge adjacent findings into the active unit unless repo truth proves they are inseparable.

Record adjacent findings separately with priority, launch impact, likely file surface, and disposition.

## Governance and Commits

- Implementation and governance changes must be separate commits unless the unit is governance-only.
- Never stage files outside the explicit allowlist.
- Do not create long artifacts for minor issues. Use TECS evidence tiers.

## FTR-SL-017 Gate

Do not implement FTR-SL-017 Catalogue Public Visibility until its TECS v2.0.1 design-intake unit is complete.

FTR-SL-017 must first decide:

- control location
- who can change it
- default visibility
- product/card/listing impact
- public/private boundary
- save behavior
- runtime QA script
- acceptance criteria
