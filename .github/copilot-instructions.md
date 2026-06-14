# TexQtic Copilot Operating Instructions

## Mandatory TECS Authority

Follow TECS v2.0.2 for all work in this repository. The TECS authority document is the source of truth for execution discipline, launch readiness, cost control, validation, and governance.

Authority path: `TECS.md`.

If a user prompt conflicts with TECS v2.0.2, stop and ask for clarification rather than proceeding.

## Before Any Work

Every implementation task must declare:

- Unit ID
- Execution lane
- Cost class
- Evidence tier
- Max scope
- Expected files touched
- Expected runtime checks
- Governance evidence tier
- Product intent
- UX pattern, if launch-facing
- Public/private boundary, if relevant
- Acceptance criteria
- Runtime QA script, if runtime-visible
- File modify allowlist
- Forbidden files/actions
- Stop condition
- Do not continue if
- Validation plan
- Hub impact assessment

If required fields are missing for an implementation task, do not implement. Ask for missing information.

## Lane Meanings (TECS v2.0.2)

- Lane A - Launch Feature
- Lane B - Bounded Fix
- Lane C - QA Triage / Design Decision
- Lane D - Verification Only
- Lane E - Governance / Drift Sync

Lane D and Lane E do not perform source implementation by default.

## Evidence Tiers (TECS v2.0.2)

- Tier 1 - TODO/minimal evidence
- Tier 2 - compact artifact
- Tier 3 - full TECS artifact

Do not produce Tier 3 artifacts unless the unit is launch-critical, security-sensitive, public-facing, cross-domain, DB-affecting, or product-shaping.

## Cost Gate

- LOW: read-only, verification, triage, or governance only; no source changes.
- MEDIUM: one bounded fix, usually 1-3 source files, no DB/schema/RLS.
- HIGH: launch-facing UX/public/auth/security/DB/schema/RLS/architecture/multi-surface work; explicit Paresh approval required before implementation.

If scope grows beyond declared cost class, stop and report. Do not auto-expand.

## Launch Feature Gate

No launch-facing implementation may begin until Feature Intake Gate is complete.

## Verification and Readiness Rule

Do not mark launch-facing work READY unless all three pass:

1. repo truth
2. runtime truth
3. product/manual QA truth

Production-dependent work must follow:

implement -> commit -> deploy -> verify -> post-unit truth sync

Never close production-dependent work on local proof alone.

## DB / SQL / RLS Rule

Do not modify DB schema, Prisma schema, SQL, RLS, grants, or production DB state unless the prompt explicitly authorizes a DB-governed unit with SQL, apply method, rollback plan, and proof queries.

## Lane E Evidence Rule

Lane E governance units may update governance/hub rows only within already available evidence limits. Lane E does not lower hub evidence requirements for status advancement.

## FTR-SL-017 Gate

Do not implement FTR-SL-017 Catalogue Public Visibility until its TECS v2.0.2 design-intake unit is complete.

FTR-SL-017 must first decide:

- control location
- who can change it
- default visibility
- product/card/listing impact
- public/private boundary
- save behavior
- runtime QA script
- acceptance criteria
