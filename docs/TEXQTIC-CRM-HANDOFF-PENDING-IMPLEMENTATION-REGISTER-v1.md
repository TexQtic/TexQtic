# TEXQTIC CRM HANDOFF — PENDING PLATFORM IMPLEMENTATION REGISTER v1

**Document type:** Governance implementation gap register  
**Version:** 1.0  
**Status:** ACTIVE — awaiting platform delivery cycles  
**Date:** 2025-07-01  
**Author authority:** Platform governance corpus  
**Parent artifact:** `docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md`  
**Commit of parent:** `3e5c986`

---

## Purpose

The CRM-facing white paper (`TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md`) documents
the complete CRM integration surface as it exists today. In the course of authoring that white paper,
five platform-side implementation gaps were identified, labeled `[PENDING IMPLEMENTATION]` or
`[NOT YET IMPLEMENTED]`, and explicitly acknowledged as non-blocking for CRM operational use.

This register provides the authoritative, bounded account of those five gaps. It:

1. States the confirmed repo truth for each gap as of the parent document's commit.
2. Records exactly why each item is pending.
3. Confirms why each item does not block the CRM white paper or current CRM integrations.
4. Documents the operational impact of the gap today.
5. Recommends a bounded future delivery unit for each item.

**This register does NOT:**

- Reopen or amend closed operational deliverables OD-001 through OD-006.
- Propose implementation details or designs.
- Modify any code, schema, API contract, or governance control file.
- Speculate on implementation timelines.

---

## Scope

**In scope:**

- Five pending platform-side implementation items as labeled in the parent white paper §10.3.
- Confirmed repo truth from `server/src/routes/tenant.ts`, `server/src/routes/control.ts`,
  `server/src/routes/admin/tenantProvision.ts`, `server/src/services/tenantProvision.service.ts`,
  `server/src/lib/events.ts`, `server/prisma/schema.prisma`.

**Out of scope:**

- CRM-side implementation gaps.
- Changes to the white paper's CRM operational guidance.
- Any items outside the activation / provisioning / status / EventLog domain.

---

## Source Artifacts Reviewed

The following artifacts were read in full or to the depth required to confirm repo truth, prior to authoring this register:

| Artifact | Purpose |
|---|---|
| `docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md` | Parent CRM-facing white paper; source of the 5 pending items |
| `server/src/routes/tenant.ts` lines 2875–3080 | `POST /api/tenant/activate` — full activation route code |
| `server/src/routes/control.ts` lines 570–730 | `POST /api/control/tenants/:id/onboarding/activate-approved` — ACTIVE transition route |
| `server/src/routes/admin/tenantProvision.ts` | CRM-callable provisioning route and schema |
| `server/src/services/tenantProvision.service.ts` | Provisioning service: `provisionTenant()`, `queryProvisioningStatus()` |
| `server/src/lib/events.ts` lines 380–440, 550–650 | EventLog emission, `AUDIT_ACTION_TO_EVENT_NAME` registry |
| `server/prisma/schema.prisma` lines 11–160 | `Invite`, `Membership`, `Tenant`, `organizations` model fields |
| `TECS.md` | Governance posture (HOLD-FOR-BOUNDARY-TIGHTENING, D-016 ACTIVE) |
| `governance/control/NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md` | Governance control state |

---

## Confirmed Completed Foundation (Non-Pending)

These items were implemented in prior delivery cycles and are CLOSED. They are listed here to
clarify the boundary between what is complete and what remains pending.

| Item | Status | Evidence |
|---|---|---|
| `POST /api/control/tenants/provision` (APPROVED_ONBOARDING mode) | ✅ COMPLETE | Implemented in `server/src/routes/admin/tenantProvision.ts`; service-token auth via SHA-256 hash comparison |
| `GET /api/control/tenants/provision/status` (polling endpoint) | ✅ COMPLETE | Returns `provisioningStatus`, `activation.isActivated`, `activation.activatedAt`, `activationSignal` |
| First-owner `FIRST_OWNER_PREPARATION` invite creation | ✅ COMPLETE | Created by `provisionTenant()` in `tenantProvision.service.ts` |
| `POST /api/tenant/activate` (first-owner activation) | ✅ COMPLETE | Implemented in `tenant.ts`; sets `PENDING_VERIFICATION`, creates membership, marks invite accepted |
| Activation discovery via polling (`INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION`) | ✅ COMPLETE | `activationSignal` returned by polling endpoint after invite accepted |
| Audit log write on activation (`action: 'user.activated'`) | ✅ COMPLETE | `writeAuditLog` called inside the activation transaction |
| OD-001 through OD-006 (identifier, field-mapping, activation milestone, polling contracts) | ✅ CLOSED | Documented in parent white paper and prior governance artifacts |

---

## Pending Implementation Register

The following five items were labeled `[PENDING IMPLEMENTATION]` or `[NOT YET IMPLEMENTED]` in the
parent white paper. Each is confirmed by direct code reading of the server source as of commit `3e5c986`.

---

### ITEM 1 — `organizations.status = 'ACTIVE'` Automated Transition

**Gap identifier:** PI-001  
**Source:** White paper §10.3, Appendix B, §7.3

#### CONFIRMED REPO TRUTH

There is a SUPER_ADMIN-only route, `POST /api/control/tenants/:id/onboarding/activate-approved`
(defined in `server/src/routes/control.ts`, guarded by `requireAdminRole('SUPER_ADMIN')`), that
explicitly transitions `organizations.status` from `'VERIFICATION_APPROVED'` to `'ACTIVE'`.

However, this route:

1. Requires an admin JWT with SUPER_ADMIN role — NOT callable by CRM service bearer token.
2. Requires the organization's *current* status to be `'VERIFICATION_APPROVED'`.
3. Is a manual, explicitly-triggered action — NOT automatically invoked by the CRM activation flow.
4. Is preceded by a second required admin action: `POST /api/control/tenants/:id/onboarding/outcome`
   (outcome = `'APPROVED'`) which transitions status from `'PENDING_VERIFICATION'` back to
   `'VERIFICATION_APPROVED'`. Two SUPER_ADMIN manual steps are required in sequence.

The status lifecycle after CRM-triggered activation is:

```
provisionTenant() → organizations.status = 'VERIFICATION_APPROVED'
    ↓
POST /api/tenant/activate (first-owner activates)
    ↓
organizations.status = 'PENDING_VERIFICATION'
    ↓
[SUPER_ADMIN] POST /api/control/tenants/:id/onboarding/outcome (outcome = APPROVED)
    ↓
organizations.status = 'VERIFICATION_APPROVED'
    ↓
[SUPER_ADMIN] POST /api/control/tenants/:id/onboarding/activate-approved
    ↓
organizations.status = 'ACTIVE'
```

The CRM cannot trigger or observe any step after `PENDING_VERIFICATION`. There is no automated path
from `PENDING_VERIFICATION` to `ACTIVE` — the transition requires two sequential SUPER_ADMIN actions.

#### PENDING IMPLEMENTATION

There is no automated or CRM-observable mechanism that transitions `organizations.status` to `'ACTIVE'`
upon completion of the CRM-initiated activation flow. The `ACTIVE` status is a downstream platform
admin review gate, not an activation gate.

#### NON-BLOCKING FOR CRM WHITE PAPER

The white paper explicitly documents that CRM must NOT use `organizationStatus = 'ACTIVE'` as the
activation gate. CRM must use `provisioningStatus = 'ACTIVATED'` (or `activation.isActivated = true`)
from the polling endpoint. This signal is set when the invite is accepted and the membership is created
— regardless of whether `organizations.status` has reached `'ACTIVE'`. The polling endpoint correctly
returns `isActivated: true` when `organizationStatus = 'PENDING_VERIFICATION'`.

#### OPERATIONAL IMPACT TODAY

None for CRM integration. CRM activation detection is unaffected. The `ACTIVE` status is used
internally for trade-capability gating, discovery eligibility, and domain resolution — all of which
are downstream of the activation handoff.

#### RECOMMENDED FUTURE DELIVERY UNIT

> `[RECOMMENDED FUTURE DELIVERY UNIT]`  
> **Admin Onboarding Review Completion Flow** — Design and implement the platform admin portal
> workflow that completes the tenant document review cycle: admin reviews submitted registration
> details (`registration_no`, `jurisdiction`), records an approval outcome, and explicitly executes
> the `activate-approved` transition. This is an internal admin surface. It does not touch the
> CRM integration contract.

---

### ITEM 2 — Platform-to-CRM Push Notification / Webhook on Activation

**Gap identifier:** PI-002  
**Source:** White paper §10.3, §8.5

#### CONFIRMED REPO TRUTH

No outbound HTTP call, webhook emission, or push notification mechanism exists in:

- `POST /api/tenant/activate` (`server/src/routes/tenant.ts` lines 2875–3080)
- `tenantProvision.service.ts` (`provisionTenant()`, `queryProvisioningStatus()`)
- `server/src/routes/admin/tenantProvision.ts`

The `emitEventToSink()` function in `server/src/lib/events.ts` is a P0 console-only sink
(`console.info('EVENT_EMIT', ...)`) — it is not an HTTP webhook or outbound delivery mechanism.

The `maybeEmitEventFromAuditEntry()` function derives events from audit log entries and writes them
to the internal `EventLog` table. It does not deliver notifications to external systems.

No HTTP client for outbound CRM delivery exists anywhere in the activation call path.

#### PENDING IMPLEMENTATION

The outbound notification infrastructure — a mechanism for the platform to call a CRM-specified
webhook URL upon tenant activation — has not been designed or implemented. This includes:

- Outbound HTTP client for CRM webhook delivery
- Webhook URL configuration per provisioning request or globally
- Retry / delivery tracking
- Authentication for outbound webhook calls

#### NON-BLOCKING FOR CRM WHITE PAPER

The white paper documents polling (`GET /api/control/tenants/provision/status`) as the activation
discovery mechanism. Polling is fully implemented and operational. CRM is not blocked from discovering
activation — it uses the polling endpoint at a defined cadence.

#### OPERATIONAL IMPACT TODAY

CRM must poll to discover activation. There is no low-latency push notification path. The operational
impact is bounded: polling introduces a latency window between the moment of activation and CRM's
discovery of that event. The polling interval is CRM-controlled.

#### RECOMMENDED FUTURE DELIVERY UNIT

> `[RECOMMENDED FUTURE DELIVERY UNIT]`  
> **Outbound Platform Event Delivery (CRM Webhook)** — Design and implement a service that delivers
> platform activation events to CRM-registered callback URLs. Scope must define: delivery mechanism
> (HTTP webhook vs. message queue), authentication model, retry policy, and delivery tracking.
> This requires a new contract negotiation with the CRM integration team before implementation.

---

### ITEM 3 — CRM-Callable First-Owner Invite Resend / Re-Dispatch API

**Gap identifier:** PI-003  
**Source:** White paper §10.3, §6.4

#### CONFIRMED REPO TRUTH

A tenant-scoped invite resend endpoint exists:
`POST /api/tenant/memberships/invites/:id/resend` (`server/src/routes/tenant.ts` line 609).

This endpoint:
- Requires a tenant JWT with `OWNER` or `ADMIN` role.
- Regenerates the invite token and resets `expiresAt` to 7 days from now.
- Is designed for team-member invite resend by an authenticated tenant owner or admin.
- **Cannot be called before the first owner has activated** (tenant auth requires prior activation).
- Is therefore structurally inaccessible for `FIRST_OWNER_PREPARATION` invite resend via CRM.

No control-plane equivalent exists. A search across `server/src/routes/admin/` and `control.ts` confirms
no `resend-invite`, `re-dispatch`, or similar endpoint exists that accepts a CRM service bearer token.

#### PENDING IMPLEMENTATION

There is no service-token-authenticated, control-plane–callable endpoint for CRM to trigger resend
of an expired or unactivated `FIRST_OWNER_PREPARATION` invite. The CRM cannot extend an invite TTL
or regenerate an invite token for a pre-activation tenant.

#### NON-BLOCKING FOR CRM WHITE PAPER

The `FIRST_OWNER_PREPARATION` invite has a 7-day TTL (`INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000`
in `tenantProvision.service.ts`). Most activations complete within this window. Expired invite
recovery is a support escalation path, not a routine CRM operational path.

The white paper documents this gap and states that expired invite recovery requires platform admin
action. CRM is not expected to handle this case autonomously today.

#### OPERATIONAL IMPACT TODAY

If a first owner fails to activate within 7 days, CRM cannot self-serve a resend. CRM must route
the case to platform support, who can use internal admin tooling to reset the invite. Volume of
such cases is expected to be low.

#### RECOMMENDED FUTURE DELIVERY UNIT

> `[RECOMMENDED FUTURE DELIVERY UNIT]`  
> **CRM Service-Token Invite Resend Endpoint** — Implement  
> `POST /api/control/tenants/provision/resend-invite` (or equivalent) accepting the CRM service
> bearer token, targeting a pre-activation tenant by `orchestrationReference` or `tenantId`,
> regenerating the `FIRST_OWNER_PREPARATION` invite token, and optionally triggering a re-send
> email. Authentication model should follow the existing `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH`
> pattern in `server/src/routes/admin/tenantProvision.ts`.

---

### ITEM 4 — Explicit `activationCompletedAt` Field on Schema

**Gap identifier:** PI-004  
**Source:** White paper §10.3, Appendix A §A.3

#### CONFIRMED REPO TRUTH

Confirmed by reading `server/prisma/schema.prisma`:

- No column named `activation_completed_at`, `activationCompletedAt`, `activated_at`, or
  `activatedAt` exists on the `tenants`, `organizations`, `invites`, or `memberships` models.
- The `Invite` model has `acceptedAt DateTime? @map("accepted_at")` — this is the only timestamp
  recording when a first-owner activation was completed.
- `queryProvisioningStatus()` in `tenantProvision.service.ts` computes `activatedAt` as
  `invite.acceptedAt?.toISOString() ?? null`.
- The polling response exposes this as `activation.activatedAt`.

There is no canonical, first-class activation timestamp column on any table.

#### PENDING IMPLEMENTATION

The platform does not have a dedicated `activation_completed_at` (or equivalent) timestamp field
that canonically records the moment of first-owner activation. The proxy (`invites.accepted_at`)
works for the FIRST_OWNER_PREPARATION invite but is an indirect signal — it is the invite
acceptance timestamp, not a purpose-built activation completion timestamp.

This also means: if a tenant's invite is recreated or reset (e.g., after expiry), the proxy
`activatedAt` would reflect the new acceptance timestamp, not the original activation event.

#### NON-BLOCKING FOR CRM WHITE PAPER

The white paper documents that CRM should read `activation.activatedAt` from the polling endpoint
and that this field carries the proxy value (`invites.acceptedAt`). This is sufficient for CRM
operational use. The behavioral caveats are documented in the white paper.

The proxy is stable and correct for the primary case (normal activation on first invite). The
edge case (invite regeneration) is not a current operational scenario.

#### OPERATIONAL IMPACT TODAY

None for standard CRM activation flows. The `activation.activatedAt` timestamp from the polling
endpoint is accurate and usable as an activation milestone for CRM operational records.

#### RECOMMENDED FUTURE DELIVERY UNIT

> `[RECOMMENDED FUTURE DELIVERY UNIT]`  
> **Activation Timestamp Schema Addition** — Add a purpose-built `activation_completed_at`
> (nullable `Timestamptz`) field to the `tenants` or `organizations` table, set atomically
> inside the `POST /api/tenant/activate` transaction. This is a non-breaking additive schema
> change. After the field exists, `queryProvisioningStatus()` should expose it as the canonical
> `activation.activatedAt` value, superseding the `invites.acceptedAt` proxy.
> Requires a migration applied via the standard SQL-first sequence.

---

### ITEM 5 — `platform.tenant.activation_completed` EventLog Event

**Gap identifier:** PI-005  
**Source:** White paper §10.3

#### CONFIRMED REPO TRUTH

Confirmed by reading `server/src/lib/events.ts`:

The `AUDIT_ACTION_TO_EVENT_NAME` registry (lines 390–414) maps audit actions to event names.
The full current registry is:

```typescript
const AUDIT_ACTION_TO_EVENT_NAME: Record<string, KnownEventName> = {
  TENANT_CREATED_ORIGIN:             'tenant.TENANT_CREATED_ORIGIN',
  TENANT_OWNER_CREATED:              'tenant.TENANT_OWNER_CREATED',
  TENANT_OWNER_MEMBERSHIP_CREATED:   'tenant.TENANT_OWNER_MEMBERSHIP_CREATED',
  TEAM_INVITE_CREATED:               'team.TEAM_INVITE_CREATED',
  CREATE_TENANT:                     'tenant.TENANT_CREATED_ORIGIN',
  INVITE_MEMBER:                     'team.TEAM_INVITE_CREATED',
  'cart.CART_CREATED':               'marketplace.cart.created',
  'cart.CART_ITEM_ADDED':            'marketplace.cart.item.added',
  'cart.CART_ITEM_UPDATED':          'marketplace.cart.item.updated',
  'cart.CART_ITEM_REMOVED':          'marketplace.cart.item.removed',
};
```

The audit action `'user.activated'` (written by `POST /api/tenant/activate`) is NOT in this registry.
When `maybeEmitEventFromAuditEntry()` processes this audit log entry, the mapping check returns
`undefined` and the function silently returns without emitting any event.

The event name `platform.tenant.activation_completed` does not appear anywhere in the codebase.
The naming convention in the registry uses `tenant.*`, `team.*`, and `marketplace.*` prefixes
(not `platform.tenant.*`), though `event_logs.name` is a free-form `VarChar(100)` with no DB constraint.

#### PENDING IMPLEMENTATION

The first-owner activation event is not emitted to the EventLog. Specifically:

- `'user.activated'` audit action → missing from `AUDIT_ACTION_TO_EVENT_NAME`
- No `platform.tenant.activation_completed` (or equivalent) event is written to the `event_logs` table
- No activation lifecycle event is available for downstream consumers (projections, AI backbone, audit replay)

#### NON-BLOCKING FOR CRM WHITE PAPER

The EventLog is an internal platform observability and replay mechanism. CRM does not consume
the `event_logs` table directly. CRM activation discovery uses the polling endpoint, not the
EventLog. The absence of an activation EventLog entry does not affect CRM's ability to detect,
record, or act on tenant activation.

#### OPERATIONAL IMPACT TODAY

Activation events are not replayed, not captured in projections, and not available to any EventLog
consumer. Internal platform observability for activation milestones relies solely on the `audit_logs`
table (`action: 'user.activated'`). AI backbone and projection pipelines that expect an activation
lifecycle event will not receive one.

#### RECOMMENDED FUTURE DELIVERY UNIT

> `[RECOMMENDED FUTURE DELIVERY UNIT]`  
> **Activation EventLog Registration** — Add `'user.activated': 'platform.tenant.activation_completed'`
> (or the canonical event name per the event naming conventions in force at implementation time)
> to the `AUDIT_ACTION_TO_EVENT_NAME` registry in `server/src/lib/events.ts`. Because
> `maybeEmitEventFromAuditEntry()` is already called from `writeAuditLog()` inside the activation
> transaction, no other code path change is required. This is the smallest possible delivery unit
> for this item. Requires review of the `KnownEventName` union type to add the new name.

---

## Priority Recommendation

Priority ordering is based on (a) operational impact on CRM integration, and (b) implementation
complexity. All items are non-blocking for the current CRM white paper.

| Priority | Gap ID | Title | Rationale |
|---|---|---|---|
| 1 | PI-005 | EventLog activation event | Smallest implementation unit; no schema change; immediately improves platform observability |
| 2 | PI-004 | `activationCompletedAt` schema field | Low-risk additive schema change; strengthens canonical activation record; removes proxy dependency |
| 3 | PI-003 | CRM-callable invite resend | Removes a support escalation path; bounded scope; follows existing auth pattern |
| 4 | PI-001 | `organizations.status = 'ACTIVE'` automation | Requires admin portal design + UX; higher scope; no CRM impact |
| 5 | PI-002 | Platform-to-CRM webhook | Requires new delivery infrastructure design + CRM contract negotiation; highest scope |

---

## Suggested Sequencing

Items PI-005 and PI-004 can proceed independently in any order.

PI-003 should follow PI-004, as a canonical `activationCompletedAt` field strengthens the
resend eligibility logic (compare activation timestamp vs. invite expiry).

PI-001 should be sequenced after the admin review workflow design is complete — it is an
internal platform milestone unrelated to CRM integration.

PI-002 should not be started without a formal CRM webhook contract negotiation (URL, auth
scheme, retry policy, payload shape, idempotency).

---

## What Remains Closed

The following operational deliverables are CLOSED and must not be reopened by this register or
any follow-on artifact that references it:

| Closed OD | Description |
|---|---|
| OD-001 | Tenant identifier and field-mapping contract |
| OD-002 | Activation milestone and CRM polling contract |
| OD-003 | Provisioning API request/response contract (APPROVED_ONBOARDING mode) |
| OD-004 | Invite token delivery and first-owner activation UX contract |
| OD-005 | Status response shape and polling cadence contract |
| OD-006 | Authentication and service bearer token contract |

These items are documented in the parent white paper and prior governance artifacts. They represent
the complete, implemented CRM integration surface. No CRM implementation changes are required
as a result of this register.

---

## Current Governance Posture (TECS)

- **Mode:** `HOLD-FOR-BOUNDARY-TIGHTENING`
- **Active sentinel:** D-016 ACTIVE
- **Active delivery unit:** `NONE`

None of the five pending items in this register constitute an active delivery unit. They must not
be implemented until an explicit delivery unit is opened per the TECS governance lifecycle.

---

## Recommended Next Platform-Side Implementation Cycle

When the platform governance posture moves to an active delivery unit, the recommended scope for
the first implementation cycle touching the items in this register is:

**"Activation Observability Hardening"**

Scope: PI-005 (EventLog event registration) + PI-004 (activationCompletedAt schema field)

These two items together close the activation observability gap, introduce no breaking changes,
require no new contract negotiation, and deliver a canonical activation record for internal
platform use. They can be implemented in a single atomic commit pair (schema migration + event
registry update).

---

*End of register — TEXQTIC CRM HANDOFF PENDING IMPLEMENTATION REGISTER v1*
