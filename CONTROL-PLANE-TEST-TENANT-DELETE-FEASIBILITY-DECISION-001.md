# CONTROL-PLANE-TEST-TENANT-DELETE-FEASIBILITY-DECISION-001

## 1. Status Header

- Unit ID: CONTROL-PLANE-TEST-TENANT-DELETE-FEASIBILITY-DECISION-001
- Mode: Repo-truth delete/remove feasibility audit + decision artifact only (no mutation, no implementation)
- Date: 2026-05-26
- Branch: main
- HEAD at delete-feasibility start: 50a21424f4530d0ba5fb056a85524a7b72208962
- Scope boundary: decision-only; no runtime archive/delete action, no DB mutation, no new API implementation
- Final recommendation enum: DELETE_FEASIBILITY_REQUIRES_RUNTIME_DATA_EXPORT

## 2. Background

This unit was opened after completion of:

- CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-DECISION-001
- CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-EXPANSION-001

Paresh clarified the objective for this decision layer:

- prefer delete/remove feasibility beyond archive-only if and only if safety and non-disruption can be demonstrated.

Design and inventory authorities reviewed in this unit:

- CONTROL-PLANE-TEST-TENANT-CLEANUP-DESIGN-001
- CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-DECISION-001
- CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-EXPANSION-001

## 3. Verified Checkpoints

Confirmed during preflight for this unit:

- 6be1f93 (commit)
- 369bbe6 (commit)
- 83d140f (commit)
- 517b8eb (commit)
- a878a9f6 (commit)
- 97ac3e80 (commit)
- cae26415dda03f3334073228a6826d981b25a69a (commit)
- e2465b9 (commit)
- 5dba693 -> 5dba693f108106c93e0f4d6edd694bcd7a74b28a
- 7b842dd -> 7b842ddd53507f1398f19c74f74f9c478eff44f5
- 4a609da -> 4a609dafb1a64d740d961c76c055c0b66e428ebc
- 50a21424f4530d0ba5fb056a85524a7b72208962 (commit)

## 4. Prior Inventory Summary Carried Forward

From the latest approved inventory-expansion authority:

- active SAFE_CLEANUP_CANDIDATE: 22
- closed SAFE_CLEANUP_CANDIDATE: 25
- protected keep-set examples: 10
- ambiguous manual-review set: 4

This delete-feasibility unit does not reclassify those records; it assesses whether remove/delete is safe and lawful for any future execution design.

## 5. Repo-Truth Delete/Remove Findings

### 5.1 Control-plane route surface currently has no tenant delete endpoint

Observed control-plane tenant mutations are:

- onboarding outcome record
- activate approved onboarding
- archive to CLOSED

No control-plane tenant delete/remove route is present in the audited control routes. Existing archival path is explicit and audited.

### 5.2 Existing archive path is protected and intentional

Control-plane archive path includes:

- SUPER_ADMIN gate
- expectedSlug confirmation
- operator reason
- protected keep-set blockers for QA baselines + white-label-co

This indicates current production doctrine is archive-first, guardrailed, and auditable.

### 5.3 Tenant-to-organization identity coupling means delete has broad blast radius

Schema/migrations confirm:

- organizations.id is linked to tenants.id with ON DELETE CASCADE (deferred FK)
- hard-deleting tenant implies deleting its organization row
- organization row anchors many downstream domains

Therefore tenant hard-delete is not an isolated operation; it is a graph operation.

### 5.4 Referential graph mixes CASCADE and RESTRICT/NO ACTION constraints

Repo-truth migration history contains a large mixed graph:

- many CASCADE paths (catalog/cart/invites/memberships and multiple network records)
- multiple RESTRICT/NO ACTION paths across trade, escrow, sanctions, traceability, RFQ, DPP, TTP and related lifecycle entities

Implication:

- some tenants may delete cleanly if they are shallow and isolated
- other tenants will hard-fail deletion if protected references exist
- feasibility cannot be declared globally without per-tenant dependency export.

### 5.5 Audit/reasoning/history posture raises compliance-loss risk under hard delete

Audit, event, reasoning, and lifecycle tables are designed for governance traceability. A blind delete strategy can erase evidence needed for:

- control-plane forensic history
- domain lifecycle reconstruction
- policy and supervision review

A remove strategy that does not preserve or snapshot evidence before deletion is non-compliant with safe governance expectations.

### 5.6 Repo usage indicates test-tenant patterns are relied on in test and script ecosystems

Test and script code references many test-tenant patterns and teardown assumptions. While most are generated slugs (not fixed production IDs), this still means deletion policy must separate:

- production runtime tenants
- ephemeral test-only records

and must include explicit candidate selection and evidence export before any remove action.

## 6. Safe Candidate Impact Matrix (Feasibility Lens)

| candidate lane | volume carried from prior inventory | likely delete behavior | primary risk if hard-deleted without export | feasibility status |
| --- | --- | --- | --- | --- |
| ACTIVE safe candidates | 22 | mixed (unknown per-tenant) | breakage of still-referenced trade/RFQ/network/doc chains; loss of recoverability | NOT SAFE WITHOUT PRECHECK |
| CLOSED safe candidates | 25 | mixed (more likely feasible, still unknown) | historical evidence loss + possible FK blockers on retained artifacts | NOT SAFE WITHOUT PRECHECK |
| protected keep-set | 10 | should not be deleted | baseline/fixture continuity loss + governance conflict | DO NOT DELETE |
| ambiguous set | 4 | should not be deleted until decision | accidental deletion of real/needed org context | MANUAL DECISION REQUIRED |

## 7. Delete/Remove Options A-G

| option | description | feasibility vs repo-truth | risk level | decision |
| --- | --- | --- | --- | --- |
| A | Keep archive-only model (status quo) | fully aligned with current routes and protections | LOW | SAFE NOW |
| B | Direct DB hard-delete for selected slugs | bypasses control-plane governance and audit guardrails | CRITICAL | REJECT |
| C | Bulk hard-delete all 47 safe candidates (22 active + 25 closed) | impossible to guarantee due mixed RESTRICT/NO ACTION graph and unknown per-tenant depth | CRITICAL | REJECT |
| D | Build new control-plane delete workflow: dry-run dependency export, evidence snapshot, gated irreversible execution | potentially feasible but requires explicit backend design and approval | HIGH (until built) | FUTURE CANDIDATE |
| E | Delete CLOSED safe only, leave ACTIVE safe archived | still requires per-tenant dependency export and evidence preservation | HIGH | REQUIRES PRECHECK |
| F | Two-step: archive ACTIVE safe first, then evaluate delete only for CLOSED + dependency-clean subset | feasible as controlled future program if export gate passes | MEDIUM-HIGH | CONDITIONAL FUTURE |
| G | No-op (keep all records forever) | operationally easiest, but leaves registry noise and cleanup debt | MEDIUM | NOT PREFERRED |

## 8. Recommended Path

Recommended decision path for Paresh:

1. Approve Option F as the strategic direction, not immediate execution.
2. Require a dedicated design/implementation unit (separate from this decision unit) for:
   - dependency preflight export per candidate tenant
   - irreversible-action gate with explicit approval token
   - evidence snapshot retention policy
   - protected/ambiguous hard block list enforcement
3. Until that exists, continue with Option A (archive-only) for any approved immediate cleanup execution.

Why this path:

- supports Paresh preference to evaluate remove/delete seriously
- does not pretend delete is safe before dependency truth is exported
- preserves non-disruption and governance posture.

## 9. Decision Gates (Must Pass Before Any Future Delete Execution)

All gates mandatory:

1. Candidate allowlist gate
   - exact tenant ID/slug list approved by Paresh
   - protected + ambiguous lanes excluded by policy

2. Dependency export gate
   - per-tenant dependency report across tenant/org graph
   - explicit pass/fail classification: DELETE_BLOCKED vs DELETE_POSSIBLE

3. Evidence retention gate
   - required audit/reasoning/lifecycle evidence snapshot retained before remove
   - retention location and operator ownership recorded

4. Execution safety gate
   - dry-run first, zero-write verification
   - irreversible execution only for DELETE_POSSIBLE subset
   - full operation audit log emitted

5. Post-action verification gate
   - verify no protected tenants changed
   - verify no unintended data-domain regressions
   - attach reconciliation artifact.

## 10. Explicit Non-Actions in This Unit

Confirmed no mutation occurred:

- no runtime archive action
- no runtime delete/remove action
- no DB SQL mutation
- no Prisma mutation command
- no endpoint implementation
- no test tenant state change

## 11. Final Verdict

DELETE_FEASIBILITY_REQUIRES_RUNTIME_DATA_EXPORT
