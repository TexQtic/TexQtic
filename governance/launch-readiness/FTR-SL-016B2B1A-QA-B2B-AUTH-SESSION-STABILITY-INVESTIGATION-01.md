# FTR-SL-016B2B1A - QA B2B Auth Session Stability Investigation

## 1. Unit Identity

- Unit ID: FTR-SL-016B2B1A-QA-B2B-AUTH-SESSION-STABILITY-INVESTIGATION-01
- Date: 2026-06-14
- Mode: bounded auth/session stability investigation
- Final enum: FTR_SL_016B2B1A_CONFIRMED_UI_SESSION_BACKEND_AUTH_MISMATCH

## 2. Repo Preflight

- Branch: main
- HEAD before: 33143a71c3a0bb04130f073bcc3a357f1cb2bb2d
- Origin sync: yes (`HEAD -> main, origin/main, origin/HEAD` aligned at start)
- Initial worktree: clean tracked worktree before governance edits
- Required commands run:
  - `git branch --show-current`
  - `git rev-parse HEAD`
  - `git status --short`
  - `git log --oneline -20`
  - `git remote -v`

## 3. QA Seed / Auth-State Evidence

- QA seed artifact: `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-C-ALT-QA-SEED-EVIDENCE.md`
- qa-b2b documented: yes (`qa-b2b` anchor tenant seeded)
- qa.b2b@texqtic.com documented: yes
- all QA tenants OWNER coverage: yes (`All 13 QA tenants have OWNER`)
- `.auth/qa-b2b.json` present: yes
- auth contents printed: no

Additional auth-state metadata captured without reading contents:

- file: `.auth/qa-b2b.json`
- length: `324`
- lastWriteTime: `2026-04-29 22:09:11`

## 4. Manual Login Stability

- Paresh login used: yes, fresh manual QA B2B login reported and shared live in the IDE browser during this continuation
- Initial visible shell: authenticated `QA B2B | TexQtic B2B Workspace`
- Initial browser identity cues: sidebar/org header showed `QA B2B`; workspace nav and editable catalog controls rendered
- Initial storage state: `localStorage` contained `texqtic_auth_realm`, `texqtic_tenant_identity_hints`, and `texqtic_tenant_token`; `sessionStorage` contained `texqtic_rehydration_trace`
- Initial token decode (safe fields only): `orgId=faf2e4a7-5d79-4b00-811b-8d0dce4f4d80`, `role=OWNER`, no email/exp surfaced in payload
- Initial GET `/api/me`: `401 UNAUTHORIZED`
- Initial GET `/api/tenant/profile`: `401 UNAUTHORIZED`
- Tenant identity from protected API: not resolved because the backend rejected the current token as invalid or expired
- canEdit: not reachable from protected API because profile fetch returned `401`
- Refresh result: hard reload briefly showed `TexQtic Sign In` with `Confirming workspace access`, then settled back into `QA B2B | TexQtic B2B Workspace`
- Post-refresh storage state: same tenant token and hint keys still present
- Post-refresh GET `/api/tenant/profile`: `401 UNAUTHORIZED`
- Session remained stable: visually yes, auth-valid no; the workspace shell persisted while protected API auth remained broken

## 5. Playwright / Tooling Impact

- Playwright available: no usable local runner found in this workspace (`playwright` command absent; `node_modules/.bin/playwright.cmd` absent)
- Existing auth-state helper: yes, `tests/e2e/setup-auth-state.ts`
- `.auth` replay attempted: no secret-bearing replay attempted
- Result: no safe browser replay was possible from the available tooling in this workspace
- Did Playwright alter IDE browser session: not reproduced in this continuation because no Playwright runner was available and the shared browser was already unauthenticated
- Tooling limitation: yes

Important repo truth preserved:

- `tests/e2e/setup-auth-state.ts` captures auth state by opening a separate headed Chromium browser and saving `{ token, orgId }` to `.auth/*.json`
- `tests/e2e/dpp-passport-network.spec.ts` explicitly notes that Bearer-token `.auth/qa-b2b.json` is insufficient by itself for authenticated browser tenant views; proper authenticated browser session/context is required

## 6. Root-Cause Classification

- Classification: confirmed UI-session/backend-auth mismatch in a fresh manual QA B2B IDE-browser session
- Evidence:
  - fresh manual login produced a visible `QA B2B` workspace shell in the shared IDE browser
  - current browser had `texqtic_tenant_token` in `localStorage`
  - safe token decode showed `orgId=faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` and `role=OWNER`
  - `GET /api/me` returned `401`
  - `GET /api/tenant/profile` returned `401`
  - reload briefly dropped to `Confirming workspace access` before returning to the same QA B2B shell
  - post-reload `GET /api/tenant/profile` still returned `401`
  - current repo/test tooling still shows `.auth/qa-b2b.json` stores Bearer token + orgId, not a shared IDE browser session
- Not caused by:
  - missing QA B2B seed data
  - confusion between QA WL and QA B2B in repo truth
  - lack of a fresh manual login handoff in this continuation
  - public projection leakage
- Recommendation:
  - do not use the current QA B2B session for B2B1 save/readback proof
  - open a dedicated product auth/session bug unit against tenant-session persistence or token-validation mismatch
  - investigate why the B2B workspace shell can render from local state while protected tenant endpoints reject the stored token
  - only resume B2B1 owner/admin save-readback after `GET /api/tenant/profile` returns `200` in the same manual IDE-browser session

## 7. Auth / Tenant / Route Findings

- Auth session storage:
  - `App.tsx` `hasStoredAuthenticatedSession()` checks `localStorage['texqtic_tenant_token']` or `localStorage['texqtic_admin_token']`
  - `services/apiClient.ts` stores auth realm in `localStorage['texqtic_auth_realm']`
- Tenant context selection:
  - tenant login is email-membership driven through `resolveTenantsByEmail()` and selected tenantId is passed into login
  - login stores token via `setToken(payload.token, realm)`
- Route fallback on refresh:
  - `resolveInitialAppState()` prioritizes path-based public routes like `/products`, `/b2b`, `/product/:slug`, `/supplier/:slug`, `/register`, `/request-access`, etc., before falling back to `AUTH` or `PUBLIC_ENTRY`
  - this means a user can land on public browse even when stale realm hints remain but no active tenant token exists
- Why `/products` can show logged-out/public cues:
  - `/products` always resolves to `PUBLIC_B2C_BROWSE` by pathname rule
  - apiClient intentionally omits `Authorization` on `/api/public/*` routes
  - current shared page demonstrated the mixed state clearly: public browse / platform entry with no tenant token and `401` on protected endpoints
- `.auth/qa-b2b.json` usability:
  - existing tests know how to load it through `loadStoredAuth('qa-b2b')`
  - current tooling in this workspace cannot safely replay it into the shared IDE browser session

## 8. Public Non-Exposure

- `/api/public/b2b/suppliers`: `200`, no forbidden rich/private keys found
- `/b2b`: rendered, no exact QA verification values or private identifiers found
- `/products`: rendered, no exact QA verification values or private identifiers found
- private contact exposed: no
- CIN/Udyam/IEC exposed: no
- rich fields projected: no
- certificate document data exposed: no

## 9. Static Validation

- `git diff --check`
  - pending after governance edits in this unit

## 10. Files Changed

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016B2B1A-QA-B2B-AUTH-SESSION-STABILITY-INVESTIGATION-01.md`

## 11. Governance Updates

- `FUTURE-TODO-REGISTER.md`
  - add latest bounded update row for B2B1A investigation
- `B2B1A artifact`
  - created in this unit
- `B2B1 artifact updated`
  - no

## 12. Hub-Sync Checklist

1. Did this unit change launch readiness truth? Yes. It narrowed the active blocker from generic session absence to a concrete session-handoff/browser-context problem with no current proof of a product auth bug.

1. Which family or requirement changed? FTR-SL-016B2B1 manual verification recovery path and readiness to resume B2B1.

1. Which hub documents need to be updated? `governance/launch-readiness/FUTURE-TODO-REGISTER.md` and this B2B1A artifact.

1. What evidence supports the update? Repo preflight, seed docs, `.auth/qa-b2b.json` metadata, auth/session code reads, current browser `401` probes, and public non-exposure check.

1. Are CRM/CAE details at risk of duplication? No.

1. Are any planned items at risk of incorrect MVP promotion? Yes. B2B1 save/readback must not be declared blocked by missing QA data or by a product bug until a fresh manual QA B2B login is tested without Playwright.

1. Are any stale hub rows superseded? Yes. The prior B2B1 blocker should now be read as a session-stability investigation follow-up, not merely a missing user handoff.

1. If no hub update is needed, record reason. Hub update was needed and performed.

1. Were hub files allowlisted? Yes.

## 13. Residuals / Blockers

- B2B1 owner/admin save-readback remains blocked because the current manual QA B2B workspace shell is not backed by a token accepted by protected tenant APIs.
- No local Playwright runner is available in this workspace to safely replay `.auth/qa-b2b.json` into a browser context, but that is now secondary because the fresh manual IDE-browser login itself reproduced the mismatch.
- Product auth/session diagnosis is still required before any mutation proof is trustworthy.

## 14. Adjacent Findings

- ID: AF-016B2B1A-001
- Finding: current browser state retained `texqtic_auth_realm` and `texqtic_tenant_identity_hints` but no tenant token, yielding public entry plus `401` on protected routes
- Disposition: likely stale local hint state after session loss; investigation only, no source fix authorized
- Priority: P2
- Owner/status: auth/session investigation / OPEN

- ID: AF-016B2B1A-002
- Finding: `resolveInitialAppState()` prioritizes public pathname routing before auth fallback, so `/products` and `/b2b` can legitimately render public surfaces even after an authenticated session disappears
- Disposition: repo-truth clarification, not automatically a defect
- Priority: P2
- Owner/status: route/auth understanding / OPEN

- ID: AF-016B2B1A-003
- Finding: repo test evidence already warns that Bearer-token auth-state alone is insufficient for authenticated browser tenant view proof without a proper Playwright browser session/context
- Disposition: tooling/procedure clarification, not product defect
- Priority: P2
- Owner/status: QA tooling / OPEN

- ID: AF-016B2B1A-004
- Finding: a fresh manual QA B2B IDE-browser login can render the full QA B2B workspace shell while protected tenant endpoints still return `401 Invalid or expired token`
- Disposition: likely product auth/session persistence or token-validation mismatch; requires a dedicated bug/fix unit before B2B1 save proof can resume
- Priority: P1
- Owner/status: auth/session bug investigation / OPEN

## 15. Next-Step Request

Open a dedicated auth/session bug unit using this artifact as the bounded evidence base. B2B1 should stay paused until the same IDE-browser QA B2B session yields `GET /api/tenant/profile` = `200`.