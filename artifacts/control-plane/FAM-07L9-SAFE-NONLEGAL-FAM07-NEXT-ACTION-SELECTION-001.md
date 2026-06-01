# FAM-07L9 — Safe Non-Legal FAM-07 Next Action Selection

**Artifact ID:** FAM-07L9-SAFE-NONLEGAL-FAM07-NEXT-ACTION-SELECTION-001  
**Unit:** FAM-07L9  
**Branch:** main  
**Date:** 2026-06-01  
**Status:** COMPLETE  
**Final Enum:** `FAM_07L9_SAFE_NONLEGAL_NEXT_ACTION_SELECTED`

---

## 1. Unit Summary

Planning and selection unit only. No implementation. No runtime mutation. No legal authority state changed.

After L8 (OpenAPI contract sync, commit `b4e4213c`), the FAM-07 L-lane technical foundation chain is complete. This unit inspects current repo truth, identifies the stale governance tracker posture caused by 8 completed L-lane units (L1–L8) that were never reflected in the governance files, evaluates safe non-legal candidate next actions, and selects the minimum bounded next unit that best advances FAM-07 readiness while legal inputs remain pending.

---

## 2. Preflight Evidence

**Working tree state before any work:**
```
git status --short  →  (empty — clean tree)
git rev-parse --short HEAD  →  b4e4213c
```

**L8 ancestry check:**
```
git merge-base --is-ancestor b4e4213c HEAD  →  exit 0
b4e4213c(L8): 0  ✅
```

Clean working tree. HEAD = `b4e4213c`. L8 ancestry confirmed.

---

## 3. Current Repo-Truth Findings

### 3a. L8 Artifact

```
Test-Path artifacts/control-plane/FAM-07L8-CONTROL-PLANE-LEGAL-AUTHORITY-OPENAPI-CONTRACT-SYNC-001.md
→ True  ✅
```

### 3b. OpenAPI Contract State

```
shared/contracts/openapi.control-plane.json:
  line 62: "consent_scaffold_observability"  ✅ present
  line 85: "authority_record"  ✅ present (nested inside consent_scaffold_observability)
```

Nested `consent_scaffold_observability.authority_record` confirmed in control-plane contract.

### 3c. Tenant Contract Not Contaminated

```
shared/contracts/openapi.tenant.json:
  grep consent_scaffold_observability  →  No matches found  ✅
```

Control-plane diagnostic surface is not exposed via the tenant contract. Correct.

### 3d. Legal Authority File State

```
Test-Path governance/legal/fam-07  →  False  ✅ (directory does not exist)
Test-Path governance/legal/fam-07/supplier-onboarding-terms-authority.json  →  False  ✅
```

No authority file found. Safe nonlegal path confirmed. No unexpected legal authority present. No decision gate triggered.

### 3e. Governance Tracker Staleness (Critical Finding)

All three governance pointer files were last updated at K14 close (2026-05-31). L1–L8 were completed after that date. The following stale pointers were found:

| File | Stale Field | Current Stale Value | Actual Truth |
|---|---|---|---|
| `governance/control/NEXT-ACTION.md` | `active_delivery_unit` | `FAM-07K14-...-HUB-SYNC-001` | L8 complete (`b4e4213c`) |
| `governance/control/NEXT-ACTION.md` | `last_closed_unit` | `FAM-07K14-...-HUB-SYNC-001` | Should be L8 |
| `governance/control/NEXT-ACTION.md` | `next_candidate_unit` | `FAM-07L1-...` | L1–L8 ALL complete; should be legal-pending hold |
| `governance/control/OPEN-SET.md` | `Last Updated` | `2026-05-31 (FAM-07K14...)` | L1–L8 completed, not recorded |
| `governance/control/OPEN-SET.md` | Operating Notes | Next recommended unit: `FAM-07L1-...` | Stale — L1–L8 done |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 row | K-lane through K13 / Next: `FAM-07L1-...` | L-lane L1–L8 complete |

**Staleness depth:** 8 units (L1 through L8). The `next_candidate_unit` in `NEXT-ACTION.md` is `FAM-07L1` — which is 8 units behind actual HEAD.

### 3f. Legal/Governance Invariants Confirmed

- FAM-07: NOT VERIFIED_COMPLETE — confirmed by tracker evidence.
- FTR-LEGAL-003: MVP_CRITICAL/OPEN — confirmed in all three governance files.
- HD-001: RUNTIME_CONFIRMED_CONFIGURED — unchanged.
- No `LEGAL_APPROVED`, `ACCEPTED_FINAL`, or `ADMIN_REVIEW` state was found.
- No authority file was found that would trigger a decision gate.

---

## 4. L8 Carry-Forward Confirmation

| Item | Status |
|---|---|
| L8 artifact exists at correct path | ✅ |
| `consent_scaffold_observability` in control-plane TenantObject schema | ✅ |
| `authority_record` nested inside `consent_scaffold_observability` | ✅ |
| `openapi.tenant.json` unchanged | ✅ |
| L8 commit `b4e4213c` in HEAD lineage | ✅ |
| No source/test files modified in L8 | ✅ |

L8 carry-forward is clean. No rework needed from L8.

---

## 5. Legal Authority State Confirmation

| Check | Result |
|---|---|
| `governance/legal/fam-07/` directory exists | **No** |
| `supplier-onboarding-terms-authority.json` exists | **No** |
| Runtime diagnostic expected state | `present: false`, `blocking_reason_code: AUTHORITY_FILE_ABSENT` |
| `legal_approved_transition_allowed` expected state | `false` |
| FAM-07 may be marked VERIFIED_COMPLETE | **No** |
| FTR-LEGAL-003 may be closed | **No** |

Safe nonlegal path confirmed. No legal authority inputs have arrived. Legal gate remains closed.

---

## 6. Safe Candidate Next Actions Considered

### Candidate A — Governance Tracker Pointer Sync *(Selected)*

**Description:** Update `NEXT-ACTION.md`, `OPEN-SET.md`, and `LAUNCH-FAMILY-INDEX.md` to advance from K14/L1-stale state to reflect L1–L8 completion. Set `last_closed_unit` to L8 (`b4e4213c`), clear the stale `next_candidate_unit: FAM-07L1` pointer, and record the L-lane completion chain summary in operating notes. Set the governance tracker posture to a bounded legal-pending hold state.

**Why safe:** Does not implement runtime behavior. Does not create legal authority. Does not close FAM-07 or FTR-LEGAL-003. Corrects governance accuracy that anyone reading the tracker depends on.

**Why highest priority:** Three Layer 0 governance files are 8 units stale. `NEXT-ACTION.md` currently directs any reader to start `FAM-07L1` — which has been done. This is a concrete governance accuracy failure that affects every future unit's authorization and sequencing. Governance accuracy is foundational. **Selected.**

**Required allowlist:** `governance/control/NEXT-ACTION.md`, `governance/control/OPEN-SET.md`, `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`, `artifacts/control-plane/...`

---

### Candidate B — Integration Test: Tenant-with-Records + Absent Authority Coexistence

**Description:** Add integration tests that verify the `has_records=true` + `authority_record.present=false` + `blocking_reason_code=AUTHORITY_FILE_ABSENT` coexistence scenario (a tenant that has existing consent records but still has no legal authority file). Current integration tests (`control-onboarding-outcome.integration.test.ts`) test QA tenants without active consent records; the diagonal case is not explicitly covered.

**Why safe:** No runtime mutation, no legal authority involved. Tests only.

**Why deferred over A:** Governance accuracy (Candidate A) is a foundational prerequisite — if the governance files point to L1 as `next_candidate_unit`, any subsequent unit (including this test unit) would be operating without accurate tracker context. Tracker sync is a prerequisite for clean subsequent units.

**Disposition:** Valid follow-up. Recommend as `FAM-07L11` or after L10 tracker sync.

---

### Candidate C — Legal Authority Input Checklist Artifact

**Description:** Create a planning artifact listing the exact inputs required from legal/product to allow `supplier-onboarding-terms-authority.json` to be created: required fields, format, version scheme, source_url requirements, env mapping, re-consent policy, legal counsel sign-off requirements, and handoff mechanism.

**Why safe:** Pure planning artifact. No runtime mutation. Useful for external communication when legal inputs become available.

**Why deferred over A:** Lower urgency than governance accuracy. Also, the authority file structure is already well-defined in `legalPackageAuthority.ts` and the `AuthorityDiagnostic` interface — a checklist can be derived from existing code at any time.

**Disposition:** Valid future unit but deferred until after tracker sync.

---

### Candidate D — Runtime Observation Plan (Read-Only)

**Description:** A structured plan for how to verify `authority_record` diagnostic fields transition correctly once an authority file arrives, without runtime mutation.

**Why deferred:** The runtime observation plan is implicitly captured in L5–L8 artifacts and the existing test suite. No gap requires a separate unit now.

---

### Candidate E — Documentation Alignment (Code Comments / README)

**Description:** Align inline code comments in `legalPackageAuthority.ts` or `control.ts` with the now-synchronized OpenAPI contract field descriptions.

**Why deferred:** Low priority. Code comments and contract descriptions are independently maintained. No misalignment gap was identified in L5–L8 review. This can be picked up opportunistically.

---

## 7. Rejected Unsafe Actions

| Action | Reason Rejected |
|---|---|
| Create `governance/legal/fam-07/supplier-onboarding-terms-authority.json` | Creates legal authority record — FORBIDDEN |
| Implement `LEGAL_APPROVED` flow | Legal-final state — FORBIDDEN |
| Mark FAM-07 VERIFIED_COMPLETE | Legal gate not cleared — FORBIDDEN |
| Close FTR-LEGAL-003 | Legal gate not cleared — FORBIDDEN |
| Emit `ACCEPTED_FINAL` or `ADMIN_REVIEW` | Legal-final path — FORBIDDEN |
| Modify `server/src/routes/control.ts` | Source file — not in write allowlist |
| Modify any test file | Not in write allowlist |
| Modify `shared/contracts/openapi.control-plane.json` | Not in write allowlist (L8 already complete) |
| Edit governance trackers in L9 | Requires expanded allowlist — per-rule, select tracker sync unit instead |

---

## 8. Recommended Next Unit

**`FAM-07L10-LEGAL-AUTHORITY-LANE-GOVERNANCE-TRACKER-SYNC-001`**

A bounded governance tracker sync unit that advances `NEXT-ACTION.md`, `OPEN-SET.md`, and `LAUNCH-FAMILY-INDEX.md` from K14/L1-stale state to reflect L-lane (L1–L8) completion.

**Why this is safe while legal inputs are pending:**
- Does not implement runtime behavior.
- Does not create or claim legal authority.
- Does not close FAM-07 or FTR-LEGAL-003.
- Legal gate status is preserved and unchanged.
- Corrects a concrete governance accuracy gap without advancing legal-final state.
- Single bounded scope: three governance files + one artifact.

---

## 9. Exact Proposed Next Unit Title

```
FAM-07L10-LEGAL-AUTHORITY-LANE-GOVERNANCE-TRACKER-SYNC-001
```

---

## 10. Proposed Next-Unit Scope

Update three governance pointer files to reflect L1–L8 completion. Specifically:

**`governance/control/NEXT-ACTION.md` changes:**
- `active_delivery_unit` → `FAM-07L8-CONTROL-PLANE-LEGAL-AUTHORITY-OPENAPI-CONTRACT-SYNC-001`
- `active_delivery_unit_status` → `VERIFIED_COMPLETE`
- `last_closed_unit` → `FAM-07L8-...`
- `last_closed_unit_status` → `VERIFIED_COMPLETE (2026-06-01)`
- `last_closed_unit_commits` → `"docs(api): sync legal authority diagnostic contract"` (commit `b4e4213c`)
- `next_candidate_unit` → `FAM-07L11` or a legal-pending hold state that accurately reflects the current state (no further non-legal L-lane work identified pending legal inputs)
- `next_candidate_unit_status` → `HOLD_FOR_LEGAL_INPUTS`
- Note section: add concise L1–L8 lane summary

**`governance/control/OPEN-SET.md` changes:**
- `Last Updated` header → updated with L8/L10 context
- Operating Notes: add concise L-lane (L1–L8) completion entry, referencing:
  - L5: `legalPackageAuthority.ts` loader (commit `9cb27c64`)
  - L6: `authority_record` nested shape alignment (commit `ec501e02`)
  - L7: runtime verification (commit `8f911e8e`)
  - L8: OpenAPI contract sync (commit `b4e4213c`)
  - Legal gate: unchanged, `AUTHORITY_FILE_ABSENT` at runtime
  - Next: `FAM-07L10` tracker sync (or `FAM-07L11` test coexistence)

**`governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` changes:**
- FAM-07 row: advance notes from K14/L1 to include L-lane (L1–L8) completion chain
- Preserve: `PARTIALLY_IMPLEMENTED`, `LAUNCH_BLOCKER`, FAM-07 NOT VERIFIED_COMPLETE
- Do NOT advance status column beyond current level — legal gate has not changed

**Invariants to preserve throughout L10:**
- FAM-07 status: NOT VERIFIED_COMPLETE
- FTR-LEGAL-003: MVP_CRITICAL/OPEN
- HD-001: RUNTIME_CONFIRMED_CONFIGURED
- No `LEGAL_APPROVED` or `ACCEPTED_FINAL` language added

---

## 11. Proposed Allowed Write Files for L10

```
governance/control/NEXT-ACTION.md
governance/control/OPEN-SET.md
governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
artifacts/control-plane/FAM-07L10-LEGAL-AUTHORITY-LANE-GOVERNANCE-TRACKER-SYNC-001.md
```

Optional (only if needed for full L-lane completion record):
```
governance/launch-readiness/FUTURE-TODO-REGISTER.md
```

---

## 12. Proposed Forbidden Actions for L10

- Modify runtime source files (`server/src/routes/`, `server/src/lib/`)
- Modify OpenAPI contract files (L8 complete; no new contract changes needed)
- Modify test files
- Create `governance/legal/fam-07/supplier-onboarding-terms-authority.json`
- Create any legal authority record
- Mark FAM-07 VERIFIED_COMPLETE
- Close FTR-LEGAL-003
- Advance HD-001 beyond RUNTIME_CONFIRMED_CONFIGURED
- Emit `LEGAL_APPROVED`, `ACCEPTED_FINAL`, `ADMIN_REVIEW`
- Modify `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` status column (only notes allowed)
- Expose secrets, tokens, DB URLs, env values, auth headers

---

## 13. Governance Tracker Sync Needed Now vs. Deferred

**NOW — Required in L10 (next unit).**

The tracker gap is 8 units deep as of 2026-06-01. All three Layer 0 governance files still direct readers to `FAM-07L1` as the next candidate unit. This is factually wrong: L1–L8 are complete. The stale pointer cannot be safely left unresolved because it affects authorization sequencing for any subsequent unit. L9 cannot perform the tracker edits (not in the write allowlist), so L10 is the dedicated tracker sync unit.

**Deferred (after L10):**
- Integration test coexistence coverage (Candidate B) → recommend as L11
- Legal authority input checklist → recommend as L12 or integrated into L11 scope

---

## 14. Final Status Preservation Statement

This unit (L9) confirms and preserves:

| Item | Status |
|---|---|
| FAM-07 | **NOT VERIFIED_COMPLETE** — legal gate open; authority file absent |
| FTR-LEGAL-003 | **MVP_CRITICAL/OPEN** — awaiting final legal package authority |
| HD-001 | **RUNTIME_CONFIRMED_CONFIGURED** — unchanged |
| Legal authority file | **Absent** — `governance/legal/fam-07/` does not exist |
| Runtime diagnostic | `present: false`, `blocking_reason_code: AUTHORITY_FILE_ABSENT` |
| `legal_approved_transition_allowed` | `false` at runtime |
| L-lane (L1–L8) | **Technical foundation complete** — loader, shape, runtime proof, contract synced |
| Governance tracker posture | **Stale** (8 units) — to be corrected in L10 |

No legal-final runtime behavior was implemented in this unit. No legal authority record was created. No secrets were exposed.

---

## 15. Final Enum

`FAM_07L9_SAFE_NONLEGAL_NEXT_ACTION_SELECTED`
