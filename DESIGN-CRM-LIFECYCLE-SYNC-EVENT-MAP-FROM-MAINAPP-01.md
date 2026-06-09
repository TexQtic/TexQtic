# DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01

---

## 1. Unit Identity

**Unit ID:** `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01`  
**Date:** 2026-06-08  
**Operator:** Paresh Patel, Founder, TexQtic  
**Status:** DESIGN COMPLETE — awaiting `IMPL-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01`

---

## 2. Scope

Design the CRM lifecycle sync event map from the Main App's onboarding, GST/KYC, and organization-status lifecycle.

**This is a design-only artifact.** No CRM sync is implemented here. No runtime behavior is changed.

---

## 3. Authority Chain and Governing Documents

| Document | Authority |
|---|---|
| `FD-TEXQTIC-ONBOARDING-AUTH-001.md` | Founder policy — GSTIN gate, trust tiers, canonical ownership |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Canonical object chain, system-of-record assignments, cross-system ID strategy |
| `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01.md` | Seam lock — CRM is canonical for qualification; Main App is canonical for platform access artifacts |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Source taxonomy and first-touch field contract |
| `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md` | Direct registration as primary online acquisition lane |
| `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01.md` | GST/KYC automation with admin fallback design |
| `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01.md` (addendum `82058b94`) | Deepvue as primary provider; production activation complete 2026-06-09 |

---

## 4. Repo-Truth Baseline (as of commit `9a3ab06c`)

### 4.1 Organization Status Values (DB constraint, not Prisma enum)

```
ACTIVE                      — trigger default on tenant INSERT
PENDING_VERIFICATION        — set by direct registration service
VERIFICATION_APPROVED       — set on admin GST APPROVED review
VERIFICATION_REJECTED       — set on admin GST REJECTED review
VERIFICATION_NEEDS_MORE_INFO— set on admin GST NEEDS_MORE_INFO review
SUSPENDED                   — (not yet driven by active flow)
CLOSED                      — (not yet driven by active flow)
```

### 4.2 GST Filing Status Values (TTP constant)

```
ACTIVE | INACTIVE | CANCELLED | SUSPENDED | UNKNOWN
```

### 4.3 GST Review Outcome Values (TTP constant)

```
APPROVED | REJECTED | NEEDS_MORE_INFO
```

### 4.4 Provider Result Values (migration check constraint)

```
AUTO_APPROVED | TIMEOUT | MISMATCH | INACTIVE_GSTIN |
INVALID_GSTIN | PROVIDER_ERROR | DUPLICATE_GSTIN
```

### 4.5 Existing CRM Integration Patterns

| Pattern | Direction | File | Auth |
|---|---|---|---|
| Tier 0 request-access notify | Main App → CRM | `crmTier0NotifyClient.ts` | `x-crm-mainapp-tier0-secret` header (shared secret) |
| Acquisition provisioning webhook | CRM → Main App (inbound) | `routes/internal/acquisitionProvisioning.ts` | HMAC-SHA256 (`x-texqtic-provisioning-hmac`) |
| Approved onboarding provisioning | CRM → Main App (inbound) | `routes/admin/tenantProvision.ts` | Service bearer token (`APPROVED_ONBOARDING_SERVICE_TOKEN_HASH`) |

**No event bus, message queue, outbox table, or pub/sub mechanism exists.**  
`EventLog` table exists in schema but is not actively populated by any route.

---

## 5. Event Families

### Family A — Registration Lifecycle

| Event Key | Trigger | Source table/model | Notes |
|---|---|---|---|
| `org.registration.submitted.v1` | `POST /api/public/direct-register` completes atomically | `organizations` (INSERT, status→PENDING_VERIFICATION), `users` (INSERT), `memberships` (INSERT) | Provisional tenant/org/user/membership created in single transaction |
| `org.registration.resubmitted.v1` | Not applicable — registration is single-entry; GST resubmit has its own event | N/A | Out of scope for this family |

### Family B — GST Verification Lifecycle

| Event Key | Trigger | Source table/model | Notes |
|---|---|---|---|
| `org.gst.submitted.v1` | `POST /api/tenant/gst-verification` (first submit, no prior record) | `gst_verifications` (INSERT via upsert) | Fired when `review_outcome` transitions from null and no prior GSTIN existed |
| `org.gst.resubmitted.v1` | `POST /api/tenant/gst-verification` (resubmit after REJECTED or NEEDS_MORE_INFO) | `gst_verifications` (UPDATE via upsert); `organizations` (status → PENDING_VERIFICATION) | Fired when prior `review_outcome` was REJECTED or NEEDS_MORE_INFO and tenant resubmits |
| `org.gst.provider_check.completed.v1` | `runProviderCheck()` completes (success or failure) | `gst_verifications` (UPDATE — provider evidence columns) | Fired when `provider_result` is written; covers all terminal provider states |
| `org.gst.provider_check.auto_approved.v1` | `runProviderCheck()` — `provider_result = AUTO_APPROVED` | `gst_verifications` (UPDATE — `review_outcome → APPROVED`); `organizations` (status → VERIFICATION_APPROVED) | Subset of provider_check.completed; separate event for clarity in CRM |
| `org.gst.routed_to_admin_fallback.v1` | `runProviderCheck()` — any non-AUTO_APPROVED provider_result | `gst_verifications` (UPDATE — provider_result written, `review_outcome` remains null) | Covers TIMEOUT, PROVIDER_ERROR, MISMATCH, INACTIVE_GSTIN, INVALID_GSTIN, DUPLICATE_GSTIN — all go to admin queue |
| `org.gst.admin_fallback.queued.v1` | `submitVerification()` completes when `this.gstProvider` is undefined (no provider configured) | `gst_verifications` (upsert, `review_outcome` remains null) | Backwards-compatible path; record enters admin review queue without provider check |

### Family C — Admin Review Lifecycle

| Event Key | Trigger | Source table/model | Notes |
|---|---|---|---|
| `org.gst.admin_reviewed.approved.v1` | `adminReviewVerification()` with `review_outcome = APPROVED` | `gst_verifications` (UPDATE — `review_outcome`, `reviewed_at`, `reviewed_by_admin_id`); `organizations` (status → VERIFICATION_APPROVED) | Only if `org.status === PENDING_VERIFICATION`; race-guarded |
| `org.gst.admin_reviewed.rejected.v1` | `adminReviewVerification()` with `review_outcome = REJECTED` | `gst_verifications` (UPDATE); `organizations` (status → VERIFICATION_REJECTED) | |
| `org.gst.admin_reviewed.needs_more_info.v1` | `adminReviewVerification()` with `review_outcome = NEEDS_MORE_INFO` | `gst_verifications` (UPDATE); `organizations` (status → VERIFICATION_NEEDS_MORE_INFO) | |

### Family D — Organization Status Lifecycle

| Event Key | Trigger | Source table/model | Notes |
|---|---|---|---|
| `org.status.pending_verification.v1` | Direct registration; or GST resubmit after rejection | `organizations` (status = PENDING_VERIFICATION) | Includes `roleIntent` from `auditlog` metadata where safe |
| `org.status.verification_approved.v1` | Admin approved or provider AUTO_APPROVED | `organizations` (status → VERIFICATION_APPROVED) | CRM should treat this as "account activated/unlocked" |
| `org.status.verification_rejected.v1` | Admin rejected | `organizations` (status → VERIFICATION_REJECTED) | CRM should surface for manual outreach; not auto-close |
| `org.status.verification_needs_more_info.v1` | Admin requested more info | `organizations` (status → VERIFICATION_NEEDS_MORE_INFO) | CRM should trigger follow-up workflow |
| `org.status.blocked_from_transactional_actions.v1` | Status is PENDING_VERIFICATION, VERIFICATION_REJECTED, or VERIFICATION_NEEDS_MORE_INFO and tenant attempts pool mutation | Runtime gate (not a DB transition) — synthetic event | Internal-only; may not be emitted in v1 |

### Family E — Future Lifecycle Events (discovered, not yet active)

| Event Key | Rationale | Readiness |
|---|---|---|
| `org.status.suspended.v1` | `SUSPENDED` is a legal DB status with no active driver yet | `decision-gated` |
| `org.status.closed.v1` | `CLOSED` is a legal DB status with no active driver yet | `decision-gated` |
| `org.user.email_verified.v1` | `users.emailVerified` exists but email verification flow is not yet active | `design-gated` |
| `org.membership.owner_accepted_invite.v1` | `invites.accepted_at` is closest activation timestamp proxy per white paper audit | `design-gated` |
| `org.acquisition.tier0_submitted.v1` | Already implemented in `crmTier0NotifyClient.ts` — legacy path only | `implementation-ready` (already live) |

---

## 6. Source-of-Truth Boundaries

For every event, the following bindings hold:

| Boundary | Value |
|---|---|
| **Authority for org.status** | `organizations.status` column — Main App only |
| **Authority for GST record** | `gst_verifications` — Main App only |
| **Authority for provider evidence** | `gst_verifications.provider_result` + evidence columns — Main App only |
| **CRM role** | Event recipient and lifecycle workflow driver only |
| **CRM must NOT** | Drive org status, approve/reject GST, or create tenants/users/memberships |
| **Org ID stability** | `organizations.id` (UUID) — stable, CRM-safe cross-system join key |
| **Tenant ID stability** | `tenants.id` (UUID, same as `organizations.id` — FK with CASCADE) — CRM-safe |
| **External orchestration ref** | `organizations.external_orchestration_ref` (UNIQUE, optional) — CRM's own onboarding case ID may be stored here for bi-directional lookup |

### Emission posture per family

| Family | Emission posture | Reason |
|---|---|---|
| A — Registration | **Synchronous fire-and-forget** (v1) | Registration endpoint is atomic; CRM failure must not block account creation |
| B — GST submitted/resubmitted | **Synchronous fire-and-forget** (v1) | GST upsert is user-facing; CRM failure must not surface as GST error |
| B — Provider check | **Asynchronous preferred** (v2+) | Provider check is already inline in a potential DB transaction; defer CRM notify to after-commit hook |
| C — Admin review | **Synchronous fire-and-forget** (v1) | Admin action is not time-critical; can degrade gracefully |
| D — Org status | **Derived from A/B/C events** — not emitted independently | Avoid double-emit; status event is a projection of the triggering action event |

---

## 7. CRM-Safe Payload Contract

### 7.1 Base Envelope (all events)

```typescript
interface CrmLifecycleEventEnvelope {
  /** Reverse-domain event type identifier */
  event: string;           // e.g. "org.registration.submitted.v1"
  /** Idempotency key — see §8 for shape */
  idempotency_key: string;
  /** ISO 8601 UTC timestamp of the triggering action in Main App */
  occurred_at: string;
  /** Main App organization UUID (stable, CRM-safe) */
  org_id: string;
  /** Main App tenant UUID (same as org_id in current schema) */
  tenant_id: string;
  /** Schema version for forward compatibility */
  schema_version: string; // "1.0"
}
```

### 7.2 Event-Specific Payloads

#### `org.registration.submitted.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.registration.submitted.v1",
  /** Company/org name at time of registration */
  legal_name: string;
  /** Role intent self-declared at registration (supplier | buyer | service_provider) */
  role_intent: string;
  /** Country/jurisdiction at time of registration */
  jurisdiction: string;
  /** Plan at registration (always 'FREE' in current implementation) */
  plan: string;
  /** Org status at point of emit (always 'PENDING_VERIFICATION') */
  org_status: "PENDING_VERIFICATION";
  /** CRM onboarding case / orchestration reference if already known; null otherwise */
  external_orchestration_ref: string | null;
  /** Attribution data if present in registration payload */
  attribution: Record<string, unknown> | null;  // stripped of PII — source/medium/campaign only
}
```

**Excluded:** user email, password hash, membership ID, invite token, session token, IP address.

> **DECISION_REQUIRED_EMAIL_IN_CRM_PAYLOAD:** Whether to include `user.email` in the registration event. Email is the first-touch identifier in CRM. Including it enables CRM to link to existing lead/contact. Excluding it requires CRM to use `org_id` + `external_orchestration_ref` only. This must be resolved before implementation.

#### `org.gst.submitted.v1` and `org.gst.resubmitted.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.gst.submitted.v1" | "org.gst.resubmitted.v1",
  /** Org status after the GST submit (PENDING_VERIFICATION) */
  org_status: string;
  /** Registration type declared (Regular, Composition, etc.) */
  registration_type: string;
  /** 2-digit state code of the submitted GSTIN */
  state_code: string;
  /** GSTIN — see note below */
  gstin: string | null;  // DECISION_REQUIRED_GSTIN_IN_CRM_PAYLOAD
}
```

> **DECISION_REQUIRED_GSTIN_IN_CRM_PAYLOAD:** GSTIN is a 15-character public business identifier (not secret). It is required by many legitimate B2B CRM workflows for deduplication and matching. However, CRM system access controls, data residency, and PII classification for GSTIN in the context of DPA/DPDP 2023 must be confirmed before including it in CRM payloads. Mark as `null` in v1 until resolved.

**Excluded:** `legal_name_on_gst` (included in registration event and re-derivable from org); `raw_verification_json`; `reviewed_by_admin_id`; provider credentials.

#### `org.gst.provider_check.completed.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.gst.provider_check.completed.v1",
  /** Terminal provider result (non-sensitive category only) */
  provider_result: "AUTO_APPROVED" | "TIMEOUT" | "MISMATCH" | "INACTIVE_GSTIN" |
                   "INVALID_GSTIN" | "PROVIDER_ERROR" | "DUPLICATE_GSTIN";
  /** Provider name (e.g. 'deepvue', 'noop') — not a secret */
  provider_name: string;
  /** Whether the org was auto-approved in this check */
  auto_approved: boolean;
  /** Org status after this event */
  org_status: string;
}
```

**Excluded:** `provider_request_id` (Deepvue transaction ID — security review required before CRM inclusion); `provider_verified_at`; `raw_verification_json`; access token; Aadhaar; PAN; contact mobile/email from provider payloads.

#### `org.gst.admin_reviewed.approved.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.gst.admin_reviewed.approved.v1",
  /** Review outcome */
  review_outcome: "APPROVED";
  /** Org status after review */
  org_status: "VERIFICATION_APPROVED";
  /** Non-sensitive review notes if present; omit PII; truncate to 500 chars */
  review_notes_category: string | null;  // e.g. "ADMIN_MANUAL_APPROVAL" — not raw notes
}
```

**Excluded:** `reviewed_by_admin_id` (internal admin UUID); raw `review_notes`; `raw_verification_json`.

#### `org.gst.admin_reviewed.rejected.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.gst.admin_reviewed.rejected.v1",
  review_outcome: "REJECTED";
  org_status: "VERIFICATION_REJECTED";
  /** Reason category — not raw admin notes */
  rejection_reason_category: string | null;  // e.g. "GSTIN_MISMATCH", "DOCS_INCOMPLETE"
}
```

#### `org.gst.admin_reviewed.needs_more_info.v1`

```typescript
{
  ...CrmLifecycleEventEnvelope,
  event: "org.gst.admin_reviewed.needs_more_info.v1",
  review_outcome: "NEEDS_MORE_INFO";
  org_status: "VERIFICATION_NEEDS_MORE_INFO";
  review_notes_category: string | null;
}
```

### 7.3 Sensitive Data Exclusions (confirmed)

| Field | Classification | Excluded from all CRM payloads |
|---|---|---|
| `users.passwordHash` | Credential | ✅ Always excluded |
| `users.email` | PII (decision pending) | ✅ Excluded until DECISION_REQUIRED resolved |
| `gst_verifications.raw_verification_json` | Sensitive composite — contains PAN, Aadhaar, contact data | ✅ Always excluded |
| `gst_verifications.provider_request_id` | Third-party correlation ID — security review needed | ✅ Excluded pending review |
| `gst_verifications.reviewed_by_admin_id` | Internal admin UUID — not CRM concern | ✅ Always excluded |
| `gst_verifications.review_notes` (raw) | May contain personal data | ✅ Always excluded; `review_notes_category` allowed instead |
| GSTIN value | Public identifier — DPA/DPDP classification pending | ✅ Excluded (`null`) until DECISION_REQUIRED resolved |
| Access tokens / JWTs / cookies | Credentials | ✅ Always excluded |
| `DATABASE_URL` / connection strings | Infrastructure secret | ✅ Always excluded |
| Aadhaar fields | Biometric — DPDP 2023 | ✅ Always excluded |
| Provider contact mobile/email | Privacy — DPDP 2023 | ✅ Always excluded |
| Provider API client ID/secret | Credential | ✅ Always excluded |
| Invite tokens | Credential/platform artifact | ✅ Always excluded |
| Session tokens | Credential | ✅ Always excluded |

---

## 8. Idempotency and Delivery Design

### 8.1 Idempotency Key Shape

```
{event_type}:{org_id}:{epoch_ms_of_trigger}
```

Example:
```
org.registration.submitted.v1:3f8a1c2d-...:1749395145000
```

- `org_id` is stable and unique per organization.
- `epoch_ms` is the `occurred_at` timestamp in milliseconds, derived from `organizations.created_at` or `gst_verifications.submitted_at` as appropriate.
- The key is deterministic from DB state: if the event is replayed or retried with the same DB record, the same key is produced.
- Keys must be stored in a `crm_event_dispatch_log` table (see §10 for migration expectation) to enable duplicate suppression.

### 8.2 Retry Posture

- **v1 (noop/fire-and-forget):** No retry. CRM failure is swallowed; event is logged locally with `dispatch_status = FAILED`.
- **v2 (outbox):** At-least-once delivery via outbox table; retry up to 3 times with exponential backoff (1s, 5s, 30s); dead-letter after 3 failures.
- **v3 (durable outbox with worker):** Separate background worker drains outbox; Main App HTTP request completes immediately.

### 8.3 Duplicate Suppression

- CRM receiver must accept `idempotency_key` in request header (`x-crm-lifecycle-idempotency-key`).
- If CRM has already processed the same key, it returns HTTP 200 with the original receipt.
- Main App noop client treats any 2xx as success and updates local dispatch log.
- Main App does not retry if local dispatch log shows `dispatch_status = DELIVERED`.

### 8.4 Backfill / Replay

- **Not supported in v1.** Replay requires outbox or event log.
- **v2+ replay:** A backfill script can replay from `organizations` + `gst_verifications` rows using derived idempotency keys. CRM must tolerate replay via idempotency key check.
- **Admin UI trigger for replay:** Not designed in this unit; future `DESIGN-CRM-LIFECYCLE-BACKFILL-AND-REPLAY-01` if needed.

### 8.5 Failure Handling

- CRM delivery failures MUST NOT block Main App onboarding or GST verification.
- All CRM notify calls are wrapped in try/catch; failures produce a `console.warn` + local log entry, never a thrown error that reaches the tenant-facing response.
- This mirrors the existing `crmTier0NotifyClient.ts` pattern.

### 8.6 Local Dispatch Log (v1)

In v1, a minimal in-memory or structured log entry is written per dispatch attempt:

```typescript
interface CrmDispatchLogEntry {
  event: string;
  idempotency_key: string;
  org_id: string;
  occurred_at: string;
  dispatch_attempted_at: string;
  dispatch_status: "DELIVERED" | "FAILED" | "NOOP_SKIPPED";
  http_status: number | null;
  error_message: string | null;  // never contains secrets
}
```

A persistent `crm_event_dispatch_log` DB table is the correct v2 upgrade path (see §10).

---

## 9. Status Transition Map — Main App to CRM Lifecycle States

| Main App `org.status` | CRM Lifecycle Stage | CRM Suggested Action |
|---|---|---|
| `PENDING_VERIFICATION` (initial, from registration) | `ONBOARDING_STARTED` | Open onboarding case; assign to intake queue |
| `PENDING_VERIFICATION` (resubmit after rejection/NMI) | `ONBOARDING_RESUBMITTED` | Re-activate case; notify assigned reviewer |
| `VERIFICATION_APPROVED` | `ACCOUNT_ACTIVATED` | Mark onboarding case closed-won; trigger welcome workflow |
| `VERIFICATION_REJECTED` | `ONBOARDING_REJECTED` | Flag for manual outreach; do NOT auto-close — rejection may be re-reviewed |
| `VERIFICATION_NEEDS_MORE_INFO` | `ONBOARDING_PENDING_DOCS` | Trigger follow-up sequence; track outstanding item |
| `SUSPENDED` | `ACCOUNT_SUSPENDED` (future) | Future — `decision-gated` |
| `CLOSED` | `ACCOUNT_CLOSED` (future) | Future — `decision-gated` |

### Provider result → CRM stage (when auto-approval runs)

| `gst_verifications.provider_result` | CRM event emitted | CRM note |
|---|---|---|
| `AUTO_APPROVED` | `org.gst.provider_check.auto_approved.v1` + `org.gst.admin_reviewed.approved.v1` | Two events in sequence; org transitions to VERIFICATION_APPROVED |
| `TIMEOUT` | `org.gst.provider_check.completed.v1` + `org.gst.routed_to_admin_fallback.v1` | Enters manual queue; no CRM rejection |
| `PROVIDER_ERROR` | same as TIMEOUT | Same |
| `MISMATCH` | same as TIMEOUT | Same |
| `INACTIVE_GSTIN` | same as TIMEOUT | Same |
| `INVALID_GSTIN` | same as TIMEOUT | Same |
| `DUPLICATE_GSTIN` | same as TIMEOUT, but separate reason_category | Priority review; potential fraud signal |
| `null` (no provider configured) | `org.gst.admin_fallback.queued.v1` | Enters manual queue; no provider result |

### Admin fallback — CRM posture

All non-AUTO_APPROVED provider outcomes and no-provider-configured submissions route to the admin queue. CRM should map these to `ONBOARDING_PENDING_REVIEW` and not expose the specific `provider_result` to the tenant-facing CRM contact record. `provider_result` is an internal operations category, not a customer-facing rejection reason.

---

## 10. Implementation Readiness Plan

### Proposed next implementation unit

`IMPL-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01`

### 10.1 Likely File Surfaces

| File | Change |
|---|---|
| `server/src/services/crmLifecycleNotifyClient.ts` | NEW — mirrors `crmTier0NotifyClient.ts` pattern; HMAC-signed HTTPS POST; 8s timeout; noop mode |
| `server/src/services/publicDirectRegistration.service.ts` | ADD — call `crmLifecycleNotifyClient.notifyRegistrationSubmitted()` after atomic transaction commits |
| `server/src/services/gstVerification.service.ts` | ADD — call notify after `submitVerification()` upsert and after `adminReviewVerification()` update |
| `server/src/config/index.ts` | ADD — optional env vars: `CRM_LIFECYCLE_BASE_URL`, `CRM_LIFECYCLE_INGESTION_SECRET` (both optional; noop when absent) |
| `server/src/__tests__/crmLifecycleNotifyClient.unit.test.ts` | NEW — noop mode, HMAC signing, timeout, payload shape |
| `server/src/__tests__/publicDirectRegistration.service.unit.test.ts` | ADD — CRM notify called once; CRM failure does not fail registration |
| `server/src/__tests__/gst-verification.service.unit.test.ts` | ADD — CRM notify called on submit, resubmit, admin review; failures do not propagate |
| (v2) `server/prisma/migrations/YYYYMMDDHHMMSS_crm_event_dispatch_log/migration.sql` | NEW — `crm_event_dispatch_log` outbox table; nullable; not required for v1 |
| (v2) `server/prisma/schema.prisma` | ADD — `crm_event_dispatch_log` model |

### 10.2 Required Tests

- **Noop mode (no env vars set):** CRM notify client instantiates, all calls return noop (no network, no error).
- **Registration success — CRM called once:** Confirms `org.registration.submitted.v1` event shape and idempotency key are correct.
- **CRM failure does not fail registration:** Registration service returns success even when CRM throws.
- **GST submit — CRM called with correct event:** `org.gst.submitted.v1` fired on first submit.
- **GST resubmit — CRM called with correct event:** `org.gst.resubmitted.v1` fired on resubmit path.
- **Admin approval — CRM called:** `org.gst.admin_reviewed.approved.v1` fired.
- **Payload exclusions:** Verify password hash, raw JSON, provider request ID, email (if excluded) are NOT present in CRM payload.
- **Idempotency key stability:** Same DB state → same idempotency key on re-derive.

### 10.3 Required Env/Config Assumptions

| Env Var | Required | Default behavior |
|---|---|---|
| `CRM_LIFECYCLE_BASE_URL` | Optional | If absent → noop client; no CRM calls |
| `CRM_LIFECYCLE_INGESTION_SECRET` | Optional (required if `BASE_URL` is set) | If absent with BASE_URL set → warn + noop |

These follow the existing pattern in `server/src/config/index.ts` for `CRM_MAINAPP_TIER0_BASE_URL` and `CRM_MAINAPP_TIER0_INGESTION_SECRET`.

### 10.4 Migration Need

- **v1:** No migration. Noop client writes no DB state. Optional.
- **v2:** `crm_event_dispatch_log` outbox table required for at-least-once delivery. SQL migration authored separately.

### 10.5 Rollout / Feature-Flag Recommendation

- Deploy with `CRM_LIFECYCLE_BASE_URL` unset in all environments initially.
- Noop mode is safe to deploy; no runtime impact until env var is set.
- Enable for staging first with a test CRM endpoint.
- Production enable only after CRM receiver is verified end-to-end.
- No feature flag beyond the env var itself — the env var IS the flag.

### 10.6 Verification Plan

After implementation:

```
VERIFY-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01
```

Verify:
1. All unit tests pass (71 existing + new).
2. `pnpm exec tsc --noEmit` clean.
3. Noop mode: registration and GST flows unchanged with no env vars.
4. Live mode: staging registration triggers CRM event; CRM receipt is logged.
5. CRM failure: registration still returns 201 when CRM is unreachable.
6. No secrets appear in logs.

### 10.7 CRM Vendor Requirement

**CRM vendor selection is required before implementation can be live-tested.** The CRM receiver endpoint must be built to accept the `CrmLifecycleEventEnvelope` contract defined in §7.

However, noop client implementation does NOT require CRM vendor. The v1 implementation unit can proceed independently of CRM vendor state, deploying safely in noop mode.

---

## 11. Open Decisions

| ID | Decision question | Blocking for |
|---|---|---|
| OD-001 | **DECISION_REQUIRED_EMAIL_IN_CRM_PAYLOAD** — Include `user.email` in registration event? | `org.registration.submitted.v1` payload finalization |
| OD-002 | **DECISION_REQUIRED_GSTIN_IN_CRM_PAYLOAD** — Include GSTIN in GST submit event? DPA/DPDP classification needed. | `org.gst.submitted.v1` payload finalization |
| OD-003 | Include `provider_request_id` (Deepvue transaction ID) in CRM provider-check event? Requires security review. | `org.gst.provider_check.completed.v1` payload |
| OD-004 | What `rejection_reason_category` taxonomy should be defined? | Admin-reviewed events |
| OD-005 | Should `org.status.pending_verification.v1` be emitted as a standalone event or derived from registration/resubmit events? | Family D emission strategy |
| OD-006 | Outbox vs fire-and-forget as default v1 posture? Fire-and-forget is simplest; outbox is more reliable. For a non-blocking secondary system, fire-and-forget is the right v1 default. | Implementation unit delivery posture |

---

## 12. Adjacent Findings

### AF-001 — `EventLog` table not actively populated

**Proposed unit title:** `IMPL-MAINAPP-EVENTLOG-ACTIVATION-AND-AUDIT-TRAIL-01`  
**Rationale:** `EventLog` table exists in Prisma schema but is not populated by any current route. Activating it would provide an internal event audit trail independent of CRM sync, useful for debugging and replay.  
**Minimum file surface:** `server/prisma/schema.prisma` (inspect model), `server/src/services/` (event emission hooks)  
**Readiness:** `design-gated` — scope and event taxonomy need to be defined before implementation.

### AF-002 — `external_orchestration_ref` column exists on both `tenants` and `organizations` with no sync guarantee

**Proposed unit title:** `DECIDE-MAINAPP-EXTERNAL-ORCHESTRATION-REF-AUTHORITY-AND-WRITE-PATH-01`  
**Rationale:** White paper audit (CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md) found that both tables carry the column but there is no DB guarantee they match. The write path for direct-registration orgs is not defined.  
**Minimum file surface:** `server/prisma/schema.prisma`, `server/src/services/publicDirectRegistration.service.ts`  
**Readiness:** `decision-gated` — requires Paresh to decide if direct-reg orgs receive a CRM orchestration ref at creation time or on first CRM contact.

### AF-003 — No activation timestamp field on `organizations` or `tenants`

**Proposed unit title:** `DESIGN-MAINAPP-ORG-ACTIVATION-TIMESTAMP-AND-FIRST-ACTIVE-TRACKING-01`  
**Rationale:** White paper audit identified that `invites.accepted_at` is only a proxy for account activation, and there is no dedicated `activated_at` field on `organizations`. CRM lifecycle sync events use `occurred_at` from the triggering action, but a stable `activated_at` field would make CRM sync and audit more reliable.  
**Minimum file surface:** `server/prisma/schema.prisma`, relevant migration  
**Readiness:** `design-gated`.

---

## 13. Hub Impact Checklist

1. **Layer 0 files changed?** No.
2. **Launch tracker / hub / roadmap docs changed?** No.
3. **Provider-selection truth changed?** No.
4. **Direct-registration truth changed?** No — design only documents the existing flow.
5. **GST handoff truth changed?** No.
6. **Transactional gate truth changed?** No.
7. **CRM/Zoho/billing truth changed?** No — this document is additive design only; it does not change the `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` seam decisions.
8. **New production/runtime dependency created?** No. Design artifact only.
9. **Hub/governance sync required?** No.

`NO_HUB_UPDATE_REQUIRED`

---

## 14. Final Enum

`DESIGN_CRM_LIFECYCLE_SYNC_EVENT_MAP_FROM_MAINAPP_COMPLETE`
