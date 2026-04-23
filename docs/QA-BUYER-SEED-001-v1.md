# QA Buyer Actor Seed — Implementation Record
**Document ID:** QA-BUYER-SEED-001-v1
**Family:** B2B Sub-family — Buyer Catalog Discovery / QA Validation Infrastructure
**Implementation Date:** 2026-07-14
**Author:** GitHub Copilot (TECS SAFE-WRITE Mode — Bounded Implementation)
**Status:** IMPLEMENTED
**Commit target:** `[IMPLEMENTATION] add qa.buyer validation actor for buyer-side B2B runtime verification`

---

## 1. Purpose

This record documents the introduction of the `qa.buyer` QA validation actor — a seeded B2B
tenant persona designed to exercise the buyer side of the B2B workspace runtime. `qa.buyer` is a
prerequisite for end-to-end runtime validation of Authenticated B2B Buyer Catalog Discovery once
the backend route and frontend surface are implemented.

This unit is strictly an infrastructure seed — it does not implement buyer catalog browse
capability. It creates a verified, database-resident B2B buyer tenant that is ready to act as
the authenticated buyer in buyer-catalog validation scripts and runtime verification passes.

---

## 2. Scope

**IN SCOPE — IMPLEMENTED IN THIS UNIT:**
- `QA_BUYER_SPEC` constant in `server/prisma/seed.ts`
- Extension of `QaTenantSpec.key` union to include `'QA_BUYER'`
- `ensureOwnerSeed` call for `QA_BUYER_SPEC` in `seedCanonicalQaBaseline()`
- `qa.seed.buyer_ready` audit log seeded against the buyer tenant
- `validateQaBuyerIdentity()` validation function
- `qaBuyer` entry in `validateQaBaseline()` Promise.all, validation object, and `overallPass`

**OUT OF SCOPE — NOT IMPLEMENTED:**
- Backend authenticated cross-tenant catalog browse route (`GET /api/tenant/b2b/buyer-catalog/...`)
- Frontend buyer catalog browse service or component
- App.tsx B2B buyer catalog state machine surface
- `buyerCatalog` feature capability set to `true` for `B2B_WORKSPACE`
- Runtime manifest `buyer_catalog` route enablement (already registered as route per prior fix; not yet backed by real backend)
- Supplier-to-buyer pairing or access allowlisting
- Combined buyer-side B2B governance closure — remains `DEFERRED`

---

## 3. Source Artifacts Reviewed

| Source | Lines / Scope | Key Facts Used |
|--------|---------------|----------------|
| `server/prisma/seed.ts` | Full (lines 1–2100) | Complete pattern for `QaTenantSpec`, `ensureOwnerSeed`, `validateQaBaseline`, all existing tenant specs |
| `docs/TEXQTIC-B2B-BUYER-CATALOG-DISCOVERY-INVESTIGATION-v1.md` | Lines 1–150 | Repo truth for buyer catalog layer; confirmed no buyer browse route exists |
| `governance/decisions/PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001.md` | Lines 1–200 | Product decision authorizing buyer catalog discovery; confirms buyer B2B workflow intent |
| `docs/TECS-B2B-BUYER-CATALOG-RUNTIME-VALIDATION-v1.md` | Session context | Runtime validation failure; buyer actor absence confirmed as validation gap |
| `docs/TECS-B2B-BUYER-CATALOG-ROUTE-BINDING-FIX-001-v1.md` | Session context | Prior fix commit `1e499ad`; buyer_catalog route now correctly bound |

---

## 4. Actor Design — CONFIRMED REPO TRUTH

### 4.1 Identity

| Field | Value | Rationale |
|-------|-------|-----------|
| `key` | `'QA_BUYER'` | New literal; added to `QaTenantSpec.key` union |
| `displayName` | `'QA Buyer'` | Consistent naming convention (`QA <Role>`) |
| `slug` | `'qa-buyer'` | Consistent slug pattern (`qa-<role>`) |
| `ownerEmail` | `'qa.buyer@texqtic.com'` | Consistent email convention (`qa.<role>@texqtic.com`) |
| `tenantType` | `'B2B'` | CONFIRMED REPO TRUTH: B2B workspace is the buyer context in TexQtic |
| `tenantStatus` | `'ACTIVE'` | Required for `directLoginEligible` to pass |
| `organizationStatus` | `'ACTIVE'` | Required for buyer to access B2B workspace features |
| `plan` | `'PROFESSIONAL'` | Matches `QA_B2B_SPEC` (the supplier counterpart); consistent B2B QA actor tier |
| `isWhiteLabel` | `false` | Standard B2B tenant; not a WL operator |
| `jurisdiction` | `'IN'` | Consistent with `QA_B2B_SPEC` and `QA_PEND_SPEC`; fabric-sourcing market context |

### 4.2 Taxonomy

| Field | Value | Rationale |
|-------|-------|-----------|
| `primarySegmentKey` | `'Weaving'` | CONFIRMED REPO TRUTH: matches `QA_B2B_SPEC.taxonomy.primarySegmentKey`; overlapping segment enables buyer-supplier discovery pairing |
| `secondarySegmentKeys` | `[]` | Minimal seed; no secondary segments required for baseline validation |
| `rolePositionKeys` | `['trader']` | CONFIRMED REPO TRUTH: `'trader'` is a valid `QaRolePositionKey` (typed union line 17); distinguishes buyer from supplier (`'manufacturer'`) |

### 4.3 Supplier pairing target

The designated supplier counterpart for `qa.buyer` validation is `QA_B2B_SPEC`:
- Slug: `qa-b2b`
- Email: `qa.b2b@texqtic.com`
- 14 active catalog items (`QA-B2B-FAB-001` through `QA-B2B-FAB-014`)
- Same primary segment (`Weaving`) — required for discovery eligibility once route is implemented

CONFIRMED REPO TRUTH: `qa-b2b` tenant is ACTIVE, B2B, non-WL, with a full 14-item catalog.
It is the only QA tenant that satisfies all supplier-side prerequisites for buyer-catalog validation.

---

## 5. Implementation Detail — IMPLEMENTED IN THIS UNIT

### 5.1 Files modified

| File | Change |
|------|--------|
| `server/prisma/seed.ts` | Sole file modified |

### 5.2 Changes applied (in order)

**Change 1 — Extend `QaTenantSpec.key` union (line 26):**
```typescript
// Before:
key: 'QA_B2B' | 'QA_B2C' | 'QA_WL' | 'QA_AGG' | 'QA_PEND';
// After:
key: 'QA_B2B' | 'QA_B2C' | 'QA_WL' | 'QA_AGG' | 'QA_PEND' | 'QA_BUYER';
```
`SeededTenantIdentity.key` is typed as `QaTenantSpec['key']` — this automatically extends the
derived type. No separate change needed.

**Change 2 — Add `QA_BUYER_SPEC` constant after `QA_PEND_SPEC`:**
```typescript
const QA_BUYER_SPEC: QaTenantSpec = {
  key: 'QA_BUYER',
  displayName: 'QA Buyer',
  slug: 'qa-buyer',
  ownerEmail: 'qa.buyer@texqtic.com',
  tenantType: 'B2B',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  plan: 'PROFESSIONAL',
  isWhiteLabel: false,
  jurisdiction: 'IN',
  taxonomy: {
    primarySegmentKey: 'Weaving',
    secondarySegmentKeys: [],
    rolePositionKeys: ['trader'],
  },
};
```

**Change 3 — Add `qaBuyer` seed call in `seedCanonicalQaBaseline()`:**
```typescript
const qaPend = await ensureOwnerSeed(tx, QA_PEND_SPEC, passwordHash);
const qaBuyer = await ensureOwnerSeed(tx, QA_BUYER_SPEC, passwordHash);  // ← ADDED
```
`ensureOwnerSeed` is idempotent: upserts tenant, organization, user, membership.
`assertUserIsolatedToTenant` guard runs automatically inside `ensureOwnerSeed`.

**Change 4 — Add `qa.seed.buyer_ready` audit log before return:**
```typescript
await ensureAuditLog(tx, {
  realm: 'TENANT',
  tenantId: qaBuyer.tenantId,
  actorId: qaBuyer.ownerUserId,
  actorType: 'USER',
  action: 'qa.seed.buyer_ready',
  entity: 'tenant',
  entityId: qaBuyer.tenantId,
  metadataJson: {
    slug: qaBuyer.slug,
    supplierTarget: QA_B2B_SPEC.slug,  // ← links buyer to intended supplier counterpart
  },
});
```

**Change 5 — Add `qaBuyer` to `seedCanonicalQaBaseline()` return:**
```typescript
return { superAdmin, qaB2b, qaB2c, qaWl, qaWlMember: {...}, qaAgg, qaPend, qaBuyer };
```

**Change 6 — Add `validateQaBuyerIdentity()` function (before `validateQaBaseline`):**
Validates identity (B2B, ACTIVE, owner, directLoginEligible), runtime
(`B2B_WORKSPACE`, no overlays), and taxonomy (`Weaving` segment, `trader` role).

**Change 7 — Extend `validateQaBaseline()` Promise.all destructuring:**
```typescript
const [qaCtrl, qaB2b, qaB2c, qaWlOwner, qaWlMember, qaAgg, qaPend, qaBuyer] = await Promise.all([
  ...
  loadTenantValidationState('qa-buyer', 'qa.buyer@texqtic.com'),
]);
```

**Change 8 — Add `qaBuyer` to `validation` object in `validateQaBaseline()`:**
```typescript
qaBuyer: validateQaBuyerIdentity(qaBuyer, {
  primarySegmentKey: qaBuyer.organization?.primary_segment_key ?? null,
  secondarySegmentKeys: normalizeDefinedStrings(...),
  rolePositionKeys: normalizeDefinedStrings(...),
}),
```

**Change 9 — Add `validation.qaBuyer.pass` to `overallPass`:**
```typescript
validation.qaAgg.pass &&
validation.qaPend.pass &&
validation.qaBuyer.pass &&    // ← ADDED
validation.legacyChecks.acmeSlugRetired &&
```

---

## 6. Implementation Questions — Answered

**Q1: Should `qa.buyer` share a taxonomy segment with `qa-b2b` (the supplier target)?**
YES. `primarySegmentKey: 'Weaving'` matches `QA_B2B_SPEC.taxonomy.primarySegmentKey`.
CONFIRMED REPO TRUTH: Segment overlap is the logical prerequisite for buyer-supplier
discovery pairing in the B2B workspace. Matching segment makes `qa-buyer` a realistic
buyer candidate for `qa-b2b`'s catalog.

**Q2: What `rolePositionKey` is appropriate for a buyer actor?**
`'trader'`. CONFIRMED REPO TRUTH: `QaRolePositionKey` union (line 17 of seed.ts) is
`'manufacturer' | 'trader' | 'service_provider'`. `QA_B2B_SPEC` uses `'manufacturer'`
(supplier). `'trader'` is the correct buyer-side counterpart in a textile B2B context
(buys fabric for reselling / garment manufacturing downstream).

**Q3: Does `assertAggregatorDiscoveryCapacity()` require any adjustment?**
NO. This check runs before the seed transaction on the current DB state. It requires
`>= 2` ACTIVE/VERIFICATION_APPROVED non-WL B2B orgs. `qa-buyer` does not affect this
pre-seed count. After first seed run including `qa-buyer`, subsequent runs will count
`qa-b2b` + `qa-buyer` = 2 minimum (pre-seed), satisfying the check.

**Q4: Does adding `QA_BUYER` to the key union break `SeededTenantIdentity`?**
NO. `SeededTenantIdentity.key` is typed as `QaTenantSpec['key']` — it derives the
union automatically. Adding `'QA_BUYER'` to `QaTenantSpec.key` extends both types
simultaneously.

**Q5: Should `qa.buyer` have catalog items?**
NO. `qa.buyer` is a buyer actor, not a supplier. It has no catalog. `seedCanonicalQaBaseline`
does not call `ensureCatalogItems` or `deactivateCatalogResidue` for `qa.buyer`.

**Q6: Should `qa.buyer` have an RFQ seeded against `qa-b2b`?**
OUT OF SCOPE for this unit. An RFQ seed from `qa-buyer` → `qa-b2b` is appropriate only
once the buyer catalog browse surface is implemented and a specific item UUID can be
deterministically referenced. Seeding an RFQ prematurely couples the buyer actor setup
to catalog item UUIDs in a way that is fragile and premature.

**Q7: Does `qa.buyer` affect the `qaWL.staffMemberships >= 2` assertion?**
NO. `qa.buyer` is a separate tenant's owner user, not a member of `qa-wl`. The WL
membership check counts `qa-wl` tenant memberships only (owner + qa.wl.member = 2).
`qa.buyer` is isolated to `qa-buyer` tenant via `assertUserIsolatedToTenant`.

**Q8: Is `validateQaBuyerIdentity` consistent with the existing validation function pattern?**
YES. It follows the same three-gate pattern (`hasIdentity`, `hasRuntime`, `hasTaxonomy`)
as `validateQaB2bIdentity`, `validateQaPendIdentity`, etc. It uses `baseTenantValidation`
spread and returns a `proof/taxonomy` object alongside `pass`.

---

## 7. Validation Run — VERIFIED

**Typecheck: zero errors in `server/prisma/seed.ts`**
```
pnpm exec tsc --noEmit 2>&1 | Select-String "seed.ts"
→ (no output — zero errors in seed.ts)
```

Pre-existing errors in `tenant.ts`, `tenantProvision.types.ts`, `tenantProvision.service.test.ts`
are unrelated to this change and were present before this unit.

**Runtime seed validation:** FOLLOW-ON VALIDATION — requires deployed environment.
The seed must be executed against the Supabase-hosted Postgres to confirm the QA baseline
passes with `overallPass: true` including the new `qaBuyer.pass` gate.

---

## 8. Risks and Follow-on

**R1: `assertAggregatorDiscoveryCapacity` on a clean database.**
If seed is run on a database that has never been seeded (no prior B2B ACTIVE tenants),
the pre-seed count check will fail. This is a known constraint of the existing check and
is not introduced by this unit. The check has been passing in the current environment.

**R2: Buyer-supplier taxonomy eligibility gate not yet implemented.**
`qa-buyer` is seeded with `Weaving` + `trader` to anticipate the eligibility gate logic
for `GET /api/tenant/b2b/buyer-catalog` (not yet implemented). If the actual eligibility
logic uses different criteria, the taxonomy assignment may need revision.

**FOLLOW-ON VALIDATION (required, deferred):**
1. Run `pnpm -C server exec prisma db pull` after confirming no schema changes needed
2. Run seed against Supabase: confirm `qaBuyer.pass: true` in seed output
3. Verify `qa.buyer@texqtic.com` can log in and reach `B2B_WORKSPACE` at `qa-buyer`
4. Once buyer catalog browse is implemented: use `qa.buyer` actor in end-to-end validation

---

## 9. Governance

| Contract | Applicable | Status |
|----------|-----------|--------|
| `db-naming-rules.md` | No schema change | N/A |
| `schema-budget.md` | No schema change | N/A |
| `rls-policy.md` | No new RLS path | N/A |
| `openapi.tenant.json` | No route change | N/A |
| `event-names.md` | No event emission | N/A |
| `ARCHITECTURE-GOVERNANCE.md` | Seed-only; no domain boundary change | N/A |

`org_id` tenancy isolation: `assertUserIsolatedToTenant` runs inside `ensureOwnerSeed` for every
new actor. `qa.buyer` is isolated to `qa-buyer` tenant. No cross-tenant data access added.

---

## 10. Seeded QA Actor Registry (post-implementation)

| Key | Email | Slug | Tenant Type | Org Status | Plan | WL |
|-----|-------|------|-------------|------------|------|----|
| QA_CTRL | admin@texqtic.com | — | Control Plane (Admin) | — | — | — |
| QA_B2B | qa.b2b@texqtic.com | qa-b2b | B2B | ACTIVE | PROFESSIONAL | No |
| QA_B2C | qa.b2c@texqtic.com | qa-b2c | B2C | ACTIVE | STARTER | No |
| QA_WL | qa.wl@texqtic.com | qa-wl | B2C | ACTIVE | ENTERPRISE | Yes |
| QA_AGG | qa.agg@texqtic.com | qa-agg | AGGREGATOR | ACTIVE | PROFESSIONAL | No |
| QA_PEND | qa.pending@texqtic.com | qa-pend | B2B | PENDING_VERIFICATION | PROFESSIONAL | No |
| **QA_BUYER** | **qa.buyer@texqtic.com** | **qa-buyer** | **B2B** | **ACTIVE** | **PROFESSIONAL** | **No** |

---

## 11. Commit

```
[IMPLEMENTATION] add qa.buyer validation actor for buyer-side B2B runtime verification
```

Files changed: `server/prisma/seed.ts` (sole file).
