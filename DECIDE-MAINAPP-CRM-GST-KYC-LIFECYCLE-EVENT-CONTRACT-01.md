# DECIDE-MAINAPP-CRM-GST-KYC-LIFECYCLE-EVENT-CONTRACT-01

**Type:** DECISION / CONTRACT-LOCK
**Status:** `DECISION_MAINAPP_CRM_GST_KYC_LIFECYCLE_EVENT_CONTRACT_LOCKED`
**Date:** 2026-06-09
**Author:** Paresh Patel (TexQtic)
**Repo:** TexQtic Main App (`C:\Users\PARESH\TexQtic`, branch `main`)
**Governing OS:** TECS / Governance OS — TECS v1.4

---

## Context

CRM completed and closed the Tier 0 sensitive payload/raw UI exposure guard:

- CRM implementation commit: `c6a7400 fix(security): guard tier0 sensitive payload exposure`
- CRM close-sync commit: `0e83457 docs(security): close tier0 sensitive payload guard`

CRM then ran `DECIDE-CRM-GST-KYC-LIFECYCLE-OUTCOME-RECEIVER-01` and concluded:

> **`DECISION_CRM_GST_KYC_LIFECYCLE_OUTCOME_RECEIVER_CONTRACT_BLOCKED`**

CRM architecture can safely receive sanitized Main App GST/KYC lifecycle outcome events using a secure webhook-style inbound receiver, idempotency by `idempotency_key`, `crm.onboarding_case_events` for event history, `crm.onboarding_cases.metadata_json` for latest snapshot, and entity matching by `external_orchestration_ref` → `org_id` → constrained normalized email fallback.

CRM implementation was blocked pending Main App locking the exact GST/KYC lifecycle event contract.

**Objective of this unit:** Lock the Main App → CRM sanitized GST/KYC lifecycle event contract for v1. Formally document the sender contract (already implemented as of commit `658ee5b6`) to unblock CRM receiver implementation.

---

## 1. Opening Repo State

```
git status --short:  (clean — no output)
git branch --show-current: main
git status -sb: ## main...origin/main
git log --oneline -8:
  e49c9c80 docs(gst): sync automation design with admin contract boundary
  7a37b87f docs(gst): clarify provider audit field response boundary
  53b04edd fix(admin): remove raw GST provider payload from frontend contract
  615889e8 chore(env): document GST provider and CRM lifecycle vars
  b329e568 feat(admin): show GST provider evidence in review queue
  39b6a118 docs(onboarding): prepare Deepvue sandbox verification plan
  658ee5b6 feat(crm): emit Main App lifecycle sync events
  2ef22038 docs(crm): decide lifecycle payload privacy contract
```

**Worktree:** CLEAN at unit open.

---

## 2. Files and Surfaces Inspected

| File | Purpose |
|---|---|
| `server/src/services/gstProvider.service.ts` (514 lines) | `NoopGstProviderAdapter`, `DeepvueGstAdapter`, `createGstProvider()`, `sanitizeDeepvuePayload()`, name-matching helpers |
| `server/src/services/gstVerification.service.ts` (548 lines) | `GstVerificationService`: submit, admin review, provider check, projectors |
| `server/src/services/crmLifecycleNotifyClient.ts` (378 lines) | All v1 lifecycle event emitters |
| `server/src/services/crmTier0NotifyClient.ts` (120 lines) | Tier 0 notify client (separate concern) |
| `server/src/__tests__/crm-lifecycle-notify-client.unit.test.ts` (477 lines) | Full unit test coverage including forbidden field assertions |
| `server/src/__tests__/gst-provider.service.unit.test.ts` (412 lines) | Sanitizer tests, adapter tests |
| `server/src/config/index.ts` (Zod env schema) | `CRM_LIFECYCLE_BASE_URL`, `CRM_LIFECYCLE_INGESTION_SECRET`, `GST_PROVIDER`, `GST_PROVIDER_CLIENT_ID`, `GST_PROVIDER_CLIENT_SECRET` |
| `server/.env.example` | Env var names documented |
| `server/prisma/schema.prisma` (model `gst_verifications`) | DB columns including `raw_verification_json`, `provider_request_id`, `provider_verified_at` |
| `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01.md` | Prior privacy decision (inherited) |
| `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01.md` | Provider selection (Deepvue primary) |
| `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01.md` | Event map design |

---

## 3. Required Search Findings

### Search 1 — GST / Provider / Sanitize Surface
Files containing `gst|GST|gstin|GSTIN|Deepvue|deepvue|noop|provider_result|auto_approved|raw_verification_json|provider_request_id|provider_verified_at|sanitize|verification`:

Key findings:
- `server/src/services/gstProvider.service.ts` — Deepvue adapter, noop adapter, sanitizer, name matcher
- `server/src/services/gstVerification.service.ts` — verification service with all event emission calls
- Governance docs: `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01.md`, `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01.md`, `DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01.md`
- `server/prisma/schema.prisma` — `gst_verifications` model
- `server/src/__tests__/gst-provider.service.unit.test.ts` — sanitizer assertions confirmed

### Search 2 — CRM / Lifecycle / Event Surface
Files containing `crm|CRM|webhook|notify|notification|lifecycle|event|...`:

Key findings:
- `server/src/services/crmLifecycleNotifyClient.ts` — ALL 7 lifecycle event emitter functions implemented
- `server/src/services/crmTier0NotifyClient.ts` — separate Tier 0 client (independent concern)
- `server/src/__tests__/crm-lifecycle-notify-client.unit.test.ts` — full suite including forbidden field tests
- `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01.md`

### Search 3 — Forbidden Fields / Secrets Surface
Files containing `raw_verification_json|provider_request_id|provider_verified_at|PAN|pan_number|aadhaar|...`:

Key findings:
- `raw_verification_json`, `provider_request_id`, `provider_verified_at` appear ONLY in DB schema and service write path — NOT in CRM event payloads
- `sanitizeDeepvuePayload()` strips `pan_number`, `aadhaar_validation`, `aadhaar_validation_date`, `contact_details.mobile`, `contact_details.email` — confirmed by test coverage
- CRM event payloads are constructed explicitly from safe fields — forbidden fields never appear in `crmLifecycleNotifyClient.ts` payload construction
- `CRM_LIFECYCLE_INGESTION_SECRET` appears only in `server/.env.example` (empty placeholder), `server/src/config/index.ts` (schema declaration), and `server/src/services/crmLifecycleNotifyClient.ts` (`getCrmLifecycleConfig()` — read-only, never logged)

---

## 4. Decision Questions — Answers

**Q1. Does Main App currently execute GST/KYC verification?**
YES. `GstVerificationService` in `server/src/services/gstVerification.service.ts` handles GSTIN submit, provider verification, and admin review. Routes at `server/src/routes/tenant/gst-verification.ts` and `server/src/routes/control/gst-verification.ts`.

**Q2. Is Deepvue implemented or only selected/design-approved?**
IMPLEMENTED — code-complete in `DeepvueGstAdapter` (`gstProvider.service.ts`). Production activation is deferred pending sandbox credential provision and architecture review (`VERIFY-MAINAPP-GST-KYC-PROVIDER-EVIDENCE-SCAFFOLD-DEPLOYMENT-01`). When `GST_PROVIDER` is unset or credentials are absent, `createGstProvider()` gracefully falls back to noop.

**Q3. Is noop provider still present for CI/test/fallback?**
YES. `NoopGstProviderAdapter` is always present. Returns `{ ok: false, reason: 'PROVIDER_ERROR' }` immediately — no network calls. Used when `GST_PROVIDER` is unset, unknown, or when Deepvue credentials are absent.

**Q4. Where is raw/sanitized GST verification payload stored?**
`gst_verifications.raw_verification_json` (Postgres JSONB) — Main App DB only. Stored as `{ provider, transaction_id, timestamp, ...sanitizedPayload }` where `sanitizedPayload` is the output of `sanitizeDeepvuePayload()` (PAN/Aadhaar/contact-mobile/contact-email already stripped before storage).

**Q5. Does Main App store `raw_verification_json` only internally?**
YES. `raw_verification_json` is a server-side audit column only. It is never returned by any API endpoint. Confirmed by `toTenantRecord()` and `toAdminRecord()` — neither projects this column.

**Q6. Does Main App admin API exclude `raw_verification_json`?**
YES. `GstVerificationAdminRecord` interface and `toAdminRecord()` explicitly omit `raw_verification_json`. Commit `53b04edd` enforced this boundary.

**Q7. Does Main App admin API exclude `provider_request_id`?**
YES. `GstVerificationAdminRecord` interface and `toAdminRecord()` explicitly omit `provider_request_id`. Comment in service: *"raw_verification_json and provider_request_id are stored in DB but excluded from normal admin queue responses (audit-only fields; served by a separate endpoint if needed)."*

**Q8. Does Main App have a sanitizer removing PAN, Aadhaar, provider contact mobile/email?**
YES. `sanitizeDeepvuePayload()` in `gstProvider.service.ts` strips: `pan_number`, `aadhaar_validation`, `aadhaar_validation_date`, `contact_details.mobile`, `contact_details.email`. Retains address. Tests in `gst-provider.service.unit.test.ts` confirm each exclusion.

**Q9. Does Main App currently emit any CRM lifecycle events after GST verification?**
YES — ALREADY IMPLEMENTED as of commit `658ee5b6 feat(crm): emit Main App lifecycle sync events`. This is the critical finding: the sender is already live in the codebase. This contract lock documents and canonicalizes the existing implementation. Emitted events:
- `org.gst.submitted.v1` (on first GST submission)
- `org.gst.resubmitted.v1` (on resubmission after REJECTED or NEEDS_MORE_INFO)
- `org.gst.provider_check.completed.v1` (when provider check runs, provider configured)
- `org.gst.admin_reviewed.approved.v1` (on admin APPROVED outcome)
- `org.gst.admin_reviewed.rejected.v1` (on admin REJECTED outcome)
- `org.gst.admin_reviewed.needs_more_info.v1` (on admin NEEDS_MORE_INFO outcome)
- `org.registration.submitted.v1` (on direct registration — emitted from `publicDirectRegistration.service.ts`)

**Q10. Does Main App currently have a CRM notification client pattern that can be reused?**
YES. `crmLifecycleNotifyClient.ts` is the established pattern: fire-and-forget, 8s timeout, HTTPS POST, `x-crm-mainapp-lifecycle-secret` header, noop-safe when env unset, `console.warn` on failure — never throws.

**Q11. What existing auth mechanism should be used?**
`CRM_LIFECYCLE_INGESTION_SECRET` shared-secret sent as `x-crm-mainapp-lifecycle-secret` header. Already implemented and authorized in `crmLifecycleNotifyClient.ts`.

**Q12. Is a new CRM receiver secret/env name needed?**
NO. The existing env vars are sufficient:
- `CRM_LIFECYCLE_BASE_URL` — base URL of CRM app
- `CRM_LIFECYCLE_INGESTION_SECRET` — shared secret (≥32 chars per Zod schema)

No new env vars should be created for this contract.

**Q13. What exact event types should v1 include?**
The 6 GST/KYC lifecycle events (confirmed in implementation):
1. `org.gst.submitted.v1`
2. `org.gst.resubmitted.v1`
3. `org.gst.provider_check.completed.v1`
4. `org.gst.admin_reviewed.approved.v1`
5. `org.gst.admin_reviewed.rejected.v1`
6. `org.gst.admin_reviewed.needs_more_info.v1`

Plus (already locked in prior privacy decision):
7. `org.registration.submitted.v1` (inherited from `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01`)

**Q14. What exact safe fields should be sent to CRM?**
See §7 of this document (Locked v1 Safe Payload Fields).

**Q15. What exact fields must never be sent to CRM?**
See §9 of this document (Locked Forbidden Fields).

**Q16. Should Main App send `legal_name` to CRM in v1?**
YES — but only in `org.registration.submitted.v1`. `legal_name` is NOT included in GST events. This is the existing implementation and is correct: CRM receives it once at registration for contact matching.

**Q17. Should Main App send normalized contact email?**
YES — but only in `org.registration.submitted.v1` (as field `email`, lowercase-normalized). EMAIL_INCLUDED_IN_V1 for CRM contact matching. NOT included in any GST/KYC events. Must never be logged.

**Q18. Should Main App send GSTIN to CRM?**
NO. `gstin: null` is explicit in `org.gst.submitted.v1` and `org.gst.resubmitted.v1`. GSTIN_EXCLUDED_IN_V1 per `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01`. DPDP 2023 classification unresolved — defer to `DECIDE-CRM-GSTIN-DATA-SHARING-DPDP-CLASSIFICATION-01`.

**Q19. Should Main App send `provider_request_id` or `provider_verified_at` to CRM?**
NO. Both are excluded from all CRM event payloads. `provider_request_id` is excluded from admin API as well (audit-only DB column). `provider_verified_at` appears in admin API but is excluded from CRM. Tests confirm neither field is present in any CRM event payload.

**Q20. Should Main App send provider name only as category string?**
YES. `provider_name` in `org.gst.provider_check.completed.v1` is a category string: `'deepvue'` or `'noop'`. Provider credentials, API keys, and provider-internal identifiers are never sent.

**Q21. What should the idempotency key be?**
V1 idempotency key format (already implemented):
```
idempotency_key = "{event}:{org_id}:{epoch_ms}"
```
Example: `org.gst.provider_check.completed.v1:aaaaaaaa-0000-0000-0000-000000000001:1749460800000`

Note: The prompt proposed `event_id` (UUID) as a separate deduplication field. The current implementation uses `idempotency_key` only. For v1, the `idempotency_key` is the canonical deduplication key for CRM. CRM receiver MUST deduplicate on `idempotency_key`. An `event_id` UUID field is deferred to a future v2 enhancement.

**Q22. What should the CRM response contract be?**
CRM receiver returns HTTP 200 or 202. Main App sender does not inspect the response body. Any HTTP response (including non-2xx) is treated as `SENT` by the sender — the sender logs `http_status` but does not retry or block on it. Fire-and-forget delivery.

**Q23. What should Main App do if CRM event delivery fails?**
Fire-and-forget. `console.warn` with safe fields only (event, org_id, idempotency_key, dispatch_status, error_message). Never log full payload, email, GSTIN, or secret. Return `dispatch_status: 'FAILED'` internally. Do NOT block GST verification or tenant workspace access. No outbox or retry queue in v1.

**Q24. Should CRM event delivery block GST verification or tenant workspace access?**
NO. All notify calls use `void notifyX(...).catch(() => undefined)` — completely fire-and-forget. The verification service can never throw into the caller from a CRM notify failure.

**Q25. Is implementation ready after this contract lock?**
CRM RECEIVER: YES — unblocked by this contract lock. CRM can implement `IMPL-CRM-GST-KYC-LIFECYCLE-OUTCOME-RECEIVER-01`.
MAIN APP SENDER: ALREADY IMPLEMENTED as of commit `658ee5b6`. No further implementation needed on the sender side for v1.

---

## 5. Selected Option

**OPTION A — Lock Main App → CRM GST/KYC lifecycle event contract now.**

**Rationale:**
- GST/KYC verification is fully implemented and operational
- `DeepvueGstAdapter` is code-complete; noop provides safe fallback
- `sanitizeDeepvuePayload()` is implemented with full test coverage
- `crmLifecycleNotifyClient.ts` is fully implemented with 7 event emitter functions
- ALL 6 GST/KYC lifecycle events are already emitted from `gstVerification.service.ts`
- Forbidden field exclusion is tested with explicit assertions in unit tests
- Privacy boundaries are established in `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01`
- DPDP 2023 questions already resolved for v1 (GSTIN excluded, email included registration-only)
- Auth mechanism, endpoint, and delivery pattern are all operational
- No missing prerequisites — Option B and Option C conditions do not apply

The sender is already running. This decision unit formally locks the contract as the canonical authority for the CRM receiver to implement against.

---

## 6. Locked V1 Event Types

All GST/KYC lifecycle events emitted by Main App in v1. Implementation authority: commit `658ee5b6`.

| # | Event Type | Trigger | Authority |
|---|---|---|---|
| 1 | `org.gst.submitted.v1` | First GST/KYC submission by tenant | This unit |
| 2 | `org.gst.resubmitted.v1` | Resubmission after REJECTED or NEEDS_MORE_INFO | This unit |
| 3 | `org.gst.provider_check.completed.v1` | Provider verification ran (Deepvue or noop) | This unit |
| 4 | `org.gst.admin_reviewed.approved.v1` | Admin manual review: APPROVED | This unit |
| 5 | `org.gst.admin_reviewed.rejected.v1` | Admin manual review: REJECTED | This unit |
| 6 | `org.gst.admin_reviewed.needs_more_info.v1` | Admin manual review: NEEDS_MORE_INFO | This unit |
| 7 | `org.registration.submitted.v1` | Direct registration completion | Inherited: `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01` |

CRM receiver MUST handle all 7 event types. Events 1–6 are locked by this unit. Event 7 is inherited and its payload contract is unchanged.

---

## 7. Locked V1 Safe Payload Fields

### 7.1 Base Envelope (All Events)

All 7 events include:

| Field | Type | Description |
|---|---|---|
| `event` | `string` | Event type string (e.g. `org.gst.submitted.v1`) |
| `idempotency_key` | `string` | Format: `{event}:{org_id}:{epoch_ms}`. CRM deduplication key. |
| `occurred_at` | `string` (ISO 8601 UTC) | Emission timestamp |
| `org_id` | `string` (UUID) | Organization identifier (canonical tenancy key) |
| `tenant_id` | `string` (UUID) | Tenant identifier (equals `org_id` in current schema) |
| `schema_version` | `string` | Always `"1.0"` in v1 |

### 7.2 `org.gst.submitted.v1` and `org.gst.resubmitted.v1`

Base envelope plus:

| Field | Type | Description |
|---|---|---|
| `org_status` | `string` | Organization status at emission time (e.g. `PENDING_VERIFICATION`) |
| `registration_type` | `string` | GST registration type (e.g. `Regular`) |
| `state_code` | `string` | 2-digit India state code (e.g. `29`) |
| `gstin` | `null` | ALWAYS null in v1 — GSTIN_EXCLUDED_IN_V1 |

### 7.3 `org.gst.provider_check.completed.v1`

Base envelope plus:

| Field | Type | Description |
|---|---|---|
| `provider_result` | `string` | Outcome category. Values: `AUTO_APPROVED` \| `MISMATCH` \| `INACTIVE_GSTIN` \| `INVALID_GSTIN` \| `DUPLICATE_GSTIN` \| `TIMEOUT` \| `PROVIDER_ERROR` |
| `provider_name` | `string` | Provider category string: `deepvue` \| `noop` |
| `auto_approved` | `boolean` | `true` if verification was auto-approved by provider |
| `org_status` | `string` | Organization status after provider check |

### 7.4 `org.gst.admin_reviewed.approved.v1`

Base envelope plus:

| Field | Type | Description |
|---|---|---|
| `review_outcome` | `string` | Always `"APPROVED"` |
| `org_status` | `string` | Always `"VERIFICATION_APPROVED"` |
| `review_notes_category` | `string` | Controlled taxonomy. Default: `"ADMIN_MANUAL_APPROVAL"`. Never free-text admin notes. |

### 7.5 `org.gst.admin_reviewed.rejected.v1`

Base envelope plus:

| Field | Type | Description |
|---|---|---|
| `review_outcome` | `string` | Always `"REJECTED"` |
| `org_status` | `string` | Always `"VERIFICATION_REJECTED"` |
| `rejection_reason_category` | `string` | Controlled taxonomy. Default: `"OTHER_REVIEW_REQUIRED"`. Never free-text admin notes. |

### 7.6 `org.gst.admin_reviewed.needs_more_info.v1`

Base envelope plus:

| Field | Type | Description |
|---|---|---|
| `review_outcome` | `string` | Always `"NEEDS_MORE_INFO"` |
| `org_status` | `string` | Always `"VERIFICATION_NEEDS_MORE_INFO"` |
| `review_notes_category` | `string` | Controlled taxonomy. Default: `"OTHER_REVIEW_REQUIRED"`. Never free-text admin notes. |

### 7.7 `org.registration.submitted.v1` (Inherited)

Base envelope plus fields locked in `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01`:
`email` (lowercase-normalized, CRM matching only, never logged), `legal_name`, `role_intent`, `jurisdiction`, `plan`, `org_status`, `external_orchestration_ref` (nullable), `attribution` (object: `source_channel`, `utm_source`, `utm_medium`, `utm_campaign`).

---

## 8. Fields NOT Included in GST/KYC Events

These fields from the prompt's proposal are NOT present in the v1 GST/KYC event payloads. This is correct per the principle of minimal disclosure:

| Proposed Field | Status | Reason |
|---|---|---|
| `event_id` (UUID) | NOT IN V1 | `idempotency_key` is the v1 deduplication key. UUID `event_id` deferred to v2. |
| `event_type` | NOT APPLICABLE | Field name is `event` in v1 (not `event_type`) |
| `emitted_at` | NOT APPLICABLE | Field name is `occurred_at` in v1 (not `emitted_at`) |
| `external_orchestration_ref` | NOT IN GST EVENTS | Registration-event only (v7). Not repeated in GST events. |
| `normalized_contact_email` | NOT IN GST EVENTS | Registration-event only (EMAIL_INCLUDED_IN_V1). Not in GST events. |
| `role_intent` | NOT IN GST EVENTS | Registration-event only. |
| `jurisdiction` | NOT IN GST EVENTS | Registration-event only. |
| `plan` | NOT IN GST EVENTS | Registration-event only. |
| `source_channel` | NOT IN GST EVENTS | Available via `attribution.source_channel` in registration event only. |
| `first_touch_timestamp` | NOT IN V1 | Deferred. |

CRM receiver MUST NOT expect these fields in GST/KYC event payloads. If CRM needs registration-time context at GST event receipt time, it MUST join on `org_id` from its own data (stored at registration-event time).

---

## 9. Locked Forbidden Fields

The following fields MUST NEVER appear in any Main App → CRM event payload, in any event type, in any version unless a future decision unit explicitly authorizes a specific field for a specific event type with documented justification.

| Field / Pattern | Category | Reason |
|---|---|---|
| `raw_verification_json` / `rawVerificationJson` | Provider payload | DB audit-only; contains un-sanitized provider response |
| Full or partial raw Deepvue API response | Provider payload | Contains PII and provider-internal data |
| `provider_request_id` / `providerRequestId` | Provider identifier | Security classification pending; audit-only DB column |
| `provider_verified_at` / `providerVerifiedAt` | Provider timestamp | Security classification pending |
| Deepvue `transaction_id` / `transactionId` | Provider identifier | Provider-internal correlation ID |
| `gstin` (actual value) | DPDP 2023 | GSTIN_EXCLUDED_IN_V1; DPDP classification unresolved |
| `GSTIN` / `gst_number` | DPDP 2023 | Same as above |
| `pan_number` / PAN | DPDP 2023 | Biometric-adjacent personal identifier |
| `aadhaar_validation` / `aadhaar_validation_date` / Aadhar | DPDP 2023 | Biometric data — DPDP 2023 strict |
| Provider `contact_details.mobile` | DPDP 2023 | Personal mobile stripped by sanitizer |
| Provider `contact_details.email` | DPDP 2023 | Personal email stripped by sanitizer |
| Bearer/access/session/refresh/ID tokens | Auth | Token exposure |
| Invite tokens | Auth | Auth integrity |
| `x-api-key` | Credentials | Provider API credential |
| `client_id` / `client_secret` | Credentials | Provider auth credentials |
| `GST_PROVIDER_CLIENT_ID` / `GST_PROVIDER_CLIENT_SECRET` | Credentials | Provider auth credentials |
| `CRM_LIFECYCLE_INGESTION_SECRET` / `CRM_LIFECYCLE_BASE_URL` | Credentials | Service-to-service secret |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | Secrets | DB connection strings |
| `reviewed_by_admin_id` | Internal | Admin identity — internal audit only |
| Raw `review_notes` (free-text) | PII risk | Free-text notes may contain PII; use category taxonomy |
| Any field from `.env` / environment variables | Secrets | Never in payloads |

---

## 10. Auth / Secret Model

| Attribute | Value |
|---|---|
| Mechanism | Shared-secret HTTP header |
| Header name | `x-crm-mainapp-lifecycle-secret` |
| Secret env var (Main App) | `CRM_LIFECYCLE_INGESTION_SECRET` (≥32 chars) |
| CRM endpoint base URL env var | `CRM_LIFECYCLE_BASE_URL` |
| CRM receiver endpoint | `POST {CRM_LIFECYCLE_BASE_URL}/api/webhooks/mainapp-lifecycle-events` |
| Noop condition | If `CRM_LIFECYCLE_BASE_URL` is unset → all events silently noop-skipped |
| Degraded condition | If `CRM_LIFECYCLE_BASE_URL` set but `CRM_LIFECYCLE_INGESTION_SECRET` missing → `console.warn`, dispatch skipped |
| Secret in logs | NEVER — not in `console.warn`, error messages, or response bodies |

**No new env vars are needed.** The existing `CRM_LIFECYCLE_BASE_URL` + `CRM_LIFECYCLE_INGESTION_SECRET` pair is the authorized secret model.

CRM MUST validate the `x-crm-mainapp-lifecycle-secret` header value against its stored copy of `CRM_LIFECYCLE_INGESTION_SECRET` before processing any event.

---

## 11. Idempotency Model

| Attribute | Value |
|---|---|
| Key field | `idempotency_key` (included in every event payload) |
| Format | `{event}:{org_id}:{epoch_ms}` |
| Example | `org.gst.admin_reviewed.approved.v1:aaaaaaaa-0000-0000-0000-000000000001:1749460800000` |
| Grain | Millisecond epoch at emission time |
| Uniqueness guarantee | Unique per event-type × org-id × millisecond |
| CRM deduplication | CRM receiver MUST deduplicate on `idempotency_key` to handle retries |
| `event_id` UUID | NOT in v1. Future enhancement for stronger deduplication guarantee. |

---

## 12. CRM Response / Delivery-Failure Behavior

### Main App Sender

| Condition | Behavior |
|---|---|
| CRM returns HTTP 200 or 202 | `dispatch_status: 'SENT'` — success |
| CRM returns HTTP 4xx or 5xx | `dispatch_status: 'SENT'` with `http_status` logged — not retried in v1 |
| Network error / timeout | `dispatch_status: 'FAILED'` — `console.warn` with safe fields only |
| `CRM_LIFECYCLE_BASE_URL` unset | `dispatch_status: 'NOOP_SKIPPED'` — no fetch, no error |

**Critical constraint**: CRM event delivery MUST NOT block GST verification completion or tenant workspace access. All notify calls are fire-and-forget with `.catch(() => undefined)`.

**Delivery failure log contract** (only these fields are safe to log):
```
{ event, org_id, idempotency_key, dispatch_status, error_message }
```

**Forbidden in logs**: full payload, email, GSTIN, secret value, provider credentials.

### CRM Receiver Contract

CRM receiver MUST:
1. Validate `x-crm-mainapp-lifecycle-secret` header before processing
2. Return HTTP 200 or 202 on success
3. Deduplicate by `idempotency_key` before writing
4. Process all 7 event types
5. Not fail silently on unknown events — log unknown event type but return 200

---

## 13. Contract Requirements — Compliance Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | Main App is canonical GST/KYC verification authority | ✅ CONFIRMED — DB is sole truth |
| 2 | CRM receives outcome categories only | ✅ LOCKED — `provider_result`, `review_outcome` are category strings |
| 3 | CRM must not receive provider credentials | ✅ LOCKED — auth/credential fields in forbidden list |
| 4 | CRM must not receive raw provider payload | ✅ LOCKED + TESTED — `raw_verification_json` excluded, tests assert |
| 5 | CRM must not receive GSTIN | ✅ LOCKED + TESTED — `gstin: null` in submit events, not present in others |
| 6 | CRM must not receive provider request IDs or timestamps in v1 | ✅ LOCKED + TESTED — excluded from payloads, tests assert |
| 7 | Main App sender uses authorized CRM lifecycle secret | ✅ CONFIRMED — `CRM_LIFECYCLE_INGESTION_SECRET` |
| 8 | Delivery failure is non-blocking | ✅ CONFIRMED — fire-and-forget, `.catch(() => undefined)` |
| 9 | Events are idempotent by `idempotency_key` | ✅ LOCKED — format confirmed, CRM must deduplicate |
| 10 | Payload generated from sanitized/normalized result, not raw provider | ✅ CONFIRMED — service constructs payload from typed result structs |
| 11 | Logs must not contain full payloads or sensitive values | ✅ CONFIRMED — only safe fields in `console.warn` |
| 12 | Sender implementation must have tests proving forbidden fields absent | ✅ CONFIRMED — 11 forbidden-field assertions in unit test suite |

---

## 14. Implementation Status

| Side | Status |
|---|---|
| **Main App sender** | ✅ FULLY IMPLEMENTED — commit `658ee5b6 feat(crm): emit Main App lifecycle sync events` |
| **CRM receiver** | 🔲 BLOCKED UNTIL THIS UNIT — now UNBLOCKED |

---

## 15. Required CRM Next Prompt

```
IMPL-CRM-GST-KYC-LIFECYCLE-OUTCOME-RECEIVER-01
```

CRM is now unblocked to implement its GST/KYC lifecycle event receiver. Authority for the receiver: this contract document.

CRM receiver implementation MUST:
- Accept `POST /api/webhooks/mainapp-lifecycle-events`
- Validate `x-crm-mainapp-lifecycle-secret` header
- Handle all 7 event types
- Deduplicate by `idempotency_key`
- Write event history to `crm.onboarding_case_events`
- Update `crm.onboarding_cases.metadata_json` with latest snapshot
- Match entity by `org_id` primarily; `external_orchestration_ref` if available; constrained email fallback if both absent (registration event only)
- Return 200 on success

---

## 16. Main App Sender Next Prompt

```
IMPL-MAINAPP-CRM-GST-KYC-LIFECYCLE-EVENT-SENDER-01
```

**Note:** The sender is already implemented. This prompt, if executed later, would address:
- Production activation with real `CRM_LIFECYCLE_BASE_URL` and `CRM_LIFECYCLE_INGESTION_SECRET`
- Integration testing / runtime verification with real CRM receiver
- Any category taxonomy expansions for `review_notes_category` / `rejection_reason_category`
- Future `event_id` UUID addition for v2 deduplication hardening

---

## 17–26. Hub Impact Checklist

| # | Check | Answer |
|---|---|---|
| 17 | Did this unit change Layer 0 files? | NO — docs only |
| 18 | Did this unit change launch tracker / hub / roadmap docs? | NO |
| 19 | Did this unit change provider-selection truth? | NO — `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01` remains canonical |
| 20 | Did this unit change direct-registration truth? | NO |
| 21 | Did this unit change GST handoff truth? | YES — this document IS the GST handoff / CRM contract truth |
| 22 | Did this unit change transactional gate truth? | NO |
| 23 | Did this unit change CRM/Zoho/billing truth? | NO — this governs the Main App → CRM lifecycle event boundary only |
| 24 | Did this unit create any new production/runtime dependency? | NO — sender already implemented; this is docs only |
| 25 | Is a hub/governance sync required now? | NO — this contract is self-contained; CRM can proceed directly |
| 26 | Final worktree status | CLEAN — only this contract document was created |

---

## 27. Final Enum

```
DECISION_MAINAPP_CRM_GST_KYC_LIFECYCLE_EVENT_CONTRACT_LOCKED
```

---

## Appendix A — Sanitizer Exclusion Reference

`sanitizeDeepvuePayload()` strips the following fields from Deepvue provider payloads **before storage** in `raw_verification_json`:

- `pan_number`
- `aadhaar_validation`
- `aadhaar_validation_date`
- `contact_details.mobile` (per-entry: principal and all branch entries)
- `contact_details.email` (per-entry: principal and all branch entries)

Retains: address, other business verification fields.

Filing history bounded to ≤12 recent records.

---

## Appendix B — Provider Result Category Taxonomy

Values for `provider_result` field in `org.gst.provider_check.completed.v1`:

| Value | Meaning |
|---|---|
| `AUTO_APPROVED` | All 4 auto-approval criteria passed; review_outcome set to APPROVED |
| `MISMATCH` | State code mismatch (C4) or name fuzzy-match failed (C5) |
| `INACTIVE_GSTIN` | Provider reports status ≠ Active (C3) |
| `INVALID_GSTIN` | Provider reports GSTIN not found / invalid format |
| `DUPLICATE_GSTIN` | Same GSTIN already APPROVED for another org (C6) |
| `TIMEOUT` | Provider did not respond within 8s |
| `PROVIDER_ERROR` | Provider HTTP error, auth failure, or noop fallback |

---

## Appendix C — Review Category Taxonomy (v1 Defaults)

**`review_notes_category`** (approved / needs_more_info events):
- `ADMIN_MANUAL_APPROVAL` (default for approved)
- `OTHER_REVIEW_REQUIRED` (default for needs_more_info)
- Future: additional taxonomy values to be locked in a separate category expansion unit

**`rejection_reason_category`** (rejected events):
- `OTHER_REVIEW_REQUIRED` (default)
- Future: additional taxonomy values to be locked in a separate category expansion unit

---

## Appendix D — Commit History Reference

| Commit | Description | Relevance |
|---|---|---|
| `2ef22038` | `docs(crm): decide lifecycle payload privacy contract` | Privacy decision authority |
| `658ee5b6` | `feat(crm): emit Main App lifecycle sync events` | Sender implementation |
| `615889e8` | `chore(env): document GST provider and CRM lifecycle vars` | Env var documentation |
| `53b04edd` | `fix(admin): remove raw GST provider payload from frontend contract` | Admin API exclusion |
| `b329e568` | `feat(admin): show GST provider evidence in review queue` | Admin evidence surface |
| `e49c9c80` | `docs(gst): sync automation design with admin contract boundary` | Current HEAD |

---

*Contract locked: 2026-06-09 — TexQtic Main App, main branch, HEAD `e49c9c80`.*
*Operator authorization required before committing this artifact.*
