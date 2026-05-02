# TECS-DPP-PASSPORT-NETWORK-020F
## WL Tenant DPP Registry Empty-State Investigation — Audit Report

**Unit ID:** TECS-DPP-PASSPORT-NETWORK-020F  
**Type:** Investigation-Only  
**Status:** CLOSED — Classification A  
**Committed HEAD before this unit:** `e1311fc`  
**Runtime Symptom:** QA WL tenant DPP Passport page shows the Passport Registry section but zero records:  
> "No product passports yet. Create or select a traceability node to begin building a passport."  
**Distinct from 020D/020E:** 020D/020E addressed "DPP Snapshot / read-only supply chain snapshot" labelling and WL runtime parity. The registry section (`dpp-passport-registry`) was confirmed productized in 020E. This unit investigates why the registry is empty for a WL tenant.

---

## 1. Investigation Scope

This unit answers five investigation families:

| Family | Subject | Verdict |
|---|---|---|
| A | Registry backend — query filter, tenant-type scoping | PASS — no WL exclusion |
| B | Registry frontend — fetch gate, error vs. empty distinction | PASS — correct logic |
| C | Traceability route availability for WL tenants | PASS — no WL exclusion |
| D | QA WL fixture / data posture | **GAP FOUND — no WL traceability nodes seeded** |
| E | Deployment / runtime mismatch | N/A — source-level investigation only |

---

## 2. Registry Backend Findings

**Source:** `server/src/routes/tenant.ts` lines 8866–8940  
**Route:** `GET /api/tenant/dpp/passports`  
**Auth:** `tenantAuthMiddleware + databaseContextMiddleware`

### 2A. Query Implementation

```typescript
const nodes = await withDbContext(prisma, dbContext, async (tx: typeof prisma) => {
  return tx.traceabilityNode.findMany({
    where: { orgId: dbContext.orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      dpp_passport_states: { select: { status: true, public_token: true, updated_at: true } },
      dpp_product_details: { select: { product_description: true } },
    },
  });
});
```

**Findings:**

| # | Finding | Detail |
|---|---|---|
| B-01 | No `is_white_label` filter | `WHERE` clause contains only `orgId: dbContext.orgId` |
| B-02 | No `tenant_type` filter | No WL tenant exclusion of any kind |
| B-03 | Left-join on `dpp_passport_states` | Nodes WITHOUT passport state rows appear as `DRAFT` (not excluded) |
| B-04 | Returns ALL traceability nodes for org | Empty result = zero traceability nodes for the org_id |
| B-05 | `publicPassportId` only when PUBLISHED | Safe; matches spec |
| B-06 | `orgId` from JWT/dbContext only | Never from request body — correct tenant isolation |
| B-07 | Fully RLS-scoped | `withDbContext` sets RLS before query; defense-in-depth |

**Conclusion:** Backend is correct and WL-inclusive. An empty response means the calling org has zero `traceability_nodes` rows.

---

## 3. Registry Frontend Findings

**Source:** `components/Tenant/DPPPassport.tsx`

### 3A. isProductized gate (line 394)

```typescript
const isProductized = title === undefined;
```

WL renders without a `title` prop → `isProductized = true`. Confirmed in 020E (no WL title prop at the `case 'dpp':` call site in `App.tsx`).

### 3B. Registry fetch (lines 481–495)

```typescript
useEffect(() => {
  if (!isProductized) return;          // ← gate: skips non-productized render
  setRegistryLoading(true);
  tenantGet<{ passports: DppRegistryEntry[] }>('/api/tenant/dpp/passports')
    .then(result => {
      setRegistry(result.passports);
      setRegistryLoaded(true);
    })
    .catch(() => {
      setRegistryError('Unable to load passport registry.');
      setRegistryLoaded(true);
    })
    .finally(() => { setRegistryLoading(false); });
}, [isProductized]);
```

**Findings:**

| # | Finding | Detail |
|---|---|---|
| F-01 | Fetch runs for WL | `isProductized = true` for WL → guard passes; fetch fires on mount |
| F-02 | Error/empty states are distinct | Error: red banner `dpp-passport-registry-error`; Empty: slate text `dpp-passport-registry-empty` |
| F-03 | Reported symptom matches empty state | "No product passports yet..." text is `dpp-passport-registry-empty` |
| F-04 | Reported symptom is NOT the error state | Error state shows "Unable to load passport registry. Use the manual lookup below..." — not reported |
| F-05 | Empty state has NO CTA link | No button/link to Traceability page from the empty state (UX gap — see §6) |
| F-06 | Registry section is gated by `isProductized && !snapshot` | Line 621 — only shown in productized mode before a node is loaded; correct |

### 3C. Auth path

`tenantGet` → `services/tenantApiClient.ts` → `services/apiClient.ts` → reads `texqtic_tenant_token` from `localStorage` → attaches `Authorization: Bearer <token>`. Standard auth path; no WL-specific bypass or divergence.

---

## 4. Traceability Route Availability Findings

**Source:** `server/src/routes/tenant/traceability.g016.ts`  
**Registered at:** `/api/tenant/traceability`

### Routes

| Route | Purpose |
|---|---|
| `POST /api/tenant/traceability/nodes` | Create traceability node |
| `GET /api/tenant/traceability/nodes` | List nodes (paginated) |
| `GET /api/tenant/traceability/nodes/:id/neighbors` | 1-hop neighbors |
| `POST /api/tenant/traceability/edges` | Create edge |
| `GET /api/tenant/traceability/edges` | List edges |

**Findings:**

| # | Finding | Detail |
|---|---|---|
| T-01 | No tenant-type filter on any route | All routes scope by `dbContext.orgId` only |
| T-02 | `orgId` always from JWT/dbContext | `D-017-A` comment: `orgId: z.never()` in body schema — correct |
| T-03 | WL tenants CAN create traceability nodes | No capability gate, no `is_white_label` check |
| T-04 | WL shell includes Traceability route key | `WL_STOREFRONT_SHELL_ROUTE_KEYS` includes `'traceability'` (line 431, `runtime/sessionRuntimeDescriptor.ts`) |
| T-05 | Traceability nav rendered in WL shell | `layouts/Shells.tsx` line 375: `hasShellRoute(navigation.surface, 'traceability')` check present |
| T-06 | WL tenants have a path to create nodes | Traceability page accessible via WL shell → create node → node appears in DPP registry |

---

## 5. QA WL Fixture / Data Posture Findings

**`.auth/` directory contents:**

| File | Purpose |
|---|---|
| `qa-b2b.json` | QA B2B tenant (token + orgId) |
| `qa-wl-admin.json` | QA WL admin (token + orgId) |
| `dpp-qa-fixture.json` | DPP node + publicPassportId (B2B only) |
| `qa-buyer-a/b/c.json` | QA buyer actors |
| `qa-buyer-member.json` | QA buyer member |
| ~~`qa-wl.json`~~ | **ABSENT** — no WL storefront user auth state |

**`scripts/seed-dpp-fixture.ts` analysis:**

| # | Finding | Detail |
|---|---|---|
| S-01 | Reads only `qa-b2b.json` | `loadAuth()` → `.auth/qa-b2b.json` — hardcoded |
| S-02 | No WL seed path | No `qa-wl.json` load, no WL-branch, no org-slug param |
| S-03 | `dpp-qa-fixture.json` is B2B-only | Fixture created from B2B traceability node only |
| S-04 | No equivalent seed for QA WL | `seed-dpp-fixture.ts` was never parameterized to support WL tenant |
| S-05 | QA WL org has zero traceability nodes | No seed path → zero DB rows → empty registry → correct empty-state |

---

## 6. Issue Classification

**Primary Classification: A — Expected empty QA WL data / fixture absence**

The DPP Passport Registry empty state for the QA WL tenant is **CORRECT BEHAVIOR**. The QA WL org has zero `traceability_nodes` rows in the database because no fixture seed was ever executed for it. This is a QA data gap, not a code defect.

### Classification Matrix

| Class | Description | Verdict |
|---|---|---|
| **A** | Expected empty QA WL data — no traceability nodes seeded | ✅ **CONFIRMED — PRIMARY CAUSE** |
| B | WL capability gate blocking registry display | ❌ Disproved — 020E confirmed no gate in `case 'dpp':` |
| C | Auth context failure / wrong org_id | ❌ Disproved — error state not reported; auth path correct |
| D | API route failure / network error | ❌ Disproved — error state not reported; empty state reported |
| E | Frontend rendering bug (wrong branch) | ❌ Disproved — empty-state logic correct; error/empty states distinct |
| F | Registry fetch blocked by `isProductized` guard | ❌ Disproved — `isProductized = true` for WL; fetch fires on mount |
| G | Backend WL exclusion in WHERE clause | ❌ Disproved — query filters by `orgId` only; no WL filter |

---

## 7. Secondary UX Finding (Non-blocking)

The empty state in `DPPPassport.tsx` (line 644) reads:

> "No product passports yet. Create or select a traceability node to begin building a passport."

This is instructional but **provides no actionable CTA**. The user is told to "create or select a traceability node" but there is no link or button that navigates them to the Traceability page.

**Impact:** Low friction increase for first-time WL users. The WL shell includes the Traceability route key (`WL_STOREFRONT_SHELL_ROUTE_KEYS`), so the user can navigate there manually, but the empty state doesn't make this discoverable.

**This is a UX gap, not a defect.** The registry is behaving correctly.

---

## 8. Next Slice Recommendation

**Recommended: TECS-DPP-PASSPORT-NETWORK-020G — WL Tenant DPP Registry QA Seed + Empty-State UX**

### 020G Scope Options

| Priority | Work Item | Type |
|---|---|---|
| P1 | Parameterize `seed-dpp-fixture.ts` to accept `--target wl` or create `seed-dpp-fixture-wl.ts` | QA |
| P1 | Create `.auth/qa-wl.json` auth state for WL storefront user (or reuse `qa-wl-admin.json`) | QA data |
| P2 | Add empty-state CTA to `DPPPassport.tsx` pointing to Traceability page | UX |
| P3 | Add E2E test `DPP-E2E-41` — WL registry shows entry after seed | E2E |
| P3 | Source-level test asserting empty-state has distinct test-id from error-state | Unit |

### 020G Classification

**020G Type:** Implementation — QA seed + optional UX (CTA link)  
**Risk:** Low. Seed scripts are QA-only. CTA is additive to empty state. No schema/API/auth changes.  
**Prerequisite:** Either `qa-wl.json` must be created, or `qa-wl-admin.json` must be confirmed sufficient as the WL storefront org token.

---

## 9. Evidence Summary

| Signal | Evidence | Implication |
|---|---|---|
| Empty state text matches reported symptom | `dpp-passport-registry-empty` test ID at DPPPassport.tsx:644 | Fetch succeeded; API returned `passports: []` |
| Error state NOT reported | No "Unable to load passport registry" or red banner | No 4xx/5xx; auth is working |
| Registry backend has no WL exclusion | `where: { orgId: dbContext.orgId }` only (line 8884) | All orgs treated equally |
| `isProductized = true` for WL | `title === undefined` (line 394); WL renders without `title` prop | Registry fetch fires for WL |
| Seed script B2B-only | `.auth/qa-b2b.json` only in `loadAuth()` | QA WL has no seeded nodes |
| No `qa-wl.json` in `.auth/` | Directory enumerated; file absent | WL storefront user not in QA auth set |
| WL shell has Traceability route | `WL_STOREFRONT_SHELL_ROUTE_KEYS` includes `'traceability'` | WL user can create nodes via UI |
| Traceability routes have no WL gate | All routes use `dbContext.orgId` only | WL tenants can create/read nodes |

---

## 10. Files Changed

None. This is an investigation-only unit. No source, test, schema, seed, or configuration files were modified.

---

## 11. Git State

**HEAD at close:** `e1311fc` (same as HEAD at open — clean tree)  
**Staged files:** None  
**Modified files:** None (audit artifact added in a single atomic commit)

---

*TECS-DPP-PASSPORT-NETWORK-020F closed — Classification A: Expected empty QA WL data / fixture absence.*  
*Author: GitHub Copilot (Claude Sonnet 4.6) — 2026*
