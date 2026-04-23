# CRM–Main App White Paper Request: Reconciliation Against Canonical Handoff Contract

**Document type:** Investigation artifact — read-only, governance-bounded
**Status:** COMPLETE
**Date:** 2026-07-14
**Author:** TECS Safe-Write Mode — automated read pass
**Commit target:** `[GOVERNANCE] reconcile CRM white-paper request against canonical handoff contract`

---

## 1. Scope Confirmation

This artifact reconciles the implicit CRM-team request for an authoritative white paper
covering the **CRM → Main Application registration / activation handoff** against all
currently available repo truth.

The "CRM request" is defined by the following need: a white paper that operationally explains
to the CRM team (a) the canonical object chain from raw submission to live customer account,
(b) exact terminology, (c) cross-system ID strategy, (d) the precise seam definitions for
each handoff event, and (e) retry and idempotency behaviour.

This reconciliation does **not** produce the white paper. It produces the bounded coverage
matrix and constraints that the next prompt must use when commissioning the white paper.

**Out of scope for this artifact:**
- Any runtime code, schema, or migration changes
- Any editorial decisions about the white paper's audience framing
- Any new contract definitions (those belong in the next commissioned artifact)

---

## 2. Source Artifacts Reviewed

| # | Artifact | Path | Coverage role |
|---|---|---|---|
| 1 | Canonical Business Model and Handoff Contract | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Definitive design model |
| 2 | Data Reality Reconciliation Investigation | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Current repo-state audit |
| 3 | CRM Taxonomy Handoff White Paper | `docs/TEXQTIC-CRM-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md` | Existing audience-facing paper (taxonomy/classification only) |
| 4 | Prisma schema | `server/prisma/schema.prisma` | Runtime truth: Tenant, Organization, Invite, Membership, User, EventLog, AuditLog |
| 5 | TECS governance | `TECS.md` | Operating constraints |
| 6 | Layer 0 control | `governance/control/NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md` | Delivery posture confirmation |

---

## 3. Critical Schema Discovery (New Findings vs. Prior Investigation)

The Data Reality Reconciliation Investigation (artifact 2) was authored prior to full schema
confirmation. The following facts, now directly verified from `schema.prisma`, must override
or extend the investigation findings:

### 3.1 Dual orchestration-ref columns exist

Both `tenants.external_orchestration_ref` (Prisma field: `externalOrchestrationRef`, `@unique`) and
`organizations.external_orchestration_ref` (`@unique`) carry a cross-system orchestration ref.

The `organizations` model shares its primary key with `Tenant` — `organizations.id` is a
foreign key referencing `tenants.id` with `onDelete: Cascade`. They are a 1:1 pair where
`organizations` is the extended commercial/legal profile of a `Tenant`.

**Implication:** The orchestration ref is stored on BOTH rows at provisioning time. There is
no DB-level constraint guaranteeing they carry the same value. The white paper must explicitly
state which table is the lookup authority for CRM-side queries.

### 3.2 Invite model carries orchestration ref and purpose

`invites.external_orchestration_ref` (indexed) and `invites.invite_purpose` (default
`"TEAM_MEMBER"`) exist in schema. A first-owner invite can carry the orchestration ref and a
distinct purpose value. However, no value `"FIRST_OWNER"` is documented in the schema or in
any migration. The `"TEAM_MEMBER"` default is the only value attested in code.

### 3.3 No activation timestamp field

Neither `tenants` nor `organizations` carries an `activationCompletedAt` or equivalent
timestamp. The contract event `platform.tenant.activation_completed` is named in the design
model but its persistence mechanism is undefined in the schema. The `invites.accepted_at`
field records first-owner invite consumption and is the closest proxy for "first login
completed," but it is not formally designated as the activation-complete trigger.

### 3.4 Organization status states confirmed

`organizations.status` legal values (SQL check constraint, not a Prisma enum):
`ACTIVE` | `SUSPENDED` | `CLOSED` | `PENDING_VERIFICATION` | `VERIFICATION_APPROVED` |
`VERIFICATION_REJECTED` | `VERIFICATION_NEEDS_MORE_INFO`

The mapping of these states to CRM onboarding approval states (`crm.onboarding.approved`)
is not formally specified anywhere in the repo.

### 3.5 EventLog schema is open-coded

`event_logs.name` is `VarChar(100)` — no enum, no constraint beyond length. The event names
defined in the contract (`crm.onboarding.approved`, `platform.tenant.provisioned`, etc.) are
design-time assertions. No migration, service, or route confirms that these names are actively
emitted. The EventLog model exists but its population path is unconfirmed.

---

## 4. Coverage Matrix

### 4.1 ALREADY ANSWERED by existing artifacts

These items are fully covered and require only citation in the white paper; no new work.

| Item | Answered by | Confidence |
|---|---|---|
| Canonical object chain (all 11 objects, Raw Submission → Customer Account) | Contract v1 §Canonical Object Chain | HIGH |
| Terminology normalization (company, account, prospect, tenant, org, workspace, contact, applicant, first owner, user, approval, issuance, activation, plan, entitlement) | Contract v1 §Terminology | HIGH |
| System-of-record assignments per object (who owns, who may project, what is forbidden) | Contract v1 §System-of-Record Contract | HIGH |
| Why email is NOT a canonical cross-system join key | Contract v1 §Cross-System ID Strategy | HIGH |
| Onboarding case as the cross-system orchestration anchor | Contract v1 §Cross-System ID Strategy, confirmed by `tenants.external_orchestration_ref` + `organizations.external_orchestration_ref` | HIGH |
| Four handoff contract decisions A–D | Contract v1 §Handoff Contract Decisions | HIGH |
| Family / segment / WL / Aggregator vocabulary for CRM classification | CRM Taxonomy White Paper v1 | HIGH |
| Three-stage implementation sequencing | Contract v1 §Implementation Sequencing | HIGH |
| Forbidden cross-system conflations (do not treat email as join key; do not collapse CRM account into platform tenant; do not treat platform invite as CRM issuance artifact) | Contract v1 §Forbidden Conflations | HIGH |

### 4.2 PARTIALLY ANSWERED — needs explicit statement in the white paper

These items have partial repo truth but require a formal, audience-facing statement that
currently does not exist in any committed document.

| Item | What exists | What is missing | Risk if omitted |
|---|---|---|---|
| Which row is the CRM lookup authority for the orchestration ref | `tenants.external_orchestration_ref` AND `organizations.external_orchestration_ref` both exist and are both `@unique` | No document states which one CRM queries. Dual columns risk divergence. | CRM may query the wrong table; diverged values cause silent lookup failure |
| Platform activation evidence | `invites.accepted_at` records invite consumption; org status `VERIFICATION_APPROVED` / `ACTIVE` records a state | No field named `activationCompletedAt`; no confirmation that `invites.accepted_at` IS the canonical activation timestamp | CRM does not know when "activation complete" has occurred in the platform |
| First-owner invite purpose value | `invites.invite_purpose` exists; default is `"TEAM_MEMBER"` | No `"FIRST_OWNER"` value is documented or attested. The white paper cannot reference it as canonical | CRM's description of invite issuance will reference a value the platform does not emit |
| Organization status → CRM onboarding state mapping | Organization status states exist in schema | No formal mapping: which org status corresponds to "provisioning started", "provisioning complete", "activation complete" | CRM admin tools will misread platform state |
| Event name canonicalization | Event names are listed in the contract; `event_logs.name` is an open VarChar | No migration or route confirms these event names are actively emitted | White paper will describe events that may not fire |
| CRM-side identifiers for post-activation servicing | Contract says "customer account = durable CRM-side mapping object" | No CRM-side schema is present in this repo; the contract has no field names for CRM's customer account record | CRM team has no implementation target |

### 4.3 UNRESOLVED — no repo truth exists; white paper must explicitly mark as PENDING

These items have no current basis in any committed artifact. The white paper must not invent
answers for them. They must be labelled as `[PENDING — not yet specified]`.

| Item | Status | Required future work |
|---|---|---|
| Retry / idempotency model for platform provisioning | UNRESOLVED | Design decision required: how does the platform detect a duplicate provisioning request carrying the same orchestration ref? No handler, no unique-constraint check logic, no documented retry boundary. |
| CRM approval → platform provision callback / webhook contract | UNRESOLVED | No webhook endpoint, no event bus configuration, no API route for inbound CRM-to-platform provisioning trigger exists in any repo artifact |
| Platform activation → CRM reflection callback / webhook contract | UNRESOLVED | No webhook endpoint, no CRM API spec, no outbound notification mechanism from platform to CRM exists in any repo artifact |
| `invites.invite_purpose` canonical value for first-owner invite | UNRESOLVED | No `"FIRST_OWNER"` value in schema. Must be formally added and documented before white paper can reference it |
| Exact event payload shape for `platform.tenant.activation_completed` | UNRESOLVED | EventLog schema accepts free JSON. No payload shape is defined in any artifact |
| CRM customer account field mapping (which CRM fields carry platform tenant UUID, org UUID, first-owner user UUID) | UNRESOLVED | CRM's data model is outside this repo. No CRM-side schema document exists in this repo |
| Activation-complete timestamp field on Tenant or Organization | UNRESOLVED | Schema confirms no `activationCompletedAt` field. If activation state must be queried, it requires either a new field or a derivation rule (e.g., first membership + accepted invite = activation) — neither is documented |

---

## 5. Confirmed Canonical Positions

The five positions below are confirmed by cross-referencing the design contract against the
current Prisma schema. They are safe to state as canonical facts in the white paper.

| Position | Canonical statement | Schema confirmation |
|---|---|---|
| **P-1: Onboarding case** | The onboarding case is the pre-runtime, cross-system orchestration anchor. Its identifier flows into the platform as `tenants.external_orchestration_ref` and `organizations.external_orchestration_ref`. | Both `@unique` columns confirmed in schema. |
| **P-2: CRM approval trigger** | CRM admin approval of the onboarding case is the only lawful trigger for platform tenant and organization provisioning. The platform does not self-initiate provisioning. | No self-provisioning route confirmed in any artifact. |
| **P-3: Tenant created first** | The platform creates the tenant row atomically with (or prior to) the organization row. `organizations.id` is a foreign key to `tenants.id` with `onDelete: Cascade` — the organization cannot exist without its parent tenant. | Confirmed by `organizations tenants @relation(fields: [id], references: [id], onDelete: Cascade)`. |
| **P-4: Activation-complete trigger** | Platform activation complete (evidenced by first-owner invite acceptance and first-login recording) is the lawful trigger for CRM to reflect the tenant as an active customer account. CRM must not change its state based on provisioning alone. | `invites.accepted_at` confirmed; no other activation mechanism found. |
| **P-5: Customer account** | The CRM customer account is a durable CRM-side mapping object created after activation is confirmed. It is not the same as the platform tenant, the platform organization, or the onboarding case. | Confirmed by contract; no customer account model in this repo (CRM owns it). |

---

## 6. Open Decisions the White Paper Must State Explicitly

These decisions are not made yet. The white paper must surface them as open questions
requiring a specific future prompt or product decision — not paper over them.

| Decision ID | Decision question | Impact if deferred |
|---|---|---|
| OD-001 | Which of `tenants.external_orchestration_ref` vs. `organizations.external_orchestration_ref` is the authoritative CRM lookup column? | Silent divergence; CRM may store the ref against the wrong UUID |
| OD-002 | What is the canonical activation-complete signal? (`invites.accepted_at` + `memberships` row creation? A dedicated `activationCompletedAt` field? An EventLog entry?) | CRM cannot reliably detect activation completion |
| OD-003 | What is the canonical `invites.invite_purpose` value for a first-owner invite? (`"FIRST_OWNER"` vs `"ONBOARDING_FIRST_OWNER"` vs something else?) | White paper references a value the platform does not emit |
| OD-004 | What is the retry / idempotency boundary for provisioning? (Idempotency key? `409 Conflict` on duplicate orchestration ref?) | Duplicate tenant/org rows possible if CRM retries |
| OD-005 | How does the platform signal activation-complete to CRM? (Webhook to CRM endpoint? Polling table? Shared event bus entry?) | The `platform.tenant.activation_completed` event has no delivery mechanism |
| OD-006 | What fields does the CRM customer account carry that reference the platform? (platform tenant UUID? org UUID? first-owner user UUID? all three?) | CRM white paper cannot specify the sync-back identifiers |

---

## 7. Safe Drafting Constraints for the Next White Paper Prompt

When commissioning the CRM Registration/Activation Handoff White Paper, the following
constraints are non-negotiable:

1. **Do not invent OD-001 through OD-006 answers.** Each open decision must be surfaced as
   `[PENDING — requires explicit product decision]` in the white paper body.

2. **Do not collapse `tenants` and `organizations` into one concept.** They are a 1:1 pair
   with distinct roles: `tenants` is the access/auth boundary; `organizations` is the
   commercial/legal profile. Both are platform-side. Both are NOT the CRM customer account.

3. **Do not present `invites.invite_purpose = "FIRST_OWNER"` as confirmed.** It is
   unconfirmed. Use `"TEAM_MEMBER"` (the confirmed default) and note that a first-owner
   purpose value is pending formal designation.

4. **Do not treat `invites.accepted_at` as the confirmed canonical activation timestamp.**
   It is the closest available proxy. The canonical activation mechanism is OD-002 pending.

5. **Do not describe a CRM→platform webhook or platform→CRM callback as existing.** Both
   are UNRESOLVED. The white paper may describe the intended architecture but must label it
   `[PENDING IMPLEMENTATION]`.

6. **Do not cite CRM-side field names for the customer account.** No CRM schema is present
   in this repo.

7. **The white paper may NOT restate the family/segment/WL/Aggregator taxonomy rules.**
   That is the scope of the existing CRM Taxonomy White Paper (artifact 3), which is
   complete. The new white paper covers the operational handoff chain only.

8. **P-1 through P-5 may be stated as canonical without qualification.**

---

## 8. Recommendation

### 8.1 Which artifact to produce next

**Produce a NEW white paper artifact** — do NOT revise the existing taxonomy paper
(`docs/TEXQTIC-CRM-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md`).

The existing taxonomy paper is complete, correct, and covers a distinct subject
(classification vocabulary). Modifying it would violate its scope and create confusion
about what each paper covers.

The existing internal design contract
(`CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`) is the correct
machine-readable design artifact, but it is an internal design document — not an
audience-facing operational guide for the CRM team.

**Recommended new artifact:**

```
docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md
```

**Scope:** CRM-team audience. Operational. Covers the registration/activation handoff
chain from onboarding case creation to CRM customer account activation. References
P-1 through P-5 as canonical. Explicitly marks OD-001 through OD-006 as open decisions.
Does not duplicate taxonomy coverage.

### 8.2 Prerequisites before commissioning the white paper

The white paper can be commissioned immediately for the covered and partially-covered
items. The open decisions (OD-001 through OD-006) must be surfaced in the document as
pending — they do not block the paper's creation, only limit its completeness.

The following items SHOULD be resolved before the white paper is considered shippable to
the CRM team:

- OD-002: Activation-complete canonical signal (required for CRM to implement its side)
- OD-003: `invite_purpose` canonical value for first-owner (required for any invite flow documentation)
- OD-005: Platform→CRM notification mechanism (required for CRM to know when to activate the customer account)

OD-001, OD-004, and OD-006 are important but can be deferred to a follow-up amendment
without blocking initial delivery.

---

## 9. Files Read During This Investigation

| File | Purpose |
|---|---|
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Full read |
| `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Full read |
| `docs/TEXQTIC-CRM-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md` | Full read |
| `server/prisma/schema.prisma` | Full read (models: Tenant, Organization, Invite, Membership, User, EventLog, AuditLog, and all governance models) |
| `TECS.md` | Relevant sections |
| `governance/control/NEXT-ACTION.md` | Full read |
| `governance/control/OPEN-SET.md` | Full read |
| `governance/control/SNAPSHOT.md` | Full read |

## 10. Files Modified During This Investigation

None. This artifact is the sole output. No code, schema, migration, API route, or
governance control file was modified.

---

*End of reconciliation artifact.*
