# TexQtic CRM → Main Application Registration / Activation Handoff White Paper

**Version:** 1.0  
**Date:** 2026-04-23  
**Status:** FINAL — for operational use by CRM team, sales operations, onboarding coordinators,
and Main App integration implementers  
**Document type:** Cross-team operational handoff — CRM-facing  
**Audience:** CRM team · Sales operations · Onboarding coordinators · Main App integration
implementers  
**Authority source:** This white paper is grounded exclusively in confirmed Main App repo truth.
Statements are labeled to indicate their verification status. CRM-side schema and field names are
NOT defined here; CRM internal data modeling is the CRM team's responsibility.

**Related internal contracts (authoritative, do not reopen):**
- `docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md` — identifier and field
  classification (OD-001, OD-004 CRM path, OD-006 CLOSED)
- `docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md` — activation signal
  and polling endpoint (OD-002, OD-005 CLOSED)

**Taxonomy scope:** This paper covers the registration/activation handoff chain only. Taxonomy
classification (business families, segments, aggregator discovery, WL relationships) is out of
scope here and is addressed in the separate taxonomy white paper.

**Pending items:** Several platform-side capabilities are not yet implemented. They are labeled
`[PENDING IMPLEMENTATION]` or `[NOT YET IMPLEMENTED]` throughout. They do not block this white
paper.

---

## Table of Contents

1. Purpose
2. Audience
3. Funnel / System Context
4. Boundary of Authority
5. Exact Handoff Trigger
6. Exact Handoff Payload
7. Canonical Creation Sequence in Main App
8. Status / State Contract Between CRM and Main App
9. Return Signal / Sync-Back Contract
10. Post-Activation CRM Operating Model
11. Error / Edge-Case Handling
12. Idempotency and Re-Entry Rules
13. Ownership of Canonical Truth
14. API / Integration Surface
15. CRM Implementation Guidance
16. Final Handoff Checklist

Appendix A — Handoff Payload Matrix  
Appendix B — Status / State Mapping Matrix  
Appendix C — Return Signal / Sync-Back Matrix  
Appendix D — Field Persistence Guidance Matrix  
Appendix E — Error / Idempotency Matrix  
Appendix F — Final CRM Operator Checklist

---

## 1. Purpose

This white paper defines the authoritative operational contract for the handoff from the TexQtic
CRM system to the TexQtic Main Application at the point of customer registration, tenant
provisioning, first-owner access issuance, and activation confirmation.

It answers ten fundamental operational questions that CRM operators and integration implementers
need to carry a verified customer account from CRM approval through to a live, activated platform
tenant:

1. What exact CRM state is the lawful handoff trigger?
2. What exact provisioning request shape and auth model are used?
3. What exact Main App objects are created atomically?
4. What is the exact difference between `orgId` and `orchestrationReference`?
5. What does CRM receive immediately in the provisioning response?
6. What must CRM do with the raw invite token?
7. What exact polling endpoint and lookup rules are used after provisioning?
8. What exact signal tells CRM the first owner has activated?
9. What exact field set should CRM persist after provisioning and after activation?
10. What is still pending implementation but not blocking this white paper?

This white paper does not define CRM-side schema, CRM field names, or CRM internal data models.
It does not redesign the existing Main App runtime. It documents what is already implemented and
what CRM must do to interface with it correctly.

---

## 2. Audience

| Audience | How to use this document |
|---|---|
| CRM team / onboarding engineers | Read Sections 5–12 and all appendices for operational integration details |
| Sales operations / onboarding coordinators | Read Sections 3–5 and Section 16 (checklist) |
| CRM team leads and product owners | Read Sections 4, 13, and the pending-items summary in Section 10.3 |
| Main App integration implementers | Read Sections 6–9, 14, and Appendices A–E for exact API contracts |

---

## 3. Funnel / System Context

The TexQtic customer journey passes through three bounded systems before a customer is fully
live on the platform. Each system owns a distinct phase:

```
MARKETING                  CRM                         MAIN APPLICATION
   │                         │                               │
Website request   →   Lead / Onboarding case  →   Platform Tenant + Organization
                              │                               │
                         CRM Approval                  First-Owner Invite
                              │                               │
                       Handoff trigger            Invite delivery / Activation
                                                              │
                                              Activation complete signal → CRM reflection
```

**Key design rule:** The full journey does not collapse into one object. It is a chain of bounded
objects with explicit handoffs. None of the following are the same thing:

- Raw submission ≠ lead ≠ onboarding case ≠ customer account
- Onboarding case ≠ platform tenant
- CRM issuance record ≠ platform invite
- CRM activation completion ≠ platform activation signal
- CRM customer account ≠ platform tenant or platform organization

**CONFIRMED REPO TRUTH:** The platform owns `Tenant`, `Organization`, `Invite`, `Membership`, and
`User` as distinct runtime objects. None of these are CRM objects.

**The five canonical pre-activation objects in the cross-system chain:**

| Object | Owned by | Role in handoff |
|---|---|---|
| Onboarding Case | CRM | Pre-runtime cross-system orchestration anchor |
| Approved Onboarding Case | CRM | Lawful trigger for platform provisioning |
| Platform Tenant | Main App | Runtime tenancy root — workspace, auth, invite, membership scope |
| Platform Organization | Main App | Runtime commercial identity paired to tenant (1:1) |
| First-Owner Access Preparation (Invite) | Main App | Mechanism for delivering platform access to the designated first owner |

---

## 4. Boundary of Authority

### 4.1 CRM Authority (Pre-Runtime)

CRM is the system of record and lawful authority for everything that happens before platform
runtime exists:

| Phase | CRM owns |
|---|---|
| Website intake processing | Raw submission intake, deduplication, initial storage |
| Lead qualification | Lead state, qualification decision, commercial eligibility |
| Onboarding case progression | Case state, KYC/KYB posture, document review, approval decision |
| Approval for provisioning | The decision to approve: CRM admin approval is the legal/business gate |
| Pre-activation bridge reference | The `orchestrationReference` (onboarding case ID) carried as the cross-system anchor |
| First-owner contact identity | The designation of who should receive platform access |

**CONFIRMED REPO TRUTH:** CRM generates the `orchestrationReference`. The Main App stores it
but never generates it. CRM owns this value for the lifetime of the cross-system relationship.

### 4.2 Main App Authority (Post-Provisioning)

Main App becomes the system of record for all runtime facts from the moment provisioning is
successfully called:

| Phase | Main App owns |
|---|---|
| Platform tenant identity | `tenants.id` — the durable platform UUID |
| Platform organization identity | `organizations.id` — identical to `tenants.id`, paired 1:1 |
| Organization legal/compliance posture | `organizations.status`, `organizations.jurisdiction`, `organizations.legal_name` |
| First-owner invite | `invites` row — scoped to the tenant, with `invitePurpose = 'FIRST_OWNER_PREPARATION'` |
| First-owner activation | `Membership` row with `role = 'OWNER'`, created when invite is accepted |
| Platform user identity | `User` row — created when first owner signs up through the invite |
| Activation signal | `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` — derived runtime state |
| Post-activation status | `organizationStatus`, membership, plan entitlements |

### 4.3 The Handoff Seam

The handoff seam is the single API call where CRM authority ends and Main App authority begins:

```
POST /api/control/tenants/provision
```

After a successful 201 response from this endpoint:

- The platform tenant and organization exist and are owned by the Main App
- `orgId` is the permanent runtime identifier — owned by Main App
- `orchestrationReference` is retained by both systems as a cross-system traceability join key

### 4.4 What CRM Must Never Overwrite After Handoff

After provisioning succeeds, CRM must NOT:

- Infer or modify `organizationStatus` independently
- Assume email is a stable runtime join key
- Use `slug` as a servicing reference (it may change)
- Assume `userId` or `membershipId` are available before activation
- Treat `orgId` as optional — it is mandatory and must be stored at provisioning time
- Treat `inviteToken` as re-retrievable — it is a one-time secret

---

## 5. Exact Handoff Trigger

### 5.1 The Lawful Trigger

**CONFIRMED REPO TRUTH (source: `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`,
Handoff Contract Decision A):**

The lawful trigger for platform provisioning is **CRM admin approval of the onboarding case.**

This means:

- Onboarding case status transitions from a pending review state to `admin_approved` (or
  equivalent approval milestone in CRM)
- KYC/KYB review is complete (to the extent required for this customer)
- The designated first-owner contact is confirmed
- CRM has the orchestration reference for this onboarding case

**Justification:**
- Lead qualification is too early — creating runtime tenants for unapproved prospects is wrong
- CRM issuance is too late — issuance should dispatch access to a runtime object that already exists
- CRM admin approval is the clean business gate where the prospect has passed onboarding
  sufficiently to justify creating runtime tenancy

### 5.2 Direct Answer: Q1

> **What exact CRM state is the lawful handoff trigger?**

The CRM onboarding case must be in an admin-approved state. The following conditions must all be
true before CRM calls the provisioning endpoint:

| Condition | Required state |
|---|---|
| Onboarding case | CRM admin-approved |
| KYC/KYB posture | Cleared (to the extent required by customer profile) |
| First-owner contact | Designated and confirmed in CRM |
| Orchestration reference | Available on the onboarding case |
| Provisioning mode | CRM service-token path uses `APPROVED_ONBOARDING` |

### 5.3 What Must NOT Trigger Provisioning

| Trigger | Status |
|---|---|
| Lead qualification alone | FORBIDDEN — too early |
| CRM issuance dispatch alone | FORBIDDEN — too late |
| Marketing form submission | FORBIDDEN — no business approval |
| First-owner email confirmation | FORBIDDEN — not a business approval gate |
| CRM customer account creation | FORBIDDEN — account follows provisioning, does not precede it |

---

## 6. Exact Handoff Payload

### 6.1 Direct Answer: Q2

> **What exact provisioning request shape and auth model are used?**

**CONFIRMED REPO TRUTH (source: `server/src/routes/admin/tenantProvision.ts`,
`server/src/types/tenantProvision.types.ts`):**

**Endpoint:**
```
POST /api/control/tenants/provision
Content-Type: application/json
Authorization: Bearer <CRM_SERVICE_TOKEN>
```

**Authentication:** CRM must use the shared service bearer token
(`APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` environment variable on the platform side). The token
is validated via SHA-256 timing-safe comparison. This is the `APPROVED_ONBOARDING` mode service
path. The CRM service token cannot invoke the `LEGACY_ADMIN` provisioning path — the route
enforces this gate at authentication time.

**Request payload (APPROVED_ONBOARDING mode):**

```json
{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orchestrationReference": "<string>",
  "tenantName": "<string>",
  "tenantSlug": "<string>",
  "organization": {
    "legalName": "<string>",
    "jurisdiction": "<string>",
    "registrationNumber": "<string | optional>"
  },
  "firstOwner": {
    "email": "<string>",
    "role": "OWNER"
  }
}
```

**Field-by-field notes:**

| Field | Required | Notes |
|---|---|---|
| `provisioningMode` | Yes | Must be `"APPROVED_ONBOARDING"` for CRM service-token path |
| `orchestrationReference` | Yes | CRM-owned, CRM-generated onboarding case identifier. Max 255 chars. Must be unique across all provisioning calls. This is what CRM uses for idempotency. |
| `tenantName` | Yes | Platform tenant display name. Must be unique on the platform. |
| `tenantSlug` | Yes | URL-safe slug. Must be unique on the platform. |
| `organization.legalName` | Yes | Legal name of the organization. Must be unique on the platform. |
| `organization.jurisdiction` | Yes | Jurisdiction string (e.g., `"GB"`, `"US"`, `"IN"`). Defaults to `"UNKNOWN"` if not provided. |
| `organization.registrationNumber` | No | Optional company/VAT/registration number. |
| `firstOwner.email` | Yes | Email address for the designated first owner. Used to address the platform invite. |
| `firstOwner.role` | Yes | Must be `"OWNER"`. CRM cannot assign other roles through this path. |

---

## 7. Canonical Creation Sequence in Main App

### 7.1 Direct Answer: Q3

> **What exact Main App objects are created atomically?**

**CONFIRMED REPO TRUTH (source: `server/src/services/tenantProvision.service.ts`,
single `prisma.$transaction` with 20-second timeout):**

The Main App creates exactly three objects atomically in a single database transaction:

```
1. Tenant row (tenants table)
   └── id: new UUID (this becomes orgId)
   └── name: from tenantName
   └── slug: from tenantSlug
   └── externalOrchestrationRef: from orchestrationReference
   └── type: "B2B" (APPROVED_ONBOARDING path)
   └── status: "ACTIVE"
   └── plan: as configured

2. Organization row (organizations table)
   └── id: SAME UUID as Tenant.id (enforced by FK + cascade)
   └── legal_name: from organization.legalName
   └── jurisdiction: from organization.jurisdiction
   └── registration_no: from organization.registrationNumber
   └── external_orchestration_ref: SAME VALUE as tenants.externalOrchestrationRef
   └── status: "VERIFICATION_APPROVED"

3. Invite row (invites table)
   └── id: new UUID (this becomes inviteId)
   └── tenant_id: = Tenant.id
   └── email: from firstOwner.email
   └── external_orchestration_ref: SAME VALUE (indexed, not unique)
   └── invite_purpose: "FIRST_OWNER_PREPARATION"
   └── role: "OWNER"
   └── token_hash: SHA-256 of the raw invite token
   └── expires_at: NOW + 7 days
```

**Critical atomicity guarantee:**
- If the transaction fails for any reason (DB error, constraint violation, timeout), NONE of the
  three objects are created. The platform cannot end up in a half-provisioned state from a single
  call.
- If the call succeeds (201), all three rows exist and are durable.

**What is NOT created at provisioning time:**
- No `User` row (user does not exist yet)
- No `Membership` row (membership is deferred to activation)

**What CRM must understand:** After a 201 response, the tenant exists and the first-owner invite
exists, but the first owner is not yet a registered user and has no membership. The customer is
in the "provisioned but not yet activated" state.

### 7.2 Direct Answer: Q4

> **What is the exact difference between `orgId` and `orchestrationReference`?**

**CONFIRMED REPO TRUTH (source:
`docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md`, §3):**

| Property | `orgId` | `orchestrationReference` |
|---|---|---|
| **Who generates it** | Main App (platform-issued UUID) | CRM (CRM-generated, sent in request) |
| **DB column** | `tenants.id` = `organizations.id` (PK) | `tenants.external_orchestration_ref` (`@unique`) |
| **When it is first available** | In the 201 provisioning response | Before provisioning — CRM owns it from the onboarding case |
| **Stability** | Never changes after provisioning | Never changes after provisioning |
| **Primary use** | Permanent platform runtime identifier; long-term CRM servicing reference | Cross-system traceability join key; CRM lookup into platform by onboarding case |
| **CRM must store** | YES — mandatory | YES — SHOULD retain |
| **Main App lookup** | `GET /status?orgId=` | `GET /status?orchestrationReference=` |
| **Long-term role** | Primary servicing reference | Audit traceability join key |

**The rule:**
- `orgId` = platform identity (permanent, platform-issued, cannot be lost without breaking the
  link)
- `orchestrationReference` = cross-system traceability (CRM-issued, echoed by platform, retained
  for audit join)

CRM must store both. CRM must use `orgId` as the primary reference for all post-activation
servicing queries.

---

## 8. Status / State Contract Between CRM and Main App

### 8.1 Provisioning States

After a successful provisioning call (201 response), the tenant transitions through the following
observable states:

| State | Meaning | Observable evidence |
|---|---|---|
| **PROVISIONED** | Tenant + organization + first-owner invite exist; invite not yet accepted by first owner | `provisioningStatus = 'PROVISIONED'`, `activation.isActivated = false`, `activation.activationSignal = null` |
| **ACTIVATED** | First owner has accepted the invite, OWNER membership exists, organization is in a post-activation status | `provisioningStatus = 'ACTIVATED'`, `activation.isActivated = true`, `activation.activationSignal = 'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION'` |

### 8.2 Organization Status Values

The `organizationStatus` field in the polling response carries the platform's internal
organizational lifecycle status:

| Value | Meaning | When set |
|---|---|---|
| `VERIFICATION_APPROVED` | CRM approval recorded; platform provisioned; first owner not yet activated | Set at provisioning by `APPROVED_ONBOARDING` path |
| `PENDING_VERIFICATION` | First owner activated; awaiting platform admin document review | Set at `POST /api/tenant/activate` by first owner |
| `ACTIVE` | Fully verified and operationally active | `[PENDING IMPLEMENTATION]` — no confirmed code path in current release |
| `SUSPENDED` | Account suspended by admin action | Admin action |
| `CLOSED` | Account closed | Admin action |
| `VERIFICATION_REJECTED` | Platform verification rejected | Admin action |
| `VERIFICATION_NEEDS_MORE_INFO` | Additional documents required | Admin action |

**CRM OPERATIONAL GUIDANCE:** CRM must NOT wait for `organizationStatus = 'ACTIVE'` to consider
a tenant activated for CRM-side reflection purposes. The confirmed activation signal is
`provisioningStatus = 'ACTIVATED'` and `activation.isActivated = true`. These are the correct
CRM-facing activation gates.

### 8.3 Invite States

The invite (first-owner access preparation) can be in one of three observable states:

| Invite observable state | `expiresAt` | `acceptedAt` | Meaning |
|---|---|---|---|
| Active, not yet used | Future | null | Invite is live; first owner has not yet accepted |
| Accepted | Any | Non-null | First owner completed activation; this is the activation timestamp proxy |
| Expired, not used | Past | null | Invite window has lapsed; token is invalid; resend needed |

**`[PENDING IMPLEMENTATION]`:** There is no CRM-callable API to resend the invite token. If the
invite expires and the first owner has not activated, a platform admin resend flow is required.
CRM cannot re-trigger invite delivery autonomously at this time.

---

## 9. Return Signal / Sync-Back Contract

### 9.1 Direct Answer: Q5 — Provisioning Response (201)

> **What does CRM receive immediately in the provisioning response?**

**CONFIRMED REPO TRUTH (source: `server/src/routes/admin/tenantProvision.ts` — 201 response shape,
`server/src/types/tenantProvision.types.ts`):**

```json
{
  "success": true,
  "data": {
    "orgId": "<UUID>",
    "orchestrationReference": "<string>",
    "provisioningMode": "APPROVED_ONBOARDING",
    "slug": "<string>",
    "organization": {
      "legalName": "<string>",
      "jurisdiction": "<string>",
      "registrationNumber": "<string | null>",
      "status": "VERIFICATION_APPROVED"
    },
    "firstOwnerAccessPreparation": {
      "inviteId": "<UUID>",
      "invitePurpose": "FIRST_OWNER_PREPARATION",
      "email": "<email>",
      "role": "OWNER",
      "expiresAt": "<ISO 8601 timestamp>",
      "artifactType": "PLATFORM_INVITE",
      "inviteToken": "<raw_token_string>"
    },
    "userId": null,
    "membershipId": null
  }
}
```

**Key observations:**
- `userId` and `membershipId` are `null` — user and membership do not exist at provisioning time
- `inviteToken` is a cleartext raw token — this is a one-time secret (see §9.2)
- `organization.status` will be `"VERIFICATION_APPROVED"` — this is the platform's reflection of
  the CRM approval

### 9.2 Direct Answer: Q6 — The Invite Token

> **What must CRM do with the raw invite token?**

**CONFIRMED REPO TRUTH:** The raw invite token returned in
`firstOwnerAccessPreparation.inviteToken` is:

- Returned **once** — in the 201 provisioning response only
- **NOT stored in the Main App database** — only the SHA-256 hash is stored
- A **single-use credential** — invalidated on acceptance
- A **7-day TTL credential** — expires at `firstOwnerAccessPreparation.expiresAt`

**ONE-TIME SECRET — DO NOT PERSIST LONG-TERM**

CRM must handle this token as follows:

| Step | Required action |
|---|---|
| Receive the 201 response | Extract `inviteToken` immediately |
| Construct the invite URL | `{FRONTEND_URL}/accept-invite?token={inviteToken}&action=invite` where `{FRONTEND_URL}` is `https://app.texqtic.com` (or environment-specific URL) |
| Deliver to first owner | Send the constructed invite URL to the designated first-owner email via CRM's communication channel promptly |
| Storage policy | DO NOT store the raw `inviteToken` in plaintext in a long-term CRM store. Acceptable options: (a) deliver immediately then discard, or (b) encrypt at rest with key rotation, then discard after delivery confirmation |
| On delivery failure | Escalate to platform admin for resend. The token cannot be retrieved from the Main App. A new invite must be issued through the admin resend flow. |

**What happens if the invite token is lost before delivery:**
- The token cannot be retrieved from the Main App platform
- The existing invite may be resent only through a platform admin action (invite resend flow)
- `[PENDING IMPLEMENTATION]`: There is no CRM-callable API for token re-dispatch at this time

### 9.3 Direct Answer: Q7 — Polling After Provisioning

> **What exact polling endpoint and lookup rules are used after provisioning?**

**CONFIRMED REPO TRUTH (source: `server/src/routes/admin/tenantProvision.ts` — GET route,
`server/src/services/tenantProvision.service.ts` — `queryProvisioningStatus`):**

**Endpoint:**
```
GET /api/control/tenants/provision/status
Authorization: Bearer <CRM_SERVICE_TOKEN>
```

**Query parameters (at least one required):**

| Parameter | Type | Notes |
|---|---|---|
| `orgId` | UUID string | **Preferred** — use this after the provisioning 201 response is received and `orgId` is stored |
| `orchestrationReference` | string | Acceptable — use this if `orgId` is not yet stored (e.g., immediately after call failure recovery) |

If both are provided, `orgId` takes precedence.

**CRM OPERATIONAL GUIDANCE:** Prefer `orgId` for polling after the first successful 201 response.
`orchestrationReference` is the fallback for recovery scenarios where `orgId` was not yet
persisted.

**Recommended CRM polling pattern:**

1. After the 201 provisioning response, store `orgId`, `orchestrationReference`, `inviteId`,
   and the invite expiry timestamp.
2. Deliver the invite token to the first owner immediately.
3. Poll `GET /api/control/tenants/provision/status?orgId={orgId}` at a suitable interval
   (example: every 60 seconds for the 7-day invite window).
4. Stop polling when `activation.isActivated = true` OR when `firstOwnerAccessPreparation.expiresAt`
   has passed without activation.
5. If `activation.isActivated = true`, record the activation details in the CRM customer account
   and mark the account as platform-activated.

**Polling response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "orgId": "<UUID>",
    "orchestrationReference": "<string>",
    "slug": "<string>",
    "provisioningStatus": "PROVISIONED | ACTIVATED",
    "organizationStatus": "<string>",
    "firstOwnerAccessPreparation": {
      "inviteId": "<UUID>",
      "invitePurpose": "FIRST_OWNER_PREPARATION",
      "email": "<email>",
      "expiresAt": "<ISO 8601>",
      "acceptedAt": "<ISO 8601 | null>"
    },
    "firstOwner": {
      "userId": "<UUID | null>",
      "membershipId": "<UUID | null>",
      "role": "OWNER | null"
    },
    "activation": {
      "isActivated": true,
      "activatedAt": "<ISO 8601 | null>",
      "activationSignal": "INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION | null"
    }
  }
}
```

**Note:** `firstOwner.userId`, `firstOwner.membershipId`, and `firstOwner.role` are `null`
pre-activation. These fields are populated once the activation signal fires.

### 9.4 Direct Answer: Q8 — The Activation Signal

> **What exact signal tells CRM the first owner has activated?**

**CONFIRMED REPO TRUTH (OD-002 CLOSED, commit `2ef6431`):**

The canonical Main App activation signal is:

```
activation.isActivated = true
activation.activationSignal = 'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION'
```

This signal fires when ALL THREE of the following conditions are simultaneously satisfied in the
Main App database:

| Condition | DB evidence |
|---|---|
| First-owner invite was accepted | `invites.accepted_at IS NOT NULL` (invite with `invite_purpose = 'FIRST_OWNER_PREPARATION'`) |
| OWNER membership exists | `memberships` row with `role = 'OWNER'` and `tenant_id = orgId` |
| Organization is in a post-activation status | `organizations.status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED')` |

**CRM polling rule:** When the polling response contains `activation.isActivated = true` AND
`activation.activationSignal = 'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION'`:

- The first owner has completed account setup on the platform
- `activation.activatedAt` is the canonical activation timestamp (proxy: `invites.accepted_at`)
- `firstOwner.userId` and `firstOwner.membershipId` are now populated and may be stored by CRM
  for future user-level join purposes
- CRM may now proceed to record CRM-side account activation / servicing start

**`[NOT YET IMPLEMENTED]`:** The Main App does not currently emit a push notification or webhook
to CRM when this signal fires. CRM discovers activation by polling the endpoint described in §9.3.
A platform→CRM push notification is a future capability.

---

## 10. Post-Activation CRM Operating Model

### 10.1 CRM Reflection After Activation

After the activation signal is confirmed via polling, CRM should:

1. Record that platform activation is complete in the CRM onboarding case or customer account
2. Store post-activation fields from the polling response (see Appendix D for the full field set)
3. Promote the CRM customer account to servicing-active status (CRM internal)
4. Use `orgId` as the permanent Main App reference for all future support, service, and lifecycle
   operations that require querying the platform

**CRM OPERATIONAL GUIDANCE:** The activation signal
(`INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION`) does not mean the platform has
completed full verification. The organization is in `PENDING_VERIFICATION` status — the platform
admin still needs to complete document review before setting the organization to `ACTIVE`. CRM
must communicate this clearly to customers and operators: the customer account is now on the
platform (can log in, can use the workspace), but full platform verification may still be pending.

### 10.2 Post-Activation Identifier Usage

| CRM servicing action | Identifier to use |
|---|---|
| Query platform for tenant status | `orgId` |
| Reference the onboarding case link | `orchestrationReference` (audit join) |
| Reference a support ticket to a platform user | `firstOwner.userId` (post-activation) |
| Reference a platform membership | `firstOwner.membershipId` (post-activation) |

**DO NOT use `slug` as a servicing reference.** Slug may change if the tenant is renamed.
**DO NOT use email as a cross-system join key.** Email is a validation signal only; use `firstOwner.userId` for user-level joins post-activation.

### 10.3 Pending Items — Not Blocking This White Paper

**CONFIRMED REPO TRUTH:** The following capabilities are not yet implemented on the Main App side.
They do not block the current integration but are important for CRM planning:

| Capability | Status | CRM impact |
|---|---|---|
| `organizationStatus = 'ACTIVE'` transition | `[PENDING IMPLEMENTATION]` — no confirmed code path | CRM must NOT wait for `'ACTIVE'`; use activation signal instead |
| Platform → CRM push notification / webhook | `[NOT YET IMPLEMENTED]` | CRM must use polling endpoint; push notification is a future capability |
| CRM-callable invite-token re-dispatch API | `[PENDING IMPLEMENTATION]` | If invite expires without activation, platform admin resend is required |
| Explicit `activationCompletedAt` field | Does not exist on any table | Use `activation.activatedAt` (proxy: `invites.accepted_at`) |
| `platform.tenant.activation_completed` EventLog event | `[PENDING IMPLEMENTATION]` | Not currently emitted; audit logs serve informational role |

---

## 11. Error / Edge-Case Handling

### 11.1 Provisioning Errors

**CONFIRMED REPO TRUTH (source: `server/src/routes/admin/tenantProvision.ts`):**

| HTTP status | Error code | Cause | CRM action |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid request fields | Fix the request payload; check required fields and formats |
| 401 | — | No auth header or invalid token format | Check service token configuration |
| 403 | `FORBIDDEN` | Service token mismatch; or `APPROVED_ONBOARDING` mode restriction | Verify service token; ensure `provisioningMode = 'APPROVED_ONBOARDING'` |
| 409 | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | A tenant with this orchestration reference already exists | Do NOT retry; query `GET /status?orchestrationReference=` to retrieve existing `orgId` and status |
| 409 | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | An organization with this name or slug already exists | Investigate naming conflict; not an idempotent re-submission; resolve before retrying |
| 500 | `PROVISION_ABORT` | Admin context stop-loss triggered | Retry once; if recurs, escalate to platform engineering |
| 5xx (other) | — | Transient error | Retry with exponential backoff; unique constraint will prevent duplicates |

### 11.2 Polling Errors

| HTTP status | Error code | Cause | CRM action |
|---|---|---|---|
| 400 | `MISSING_PARAMETERS` | Neither `orgId` nor `orchestrationReference` provided | Add query parameter |
| 403 | `FORBIDDEN` | Auth check passed but admin context missing | Verify service token |
| 404 | `NOT_FOUND` | No tenant found for the given identifiers | Verify `orgId` or `orchestrationReference`; if provisioning was recent, retry; if persists, escalate |
| 401/403 | — | Unauthenticated (from auth middleware) | Verify service token |

### 11.3 Invite Expiry

If the invite expires (`firstOwnerAccessPreparation.expiresAt` has passed) and
`firstOwnerAccessPreparation.acceptedAt` is still null:

- The invite token is no longer valid
- CRM cannot re-dispatch through a CRM-callable API (PENDING IMPLEMENTATION)
- CRM must contact the platform admin team to trigger a resend via the admin invite resend flow
- CRM should update the CRM onboarding case or access-issuance record to reflect the expired state

### 11.4 Transaction Failure / Half-Provisioned State

Provisioning is atomic (single `prisma.$transaction`). A partial creation is structurally
impossible from a single well-formed call. However:

- If a 5xx response is received, CRM should check whether the tenant was created by polling
  with `orchestrationReference` before retrying provisioning
- If polling returns `404`, the provisioning did not complete and the request may be safely retried
- If polling returns a valid tenant, the provisioning succeeded despite the error response; do not
  re-submit

---

## 12. Idempotency and Re-Entry Rules

### 12.1 Direct Answer: Q9

> **What exact retry/idempotency rules govern re-submission?**

**CONFIRMED REPO TRUTH:** The provisioning endpoint is safe to retry because the
`orchestrationReference` unique constraint will prevent duplicate tenant creation. CRM must follow
this protocol:

| Scenario | CRM action |
|---|---|
| Network error or timeout with no response | Query `GET /status?orchestrationReference=` before retrying; if tenant exists (200), do not re-submit; if 404, safe to retry |
| 5xx response received | Same as above — check status before retrying |
| 201 response received but not persisted by CRM | Query `GET /status?orchestrationReference=` to retrieve `orgId` and all response fields |
| 409 `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | Tenant is already provisioned; do NOT retry; query status endpoint to recover `orgId` and current state |
| 409 `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | Name/slug conflict — this is NOT an idempotent re-submission; human investigation required before retrying with a different submission |

### 12.2 Direct Answer: Q10

> **What exact statuses/errors must CRM handle?**

CRM integration must handle all error codes listed in §11.1 and §11.2. The minimum required
error-handling set is:

| Priority | Error | Must handle |
|---|---|---|
| Critical | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` (409) | YES — recover `orgId` via status query |
| Critical | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` (409) | YES — human operator escalation |
| Critical | Network timeout with no response | YES — check status before retry |
| High | `VALIDATION_ERROR` (400) | YES — fix payload before retry |
| High | `FORBIDDEN` (403) | YES — token rotation / mode check |
| Medium | `PROVISION_ABORT` (500) | YES — single retry then escalate |
| Medium | `NOT_FOUND` (404 on status) | YES — may indicate provisioning did not complete |
| Standard | Other 5xx | YES — exponential backoff + idempotency check |

### 12.3 Re-Entry from Partial CRM State

If a CRM system state is partially populated (e.g., `orgId` stored but `inviteToken` not
delivered), recovery options are:

| Partial state | Recovery |
|---|---|
| `orgId` stored but `inviteToken` not delivered | Token cannot be retrieved; contact platform admin for resend |
| `orgId` not stored but `orchestrationReference` known | Poll `GET /status?orchestrationReference=` to recover `orgId` and current status |
| Neither `orgId` nor `orchestrationReference` available | Check CRM onboarding case for `orchestrationReference`; if not present, provisioning may not have occurred |

---

## 13. Ownership of Canonical Truth

### 13.1 Direct Answer: Q12

> **What must CRM never assume or infer after handoff?**

After the provisioning 201 response is received, CRM must NOT:

| Forbidden assumption | Why |
|---|---|
| Assume `organizationStatus = 'ACTIVE'` means fully activated | `'ACTIVE'` has no confirmed code path; use the activation signal instead |
| Assume `slug` is a stable servicing key | Slug may change if the tenant is renamed; use `orgId` |
| Assume email is the cross-system user join key | Email is a validation signal; use `firstOwner.userId` post-activation |
| Assume `userId` or `membershipId` exist before activation | These fields are `null` until activation |
| Assume `inviteToken` can be retrieved again | Token is one-time only; once the provisioning response is consumed, it is gone from the Main App |
| Assume CRM can modify platform `organizationStatus` | Platform owns this field; CRM can observe it via polling |
| Assume CRM activation completion equals platform activation | CRM `client_activated` and platform `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` are correlated but distinct signals |
| Assume a platform webhook will notify CRM of activation | Webhooks are NOT YET IMPLEMENTED; use polling |
| Assume `firstOwner.userId` from the 201 response | `userId` is null at provisioning; it becomes available only after activation |

### 13.2 System-of-Record Assignment

| Data | System of record | Notes |
|---|---|---|
| Onboarding case | CRM | CRM owns the entire pre-provisioning business workflow |
| CRM approval decision | CRM | CRM is the lawful authority for who is approved |
| `orchestrationReference` | CRM | Generated by CRM; stored in platform as a cross-system join |
| `orgId` | Main App | Generated by Main App; must be stored by CRM |
| Platform `organizationStatus` | Main App | CRM observes; does not own |
| Platform activation signal | Main App | CRM polls for; does not generate |
| First-owner platform identity (`firstOwner.userId`) | Main App | Available post-activation; CRM stores for reference |
| CRM customer account lifecycle | CRM | Internal CRM business truth; Main App does not own this |
| Platform plan / entitlement | Main App | CRM observes; does not set |

---

## 14. API / Integration Surface

### 14.1 Provisioning Endpoint

| Property | Value |
|---|---|
| Method | `POST` |
| Path | `/api/control/tenants/provision` |
| Auth | `Authorization: Bearer <SERVICE_TOKEN>` (SHA-256 validated) |
| Mode | `APPROVED_ONBOARDING` (enforced) |
| Success response | `201 Created` + JSON body (see §9.1) |
| Idempotency key | `orchestrationReference` in request body |

### 14.2 Polling Endpoint

| Property | Value |
|---|---|
| Method | `GET` |
| Path | `/api/control/tenants/provision/status` |
| Auth | `Authorization: Bearer <SERVICE_TOKEN>` (same token as provisioning) |
| Query params | `?orgId=<UUID>` (preferred) or `?orchestrationReference=<string>` |
| Success response | `200 OK` + JSON body (see §9.3) |
| Error responses | `400 MISSING_PARAMETERS`, `403 FORBIDDEN`, `404 NOT_FOUND` |

### 14.3 Response Envelope

All Main App API responses follow this envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<human-readable message>"
  }
}
```

### 14.4 Platform Frontend Base URL

The first-owner invite URL is constructed as:

```
https://app.texqtic.com/accept-invite?token={inviteToken}&action=invite
```

This base URL is environment-specific. Confirm the correct `FRONTEND_URL` with the platform
engineering team for staging / sandbox environments.

### 14.5 Out of Scope

| Capability | Status |
|---|---|
| Platform → CRM webhook or push notification | `[NOT YET IMPLEMENTED]` |
| CRM-callable invite resend API | `[PENDING IMPLEMENTATION]` |
| CRM read of platform plan/entitlement | No CRM-facing plan endpoint defined in current release |
| CRM write of platform status | Forbidden — platform owns status |
| CRM read of tenant user list / membership list | No current CRM-facing endpoint for this |

---

## 15. CRM Implementation Guidance

### 15.1 Minimum Required CRM Implementation

To correctly implement the CRM → Main App handoff, the CRM system must:

1. **At onboarding approval time:**
   - Confirm `orchestrationReference` is set on the onboarding case
   - Confirm first-owner contact email is confirmed and available
   - Prepare the provisioning request payload (see §6.1)

2. **On provisioning call:**
   - Send `POST /api/control/tenants/provision` with service bearer token
   - Handle all error codes listed in §11.1
   - On 201: immediately extract and store `orgId`, `orchestrationReference`, `inviteId`, and
     `inviteToken`
   - On 409 `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE`: recover via status polling
   - On 5xx: check status before retrying

3. **On 201 response (within the same transaction):**
   - Construct the invite URL
   - Record `orgId` as the permanent Main App tenant reference
   - Record `inviteId` for resend reference
   - Record `firstOwnerAccessPreparation.expiresAt` for expiry tracking
   - Dispatch invite URL to first owner promptly (same session or within minutes)
   - Handle `inviteToken` per security policy (encrypt or discard after delivery)

4. **After provisioning — polling loop:**
   - Poll `GET /api/control/tenants/provision/status?orgId={orgId}` at suitable intervals
   - Stop polling when `activation.isActivated = true` or invite expires
   - On activation signal: record `activation.activatedAt`, `firstOwner.userId`,
     `firstOwner.membershipId`
   - Update CRM customer account to platform-activated status

### 15.2 Direct Answer: Q11

> **What exact CRM fields/statuses/taxonomy are advisory only and not canonical in Main App?**

**EVIDENCE-ONLY** fields (CRM may store for display/audit; do not use as servicing keys):

| Field | Label |
|---|---|
| `provisioningMode` | EVIDENCE-ONLY — confirms CRM path was used |
| `slug` | ADVISORY DISPLAY FIELD — may change |
| `organization.legalName` | EVIDENCE-ONLY — platform echo; CRM owns the canonical legal name for business ops |
| `organization.jurisdiction` | EVIDENCE-ONLY — useful for audit; CRM holds the authoritative submission value |
| `organization.status` | EVIDENCE-ONLY — platform's internal status; CRM must not infer activation solely from this |
| `firstOwnerAccessPreparation.invitePurpose` | EVIDENCE-ONLY — confirms invite type |
| `firstOwnerAccessPreparation.email` | EVIDENCE-ONLY — validation cross-check; not a join key |
| `firstOwnerAccessPreparation.role` | EVIDENCE-ONLY — confirms role assignment |
| `firstOwnerAccessPreparation.artifactType` | EVIDENCE-ONLY — reserved for extensibility |
| `activation.isActivated` | EVIDENCE-ONLY — the key CRM-actionable signal |
| `activation.activationSignal` | EVIDENCE-ONLY — canonical string value for audit/logging |

**Fields that are NOT canonical for CRM after provisioning:**
- `userId` (null at provisioning, becomes EVIDENCE-ONLY post-activation for user-level joins)
- `membershipId` (null at provisioning, becomes EVIDENCE-ONLY post-activation)
- `firstOwner.role` in polling response (always `'OWNER'` post-activation; advisory)

### 15.3 Security Checklist for CRM Integration

| Item | Requirement |
|---|---|
| Service token storage | Store service bearer token in a secrets manager or encrypted vault; never in code |
| Service token rotation | Establish a rotation schedule with the platform team |
| `inviteToken` handling | Do not log, print, or store the raw token in plaintext |
| `inviteToken` transmission | Deliver over HTTPS only; never over unencrypted channels |
| Polling authentication | Use the same service token as provisioning |
| Error logging | Do not log full request payloads if they contain PII (email, legal names) |

---

## 16. Final Handoff Checklist

This section answers the core checklist questions for CRM operators authorizing a provisioning
handoff.

### Pre-Provisioning Gate (All items must be true before calling the provisioning endpoint)

- [ ] Onboarding case is CRM admin-approved
- [ ] KYC/KYB review is complete (to the extent applicable)
- [ ] First-owner contact email is confirmed and available
- [ ] `orchestrationReference` (onboarding case ID) is available and correct
- [ ] Tenant name and slug are determined and expected to be unique
- [ ] Organization legal name is confirmed
- [ ] Service bearer token is configured and available in the CRM integration layer
- [ ] CRM integration has a secure method to store `orgId` and `inviteToken` after the response

### Post-Provisioning Required Actions (Within the session of the 201 response)

- [ ] `orgId` stored as permanent Main App tenant reference in CRM
- [ ] `orchestrationReference` confirmed and retained as audit traceability join
- [ ] `inviteId` stored for resend reference and audit
- [ ] `firstOwnerAccessPreparation.expiresAt` recorded for invite expiry tracking
- [ ] Invite URL constructed: `{FRONTEND_URL}/accept-invite?token={inviteToken}&action=invite`
- [ ] Invite URL dispatched to first-owner email promptly
- [ ] `inviteToken` handled per CRM security policy (encrypted then discarded, or immediately discarded after delivery)

### Polling Phase Operating Rules

- [ ] Polling is configured to use `orgId` as the query parameter
- [ ] Polling interval is appropriate (example: 60 seconds)
- [ ] Polling stops at `activation.isActivated = true` OR at invite expiry
- [ ] CRM handles null `firstOwner.*` gracefully (pre-activation phase)

### Post-Activation Required Actions (When activation signal fires)

- [ ] `activation.activatedAt` recorded as the platform-side activation timestamp
- [ ] `firstOwner.userId` stored for future user-level cross-system joins
- [ ] `firstOwner.membershipId` stored for reference
- [ ] CRM onboarding case status updated to reflect platform activation
- [ ] CRM customer account promoted to servicing-active status (CRM internal)
- [ ] CRM operator informed if `organizationStatus` is still `PENDING_VERIFICATION` (platform admin review still pending)

### What Must NOT Happen

- [ ] Do NOT use `slug` as a long-term servicing reference
- [ ] Do NOT use email as the cross-system user join key
- [ ] Do NOT wait for `organizationStatus = 'ACTIVE'` as the activation gate
- [ ] Do NOT store `inviteToken` in plaintext long-term
- [ ] Do NOT assume CRM activation equals platform activation
- [ ] Do NOT submit provisioning again on 409 `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE`
- [ ] Do NOT modify platform `organizationStatus` from CRM
- [ ] Do NOT expect a webhook — use the polling endpoint

---

## Appendix A — Handoff Payload Matrix

**Source:** `POST /api/control/tenants/provision` request body (`APPROVED_ONBOARDING` mode)

| Field | Required | Type | Description | CRM source |
|---|---|---|---|---|
| `provisioningMode` | Yes | enum | Must be `"APPROVED_ONBOARDING"` | Constant |
| `orchestrationReference` | Yes | string (max 255) | CRM-generated onboarding case identifier | CRM onboarding case ID |
| `tenantName` | Yes | string | Platform tenant display name; must be unique | From CRM onboarding case |
| `tenantSlug` | Yes | string | URL-safe slug; must be unique | Generated by CRM or entered during onboarding |
| `organization.legalName` | Yes | string | Organization legal name; must be unique | From CRM onboarding case |
| `organization.jurisdiction` | Yes | string | Jurisdiction code | From KYB review |
| `organization.registrationNumber` | No | string | Company/VAT/registration number | Optional from KYB review |
| `firstOwner.email` | Yes | email | First-owner contact email | From CRM onboarding contact record |
| `firstOwner.role` | Yes | enum | Must be `"OWNER"` | Constant |

---

## Appendix B — Status / State Mapping Matrix

**Source:** `GET /api/control/tenants/provision/status` response — `provisioningStatus` and
`organizationStatus`

| `provisioningStatus` | `activation.isActivated` | `activation.activationSignal` | `organizationStatus` | Business meaning for CRM |
|---|---|---|---|---|
| `PROVISIONED` | `false` | `null` | `VERIFICATION_APPROVED` | Tenant exists; first owner has not yet accepted the invite |
| `PROVISIONED` | `false` | `null` | `VERIFICATION_APPROVED` | Invite has been re-sent (same state; invite resent by admin) |
| `ACTIVATED` | `true` | `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` | `PENDING_VERIFICATION` | First owner accepted invite; platform admin review pending |
| `ACTIVATED` | `true` | `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` | `ACTIVE` | `[PENDING IMPLEMENTATION]` — fully verified; no confirmed code path |
| `ACTIVATED` | `true` | `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` | `SUSPENDED` | Tenant suspended by admin after activation |
| `ACTIVATED` | `true` | `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` | `CLOSED` | Tenant closed by admin |

**CRM action rule:** CRM should gate its customer-account activation on `activation.isActivated = true`.
The `organizationStatus` is supplemental evidence for CRM operator display, not the activation gate.

---

## Appendix C — Return Signal / Sync-Back Matrix

### At Provisioning (201 Response)

| Field | Classification | CRM action |
|---|---|---|
| `orgId` | CANONICAL PLATFORM IDENTIFIER | **MUST store** — permanent Main App tenant reference |
| `orchestrationReference` | CANONICAL PLATFORM IDENTIFIER | **SHOULD retain** — cross-system traceability join |
| `provisioningMode` | EVIDENCE-ONLY | Optional; confirms CRM path |
| `slug` | ADVISORY DISPLAY FIELD | Optional; may use for display |
| `organization.legalName` | EVIDENCE-ONLY | Optional; useful for human reconciliation |
| `organization.jurisdiction` | EVIDENCE-ONLY | Optional |
| `organization.registrationNumber` | EVIDENCE-ONLY | Optional |
| `organization.status` | EVIDENCE-ONLY | Confirms provisioning accepted |
| `firstOwnerAccessPreparation.inviteId` | EVIDENCE-ONLY | **SHOULD store** — for resend reference |
| `firstOwnerAccessPreparation.invitePurpose` | EVIDENCE-ONLY | Confirms invite type |
| `firstOwnerAccessPreparation.email` | EVIDENCE-ONLY | Validation cross-check |
| `firstOwnerAccessPreparation.role` | EVIDENCE-ONLY | Confirms role |
| `firstOwnerAccessPreparation.expiresAt` | ADVISORY DISPLAY FIELD | Store for expiry tracking |
| `firstOwnerAccessPreparation.artifactType` | EVIDENCE-ONLY | Reserved |
| `firstOwnerAccessPreparation.inviteToken` | **ONE-TIME SECRET** | **MUST capture + deliver + discard** |
| `userId` | NOT APPLICABLE AT THIS PHASE | Ignore; null |
| `membershipId` | NOT APPLICABLE AT THIS PHASE | Ignore; null |

### At Activation (Polling Response When `activation.isActivated = true`)

| Field | Classification | CRM action |
|---|---|---|
| `activation.isActivated` | EVIDENCE-ONLY | Key activation gate — act on this |
| `activation.activatedAt` | EVIDENCE-ONLY | Store as activation timestamp |
| `activation.activationSignal` | EVIDENCE-ONLY | Store for audit log |
| `firstOwner.userId` | EVIDENCE-ONLY | **SHOULD store** — for user-level joins |
| `firstOwner.membershipId` | EVIDENCE-ONLY | **SHOULD store** — for reference |
| `firstOwner.role` | EVIDENCE-ONLY | Always `'OWNER'` post-activation |
| `firstOwnerAccessPreparation.acceptedAt` | EVIDENCE-ONLY | Store as invite-acceptance timestamp |
| `organizationStatus` | EVIDENCE-ONLY | Observe; inform CRM operators if still `PENDING_VERIFICATION` |

---

## Appendix D — Field Persistence Guidance Matrix

| Field | Persist in CRM? | Long-term storage | Notes |
|---|---|---|---|
| `orgId` | **YES — MANDATORY** | Permanent | Primary Main App tenant reference |
| `orchestrationReference` | **YES — MANDATORY** | Permanent | Cross-system traceability join |
| `firstOwnerAccessPreparation.inviteId` | YES | Long-term | For resend reference and audit |
| `firstOwnerAccessPreparation.expiresAt` | YES | Until activation | For expiry tracking and operator display |
| `organization.legalName` | OPTIONAL | Long-term | For human reconciliation |
| `organization.status` | OPTIONAL | Transient / refreshed on poll | Observe via polling; do not cache long-term without refresh |
| `activation.activatedAt` | YES | Permanent | Activation timestamp |
| `activation.activationSignal` | YES | Permanent | Audit log record |
| `firstOwner.userId` | YES | Permanent | For future user-level CRM→platform joins |
| `firstOwner.membershipId` | YES | Permanent | For reference |
| `slug` | OPTIONAL | Advisory only | Do not use as lookup key |
| `firstOwnerAccessPreparation.email` | DO NOT PERSIST as a join key | Validation only | Already exists as CRM contact; do not create a platform→CRM email join |
| `firstOwnerAccessPreparation.inviteToken` | **DO NOT PERSIST LONG-TERM** | Deliver then discard or encrypt+discard | ONE-TIME SECRET |
| `provisioningMode` | OPTIONAL | Advisory | Confirms CRM path was used |

---

## Appendix E — Error / Idempotency Matrix

### Provisioning Errors

| HTTP | Error code | Cause | Safe to retry? | CRM action |
|---|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing fields | Yes, after fix | Fix payload; re-submit |
| 401/403 | — | Auth failure | Yes, after fix | Check service token |
| 403 | `FORBIDDEN` | Mode restriction or token mismatch | Yes, after fix | Verify `APPROVED_ONBOARDING` mode and token |
| 409 | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | Already provisioned | **NO** | Query status; recover `orgId` |
| 409 | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | Duplicate name/slug | No without human resolution | Escalate; investigate name conflict |
| 500 | `PROVISION_ABORT` | Stop-loss triggered | Once | Single retry; escalate if recurs |
| 5xx (other) | — | Transient | Yes, with backoff | Check status before retry; backoff retry |

### Pre-Retry Idempotency Check

Before any retry after an ambiguous response (timeout, 5xx, no response received):

```
GET /api/control/tenants/provision/status?orchestrationReference={ref}
```

- Response 200 → Provisioning succeeded; do not re-submit; use returned `orgId`
- Response 404 → Provisioning did not complete; safe to retry

### Invite Expiry Recovery

| State | Recovery path |
|---|---|
| Invite expired, activation pending | Contact platform admin for invite resend |
| CRM-callable resend API | `[PENDING IMPLEMENTATION]` — not available at this time |
| After resend by admin | Resume polling |

---

## Appendix F — Final CRM Operator Checklist

Use this checklist for every CRM → Main App provisioning handoff operation:

### Pre-Handoff Verification

```
[ ] Onboarding case: admin_approved
[ ] KYC/KYB: cleared (as applicable)
[ ] First-owner contact email: confirmed
[ ] orchestrationReference: present on onboarding case
[ ] Tenant name and slug: selected, expected to be unique
[ ] Organization legal name: confirmed
[ ] Service token: configured and available
[ ] Secure storage for orgId and inviteToken: ready
```

### Provisioning Call

```
[ ] POST /api/control/tenants/provision called with APPROVED_ONBOARDING mode
[ ] Response received
[ ] If 201: proceed to post-provisioning steps
[ ] If 409 CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE: query status endpoint
[ ] If other error: handle per error matrix (Appendix E)
```

### Post-Provisioning (Within Response Session)

```
[ ] orgId extracted and stored (MANDATORY)
[ ] orchestrationReference confirmed and retained
[ ] inviteId stored
[ ] firstOwnerAccessPreparation.expiresAt recorded
[ ] Invite URL constructed: {FRONTEND_URL}/accept-invite?token={inviteToken}&action=invite
[ ] Invite URL dispatched to first-owner email
[ ] inviteToken handled per security policy (deliver then discard or encrypt)
[ ] CRM onboarding case status updated to reflect provisioning complete
```

### Polling Phase

```
[ ] Polling configured: GET /api/control/tenants/provision/status?orgId={orgId}
[ ] Polling interval: appropriate (e.g., 60 seconds)
[ ] Stop condition: activation.isActivated = true OR invite expiry
[ ] Null field handling: configured (pre-activation nulls are not errors)
```

### Post-Activation (On Activation Signal)

```
[ ] activation.activatedAt recorded
[ ] firstOwner.userId stored
[ ] firstOwner.membershipId stored
[ ] CRM customer account promoted to platform-activated status
[ ] CRM onboarding case closed / transitioned
[ ] CRM operator notified if organizationStatus = 'PENDING_VERIFICATION' (platform review still pending)
```

### What Must NOT Happen

```
[ ] NOT: re-submitted provisioning on 409 CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE
[ ] NOT: slug used as a long-term servicing reference
[ ] NOT: email used as a cross-system user join key
[ ] NOT: waited for organizationStatus = 'ACTIVE' as the activation gate
[ ] NOT: inviteToken stored in plaintext long-term
[ ] NOT: assumed CRM activation equals platform activation
[ ] NOT: expected a webhook — polling is the integration mechanism
```

---

*TexQtic — CRM → Main Application Registration / Activation Handoff White Paper v1.0*  
*Grounded in confirmed Main App repo truth. Supersedes informal onboarding documentation.*  
*For revisions, raise a governance prompt with an explicit allowlist and commit scope.*
