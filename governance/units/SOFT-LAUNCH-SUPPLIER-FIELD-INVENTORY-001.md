# SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-001

**Packet ID:** SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-B4-MINI-SYNTHESIS  
**Unit ID:** SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-001  
**Status:** GOVERNANCE_SYNTHESIS — no implementation, no schema changes, no source mutations  
**Date:** 2026-05-21  
**Synthesizes:** B1 schema scan · B2 API/input schema scan · B3 frontend form scan  
**Authority boundary:** Findings only. This unit does not open any family cycle, authorize any
implementation, or change Layer 0 posture.

---

## 1. Synthesis Summary

Three B-series read-only scans have been completed:

| Packet | Scope | Status |
|---|---|---|
| B1 — `SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-B1-SCHEMA-SCAN` | `server/prisma/schema.prisma` — all provisioning-relevant models | COMPLETE |
| B2 — `SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-B2-API-SCAN` | Provisioning + activation API routes, zod schemas, normalization types | COMPLETE |
| B3 — `SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-B3-FRONTEND-FORM-SCAN` | `OnboardingFlow.tsx`, `App.tsx` (ONBOARDING state), `tenantService.ts` | COMPLETE |

**Key findings before the matrix:**

- A supplier can be fully activated for the Surat pilot with **6 admin-supplied fields** and
  **4 supplier-supplied fields**. Everything else is system-generated or defaults.
- **3 form fields are cosmetic dead-ends**: tenant-type selector (Step 3), subdomain (Step 2),
  and industry (Step 1). All are collected by the frontend but never reach a DB column.
- **One critical operational discrepancy** is recorded in §6 — the invite URL format documented
  in A4 (`?token=<token>`) is incomplete; the correct format requires `?token=<token>&action=invite`.
  Without `action=invite`, the supplier lands in the password-reset handler, not the onboarding flow.
- **`base_family`** is marked optional in the zod schema but is effectively required by normalization
  for APPROVED_ONBOARDING mode. A request missing both `base_family` and `tenant_category` will pass
  zod and then fail at normalization with a 400.

---

## 2. Phase Legend

| Code | Phase |
|---|---|
| **B-INV** | Before invite — admin sets at provisioning time |
| **D-ACT** | During activation — supplier sets when accepting invite |
| **SYS-P** | System-generated at provisioning |
| **SYS-A** | System-generated at activation |
| **P-ACT** | Post-activation — admin manual action |
| **KYC** | Post-activation KYC — optional for soft launch |

---

## 3. Full Field Inventory Matrix

### Group A — Admin-Supplied at Provisioning (before invite)

| Field | DB column · API param · Form | Required / Optional | Who supplies | Phase | Public / Private | Soft-launch minimum | Notes |
|---|---|---|---|---|---|---|---|
| Orchestration reference | `tenants.externalOrchestrationRef`, `organizations.external_orchestration_ref`, `invites.externalOrchestrationRef`; API: `orchestrationReference` | **Required** (API hard-required; unique per org) | Admin | B-INV | Private | `"surat-pilot-NNN"` (sequential) | Max 255 chars. Idempotency key — duplicate provisioning calls with the same reference return 409 CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE. |
| Legal name | `organizations.legal_name`, `tenants.name` (display fallback); API: `organization.legalName` | **Required** | Admin | B-INV | Public | Supplier's registered company name | 2–500 chars. If `displayName` absent, seeds the slug. Form does not pre-fill from this value (UX-1). |
| Jurisdiction | `organizations.jurisdiction` (default `'UNKNOWN'`); API: `organization.jurisdiction` | **Required** | Admin | B-INV | Private | `"IN"` | 2–100 chars. Must be `'IN'` for India. Overwritten at activation by supplier's free-text entry (UX-7). |
| First-owner email | `invites.email`; API: `firstOwner.email` | **Required** | Admin | B-INV | Private | Supplier's business email | Locked to invite. Supplier must type exact match at activation (lowercased). Typo → 403 EMAIL_MISMATCH; no recovery except re-provisioning. |
| Base family / tenant category | `organizations.org_type`, `tenants.type`; API: `base_family` OR `tenant_category` | **Normalization-required** (zod: optional) | Admin | B-INV | Public | `"B2B"` | Both zod-optional, but normalization returns 400 if neither is present. For Surat textile suppliers: always `"B2B"`. Step 3 form card selector is cosmetic and does not override this value. |
| Display name | `tenants.name`, `organizations.slug` source; API: `organization.displayName` | Optional | Admin | B-INV | Public | Omit — `legalName` used | 2–200 chars. If supplied, used as slug source instead of `legalName`. |
| Registration number (pre-set) | `organizations.registration_no` (nullable); API: `organization.registrationNumber` | Optional at provisioning | Admin | B-INV | Private | Omit — supplier provides at activation | 1–200 chars. No format enforcement. Value set here is unconditionally overwritten by the supplier's Step 4 input at activation. |
| Commercial plan | `organizations.plan`, `tenants.plan`; API: `commercial_plan` or `plan` | Optional (defaults `FREE`) | Admin | B-INV | Private | Omit — FREE default applies | APPROVED_ONBOARDING mode always defaults to FREE if absent. |
| White-label capability | `organizations.is_white_label`, `tenants.isWhiteLabel`; API: `white_label_capability` or `is_white_label` | Optional (defaults `false`) | Admin | B-INV | Private | Omit — defaults false | For Surat pilot suppliers: always false. |
| Primary segment key | `organizations.primary_segment_key`; API: `primary_segment_key` | Optional | Admin | B-INV | Public | Omit or set (e.g., `"WOVEN_FABRIC"`) | Textile cluster: set at provisioning for richer directory listing. Not required for activation. |
| Secondary segment keys | `organization_secondary_segments` table; API: `secondary_segment_keys` | Optional | Admin | B-INV | Public | Omit | Must be unique array. |
| Role position keys | `organization_role_positions` table; API: `role_position_keys` | Optional | Admin | B-INV | Public | Omit or set (`"manufacturer"`) | `manufacturer` / `trader` / `service_provider`. |
| Approved onboarding metadata | Not stored in DB; API: `approvedOnboardingMetadata` | Optional | Admin | B-INV | Private | Omit | Free-form `Record<string, unknown>`. Operational metadata only — not written to any DB column. |

---

### Group B — System-Generated at Provisioning

| Field | DB column / Response | Phase | Public / Private | Notes |
|---|---|---|---|---|
| `org_id` (canonical tenant boundary) | `tenants.id = organizations.id`; 201: `orgId` | SYS-P | Private | UUID. Permanent supplier identifier. `tenants.id` and `organizations.id` are the same UUID. |
| Slug | `tenants.slug`, `organizations.slug`; 201: `slug` | SYS-P | Public | `slugify(displayName ?? legalName)` — lowercase, non-alphanumeric → `-`, truncated to 90 chars. |
| Invite token (raw) | Not stored; 201: `firstOwnerAccessPreparation.inviteToken` | SYS-P | Private | 64-char hex (`randomBytes(32)`). Raw token goes in invite URL. SHA-256 hash stored in `invites.tokenHash`. |
| Invite expiry | `invites.expiresAt`; 201: `firstOwnerAccessPreparation.expiresAt` | SYS-P | Private | `now() + 7 days`. After expiry → 404 INVALID_INVITE. No re-issue endpoint exists. |
| Invite purpose | `invites.invitePurpose` = `'FIRST_OWNER_PREPARATION'` | SYS-P | Private | Hard-coded for provisioning-time invites. |
| Invite role | `invites.role` = `'OWNER'` | SYS-P | Private | Hard-coded. Supplier always provisioned as OWNER. |
| Organization status (initial) | `organizations.status` = `'VERIFICATION_APPROVED'` | SYS-P | Private | Set by provisioning transaction. Transitions to `PENDING_VERIFICATION` at activation. |

---

### Group C — Supplier-Supplied at Activation

| Field | DB column · API param · Form | Required / Optional | Who supplies | Phase | Public / Private | Soft-launch minimum | Notes |
|---|---|---|---|---|---|---|---|
| Invite token (URL param) | `inviteToken` (top-level API param); URL: `?token=<64-char-hex>&action=invite` | **Required** | System (delivered by Admin) | D-ACT | Private | Delivered in invite URL | Supplier never types this. Extracted from URL on page mount. **Both `?token=` and `&action=invite` are required** — see §6 for correct URL format. |
| Email (activation) | `users.email`; Form: Step 2 "Work Email" | **Required** | Supplier | D-ACT | Private | Must match `firstOwner.email` | No hint shown. Must match `invite.email` exactly (lowercased). Mismatch → 403 EMAIL_MISMATCH. No recovery other than re-provisioning. |
| Password | `users.passwordHash`; Form: Step 2 "Create Password" | **Required** | Supplier | D-ACT | Private | Any string ≥ 6 chars | Min 6 chars (note: legacy provisioning uses min 8 — inconsistency). No confirm-password field. If the email already exists in `users`, this password is silently discarded (reused-user path). |
| Registration number (activation) | `organizations.registration_no`; Form: Step 4 "Registration Number" | **Required at activation** (DB nullable) | Supplier | D-ACT | Private | CIN / LLPIN / any ID | Min(1). Free text. No format enforcement. Overwrites any value set at provisioning. India CIN: `LLLLLL99LLLLL9L999999` — no enforcement. |
| Jurisdiction (activation) | `organizations.jurisdiction`; Form: Step 4 "Jurisdiction" | **Required at activation** | Supplier | D-ACT | Private | `"IN"` | Min(1). Free text. No dropdown. Placeholder: "Country or incorporation jurisdiction". Supplier may type `India` or `Gujarat` instead of `IN`. Overwrites provisioned value. |
| Business name override | `organizations.legal_name`, `tenants.name`; Form: Step 1 "Legal Entity Name" (`orgName`) | Optional (live overwrite) | Supplier | D-ACT | Public | Omit — provisioned `legalName` kept if blank | If non-empty: immediately overwrites `organizations.legal_name` AND `tenants.name`. No confirmation gate. Field starts blank — `prefilledData` prop exists but is never passed from App.tsx (UX-1). |

---

### Group D — System-Generated at Activation

| Field | DB column / Response | Phase | Public / Private | Notes |
|---|---|---|---|---|
| User ID | `users.id` (UUID) | SYS-A | Private | New user created if email not already in `users` table. |
| Email verified flags | `users.emailVerified = true`, `users.emailVerifiedAt = now()` | SYS-A | Private | Set on user creation. No separate email verification step in current flow. |
| Membership | `memberships` row (`role: OWNER`, `userId`, `tenantId`) | SYS-A | Private | Created in activation transaction. Role is `OWNER` unless a prior OWNER membership already exists, in which case `invite.role` is used. |
| Organization status (post-activation) | `organizations.status = 'PENDING_VERIFICATION'` | SYS-A | Private | Overwrites `VERIFICATION_APPROVED`. Supplier workspace is live but restricted until admin approves. |
| Audit log entry | `audit_logs` table (`action: 'user.activated'`) | SYS-A | Private | Written atomically in the same transaction as activation. |
| Access token (JWT) | 200 response body: `token` | SYS-A | Private | Tenant-scoped JWT. Stored client-side in `texqtic_tenant_token`. Grants access in PENDING_VERIFICATION mode. |

---

### Group E — Admin Post-Activation

| Field | DB column / API | Required / Optional | Who supplies | Phase | Notes |
|---|---|---|---|---|---|
| Onboarding outcome approval | `organizations.status` transitions; API: `POST /api/control/tenants/:id/onboarding/outcome` then `POST /api/control/tenants/:id/onboarding/activate-approved` | **Required** for full access | Admin (Paresh) | P-ACT | Two manual API calls. No automated transition (PI-001). Without this, supplier remains `PENDING_VERIFICATION` indefinitely. |

---

### Group F — Post-Activation KYC (optional for soft launch)

| Field | DB column | Required for soft launch | Phase | Notes |
|---|---|---|---|---|
| GSTIN | `gst_verifications.gstin` (VARCHAR 20) | Not required | KYC | Post-activation KYC step. Supplier can activate without a GST record. Separate KYC flow. |
| GST legal name | `gst_verifications.legal_name_on_gst` (VARCHAR 500) | Not required | KYC | Returned by GST API lookup; not manually entered. |
| GST state code | `gst_verifications.state_code` (VARCHAR 10) | Not required | KYC | Returned by GST API lookup. |
| GST registration type | `gst_verifications.registration_type` (VARCHAR 50) | Not required | KYC | e.g., Regular / Composition. |

---

### Group G — Fields Absent from Schema

| Field | Status | Notes |
|---|---|---|
| PAN | **ABSENT** — no column exists anywhere in schema | No dedicated PAN field. Cannot be collected or stored without a schema addition. |
| Address (street / city / pin) | **ABSENT** — no address fields in schema | Actively prohibited per WEBHOOK-007 governance (PII constraint). |
| Phone / mobile | **ABSENT** — no phone field in schema | Actively prohibited per WEBHOOK-007 governance (PII / WEBHOOK-007 constraint). |

---

## 4. Dead Form Fields

These fields are rendered in the activation form and collected into `formData` state but are
**never included in the `activateTenant` API call** and are never written to any DB column.
They represent pure UX friction with no functional outcome.

| Form field | Step | State key | API param | DB destination | Disposition |
|---|---|---|---|---|---|
| Primary Industry | Step 1 | `formData.industry` | `tenantData.industry` (sent but ignored) | None | Accepted by zod, not written in activation transaction. Dead end-to-end. |
| Subdomain | Step 2 | `formData.domain` | Not sent | None | Not included in API call at all. No subdomain provisioning endpoint exists. |
| Tenant type selector (AGGREGATOR / B2B / B2C) | Step 3 | `formData.type` | Not sent | None | Tenant type is locked at provisioning. Step 3 creates false impression of supplier choice. |

---

## 5. Minimum Fields for First Real Supplier

The following is the complete set of fields that must be present for a Surat pilot supplier to
successfully activate. Everything else is optional or system-generated.

### Admin must supply at provisioning (6 fields)

```
POST /api/control/tenants/provision
Authorization: Bearer <SUPER_ADMIN JWT>

{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orchestrationReference": "surat-pilot-001",
  "base_family": "B2B",
  "organization": {
    "legalName": "<Supplier company name>",
    "jurisdiction": "IN"
  },
  "firstOwner": {
    "email": "<supplier-owner@company.com>"
  }
}
```

Minimum response fields to extract:
- `orgId` — supplier's permanent platform identifier
- `firstOwnerAccessPreparation.inviteToken` — to construct the invite URL
- `firstOwnerAccessPreparation.expiresAt` — to know when the invite expires

### Admin must deliver to supplier (1 action)

```
Invite URL: https://app.texqtic.com/?token=<inviteToken>&action=invite
```

Both `?token=` and `&action=invite` are required. See §6 for the operational constraint.

### Supplier must supply at activation (4 fields, via form)

| Form step | Field | Value |
|---|---|---|
| Step 2 | Email | Must be exactly the `firstOwner.email` supplied at provisioning |
| Step 2 | Password | Any string ≥ 6 characters |
| Step 4 | Registration Number | CIN, LLPIN, or any business registration ID |
| Step 4 | Jurisdiction | `"IN"` (but free text — no enforcement) |

### Admin must complete after activation (2 API calls, no data input needed)

```
POST /api/control/tenants/<orgId>/onboarding/outcome   body: { "outcome": "APPROVED" }
POST /api/control/tenants/<orgId>/onboarding/activate-approved
```

After these two calls: `organizations.status = 'ACTIVE'` and the supplier is fully live.

---

## 6. Critical Invite URL Format — A4 Discrepancy

The A4 synthesis document (`SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001.md §9`) documents the invite URL as:

> `https://app.texqtic.com/onboarding?token=<inviteToken>`

**This format is operationally incomplete.** The App.tsx mount effect (line 3624–3633) requires:

```
const token  = params.get('token');
const action = params.get('action');
if (token && action === 'invite') {
  setPendingInviteToken(token);
  setAppState('ONBOARDING');       // ← onboarding flow
} else if (token) {
  setAppState('TOKEN_HANDLER');    // ← password reset / email verify
}
```

Without `action=invite`, a URL containing only `?token=<value>` routes the supplier to the
`TOKEN_HANDLER` state (the password-reset / email-verification screen), not to the onboarding form.
The supplier sees a password-reset screen and the invite token is silently discarded.

**Correct invite URL format:**

```
https://app.texqtic.com/?token=<64-char-hex>&action=invite
```

The Vercel `routes` config has a catch-all `"src": "/(.*)", "dest": "/index.html"` — so any path
works (the SPA reads `window.location.search` on mount). The path itself is irrelevant; the
`&action=invite` query parameter is mandatory.

**Operational risk:** If Paresh constructs invite URLs without `&action=invite`, the supplier will
experience what appears to be a password-reset screen when clicking the link. The invite token will
not be consumed, and the 7-day TTL will continue counting.

---

## 7. UX Gaps with Operational Consequences

Gaps marked ⚠️ have a direct consequence at soft launch with real suppliers.

| ID | Gap | Consequence | Fix complexity |
|---|---|---|---|
| **UX-1** ⚠️ | `prefilledData` prop never passed — org name starts blank | Supplier types their legal name from scratch. If they type something different from the provisioned `legalName`, the activation overwrites `organizations.legal_name`. No record of what was originally provisioned exists in the form. | Low — pass `prefilledData` from provisioning 201 response (requires storing 201 response fields in app state between provisioning and invite delivery). |
| **UX-2** | Step 3 tenant-type selector has no effect | Supplier spends time on a choice with no outcome. Tenant type is locked at provisioning. | Low — remove Step 3 entirely or replace with an informational card. |
| **UX-3** | Subdomain field collected but not sent | False expectation that supplier is reserving a subdomain URL. No such feature exists. | Low — remove subdomain field. |
| **UX-4** ⚠️ | No invite token validation before form starts | If token is expired (7-day TTL), supplier completes all 4 steps before discovering the error. 404 arrives at final submit. | Medium — pre-validate token on page mount with a lightweight server call before rendering steps. |
| **UX-5** ⚠️ | No email hint on Step 2 | Supplier must type their email from memory. Typo → 403 EMAIL_MISMATCH after all 4 steps. No recovery. | Low — display a hint: "Enter the email where you received this invite". |
| **UX-6** | No password confirmation field | Mistyped password accepted; supplier discovers it at first login. | Low — add a "Confirm Password" input with client-side match check. |
| **UX-7** ⚠️ | Jurisdiction field is free text with no India guidance | Supplier types `India` instead of `IN`. Provisioned `'IN'` value gets overwritten with `'India'`. May affect downstream GST/KYC matching that checks `jurisdiction = 'IN'`. | Low — dropdown or placeholder showing `"e.g. IN for India"`. |
| **UX-8** | `tenantData.industry` dead end-to-end | Field collected in Step 1, accepted by zod, but not written to any DB column. Supplier's industry input is silently dropped. | Low — remove the industry field, or implement segment key selection with `primary_segment_key`. |
| **UX-9** | Reused-email path silently discards activation password | If the supplier's email already exists in `users`, the new password is ignored (existing passwordHash kept). No error surfaced. Supplier will fail login with the password they just set. | Low risk for Surat pilot (all suppliers are new users). Deferred per HD-001. |
| **UX-10** | 4-step form disproportionate for pilot | Steps 1 and 3 are largely dead weight. Minimum viable form is: email, password, registration number, jurisdiction — 4 fields in one screen. | Low — restructure form; out of current scope. |

---

## 8. Fields Still Unclear

No fields are unresolved after B1 + B2 + B3 scans. All provisioning and activation paths have been
fully traced from zod schema → normalization → DB write for the APPROVED_ONBOARDING soft-launch path.

The only ambiguity is operational rather than technical:
- **GSTIN validation timing:** There is no enforcement gate requiring GSTIN before a supplier can be
  approved ACTIVE. The `gst_verifications` table exists and the KYC flow is post-activation, but
  whether Paresh intends to verify GSTIN before approving `ACTIVE` status in the Surat pilot is an
  operator decision, not a platform constraint.

---

## 9. No Source Files Changed Confirmation

All source files inspected across B1, B2, B3, and this B4 synthesis were read only.

No source files were edited.  
No migrations were run.  
No Prisma commands were executed.  
No production data was touched.  
No `.env` values were printed or modified.  

This file (`governance/units/SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-001.md`) is the only artifact
created in this packet series.
