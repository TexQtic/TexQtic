# TEXQTIC-NC-QA-B2B-CHECKER-USER-PROVISIONING-001

**Packet type:** Controlled production QA prerequisite provisioning  
**Date:** 2026-05-13  
**Status:** CHECKER_PROVISIONED_COMPLETE  
**Governed by:** G-021 maker-checker rules  
**Authored by:** Copilot (Paresh Patel — TexQtic operator)

---

## Purpose

Resolve the blocker for:
`TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001`

The `qa-b2b` tenant had only one member (`qa.b2b@texqtic.com`, role OWNER).
The G-021 maker-checker award approval requires maker ≠ checker (same-actor guard enforced at DB layer via `trg_check_maker_checker_separation` and at service layer via `assertMakerCheckerSeparated`).
A second member with ADMIN or OWNER role is required in `qa-b2b` to serve as checker.

---

## Pre-flight Evidence

```
git status --short: (clean tree)
git log --oneline HEAD: a1270a9 (HEAD -> main, origin/main)
git rev-parse HEAD:        a1270a9dbd3104b601550669ad088125546f233b
git rev-parse origin/main: a1270a9dbd3104b601550669ad088125546f233b
```

---

## Candidate Evaluation

### Preferred: `qa.buyer@texqtic.com`

| Check | Result |
|---|---|
| Exists in `public.users` | ✅ user_id = `b80f0cab-c236-4649-bdc9-7dfddf2240f7` |
| user_id ≠ maker user_id `ac6d2d3f` | ✅ |
| Not a supplier account | ✅ (buyer tenant OWNER, `qa-buyer` slug) |
| Not already in `qa-b2b` | ✅ (single existing membership: `qa-buyer` OWNER) |
| Route accepts ADMIN role | ✅ approve route: `!userRole.includes('ADMIN') && userRole !== 'OWNER'` |
| Unique constraint safe | ✅ no (user_id, tenant_id) pair exists yet for `qa-b2b` |

**Decision:** Use `qa.buyer@texqtic.com` with role `ADMIN` (preferred per packet spec — route accepts ADMIN, no OWNER required).

---

## Mutation Performed

**Single controlled INSERT into `public.memberships`:**

```
INSERT INTO public.memberships (id, user_id, tenant_id, role, created_at, updated_at)
VALUES (gen_random_uuid(), 'b80f0cab-...', 'faf2e4a7-...', 'ADMIN'::membership_role, now(), now())

RETURNING:
  id          = 5c91c817-3f9d-4a3c-81ca-0cd655d810c0
  user_id     = b80f0cab-c236-4649-bdc9-7dfddf2240f7
  tenant_id   = faf2e4a7-5d79-4b00-811b-8d0dce4f4d80
  role        = ADMIN
  created_at  = 2026-05-13 16:42:52.9538+00
```

No other tables touched.

---

## Post-Add Validation

### 1. `qa-b2b` memberships (confirmed 2 members)

| email | user_id | role | membership_id |
|---|---|---|---|
| qa.b2b@texqtic.com | ac6d2d3f-efea-4dd4-bb38-2a622a96421d | OWNER | 1154f395-c3eb-4a4c-976d-7c5149cc4be0 |
| qa.buyer@texqtic.com | b80f0cab-c236-4649-bdc9-7dfddf2240f7 | ADMIN | 5c91c817-3f9d-4a3c-81ca-0cd655d810c0 |

**maker user_id:** `ac6d2d3f-efea-4dd4-bb38-2a622a96421d`  
**checker user_id:** `b80f0cab-c236-4649-bdc9-7dfddf2240f7`  
**maker ≠ checker:** ✅ different UUIDs

### 2. Feature flags (unchanged — fail-closed)

| key | enabled |
|---|---|
| nc.procurement_pools.rfq.award.enabled | **f** |
| nc.procurement_pools.supplier_quotes.enabled | **f** |

### 3. Quote / RFQ / Pool / Approval state (unchanged)

| entity | id | state |
|---|---|---|
| POOL | 74436ecd-2bfc-46c1-a904-d6aac5df26c9 | CLOSED_FOR_BIDS |
| RFQ | 55eb2858-53ef-4287-ae75-bb7165e36da6 | QUOTED |
| QUOTE | 2ac70ff6-4cb9-4053-b20a-84a704ff5826 | SUBMITTED / amount=1250.00 / accepted_at=null |
| PENDING_APPROVALS | entity_id=quote above | 0 rows |
| APPROVAL_SIGNATURES | — | 0 rows |

---

## Key Identity Table (carry-forward to MC-5)

| Item | Value |
|---|---|
| Owner tenant slug | `qa-b2b` |
| Owner tenant_id / org_id | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` |
| **Maker email** | `qa.b2b@texqtic.com` |
| **Maker user_id** | `ac6d2d3f-efea-4dd4-bb38-2a622a96421d` |
| **Checker email** | `qa.buyer@texqtic.com` |
| **Checker user_id** | `b80f0cab-c236-4649-bdc9-7dfddf2240f7` |
| Checker role in qa-b2b | ADMIN |
| maker ≠ checker | ✅ confirmed |

---

## Mutations NOT Performed

- feature_flags: not touched
- network_pool_rfq_supplier_quotes: not touched
- network_pool_rfqs: not touched
- network_pools: not touched
- pending_approvals: not touched
- approval_signatures: not touched
- schema.prisma: not touched
- migrations: not touched
- .env: not touched
- source files: not touched

---

## MC-5 Blocker Resolution

The blocker for `TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001` is resolved.

`qa-b2b` now has two members with distinct user_ids and roles capable of fulfilling the
maker-checker requirement. The same-actor guard remains intact — checker approval by
`qa.b2b@texqtic.com` (maker) will still be rejected by the service layer.

MC-5 can now proceed once Paresh authorizes feature flag activation.

---

## Commit

`docs(network-commerce): provision qa checker prerequisite`
