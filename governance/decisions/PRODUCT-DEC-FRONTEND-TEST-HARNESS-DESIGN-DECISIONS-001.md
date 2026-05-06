# PRODUCT-DEC-FRONTEND-TEST-HARNESS-DESIGN-DECISIONS-001

## React Testing Library / jsdom Frontend Test Harness — Design Decision Record

---

| Field | Value |
|---|---|
| **Unit ID** | `TTP-FRONTEND-TEST-HARNESS-DESIGN-DECISIONS-001` |
| **Record type** | Design decision record |
| **Family** | TexQtic frontend testing infrastructure |
| **Date** | 2026-05-06 |
| **Decision owner** | Paresh Patel (TexQtic founder / operator) |
| **Status** | `DESIGN_DECISIONS_RECORDED` |
| **Implementation authorized** | No |
| **Package installation authorized** | No |
| **`ttp_enabled` state** | `false` — UNCHANGED |
| **`LEGAL_REVIEW_PENDING` state** | Active — UNCHANGED |

---

## 1. Authority and Basis

| Authority item | Reference |
|---|---|
| Design artifact | `docs/TECS-TTP-FRONTEND-TEST-HARNESS-DESIGN-001-v1.md` |
| Options audit artifact | `governance/decisions/PRODUCT-DEC-FRONTEND-TEST-HARNESS-OPTIONS-AUDIT-001.md` |
| Options audit commit | `48c3a39` |
| Decision owner | Paresh Patel — TexQtic founder / operator |
| Decision date | 2026-05-06 |

The 8 decisions below resolve all open items in §12 of the design artifact and adopt the
implementation constraints identified in the options audit (commit `48c3a39`). Together they
authorize opening `TTP-FRONTEND-TEST-HARNESS-IMPL-001` when Paresh gives explicit
prompt-level authorization.

---

## 2. Decision Record (D1–D8)

| ID | Question | Selected option | Rationale | Implementation consequence |
|---|---|---|---|---|
| **D1** | Approve dependency set? | Approve all 4 packages: `vitest@^3`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. `@testing-library/user-event` deferred (see D7). | Minimum viable harness. `vitest@^3.x` (not `^4.x`) is required: vitest 4 demands `vite ^6/7`; root is `vite ^5.3.1`. Vitest 3.x is vite-5-compatible. | IMPL-001 installs exactly these 4 packages as root devDependencies. No vite upgrade. No user-event in IMPL-001. |
| **D2** | DOM environment? | `jsdom` | Mature, comprehensive W3C coverage, deep RTL integration. Safer first choice for an unharness-hardened codebase. happy-dom is faster but less complete; re-evaluate after pilot if performance is a concern. | `vitest.frontend.config.ts` sets `environment: 'jsdom'`. `jsdom` package required in root devDependencies. |
| **D3** | Vitest at root — Option A vs Option B? | **Option A:** add `vitest@^3.x` as root devDependency | Clean explicit dependency. Avoids cross-package binary dependency. No fragility from server binary path. Option B (`pnpm --dir server exec vitest`) is fragile if server and frontend configs diverge. | Root `package.json` gets `vitest@^3` devDependency. Root `pnpm-lock.yaml` will be created or updated by root install. |
| **D4** | Test directory — dedicated `tests/frontend/` vs flat `tests/`? | Separate `tests/frontend/` directory; add `'../tests/frontend/**'` to `server/vitest.config.ts` `exclude` array | Clean `include` pattern in frontend config. Prevents double-execution of frontend tests in node env. Critical: without server exclusion, `../tests/**` glob in `server/vitest.config.ts` would pick up `tests/frontend/` in `node` env, causing RTL test failures. | `server/vitest.config.ts` must be in IMPL-001 allowlist (exclusion addition only — no other change). Frontend vitest config targets `tests/frontend/**` only. |
| **D5** | Frontend test script name? | `test:frontend` | Consistent with `test:server` naming convention. Clear intent. Discoverable. | Root `package.json` scripts: `"test:frontend": "vitest run --config vitest.frontend.config.ts"` |
| **D6** | Pilot component? | `TtpEnrollmentAdmin` | Three catch branches (FEATURE_DISABLED, APIError, plain Error). Most complete error-state coverage in a single component. No router deps. Tailwind only. Logic already verified at unit level (TC-FDU-004–TC-FDU-006 pass). | PILOT-001 creates `tests/frontend/ttp-enrollment-admin.test.tsx` with TC-FEH-001 through TC-FEH-005. |
| **D7** | Include `@testing-library/user-event`? | Defer — install when needed | No concrete use case for simulated events in the pilot. Pilot requires only `render()` + `screen` assertions. `user-event` is justified when interaction flows (click, type) need testing. | `@testing-library/user-event` NOT in IMPL-001 install list. Opened in a future unit when a concrete interaction test is needed. |
| **D8** | CI integration — immediate or after pilot? | After pilot | Pilot must first prove harness stability and pass locally before being added to CI gate. Premature CI gate risks flaky test failures blocking PRs. | `.github/workflows/test-suite.yml` UNCHANGED in IMPL-001. CI integration deferred to `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001`. |

---

## 3. Adopted Audit Findings as Implementation Constraints

The following findings from `TTP-FRONTEND-TEST-HARNESS-OPTIONS-AUDIT-001` (commit `48c3a39`)
are adopted as mandatory implementation constraints for IMPL-001.
No deviation is authorized without a new decision record.

| Audit finding | Implementation constraint |
|---|---|
| Vitest 4.x requires `vite ^6/7`; root has `vite ^5.3.1` | Use `vitest@^3.x` at root. Do NOT install `vitest@^4.x` at root. Do NOT upgrade `vite`. |
| `server/vitest.config.ts` includes `'../tests/**'` recursive glob | Add `'../tests/frontend/**'` to `server/vitest.config.ts` `exclude` array. This is the only permitted change to that file in IMPL-001. |
| No root `pnpm-lock.yaml` exists | Root install will create `pnpm-lock.yaml`. This file is in IMPL-001 allowlist. |
| Root `tsconfig.json` excludes `tests/` | Test files handled by Vitest's esbuild pipeline independently of tsc. Optional: create `tsconfig.test.json` extending root tsconfig with `tests/frontend/**` include for IDE support only. |
| `vite.config.ts` has no `test` block and no path aliases | Do NOT modify `vite.config.ts`. |
| `@vitejs/plugin-react` already in root devDependencies | `vitest.frontend.config.ts` imports `react()` from `@vitejs/plugin-react` — no install needed. |
| No CSS module imports in `TtpEnrollmentAdmin.tsx` | No `identity-obj-proxy` or CSS module mock needed for pilot. |

---

## 4. Finalized IMPL-001 Scope

`TTP-FRONTEND-TEST-HARNESS-IMPL-001` is the next candidate implementation unit.
It is **NOT yet opened**. Opening requires an explicit Paresh authorization prompt.

**When opened, IMPL-001 scope is:**

| Action | Detail |
|---|---|
| Install 4 root devDependencies | `vitest@^3`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` |
| Create `vitest.frontend.config.ts` | Root-level; `environment: 'jsdom'`; `include: ['tests/frontend/**']`; `setupFiles: ['./tests/setupTests.ts']`; `plugins: [react()]` |
| Create `tests/setupTests.ts` | `import '@testing-library/jest-dom/vitest';` |
| Add `test:frontend` script to root `package.json` | `"test:frontend": "vitest run --config vitest.frontend.config.ts"` |
| Add server vitest exclusion | In `server/vitest.config.ts`, add `'../tests/frontend/**'` to `exclude` array only. No other change. |
| Optional: create `tsconfig.test.json` | IDE TypeScript support for `tests/frontend/**` — not required for tests to run |

**IMPL-001 exact allowlist:**

1. `package.json` (root) — add devDependencies + `test:frontend` script
2. `pnpm-lock.yaml` (root) — created/updated by root `pnpm install`
3. `vitest.frontend.config.ts` (root) — new file
4. `tests/setupTests.ts` — new file
5. `server/vitest.config.ts` — exclusion addition only (`'../tests/frontend/**'` added to `exclude` array; no other change)
6. `tsconfig.test.json` (root) — optional IDE support

**IMPL-001 does NOT include:**

- Pilot component test (deferred to PILOT-001)
- CI workflow changes (deferred to CI-VERIFY-001)
- Any application code changes
- Any backend changes
- `server/package.json` changes
- `vite.config.ts` changes
- Any upgrade of `vite` version

---

## 5. Finalized PILOT-001 Scope

`TTP-FRONTEND-TEST-HARNESS-PILOT-001` is NOT opened. Opens after IMPL-001 is `TRUTH_SYNCED`.

**When opened, PILOT-001 scope is:**

| Test ID | Action | RTL API | Assertion |
|---|---|---|---|
| TC-FEH-001 | Renders loading state initially | `render()`, `screen.getByText` | `"Loading..."` or spinner visible before fetch resolves |
| TC-FEH-002 | Shows feature-disabled copy on `FEATURE_DISABLED` error | `waitFor`, `screen.getByText` | `"TradeTrust Pay is not currently enabled..."` in DOM |
| TC-FEH-003 | Shows generic copy on non-FEATURE_DISABLED APIError | `waitFor`, `screen.getByText` | Generic enrollment error copy visible |
| TC-FEH-004 | Shows specific message on APIError with `err.message` | `waitFor`, `screen.getByText` | `err.message` content visible in DOM |
| TC-FEH-005 | Shows generic copy on plain `Error` | `waitFor`, `screen.getByText` | Generic enrollment error copy visible |

**PILOT-001 allowlist (when opened):** `tests/frontend/ttp-enrollment-admin.test.tsx` (new file only).
No application code changes. No config changes.

---

## 6. Remaining Blockers

| Blocker | Status |
|---|---|
| Hard blockers for IMPL-001 | **None** — all 8 decisions resolved; audit constraints documented |
| `LEGAL_REVIEW_PENDING` | Active — unrelated to frontend test harness infrastructure; does not block IMPL-001 |
| CI integration | Deferred by D8 — `TTP-FRONTEND-TEST-HARNESS-CI-VERIFY-001` not opened until after pilot proves stability |
| Wave 3/4/5 gates | Unchanged — not affected by this unit |

---

## 7. No-Go Confirmation

The following items are confirmed unchanged by this decision record unit:

| Item | Status |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED |
| Application code | NOT MODIFIED |
| Backend routes / services | NOT MODIFIED |
| `server/vitest.config.ts` | NOT MODIFIED (change deferred to IMPL-001) |
| `vite.config.ts` | NOT MODIFIED (no change authorized) |
| Root `package.json` | NOT MODIFIED (change deferred to IMPL-001) |
| `server/package.json` | NOT MODIFIED |
| Lockfiles | NOT MODIFIED |
| Prisma schema / SQL / migrations | NOT MODIFIED |
| Env files / feature flags | NOT MODIFIED |
| Existing tests | NOT MODIFIED |
| Wave 3/4/5 gates | UNCHANGED |
| `TTP-FRONTEND-TEST-HARNESS-IMPL-001` | NOT OPENED |

---

## 8. Final Decision Token

```
TTP_FRONTEND_TEST_HARNESS_DESIGN_DECISIONS_001_RECORDED
```

**Authority:** Paresh Patel — TexQtic founder / operator
**Status:** `DESIGN_DECISIONS_RECORDED`
**`ttp_enabled` state:** `false` — UNCHANGED
**`LEGAL_REVIEW_PENDING` state:** Active — UNCHANGED
**No packages installed. No configs changed. No app code changed. No tests changed.**
**`TTP-FRONTEND-TEST-HARNESS-IMPL-001` remains `NOT_OPENED` — next candidate.**

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*This document does not authorize any implementation. Implementation requires Paresh to open*
*`TTP-FRONTEND-TEST-HARNESS-IMPL-001` in an explicit authorization prompt.*
