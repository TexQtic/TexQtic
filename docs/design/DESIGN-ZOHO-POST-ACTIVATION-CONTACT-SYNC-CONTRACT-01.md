# DESIGN-ZOHO-POST-ACTIVATION-CONTACT-SYNC-CONTRACT-01

**Status:** DESIGN-ONLY — Not Implemented  
**Date:** 2026-06-09  
**Author:** TexQtic Platform Governance  
**Prompt ID:** DESIGN-ZOHO-POST-ACTIVATION-CONTACT-SYNC-CONTRACT-01  

---

## 1. Scope and Non-Scope

### In Scope (this design unit)

- Define when, why, and how TexQtic should sync activated tenant/customer contact records to Zoho after verification/activation.
- Define the authority boundary: Deepvue/admin = GST verification authority; Main App = activation state authority; Zoho = downstream accounting/contact sync target.
- Define the exact data contract: fields to send, fields not to send, masking/redaction rules.
- Define idempotency, retry, failure, audit, and secret-safety models.
- Define storage/reference model for external Zoho IDs.
- Define implementation sequence, validation plan, and production verification plan for a future unit.

### Out of Scope (this unit)

- Implementing Zoho API calls.
- Adding Zoho environment variables.
- Adding database migrations or schema changes.
- Editing Prisma schema.
- Editing registration service, GST verification service, CRM event payloads, tenant activation logic, or admin approval logic.
- Creating production records.
- Calling Zoho APIs.
- Changing Deepvue/GST provider logic.
- Changing CTA routes.
- Marketing repo work.
- CRM Deepvue/GST repo work.

---

## 2. Repo-Truth Findings

### 2.1 Repo State at Design Time

- Branch: `main`
- Clean working tree (no uncommitted changes)

### 2.2 Schema Facts (server/prisma/schema.prisma)

**Tenant model** (key fields relevant to this design):
- `id` — UUID, primary key
- `slug` — unique, VarChar(100)
- `name` — VarChar(255)
- `status` — `TenantStatus` enum (at least `ACTIVE`)
- `plan` — `TenantPlan` enum (default `FREE`)
- `externalOrchestrationRef` — `String? @unique @map("external_orchestration_ref") @db.VarChar(255)` — general-purpose external orchestration reference
- `organizations organizations?` — 1:1 relation to the `organizations` model

**organizations model** (1:1 with tenants):
- This is the canonical org/customer entity for verification, identity, and business data.
- Fields include: gst_verification_status (confirmed from prompt: PENDING_VERIFICATION, VERIFICATION_APPROVED), legal_name, trade_name, primary contact fields, billing address, GSTIN.
- No `zoho_contact_id` or integration-mapping field currently exists on this model.
- No integration/mapping table exists in the current schema.

**invoices model**: Exists in schema (referenced from `User` model). This confirms Zoho Books is already the invoice provider.

**Zoho references in codebase**: Zero. No Zoho API client, no Zoho env var references, no Zoho contact sync code exists anywhere in the codebase as of this design unit.

**CRM event**: `public.direct_registration.created` — fire-and-forget event emitted at registration time. This is NOT a Zoho sync event; it is a separate CRM registration event.

**External reference field pattern**: `Tenant.externalOrchestrationRef` exists and is unique. It must **NOT** be repurposed for Zoho integration. A new `organization_integrations` table (OD-01: **resolved — Option B**) will store the Zoho contact ID (`external_id`), sync status, and error details per integration type. No such table exists today. This requires a future schema migration.

### 2.3 No Existing Design Docs for Zoho Sync

No prior design document for Zoho post-activation sync was found in the codebase. This is the first such design.

### 2.4 Governance Contracts Reviewed

- `shared/contracts/ARCHITECTURE-GOVERNANCE.md` — reviewed. Key constraints:
  - Domain ownership required for any new table/route.
  - No business-domain tables in Control Plane.
  - Integration tables are a new domain — must be declared in a future unit.
  - Atomic Change Envelope rule applies to any future implementation.

---

## 3. Core Design Principle

```
Deepvue/admin  ──→  determines GST verification outcome
                    (PENDING_VERIFICATION / mismatch / auto-approved / admin-approved)
                                         │
                                         ▼
TexQtic Main App  ──→  determines tenant/org lifecycle state
                       (PENDING_VERIFICATION → VERIFICATION_APPROVED)
                                         │
                                         ▼ (only after VERIFICATION_APPROVED)
Zoho Books  ──→  receives post-activation contact/customer data
                 for accounting, invoicing, and customer management
```

**ZOHO IS NOT THE GST VERIFICATION AUTHORITY.**  
Zoho must not approve, reject, validate, or override GST verification state.  
Zoho sync occurs only after TexQtic Main App has already determined and persisted `VERIFICATION_APPROVED`.

---

## 4. Lifecycle Trigger

**Trigger event:** Organization lifecycle transitions to `VERIFICATION_APPROVED`.

This transition can occur via:
1. **Auto-approval path**: GST verification via Deepvue passes all auto-approval criteria, and the system automatically sets status to `VERIFICATION_APPROVED`.
2. **Admin manual approval path**: Admin reviews the org (after GST mismatch or non-auto-approval) and manually approves → status set to `VERIFICATION_APPROVED`.

**Both paths must trigger the same post-activation Zoho sync.**

**Zoho sync must NOT be triggered by:**
- Raw registration (`public.direct_registration.created`)
- GST submission alone (without VERIFICATION_APPROVED outcome)
- Any status other than VERIFICATION_APPROVED
- Admin review without final approval
- Test/internal tenants (configurable exclusion — see §10)

**Sync timing:** Asynchronous, after the activation transaction commits. See §10.

---

## 5. Authority Boundaries

| Authority | System | Decision |
|---|---|---|
| GST data validity | Deepvue (external provider) | Verifies GSTIN against GST registry |
| Auto-approval logic | TexQtic Main App | Applies auto-approval criteria to Deepvue result |
| Manual approval | TexQtic Admin (platform admin) | Final approval in non-auto cases |
| Org lifecycle state | TexQtic Main App database | PENDING_VERIFICATION → VERIFICATION_APPROVED |
| Accounting/invoicing | Zoho Books | Customer records, invoices, accounting |
| Zoho contact sync | TexQtic Main App (post-activation) | Pushes data to Zoho after activation decision is made |

**Explicit prohibitions on Zoho authority:**
- Zoho MUST NOT decide whether a tenant is approved, rejected, active, pending, verified, or blocked.
- Zoho sync failure MUST NOT reverse, block, or roll back an already-approved org.
- Zoho MUST NOT be queried to determine org status.
- No code path may make activation conditional on Zoho API availability.

---

## 6. Data Contract

### 6.1 Fields to Send (Allowed After Activation)

The following fields may be included in the Zoho Books contact/customer sync payload, sourced from the `organizations` and `Tenant` records after `VERIFICATION_APPROVED`:

**⚠️ UPDATED: Fields are mapped to official Zoho Books Contact API payload structure. Fields marked CF must be Zoho custom fields. Fields marked PERSON go in the `contact_persons[0]` sub-object.**

| TexQtic Source | Zoho API Field | Type | Notes |
|---|---|---|---|
| `organizations.trade_name` (or `legal_name` if absent) | `contact_name` | top-level string | **REQUIRED.** Display name for search and display. |
| `organizations.legal_name` | `company_name` | top-level string | Legal/registered company name. Max 200 chars. |
| `contact_type` (hardcoded) | `contact_type` | top-level enum | Always `"customer"` for TexQtic B2B registrants. |
| `customer_sub_type` (hardcoded) | `customer_sub_type` | top-level enum | Always `"business"` (not `"individual"`). |
| `is_taxable` (hardcoded) | `is_taxable` | top-level boolean | Always `true` for Indian GST-registered B2B. |
| `organizations.gst_number` | `gst_no` | top-level string (India only) | **15-digit GSTIN.** Field name is `gst_no`, not `gstin`. |
| `gst_treatment` (hardcoded) | `gst_treatment` | top-level string (India only) | Always `"business_gst"` for GST-registered B2B. Other values: `"business_none"`, `"overseas"`, `"consumer"`. |
| From org state code / address | `place_of_contact` | top-level string (India only) | 2-letter Indian state/UT code (e.g. `"MH"`, `"GJ"`, `"KA"`). Drives place of supply on invoices. **Not applicable for overseas.** |
| Owner user `first_name` | `contact_persons[0].first_name` | PERSON | From `users` via `memberships` (OWNER role). |
| Owner user `last_name` | `contact_persons[0].last_name` | PERSON | Split from full name if only full_name stored. |
| Owner user `email` | `contact_persons[0].email` | PERSON | Primary contact email. |
| Owner user `phone` / org `primary_phone` | `contact_persons[0].mobile` | PERSON | Only if ToS consent allows (OD-02). |
| `is_primary_contact` (hardcoded) | `contact_persons[0].is_primary_contact` | PERSON | Always `true` for the owner. |
| `organizations.address` street | `billing_address.address` | address object | Street line 1. |
| `organizations.address` street2 | `billing_address.street2` | address object | Street line 2. |
| `organizations.address` city | `billing_address.city` | address object | City. |
| `organizations.address` state | `billing_address.state` | address object | State name. |
| `organizations.address` state code | `billing_address.state_code` | address object | 2-letter state code. |
| `organizations.address` pincode | `billing_address.zip` | address object | Postal code. |
| Hardcoded `"India"` | `billing_address.country` | address object | Country. |
| `organizations.id` (UUID) | `custom_fields` → `cf_texqtic_org_id` | CF (unique) | **Must be pre-provisioned as a unique custom field in Zoho Books. Used as idempotency key.** |
| `Tenant.id` (UUID) | `custom_fields` → `cf_texqtic_tenant_id` | CF | TexQtic tenant reference for reverse-lookup. |
| `Tenant.plan` | `custom_fields` → `cf_texqtic_plan_tier` | CF | Subscription plan. |
| Activation ISO timestamp | `custom_fields` → `cf_texqtic_activated_at` | CF | When `VERIFICATION_APPROVED` occurred. |
| Hardcoded `"TexQtic Main App"` | `notes` or `custom_fields` → `cf_texqtic_source` | notes/CF | Provenance tag. |

**Minimum required payload for contact creation:** `contact_name`, `contact_type`, `gst_no`, `gst_treatment`, and at least one `contact_persons` entry with `email`.

**Fields `orgId`, `tenantId`, `planTier`, `activationTimestamp`, `source` are NOT valid top-level Zoho Books Contact fields.** They must be sent as `custom_fields` array items using the pre-provisioned custom field API names (`cf_texqtic_*`).

### 6.2 Fields NOT to Send (Explicitly Excluded)

| Field | Reason |
|---|---|
| `passwordHash` | Secret — never sent externally |
| Auth tokens, session tokens, cookies | Secrets — never sent externally |
| Raw Deepvue API response payload | Provider-internal data; not business data |
| Raw GST provider JSON (any field from provider response) | Provider-internal; may contain PAN, Aadhaar, promoter names |
| Deepvue provider request IDs | Not business-relevant for Zoho |
| PAN / Aadhaar from provider payloads | Sensitive personal identifiers |
| Mobile numbers extracted from raw GST response | Privacy risk; not consent-verified |
| Promoter/director names from raw GST response | Not required for Zoho Books customer; privacy risk |
| Internal audit metadata (`beforeJson`, `afterJson`, `metadataJson`) | Not relevant to Zoho |
| Failed / mismatch / pending verification evidence | Only VERIFIED orgs are synced |
| Deepvue verification result details | Provider-internal; not Zoho concern |
| Environment variable values | Secrets |
| `tokenHash` fields | Secrets |
| `familyId` from refresh tokens | Secrets |
| `reasoningLogId` or AI reasoning data | Internal platform data |

### 6.3 Masking and Redaction Rules

1. **GSTIN**: Sent in full after activation (required for Indian B2B invoicing). Encrypted at rest in Zoho; not redacted in transit (HTTPS only).
2. **Email**: Sent as-is (business contact email). Not masked.
3. **Phone**: Sent only if available AND covered by ToS consent signed at registration. If consent is ambiguous, omit.
4. **Address**: Sent as-is. No masking needed for business address.
5. **`orgId` / `tenantId`**: Sent as UUID strings in Zoho custom fields for reverse-lookup. Not sensitive.

---

## 7. Idempotency Model

**Idempotency key:** `orgId` (UUID from `organizations.id`) — stored as a **unique** Zoho Books custom field (`cf_texqtic_org_id`).

**⚠️ UPDATED — Official Zoho Books API supports upsert-via-custom-field:**
Zoho Books provides `PUT /contacts` with headers:
- `X-Unique-Identifier-Key: cf_texqtic_org_id` (the custom field API name)
- `X-Unique-Identifier-Value: <orgId UUID>`
- `X-Upsert: true` (creates if not found; updates if found)

This is the **primary idempotency mechanism**. It requires the `cf_texqtic_org_id` custom field to be configured as "unique" in Zoho Books settings before use.

**Idempotency logic (official API-backed):**
1. Always use `PUT /contacts` with `X-Unique-Identifier-Key: cf_texqtic_org_id`, `X-Unique-Identifier-Value: <orgId>`, `X-Upsert: true`.
2. If the custom field value exists: Zoho updates the existing contact. Returns the contact with `contact_id`.
3. If the custom field value does not exist: Zoho creates a new contact (because `X-Upsert: true`). Returns the new contact with `contact_id`.
4. After the call: store the returned `contact_id` locally (see §9).

**Secondary fallback (if custom field lookup fails):**
1. Search contacts by email via `GET /contacts?email=<email>&organization_id=<id>`.
2. If found: use returned `contact_id` for update. Store it.
3. If not found: this is a genuine new contact; create via `POST /contacts`.

**Retry safety:** All operations are safe to re-run. The upsert pattern is inherently idempotent.

**Prerequisite:** The `cf_texqtic_org_id` custom field must be provisioned in Zoho Books with **unique constraint enabled** before `IMPL-ZOHO-POST-ACTIVATION-SYNC-01` begins. This is a manual Zoho Books admin setup step or can be automated via `POST /settings/fields` (requires `ZohoBooks.settings.CREATE` scope).

**Deduplication surface:** `cf_texqtic_org_id` custom field (Zoho side, unique) + `organization_integrations.external_id` stored locally in TexQtic (see §9).

---

## 8. Retry and Failure Model

### 8.1 Failure Isolation

Zoho sync failure **MUST NOT**:
- Roll back the `VERIFICATION_APPROVED` status
- Block the tenant from using the platform
- Return a 500 to the approval request
- Prevent admin approval from completing
- Block any subsequent platform operations

### 8.2 Retry Strategy

| Attempt | Delay | Behaviour |
|---|---|---|
| Initial | 0s (post-commit) | Fire asynchronously after transaction commit |
| Retry 1 | 30s | Exponential backoff |
| Retry 2 | 2m | |
| Retry 3 | 10m | |
| Retry 4 | 1h | Final automatic retry |
| Exhausted | — | Mark integration as `SYNC_FAILED`; surface to admin |

### 8.3 Dead-Letter Handling

- After all retries are exhausted, the sync job enters `SYNC_FAILED` state.
- Admin dashboard must show `SYNC_FAILED` orgs in an integration health panel (future ADMIN-ZOHO-SYNC-STATUS-VISIBILITY-01 unit).
- Admin can manually re-trigger sync from the admin panel.
- `SYNC_FAILED` does not affect org `VERIFICATION_APPROVED` status.

### 8.4 Transient vs Permanent Failures

| Error Type | Response |
|---|---|
| Zoho API timeout / 5xx | Retry with backoff |
| Zoho rate limit (429) | Retry after `Retry-After` header |
| Zoho auth error (401/403) | Alert ops; do not retry until credentials refreshed |
| Invalid payload (400) | Log error, do not retry automatically; requires code fix |
| Network unreachable | Retry with backoff |

---

## 9. Storage and Reference Model

### 9.1 Current State

- No `zoho_contact_id` or integration reference field exists on `organizations` today.
- No integration mapping table exists.
- `Tenant.externalOrchestrationRef` exists but serves a different purpose (general orchestration); must not be repurposed for Zoho.

### 9.2 Storage Approach — OD-01 Resolved

**~~Option A~~ (REJECTED):** Adding a `zoho_contact_id` column to `organizations` was the simple-path option but is not the chosen approach. It cannot store sync status, retry counters, error details, or future integration types without polluting the core org model. Option A is rejected.

**Option B (RESOLVED — chosen approach):** Create a new `organization_integrations` table. See §19.13 for the full SQL definition.

**Why Option A was rejected:**
- A single `zoho_contact_id` column on `organizations` cannot store `sync_status`, `last_synced_at`, `error_code`, `error_details`, or `attempt_count`.
- Adding those as additional columns on `organizations` pollutes the core org model with integration-specific concerns.
- Future integrations (Zoho CRM, payment providers, tax filing) would require repeated single-purpose columns.
- `Tenant.externalOrchestrationRef` must NOT be repurposed for Zoho (different purpose; different domain).

### 9.3 OD-01 RESOLVED — Option B

**OD-01 is resolved: Option B — `organization_integrations` table.**
This decision was finalized in the API hardening pass (§19.13). No further decision is needed.

**Prerequisites before `IMPL-ZOHO-POST-ACTIVATION-SYNC-01` can begin (in order):**
1. Provision Zoho Books custom fields (`cf_texqtic_org_id` as unique + 4 companions) in **both** staging/test and production Zoho Books organizations.
2. Validate generated Zoho API names against the actual staging/test Zoho Books org (Zoho auto-generates `cf_*` names from field labels; confirm before coding).
3. Create `organization_integrations` migration via approved DB governance: psql + `prisma db pull` + `prisma generate`.
4. Configure Zoho OAuth2 secrets (OPS-ZOHO-PRODUCTION-SECRET-CONFIG-01).

### 9.4 Sync Status Tracking

Regardless of Option A or B, the following sync states must be trackable per org:

| State | Meaning |
|---|---|
| `NOT_SYNCED` | Org activated but sync not yet attempted |
| `SYNC_PENDING` | Sync enqueued, not yet completed |
| `SYNC_SUCCESS` | Zoho contact created/updated successfully |
| `SYNC_FAILED` | All retries exhausted; manual intervention needed |
| `SYNC_SKIPPED` | Org excluded from sync (test/internal flag) |

---

## 10. Audit and Event Model

### 10.1 Required Audit Events

All events emitted to the `event_logs` table using the existing EventLog model.

| Event Name | Trigger | Actor Type | Entity Type |
|---|---|---|---|
| `org.zoho_sync.enqueued` | Sync job queued after VERIFICATION_APPROVED | `SYSTEM_AUTOMATION` | `ORGANIZATION` |
| `org.zoho_sync.success` | Zoho contact created/updated successfully | `SYSTEM_AUTOMATION` | `ORGANIZATION` |
| `org.zoho_sync.failed` | Sync attempt failed (per-attempt) | `SYSTEM_AUTOMATION` | `ORGANIZATION` |
| `org.zoho_sync.exhausted` | All retries exhausted; entered SYNC_FAILED state | `SYSTEM_AUTOMATION` | `ORGANIZATION` |
| `org.zoho_sync.skipped` | Org excluded from sync | `SYSTEM_AUTOMATION` | `ORGANIZATION` |
| `org.zoho_sync.manual_retry` | Admin manually re-triggered sync | `PLATFORM_ADMIN` | `ORGANIZATION` |

### 10.2 Event Payload (Allowed Fields Only)

```json
{
  "orgId": "<uuid>",
  "tenantId": "<uuid>",
  "syncState": "SYNC_SUCCESS | SYNC_FAILED | ...",
  "zohoContactId": "<zoho-id>",
  "attemptNumber": 1,
  "errorCode": "<Zoho error code if failed>",
  "errorMessage": "<sanitized error message if failed>"
}
```

**Do not include** Zoho API credentials, raw Zoho response payloads, or any field from the excluded list (§6.2) in audit events.

### 10.3 Existing CRM Registration Event

The existing `public.direct_registration.created` event is a separate fire-and-forget CRM registration event emitted at raw registration time. It is **not** a Zoho sync event and must not be conflated with post-activation sync. No changes to this event in this design.

---

## 11. Security and Secret Model

### 11.1 Required Environment Variables (future OPS-ZOHO-PRODUCTION-SECRET-CONFIG-01 unit)

The following env vars will be needed at implementation time. They must be set via the secure secrets store (not committed to `.env`):

| Variable | Purpose |
|---|---|
| `ZOHO_BOOKS_CLIENT_ID` | Zoho OAuth2 client ID |
| `ZOHO_BOOKS_CLIENT_SECRET` | Zoho OAuth2 client secret |
| `ZOHO_BOOKS_REFRESH_TOKEN` | Long-lived refresh token for Zoho OAuth2 |
| `ZOHO_BOOKS_ORGANIZATION_ID` | Zoho Books organization ID for API calls (numeric string) |
| `ZOHO_BOOKS_API_DOMAIN` | API domain from OAuth token response (e.g. `https://www.zohoapis.in`) — drives base URL at runtime |

**Removed:** `ZOHO_BOOKS_BASE_URL` — ⚠️ CORRECTED: Do not hardcode the base URL. Use the `api_domain` from the OAuth token response instead (see §19). For India DC the expected value is `https://www.zohoapis.in` but must be validated at token-time.

### 11.2 Secret Safety Rules

1. All Zoho credentials must be in environment variables only. Never hardcoded.
2. Credentials must never appear in logs, audit events, or error messages.
3. OAuth2 access tokens obtained at runtime must not be logged or persisted to the database.
4. Refresh token rotation must be handled by the Zoho client implementation.
5. A rotated/expired refresh token must raise an ops alert — it must not silently fail or retry indefinitely.

### 11.3 Data Privacy Requirements

- GSTIN is a public business identifier in the Indian GST registry. Sending it to Zoho Books for invoicing purposes is lawful and expected.
- Email sent to Zoho must be the business contact email captured at registration under TexQtic ToS.
- Phone numbers: transmit to Zoho only if covered by the existing ToS consent scope. If ToS does not explicitly cover sharing with accounting systems, omit phone from the initial sync.
- No personal data of individuals (PAN, Aadhaar, promoter names from raw GST) must be sent to Zoho.
- Compliance with Indian DPDPA (Digital Personal Data Protection Act, 2023) must be verified before transmitting personal data to Zoho.

---

## 12. Async Execution Model

### 12.1 Preferred Pattern: Post-Commit Outbox / Background Job

```
Approval transaction commits (org.status = VERIFICATION_APPROVED)
          │
          ▼
Event emitted: org.zoho_sync.enqueued (appended to event_logs)
          │
          ▼
Background job / worker picks up event
          │
          ▼
ZohoSyncService.syncContact(orgId)
          │
    ┌─────┴─────┐
    │           │
  Success     Failure
    │           │
    ▼           ▼
Store zoho_id  Schedule retry (exponential backoff)
Emit success   Emit failure event
event
```

### 12.2 Activation Transaction Isolation

The activation transaction must commit independently of Zoho availability:

```
BEGIN;
  UPDATE organizations SET status = 'VERIFICATION_APPROVED', ...;
  INSERT INTO audit_logs (...);
  INSERT INTO event_logs (name = 'org.zoho_sync.enqueued', ...);
COMMIT;
-- After commit, async worker processes event_logs
```

Zoho sync never executes inside the approval transaction.

---

## 13. Implementation Sequence (Future Unit: IMPL-ZOHO-POST-ACTIVATION-SYNC-01)

Recommended implementation sequence when approved:

1. **OPS-ZOHO-PRODUCTION-SECRET-CONFIG-01** — Configure Zoho OAuth2 credentials in secrets store.
2. **Prerequisites** — In this order:
   a. Provision Zoho Books custom fields (`cf_texqtic_org_id` unique + 4 companions) in both staging/test and production Zoho Books organizations.
   b. Validate generated `cf_*` API names against the actual staging/test Zoho Books org before writing any sync code.
   c. Create `organization_integrations` table migration (OD-01: Option B — resolved) via approved DB governance: psql + `prisma db pull` + `prisma generate`.
3. **ZohoBooks client** — Implement `ZohoBooksClient` (OAuth2 token management, Create Contact, Update Contact, Get Contact by ID/email).
4. **ZohoSyncService** — Implement `ZohoSyncService.syncContact(orgId)` with idempotency, retry, and failure isolation logic.
5. **Activation hook** — After `VERIFICATION_APPROVED` transaction commits, enqueue Zoho sync via event/job system.
6. **Audit events** — Emit `org.zoho_sync.*` events to `event_logs`.
7. **Admin visibility** — Surface `SYNC_FAILED` orgs in admin panel (ADMIN-ZOHO-SYNC-STATUS-VISIBILITY-01).

---

## 14. Validation Plan (For Future Implementation Unit)

### 14.1 Unit Tests

| Test ID | Description | Target |
|---|---|---|
| UNIT-01 | `ZohoSyncService.syncContact()` - happy path (new org, no prior sync) | Creates contact via upsert; stores `organization_integrations.external_id`; `sync_status = SYNC_SUCCESS` |
| UNIT-02 | `ZohoSyncService.syncContact()` - idempotent (org has existing `organization_integrations` row) | Upserts via `cf_texqtic_org_id`; no duplicate contact created; `external_id` confirmed |
| UNIT-03 | `ZohoSyncService.syncContact()` - Zoho API timeout | Does not throw; schedules retry; activation unaffected |
| UNIT-04 | `ZohoSyncService.syncContact()` - Zoho 401 unauthorized | Marks credential error; does not retry auto; alerts ops |
| UNIT-05 | Payload builder — excluded fields not present | No password, no provider payloads, no tokens in payload |
| UNIT-06 | Payload builder — required fields present after activation | `contact_name`, `contact_persons[0].email`, `gst_no` present; `cf_texqtic_org_id` in `custom_fields` |
| UNIT-07 | Sync not triggered for PENDING_VERIFICATION org | No Zoho call made before activation |
| UNIT-08 | Retry exhaustion → SYNC_FAILED state | Correct state transition, audit event emitted |

### 14.2 Integration Tests

| Test ID | Description |
|---|---|
| INT-01 | Full flow: registration → GST submission → activation → Zoho contact created |
| INT-02 | Admin manual approval → Zoho contact created |
| INT-03 | Zoho unavailable during activation → activation succeeds, sync retries later |
| INT-04 | Re-activation (edge case) → idempotent, no duplicate Zoho contact |

---

## 15. Production Verification Plan (For Future Implementation Unit)

> ⚠️ **No real customer contact must be created in any Zoho Books organization during QA unless explicitly approved by Platform Engineering. Always use the dedicated staging/test Zoho Books organization for all non-production verification.**

**Staging/test verification (must succeed before production):**
1. Verify all `ZOHO_BOOKS_*` env vars set in **staging** secrets store; confirm `ZOHO_BOOKS_API_DOMAIN` returns the `.in` domain from the OAuth token response (no hardcoded base URL).
2. Verify Zoho Books custom fields (`cf_texqtic_org_id` as unique + 4 companions) provisioned in the **staging/test Zoho Books organization**; validate API names match the values expected in code.
3. Activate a test tenant (non-production org) → confirm Zoho contact created in the **staging/test Zoho Books organization** (Zoho Books has no official dedicated sandbox — use a separate staging org).
4. Verify `organization_integrations.external_id` (Zoho `contact_id`) populated and `sync_status = SYNC_SUCCESS`.
5. Verify `org.zoho_sync.success` event in `event_logs`.
6. Re-run activation sync for same org → confirm no duplicate contact created (upsert idempotency via `cf_texqtic_org_id`).
7. Take Zoho API offline (or use invalid credentials) → confirm activation still succeeds; sync marks `SYNC_FAILED` after retries exhausted.
8. Confirm `org.zoho_sync.exhausted` event and admin-visible error after retry exhaustion.
9. Restore Zoho credentials → confirm manual retry succeeds and `sync_status` transitions to `SYNC_SUCCESS`.

**Production verification (only after staging/test verification passes in full):**
10. Verify all `ZOHO_BOOKS_*` env vars set in **production** secrets store.
11. Verify custom fields provisioned in the **production Zoho Books organization**.
12. Activate a real-but-internal test org in production (explicitly approved, explicitly tracked) → confirm contact created in production Zoho Books org.
13. Confirm `organization_integrations` row populated correctly.

---

## 16. Open Decisions

| ID | Decision | Options | Recommended | Owner |
|---|---|---|---|---|
| OD-01 | External Zoho reference storage model | ~~Option A: `organizations.zoho_contact_id`~~ (rejected — cannot store sync metadata); Option B: `organization_integrations` table | **RESOLVED: Option B** — `organization_integrations` table. Option A rejected. See §9.2, §9.3, §13, §19.13. | Platform Engineering — **resolved in API hardening pass** |
| OD-02 | Phone number sync consent scope | Review existing ToS to determine if business phone may be shared with Zoho Books | Omit phone until confirmed | Legal/Product |
| OD-03 | Test/internal tenant exclusion logic | Flag on `Tenant` model (e.g., `is_test`); or slug-pattern exclusion | Recommend `is_test` flag if not already present | Platform Engineering |
| OD-04 | Job queue / outbox implementation | Use existing event_logs as outbox + poller; or introduce a dedicated job queue | Use existing event_logs pattern first; evaluate dedicated queue at scale | Platform Engineering |
| OD-05 | Zoho Books API region | Zoho Books has regional APIs (`.com`, `.eu`, `.in`); India DC uses `https://www.zohoapis.in/books/v3` — **not** `https://books.zoho.in/api/v3` | Use `api_domain` from OAuth token response + `/books/v3` path | Platform Engineering — **resolved by official docs; hardcoded URL was wrong** |

---

## 17. Adjacent Findings (Do Not Implement in This Unit)

The following findings were observed during repo-truth inspection. They are recorded here for governance tracking and must not be merged into this design unit.

| Candidate ID | Finding | Severity | Suggested Future Unit | Likely File Surface | Readiness |
|---|---|---|---|---|---|
| AF-01 | `Tenant.externalOrchestrationRef` is a general-purpose field on tenants and must NOT be repurposed for Zoho. The `organization_integrations` table (OD-01: Option B, resolved) provides the correct per-integration, per-org reference pattern. | Medium | IMPL-ZOHO-POST-ACTIVATION-SYNC-01 | `server/prisma/schema.prisma`, new `organization_integrations` migration | Ready — OD-01 resolved; prerequisite for IMPL unit |
| AF-02 | No admin UI currently surfaces integration sync status (SYNC_FAILED, SYNC_SUCCESS) for post-activation integrations. | Medium | ADMIN-ZOHO-SYNC-STATUS-VISIBILITY-01 | `server/src/routes/admin/`, frontend admin panel | After IMPL-ZOHO-POST-ACTIVATION-SYNC-01 |
| AF-03 | Zoho OAuth2 credential rotation lifecycle (refresh token expiry) has no ops alerting path defined. | Medium | OPS-ZOHO-PRODUCTION-SECRET-CONFIG-01 | Ops/infra runbook | Before production activation |
| AF-04 | Indian DPDPA compliance review for sharing business contact data with Zoho has not been formally documented. | High | Legal review item | docs/legal/ or formal DPA | Before production activation |
| AF-05 | No existing test/internal tenant exclusion mechanism found in schema. If `is_test` or similar flag does not exist, sync logic would need a configuration-based exclusion. | Low | IMPL-ZOHO-POST-ACTIVATION-SYNC-01 | `server/prisma/schema.prisma` (Tenant model) | Review at implementation |

---

## 18. Contract Summary

| Dimension | Value |
|---|---|
| Trigger | `organizations.status` transitions to `VERIFICATION_APPROVED` (both auto-approve and admin-approve paths) |
| Sync timing | Asynchronous; post-commit; must not block or be inside the approval transaction |
| Target system | Zoho Books (Contact/Customer record) |
| GST authority | Deepvue + TexQtic admin review |
| Activation state authority | TexQtic Main App database |
| Zoho role | Downstream accounting/contact sync only |
| Idempotency key | Primary: Zoho upsert via unique `cf_texqtic_org_id` (`PUT /contacts` + `X-Unique-Identifier-Key` + `X-Upsert: true`). Local: `organization_integrations` stores `external_id`/contact_id and sync status. |
| Failure behavior | Activation unaffected; retry with backoff; SYNC_FAILED after exhaustion |
| Secret model | Zoho credentials in env vars only; never logged or persisted. No `ZOHO_BOOKS_BASE_URL` — base URL derived from `api_domain` in OAuth token response. Required vars: `ZOHO_BOOKS_CLIENT_ID`, `ZOHO_BOOKS_CLIENT_SECRET`, `ZOHO_BOOKS_REFRESH_TOKEN`, `ZOHO_BOOKS_ORGANIZATION_ID`, `ZOHO_BOOKS_API_DOMAIN`. |
| Schema change needed | YES — `organization_integrations` migration required (OD-01: Option B, resolved; see §9.2, §9.3, and §19.13). |
| Runtime code changed | NO (this unit is design-only) |

---

*Design document created: 2026-06-09*  
*Hardened: 2026-06-09 — Official Zoho Books API docs review completed*  
*Next unit: IMPL-ZOHO-POST-ACTIVATION-SYNC-01 (OD-01 recommendation: Option B; OD-05 resolved)*

---

## 19. Zoho Books API Contract Hardening — Official Docs Review

**Hardening date:** 2026-06-09  
**Prompt ID:** RESEARCH-ZOHO-BOOKS-API-CONTACT-SYNC-CONTRACT-HARDENING-01

### 19.1 Official Documentation Sources Reviewed

| URL | Topic | Authority |
|---|---|---|
| `https://www.zoho.com/books/api/v3/introduction/` | API root endpoint, organization_id model, data centers, rate limits | Official Zoho Books API Docs |
| `https://www.zoho.com/books/api/v3/oauth/` | OAuth 2.0 flow, scopes, token validity, refresh token model, api_domain | Official Zoho Books API Docs |
| `https://www.zoho.com/books/api/v3/contacts/` | Contact CRUD endpoints, payload schema, India GST fields, custom fields, upsert-via-custom-field | Official Zoho Books API Docs |

### 19.2 Regional Endpoint Model (CORRECTION)

**Previous assumption:** `https://books.zoho.in/api/v3` — **WRONG**

**Official docs finding:**

| DC | Domain | API Base URL |
|---|---|---|
| United States | .com | `https://www.zohoapis.com/books/v3` |
| India | .in | `https://www.zohoapis.in/books/v3` |
| Europe | .eu | `https://www.zohoapis.eu/books/v3` |

**Final TexQtic contract:**
- India DC base URL: **`https://www.zohoapis.in/books/v3`**
- **Do not hardcode this URL.** The OAuth token response returns `api_domain` (e.g., `"https://www.zohoapis.in"`). Use `api_domain + "/books/v3"` as the runtime base URL to ensure correctness across any future DC changes.
- Verify DC at onboarding by checking Zoho Books web app URL: if it contains `books.zoho.in`, the org is on the `.in` DC.

### 19.3 Organization ID Model

- **Every API call requires `?organization_id=<id>` as a query parameter.**
- `organization_id` is the Zoho Books internal ID for TexQtic's Zoho Books organization (numeric string, e.g., `"10234695"`).
- Obtain at setup time from `GET https://www.zohoapis.in/books/v3/organizations` (scope: `ZohoBooks.settings.READ`).
- Store as `ZOHO_BOOKS_ORGANIZATION_ID` in secrets store. **Never commit to code or `.env` files.**

### 19.4 OAuth and Token Model

| Property | Value | Source |
|---|---|---|
| Flow | Authorization Code or Self-Client (server-to-server) | Official OAuth docs |
| App type recommended for TexQtic | **Self-Client** — no redirect URL needed; purely server-side integration | Official OAuth docs |
| Token endpoint (India DC) | `https://accounts.zoho.in/oauth/v2/token` | Official OAuth docs — DC-specific |
| Access token expiry | **1 hour** (`expires_in: 3600`) | Official OAuth docs |
| Refresh token expiry | **Does not expire** until explicitly revoked by user | Official OAuth docs |
| Max refresh tokens per user | 20 — 21st creation invalidates the oldest | Official OAuth docs |
| Max active access tokens per refresh token | 15 — 16th request invalidates the oldest | Official OAuth docs |
| Access token throttle | Max 10 access tokens per refresh token in a 10-minute window | Official OAuth docs |
| `api_domain` | Returned in token response — use this as the base API URL, not a hardcoded value | Official OAuth docs |
| Token revocation endpoint | `POST {accounts_url}/oauth/v2/token/revoke?token=<token>` | Official OAuth docs |

**Implementation rules:**
1. Cache the access token and reuse it until it expires (`expires_in - buffer`). Do not request a new token on every API call.
2. On 401 from Zoho API: refresh access token once using the stored refresh token, then retry the API call once.
3. If refresh token is revoked/invalid (Zoho returns `invalid_code`): halt sync, set `SYNC_FAILED` with error code `ZOHO_AUTH_REVOKED`, raise ops alert. Do not retry indefinitely.
4. Access tokens and refresh tokens must never be logged, persisted to DB, or included in audit events.
5. The `api_domain` from the token response should be validated against the expected `.in` domain at startup.

### 19.5 Required OAuth Scopes

| Scope | Operations Covered | Required? |
|---|---|---|
| `ZohoBooks.contacts.CREATE` | Create contact, Mark active/inactive | **YES** |
| `ZohoBooks.contacts.UPDATE` | Update contact, Upsert via custom field | **YES** |
| `ZohoBooks.contacts.READ` | Get contact, List contacts (for fallback search) | **YES** |
| `ZohoBooks.settings.READ` | Get organization ID | **YES** (at setup) |
| `ZohoBooks.settings.CREATE` | Provision custom fields programmatically | Optional (see §19.8) |

**Minimum scope string for runtime token (no startup custom-field validation):** `ZohoBooks.contacts.CREATE,ZohoBooks.contacts.UPDATE,ZohoBooks.contacts.READ`

**If the service validates custom field availability at startup:** also include `ZohoBooks.settings.READ`:
`ZohoBooks.contacts.CREATE,ZohoBooks.contacts.UPDATE,ZohoBooks.contacts.READ,ZohoBooks.settings.READ`

> Note: `ZohoBooks.settings.READ` is required for `GET /settings/fields?entity=contact` (custom field listing/validation). If ops manually validates custom fields before deployment, this scope may be omitted from the runtime token. If startup validation is automated, it must be included.

### 19.6 Contacts API Endpoints

| Operation | Method | Endpoint | Scope |
|---|---|---|---|
| Create contact | POST | `/contacts?organization_id=<id>` | `ZohoBooks.contacts.CREATE` |
| Upsert via custom field | PUT | `/contacts?organization_id=<id>` | `ZohoBooks.contacts.UPDATE` |
| Update contact by contact_id | PUT | `/contacts/{contact_id}?organization_id=<id>` | `ZohoBooks.contacts.UPDATE` |
| Get contact by contact_id | GET | `/contacts/{contact_id}?organization_id=<id>` | `ZohoBooks.contacts.READ` |
| List/search contacts | GET | `/contacts?organization_id=<id>&email=<email>` | `ZohoBooks.contacts.READ` |
| Mark contact active | POST | `/contacts/{contact_id}/active?organization_id=<id>` | `ZohoBooks.contacts.CREATE` |

**Upsert endpoint detail (primary idempotency method):**
```
PUT https://www.zohoapis.in/books/v3/contacts?organization_id={ZOHO_ORG_ID}
Authorization: Zoho-oauthtoken {access_token}
X-Unique-Identifier-Key: cf_texqtic_org_id
X-Unique-Identifier-Value: {orgId UUID}
X-Upsert: true
Content-Type: application/json

{ ...contact payload... }
```

### 19.7 Contact Payload Taxonomy (Official)

**Top-level required fields:**
- `contact_name` (REQUIRED) — display name used for searching; map from `organizations.trade_name` if present, else `organizations.legal_name`
- `contact_type` — `"customer"` (for TexQtic B2B registrants)

**Top-level optional fields (India edition):**
- `company_name` — legal/registered name; map from `organizations.legal_name`; max 200
- `customer_sub_type` — `"business"` (not `"individual"`) for B2B
- `is_taxable` — `true` for GST-registered B2B
- `gst_no` — 15-digit GSTIN (**field name is `gst_no`, not `gstin`**)
- `gst_treatment` — `"business_gst"` for registered Indian B2B; other values: `"business_none"`, `"overseas"`, `"consumer"`
- `place_of_contact` — 2-letter Indian state/UT code (e.g., `"MH"` for Maharashtra, `"GJ"` for Gujarat); drives place of supply on invoices; **not applicable for overseas contacts**
- `status` — `"active"` (default)

**`billing_address` sub-object:**
```json
{
  "attention": "<contact name>",
  "address": "<street line 1>",
  "street2": "<street line 2>",
  "city": "<city>",
  "state": "<state name>",
  "state_code": "<2-letter code>",
  "zip": "<pincode>",
  "country": "India"
}
```

**`contact_persons` sub-object (primary contact person):**
```json
[
  {
    "first_name": "<owner first name>",
    "last_name": "<owner last name>",
    "email": "<owner email>",
    "mobile": "<phone if consent>",
    "is_primary_contact": true
  }
]
```

**`custom_fields` sub-object:**

> ⚠️ **Staging-validation required — payload shape not yet confirmed.** The Zoho Books Custom Fields API returns `api_name` (e.g., `cf_texqtic_org_id`) in field definitions, but the official Contacts API documents `custom_fields` sub-attributes as `index`, `value`, and `label` — **not** `api_name`. Whether `api_name` is accepted in the contact payload must be validated against a live staging/sandbox Zoho Books org **before** coding this array. Use the `label`-based alternative (Option B) if `api_name` is rejected.

**Option A — `api_name`-based (confirm via staging/sandbox validation before coding):**
```json
[
  { "api_name": "cf_texqtic_org_id",      "value": "<orgId UUID>" },
  { "api_name": "cf_texqtic_tenant_id",   "value": "<tenantId UUID>" },
  { "api_name": "cf_texqtic_plan_tier",   "value": "<plan>" },
  { "api_name": "cf_texqtic_activated_at","value": "<ISO timestamp>" },
  { "api_name": "cf_texqtic_source",      "value": "TexQtic Main App" }
]
```

**Option B — `label`-based (safe fallback if `api_name` is rejected by Contacts API):**
```json
[
  { "label": "TexQtic Org ID",       "value": "<orgId UUID>" },
  { "label": "TexQtic Tenant ID",    "value": "<tenantId UUID>" },
  { "label": "TexQtic Plan Tier",    "value": "<plan>" },
  { "label": "TexQtic Activated At", "value": "<ISO timestamp>" },
  { "label": "TexQtic Source",       "value": "TexQtic Main App" }
]
```

> Note: The `X-Unique-Identifier-Key: cf_texqtic_org_id` upsert header uses the field's `api_name` from the Custom Fields settings API — this is confirmed. The `custom_fields` array payload shape inside the contact body (whether `api_name` or `label` is the correct key) requires staging/sandbox validation before implementation.

### 19.8 Custom Field Strategy

**Official finding:** Zoho Books supports custom fields on Contacts. They can be:
- Provisioned manually via Zoho Books admin UI (Settings → Custom Fields → Contacts)
- Provisioned programmatically via `POST /settings/fields` (requires `ZohoBooks.settings.CREATE` scope)

**For `cf_texqtic_org_id` specifically:**
- Must be configured with **"Do not allow duplicate values"** (unique constraint) enabled
- This is what enables the `X-Unique-Identifier-Key` upsert pattern
- The `api_name` is automatically assigned as `cf_<field_name_slugified>` by Zoho

**TexQtic custom fields to provision (in Zoho Books, before IMPL unit):**

| API Name | Label | Type | Unique? | Required for sync? |
|---|---|---|---|---|
| `cf_texqtic_org_id` | TexQtic Org ID | Text | **YES — required for upsert** | YES |
| `cf_texqtic_tenant_id` | TexQtic Tenant ID | Text | No | YES |
| `cf_texqtic_plan_tier` | TexQtic Plan Tier | Text | No | Optional |
| `cf_texqtic_activated_at` | TexQtic Activated At | Date/Text | No | Optional |
| `cf_texqtic_source` | TexQtic Source | Text | No | Optional |

**Decision — provisioning approach:**
- **Recommended:** Manual provisioning via Zoho Books admin UI as a prerequisite before `IMPL-ZOHO-POST-ACTIVATION-SYNC-01`. This avoids needing `ZohoBooks.settings.CREATE` scope and is a one-time setup.
- **Alternative:** Auto-provisioning at service startup via API (adds complexity; use only if automated setup is required).

### 19.9 India GST/Tax Field Mapping (Official)

| Intent | Official Zoho Field | Type | Allowed Values / Notes |
|---|---|---|---|
| GSTIN of contact | `gst_no` | string (India only) | 15-digit GSTIN as issued by Indian tax authorities |
| GST registration status | `gst_treatment` | string (India only) | `"business_gst"` (registered), `"business_none"` (unregistered), `"overseas"`, `"consumer"` |
| Place of supply (state) | `place_of_contact` | string (India only) | 2-letter state/UT code; not applicable for overseas contacts |
| Tax applicability | `is_taxable` | boolean (India incl.) | `true` for GST-registered businesses |

**For TexQtic's standard Indian B2B customer (registered, activated):**
```json
{
  "gst_no": "<15-digit GSTIN from organizations.gst_number>",
  "gst_treatment": "business_gst",
  "place_of_contact": "<2-letter Indian state code from org address/GST state>",
  "is_taxable": true
}
```

### 19.10 Error Handling Matrix (Official)

| HTTP Status | Zoho Code | Meaning | TexQtic Response |
|---|---|---|---|
| 201 | 0 | Contact created successfully | Store `contact_id`; emit `org.zoho_sync.success` |
| 200 | 0 | Contact updated successfully | Store/confirm `contact_id`; emit `org.zoho_sync.success` |
| 400 | non-0 | Invalid payload (e.g., invalid GSTIN format) | Do NOT retry automatically; log sanitized error; emit `org.zoho_sync.failed` with `ZOHO_PAYLOAD_INVALID`; require code fix |
| 401 | - | Invalid or expired access token | Attempt one token refresh; if refresh fails, set `ZOHO_AUTH_REVOKED`, alert ops |
| 403 | - | Insufficient scope | Alert ops; do not retry; code/config fix required |
| 404 | - | Contact not found (on update) | Treat as new contact; retry as create |
| 429 | 44/45 | Rate limit exceeded (per-minute or per-day) | Respect `Retry-After` header; exponential backoff; emit `org.zoho_sync.failed` with `ZOHO_RATE_LIMITED` |
| 429 | 1070 | Concurrent request limit | Retry after short delay |
| 5xx | - | Zoho server error | Retry with backoff (up to retry limit) |
| Network timeout | - | No response | Retry with backoff |

**Rate limit facts (official):**
- 100 requests/minute per organization
- Daily: Free=1,000; Standard=2,000; Professional=5,000; Premium/Elite/Ultimate=10,000
- Concurrent: Free=5, Paid=10 (soft limit)

### 19.11 Sandbox and Testing Strategy

**Official Zoho Books API docs include a Sandbox feature, but it is marked as early access** — availability and behavior vary by account and edition. TexQtic must verify whether Zoho Books sandbox is available and enabled for its plan/org before relying on it.

**Zoho Books sandbox — official API findings:**
- Documented at `GET/POST /sandboxes` (scope: `ZohoBooks.settings.*`); admin-only; early-access.
- Purpose: copy of the production Books org for testing **configuration changes** (custom fields, templates, extensions) — NOT a general transactional data test environment.
- Treat as "may not be available"; build automations must handle "not enabled / not available" responses gracefully.
- Endpoints: `POST /sandboxes` (create), `GET /sandboxes` (list), `GET /sandboxes/{id}` (detail), plus push/validate/rebuild operations.

**TexQtic testing approach (verify sandbox availability first):**
1. **Preferred:** Check whether Zoho Books sandbox is available for TexQtic's plan/org (`GET /sandboxes`). If available and enabled, use the official sandbox as the primary isolated test environment.
2. **Fallback:** Use a **separate Zoho Books organization** (e.g., `TexQtic Dev/Staging`) for integration testing — this is the standard Zoho practice when sandbox is not available.
3. Configure `ZOHO_BOOKS_ORGANIZATION_ID` to point to the sandbox or staging Books org in non-production environments.
4. Test tenants should use a separate Zoho Books org ID; never use production org ID in tests.
5. Use a test GSTIN (Zoho accepts any 15-char string in test orgs — verify behavior at implementation time).
6. Custom fields (`cf_texqtic_*`) must be provisioned in the sandbox/staging org separately from production.

### 19.12 Changes to Previous Design Assumptions

| Area | Previous Assumption | Official Docs Finding | Final TexQtic Contract |
|---|---|---|---|
| Base URL | `https://books.zoho.in/api/v3` | India DC: `https://www.zohoapis.in/books/v3`; use `api_domain` from token | Use `api_domain` from OAuth token + `/books/v3`; expected India value: `https://www.zohoapis.in` |
| GSTIN field name | `gstin` | Official field name is `gst_no` | Use `gst_no` |
| `primaryEmail` mapping | Top-level payload field | Not a top-level Zoho Contact field | Put in `contact_persons[0].email` |
| `primaryContactName` | Top-level field | Not a top-level field | Split into `contact_persons[0].first_name` + `last_name` |
| `orgId`, `tenantId`, `source`, `lifecycleStatus`, `planTier` | Top-level payload fields | Not valid top-level Zoho Contact fields | All must be custom fields (`cf_texqtic_*`) |
| `country` field | Top-level `country` | Belongs inside `billing_address.country` | `billing_address.country: "India"` |
| Idempotency | Two-step: check local zoho_contact_id, then create or update | Zoho provides `PUT /contacts` with `X-Unique-Identifier-Key` + `X-Upsert: true` | Use upsert-via-custom-field as primary mechanism |
| OAuth env var | `ZOHO_BOOKS_BASE_URL` | Should be driven by `api_domain` from token | Replace with `ZOHO_BOOKS_API_DOMAIN` (runtime-set from token response) |
| Access token expiry | Not specified | 1 hour exactly (`expires_in: 3600`) | Cache token; refresh 60s before expiry |
| Refresh token expiry | "Long-lived" | Does not expire (until revoked); max 20 per user | No rotation needed unless user revokes; monitor for revocation |
| Sandbox | No info | IS documented (early-access); availability varies by plan/edition; treat as "may not be available" | Check `GET /sandboxes` for availability; use official sandbox if available and enabled, else use separate staging org |

### 19.13 OD-01 Final Recommendation

**Open Decision OD-01:** `organizations.zoho_contact_id` (Option A) vs `organization_integrations` table (Option B)

**Post-API-hardening recommendation: Option B (integration table)**

**Rationale:**
1. The `organization_integrations` table naturally accommodates the sync status tracking (`NOT_SYNCED`, `SYNC_PENDING`, `SYNC_SUCCESS`, `SYNC_FAILED`, `SYNC_SKIPPED`), `last_synced_at`, `error_details`, and `attempt_count` — none of which fit on a simple column.
2. Zoho Books returns a numeric `contact_id` — storing it alongside sync metadata is cleaner in a table than adding multiple columns to `organizations`.
3. Future integrations (Zoho CRM, payment gateways, etc.) will follow the same pattern; a table amortizes the migration cost.
4. The upsert-via-custom-field pattern reduces (but does not eliminate) the need to locally cache the Zoho `contact_id` — it is still needed for the `GET /contacts/{contact_id}` fast-path and for admin sync-status display. This value is stored in `organization_integrations.external_id`.

**Minimum table definition (for Option B):**
```sql
CREATE TABLE organization_integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type  VARCHAR(50) NOT NULL,  -- e.g. 'ZOHO_BOOKS_CONTACT'
  external_id       VARCHAR(255),          -- Zoho Books contact_id (numeric string)
  sync_status       VARCHAR(30) NOT NULL DEFAULT 'NOT_SYNCED',
  last_synced_at    TIMESTAMPTZ,
  error_code        VARCHAR(100),
  error_details     TEXT,
  attempt_count     INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, integration_type)
);
COMMENT ON COLUMN organization_integrations.external_id IS
  'Zoho Books numeric contact_id (string). NULL until sync succeeds. Never used for activation decisioning.';
```

**OD-01 status: RESOLVED — Option B.**

### 19.14 Implementation-Ready Contract for IMPL-ZOHO-POST-ACTIVATION-SYNC-01

**Prerequisites before implementation begins:**
1. `ZOHO_BOOKS_CLIENT_ID`, `ZOHO_BOOKS_CLIENT_SECRET`, `ZOHO_BOOKS_REFRESH_TOKEN` configured in production secrets store.
2. `ZOHO_BOOKS_ORGANIZATION_ID` obtained from `GET /organizations` and stored in secrets.
3. Custom fields `cf_texqtic_org_id` (unique), `cf_texqtic_tenant_id`, `cf_texqtic_plan_tier`, `cf_texqtic_activated_at`, `cf_texqtic_source` provisioned in Zoho Books (both production and staging orgs).
4. `organization_integrations` table created via approved SQL + `prisma db pull` + `prisma generate`.
5. OPS-ZOHO-PRODUCTION-SECRET-CONFIG-01 completed.

**Minimum viable payload (MVP — first implementation):**
```json
{
  "contact_name": "<trade_name or legal_name>",
  "company_name": "<legal_name>",
  "contact_type": "customer",
  "customer_sub_type": "business",
  "is_taxable": true,
  "gst_no": "<15-digit GSTIN>",
  "gst_treatment": "business_gst",
  "place_of_contact": "<2-letter state code>",
  "contact_persons": [
    {
      "first_name": "<owner first name>",
      "last_name": "<owner last name>",
      "email": "<owner email>",
      "is_primary_contact": true
    }
  ],
  "billing_address": {
    "address": "<street>",
    "city": "<city>",
    "state": "<state name>",
    "state_code": "<2-letter>",
    "zip": "<pincode>",
    "country": "India"
  },
  "custom_fields": [
    { "api_name": "cf_texqtic_org_id",      "value": "<orgId>" },
    { "api_name": "cf_texqtic_tenant_id",   "value": "<tenantId>" },
    { "api_name": "cf_texqtic_plan_tier",   "value": "<plan>" },
    { "api_name": "cf_texqtic_activated_at","value": "<ISO8601 timestamp>" },
    { "api_name": "cf_texqtic_source",      "value": "TexQtic Main App" }
  ]
}
```
> ⚠️ **`custom_fields` payload shape — staging-validation required.** The form above uses `api_name` keys (Option A from §19.7). Confirm whether Zoho Books Contacts API accepts `api_name` in this array; if not, switch to `label`-based Option B. See §19.7 for both options.

**API call pattern (upsert):**
```
PUT https://www.zohoapis.in/books/v3/contacts?organization_id={ZOHO_BOOKS_ORGANIZATION_ID}
Authorization: Zoho-oauthtoken {access_token}
X-Unique-Identifier-Key: cf_texqtic_org_id
X-Unique-Identifier-Value: {orgId UUID}
X-Upsert: true
Content-Type: application/json
```

**After successful response:** Store `contact.contact_id` in `organization_integrations.external_id`; set `sync_status = SYNC_SUCCESS`.

### 19.15 Implementation Guardrail

> **Before writing any runtime code for `IMPL-ZOHO-POST-ACTIVATION-SYNC-01`:**
>
> 1. Provision all 5 custom fields in the **staging/sandbox Zoho Books organization** first.
> 2. Call `GET {api_domain}/books/v3/settings/fields?organization_id=<staging_org_id>&entity=contact` (scope: `ZohoBooks.settings.READ`) to retrieve the actual generated API names. Simple variant: `GET {api_domain}/books/v3/customfields?organization_id=<staging_org_id>&entity=contact`.
> 3. Confirm `cf_texqtic_org_id` exists, has `unique: true` configured, and the `api_name` matches what will be used in `X-Unique-Identifier-Key`.
> 4. Zoho generates API names from configured field labels (e.g., label "TexQtic Org ID" → `cf_texqtic_org_id`). If the label differs, the generated API name will differ — validate before coding.
> 5. **Confirm the `custom_fields` payload array shape** accepted by `PUT /contacts`: attempt a test upsert with `api_name`-keyed entries (Option A); if rejected, switch to `label`-keyed entries (Option B). Record the confirmed shape before coding the payload builder.
> 6. Never use a hardcoded base URL such as `https://www.zohoapis.in/books/v3` — always use `api_domain + "/books/v3"` from the OAuth token response.
> 7. Never create contacts in a production Zoho Books organization during development or QA. Always use the dedicated staging/sandbox org.

### 19.16 Pre-Implementation Live Validation Checklist

The following items must be verified against a live staging/sandbox Zoho Books org before `IMPL-ZOHO-POST-ACTIVATION-SYNC-01` begins:

| # | Validation item | How to verify |
|---|---|---|
| 1 | Confirm Zoho Books org data center and `api_domain` | Run OAuth token refresh; confirm `api_domain` returns `https://www.zohoapis.in` (India DC) |
| 2 | Confirm `organization_id` for staging org | `GET {api_domain}/books/v3/organizations` (scope: `ZohoBooks.settings.READ`) |
| 3 | Confirm whether official Zoho Books sandbox is available for TexQtic's plan | `GET {api_domain}/books/v3/sandboxes`; if 200 with data → available; if error/empty → use separate staging org |
| 4 | Confirm custom field entity key | `GET /settings/fields?entity=contact&organization_id=<id>` returns contact fields (not `entity=contacts`) |
| 5 | Confirm generated `cf_*` API names in staging/sandbox org | Inspect `api_name` values in the List custom fields response |
| 6 | Confirm `cf_texqtic_org_id` is configured as unique | `is_unique: true` in the field definition response |
| 7 | Confirm accepted `custom_fields` payload shape | Perform a test `PUT /contacts` upsert; verify whether `api_name` (Option A) or `label` (Option B) is accepted |
| 8 | Confirm `gst_no`, `gst_treatment`, `place_of_contact` behavior | Create/upsert a staging contact with dummy GSTIN; verify accepted without errors |
| 9 | Confirm upsert returns `contact.contact_id` | Inspect the response from the test upsert; confirm numeric `contact_id` present |
| 10 | Confirm no production contact created during validation | All test calls use staging/sandbox `organization_id`; verify staging org in Zoho UI |

---

*Hardening section added: 2026-06-09*  
*Internal consistency patch applied: 2026-06-09*  
*Official docs crosscheck corrections applied: 2026-06-09*
