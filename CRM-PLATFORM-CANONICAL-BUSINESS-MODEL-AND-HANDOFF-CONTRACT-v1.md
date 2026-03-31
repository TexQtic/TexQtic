# Design Scope Confirmation

This design was produced in the TexQtic main repo as the orchestration context. The CRM repo and marketing repo were treated as read-only evidence sources, and no code, schema, migrations, or runtime behavior were changed.

The design goal here is the minimum lawful cross-system model: keep marketing, CRM, and platform separate, but make the handoff chain explicit, typed, and durable.

# Canonical Object Chain

The minimum canonical journey should be:

1. Website Request
2. Raw Submission
3. Qualified Lead
4. Onboarding Case
5. Approved Onboarding Case
6. Platform Provisioning Handoff
7. Platform Tenant + Platform Organization
8. First-Owner Access Preparation
9. CRM Access Issuance
10. Platform Activation Complete
11. CRM Customer Account Activation / Servicing Start

The key design rule is that the full journey does not collapse into one object. It is a chain of bounded objects with explicit handoffs.

| Object | Purpose | Bounded owning domain | Canonical cross-system or local-only | When it comes into existence | Upstream / downstream links |
| --- | --- | --- | --- | --- | --- |
| Raw Submission | Preserve the unqualified website-origin intake with attribution and origin context | CRM intake domain, captured via marketing proxy | Canonical for intake origin, not for runtime | When the marketing site submission is accepted by CRM intake | Upstream: website request. Downstream: may produce one qualified lead |
| Qualified Lead | Represent a reviewed commercial prospect suitable for follow-up | CRM commercial domain | Local-only to CRM | When intake is qualified by CRM | Upstream: raw submission. Downstream: may produce one onboarding case |
| Onboarding Case | Represent the canonical pre-runtime customer workflow from onboarding entry through approval | CRM onboarding domain | Canonical cross-system handoff anchor | When a qualified lead is promoted into onboarding | Upstream: qualified lead. Downstream: approval, provisioning request, issuance, later customer account |
| Customer Account | Represent the ongoing internal CRM relationship after successful runtime activation | CRM post-activation operations domain | Canonical cross-system counterpart on CRM side | When CRM records servicing start after platform activation complete | Upstream: onboarding case. Downstream: servicing, tickets, lifecycle ops |
| Access Issuance | Record that CRM has dispatched access to the designated first owner | CRM onboarding / issuance domain | Local-only object with cross-system reference | After platform has prepared first-owner access and CRM dispatches it | Upstream: approved onboarding case plus platform access reference. Downstream: platform activation |
| First-Owner Contact | Represent the business person designated to become the initial platform owner | Shared business concept, operationally captured in CRM | Canonical role concept, not a single shared row | At latest by onboarding case creation | Upstream: submission/lead contact. Downstream: platform owner invite, membership, local user records |
| Platform Tenant | Represent the runtime tenancy root and workspace container | Platform | Canonical runtime object | When platform provisioning is executed | Upstream: approved onboarding handoff. Downstream: organization, invite, membership, workspace |
| Platform Organization | Represent the platform-side business entity identity paired to runtime tenancy | Platform | Canonical runtime identity object | Atomically with tenant provisioning | Upstream: platform provisioning. Downstream: runtime identity, status, plan |
| Platform Membership / First Owner | Represent the actual runtime owner relationship between the first platform user and the tenant | Platform | Local runtime object with cross-system relevance | When the first owner accepts access and membership is created | Upstream: first-owner access preparation. Downstream: workspace access |
| Activation | Represent successful first usable entry into the platform runtime | Platform owns runtime activation; CRM owns business reflection | Cross-system milestone, not a shared master row | When the first owner completes platform activation | Upstream: issued access. Downstream: CRM customer-account activation |
| Commercial / Plan Posture | Separate commercial interpretation from runtime entitlement | CRM for internal commercial posture; Platform for runtime plan | Split by design | CRM posture exists during onboarding and servicing; platform plan exists at provisioning/runtime | Upstream: onboarding/commercial decisions. Downstream: servicing and runtime entitlement |

The minimum cross-system rule set is:

- The onboarding case is the cross-system handoff anchor before runtime exists.
- The customer account is the durable CRM-side object after runtime exists.
- The platform tenant and platform organization are the runtime roots.
- Access issuance is not the same object as platform invite/access preparation.
- Activation is a milestone shared by contract, but not a single shared database row.

# Terminology Normalization Table

| Term | Repo/domain using it today | Proposed canonical meaning | Retained, renamed, or local vocabulary | Notes |
| --- | --- | --- | --- | --- |
| company | Marketing, CRM | Human-entered business name or legal/commercial company label | Retained as local vocabulary | Not the canonical runtime object |
| account | CRM | Internal post-activation CRM relationship record | Retained as local CRM vocabulary | Should not be used as a synonym for tenant |
| prospect | CRM / commercial language | Pre-onboarding commercial candidate | Retained as local vocabulary | Maps conceptually to lead-stage business status |
| tenant | Platform | Runtime tenancy root for auth, membership, and workspace scope | Retained as canonical platform term | Primary runtime container |
| organization | Platform | Platform-side business entity identity paired to tenant | Retained as canonical platform identity term | Do not use as a synonym for CRM customer account |
| workspace | CRM, Platform | User-facing shell or work surface | Treated as local vocabulary | Not a master business object |
| contact | Marketing, CRM | Human business contact data | Retained as local vocabulary | Not a canonical auth identity |
| applicant | CRM | The onboarding contact currently progressing through issuance/activation | Treated as local CRM vocabulary | Useful during onboarding only |
| first owner | CRM, Platform | The designated initial platform owner role for a tenant | Retained as canonical role concept | Cross-system role, not shared row identity |
| user | CRM, Platform | Local authenticated identity inside one system | Retained as local vocabulary | Never assume CRM user ID equals platform user ID |
| approval | CRM, Platform | Must be qualified by domain: CRM onboarding approval or platform verification status | Retained with qualifier only | Do not use naked `approved` across systems |
| issuance | CRM | CRM dispatch of platform access package to the first owner | Retained as canonical CRM-side milestone | Not the same as runtime invite object |
| activation | CRM, Platform | Must be split into platform activation complete and CRM customer-account activation | Retained with qualifier only | Do not treat naked activation as one thing |
| plan | Platform | Runtime entitlement tier attached to platform tenant / organization | Retained as canonical platform term | CRM should not own runtime plan |
| entitlement | Platform | Effective runtime capabilities derived from plan and overrides | Retained as canonical platform runtime term | Separate from CRM commercial posture |

The normalization rule is simple: use platform terms for runtime truth, CRM terms for business operations truth, and never let a local word silently become a global synonym.

# System-of-Record Contract

| Object | System of record | Allowed projections / copies | Forbidden conflations | Cross-system reference required |
| --- | --- | --- | --- | --- |
| Raw Submission | CRM intake store | Marketing may hold transient request payloads only | Submission must not become the lead by default | Yes, once onboarding starts it should be referenceable from downstream CRM objects |
| Qualified Lead | CRM | Submission status may reflect qualification outcome | Lead must not become onboarding case or customer account | No cross-system ref required until onboarding is opened |
| Onboarding Case | CRM | May be projected into platform provisioning request context | Must not become the tenant, customer account, or issuance object | Yes, this is the canonical pre-runtime handoff anchor |
| Access Issuance | CRM | CRM may reference a platform invite/access artifact | Must not become the platform user, invite, or activation state | Yes, it should hold platform access reference once integrated |
| Customer Account | CRM | May hold platform tenant/org references for servicing context | Must not become the platform tenant or organization | Yes, this is the durable CRM-side mapping object |
| Platform Tenant | Platform | CRM may store tenant reference for linked accounts/cases | Must not be treated as the CRM customer account | Yes |
| Platform Organization | Platform | CRM may store organization reference for linked accounts/cases | Must not be used as a synonym for customer account | Yes |
| Platform Membership / First Owner | Platform | CRM may store the resulting runtime owner refs as context | Must not replace CRM contact/applicant history | Yes, but only after activation is complete |
| Platform Plan | Platform | CRM may read or mirror for internal visibility | Must not be overwritten by CRM commercial posture | Yes if CRM needs servicing visibility |
| CRM Commercial Posture | CRM | Platform may read only if later explicitly needed | Must not directly drive runtime entitlements | No, unless later commercial product design requires it |

The forbidden conflations matter more than the projections:

- Raw submission is not a lead.
- Lead is not onboarding.
- Onboarding is not customer account.
- Customer account is not tenant.
- Issuance is not runtime invite identity.
- CRM commercial posture is not platform entitlement.

# Cross-System ID Strategy

A single cross-system orchestration ID is needed.

The right owner is the onboarding case, not the raw submission and not the customer account.

Why:

- Raw submission is too early and too noisy.
- Qualified lead is still a commercial prospect object, not yet a runtime handoff anchor.
- Customer account is too late because platform provisioning must happen earlier.
- The onboarding case is the first object that is both selective enough and stable enough to drive provisioning.

The contract should be:

- The onboarding case owns a single orchestration reference for the full cross-system journey from approved onboarding to activated runtime.
- The raw submission and qualified lead may carry it only as a downstream backlink after the onboarding case exists.
- CRM access issuance stores it as a handoff correlation reference.
- CRM customer account stores it as a durable servicing reference.
- Platform tenant stores it as the external orchestration reference.
- Platform organization stores the same reference for identity-level traceability.
- Platform first-owner invite or equivalent access-preparation artifact stores the same reference.
- Platform membership and platform user may store it as audit metadata, but tenant and organization are the primary runtime anchors.

Local-only IDs should remain local:

- submission ID
- lead ID
- onboarding case ID
- issuance ID
- customer account ID
- platform tenant ID
- platform organization ID
- platform invite ID
- platform membership ID
- platform user ID

Email must never be a canonical join key.

Email is allowed only as:

- a lookup hint
- a dedupe signal
- a validation check during issuance / activation
- a human-facing identity clue during operator review

It is not allowed as the durable cross-system identity contract.

# Lifecycle / Event Contract

| Transition | Owning system | Event / transition meaning | Input object | Output object | Should trigger cross-system handoff |
| --- | --- | --- | --- | --- | --- |
| Lead received | CRM intake, from marketing-origin submission | `intake.submission.accepted` | Website request payload | Raw submission | Yes, marketing to CRM only |
| Lead qualified | CRM | `crm.lead.qualified` | Raw submission / lead review | Qualified lead | No |
| Onboarding case opened | CRM | `crm.onboarding.case_opened` | Qualified lead | Onboarding case | No |
| Onboarding approved | CRM | `crm.onboarding.approved` | Onboarding case | Approved onboarding case | Yes, this should trigger platform provisioning |
| Tenant / org provisioned | Platform | `platform.tenant.provisioned` | Approved onboarding handoff | Platform tenant + platform organization | Yes, reflect provisioning success back to CRM |
| First-owner identity ready | Platform | `platform.first_owner.access_prepared` | Provisioned tenant/org + first-owner contact payload | Platform invite / access-preparation artifact | Yes, enables CRM issuance |
| Access issued | CRM | `crm.access.issued` | Approved onboarding case + platform access reference | CRM issuance record | No new system handoff required |
| First login | Platform | `platform.first_login.recorded` | First-owner access artifact | First login evidence | No canonical handoff by itself |
| Platform activation complete | Platform | `platform.tenant.activation_completed` | First-owner login + completed runtime activation | Active first-owner runtime state | Yes, this is the lawful trigger for CRM reflection |
| CRM account activation / servicing start | CRM | `crm.customer_account.activated` | Platform activation-complete reflection + onboarding case | Customer account active for servicing | No further mandatory handoff |

The ownership split is:

- CRM owns pre-runtime business progression.
- Platform owns runtime provisioning and runtime activation.
- CRM resumes ownership for post-activation servicing once it reflects platform activation complete.

# Handoff Contract Decisions

## A. What is the lawful trigger for platform provisioning?

Choice: after CRM admin approval.

Justification:

- Lead qualification is too early and would create runtime tenants for unapproved prospects.
- CRM issuance is too late because issuance should dispatch access to a runtime object that already exists.
- CRM activation completion is impossible as a provisioning trigger because runtime objects must exist before activation can occur.
- CRM admin approval is the clean business gate where the prospect has passed onboarding sufficiently to justify creating runtime tenancy.

## B. What is the lawful trigger for CRM reflection from platform?

Choice: tenant activation complete.

Justification:

- Tenant provisioned is preparatory, not activation.
- First owner invited is preparatory, not activation.
- First login is evidence, but still weaker than a completed activation milestone.
- Platform activation complete is the first strong runtime fact that a usable tenant and first-owner relationship are live.
- CRM should then explicitly record its own post-activation business truth from that runtime signal, not silently assume it.

## C. What is the platform-side object created first?

Choice: tenant.

Justification:

- The platform tenant is the runtime root that scopes workspace, auth context, invites, and memberships.
- The platform organization should be created atomically with the tenant as the paired identity record.
- Membership, invite, and first-owner user are downstream runtime artifacts that depend on the tenant existing first.

## D. What is the CRM-side object that deserves to map to platform runtime truth?

Choice: customer account.

Justification:

- The onboarding case is the correct provisioning trigger, but it is still a pre-runtime workflow ledger.
- The customer account is the durable internal post-activation object that should remain linked to the long-lived platform tenant/org.
- Lead and issuance are too narrow and temporary to be the durable CRM counterpart to runtime tenancy.
- For the pre-activation window, the onboarding case may temporarily carry the pending platform reference as a bridge.

# Plan / Commercial / Entitlement Boundary Note

The plan / commercial boundary should be explicitly split.

The design contract is:

- CRM commercial posture is internal and advisory/operational first.
- Platform plan is runtime entitlement truth.
- CRM may influence whether onboarding is approved or whether servicing posture is restricted, but it should not directly own runtime feature entitlement.
- Platform plan should determine actual runtime capabilities, access tiers, and feature availability.
- If TexQtic later needs unified billing, contract, subscription, or revenue entitlement logic, that should be a later canonical commercial object, not something inferred prematurely from today’s CRM posture.

What should be deferred:

- any unified subscription object
- any billing-led entitlement object
- any order-to-subscription normalization
- any cross-system revenue or settlement contract
- any automatic propagation from CRM commercial posture to platform runtime entitlements

# Out-of-Scope / Non-Goals

This design does not do the following:

- no schema migration design
- no API implementation design
- no sync-job design
- no event-bus implementation design
- no forced database merge
- no AdminRBAC redesign
- no launch-readiness overreach beyond the modeled handoff contract
- no collapse of CRM customer account into platform tenant
- no collapse of platform runtime identity into CRM contact or applicant identity
- no decision that email is a canonical identity
- no redesign of the current auth providers or invite mechanics beyond defining the handoff contract

# Repo Trigger Guidance

The next CRM implementation prompt belongs in the CRM repo.

Reason:

- CRM owns onboarding approval, issuance, customer-account creation, and servicing truth.
- The first CRM implementation work after this design is to persist the orchestration reference, store platform handoff refs, and consume the platform activation-complete reflection.

The next platform handoff implementation prompt belongs in the TexQtic main repo.

Reason:

- The platform owns tenant, organization, membership, invite/access preparation, and runtime activation truth.
- The first platform implementation work after this design is to accept the approved-onboarding provisioning handoff and emit the activation-complete reflection.

The next marketing submission cleanup prompt belongs in the marketing repo.

Reason:

- The public form and the legacy parallel intake path live there.
- That repo should align submission payload shape to the canonical CRM intake contract and retire the legacy survivor path from canonical use.

Any later schema reconciliation prompt belongs in the TexQtic main repo first.

Reason:

- Schema reconciliation is a cross-system design and ownership question before it becomes a repo-local implementation question.
- After the canonical reconciliation decision is locked in the main repo, repo-specific schema implementation prompts should then branch to the owning repos.

# Implementation Sequencing Recommendation

## Stage 1

Implement the platform-side provisioning handoff foundation in the TexQtic main repo.

Why first:

- The missing runtime handoff seam is the sharpest gap.
- The platform must be able to create and persist tenant/org/access-preparation artifacts from an approved onboarding handoff before CRM can issue access against that runtime truth.

## Stage 2

Implement the CRM approved-onboarding to platform-provisioning handoff and issuance alignment in the CRM repo.

Why second:

- Once the platform can accept the handoff, CRM can become the lawful producer of the approved-onboarding provisioning request.
- This stage should also align CRM issuance so it dispatches access to a platform-created access artifact rather than acting as if issuance itself creates runtime truth.

## Stage 3

Implement platform activation-complete reflection and CRM servicing-start consumption, beginning in the TexQtic main repo and then continuing in the CRM repo.

Why third:

- The authoritative runtime trigger originates on the platform side.
- After that outbound contract exists, CRM can consume it and record `client_activated` and customer-account servicing start from the platform milestone instead of relying on a disconnected parallel activation interpretation.

A parallel support-lane prompt may then clean up marketing submission drift in the marketing repo, but that should follow the core handoff seam rather than replace it.