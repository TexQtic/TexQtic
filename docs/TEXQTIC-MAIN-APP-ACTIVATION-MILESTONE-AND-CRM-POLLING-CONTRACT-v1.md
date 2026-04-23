# TexQtic Main App — Activation Milestone and CRM Provisioning Status Polling Contract

**Version:** 1.0  
**Date:** 2026-05-27  
**Scope:** Main App platform (TexQtic) — control-plane backend  
**Status:** IMPLEMENTED  
**Closes:** OD-002 (activation-complete signal), OD-005 (CRM polling mechanism)  
**Partially closes:** OD-004 (409 conflict code ambiguity)  
**Commit:** `[IMPLEMENTATION] add activation milestone and CRM-safe provisioning status polling contract`

---

## 1. Purpose

This document records the implementation decisions and technical contract for:

1. **Activation-complete milestone** — the canonical platform-side signal that a provisioned
   tenant's first owner has completed account setup.
2. **CRM-safe provisioning status polling endpoint** — a read-only endpoint the CRM system can
   query to learn whether a provisioned tenant has activated.
3. **Tightened 409 conflict codes** — specific, machine-readable conflict codes replacing the
   prior generic `CONFLICT` code.

This artifact is the handoff contract between the TexQtic Main App and the CRM/onboarding system.
It is authoritative for the polling contract only. CRM-side integration and webhook implementation
remain out of scope.

---

## 2. Activation-Complete Milestone (OD-002 CLOSED)

### 2.1 Definition

The activation-complete milestone is **derived** from existing platform records. No schema change
is required.

**Canonical activation signal:**
```
INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION
```

### 2.2 Derivation Logic

Activation is considered complete when ALL of the following conditions are true:

| Condition | Source | Rule |
|---|---|---|
| First-owner invite accepted | `invites.acceptedAt` | IS NOT NULL |
| Owner membership exists | `memberships.role` | = 'OWNER' for this tenant |
| Org status is post-activation | `organizations.status` | IN { PENDING_VERIFICATION, ACTIVE, SUSPENDED, CLOSED } |

**Rationale for post-activation statuses:**

- After provisioning, org status is `VERIFICATION_APPROVED` (awaiting first-owner setup).
- When first owner accepts the invite, the platform transitions org status to `PENDING_VERIFICATION`
  (awaiting operator review/KYC).
- `ACTIVE`, `SUSPENDED`, and `CLOSED` represent subsequent lifecycle states — all post-activation.
- `VERIFICATION_APPROVED` and `VERIFICATION_REJECTED` are NOT post-activation statuses; they
  indicate the tenant exists but the first owner has not completed setup.

### 2.3 Why Derived (Not Persisted)

The user expressed a preference for derived status over new schema. The activation signal is
stable and unambiguous because:

- `invite.acceptedAt` is set atomically when the first owner accepts the invite.
- The OWNER membership is created as part of the same invite-acceptance flow.
- Org status transitions to `PENDING_VERIFICATION` as part of the same flow.

Adding a dedicated `activationCompletedAt` column would be redundant — `invite.acceptedAt` on the
`FIRST_OWNER_PREPARATION` invite IS the activation timestamp.

---

## 3. CRM Provisioning Status Polling Contract (OD-005 CLOSED)

### 3.1 Endpoint

```
GET /api/control/tenants/provision/status
```

### 3.2 Authentication

Two valid auth paths (identical to `POST /api/control/tenants/provision`):

| Path | Mechanism |
|---|---|
| Service bearer token | `Authorization: Bearer <token>` matching SHA-256 vs `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` |
| Admin JWT | Supabase JWT + SUPER_ADMIN role |

Unauthenticated requests return 401 or 403.

### 3.3 Query Parameters

At least one of the following must be provided:

| Parameter | Type | Description |
|---|---|---|
| `orgId` | UUID string | Tenant/organization UUID (`tenants.id = organizations.id`) |
| `orchestrationReference` | string | External orchestration reference (max 255 chars) |

If both are provided, `orgId` takes precedence.

### 3.4 Response Contract

**200 OK — Tenant found:**

```json
{
  "success": true,
  "data": {
    "orgId": "<uuid>",
    "orchestrationReference": "<string | null>",
    "slug": "<string>",
    "provisioningStatus": "PROVISIONED | ACTIVATED",
    "organizationStatus": "<string>",
    "firstOwnerAccessPreparation": {
      "inviteId": "<uuid>",
      "invitePurpose": "FIRST_OWNER_PREPARATION",
      "email": "<email>",
      "expiresAt": "<ISO 8601>",
      "acceptedAt": "<ISO 8601 | null>"
    },
    "firstOwner": {
      "userId": "<uuid | null>",
      "membershipId": "<uuid | null>",
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

**`provisioningStatus` values:**

| Value | Meaning |
|---|---|
| `PROVISIONED` | Tenant + org + invite exist; first-owner invite not yet accepted |
| `ACTIVATED` | Invite accepted + OWNER membership exists + org is post-activation |

`firstOwnerAccessPreparation` is null if no `FIRST_OWNER_PREPARATION` invite exists (e.g.,
`LEGACY_ADMIN` provisioned tenant).

### 3.5 Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `MISSING_PARAMETERS` | Neither `orgId` nor `orchestrationReference` provided |
| 403 | `FORBIDDEN` | Auth check passed but admin context missing |
| 404 | `NOT_FOUND` | No tenant found for the given identifiers |
| 401/403 | — | Unauthenticated (from auth middleware) |

### 3.6 CRM Usage Pattern

Recommended polling pattern for CRM systems:

1. After creating an approved-onboarding provisioning request, store the `orgId` and
   `orchestrationReference` returned in the 201 response.
2. Poll `GET /api/control/tenants/provision/status?orchestrationReference=<ref>` at a suitable
   interval (e.g., every 60 seconds for 7 days).
3. When `provisioningStatus = 'ACTIVATED'` and `activation.isActivated = true`, the first owner
   has completed account setup. The `activation.activatedAt` timestamp is the canonical activation
   time.
4. CRM should stop polling after `firstOwnerAccessPreparation.expiresAt` if not yet activated
   (invite has expired).

---

## 4. Tightened 409 Conflict Codes (OD-004 PARTIALLY CLOSED)

### 4.1 Problem

The prior `POST /api/control/tenants/provision` response for unique constraint violations returned
a generic `CONFLICT` code with no indication of which constraint was violated. CRM systems could
not distinguish an orchestration-reference duplicate (same case already provisioned) from a
name/slug duplicate (different case, same org name).

### 4.2 Solution

409 responses now return specific codes derived from Prisma's `P2002` error `meta.target`:

| Conflict type | Code | Message |
|---|---|---|
| `external_orchestration_ref` constraint | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | `A tenant with this orchestration reference has already been provisioned` |
| `slug` or `name` constraint | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | `An organization with this name or slug already exists` |

### 4.3 CRM Idempotency Guidance

- `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE`: The CRM system may query the existing tenant via
  the polling endpoint using `orchestrationReference`. The tenant is already provisioned.
- `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE`: The org name conflicts with an existing tenant not
  associated with this orchestration reference. CRM must surface this to a human operator.

**Remaining open decision (OD-004 partially open):** The 409 does not distinguish membership
constraint conflicts from org-level conflicts. This is deferred — it does not affect the
CRM-safe onboarding path because service callers do not create memberships directly.

---

## 5. Files Changed

| File | Change type | Description |
|---|---|---|
| `server/src/types/tenantProvision.types.ts` | Modified | Added `CrmProvisioningStatus`, `ProvisioningStatusQueryParams`, `ProvisioningStatusResponse` types |
| `server/src/services/tenantProvision.service.ts` | Modified | Added `POST_ACTIVATION_ORG_STATUSES` constant; added `queryProvisioningStatus()` function |
| `server/src/routes/admin/tenantProvision.ts` | Modified | Added `resolveP2002ConflictCode()`; tightened 409 in POST handler; added GET `/tenants/provision/status` route |
| `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts` | Modified | Added 7 new tests: PROVISIONED state, ACTIVATED state, 404, 400 (missing params), unauthenticated, and two 409 conflict code tests |
| `docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md` | Created | This document |

---

## 6. Open Decisions Remaining

| ID | Description | Status |
|---|---|---|
| OD-001 | Canonical CRM lookup column designation | Still open |
| OD-004 | 409 membership vs org-level conflict distinction | Partially open (deferred) |
| OD-006 | Full CRM field mapping | Still open |

---

## 7. Governance Notes

- This implementation adds zero schema changes. No `prisma db pull` or `prisma generate` required.
- No new RLS policies affected — the polling endpoint reads via `prisma.tenant.findFirst` as the
  control-plane Prisma client (BYPASSRLS); it does not enter a tenant-scoped context.
- No event bus or webhook is implemented. CRM polling remains the integration mechanism.
- D-016 posture (`HOLD-FOR-BOUNDARY-TIGHTENING`) remains in effect. This implementation is a
  bounded governance-deliverable within the existing provisioning domain — not a new opening.
