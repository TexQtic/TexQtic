# TECS-TTP-FRONTEND-TEST-HARNESS-DESIGN-001-v1

## React Testing Library / jsdom Frontend Test Harness — Design Artifact

---

| Field | Value |
|---|---|
| **Unit ID** | `TTP-FRONTEND-TEST-HARNESS-DESIGN-001` |
| **Record type** | Frontend test infrastructure design |
| **Family** | TexQtic frontend testing infrastructure |
| **Phase** | Post TradeTrust Pay Wave 2 UX verification / frontend verification hardening |
| **Type** | Design-only infrastructure planning |
| **Date** | 2026-05-06 |
| **Author** | Paresh Patel (TexQtic founder / operator) via GitHub Copilot Safe-Write Mode |
| **Status** | `DESIGN_OPEN` |
| **Implementation authorized** | No |
| **Package installation authorized** | No |
| **`ttp_enabled` state** | `false` — UNCHANGED |
| **`LEGAL_REVIEW_PENDING` state** | Active — UNCHANGED |

---

## 1. Problem Statement

### 1.1 The UI Verification Blind Spot

During the TradeTrust Pay Wave 2 UX verification cycle, a structural test-infrastructure gap was
exposed.

`TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001` (`AUDIT_COMPLETE`) identified three control-plane
components with incorrect error copy when `ttp_enabled=false`. The fix unit,
`TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` (`PRODUCTION_VERIFIED`), was forced to use
**pure logic tests** rather than component rendering tests. The test file
`tests/ttp-control-plane-feature-disabled-ux.test.tsx` explicitly documents this constraint:

> *"The project's test infrastructure uses `renderToStaticMarkup` for presentation components that
> accept error as props, which cannot cover async internal state updates without
> `@testing-library/react` (not in repo)."*

The three affected components (`VpcConsole`, `TtpEnrollmentAdmin`, `TtpEligibilityConsole`) each
manage async fetch state internally via `useEffect` / `useCallback`. The test suite verified the
catch-block conditional logic by mirroring it inline — correct as a unit-level correctness proof,
but insufficient as a long-term UI confidence mechanism.

**The specific limitations of the current approach:**

1. **State transitions cannot be tested.** A component that shows `"Loading..."` → (error) →
   `"TradeTrust Pay is not currently enabled on this platform."` cannot be verified to actually
   render the error panel. Pure logic tests verify the string-selection logic only.

2. **Mount/render lifecycle is unverified.** The component might throw during mount, have an
   inaccessible error panel, or conditionally hide/show the error container — none of which
   are detectable without rendering.

3. **`renderToStaticMarkup` covers only synchronous props-in → HTML-out.** It cannot simulate
   a `fetch()` response, trigger `useEffect`, or observe `useState` updates. It is appropriate
   for static presentation components. It is insufficient for async-stateful components.

4. **Production visual verification is the current backstop.** The only verification of rendered
   UI behavior is an authenticated SUPER_ADMIN browser session after each deploy. This is slow,
   manual, and not repeatable at commit time.

### 1.2 Why Pure Logic Tests Are Insufficient for Long-Term UI Confidence

Pure logic tests are a valid and important seam for business logic that is cleanly extractable.
They are fast, stable, and require no DOM environment. They should be preserved.

However, they cannot answer:

- Does the component actually render the error panel when `err.code === 'FEATURE_DISABLED'`?
- Is the error panel visible (not hidden by a `loading` flag or conditional)?
- Does the component gracefully handle an async fetch failure without throwing?
- Does user interaction (retry button click) re-trigger the expected fetch?
- Does the approved copy appear in the rendered DOM — not just in the logic branch?

These questions require a rendered component in a DOM environment. Without React Testing Library
and jsdom, the only answers come from production deployments — which means every UI regression
goes undetected until a human looks at the live site.

---

## 2. Current Repo-Truth Summary

### 2.1 Repository Structure

The repo is a monorepo without a `pnpm-workspace.yaml` at the root. The frontend (Vite + React SPA)
and backend (Fastify) coexist in a single repo. The server workspace is at `server/`.

### 2.2 Current Test Scripts

**Root `package.json` — no test script:**

```json
{
  "scripts": {
    "test:server": "pnpm --dir server run test:ci",
    "test:server:targeted": "pnpm --dir server run test",
    "test:runtime-routing:focused": "pnpm --dir server exec vitest run ...",
    "test:runtime-verification": "pnpm --dir server run test:runtime-verification"
  }
}
```

There is **no `test` or `test:frontend` script** at the root level. All test execution is
routed through the server's Vitest instance.

**`server/package.json` — test scripts:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ci": "vitest run --no-file-parallelism --maxWorkers=1"
  }
}
```

### 2.3 Current Vitest Configuration

**Location:** `server/vitest.config.ts` — **only Vitest config in the repo**.

```typescript
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: DB_TIMEOUT_MS,   // default 15000ms
    hookTimeout: DB_TIMEOUT_MS,
    teardownTimeout: 10_000,
    include: [
      'src/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/services/ai/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/routes/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/tests/aggregator-discovery-read.integration.test.ts',
      'tests/rfq-detail-route.shared.test.ts',
      '../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'dist/**'],
  },
});
```

**Critical observations:**

1. No `environment` key → defaults to `'node'` (no DOM).
2. The `include` pattern `'../tests/**'` is how the root-level `tests/` directory is executed —
   it is included in the **server's** Vitest config and run from the `server/` working directory.
3. There is no separate root-level Vitest config.
4. `fileParallelism: false` — tests run sequentially; appropriate for DB tests but potentially
   slow for UI tests that need not be sequential.
5. DB timeout of 15,000 ms applied to all tests including pure logic tests.

**Root `vite.config.ts`:**

```typescript
export default defineConfig({
  plugins: [react()],
  define: { 'process.env': process.env },
});
```

No `test` block. Not used for test execution.

### 2.4 Installed Dependencies — Testing-Related

**Confirmed absent (verified in all `package.json` files):**
- `@testing-library/react` — NOT installed
- `@testing-library/jest-dom` — NOT installed
- `@testing-library/user-event` — NOT installed
- `jsdom` — NOT installed as a direct dependency
- `happy-dom` — NOT installed as a direct dependency

**Confirmed present in server devDependencies:**
- `vitest: ^4.0.18` — installed in `server/`
- `@vitest/ui: ^4.0.18` — installed in `server/`

**Lockfile note (`server/pnpm-lock.yaml`):**
`jsdom` and `happy-dom` appear in the lockfile as **optional peer dependencies of vitest** with
`optional: true`. They are not resolved/installed; they are listed as peer dep candidates that
vitest accepts if the user adds them. This means installing either package would integrate
cleanly with the existing vitest version.

### 2.5 Current Test Styles in `tests/`

The `tests/` directory contains approximately 47 test files. Observed patterns:

| Pattern | Files | Capability |
|---|---|---|
| `renderToStaticMarkup` (SSR static) | ~10+ files | Synchronous props-in → HTML-out; no DOM events; no state updates |
| Pure logic / inline resolver functions | ~5+ files (incl. `ttp-control-plane-feature-disabled-ux.test.tsx`) | Tests business logic extracted from component internals |
| Descriptor / service-call tests | Multiple | Tests `apiClient`, `controlPlaneService`, etc. via mocks |
| Routing / descriptor tests | Multiple | Tests route descriptors, session context, realm detection |
| DB integration tests | Multiple (skip cleanly without `DATABASE_URL`) | Tests Supabase queries with RLS; require live DB |
| E2E (Playwright) | `tests/e2e/` | Full browser E2E (separate Playwright config) |

**No files use `@testing-library/react`, `render()`, `screen`, `fireEvent`, `userEvent`, or
any jsdom-dependent API.**

### 2.6 CI Workflow State

`test-suite.yml` (the PR gate) runs:
1. Server `typecheck`
2. Server `lint`

**It does not run Vitest.** The test suite itself is not currently gated in CI. DB-dependent
integration tests run separately via `db-gates.yml` on a schedule + manual trigger.

There is no frontend typecheck step in CI.

---

## 3. Repo-Truth Gap Analysis

| Gap | Impact | Severity |
|---|---|---|
| No jsdom installed | Cannot render React components in tests | HIGH |
| No `@testing-library/react` | Cannot use `render()`, `screen`, `waitFor()`, `act()` | HIGH |
| No `@testing-library/jest-dom` | No semantic DOM matchers (`toBeInTheDocument`, `toHaveTextContent`) | MEDIUM |
| All tests run in `node` environment | Browser APIs (`document`, `window`, `fetch`) unavailable | HIGH |
| No dedicated frontend Vitest config | Cannot set `environment: 'jsdom'` without affecting server/DB tests | HIGH |
| `fileParallelism: false` + DB timeouts | 15s timeouts apply to all tests including pure logic; frontend tests would also inherit these unless separated | MEDIUM |
| No `test:frontend` script | No way to run frontend tests independently | MEDIUM |
| Vitest only in `server/` | Root package has no `vitest` dependency; any root-level config needs Vitest available | MEDIUM |

---

## 4. Proposed Test Harness Design

### 4.1 Design Principles

1. **Do not break existing tests.** The 47+ existing tests in `tests/` must continue to pass
   unchanged. The server's Vitest config must not be modified.

2. **Separate environments.** DB/integration tests run in `node` environment. Frontend/component
   tests run in `jsdom` environment. These must be separate configurations.

3. **Minimal footprint.** Install only what is needed. Do not install `@testing-library/user-event`
   unless a concrete use case is identified.

4. **Frontend tests in the frontend.** The new harness should be configured at the root level,
   where the frontend lives, not inside `server/`.

5. **One vitest config per environment boundary.** The server config stays in `server/vitest.config.ts`.
   A new root-level `vitest.frontend.config.ts` handles jsdom tests.

### 4.2 Proposed Configuration Architecture

```
TexQtic/                                   ← repo root (frontend lives here)
├── vitest.frontend.config.ts              ← NEW: root-level frontend Vitest config
│                                             environment: 'jsdom'
│                                             include: 'tests/frontend/**'
│                                             setupFiles: ['tests/setupTests.ts']
├── tests/
│   ├── setupTests.ts                      ← NEW: imports @testing-library/jest-dom
│   ├── frontend/                          ← NEW: component tests live here
│   │   └── ttp-control-plane-*.test.tsx   ← pilot tests (opened in future slice)
│   ├── *.test.tsx                         ← EXISTING: untouched; still run by server vitest
│   └── e2e/                               ← EXISTING: Playwright E2E
└── server/
    └── vitest.config.ts                   ← UNCHANGED
```

**Why a separate `vitest.frontend.config.ts` at the root?**

- Vitest supports multiple configs via `--config` flag.
- The server config (`server/vitest.config.ts`) must not change; it is tightly coupled to
  DB timeout constants, `fileParallelism: false`, and the `../tests/**` include.
- A root-level config with `environment: 'jsdom'` can be run independently:
  ```
  vitest run --config vitest.frontend.config.ts
  ```
- This avoids polluting the server config and leaves DB integration tests completely unaffected.

**Why a separate `tests/frontend/` folder?**

- Keeps component rendering tests visually and logically distinct from:
  - Pure logic tests (remain in `tests/`)
  - DB integration tests (remain in `server/src/__tests__/`)
- Allows the frontend Vitest config to target only `tests/frontend/**` — preventing accidental
  double-execution of existing tests.
- Clear convention: `tests/` = node-environment tests; `tests/frontend/` = jsdom-environment tests.

### 4.3 Proposed `vitest.frontend.config.ts` Design

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setupTests.ts'],
    include: ['tests/frontend/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // No fileParallelism override: defaults to true (fine for non-DB tests)
    // No DB timeout: frontend tests do not touch the DB
  },
});
```

**Notes:**
- `@vitejs/plugin-react` is already in root devDependencies; adding it to the frontend Vitest
  config enables JSX transform and fast refresh semantics in the test environment.
- `environment: 'jsdom'` requires the `jsdom` package to be installed in the scope where this
  config is run (root).
- `setupFiles` is the hook for importing `@testing-library/jest-dom` matchers.

### 4.4 Proposed `tests/setupTests.ts` Design

```typescript
import '@testing-library/jest-dom/vitest';
// Optionally: afterEach cleanup is automatic with @testing-library/react >= v14
// import { cleanup } from '@testing-library/react';
// afterEach(cleanup);
```

**Notes:**
- `@testing-library/jest-dom/vitest` is the vitest-compatible entry point that extends
  `expect` with DOM matchers (`toBeInTheDocument`, `toHaveTextContent`, etc.).
- RTL v14+ (which would be installed as a modern release) includes automatic `afterEach`
  cleanup by default. The explicit `cleanup()` call is shown as a fallback only.

### 4.5 Proposed Root Package Script Additions

When implementation is authorized, the following scripts should be added to root `package.json`:

```json
{
  "scripts": {
    "test:frontend": "vitest run --config vitest.frontend.config.ts",
    "test:frontend:watch": "vitest --config vitest.frontend.config.ts",
    "test:frontend:ui": "vitest --config vitest.frontend.config.ts --ui"
  }
}
```

**Why `vitest` at root?** To run `vitest run --config vitest.frontend.config.ts` from the repo
root, `vitest` must be available at the root. Two options:

- **Option A (preferred):** Add `vitest` to root `devDependencies`. This is a clean explicit
  dependency. Vitest at root would be pinned to the same major version as server (`^4.0.x`).
- **Option B (fallback):** Use `pnpm --dir server exec vitest --config ../vitest.frontend.config.ts`.
  This reuses the server's vitest binary but runs the root config. Fragile if server and
  frontend configs diverge. Not preferred.

**Recommendation: Option A.** Add `vitest` as a root devDependency. Explicit, clean, maintainable.

---

## 5. Recommended Dependency Set

All packages listed are **devDependencies** to be added to the **root `package.json`**.

| Package | Version guidance | Justification |
|---|---|---|
| `vitest` | `^4.0.18` (match server) | Enables `vitest run --config vitest.frontend.config.ts` from root |
| `@testing-library/react` | `^16.x` (latest stable for React 19) | Core rendering + async utilities (`render`, `screen`, `waitFor`, `act`) |
| `@testing-library/jest-dom` | `^6.x` (latest) | DOM matchers for vitest (`toBeInTheDocument`, `toHaveTextContent`, etc.) |
| `jsdom` | `^25.x` (latest, matches vitest 4 peer range) | DOM environment for Vitest |
| `@testing-library/user-event` | **Not recommended yet** | No concrete use case exists for simulated events in the first pilot |

**On `@testing-library/user-event`:**
This package simulates real user interactions (typing, clicking). It is justified once tests
require interaction flows (e.g., clicking a retry button, filling a form). The first pilot is a
smoke/state test — `render()` + `screen.getBy*` assertions. Do not install user-event until a
concrete test requires it.

### 5.1 jsdom vs happy-dom Analysis

| Dimension | jsdom | happy-dom |
|---|---|---|
| **Maturity** | Mature; ~10+ years; de facto Jest/Vitest standard | Newer; growing adoption |
| **W3C spec coverage** | Very comprehensive; closest to a real browser | Incomplete; some APIs missing |
| **Vitest default recommendation** | Listed as peer dep; widely used with RTL | Also listed; faster but less compatible |
| **React Testing Library compatibility** | Full, well-tested compatibility | Compatible but edge cases exist |
| **CSS module support** | Via `identity-obj-proxy` or similar (may be needed) | Similar |
| **Performance** | Slightly slower than happy-dom | Faster startup and query |
| **Community docs / examples** | Vast; most RTL tutorials target jsdom | Growing but smaller |
| **Risk in TexQtic context** | Low; well-understood behavior | Medium; some async/DOM APIs may differ |

**Recommendation: `jsdom`.**

Rationale: TexQtic's frontend has not been test-harness-hardened. The first priority is reliable,
well-understood behavior. jsdom's comprehensive spec coverage and deep RTL integration reduce the
risk of confusing test failures caused by missing browser APIs. Performance is not a constraint
at the scale of the first pilot (single component, a handful of assertions). Once the harness is
stable and test counts grow, re-evaluating happy-dom is reasonable.

---

## 6. Recommended Configuration Changes (Design Only)

The following changes are **designed but not yet authorized for implementation**.

### 6.1 Files to Create

| File | Purpose |
|---|---|
| `vitest.frontend.config.ts` | Root-level Vitest config for jsdom environment |
| `tests/setupTests.ts` | Setup file: imports `@testing-library/jest-dom/vitest` |
| `tests/frontend/` (directory) | Home for all component rendering tests |

### 6.2 Files to Modify

| File | Change | Impact |
|---|---|---|
| Root `package.json` | Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to `devDependencies`; add `test:frontend` script | Adds new test capability; no existing scripts change |

### 6.3 Files That Must NOT Change

| File | Why |
|---|---|
| `server/vitest.config.ts` | Changing this would affect all 47+ existing tests and the `../tests/**` include |
| `vite.config.ts` | Not used for test execution; no `test` block; leave untouched |
| `server/package.json` | Server dependencies are scoped; do not modify |
| Any existing `tests/*.test.tsx` | Existing tests remain in server's Vitest discovery; do not move or modify |

### 6.4 TypeScript / Path Alias Handling

The current `tsconfig.json` at the repo root defines the TypeScript config for the frontend.
Vitest's frontend config will need to reference it or inherit its settings. If path aliases
(e.g., `@/components/*`) are defined in `tsconfig.json` or `vite.config.ts`, they must be
mirrored in `vitest.frontend.config.ts` via the `resolve.alias` option.

**Current state:** The root `vite.config.ts` does not define path aliases. The `tsconfig.json`
uses standard relative paths. **No alias conflict is expected**, but this must be confirmed
against `tsconfig.json` during implementation.

### 6.5 CSS Module Imports

If any component under test imports CSS modules (`.module.css`), jsdom cannot process them.
Standard solution: `identity-obj-proxy` or a Vitest `moduleNameMapper`-equivalent.

**Current state:** TexQtic uses Tailwind CSS classes applied inline. A scan for `.module.css`
imports in the three pilot component files should be performed during implementation to confirm
this is not needed for the pilot.

---

## 7. Pilot Test Recommendation

### 7.1 Recommended Pilot: `TtpEnrollmentAdmin.tsx`

The first component rendering test should target `TtpEnrollmentAdmin.tsx`.

**Rationale:**

1. **Most complete catch block.** `TtpEnrollmentAdmin`'s `load` catch has three branches:
   `FEATURE_DISABLED` copy, `APIError` passthrough, and generic fallback. This exercises
   all three RTL + jsdom assertions in one test file.

2. **Already purely verified at logic level.** TC-FDU-004, TC-FDU-005, TC-FDU-006 pass. The
   logic is known to be correct. The pilot test will add rendering-layer confidence on top.

3. **Minimal dependencies.** The component's render path primarily depends on:
   - `adminGet` (mocked in tests)
   - `APIError` class (already imported in existing tests)
   - Tailwind classes (no CSS modules expected)

4. **Async state is the target.** The `load` function is called in `useEffect`. Verifying that
   the error panel appears after a rejected `adminGet` mock is the exact scenario a pure logic
   test cannot cover.

5. **No router dependencies.** `TtpEnrollmentAdmin` does not appear to use `react-router-dom`
   hooks in its current form (based on the existing catch-block analysis). This reduces setup
   complexity for the pilot.

**All three TTP components are candidates.** Once the pilot proves the harness works, the other
two (`VpcConsole`, `TtpEligibilityConsole`) should each get a companion rendering test.

### 7.2 Minimum Pilot Assertions

The first test file for `TtpEnrollmentAdmin` should prove at minimum:

| Test | RTL API | Assertion |
|---|---|---|
| Renders loading state initially | `render()`, `screen.getByText` | `"Loading..."` or spinner visible |
| Shows feature-disabled copy on FEATURE_DISABLED error | `waitFor`, `screen.getByText` | `"TradeTrust Pay is not currently enabled..."` in DOM |
| Shows generic copy on non-FEATURE_DISABLED APIError | `waitFor`, `screen.getByText` | Generic enrollment error visible |
| Shows specific message on APIError with message | `waitFor`, `screen.getByText` | `err.message` content visible |
| Shows generic copy on plain Error | `waitFor`, `screen.getByText` | Generic enrollment error visible |

### 7.3 Alternatives Considered

| Candidate | Why Not First |
|---|---|
| `VpcConsole` | Two catch blocks (mutations + load); more mocks needed (VPC list, transition APIs) |
| `TtpEligibilityConsole` | Similar complexity to TtpEnrollmentAdmin; fine as second pilot |
| Small static component (e.g. a badge) | Would prove harness works but not verify the UI blind spot |
| Large shell component (e.g. `App.tsx`) | Router context, auth context — too many dependencies for first pilot |

---

## 8. Implementation Slicing (Future — Not Opened)

The following future implementation slices are identified but **not opened**. Each requires explicit
Paresh authorization before any implementation prompt may be opened.

| Slice ID | Description | Prerequisites | Status |
|---|---|---|---|
| `TTP-FRONTEND-TEST-HARNESS-IMPL-001` | Install dependencies; create `vitest.frontend.config.ts`; create `tests/setupTests.ts`; add root `test:frontend` script; typecheck | Paresh approves this design (`DESIGN_OPEN` → `DESIGN_APPROVED`) | `NOT_OPENED` |
| `TTP-FRONTEND-TEST-HARNESS-PILOT-001` | Write first component rendering test for `TtpEnrollmentAdmin`; confirm all 3 harness assertions pass; confirm existing server tests unaffected | `TTP-FRONTEND-TEST-HARNESS-IMPL-001` `TRUTH_SYNCED` | `NOT_OPENED` |
| `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001` | Add `test:frontend` to the PR gate CI workflow; confirm CI passes; confirm server test CI unaffected | `TTP-FRONTEND-TEST-HARNESS-PILOT-001` `TRUTH_SYNCED`; CI integration discussion with Paresh | `NOT_OPENED` |

---

## 9. Test and Validation Plan (For Future Implementation)

When `TTP-FRONTEND-TEST-HARNESS-IMPL-001` is opened, the following validation sequence must pass
before the implementation slice may be closed as `TRUTH_SYNCED`:

| Step | Command | Pass Criterion |
|---|---|---|
| 1. Package install verification | `pnpm install --frozen-lockfile` (should NOT be run in design) | Lockfile updated cleanly; no unexpected packages |
| 2. Typecheck (root frontend) | `pnpm exec tsc --noEmit` | Zero type errors |
| 3. New frontend Vitest config smoke | `pnpm exec vitest run --config vitest.frontend.config.ts` | Config loads; no test files yet → exits 0 or with clear "no tests found" |
| 4. Pilot component test | `pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/ttp-enrollment-admin.test.tsx` | All pilot assertions pass |
| 5. Existing server tests unaffected | `pnpm --dir server run test:ci` | All existing tests still pass; count unchanged |
| 6. Server typecheck | `pnpm --dir server exec tsc --noEmit` | Zero type errors |
| 7. Git diff gate | `git diff --name-only` | Only allowlisted files modified |

**Note:** Steps 1, 3, and 4 require `TTP-FRONTEND-TEST-HARNESS-IMPL-001` to be open (packages
installed, config created). They are listed here as the future validation plan. Step 1 must NOT
be run in the current design-only unit.

---

## 10. No-Go Boundaries

The following are absolutely forbidden in this design unit and must not be relaxed without
a separate explicit authorization:

| Boundary | Why |
|---|---|
| Install packages | Design only; no package.json change; no lockfile change |
| Modify `vitest.frontend.config.ts` (it does not exist yet) | File must be created in implementation slice only |
| Modify `server/vitest.config.ts` | Would affect all 47+ existing tests |
| Modify `vite.config.ts` | Not used for testing; no change needed |
| Write component tests | Tests are the output of implementation slices, not design |
| Modify existing `tests/*.test.tsx` files | No conversion of existing tests in design or implementation |
| Activate `ttp_enabled` | Permanently off for this unit and all harness units |
| Open `TTP-FRONTEND-TEST-HARNESS-IMPL-001` | Not opened — awaiting Paresh approval |
| Open Wave 3/4/5 units | All remain gated |

---

## 11. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Lockfile churn** — adding 4 root devDeps may conflict with server's pnpm lockfile structure | Low-medium | Root and server have separate lockfiles (`server/pnpm-lock.yaml`). Root lockfile is generated fresh at root install. |
| **Vitest version conflict** — root vitest version drifts from server vitest | Low | Pin root vitest to same `^4.0.18` range as server |
| **jsdom vs component behavior gaps** — component uses `window.fetch`, `localStorage`, or other browser globals not in jsdom | Medium | Pilot component inspection before writing tests; add mocks only for identified APIs |
| **CSS module imports break jsdom** | Low | TexQtic uses Tailwind inline classes; no `.module.css` files expected in pilot components; confirm during impl |
| **`@testing-library/react` React 19 compatibility** | Low | RTL v16+ supports React 19; pin to `^16.x` |
| **Slow CI from jsdom tests** | Low for pilot | jsdom tests are fast (no network, no DB); 5-10 tests < 1s |
| **Flaky tests from async timing** | Medium | Use `waitFor()` with appropriate timeout; avoid `setTimeout`-based assertions; let RTL's async utilities handle async state updates |
| **Existing tests double-executed** | Low if `tests/frontend/` pattern is strict | The frontend Vitest config targets only `tests/frontend/**`; existing `tests/*.test.tsx` are not included |
| **Cleanup/global state leakage between tests** | Low | RTL v14+ auto-cleans after each test; `setupTests.ts` enforces jest-dom import once |
| **Components require Context providers** | Medium | Some components may need `AuthContext`, `CartContext`, etc.; design per-component wrappers during pilot; do not create global test utilities prematurely |
| **TypeScript path alias mismatch** | Low | Root `vite.config.ts` has no aliases; `tsconfig.json` uses relative paths; no conflict expected |

---

## 12. Open Decisions for Paresh

The following decisions are required from Paresh before `TTP-FRONTEND-TEST-HARNESS-IMPL-001`
may be opened:

| Decision | Options | Copilot Recommendation |
|---|---|---|
| **Approve dependency set?** | Approve all 4 packages (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`) / Reduce scope / Defer | Approve all 4; they form the minimum viable harness |
| **jsdom vs happy-dom?** | jsdom (more complete, slower) / happy-dom (faster, less complete) | **jsdom** — safer for initial harness; re-evaluate after pilot |
| **Vitest at root — Option A (add to root devDeps) vs Option B (reuse server binary)?** | Option A: add `vitest` to root devDependencies / Option B: `pnpm --dir server exec vitest --config ../vitest.frontend.config.ts` | **Option A** — cleaner; avoids cross-package binary dependency |
| **Dedicated `tests/frontend/` folder vs same `tests/` folder?** | Separate `tests/frontend/` (recommended) / Keep all in `tests/` with naming convention | **Separate `tests/frontend/`** — allows clean `include` pattern in frontend config |
| **Frontend test script name?** | `test:frontend` / `test:ui` / `test:components` / other | `test:frontend` — clear, consistent with `test:server` naming convention |
| **Pilot component?** | `TtpEnrollmentAdmin` (recommended) / `VpcConsole` / `TtpEligibilityConsole` | **`TtpEnrollmentAdmin`** — three catch branches; most informative pilot |
| **Include `@testing-library/user-event`?** | Install now (anticipatory) / Install when needed | **Install when needed** — no concrete use case for the pilot |
| **CI integration — immediate or after pilot?** | Add `test:frontend` to CI immediately after impl / Wait until after pilot proves harness stability | **After pilot** — let pilot establish baseline before adding to CI gate |

---

## 13. Design Artifact Relationships

```
This artifact (DESIGN_OPEN)
└── TTP-FRONTEND-TEST-HARNESS-IMPL-001 (NOT_OPENED)
    └── TTP-FRONTEND-TEST-HARNESS-PILOT-001 (NOT_OPENED)
        └── TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001 (NOT_OPENED)

Predecessor verification chain:
TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001 (AUDIT_COMPLETE)
└── TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 (TRUTH_SYNCED)
    └── TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-PRODUCTION-VERIFY-001 (PRODUCTION_VERIFIED)
        └── TTP-FRONTEND-TEST-HARNESS-DESIGN-001 (THIS ARTIFACT — DESIGN_OPEN)
```

---

## 14. Safety and Invariant Confirmation

| Invariant | Required state | Actual state |
|---|---|---|
| `ttp_enabled` | `false` — UNCHANGED | `false` — UNCHANGED ✓ |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED | Active — UNCHANGED ✓ |
| Application code | NOT MODIFIED | NOT MODIFIED ✓ |
| Backend routes / services | NOT MODIFIED | NOT MODIFIED ✓ |
| `server/vitest.config.ts` | NOT MODIFIED | NOT MODIFIED ✓ |
| `vite.config.ts` | NOT MODIFIED | NOT MODIFIED ✓ |
| Root `package.json` | NOT MODIFIED | NOT MODIFIED ✓ |
| `server/package.json` | NOT MODIFIED | NOT MODIFIED ✓ |
| Lockfiles | NOT MODIFIED | NOT MODIFIED ✓ |
| Prisma schema / SQL / migrations | NOT MODIFIED | NOT MODIFIED ✓ |
| Env files / feature flags | NOT MODIFIED | NOT MODIFIED ✓ |
| Existing tests | NOT MODIFIED | NOT MODIFIED ✓ |
| Wave 3/4/5 gates | UNCHANGED | UNCHANGED ✓ |
| `TTP-FRONTEND-TEST-HARNESS-IMPL-001` | NOT OPENED | NOT OPENED ✓ |

---

## 15. Final Decision Token

```
TTP_FRONTEND_TEST_HARNESS_DESIGN_001_READY_FOR_PARESH_REVIEW
```

**Authority:** Paresh Patel — TexQtic founder / operator
**Status:** `DESIGN_OPEN` — awaiting Paresh review and approval before any implementation slice opens
**`ttp_enabled` state:** `false` — UNCHANGED
**`LEGAL_REVIEW_PENDING` state:** Active — UNCHANGED
**No packages installed. No configs changed. No app code changed. No tests changed.**

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*This document does not authorize any implementation. Implementation requires Paresh review and explicit approval.*
