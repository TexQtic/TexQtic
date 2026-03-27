# TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1

## 1. Title / Status / Purpose

- Title: `TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1`
- Status: Draft design authority for bounded onboarding execution
- Owner: Product truth / delivery planning
- Authority level: Product-truth design for onboarding-domain execution planning; not a governance replacement and not an implementation artifact
- Purpose: Define the bounded system design needed to close the onboarding verification loop so a newly activated tenant can move from submitted verification into visible review outcome and, when approved, into a usable trade-capable tenant state
- Relationship to `ONBOARDING-ENTRY-001`: This document is the execution-grade design baseline for `ONBOARDING-ENTRY-001`. It explains what must become materially true for that entry to close and what remains outside its boundary

## 2. Scope Boundary

This design covers the onboarding domain from activation entry through business verification outcome and transition into a usable tenant state.

Included:

- onboarding branching between enterprise and white-label tenant containers
- business verification submission and persisted verification state
- user-visible verification status continuity after submission
- approval, rejection, and needs-more-info outcome handling at the system-design level
- activation-state transition into a trade-capable tenant posture when approved
- the placement of subscription tiers as a post-activation capability layer
- the execution boundary between `ONBOARDING-ENTRY-001` and `ONBOARDING-ENTRY-002`

Excluded:

- full-platform redesign
- auth redesign
- tenant provisioning redesign
- schema migration design
- route rewrite design
- white-label admin completion
- billing implementation
- broader operations, exchange, or AI governance work

This is not a full-platform redesign. It is a bounded onboarding-domain design intended to close a specific loop already identified in product truth.

## 3. Current Repo Baseline

The repo is not starting from zero.

Current baseline already present in repo truth and code:

- a four-step onboarding flow already exists
- activation submission wiring already exists
- backend activation persistence already exists
- tenant, user, and membership creation already exist in the activation path
- tenant status propagation already exists through tenant session identity and frontend tenant state
- a pending-verification gate already exists and blocks trade, RFQ, escrow, and settlement views in the tenant experience

Current baseline does not yet establish a closed verification outcome loop.

What remains incomplete:

- verification submission reaches `PENDING_VERIFICATION`
- the user can enter the workspace in a blocked state
- the system does not yet present a complete, authoritative verification outcome continuity model from submission to operator review to approved or rejected result
- activation does not yet close truthfully into a stable trade-capable state based on a real recorded verification outcome

This design assumes the opening truth for `ONBOARDING-ENTRY-001` remains authoritative: the missing work is not onboarding creation, but completion of the verification outcome loop.

## 4. Core System Model

### 4.1 Canonical domain model

The onboarding domain should be understood as five connected models:

1. tenant identity model
2. onboarding branch model
3. verification model
4. activation model
5. trade-capable tenant-state model

### 4.2 Tenant identity model

Tenant identity is structural. The bounded onboarding decision is which tenant container the user is entering:

- enterprise tenant
- white-label tenant

This identity determines the platform container being activated, the operating shell family, and downstream provisioning expectations.

### 4.3 Onboarding branch model

Onboarding branches early based on tenant container type, not commercial behavior.

- enterprise branch: user is joining the TexQtic network as an enterprise tenant
- white-label branch: user is activating a white-label tenant that represents their own platform/container

### 4.4 Verification model

Business verification is a loop, not a single upload step.

It must include:

- submission
- persisted state
- review visibility
- outcome recording
- outcome visibility
- state transition effect on tenant usability

### 4.5 Activation model

Activation is the entrypoint that converts invite-based or pre-created tenant context into a first usable authenticated tenant session. Activation is not the same thing as verification approval.

Activation should be treated as:

- identity confirmation
- first-user creation or association
- membership activation
- verification submission capture
- entry into a pending or ready tenant state depending on verification outcome

### 4.6 Trade-capable tenant-state model

Trade-capable means the tenant can use trade-facing and money-adjacent product surfaces that are intentionally blocked during pending verification.

At minimum, trade-capable means the tenant is no longer blocked from:

- trade-facing workspace entry
- RFQ participation
- trade views
- escrow-related read or action surfaces intended for active tenants
- settlement-related surfaces intended for active tenants

### 4.7 Required separations

The system design must preserve three independent axes:

- tenant identity: enterprise or white-label
- behavior or mode: B2B or B2C style experience behavior where applicable
- subscription or capability tier: commercial and feature posture after activation

`B2B` or `B2C` behavior must not become the onboarding identity. Subscription tier must not be used as the core onboarding gate.

## 5. Onboarding Branching Model

### 5.1 Branch decision

Onboarding must branch on tenant container type.

#### Enterprise branch

Intent:

- join the TexQtic network
- activate an enterprise tenant within the shared platform context

Outcome:

- enterprise tenant container exists and is entered by its first usable user
- verification determines whether that tenant can move from blocked entry to trade-capable use

#### White-label branch

Intent:

- create or activate my own branded platform container
- operate in a white-label tenant context

Outcome:

- white-label tenant container exists and is entered by its first usable user
- verification determines whether that tenant can move from blocked entry to trade-capable use

### 5.2 What this branch does not mean

This branch does not encode:

- whether the tenant behaves as B2B or B2C in every downstream surface
- what subscription tier the tenant holds
- whether white-label admin completion is already done

The branch decides tenant container identity only.

### 5.3 Repo-fit note

The current onboarding UI includes a broader platform-experience selector that exposes `AGGREGATOR`, `B2B`, `B2C`, and `WHITE_LABEL` style options. For this design, that broader selector is treated as current implementation reality, not as target onboarding truth. The target onboarding truth for `ONBOARDING-ENTRY-001` is narrower: enterprise versus white-label is the structural branch, while behavior and experience mapping remain separate downstream concerns.

## 6. Business Verification Loop

### 6.1 Loop definition

The onboarding verification loop is:

1. submission
2. persisted verification state
3. status visibility
4. review outcome
5. outcome visibility
6. approved transition into trade-capable use or rejection path back to remediation

### 6.2 Submission

Submission occurs during activation and captures the bounded business-verification facts required to place the tenant into review.

For current repo baseline, that at least includes:

- registration number
- jurisdiction

The purpose of submission is not to auto-approve the tenant. It is to create an explicit reviewable verification state.

### 6.3 Persisted verification state

Verification state must exist as an explicit, queryable system fact.

At design level, that state needs to answer:

- has the tenant submitted verification
- is the tenant awaiting review
- has the tenant been approved
- has the tenant been rejected
- has the tenant been returned for more information
- what user-visible explanation should be shown

### 6.4 Status visibility

After submission, the user must be able to see that verification is:

- received
- in review
- blocking trade-capable entry until outcome is recorded

Status visibility cannot be limited to a banner that only says pending forever. The loop requires a readable status that can later change to approved, rejected, or needs-more-info.

### 6.5 Review / approval outcome

An operator or admin review path must be able to record a real outcome against the submitted verification state.

Required outcome classes for design purposes:

- approved
- rejected
- needs more information

The design does not require schema or workflow implementation detail yet. It requires that onboarding truthfully depends on a recorded outcome, not on placeholder status text.

### 6.6 Rejection / needs-more-info handling

If verification is not approved, the tenant must remain non-trade-capable.

The system should support a loop continuation posture:

- rejected: onboarding cannot close; the tenant remains blocked and is given a clear outcome explanation
- needs more information: onboarding remains incomplete; the tenant is given a bounded remediation path to update or resubmit verification inputs

### 6.7 Approved transition

Approval is the moment where verification outcome changes tenant usability.

Approval must cause:

- user-visible status to change from review-pending to approved
- tenant state to become eligible for trade-capable use
- existing pending-verification blockers to be removed from trade-facing surfaces

The loop is closed only when approval materially changes the system state seen by the user.

## 7. Activation and Tenant-State Model

### 7.1 Activation entrypoint

Activation is the first-owner or invited-user entrypoint into a prepared tenant context. It creates or associates the user, applies membership, captures verification submission data, and returns an authenticated tenant session.

### 7.2 Tenant-state stages

The bounded onboarding state model should be treated as follows.

#### Pre-activation

- tenant context may exist
- first usable user session is not yet active
- onboarding is not complete

#### Pending verification

- activation completed
- user can enter the workspace
- tenant is not yet trade-capable
- trade-facing and fund-adjacent surfaces remain blocked
- status must be visible and stable until review outcome is recorded

#### Approved

- verification outcome is recorded as approved
- tenant becomes trade-capable
- blocked surfaces become available according to tenant type and feature posture

#### Rejected or blocked

- verification outcome is recorded as rejected or otherwise blocked
- tenant remains non-trade-capable
- user sees outcome and next-step instruction rather than an indefinite pending posture

### 7.3 Product meaning of trade-capable

Trade-capable means the tenant can use the product as an active trading participant rather than only as a submitted-but-blocked workspace.

In current product terms, approval should unblock the views and capabilities currently guarded by the pending-verification gate, including trade, RFQ, escrow, and settlement-related tenant experience entry.

### 7.4 State-transition rule

This design treats activation and approval as separate transitions:

- activation transition: enters a usable tenant workspace and captures verification submission
- verification outcome transition: decides whether the tenant remains blocked or becomes trade-capable

That separation is necessary to prevent onboarding truth from collapsing into a false "submitted equals approved" model.

## 8. Subscription and Capability Model

### 8.1 Placement of subscription

Subscription is post-activation. It is not the core onboarding gate.

The onboarding loop should close without requiring pricing or billing complexity to decide whether verification has been approved. A tenant can be verification-complete and trade-capable before full billing sophistication is implemented.

### 8.2 Default posture after onboarding

After onboarding completion, the default posture should be:

- tenant is active and verification-complete
- tenant starts in a default commercial posture that allows bounded product use
- additional capabilities can be granted through subscription tiering without reopening onboarding

### 8.3 Capability-based tiering model

Subscription should be treated as a capability envelope rather than onboarding identity.

Tenant type and subscription tier are independent axes:

- tenant type answers: what kind of tenant container is this
- subscription tier answers: what level of commercial capability is enabled

### 8.4 Proposed simple tier model

At system-design level only:

- Free / Starter: baseline verified access and limited capabilities
- Growth: expanded operational capability for active tenants
- Pro / White-label: higher capability posture and white-label-aligned feature envelope
- Enterprise+: highest capability posture, enterprise-scale service model, and negotiated feature scope

### 8.5 Rules for this onboarding design

- onboarding must not be blocked on billing implementation complexity
- verification approval must not depend on a pricing workflow to become true
- subscription upgrade or downgrade is a later commercial concern, not the definition of onboarding completion

## 9. ONBOARDING-ENTRY-001 vs ONBOARDING-ENTRY-002 Boundary

### 9.1 `ONBOARDING-ENTRY-001`

`ONBOARDING-ENTRY-001` is the business verification activation loop.

It includes:

- submission of business verification during activation
- persisted verification state
- visible verification status after activation
- recorded verification outcome
- tenant-state transition from blocked to trade-capable when approved
- blocked or remediating outcome when rejected or returned for more information

It excludes:

- redesign of tenant provisioning internals
- first-owner provisioning mechanics beyond what is already needed to enter the tenant and carry verification status
- full operator provisioning workflow redesign

### 9.2 `ONBOARDING-ENTRY-002`

`ONBOARDING-ENTRY-002` is the provisioning and first-owner activation handoff loop.

It includes:

- control-plane tenant creation handoff
- invite or first-owner assignment continuity
- coherent first usable owner entry into the new tenant
- elimination of manual detours between tenant creation and first owner access

It excludes:

- verification approval loop completion unless that work is only consumed from `ENTRY-001`

### 9.3 Boundary rule

`ENTRY-001` answers: can a user who has entered onboarding submit verification, see status, receive a real outcome, and become trade-capable when approved.

`ENTRY-002` answers: can a newly created tenant be handed off cleanly to its intended first owner without broken provisioning or invite continuity.

This boundary must remain explicit to prevent future drift.

## 10. System Surfaces and Data Contracts

### 10.1 Frontend surfaces

High-level frontend surfaces already implicated by current repo shape:

- onboarding flow surface
- invite-driven activation entry
- tenant workspace entry after activation
- pending-verification banner or blocking surface
- future verification outcome surface showing approved, rejected, or remediation-needed status

### 10.2 Backend route and service surfaces

High-level backend surfaces already implicated by current repo shape:

- activation write surface
- authenticated tenant identity read surface used after activation and login
- verification status read surface as part of tenant session identity or adjacent status retrieval
- future operator or admin verification outcome write surface

### 10.3 User / tenant / membership propagation

The onboarding loop already spans:

- user creation or association
- membership creation
- tenant identity hydration into session state
- tenant status propagation into frontend workspace state

The design requirement is that verification outcome must propagate through the same chain clearly and consistently.

### 10.4 Verification status read/write contract shape

At high level only, the system must be able to express:

- current verification state
- last authoritative outcome
- whether the tenant is blocked from trade-capable surfaces
- what next action the user should take, if any

Write surfaces must be able to record:

- submission received
- approved
- rejected
- needs more information

### 10.5 Status transitions

High-level transition model:

- pre-activation -> pending verification
- pending verification -> approved
- pending verification -> rejected
- pending verification -> needs more information
- needs more information -> resubmitted pending verification
- approved -> trade-capable active tenant use

No schema migration or route contract design is included here.

## 11. Risks / Unknowns / Validation Targets

The following items must be validated against repo truth before implementation work is started.

- current repo appears to have a genuine pending-verification gate in the frontend experience, but at least one backend tenant-identity helper appears to auto-promote `PENDING_VERIFICATION` to `ACTIVE` when owner context and verification fields exist; this must be resolved because it conflicts with the intended approval loop
- current onboarding UI exposes broader platform-experience choices than this bounded design treats as structural onboarding identity; implementation must confirm whether that selector is temporary, overloaded, or authoritative
- operator or admin verification outcome path is not yet confirmed as a real repo surface for onboarding review decisions
- the exact user-visible outcome surface for approved, rejected, and needs-more-info states is not yet confirmed
- the repo may already contain partial control-plane tenant status controls that are adjacent to, but not sufficient for, the onboarding verification loop
- current repo may be more advanced in persistence than in user-visible outcome continuity, or more advanced in UI copy than in authoritative backend outcome recording; both must be checked directly in implementation planning
- current trade-capable gating is known to block key trade-facing views, but the full blocked-surface inventory should be confirmed before code changes
- white-label branch completeness beyond verification closure remains out of scope and must not be smuggled into `ENTRY-001`

## 12. Acceptance Model

`ONBOARDING-ENTRY-001` is complete only when the onboarding loop is materially closed.

The acceptance model is:

- a new tenant user can enter onboarding and submit business verification during activation
- submission creates a stable reviewable verification state
- after activation, the tenant can enter the workspace and see authoritative verification status
- the system can record a real review outcome
- the user can see that outcome without relying on placeholder language
- approval changes tenant usability and removes the pending-verification blocker from trade-facing surfaces
- rejection or needs-more-info leaves the tenant non-trade-capable and communicates the correct next state
- the loop closes because the user can move from entry to approved usable tenant state, not because the UI contains a verification form

This is loop completion, not feature counting.

## 13. Execution Plan Inside Onboarding Domain

Bounded sequence:

1. design truth
2. repo validation against actual onboarding, activation, status propagation, and admin outcome surfaces
3. implementation slice definition for `ONBOARDING-ENTRY-001`
4. implementation of the verification outcome loop only
5. production proof that a newly activated tenant can reach visible outcome and become trade-capable when approved

This sequence remains inside the onboarding domain. It does not expand into later platform waves.

## 14. Explicit Non-Goals

This document and the bounded work it guides do not include:

- `ONBOARDING-ENTRY-002` implementation
- provisioning redesign
- white-label admin completion
- DPP or passport work
- AI governance work
- broader auth redesign
- exchange or casework changes
- shell or routing cleanup
- governance or doc cleanup outside this one design document
- billing implementation

The only purpose of this design is to define the bounded onboarding verification loop and its adjacent tenant-state consequences clearly enough for execution without opening unrelated domains.