# TEXQTIC EXECUTION & COMPLIANCE SYSTEM (TECS) - v2.0.1

This document is the formal governance authority for execution discipline, launch readiness, cost control, validation, and drift management in this repository.

## 0. Authority and Conflict Rule

- TECS v2.0.1 is the source of truth for repository execution.
- If a prompt conflicts with TECS, stop and request clarification.
- Copilot instruction files are enforcement summaries, not substitutes for TECS.

## 1. Control Index (Mandatory)

The following controls are mandatory and normative in TECS v2.0.1:

1. Safe-Write Mode
2. Hard Stops
3. Prompt Discipline
4. Copilot Cost Gate
5. Feature Intake Gate
6. Lane A/B/C/D/E execution model
7. Gap lifecycle with post-unit truth sync
8. Static gates
9. Runtime and production verification discipline
10. Evidence tiers
11. Launch readiness enums
12. Repo/runtime/product truth gates
13. QA defect triage classes
14. Adjacent finding rule
15. DB apply governance
16. GR-007 tenant context integrity guardrail
17. GR-008 stale design/repo-truth revalidation guardrail
18. Commit/reporting protocol
19. Manual QA role
20. Hub drift-control rules
21. Launch Board rule
22. Design-intake template
23. Final-report template
24. FTR-SL-017 design-intake gate

## 2. Core Operating Controls

### 2.1 Safe-Write Mode

- Modify only prompt-allowlisted files.
- No file creep, no hidden refactors, no unapproved scope expansion.
- Keep implementation and governance commits separate unless the unit is governance-only.

### 2.2 Hard Stops

Stop immediately and report blockers when:

- Scope becomes ambiguous or exceeds allowlist/cost class.
- Required evidence cannot be produced.
- Governance, auth, tenancy, DB, or launch-safety conflicts appear.
- Prompt requirements are incomplete for implementation units.

### 2.3 Prompt Discipline

Every implementation unit must declare: Unit ID, lane, cost class, evidence tier, intent, boundaries, allowlist, forbidden actions, stop condition, validation plan, runtime QA script (if runtime-visible), and hub impact.

## 3. Cost and Intake Controls

### 3.1 Copilot Cost Gate

- LOW: read-only, triage, verification, governance; no source edits.
- MEDIUM: one bounded fix, typically 1-3 source files, no DB/schema/RLS.
- HIGH: launch-facing UX/public/auth/security/DB/schema/RLS/architecture/multi-surface; requires explicit Paresh approval before implementation.

### 3.2 Feature Intake Gate

No launch-facing implementation starts before intake is complete:

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

## 4. Execution Model and Lifecycle

### 4.1 Lane Model

- Lane A: Investigation/Design
- Lane B: Implementation (bounded)
- Lane C: Verification/Runtime Proof
- Lane D: Production Verification/Readiness
- Lane E: Governance/Drift Sync

### 4.2 Gap Lifecycle with Post-Unit Truth Sync

Flow: discover -> scope lock -> implement -> validate -> runtime/prod verify (if required) -> governance sync -> close.

Post-unit truth sync is mandatory for impacted trackers/hubs.

### 4.3 Adjacent Finding Rule

Adjacent findings must be either:

- fixed in-scope when inseparable and safe, or
- registered as separate units with priority, impact, owner, and disposition.

## 5. Verification and Evidence

### 5.1 Static Gates

Run task-relevant static checks and report outcomes before closure.

### 5.2 Runtime/Production Discipline

For runtime-visible or production-sensitive changes, enforce:

implement -> commit -> deploy -> verify -> post-unit truth sync

Do not close production-dependent units on local proof only.

### 5.3 Repo/Runtime/Product Truth Gates

Launch-ready requires all three:

1. repo truth
2. runtime truth
3. product/manual QA truth

### 5.4 Evidence Tiers

- Tier 1: full operational evidence
- Tier 2: compact governance/process evidence
- Tier 3: minimal bounded proof

## 6. Launch Governance

### 6.1 Launch Readiness Enums

Each unit must end in a single explicit final enum from its unit scope.

### 6.2 Launch Board Rule

Launch Board status must only advance using verified, evidence-backed unit outcomes.

### 6.3 Hub Drift-Control Rules

Launch hubs/registers are authoritative tracking surfaces and must be synchronized after each relevant unit. No stale statuses.

### 6.4 QA Defect Triage Classes

Classify defects by launch impact and route accordingly (blocker/critical/major/minor/watch-item) with explicit disposition.

### 6.5 Manual QA Role

Manual QA is required for launch-facing UX/runtime acceptance and cannot be replaced by static proof alone.

## 7. Data Governance and Guardrails

### 7.1 DB Apply Governance

No DB/schema/Prisma/SQL/RLS/grant/prod DB mutation unless prompt explicitly authorizes a DB-governed unit with:

- exact SQL or migration scope
- apply method
- rollback plan
- proof queries/evidence

### 7.2 GR-007 Tenant Context Integrity

Any change touching auth/context/RLS/tenant-scoped access must preserve tenant context integrity and produce proof against regression.

### 7.3 GR-008 Stale Design/Repo-Truth Revalidation

If design assumptions are stale or runtime/repo truth diverges, re-run repo-truth validation before implementation and update unit scope accordingly.

## 8. Commit and Reporting Protocol

- Use atomic, prompt-scoped commits.
- Stage only allowlisted files.
- Report exact validations run and outcomes.
- Do not claim success without evidence.

## 9. Required Templates

### 9.1 Design-Intake Template (Required Fields)

- Unit ID
- Lane
- Cost class
- Evidence tier
- Product intent
- UX pattern
- Public/private boundary
- Scope and allowlist
- Forbidden actions
- Acceptance criteria
- Runtime QA script
- Validation plan
- Stop conditions
- Hub impact

### 9.2 Final-Report Template (Required Fields)

- Unit identity and outcome enum
- Preflight and branch/HEAD status
- Files inspected and changed
- Validation commands and outcomes
- Runtime/prod verification (if required)
- Hub impact/result
- Commit hash and push status
- Final git status
- Next recommended unit

## 10. FTR-SL-017 Gate

FTR-SL-017 Catalogue Public Visibility is design-intake-gated.

No implementation may begin until its TECS v2.0.1 design-intake unit is complete and has explicitly decided:

- control location
- who can change it
- default visibility
- product/card/listing impact
- public/private boundary
- save behavior
- runtime QA script
- acceptance criteria
