# TEXQTIC MAIN APP — CRM HANDOFF READINESS v1

**Classification:** Internal Governance Artifact — Main App Side Only  
**Scope:** Main Application (TexQtic) handoff readiness for future CRM ↔ Main App integration  
**TECS Lifecycle:** Design Investigation Artifact — does NOT open a product delivery unit  
**Authored from:** Repo truth as of 2026-06-10  
**Status:** AUTHORITATIVE — corrects two positions stated in `CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md`

---

## Purpose

This document answers, with precision, the Main-App-side handoff readiness questions that must be resolved before a CRM-facing white paper can be written.

It does NOT produce the CRM-facing white paper. It does NOT prescribe CRM implementation. It does NOT invent capabilities not yet in the codebase.

Its sole function is to state, with label-disciplined clarity, what the Main App can currently guarantee, what remains an open design decision, and what has not yet been implemented — so that a future CRM-facing white paper can be written without guesswork.

---

## Scope Boundaries

| In scope | Out of scope |
|---|---|
| Main App provisioning seam (server code) | CRM internals |
| Main App activation seam (server code) | CRM-facing white paper |
| Orchestration-ref strategy in DB schema | Marketing repo |
| Invite/access-preparation contract (repo truth) | Any future CRM implementation guidance |
| Idempotency handling at route layer | Webhook/notification design beyond what exists |
| Event and status normalization (current state) | Admin portal UI flows |
| Platform sync-back export capability | White label sub-tenants |

---

## Source Artifacts Reviewed

| Artifact | Status |
|---|---|
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Full read |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Full read |
| `CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md` | Full read; two positions corrected herein |
| `server/src/services/tenantProvision.service.ts` | Full read |
| `server/src/routes/admin/tenantProvision.ts` | Full read |
| `server/src/types/tenantProvision.types.ts` | Full read |
| `server/src/routes/tenant.ts` (activate route) | Full read |
| `governance/control/NEXT-ACTION.md` | Read — TECS posture confirmed |
| `governance/control/OPEN-SET.md` | Read — Layer 0 posture confirmed |

---

## TECS Governance Posture (Layer 0)

- Mode: `HOLD-FOR-BOUNDARY-TIGHTENING`
- D-016: ACTIVE
- `active_delivery_unit: NONE`
- Layer 0: `ZERO_OPEN_DECISION_CONTROL`

This artifact is a design investigation. It does NOT require governance control file updates. Creating a design artifact is not equivalent to opening a product delivery unit.

---

## Corrections to Reconciliation Artifact

The reconciliation artifact `CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md` (committed `c1de18a`) contained two positions that are partially or wholly incorrect. Both are corrected here.

### Correction 1 — `invitePurpose: 'FIRST_OWNER_PREPARATION'`

**Prior claim (reconciliation artifact, OD-003):**  
No first-owner-specific `invite_purpose` value was attested in the codebase. `"TEAM_MEMBER"` was stated as the only confirmed value.

**CONFIRMED REPO TRUTH:**  
`tenantProvision.service.ts` explicitly sets `invitePurpose: 'FIRST_OWNER_PREPARATION'` on the invite created during `APPROVED_ONBOARDING` provisioning — at two points in the service (lines 333 and 362 of the service file). Integration tests (`tenant-provision-approved-onboarding.integration.test.ts`) confirm this is the asserted value (lines 186, 267, 281).

**Correction:**  
OD-003 is RESOLVED by existing code. `'FIRST_OWNER_PREPARATION'` IS the canonical value for CRM-originated provisioning invites. No design decision is required.

---

### Correction 2 — Dual Orchestration-Ref Divergence Risk

**Prior claim (reconciliation artifact, OD-001):**  
"No DB-level constraint guaranteeing `tenants.externalOrchestrationRef` and `organizations.external_orchestration_ref` carry the same value."

**CONFIRMED REPO TRUTH:**  
The provisioning service (`tenantProvision.service.ts`) writes `tenants.externalOrchestrationRef`, `organizations.external_orchestration_ref`, and `invites.externalOrchestrationRef` — all three — from the SAME `orchestrationReference` variable, in the SAME `prisma.$transaction` block (20-second timeout). By transaction atomicity, divergence is impossible from the initial write.

**Correction:**  
The divergence risk identified in OD-001 is limited to post-provisioning update paths — not the initial write. OD-001 narrows to: "which column is the canonical CRM lookup target for external queries and sync-back?" That question remains open and is addressed in Workstream A below.

---

### Correction 3 — CRM→Platform Provisioning Seam Exists

**Prior claim (reconciliation artifact):**  
"CRM approval → platform provisioning callback/webhook" classified as UNRESOLVED.

**CONFIRMED REPO TRUTH:**  
The `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` mechanism IS the CRM→platform provisioning seam. It is fully implemented in the route handler (`tenantProvision.ts`). When a bearer token matching the configured hash is presented with a body containing `provisioningMode: 'APPROVED_ONBOARDING'`, the route sets `serviceCallerId = 'crm-approved-onboarding'` and `serviceCallerType = 'APPROVED_ONBOARDING'` and routes to the APPROVED_ONBOARDING provisioning path without requiring an admin JWT.

**Correction:**  
The provisioning seam IS substantially implemented. The outstanding operational requirement is: the pre-shared token must be provisioned in the CRM environment and the CRM team must receive the endpoint specification.

---

## Confirmed Canonical Positions

The following positions are confirmed by repo code and are stated as platform-side contract anchors.

### P-1 — `tenants.id = organizations.id` (FK, same UUID)

**CONFIRMED REPO TRUTH.**  
The `organizations` table uses the tenant UUID as its primary key. A `tenants` row and its corresponding `organizations` row share the same UUID. `orgId` returned by the provisioning endpoint is the canonical cross-system identity anchor.

### P-2 — Atomic Four-Object Provisioning Transaction

**CONFIRMED REPO TRUTH.**  
`APPROVED_ONBOARDING` provisioning creates four objects atomically in one `prisma.$transaction` with a 20-second timeout:

1. Admin sentinel context (tx-local GUCs)
2. Stop-loss assertion: `app.is_admin = true`
3. `tenants.create` → `externalOrchestrationRef`
4. `organizations.upsert` → `external_orchestration_ref = orchestrationReference`, `status = 'VERIFICATION_APPROVED'`
5. Context switch to tenant realm (tx-local)
6. `invites.create` → `externalOrchestrationRef`, `invitePurpose = 'FIRST_OWNER_PREPARATION'`, `role = 'OWNER'`, `tokenHash`, `expiresAt = now + 7 days`

No user or membership is created at provisioning time in `APPROVED_ONBOARDING` mode.

### P-3 — `invitePurpose: 'FIRST_OWNER_PREPARATION'` is Canonical

**CONFIRMED REPO TRUTH.**  
This value is set in the service, confirmed by integration tests, and is the only value used for CRM-originated provisioning. It distinguishes CRM-provisioned first-owner invites from ordinary team member invites.

### P-4 — Organization Status Lifecycle

**CONFIRMED REPO TRUTH (from both provisioning and activation routes):**

| Event | `organizations.status` value |
|---|---|
| Post-CRM-provisioning | `'VERIFICATION_APPROVED'` |
| Post-user-activation | `'PENDING_VERIFICATION'` |
| Post-full-verification | Unconfirmed (no code path observed) |

The activation route (`POST /api/tenant/activate`) explicitly transitions `organizations.status` from `'VERIFICATION_APPROVED'` → `'PENDING_VERIFICATION'`. This is an observable activation signal.

The `'ACTIVE'` state transition has no confirmed code path in the current codebase.

### P-5 — Explicit 409 Handler for Duplicate Provisioning

**CONFIRMED REPO TRUTH.**  
The provisioning route handler contains an explicit catch block for Prisma error code `P2002` and messages containing `'Unique constraint'`:

```
sendError(reply, 'CONFLICT', 'An organization with this name, orchestration reference,
or existing membership already exists', 409)
```

This means a duplicate `orchestrationReference` submission returns HTTP 409 (not 500). The response is retry-safe: 409 is deterministic, not transient. The limitation is the error message does not distinguish which unique constraint was violated (name, slug, orchestration ref, or membership).

### P-6 — Audit Log Is Written at Provisioning

**CONFIRMED REPO TRUTH.**  
The route writes an audit log entry with event name `'control.tenants.provisioned'` after every successful provision. The log includes: `orgId`, `slug`, `orgName`, `provisioningMode`, `orchestrationReference`, `inviteId`, `invitePurpose`, `authMode` (`SERVICE_BEARER` or `ADMIN_JWT`), `serviceCallerId`, `serviceCallerType`.

### P-7 — Activation Audit Log Is Written

**CONFIRMED REPO TRUTH.**  
`POST /api/tenant/activate` writes audit log event `'user.activated'` atomically with the membership creation and invite acceptance. The log includes: `inviteId`, `role`, `firstOwnerActivated`, `verificationStatus`.

---

## Workstream A — Authoritative Orchestration-Ref Strategy

**Objective:** Designate the canonical cross-system join column for CRM lookup.

### What Exists (CONFIRMED REPO TRUTH)

| Column | Table | Uniqueness | Written at | Used for |
|---|---|---|---|---|
| `externalOrchestrationRef` | `tenants` | `@unique` | Provisioning | Runtime tenant identity root |
| `external_orchestration_ref` | `organizations` | `@unique` | Provisioning | Commercial identity anchor |
| `externalOrchestrationRef` | `invites` | Not unique | Provisioning | Invite-level orchestration trace |

All three columns receive the same `orchestrationReference` value in the same atomic transaction. Post-provision, they are guaranteed to carry identical values. Divergence is possible only if a subsequent independent update modifies one column without updating the others; no such code path exists today.

### Recommended Platform Contract

**RECOMMENDED PLATFORM CONTRACT:**  
- **CRM lookup anchor:** `tenants.externalOrchestrationRef` — this is the runtime identity root. Cross-system queries from CRM should target this column.
- **Commercial identity anchor:** `organizations.external_orchestration_ref` — this is the commercial record root. Organisation-level queries use this column.
- **Return identifier to CRM:** The provisioning response returns `orgId` (the `tenants.id = organizations.id` UUID) as the canonical platform-issued identifier. CRM should store `orgId` as the Main App's permanent identifier for the provisioned tenant.

### Open Decision

**OD-001 (narrowed):** Explicitly designate, in the API contract, whether CRM-initiated sync-back queries (after activation) should use `orchestrationReference` or `orgId` as the lookup key. Current platform preference is `orgId` (UUID) as the stable identifier after provisioning; `orchestrationReference` is the link-time join key.

---

## Workstream B — Canonical Provisioning Sequence

**CONFIRMED REPO TRUTH — Full sequence for `APPROVED_ONBOARDING` mode:**

### Request Shape

```
POST /api/control/tenants/provision
Authorization: Bearer <crm-service-token>

{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orchestrationReference": "<crm-case-id>",
  "organization": {
    "legalName": "<required>",
    "jurisdiction": "<required>",
    "registrationNumber": "<optional>"
  },
  "firstOwner": {
    "email": "<required>"
  }
}
```

Validation (Zod): `orchestrationReference` must be a non-empty string, max 255 characters. No UUID format constraint at the route layer — CRM may use any opaque string identifier.

### Authentication Path

Bearer token is SHA-256-hashed and compared against `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` env var. If matched, the route bypasses admin JWT entirely. The service bearer path is RESTRICTED to `provisioningMode: 'APPROVED_ONBOARDING'` — the CRM token cannot invoke `LEGACY_ADMIN` provisioning.

### Atomic Transaction Output (Objects Created)

1. `tenants` row: `{ id (UUID), name, slug, externalOrchestrationRef, plan, type, isWhiteLabel }`
2. `organizations` row: `{ id (= tenant.id), external_orchestration_ref, status: 'VERIFICATION_APPROVED', legal_name, jurisdiction }`
3. `invites` row: `{ id (UUID), tenantId, email, externalOrchestrationRef, invitePurpose: 'FIRST_OWNER_PREPARATION', role: 'OWNER', tokenHash, expiresAt: now + 7 days }`

No `users` row. No `memberships` row. User creation is deferred to activation.

### Response Shape (201 Created)

```json
{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orgId": "<tenant-uuid>",
  "slug": "<generated-slug>",
  "userId": null,
  "membershipId": null,
  "orchestrationReference": "<echoed-back>",
  "organization": { "legalName": "...", "jurisdiction": "..." },
  "firstOwnerAccessPreparation": {
    "artifactType": "PLATFORM_INVITE",
    "inviteId": "<uuid>",
    "invitePurpose": "FIRST_OWNER_PREPARATION",
    "email": "<first-owner-email>",
    "role": "OWNER",
    "expiresAt": "<iso-timestamp>",
    "inviteToken": "<raw-token>"
  }
}
```

The raw `inviteToken` is returned in the provisioning response for CRM to use for invite dispatch. This is the ONLY time the raw token is available — it is not stored in the DB (only its hash is stored).

### Failure Classes

| HTTP | Error Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing required fields, invalid format |
| 403 | `FORBIDDEN` | Service token mismatch, service token used with non-APPROVED_ONBOARDING mode, or admin path lacks super-admin role |
| 409 | `CONFLICT` | Duplicate name, slug, orchestration reference, or membership (Prisma P2002) |
| 500 | `PROVISION_ABORT` | G-008 admin context stop-loss triggered |
| 500 | (rethrown) | Unexpected error — Fastify global error handler |

---

## Workstream C — Canonical Activation Sequence

**CONFIRMED REPO TRUTH — Full sequence for `POST /api/tenant/activate`:**

This route is unauthenticated (no JWT required). The invite token IS the credential.

### Request Shape

```
POST /api/tenant/activate

{
  "inviteToken": "<raw-token-from-provisioning-response>",
  "userData": {
    "email": "<must-match-invite-email>",
    "password": "<min-6-chars>"
  },
  "tenantData": {
    "name": "<optional>",
    "industry": "<optional>"
  },
  "verificationData": {
    "registrationNumber": "<required>",
    "jurisdiction": "<required>"
  }
}
```

### Atomic Transaction Sequence

1. Stop-loss: assert `app.org_id = invite.tenantId`
2. Create or find `users` row by email (if exists, reuses; `emailVerified: true` on create)
3. Elevate to admin context (tx-local)
4. `organizations.update`: `status → 'PENDING_VERIFICATION'`, `registration_no`, `jurisdiction`, optionally `legal_name`
5. Optionally: `tenants.update`: `name`
6. Switch to tenant context (tx-local)
7. `memberships.create`: `{ userId, tenantId, role: 'OWNER' }` (if no OWNER exists yet; otherwise uses invite role)
8. `invites.update`: `acceptedAt: new Date()`
9. Audit log: `'user.activated'` with `{ inviteId, role, firstOwnerActivated, verificationStatus }`
10. Issue tenant JWT

### Observable Activation-Complete State

After a successful `POST /api/tenant/activate`, ALL of the following are true:

| Observable | Value |
|---|---|
| `invites.acceptedAt` | `IS NOT NULL` |
| `invites.invitePurpose` | `'FIRST_OWNER_PREPARATION'` |
| `memberships` row | Exists, `role = 'OWNER'`, `tenantId = orgId` |
| `users` row | Exists, `emailVerified = true` |
| `organizations.status` | `'PENDING_VERIFICATION'` |
| Audit log entry | `action = 'user.activated'` exists |

This is the canonical "user has activated" state observable on the Main App side.

### What "Activation Complete" Does NOT Currently Mean

- `organizations.status = 'ACTIVE'` — this transition has NO confirmed code path in the current codebase.
- A platform-emitted webhook or callback to CRM — this does NOT exist.
- An EventLog entry with a canonical lifecycle event name — this does NOT exist (audit log is a separate mechanism).

### Open Decision

**OD-002:** What constitutes the canonical "fully active" milestone for CRM-facing purposes?

Options (must be decided before CRM-facing white paper):

- **Option A:** `organizations.status = 'PENDING_VERIFICATION'` + `invite.acceptedAt IS NOT NULL` is sufficient — "activation complete" means the first owner has self-onboarded; further verification is operational.
- **Option B:** A subsequent admin action transitions `organizations.status → 'ACTIVE'` — "activation complete" requires admin sign-off. Code for this transition must be written.
- **Option C:** An explicit `EventLog` entry with a canonical event name is the authoritative signal, regardless of status.

Until OD-002 is resolved, the CRM-facing white paper cannot state what constitutes "activation complete" from the platform's perspective.

---

## Workstream D — First-Owner Invite / Access-Preparation Contract

**CONFIRMED REPO TRUTH.**

### Canonical Invite Shape (Post-Provisioning)

| Field | Value |
|---|---|
| `invitePurpose` | `'FIRST_OWNER_PREPARATION'` |
| `role` | `'OWNER'` |
| `email` | First owner email from provisioning request |
| `externalOrchestrationRef` | Same value as `orchestrationReference` in provisioning request |
| `tokenHash` | SHA-256 of raw token |
| `expiresAt` | Provisioning timestamp + 7 days |
| `acceptedAt` | NULL (set to `new Date()` at activation) |

### Token Delivery

The provisioning response returns `firstOwnerAccessPreparation.inviteToken` (raw, cleartext). This is the ONLY point at which the raw token is available. CRM must:

1. Store the raw token securely for delivery (or deliver it immediately).
2. Deliver the token to the first owner via its own communication channel, or construct the invite URL:  
   `{FRONTEND_URL}/accept-invite?token={encoded_token}&action=invite`
3. Treat the token as a one-time credential — it expires in 7 days and is invalidated on acceptance.

### Token Re-dispatch

If the original invite token expires before activation, CRM can trigger a re-send via an admin flow (not a direct CRM API) or the existing `POST /api/tenant/memberships/invites/:id/resend` route (requires OWNER/ADMIN tenant-realm JWT — not available pre-activation). A direct CRM-callable re-provisioning path for expired invites is **PENDING IMPLEMENTATION**.

---

## Workstream E — Provisioning Idempotency and Re-Entry

**CONFIRMED REPO TRUTH.**

### Unique Constraint Guard

| Column | Constraint |
|---|---|
| `tenants.externalOrchestrationRef` | `@unique` |
| `organizations.external_orchestration_ref` | `@unique` |
| `tenants.slug` | `@unique` |
| `tenants.name` | `@unique` |

A second provisioning attempt with the same `orchestrationReference` will fail with Prisma error P2002 (unique constraint violation), which is caught by the route and returned as HTTP 409 CONFLICT.

### What the 409 Guarantees

- The duplicate attempt does NOT create partial state.
- The original provisioning remains intact.
- The 409 is deterministic: CRM can distinguish it from a transient failure (5xx) and suppress retry.

### What the 409 Does NOT Provide

**OD-004 (partially resolved, not closed):**  
The 409 error message (`'An organization with this name, orchestration reference, or existing membership already exists'`) does not identify which unique constraint was violated. CRM cannot programmatically distinguish "duplicate orchestration reference" (idempotent re-submission) from "duplicate name/slug" (conflicting new record). This ambiguity means CRM must treat all 409 responses from provisioning as "already provisioned" — which is correct for the orchestration-ref case but may be incorrect for the name/slug case.

**DESIGN DECISION REQUIRED (OD-004 open item):** Add an orchestration-ref-specific conflict code (e.g., `'CONFLICT_ORCHESTRATION_REF_DUPLICATE'`) to the 409 response to allow CRM to distinguish idempotent re-submission from a genuine naming conflict.

### Idempotent Query Path

**PENDING IMPLEMENTATION:**  
There is no `GET /api/control/tenants/provision/status?orchestrationReference=...` endpoint. CRM cannot currently query "was this orchestration reference already provisioned?" without re-submitting and receiving a 409. A read-only status query endpoint would provide safe idempotency checking without triggering the conflict path.

---

## Workstream F — Platform-Side Future Sync-Back Export Set

**CONFIRMED REPO TRUTH — Fields available for CRM sync-back after provisioning:**

### Available at Provisioning (Returned in 201 Response)

| Field | Source | Description |
|---|---|---|
| `orgId` | `tenants.id = organizations.id` | Canonical platform tenant UUID |
| `slug` | `tenants.slug` | URL-safe tenant identifier |
| `orchestrationReference` | Echoed from request | Cross-system join key |
| `organization.legalName` | `organizations.legal_name` | Legal name at provisioning time |
| `organization.jurisdiction` | `organizations.jurisdiction` | Jurisdiction |
| `firstOwnerAccessPreparation.inviteId` | `invites.id` | Invite UUID |
| `firstOwnerAccessPreparation.invitePurpose` | `invites.invitePurpose` | `'FIRST_OWNER_PREPARATION'` |
| `firstOwnerAccessPreparation.email` | `invites.email` | First owner email |
| `firstOwnerAccessPreparation.expiresAt` | `invites.expiresAt` | Invite expiry timestamp |
| `firstOwnerAccessPreparation.inviteToken` | Cleartext (one-time) | Raw token for dispatch |

### Available After Activation (Not Returned Automatically — Must Be Queried or Pushed)

| Field | Source | Description |
|---|---|---|
| `userId` | `users.id` | First owner user UUID |
| `organizations.status` | `organizations.status` | `'PENDING_VERIFICATION'` post-activation |
| `organizations.registration_no` | `organizations.registration_no` | Set at activation |
| `invites.acceptedAt` | `invites.accepted_at` | Activation timestamp (proxy) |
| `memberships.role` | `memberships.role` | Confirmed as `'OWNER'` |

### Not Yet Available (PENDING IMPLEMENTATION)

| Capability | Status |
|---|---|
| Platform→CRM activation notification (webhook/callback) | Not implemented — see OD-005 |
| `activationCompletedAt` explicit field | Does not exist on any table |
| `organizations.status = 'ACTIVE'` transition | No confirmed code path |
| Status query endpoint for CRM | Not implemented |

---

## Workstream G — Event and Status Normalization

**CONFIRMED REPO TRUTH.**

### Audit Log Events (Confirmed in Code)

| Event Name | Emitter | Trigger | Key Fields |
|---|---|---|---|
| `control.tenants.provisioned` | `tenantProvision.ts` route | Successful provisioning | `orgId`, `slug`, `provisioningMode`, `orchestrationReference`, `inviteId`, `invitePurpose`, `authMode` |
| `user.activated` | `tenant.ts` activate route | Successful activation | `inviteId`, `role`, `firstOwnerActivated`, `verificationStatus` |
| `member.invite.resent` | `tenant.ts` resend route | Invite resent | `email`, `role` |
| `membership.role.updated` | `tenant.ts` membership route | Role change | `fromRole`, `toRole`, `targetUserId` |

These events are written to the `audit_logs` table. They are NOT in `event_logs`.

### Lifecycle Event Names from Design Contract (NOT Confirmed as Emitted)

The design document `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` specifies the following lifecycle event names as part of the intended contract:

- `platform.tenant.provisioned`
- `platform.tenant.activation_completed`

**PENDING IMPLEMENTATION:**  
Neither of these event names has been confirmed as emitted to an `event_logs` table in the current codebase. The audit log events (`control.tenants.provisioned`, `user.activated`) serve a similar informational role but use different naming and a different table. The canonical lifecycle event emission is not yet implemented.

### Status Normalization Table

| Platform Status Value | Meaning | When Set |
|---|---|---|
| `'VERIFICATION_APPROVED'` | CRM pre-approved; user not yet activated | Set at provisioning (`APPROVED_ONBOARDING`) |
| `'PENDING_VERIFICATION'` | User has activated; awaiting document review | Set at activation (`POST /api/tenant/activate`) |
| `'ACTIVE'` | Fully verified and active | No confirmed code path |

**DESIGN DECISION REQUIRED (OD-005):** Define the `'ACTIVE'` status transition trigger and implement the code path. Until this exists, there is no "fully verified" observable state on the platform.

---

## Required Questions — Authoritative Answers

The following ten questions were specified as required for the readiness artifact.

**Q1. Which platform row/object is the authoritative cross-system lookup root?**  
The `tenants` row, via `tenants.externalOrchestrationRef` (`@unique`). After provisioning, the canonical platform identifier is `orgId` (= `tenants.id` = `organizations.id`). CRM should store `orgId` as its permanent reference to the Main App tenant record.

**Q2. What exact Main-App entity is created first after an approved handoff?**  
The `tenants` row is created first within the atomic transaction (`tx.tenant.create`), followed immediately (in the same transaction) by `organizations.upsert` and then `invites.create`. All three are committed atomically.

**Q3. What must be atomic in the provisioning sequence?**  
All three object creations — `tenants`, `organizations`, and `invites` — plus the admin sentinel context setup and all GUC writes, must execute in one `prisma.$transaction`. They do. The transaction has a 20-second timeout. Partial state is not possible.

**Q4. What exact evidence exists for "invite issued"?**  
An `invites` row exists with:
- `tenantId = orgId`
- `invitePurpose = 'FIRST_OWNER_PREPARATION'`
- `externalOrchestrationRef = orchestrationReference`
- `tokenHash = SHA256(inviteToken)`
- `expiresAt = provisioning_time + 7 days`
- `acceptedAt = NULL`

The raw `inviteToken` is returned once in the provisioning response `firstOwnerAccessPreparation.inviteToken`.

**Q5. What exact evidence exists for "activation started"?**  
`POST /api/tenant/activate` was called with a valid token. Observable: `invites.acceptedAt IS NOT NULL` AND `memberships` row exists with `role = 'OWNER'` AND `tenantId = orgId`.

**Q6. What exact evidence should count as "activation complete"?**  
**DESIGN DECISION REQUIRED (OD-002).** Current best proxy: `organizations.status = 'PENDING_VERIFICATION'` (set atomically with invite acceptance and membership creation). No `activationCompletedAt` field exists. No `organizations.status = 'ACTIVE'` transition exists. See Workstream C, OD-002.

**Q7. What exact identifiers will the Main App later be able to return safely to CRM?**  
- At provisioning: `orgId`, `slug`, `orchestrationReference`, `inviteId`, `inviteToken` (one-time), `expiresAt`
- After activation: `userId` (first owner), `organizations.status` (`'PENDING_VERIFICATION'`), `memberships.role` (`'OWNER'`)
- Never returned: `passwordHash`, DB connection details, internal GUC values

**Q8. What exact idempotency rule should guard provisioning?**  
DB-level: `tenants.externalOrchestrationRef @unique` provides implicit guard. Route-level: P2002/Unique constraint violations return HTTP 409. The 409 is retry-safe. The limitation: the error message does not distinguish orchestration-ref duplicates from name/slug duplicates. See OD-004.

**Q9. What exact failure classes must the Main App distinguish?**

| Class | HTTP | When |
|---|---|---|
| Duplicate orchestration reference (or name/slug) | 409 CONFLICT | P2002 unique constraint |
| Validation failure | 400 VALIDATION_ERROR | Missing/invalid fields |
| Service token invalid or mode mismatch | 403 FORBIDDEN | Auth gate |
| G-008 admin context stop-loss | 500 PROVISION_ABORT | Admin sentinel assertion failed |
| Transaction timeout | 500 (rethrown) | > 20 seconds |

**Q10. What exact open decisions must be resolved before the CRM-facing white paper?**  
See Open Decisions section below.

---

## Open Decisions That Block CRM-Facing White Paper Authority

| ID | Decision Required | Impact |
|---|---|---|
| OD-001 | Designate explicit canonical CRM lookup column in API contract (`orgId` vs. `orchestrationReference`) | White paper cannot state which identifier CRM should store as primary reference |
| OD-002 | Define "activation complete" canonical signal (status, field, event) and implement if needed | White paper cannot state what CRM should observe to confirm activation |
| OD-004 | Add orchestration-ref-specific conflict code to 409 response | White paper cannot describe idempotency behavior precisely |
| OD-005 | Define and implement platform→CRM activation notification mechanism (webhook, polling, or EventLog) | White paper cannot describe how CRM learns of activation |
| OD-006 | Define CRM customer account field mapping to platform org fields | White paper cannot describe the full sync-back payload shape |

**OD-003 is CLOSED** — `invitePurpose: 'FIRST_OWNER_PREPARATION'` is confirmed canonical (corrected from reconciliation artifact).

---

## Main App Readiness Gap Analysis

| Workstream | Provisioning Seam | Activation Seam | Notification Seam |
|---|---|---|---|
| A — Orchestration ref strategy | ✅ Implemented | N/A | N/A |
| B — Creation sequence | ✅ Implemented, atomic | N/A | N/A |
| C — Activation sequence | N/A | ✅ Implemented (no "fully active" state) | ❌ Not implemented |
| D — Invite contract | ✅ Implemented | ✅ Implemented | N/A |
| E — Idempotency | ✅ Partially (409 handler exists, message not specific) | N/A | N/A |
| F — Sync-back export | ✅ Provisioning response complete | ⚠️ No push mechanism | ❌ Not implemented |
| G — Event / status normalization | ✅ Audit log written | ✅ Audit log written | ❌ No lifecycle event emission |

---

## Readiness Conclusion

**The Main App is NOT yet ready for a CRM-facing white paper.**

Rationale:

1. **OD-002 is open.** The white paper cannot state what "activation complete" means on the platform side without first deciding whether `organizations.status = 'PENDING_VERIFICATION'` is sufficient or whether an `'ACTIVE'` transition is required.

2. **OD-005 is open.** There is no mechanism for CRM to learn that activation has occurred. The platform does not emit a webhook, callback, or canonical EventLog entry. CRM would need to poll or the platform would need to implement a notification.

3. **OD-004 is partially open.** The 409 idempotency response exists but does not distinguish duplicate orchestration references from conflicting names. The white paper should not describe idempotency behavior as fully specified until this is resolved.

4. **OD-006 is open.** The white paper cannot map CRM customer account fields to platform org fields without a field-level agreement.

**The provisioning seam itself IS substantially ready.** The `APPROVED_ONBOARDING` path is implemented, tested, and auth-gated. The invite contract is implemented. The atomic transaction is correct. CRM can call the provisioning endpoint today (given the pre-shared token) and receive a 201 response with the invite token. This part is complete.

---

## Recommended First Bounded Implementation Unit

**Define and implement the activation-complete milestone.**

This is the single highest-priority gap because it blocks OD-002 and OD-005 simultaneously.

Specifically:

1. **Decide whether `organizations.status = 'PENDING_VERIFICATION'` is sufficient** as the "user has activated" signal for CRM purposes. If yes, document it as the canonical signal and close OD-002 with that decision.

2. **Decide whether a `'ACTIVE'` transition is required.** If yes, implement an admin route (`PATCH /api/control/tenants/:id/status` or similar) that transitions `organizations.status → 'ACTIVE'` with an appropriate role guard and audit log entry.

3. **Implement the activation notification seam.** The minimum viable approach is a polling endpoint: `GET /api/control/tenants/provision/status?orchestrationReference=...` returning `{ orgId, orchestrationReference, provisioningStatus: 'PROVISIONED' | 'ACTIVATED' | 'ACTIVE', activatedAt }`. This is simpler than a webhook and does not require CRM-side infrastructure.

This unit is achievable as a single bounded delivery — it requires one new route, one schema field (optional: `activationCompletedAt` on `organizations`), and one design decision.

---

## Recommended Sequencing After the First Unit

| Stage | Scope | Blocks |
|---|---|---|
| 1 | Activation-complete milestone + polling endpoint | OD-002, OD-005 |
| 2 | Orchestration-ref-specific 409 error code | OD-004 |
| 3 | CRM customer account field mapping agreement | OD-006 |
| 4 | Canonical CRM lookup column designation in OpenAPI contract | OD-001 |
| 5 | CRM-facing white paper draft | Requires stages 1–4 |

---

*This artifact is complete. It does not open a product delivery unit. The TECS Layer 0 posture (`HOLD-FOR-BOUNDARY-TIGHTENING`, D-016) remains unchanged.*
