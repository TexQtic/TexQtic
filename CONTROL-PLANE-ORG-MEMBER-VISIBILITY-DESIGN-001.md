# CONTROL-PLANE-ORG-MEMBER-VISIBILITY-DESIGN-001

## 1. Status Header

| Field | Value |
|---|---|
| Unit ID | CONTROL-PLANE-ORG-MEMBER-VISIBILITY-DESIGN-001 |
| Mode | Audit-only + design-decision artifact |
| Date | 2026-05-26 |
| Branch | main |
| HEAD at audit start | e2465b94782dc7a566f5ebf03354e019f5fafda2 |
| Final recommendation enum | DESIGN_READY_FOR_IMPLEMENTATION |

## 2. Background

This design unit was opened after the prior bounded implementation attempt correctly stopped with NEEDS_DESIGN_FIRST. Repo truth showed that the control-plane area has read-side tenant registry/detail surfaces, but no cleanly bounded org/member visibility surface that can be hardened without risking mutation-coupled behavior.

The core problem is not missing data alone. The problem is surface ownership: the nearby control-plane surfaces are either tenant registry/detail views or admin-identity visibility with revoke/remove controls. That means the future implementation must isolate read-only org/member visibility from lifecycle/admin mutation behavior rather than extending the mutative surfaces directly.

## 3. Verified Prior Checkpoints

- `6be1f93` - FTR-FAM-001 auth/session verify-close opening checkpoint
- `369bbe6` - FTR-FAM-001 tracker state recorded in TLRH/FUTURE-TODO-REGISTER
- `83d140f` - FTR-CP-001 opening audit
- `517b8eb` - FTR-CP-001 control-plane mutation role policy lock
- `a878a9f6` - FTR-CP-001 superadmin authorization hardening verified complete
- `97ac3e80` - TLRH record for FTR-CP-001 authz checkpoint
- `cae26415dda03f3334073228a6826d981b25a69a` - CONTROL-PLANE-TENANT-LIST-DETAIL-HARDENING-001 implementation commit
- `e2465b9` - CONTROL-PLANE-TENANT-LIST-DETAIL-HARDENING-001 verify-close and TLRH sync

## 4. Repo-Truth Findings

### TenantRegistry

- [components/ControlPlane/TenantRegistry.tsx](components/ControlPlane/TenantRegistry.tsx) renders tenant registry rows, lifecycle-state filters, plan and AI usage summaries, and detail navigation.
- The component also contains provisioning affordances and row-level impersonation behavior, so it is not a clean host for org/member read-only visibility.
- It does not render a dedicated org/member summary panel today.

### TenantDetails

- [components/ControlPlane/TenantDetails.tsx](components/ControlPlane/TenantDetails.tsx) is the deepest existing control-plane detail surface.
- It already has a clean read-side shape for loading, error, and not-found states.
- It also contains lifecycle mutation controls: activate-approved and archive controls, plus bounded language about other lifecycle actions not being available.
- That makes it the correct host for a future read-only child component, but not a good place to inline more mutation-adjacent logic.

### AdminRBAC

- [components/ControlPlane/AdminRBAC.tsx](components/ControlPlane/AdminRBAC.tsx) is a separate admin-identity visibility surface.
- It has readable headers and table rows, but it is coupled to revoke/remove controls and related action state.
- It is not the safest host for org/member visibility because the surface already mixes read display and mutation behavior.

### controlPlaneService / response shape

- [services/controlPlaneService.ts](services/controlPlaneService.ts) already exposes tenant detail memberships in `TenantDetailResponse`.
- The current contract includes `memberships?: Array<{ id; role; status; user: { id; email; emailVerified } }>`.
- The broader `Tenant` shape also carries tenant identity, lifecycle, plan, branding, AI budget, timestamps, and `_count` fields.
- No new backend endpoint is needed for a read-only org/member summary if implementation stays within this existing detail response shape.

### Existing tests

- [tests/control-plane-tenant-registry-detail.test.tsx](tests/control-plane-tenant-registry-detail.test.tsx) already covers registry loading, empty, error, retry, and tenant detail missing-data behavior for the tenant detail/read path.
- [tests/adminrbac-registry-read-ui.test.tsx](tests/adminrbac-registry-read-ui.test.tsx) covers admin registry read rendering and still asserts revoke/remove behavior exists.
- [tests/membership-authz.test.ts](tests/membership-authz.test.ts) captures tenant-plane membership authz semantics, but it is not a control-plane visibility test.
- No dedicated control-plane org/member visibility test file exists yet.

### Mutation-coupling risks

- TenantDetails currently mixes read-side state with lifecycle mutation affordances.
- AdminRBAC mixes read-side identity rendering with revoke/remove controls.
- TenantRegistry mixes registry read navigation with provisioning and impersonation affordances.
- The safest future design is therefore a separate read-only child component rendered from TenantDetails, using only the existing memberships payload.

### Missing dedicated org/member surface

- Repo truth does not show a dedicated control-plane org/member panel.
- The closest member display pattern is tenant-side TeamManagement in [components/Tenant/TeamManagement.tsx](components/Tenant/TeamManagement.tsx), but that surface is tenant-plane, mutation-heavy, and not a control-plane candidate.
- That confirms the future implementation should not be a copy of TeamManagement and should not reuse its mutation patterns.

## 5. Data Contract Assessment

### Fields already available for read-only display

- Tenant identity: `tenant.id`, `tenant.slug`, `tenant.name`, `tenant.type`, `tenant.tenant_category`
- Tenant state: `tenant.status`, `tenant.onboarding_status`
- Membership shape: `membership.id`, `membership.role`, `membership.status`, `membership.user.email`
- Membership verification marker: `membership.user.emailVerified`
- Existing contextual tenant metadata: `branding`, `plan`, `createdAt`, `updatedAt`, `_count.memberships`

### Display-safe fields

- Safe to display as labels or badges: role, membership status, tenant name, slug, tenant lifecycle state, member count, verified/unverified badge, and internal email address if shown only in the control-plane admin context.
- Safe to display as technical metadata: created/updated timestamps and summary counts.

### Sensitive or forbidden fields

- Do not surface raw passwords, tokens, invite links, session headers, cookies, or access URLs.
- Do not expose mutation payloads or hidden action state in the summary panel.
- Do not elevate `user.id` or `membership.id` as primary UI labels; if shown at all, they should be secondary technical metadata and preferably truncated.

### Unknown or unsuitable fields

- Any future backend fields not already present in `TenantDetailResponse` should be treated as unknown and not assumed in the UI.
- Full user profile data, org ownership hierarchy, and member management history are not present in the current contract and should not be inferred.

### Backend/API/schema requirement

- No backend/API/schema changes are required for the recommended path.
- If future product requirements want richer org/member attributes than the current `memberships` payload, that becomes a separate design decision and should not be bundled into this unit.

## 6. Design Options

| Option | Summary | Benefits | Risks | Required files | Backend/API/schema changes required | Mutation behavior might be touched | Test requirements | Recommendation status |
|---|---|---|---|---|---|---|---|---|
| A | Add a read-only org/member summary panel inside TenantDetails using existing tenant detail response data only | Smallest conceptual change; no new component file needed | Inlines more UI into an already mutation-coupled component; less reusable; harder to isolate read-only contract | `components/ControlPlane/TenantDetails.tsx`, new/updated focused test file | No | Low but non-zero because TenantDetails already hosts lifecycle actions | Loading, empty, error, retry, not-found, success, safe labels, no mutation affordances | ACCEPTABLE |
| B | Create a separate read-only component such as ControlPlaneOrgMemberSummary and render it from TenantDetails | Best separation of concerns; easiest to test; preserves read-only boundary; avoids AdminRBAC coupling | Adds one new component file and one parent wiring change | `components/ControlPlane/ControlPlaneOrgMemberSummary.tsx`, `components/ControlPlane/TenantDetails.tsx`, focused test file | No | Very low; read-only data only | Loading, empty, error, retry, not-found, success, safe labels, no mutation affordances | RECOMMENDED |
| C | Refactor AdminRBAC into read-only display and mutation controls separation | Improves a currently mixed surface | Out of scope for the org/member visibility goal; risks opening the mutate-heavy admin registry path | `components/ControlPlane/AdminRBAC.tsx` and possibly new child component(s) | No for the refactor itself, but it is a separate design lane | Yes, because the surface is already mutation-coupled | Separate registry read tests and revoke/remove tests | NOT_RECOMMENDED |
| D | Defer org/member visibility until backend/API contract is clarified | Avoids premature UI decisions | Unnecessary because current tenant detail response already contains a usable memberships array | None for now | Not required today | No | None now | NOT_RECOMMENDED |
| E | Require Paresh decision before continuing | Safe fallback if the team wants extra fields or a mutation surface split | Slows an otherwise bounded read-only implementation | None for now | Not required today | No | None now | DECISION_GATED |

## 7. Recommended Path

### Selected option

Option B - create a separate read-only component rendered by TenantDetails using the existing tenant detail response data only.

### Why this is the safest path

- It keeps read-only org/member visibility separate from mutation-heavy admin and lifecycle controls.
- It does not require new backend endpoints or schema changes.
- It preserves TenantDetails as the host surface while keeping the org/member summary logic isolated in its own component.
- It gives the future implementation unit a narrow, auditable file set.

### Future implementation unit ID

- CONTROL-PLANE-ORG-MEMBER-VISIBILITY-HARDENING-002

### Future likely file allowlist

- `components/ControlPlane/ControlPlaneOrgMemberSummary.tsx`
- `components/ControlPlane/TenantDetails.tsx`
- `tests/control-plane-org-member-visibility.test.tsx`

### Future forbidden files / surfaces

- `components/ControlPlane/TenantRegistry.tsx`
- `components/ControlPlane/AdminRBAC.tsx`
- `services/controlPlaneService.ts`
- `server/src/routes/*`
- `server/prisma/*`
- `App.tsx`
- CRM/CAE files
- WL/domain files
- schema, migrations, Prisma, SQL, RLS, seed, DB files

### Test plan for the future implementation

- Verify loading state for the org/member summary host path.
- Verify empty state when `memberships` is absent or empty.
- Verify error and retry state if the parent detail fetch fails and the summary panel is not rendered.
- Verify missing/not-found state at the TenantDetails level.
- Verify successful rendering of role and member metadata from the existing memberships array.
- Verify no mutation buttons or handlers appear in the new summary component.
- Verify tenant registry and admin registry behavior remain unchanged.

### Verification-close expectations for the future unit

- Focused frontend test coverage only.
- Narrow typecheck or test command on the touched slice.
- No backend mutation, schema, or runtime state changes.
- No tracker closure in the implementation unit.

### Runtime smoke expectation for the future verify-close unit

- Read-only control-plane smoke only.
- Open Active Tenants, select one tenant, confirm Tenant Detail loads, and confirm the org/member summary renders with no mutation affordances used.
- No production mutations, no admin revoke/remove, no lifecycle actions, and no browser-side secret exposure.

### Explicit authorization statement

- No mutation behavior is authorized by this design.

## 8. Decision Gates

- If the product later wants additional org/member fields beyond the current memberships payload, that requires a new decision.
- If the team wants to split AdminRBAC read display from revoke/remove controls, that should be handled in a separate control-plane design unit.
- If the future implementation wants to surface richer user profile data or ownership history, backend/API clarification will be required first.

## 9. Final Verdict

DESIGN_READY_FOR_IMPLEMENTATION
