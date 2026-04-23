# TexQtic Main App — CRM Identifier and Field Mapping Contract v1

**Document type:** Internal contract artifact — Main App side  
**Status:** FINAL — closes OD-001, OD-004 (CRM path), OD-006  
**Date:** 2026-07-15  
**Author:** TECS Safe-Write Mode — automated governance closure  
**Commit target:** `[GOVERNANCE] define Main App CRM identifier and field mapping contract`  
**Not for distribution:** This is a Main-App-internal contract. The CRM-facing white paper is a
separate, follow-on artifact commissioned after this document is committed.

---

## 1. Document Authority and Scope

### 1.1 Purpose

This document closes the three open decisions that remained after the prior session's activation
milestone and polling endpoint work (commit `2ef6431`):

| Open Decision | Subject | Status after this document |
|---|---|---|
| OD-001 | Canonical CRM lookup / durable identifier contract | **CLOSED** |
| OD-004 | Conflict-code ambiguity — CRM service-token path assessment | **CLOSED** (CRM path) |
| OD-006 | CRM customer-account field mapping / sync-back field set | **CLOSED** |

This document is bounded to the Main App side of the CRM → Main App handoff. It does not define
CRM-side schema, CRM field names, or CRM internal data models. It defines only what the Main App
produces and what classification each produced field carries for CRM persistence purposes.

### 1.2 Prior Session Closures

The following open decisions were closed in the prior session (commit `2ef6431`) and are not
re-opened here:

| Open Decision | Subject | Closed by |
|---|---|---|
| OD-002 | Activation-complete canonical signal | Polling endpoint + `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` activation signal |
| OD-003 | `invitePurpose` canonical value for first-owner invite | `'FIRST_OWNER_PREPARATION'` confirmed as canonical |
| OD-005 | CRM-safe status polling endpoint | `GET /api/control/tenants/provision/status` implemented and tested |

### 1.3 Governance Constraints

- **No code changes unless strictly necessary.** This is an artifact-only closure.
- **No CRM-side schema is invented or implied.** CRM's data model is outside this repo.
- **No email as canonical cross-system join key.** Email is a validation signal only.
- **No webhook architecture is defined here.** Notification mechanism was resolved by polling in OD-005.
- **Do not draft the CRM-facing white paper here.** That is a separate, follow-on artifact.

---

## 2. Source Evidence Summary

The following files were read and confirmed as the basis for this contract:

| File | Role |
|---|---|
| `server/prisma/schema.prisma` | Runtime truth — `Tenant`, `organizations`, `Invite`, `Membership`, `User` models |
| `server/src/routes/admin/tenantProvision.ts` | Confirmed 409 conflict codes, auth gate, response shape |
| `server/src/services/tenantProvision.service.ts` | Confirmed atomic transaction sequence, `queryProvisioningStatus` response |
| `server/src/types/tenantProvision.types.ts` | Confirmed type shapes and normalization |
| `docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md` | Activation signal definition, OD-002/OD-005 closure |
| `docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md` | Workstream analysis, prior open-decision register |
| `CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md` | Coverage matrix, confirmed canonical positions |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Design model, system-of-record contract |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Entity inventory, join-key inventory |

---

## 3. Workstream A — Durable Platform Identifier Contract (OD-001 CLOSED)

### 3.1 The Two Identifiers

The Main App produces exactly two cross-system identifiers for a provisioned tenant. Both are
present in every `APPROVED_ONBOARDING` provisioning response. Both are present in every polling
status response. They serve different purposes and must not be substituted for each other.

| Identifier | Field name in API response | DB column | DB table | Uniqueness |
|---|---|---|---|---|
| **Platform-issued durable UUID** | `orgId` | `id` (PK) | `tenants` = `organizations` | Primary key — globally unique |
| **CRM-issued orchestration reference** | `orchestrationReference` | `external_orchestration_ref` (Prisma: `externalOrchestrationRef`) | `tenants` | `@unique` |

**`tenants.id = organizations.id`** — these are the same UUID, enforced by a DB-level FK
(`organizations.id` references `tenants.id` with `onDelete: Cascade`). The `orgId` returned in
the API response is `tenants.id` and also `organizations.id` simultaneously. They are one value.

### 3.2 Durable Platform Identifier: `orgId`

**CANONICAL PLATFORM DECISION:**

`orgId` is the durable, permanent platform-issued identifier for a provisioned tenant. CRM MUST
store `orgId` as its authoritative reference to the Main App tenant record after provisioning.

- `orgId` is a UUID (`Tenant.id` = `organizations.id`)
- `orgId` never changes after provisioning
- `orgId` is safe for long-term CRM servicing linkage
- `orgId` is the required query parameter for `GET /api/control/tenants/provision/status?orgId=`
- `orgId` is the boundary key for all tenant-scoped operations in the Main App

**CRM usage rule:** Store `orgId` as the Main App tenant reference in the CRM customer account
record at provisioning time. Use `orgId` for all post-activation servicing queries to the Main App.

### 3.3 Cross-System Join Key: `orchestrationReference`

**CANONICAL PLATFORM DECISION:**

`orchestrationReference` is the cross-system orchestration join key. It is CRM-owned and
CRM-generated; the Main App stores it but does not generate it. It is the link-time anchor that
proves the connection between a specific CRM onboarding case and the corresponding platform
tenant/organization.

- `orchestrationReference` is stored in `tenants.external_orchestration_ref` (`@unique`)
- The same value is also stored in `organizations.external_orchestration_ref` (`@unique`)
- The same value is also indexed in `invites.external_orchestration_ref` (not unique — by design;
  future re-provisioning variants may reuse the reference in a new invite)
- At provisioning time, all three columns receive the identical value in a single atomic transaction
  — divergence between `tenants` and `organizations` columns is structurally impossible at
  provisioning time and has no update code path today

**CRM usage rule:** CRM owns this value. The Main App echoes it back in the response for
confirmation. CRM should retain it as the traceability join between its onboarding case and the
platform tenant, but should migrate to `orgId` as the primary servicing reference as soon as
`orgId` is received and stored.

### 3.4 Canonical CRM Lookup Column

**CANONICAL PLATFORM DECISION:**

When CRM queries the Main App using the orchestration reference, the lookup targets
`tenants.external_orchestration_ref`. This is confirmed by the `queryProvisioningStatus` service
function, which executes:

```
tenant.findFirst({ where: { externalOrchestrationRef: orchestrationReference } })
```

The `organizations.external_orchestration_ref` column carries the same value but is NOT the
lookup-entry column for the status polling endpoint. The `tenants` table is the runtime identity
root; the `organizations` table is the commercial identity root. CRM-side lookups enter through
the `tenants` table.

**Stated authority:**
- **CRM lookup via orchestration ref:** enter through `tenants.external_orchestration_ref`
- **CRM lookup via orgId:** enter through `tenants.id` (= `organizations.id`)
- **`organizations.external_orchestration_ref`:** retained as traceability/audit join, NOT the
  primary CRM lookup column

---

## 4. Workstream A — CRM Identifier Lookup Decision Table

The following table governs which identifier CRM should use for each operational moment:

| Operational moment | Recommended identifier | Why |
|---|---|---|
| Immediate re-query after provisioning (e.g., verify 201 response) | Either `orchestrationReference` OR `orgId` | Both are available in the 201 response; either is valid during the transition window |
| Idempotency check before re-submitting provisioning | `orchestrationReference` | The onboarding case ID is what CRM has before provisioning. A duplicate submission returns 409 `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` |
| Post-activation status polling | `orgId` preferred; `orchestrationReference` accepted | `orgId` is stable and permanent; orchestration ref is the join key but `orgId` is the servicing anchor |
| Long-term CRM servicing linkage | `orgId` ONLY | `orchestrationReference` is a provisioning-time join key; post-activation it is a traceability audit field, not a query key |
| CRM customer account storage | Store BOTH | CRM customer account should carry `orgId` as the primary reference and `orchestrationReference` as the audit traceability join |

### 4.1 Identifier Lifecycle

| Phase | `orgId` availability | `orchestrationReference` availability |
|---|---|---|
| Before provisioning | Not available (does not exist) | CRM-owned — exists in CRM onboarding case |
| Provisioning 201 response | **Available — returned in `orgId` field** | Available — echoed in `orchestrationReference` field |
| Status polling response | **Available — always in `orgId` field** | Available — always in `orchestrationReference` field |
| Post-activation | **Available — unchanged** | Available — unchanged (audit traceability) |
| Long-term | **Primary servicing reference** | Retained as historical join key only |

---

## 5. Workstream A — Sync-Back Field Protocol Summary

CRM receives the following identifiers at provisioning time and must handle them as follows:

| Field | CRM action |
|---|---|
| `orgId` | **MUST store** — this is the permanent Main App tenant reference |
| `orchestrationReference` | **SHOULD retain** — traceability join between onboarding case and platform tenant |
| `firstOwnerAccessPreparation.inviteToken` | **MUST capture at provisioning time** — this is the only delivery window for the raw token. It is NOT stored in the Main App DB. If lost, re-dispatch requires an admin resend flow |
| `firstOwnerAccessPreparation.inviteId` | **SHOULD store** — invite UUID for resend reference and audit correlation |

---

## 6. Workstream B — CRM Field Export Classification (OD-006 CLOSED)

### 6.1 Classification Definitions

| Classification | Meaning |
|---|---|
| **CANONICAL PLATFORM IDENTIFIER** | Durable, permanent platform-issued UUID or cross-system join key. CRM must store this. |
| **EVIDENCE / OBSERVATION** | Observable fact confirmed from platform DB state. CRM may store for audit, display, or activation confirmation. Not a primary servicing key. |
| **ADVISORY DISPLAY FIELD** | Human-readable or display-oriented field. May change over time (e.g., slug after org rename). CRM should not rely on this for servicing lookups. |
| **ONE-TIME SECRET — DO NOT PERSIST LONG-TERM** | Credential returned once. Must be handled with security controls. Must not be stored unencrypted in CRM long-term; must be delivered or discarded promptly. |
| **NOT APPLICABLE AT THIS PHASE** | Field is null or not yet available at the specified response phase. Ignore or treat as informational null. |

---

## 7. Workstream B — Provisioning 201 Response Field Classification

These fields are returned in the `POST /api/control/tenants/provision` → 201 Created response
for `APPROVED_ONBOARDING` mode.

| Response field | DB source | Classification | CRM handling rule |
|---|---|---|---|
| `orgId` | `tenants.id` = `organizations.id` | **CANONICAL PLATFORM IDENTIFIER** | Store as permanent Main App tenant reference in CRM customer account |
| `orchestrationReference` | Echoed from request (stored in `tenants.external_orchestration_ref`) | **CANONICAL PLATFORM IDENTIFIER** | Retain as traceability join between onboarding case and platform tenant |
| `provisioningMode` | Constant `'APPROVED_ONBOARDING'` | EVIDENCE / OBSERVATION | Optional; confirms CRM service-token path was used |
| `slug` | `tenants.slug` | ADVISORY DISPLAY FIELD | May use for URL construction or display; not a stable servicing key (slug can change on rename) |
| `organization.legalName` | `organizations.legal_name` | EVIDENCE / OBSERVATION | Confirms platform received the correct legal name; useful for human reconciliation |
| `organization.jurisdiction` | `organizations.jurisdiction` | EVIDENCE / OBSERVATION | Confirms jurisdiction was recorded; optional CRM storage |
| `organization.registrationNumber` | `organizations.registration_no` | EVIDENCE / OBSERVATION | Optional; present only if submitted at provisioning time |
| `organization.status` | `organizations.status` = `'VERIFICATION_APPROVED'` | EVIDENCE / OBSERVATION | Confirms provisioning was accepted; this is the platform's post-CRM-approval status |
| `firstOwnerAccessPreparation.inviteId` | `invites.id` | EVIDENCE / OBSERVATION | Store for resend reference and audit correlation |
| `firstOwnerAccessPreparation.invitePurpose` | `invites.invite_purpose` = `'FIRST_OWNER_PREPARATION'` | EVIDENCE / OBSERVATION | Confirms this is a first-owner invite, not a team-member invite |
| `firstOwnerAccessPreparation.email` | `invites.email` | EVIDENCE / OBSERVATION | Cross-check against CRM's first-owner contact record |
| `firstOwnerAccessPreparation.role` | Constant `'OWNER'` | EVIDENCE / OBSERVATION | Confirms first-owner will have OWNER role |
| `firstOwnerAccessPreparation.expiresAt` | `invites.expires_at` | ADVISORY DISPLAY FIELD | Use to track delivery urgency; show to CRM operators for resend scheduling |
| `firstOwnerAccessPreparation.artifactType` | Constant `'PLATFORM_INVITE'` | EVIDENCE / OBSERVATION | Confirms artifact type; reserved for future extensibility |
| `firstOwnerAccessPreparation.inviteToken` | Cleartext raw token (NOT stored in DB) | **ONE-TIME SECRET — DO NOT PERSIST LONG-TERM** | Deliver to first owner promptly via CRM communication channel; do not store cleartext in CRM DB; discard after delivery or encrypt at rest |
| `userId` | `null` (no user at provisioning time) | NOT APPLICABLE AT THIS PHASE | Ignore; user does not exist yet |
| `membershipId` | `null` (no membership at provisioning time) | NOT APPLICABLE AT THIS PHASE | Ignore; membership does not exist yet |

### 7.1 Canonical Invite URL Construction

CRM constructs the first-owner invite URL from the raw token as follows:

```
{FRONTEND_URL}/accept-invite?token={inviteToken}&action=invite
```

- `FRONTEND_URL` is the Main App's frontend base URL (e.g., `https://app.texqtic.com`)
- `inviteToken` is the raw token from `firstOwnerAccessPreparation.inviteToken`
- The token must be URL-encoded if it contains special characters
- The invite expires at `firstOwnerAccessPreparation.expiresAt` (7 days from provisioning)
- The token is single-use and invalidated on acceptance

---

## 8. Workstream B — Polling Status Response Field Classification

These fields are returned in the `GET /api/control/tenants/provision/status` response
(CRM polling endpoint, closed under OD-005).

| Response field | DB source | Classification | CRM handling rule |
|---|---|---|---|
| `orgId` | `tenants.id` | **CANONICAL PLATFORM IDENTIFIER** | Confirms permanent tenant reference; cross-check against stored `orgId` |
| `orchestrationReference` | `tenants.external_orchestration_ref` | **CANONICAL PLATFORM IDENTIFIER** | Confirms traceability join; cross-check against CRM onboarding case |
| `slug` | `tenants.slug` | ADVISORY DISPLAY FIELD | Optional display use |
| `provisioningStatus` | Derived: `'PROVISIONED'` or `'ACTIVATED'` | EVIDENCE / OBSERVATION | **Key polling signal.** `'ACTIVATED'` means activation signal has fired. See activation signal definition below |
| `organizationStatus` | `organizations.status` | EVIDENCE / OBSERVATION | Current lifecycle status of the organization |
| `firstOwnerAccessPreparation.inviteId` | `invites.id` | EVIDENCE / OBSERVATION | Invite UUID |
| `firstOwnerAccessPreparation.invitePurpose` | `invites.invite_purpose` | EVIDENCE / OBSERVATION | Always `'FIRST_OWNER_PREPARATION'` for CRM-provisioned tenants |
| `firstOwnerAccessPreparation.email` | `invites.email` | EVIDENCE / OBSERVATION | First-owner email |
| `firstOwnerAccessPreparation.expiresAt` | `invites.expires_at` | ADVISORY DISPLAY FIELD | Invite expiry timestamp |
| `firstOwnerAccessPreparation.acceptedAt` | `invites.accepted_at` | EVIDENCE / OBSERVATION | **Activation proxy timestamp.** Non-null means first owner has completed activation. Null means pending. |
| `firstOwner.userId` | `memberships.user_id` | EVIDENCE / OBSERVATION | First-owner platform user UUID. Available post-activation; null pre-activation |
| `firstOwner.membershipId` | `memberships.id` | EVIDENCE / OBSERVATION | Membership UUID. Available post-activation; null pre-activation |
| `firstOwner.role` | `memberships.role` | EVIDENCE / OBSERVATION | Always `'OWNER'` post-activation; null pre-activation |
| `activation.isActivated` | Derived boolean | EVIDENCE / OBSERVATION | `true` when all three activation conditions are satisfied (see §8.1) |
| `activation.activatedAt` | `invites.accepted_at` | EVIDENCE / OBSERVATION | Timestamp of activation completion. Null if not yet activated |
| `activation.activationSignal` | Derived string | EVIDENCE / OBSERVATION | `'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION'` when activated; null when not |

### 8.1 Activation Signal Definition

**CONFIRMED REPO TRUTH (closed under OD-002, commit `2ef6431`):**

The canonical Main App activation signal is:

```
activation.isActivated = true
activation.activationSignal = 'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION'
```

This signal fires when ALL THREE of the following conditions are simultaneously true:

| Condition | DB evidence |
|---|---|
| First-owner invite was accepted | `invites.accepted_at IS NOT NULL` (for invite with `invite_purpose = 'FIRST_OWNER_PREPARATION'`) |
| OWNER membership exists | `memberships` row exists with `role = 'OWNER'` and `tenant_id = orgId` |
| Organization is in a post-activation status | `organizations.status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED')` |

**CRM polling rule:** Poll `GET /api/control/tenants/provision/status?orgId={orgId}` until
`activation.isActivated = true` or `provisioningStatus = 'ACTIVATED'`. These two fields carry
equivalent information. Polling frequency and retry limits are CRM's responsibility.

### 8.2 Platform Organization Status Mapping

| `organizationStatus` value | Meaning | When set |
|---|---|---|
| `'VERIFICATION_APPROVED'` | CRM onboarding was approved; platform provisioned; user not yet activated | Set at provisioning by the `APPROVED_ONBOARDING` path |
| `'PENDING_VERIFICATION'` | First owner has activated; awaiting admin document review | Set at `POST /api/tenant/activate` |
| `'ACTIVE'` | Fully verified and operationally active | No confirmed code path in current release |
| `'SUSPENDED'` | Account suspended by admin action | Admin action |
| `'CLOSED'` | Account closed | Admin action |
| `'VERIFICATION_REJECTED'` | Verification was rejected | Admin action |
| `'VERIFICATION_NEEDS_MORE_INFO'` | Verification requires additional documents | Admin action |

**CRM note:** `'ACTIVE'` has no current code path. The confirmed activation-complete signal for
CRM purposes is `provisioningStatus = 'ACTIVATED'` / `activation.isActivated = true`, not
`organizationStatus = 'ACTIVE'`.

---

## 9. Workstream B — Field Handling Rules for CRM Persistence

| Rule | Constraint |
|---|---|
| **R-1: `orgId` is mandatory** | CRM MUST store `orgId` at provisioning time. If lost, CRM cannot query status without re-using the orchestration reference (which requires the original onboarding case). |
| **R-2: `inviteToken` delivery window** | CRM has a single delivery window for the raw invite token — the 201 provisioning response. After this, the token is not available from the Main App. If the window is missed, a resend must be triggered via the invite resend flow (requires admin action). |
| **R-3: `inviteToken` storage policy** | CRM must NOT store the raw `inviteToken` in plaintext in a long-term store. Acceptable: deliver immediately then discard, or encrypt at rest with key rotation. The token is a single-use credential with a 7-day TTL. |
| **R-4: Email is not a join key** | `firstOwnerAccessPreparation.email` is a validation cross-check field. CRM must not use email as the canonical join key between its contact record and the platform user record. Use `firstOwner.userId` (post-activation) for any user-level join. |
| **R-5: `slug` is not a servicing key** | `slug` may change if the tenant is renamed. CRM must not use `slug` as a stable reference for servicing lookups. Use `orgId`. |
| **R-6: `acceptedAt` is the activation timestamp proxy** | There is no `activationCompletedAt` field on any table. `invites.accepted_at` (surfaced as `firstOwnerAccessPreparation.acceptedAt` and `activation.activatedAt`) is the canonical activation timestamp proxy. |
| **R-7: Null fields are phase-specific** | `userId`, `membershipId`, `firstOwner.*`, `activation.activatedAt`, `activation.activationSignal` are null pre-activation. CRM must handle null gracefully and re-poll rather than treating null as an error. |

---

## 10. Workstream C — Conflict Code Closure Assessment (OD-004 CLOSED for CRM Path)

### 10.1 Confirmed Code Reality

**CONFIRMED REPO TRUTH (from `server/src/routes/admin/tenantProvision.ts`, function
`resolveP2002ConflictCode`):**

The provisioning route now returns DISTINCT 409 conflict codes based on which unique constraint
was violated:

| HTTP | Error code | Trigger condition |
|---|---|---|
| 409 | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | `meta.target` includes `'orchestration'` — a tenant with this orchestration reference is already provisioned |
| 409 | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | All other P2002 violations — duplicate name or slug |

This distinction was implemented in the current codebase and is confirmed as repo truth.

### 10.2 CRM-Path Assessment

**CRM service-token callers operate exclusively via `APPROVED_ONBOARDING` mode.** The CRM service
token cannot invoke `LEGACY_ADMIN` provisioning (the route enforces this gate). Therefore:

**Conflict scenario analysis for CRM callers:**

| Conflict scenario | Possible for CRM caller? | Code returned |
|---|---|---|
| Duplicate `orchestrationReference` (idempotent re-submission) | **YES** — the primary idempotency case | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` |
| Duplicate tenant name / slug | Yes — if CRM submits two different cases with the same legal name | `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` |
| Duplicate membership constraint (P2002 on `memberships`) | **NO** — CRM provisioning does NOT create a membership. Membership is deferred to user activation. This constraint cannot fire on the CRM service-token path. | N/A |

**Conclusion:** The membership constraint ambiguity (the partially-open aspect of OD-004) is NOT
on the CRM service-token path. The CRM service-token path creates zero membership rows at
provisioning time (confirmed in service code: `APPROVED_ONBOARDING` branch creates only
`tenants`, `organizations`, and `invites` rows). OD-004 is fully closed for the CRM path.

### 10.3 CRM Idempotency Protocol

| HTTP response | CRM action |
|---|---|
| 201 Created | Provisioning succeeded. Store `orgId`, `orchestrationReference`, `inviteId`, and `inviteToken`. Deliver invite token promptly. |
| 409 `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` | This orchestration reference is already provisioned. Do NOT retry. Query `GET /api/control/tenants/provision/status?orchestrationReference={ref}` to retrieve the existing `orgId` and current status. |
| 409 `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` | A different tenant with this legal name or slug already exists. This is a naming conflict, not an idempotent re-submission. Investigate and resolve the name before retrying with a different `orchestrationReference`. |
| 400 `VALIDATION_ERROR` | Fix the request payload. Do not retry without corrections. |
| 403 `FORBIDDEN` | Service token mismatch or mode restriction. Rotate token or check `provisioningMode`. |
| 500 `PROVISION_ABORT` | Admin context stop-loss triggered. Retry may be attempted once; if it recurs, escalate to platform engineering. |
| 5xx (other) | Transient error. Retry with exponential backoff. Safe to retry — the unique constraint will catch any duplicate. |

---

## 11. Open Decision Closure Register

All six open decisions from the prior readiness investigation are now CLOSED.

| OD | Subject | Resolution | Closed by |
|---|---|---|---|
| OD-001 | Durable identifier and canonical CRM lookup column | `tenants.externalOrchestrationRef` is the canonical lookup column for orchestration-ref queries. `orgId` (= `tenants.id`) is the permanent durable identifier. CRM must store `orgId` at provisioning time. See §3–§5. | This document |
| OD-002 | Activation-complete canonical signal | Signal: `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION`. Conditions: `invite.acceptedAt IS NOT NULL` + OWNER membership exists + org status in post-activation set. Implemented in `queryProvisioningStatus`. | Prior session (commit `2ef6431`) |
| OD-003 | `invitePurpose` canonical value | `'FIRST_OWNER_PREPARATION'` is confirmed canonical for CRM-originated provisioning. Service code and integration tests confirm. | Prior session (commit `2ef6431`) |
| OD-004 | 409 conflict code CRM-path ambiguity | `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` vs `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` distinction implemented. Membership conflict is NOT reachable on the CRM service-token path. See §10. | This document |
| OD-005 | CRM-safe polling endpoint | `GET /api/control/tenants/provision/status` implemented, accepting `?orgId=` and `?orchestrationReference=`. Auth-gated (service bearer or SUPER_ADMIN JWT). 24/24 tests pass. | Prior session (commit `2ef6431`) |
| OD-006 | CRM customer-account field mapping / sync-back field set | Full field classification matrix defined. See §7, §8, §9. | This document |

---

## 12. Workstream D — White Paper Readiness Conclusion

### 12.1 Assessment

With the closure of OD-001, OD-004 (CRM path), and OD-006 in this document, and OD-002,
OD-003, OD-005 in the prior session, all six open decisions that blocked the CRM-facing white
paper are now closed.

**CONCLUSION: The Main App is now ready for the CRM-facing registration/activation handoff white
paper to be drafted.**

### 12.2 What IS Ready for the White Paper

| Capability | Status | Evidence |
|---|---|---|
| Provisioning endpoint and auth gate | ✅ Complete | `POST /api/control/tenants/provision` — implemented, tested, service-token-gated |
| Atomic transaction (tenants + organizations + invites) | ✅ Complete | Confirmed in `tenantProvision.service.ts`, single `prisma.$transaction` |
| `invitePurpose: 'FIRST_OWNER_PREPARATION'` canonical value | ✅ Complete | OD-003 closed — confirmed as repo truth |
| Idempotency: 409 with distinct conflict codes | ✅ Complete | OD-004 closed — `CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE` vs `CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE` |
| Durable identifier: `orgId` | ✅ Complete | OD-001 closed — `orgId` = `tenants.id` = `organizations.id` |
| CRM lookup column: `tenants.externalOrchestrationRef` | ✅ Complete | OD-001 closed — confirmed by `queryProvisioningStatus` service function |
| Activation-complete signal | ✅ Complete | OD-002 closed — `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION` |
| CRM polling endpoint | ✅ Complete | OD-005 closed — `GET /api/control/tenants/provision/status` |
| Field classification matrix | ✅ Complete | OD-006 closed — §7, §8, §9 of this document |
| `inviteToken` delivery protocol | ✅ Complete | One-time token, 201-response-only, 7-day TTL |
| Activation sequence (user activation route) | ✅ Complete | `POST /api/tenant/activate` confirmed in prior analysis |

### 12.3 Confirmed Code Gaps (NOT Blocking the White Paper)

The following gaps remain in the codebase but do NOT block the CRM-facing white paper. The white
paper must label them as `[PENDING IMPLEMENTATION]` rather than omitting them:

| Gap | Status | White paper treatment |
|---|---|---|
| `organizations.status = 'ACTIVE'` transition | No confirmed code path | Mark as `[PENDING IMPLEMENTATION]` — the confirmed activation signal (`PENDING_VERIFICATION` + invite accepted + ownership) is sufficient for CRM purposes |
| Platform → CRM push notification / webhook | Not implemented | Mark as `[NOT YET IMPLEMENTED]` — CRM uses polling endpoint (OD-005) |
| Invite token re-dispatch via CRM-callable API | Not implemented | Mark as `[PENDING IMPLEMENTATION]` — expired invites require admin resend flow |
| Explicit `activationCompletedAt` field on tenant/org | Does not exist | Mark as noted — `invites.accepted_at` is the canonical proxy |
| `platform.tenant.activation_completed` EventLog event | Not emitted | Mark as `[PENDING IMPLEMENTATION]` — audit log events serve the informational role today |

### 12.4 White Paper Constraints (Carry-Forward from Prior Investigation)

The following constraints from `CRM-MAIN-APP-WHITE-PAPER-REQUEST-RECONCILIATION-v1.md` §7
remain in effect for the white paper drafting prompt:

1. Do not collapse `tenants` and `organizations` into one concept. They are a 1:1 pair with
   distinct roles.
2. Do not present `inviteToken` as a stored, re-retrievable credential. It is one-time only.
3. Do not describe the CRM→platform webhook as existing. It does not.
4. Do not describe `platform.tenant.activation_completed` as an actively-emitted EventLog event.
5. Do not cite CRM-side field names for the customer account. No CRM schema is in this repo.
6. P-1 through P-5 from the canonical business model contract may be stated without qualification.
7. Do not duplicate taxonomy coverage from `docs/TEXQTIC-CRM-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md`.

### 12.5 Recommended Next Artifact

The next authorized artifact after this commit is:

```
docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md
```

Scope: CRM-team audience. Operational. Covers the registration/activation handoff chain from
onboarding case creation to CRM customer account activation. Cites P-1 through P-5 as canonical.
References OD-001 through OD-006 as CLOSED. References this document for field classification.
Does not duplicate taxonomy coverage.

---

## 13. TECS Governance Closure Statement

### 13.1 Governed Posture at Time of Commit

- **Governing posture:** `HOLD-FOR-BOUNDARY-TIGHTENING` remains in effect per `NEXT-ACTION.md`
- **Active delivery unit:** `NONE` (D-016 active)
- **This artifact type:** Governance/contract closure — permitted under safe-write mode without
  opening a product-delivery unit

### 13.2 Commit Scope

This commit contains exactly one new file:

```
docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md
```

No code changes. No schema changes. No migration. No test changes. No other file modifications.

### 13.3 Open Decision Status After Commit

| OD | Status |
|---|---|
| OD-001 | **CLOSED** — this commit |
| OD-002 | CLOSED — commit `2ef6431` |
| OD-003 | CLOSED — commit `2ef6431` |
| OD-004 | **CLOSED (CRM path)** — this commit |
| OD-005 | CLOSED — commit `2ef6431` |
| OD-006 | **CLOSED** — this commit |

All six open decisions from `docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md` are now CLOSED.
The CRM-facing white paper is unblocked.

### 13.4 Authorized Successor

The next authorized artifact under the safe-write governance frame is the CRM-facing white paper
(`docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md`). That artifact requires a
separate human-authorized prompt with its own allowlist, scope, and commit target.

---

*TexQtic — TECS Safe-Write Mode — governance corpus, main branch.*
