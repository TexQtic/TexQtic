# PRODUCT-DEC-FRONTEND-TEST-HARNESS-CI-VERIFIED-001

**Document type:** Governance verification record  
**Unit ID:** `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001`  
**Type:** Frontend test harness CI verification  
**Date:** 2026-05-06  
**Decision Owner:** Paresh Patel (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED  
**`LEGAL_REVIEW_PENDING`:** UNCHANGED  
**Implementation scope:** CI workflow only — no application code, no packages, no configs

---

## 1. Purpose

This record verifies that `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001` is complete and truth-synced.

The unit added the root frontend test harness command (`npm run test:frontend`) to the PR gate
CI workflow (`.github/workflows/test-suite.yml`), including the prerequisite root dependency
install step (`npm ci`), while preserving all existing server CI steps unchanged.

---

## 2. Authority Basis

| Source | Path | Role |
|---|---|---|
| Design artifact | `docs/TECS-TTP-FRONTEND-TEST-HARNESS-DESIGN-001-v1.md` | Harness design — D8 states CI integration after pilot |
| Options audit | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-OPTIONS-AUDIT-001.md` | AF-FTH-08: CI integration after pilot confirmed |
| Design decisions | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-DESIGN-DECISIONS-001.md` | D8 resolved: CI after pilot |
| IMPL verification | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-IMPL-VERIFIED-001.md` | Harness infrastructure confirmed complete |
| Pilot verification | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-PILOT-VERIFIED-001.md` | 5/5 pilot TCs confirmed passing |
| Tracker | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | CI-VERIFY-001 row `NOT_OPENED` → `TRUTH_SYNCED` |

---

## 3. Files Changed

| File | Change type | Description |
|---|---|---|
| `.github/workflows/test-suite.yml` | Modified | Added root `npm ci` + `npm run test:frontend` steps after server Vitest |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | Modified | CI-VERIFY-001 row → TRUTH_SYNCED; narrative block added; §20 token added |
| `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-CI-VERIFIED-001.md` | Created | This document |

---

## 4. CI Workflow Summary

**Workflow file:** `.github/workflows/test-suite.yml`  
**PR gate:** triggers on `pull_request` to `main` and `develop`  
**Node version:** 22 (already configured — reused by both server and frontend steps)  
**Package manager (server):** pnpm 9 (unchanged)  
**Package manager (root / frontend):** npm (existing `package-lock.json` at repo root)

### Steps added (appended after server Vitest, before end of job)

```yaml
- name: Install root dependencies (frontend harness)
  run: npm ci

- name: Run frontend test harness (RTL/jsdom)
  run: npm run test:frontend
```

Both steps run from repo root (no `working-directory` override — GitHub Actions default is repo root).

`npm ci` installs from `package-lock.json` (committed at root), ensuring reproducible installs.
`npm run test:frontend` executes: `vitest run --config vitest.frontend.config.ts --passWithNoTests`

### Server CI preservation

All existing server steps are UNCHANGED:

| Step | Command | Status |
|---|---|---|
| Install server dependencies | `pnpm install --frozen-lockfile` (server/) | UNCHANGED |
| Typecheck (server) | `pnpm run typecheck` (server/) | UNCHANGED |
| Lint (server) | `pnpm run lint` (server/) | UNCHANGED |
| Run Vitest — no-DB mode | `pnpm run test:ci` (server/) | UNCHANGED |

The pnpm store cache step and `Get pnpm store directory` step are also unchanged.

### No conflicts between server pnpm and root npm

- Server: pnpm store + `server/pnpm-lock.yaml` (scoped to `server/` with `working-directory`)
- Root: `package-lock.json` (repo root) consumed by `npm ci` (no `working-directory` → repo root)
- No shared install state. No conflicts.

---

## 5. Local CI-Equivalent Validation

| Command | Result | Notes |
|---|---|---|
| `npm ci` | FAILED locally (exit code 1) | Windows OS file-lock (antivirus/editor); environment-only issue. Ubuntu CI will succeed. Closest safe equivalent: `npm install` used to restore node_modules. |
| `npm install` (restore only) | PASS | Restored vitest and deps; `package-lock.json` restored via `git checkout -- package-lock.json` (1 trivial peer metadata diff discarded — not in allowlist) |
| `npm run test:frontend` | PASS — 5/5 (89ms) | TC-FEH-001 through TC-FEH-005 all pass |
| `npx tsc --project tsconfig.test.json --noEmit` | PASS — zero errors | Test tsconfig typecheck |
| `npx tsc --noEmit` | PASS — zero errors | Root typecheck |
| `npm run test:runtime-routing:focused` | PASS — 20/20, 2 files | Server bounded tests |
| `git status --short` | Clean — only `.github/workflows/test-suite.yml` | No unintended file changes |
| `git diff --name-only` | `.github/workflows/test-suite.yml` only | Single allowlisted file |

**`npm ci` local failure explanation:**  
`npm ci` removes `node_modules` before installing (by design). The subsequent install failed due
to a Windows OS-level file-lock error (likely antivirus or VS Code file handles). This is a
local environment constraint only — it does not affect CI (Ubuntu runner). The commands run after
`npm install` restoration confirmed the harness behaves identically to prior runs.

**`package-lock.json` note:**  
`npm install` produced a 1-line metadata diff (`"peer": true` removed from one package entry).
This is an npm version metadata artifact — no package was added, removed, or version-changed.
`git checkout -- package-lock.json` was used to restore the committed state. The lockfile is
not in the allowlist and was not committed.

---

## 6. Server Isolation Proof

`server/vitest.config.ts` includes `'../tests/frontend/**'` in its `exclude` array (added in
`TTP-FRONTEND-TEST-HARNESS-IMPL-001`). This ensures the server Vitest run (`pnpm run test:ci`)
never picks up `tests/frontend/ttp-enrollment-admin.test.tsx` or any future `tests/frontend/**`
file. Server runs under the `node` environment — RTL/jsdom tests would fail there by design.

This exclusion was confirmed unchanged this session. Server bounded tests (20/20) continue to pass.

---

## 7. Safety / No-Go Confirmation

| Safety invariant | Status |
|---|---|
| No application code changed | ✅ CONFIRMED |
| No UI components changed | ✅ CONFIRMED |
| No existing tests changed | ✅ CONFIRMED |
| No test harness config changed (`vitest.frontend.config.ts`, `tests/setupTests.ts`, `tsconfig.test.json`) | ✅ CONFIRMED |
| No root `package.json` changed | ✅ CONFIRMED |
| No `package-lock.json` committed (restored to HEAD) | ✅ CONFIRMED |
| No server `package.json` or lockfile changed | ✅ CONFIRMED |
| No backend routes, services, or middleware changed | ✅ CONFIRMED |
| No Prisma schema or SQL migrations changed | ✅ CONFIRMED |
| No `.env` or env variables changed | ✅ CONFIRMED |
| No feature flags changed | ✅ CONFIRMED |
| No `TenantFeatureOverride` data changed | ✅ CONFIRMED |
| No legal constants changed | ✅ CONFIRMED |
| `ttp_enabled=false` | ✅ UNCHANGED |
| `LEGAL_REVIEW_PENDING` | ✅ UNCHANGED |
| No TTP activation occurred | ✅ CONFIRMED |
| No Wave 3/4/5 unit opened | ✅ CONFIRMED |
| Tenant v2 surface `BLOCKED_LEGAL` | ✅ UNCHANGED |

---

## 8. Remaining Future Candidate Units

The following units are candidates for future work — **none are opened by this record**:

| Candidate unit | Status | Gate |
|---|---|---|
| More `TtpEnrollmentAdmin` interaction tests | Not opened | Requires `@testing-library/user-event` (deferred, D7) |
| `@testing-library/user-event` design/implementation | Not opened | Requires Paresh authorization |
| Additional component RTL tests (VpcConsole, TtpEligibilityConsole) | Not opened | Requires Paresh authorization |
| Broader component test rollout | Not opened | Requires Paresh authorization |
| Wave 3 units (consent, score routing) | Not opened | `LEGAL_GATED__WAITING` |
| Wave 4 units (partner workflow, finance) | Not opened | `PARTNER_GATED__WAITING` |
| Wave 5 units | Not opened | `FUTURE_DESIGN_TARGET__WAITING` |

---

## 9. Commit Registry

| Commit | Message | Files |
|---|---|---|
| Commit 1 | `[TEXQTIC] ci(frontend): run react testing library harness` | `.github/workflows/test-suite.yml`, tracker |
| Commit 2 | `[TEXQTIC] docs(frontend): verify test harness ci gate` | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-CI-VERIFIED-001.md` |

---

## 10. Final Decision

```
TTP_FRONTEND_TEST_HARNESS_CI_VERIFY_001_VERIFIED_COMPLETE
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**`LEGAL_REVIEW_PENDING`:** UNCHANGED  
**No activation occurred.**
