# SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001

**Unit type:** Governance review — priority reset from requirements intake  
**Status:** COMPLETE  
**Date:** 2026-07-14  
**Authorized by:** Paresh Patel (TexQtic founder)  
**Layer 0 posture at execution:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED  
**Pre-existing unstaged M files (do NOT stage in any unit):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Unit Header and Authority Boundary

### Purpose

This unit records a **formal priority reset** for the TexQtic soft-launch track, driven by
Paresh's corrected strategic direction after reviewing the A1–D2 blueprint chain and the F1
questionnaire output.

It does NOT open any family cycle, authorize any implementation, modify Layer 0, modify the
planned requirements intake queue, or change any source document status.

It produces a governance record of the revised priority order and the reasoning behind each
decision.

### This document IS:
- A governance record of Paresh's corrected soft-launch strategic direction
- A priority reset artifact resolving drift identified in the A1–D2 blueprint focus chain
- A forward-planning document identifying the next 3–5 governance units in strict order
- An input to the first family cycle selection and its sequencing

### This document IS NOT:
- Implementation authorization for any unit, family, or feature
- A Layer 0 authority change
- A modification of `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` or any source register
- A family opening record
- A sprint plan or timeline commitment
- Authorization to complete the F1 questionnaire as a prerequisite gating task

---

## §2 Documents Inspected (Read-Only)

| # | Document | Purpose of inspection |
|---|---|---|
| 1 | `governance/control/NEXT-ACTION.md` | Layer 0 posture; active delivery unit; last closed unit; next candidate gate |
| 2 | `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-001–035 intake rows; priority and launch class assignments |
| 3 | `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | Family readiness matrix; critical path skeleton |
| 4 | `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | Binary launch checklist; NOT_ASSESSED items |
| 5 | `governance/launch-readiness/PILOT-READINESS-SURAT.md` | Surat pilot readiness criteria; supplier/buyer thresholds |
| 6 | `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | Soft-launch definition; allowed/prohibited surfaces; prerequisite checklists; Decisions A–G |
| 7 | `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | 24-family classification matrix; proposed cycle order; VERIFIED_COMPLETE families |
| 8 | `governance/launch-readiness/FIRST-FAMILY-CYCLE-SELECTION.md` | FAM-06 selected as first family cycle; standalone prerequisite queue |
| 9 | `governance/units/SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` | D2 blueprint; A4/B4/C4 synthesis; Phase 0–6 provisioning sequence |
| 10 | `governance/units/SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1.md` | F1 questionnaire; Paresh's required inputs before demo supplier provisioning |
| 11 | `governance/units/SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001.md` | A4 onboarding flow map; invite URL constraint; Gate C explanation |
| 12 | `governance/units/SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-001.md` | B4 supplier field inventory |
| 13 | `governance/units/SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-001.md` | C4 product data inventory |
| 14 | `governance/units/HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001.md` | HD-002 status; VERIFIED_FAIL; QA data quarantine impact |
| 15 | `governance/units/AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS.md` | Aggregator discovery unit; CLOSED; PRODUCTION_VERIFIED |
| 16 | `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.md` | Intake queue population unit; source of PRIT entries |
| 17 | `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001.md` | Prior review unit; PRIT-011–027 confirmations |
| 18 | `governance/units/TEXQTIC-INDUSTRY-CLUSTER-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Aggregator taxonomy; cluster/industry surfaces; gap analysis |
| 19 | `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | B2C family tracker; five gates; current repo truth |
| 20 | `docs/TEXQTIC-MARKETING-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md` | Marketing team constraints; canonical platform truth for marketing copy |
| 21 | `governance/units/TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001.md` | Strategy unit; governance register updates from strategy |
| 22 | `governance/launch-readiness/README.md` | TLRH read order; hub structure |
| 23 | `governance/gap-register.md` | Gap register; current known gaps |

---

## §3 Current Known Accepted Artifacts — A1–D2 Chain and F1

The following governance artifacts from the A1–D2 blueprint chain and F1 questionnaire are
confirmed complete and committed. No further work is required on these artifacts themselves.

| ID | Unit | File | Commit | Status |
|---|---|---|---|---|
| A4 | Onboarding Flow Map (corrected) | `SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001.md` | `dbb33a5` | COMPLETE |
| B4 | Supplier Field Inventory (corrected) | `SOFT-LAUNCH-SUPPLIER-FIELD-INVENTORY-001.md` | `8b7bb0d` | COMPLETE |
| C4 | Product Data Inventory | `SOFT-LAUNCH-PRODUCT-DATA-INVENTORY-001.md` | `90f0d1b` | COMPLETE |
| D2 | Demo Data Blueprint (corrected ×2) | `SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` | `9763141` / `77f31ed` | COMPLETE |
| F1 | Supplier Data Questionnaire | `SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1.md` | `592adba` | COMPLETE |

**Combined contribution of A1–D2 + F1:**
1. The invite URL constraint (`&action=invite` required; `/accept-invite` path required) is documented in both A4 and D2.
2. Gate C constraint (`org_type = 'B2C'` required; Surat B2B pilot accounts will never pass) is documented in D2.
3. The manual provisioning path (no SMTP required; token returned in 201 response; Paresh is sole actor) is proven and documented.
4. The F1 questionnaire captures all Paresh inputs needed before any demo supplier provisioning attempt.
5. These artifacts are governance-complete. Their value is as input to the next execution steps — they do not prescribe priority independently.

**HD-002 current state:**
- Status: `VERIFIED_FAIL` — no real supplier data in production B2C browse.
- Public browse returns `items:[], total:0` after QA fixture quarantine (TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001).
- HD-002 cannot be rechecked until real or clearly labeled demo/reference supplier data is seeded.

---

## §4 Paresh's Corrected Strategic Direction

The following seven points are Paresh's corrected strategic direction, recorded verbatim.
These override any implicit priority order suggested by the A1–D2 blueprint focus chain.

1. **Demo supplier/product seeding is useful for reference but must not be treated as genuine onboarded suppliers.** Any seeded data — whether from F1 or from QA re-labeling — must be labeled `demo`, `dummy`, or `reference-only` at every point of external visibility. It must not be presented to buyers or investors as real platform participants.

2. **Real suppliers are unlikely to provide complete product data until they see the platform working.** Waiting for real supplier data input (F1 questionnaire completion, named Surat suppliers, etc.) before moving forward on platform readiness is a false sequencing dependency. Platform readiness creates the conditions for real data; it does not depend on real data.

3. **Aggregator directory readiness is the priority as the supplier onboarding strategy.** The B2B aggregator directory (`/products`, `/product/:slug`, supplier profiles) must be the primary public reference surface. Making it visibly useful and accurate — even with labeled reference data — is the target state before any real supplier outreach.

4. **The marketing website must be organized, remediated, and upgraded content-wise as planned.** This is a parallel workstream, not a blocked one. Marketing content must accurately describe the platform using the canonical taxonomy (see `TEXQTIC-MARKETING-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md`). It must not over-claim capabilities that are not yet production-ready.

5. **The dynamic public pages of `app.texqtic.com` should be ready as reference and demo surfaces.** QA and demo seeds are acceptable for these pages if clearly marked. The pages themselves (B2C browse, collections, product detail, supplier profile) are production-verified. The gap is data quality and labeling — not the technical implementation.

6. **Main app MVP readiness remains the larger priority.** The family cycle sequence (FAM-06 → FAM-07 → FAM-08 → FAM-09 → FAM-10) is the hard MVP path. Auth/session management (FAM-06) must be verified before real suppliers can be onboarded through the invite flow. Soft-launch network building is only sustainable if the main app is actually ready for real users.

7. **Do not give undue priority to units or families that can be done later.** The F1 questionnaire, demo data seeding, collection data curation, and DPP passport linking are all useful — but they are not blockers for the family cycle work or for the marketing website. These should be treated as parallel or deferred tracks, not as prerequisites for platform readiness.

---

## §5 Priority Reset Decision — What Moves Up, Down, Stays Blocked, or Becomes Next

### What moves UP (elevated priority):

| Item | Prior implied priority | Reset priority | Rationale |
|---|---|---|---|
| FAM-06 family cycle opening (`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`) | Already selected; awaiting Layer 0 release | **P0 — first unblocked action when HOLD_FOR_AUTHORIZATION releases** | Platform cannot onboard real suppliers without auth/session verification. Already selected in FIRST-FAMILY-CYCLE-SELECTION.md. No further selection decision needed. |
| Marketing website content remediation (new governance unit needed) | Not in current unit queue | **P1 — parallel workstream; does not wait for platform readiness** | Marketing can proceed on taxonomy-aligned content using the marketing handoff white paper. It does not depend on F1 completion or supplier seeding. |
| Dynamic public pages — data labeling and readiness check (new assessment unit needed) | Not assessed | **P1 — must be confirmed before any buyer-facing reference links are shared** | Pages are technically ready. The gap is labeled reference/demo data and confirmation that no QA artefacts are visible as real. |
| Minimum notification loop (FTR-B2C-004) | P1, not yet started | **P1 soft-launch blocker — must precede any real buyer outreach** | Confirmed in FIRST-FAMILY-CYCLE-SELECTION.md as standalone prerequisite. |
| Legal pages bundle (PRIT-034) | P1, not yet started | **P1 soft-launch blocker — must precede buyer data collection** | Confirmed in FIRST-FAMILY-CYCLE-SELECTION.md as standalone prerequisite. |

### What moves DOWN (de-elevated priority):

| Item | Prior implied priority | Reset priority | Rationale |
|---|---|---|---|
| F1 questionnaire completion (Paresh fills in real supplier data) | Implied immediate next step after questionnaire creation | **Deferred — Paresh fills on own schedule; not blocking any platform work** | Real supplier data cannot come before platform is proven. F1 is captured and ready. No unit needs to wait for it. |
| Demo data seeding execution (Phase 1–6 of D2 blueprint) | Implied next operational step | **Deferred — execute only after FAM-06/FAM-07 verified OR as labeled reference only** | Seeding before auth is verified creates a data state that may need to be unwound. Only demo/reference-labeled data can be seeded without FAM-07 completion. |
| HD-002 recheck | Awaiting real data | **Blocked — cannot recheck until labeled reference or real data is seeded** | Explicitly dependent on data seeding. Not a near-term priority. |
| F2 — real supplier provisioning pilot | Not yet opened | **Blocked on FAM-06/FAM-07 completion** | Cannot onboard real suppliers with the invite flow until auth/session is production-verified. |
| G1/G2 — product seeding design and implementation | Not yet opened | **Blocked on real supplier availability and FAM-09 completion** | Product seeding is downstream of platform readiness. |
| DPP passport surface (HOLD_FOR_PARESH_DECISION) | Conditional, parked | **Remains parked — HOLD_FOR_PARESH_DECISION unchanged** | D-001 remains parked. Not elevated by this priority reset. |
| SMTP / email delivery infrastructure | HD-001 SMTP gap identified | **Deferred — not blocking soft launch; manual delivery of invite URLs is proven** | HD-001 documents that the invite token is returned in the 201 response. SMTP is needed only when PRIT-033 Stage 2 (supplier email notifications) is implemented. |
| DPP collection linking, SEO expansion, B2C SEO metadata | Ongoing governance | **Maintain-and-defer — not elevated to soft-launch critical path** | These are valuable but do not change whether the directory is usable or whether real suppliers can be onboarded. |

### What stays blocked (no change):

| Item | Status | Reason |
|---|---|---|
| TradeTrust Pay (TTP) | `HOLD_FOR_COUNSEL_FEEDBACK` | External legal counsel feedback not yet received. Unchanged. |
| Network Commerce Award maker-checker (G-022) | `HOLD_FOR_PARESH_DECISION` | Paresh has not lifted the hold. Unchanged. |
| Supplier quote feature flag (QD-6) | Explicitly held | Paresh has not lifted. Unchanged. |
| White Label Co surfaces | `REVIEW-UNKNOWN` hold | Hold unchanged. Not a soft-launch surface. |
| B2C/D2C checkout, cart, payment integration | Multiple D-012/D-015 parked decisions | Commerce methodology freeze. Unchanged. |
| FAM-07–FAM-10 family cycles | Gated on FAM-06 completion | Sequential dependency. Cannot open before FAM-06 closes. |

---

## §6 Soft-Launch Priority Matrix

The priority matrix below applies to the soft-launch network-building phase. It does NOT
supersede the planned requirements intake (PRIT-001 onwards) or any family cycle sequencing.

| Priority | Track | Item | Status | Gate |
|---|---|---|---|---|
| **P0** | Main app MVP | FAM-06 Auth/Session family cycle opening | NOT_ASSESSED — SELECTED | Awaiting `HOLD_FOR_AUTHORIZATION` release |
| **P0** | Main app MVP | FAM-07 Tenant Onboarding family cycle | NOT_ASSESSED | Gated on FAM-06 completion |
| **P0** | Main app MVP | FAM-08 Tenant Core Workspace family cycle | NOT_ASSESSED | Gated on FAM-07 completion |
| **P0** | Main app MVP | FAM-09 Supplier Profile/Catalog family cycle | NOT_ASSESSED | Gated on FAM-08 completion |
| **P0** | Main app MVP | FAM-10 Platform Ops/Control Plane family cycle | NOT_ASSESSED | May open in parallel with FAM-08/09 |
| **P1** | Soft launch | Marketing website content remediation | NOT_STARTED | Parallel; independent; governed by marketing handoff white paper |
| **P1** | Soft launch | Dynamic public pages — demo/reference data labeling check | NOT_ASSESSED | Parallel; requires Paresh assessment |
| **P1** | Soft launch | Minimum notification loop (FTR-B2C-004) | NOT_STARTED | Standalone prerequisite; no family gate |
| **P1** | Soft launch | Legal pages bundle (PRIT-034) | NOT_STARTED | Standalone prerequisite; no family gate |
| **P1** | Soft launch | FAM-06 family cycle opening (repo-truth audit) | Selected in FIRST-FAMILY-CYCLE-SELECTION | Awaiting Layer 0 release |
| **P2 — MVP hard launch** | Main app MVP | FAM-11 Subscription/Commercial Gating | NOT_ASSESSED | Post-FAM-10 |
| **P2 — MVP hard launch** | Main app MVP | FAM-12 NC RFQ/Pools/Award completion | G-022 hold | G-022 HOLD_FOR_PARESH_DECISION |
| **P2 — MVP hard launch** | Public SEO | SEO canonical domain strategy (D-005) | PARKED | Required before broad SEO promotion |
| **P2 — pilot** | Data readiness | Demo/reference data seeding (D2 blueprint Phase 1–6) | Not started | After demo labeling check; labeled reference data only |
| **P2 — pilot** | Data readiness | F1 questionnaire completion by Paresh | READY — Paresh to fill | No unit dependency; Paresh-owned input |
| **Later / deferred** | Feature | Network Commerce RFQ expansion | G-022 hold | After Paresh decision |
| **Later / deferred** | Feature | TradeTrust Pay activation | HOLD_FOR_COUNSEL_FEEDBACK | Counsel feedback required |
| **Later / deferred** | Feature | White Label Co surfaces | REVIEW-UNKNOWN hold | Hold resolution required |
| **Later / deferred** | Feature | B2C/D2C checkout/cart | Commerce freeze | Multiple parked decisions |
| **Later / deferred** | Feature | AI Workbench / TexQtic CoWorker (FAM-19) | POST_MVP | Not before hard launch |
| **Later / deferred** | Feature | DPP passport DPP surface full activation | HOLD_FOR_PARESH_DECISION | D-001 parked |

---

## §7 Aggregator Directory Readiness Assessment

### Known readiness (from inspection):

| Surface | Status | Evidence |
|---|---|---|
| B2B products browse (`/products`) | PRODUCTION_VERIFIED | FAM-01 VERIFIED_COMPLETE |
| B2B product detail (`/product/:slug`) | PRODUCTION_VERIFIED | FAM-01 VERIFIED_COMPLETE |
| D2C public collections (`/collections`, `/collections/:slug`) | PRODUCTION_VERIFIED | FAM-02 VERIFIED_COMPLETE |
| Public inquiry submission | PRODUCTION_VERIFIED | FAM-03 VERIFIED_COMPLETE |
| SEO infrastructure (sitemap, robots.txt, JSON-LD) | PRODUCTION_VERIFIED | FAM-04 VERIFIED_COMPLETE |
| Supplier profile public pages (`/supplier/:slug`) | PARTIALLY_IMPLEMENTED | `PublicSupplierProfile.tsx` exists as pre-existing unstaged M file; FAM-09 not assessed |
| Aggregator discovery workspace (`/aggregator`) | PRODUCTION_VERIFIED (bounded) | `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` CLOSED |

**These surfaces are technically ready.** The directory is not visible because there is no
real or labeled reference data populating it. The technical implementation is not the gap.

### What is currently absent (from HD-002 VERIFIED_FAIL):

- **No real supplier data is in production.** After QA fixture quarantine, public browse returns
  `items:[], total:0`. The directory surface is empty.
- **No labeled reference/demo supplier data has been seeded.** The D2 blueprint and F1
  questionnaire provide the inputs and sequence, but no provisioning has been executed.

### What must happen to make the directory visible and useful:

| Step | Dependency | Notes |
|---|---|---|
| Paresh fills F1 questionnaire | Paresh-owned; no platform dependency | F1 is ready and committed. This is the input collection step. |
| Paresh provisions B2C demo supplier (D2 Phase 1) | No new code needed | Requires super-admin JWT; uses existing `/api/control/tenants/provision` endpoint |
| Paresh seeds demo products with correct labeling (D2 Phase 2–4) | DB script exists (needs B2C-specific variant) | Products must be labeled as demo/reference-only |
| Publication posture elevation for demo products (D2 Phase 5) | Controlled DB script (existing; needs org_id update) | Existing `assign-b2c-public-posture.ts` targets QA slug only; must be updated |
| HD-002 recheck | After data seeding | A4/D2 artifacts already document the recheck procedure |

### What must be inspected next for aggregator readiness:

- **Supplier profile completeness for pilot visibility:** `PublicSupplierProfile.tsx` is pre-existing and unstaged; its current rendering must be assessed before sharing supplier profile links with real buyers. This is part of FAM-09 scope.
- **Collection data curation:** The static `publicCollectionsProjection.ts` config defines 5 approved collection slugs. Their content truth must be confirmed before sharing collection pages.
- **Industry/Cluster taxonomy for directory context:** The industry/cluster taxonomy model exists in `config/publicIndustryClusterTaxonomy.ts` but has no dynamic slug pages (`/industries/:slug`, `/clusters/:slug`). These are deferred but noted.
- **SMTP / notification loop:** Before sharing any buyer-facing aggregator links, FTR-B2C-004 minimum notification must be in place. This is a P1 standalone prerequisite.

---

## §8 Marketing Website Remediation Assessment

### Planned content work (from inspection):

The marketing website is a separate surface from `app.texqtic.com`. It operates under the
canonical taxonomy constraints defined in `docs/TEXQTIC-MARKETING-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md`.

Key constraints from that white paper:
- The marketing team does not own canonical taxonomy truth. Platform governance defines what may be truthfully said.
- Copy must not over-claim capabilities that are not yet production-ready (no AI, no traceability at scale, no TTP, no checkout/cart).
- B2B segment and role language must match the canonical taxonomy.
- Interest-capture forms must be framed as interest signals — not classification events.
- White Label and Aggregator must be described accurately, not over-positioned.

### Relationship to Option F (F-series questionnaire/provisioning track):

The marketing website content remediation does **not** depend on F1 questionnaire completion
or F2 real supplier provisioning. Marketing content is governed by:
1. The canonical platform taxonomy (locked through the April 2026 governance chain)
2. The production-verified capability truth (FAM-01–04 VERIFIED_COMPLETE)
3. The marketing handoff white paper constraints

**Marketing can begin content remediation immediately** with the current governance record.
It does not need to wait for:
- Real supplier data in production
- F1 completion by Paresh
- Demo data seeding
- FAM-06 through FAM-10 family cycles

The only marketing content that should reference authenticated/private platform features
(tenant dashboard, supplier catalog management, RFQ flows, etc.) must be framed as
"coming soon" or "register interest" copy — consistent with §6 PROHIBITED surfaces in
the soft-launch strategy.

### What the marketing website remediation unit should cover:

1. **Content audit**: Identify any copy that over-claims capabilities not yet PRODUCTION_VERIFIED.
2. **Taxonomy alignment**: Verify that B2B segment/role language, family names, and capability claims match the canonical taxonomy from the marketing handoff white paper.
3. **Call to action framing**: Ensure inquiry/lead forms are framed as interest capture — not registration or classification.
4. **Aggregator and White Label framing**: Confirm neither is misrepresented as either more or less capable than the current production state.
5. **Coming-soon treatment**: Surface any un-launched capabilities that are currently presented as live.

This is a governance and content planning unit — not a platform implementation unit.
It requires no server code, schema, migration, or frontend component changes.

---

## §9 Dynamic Public App Pages Assessment

### Which pages are technically ready (from inspection):

| Page | Route | Status | Notes |
|---|---|---|---|
| B2C product browse | `/products` | PRODUCTION_VERIFIED | Empty after QA quarantine; needs labeled data |
| B2C product detail | `/product/:slug` | PRODUCTION_VERIFIED | Returns safe unavailable state if no product |
| D2C collections landing | `/collections` | PRODUCTION_VERIFIED | Config-driven; 5 approved collection slugs |
| D2C collection detail | `/collections/:slug` | PRODUCTION_VERIFIED | Static config; content must be confirmed |
| Public inquiry form | Embedded at product/supplier pages | PRODUCTION_VERIFIED | Minimum notification loop required before broad use |
| Supplier profile | `/supplier/:slug` | PARTIALLY_IMPLEMENTED | Pre-existing unstaged M file; FAM-09 not assessed |
| DPP passport | `/passport/:id` | CONDITIONAL | HOLD_FOR_PARESH_DECISION on D-001 |
| Industry/Cluster landing | `/industries` | STATIC_ONLY | No dynamic slug pages; static landing only |
| Aggregator preview | `/aggregator` | PRODUCTION_VERIFIED | Bounded; discovery workspace only |

### Whether QA/demo data is acceptable for reference surfaces:

**Yes — with explicit labeling.** Per Paresh's corrected direction (§4 point 5):

> Dynamic public pages of `app.texqtic.com` should be ready as reference and demo surfaces.
> QA and demo seeds are acceptable if clearly marked.

**Labeling requirement (see §10 below):** Any data visible on public-facing pages that is not
from a real onboarded supplier must be labeled as `[DEMO]`, `[REFERENCE ONLY]`, or
`[SAMPLE DATA]` at every point of external visibility.

### What must be assessed before sharing public page links:

1. **Confirm no QA fixture data is leaking through to the public browse.** After quarantine, the projection returns empty. This must be confirmed via a live check before any reference to the `/products` page in buyer-facing material.
2. **Confirm collection pages display current content.** The static `publicCollectionsProjection.ts` config defines 5 approved collections. Their title/description/image content must be current and accurate.
3. **Confirm supplier profile pages are safe to share.** `PublicSupplierProfile.tsx` exists as a pre-existing unstaged file. Its current state must be assessed as part of the public pages readiness check.
4. **Confirm DPP passport surface posture.** DPP links on product detail pages should only show if `publicPassportId` is set on the product and D-001 is resolved.

This assessment is the scope of the recommended governance unit `SOFT-LAUNCH-PUBLIC-PAGES-DEMO-LABEL-READINESS-001` (see §11).

---

## §10 Demo Data Truthfulness Rule

**This rule is unconditional and applies to every piece of data visible on any public
TexQtic surface — browser-facing, API-facing, or investor-presentation-facing.**

> **Any seeded data that is not from a real, verified, active supplier organization
> must be labeled as demo, dummy, or reference-only at every point of external visibility.**

**Specific enforcement points:**

| Enforcement point | Requirement |
|---|---|
| Product browse page (`/products`) | Products from demo/QA tenants must display a visible badge or label: `[DEMO]` or `[SAMPLE DATA]` |
| Product detail page (`/product/:slug`) | Supplier attribution for demo tenants must show `[DEMO SUPPLIER]` or equivalent |
| Supplier profile page (`/supplier/:slug`) | Demo supplier profiles must show `[DEMO PROFILE — NOT A REAL SUPPLIER]` in a prominent location |
| Collection pages | If collection images or descriptions reference demo supplier data, label as `[REFERENCE CONTENT]` |
| API responses | Demo tenant data should carry a `isDemoData: true` flag in projection responses where feasible, or be excluded by default unless explicitly requested by the operator |
| Investor presentations / screenshots | Any screenshot of the platform used externally must clearly annotate demo data as `[SAMPLE DATA — NOT REAL SUPPLIER]` |
| Any buyer-facing outreach material | Must not include screenshots of demo data without labeling |

**This rule applies even during the operational demo/reference seeding phase (D2 blueprint
Phase 1–6). If Paresh seeds demo data before real suppliers are onboarded, every demo product
and demo supplier must be labeled per the above from the moment it becomes publicly visible.**

**Failure mode to avoid:** Buyers, investors, or journalists discovering that the
"live platform" is populated with placeholder data. This would undermine credibility at the
precise moment the platform needs to demonstrate authentic supplier engagement.

---

## §11 Recommended Next 3–5 Governance Units (Strict Order)

The following units are recommended in priority order. None of these are opened by this document.
Each requires a separate explicit authorization from Paresh before work begins.

| # | Unit ID (proposed) | Track | Priority | Gate | Description |
|---|---|---|---|---|---|
| 1 | `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001` | Main app MVP | **P0** | Awaiting `HOLD_FOR_AUTHORIZATION` release from Paresh | Open the FAM-06 Auth and Session Management family cycle. This is already selected in FIRST-FAMILY-CYCLE-SELECTION.md. It is the first full family cycle. When Paresh releases the hold, this unit opens immediately. |
| 2 | `SOFT-LAUNCH-MARKETING-WEBSITE-REMEDIATION-ASSESSMENT-001` | Marketing | **P1** | No platform gate — can open in parallel with FAM-06 | Governance-only unit. Audit current marketing website copy against the canonical taxonomy. Identify over-claims. Produce a content gap list and remediation plan. No implementation. Uses `TEXQTIC-MARKETING-TAXONOMY-HANDOFF-WHITE-PAPER-v1.md` as the governing constraint. |
| 3 | `SOFT-LAUNCH-PUBLIC-PAGES-DEMO-LABEL-READINESS-001` | Aggregator / public pages | **P1** | No platform gate — can open after unit 2 or in parallel | Assessment unit only. Confirm that QA data is not leaking through public surfaces after quarantine. Confirm collection page content is current. Define demo/reference data labeling standard. Confirm supplier profile page (`PublicSupplierProfile.tsx`) current state and whether it is safe to share. |
| 4 | `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` | Soft-launch prerequisite | **P1** | No family gate; standalone prerequisite | Implement FTR-B2C-004 minimum inquiry notification to supplier/admin. P1 soft-launch blocker confirmed in FIRST-FAMILY-CYCLE-SELECTION.md. Must complete before any real buyer-facing outreach or inquiry CTA promotion. |
| 5 | `SOFT-LAUNCH-LEGAL-PAGES-BUNDLE-UNIT-001` | Soft-launch prerequisite | **P1** | No family gate; standalone prerequisite | Implement PRIT-034 legal pages bundle (privacy policy, terms, cookie stance, DSAR path). P1 soft-launch blocker confirmed in FIRST-FAMILY-CYCLE-SELECTION.md. Must complete before buyer data collection at scale. |

**Sequencing notes:**
- Unit 1 (FAM-06) is the P0 anchor. It unblocks FAM-07 → FAM-08 → FAM-09 → FAM-10 in sequence.
- Units 2–3 are governance-only and can open in parallel without waiting for FAM-06.
- Units 4–5 are standalone prerequisites already identified in FIRST-FAMILY-CYCLE-SELECTION.md. They do not require FAM-06 to complete first; they run in parallel and must complete before buyer outreach.
- F1 questionnaire completion by Paresh (demo data inputs) can happen in parallel at any time. It is not a gate for any of units 1–5.
- Demo data seeding (D2 blueprint Phase 1–6) is a deferred parallel track. It should not be executed until unit 3 confirms the labeling standard, and it should not seed data that appears unlabeled in public browse.

**Units explicitly NOT recommended at this time:**
- F2 (real supplier provisioning pilot) — blocked on FAM-06/FAM-07
- G1/G2 (product seeding design) — blocked on real supplier availability and FAM-09
- HD-002 recheck — blocked on data seeding
- FAM-07 through FAM-10 cycles — gated on FAM-06 completion
- DPP passport activation — HOLD_FOR_PARESH_DECISION; unchanged
- TTP / legal packet — HOLD_FOR_COUNSEL_FEEDBACK; unchanged
- Network Commerce Award maker-checker — HOLD_FOR_PARESH_DECISION; unchanged

---

## §12 Explicit No-Authorization Statement

**This unit authorizes nothing.**

It does not:
- Open any family implementation cycle
- Authorize implementation of any route, service, component, or schema change
- Authorize any database write, provisioning, seeding, or migration
- Modify `governance/control/NEXT-ACTION.md`, `OPEN-SET.md`, or `BLOCKED.md`
- Modify the PRIT intake queue or any source register
- Change Layer 0 posture (`HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED)
- Lift any hold on NC Phase 2, TTP, WL Co, or G-022
- Commit any code to server, client, tests, schema, or migrations

The only authorized action for this unit is the creation of this governance artifact and
its single-file commit to `governance/units/SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md`.

Every item listed in §11 requires:
1. Paresh's explicit written authorization for each unit
2. A separate governed unit with its own allowlist, files changed, and commit
3. Compliance with Layer 0 posture at the time of opening

---

*SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001 — COMPLETE*
