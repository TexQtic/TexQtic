# TEXQTIC — B2B Public Discovery Post-Precondition Readiness Reassessment v1

**Assessment ID:** TEXQTIC-B2B-PUBLIC-DISCOVERY-POST-PRECONDITION-READINESS-REASSESSMENT-v1  
**Slice:** `PUBLIC_B2B_DISCOVERY_POST_PRECONDITION_READINESS_AND_CTA_WIRING_ASSESSMENT_SLICE`  
**Status:** ASSESSED — NOT_READY_KEEP_CTA_AS_TEMPORARY_STOPGAP  
**Scope:** Governance / readiness reassessment / B2B page implementation decision gate  
**Date:** 2026-04-22  
**Authorized by:** Paresh  
**Assessment class:** Assessment-only; no runtime files changed; no Layer 0 drift; no schema edits  
**Precedes:** `B2B_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE`  
**Follows:** `PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` (commit `aa5828a`)

---

## 1. Purpose

This artifact is the mandatory fresh readiness reassessment required by
`TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md` §E Step 8:

> "At least ONE tenant with `publicEligibilityPosture = PUBLICATION_ELIGIBLE`
> AND at least one org/catalog_item with `publication_posture = B2B_PUBLIC or BOTH`
> must exist in the database.
> Without this, the public page has no content to show and cannot meaningfully open."

It assesses whether the precondition implementation slice (`aa5828a`) has advanced
readiness to the point where `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` may now lawfully open.

This artifact does not begin implementation. It does not modify `App.tsx`, server routes,
Prisma schema, or any runtime file. It does not alter Layer 0 control files.

---

## 2. Accepted Baseline

The following are accepted as verified and closed:

- `PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` is complete in commit `aa5828a`
- The slice implemented all four B-01–B-04 blockers from the prior assessment:
  - `TenantPublicEligibilityPosture` enum on `Tenant` model (`public_eligibility_posture`, default `NO_PUBLIC_PRESENCE`)
  - `publication_posture` on `organizations` (default `PRIVATE_OR_AUTH_ONLY`, VARCHAR(30), CHECK constraint)
  - `publication_posture` on `catalog_items` (default `PRIVATE_OR_AUTH_ONLY`, VARCHAR(30), CHECK constraint)
  - `server/src/services/publicB2BProjection.service.ts` — 5-gate governed projection service
  - `GET /api/public/b2b/suppliers` — registered in `server/src/routes/public.ts`
  - 10/10 unit tests passing
  - Migration `20260422000000_b2b_public_projection_preconditions` applied to remote Supabase
- `TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1.md` is locked
- Prior readiness assessment `TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md` is locked
  (verdict: `NOT_READY_REQUIRES_PRECONDITION_SLICE`)
- Current Layer 0 posture: `ACTIVE_DELIVERY`, `active_delivery_unit: PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE`
- White Label Co hold: `REVIEW-UNKNOWN`, confirmed `NON-BLOCKING` for this assessment

---

## 3. Read Set Consumed

| File | What Was Inspected |
| --- | --- |
| `governance/control/OPEN-SET.md` | Current Layer 0 posture and active delivery unit |
| `governance/control/NEXT-ACTION.md` | `product_delivery_priority: ACTIVE_DELIVERY`, active unit name |
| `governance/control/BLOCKED.md` | No live blockers; WL Co `NON-BLOCKING` for active unit |
| `governance/control/DOCTRINE.md` | D-014, D-022, D-024 applied throughout |
| `docs/governance/control/GOV-OS-001-DESIGN.md` | Layer 0 operating model confirmed |
| `governance/decisions/TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1.md` | CTA wiring / AppState form factor decision |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-READINESS-ASSESSMENT-v1.md` | Prior assessment verdict |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md` | Step 8 data gate requirement |
| `server/prisma/schema.prisma` | Confirmed all three posture fields present post-`aa5828a` |
| `server/src/routes/public.ts` | Confirmed `GET /b2b/suppliers` wired |
| `server/src/services/publicB2BProjection.service.ts` | Confirmed service present with 5 safety gates |
| `server/src/__tests__/public-b2b-projection.unit.test.ts` | Confirmed 10/10 tests pass |
| `App.tsx` (lines 2161–2175) | `selectNeutralPublicEntryPath` implementation |
| `App.tsx` (lines 4547, 4596, 4671, 4797) | B2B CTA call sites |
| Live DB query (see §4 below) | Posture counts from remote Supabase |

---

## 4. Data Readiness Assessment

### 4.1 Live DB Posture Query

A read-only posture count was executed against the remote Supabase DB via
`server/src/services` Prisma client (service-role context, no schema changes).

```
POSTURE_CHECK_RESULT:
  total_tenants:                       452
  PUBLICATION_ELIGIBLE_tenants:          0
  total_orgs:                          452
  B2B_PUBLIC_or_BOTH_orgs:               0
  B2B_PUBLIC_or_BOTH_catalog_items:      0
```

### 4.2 Analysis

**Gate A — Tenant eligibility posture:** FAILS FOR ALL TENANTS

All 452 tenants have `public_eligibility_posture = 'NO_PUBLIC_PRESENCE'` (the schema default,
applied at migration time as `DEFAULT 'NO_PUBLIC_PRESENCE' NOT NULL`). This is correct by
design — no tenant is public-eligible by default. Zero tenants have been explicitly upgraded
to `PUBLICATION_ELIGIBLE`.

**Gate B — Org publication posture:** FAILS FOR ALL ORGS

All 452 organizations have `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` (the schema default).
Zero orgs have been explicitly set to `B2B_PUBLIC` or `BOTH`. Even if Gate A were satisfied,
Gate B would eliminate all orgs.

**Catalog items — Offering preview gate:** FAILS FOR ALL ITEMS

Zero active catalog items have `publication_posture IN ('B2B_PUBLIC', 'BOTH')`. Offering
previews cannot be populated regardless of tenant/org posture resolution.

### 4.3 Route Behavior

`GET /api/public/b2b/suppliers` returns:

```json
{ "items": [], "total": 0, "page": 1, "limit": 20 }
```

This is **the correct, lawful empty response** as defined in the design contract (§D.3).
It is not a 404. It is not a broken response. It is not a malformed response. The route is
correctly implemented and the empty result is solely due to **zero eligible data** — all
tenants and orgs remain at their `NO_PUBLIC_PRESENCE` / `PRIVATE_OR_AUTH_ONLY` defaults.

The implementation is correct. The projection service, route, and safety gates are all
functioning as designed. The emptiness is a **data posture gap**, not an implementation gap.

---

## 5. Route Readiness Classification

| Dimension | Status | Basis |
| --- | --- | --- |
| Route wired | ✅ PRESENT | `GET /api/public/b2b/suppliers` confirmed in `public.ts` |
| Service implemented | ✅ PRESENT | `publicB2BProjection.service.ts` confirmed with 5 gates |
| Schema fields present | ✅ PRESENT | All three posture fields confirmed in `schema.prisma` |
| Migration applied | ✅ APPLIED | `aa5828a` confirmed; Supabase reports "All migrations applied" |
| Unit tests | ✅ 10/10 PASS | Confirmed via `pnpm exec vitest run` |
| Route contract correct | ✅ CORRECT | Empty 200 response per design spec §D.3 |
| Data producing non-empty result | ❌ ZERO ELIGIBLE | 0 PUBLICATION_ELIGIBLE tenants, 0 B2B_PUBLIC orgs |
| Can render truthful entry | ❌ NO | No supplier entry candidate exists in the DB |

**Route readiness verdict:** Implementation-complete, data-empty. The infrastructure is ready.
The content is absent.

---

## 6. CTA Wiring Assessment

### 6.1 Current `selectNeutralPublicEntryPath('B2B')` Implementation

Confirmed from `App.tsx` lines 2161–2175:

```typescript
const selectNeutralPublicEntryPath = (
  nextSelection: Exclude<NeutralEntryPathSelection, null>,
  sectionId?: string,
) => {
  setNeutralEntryPathSelection(nextSelection);

  if (sectionId) {
    scrollToPublicEntrySection(sectionId);
  }
};
```

**Behavior:** Sets `neutralEntryPathSelection` state to `'B2B'` and, if a `sectionId` is
provided, calls `scrollToPublicEntrySection(sectionId)` to smooth-scroll to an in-page section.

**AppState transition:** NONE. This function does NOT call `setAppState`. It does not transition
to `PUBLIC_B2B_DISCOVERY` or any other AppState. It only adjusts `neutralEntryPathSelection`
(an in-page guidance/scroll state) and triggers an optional scroll.

**`PUBLIC_B2B_DISCOVERY` AppState:** Confirmed ABSENT from `App.tsx`. The form factor decision
(`TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1.md` §4.1) locked this as
the canonical future AppState value, but it has not been implemented.

**Call sites confirmed:**
- `onClick={() => selectNeutralPublicEntryPath('B2B', 'public-entry-routing')}` — hero CTA (scrolls to section)
- `onClick={() => selectNeutralPublicEntryPath('B2B')}` — secondary CTA (no scroll)
- "Source for Business" footer link — `selectNeutralPublicEntryPath('B2B', 'public-entry-routing')`

### 6.2 CTA Classification

**Classification: `EXPECTED_TEMPORARY_SCROLL_ONLY`**

Rationale:

1. The CTA performs exactly what the prior downstream page architecture decision described:
   "Currently scrolls to a section; to be upgraded to a state transition."
2. No `PUBLIC_B2B_DISCOVERY` AppState exists; upgrading the CTA without the downstream page
   would be a broken wiring with no target state.
3. The data readiness gate (§4) has not been satisfied — even if the AppState existed,
   the page would render zero suppliers. Opening the downstream page to a guaranteed empty
   result is not a lawful implementation opening.
4. The scroll/guidance behavior is architecturally coherent as a stop-gap:
   it shows guidance text, sets `neutralEntryPathSelection` for in-page content rendering,
   and scrolls to a section. It is not misleading or broken.
5. The form factor decision explicitly described this as a stop-gap and deferred the upgrade
   to a later bounded implementation slice.

**Is the current behavior a defect?** NO. It is the lawful interim posture per the architecture
decision. The CTA will be upgraded to a real `PUBLIC_B2B_DISCOVERY` AppState transition when
the implementation slice opens. That upgrade is out of scope until data readiness is satisfied.

**Is it READY_FOR_UPGRADE_TO_PUBLIC_B2B_DISCOVERY_STATE?** NO. Upgrade requires:
1. At least one real `PUBLICATION_ELIGIBLE` × `B2B_PUBLIC`-or-`BOTH` supplier entry to exist
2. `PUBLIC_B2B_DISCOVERY` AppState implemented in `App.tsx`
3. Downstream page component built and wired
Neither condition is satisfied. Zero eligible data. No AppState. No page.

---

## 7. OPEN / DO NOT OPEN Decision

**VERDICT: `NOT_READY_KEEP_CTA_AS_TEMPORARY_STOPGAP`**

### Blocking conditions (all must be cleared before opening is lawful):

| # | Blocking Condition | Status |
| --- | --- | --- |
| 1 | At least one `PUBLICATION_ELIGIBLE` tenant must exist | ❌ ZERO (all 452 tenants: `NO_PUBLIC_PRESENCE`) |
| 2 | At least one `B2B_PUBLIC`/`BOTH` org must exist | ❌ ZERO (all 452 orgs: `PRIVATE_OR_AUTH_ONLY`) |
| 3 | At least one lawful non-placeholder supplier entry must be renderable | ❌ ZERO (gates 1+2 fail, catalog also empty) |
| 4 | `PUBLIC_B2B_DISCOVERY` AppState implemented | ❌ NOT YET (future slice) |
| 5 | Frontend page component built | ❌ NOT YET (future slice) |

Conditions 4–5 are expected to remain open (they are the *content* of the page implementation
slice, not a blocker to opening it). However, conditions 1–3 are the **data gate** that must
be satisfied before the page implementation slice is even lawful to open, per design §E Step 8.

The precondition implementation slice delivered the **infrastructure** (schema posture fields,
projection service, public route). It did not deliver **data** (no tenant was upgraded, no org
was set to public posture). This is correct and expected — the precondition design explicitly
stated: "No back-fill required. Eligibility must be explicitly set per tenant."

The missing step is **explicit posture assignment** for at least one real B2B tenant/org pair.
Without it, the discovery page would open to a guaranteed empty state with no content pathway.

---

## 8. Precondition Gap Summary (Post-`aa5828a`)

### Previously resolved blockers (B-01–B-04 from prior assessment)

| Blocker | Gap | Status |
| --- | --- | --- |
| B-01 | No tenant eligibility posture field | ✅ RESOLVED — field present, migration applied |
| B-02 | No object publication posture field | ✅ RESOLVED — field on orgs + catalog_items |
| B-03 | No governed public-safe B2B projection layer | ✅ RESOLVED — `publicB2BProjection.service.ts` |
| B-04 | No public B2B discovery endpoint | ✅ RESOLVED — `GET /api/public/b2b/suppliers` |

### Remaining blocker (new — data posture)

| Blocker | Gap | Status |
| --- | --- | --- |
| B-05 | No `PUBLICATION_ELIGIBLE` tenant with a `B2B_PUBLIC`/`BOTH` org exists in the DB | ❌ OPEN — zero eligible supplier entry candidates |

B-05 is a **data posture gap**, not a schema or implementation gap. The infrastructure is
in place to support public B2B projection. The data has not been assigned.

---

## 9. Next Lawful Slice

**Slice Name:** `B2B_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE`

**Slice Type:** Data posture assignment / seeding remediation slice.

**Purpose:** Explicitly assign `publicEligibilityPosture = PUBLICATION_ELIGIBLE` to at least
one real B2B tenant, and `publication_posture = 'B2B_PUBLIC'` (or `'BOTH'`) to at least one
corresponding organization record. This ensures that `GET /api/public/b2b/suppliers` can
return at least one real, truthful, non-placeholder public-safe supplier entry.

**This slice is NOT:**
- The `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` (that remains gated on data readiness)
- A broad seeding or test-data injection exercise
- An automated migration or back-fill (must be explicit per-tenant assignment)

**Unlocks:** After this slice, a third readiness check can confirm non-empty route output,
and `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` becomes a lawful opening candidate (subject
to Layer 0 posture and D-014 dependency readiness confirmation).

---

## 10. Governance Boundaries Confirmed

| Boundary | Status |
| --- | --- |
| No runtime files modified | ✅ Confirmed |
| No schema changes | ✅ Confirmed |
| No `App.tsx` changes | ✅ Confirmed |
| No Layer 0 control files modified | ✅ Confirmed — NEXT-ACTION.md/OPEN-SET.md not changed here |
| No `PUBLIC_B2B_DISCOVERY` AppState added | ✅ Confirmed |
| No homepage CTA behavior changed | ✅ Confirmed |
| No B2C work opened | ✅ Confirmed |
| Prior decisions not modified | ✅ Confirmed |
| Assessment-only artifact produced | ✅ Confirmed |
| DB data not seeded by this slice | ✅ Confirmed — assessment observes, does not mutate |
| Temporary DB query script removed | ✅ Removed after use — not committed |

---

## Appendix A — Implementation Evidence (Post-`aa5828a`)

### schema.prisma posture fields confirmed

```
Tenant.publicEligibilityPosture: TenantPublicEligibilityPosture @default(NO_PUBLIC_PRESENCE) @map("public_eligibility_posture")
CatalogItem.publicationPosture: String @default("PRIVATE_OR_AUTH_ONLY") @map("publication_posture") @db.VarChar(30)
organizations.publication_posture: String @default("PRIVATE_OR_AUTH_ONLY") @db.VarChar(30)

enum TenantPublicEligibilityPosture {
  NO_PUBLIC_PRESENCE
  LIMITED_PUBLIC_PRESENCE
  PUBLICATION_ELIGIBLE
  @@map("tenant_public_eligibility_posture")
}
```

### Route confirmed

```
GET /api/public/b2b/suppliers — wired in server/src/routes/public.ts
No auth middleware. Zod-validated query params. Calls listPublicB2BSuppliers.
```

### Unit tests confirmed

```
10/10 PASS — server/src/__tests__/public-b2b-projection.unit.test.ts
```

### Live DB posture counts (read-only, not mutated by this slice)

```
total_tenants: 452        PUBLICATION_ELIGIBLE_tenants: 0
total_orgs: 452           B2B_PUBLIC_or_BOTH_orgs: 0
                          B2B_PUBLIC_or_BOTH_catalog_items_active: 0
```
