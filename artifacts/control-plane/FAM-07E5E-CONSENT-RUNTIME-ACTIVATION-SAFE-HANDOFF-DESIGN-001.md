# FAM-07E5E-CONSENT-RUNTIME-ACTIVATION-SAFE-HANDOFF-DESIGN-001

## 1) Unit ID And Mode
- Unit: FAM-07E5E-CONSENT-RUNTIME-ACTIVATION-SAFE-HANDOFF-DESIGN-001
- Mode: TECS Safe-Write design-only (no source edits)

## 2) Branch And HEAD
- Branch: main
- HEAD at start of this design unit: 4e9e6d61

## 3) Preflight Results
- `git diff --name-only`: clean (no output)
- `git status --short`: clean (no output)
- `git rev-parse --short HEAD`: `4e9e6d61`
- `git branch --show-current`: `main`

## 4) Lineage Summary (E5B -> E5 -> E5C -> E5D)
- E5B implemented deterministic helper route and safe response envelope.
- E5 retry failed due to auth probe method mismatch.
- E5C established that explicit bearer attachment is required for raw fetch probes.
- E5D confirmed helper success (`201`) with explicit bearer and super-admin session validity (`/api/control/whoami` `200`).
- Remaining blocker after E5D: safe activation/checkpoint handoff for invite-token-gated activation routes.

## 5) Blocker Statement
- Runtime helper path is operational and secret-safe.
- End-to-end LEGAL_PENDING consent runtime evidence remains blocked because activation routes require raw invite token input, while deterministic helper intentionally omits token and invite URL.

## 6) Flow Map (Current Repo Truth)
1. `POST /api/control/tenants/provision/consent-runtime-path` provisions QA tenant and returns safe envelope (inviteId, masked recipient, expected legal status).
2. Provisioning service generates invite token and stores only `tokenHash` in DB.
3. Activation routes (`/api/tenant/activate`, `/api/tenant/activate-authenticated`) require raw `inviteToken`, hash it, then resolve invite by hash.
4. Consent scaffold persistence (`legalConsentSnapshot` + `legalConsentEvent`) occurs inside activation transaction only.
5. Control-plane detail endpoint is intended to project consent scaffold observability.

## 7) Existing Safe Handoff Search Result
- No existing control-plane endpoint can consume helper-provided safe identifiers (inviteId/orchestrationReference/orgId) to execute first-owner activation without exposing raw invite token.
- No reversible token recovery path exists from `tokenHash` (SHA-256 one-way property).
- Existing no-code path requires invite URL/token delivery and user acceptance path, which is external and non-deterministic for this bounded runtime proof objective.

## 8) Options A-E Analysis
### Option A - Keep Current Flow, Require Manual Token Capture For Runtime Evidence
- Feasibility: high
- Security posture: fails safe-runtime requirement
- Determinism: low
- Decision: reject
- Reason: violates bounded secret-safe runtime verification objective.

### Option B - Extend Deterministic Helper To Return Raw Invite Token/URL
- Feasibility: high
- Security posture: unacceptable
- Determinism: high
- Decision: reject
- Reason: directly violates secret non-leak constraints and prior E5B design intent.

### Option C - Add QA-Mode Control-Plane Activation Handoff Endpoint (InviteId-Based, No Token Return)
- Feasibility: medium-high
- Security posture: acceptable with strict guards
- Determinism: high
- Decision: preferred
- Reason: enables deterministic activation/checkpoint completion while preserving token non-disclosure.

### Option D - Use Existing Invite Email + Browser Accept-Invite Runtime Path (No Code)
- Feasibility: medium
- Security posture: acceptable
- Determinism: low-medium (depends on mailbox, delivery timing, manual flow)
- Decision: fallback only
- Reason: viable for manual ops but not stable enough for repeatable bounded runtime verification.

### Option E - Directly Write Consent Snapshot/Event From Control-Plane Without Activation
- Feasibility: medium
- Security posture: mixed
- Determinism: high
- Decision: reject
- Reason: breaks causal contract that consent scaffold evidence is produced by activation flow semantics.

## 9) Preferred Design
- Implement a QA-gated, SUPER_ADMIN-only control-plane handoff endpoint that consumes safe helper identifiers (inviteId plus orgId/orchestrationReference consistency checks), performs invite acceptance and first-owner activation transaction server-side, records LEGAL_PENDING consent scaffold evidence, and returns a bounded non-secret activation receipt.
- Endpoint is strictly runtime-verification scoped and disabled unless explicit `qaMode` guard is present and valid.

## 10) Secret-Safe Rationale
- No raw invite token or invite URL returned in response.
- No JWT values, DB URLs, SMTP secrets, or token hashes surfaced.
- Response contract is bounded to non-secret operational evidence (status, IDs, legal scaffold fields, timestamps, masked email).

## 11) Legal-Gated-Safe Rationale
- Endpoint only permits LEGAL_PENDING scaffold status (no legal finalization semantics).
- Source-flow and event type must remain aligned to activation contract policy.
- Super-admin + QA-mode + QA org naming constraints keep scope bounded to runtime verification path only.

## 12) Minimum Implementation Unit (Bounded)
- Add one control-plane runtime endpoint for activation handoff:
  - Input: `qaMode`, `inviteId`, `orgId` or `orchestrationReference`, bounded consent scaffold payload.
  - Guards: SUPER_ADMIN, QA mode constant, invite purpose `FIRST_OWNER_PREPARATION`, pending invite only, target consistency checks.
  - Effects: perform activation transaction and scaffold persistence through shared activation logic.
  - Output: safe receipt (activation state + scaffold summary) with no token disclosure.
- Reuse existing activation transaction semantics to avoid behavioral drift.

## 13) Exact Next-Unit Allowlist (Modify)
- `server/src/routes/admin/tenantProvision.ts`
- `server/src/routes/tenant.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`
- `server/src/__tests__/tenant-activate.integration.test.ts`

## 14) Exact Next-Unit Forbidden Actions
- Do not modify Prisma schema, migrations, or SQL files.
- Do not modify `.env` or any secret-bearing config.
- Do not return raw invite token, invite URL, token hash, or auth header values.
- Do not alter non-QA activation route contracts for production callers.
- Do not broaden scope to unrelated control-plane tenant detail runtime defects.

## 15) Next-Unit Validation Plan
1. `pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route"`
2. `pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold"`
3. Add and run focused tests covering new QA handoff endpoint success + rejection paths.
4. Run targeted auth guard checks for SUPER_ADMIN and qaMode constraints.

## 16) Post-Implementation Runtime Verification Plan
1. Obtain control-plane bearer through existing authenticated session (presence-only handling).
2. Call deterministic helper endpoint and capture only safe envelope fields.
3. Call new QA handoff endpoint with safe identifiers and LEGAL_PENDING scaffold payload.
4. Verify bounded activation receipt shows scaffold persistence outcome.
5. Verify control-plane observable evidence path (existing detail endpoint if healthy; otherwise bounded handoff receipt as runtime proof artifact).
6. Persist artifact with redacted/safe payload and response summaries only.

## 17) Tenant-Detail 500 Sequencing Decision
- Keep `GET /api/control/tenants/:id` runtime `500` as adjacent and separate unless next unit cannot complete runtime evidence with bounded handoff receipt.
- Decision: do not couple tenant-detail defect remediation into activation handoff implementation by default.

## 18) FAM-07 Status
- Remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- Not eligible for runtime closure in this design-only unit.

## 19) FTR-LEGAL-003 Status
- Remains: OPEN / MVP_CRITICAL
- No closure or legal-final claim in this unit.

## 20) HD-001 Status
- Remains: RUNTIME_CONFIRMED_CONFIGURED

## 21) Hub Impact Decision
- NO_HUB_UPDATE_REQUIRED
- Reason: design-only packet; no implementation or closure status transition.

## 22) Adjacent Findings
- Control-plane tenant detail read path currently returns runtime `500` for sampled tenant IDs while list endpoint remains healthy.
- This remains tracked as a separate reliability/audit item unless activation handoff proof cannot be completed without it.

## 23) Final Enum
- FAM_07E5E_CONSENT_RUNTIME_ACTIVATION_SAFE_HANDOFF_DESIGN_READY_FOR_IMPLEMENTATION
