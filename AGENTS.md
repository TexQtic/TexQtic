# AGENTS.md — TexQtic Repository Instructions for Codex

## Authority

This repository follows **TECS v2.0.2 — TexQtic Execution & Compliance System**.

Codex must treat the following as binding unless Paresh explicitly overrides them in the current task:

1. The current user prompt.
2. This `AGENTS.md`.
3. `docs/governance/TECS_v2.0.2.md`.
4. Current repo truth from inspected files.
5. Existing tests, scripts, route behavior, schema, and deployment reality.

If instructions conflict, stop and ask for clarification. Do not guess.

---

## Mandatory TexQtic Workflow

Codex must not jump directly into broad implementation.

For every task:

1. Restate the unit ID and lane.
2. Inspect current repo truth before editing.
3. Identify the exact files expected to change.
4. Modify only allowlisted files.
5. Avoid opportunistic cleanup.
6. Run required validation.
7. Report exact files changed.
8. Classify readiness using TECS readiness enums.
9. Register every adjacent finding.
10. Commit only when the prompt explicitly allows it.
11. Push only when the prompt explicitly allows it.

---

## TECS Lane Model

Use the TECS v2.0.2 lane model:

* **Lane A:** Launch feature implementation.
* **Lane B:** Bounded fix or launch improvement.
* **Lane C:** Research, design, triage, or investigation.
* **Lane D:** Verification only.
* **Lane E:** Governance/truth sync only.

If the prompt does not declare a lane, ask Paresh before proceeding.

---

## Safe-Write Mode

Codex must follow Safe-Write Mode:

* Modify only files explicitly allowed by the prompt.
* Do not perform hidden refactors.
* Do not rename files, move folders, or restructure modules unless explicitly authorized.
* Do not change database schema, migrations, SQL, Supabase config, auth providers, Vercel config, or environment handling unless explicitly in scope.
* Do not mix unrelated adjacent fixes into the active unit.
* Do not change public/private access boundaries unless explicitly authorized.

---

## Secret-Safe Runtime Rule

Never request, print, log, expose, screenshot, or summarize:

* passwords
* tokens
* cookies
* JWTs
* refresh tokens
* access tokens
* service-role keys
* DB URLs
* invite links
* reset links
* raw auth payloads
* raw localStorage/sessionStorage values containing secrets
* `.env` values

If runtime auth context is needed, ask Paresh only to open or switch the IDE/browser to the required authenticated session.

Use this wording:

> Paresh, please switch/open the required authenticated session in the IDE browser. Do not paste passwords, tokens, cookies, JWTs, or secrets.

---

## Repo Truth First

Before editing, inspect relevant files, scripts, and tests.

Do not rely only on prior reports, stale line numbers, or assumed architecture.

Every implementation or verification report must include:

* files inspected
* files changed
* commands run
* validation results
* runtime verification performed or why it was not possible
* readiness classification
* adjacent findings registered

---

## DB / SQL / Migration Rule

No database changes may be assumed applied.

If a unit touches SQL, Prisma, migrations, Supabase policies, RLS, schema, or DB apply steps, Codex must require:

* exact tracked SQL or migration path
* approved apply method
* rollback plan
* post-apply proof queries
* clear statement that tracked SQL files are not automatically applied by Prisma unless the repo process says so

If the prompt does not explicitly authorize DB apply, classify the task as implementation-only and register a separate DB-apply unit.

---

## Production-Dependent Runtime Rule

For production-dependent behavior, local validation is not enough.

Use:

> implement → commit → deploy → verify → minimal truth sync

A unit cannot close as `READY_FOR_LAUNCH` until required runtime or production proof passes.

If source validates but production verification remains pending, classify:

`TECHNICALLY_FUNCTIONAL_PRODUCT_ACCEPTANCE_PENDING`

---

## Readiness Classification Enums

Use exactly one of these in final reports:

* `READY_FOR_LAUNCH`
* `TECHNICALLY_FUNCTIONAL_PRODUCT_ACCEPTANCE_PENDING`
* `BLOCKED_BY_DEPLOYMENT_NOT_UPDATED`
* `BLOCKED_BY_RUNTIME_DEFECT`
* `BLOCKED_BY_AUTH_OR_SECURITY_RISK`
* `BLOCKED_BY_PRODUCT_DESIGN_GAP`
* `BLOCKED_BY_SCOPE_EXPANSION_REQUIRED`

---

## Adjacent Finding Rule

No loose notes.

Every adjacent finding must be handled as one of:

| Finding type               | Required action                                                           |
| -------------------------- | ------------------------------------------------------------------------- |
| Safe, small, in-scope      | Fix immediately within the same unit if the prompt permits source changes |
| Real but out-of-scope      | Register as a follow-up unit with ID, priority, owner/status              |
| Unclear / needs repo truth | Register as an investigation/preflight unit                               |

Lane D verification prompts must not fix adjacent findings. They must only register them.

---

## Runtime / Browser Guardrails

For Superadmin, auth, onboarding, tenant lifecycle, payments, or public/private projection work:

* Do not click approve, reject, activate, archive, delete, provision, suspend, restore, charge, invoice, sync, or payment mutation controls unless explicitly authorized.
* Do not create production records unless explicitly authorized.
* Do not use raw passwords in browser-driven flows that may leak into logs or screenshots.
* Do not ask Paresh to paste secrets.
* Use visible UI evidence where possible.

---

## Commit Discipline

When commits are authorized:

* Make atomic commits.
* Use a clear commit message matching the unit.
* Do not bundle governance/truth-sync changes with source implementation unless the prompt explicitly allows it.
* If TECS requires separate commits, use separate commits.
* Push only when explicitly authorized.

If commits are not authorized, state:

`No commit. Verification/design/report-only unit.`

---

## Standard Final Report Format

Use this format unless the prompt specifies another:

1. Plan
2. Repo Truth Inspected
3. Changes Made or Runtime QA Performed
4. Files Changed
5. Validation Run
6. Runtime / Production Verification
7. Readiness Classification
8. Risks / Follow-up
9. Adjacent Findings Registered
10. Commit / Push Status

---

## Current TexQtic Operating Context

TexQtic is a launch-critical textile B2B/B2C/D2C platform using:

* pnpm + Turbo monorepo
* Next.js / React frontend
* Node backend
* Supabase Postgres/Auth
* Prisma
* strict multi-tenancy with `org_id` and RLS expectations
* Vercel deployment
* TECS governance and launch-readiness tracking

Current work must prioritize launch readiness, production safety, tenant isolation, Superadmin safety, public/private route correctness, and secret-safe verification.

Do not broaden Superadmin read-all semantics unless `CONTROL-PLANE-READ-ALL-DECISION-001` is explicitly resolved.
