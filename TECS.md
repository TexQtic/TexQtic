# TEXQTIC EXECUTION & COMPLIANCE SYSTEM (TECS) - v2.0.2

This document is the formal governance authority for execution discipline, launch readiness, cost control, validation, and drift management in this repository.

## 0. Mandatory Operating Controls

### 0.1 Authority and Conflict Rule

- TECS v2.0.2 is the source of truth for repository execution.
- If a prompt conflicts with TECS, stop and request clarification.
- Copilot instruction files are enforceable summaries, not substitutes for TECS.

### 0.2 Safe-Write Mode

- Modify only prompt-allowlisted files.
- No file creep, no hidden refactors, no unapproved scope expansion.
- Keep implementation and governance commits separate unless the unit is governance-only.

### 0.3 Hard Stops

Stop immediately and report blockers when:

- scope is ambiguous or exceeds allowlist/cost class,
- required evidence cannot be produced,
- governance/auth/tenancy/DB/launch-safety conflicts appear,
- implementation-required control fields are missing.

### 0.4 Copilot Cost Gate (Required Fields)

Every unit must explicitly declare all of:

- cost class
- max scope
- expected files touched
- expected runtime checks
- governance evidence tier
- stop condition
- do not continue if

Required cost-gate block:

```text
Cost class:
Max scope:
Expected files touched:
Expected runtime checks:
Governance evidence tier:
Stop condition:
Do not continue if:
```

## 1. Lane Model (v2.0.2)

- Lane A - Launch Feature
- Lane B - Bounded Fix
- Lane C - QA Triage / Design Decision
- Lane D - Verification Only
- Lane E - Governance / Drift Sync

### 1.1 Lane A - Launch Feature

Use for new launch-facing product capability, public surface, buyer/supplier/admin workflow, UX/product-shaping change, multi-surface feature, or feature affecting launch acceptance.

Requires Feature Intake Gate, bounded design, repo-truth validation, implementation plan, source implementation, runtime verification, product acceptance, and governance sync.

### 1.2 Lane B - Bounded Fix

Use for known localized defects with low product ambiguity, typically 1-3 source files.

Requires short diagnosis, small allowlist, source fix, targeted validation, runtime proof if runtime-visible, and compact governance/TODO sync.

### 1.3 Lane C - QA Triage / Design Decision

Use for ambiguous UX/product issues, expectation mismatches, unclear launch impact, or manual QA findings that may not be code bugs.

No source code by default.

### 1.4 Lane D - Verification Only

Use for deployed runtime confirmation, smoke testing, public non-exposure checks, regression verification, or close-readiness proof.

No source changes.

### 1.5 Lane E - Governance / Drift Sync

Use for hub correction, stale row update, planning-register update, TECS process update, or decision recording.

No source code.

## 2. Intake and Validation Controls

### 2.1 Feature Intake Gate (Launch-Facing)

No launch-facing implementation begins until intake includes:

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

### 2.2 Static Gates

Run task-relevant static checks before closure and record outcomes.

### 2.3 Runtime and Production Verification Discipline

For runtime-visible or production-sensitive work, enforce:

implement -> commit -> deploy -> verify -> post-unit truth sync

Do not close production-dependent units on local proof only.

### 2.4 Repo / Runtime / Product Truth Gate

Launch-ready requires all three:

1. repo truth
2. runtime truth
3. product/manual QA truth

## 3. Evidence Tiers (v2.0.2)

- Tier 1 - TODO Row / Minimal Evidence
- Tier 2 - Compact Artifact
- Tier 3 - Full TECS Artifact

### 3.1 Tier 1 - TODO Row / Minimal Evidence

Use for minor bug, non-launch-blocking adjustment, P3 watch item, or simple future cleanup.

Output: FUTURE-TODO row or existing register update. No new artifact unless Paresh requests.

### 3.2 Tier 2 - Compact Artifact

Use for bounded P1/P2 fixes, runtime blockers, small source changes, verification closure, or governance/process correction.

Output: one compact artifact.

### 3.3 Tier 3 - Full TECS Artifact

Use for launch-critical features, DB/schema/RLS, auth/security, public projection, payment/legal/accounting, multi-surface UX, or product-shaping design.

Output: full TECS artifact.

### 3.4 Tier Selection Rule

Do not produce Tier 3 artifacts unless the unit is launch-critical, security-sensitive, public-facing, cross-domain, DB-affecting, or product-shaping.

## 4. Lane-Specific Lifecycle Rules

### 4.1 Lane A Lifecycle (Full)

1. next-unit confirmation/opening
2. lane selection
3. cost gate
4. Feature Intake Gate
5. bounded design/plan
6. repo-truth validation
7. implementation planning
8. slice-by-slice implementation
9. static validation
10. runtime/production verification
11. product acceptance where launch-facing
12. post-unit truth sync
13. close with readiness enum
14. next-unit recommendation

### 4.2 Lane B Lifecycle (Shortened Source-Capable)

1. next-unit confirmation/opening
2. lane selection
3. cost gate
4. bounded diagnosis/plan
5. repo-truth validation
6. source fix within allowlist
7. targeted static validation
8. runtime/production verification if runtime-visible
9. post-unit truth sync
10. close with readiness enum
11. next-unit recommendation

### 4.3 Lane C Lifecycle (Triage/Design)

1. next-unit confirmation/opening
2. lane selection
3. cost gate
4. repo-truth inspection
5. runtime observation if safe
6. finding classification
7. design decision or next-lane recommendation
8. light governance/truth sync if needed
9. close with triage/design enum

### 4.4 Lane D Lifecycle (Verification-Only)

1. next-unit confirmation/opening
2. lane selection
3. cost gate
4. exact verification script
5. runtime/production verification
6. evidence summary
7. public non-exposure check if relevant
8. post-unit truth sync if readiness truth changes
9. close with readiness enum

Lane D skips implementation planning, source implementation, and source static validation.

If Lane D discovers a source defect, stop and recommend Lane A or Lane B.

### 4.5 Lane E Lifecycle (Governance-Only)

1. next-unit confirmation/opening
2. lane selection
3. cost gate
4. governance/repo-truth evidence review
5. allowlisted governance update
6. hub-sync checklist if launch-readiness truth changes
7. governance diff validation
8. governance commit
9. close with governance enum

Lane E skips source implementation, source static validation, and runtime validation.

If Lane E discovers source work is needed, stop and recommend Lane A or Lane B.

## 5. Lane E Evidence Rule and Hub Evidence Rule

Lane E governance units may update governance and hub rows only within the limits of evidence already available.

Lane E does not lower evidence requirements for status changes.

Any hub status advancement made in Lane E must satisfy TECS hub evidence rules.

Examples:

- `REPO_IMPLEMENTED` requires `REPO_CONFIRMED`.
- `PRODUCTION_VERIFIED` requires `PRODUCTION_CONFIRMED`.
- `LAUNCH_BLOCKER` / `MVP_CRITICAL` requires `REPO_CONFIRMED` plus Paresh confirmation.
- `SUPERSEDED`, `NEEDS_REPO_INSPECTION`, or `PENDING_HUB_UPDATE` may be used when evidence confirms drift but not readiness advancement.

These evidence requirements apply regardless of execution lane, including Lane E governance/drift-sync units.

## 6. Guardrails

### 6.1 DB Apply Governance

No DB/schema/Prisma/SQL/RLS/grant/prod DB mutation unless the prompt explicitly authorizes a DB-governed unit with:

- exact SQL/migration scope
- apply method
- rollback plan
- proof queries/evidence

### 6.2 TECS-GR-007 Tenant Context Integrity Guardrail

Any change touching auth/context/RLS/tenant-scoped access must preserve tenant context integrity and produce proof against regression.

### 6.3 TECS-GR-008 Stale Design / Repo Truth Revalidation Guardrail

Family-design artifacts are planning authority, not automatic implementation authority.

A design artifact, family anchor, roadmap item, or prior governance finding may guide implementation, but cannot authorize implementation by itself.

Current repo truth must be revalidated at implementation opening.

#### Trigger

GR-008 is mandatory at implementation opening for every Lane A unit where any of the following exists:

- prior family-design artifact
- product design artifact
- launch-readiness checklist
- roadmap/family anchor
- stale or long-lived implementation plan
- prior governance finding being converted into implementation
- Paresh-approved product direction older than current repo state

#### Definition: Implementation Opening

Implementation opening means the moment a unit moves from planning/design authority into a source-changing implementation prompt.

This occurs when the next unit is confirmed/opened as a Lane A implementation unit, or when Lane C design decision is promoted into Lane A implementation.

#### Required GR-008 Proof Format

```text
TECS-GR-008 Repo-Truth Revalidation Proof

Prior design / family artifact used:
Artifact date / commit, if known:
Current branch:
Current HEAD:
Worktree status:
Files inspected:
Routes/components/services/schema/config inspected:
Changed surfaces since design:
Conflicts found:
Disposition:
Updated implementation allowlist:
Stop condition:
```

#### Pass Criteria

GR-008 passes only if:

1. current HEAD is recorded
2. worktree status is known
3. relevant current files were inspected
4. changed surfaces since design were considered
5. no conflict exists between current repo truth and design assumptions, or conflicts are explicitly resolved before implementation
6. implementation allowlist reflects current repo truth

#### Hard Stop

If current repo truth conflicts with design assumptions:

- do not implement
- do not patch speculatively
- reopen design/intake
- classify drift
- update next-unit recommendation

## 7. Launch Board Rule (Simplified)

Launch Board required columns:

- item ID
- title
- lane
- priority
- launch impact
- readiness enum / status
- blocker yes/no
- next action
- owner/status
- evidence reference
- last verified unit

Do not add a separate `current status` column when `readiness enum / status` exists.

Do not require a separate detailed `evidence level` column if evidence detail is already available in hub/unit artifacts; use `evidence reference`.

Status rule:

The `readiness enum / status` column must use TECS readiness enums. Do not use free-text statuses such as `almost done`, `looks okay`, `mostly ready`, or `pending-ish`.

Purpose rule:

Launch Board is a weekly executive surface and must not become another long-form governance register.

## 8. Reporting Protocol

- Use atomic, prompt-scoped commits.
- Stage only allowlisted files.
- Report validations run and outcomes.
- Do not claim success without evidence.

## 9. Appendix A - Design Intake / Control Template

```text
Execution lane:
Cost class:
Evidence tier:

Max scope:
Expected files touched:
Expected runtime checks:
Governance evidence tier:

Launch impact:
Product intent:
UX pattern:
Public/private boundary:
Acceptance criteria:
Runtime QA script:

Stop condition:
Do not continue if:

Hub impact:
Manual QA required:
```

## 10. FTR-SL-017 Design-Intake Gate

FTR-SL-017 Catalogue Public Visibility is design-intake-gated.

No implementation may begin until its TECS v2.0.2 design-intake unit is complete and has explicitly decided:

- control location
- who can change it
- default visibility
- product/card/listing impact
- public/private boundary
- save behavior
- runtime QA script
- acceptance criteria
