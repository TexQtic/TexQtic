# TEXQTIC - Phase 1 Foundation Correction Implementation Allowlist And Verification Checklist v1

Status: Implementation-planning scope control only
Date: 2026-04-08
Basis: Repo truth, code-path truth, accepted planning direction from [TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md](../../TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md), binding schema inputs from [TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md](TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md), binding route-manifest inputs from [TEXQTIC-CANONICAL-ROUTE-MANIFEST-DESIGN-v1.md](TEXQTIC-CANONICAL-ROUTE-MANIFEST-DESIGN-v1.md), and binding sequencing inputs from [TEXQTIC-FOUNDATION-CORRECTION-AND-DESCRIPTOR-CUTOVER-IMPLEMENTATION-PLAN-v1.md](TEXQTIC-FOUNDATION-CORRECTION-AND-DESCRIPTOR-CUTOVER-IMPLEMENTATION-PLAN-v1.md)
Evidence rule: No governance documents used as evidence for runtime claims in this artifact
Implementation scope: None

## 1. Purpose And Scope Lock

This artifact exists to freeze the exact execution boundary for Phase 1 foundation correction only.

Its purpose is not to restate the full migration. Its purpose is to prevent a future implementation prompt from silently widening beyond the first approved slice.

Phase 1 means only:

- neutralize current client-side routing-authority leaks
- replace guessed early family entry with resolving or blocked behavior where required
- preserve current shells, panels, route-group structure, and broad runtime families until later phases

Phase 1 does not authorize descriptor cutover completion, manifest-backed routing, route decomposition, or public-entry redesign.

Accepted but currently uncommitted planning artifacts are valid context for this scope lock and are not blockers for this planning pass.

## 2. Binding Inputs

The following planning decisions are already accepted and binding for Phase 1 scope control:

- Option B remains the fixed sequencing decision.
- `SessionRuntimeDescriptor` is the target routing authority, but Phase 1 does not complete that cutover.
- `operatingMode` is the canonical runtime-family selector in the target design.
- `WL_ADMIN` is an overlay, not a base operating mode.
- `publicEntryKind` remains a pre-session concern and is out of scope for Phase 1 implementation.
- unknown or incomplete identity is a hard-stop condition and may not silently fall back into a family.
- route-manifest selection is a later phase and may not be implemented in Phase 1.

The following repo-truth constraints are also binding:

- current routing-authority leaks are concentrated in [App.tsx](../../App.tsx)
- current login and restore flows can enter `EXPERIENCE` or `WL_ADMIN` before canonical `/api/me` reconciliation
- current white-label forcing still exists through slug and name heuristics
- current persisted tenant hints can influence normalization and bootstrap behavior
- current stored impersonation session persists tenant snapshot data that can participate in restore behavior
- current shell resolution still reads `currentTenant.tenant_category ?? currentTenant.type` in a family-critical branch

## 3. Approved Phase 1 Objective

Phase 1 is approved for one objective only:

remove client-side routing-authority leaks before descriptor cutover.

This means a Phase 1 implementation may:

- stop local heuristics from deciding white-label capability or family choice
- stop persisted hint data from deciding family choice
- stop bootstrap stubs from manufacturing family identity
- stop login, restore, refresh, and impersonation restore from rendering tenant family shells before canonical session truth is confirmed
- stop stored impersonation tenant snapshots from acting as family authority
- stop direct `currentTenant.type` fallback in family-critical logic where the branch would otherwise guess family authority

This means a Phase 1 implementation may not:

- introduce the final descriptor system
- introduce the final manifest system
- reshape route groups or shells
- refactor unrelated runtime code under the label of cleanup

The approved success condition for Phase 1 is narrow:

- the app no longer guesses runtime family from client-authored inputs
- the app may temporarily spend more time in resolving or blocked state
- the app still uses the existing shell and content structure once canonical family truth is available

## 4. Exact In-Scope Defect List

Only the defects below are in scope for Phase 1.

| Defect | Repo-grounded anchor | Allowed Phase 1 intervention | Not allowed in Phase 1 |
| --- | --- | --- | --- |
| WL slug or name forcing | `WL_REPO_TRUTH_SLUGS`, `WL_REPO_TRUTH_NAMES`, `resolveRepoTruthTenantHint` in [App.tsx](../../App.tsx) | neutralize slug or name as routing authority | replace with new descriptor or manifest logic |
| Persisted tenant identity hints as routing input | `readStoredTenantIdentityHints`, `persistTenantIdentityHint`, routing-critical portions of `normalizeTenantIdentity` in [App.tsx](../../App.tsx) | remove hint participation in family-critical decisions | redesign tenant identity persistence broadly |
| Bootstrap stub family or type manufacture | `resolveBootstrapTenantType`, `buildBootstrapTenantStub` in [App.tsx](../../App.tsx) | prevent stub-based family selection or guessed type fallback | replace with final descriptor adapter |
| Pre-canonical `applyTenantBootstrapState` family entry | `applyTenantBootstrapState`, tenant restore effect, and `handleAuthSuccess` in [App.tsx](../../App.tsx) | stop early tenant-family shell entry before canonical confirmation | redesign all app state and navigation |
| Stored impersonation tenant snapshot as routing authority | `StoredImpersonationSession`, `persistImpersonationSession`, `readStoredImpersonationTenant`, `readStoredImpersonationSession`, impersonation restore path in [App.tsx](../../App.tsx) | demote stored tenant snapshot to non-authoritative data or remove it from persisted authority | redesign impersonation product flow or server contracts |
| Direct `currentTenant.type` fallback in family-critical logic where applicable | `resolveExperienceShell` call path in [App.tsx](../../App.tsx) | remove or fail closed on direct legacy fallback where it still decides family | rewrite full shell policy or route-family model |

No additional defects are authorized under Phase 1 unless the user explicitly reopens scope.

## 5. Exact Out-Of-Scope List

The following items are explicitly out of scope for Phase 1 and must be treated as stop conditions if encountered.

- no full `SessionRuntimeDescriptor` cutover
- no descriptor establishment layer completion
- no `routeManifestKey` implementation
- no manifest-backed routing implementation
- no full shell-selection rewrite
- no route decomposition
- no public-entry redesign
- no broad `App.tsx` refactor beyond what is required to neutralize routing-authority leaks
- no UX redesign beyond required resolving or blocked handling
- no overlay redesign or new overlay semantics
- no manifest-family changes
- no route-group changes
- no shell component rewrites
- no backend payload or contract changes
- no auth service redesign
- no token storage redesign beyond what is strictly required to stop client-side family authority leaks already identified in [App.tsx](../../App.tsx)
- no unrelated cleanup, formatting passes, naming churn, or opportunistic extraction

If implementation requires any out-of-scope change to succeed, Phase 1 must stop and the scope must be reopened explicitly.

## 6. File Allowlist

The future Phase 1 execution prompt may touch only the files below.

### 6.1 Approved Product Code File

- [App.tsx](../../App.tsx)

### 6.2 Approved Existing Verification File

- [tests/tenant-enterprise-realm-context.test.tsx](../../tests/tenant-enterprise-realm-context.test.tsx)

### 6.3 Approved New Verification File

At most one new focused test file may be created if the negative-authority proofs cannot be expressed cleanly in the existing test surface:

- `tests/phase1-foundation-correction-routing-authority.test.tsx`

No other product files, test files, helper modules, components, services, or configs are allowlisted for Phase 1.

## 7. File Denylist / Protected Files

The following files or areas are protected in Phase 1 because they belong to later phases or to unrelated surfaces.

| File or area | Why protected in Phase 1 |
| --- | --- |
| [layouts/Shells.tsx](../../layouts/Shells.tsx) | full shell policy and shell-surface changes belong to later phases |
| [components/Tenant](../../components/Tenant) | route decomposition and panel work are out of scope |
| [components/WL](../../components/WL) | storefront and WL admin content changes are out of scope |
| [components/ControlPlane](../../components/ControlPlane) | control-plane route or panel changes are out of scope |
| [contexts/CartContext.tsx](../../contexts/CartContext.tsx) | commerce-context behavior is unrelated to Phase 1 scope |
| [services/apiClient.ts](../../services/apiClient.ts) | auth realm and request token semantics are protected unless scope is explicitly widened |
| [services/authService.ts](../../services/authService.ts) | backend payload contracts are not a Phase 1 change surface |
| [services/controlPlaneService.ts](../../services/controlPlaneService.ts) | service contract or control-plane API changes are out of scope |
| [services/tenantApiClient.ts](../../services/tenantApiClient.ts) | service-layer API changes are out of scope |
| [services/catalogService.ts](../../services/catalogService.ts) | catalog behavior is not part of foundation correction |
| [services/cartService.ts](../../services/cartService.ts) | cart behavior is not part of foundation correction |
| [types.ts](../../types.ts) | schema or type-system redesign belongs to later phases unless scope is explicitly reopened |
| [middleware.ts](../../middleware.ts) | public-entry and host-resolution redesign are out of scope |
| [api/index.ts](../../api/index.ts) | server entry and route registration are out of scope |
| [server](../../server) | backend implementation is not part of this Phase 1 slice |
| [tests/runtime-verification-wl-storefront.test.tsx](../../tests/runtime-verification-wl-storefront.test.tsx) | storefront surface truthfulness is not the Phase 1 proof target |
| [tests/runtime-verification-tenant-enterprise.test.ts](../../tests/runtime-verification-tenant-enterprise.test.ts) | service-envelope verification is not the Phase 1 proof target |
| [tests/b2c-shell-authenticated-affordance-separation.test.tsx](../../tests/b2c-shell-authenticated-affordance-separation.test.tsx) | shell-surface semantics are not being redesigned in Phase 1 |
| [tests/aggregator-discovery-workspace.test.tsx](../../tests/aggregator-discovery-workspace.test.tsx) | workspace content behavior is not being redesigned in Phase 1 |

If implementation cannot stay within the file allowlist above, Phase 1 must stop rather than widen silently.

## 8. Function / Helper Allowlist

Phase 1 may modify, neutralize, or remove only the helpers and code paths below, all anchored in [App.tsx](../../App.tsx).

- `WL_REPO_TRUTH_SLUGS`
- `WL_REPO_TRUTH_NAMES`
- `resolveRepoTruthTenantHint`
- `readStoredTenantIdentityHints`
- `persistTenantIdentityHint`
- routing-critical portions of `normalizeTenantIdentity`
- `resolveBootstrapTenantType`
- `buildBootstrapTenantStub`
- `buildTenantSnapshot` only where needed to prevent hint-driven family mutation
- `StoredImpersonationSession`
- `persistImpersonationSession`
- `readStoredImpersonationTenant`
- `readStoredImpersonationSession`
- `clearPersistedImpersonationSession` only where required to preserve fail-closed behavior after authority leak removal
- `applyTenantBootstrapState` only to remove pre-canonical family entry behavior
- tenant restore effect path
- `handleAuthSuccess`
- impersonation restore path inside the existing effect
- `handleImpersonateConfirm` only where persistence or immediate post-switch family authority must be neutralized
- `handleExitImpersonation` only where control-plane return must remain coherent after stored tenant authority is removed
- `resolveExperienceShell` only to remove direct `currentTenant.type` family-critical fallback where applicable

Allowed change rule:

- these helpers may be changed only to neutralize client-side family authority leaks or to support required resolving or blocked states

## 9. Function / Helper Non-Goals

The following helpers or code paths may be referenced for context but must not be rewritten in Phase 1.

- `renderExperienceContent`
- `renderWLAdminContent`
- `renderAdminView`
- `applyControlPlaneShellEntry`
- `resolveControlPlaneIdentity`
- `canAccessWlAdmin`
- `enterWlAdmin`
- `expView` route-family content branching beyond what is strictly necessary to stop guessed entry
- `adminView` and WL admin section models
- any future descriptor adapter helper
- any future manifest selector helper
- any shell component in [layouts/Shells.tsx](../../layouts/Shells.tsx)
- `getAuthRealm`, `getCurrentAuthRealm`, and `resolveStoredAuthRealm` in [services/apiClient.ts](../../services/apiClient.ts)

Non-goal rule:

- if Phase 1 appears to require rewriting one of the non-goal helpers above, implementation is widening into a later phase and must stop

## 10. Allowed Behavioral Changes In Phase 1

Phase 1 is allowed to change behavior only in the ways below.

- guessed early tenant-family entry may become a resolving state
- incomplete or conflicting tenant identity may become an explicit blocked state instead of a fallback shell
- slug-only or name-only WL signals may stop affecting runtime family or overlay eligibility
- persisted tenant hints may stop affecting runtime family or white-label capability
- bootstrap stub family or type inference may stop driving shell entry
- impersonation restore may require fresh canonical tenant confirmation instead of trusting stored tenant snapshot family data
- control-plane to tenant and tenant to control-plane transitions may show brief resolving behavior where family was previously guessed early
- provisioning-pending may remain a blocked session state with no tenant-family shell entry

Allowed-behavior boundary:

- once canonical family truth resolves, the existing shell and content structure should remain materially the same in Phase 1

## 11. Forbidden Behavioral Changes In Phase 1

Phase 1 must not change the behaviors below.

- no final family-selection redesign
- no route-group changes
- no manifest-family changes
- no public-entry behavior changes
- no new overlay semantics
- no new tenant-category semantics
- no shell-content redesign
- no panel-content redesign
- no cart, catalog, RFQ, order, or control-plane feature redesign
- no new navigation model beyond required resolving or blocked handling
- no new descriptor-driven or manifest-driven family selection visible to users as the final architecture

If a proposed change modifies one of those behaviors, it belongs to a later phase.

## 12. Verification Checklist

Phase 1 may be called complete only when all checklist items below are satisfied.

### 12.1 Scope And Diff Control

- only allowlisted files were modified
- no protected files were touched
- no new file was created other than the one exact optional test path named in this artifact

### 12.2 Negative Authority Proofs

- slug-only WL detection no longer affects routing authority
- name-only WL detection no longer affects routing authority
- persisted `tenant_category` no longer affects routing authority
- persisted `is_white_label` no longer affects routing authority
- JWT-only tenant classification no longer affects routing authority
- bootstrap stub family or type inference no longer affects routing authority
- stored impersonation tenant snapshot no longer affects routing authority
- direct `currentTenant.type` fallback no longer affects routing authority where the branch is family-critical

### 12.3 Login Path Checks

- tenant login with complete canonical identity still reaches the expected tenant family shell
- tenant login with incomplete canonical identity does not enter a guessed shell and instead resolves or blocks explicitly
- no pre-canonical `applyTenantBootstrapState` branch renders `EXPERIENCE` or `WL_ADMIN` from guessed identity

### 12.4 Restore And Refresh Checks

- tenant restore with valid token waits for canonical confirmation before family shell entry
- browser refresh follows the same rule as restore
- stale local hint data does not change family choice during restore or refresh

### 12.5 Impersonation Checks

- impersonation entry verifies the target tenant through fresh canonical identity after token switch
- impersonation restore does not trust stored tenant snapshot family data
- impersonation exit returns coherently to control-plane path or fails closed to auth

### 12.6 Resolving And Blocked State Checks

- resolving state appears where guessed early family entry used to occur
- blocked state appears on incomplete or conflicting identity instead of fallback shell
- no silent family fallback remains in the in-scope branches

### 12.7 Provisioning-Pending Checks

- provisioning-pending remains visible as an explicit blocked state
- provisioning-pending does not re-authorize provisional tenant-family shell entry

## 13. Negative Authority Proof Matrix

| Former authority source | Proof setup | Old forbidden outcome | Required Phase 1 proof |
| --- | --- | --- | --- |
| slug-only WL detection | set tenant slug to a known WL slug while canonical backend identity does not confirm WL | WL storefront or WL admin path chosen from slug alone | slug alone cannot change family or overlay outcome |
| name-only WL detection | set tenant name to a known WL name while canonical backend identity does not confirm WL | WL storefront or WL admin path chosen from name alone | name alone cannot change family or overlay outcome |
| persisted `tenant_category` | persist stale `tenant_category` in local storage hints | stale hint changes family during login, restore, or refresh | persisted `tenant_category` is ignored for routing authority |
| persisted `is_white_label` | persist stale `is_white_label` in local storage hints | stale hint changes WL behavior before canonical confirmation | persisted `is_white_label` is ignored for routing authority |
| JWT-only tenant classification | provide token claims without complete canonical tenant identity | app enters guessed family from token presence or token tenant id alone | token presence or token tenant id alone cannot select family |
| bootstrap stub family or type inference | trigger login or restore path that previously built a provisional tenant stub | stub-generated family renders `EXPERIENCE` or `WL_ADMIN` before canonical confirmation | stub family or type inference no longer selects shell |
| stored impersonation tenant snapshot | persist stored impersonation session with tenant snapshot and refresh during impersonation | refresh re-enters tenant family from stored snapshot before canonical confirmation | stored impersonation tenant snapshot no longer selects family |
| direct `currentTenant.type` fallback where applicable | remove or omit canonical `tenant_category` while `type` remains present | family-critical branch silently falls back through `type` | branch fails closed or remains blocked rather than choosing family from `type` alone |

## 14. Runtime Validation Matrix

| Flow | Minimum setup | Required Phase 1 runtime proof |
| --- | --- | --- |
| tenant login | valid tenant credentials with complete backend identity | no guessed intermediate family; expected family renders only after canonical confirmation |
| tenant login with incomplete identity | valid auth but incomplete canonical family inputs | resolving or blocked state appears; no fallback tenant family shell |
| tenant restore | valid tenant token plus stale local hint data | stale hints do not choose family; restore waits for canonical confirmation |
| browser refresh | refresh while in tenant realm after prior valid session | same as restore; no early shell from stub or hint data |
| impersonation entry | start impersonation from control plane into a tenant | target tenant id is freshly confirmed after token switch before family render |
| impersonation restore | refresh during active impersonation with stored impersonation session present | stored tenant snapshot does not choose family; fresh canonical confirmation required |
| impersonation exit | exit active impersonation | control-plane path is restored coherently or fails closed to auth |
| control-plane return path | leave tenant impersonation and re-enter admin surface | no stale tenant shell remains; no misroute through old tenant family state |

The minimum runtime proof set above is mandatory even if automated tests are added.

## 15. Phase 1 Completion Criteria

Phase 1 is complete only when all conditions below are true.

1. Every in-scope routing-authority leak listed in this artifact has been neutralized.
2. No pre-canonical branch can render `EXPERIENCE` or `WL_ADMIN` from guessed client-authored identity.
3. No in-scope branch accepts slug, name, persisted hint data, JWT-only family inference, bootstrap stub inference, or stored impersonation tenant snapshot as family authority.
4. Direct `currentTenant.type` fallback no longer decides family in the targeted family-critical branch.
5. Resolving and blocked states are present where guessed family entry used to occur.
6. Provisioning-pending remains blocked and does not route into tenant family shell.
7. All checklist items in Sections 12 through 14 have passed.
8. The implementation remained within the exact file allowlist.
9. No descriptor adapter, manifest selector, route decomposition, or shell rewrite was introduced.

Only after all nine conditions are satisfied may Phase 2 planning or implementation begin.

## 16. Carry-Forward Note

Carry-forward requirement:

after the full canonical descriptor and manifest implementation cycle has been completed and verified, TexQtic must perform a mandatory audit and alignment pass across governance documents and planning artifacts so they reflect the new repo reality and do not preserve stale pre-cutover assumptions.

That audit is not part of Phase 1.

It is a mandatory post-cutover governance and planning reconciliation step to prevent drift, duplicate truths, and future implementation confusion.

## Footer

PHASE_1_SCOPE_LOCKED

REPO_TRUTH_AND_ACCEPTED_PLANNING_CONTEXT_ONLY

NO_PRODUCT_FILES_TOUCHED_BY_THIS_ARTIFACT
