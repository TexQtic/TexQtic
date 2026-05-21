# SOFT-LAUNCH-REPO-TRUTH-RT3-A-DIRECTORY-DEMO-LABEL-AUDIT

**Packet ID:** RT3-A  
**Unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT3-A-DIRECTORY-DEMO-LABEL-AUDIT`  
**Status:** COMPLETE  
**Authority tier:** Repo Truth  
**Scope:** Directory surfaces — demo / reference data labeling audit  
**Git HEAD at inspection:** `89cde22887f2acba4016480be332474a6c702037`  
**Worktree state:** CLEAN at inspection and at creation  
**Authored by:** Copilot governance agent  
**Authorized by:** Paresh Patel  
**Date:** 2026-07-04  

---

## §1 Unit Authority and Boundary

This unit is a **read-only repo truth audit**. It answers a single governance question:

> **Do any public directory surfaces render "demo," "test," or "reference" data labeling?  
> If not, can seeded demo / QA data be distinguished from real data at the public UI layer?**

Surfaces in scope are the five directory-related public components identified by RT2-B4 §8:

| # | Surface | Component file |
|---|---|---|
| 1 | `/products` — B2C public browse | `components/Public/B2CBrowse.tsx` |
| 2 | `/product/:slug` — B2C product detail | `components/Public/PublicProductDetail.tsx` |
| 3 | `/aggregator` — aggregator preview stub | `components/Public/PublicAggregatorPreview.tsx` |
| 4 | B2B supplier discovery (route via `setAppState`) | `components/Public/B2BDiscovery.tsx` |
| 5 | `/supplier/:slug` — B2B supplier profile | `components/Public/PublicSupplierProfile.tsx` |

**Surfaces explicitly out of scope for RT3-A:**

- `/collections`, `/collections/:slug` — public collection browse (RT3-B)
- `/dpp/:id` — Digital Product Passport page (RT3-B)
- `/industry/:slug` — public industry cluster landing (RT3-B)
- `/passport` — PublicPassport (RT3-B)
- Any authenticated or tenant-scoped surface

**Actions forbidden in this unit:**

- Source code modification of any kind
- Data seeding, SQL execution, schema changes
- Badge / label implementation
- TLRH index updates
- HD-002 recheck
- FTR-B2C-004 implementation

---

## §2 TLRH Storage Note

This file is stored in `governance/units/` per the TexQtic governance file hierarchy.  
It is **not** a TLRH-managed artifact — no TLRH entry is created or updated by this unit.  
Cross-reference is maintained manually via §4 (input artifacts) and §10 (governance drift).  
The authoritative record of this unit's existence is the Git commit introduced by RT3-A.

---

## §3 Git / Worktree Truth

Inspection was conducted against the following Git state:

| Property | Value |
|---|---|
| HEAD commit | `89cde22887f2acba4016480be332474a6c702037` |
| Commit message | `[TEXQTIC] docs: RT2-B4 aggregator readiness synthesis` |
| Worktree state at inspection | CLEAN — zero staged, zero modified, zero untracked |
| Branch | `main` |

All source findings in this unit are asserted against exactly this commit.

---

## §4 Input Artifacts Reviewed

| Artifact | Location | Lines read | Purpose |
|---|---|---|---|
| RT2-B4 synthesis | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md` | 1–471 (full) | Parent synthesis; §6 dim 7 + §7.G demo-labeling deferrals; §8 RT3 next-packet spec |
| Inventory-001 | `governance/units/SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` | Context from session | Seeding orchestration design — no demo-labeling mechanism found |
| PRIT-001 | `governance/units/SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` | §7 (lines 320–360), §11 | Demo-labeling enforcement table; recommended next governance units |
| RT1 reconciliation | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT1-GIT-FAM06-RECONCILIATION.md` | Line 277 | Open question: "is `isDemoData` mechanism present in source or governance-doc-only?" |
| B2C projection service | `server/src/services/publicB2CProjection.service.ts` | grep | API response field audit |
| B2B projection service | `server/src/services/publicB2BProjection.service.ts` | grep | API response field audit |

---

## §5 Surface-by-Surface Demo-Label Audit

### Inspection Method

Each component was inspected by:
1. Full source read where previously unread (session summary confirmed full reads of `B2CBrowse.tsx`, `PublicAggregatorPreview.tsx`, and `B2BDiscovery.tsx` to 700+ lines)
2. Targeted grep across `components/Public/**` for: `demo`, `dummy`, `sample`, `isDemo`, `isDemoData`, `demoData`, `referenceOnly`, `sampleData`, `fixture`, `QA data`, `test data`
3. For `PublicProductDetail.tsx` and `PublicSupplierProfile.tsx`: grep returned zero matches — no demo/dummy/sample/isDemo/reference terms present

---

### Surface 1 — `/products` (`B2CBrowse.tsx`)

**Full read: lines 1–420+**

| Attribute | Finding |
|---|---|
| Data source | `GET /api/public/b2c/products` (live API fetch) |
| Demo label rendered? | **NO** — no badge, banner, flag, or copy renders demo/sample/reference distinction |
| `isDemo` prop or state? | Not present |
| `isDemoData` field consumed? | Not present |
| Text closest to "preview" | Hero eyebrow: `"Public product discovery"` — this is a surface descriptor, not a demo label |
| Trust section copy | `"Public-safe projection only"` — data protection language, not demo-data labeling |
| D2C bridge copy | `"[Protected] Consumer launch pathways are part of TexQtic's public attraction roadmap - coming soon"` — roadmap notice, not demo label |
| Empty state | `"No public products matched your search."` — no demo/seed acknowledgment |
| Seeded QA org distinguishable? | **NO** — if a QA org passes all 5 gates (A–E: `publicEligibilityPosture`, `publication_posture`, `org_type`, `status`, prohibited field strip), its products render identically to real supplier products |

**Classification: `NO_LABELING_SUPPORT`**

---

### Surface 2 — `/product/:slug` (`PublicProductDetail.tsx`)

**Inspection: targeted grep across `components/Public/**`**

| Attribute | Finding |
|---|---|
| Demo label rendered? | **NO** — grep returned zero matches for all demo/sample/reference/isDemo terms |
| `isDemo` / `isDemoData` prop? | Not found in any grep result for this file |
| Supplier attribution section | No `[DEMO SUPPLIER]` or equivalent label present |
| Seeded QA product distinguishable? | **NO** — product detail page renders projected API data; no discriminator field consumed |

**Classification: `NO_LABELING_SUPPORT`**

---

### Surface 3 — `/aggregator` (`PublicAggregatorPreview.tsx`)

**Full read: lines 1–280**

| Attribute | Finding |
|---|---|
| Data fetched? | **NO** — static marketing stub; zero API calls; no `useEffect` or data fetch |
| Demo label rendered? | **ONE generic disclaimer found** — see below |
| `isDemo` / `isDemoData`? | Not present — no data rendered, not applicable |
| Seeded QA data indistinguishable? | **NOT APPLICABLE** — no data is displayed on this surface |

**Generic disclaimer found (line ~105):**

```tsx
<p className="mt-3 text-sm font-semibold text-slate-500">
  Public preview only. Deeper intelligence is available to authenticated TexQtic participants.
</p>
```

This disclaimer appears immediately beneath the hero `<h1>` on `/aggregator`. It communicates that the aggregator surface is a public-access teaser (vs. authenticated intelligence) — it is **not** a demo-vs-real-data label. It would remain accurate regardless of whether the underlying system serves demo or real data.

Section eyebrow reads `"TexQtic Aggregator Preview"` — "Preview" refers to the marketing stub status of this surface, not to demo data.

**Classification: `GENERIC_PREVIEW_COPY_ONLY`**  
(Disclaimer addresses authenticated vs. unauthenticated capability scope — not demo vs. real data origin)

---

### Surface 4 — B2B supplier discovery (`B2BDiscovery.tsx`)

**Full read: lines 1–700+ (including full SupplierCard function)**

| Attribute | Finding |
|---|---|
| Data source | `GET /api/public/b2b/suppliers` (live API fetch) |
| Demo label rendered? | **NO** — no badge, banner, flag, or copy renders demo/sample/reference distinction |
| `isDemo` prop or state? | Not present |
| `isDemoData` field consumed? | Not present |
| Trust badge in SupplierCard | `trustBadge` is computed from `eligibilityPosture` and `publicationPosture` → renders as `"Public profile approved"` or `"Public-safe profile"` — **this is a publication eligibility status badge, not a demo/real distinction** |
| Safety section copy | `"Designed for safe public visibility"` — data protection language |
| Seeded QA org distinguishable? | **NO** — if a QA supplier org passes all 5 gates (A–E), it renders identically to a real supplier in every `SupplierCard` field: `orgType`, `legalName`, `jurisdiction`, taxonomy, certifications, offerings, trust badge |

**Classification: `NO_LABELING_SUPPORT`**

---

### Surface 5 — `/supplier/:slug` (`PublicSupplierProfile.tsx`)

**Inspection: targeted grep across `components/Public/**`**

| Attribute | Finding |
|---|---|
| Demo label rendered? | **NO** — grep returned zero matches for all demo/sample/reference/isDemo terms |
| `[DEMO PROFILE — NOT A REAL SUPPLIER]` notice? | Not found in any grep result for this file |
| `isDemo` / `isDemoData` prop? | Not found |
| Seeded QA supplier distinguishable? | **NO** — supplier profile page renders projected API data; no discriminator field consumed |

**Classification: `NO_LABELING_SUPPORT`**

---

## §6 API / Type Demo-Flag Support Audit

| Layer | File | `isDemo` / `isDemoData` field? | `referenceOnly` / `sampleData`? | Outcome |
|---|---|---|---|---|
| B2C projection service | `server/src/services/publicB2CProjection.service.ts` | **NOT PRESENT** | **NOT PRESENT** | No demo flag projected |
| B2B projection service | `server/src/services/publicB2BProjection.service.ts` | **NOT PRESENT** | **NOT PRESENT** | No demo flag projected |
| Shared types | `types.ts` | **NOT PRESENT** | **NOT PRESENT** | No demo discriminator type |
| Workspace-wide (incl. server/) | full grep with `includeIgnoredFiles=true` | `isDemoData` in governance docs only | Not found in source | **Governance-doc-only — zero source implementation** |

**Conclusion:** There is no `isDemoData`, `isDemo`, `demoData`, `referenceOnly`, or `sampleData` field anywhere in the public projection pipeline — neither in service logic, API response shapes, nor in consuming component state. A demo/QA tenant's data, if it passes all gate checks, is projected and rendered with exactly the same field set as a real tenant's data.

---

## §7 Generic Preview / Disclaimer Copy Findings

Only one "preview"-class disclaimer was found across all five surfaces:

| Surface | Copy | Location | Classification |
|---|---|---|---|
| `/aggregator` (`PublicAggregatorPreview.tsx`) | `"Public preview only. Deeper intelligence is available to authenticated TexQtic participants."` | Hero section, beneath `<h1>`, ~line 105 | **Authenticated capability scope notice** — addresses what is visible to unauthenticated visitors vs. authenticated participants; does NOT distinguish demo data from real data |
| `/aggregator` | Section eyebrow: `"TexQtic Aggregator Preview"` | Hero eyebrow | Surface-status label on a static stub — not a demo-data label |

No equivalent disclaimer copy was found on `/products`, `/product/:slug`, B2BDiscoveryPage, or `/supplier/:slug`.

---

## §8 Classification Table

| Surface | Component | Demo label present? | Classification |
|---|---|---|---|
| `/products` | `B2CBrowse.tsx` | No | `NO_LABELING_SUPPORT` |
| `/product/:slug` | `PublicProductDetail.tsx` | No | `NO_LABELING_SUPPORT` |
| `/aggregator` | `PublicAggregatorPreview.tsx` | No (generic preview copy only) | `GENERIC_PREVIEW_COPY_ONLY` |
| B2B discovery | `B2BDiscovery.tsx` | No | `NO_LABELING_SUPPORT` |
| `/supplier/:slug` | `PublicSupplierProfile.tsx` | No | `NO_LABELING_SUPPORT` |

**Classification definitions used:**

- `NO_LABELING_SUPPORT` — Surface renders live API data with no demo/sample/reference/QA label of any kind. Seeded demo data is indistinguishable from real data at the UI layer.
- `GENERIC_PREVIEW_COPY_ONLY` — Surface shows a "preview" or capability-scope disclaimer unrelated to demo vs. real data origin. No data is rendered on this surface (static stub).
- `LABELING_PRESENT` — Not applicable to any surface in this audit.
- `DATA_EMPTY_NOT_ASSESSABLE` — Not applicable to any surface in this audit.
- `CONFLICTING` — Not applicable to any surface in this audit.

---

## §9 Risk Assessment — Demo Data Indistinguishability

**Headline finding:**

> If any QA, fixture, or demo tenant's data passes all five projection gates (A–E), it will appear in public directory surfaces with **no visual or textual distinction** from a real, verified supplier or product. There is no fallback mechanism at any layer (API, component, type system) that would allow a buyer, investor, or journalist to identify it as demo data.

### Risk matrix

| Risk | Trigger | Impact | Current mitigation |
|---|---|---|---|
| Demo supplier appears as real supplier in B2B discovery | QA org passes gates A–E (all possible with correctly seeded values) | Buyer attempts contact with non-existent business; investor screenshots of "live platform" show fictional suppliers | **None** — no label rendered at UI or API layer |
| Demo product appears as real product in B2C browse | QA product on a B2C org with correct gate values | Buyer clicks through to detail; no indication product is not real | **None** — no label at any layer |
| Demo supplier profile accessed at `/supplier/:slug` | Same QA org as above | Profile page renders complete; no demo indicator | **None** |
| Demo product detail accessed at `/product/:slug` | Same QA product as above | Detail page renders complete; no demo indicator on supplier attribution | **None** |
| Investor screenshot misleads | Any of the above | Credibility risk at the exact moment authentic engagement needs to be demonstrated | **None** |

### Severity

Per `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7:

> "Failure mode to avoid: Buyers, investors, or journalists discovering that the 'live platform' is populated with placeholder data. This would undermine credibility at the precise moment the platform needs to demonstrate authentic supplier engagement."

This risk is **active from the moment any demo / QA / fixture data is seeded with gate-passing values**.

### Labeling required (per PRIT-001 §7) vs. implemented

| Enforcement point | Required label | Implemented? |
|---|---|---|
| `/products` — demo product cards | `[DEMO]` or `[SAMPLE DATA]` badge | **NO** |
| `/product/:slug` — demo supplier attribution | `[DEMO SUPPLIER]` or equivalent | **NO** |
| `/supplier/:slug` — demo supplier profile | `[DEMO PROFILE — NOT A REAL SUPPLIER]` prominent notice | **NO** |
| API responses — demo tenant data | `isDemoData: true` flag | **NO** |

**All four required labeling mechanisms are unimplemented in source.**

---

## §10 Governance Drift Table — Demo-Label Claims

This section records gaps between governance document claims / requirements and source reality, restricted to the demo-labeling domain only.

| Governance document | §/Line | Claim or requirement | Source reality | Drift type |
|---|---|---|---|---|
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` | §7, lines 330–345 | Products from demo/QA tenants must display `[DEMO]` or `[SAMPLE DATA]` badge on `/products` | Not implemented in `B2CBrowse.tsx` — no badge field, no discriminator prop | **Requirement unimplemented** |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` | §7, line 333 | Demo supplier attribution on `/product/:slug` must show `[DEMO SUPPLIER]` or equivalent | Not implemented in `PublicProductDetail.tsx` — grep: zero matches | **Requirement unimplemented** |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` | §7, line 334 | Demo supplier profile at `/supplier/:slug` must show `[DEMO PROFILE — NOT A REAL SUPPLIER]` prominently | Not implemented in `PublicSupplierProfile.tsx` — grep: zero matches | **Requirement unimplemented** |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` | §7, line 335 | API responses should carry `isDemoData: true` flag for demo tenant data | Not present in `publicB2CProjection.service.ts` or `publicB2BProjection.service.ts`; not in `types.ts`; absent from entire source tree | **Requirement unimplemented** |
| `SOFT-LAUNCH-REPO-TRUTH-RT1-GIT-FAM06-RECONCILIATION.md` | Line 277 | Open question: "Is `isDemoData` mechanism present in source or governance-doc-only recommendation?" | **Governance-doc-only.** `isDemoData` appears in PRIT-001 §7 (line 335) as a requirement; nowhere in source. RT3-A closes this open question. | **Open question resolved: governance-doc-only** |
| `SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md` | §6, dim 7 | "Demo / reference labeling dependency: NOT STARTED — ⚠️ SOFT BLOCKER" | Confirmed NOT STARTED. Zero labeling mechanism present in source. RT2-B4 classification stands unchanged. | **Status confirmed — no drift** |

**RT1 open question resolution:**  
The RT1 question "is `isDemoData` mechanism present in source or governance-doc-only recommendation?" is now **definitively answered: governance-doc-only**. No `isDemoData`, `is_demo`, `demoData`, or equivalent field exists in any `.ts` or `.tsx` source file across the workspace.

---

## §11 Recommended Next Packet: RT3-B

### Rationale for RT3-B

RT3-A has audited the five directory surfaces. The remaining public surfaces not covered here include:

| Surface | Component | Demo-label status |
|---|---|---|
| `/collections` | Public collection browse component | NOT AUDITED — RT3-B scope |
| `/collections/:slug` | Public collection detail | NOT AUDITED — RT3-B scope |
| `/industry/:slug` | `PublicIndustryClusterLanding.tsx` | NOT AUDITED — RT3-B scope |
| `/dpp/:id` | DPP page | NOT AUDITED — RT3-B scope |
| `/passport` | `PublicPassport.tsx` | NOT AUDITED — RT3-B scope |

Note: grep of `components/Public/**` for "reference" found hits in `PublicIndustryClusterLanding.tsx` (line 267: "public-safe passport references") and `PublicPassport.tsx` (lines 83, 340, 516: "Batch Reference", "Passport Reference") — these are DPP provenance terminology, not demo-data labels. RT3-B should confirm this interpretation in full read.

### RT3-B proposed scope

**Unit ID (proposed):** `SOFT-LAUNCH-REPO-TRUTH-RT3-B-PUBLIC-NON-DIRECTORY-PAGE-QUALIFIER-AUDIT`

**Scope:**
1. Audit demo/reference labeling on non-directory public surfaces (collections, industry cluster, DPP, passport)
2. Confirm "Batch Reference" and "Passport Reference" in `PublicPassport.tsx` are DPP provenance terminology and not demo-label machinery
3. Assess whether any trust/SEO qualifier copy on non-directory surfaces implies demo-data status
4. Produce classification table matching RT3-A §8 format

**Pre-conditions for RT3-B:**
- Explicit authorization from Paresh Patel
- RT3-A committed and HEAD updated

**This unit (RT3-A) does NOT open RT3-B. Paresh Patel must issue an explicit prompt to authorize.**

---

## §12 Explicit No-Authorization Statement

This unit authorizes **no implementation work of any kind**.

The following actions are explicitly **not authorized** by this audit:

- Implementation of `[DEMO]`, `[SAMPLE DATA]`, or any demo badge in any component
- Addition of `isDemoData` field to any API response, type definition, or Prisma schema
- Data seeding of any demo, QA, or fixture tenant
- Modification of `publicB2CProjection.service.ts` or `publicB2BProjection.service.ts`
- Modification of `PublicProductDetail.tsx`, `PublicSupplierProfile.tsx`, `B2CBrowse.tsx`, `B2BDiscovery.tsx`, or `PublicAggregatorPreview.tsx`
- SQL execution of any kind
- Creation of any helper script or temporary file
- Update of TLRH index
- Opening of RT3-B or any other governance unit

If Paresh wishes to implement the PRIT-001 §7 labeling requirements, a separate implementation prompt with an explicit allowlist must be issued.

---

*End of SOFT-LAUNCH-REPO-TRUTH-RT3-A-DIRECTORY-DEMO-LABEL-AUDIT. Status: COMPLETE.*
