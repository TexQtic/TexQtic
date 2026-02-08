# TypeScript Error Register + Burn-Down Plan

**Snapshot Date:** February 8, 2026  
**Prompt:** #26B  
**Mode:** Report-Only (Diagnostic)  
**Status:** ⚠️ **PRE-UNBLOCK SNAPSHOT** (Authoritative baseline will be established in 26B-Refresh after Prompt #26C)

---

## Executive Summary

- **Total Errors (Visible):** 1
- **Frontend (root):** 0 errors ✅
- **Backend (server):** 1 error ❌ (parser-level syntax error)
- **Blockers:** 1 critical TS1005 syntax error **blocking AST construction**

### ⚠️ Critical Context

**This count reflects only visible errors.** The TS1005 syntax error in `prisma.ts` prevents TypeScript from completing AST parsing, which means:

- ✅ `tsc --noEmit` reports only the blocker (1 error)
- ⚠️ **True TS error count is unknown until blocker is fixed**
- 🔍 VS Code Problems panel may show 100+ items from ESLint, SonarLint, language service diagnostics (different sources)

**Next Steps:**

1. **Execute Prompt #26C** (fix syntax error)
2. **Re-run both `tsc --noEmit` commands** (root + server)
3. **Establish authoritative baseline** (26B-Refresh)
4. **Then** proceed with burn-down plan (if additional errors appear)

---

## Raw TypeScript Check Output

### Frontend (root)

```bash
cd c:\Users\PARESH\TexQtic
npx tsc --noEmit
```

**Result:** ✅ PASS (0 errors)

### Backend (server)

```bash
cd c:\Users\PARESH\TexQtic\server
npx tsc --noEmit
```

**Result:** ❌ FAIL (1 error)

```
src/db/prisma.ts:27:1 - error TS1005: '}' expected.

27


  src/db/prisma.ts:25:35
    25 process.on('SIGTERM', async () => {
                                         ~
    The parser expected to find a '}' to match the '{' token here.

Found 1 error in src/db/prisma.ts:27
```

---

## Error Register

| #   | Project | File             | Line:Col | TS Code | Message      | Bucket | Root Cause                                                              | Fix Strategy                                           | Touch Scope | Proposed Prompt |
| --- | ------- | ---------------- | -------- | ------- | ------------ | ------ | ----------------------------------------------------------------------- | ------------------------------------------------------ | ----------- | --------------- |
| 1   | server  | src/db/prisma.ts | 27:1     | TS1005  | '}' expected | A      | Incomplete SIGTERM handler - missing closing braces and process.exit(0) | Add closing brace + process.exit(0) to SIGTERM handler | 1 file      | Prompt #26C     |

---

## Classification by Bucket

### Bucket A — Correctness / Type Safety (1 error)

**Priority:** 🔴 CRITICAL (blocks compilation)

| Error  | File                | Description                                                   |
| ------ | ------------------- | ------------------------------------------------------------- |
| TS1005 | src/db/prisma.ts:27 | Missing closing brace in SIGTERM event handler - syntax error |

**Impact:** Prevents TypeScript compilation entirely. All downstream type checking is blocked.

### Bucket B — Contract Drift (0 errors)

✅ No errors

### Bucket C — Tooling/Config (0 errors)

✅ No errors

### Bucket D — Strictness/Noise (0 errors)

✅ No errors

---

## Error Distribution Analysis

### By Project

- **root:** 0 errors (0%)
- **server:** 1 error (100%)

### By Bucket

- **Bucket A (Correctness):** 1 error (100%) 🔴
- **Bucket B (Contract Drift):** 0 errors (0%)
- **Bucket C (Tooling/Config):** 0 errors (0%)
- **Bucket D (Strictness/Noise):** 0 errors (0%)

### Top Files by Error Count

1. `server/src/db/prisma.ts` — 1 error

---

## Burn-Down Plan (Next 5 Prompts)

### Prompt #26C — Fix Critical Prisma Singleton Syntax Error

**Priority:** P0 (BLOCKING)  
**Bucket:** A (Correctness)  
**Scope:** Complete the truncated SIGTERM handler in prisma.ts

**Allowed Files:**

- ✅ `server/src/db/prisma.ts` (edit only lines 25-30)

**Forbidden:**

- ❌ No schema changes
- ❌ No config changes
- ❌ No other file edits

**Fix Strategy:**

```typescript
// Current (broken):
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  // MISSING: closing brace + process.exit(0)

// Target (fixed):
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

**Success Condition:**

- `npx tsc --noEmit` completes parsing (no TS1005)
- Both signal handlers (SIGINT/SIGTERM) are symmetric

**Expected Outcomes:**

**Outcome A (Best Case):** True error count = 0

- ✅ Both `tsc --noEmit` commands pass cleanly
- ✅ TS error track complete
- ➡️ **Next:** Focus on ESLint baseline (41 errors) + SonarLint quality

**Outcome B (Discovery):** Additional TS errors surface (likely 5-20)

- ⚠️ Parser can now finish AST construction
- ⚠️ Previously hidden type errors become visible
- ➡️ **Next:** Execute 26B-Refresh to establish true baseline, then proceed with Prompts #26D-G

**Post-26C Verification (MANDATORY):**

```bash
# Backend check
cd c:\Users\PARESH\TexQtic\server
npx tsc --noEmit

# Frontend check
cd c:\Users\PARESH\TexQtic
npx tsc --noEmit

# Update register with true baseline (26B-Refresh)
```

**Commit Message:**

```
fix(prisma): complete truncated SIGTERM handler (Prompt #26C)

- Add missing closing brace + process.exit(0) to SIGTERM handler
- Restore symmetry with SIGINT handler
- Unblock TypeScript compilation (TS1005 syntax error)

Governance: PASS (backend-only, critical bugfix)
```

---

### Prompt #26D — Full TypeScript Strictness Audit (Reserved)

**Priority:** P1 (POST-ZERO)  
**Bucket:** D (Strictness)  
**Scope:** Run with strict: true, collect new errors, classify

**Allowed Files:**

- ✅ `docs/execution/TS_STRICT_AUDIT.md` (report-only)

**Trigger Condition:**

- Run ONLY after 26B-Refresh completes
- Run ONLY if true baseline = 0 errors
- If baseline > 0, prioritize Bucket A/B fixes first

**Expected Work:**

- Temporarily enable `"strict": true` in both tsconfig.json files
- Capture all strictness errors
- Classify by severity (blocking vs nice-to-have)
- Produce ordered fix plan

**Expected Net Error Count:** TBD (likely 5-20 new strict-mode errors)

**Note:** This prompt is **reserved** and may be replaced/reordered based on 26B-Refresh findings.

---

### Prompt #26E — Implicit Any Cleanup (Reserved)

**Priority:** P2 (POST-ZERO)  
**Bucket:** D (Strictness)  
**Scope:** Eliminate implicit any in top 3 files

**Trigger Condition:**

- Run ONLY after strict audit (#26D) completes
- **May be replaced** if 26B-Refresh reveals Bucket A/B errors

**Expected Files:**

- TBD based on #26D audit results OR 26B-Refresh bucket analysis

**Expected Net Error Count:** TBD (reduce by 5-10 errors)

**Note:** Execution order may change based on 26B-Refresh prioritization (Bucket A → B → C → D).

---

### Prompt #26F — Null Safety Hardening (Reserved)

**Priority:** P3 (POST-ZERO)  
**Bucket:** A (Correctness)  
**Scope:** Enable strictNullChecks, fix top violations

**Trigger Condition:**

- Run ONLY after implicit any cleanup (#26E)

**Expected Files:**

- TBD based on strictNullChecks audit

**Expected Net Error Count:** TBD (reduce by 5-10 errors)

---

### Prompt #26G — Shared Contract Type Alignment (Reserved)

**Priority:** P4 (POST-ZERO)  
**Bucket:** B (Contract Drift)  
**Scope:** Audit for FE/BE contract drift, consolidate types

**Trigger Condition:**

- Run ONLY after null safety hardening (#26F)

**Expected Files:**

- `shared/contracts/types/*` (if drift detected)

**Expected Net Error Count:** TBD (no new errors expected, possibly reduce if drift exists)

---

## Ratchet Policy (Error Count Reduction Schedule)

### Phase 1: Achieve Zero Baseline (CURRENT)

**Timeline:** Immediate (Prompt #26C)  
**Target:** 1 visible error → **TBD true baseline** (established via 26B-Refresh)  
**Cadence:** Single atomic fix, then re-measure

**Milestone:** TypeScript parser completes AST construction, revealing true error count

**Critical Note:** Current "1 error" is a **pre-unblock snapshot**. True baseline unknowable until parser-level blocker is resolved.

---

### Phase 2: Strict Mode Enablement (FUTURE)

**Timeline:** After Phase 1 complete AND true baseline = 0  
**Target:** Enable `"strict": true`, accept initial error count  
**Cadence:** Run audit (#26D), then fix in batches of 5-10 errors

**Trigger Condition:** Only proceed if 26B-Refresh shows 0 errors

**Goals:**

- Enable all strict flags (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.)
- Fix high-priority correctness issues first (Bucket A)
- Defer low-priority noise to Phase 3

---

### Phase 3: Continuous Improvement (FUTURE)

**Timeline:** After strict mode stable  
**Target:** Reduce remaining Bucket D errors by 2-5 per sprint  
**Cadence:** Weekly ratchet reviews

**Goals:**

- Zero Bucket A errors (correctness) — maintained
- Zero Bucket B errors (contract drift) — maintained
- Bucket D errors (strictness noise) — reduce opportunistically

---

### CI Gate Evolution

| Phase                      | CI Behavior                        | Condition                                    |
| -------------------------- | ---------------------------------- | -------------------------------------------- |
| **Current (Phase 1)**      | `npm run typecheck` runs, may fail | Visible error count = 1 (pre-unblock)        |
| **Phase 1 Complete**       | `npm run typecheck` runs, may fail | True baseline established (0 or N errors)    |
| **Phase 2 (Strict Audit)** | `npm run typecheck` runs, may fail | New errors discovered, managed backlog       |
| **Phase 2 Stable**         | `npm run typecheck` MUST PASS      | All strict errors resolved, ratchet enforced |
| **Phase 3 (Continuous)**   | `npm run typecheck` MUST PASS      | Zero tolerance for new errors                |

**Ratchet Trigger:** Flip to "MUST PASS" after Phase 2 completes (strict mode enabled + all critical errors resolved).

**Alternate Path (If 26B-Refresh shows 0 errors):**

- Skip Phase 2 (strict audit)
- Move directly to ESLint baseline burn-down (41 errors) + SonarLint quality track
- TS track considered **complete** ✅

---

## Recommended Immediate Action

### ⚠️ BLOCKER: Execute Prompt #26C First

**Reason:** The TS1005 syntax error in `prisma.ts` blocks AST parsing. **True error count is unknowable until this is fixed.**

**Why This Matters:**

- Parser-level errors prevent TypeScript from building complete AST
- Downstream type-checking is incomplete/unreliable
- VS Code Problems panel may show 100+ items (ESLint, SonarLint, language service) but these are **different diagnostic sources**
- Only after 26C can we establish authoritative TS baseline

**Pre-Fix Verification:**

```bash
cd c:\Users\PARESH\TexQtic\server
npx tsc --noEmit
# Expected: "error TS1005: '}' expected"
```

**Post-Fix Verification (Critical):**

```bash
# Backend
cd c:\Users\PARESH\TexQtic\server
npx tsc --noEmit

# Frontend
cd c:\Users\PARESH\TexQtic
npx tsc --noEmit

# Then execute 26B-Refresh to update this register with true baseline
```

**Expected Outcomes:**

- **Best Case:** 0 errors → TS track complete, switch to ESLint/SonarLint burn-down
- **Discovery:** 5-20 new errors appear → proceed with ordered burn-down plan (#26D-G)

---

## Post-26C: Execute 26B-Refresh

**Once Prompt #26C completes**, this register must be updated with the **authoritative baseline**:

### 26B-Refresh Checklist

1. ✅ Run `npx tsc --noEmit` on both projects
2. ✅ Capture full output (no truncation)
3. ✅ Update Error Register table with all discovered errors
4. ✅ Reclassify by bucket (A/B/C/D)
5. ✅ Adjust burn-down plan order if needed
6. ✅ Update ratchet targets based on true count

**This section replaces the "Recommended Immediate Action" once 26C is complete.**

---

## Verification Checklist

- ✅ Command output for `npx tsc --noEmit` (root) — PASS (0 errors)
- ✅ Command output for `server npx tsc --noEmit` — FAIL (1 error)
- ✅ Error Register table completed (1 row)
- ✅ Bucket classification completed (1 Bucket A error)
- ✅ Ordered 5-prompt burn-down plan written (#26C-G)
- ✅ Ratchet policy written (3 phases + CI gate evolution)
- ✅ Confirm no files changed (only this report file created)

---

## Git Status (Pre-Commit)

```bash
git status --short
# Output: (empty, no changes)
```

This report is the ONLY new file created by Prompt #26B.

---

**Report Complete.** Ready for Prompt #26C execution.
