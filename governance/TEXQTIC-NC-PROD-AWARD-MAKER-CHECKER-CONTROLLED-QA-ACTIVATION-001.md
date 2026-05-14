# TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001

## 1. Packet Metadata

| Field | Value |
|---|---|
| **Prompt ID** | TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001 |
| **Document Type** | CONTROLLED_QA_ACTIVATION_REPORT |
| **Final Status** | `VERIFIED_COMPLETE` |
| **Date** | 2026-05-14 |
| **Authorized by** | Paresh Patel |
| **Executed by** | Governance agent |
| **Scope** | QA fixture only — `qa-b2b` (owner/maker) / `qa.buyer@texqtic.com` (checker) |
| **Feature flags touched** | `nc.procurement_pools.supplier_quotes.enabled`, `nc.procurement_pools.rfq.award.enabled` |
| **Flag state after packet** | Both `false` — RESTORED (Phase G, `2026-05-14 01:50:05 UTC`) |
| **Source files changed** | NONE |
| **Schema / migration files changed** | NONE |
| **Test files changed** | NONE |
| **Env files changed** | NONE |
| **Production data mutated** | Approval `db01d0e3` → APPROVED; Quote `2ac70ff6` → ACCEPTED; RFQ `55eb2858` → ACCEPTED; Pool `74436ecd` → ACCEPTED (lifecycle); signature row inserted |
| **Non-QA tenant data touched** | NONE |
| **Packet 17 opened** | NO — HOLD_FOR_PARESH_DECISION unchanged |
| **G-022 opened** | NO — HOLD_FOR_PARESH_DECISION unchanged |
| **DPP posture** | HOLD_FOR_PARESH_DECISION — UNCHANGED |
| **Git HEAD** | `43afba46289bc6a50dd8bd428cd382bc15f95176` (commit `43afba4`) |
| **Prerequisite commits confirmed** | `43afba4`, `511ac0a`, `b5750d3`, `a1270a9`, `8d10fdf`, `ef3133f` |

---

## 2. Objective

Verify the complete **RFQ Award Maker-Checker** flow in production:

1. **Same-actor negative guard** (Phase D): Confirm the maker cannot approve their own
   award request (HTTP 409 `MAKER_CHECKER_SAME_ACTOR`).
2. **Checker approval positive path** (Phase E): A distinct checker user (`qa.buyer@texqtic.com`,
   ADMIN role in org) can approve the award, yielding `approval.status=APPROVED`,
   `quote.status=ACCEPTED`.
3. **DB state verification** (Phase F): Confirm the `approval_signatures.decision` column
   received `'APPROVE'` (not `'APPROVED'`), satisfying the `approval_signatures_decision_check`
   constraint — the core bug fixed in commit `43afba4`.
4. **Flag safety** (Phase G): Restore both feature flags to `false` after verification.

**Root cause being verified:** Commit `43afba4` fixed a constraint violation where the service
was writing `decision='APPROVED'` (rejected by `CHECK (decision IN ('APPROVE','REJECT'))`).
After the fix, the service correctly writes `'APPROVE'`/`'REJECT'`.

---

## 3. QA Fixture Reference Data

| Item | Value |
|---|---|
| Pool ID | `74436ecd-2bfc-46c1-a904-d6aac5df26c9` |
| Pool name | `75/36 SD POLY YARN - RELIANCE` |
| Owner org | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` (`qa-b2b`) |
| RFQ ID | `55eb2858-53ef-4287-ae75-bb7165e36da6` |
| Quote ID | `2ac70ff6-4cb9-4053-b20a-84a704ff5826` |
| Quote ref | `SQ-639D77622A92476C` |
| Quote amount | `1250 USD` |
| **Approval ID** | `db01d0e3-f079-4fb4-ac4a-7a4d6509e193` |
| Approval expires | `2026-05-16T17:47:18.955Z` |
| Maker user_id | `ac6d2d3f-efea-4dd4-bb38-2a622a96421d` |
| Maker email | `qa.b2b@texqtic.com` |
| Maker role | `OWNER` in `faf2e4a7` |
| Checker user_id | `b80f0cab-c236-4649-bdc9-7dfddf2240f7` |
| Checker email | `qa.buyer@texqtic.com` |
| Checker role | `ADMIN` in `faf2e4a7` |
| Signature ID (created) | `be343be5-0b36-4a91-bc8c-f5acee82d0d2` |

---

## 4. Pre-flight Checks (All PASS)

| Check | Status | Evidence |
|---|---|---|
| Git HEAD = origin/main = `43afba4` | ✅ | `43afba46289bc6a50dd8bd428cd382bc15f95176` |
| Working tree clean | ✅ | `git status --short` — no changes |
| All prerequisite commits present | ✅ | `43afba4`, `511ac0a`, `b5750d3`, `a1270a9`, `8d10fdf`, `ef3133f` |
| Production health check | ✅ | `GET /health` → HTTP 200 |
| DB timestamp | ✅ | `2026-05-14 01:36:14.238089+00` |
| Feature flags BEFORE activation | ✅ | Both `false` |
| `approval_signatures_decision_check` constraint | ✅ | `CHECK (decision IN ('APPROVE','REJECT'))` confirmed |
| `pending_approvals_entity_type_check` constraint | ✅ | `CHECK (entity_type IN ('TRADE','ESCROW','CERTIFICATION','POOL'))` confirmed |
| Maker membership | ✅ | `ac6d2d3f` = OWNER in `faf2e4a7` |
| Checker membership | ✅ | `b80f0cab` = ADMIN in `faf2e4a7` |
| Pool state | ✅ | `QUOTED` |
| RFQ state | ✅ | `QUOTED` |
| Quote state | ✅ | `SUBMITTED` |
| Approval pre-state | ✅ | `db01d0e3` = `REQUESTED`, no signatures |

---

## 5. Activation

| Step | Action | Result | Timestamp |
|---|---|---|---|
| Activation | `nc.procurement_pools.supplier_quotes.enabled` → `true` | `UPDATE 1` confirmed | `2026-05-14 01:37:22.012574+00` |
| Activation | `nc.procurement_pools.rfq.award.enabled` → `true` | `UPDATE 1` confirmed | `2026-05-14 01:37:22.012574+00` |

---

## 6. Verification Phases

### Phase A — Smoke Check
| Call | Result | Status |
|---|---|---|
| `GET /api/tenant/network-commerce/pools/74436ecd.../rfq/55eb2858.../award-approvals` (maker auth) | HTTP 200; returns `db01d0e3` in list | ✅ |

### Phase B — Quote Readiness
| Check | Result | Status |
|---|---|---|
| Quote `2ac70ff6` state | `SUBMITTED`; no accepted_at / rejected_at | ✅ |

### Phase C — Approval Reuse Readiness
| Check | Result | Status |
|---|---|---|
| Approval `db01d0e3` | `REQUESTED`; not expired; no signatures | ✅ |

### Phase D — Same-Actor Negative Guard
| Call | Result | Status |
|---|---|---|
| `POST .../award-approvals/db01d0e3.../approve` (maker auth = `qa.b2b@texqtic.com`) | **HTTP 409** `MAKER_CHECKER_SAME_ACTOR` | ✅ |
| Post-D verification: approval `db01d0e3` state | Still `REQUESTED` — not mutated | ✅ |

**Phase D evidence:**
```json
{
  "status": 409,
  "body": {
    "success": false,
    "error": {
      "code": "MAKER_CHECKER_SAME_ACTOR",
      "message": "Maker-checker separation violation: the checker cannot be the same user as the maker."
    }
  }
}
```

### Phase E — Checker Approval (Positive Path)
| Call | Result | Status |
|---|---|---|
| `POST /api/auth/login` (checker `qa.buyer@texqtic.com`, `tenantId=faf2e4a7`) | HTTP 200; token length 256 | ✅ |
| `POST .../award-approvals/db01d0e3.../approve` (checker auth) | **HTTP 200** `success:true` | ✅ |
| `approval.status` in response | `APPROVED` | ✅ |
| `quote.status` in response | `ACCEPTED` | ✅ |

**Phase E evidence:**
```json
{
  "approveStatus": 200,
  "success": true,
  "approvalStatus": "APPROVED",
  "quoteStatus": "ACCEPTED",
  "approvalId": "db01d0e3-f079-4fb4-ac4a-7a4d6509e193"
}
```

### Phase F — DB State Verification (psql)

**F1: Quote final state**
```
                  id                  |  status  |        accepted_at         | rejected_at
--------------------------------------+----------+----------------------------+-------------
 2ac70ff6-4cb9-4053-b20a-84a704ff5826 | ACCEPTED | 2026-05-14 01:48:30.046+00 |
(1 row)
```
Result: `ACCEPTED`, `accepted_at` NOT NULL ✅

**F2: RFQ status**
```
                  id                  |  status
--------------------------------------+----------
 55eb2858-53ef-4287-ae75-bb7165e36da6 | ACCEPTED
(1 row)
```
Result: `ACCEPTED` ✅

**F3: Pool lifecycle state**
```
                  id                  | state_key
--------------------------------------+-----------
 74436ecd-2bfc-46c1-a904-d6aac5df26c9 | ACCEPTED
(1 row)
```
Result: `ACCEPTED` ✅

**F4: Approval status**
```
                  id                  |  status
--------------------------------------+----------
 db01d0e3-f079-4fb4-ac4a-7a4d6509e193 | APPROVED
(1 row)
```
Result: `APPROVED` ✅

**F5: Signature record — CORE CONSTRAINT VERIFICATION**
```
                  id                  |             approval_id              | decision |            signer_user_id            |         created_at
--------------------------------------+--------------------------------------+----------+--------------------------------------+----------------------------
 be343be5-0b36-4a91-bc8c-f5acee82d0d2 | db01d0e3-f079-4fb4-ac4a-7a4d6509e193 | APPROVE  | b80f0cab-c236-4649-bdc9-7dfddf2240f7 | 2026-05-14 01:48:35.049+00
(1 row)
```
- `decision = 'APPROVE'` — **constraint `approval_signatures_decision_check` satisfied** ✅
- `signer_user_id = 'b80f0cab...'` = checker (not maker) ✅
- Maker-checker separation confirmed: different users ✅

**F6: Other quotes (must remain SUBMITTED or absent)**
```
 id | status
----+--------
(0 rows)
```
No other quotes for same RFQ ✅

---

## 7. Phase G — Flag Restoration (CRITICAL SAFETY INVARIANT)

```sql
UPDATE public.feature_flags SET enabled = false, updated_at = NOW()
WHERE key IN ('nc.procurement_pools.supplier_quotes.enabled', 'nc.procurement_pools.rfq.award.enabled');
```

**Result:**
```
UPDATE 2
                     key                      | enabled |          updated_at
----------------------------------------------+---------+-------------------------------
 nc.procurement_pools.rfq.award.enabled       | f       | 2026-05-14 01:50:05.065438+00
 nc.procurement_pools.supplier_quotes.enabled | f       | 2026-05-14 01:50:05.065438+00
(2 rows)
```

Both flags restored to `false` ✅ — Safety invariant satisfied.

---

## 8. Summary Verdict

| Phase | Description | Result |
|---|---|---|
| Pre-flight | All constraints, data, membership, and flag checks | ✅ PASS |
| Activation | Both flags → `true` | ✅ DONE |
| Phase A | Smoke: approval list returns correctly | ✅ PASS |
| Phase B | Quote readiness | ✅ PASS |
| Phase C | Approval reuse readiness | ✅ PASS |
| Phase D | Same-actor negative guard (HTTP 409) | ✅ PASS |
| Phase E | Checker approval (HTTP 200, APPROVED) | ✅ PASS |
| Phase F | DB state: quote ACCEPTED, RFQ ACCEPTED, pool ACCEPTED, signature `APPROVE` | ✅ PASS |
| Phase G | Feature flags restored to `false` | ✅ DONE |

**Overall: `VERIFIED_COMPLETE`**

The Award Maker-Checker E2E flow is confirmed working in production. The `approval_signatures_decision_check`
constraint (fixed in commit `43afba4`) is satisfied: `decision='APPROVE'` is written correctly.
Maker-checker separation is enforced: same-actor attempt returns HTTP 409; distinct checker
successfully advances approval to APPROVED and quote to ACCEPTED.

---

## 9. Standing Constraints (Unchanged)

| Constraint | Status |
|---|---|
| DPP posture | `HOLD_FOR_PARESH_DECISION` — unchanged |
| Packet 17 | NOT opened — unchanged |
| G-022 | NOT opened — unchanged |
| Non-QA tenant data | NOT touched |
| Source / schema / env files | NOT modified |
