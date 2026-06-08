# DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01

---

## 1. Unit Identity

**Unit ID:** `DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01`  
**Date:** 2026-06-08  
**Operator:** Paresh Patel, Founder, TexQtic (decision authority)  
**Status:** DECISION COMPLETE  
**Depends on:** `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01` (commit `034bf8da`)

---

## 2. Scope

Resolves all open decisions (OD-001 through OD-006) from `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01` that were blocking implementation of Main App → CRM lifecycle event sync.

**This is a decision-only artifact.** No source code, schema, migration, config, or runtime behavior is changed.

---

## 3. Repo-Truth Baseline

### Files Inspected

| File | Key finding |
|---|---|
| `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01.md` | Design authority; OD-001 through OD-006 stated |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system object chain; email is first-touch contact identity; org_id + orchestration ref are CRM join keys |
| `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01.md` | CRM canonical for qualification; Main App canonical for platform access artifacts |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Email is `SHARED_REFERENCE` and CRM dedupe/contact-match key; `dedupe_key = emailNorm` |
| `server/src/services/publicDirectRegistration.service.ts` | Email normalized to lowercase, stored in `users.email`; org/tenant/membership created atomically; `external_orchestration_ref` NOT set during direct registration |
| `server/src/services/gstVerification.service.ts` | Provider results: 7 terminal values; `provider_request_id` is Deepvue transaction ID; `raw_verification_json` always stripped from tenant projection |
| `server/src/services/crmTier0NotifyClient.ts` | Existing CRM pattern: HTTPS POST, shared-secret header, 8s timeout, fire-and-forget |
| `server/prisma/schema.prisma` — `users`, `organizations`, `gst_verifications` | Confirmed field locations: `users.email`, `organizations.external_orchestration_ref` (nullable), provider evidence columns |

### Critical Repo-Truth Finding — CRM Join Key Gap

`organizations.external_orchestration_ref` is **NULL for all direct-registration organizations**. Direct registration does not originate from a CRM-qualified lead, so no CRM case ID exists at registration time. This means:

- CRM cannot look up the new org record by `external_orchestration_ref` alone.
- **`org_id` (Main App UUID) is the only stable CRM join key for direct-registration orgs until CRM creates a case and writes back an orchestration ref.**
- This reinforces the email decision: CRM needs at least one human-recognizable identifier (email or org name) to create/match a contact record when it receives the lifecycle event.

---

## 4. Decision Summary — v1 CRM Payload Posture

**v1 CRM lifecycle sync uses a minimal CRM-safe payload with the following posture:**

| Field category | v1 posture |
|---|---|
| `org_id` | ✅ INCLUDED — stable primary join key |
| `tenant_id` | ✅ INCLUDED — same UUID as `org_id` in current schema |
| `user.email` (normalized) | ✅ INCLUDED — see §5 |
| `legal_name` | ✅ INCLUDED — non-sensitive business identity |
| `role_intent` | ✅ INCLUDED — CRM segmentation |
| `jurisdiction` | ✅ INCLUDED — non-sensitive |
| `org_status` | ✅ INCLUDED — CRM lifecycle driver |
| `plan` | ✅ INCLUDED — non-sensitive (always FREE at registration) |
| `attribution` | ✅ INCLUDED (source/medium/campaign only — see §11) |
| `external_orchestration_ref` | ✅ INCLUDED when non-null; `null` for direct-reg orgs |
| `registration_type` | ✅ INCLUDED in GST events |
| `state_code` | ✅ INCLUDED in GST events |
| `provider_result` | ✅ INCLUDED as category string — see §7 |
| `provider_name` | ✅ INCLUDED — non-sensitive (e.g. `'deepvue'`, `'noop'`) |
| `review_outcome` | ✅ INCLUDED as enum string — non-sensitive |
| `rejection_reason_category` | ✅ INCLUDED from controlled taxonomy — see §8 |
| `auto_approved` | ✅ INCLUDED (boolean derived from provider_result) |
| GSTIN | ⛔ EXCLUDED in v1 — see §6 |
| `provider_request_id` | ⛔ EXCLUDED in v1 — see §7 |
| `provider_verified_at` | ⛔ EXCLUDED in v1 |
| `raw_verification_json` | ⛔ ALWAYS EXCLUDED — contains PAN, Aadhaar, contact data |
| `users.passwordHash` | ⛔ ALWAYS EXCLUDED |
| `gst_verifications.review_notes` (raw) | ⛔ ALWAYS EXCLUDED |
| `reviewed_by_admin_id` | ⛔ ALWAYS EXCLUDED |
| Access tokens, JWTs, cookies | ⛔ ALWAYS EXCLUDED |
| Database URLs, connection strings | ⛔ ALWAYS EXCLUDED |
| PAN numbers | ⛔ ALWAYS EXCLUDED |
| Aadhaar, biometric data | ⛔ ALWAYS EXCLUDED |
| Provider contact mobile/email | ⛔ ALWAYS EXCLUDED |
| Provider API credentials | ⛔ ALWAYS EXCLUDED |
| Invite tokens, session tokens | ⛔ ALWAYS EXCLUDED |

---

## 5. Email Payload Decision

**Decision: `EMAIL_INCLUDED_IN_V1`**

### Rationale

1. **CRM contact matching cannot function without it for direct-registration orgs.** `external_orchestration_ref` is NULL for all direct-reg orgs. `org_id` is a platform UUID unknown to CRM before this event. Without email, CRM cannot link the lifecycle event to an existing CRM contact, lead, or case, making the event nearly useless for CRM workflow automation.

2. **Precedent already established.** `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` explicitly classifies email as `SHARED_REFERENCE` and establishes `dedupe_key = emailNorm` as the CRM contact matching key. Email is already transmitted in the Tier 0 request-access flow to CRM. This lifecycle event extends the same established data-sharing pattern.

3. **Email is a B2B business contact identity, not a sensitive personal identifier** in the context of this platform, which is exclusively B2B. The email address is a business registration email, collected with the user's explicit consent during account creation.

4. **CRM already stores email from Tier 0 lead submissions** (`marketing.lead_submissions.email`). For orgs that converted from a Tier 0 lead, CRM may already have the email. The lifecycle event confirms and links the account; it does not introduce new exposure.

### Risk

- Email is transmitted over HTTPS to CRM. It must not appear in server-side logs.
- If CRM is misconfigured or has a data breach, the email could be exposed. Mitigation: HMAC-signed endpoint authentication ensures only the authorized CRM receiver can accept the payload.
- Email should not be used as an idempotency or cache key in any way that would cause it to be logged.

### CRM Matching Impact

Without email in v1, CRM cannot match lifecycle events to contacts for direct-registration orgs. Email enables:
- Deduplicating against existing leads/contacts from Tier 0 or other acquisition channels.
- Opening an onboarding case when no prior CRM case exists.
- Linking the registration event to an existing CRM case if a prior Tier 0 submission exists.

### Required Masking/Logging Behavior

- **Email MUST NOT appear in any server-side log** (application logs, error logs, console output).
- In error logs from failed CRM notify attempts, the payload must be redacted: log `{ org_id, event, idempotency_key }` only — never the full payload.
- Email MUST NOT appear in CRM dispatch log entries stored in DB or in-memory.
- The `CrmDispatchLogEntry` interface defined in the design document MUST NOT include email.

### Implementation Instruction for Next Unit

```typescript
// In org.registration.submitted.v1 payload:
email: users.email  // lowercase-normalized; included; never logged

// In CrmDispatchLogEntry (local log):
// email field is FORBIDDEN — log only: org_id, event, idempotency_key, dispatch_status, http_status, error_message (no payload)
```

---

## 6. GSTIN Payload Decision

**Decision: `GSTIN_EXCLUDED_IN_V1`**

### Rationale

1. **DPDP 2023 classification is unresolved.** India's Digital Personal Data Protection Act 2023 and its implementing rules are still being finalized. GSTIN is a government-issued business identifier that, depending on final regulatory guidance, may carry individual-entity PII obligations for sole proprietors and individual taxpayers. Until classification is confirmed, inclusion creates regulatory risk.

2. **CRM does not need GSTIN for the v1 lifecycle workflow.** The primary CRM use cases for v1 are: contact matching (email serves this), onboarding case lifecycle tracking (org_status serves this), and workflow triggering (event type + org_status serve this). GSTIN is not needed for these use cases.

3. **GSTIN is received by CRM when admin-approved provisioning occurs** (via `POST /api/admin/tenant-provision`). For orgs that go through CRM-approved onboarding, CRM already has GSTIN from the provisioning envelope. For direct-registration orgs, GSTIN is only confirmed after GST verification — at which point org_status reflects the outcome.

4. **Defer until legal/DPA review is complete.** A future decision unit (`DECIDE-CRM-GSTIN-DATA-SHARING-DPDP-CLASSIFICATION-01`) must confirm classification before GSTIN is included in any outbound payload.

### B2B Dedupe Impact

CRM can use `org_id` + email for deduplication in v1. GSTIN-based dedupe (e.g., detecting that two different accounts registered with the same GSTIN) is already handled in Main App by the `DUPLICATE_GSTIN` provider check. CRM does not need GSTIN for its own dedupe in v1.

### Privacy/Compliance Posture

- GSTIN **must not appear** in any CRM payload, log, or dispatch record in v1.
- The `gstin` field in the `org.gst.submitted.v1` payload defined in the design document remains `null` for v1.
- If GSTIN is later approved for CRM inclusion, it must be hashed or masked in all logs.

### Implementation Instruction for Next Unit

```typescript
// In org.gst.submitted.v1 payload:
gstin: null  // EXCLUDED in v1; DECISION_REQUIRED_GSTIN_IN_CRM_PAYLOAD deferred
```

---

## 7. Provider Evidence Field Decisions

**Resolves OD-003.**

| Field | v1 Decision | Rationale |
|---|---|---|
| `provider_result` | ✅ **INCLUDED** | Non-sensitive lifecycle category string (e.g. `AUTO_APPROVED`, `TIMEOUT`). Needed by CRM to route to correct workflow (auto-approved → ACCOUNT_ACTIVATED; fallback → ONBOARDING_PENDING_REVIEW). Not a credential or PII. |
| `provider_name` | ✅ **INCLUDED** | Non-sensitive identifier (e.g. `'deepvue'`, `'noop'`). Useful for CRM debugging and audit. Not a secret. |
| `provider_request_id` | ⛔ **EXCLUDED in v1** | Deepvue-issued transaction ID. Third-party correlation ID; security classification not yet confirmed. May expose information about provider usage patterns or constitute a shared identifier that warrants review. Defer to `DECIDE-CRM-PROVIDER-REQUEST-ID-SHARING-SECURITY-REVIEW-01`. |
| `provider_verified_at` | ⛔ **EXCLUDED in v1** | Timestamp of provider response. Not needed for CRM workflow; can be added in v2 if CRM SLA reporting requires it. |
| `raw_verification_json` | ⛔ **ALWAYS EXCLUDED** | Contains PAN, Aadhaar, contact mobile/email, and other fields stripped by `sanitizeDeepvuePayload()`. Never to be transmitted to any external system. |
| PAN, Aadhaar, contact mobile/email | ⛔ **ALWAYS EXCLUDED** | DPDP 2023; biometric and personal identifier policy. |

**Implementation rule:** the `org.gst.provider_check.completed.v1` payload includes `provider_result` and `provider_name` only. No provider API credentials, request IDs, raw payloads, or PII-adjacent fields.

---

## 8. Review Reason Category Taxonomy

**Resolves OD-004.**

CRM-safe controlled taxonomy for `rejection_reason_category` and `review_notes_category`. Raw admin notes are never transmitted. Only these category strings are allowed in CRM payloads.

### 8.1 Provider-Derived Categories (auto-set by system)

| Category string | Triggered by | Meaning |
|---|---|---|
| `AUTO_APPROVED` | `provider_result = AUTO_APPROVED` | Provider verified all criteria; auto-approved without admin review |
| `GSTIN_INACTIVE` | `provider_result = INACTIVE_GSTIN` | Provider confirmed GSTIN status is Inactive/Cancelled/Suspended |
| `GSTIN_INVALID` | `provider_result = INVALID_GSTIN` | Provider could not find GSTIN; likely invalid or non-existent |
| `GSTIN_MISMATCH` | `provider_result = MISMATCH` | Business name or state code does not match provider records |
| `DUPLICATE_GSTIN` | `provider_result = DUPLICATE_GSTIN` | Another org already approved with same GSTIN; requires investigation |
| `PROVIDER_TIMEOUT` | `provider_result = TIMEOUT` | Provider did not respond within timeout; routed to admin review |
| `PROVIDER_ERROR` | `provider_result = PROVIDER_ERROR` | Provider returned an error or was unavailable; admin review required |
| `ADMIN_REVIEW_QUEUED` | No provider configured (noop path) | No provider check performed; routed directly to admin review queue |

### 8.2 Admin-Set Categories (set by admin during manual review)

| Category string | Meaning | Use case |
|---|---|---|
| `ADMIN_MANUAL_APPROVAL` | Admin manually approved after review | Manual approval; override of provider result or no provider result |
| `DOCUMENTS_INCOMPLETE` | Supporting documents missing or insufficient | Admin rejected for lack of documentation |
| `BUSINESS_DETAILS_MISMATCH` | Company name, address, or registration details inconsistent | Admin rejected for inconsistency |
| `UNVERIFIABLE_BUSINESS` | Cannot verify business existence or legitimacy | Admin rejected; business appears invalid or fictional |
| `DUPLICATE_ACCOUNT` | Duplicate organization detected by admin | Admin rejected; same business exists under another account |
| `SANCTIONS_OR_COMPLIANCE` | Compliance/sanctions/AML/KYC policy block | Admin rejected for compliance reason (sensitive — do NOT include details in CRM payload) |
| `OTHER_REVIEW_REQUIRED` | None of the above; admin notes contain details | Admin marked needs-more-info or rejected for an uncategorized reason |

### 8.3 Admin-Set Categories for NEEDS_MORE_INFO

| Category string | Meaning |
|---|---|
| `ADDITIONAL_DOCUMENTS_REQUIRED` | Admin has requested specific documents |
| `CLARIFICATION_REQUIRED` | Admin needs clarification on submitted details |
| `GSTIN_RESUBMISSION_REQUIRED` | Admin has asked for GSTIN correction or resubmission |
| `OTHER_REVIEW_REQUIRED` | Catch-all; see admin notes in Main App |

### 8.4 Implementation Rule

Admin review UI should present a category picker when setting `review_outcome`. If no category is selected, default to `OTHER_REVIEW_REQUIRED`. The raw `review_notes` value is stored in Main App only and is never transmitted to CRM.

---

## 9. Delivery Posture Decision

**Resolves OD-005 and OD-006.**

### OD-005 — Standalone `org.status.pending_verification.v1` event

**Decision: DERIVE from registration/resubmit events; do not emit standalone.**

Rationale: emitting both `org.registration.submitted.v1` (which implies PENDING_VERIFICATION) and a separate `org.status.pending_verification.v1` would require CRM to deduplicate. The registration and resubmit events already carry `org_status` in their payload. A standalone status event is redundant in v1 and increases complexity. CRM should derive status from the event type + `org_status` field in the payload.

### OD-006 — Fire-and-forget vs outbox as v1 default

**Decision: FIRE_AND_FORGET_V1**

Rationale: CRM lifecycle sync is a non-blocking secondary concern. The Tier 0 notify client already uses this pattern successfully. Fire-and-forget with a local `console.warn` on failure is the correct v1 posture. CRM is not part of the onboarding critical path. Outbox becomes necessary in v2 when:
- The CRM receiver is live-tested under load,
- CRM SLAs require at-least-once delivery guarantees,
- Replay/backfill from backlog is needed.

For now, missing events due to transient CRM unavailability is acceptable: admin review provides a compensating fallback for any org that slips through.

---

## 10. Logging and Secret-Safety Rules

These rules are MANDATORY for `IMPL-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01`.

### 10.1 What MUST NEVER appear in logs

| Value | Rule |
|---|---|
| `users.email` | Never log, even in error context |
| GSTIN | Never log in CRM dispatch context |
| `users.passwordHash` | Never log anywhere |
| `provider_request_id` | Never log in CRM dispatch context |
| `raw_verification_json` contents | Never log |
| PAN, Aadhaar | Never log |
| Provider contact mobile/email | Never log |
| Access tokens, JWTs, session tokens | Never log |
| `CRM_LIFECYCLE_INGESTION_SECRET` | Never log; treat as credential |
| `DATABASE_URL`, any connection string | Never log |
| Invite tokens | Never log |

### 10.2 What is ALLOWED in error logs

Failed CRM notify error logs must contain ONLY:
```
{
  event: string,            // event type
  org_id: string,           // stable UUID
  idempotency_key: string,  // derived key
  dispatch_status: "FAILED",
  http_status: number | null,
  error_message: string     // generic message only; never propagate CRM error body if it might echo payload
}
```

### 10.3 Payload logging prohibition

The full CRM payload MUST NOT be written to any log file, `console.log`, Sentry breadcrumb, or application telemetry. The envelope `event` + `org_id` + `idempotency_key` are the only payload-derived fields safe to log.

### 10.4 CRM dispatch log record exclusions

The `CrmDispatchLogEntry` in-memory record (and any future DB table) MUST NOT store:
- email
- GSTIN
- any CRM payload field beyond what is listed in §10.2

---

## 11. Attribution Field Safety Rules

Attribution data (source/medium/campaign) is included per `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md`. Allowed attribution fields in CRM payload:

```typescript
attribution: {
  source_channel: string | null;   // canonical value from GOV contract (e.g. 'WEB', 'REFERRAL')
  utm_source: string | null;       // campaign source if present
  utm_medium: string | null;
  utm_campaign: string | null;
}
```

**Forbidden in attribution:**
- `referrer_url` (may contain path/query with PII)
- `landing_url` (same)
- `utm_term`, `utm_content` (may contain personal search terms)
- Any field not in the canonical source tagging contract

---

## 12. Implementation Contract for IMPL-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01

### 12.1 Exact v1 Payload Allowlist

**All events — base envelope:**

```typescript
{
  event: string;              // e.g. "org.registration.submitted.v1"
  idempotency_key: string;    // "{event}:{org_id}:{epoch_ms}"
  occurred_at: string;        // ISO 8601 UTC
  org_id: string;             // organizations.id (UUID)
  tenant_id: string;          // tenants.id (same UUID in current schema)
  schema_version: "1.0";
}
```

**`org.registration.submitted.v1` — additional allowed fields:**

```typescript
email: string;                        // users.email (lowercase-normalized)
legal_name: string;                   // organizations.legal_name
role_intent: string;                  // from auditlog metadata: 'supplier'|'buyer'|'service_provider'
jurisdiction: string;                 // organizations.jurisdiction
plan: string;                         // organizations.plan ('FREE')
org_status: "PENDING_VERIFICATION";
external_orchestration_ref: string | null; // organizations.external_orchestration_ref (null for direct-reg)
attribution: {
  source_channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} | null;
```

**`org.gst.submitted.v1` and `org.gst.resubmitted.v1` — additional allowed fields:**

```typescript
org_status: string;                   // 'PENDING_VERIFICATION'
registration_type: string;            // gst_verifications.registration_type
state_code: string;                   // gst_verifications.state_code (2-digit)
gstin: null;                          // EXCLUDED in v1 (GSTIN_EXCLUDED_IN_V1)
```

**`org.gst.provider_check.completed.v1` — additional allowed fields:**

```typescript
provider_result: string;              // terminal provider result category
provider_name: string;                // e.g. 'deepvue', 'noop'
auto_approved: boolean;               // true only when provider_result = 'AUTO_APPROVED'
org_status: string;
```

**`org.gst.admin_reviewed.approved.v1` — additional allowed fields:**

```typescript
review_outcome: "APPROVED";
org_status: "VERIFICATION_APPROVED";
review_notes_category: string | null; // from controlled taxonomy §8 only; default "ADMIN_MANUAL_APPROVAL"
```

**`org.gst.admin_reviewed.rejected.v1` — additional allowed fields:**

```typescript
review_outcome: "REJECTED";
org_status: "VERIFICATION_REJECTED";
rejection_reason_category: string | null; // from controlled taxonomy §8; default "OTHER_REVIEW_REQUIRED"
```

**`org.gst.admin_reviewed.needs_more_info.v1` — additional allowed fields:**

```typescript
review_outcome: "NEEDS_MORE_INFO";
org_status: "VERIFICATION_NEEDS_MORE_INFO";
review_notes_category: string | null; // from controlled taxonomy §8
```

### 12.2 Exact v1 Forbidden Fields (implementation MUST NOT include these)

```
users.passwordHash
users.email (in any field other than the explicitly-allowed `email` in registration event)
gstin / GSTIN value
gst_verifications.raw_verification_json
gst_verifications.provider_request_id
gst_verifications.provider_verified_at
gst_verifications.review_notes (raw text)
gst_verifications.reviewed_by_admin_id
organizations.risk_score
organizations.is_qa_sentinel
PAN numbers
Aadhaar data
Provider contact mobile/email
Access tokens, JWTs, Bearer tokens
cookies, session tokens
invite tokens
CRM_LIFECYCLE_INGESTION_SECRET
DATABASE_URL, connection strings
Any field not listed in the allowlist above
```

### 12.3 Payload Redaction Test Requirement

Every test that inspects a CRM payload must assert ALL of the following are absent:

```typescript
expect(payload).not.toHaveProperty('passwordHash');
expect(payload).not.toHaveProperty('raw_verification_json');
expect(payload).not.toHaveProperty('provider_request_id');
expect(payload).not.toHaveProperty('reviewed_by_admin_id');
expect(payload).not.toHaveProperty('review_notes');  // raw notes
expect(payload.gstin).toBeUndefined(); // or null only — never actual GSTIN string
```

### 12.4 Noop Behavior

When `CRM_LIFECYCLE_BASE_URL` is not set:
- All notify functions return immediately with `{ dispatch_status: 'NOOP_SKIPPED' }`.
- No HTTP call is made.
- No error is thrown.
- No log entry is written (no console.warn in noop path — silence is correct).

### 12.5 Migration Required

**v1: No migration required.** The noop client writes no DB state. The `CrmDispatchLogEntry` is in-memory only.

**v2: `crm_event_dispatch_log` table required.** Author as a separate migration unit: `IMPL-CRM-EVENT-DISPATCH-LOG-TABLE-01`.

### 12.6 CRM Vendor Endpoint Required for Live Testing

**Required only for staging/production activation.** v1 noop client can be implemented, tested, and deployed without a CRM receiver. Activate by setting `CRM_LIFECYCLE_BASE_URL` after CRM receiver is built and verified.

---

## 13. Open Decisions Resolved

| ID | Decision question | Resolution |
|---|---|---|
| OD-001 | Email in CRM payload? | ✅ `EMAIL_INCLUDED_IN_V1` — required for CRM contact matching; governed by §5 |
| OD-002 | GSTIN in CRM payload? | ✅ `GSTIN_EXCLUDED_IN_V1` — DPDP classification pending; see §6 |
| OD-003 | `provider_request_id` in CRM? | ✅ EXCLUDED in v1; security review deferred to `DECIDE-CRM-PROVIDER-REQUEST-ID-SHARING-SECURITY-REVIEW-01` |
| OD-004 | Rejection reason category taxonomy? | ✅ Defined in §8; 15 controlled categories |
| OD-005 | Standalone `org.status.pending_verification.v1` event? | ✅ NOT emitted standalone; derived from registration/resubmit events |
| OD-006 | Fire-and-forget vs outbox v1 posture? | ✅ `FIRE_AND_FORGET_V1` — same pattern as `crmTier0NotifyClient.ts` |

---

## 14. Remaining Deferred Decisions

| Deferred decision | Required before |
|---|---|
| `DECIDE-CRM-GSTIN-DATA-SHARING-DPDP-CLASSIFICATION-01` — GSTIN in CRM payloads? | v2 GST event payload expansion |
| `DECIDE-CRM-PROVIDER-REQUEST-ID-SHARING-SECURITY-REVIEW-01` — `provider_request_id` security review? | v2 provider event payload expansion |
| v2 outbox posture — `DESIGN-CRM-LIFECYCLE-OUTBOX-AND-AT-LEAST-ONCE-DELIVERY-01` | When CRM SLA requires guaranteed delivery |
| v2 backfill/replay — `DESIGN-CRM-LIFECYCLE-BACKFILL-AND-REPLAY-01` | When historical event catchup is needed |
| `DECIDE-MAINAPP-EXTERNAL-ORCHESTRATION-REF-AUTHORITY-AND-WRITE-PATH-01` | When direct-reg orgs need CRM case linkage at registration time |

---

## 15. Adjacent Findings

### AF-001 — `role_intent` not stored on `organizations` or `users` table

**Proposed unit title:** `DECIDE-MAINAPP-ROLE-INTENT-PERSISTENCE-AND-ORG-SEGMENT-01`  
**Rationale:** `role_intent` is available in registration payload and stored in `auditlog.metadata_json` but not as a first-class column on `organizations`. CRM lifecycle events include `role_intent` (from auditlog), but deriving it at event emit time requires an extra auditlog query. Persisting it on `organizations.primary_segment_key` (already exists in schema) would simplify this.  
**Minimum file surface:** `server/prisma/schema.prisma`, `server/src/services/publicDirectRegistration.service.ts`  
**Readiness:** `decision-gated`.

### AF-002 — Email not stored on `organizations` or `tenants` — only on `users`

**Proposed unit title:** `DESIGN-CRM-LIFECYCLE-OWNER-EMAIL-DERIVATION-PATTERN-01`  
**Rationale:** At lifecycle event emit time, the service must join `users` via `memberships` to get `email` for the `org.registration.submitted.v1` payload. This join is straightforward but adds a query. A design note confirming the canonical query path (or whether to cache it) is useful before implementation.  
**Minimum file surface:** `server/src/services/publicDirectRegistration.service.ts`, `server/src/services/gstVerification.service.ts`  
**Readiness:** `implementation-ready` (pattern is clear; just needs documenting in impl unit).

---

## 16. Hub Impact Checklist

1. **Layer 0 files changed?** No.
2. **Launch tracker / hub / roadmap docs changed?** No.
3. **Provider-selection truth changed?** No.
4. **Direct-registration truth changed?** No.
5. **GST handoff truth changed?** No.
6. **Transactional gate truth changed?** No.
7. **CRM/Zoho/billing truth changed?** No — this is an additive decision artifact. The `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` seam decisions are unchanged.
8. **New production/runtime dependency created?** No.
9. **Hub/governance sync required?** No.

`NO_HUB_UPDATE_REQUIRED`

---

## 17. Final Decision Enum

`DECIDE_CRM_LIFECYCLE_SYNC_PAYLOAD_PRIVACY_AND_FIELD_CONTRACT_COMPLETE`
