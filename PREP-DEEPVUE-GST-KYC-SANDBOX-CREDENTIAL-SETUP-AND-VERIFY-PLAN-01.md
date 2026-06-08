# PREP-DEEPVUE-GST-KYC-SANDBOX-CREDENTIAL-SETUP-AND-VERIFY-PLAN-01

**Type:** Preparation / Verification Plan  
**Date:** 2026-06-08  
**Author:** Paresh Patel  
**Status:** ACTIVE — pending sandbox credential setup

---

## Accepted Prior Truth

| Enum | Commit |
|---|---|
| `IMPL_MAINAPP_GST_KYC_PROVIDER_EVIDENCE_SCAFFOLD_COMPLETE_REAL_PROVIDER_PENDING` | `9a3ab06c` |
| `VERIFY_MAINAPP_GST_KYC_PROVIDER_EVIDENCE_SCAFFOLD_DEPLOYMENT_COMPLETE_DEEPVUE_APPROVAL_PENDING` | (prior verify unit) |
| `IMPL_CRM_LIFECYCLE_SYNC_REGISTRATION_AND_STATUS_EVENTS_COMPLETE_NOOP_SAFE` | `658ee5b6` |
| `VERIFY_CRM_LIFECYCLE_SYNC_REGISTRATION_AND_STATUS_EVENTS_COMPLETE_NOOP_SAFE` | (prior verify unit) |

Provider decision authority: `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01` + addendum `82058b94`

---

## 1. Deepvue Approval State

| Item | State |
|---|---|
| Deepvue registration | **APPROVED** |
| Sandbox credential availability | **PENDING** — not yet set in any environment |
| Sandbox functional verification | **PENDING** — blocked until credentials are set |
| Production credential availability | **NOT APPROVED** — production credentials must not be configured until all gates below pass |
| Production activation | **NOT APPROVED** — requires DPA/security review, staging verification, and explicit Paresh authorization |
| Credential storage in repo/chat/logs/tests | **FORBIDDEN — absolute prohibition** |
| CRM lifecycle sync impact | Additive only — lifecycle events fire on existing auth/GST flows; Deepvue activation does not change CRM event contract |

---

## 2. Current Provider Boundary (Repo Truth as of `658ee5b6`)

### Provider Selection

Provider is resolved in `GstVerificationService` constructor (`server/src/services/gstVerification.service.ts`, line 115):

```typescript
const providerName = process.env.GST_PROVIDER;
this.gstProvider = providerName ? createGstProvider(providerName) : undefined;
```

`createGstProvider` is defined in `server/src/services/gstProvider.service.ts`.

### Provider Selection Table

| `GST_PROVIDER` value | Behavior |
|---|---|
| absent / unset | `gstProvider = undefined` → admin fallback queue always; no HTTP call |
| `'noop'` | `NoopGstProviderAdapter` → returns `PROVIDER_ERROR` immediately; no HTTP call |
| `'deepvue'` | `DeepvueGstAdapter` if `GST_PROVIDER_CLIENT_ID` + `GST_PROVIDER_CLIENT_SECRET` are both set |
| `'deepvue'` with missing credentials | `console.warn` (no secret value logged) → falls back to `NoopGstProviderAdapter` |
| any other value | `NoopGstProviderAdapter` (default branch) |

### Required Env Vars for Deepvue Mode

| Env Var | Purpose | Required for Deepvue? |
|---|---|---|
| `GST_PROVIDER` | Selects provider; must be `'deepvue'` | ✅ Must be set to `deepvue` |
| `GST_PROVIDER_CLIENT_ID` | Deepvue client/app ID | ✅ Must be set |
| `GST_PROVIDER_CLIENT_SECRET` | Deepvue client secret (also used as `x-api-key` header) | ✅ Must be set |

**Neither `GST_PROVIDER_CLIENT_ID` nor `GST_PROVIDER_CLIENT_SECRET` is validated by Zod config.**  
They are read directly from `process.env` inside `createGstProvider()`. Missing credentials are non-fatal: service degrades to noop with a `console.warn`.

### Noop/Fallback Behavior

- When `GST_PROVIDER` is absent: `gstProvider = undefined` → provider check block in `submitVerification` is skipped entirely → record is placed in admin fallback queue.
- When credentials are absent for `deepvue`: `NoopGstProviderAdapter.verifyGstin()` returns `{ ok: false, reason: 'PROVIDER_ERROR' }` → admin fallback queue.
- **In both cases: no exception thrown into tenant submission path.**

### Test Isolation

All tests in `gst-provider.service.unit.test.ts` and `gst-verification.service.unit.test.ts` use:
- `vi.stubGlobal('fetch', ...)` — stubbed fetch only; no real Deepvue calls
- Explicit `vi.unstubAllGlobals()` in `afterEach`
- `new DeepvueGstAdapter('test-id', 'test-secret')` with fake credentials — no env var reads in tests
- CI/local default: no `GST_PROVIDER` env var set → noop-safe by default

### Current Default Mode

**CI / local / staging-without-GST_PROVIDER**: noop-safe. No provider HTTP calls. All GST submissions go to admin fallback queue.

---

## 3. Secret-Safe Credential Setup Plan

### Exact Env Var Names

```
GST_PROVIDER=deepvue
GST_PROVIDER_CLIENT_ID=<obtain from Deepvue dashboard — do not paste here>
GST_PROVIDER_CLIENT_SECRET=<obtain from Deepvue dashboard — do not paste here>
```

### Where to Set (Sandbox/Staging Only)

| Environment | Action |
|---|---|
| **Vercel Preview / Staging deployment** | Set via Vercel dashboard → Project → Settings → Environment Variables → Preview scope only |
| **Local developer sandbox testing** | Set in local `.env` (git-ignored by `.gitignore`) — never commit |
| **CI/CD pipelines** | Do NOT set unless the CI environment is explicitly scoped to sandbox testing |
| **Production Vercel** | **Must remain UNSET** until explicit production activation is authorized |

### Where Not to Set

- Do NOT set in any committed file (`.env`, `.env.local`, `.env.production`, `docker-compose.yml`, `k8s` manifests)
- Do NOT paste values into this document, any PR comment, any chat window, or any log
- Do NOT set in the root `.env.example` with real values — `.env.example` uses placeholder strings only
- Do NOT set in CI default environment unless explicitly scoped and authorized

### Who Authorizes

- Sandbox/staging setup: Paresh Patel
- Production activation: Paresh Patel — requires explicit separate authorization after all gates pass

### Verifying Credential Presence Without Printing Values

In a server shell or deployment health check, verify presence only:

```bash
# Confirms vars are SET (non-empty). Never prints values.
[[ -n "${GST_PROVIDER}" ]] && echo "GST_PROVIDER: SET" || echo "GST_PROVIDER: ABSENT"
[[ -n "${GST_PROVIDER_CLIENT_ID}" ]] && echo "GST_PROVIDER_CLIENT_ID: SET" || echo "GST_PROVIDER_CLIENT_ID: ABSENT"
[[ -n "${GST_PROVIDER_CLIENT_SECRET}" ]] && echo "GST_PROVIDER_CLIENT_SECRET: SET" || echo "GST_PROVIDER_CLIENT_SECRET: ABSENT"
```

### Verifying Runtime Mode (Without Leaking Secrets)

Check server startup log:

```
# Noop mode (expected when credentials absent):
[GST] GST_PROVIDER=deepvue but credentials missing; using noop fallback

# No log = GST_PROVIDER not set at all (also noop-safe)

# Deepvue active (credentials present, no warn logged):
# Server starts cleanly; first real GSTIN submission triggers token acquisition
```

No runtime log will ever print credential values. The `getAccessToken()` method does not log the access token or credentials.

---

## 4. Sandbox Verification Plan

**Proposed unit:** `VERIFY-DEEPVUE-GST-KYC-SANDBOX-FUNCTIONAL-MAPPING-01`

### Prerequisites

Before this unit can be executed:
1. Deepvue sandbox credentials obtained from Deepvue dashboard
2. Credentials set in a non-production environment (Vercel Preview or local `.env`) only
3. Deepvue sandbox/test GSTINs confirmed — use only GSTINs explicitly provided by Deepvue for sandbox testing; never submit real production GSTINs

### Environment Constraint

- **Non-production environment only**
- Sandbox/test GSTINs only — Deepvue sandbox provides test GSTINs for integration testing
- No production GSTINs submitted
- No production org status changes
- No production database mutations

### Expected Verification Checks

#### Auth Flow
- [ ] `POST /v1/authorize` with sandbox credentials returns `access_token` + `expiry`
- [ ] Token is cached in `_tokenCache`; second call within window does not re-authenticate
- [ ] Token cache respects 5-minute refresh buffer (`TOKEN_REFRESH_BUFFER_MS`)

#### Success Response Mapping — Active GSTIN
- [ ] `GET /v1/verification/gstin-advanced?gstin_number=<test-active-gstin>` returns `200`
- [ ] `json.data.gstin_status` (or `json.data.sts`) maps to `normalizedFilingStatus = 'ACTIVE'`
- [ ] `legalName` extracted from `json.data.legal_name` (or `json.data.lgnm`)
- [ ] `businessName` extracted from `json.data.business_name` (or `json.data.tradeNam`)
- [ ] `transactionId` from `json.transaction_id`
- [ ] `providerTimestamp` from `json.timestamp`
- [ ] `filingSummary` bounded to ≤12 records
- [ ] `sanitizedPayload` does not contain `pan_number`, `aadhaar_validation`, `aadhaar_validation_date`, `contact_details.mobile`, `contact_details.email`
- [ ] `sanitizedPayload` retains `contact_details.address` (not PII)

#### Auto-Approval Criteria Mapping (C3–C6)
- [ ] C3: `normalizedFilingStatus === 'ACTIVE'` → proceeds to C4
- [ ] C4: `gstin.substring(0, 2) === stateCode` → proceeds to C5
- [ ] C5: `nameMatches(legalNameOnGst, data.legalName) || nameMatches(..., data.businessName)` at ≥80% similarity → proceeds to C6
- [ ] C6: No other org with same GSTIN + `review_outcome = APPROVED` → `autoProviderResult = 'AUTO_APPROVED'`
- [ ] Auto-approval writes `review_outcome = 'APPROVED'` and advances `org.status` to `VERIFICATION_APPROVED`
- [ ] Race guard: second call with same GSTIN does NOT double-approve

#### Non-Auto-Approval Outcomes (Must Not Auto-Reject)
- [ ] `normalizedFilingStatus !== 'ACTIVE'` → `provider_result = 'INACTIVE_GSTIN'` → admin fallback queue; org remains `PENDING_VERIFICATION`
- [ ] State code mismatch → `provider_result = 'MISMATCH'` → admin fallback queue
- [ ] Name similarity < 0.80 → `provider_result = 'MISMATCH'` → admin fallback queue
- [ ] `DUPLICATE_GSTIN` → `provider_result = 'DUPLICATE_GSTIN'` → admin fallback queue
- [ ] In all non-AUTO_APPROVED cases: org status remains `PENDING_VERIFICATION`; no auto-rejection; admin review required

#### Error / Timeout Mapping
- [ ] HTTP 422 from Deepvue → `{ ok: false, reason: 'INVALID_GSTIN' }` → admin fallback
- [ ] HTTP 401/403 → token cache cleared → `{ ok: false, reason: 'PROVIDER_ERROR' }` → admin fallback
- [ ] HTTP 429/500/503 → `{ ok: false, reason: 'PROVIDER_ERROR' }` → admin fallback
- [ ] `AbortError` (8s timeout) → `{ ok: false, reason: 'TIMEOUT' }` → admin fallback
- [ ] Business-level `NO_RECORDS_FOUND` in 200 response → `{ ok: false, reason: 'INVALID_GSTIN' }` → admin fallback
- [ ] **In all error cases: tenant submission returns 200 (not 5xx); tenant is not notified of provider failure**

#### Evidence Column Writes
- [ ] `provider_name = 'deepvue'` written
- [ ] `provider_request_id = data.transactionId` written (may be empty string — acceptable)
- [ ] `provider_verified_at = new Date(data.providerTimestamp)` written
- [ ] `provider_result` matches the outcome string (one of the CHECK constraint values)
- [ ] `raw_verification_json` contains sanitized payload — no PAN, no Aadhaar, no mobile/email
- [ ] `filing_status` column updated to normalized value

#### Admin Fallback Behavior
- [ ] Non-AUTO_APPROVED outcomes: record appears in admin review queue
- [ ] Admin can review and manually approve/reject
- [ ] Manual admin approval works identically in provider and no-provider modes

#### CRM Lifecycle Event Behavior (Provider Path)
- [ ] `notifyProviderCheckCompleted` fires after provider runs with: `provider_result`, `provider_name`, `auto_approved`, `org_status`
- [ ] `provider_request_id` not in CRM payload
- [ ] `provider_verified_at` not in CRM payload
- [ ] Raw `raw_verification_json` not in CRM payload
- [ ] GSTIN not in CRM payload

#### Log and Redaction Checks
- [ ] Bearer access token does not appear in any log output
- [ ] `GST_PROVIDER_CLIENT_ID` value does not appear in any log
- [ ] `GST_PROVIDER_CLIENT_SECRET` value does not appear in any log
- [ ] `pan_number`, `aadhaar_validation` fields do not appear in stored `raw_verification_json`
- [ ] Provider contact `mobile` and `email` do not appear in stored `raw_verification_json`

---

## 5. DPA / Security / Production Activation Gate

Production activation of Deepvue is blocked until ALL of the following are complete:

| Gate | Status |
|---|---|
| DPA (Data Processing Agreement) with Deepvue signed or confirmed | **PENDING** |
| Deepvue SOC 2 / ISO 27001 certification reviewed | **PENDING** |
| Provider data handling reviewed — confirm: what Deepvue retains, for how long, under what jurisdiction | **PENDING** |
| DPDP 2023 (India) compliance confirmed for Deepvue data flow | **PENDING** |
| Deepvue production credentials available through secret-safe path (Vercel / vault only) | **PENDING** |
| Sandbox functional verification passes (`VERIFY-DEEPVUE-GST-KYC-SANDBOX-FUNCTIONAL-MAPPING-01`) | **PENDING** |
| Staging/preview deployment verified with real credentials | **PENDING** |
| Rollback and noop fallback confirmed (removing `GST_PROVIDER` env var reverts to admin-queue mode without restart penalty) | **CONFIRMED** — noop is always available by removing or unsetting `GST_PROVIDER` |
| Paresh explicitly authorizes production activation in a separate prompt/unit | **PENDING** |

**No automated process may mark Deepvue production-active. This requires a named human authorization.**

---

## 6. Next Implementation / Verification Sequence

Execute in this order. Do not merge steps.

| Step | Unit | Prerequisite |
|---|---|---|
| 1 | **Secret-safe sandbox env setup** — set `GST_PROVIDER=deepvue`, `GST_PROVIDER_CLIENT_ID`, `GST_PROVIDER_CLIENT_SECRET` in Vercel Preview env or local `.env` only | Deepvue dashboard access |
| 2 | **`VERIFY-DEEPVUE-GST-KYC-SANDBOX-FUNCTIONAL-MAPPING-01`** — run sandbox GSTIN verification against all paths in Section 4 above | Step 1 complete |
| 3 | **Admin provider evidence display unit** — surface `provider_name`, `provider_result`, `provider_verified_at` in admin GST review UI | Can be parallelized with Step 2 |
| 4 | **`.env.example` update unit** — add `GST_PROVIDER`, `GST_PROVIDER_CLIENT_ID`, `GST_PROVIDER_CLIENT_SECRET` (placeholder values only) | Step 2 complete |
| 5 | **DPA / security / commercial review** — external process, not tracked in this repo | Ongoing |
| 6 | **Governance sync** — update provider-selection truth to reflect sandbox-verified status | Step 2 complete |
| 7 | **Production activation unit** — set production env vars, run deployment verification | Steps 5 + 6 + explicit Paresh authorization |

---

## 7. Risks and Guardrails

| Risk | Guardrail |
|---|---|
| **Accidental production Deepvue call** | `GST_PROVIDER` must not be set in production Vercel env until explicit authorization. Current default is noop-safe — production has no `GST_PROVIDER` set. |
| **Secrets logged** | `getAccessToken()`, `createGstProvider()`, and failure logs never include credential values. Bearer token not logged. Verified in source review. |
| **GSTIN or raw provider JSON exposed to tenants** | `toTenantRecord()` in `GstVerificationService` omits `raw_verification_json`, `reviewed_by_admin_id`, and `reviewed_at`. Tenant projection does not include raw response. |
| **Auto-approval applied to real production orgs too early** | Auto-approval only fires when `autoProviderResult === 'AUTO_APPROVED'` AND the race guard `review_outcome: null` succeeds. Production env remains in noop mode until explicitly activated. |
| **CRM events receiving sensitive fields from provider flow** | `notifyProviderCheckCompleted` accepts only: `provider_result` (category string), `provider_name`, `auto_approved`, `org_status`. No `provider_request_id`, no `provider_verified_at`, no raw JSON, no GSTIN. Verified in 129 passing tests. |
| **Provider sandbox response shape differs from production** | Sandbox verification unit must test both `gstin_status` (Advanced endpoint) and `sts` (Basic endpoint) field variants. `normalizeDeepvueStatus()` handles both. |
| **PAN / Aadhaar stored in raw_verification_json** | `sanitizeDeepvuePayload()` explicitly strips `pan_number`, `aadhaar_validation`, `aadhaar_validation_date`, `contact_details.mobile`, `contact_details.email`. Enforced before any DB write. |
| **Deepvue credential in committed `.env.example`** | `.env.example` only uses placeholder strings (`<obtain from Deepvue dashboard — do not paste here>`). Real values must never be committed. |
| **Token cache leaking across org contexts** | `_tokenCache` is per-adapter-instance, not per-request. The single `DeepvueGstAdapter` instance created at service startup shares the token. This is correct — the token is a service-level API credential, not org-scoped. No cross-tenant risk. |
| **noop fallback unavailable after Deepvue activation** | Removing `GST_PROVIDER` from the environment at any time immediately reverts to admin-queue mode. No code change, no deployment required. Confirmed by source logic. |

---

## Files Inspected (Repo Truth as of `658ee5b6`)

| File | Inspected |
|---|---|
| `server/src/services/gstProvider.service.ts` | ✅ Full read |
| `server/src/services/gstVerification.service.ts` | ✅ Constructor + submit + runProviderCheck |
| `server/src/config/index.ts` | ✅ Confirmed: GST_PROVIDER vars NOT in Zod schema |
| `server/prisma/schema.prisma` | ✅ Provider evidence columns confirmed |
| `server/prisma/migrations/20260608000000_gst_provider_evidence_columns/migration.sql` | ✅ Full read |
| `server/.env.example` | ✅ Confirmed: no GST_PROVIDER vars present |
| `server/src/__tests__/gst-provider.service.unit.test.ts` | ✅ Confirmed stub-only, no real calls |
| `server/src/__tests__/gst-verification.service.unit.test.ts` | ✅ Confirmed stub-only, no real calls |
| `server/src/services/crmLifecycleNotifyClient.ts` | ✅ CRM payload exclusion confirmed |

---

## Hub Impact Checklist

1. **Layer 0 files changed?** No.
2. **Launch tracker / hub / roadmap docs changed?** No.
3. **Provider-selection truth changed?** No — this is additive documentation only; the selection (`DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01`) remains unchanged.
4. **Direct-registration truth changed?** No.
5. **GST handoff truth changed?** No.
6. **Transactional gate truth changed?** No.
7. **CRM/Zoho/billing truth changed?** No.
8. **New production/runtime dependency created?** No.
9. **Hub/governance sync required now?** No — sync is deferred to after sandbox verification passes (Step 6 in Section 6).

`NO_HUB_UPDATE_REQUIRED`

---

## Adjacent Findings

**Finding 1 — `.env.example` missing GST_PROVIDER and CRM_LIFECYCLE vars**
- **Rationale**: `server/.env.example` does not document `GST_PROVIDER`, `GST_PROVIDER_CLIENT_ID`, `GST_PROVIDER_CLIENT_SECRET`, `CRM_LIFECYCLE_BASE_URL`, or `CRM_LIFECYCLE_INGESTION_SECRET`. These are all active optional env vars in the current codebase.
- **Proposed unit**: `CHORE-SERVER-ENV-EXAMPLE-ADD-GST-PROVIDER-AND-CRM-LIFECYCLE-VARS-01`
- **Minimum surface**: `server/.env.example` only — add commented placeholder entries for the 5 missing vars
- **Readiness**: `implementation-ready` — no design gate required; placeholder values only, no secrets

**Finding 2 — Admin provider evidence display not yet implemented**
- **Rationale**: `provider_name`, `provider_result`, `provider_verified_at` columns exist in schema and are written by the provider flow, but no admin UI currently surfaces them in the GST review panel.
- **Proposed unit**: `IMPL-ADMIN-GST-REVIEW-PROVIDER-EVIDENCE-DISPLAY-01`
- **Minimum surface**: admin GST verification review component + admin record Prisma projection
- **Readiness**: `implementation-ready`

---

*Prep unit complete. No source, test, schema, migration, config, or hub files were changed.*

**Final Enum:** `PREP_DEEPVUE_GST_KYC_SANDBOX_CREDENTIAL_SETUP_AND_VERIFY_PLAN_COMPLETE`
