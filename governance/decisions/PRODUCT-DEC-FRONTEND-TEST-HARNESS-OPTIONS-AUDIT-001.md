# PRODUCT-DEC-FRONTEND-TEST-HARNESS-OPTIONS-AUDIT-001

## Governance Audit Artifact — Frontend Test Harness Options Audit

---

## Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-FRONTEND-TEST-HARNESS-OPTIONS-AUDIT-001` |
| **Audit type** | Repo-truth options audit — answers open decisions before IMPL-001 |
| **Parent design artifact** | `docs/TECS-TTP-FRONTEND-TEST-HARNESS-DESIGN-001-v1.md` |
| **Parent design status** | `DESIGN_OPEN` — awaiting Paresh review |
| **Audit date** | 2026-05-06 |
| **Produced by** | GitHub Copilot under Safe-Write Mode |
| **Authority** | Paresh Patel — TexQtic founder / operator |
| **Files created** | This file only |
| **Files modified** | None (audit only) |
| **Packages installed** | None |
| **App code modified** | No |
| **`ttp_enabled` state** | `false` — UNCHANGED |
| **`LEGAL_REVIEW_PENDING` state** | Active — UNCHANGED |

---

## 1. Purpose

This artifact answers the 8 open decisions defined in §12 of
`docs/TECS-TTP-FRONTEND-TEST-HARNESS-DESIGN-001-v1.md` and resolves the 9 additional audit
findings (AF-FTH-01 through AF-FTH-09) through direct inspection of the live repository.

No decisions are made here — findings and recommended options are presented for Paresh review.

---

## 2. Authority Basis

| Prior unit | Status |
|---|---|
| `TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001` | `AUDIT_COMPLETE` |
| `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` | `TRUTH_SYNCED` |
| `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-PRODUCTION-VERIFY-001` | `PRODUCTION_VERIFIED` |
| `TTP-FRONTEND-TEST-HARNESS-DESIGN-001` | `DESIGN_OPEN` |

This audit is the direct successor to `TTP-FRONTEND-TEST-HARNESS-DESIGN-001`. It does not
open implementation. Implementation (`TTP-FRONTEND-TEST-HARNESS-IMPL-001`) remains `NOT_OPENED`.

---

## 3. Repo-Truth Inspection Summary

All findings below are derived from direct file reads performed during this audit session.
No inference without evidence.

### 3.1 Root Package Dependency Landscape

**Source: `package.json` (root), read directly**

| Package | Present in root devDeps? |
|---|---|
| `vitest` | ❌ Not present |
| `@testing-library/react` | ❌ Not present |
| `@testing-library/jest-dom` | ❌ Not present |
| `jsdom` | ❌ Not present |
| `happy-dom` | ❌ Not present |
| `@vitejs/plugin-react` | ✅ Present (`^4.3.1`) |
| `vite` | ✅ Present (`^5.3.1`) |
| `typescript` | ✅ Present (`^5.2.2`) |

**Root has no `pnpm-lock.yaml`** (only `server/pnpm-lock.yaml` exists). A root install would create one.

No `test:frontend` script exists. Existing test scripts: `test:server` → `pnpm --dir server run test:ci`;
`test:runtime-routing:focused` and `test:runtime-verification` → both call server vitest.

### 3.2 Server Package Dependency Landscape

**Source: `server/package.json` + `server/pnpm-lock.yaml`, read directly**

| Package | Installed in server? |
|---|---|
| `vitest` | ✅ `^4.0.18` (resolved: `4.0.18`) |
| `@vitest/ui` | ✅ `^4.0.18` |
| `vite` | ✅ `7.3.1` (vitest 4 peer dependency) |
| `@testing-library/react` | ❌ Not installed |
| `@testing-library/jest-dom` | ❌ Not installed |
| `jsdom` | ❌ Not installed (optional peer dep of vitest only) |
| `happy-dom` | ❌ Not installed (optional peer dep of vitest only) |

**CRITICAL FINDING:** Vitest 4.x requires `vite: ^6.0.0 || ^7.0.0-0` (confirmed via `@vitest/mocker`
peer dep in server lockfile). Root `package.json` uses `vite: ^5.3.1`. Adding vitest 4.x to root
devDependencies would create a peer dependency version conflict with root's vite 5.x.

### 3.3 Vitest Configuration

**Source: `server/vitest.config.ts`, read directly**

```typescript
// Key relevant fields
environment: (not set — defaults to 'node')
fileParallelism: false
testTimeout: DB_TIMEOUT_MS (15000)
include: [
  'src/__tests__/**',
  'src/services/ai/__tests__/**',
  'src/routes/**',
  // ... specific integration paths ...
  '../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'   // ← PICKS UP ALL OF tests/ RECURSIVELY
]
exclude: ['node_modules', 'dist']
```

**CRITICAL FINDING (for DECISION 4 + AF-FTH-07):** The server Vitest config includes
`'../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'` — a recursive glob that will match files in
`tests/frontend/` (since `tests/frontend/` is a subdirectory of `tests/`). Any frontend test
files placed in `tests/frontend/` using `@testing-library/react` would also be discovered by
server Vitest and run in its `node` environment (no DOM), causing failures.

**Root `vite.config.ts`:** No `test` block. Plugins: `[react()]`. No path aliases.

### 3.4 TypeScript Configuration

**Source: `tsconfig.json` (root), read directly**

```json
{
  "jsx": "react-jsx",
  "strict": true,
  "moduleResolution": "Node",
  "include": ["src", "*.ts", "*.tsx", "components", "layouts", "services", "vite-env.d.ts"],
  "exclude": ["node_modules", "dist", "server", "api", "tests"]
}
```

**FINDING:** Root `tsconfig.json` explicitly **excludes `tests/`**. Test files in `tests/frontend/`
will not be type-checked by the root tsc config. For IMPL-001, a separate `tsconfig.test.json`
or Vitest's own TypeScript pipeline (esbuild) should handle the test files. No path aliases are
defined — no alias conflict risk.

### 3.5 Existing Test Patterns in `tests/`

**Source: `tests/` directory listing + grep across test files, read directly**

| Pattern | Evidence |
|---|---|
| `@testing-library/react` used | ❌ Zero occurrences (confirmed via grep) |
| `jsdom` or `happy-dom` used | ❌ Zero occurrences (confirmed via grep) |
| `renderToStaticMarkup` used | ✅ In 6+ test files (SSR/presentational static markup only) |
| Tests are pure logic tests | ✅ `ttp-control-plane-feature-disabled-ux.test.tsx` explicitly notes: "no @testing-library/react (not in repo)" |
| All tests run via server Vitest | ✅ All root `tests/` files discovered via `../tests/**` glob in server config |
| Current test file count | 47+ test files, no `tests/frontend/` subdirectory |

### 3.6 CI Workflow Analysis

**Source: `.github/workflows/test-suite.yml`, read directly**

| Step | Details |
|---|---|
| Dependencies installed | Server only (`working-directory: server; pnpm install --frozen-lockfile`) |
| TypeScript check | Server: `pnpm run typecheck` |
| Lint | Server: `pnpm run lint` |
| Tests | Server: `pnpm run test:ci` with `DATABASE_URL: ''` |
| Root install | ❌ Not present |
| Frontend test step | ❌ Not present |

**FINDING:** Current CI gate runs **server tests only**. No root dependency installation.
Adding frontend tests to CI requires both a root `pnpm install` step and a new test step.

### 3.7 Pilot Component Analysis — TtpEnrollmentAdmin

**Source: `components/ControlPlane/TtpEnrollmentAdmin.tsx`, fully read**

| Property | Finding |
|---|---|
| React router imports | ❌ None (no `react-router-dom` import anywhere in file) |
| CSS module imports | ❌ None (Tailwind classes only) |
| External context required | ❌ No AuthContext, CartContext, or other context consumed |
| Required props | None (component takes no props — `export default function TtpEnrollmentAdmin()`) |
| Async state pattern | `useCallback` + `useEffect` for `load()` function |
| Catch branches | **3 branches:** (1) `FEATURE_DISABLED` specific copy, (2) `APIError` without known code → `err.message`, (3) plain Error → generic message |
| Service dependency | `adminListTtpEnrollments` from `../../services/ttpEnrollmentService` |
| Mock surface | Single function: `adminListTtpEnrollments`; plus `adminReviewTtpEnrollment` for mutation path |
| Sub-components | `ReviewDialog` (inline — no separate import needed) |
| **Pilot complexity** | **LOW — ideal pilot candidate** |

### 3.8 Pilot Component Analysis — TtpEligibilityConsole (for comparison)

**Source: `components/ControlPlane/TtpEligibilityConsole.tsx`, partially read**

| Property | Finding |
|---|---|
| React router imports | ❌ None detected |
| CSS module imports | ❌ None (Tailwind only) |
| Required props | `orgId: string` — **required prop** (not a standalone component) |
| Async state pattern | `useCallback` + `useEffect` |
| Catch branches | 2 branches: `APIError` → `err.message`, plain Error → generic |
| Service dependency | `adminCreateTtpEligibilityAssessment`, `adminGetTtpEligibilityAssessments` |
| **Pilot complexity** | MEDIUM — requires `orgId` prop injection; fewer catch branches than TtpEnrollmentAdmin |

### 3.9 VpcConsole Summary (from prior partial read)

More complex: imports `VpcStatusBadge` + `PartnerRoutingStubPanel` as sub-components.
Two separate catch blocks (load + mutations). Requires more mocks. Not recommended for pilot.

---

## 4. Design Assumption Validation Matrix

| Design assumption | Repo truth | Status |
|---|---|---|
| "No RTL, jsdom, or happy-dom installed anywhere" | Confirmed: zero occurrences in any package.json | ✅ VALIDATED |
| "Vitest exists at server level only" | Confirmed: root has no vitest; server has vitest 4.0.18 | ✅ VALIDATED |
| "All tests run through server Vitest in node environment" | Confirmed: all root test files discovered via server config `../tests/**` glob | ✅ VALIDATED |
| "Root vite.config.ts has no test block" | Confirmed: empty of test block | ✅ VALIDATED |
| "No path aliases in root" | Confirmed: no path aliases in tsconfig.json or vite.config.ts | ✅ VALIDATED |
| "TtpEnrollmentAdmin has no router context requirement" | Confirmed: zero react-router imports | ✅ VALIDATED |
| "TtpEnrollmentAdmin uses Tailwind only (no CSS modules)" | Confirmed: no .module.css/.module.scss imports | ✅ VALIDATED |
| "Design Option A (vitest 4.x) can be added to root devDeps" | **INVALIDATED:** vitest 4.x requires vite ^6 or ^7; root uses vite ^5.3.1 — peer conflict | ❌ **INVALIDATED — SEE DECISION 1 & 3** |
| "tests/frontend/ folder is clean from server Vitest perspective" | **INVALIDATED:** server config's `../tests/**` glob picks up subdirectories including `tests/frontend/` | ❌ **INVALIDATED — SEE DECISION 4 & AF-FTH-07** |

---

## 5. Decision Analysis

### DECISION 1 — Approve Dependency Set?

**Design options:** Approve all 4 packages / Reduce scope / Defer

**Repo-truth constraint found:** Vitest 4.x cannot be added to root devDeps without vite upgrade.
The original design recommendation ("Approve all 4") remains correct in substance but requires
a version specification for `vitest`.

**Repo-truth analysis:**

- `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` — no version conflicts found.
  Can be installed at any compatible version.
- `vitest` — version-constrained by root vite 5.x:
  - **Option 1a:** Install `vitest@^2.1.0` at root (last vitest series compatible with vite 5.x). Root and server then run different vitest versions, which is normal for monorepos.
  - **Option 1b:** Install `vitest@^3.x` at root — check peer dep compatibility against vite 5.x. (Vitest 3 requires `vite: ^5.0.0 || ^6.0.0` — compatible with root vite 5.x.) Viable option.
  - **Option 1c:** Upgrade root vite to 6.x or 7.x — larger change; requires verifying Vite 6 compatibility with all root plugins and build configuration. Not recommended for this unit.
  - **Option 1d:** Adopt Option B (server binary reuse) for DECISION 3 — avoids adding vitest to root entirely.

**Recommended:** Approve 4 packages. Specify vitest as `^3.x` (compatible with vite 5.x) OR defer vitest version to DECISION 3 resolution.

---

### DECISION 2 — jsdom vs happy-dom?

**Design options:** jsdom (more complete, slower) / happy-dom (faster, less complete)

**Repo-truth finding:** Both are optional peer dependencies of vitest in `server/pnpm-lock.yaml`
(lines 1352 and 1354 respectively). Neither is actually installed. No prior precedent either way.

**Analysis:**
- `jsdom`: Mature, spec-complete DOM implementation. Used by Jest/RTL community for years. More predictable behavior. Higher memory usage and slower than happy-dom.
- `happy-dom`: Faster, lighter. Less spec-complete (some edge cases differ from real browser). Newer, fewer community bug reports. No precedent in this codebase.

**Recommended:** `jsdom` — lower risk for a new harness. Re-evaluate after pilot.

---

### DECISION 3 — Vitest at Root: Option A (add to root devDeps) vs Option B (server binary)?

**Design options:**
- **Option A:** Add vitest to root `devDependencies` — run via `test:frontend` script in root package.json
- **Option B:** Reuse server binary — `pnpm --dir server exec vitest --config ../vitest.frontend.config.ts`

**Repo-truth constraint:** Vitest 4.x in server requires vite ^6 or ^7. Root uses vite ^5.3.1.

**Analysis — Option A:**
- Requires vitest at root, version-constrained to `^3.x` (or `^2.x`) to match vite 5.x.
- Root and server then have different vitest versions. This is acceptable in a monorepo but adds maintenance surface.
- Cleaner dev-experience: `pnpm run test:frontend` works simply.
- Lockfile: Creates a root `pnpm-lock.yaml` (does not currently exist).
- `vitest.frontend.config.ts` specifies `environment: 'jsdom'` and includes `tests/frontend/**` only.

**Analysis — Option B:**
- No new vitest added to root. Server's vitest 4.x binary is invoked directly.
- Config file `vitest.frontend.config.ts` is still placed at root, but is run via server binary.
- Risk: Tightly couples frontend test execution to server's Vitest version. If server Vitest version changes, frontend tests must re-verify compatibility.
- Risk: `pnpm --dir server exec vitest --config ../vitest.frontend.config.ts` is an unusual invocation pattern; the config file would need to be compatible with vitest 4.x API.
- Benefit: Single vitest version across repo; no root lockfile creation.
- Script: Root `test:frontend` = `pnpm --dir server exec vitest run --config ../vitest.frontend.config.ts`

**Recommended:** **Option A with vitest `^3.x`** — cleaner architecture; predictable per-workspace version management. However, Option B is viable if single vitest binary management is preferred.

---

### DECISION 4 — tests/frontend/ vs tests/ Folder?

**Design options:** Separate `tests/frontend/` / Keep in `tests/` with naming convention

**CRITICAL REPO-TRUTH FINDING:** Server vitest config includes glob `'../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'`. This glob is **recursive** — it matches ALL files (including subdirectories) under `tests/`. Therefore, files placed in `tests/frontend/` WILL be discovered by server Vitest and executed in `node` environment (no DOM), causing RTL test failures.

**Resolution options:**

| Option | Description | Safe? |
|---|---|---|
| **4a** | Use `tests/frontend/` + add `'../tests/frontend/**'` to `server/vitest.config.ts` excludes | ✅ Safe — requires IMPL-001 allowlist to include `server/vitest.config.ts` |
| **4b** | Use `tests/` with naming convention (e.g. `*.frontend.test.tsx`) + exclude pattern in server config | ✅ Safe — but naming convention is less clear than folder separation |
| **4c** | Use a root-level folder outside `tests/` entirely (e.g. `frontend-tests/`) | ✅ Safe — no server config change needed; but departs from repo convention |

**Recommended:** **Option 4a — `tests/frontend/` with server exclusion** — preserves the design's recommended folder convention AND maintains server test isolation. Requires `server/vitest.config.ts` added to IMPL-001 allowlist.

---

### DECISION 5 — Frontend Test Script Name?

**Design options:** `test:frontend` / `test:ui` / `test:components` / other

**Repo-truth finding:** Existing test scripts follow `test:<scope>` naming:
- `test:server` → `pnpm --dir server run test:ci`
- `test:runtime-verification` → server vitest run
- `test:runtime-routing:focused` → server vitest run

**Recommended:** `test:frontend` — consistent with `test:server` pattern; clearly scoped.

---

### DECISION 6 — Pilot Component?

**Design options:** TtpEnrollmentAdmin (recommended) / VpcConsole / TtpEligibilityConsole

**Repo-truth findings:**

| Factor | TtpEnrollmentAdmin | TtpEligibilityConsole | VpcConsole |
|---|---|---|---|
| No router deps | ✅ | ✅ | Likely ✅ |
| No CSS modules | ✅ | ✅ | Likely ✅ |
| No external context required | ✅ (no props) | ⚠️ requires `orgId` prop | ⚠️ more sub-components |
| Catch branch count | **3 branches** | 2 branches | 2+ branches |
| Sub-component complexity | Low (ReviewDialog inline) | Low | High (VpcStatusBadge, PartnerRoutingStubPanel) |
| Mock surface | Single service call | Two service calls | Multiple service calls |

**Recommended:** `TtpEnrollmentAdmin` — confirmed as best pilot. No required props, 3 testable
catch branches, simple mock surface, no sub-component external imports.

---

### DECISION 7 — Include @testing-library/user-event?

**Design options:** Install now (anticipatory) / Install when needed

**Analysis:** The pilot test (`TtpEnrollmentAdmin` smoke test) will verify:
1. Loading state renders
2. FEATURE_DISABLED error message renders
3. APIError message renders
4. Generic error message renders
5. Table renders with mock data

None of these test cases require simulating user interaction events. `user-event` is needed for
interaction testing (clicks, keyboard events, form submissions) — appropriate for the next
milestone after pilot proves harness stability.

**Recommended:** **Install when needed** — defer to `TTP-FRONTEND-TEST-HARNESS-PILOT-002` or similar.

---

### DECISION 8 — CI Integration: Immediate or After Pilot?

**Design options:** Add to CI immediately after IMPL-001 / Wait until after pilot proves stability

**Repo-truth finding:** Current `test-suite.yml` installs ONLY server deps. Adding frontend tests
to CI requires:
1. New step: root `pnpm install` (no `--frozen-lockfile` for first run; subsequent runs with lockfile)
2. Root lockfile committed and maintained
3. New CI step: `pnpm run test:frontend`
4. New environment variable / secret management if tests require any

**Analysis:** The pilot is the baseline validation. Until `tests/frontend/ttp-enrollment-admin.test.tsx`
passes reliably under `tests/frontend/` + server exclusion configuration, the CI integration
is premature. Adding a failing test to CI at the gate would block all PRs.

**Recommended:** **After pilot** — confirm harness stability first. Open `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001` only after pilot passes.

---

## 6. Additional Audit Findings (AF-FTH-01 to AF-FTH-09)

### AF-FTH-01 — Separate vitest config or extend root?

**Finding:** A separate `vitest.frontend.config.ts` at repo root is the correct approach.
- Server's `server/vitest.config.ts` MUST NOT be modified for frontend environment setup (only to add the `tests/frontend/**` exclusion per DECISION 4 finding).
- The frontend config must specify: `environment: 'jsdom'`, `include: ['tests/frontend/**/*.{test,spec}.?(c|m)[jt]s?(x)']`, `setupFiles: ['tests/setupTests.ts']`.
- Root `vite.config.ts` need not change.

**Resolution:** Create `vitest.frontend.config.ts` at root as a new file. Add to IMPL-001 allowlist.

---

### AF-FTH-02 — setupTests file path and content?

**Finding:** `tests/setupTests.ts` is the correct location.
- Content: `import '@testing-library/jest-dom/vitest';` (the vitest-compatible auto-extend import)
- **Important:** `tsconfig.json` excludes `tests/`. The setup file is TypeScript but will be transpiled by Vitest's esbuild pipeline, not tsc. This works without tsconfig changes.
- For IDE support of jest-dom matchers in `tests/frontend/*.tsx`, a separate `tsconfig.test.json` extending root with `include: ["tests/**"]` is recommended (optional but useful).

**Resolution:** Create `tests/setupTests.ts` as new file. Add to IMPL-001 allowlist.

---

### AF-FTH-03 — Lockfile implications?

**Finding:** Root currently has NO `pnpm-lock.yaml`. Adding devDependencies via `pnpm install` at root will CREATE a new root-level `pnpm-lock.yaml`. This file must be committed as part of IMPL-001.

- CI `test-suite.yml` currently uses `--frozen-lockfile` for server only. After IMPL-001, if CI is to install root deps, the workflow must be updated to run `pnpm install` at root (without `--frozen-lockfile` for the first run, then with it once lockfile exists).
- Until `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001`, CI workflow is unchanged.

**Resolution:** Add root `pnpm-lock.yaml` (new file) to IMPL-001 allowlist.

---

### AF-FTH-04 — React JSX + TypeScript compatibility for test files?

**Findings:**
- `@vitejs/plugin-react` is in root devDeps ✅ — Vitest uses Vite's transform pipeline, so React JSX in tests is handled via this plugin.
- `tsconfig.json` has `jsx: "react-jsx"` ✅ — correct transform mode.
- `tsconfig.json` excludes `tests/` — this means test files are not checked by root tsc.

**For IMPL-001:**
- Vitest's esbuild pipeline handles TypeScript transpilation for test files independently of tsconfig.
- The `vitest.frontend.config.ts` should reference `plugins: [react()]` to ensure JSX transforms work in test environment.
- Optional (recommended): create `tsconfig.test.json` at root for IDE intellisense:
  ```json
  {
    "extends": "./tsconfig.json",
    "include": ["tests/**"],
    "exclude": ["node_modules", "dist", "server", "api"]
  }
  ```

**Resolution:** Vitest handles JSX transpilation independently. IDE support optionally via `tsconfig.test.json`.

---

### AF-FTH-05 — CSS module mocking needed for pilot?

**Finding:** `TtpEnrollmentAdmin.tsx` uses **only Tailwind CSS classes** — no `.module.css` or `.module.scss` imports confirmed via direct file read. No `identity-obj-proxy` package is needed for the pilot.

**Note:** VpcConsole and TtpEligibilityConsole also appear to use Tailwind only. If future test candidates use CSS modules, `identity-obj-proxy` would need to be added at that time.

**Resolution:** No CSS module mocking required for IMPL-001 or PILOT-001.

---

### AF-FTH-06 — Global DOM mocks needed for TtpEnrollmentAdmin pilot?

**Finding (from component analysis):**

| Mock needed | Required? | Reason |
|---|---|---|
| `vi.mock('../../services/ttpEnrollmentService')` | ✅ Yes | Component calls `adminListTtpEnrollments` on mount |
| `window.fetch` mock | ❌ No | Service is mocked at module level; raw fetch not called in component |
| `localStorage` mock | ❌ No | Not used in this component |
| `matchMedia` mock | ❌ No | No responsive media queries in component logic |
| Auth context provider | ❌ No | No auth state consumed in this component |
| Router context provider | ❌ No | No router hooks used (confirmed) |

**`adminReviewTtpEnrollment` mock:** Needed only for interaction tests (ReviewDialog submission).
For the pilot (smoke + state tests), only `adminListTtpEnrollments` mock is required.

**Resolution:** PILOT-001 mock surface: `vi.mock('../../services/ttpEnrollmentService', () => ({ adminListTtpEnrollments: vi.fn(), adminReviewTtpEnrollment: vi.fn() }))`.

---

### AF-FTH-07 — Regression safety: do new frontend tests interfere with server tests?

**CRITICAL FINDING (detailed):**

Server `vitest.config.ts` includes glob:
```
'../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'
```

This glob is **recursive** and will discover `tests/frontend/*.test.tsx` files.

If frontend tests using `@testing-library/react` are placed in `tests/frontend/` WITHOUT excluding
that folder from server Vitest, those tests will run in server's `node` environment and fail:
- RTL requires a DOM environment (`jsdom` or `happy-dom`)
- `document`, `window`, `HTMLElement` are undefined in node environment
- Tests will error, not merely fail gracefully

**Required action:**

`server/vitest.config.ts` must be updated in IMPL-001 to add:
```typescript
exclude: ['node_modules', 'dist', '../tests/frontend/**']
```

This ensures server Vitest continues to discover `tests/*.test.tsx` (existing behavior) but
skips `tests/frontend/**` (new frontend tests).

**Verification protocol for IMPL-001:**
1. After adding exclusion to `server/vitest.config.ts`, run: `pnpm --dir server run test:ci`
2. Confirm all existing tests still pass (count must match pre-IMPL-001 baseline)
3. Confirm no `tests/frontend/**` files appear in server test output

**Resolution:** Add `server/vitest.config.ts` to IMPL-001 allowlist (modification — add frontend exclusion only).

---

### AF-FTH-08 — IMPL-001 Complete Allowlist

**Derived from all findings above:**

| File | Action | Reason |
|---|---|---|
| `package.json` (root) | Modify | Add 4 devDependencies + `test:frontend` script |
| `pnpm-lock.yaml` (root) | Create (new) | Generated by `pnpm install` at root |
| `vitest.frontend.config.ts` | Create (new) | Root-level frontend Vitest config |
| `tests/setupTests.ts` | Create (new) | jest-dom auto-extend import |
| `server/vitest.config.ts` | Modify | Add `../tests/frontend/**` to exclude array |
| `tsconfig.test.json` (optional) | Create (new) | IDE TypeScript support for test files |

**DESIGN DELTA:** The original design artifact's proposed IMPL-001 allowlist did NOT include
`server/vitest.config.ts`. This is a required addition based on AF-FTH-07 finding.

---

### AF-FTH-09 — PILOT-001 Allowlist

**Derived from pilot component analysis:**

| File | Action | Reason |
|---|---|---|
| `tests/frontend/ttp-enrollment-admin.test.tsx` | Create (new) | Pilot test: smoke + 3 error state branches |

**Proposed test cases for pilot:**
1. `TC-FEH-001` — renders loading state on mount
2. `TC-FEH-002` — renders FEATURE_DISABLED error message when service throws `FEATURE_DISABLED` APIError
3. `TC-FEH-003` — renders service error message when service throws generic APIError
4. `TC-FEH-004` — renders generic error message when service throws non-APIError
5. `TC-FEH-005` — renders enrollment table when service returns data

---

## 7. Recommended Decision Set (Summary Table)

| Decision | Recommended Option | Key Constraint |
|---|---|---|
| **DECISION 1** — Dependency set | Approve all 4; specify vitest `^3.x` | Vitest 4.x incompatible with root vite 5.x |
| **DECISION 2** — jsdom vs happy-dom | `jsdom` | Lower risk; neither currently installed |
| **DECISION 3** — Root vitest option | **Option A** with vitest `^3.x` | Cleaner architecture; requires version constraint |
| **DECISION 4** — Folder | `tests/frontend/` + server exclusion | Server `../tests/**` glob is recursive |
| **DECISION 5** — Script name | `test:frontend` | Consistent with `test:server` convention |
| **DECISION 6** — Pilot component | `TtpEnrollmentAdmin` | No props, 3 catch branches, Tailwind only |
| **DECISION 7** — user-event | Defer | No concrete pilot use case |
| **DECISION 8** — CI timing | After pilot | Current CI has no root install step |

---

## 8. Implementation Slicing (Unchanged from Design, with Corrections)

### IMPL-001 — Install harness packages and configure

**Allowlist (corrected from design §8 based on audit):**
- `package.json` (root) — add devDependencies + script
- `pnpm-lock.yaml` (root, new) — created by install
- `vitest.frontend.config.ts` (root, new) — frontend config
- `tests/setupTests.ts` (new) — jest-dom import
- `server/vitest.config.ts` (modify) — add `../tests/frontend/**` to exclude ← **NEW vs design**
- `tsconfig.test.json` (root, new, optional) — IDE TS support

**Approved commands (IMPL-001):**
```powershell
# Install deps at root
pnpm install --save-dev vitest@^3 @testing-library/react @testing-library/jest-dom jsdom
# Verify server tests still pass
pnpm --dir server run test:ci
# Run frontend tests (verify harness works)
pnpm run test:frontend
```

**Success criteria:**
- Root `pnpm-lock.yaml` created and committed
- `pnpm run test:frontend` exits 0 (no test files yet — zero-test pass is OK)
- `pnpm --dir server run test:ci` exits 0 with same test count as before IMPL-001

---

### PILOT-001 — Write pilot test for TtpEnrollmentAdmin

**Allowlist:** `tests/frontend/ttp-enrollment-admin.test.tsx` (new)

**Success criteria:**
- All 5 proposed TC-FEH-001 through TC-FEH-005 pass
- `pnpm run test:frontend` exits 0
- `pnpm --dir server run test:ci` still exits 0 (no interference)

---

### CI-VERIFY-001 — Wire frontend tests into CI gate

**Allowlist:** `.github/workflows/test-suite.yml` (modify)

**Opens only after:** PILOT-001 passes

---

## 9. Stop Conditions

Do not proceed with `TTP-FRONTEND-TEST-HARNESS-IMPL-001` if:

- Paresh has not reviewed and approved this audit
- Paresh has not chosen an option for each of the 8 decisions
- Any decision outcome changes the allowlist in a way not covered above
- Vitest version compatibility cannot be resolved without upgrading root vite (escalate to separate approval unit)
- Any CI workflow change is required before pilot is stable

---

## 10. Safety Invariant Confirmation

| Invariant | Required state | Actual state |
|---|---|---|
| `ttp_enabled` | `false` — UNCHANGED | `false` — UNCHANGED ✓ |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED | Active — UNCHANGED ✓ |
| Application code | NOT MODIFIED | NOT MODIFIED ✓ |
| Backend routes / services | NOT MODIFIED | NOT MODIFIED ✓ |
| `server/vitest.config.ts` | NOT MODIFIED (audit only) | NOT MODIFIED ✓ |
| `vite.config.ts` | NOT MODIFIED | NOT MODIFIED ✓ |
| Root `package.json` | NOT MODIFIED | NOT MODIFIED ✓ |
| `server/package.json` | NOT MODIFIED | NOT MODIFIED ✓ |
| Lockfiles | NOT MODIFIED | NOT MODIFIED ✓ |
| Prisma schema / SQL / migrations | NOT MODIFIED | NOT MODIFIED ✓ |
| Env files / feature flags | NOT MODIFIED | NOT MODIFIED ✓ |
| Existing tests | NOT MODIFIED | NOT MODIFIED ✓ |
| `TTP-FRONTEND-TEST-HARNESS-IMPL-001` | NOT OPENED | NOT OPENED ✓ |

---

## 11. Final Decision Token

```
TTP_FRONTEND_TEST_HARNESS_OPTIONS_AUDIT_001_READY_FOR_PARESH_DECISION
```

**Authority:** Paresh Patel — TexQtic founder / operator
**Status:** `OPTIONS_AUDIT_COMPLETE` — awaiting Paresh decision on 8 open decisions
**`ttp_enabled` state:** `false` — UNCHANGED
**`LEGAL_REVIEW_PENDING` state:** Active — UNCHANGED
**No packages installed. No configs changed. No app code changed. No tests changed.**

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*This document does not authorize any implementation. Implementation requires Paresh review and*
*explicit approval of all 8 decisions above.*
