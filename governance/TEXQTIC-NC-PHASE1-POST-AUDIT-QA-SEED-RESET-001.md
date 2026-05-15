# TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001

**Type:** QA Fixture Normalization — Governance / Tooling Only  
**Status:** IMPLEMENTED_AWAITING_PARESH_VERIFY  
**Date:** 2026-07-06  
**Author:** Automated governance agent, TexQtic repo  
**Mode:** REPO-TRUTH VALIDATION + QA FIXTURE NORMALIZATION — NO PRODUCT IMPLEMENTATION

---

## 1. Objective

Create a clean, stable, explicitly labeled post-Phase-1 QA fixture seed script for Network
Commerce / Collective Procurement Pools (P17–P21). The fixture script:

- Covers the Phase 1 CPP entity chain (pool → membership → demand line → snapshot →
  snapshot line → RFQ → invite → invoice → settlement split → lifecycle log)
- Is authorization-gated (`PARESH_AUTHORIZED=true` env var required before execution)
- Is idempotent (all steps detect existing rows and skip cleanly)
- Does NOT activate any feature flags
- Does NOT open any new product packets
- Does NOT touch schema, migrations, frontend, or `.env` files
- Does NOT create lifecycle log rows by default (G-020 compliance — opt-in only)

This work supports the post-Phase-1 operational state while TradeTrust Pay legal counsel
review is pending.

---

## 2. Layer 0 State at Time of Work

```yaml
active_delivery_unit: HOLD_FOR_AUTHORIZATION
active_delivery_unit_status: HOLD_FOR_AUTHORIZATION
last_closed_unit: TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001
last_closed_unit_status: LEGAL_PACKET_UPGRADED_READY_FOR_COUNSEL (2026-07-06)
next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK
ttp_enabled: false
all_nc_feature_flags: UNCHANGED
```

No implementation packets are open. All governance holds confirmed unchanged.

---

## 3. Repo-Truth Findings

Full repo-truth inspection of Packets 17–21 integration tests + shared seed helpers revealed
the following authoritative findings:

### Finding 1 — No NC Phase 1 QA fixture seed script existed

`server/scripts/qa/current-db-multi-segment-qa-seed.ts` covers 7 general multi-segment QA
tenants (qa-knt-b, qa-dye-c, qa-gmt-d, qa-buyer-a, qa-buyer-c, qa-svc-tst-a,
qa-svc-log-b). It contains no Network Commerce Phase 1 entities.

### Finding 2 — All P17–P21 integration tests use ephemeral self-contained fixtures

Every packet test (67 poolRfq, 64 pools, 12 invoices, 22 settlement, 20 lifecycle log) uses
a fully self-contained beforeAll / beforeEach / afterEach / afterAll fixture pattern. No
static NC org data is consumed from any external seed script.

### Finding 3 — Fixture strategy is consistent and mature

All tests follow the 4-phase pattern:
- `beforeAll`: create org (tenant + organizations rows), create pool + downstream entities
- `beforeEach`: per-test snapshot (where state is mutable)
- `afterEach`: soft cleanup
- `afterAll`: hard delete via `prisma.$executeRaw` (RLS bypass via `withBypassForSeed`)

### Finding 4 — `hasDb` guard is the sole DB gating mechanism

```typescript
// server/src/__tests__/helpers/dbGate.ts
export const hasDb = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
);
```

Integration tests skip cleanly when `DATABASE_URL` is absent.

### Finding 5 — G-020 append-only constraint confirmed

`NetworkLifecycleLog` rows are permanent. Integration test teardown does **not** delete them.
Any QA fixture execution that creates lifecycle log rows will leave permanent rows.
The seed script therefore does NOT create lifecycle log rows by default.

### Finding 6 — Feature flag state preservation confirmed

All integration tests verify feature flag state. All flags are in the correct state:
`nc.procurement_pools.enabled=true`, `rfq.enabled=true`, `supplier_invites.enabled=true`;
`nc.procurement_pools.supplier_quotes.enabled=false`, `rfq.award.enabled=false`,
`nc.settlement_waterfall.enabled=false`. None are changed by any QA seed script.

### Finding 7 — No stale or orphaned NC QA fixtures found

No existing static NC QA data exists in the remote Supabase DB beyond what the integration
tests created ephemerally. The baseline is clean.

### Finding 8 — `organizations` table requires explicit row creation (not automatic)

The `organizations` model uses the same UUID as the `tenants` row. Creating a tenant does NOT
automatically create an organizations row. The authoritative pattern (from
`current-db-multi-segment-qa-seed.ts` Block 2) is:

```typescript
await prisma.tenant.upsert({ where: { slug }, create: { id, slug, name, type, ... }, ... });
await prisma.organizations.upsert({ where: { id }, create: { id, slug, legal_name, ... }, ... });
```

`NetworkPool.orgId` references `organizations.id`, NOT `tenants.id`. Any seed or test that
creates `NetworkPool` rows must also have the `organizations` row present.

### Finding 9 — `seedTenantForTest()` creates ONLY the tenant row

`server/src/__tests__/helpers/seedRls.ts → seedTenantForTest(orgId, testRunId)` creates
only the `Tenant` row. Tests that use pools must also seed an `organizations` row separately
(via `withBypassForSeed`). The NC QA seed script cannot use `seedTenantForTest`.

---

## 4. Fixture Strategy

The fixture script follows the Block 1+2 pattern established by
`current-db-multi-segment-qa-seed.ts`:

1. **Authorization gate** — Hard stop if `PARESH_AUTHORIZED=true` is absent
2. **Safety guards** — `assertQaSlug()` on every slug before any DB write
3. **Idempotency** — Every entity checks for existence before creation, skips cleanly
4. **Organization creation** — Both `tenant` and `organizations` rows created per org
   (same UUID, separate upserts)
5. **Synthetic user references** — NC entities reference a fixed synthetic UUID for
   `createdByUserId`, `issuedByUserId`, `invitedByUserId`. No `User` rows are created
   (all user FK references are soft/unenforced in NC models per OD-4)
6. **No lifecycle log rows** — G-020 compliance. No append-only rows created by default
7. **No feature flag changes** — Feature flags are not read or written by this script
8. **No migration or schema changes** — This is a seed-only operation

Packet coverage:
| Packet | Entity | Fixture key | State |
|--------|--------|-------------|-------|
| P17 | NetworkPool | NC-P17-POOL | OPEN |
| P17 | NetworkPoolMembership | NC-P17-MBR-OWNER, NC-P17-MBR-SUP | ACTIVE |
| P17 | NetworkPoolDemandLine | NC-P17-DL-001 | ACTIVE |
| P17 | NetworkPoolDemandSnapshot | NC-P17-SS-001 | FINALIZED |
| P17 | NetworkPoolDemandSnapshotLine | NC-P17-DL-001 (snapshotted) | — |
| P17 | NetworkPoolRfq | NC-P17-RFQ-001 | ISSUED |
| P17 | NetworkPoolRfqSupplierInvite | NC-P17-INV-001 | PENDING |
| P18 | NetworkPool | NC-P18-POOL | OPEN |
| P18 | NetworkPoolMembership | NC-P18-MBR-OWNER | ACTIVE |
| P18 | NetworkPoolDemandLine (×2) | NC-P18-DL-001, NC-P18-DL-002 | ACTIVE |
| P19 | NetworkInvoice | NC-P19-INV-001 | PENDING |
| P20 | NetworkSettlementSplit | NC-P20-SPL-001 | PENDING |

---

## 5. Files Changed

| File | Action |
|------|--------|
| `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts` | NEW — NC Phase 1 QA fixture seed script |
| `governance/TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001.md` | NEW — this artifact |
| `governance/control/GOVERNANCE-CHANGELOG.md` | MODIFIED — new entry prepended |
| `governance/control/OPEN-SET.md` | MODIFIED — operating note prepended |
| `governance/control/NEXT-ACTION.md` | MODIFIED — `last_closed_unit` updated |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` | MODIFIED — Packet 22.1 row added |

No other files changed. No schema, migration, frontend, or `.env` changes.

---

## 6. Schema Corrections Applied During Implementation

Three schema field errors were discovered during cross-validation and corrected before
TypeScript validation:

| # | Error | Correct field | Notes |
|---|-------|---------------|-------|
| 1 | `upsertQaTenant` created only the `Tenant` row | Must also create `organizations` row (same UUID) | `NetworkPool.orgId → organizations.id` |
| 2 | `sentByUserId` | `invitedByUserId` (`@map("invited_by_user_id")`) | `NetworkPoolRfqSupplierInvite` |
| 3 | `lineRef` | `sourceLineRef` + `sourceRevisionNo` | `NetworkPoolDemandSnapshotLine` |

All three corrected. `tsc --noEmit` on server: **0 errors**.

---

## 7. Reset / Run Commands

> **AUTHORIZATION REQUIRED before any execution.**
> Do NOT run this script without Paresh explicitly setting `PARESH_AUTHORIZED=true`.

```powershell
# From repo root, after Paresh confirms authorization:
$env:PARESH_AUTHORIZED = "true"
cd server
pnpm exec tsx scripts/qa/nc-phase1-qa-fixture-baseline.ts
```

The script requires `DATABASE_URL` to be set in the environment (loaded via `.env` or
`.env.local` in the server directory, which are git-ignored).

Running this script without `PARESH_AUTHORIZED=true` in the environment exits immediately
with `STOP: PARESH_AUTHORIZED not set.` — no DB writes occur.

---

## 8. QA Data Safety Rules

1. Only QA-prefixed slugs (`qa-nc-*`) are used. `assertQaSlug()` hard-stops on any
   non-QA slug before any DB write.
2. All entity ref values use the `NC-P*` convention and are documented above for
   cross-reference.
3. `inviteRef` is globally unique in `NetworkPoolRfqSupplierInvite` — the fixture
   uses `NC-P17-INV-001`. Running the script a second time will detect the existing
   row and skip cleanly.
4. `NetworkLifecycleLog` rows are NOT created. If a future version of this script
   adds lifecycle log creation, it must include an explicit acknowledgment comment
   citing G-020 and the append-only constraint.
5. The script does not create `User` rows. All user ID references are synthetic UUIDs
   held in `FIXTURE_CREATED_BY_USER_ID`. No auth credentials or passwords are used.

---

## 9. Validation Evidence

- `tsc --noEmit` on server: **0 errors** (confirmed at implementation time)
- Prisma schema: `prisma validate` = PASS (AUDIT_COMPLETE baseline; schema unchanged)
- Integration test baseline: 185/185 PASS (TEXQTIC-NC-PHASE1-CLOSE-AUDIT-001 baseline)
- No schema/migration/frontend/.env changes made

> This script has NOT been executed against the remote Supabase DB. Execution requires
> explicit Paresh authorization.

---

## 10. Known Limitations

1. **Lifecycle log rows not included** — To achieve a fully exercised post-settlement
   fixture state, lifecycle log rows would need to be created manually. This is deferred
   to avoid permanent G-020 row accumulation.
2. **No user rows** — The fixture does not create User or Membership rows for the NC
   QA orgs. If end-to-end UI testing against these fixtures is required, user/membership
   rows will need to be added or seeded separately.
3. **Supplier quotes not included** — `nc.procurement_pools.supplier_quotes.enabled=false`.
   The quote workflow (P17 supplier quote path) is not covered by this fixture.
4. **inviteRef global uniqueness** — `NC-P17-INV-001` is globally unique in the
   `network_pool_rfq_supplier_invites` table. If a prior test run left a row with this
   ref, the script will skip cleanly (idempotent). If the DB is reset, the script can
   be re-run to restore the fixture.
5. **RFQ line not included** — `NetworkPoolRfqLine` rows are not created in this
   fixture to keep the baseline minimal. Add if needed for specific test scenarios.

---

## 11. Guardrail Confirmation

| Guardrail | Status |
|-----------|--------|
| No TTP / NC-TTP implementation | CONFIRMED — no TTP code changes |
| No schema.prisma changes | CONFIRMED |
| No migration changes | CONFIRMED |
| No frontend file changes | CONFIRMED |
| Feature flags unchanged | CONFIRMED — not read or written |
| `nc.settlement_waterfall.enabled` | CONFIRMED false, unchanged |
| `ttp_enabled` | CONFIRMED false, unchanged |
| No product packet opened | CONFIRMED |
| `PARESH_AUTHORIZED` gate | CONFIRMED — script hard-stops without it |
| G-020 lifecycle log compliance | CONFIRMED — no lifecycle log rows created |
| `assertQaSlug()` on all slugs | CONFIRMED |

---

## 12. Next Recommended Action

This artifact is in status **IMPLEMENTED_AWAITING_PARESH_VERIFY**.

Paresh to verify:
1. Review `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts` — confirm fixture
   inventory and entity refs are correct for the intended QA baseline
2. Authorize execution when ready: `PARESH_AUTHORIZED=true pnpm exec tsx ...`
3. After execution: confirm idempotency by running a second time and verifying `[SKIP]`
   log lines appear for all entities

No further governance actions are required for this task. The Layer 0 hold posture
(`HOLD_FOR_COUNSEL_FEEDBACK`) is unchanged. All other pending packets remain on their
existing status.

---

*Governance artifact. No product implementation. No schema changes. No feature flags activated.*
