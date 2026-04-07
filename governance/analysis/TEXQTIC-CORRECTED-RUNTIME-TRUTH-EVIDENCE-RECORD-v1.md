# TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1

## 1. Purpose, Scope, and Update Notice

This artifact preserves corrected live production runtime truth for TexQtic from the latest
runtime-first rerun executed against live production on 2026-04-07.

This file is evidence-first.

### 1.1 Update Notice

This runtime evidence record has been updated in place with bounded follow-up results recorded after
the corrected rerun.

The update captures two now-resolved items:

- Enterprise Audit Log is now classified as `WORKING`
- marketing `Sign in` handoff is now deployment-complete and verified live

This remains a runtime-evidence update only. It is not a new runtime audit, not a next-unit
selection pass, not an implementation pass, and not a runtime-to-implementation wiring audit.

It supersedes the earlier flawed first-pass runtime probe as the authoritative runtime baseline for
the exact surfaces exercised here.

It does not itself:

- open a unit
- select a next candidate
- authorize implementation
- authorize a product-facing opening
- merge these findings back into older flawed runtime conclusions

This artifact exists so that later governance work consumes a preserved corrected runtime baseline
rather than relying on memory, compressed summary, or the earlier non-authoritative pass.

## 2. Why the Earlier Runtime Report Is Not Authoritative

The earlier runtime pass is not authoritative because it was flawed in three material ways:

- the Super Admin path was not truthfully tested through the live `Staff Control Plane` entry
  surface before classification
- some tenant modules were classified before they were given enough bounded load time to settle,
  which overstated failure where slow recovery was the more truthful runtime behavior
- marketing-site truth and platform-app truth were not kept cleanly separated, which blurred the
  real distinction between `https://app.texqtic.com` and the marketing surfaces

That earlier pass remains part of the historical record only. It must not be used as the current
runtime authority for the surfaces covered by this corrected evidence record.

## 3. Enterprise Audit Log Follow-up Result

Follow-up status: `BOUNDED_RUNTIME_FOLLOW_UP_COMPLETED`

Final classification: `WORKING`

Exact runtime evidence preserved from the bounded follow-up:

- exact route / surface tested: `https://app.texqtic.com/` in the enterprise tenant shell, using
  the enterprise left-nav `Audit Log` surface
- wait condition used: Audit Log heading is visible and the surface either shows data rows, an empty
  state, a permission/error state, or finishes loading
- first navigation result: the Audit Log surface was reached in `4ms` and showed a real loading
  state with `LOADING…` and `Loading audit log entries…`
- recovery behavior: the surface recovered to live data rather than an error, permission gate, or
  placeholder-only shell
- refresh-cycle timing: `4414ms` from `REFRESH` click to a fully loaded table
- data loaded: yes
- empty state appeared: no
- permission/realm error appeared: no
- network error appeared: no
- later recovered: yes
- live loaded-surface proof included headers `TIMESTAMP`, `ACTION`, `ENTITY`, `ENTITY ID`, `ACTOR`,
  and `REALM`
- live loaded-surface proof included tenant-scoped rows such as `AUTH_REFRESH_ISSUED`,
  `AUTH_LOGIN_SUCCESS`, and `catalog.item.updated`
- API response `GET /api/tenant/audit-logs` returned `200`
- no relevant console errors were emitted
- URL remained on `https://app.texqtic.com/`

What changed from the earlier corrected baseline:

- Enterprise Audit Log is no longer unresolved / inconclusive
- targeted code or wiring classification is not needed, because the runtime result is materially
  working
- no files were modified in the TexQtic repo during that bounded follow-up pass

## 4. Marketing Sign in Deployment-Complete Result

Final classification: `WORKING`

Deployment-complete and live-verified result preserved from the follow-up record:

- the marketing repo fix was committed and pushed on `main`
- commit: `94bd208`
- message: `fix: correct marketing sign-in handoff to app`
- changed files in the marketing repo: `App.tsx`, `routes.ts`
- local status in the marketing repo was clean and aligned with `origin/main`
- live production verification now confirms:
  - `https://texqtic.com` renders `Sign in` with href `https://app.texqtic.com`
  - `https://www.texqtic.com` renders `Sign in` with href `https://app.texqtic.com`
- both live marketing hosts now hand off `Sign in` to the app host rather than looping back into a
  marketing host
- the prior marketing-domain self-loop is no longer present
- external-link behavior remains intact via `target="_blank"` and `rel="noopener noreferrer"`

What changed from the earlier corrected baseline:

- marketing `Sign in` handoff is no longer a broken live production defect
- the previously strongest confirmed public defect from the corrected rerun has now been fixed and
  verified live in production
- this evidence update records the runtime result only; it does not import marketing implementation
  authority into the TexQtic repo

## 5. Updated Runtime Findings

### 5.1 Corrected Classification Baseline

- Super Admin = `SLOW_LOAD_BUT_RECOVERS`
- Enterprise Tenant = `SLOW_LOAD_BUT_RECOVERS`
- Enterprise Audit Log = `WORKING`
- White-Label Tenant = `SLOW_LOAD_BUT_RECOVERS`
- Unauthenticated app user = `WORKING`
- Marketing Sign in handoff = `WORKING`

### 5.2 Corrected Runtime Truth Preserved As-Is In Meaning

- `https://app.texqtic.com` is the authoritative platform runtime surface for control-plane,
  tenant, white-label admin, and unauthenticated app-entry truth
- `https://texqtic.com` and `https://www.texqtic.com` are marketing-only surfaces and must not be
  treated as the authoritative platform runtime
- the earlier Super Admin failure impression was materially overstated; the corrected rerun first
  reproduced an invalid-credentials result using the wrong password attempt `Passwoer123!`, and the
  later retest with the repo-consistent seeded/admin-doc credential `Password123!` reached the live
  control-plane shell through `Staff Control Plane`
- Enterprise tenant runtime is materially working; the truthful classification is slow-load
  recovery rather than broad enterprise-shell failure
- Enterprise Audit Log is now resolved as `WORKING`; the bounded follow-up reached the Audit Log
  surface through enterprise left-nav, observed a real initial loading state, and then confirmed a
  populated tenant-scoped table with `GET /api/tenant/audit-logs = 200`
- White-label runtime is materially working; the truthful classification is slow-load recovery
  rather than broad white-label-shell failure
- Enterprise and white-label are not shell-only recoveries; both expose materially real, data-backed
  runtime surfaces after bounded recovery
- the public/marketing `Sign in` handoff is no longer broken in production; the marketing repo fix
  is deployment-complete and live verification now confirms both `texqtic.com` and
  `www.texqtic.com` hand off `Sign in` to `https://app.texqtic.com`
- the prior marketing-domain self-loop is no longer present, and external-link behavior remains
  intact via `target="_blank"` and `rel="noopener noreferrer"`

## 6. Updated Runtime Evidence Map

### 6.1 Super Admin

- Persona: Super Admin
- Domain tested: `https://app.texqtic.com`
- Route / surface: `/` -> `Staff Control Plane` -> control-plane shell / `Tenant Registry`
- Classification: `SLOW_LOAD_BUT_RECOVERS`
- Observed behavior:
  - the corrected rerun first verified the live realm switch itself: `🛡️ TexQtic Admin`, `Sign in
    to your admin`, and `Admin MFA Required` were visible only after selecting `Staff Control
    Plane`
  - a bounded login attempt with `admin@texqtic.com` and `Passwoer123!` settled in 5.331s with
    visible `Invalid credentials.` and a 401 response, which proved the admin path itself was live
    but the credential pair was wrong
  - targeted repo follow-up then confirmed `Password123!` as the repo-consistent seeded/admin-doc
    password in `server/prisma/seed.ts` and `server/README.md`
  - a retest with `admin@texqtic.com` and `Password123!` reached the live control-plane shell by the
    end of the first 10.029s auth window, and `Tenant Registry` hydrated 18ms later with live
    counts and real tenant rows
- Expected behavior: valid admin credentials entered through the real `Staff Control Plane` surface
  should reach the live control-plane shell and control-plane data surfaces
- Production-safe testing limit: no tenant provisioning, no feature-flag mutation, no tenant
  impersonation, no control-plane mutation actions were executed
- Targeted repo / code follow-up already known:
  - `server/prisma/seed.ts` confirms `Password123!` as the seeded admin password
  - `server/README.md` documents `Password123!` for the seeded admin account
  - `components/Auth/AuthFlows.tsx` matches the observed `Staff Control Plane` / admin-presentation
    split

### 6.2 Enterprise Tenant

- Persona: Enterprise tenant owner
- Domain tested: `https://app.texqtic.com`
- Route / surface: `/` -> tenant auth -> `Enterprise Management` shell -> `Wholesale Catalog`, `View
  My RFQs`, `Orders`, `DPP Passport`, `Members`, `Invite Member`, `Audit Log`
- Classification: `SLOW_LOAD_BUT_RECOVERS`
- Observed behavior:
  - email-resolution on blur immediately identified `✓ Acme Corporation`
  - in the corrected rerun, the first 10.0s auth window remained on `AUTHENTICATING...`, while a
    bounded follow-up recovered almost immediately into the enterprise shell on
    `https://app.texqtic.com/`
  - a later relogin in the same broader pass recovered directly into the enterprise shell in 3.302s,
    reinforcing that the runtime does recover and is materially working rather than broadly broken
  - `View My RFQs` settled in 4.282s with real records and `View Detail`
  - `Orders` settled in 5.319s with real order rows and visible `Confirm`, `Cancel`, and
    `Fulfill` actions
  - `DPP Passport` empty-state validation returned `Node ID is required.` in 8ms
  - `Members` settled in 24ms with a real owner row and `Edit Access`
  - `Invite Member` opened cleanly in 6ms and rendered the send-invite surface without submission
  - bounded follow-up later reached `Audit Log` through enterprise left-nav in 4ms, observed a real
    loading state, and then recovered to a populated table; `REFRESH` reloaded the same surface to
    a fully loaded table in 4414ms with `GET /api/tenant/audit-logs = 200`
- Expected behavior: enterprise login should recover into a live tenant shell and bounded tenant
  modules should expose real tenant data surfaces rather than persistent loading or token-failure
  states
- Production-safe testing limit: no order lifecycle actions were clicked, no invite was sent, no
  membership was changed, and no data-mutating tenant action was executed
- Targeted repo / code follow-up already known:
  - no additional repo-wiring audit was run yet for the materially working enterprise surfaces
  - no targeted code or wiring classification is needed for `Enterprise Audit Log`, because the
    runtime result is materially working

### 6.3 White-Label Tenant

- Persona: White-label tenant owner
- Domain tested: `https://app.texqtic.com`
- Route / surface: `/` -> tenant auth -> `Store Admin · Wave 4 P1` -> `Store Profile`, `Staff`,
  `Products`, `Collections`, `Orders`, `Domains`, `← Storefront`
- Classification: `SLOW_LOAD_BUT_RECOVERS`
- Observed behavior:
  - email-resolution on blur immediately identified `✓ White Label Co`
  - the first 10.034s white-label auth window remained on `AUTHENTICATING...`, while a second
    bounded wait recovered in 212ms into the live white-label admin shell
  - `Store Profile` / `Storefront Configuration` rendered materially real brand/domain controls
  - `Staff` settled in 6.250s with the owner row and `Edit Access`
  - `Products` settled in 4ms with a live product record
  - `Collections` settled in 3.934s with a read-only `Uncategorised` collection containing 1 item
  - `Domains` settled in 4.068s with platform domain `white-label-co.texqtic.app` active and custom
    domain `whitelabel.example.com` marked `Verified` and `Primary`
  - `Orders` settled in 4.555s with live order rows and visible `Confirm` / `Cancel` actions
  - `← Storefront` rendered a branded public storefront with a live product catalog rather than a
    shell-only placeholder
- Expected behavior: white-label owner login should recover into the live white-label admin shell,
  and both admin panels and storefront handoff should expose materially real runtime surfaces
- Production-safe testing limit: no order action was clicked, no brand settings were saved, no
  custom domain was added or removed, and no product mutation was executed
- Targeted repo / code follow-up already known:
  - no implementation trace was run yet for the live white-label surfaces because this artifact is
    runtime-truth preservation only
  - later runtime-to-implementation auditing remains intentionally deferred

### 6.4 Unauthenticated App User

- Persona: Unauthenticated app user
- Domain tested: `https://app.texqtic.com`
- Route / surface: `/` after bounded logout from authenticated runtime
- Classification: `WORKING`
- Observed behavior:
  - the public app landing surface presented `Tenant Access`, `Staff Control Plane`, email/password
    inputs, and `Secure Login`
  - no tenant shell, white-label admin shell, or control-plane data leaked into the unauthenticated
    app surface
- Expected behavior: the public platform app should expose only the bounded auth-entry surface when
  the user is logged out
- Production-safe testing limit: auth-entry surface only; no signup, no password reset, and no
  invite flow were executed in this pass
- Targeted repo / code follow-up already known:
  - none required from this evidence step because the observed public app surface matched expected
    bounded auth-entry behavior

### 6.5 Marketing User Handoff

- Persona: Unauthenticated marketing user testing the sign-in handoff
- Domain tested: `https://texqtic.com` and `https://www.texqtic.com`
- Route / surface: `/` marketing shell -> header `Sign in`
- Classification: `WORKING`
- Observed behavior:
  - both `https://texqtic.com` and `https://www.texqtic.com` now render `Sign in` with href
    `https://app.texqtic.com`
  - both live marketing hosts now hand off `Sign in` to the authoritative app host
  - the prior marketing-domain self-loop is no longer present
  - external-link behavior remains intact via `target="_blank"` and `rel="noopener noreferrer"`
- Expected behavior: both marketing surfaces should route sign-in traffic into the authoritative
  platform app surface at `https://app.texqtic.com`
- Production-safe testing limit: only bounded header navigation was exercised; no marketing request
  forms were submitted
- Targeted repo / code follow-up already known:
  - the fix was implemented in the marketing repo rather than the TexQtic repo
  - marketing repo commit `94bd208` (`fix: correct marketing sign-in handoff to app`) changed
    `App.tsx` and `routes.ts`
  - `server/src/config/index.ts` already treats `https://app.texqtic.com` as the canonical frontend
    fallback, which remains consistent with the now-correct live handoff

## 7. Updated Governance-Useful Conclusions

This corrected runtime pass materially changes current governance truth in the following ways:

- prior runtime assumptions were too pessimistic about the Super Admin, Enterprise, and White-Label
  paths; those paths are not best classified as broad runtime failures
- the control-plane shell is materially real when entered through the correct `Staff Control Plane`
  path with the correct credential pair
- Enterprise runtime is materially real beyond shell presence; RFQs, Orders, DPP validation,
  Members, Invite Member, and Audit Log all exposed real bounded runtime surfaces
- White-Label runtime is materially real beyond shell presence; Store Profile, Staff, Products,
  Collections, Orders, Domains, and Storefront handoff all exposed real bounded runtime surfaces
- Enterprise tenant maturity is stronger than first-pass reporting suggested, because the
  previously unresolved Audit Log surface is now resolved as materially working
- the previously strongest confirmed public defect from the corrected rerun, the marketing `Sign in`
  handoff, has now been fixed and verified live in production
- the corrected runtime baseline is now stronger and cleaner than before: key tenant, control-plane,
  white-label, app-entry, Audit Log, and marketing handoff truths are all more sharply resolved
- any later governance opening, fix selection, or implementation planning must start from this
  corrected runtime baseline rather than from the earlier flawed first-pass report

## 8. Updated Immediate Next Step

The next major step should now be the Runtime-to-Implementation Wiring Audit.

That later audit is not part of this evidence update and is not authorized by this file.

## 9. Non-Opening Rule

This runtime-truth evidence record explicitly:

- does not open a unit
- does not select a next candidate
- does not authorize implementation
- does not create opening authority
- exists only to improve Governance OS runtime truth before later follow-up work