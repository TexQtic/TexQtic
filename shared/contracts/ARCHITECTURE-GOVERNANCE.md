# Architecture Governance (High-Level)

## Domain Ownership Rule

Every table and every route must declare:

- Domain owner
- Plane (control / tenant)
- Lifecycle (create/update/archive)

If ownership is unclear, the change is rejected.

## Plane Separation Rule

Control Plane:

- tenants, admin_users, audit_logs, feature_flags, ai_budgets, ai_usage_meters

Tenant Plane:

- users, memberships, invites, tenant_domains, tenant_branding, tenant_feature_overrides

No business-domain tables allowed in Phase 2.

## Multi-Tenancy Rule

- DB-level RLS is mandatory.
- App code never trusts tenant_id from clients.
- Admin bypass is explicit and audited.

## Change Governance

- One logical change = one migration
- No "misc cleanup" migrations
- Migrations are immutable once merged
- Breaking changes require backward compatibility or explicit data migration scripts

## OpenAPI Contract Governance

- When a frontend-backend contract gap fix modifies request/response shape or newly exposes an endpoint, the corresponding `openapi.tenant.json` or `openapi.control-plane.json` must be updated in the same implementation wave — not as deferred cleanup.
- OpenAPI drift identified by audit (TECS-FBW-OA-001 — tenant plane; TECS-FBW-OA-002 — control plane) is classified as governance debt, not optional documentation.
- Stale or missing OpenAPI paths discovered by audit must be logged in the gap register before the implementing wave closes.
- Enumeration protocol: for each Wave N gap fix, the implementer must confirm whether the affected endpoint already appears in the relevant OpenAPI spec before marking the IMPLEMENTATION-TRACKER-2026-03.md row ✅.

## No Tech-Debt Carry-Forward Rule

- Any repo-gate failure (lint, typecheck) discovered during TECS implementation closeout must be registered as a gap and resolved before the next scheduled implementation unit begins.
- A repo-gate failure first surfaced during closeout is treated as an Immediate-priority gap — not deferred to a later wave.
- Scoped lint passes are acceptable as supplemental evidence during a TECS session but do not substitute for the root gate in the final closeout record.
- Precedent: TECS-FBW-LINT-001 established this rule (2026-03-06 · GOVERNANCE-SYNC-097).

## Repo-Gate Precedence Rule

- `pnpm run lint` and `pnpm run typecheck` must both exit 0 before a TECS unit is marked ✅ in the tracker.
- If root lint fails at closeout time, a TECS-FBW-LINT-* gap is opened immediately with Immediate priority.
- The failing gap must be resolved in the same session or in the very next prompt before any Wave N implementation resumes.
- No `@ts-ignore`, `eslint-disable`, or blanket suppression comments are permitted as a lint-gate workaround without explicit per-line justification in the gap register.

## Atomic Change Envelope Rule

Established: 2026-03-06 · GOVERNANCE-SYNC-100

Every implementation unit must declare an Atomic Change Envelope before editing any code. The envelope must state:

- **Gap ID** — exact tracked unit identifier
- **Objective** — exact defect or gap being resolved
- **Files allowed to change** — explicit allowlist; no implicit expansion permitted
- **Files explicitly out of scope** — named exclusions where ambiguity exists
- **Acceptance criteria** — observable, verifiable exit conditions
- **Validation gates** — the exact commands that must exit 0 before closeout

Execution must remain inside this envelope. If implementation reveals that additional files are required:

1. Stop and identify the newly required files.
2. Classify the expansion as **SAME-UNIT NECESSARY EXPANSION** or **OUT-OF-SCOPE EXPANSION**.
3. **SAME-UNIT NECESSARY EXPANSION** is allowed only if:
   - It is directly caused by compile/runtime closure of the same defect.
   - It does not cross domain boundaries.
   - It does not alter architecture, auth, or RLS behavior.
   - It remains auditable in one atomic commit.
4. **OUT-OF-SCOPE EXPANSION** must not be implemented in the current unit. Instead: stop, update governance docs, and create or recommend the next tracked unit.

No prompt may silently widen from:
- Verification into implementation
- Frontend fix into backend refactor
- Contract fix into feature redesign
- Local UI fix into shell/navigation overhaul beyond the approved boundary

Every completion report must include:
- Whether the envelope was preserved
- Whether any expansion occurred
- Why the expansion was allowed or rejected

## Envelope Precedence Rule

Established: 2026-03-06 · GOVERNANCE-SYNC-100

When there is tension between "while we are here" cleanup and envelope discipline, the envelope wins. Prefer a second tracked unit over opportunistic expansion.
