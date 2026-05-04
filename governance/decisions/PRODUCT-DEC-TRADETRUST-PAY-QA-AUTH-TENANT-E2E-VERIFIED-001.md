# PRODUCT-DEC-TRADETRUST-PAY-QA-AUTH-TENANT-E2E-VERIFIED-001

## Decision Type
QA Verification Record — TradeTrust Pay Unit 4: Tenant-Plane E2E with QA Auth Fixture

## Date
2026-05-04

## Status
VERIFIED — with findings recorded

---

## Context

Unit 4 of TradeTrust Pay QA verification required executing E2E API checks against
the six TTP routes under a controlled `ttp_enabled` flag toggle, using dedicated QA
auth fixture users seeded in a prior step (commit `b721947`).

---

## QA Sentinel UUIDs

| Role            | UUID                                     |
|-----------------|------------------------------------------|
| QA Seller Tenant | ee000000-0000-0000-0000-000000000001   |
| QA Buyer Tenant  | ee000000-0000-0000-0000-000000000002   |
| QA Trade         | ee000000-0000-0000-0000-000000000010   |
| QA ACTIVE VPC    | ee000000-0000-0000-0000-000000000050   |
| QA ROUTING_READY | ee000000-0000-0000-0000-000000000051   |
| QA Seller User   | ee000000-0000-0000-0000-000000000101   |
| QA Buyer User    | ee000000-0000-0000-0000-000000000102   |
| QA Seller Membership | ee000000-0000-0000-0000-000000000201 |
| QA Buyer Membership  | ee000000-0000-0000-0000-000000000202 |

---

## Evidence

### § AUTH-SEED (prior session, commit b721947)

```
BEGIN
DO                         ← activation gate: ttp_enabled=false ✓
INSERT 0 1                 ← §AUTH-1: seller user ee...0101
INSERT 0 1                 ← §AUTH-2: buyer user ee...0102
INSERT 0 1                 ← §AUTH-3: seller membership OWNER
INSERT 0 1                 ← §AUTH-4: buyer membership OWNER
COMMIT

Memberships post-verify:
ee000000-0000-0000-0000-000000000201 | ee...0101 | ee...0001 | OWNER
ee000000-0000-0000-0000-000000000202 | ee...0102 | ee...0002 | OWNER
(2 rows)
```

### § LOGIN

```
SELLER LOGIN: success=True userId=ee000000-0000-0000-0000-000000000101 role=TENANT tokenLen=256
BUYER  LOGIN: success=True userId=ee000000-0000-0000-0000-000000000102 role=TENANT tokenLen=256
```

### § PRE-ENABLE 503 CHECK (ttp_enabled=false)

```
PRE-ENABLE 503 CHECK: HTTP 503 (PASS if 503)
```
Result: **PASS**

### § ENABLE ttp_enabled=true

```
UPDATE 1
enable_timestamp: 2026-05-04 10:39:55.188581+00
key: ttp_enabled
enabled: t
```

### § E2E CHECKS (ttp_enabled=true)

| Check | Endpoint | Actor | HTTP | Result |
|-------|----------|-------|------|--------|
| E2E-01 | GET /api/tenant/trades/:id/ttp-summary | seller | **500** | FINDING — server error |
| E2E-02 | GET /api/tenant/trades/:id/ttp-enrollment | seller | **200** | PASS |
| E2E-03 | POST /api/tenant/trades/:id/ttp-enrollment | seller | **201** | PASS (enrollment created) |
| E2E-04 | GET /api/tenant/trades/:id/ttp-summary | buyer | **404** | FINDING — not found for buyer context |

### § RESTORE ttp_enabled=false

```
UPDATE 1
restore_timestamp: 2026-05-04 10:42:24.275642+00
key: ttp_enabled
enabled: f
```

### § POST-RESTORE 503 CHECK

```
POST-RESTORE 503 CHECK: HTTP 503 (PASS if 503)
```
Result: **PASS**

---

## Findings

### FINDING-01: E2E-01 ttp-summary returns HTTP 500 (seller)

- **Endpoint:** `GET /api/tenant/trades/ee000000-0000-0000-0000-000000000010/ttp-summary`
- **Actor:** seller (QA user ee...0101, tenant ee...0001)
- **Observed:** HTTP 500 Internal Server Error
- **Assessment:** The `ttp-summary` handler crashes when called against the QA
  sentinel trade. This may indicate the handler expects related data (e.g.
  enrollment record or ttp_eligibility link) that was not pre-seeded, or a
  query on the QA trade returns an unexpected shape. This is a separate defect
  from the activation-gate behaviour (503 ↔ flag=false works correctly).
- **Action required:** Server-side investigation of the ttp-summary handler for
  error path; does not block gate verification.

### FINDING-02: E2E-04 ttp-summary returns HTTP 404 (buyer)

- **Endpoint:** `GET /api/tenant/trades/ee000000-0000-0000-0000-000000000010/ttp-summary`
- **Actor:** buyer (QA user ee...0102, tenant ee...0002)
- **Observed:** HTTP 404 Not Found
- **Assessment:** The buyer tenant (ee...0002) is not the owner of the trade
  (ee...0010) — trade ownership sits with the seller tenant. The 404 likely
  reflects correct authorization / scoping behaviour: a buyer cannot read the
  seller's ttp-summary by tradeId alone. This may be by-design; requires
  product confirmation.
- **Action required:** Product review of buyer-facing ttp-summary access pattern.

---

## Activation Gate Verification Summary

| Check | Expected | Observed | Result |
|-------|----------|----------|--------|
| 503 when flag=false (pre-enable) | 503 | 503 | **PASS** |
| Routes accessible when flag=true | non-503 | E2E-02: 200, E2E-03: 201 | **PASS** |
| 503 restored when flag=false | 503 | 503 | **PASS** |
| Final DB state | ttp_enabled=false | ttp_enabled=false | **PASS** |

The **activation gate (Unit 1 through Unit 4)** is verified as operational.
The two findings (E2E-01 HTTP 500, E2E-04 HTTP 404) are logged for follow-up
investigation and do not invalidate the gate mechanism itself.

---

## Final DB State

```
key: ttp_enabled
enabled: false
restore_timestamp: 2026-05-04 10:42:24.275642+00
```

---

## Related Commits

- `d1a8403` — Unit 1: activation gate implementation
- `374ac27` — Unit 1: production verification (6 routes → 503)
- `4453001` — Unit 2: QA seed SQL + governance
- `63ba20e` — Unit 2: blocked execution record
- `a950bbc` — Unit 2B: execute QA seed + verification
- `89859bd` — Unit 3: E2E activation readiness
- `b721947` — Unit 4: qa-ttp-auth-seed.sql artifact

---

## Governance Review

- Schema changes: N/A
- Migration: N/A
- RLS policy: N/A
- Secrets: none printed
- Allowlisted files modified: this file only
