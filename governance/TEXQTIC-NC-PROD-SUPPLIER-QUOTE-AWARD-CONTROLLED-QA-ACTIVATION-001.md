# TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001

## 1. Packet Metadata

| Field | Value |
|---|---|
| **Prompt ID** | TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001 |
| **Document Type** | CONTROLLED_QA_ACTIVATION_REPORT |
| **Final Status** | `PARTIAL_VERIFIED_BLOCKED_BY_MAKER_CHECKER_DESIGN` |
| **Date** | 2026-05-13 |
| **Authorized by** | Paresh Patel |
| **Executed by** | Governance agent |
| **Scope** | QA fixture only — `qa-b2b` (owner) / `qa-knt-b` (supplier) tenants |
| **Feature flags touched** | `nc.procurement_pools.supplier_quotes.enabled`, `nc.procurement_pools.rfq.award.enabled` |
| **Flag state after packet** | Both `false` — RESTORED (see §7) |
| **Source files changed** | NONE |
| **Schema / migration files changed** | NONE |
| **Test files changed** | NONE |
| **Env files changed** | NONE |
| **Production data mutated** | Supplier quote SUBMITTED (1 row); RFQ status advanced to QUOTED (1 row); pool state CLOSED_FOR_BIDS (unchanged — SM advance not completed); no award/acceptance |
| **Non-QA tenant data touched** | NONE |
| **Packet 17 opened** | NO — HOLD_FOR_PARESH_DECISION unchanged |
| **FE-10 opened** | NO — HOLD_FOR_PARESH_DECISION unchanged |
| **DPP posture** | HOLD_FOR_PARESH_DECISION — UNCHANGED |

---

## 2. Objective

Temporarily activate both `nc.procurement_pools.supplier_quotes.enabled` and
`nc.procurement_pools.rfq.award.enabled` on the QA fixture (qa-b2b / qa-knt-b), verify the full
supplier-quote-to-owner-award path end-to-end, then restore both flags to `false`.

**Purpose:** Confirm the full NC Phase 1C + 1D technical path is wired correctly in production
before any commercial flag activation decision (QD-6 lift) is made.

---

## 3. QA Fixture Reference Data

| Item | Value |
|---|---|
| Pool ID | `74436ecd-2bfc-46c1-a904-d6aac5df26c9` |
| Owner org | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` (`qa-b2b`) |
| Owner email | `qa.b2b@texqtic.com` |
| RFQ ID | `55eb2858-53ef-4287-ae75-bb7165e36da6` |
| RFQ ref | `b3abfbdb-883c-4c60-af7b-4449631033dc` |
| RFQ status at start | `ISSUED` (pool → `CLOSED_FOR_BIDS`) |
| RFQ status after activation | `QUOTED` (advanced by quote submission) |
| Pool state after activation | `CLOSED_FOR_BIDS` (SM advance to QUOTED halted — award accept failed) |
| QA supplier org | `qa-knt-b` |
| Supplier org_id | `83af5463-cc19-46d4-bbb9-8aed27d20d15` |
| Supplier email | `qa.supplier.knt.b@texqtic.com` |
| Invite ID | `e65b7360-aefe-4dd1-b052-71ad62c87203` |
| Invite ref | `ce0671d3-388a-4a55-8e9c-b6ee47985f81` |
| Invite status | `ACCEPTED` (2026-05-13T09:34:02.457Z) |
| Quote ID | `2ac70ff6-4cb9-4053-b20a-84a704ff5826` |
| Quote ref | `SQ-639D77622A92476C` |
| Quote amount | `1250 USD` |
| Quote status | `SUBMITTED` (2026-05-13T09:44:09.952Z) |
| Quote `accepted_at` | `NULL` |
| Quote `rejected_at` | `NULL` |
| Git HEAD at time of activation | `7bcb4ad` |

---

## 4. Activation Timeline

| Step | Action | Result | Timestamp |
|---|---|---|---|
| Pre-check | DB: both flags confirmed `false`; quote count = 0; invite pre-existed in OPEN/ACCEPTED state | PASS | — |
| Pre-check | `git status --short` clean, HEAD=`7bcb4ad` | PASS | — |
| Step 1 | Supplier accepted invite (`e65b7360`) | `ACCEPTED` — invite_status confirmed | 2026-05-13T09:34:02.457Z |
| Step 2 | `nc.procurement_pools.supplier_quotes.enabled` → `true` | `UPDATE 1` confirmed | 2026-05-13 |
| Step 2 | `nc.procurement_pools.rfq.award.enabled` → `true` | `UPDATE 1` confirmed | 2026-05-13 |
| Step 3A | Supplier POSTed quote via `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` | **HTTP 201** — quote `2ac70ff6` created, `SUBMITTED`, RFQ advanced to `QUOTED` | 2026-05-13T09:44:09.952Z |
| Step 3B | Owner attempted award via `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept` | **HTTP 422** `INVALID_TRANSITION` — PENDING_APPROVAL from state machine maker-checker gate | 2026-05-13 |
| Rollback | Both flags restored to `false` via `UPDATE feature_flags SET enabled=false WHERE flag_key IN (...)` | `UPDATE 2` confirmed | 2026-05-13 |
| Post-check | DB: both flags `false`; quote status `SUBMITTED`; `accepted_at=NULL`; `rejected_at=NULL`; MC rule intact | PASS | 2026-05-13 |

---

## 5. What Was Verified

### 5A — Supplier Quote Path: VERIFIED

- Feature gate `ncPoolSupplierQuoteFeatureGateMiddleware` correctly passes request when
  `nc.procurement_pools.supplier_quotes.enabled = true`.
- `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` returned HTTP 201.
- Quote row created in `network_pool_rfq_supplier_quotes`:
  - `id = 2ac70ff6`, `quote_ref = SQ-639D77622A92476C`
  - `status = SUBMITTED`, `quote_amount = 1250`, `currency = USD`
  - `owner_org_id = faf2e4a7`, `supplier_org_id = 83af5463`
  - `invite_id = e65b7360`
- RFQ status advanced from `ISSUED` to `QUOTED` by the quote submission service.
- Quote submission technical path: **VERIFIED end-to-end**.

### 5B — Award Feature Gate: VERIFIED (reachable, not completable)

- Feature gate `ncPoolRfqAwardFeatureGateMiddleware` correctly passes request when
  `nc.procurement_pools.rfq.award.enabled = true`.
- `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept` reached
  the service layer (`NetworkPoolRfqService.acceptQuote()`).
- Award endpoint is wired, authenticated, and feature-gate-passes when flag is `true`.
- Award accept was NOT completed due to state machine maker-checker gate (see §6).

### 5C — Feature Gate Enforcement: VERIFIED

- Both routes correctly block with `503 FEATURE_DISABLED` when flags are `false`.
- Both routes correctly allow through when flags are `true`.

---

## 6. Maker-Checker Blocker Analysis

### 6.1 Error Observed

```
HTTP 422 INVALID_TRANSITION
{
  "error": "INVALID_TRANSITION",
  "message": "State transition QUOTED → ACCEPTED requires PENDING_APPROVAL"
}
```

### 6.2 Root Cause

The `allowed_transitions` table contains:

```sql
entity_type = 'POOL'
from_state_key = 'QUOTED'
to_state_key = 'ACCEPTED'
requires_maker_checker = true
```

`StateMachineService.transition()` logic:
- When `allowedTransition.requiresMakerChecker = true` AND `actorType !== 'CHECKER'`
- Returns `{ status: 'PENDING_APPROVAL', requiredActors: ['MAKER', 'CHECKER'], ... }`

`NetworkPoolRfqService.acceptQuote()` calls the SM with `actorType: 'TENANT_ADMIN'` (hardcoded).
Since `'TENANT_ADMIN' !== 'CHECKER'`, SM returns `PENDING_APPROVAL`.
Service receives `PENDING_APPROVAL`, throws `NetworkPoolRfqTransitionDeniedError`.
Route catches this and returns 422 `INVALID_TRANSITION`.

### 6.3 Governance Classification

This is **correct governance behavior**, not a bug.

The award flow for `POOL QUOTED → ACCEPTED` is designed to require a two-actor MAKER→CHECKER
approval cycle. This approval cycle has not yet been implemented in `acceptQuote()`. The service
currently calls the SM as a single `TENANT_ADMIN` actor. To complete the award E2E, one of the
following design approaches must be chosen and implemented:

1. **Split into two calls**: `requestAward()` (MAKER actor) → `approveAward()` (CHECKER actor)
2. **Single-call bypass**: Modify `allowed_transitions` to `requires_maker_checker = false` for POOL QUOTED→ACCEPTED (would remove the two-actor requirement — requires explicit Paresh decision)
3. **PENDING_APPROVAL entity**: Create a `pending_approvals` entity that records the MAKER submission; a second authenticated call by the CHECKER actor completes the transition

### 6.4 Follow-Up Design Unit Required

`TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001`

This packet must:
- Decide the award approval architecture (split call, bypass, or PENDING_APPROVAL entity)
- Clarify how `NetworkPoolRfqService.acceptQuote()` is restructured
- Define how UI shows PENDING_APPROVAL state (affects FE-9 / FE-10 scope)
- Determine whether `pending_approvals` table is needed and how it interacts with the SM lifecycle
- Confirm whether `allows_transitions` row for POOL QUOTED→ACCEPTED should retain or remove maker-checker requirement

---

## 7. DB Safety Evidence (Post-Rollback, Verified)

### 7.1 Feature Flags (Restored to False)

```sql
SELECT flag_key, enabled FROM feature_flags
WHERE flag_key IN (
  'nc.procurement_pools.supplier_quotes.enabled',
  'nc.procurement_pools.rfq.award.enabled'
);

flag_key                                      | enabled
----------------------------------------------+---------
nc.procurement_pools.rfq.award.enabled        | f
nc.procurement_pools.supplier_quotes.enabled  | f
```

**Both flags confirmed `false`.** Production is in safe state.

### 7.2 Quote State

```sql
SELECT id, quote_ref, status, accepted_at, rejected_at,
       owner_org_id, supplier_org_id
FROM network_pool_rfq_supplier_quotes
WHERE id = '2ac70ff6-4cb9-4053-b20a-84a704ff5826';

id=2ac70ff6, quote_ref=SQ-639D77622A92476C
status=SUBMITTED, accepted_at=NULL, rejected_at=NULL
owner_org_id=faf2e4a7, supplier_org_id=83af5463
```

**Quote is SUBMITTED. No acceptance. No rejection. This is the expected state.**

### 7.3 Pool and RFQ State

```sql
pool_id=74436ecd, pool_state=CLOSED_FOR_BIDS
rfq_id=55eb2858, rfq_status=QUOTED, rfq_ref=b3abfbdb
```

**RFQ advanced to QUOTED (correct — quote was submitted). Pool remains CLOSED_FOR_BIDS (SM advance
to QUOTED was not completed because award accept failed before pool state could advance).**

### 7.4 Maker-Checker Rule (Unchanged)

```sql
SELECT entity_type, from_state_key, to_state_key, requires_maker_checker
FROM allowed_transitions
WHERE entity_type = 'POOL' AND from_state_key = 'QUOTED' AND to_state_key = 'ACCEPTED';

entity_type=POOL, from_state_key=QUOTED, to_state_key=ACCEPTED, requires_maker_checker=true
```

**MC rule is intact and unchanged. No governance invariant was modified.**

---

## 8. Governance Invariants Confirmed

| Invariant | Status |
|---|---|
| `nc.procurement_pools.supplier_quotes.enabled = false` after packet | ✅ CONFIRMED |
| `nc.procurement_pools.rfq.award.enabled = false` after packet | ✅ CONFIRMED |
| No source code changes | ✅ CONFIRMED |
| No schema / migration changes | ✅ CONFIRMED |
| No test file changes | ✅ CONFIRMED |
| No `.env` / environment variable changes | ✅ CONFIRMED |
| No non-QA tenant data touched | ✅ CONFIRMED |
| `allowed_transitions` MC rule for POOL QUOTED→ACCEPTED unchanged (`requires_maker_checker=true`) | ✅ CONFIRMED |
| Quote `accepted_at = NULL` | ✅ CONFIRMED |
| Quote `rejected_at = NULL` | ✅ CONFIRMED |
| No forced SQL to set quote/RFQ/pool to ACCEPTED state | ✅ CONFIRMED |
| Packet 17 (`TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001`) NOT opened | ✅ CONFIRMED |
| FE-10 NOT opened | ✅ CONFIRMED |
| DPP posture = HOLD_FOR_PARESH_DECISION | ✅ CONFIRMED UNCHANGED |
| `git status --short` clean at close | ✅ CONFIRMED |
| `git diff --name-only` shows only governance files in this commit | ✅ CONFIRMED |

---

## 9. What Was NOT Done

- No award acceptance forced or bypassed
- No `allowed_transitions` modification (MC rule preserved)
- No manual SQL to set quote / RFQ / pool to ACCEPTED state
- No non-QA tenant data mutated
- Packet 17 NOT opened
- FE-10 NOT opened
- DPP posture NOT changed
- Commercial / global flag activation NOT performed
- No `prisma migrate dev`, `prisma db push`, or migration commands run
- No source files, schema files, test files, or env files modified

---

## 10. Recommended Next Packet

**`TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001`**

**Purpose:** Design how owner quote award should work with the maker-checker gate on
`POOL QUOTED → ACCEPTED`. Specifically:

1. Decide whether `acceptQuote()` should be split into `requestAward()` (MAKER) +
   `approveAward()` (CHECKER), or whether the transition should be changed to
   `requires_maker_checker = false`.
2. Define the `pending_approvals` entity if a two-actor approach is taken.
3. Specify how the UI surfaces PENDING_APPROVAL state (what FE-9 / FE-10 should show).
4. Clarify how `NetworkPoolRfqService` is restructured.
5. Confirm downstream effects on pool state machine and RFQ status.

**Prerequisites:** None (design-only packet). Does NOT require flag activation.

**Authorization required:** Explicit Paresh decision before opening.

---

## 11. Closure Summary

| Dimension | Result |
|---|---|
| Quote submission technical path | **VERIFIED** — 201, quote created, RFQ advanced to QUOTED |
| Award feature gate technical path | **VERIFIED** — endpoint reachable, service layer reached |
| Award E2E completion | **BLOCKED** — maker-checker gate on POOL QUOTED→ACCEPTED |
| Flag safety | **SAFE** — both flags restored to `false` |
| DB integrity | **INTACT** — no forced state transitions, no invariant violations |
| Governance posture | **MAINTAINED** — QD-6 hold respected, DPP unchanged |
| Maker-checker design decision | **DEFERRED** — `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001` |

**Final Status:** `PARTIAL_VERIFIED_BLOCKED_BY_MAKER_CHECKER_DESIGN`

---

*Document created: 2026-05-13 — TexQtic governance corpus, main branch.*
*Authorized by: Paresh Patel.*
*This packet does not authorize any implementation. Award E2E completion requires TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 and explicit Paresh authorization.*
