# GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING

Decision ID: GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING
Title: Open exactly one bounded AdminRBAC revoke/remove implementation unit and nothing broader
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- `GOV-DEC-ADMINRBAC-REVOKE-REMOVE-OPENING-ELIGIBILITY` is `DECIDED`
- revoke/remove implementation is not yet opened
- invite, role-change, tenant-scope, and broader authority expansion remain out of scope

The current AdminRBAC chain also already establishes that:

- the broad parent still must not open directly
- the narrowest truthful next mutation candidate remains control-plane admin access revoke/remove authority only
- the required actor, target, self/peer-protection, invalidation, audit, and exclusion boundaries are already explicitly clarified
- the eligibility decision did not itself authorize implementation and required a separate opening artifact before any implementation-ready unit could exist

Verification posture for this opening decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic now needs to determine whether the already-recorded eligibility posture should be converted
into one lawful bounded implementation opening and, if so, how to do that without widening scope.

The opening must create exactly one implementation-ready AdminRBAC child unit, preserve all
recorded control-plane and safety locks, keep the broad parent non-open, and avoid opening invite,
role-change, tenant-scope, or broader authority work by implication.

## Why This Opening Is Lawful Now

This opening is lawful now because the required pre-opening chain is complete and already closed:

- the next mutation candidate was clarified and reduced to revoke/remove only
- the revoke/remove opening posture was clarified and closed
- the eligibility decision recorded that one separate later bounded revoke/remove opening is now governance-eligible

No required opening-boundary question remains ambient or unresolved for the first bounded child.

## Decision

The broad parent `TECS-FBW-ADMINRBAC` remains non-open.

Exactly one bounded implementation unit is now opened:

- `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- title: `Control-plane admin access revoke/remove authority`

Layer 0 should now show:

- the parent `TECS-FBW-ADMINRBAC` still non-open as `DESIGN_GATE`
- the child `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001` as the only `OPEN` implementation-ready unit

## Exact Implementation Scope Of The New Bounded Unit

The exact in-scope boundary of the child slice is:

- revoke/remove existing control-plane admin access only
- control-plane only
- `SuperAdmin` actor only
- already-existing internal control-plane admin identity only
- existing revocable control-plane admin access only
- first safe target class limited to existing non-`SuperAdmin` internal control-plane admins only
- no self-revoke
- no peer-`SuperAdmin` revoke
- no hidden downgrade or role-delta semantics
- immediate block on new privileged control-plane access after success
- active privileged control-plane sessions fail authorization on the next control-plane request after success
- refresh-token or equivalent renewal invalidation is in scope in the same bounded child
- explicit audit capture for every attempted revoke/remove, including successful, denied, and failed operations

## Exact Exclusions

The exact out-of-scope boundary of the child slice is:

- invite
- invitation delivery
- invitation acceptance
- account bootstrap
- account creation
- role assignment
- role change
- tenant scope
- broader authority expansion
- blanket `SuperAdmin` expansion
- impersonation or support-mode expansion
- self-revoke
- peer-`SuperAdmin` revoke/remove
- white-label admin scope
- tenant/org admin management
- broad auth redesign beyond the bounded invalidation behavior required above

## Exact Boundary Locks Preserved

### 1. Control-Plane Lock

- control-plane only
- no tenant-plane scope
- no white-label admin scope
- no tenant/org admin management

### 2. Actor Lock

- `SuperAdmin` only
- no `PlatformAdmin` mutation authority
- no `TenantAdmin` scope
- no delegated, support, or impersonation bypass

### 3. Target Lock

- already-existing internal control-plane admin identity only
- existing revocable control-plane admin access only
- first safe target class limited to existing non-`SuperAdmin` internal control-plane admins

### 4. Self / Peer Protection Lock

- no self-revoke
- no peer-`SuperAdmin` revoke
- no hidden downgrade or role-delta semantics

### 5. Invalidation Lock

- immediate block on new privileged control-plane access
- active privileged control-plane sessions fail authorization on the next control-plane request after success
- refresh-token or equivalent renewal invalidation remains in scope in the same bounded child
- no grace period
- no eventual-only posture
- no broad auth redesign

### 6. Audit Lock

- explicit audit capture is required for every attempted revoke/remove
- successful, denied, and failed operations must all remain auditable
- minimum audit evidence shape remains mandatory

### 7. Exclusion Lock

- invite, role-change, tenant-scope, and broader authority expansion remain excluded
- no blanket `SuperAdmin` expansion is created by implication
- no support or impersonation expansion is created by implication

## Implementation Authorization Statement

This decision authorizes exactly one implementation-ready unit only:

- `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`

It does **not** authorize:

- opening the broad parent stream
- opening invite work
- opening role-change work
- opening tenant-scope work
- opening broader authority expansion
- opening any second AdminRBAC child unit
- opening self-revoke or peer-`SuperAdmin` revoke/remove behavior

## Consequences

- Layer 0 now has exactly one `OPEN` implementation-ready unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- the broad parent remains non-open, preserving governance clarity
- the revoke/remove opening is control-plane only and bounded by the preserved locks above
- nothing broader than that bounded revoke/remove slice is opened

## Sequencing Impact

- `OPEN-SET.md` must show the parent as `DESIGN_GATE` and the child as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`
- `SNAPSHOT.md` must reflect that one implementation unit is now open
- a new Layer 1 unit record must exist for `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`

This decision opens exactly one bounded implementation unit and no more.