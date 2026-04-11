# TEXQTIC - LAUNCH READINESS ACCELERATION WORK ITEM 018 - 2026-04-11

Status: bounded execution record
Date: 2026-04-11

## 1. purpose and bounded scope

This artifact records the bounded execution of launch-readiness Work Item 018 inside the already
authorized acceleration lane.

Its purpose is strictly limited to:

1. determining whether `Procurement / Buyer` is part of the current lawful tenant invite/member
   taxonomy
2. determining whether the observed absence or ambiguity around `Procurement / Buyer` is a true
   backend/frontend role-support gap, a deliberate current-model simplification, an indirect
   representation, or another bounded truth
3. tracing the exact current repo-truth across the tenant membership route, tenant service,
   invite-role dropdown, shared Team Management flow, runtime descriptor, and current role-taxonomy
   planning artifacts
4. applying only the smallest lawful correction if an already-supported current role is merely
   missing from the dropdown or other direct UI wiring
5. preserving all existing anti-drift constraints and leaving governance state unchanged

This pass is bounded acceleration-lane execution only.

It does not widen into architecture work, RBAC redesign, schema change, new role invention,
product ideation, or cross-platform role-system redesign.

It does not mutate Layer 0 by implication.

## 2. preflight result

Exact command run:

`git diff --name-only; git status --short`

Result:

- no output
- worktree clean before execution

## 3. exact files read

The exact files read in this pass were:

1. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-POLICY-2026-04-10.md`
2. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-EXECUTION-PROTOCOL-2026-04-10.md`
3. `server/src/routes/tenant.ts`
4. `services/tenantService.ts`
5. `components/Tenant/InviteMemberForm.tsx`
6. `components/Tenant/TeamManagement.tsx`
7. `App.tsx`
8. `layouts/Shells.tsx`
9. `types.ts`
10. `runtime/sessionRuntimeDescriptor.ts`
11. `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
12. `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
13. `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
14. `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
15. `docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md`
16. `docs/product-truth/TEXQTIC-WHITE-LABEL-OPERATING-MODE-DESIGN-v1.md`
17. `tests/membership-authz.test.ts`
18. `tests/session-runtime-descriptor.test.ts`

## 4. exact runtime environment used

No runtime environment was required or used in this pass.

Reason:

- the controlling question was whether the current lawful invite/member taxonomy already supports a
  dedicated `Procurement / Buyer` role
- the backend route contract, client request type, invite dropdown mapping, shared App wiring,
  runtime descriptor, and current planning/product-truth docs were sufficient to classify that
  question without runtime execution
- no runtime proof was required to distinguish current role support from product desirability

## 5. whether bounded defect, taxonomy mismatch, or validation gap was found

No bounded backend/frontend role-support defect for a dedicated `Procurement / Buyer` invite role
was proven in this pass.

A taxonomy / label / capability mismatch was found.

Exact bounded mismatch:

- the current tenant invite/member contract is still canonicalized to the generic tenant membership
  roles `OWNER`, `ADMIN`, `MEMBER`, and parse-level `VIEWER`
- the current invite UI already exposes a `Procurement / Buyer` label, but it maps that selection
  to `MEMBER` rather than to a dedicated persisted buyer membership role
- buyer-side commercial behavior is materially present elsewhere in repo truth through buyer-facing
  routes, buyer capabilities, and storefront-oriented buyer actor concepts without creating a
  dedicated tenant invite/member role named `BUYER`

## 6. exact classification outcome

`indirectly represented in the current slice; no dedicated Procurement / Buyer invite role exists`

Why this classification is exact:

1. not `supported but UI-missing`, because the current invite dropdown already includes the label
   `Procurement / Buyer`
2. not `purely intentionally absent` as a complete answer, because buyer-side semantics do exist in
   current repo truth through separate buyer capabilities and buyer-facing continuity
3. the exact current truth is that `Procurement / Buyer` is represented indirectly in the tenant
   invite surface as a label alias to `MEMBER`, while broader buyer behavior exists elsewhere
   without a dedicated invite/member taxonomy role
4. if a running environment currently fails to show the label, that would be a separate runtime or
   deployment discrepancy not proven in this repo-truth-only pass

## 7. exact bounded fix or proof added

No code correction was lawful or applied in this pass.

The bounded proof added in this pass is this execution record, which captures the exact backend
membership contract, service type, dropdown mapping, shared App reuse path, runtime capability
evidence, and planning/product-truth role taxonomy supporting the classification above.

## 8. exact validation commands or runtime checks run and results

Exact preflight command:

- `git diff --name-only; git status --short`
- result: clean worktree

Targeted repo-truth checks used in this pass:

1. backend invite contract search
   - result: `POST /api/tenant/memberships` validates invite target `role` with
     `z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])`
   - result: the route rejects `VIEWER` transitions explicitly, leaving no dedicated `BUYER`
     membership role in the current invite contract
2. tenant service request-type read
   - result: `CreateMembershipRequest` accepts only `'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'`
3. invite dropdown read
   - result: `InviteMemberForm.tsx` includes `Procurement / Buyer`, but maps it to value `MEMBER`
4. shared App flow read
   - result: `App.tsx` reuses the same `InviteMemberForm` for tenant `INVITE_MEMBER` flow and WL
     admin `staff_invite`, so the same dropdown behavior applies across the bounded invite slice
5. runtime descriptor and focused test read
   - result: buyer-side continuity is materially present through `buyerCatalog` capability and
     `buyer_rfqs` route continuity without introducing a dedicated invite/member role
6. planning / product-truth doc reads
   - result: current tenant/admin role docs keep back-office roles at `OWNER`, `ADMIN`, `MEMBER`
     while separate storefront-consumer or buyer-facing contexts may reference `BUYER` and `GUEST`

Runtime checks run:

- none required

## 9. code-truth established

The bounded repo truth established in this pass is:

1. the tenant invite backend does not support a dedicated `BUYER` membership role.
   - `POST /api/tenant/memberships` only accepts `OWNER`, `ADMIN`, `MEMBER`, or `VIEWER`
   - `VIEWER` is then rejected as out of scope, so the effective invite issuance roles are
     currently `OWNER`, `ADMIN`, and `MEMBER`
2. the client-side tenant membership contract matches that same canonical set.
   - `CreateMembershipRequest` is typed as `'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'`
3. the current dropdown already exposes `Procurement / Buyer`, but only as a label alias.
   - the form maps `Procurement / Buyer` to `MEMBER`
4. the current member-management views display canonical stored roles rather than preserving a
   separate procurement/buyer label.
   - pending invites render `invite.role`
   - members render `membership.role`
5. the same invite surface is reused across the bounded tenant and white-label admin invite paths.
   - the App-level tenant `INVITE_MEMBER` state renders `InviteMemberForm`
   - the WL admin `staff_invite` path also renders `InviteMemberForm`
6. buyer-side capability already exists elsewhere in current repo truth.
   - the runtime descriptor includes `buyerCatalog`
   - current route continuity includes `buyer_rfqs`
7. the broader frontend type surface still contains `BUYER`, but not as the current tenant
   membership invite contract.
   - `types.ts` defines a broader `UserRole` enum including `BUYER`
   - that broader enum is not the controlling authority for `createMembership()` or
     `POST /api/tenant/memberships`

## 10. UI-truth established

The bounded UI truth established in this pass is:

1. current repo truth already includes the visible label `Procurement / Buyer` in the shared invite
   dropdown
2. selecting that label does not create a dedicated buyer membership tier; it submits `MEMBER`
3. the current bounded UI therefore presents buyer/procurement as a persona label layered on top of
   the generic tenant-member role rather than as a separate invite-role taxonomy element
4. because the same invite form is reused in the bounded tenant and WL admin invite flows, this is
   the current shared invite-role posture for the investigated slice

## 11. runtime production truth established

No.

Reason:

- this pass established code-truth and UI-truth only
- no runtime check was required after the current role-taxonomy contract and dropdown mapping became
  decisive
- any live discrepancy between deployed UI and current repo truth remains unverified in this item

## 12. governance-state statement

Governance state unchanged: yes.

The downstream governance-family posture remains frozen under `HOLD-FOR-BOUNDARY-TIGHTENING`.

Layer 0 remains read-only.

## 13. recording artifact path updated

`governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-WORK-ITEM-018-2026-04-11.md`

## 14. final verdict

`WORK-ITEM-018-CLASSIFIED-INDIRECT-BUYER-REPRESENTATION-NO-DEDICATED-INVITE-ROLE`

Interpretation:

- the current lawful tenant invite/member taxonomy does not include a dedicated `Procurement /
  Buyer` role
- the current invite UI already exposes that persona label, but only by aliasing it to `MEMBER`
- broader buyer behavior is materially present elsewhere through buyer-facing capabilities and
  storefront-oriented actor concepts
- no bounded backend support gap or UI-missing dropdown defect was proven in this repo-truth pass
- if TexQtic later wants a dedicated procurement/buyer membership role, that is a separate bounded
  candidate gap rather than a change to implement inside Work Item 018