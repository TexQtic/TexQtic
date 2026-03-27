# TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1

## 1. Title / Status / Purpose

- Title: `TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1`
- Status: Draft design authority for bounded provisioning-handoff execution
- Owner: Product truth / delivery planning
- Authority level: Product-truth design for bounded onboarding provisioning execution planning; not a governance replacement and not an implementation artifact
- Purpose: Define the bounded system design needed to close the tenant provisioning / first-owner activation handoff loop so a newly approved tenant can move from approved onboarding truth into a materially usable owner-ready tenant state
- Relationship to `ONBOARDING-ENTRY-002`: This document is the execution-grade design baseline for `ONBOARDING-ENTRY-002`. It explains what remains after `ONBOARDING-ENTRY-001` closure and what must become materially true for the remaining Wave 1 onboarding unit to close

## 2. Scope Boundary

This design covers the onboarding domain from approved onboarding truth through tenant provisioning continuity and into a usable first-owner-ready tenant state.

Included:

- approved onboarding as the starting state for provisioning continuity
- tenant provisioning continuity after approval
- first-owner activation handoff
- membership and session continuity required for owner-ready tenant usability
- the execution boundary between `ONBOARDING-ENTRY-002` and later onboarding-adjacent work
- the placement of subscription or capability posture as post-activation context rather than the core of this loop

Excluded:

- business verification redesign
- `ONBOARDING-ENTRY-001` rework
- full-platform redesign
- auth redesign
- schema migration design
- route rewrite design
- white-label completeness work
- reviewer-console redesign
- billing implementation
- broader exchange, casework, or AI governance work

This is not a verification-loop redesign and not a full-platform redesign. It is a bounded onboarding-domain design intended to close the remaining provisioning / first-owner handoff loop only.

## 3. Current Repo/Product Baseline

The onboarding verification loop is no longer the open problem.

Current baseline already established in product truth and repo truth:

- activation enters pending verification truthfully
- pending verification remains pending truthfully until a recorded outcome exists
- persisted onboarding outcomes exist
- tenant-facing continuity for non-approved outcomes exists
- approved onboarding can be explicitly transitioned to `ACTIVE`
- approved activation has a usable in-product control-plane trigger

Current baseline does not yet establish a closed provisioning / first-owner handoff loop.

What remains incomplete:

- approved onboarding does not by itself guarantee a coherent first-owner-ready tenant state
- tenant provisioning continuity may still break between control-plane tenant creation, first-owner assignment, invite continuity, membership readiness, and actual tenant entry
- session truth, membership truth, and practical tenant usability may not yet resolve as one coherent owner-ready path
- a newly approved tenant can still stop at an ambiguous “approved” posture instead of becoming materially usable by the intended first owner

This design starts from the closure truth of `ONBOARDING-ENTRY-001`. The missing work is no longer business verification. The missing work is the handoff from approved onboarding into practical owner-ready tenant usability.

## 4. Core System Model

### 4.1 Canonical domain model

The remaining onboarding provisioning domain should be understood as five connected models:

1. approved onboarding state model
2. tenant provisioning continuity model
3. first-owner readiness model
4. membership and activation continuity model
5. session entry and owner-ready tenant usability model

### 4.2 Approved onboarding state

Approved onboarding is the starting condition for this unit, not the end condition.

At the product level, approved onboarding means:

- the verification loop is already complete
- the tenant is eligible to become usable
- the system should be able to hand off into owner-ready continuity without reopening verification logic

Approved onboarding is therefore a prerequisite state for this unit, not the closure standard for this unit.

### 4.3 Tenant usability state

Tenant usability means the tenant is not merely approved in status text, but practically usable by the intended first operating owner.

At minimum, usable tenant state means:

- the correct owner can reach the tenant context through the supported handoff path
- the relevant membership and activation truth support entry rather than ambiguity
- the session-entry path resolves into an owner-ready tenant context instead of stopping at a detached approved state

### 4.4 First-owner readiness

First-owner readiness is the product-level condition where the intended first operator can actually enter and use the newly approved tenant through the expected continuity path.

This requires alignment between:

- the tenant record being ready for use
- the intended first owner being correctly associated or activatable
- the relevant membership or invite continuity being materially true
- the session-entry path resolving into the owner-ready tenant context

### 4.5 Membership and activation continuity

Membership and activation continuity covers the path from provisioning intent into usable owner access.

This continuity must answer:

- who the intended first owner is
- how that owner reaches activatable or activated membership state
- whether any invite or assignment handoff remains broken or detached
- how membership truth becomes practical entry truth

### 4.6 Session entry and owner-ready handoff

Session entry is where provisioning continuity becomes visible product truth.

The system must preserve a coherent handoff from:

- approved tenant eligibility
- to first-owner-ready membership state
- to authenticated entry into the tenant context

The loop remains incomplete if approval is true but the supported session-entry path still fails to produce a practically usable owner-ready tenant state.

### 4.7 Required separations

This design must preserve four independent axes:

- verification completion: already closed in `ONBOARDING-ENTRY-001`
- provisioning continuity: the focus of `ONBOARDING-ENTRY-002`
- owner usability: the practical result required for closure
- subscription or capability layer: post-activation commercial posture that must not define this loop

## 5. Provisioning / Handoff Loop

### 5.1 Loop definition

The provisioning / handoff loop is:

1. approved onboarding exists
2. tenant provisioning continuity begins
3. first-owner assignment or activation continuity resolves
4. membership and session truth become coherent
5. first owner reaches usable owner-ready tenant entry

### 5.2 Starting point

This loop begins after approved onboarding already exists.

The starting truth is not “verification was submitted.” The starting truth is “verification is approved and the tenant is eligible to become materially usable.”

### 5.3 Provisioning continuity

Provisioning continuity means the tenant does not fall into a detached intermediate state after approval.

The system must preserve a coherent path between:

- control-plane tenant creation or prepared tenant context
- intended first-owner association or invite continuity
- owner activation or acceptance path
- actual owner-ready tenant usability

### 5.4 First-owner usable outcome

The loop is closed only when the intended first owner can actually use the tenant through the supported path.

The loop does not close when:

- approval exists only as a recorded status
- the tenant record exists but the first-owner handoff is deferred elsewhere
- the operator is told to complete a later detached step that is not part of one coherent path

### 5.5 Why this is a loop and not a screen

This is not a registry polish task or an invite-screen task.

It is a loop because it must connect:

- approved onboarding truth
- provisioning continuity
- owner activation continuity
- owner-ready tenant usability

If any one of those steps remains detached, the enterability loop is still incomplete.

## 6. First-Owner Activation Model

### 6.1 Product meaning of first-owner activation

First-owner activation means the intended initial operator of a newly approved tenant can become the usable operating owner through the supported product path.

It includes:

- owner identity continuity
- owner association or invite continuity
- activation or acceptance continuity
- practical entry into the tenant context as the first operating owner

### 6.2 Product meaning of owner-ready state

Owner-ready state means:

- the tenant is not merely approved, but practically enterable by the intended first owner
- the first owner does not depend on an ambiguous or detached later handoff to become usable
- the owner can reach the tenant context with the correct membership or activation truth behind that entry

### 6.3 What is required for a newly approved tenant to become usable

At a behavior and contract level, this requires:

- a coherent first-owner identity or invite target
- a continuity path that brings that target into valid membership or activation state
- a tenant entry path that resolves to the owner-ready tenant context
- removal of ambiguous states where approval is true but practical owner usability is not

### 6.4 Current handoff ambiguity

Current product truth indicates likely ambiguity between:

- tenant approval and actual first-owner usability
- tenant record existence and owner-ready handoff completion
- membership or invite truth and real session-entry usability

### 6.5 What this unit should normalize

This unit should normalize the product-level handoff so that approved tenant truth, first-owner continuity, and practical owner entry become one coherent loop instead of separate partial truths.

## 7. Tenant Provisioning Continuity Model

### 7.1 Product meaning of provisioning continuity

Provisioning continuity means the newly approved tenant remains on one coherent path from prepared tenant context to usable owner-ready state.

The tenant must not become stranded between:

- provisioned structure
- owner assignment intent
- membership readiness
- usable tenant entry

### 7.2 Product-level alignment of org, tenant, user, and membership

At a high level, this unit requires that:

- the tenant context is the correct operating container
- the organization or approval truth does not diverge from practical tenant usability truth
- the intended first user is the one who can actually enter through the supported path
- membership or equivalent activation truth aligns with actual owner-ready entry

### 7.3 Product meaning of usable tenant state after approval

Usable tenant state after approval means:

- the tenant is approved
- the intended first owner can reach the tenant context
- the owner’s entry does not rely on a broken detour or hidden manual recovery path
- the owner can treat the tenant as operationally entered rather than merely structurally approved

### 7.4 What remains blocked until later units

This unit does not require:

- full white-label completeness
- broader admin shell or routing completion
- subscription sophistication
- broad auth redesign
- later mode-completeness or truth-cleanup work

Only the minimum provisioning continuity required for owner-ready tenant usability belongs here.

## 8. Subscription / Capability Positioning

### 8.1 Placement of subscription

Subscription is not the core of `ONBOARDING-ENTRY-002`.

The provisioning / first-owner handoff loop must close without requiring full billing or subscription implementation complexity.

### 8.2 Default posture after owner-ready handoff

This unit assumes only that the tenant becomes owner-ready and usable at the base capability level already supported by current product posture.

Additional capabilities can remain a later commercial or feature-layer concern.

### 8.3 Rules for this unit

- tenant usability must not depend on subscription redesign
- owner-ready continuity must not depend on billing implementation
- subscription remains a post-activation capability layer, not the identity or closure definition of this unit

## 9. ENTRY-002 Boundary vs Later Work

`ONBOARDING-ENTRY-002` is the provisioning / first-owner activation continuity loop.

It includes:

- approved onboarding handoff into provisioning continuity
- first-owner usable activation handoff
- owner-ready tenant entry continuity
- the minimum coupled surfaces needed to remove the “approved but not actually usable” state

It excludes:

- `ONBOARDING-ENTRY-001` rework
- business verification redesign
- white-label completeness
- subscription implementation
- broad auth redesign
- reviewer-console expansion
- later mode-completeness work
- exchange or ops-casework changes

This boundary is necessary so provisioning continuity can be addressed without drifting back into closed verification work or widening into later waves.

## 10. System Surfaces and Data Contracts

### 10.1 Frontend surfaces

High-level frontend surfaces already implicated by current repo shape:

- control-plane tenant creation and tenant detail surfaces
- first-owner invite or activation entry surfaces
- tenant entry surfaces used after activation or acceptance
- any owner-facing onboarding handoff surface required to make the continuity materially usable

### 10.2 Backend route and service surfaces

High-level backend surfaces already implicated by current repo shape:

- control-plane provisioning write surfaces
- invite or first-owner assignment continuity surfaces
- tenant activation and membership activation surfaces
- authenticated tenant identity and session-entry surfaces used after provisioning handoff

### 10.3 Session / membership / tenant usability surfaces

The loop likely spans:

- tenant record readiness
- user creation or association
- membership creation or activation
- invite or owner-assignment continuity
- tenant session hydration into a usable owner-ready context

### 10.4 Owner-ready continuity contract shape

At high level only, the system must be able to express:

- whether a newly approved tenant is owner-ready
- who the intended first owner is or how that owner is lawfully targeted
- whether membership or activation continuity is complete
- whether the supported entry path reaches usable tenant state

### 10.5 High-level entities involved

At high level only, this loop involves:

- tenant
- organization
- user
- membership
- invite or activation artifact if used by the current handoff model

No schema migration design is included here.

## 11. Risks / Unknowns / Validation Targets

The following items must be validated against repo truth before implementation work is started.

- the exact point where approved tenant state becomes practically usable owner-ready state is not yet confirmed as one coherent repo path
- the repo may still contain a mismatch between `ACTIVE` tenant state and actual first-owner usability
- session truth may appear complete before practical tenant usability is materially true, or the reverse
- the current control-plane provisioning surface may still split tenant creation from real first-owner activation continuity
- the exact owner-targeting mechanism, invite continuity, or membership activation continuity must be confirmed directly before implementation
- enterprise versus white-label structural identity should remain preserved, but white-label completeness beyond provisioning continuity remains out of scope

## 12. Acceptance Model

`ONBOARDING-ENTRY-002` is complete only when the provisioning / first-owner handoff loop is materially closed.

The acceptance model is:

- approved onboarding can hand off into tenant provisioning continuity
- the intended first owner can reach a materially usable owner-ready state
- session, membership, and tenant usability truth align coherently enough for real entry
- no ambiguous “approved but not actually usable” tenant state remains
- the loop closes because a newly approved tenant can become an entered owner-ready tenant, not because approval status merely exists in the system

This is loop completion, not feature counting.

## 13. Execution Plan Inside ENTRY-002

Bounded sequence:

1. design truth
2. repo validation against actual provisioning, invite, membership, activation, and tenant-entry surfaces
3. implementation slice definition for `ONBOARDING-ENTRY-002`
4. bounded implementation of the provisioning / first-owner handoff loop only
5. production proof that a newly approved tenant can become materially owner-ready through the supported path

This sequence remains inside the onboarding provisioning domain. It does not expand into later waves.

## 14. Explicit Non-Goals

This document and the bounded work it guides do not include:

- `ONBOARDING-ENTRY-001` rework
- business verification redesign
- subscription or billing implementation
- white-label completeness
- reviewer-console redesign
- DPP or passport work
- AI governance work
- exchange or casework changes
- shell or routing cleanup
- governance or doc cleanup outside this one design document

The only purpose of this design is to define the bounded tenant provisioning / first-owner activation handoff loop clearly enough for execution without reopening closed verification work or widening into later domains.