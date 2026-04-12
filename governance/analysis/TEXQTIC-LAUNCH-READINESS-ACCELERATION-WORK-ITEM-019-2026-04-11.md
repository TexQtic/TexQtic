# TEXQTIC - LAUNCH READINESS ACCELERATION WORK ITEM 019 - 2026-04-11

Status: bounded execution record
Date: 2026-04-12
Labels: ACCELERATION-ONLY; EVIDENCE-CANDIDATE; NOT-FOR-GOVERNANCE-PROMOTION

## 1. purpose and bounded scope

This artifact records the bounded execution of launch-readiness Work Item 019 inside the already
authorized acceleration lane.

Its purpose is strictly limited to:

1. implementing the smallest lawful pending-invite revoke or cancel slice on the already-material
   tenant membership surface
2. preserving the previously established Work Item 016 classification that revoke capability was
   absent in the current bounded slice before this pass
3. adding only one backend revoke mutation route, one tenant service client method, one shared UI
   affordance, and directly adjacent focused tests
4. proving that only still-pending invites are revocable and that accepted or expired invites are
   not mutated through this path
5. preserving all current anti-drift constraints and leaving governance state unchanged

This pass is bounded acceleration-lane execution only.

It does not widen into invite edit or resend work, invite lifecycle redesign, schema redesign,
Team Management refactor, role-taxonomy redesign, auth or session redesign, or governance-family
reopening.

## 2. preflight result

Exact command run:

`git diff --name-only; git status --short`

Result:

- no output
- worktree clean before execution

## 3. exact files read

The exact workspace files read in this pass were:

1. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-POLICY-2026-04-10.md`
2. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-EXECUTION-PROTOCOL-2026-04-10.md`
3. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-WORK-ITEM-016-2026-04-11.md`
4. `server/src/routes/tenant.ts`
5. `services/tenantService.ts`
6. `components/Tenant/TeamManagement.tsx`
7. `components/Tenant/InviteMemberForm.tsx`
8. `tests/membership-authz.test.ts`
9. `tests/runtime-verification-tenant-enterprise.test.ts`
10. `App.tsx`
11. `services/tenantApiClient.ts`
12. `services/authService.ts`
13. `package.json`
14. `server/package.json`
15. `server/vitest.config.ts`

## 4. exact runtime environment used

No runtime environment or authenticated app session was used in this pass.

Focused validation ran in the local repository test environment via the server package's Vitest
installation on Windows.

Reason:

- repo-truth and focused test-truth were sufficient to implement and verify the bounded revoke
  slice
- no manual authenticated session handoff was required
- the secret-handling guardrail remained preserved

## 5. whether bounded defect or implementation gap was found

An implementation gap was found and corrected.

Exact gap:

- Work Item 016 had already established that pending-invite revoke capability was absent across the
  current bounded backend, service, and shared Team Management slice
- the current pass confirmed that gap remained present and could be corrected without schema,
  auth-model, or lifecycle redesign changes

## 6. exact bounded fix added

The exact bounded fix added in this pass is:

1. backend route: `DELETE /api/tenant/memberships/invites/:id`
   - guarded by tenant auth and database context middleware
   - restricted to `OWNER` and `ADMIN`
   - org-scoped through `withDbContext(...)` and `tenantId: dbContext.orgId`
   - revokes only invites where `acceptedAt === null` and `expiresAt > now`
   - returns `INVITE_NOT_PENDING` for accepted or expired invites without mutating them
   - deletes the pending invite and writes a bounded invite-revoked audit log without exposing any
     invite secret material
2. tenant service client: `revokePendingInvite(id)` in `services/tenantService.ts`
3. shared UI affordance in `components/Tenant/TeamManagement.tsx`
   - writer-only `Cancel Invite` control on pending invite rows
   - same shared component remains used for both tenant and WL admin Team Management paths
   - successful revoke removes the invite from local pending-list state via
     `removePendingInviteById(...)`
4. focused adjacent tests added in:
   - `tests/membership-authz.test.ts`
   - `tests/runtime-verification-tenant-enterprise.test.ts`

## 7. exact validation commands or runtime checks run and results

Exact validation runs in this pass:

1. initial narrow validation attempt from repo root
   - command: `pnpm exec vitest run tests/membership-authz.test.ts tests/runtime-verification-tenant-enterprise.test.ts`
   - result: failed because `vitest` is not installed at the repo root in this workspace
   - observed key output: `Command "vitest" not found`
2. focused repo-local Vitest validation via the server package
   - command: `pnpm --dir server exec vitest run ../tests/membership-authz.test.ts ../tests/runtime-verification-tenant-enterprise.test.ts`
   - result after first implementation edit: passed
   - observed key output: `2 passed`, `31 passed`
3. focused revoke-slice validation after test additions
   - command: `pnpm --dir server exec vitest run ../tests/membership-authz.test.ts ../tests/runtime-verification-tenant-enterprise.test.ts`
   - result: passed
   - observed key output: `2 passed`, `39 passed`
4. editor diagnostics check on touched files
   - paths checked:
     - `server/src/routes/tenant.ts`
     - `services/tenantService.ts`
     - `components/Tenant/TeamManagement.tsx`
     - `tests/membership-authz.test.ts`
     - `tests/runtime-verification-tenant-enterprise.test.ts`
   - result: no errors found in all checked files

Runtime checks run:

- none

## 8. code-truth established

The bounded code-truth established in this pass is:

1. `server/src/routes/tenant.ts` now exposes one pending-invite revoke route only:
   `DELETE /api/tenant/memberships/invites/:id`
2. the revoke route is restricted to `OWNER` and `ADMIN` actors and requires database context
3. the route scopes invite lookup to the current org and rejects missing invite ids as not found
4. the route rejects accepted invites and expired invites with `INVITE_NOT_PENDING` and does not
   mutate them
5. the route deletes only a still-pending invite, so the revoked invite disappears from the same
   `GET /api/tenant/memberships` pending-invite read surface
6. the service layer now exposes `revokePendingInvite(id)` using the tenant-realm delete client
7. no invite token or token hash is returned by the new revoke path

## 9. UI-truth established

The bounded UI truth established in this pass is:

1. pending invite rows now expose a `Cancel Invite` affordance only when the shared writer gate is
   true (`OWNER` or `ADMIN`)
2. non-writer roles do not receive a revoke surface on pending invite rows
3. successful revoke removes the row from the local pending-invite list state without widening the
   Team Management surface
4. `App.tsx` still routes both tenant Team Management and WL admin staff management through the
   same shared `TeamManagement` component, so the revoke affordance remains aligned across those
   surfaces

## 10. runtime production truth established

No.

Reason:

- repo-truth plus focused test-truth were sufficient for this bounded pass
- no authenticated runtime handoff was provided or required

## 11. governance-state statement

Governance state unchanged: yes.

The downstream governance-family posture remains frozen under
`HOLD-FOR-BOUNDARY-TIGHTENING`.

Layer 0 remains read-only.

## 12. recording artifact path updated

`governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-WORK-ITEM-019-2026-04-11.md`

## 13. final git diff --name-only

Exact output observed after implementation and record creation, before staging and commit:

1. `components/Tenant/TeamManagement.tsx`
2. `server/src/routes/tenant.ts`
3. `services/tenantService.ts`
4. `tests/membership-authz.test.ts`
5. `tests/runtime-verification-tenant-enterprise.test.ts`

## 14. final git status --short

Exact output observed after implementation and record creation, before staging and commit:

- `M components/Tenant/TeamManagement.tsx`
- `M server/src/routes/tenant.ts`
- `M services/tenantService.ts`
- `M tests/membership-authz.test.ts`
- `M tests/runtime-verification-tenant-enterprise.test.ts`
- `?? governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-WORK-ITEM-019-2026-04-11.md`

## 15. commit hash if any

Pending at record time before the atomic commit is created.

## 16. final verdict

`WORK-ITEM-019-COMPLETED-BOUNDED-PENDING-INVITE-REVOKE-SLICE`

Interpretation:

- the smallest useful pending-invite revoke or cancel capability now exists in the bounded tenant
  slice
- the path is limited to still-pending invites only
- accepted and expired invites are not revocable through this path
- the shared Team Management surface now removes a revoked invite from the visible pending list
- no governance-state change is claimed