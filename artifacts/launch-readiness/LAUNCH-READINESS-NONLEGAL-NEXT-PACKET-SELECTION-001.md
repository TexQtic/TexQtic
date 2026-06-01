# LAUNCH-READINESS-NONLEGAL-NEXT-PACKET-SELECTION-001

**ID:** LAUNCH-READINESS-NONLEGAL-NEXT-PACKET-SELECTION-001  
**Type:** Governance Planning Artifact — Selection Report  
**Status:** FINAL — SELECTION_COMPLETE  
**Head commit at time of inspection:** `ee6252d9`  
**Created:** 2026-07-01 (selection unit execution)  
**Authority:** `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` (§5–§7), `governance/control/NEXT-ACTION.md`, `governance/control/OPEN-SET.md`, `governance/control/BLOCKED.md`  
**Author scope:** Copilot agent — read-only audit + selection document production  
**Location:** `artifacts/launch-readiness/` (git-ignored; committed with `-f`)

---

## §1 — Purpose

This artifact records the result of a comprehensive repo-truth audit of all nonlegal
launch-readiness surfaces in the TexQtic platform, performed while the FAM-07 supplier
onboarding legal gate is in `HOLD_FOR_HUMAN_LEGAL_INPUTS` posture.

The purpose is to:
1. Establish a verified read of the current FAM family status landscape
2. Survey all open FTR items that are MVP_CRITICAL and not legal-gated
3. Audit public-facing app states and component implementations
4. Identify candidate implementation packets that are safe to advance without the legal gate
5. Select the next safest, highest-impact nonlegal launch-readiness packet
6. Produce the governance recommendation required before the Layer 0 pointer is updated

This document does NOT:
- Open any implementation unit
- Authorize any implementation
- Modify any tracker, governance, or source file
- Advance the FAM-07 legal gate
- Create any legal authority

---

## §2 — Scope

**Read-only audit surfaces inspected in this unit:**
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` — full §1–§7 (all 24 families)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` — full §1–§11 (all FTR items)
- `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` — all sections
- `governance/launch-readiness/PILOT-READINESS-SURAT.md` — all sections
- `governance/control/NEXT-ACTION.md` — Layer 0 pointer full read
- `governance/control/OPEN-SET.md` — Layer 0 posture
- `governance/control/BLOCKED.md` — all blocked/hold items
- `App.tsx` — all `PUBLIC_*` appState routes and render cases
- `components/Public/` — all 16 public component files (header/implementation read)
- `services/publicB2BService.ts` — public B2B service implementation
- `services/publicB2CService.ts` — public B2C service (headers)
- `runtime/sessionRuntimeDescriptor.ts` — session realm types
- `services/` directory listing — all 25 service files

**Allowed write output (this artifact only):**
```
artifacts/launch-readiness/LAUNCH-READINESS-NONLEGAL-NEXT-PACKET-SELECTION-001.md
```

No tracker files, no governance control files, no source files, no test files modified.

---

## §3 — Preflight State

| Dimension | State |
|---|---|
| HEAD commit | `ee6252d9` — "docs(fam-07): sync legal authority human hold posture" |
| Working tree | CLEAN — `git status --short` produced no output |
| Active delivery unit | `FAM-07L13C-LEGAL-AUTHORITY-HUMAN-HOLD-TRACKER-SYNC-001` — VERIFIED_COMPLETE |
| Next candidate unit (Layer 0) | `HOLD_FOR_HUMAN_LEGAL_INPUTS` — HOLD_ACTIVE |
| Legal gate | UNCHANGED — `HOLD_FOR_HUMAN_LEGAL_INPUTS` |
| FAM-07 status | `PARTIALLY_IMPLEMENTED` — not VERIFIED_COMPLETE |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` — not closed |
| Governance exception active | `false` |

---

## §4 — Layer 0 Posture Summary

The NEXT-ACTION.md pointer is in `HOLD_FOR_HUMAN_LEGAL_INPUTS` state installed 2026-06-01.
This hold:

- **Blocks:** FAM-07L14 (next legal implementation unit for FAM-07 supplier onboarding terms)
- **Does NOT block:** Any non-FAM-07 implementation or planning work
- **Does NOT block:** Repo-truth audits of other families (FAM-08, FAM-09, etc.)
- **Does NOT block:** FTR items with no legal dependency
- **Does NOT block:** Operational readiness documentation (FTR-OPS-001, FTR-OPS-003)
- **Does NOT block:** Soft-launch readiness design work (FTR-SL-001)

The Layer 0 pointer update (NEXT-ACTION.md) pointing to the selected nonlegal unit is a
required step BEFORE any new implementation unit opens, but is NOT performed in this artifact.
This artifact provides the selection evidence required to authorize that pointer update.

**DPP Passport Network:** `PRODUCTION_READY` (TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002).
Launch authorization: `HOLD_FOR_PARESH_DECISION`. Unchanged.

---

## §5 — FAM Family Survey — Complete Classification Matrix

All 24 families inspected from LAUNCH-FAMILY-INDEX.md §5.

### §5.1 — VERIFIED_COMPLETE Families (no action required)

| FAM | Name | Priority | Launch Class | Cycle |
|---|---|---|---|---|
| FAM-01 | B2C Public Browse | P0 | MVP_CRITICAL | 1 — VERIFIED_COMPLETE |
| FAM-02 | D2C Public Collections | P0 | MVP_CRITICAL | 2 — VERIFIED_COMPLETE |
| FAM-03 | Inquiry Submission (Phase 1 + Phase 2) | P0 | MVP_CRITICAL | 3 — VERIFIED_COMPLETE |
| FAM-04 | SEO Infrastructure | P0 | MVP_CRITICAL | 4 — VERIFIED_COMPLETE |
| FAM-06 | Auth / Session | P0 | LAUNCH_BLOCKER | 5 — VERIFIED_COMPLETE |
| FAM-10 | Platform Ops / Control Plane | P0 | LAUNCH_BLOCKER | 9 — VERIFIED_COMPLETE |

**Observation:** 6 of 24 families are VERIFIED_COMPLETE including all P0 public surface and
auth families. These require maintenance only.

### §5.2 — Held / Blocked Families (requires human decision or legal input)

| FAM | Name | Priority | Hold Reason |
|---|---|---|---|
| FAM-05 | DPP Passport Network | P0 | PARKED — D-001 HOLD_FOR_PARESH_DECISION |
| FAM-07 | Tenant Onboarding Terms | P0 | PARTIALLY_IMPLEMENTED — HOLD_FOR_HUMAN_LEGAL_INPUTS |
| FAM-13 | NC Award Maker-Checker | P1 | DESIGN_GATED — HOLD_FOR_PARESH_DECISION (G-022) |
| FAM-14 | NC Supplier Quotes | P1 | BLOCKED — QD-6 hold |
| FAM-16 | TTP (TradeTrust Pay) | P1 | GOVERNANCE_CLAIM_ONLY — HOLD_FOR_COUNSEL_FEEDBACK |
| FAM-18 | White Label Co | P2 | PARKED — REVIEW-UNKNOWN |
| FAM-20–24 | Cross-dep families | Various | XDEP_ONLY or DESIGN_GATED |

**Observation:** 7 families are actively blocked by legal inputs, founder decisions, or
cross-dependencies. None of these are candidates for the next nonlegal implementation packet.

### §5.3 — NOT_ASSESSED / PARTIALLY_IMPLEMENTED Families (candidate audit surfaces)

| FAM | Name | Priority | Launch Class | Cycle (proposed) | Status |
|---|---|---|---|---|---|
| FAM-08 | Tenant Core Workspace | P0 | LAUNCH_BLOCKER | 7 | NOT_ASSESSED |
| FAM-09 | Supplier Profile and Catalog | P0 | LAUNCH_BLOCKER | 8 | NOT_ASSESSED |
| FAM-11 | Subscription and Commercial Gating | P1 | P1_MVP_MUST_HAVE | 10 | NOT_ASSESSED |
| FAM-12 | NC RFQ and Pools | P1 | P1_MVP_MUST_HAVE | 11 | PARTIALLY_IMPLEMENTED (TEST_CONFIRMED, NC Phase 1) — E2E blocked by FAM-13 gate |
| FAM-15 | NC Invoices and Settlement | P2 | POST_MVP | 12 | NOT_ASSESSED |
| FAM-17 | External Integrations | P3 | POST_MVP | — | DEFERRED |
| FAM-19 | Analytics and Reporting | P3 | POST_MVP | — | DEFERRED |

**Critical observation:** FAM-08 and FAM-09 are both P0 / LAUNCH_BLOCKER and completely
NOT_ASSESSED. They are the highest-priority unaudited families and represent the largest unknown
gap in the launch readiness picture. No repo-truth work has been performed on either.

---

## §6 — FTR Register Survey — Open MVP_CRITICAL Items (Nonlegal-Safe)

All FTR items inspected from FUTURE-TODO-REGISTER.md §1–§11.

### §6.1 — Open MVP_CRITICAL / IMPLEMENTATION_READY Items

| FTR ID | Name | Priority | Status | Safe? | Notes |
|---|---|---|---|---|---|
| FTR-SL-001 | Soft-launch aggregator directory readiness design | P1 | NOT_ASSESSED / OPEN | YES | Pre-outreach gate; design-only; no legal dependency |
| FTR-SL-003 | Minimum inquiry notification loop | P1 | PARTIAL | YES | Supplier-context path structurally implemented but NOT production runtime verified |
| FTR-SL-004 | Supplier inquiry inbox design (tenant dashboard) | P1 | OPEN | YES | Candidate for FAM-08 cycle; tenant-scoped surface |
| FTR-B2C-004 | Minimum inquiry notification loop (buyer ack + admin) | P1 | PARTIAL | YES | Buyer ack + admin alert verified; supplier-context not verified |
| FTR-B2C-005 | Supplier-context inquiry notification path — production runtime verification | P1 | IMPLEMENTATION_READY / OPEN | YES | Requires real/QA supplier with configured email; no legal dependency |
| FTR-OPS-001 | Error monitoring / alerting (Sentry or equivalent) | P1 | OPEN | YES | Operational readiness; no code change required for documentation |
| FTR-OPS-003 | Rollback procedure documentation | P1 | OPEN | YES | Pure documentation; no code risk; boundable in one unit |
| FTR-LEGAL-002 | Privacy/GDPR consent notice for inquiry form | P1 | OPEN | YES* | *NONLEGAL IMPLEMENTATION despite "LEGAL" name: public form UI content disclosure, NOT supplier onboarding legal gate; no FAM-07 dependency |

### §6.2 — Open LAUNCH_DEPENDENCY / DESIGN_GATED Items (nonlegal-safe but gated)

| FTR ID | Name | Priority | Status | Notes |
|---|---|---|---|---|
| FTR-SEO-002 | Product detail sitemap expansion | P2 | DESIGN_GATED | Requires design decision first |
| FTR-SEO-003 | Supplier profile indexability | P2 | DESIGN_GATED | Requires design decision first |
| FTR-SEO-008 | Product detail JSON-LD expansion | P2 | DESIGN_GATED | Requires design decision first |
| FTR-SEO-009 | Supplier profile JSON-LD | P2 | DESIGN_GATED | Requires design decision first |
| FTR-AUTH-003 | Auth crawl exclusion verification | P2 | ROBOTS_DEPLOYED / PARTIAL | FU-001 deployed; awaiting re-crawl for VERIFIED_PASS |
| FTR-B2C-003 | Supplier profile public pages | P2 | DESIGN_GATED | Requires design decision first |

### §6.3 — Blocked FTR Items (excluded from candidate list)

| FTR ID | Name | Blocker |
|---|---|---|
| FTR-NC-001 | Award maker-checker | DESIGN_GATED — Paresh G-022 decision required |
| FTR-NC-002 | Supplier quotes (QD-6 lift) | BLOCKED — Paresh QD-6 decision required |
| FTR-LEGAL-001 | TTP external legal counsel record | BLOCKED — external counsel |
| FTR-LEGAL-003 | Supplier onboarding terms authority | BLOCKED — FAM-07 legal gate (HOLD_FOR_HUMAN_LEGAL_INPUTS) |

---

## §7 — Public App State Inventory

Full `App.tsx` audit confirms 15 PUBLIC_* app states with rendering implementations:

| AppState | Route Pattern | Component | Implementation Status |
|---|---|---|---|
| `PUBLIC_ENTRY` | `/` | `B2BDiscoveryPage` + `B2CBrowsePage` entry | PRODUCTION_VERIFIED (FAM-01) |
| `PUBLIC_B2B_DISCOVERY` | `/b2b`, `/b2b/discovery` | `B2BDiscoveryPage` | PRODUCTION_VERIFIED (FAM-01) |
| `PUBLIC_PRODUCT_DETAIL` | `/products/:slug` | `PublicProductDetail` | PRODUCTION_VERIFIED (FAM-01) |
| `PUBLIC_B2C_CATEGORY_STORY` | `/products/category/:slug` | `PublicB2CCategoryPage` | PRODUCTION_VERIFIED (FAM-01) |
| `PUBLIC_COLLECTIONS` | `/collections` | `PublicCollectionsStub` | PRODUCTION_VERIFIED (FAM-02) |
| `PUBLIC_COLLECTION_DETAIL` | `/collections/:slug` | `PublicCollectionDetail` | PRODUCTION_VERIFIED (FAM-02) |
| `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | (no-slug fallback) | `PublicCollectionUnavailable` | PRODUCTION_VERIFIED (FAM-02) |
| `PUBLIC_TRUST_LANDING` | `/trust` | `PublicTrustLandingStub` | RENDERED — stub implementation |
| `PUBLIC_AGGREGATOR` | `/aggregator` | `PublicAggregatorPreview` | RENDERED — preview implementation |
| `PUBLIC_SUPPLIER_PROFILE` | `/supplier/:slug` | `PublicSupplierProfile` | RENDERED — full implementation including inquiry form; pre-existing unstaged M |
| `PUBLIC_PASSPORT` | `/passport/:id` | `PublicPassport` | PRODUCTION_VERIFIED (FAM-05 PRODUCTION_READY) |
| `PUBLIC_INQUIRY` | `/inquire` | `PublicInquiryPage` | PRODUCTION_VERIFIED (FAM-03) |
| `PUBLIC_REFERRAL_LANDING` | `/join/:referral_code` | `PublicReferralLanding` | RENDERED |
| `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `/industries` | `PublicIndustryClusterLanding` | RENDERED |
| `PUBLIC_NOT_FOUND` | (fallback) | 404 handler | RENDERED |

**Note on `components/Public/PublicSupplierProfile.tsx`:** Pre-existing unstaged modification (M).
This file must NOT be staged in any family cycle without explicit allowlist inclusion.

---

## §8 — Public Component Inventory

16 components in `components/Public/`:

| Component | Status | Notes |
|---|---|---|
| `B2BDiscovery.tsx` | PRODUCTION_VERIFIED | FAM-01 — B2B discovery browse |
| `B2CBrowse.tsx` | PRODUCTION_VERIFIED | FAM-01 — B2C product browse grid |
| `PublicAggregatorPreview.tsx` | RENDERED | Aggregator directory preview — stub/preview state |
| `PublicB2CCategoryPage.tsx` | PRODUCTION_VERIFIED | FAM-01 — 4 approved category story pages |
| `PublicCollectionDetail.tsx` | PRODUCTION_VERIFIED | FAM-02 — 5 approved collections |
| `PublicCollectionsStub.tsx` | PRODUCTION_VERIFIED | FAM-02 — collections list |
| `PublicCollectionUnavailable.tsx` | PRODUCTION_VERIFIED | FAM-02 — unavailable state |
| `PublicIndustryClusterLanding.tsx` | RENDERED | Industry cluster landing |
| `PublicInquiryPage.tsx` | PRODUCTION_VERIFIED | FAM-03 — full inquiry capture with context |
| `PublicNavbar.tsx` | PRODUCTION_VERIFIED | Shared public navigation |
| `PublicPassport.tsx` | PRODUCTION_VERIFIED | FAM-05 DPP passport linking |
| `PublicProductDetail.tsx` | PRODUCTION_VERIFIED | FAM-01 — product detail |
| `PublicReferralLanding.tsx` | RENDERED | Referral join landing |
| `PublicSupplierProfile.tsx` | RENDERED (unstaged M) | Full profile + embedded inquiry form |
| `PublicTrustLandingStub.tsx` | RENDERED | Trust landing — stub/preview state |
| `ReferencePreviewNotice.tsx` | PRODUCTION_VERIFIED | Shared reference preview badge |

---

## §9 — MVP Must-Haves Checklist Summary

From `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md`:

| Section | PRODUCTION_VERIFIED | NOT_ASSESSED (P0) | NOT_ASSESSED (P1) | BLOCKED |
|---|---|---|---|---|
| §2 Auth / Onboarding (A-1 to A-8) | 0 | 5 | 3 | 0 |
| §3 Tenant Core Workspace (T-1 to T-6) | 0 | 3 | 3 | 0 |
| §4 Supplier Profile / Product Data (S-1 to S-7) | 0 | 2 | 5 | 0 |
| §5 Public Surface / B2C (B-1 to B-9) | 5 | 1 | 3 | 0 |
| §6 Inquiry / Lead Capture (I-1 to I-6) | 3 | 1 | 2 | 0 |
| §7 SEO / Indexability (SEO-1 to SEO-6) | 4 | 1 | 1 | 0 |

**Critical observation:** All `NOT_ASSESSED (P0)` items in Auth/Onboarding, Tenant Core
Workspace, and Supplier Profile sections directly correspond to unaudited FAM-08 and FAM-09
territory. These are P0 launch blockers with zero production verification to date.

---

## §10 — Pilot Readiness Summary (Surat)

From `governance/launch-readiness/PILOT-READINESS-SURAT.md`:

Pilot readiness criteria PR-1 through PR-10 — all `NOT_ASSESSED`.

**Pilot kickoff gate (minimum platform conditions):**
- PR-1: Auth/onboarding with real email — NOT_ASSESSED → FAM-07 + FAM-08 territory
- PR-2: Supplier can create/publish product — NOT_ASSESSED → FAM-09 territory
- PR-3: Product appears in B2C browse — NOT_ASSESSED → FAM-09 + FAM-01 connection
- PR-4: Inquiry submission + notification — PARTIALLY MET (FAM-03 VERIFIED; FTR-SL-003 PARTIAL)
- PR-5: Control plane tenant activation + inspection — NOT_ASSESSED → FAM-10 + FAM-08 territory
- PR-6: 5 real Surat products seeded and visible — NOT_ASSESSED → FAM-09 + data ops
- PR-7: Auth/tenant pages confirmed noindex — NOT_ASSESSED → SEO-4 item
- PR-8: Paresh personally tested both roles — NOT_ASSESSED → human action
- PR-9: Rollback procedure documented + tested — NOT_ASSESSED → FTR-OPS-003
- PR-10: Error monitoring in place — NOT_ASSESSED → FTR-OPS-001

---

## §11 — Candidate Evaluation Matrix

Five candidates assessed for the next nonlegal launch-readiness packet:

| ID | Candidate Name | FTR/FAM | Priority | Launch Class | Legal Dependency | Safety | Readiness for This Cycle |
|---|---|---|---|---|---|---|---|
| **A** | FAM-08 Opening Repo-Truth Audit (Tenant Core Workspace) | FAM-08 | **P0** | **LAUNCH_BLOCKER** | None | ✅ HIGH | NOT_ASSESSED — pure audit unit |
| **B** | FTR-SL-001 Aggregator Directory Readiness Design | FTR-SL-001 | P1 | MVP_CRITICAL | None | ✅ HIGH | NOT_ASSESSED — design/governance unit |
| **C** | FAM-09 Opening Repo-Truth Audit (Supplier Profile and Catalog) | FAM-09 | P0 | LAUNCH_BLOCKER | None | ⚠️ MEDIUM | NOT_ASSESSED — unstaged M on PublicSupplierProfile.tsx adds care boundary |
| **D** | FTR-OPS-003 Rollback Procedure Documentation | FTR-OPS-003 | P1 | MVP_CRITICAL | None | ✅ HIGH | OPEN — pure documentation, no code risk |
| **E** | FTR-LEGAL-002 Privacy/GDPR Inquiry Form Notice | FTR-LEGAL-002 | P1 | MVP_CRITICAL | None | ✅ HIGH | OPEN — UI content disclosure (NOT FAM-07 legal gate) |

**Excluded (blocked) candidates:** FTR-NC-001, FTR-NC-002, FTR-LEGAL-001, FTR-LEGAL-003,
FAM-07L14, FAM-05 (HOLD_FOR_PARESH_DECISION), FAM-13 (G-022), FAM-14 (QD-6),
FAM-16 (counsel hold), FAM-18 (REVIEW-UNKNOWN).

---

## §12 — Candidate A: FAM-08 Opening Repo-Truth Audit

**Unit name proposed:** `FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001`

**Surface:**
- Tenant workspace routing in App.tsx (authenticated TENANT realm states)
- `runtime/sessionRuntimeDescriptor.ts` — TENANT_CONTEXT / ORG_ID session types
- `server/src/routes/` — tenant-scoped route handlers
- `server/prisma/schema.prisma` — org_id isolation in data model
- `services/tenantApiClient.ts`, `services/tenantService.ts` — client-side tenant calls
- MVP checklist §3 (T-1 to T-6) — workspace, org_id isolation, feature flags, subscription

**Why this is the strongest candidate:**
1. **P0 / LAUNCH_BLOCKER** — highest priority classification in FAM index
2. **Cycle 7** — directly next in the proposed FAM sequence after FAM-07 (which is paused)
3. **NOT_ASSESSED** — no production verification exists; an opening audit establishes ground truth
4. **No legal dependency** — completely decoupled from FAM-07 legal gate
5. **Bounded scope** — repo-truth audits are read-only; the output is an opening artifact
6. **Unblocks implementation planning** — exposes gaps that become the next implementation units
7. **MVP checklist blocker** — 6 NOT_ASSESSED P0 items in §2–§3 directly depend on this audit

**Risk:** FAM-08 surfaces include org_id isolation which is constitutionally sensitive. However,
the opening repo-truth audit is read-only — it does NOT modify auth, session, RLS, or tenancy
code. It simply establishes what is and is not present.

**Output:** A single governance artifact (`FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001.md`) documenting actual implementation vs. expected state across the 6 MVP checklist items (T-1 to T-6) and mapping to specific implementation gaps for the FAM-08 cycle.

---

## §13 — Candidate B: FTR-SL-001 Aggregator Directory Readiness Design

**Unit name proposed:** `LAUNCH-AGGREGATOR-DIRECTORY-SOFT-LAUNCH-READINESS-DESIGN-001`

**Surface:**
- `components/Public/PublicAggregatorPreview.tsx` — aggregator preview component (stub state)
- `components/Public/B2BDiscovery.tsx` — B2B supplier discovery browse (PRODUCTION_VERIFIED)
- `components/Public/PublicSupplierProfile.tsx` — supplier profile page (RENDERED + unstaged M)
- `services/aggregatorDiscoveryService.ts` — discovery service implementation
- `governance/launch-readiness/PILOT-READINESS-SURAT.md` — pilot criteria

**Why this is the second strongest candidate:**
1. **Pre-outreach gate** — directly gates when Paresh can share buyer-facing links for soft launch
2. **Directly supports FAM-01** (already PRODUCTION_CONFIRMED) — adds the promotional readiness layer
3. **Pure design/governance unit** — no implementation, no runtime changes, no code risk
4. **P1 MVP_CRITICAL** — required before first real Surat supplier profile goes live in a promotion context
5. **No legal dependency** — no connection to FAM-07 supplier onboarding terms

**Relationship to Candidate A:** Both A and B are nonlegal-safe. Candidate A (FAM-08) is the
higher-priority audit because P0/LAUNCH_BLOCKER > P1/MVP_CRITICAL and because the FAM-08
audit naturally precedes any soft-launch promotion trigger (can't promote until workspace audit
confirms supplier flows work end-to-end). However, Candidate B can run immediately after A,
or in a later bounded session.

---

## §14 — Candidate C: FAM-09 Opening Repo-Truth Audit

**Unit name proposed:** `FAM-09-SUPPLIER-PROFILE-CATALOG-OPENING-REPO-TRUTH-AUDIT-001`

**Surface:**
- `components/Public/PublicSupplierProfile.tsx` (**pre-existing unstaged M — care boundary**)
- Tenant supplier profile management surfaces (back-office)
- Product publish flow in tenant workspace
- `services/catalogService.ts` — catalog management
- MVP checklist §4 (S-1 to S-7) — supplier publish, product appearance, catalog management

**Why not primary:**
- FAM-09 is cycle 8 — proposed after FAM-08 (cycle 7)
- `PublicSupplierProfile.tsx` has a pre-existing unstaged modification that requires explicit
  handling before this family's audit can stage any related file. This is a care boundary,
  not a blocker for the audit itself (reading is safe).
- FAM-08 workspace audit is a natural prerequisite: supplier profile and catalog management
  are tenant-facing surfaces that require workspace (FAM-08) to be understood first.

**Status:** Strong second-round candidate after FAM-08 closes.

---

## §15 — Candidate D: FTR-OPS-003 Rollback Procedure Documentation

**Unit name proposed:** `LAUNCH-ROLLBACK-PROCEDURE-DOCUMENTATION-001`

**Surface:** Pure governance documentation — no source files.

**Why not primary (but highly recommended as a parallel bounded unit):**
- Extremely safe — zero code risk
- P1/MVP_CRITICAL, directly satisfies Pilot Readiness PR-9
- Can be completed in one bounded session with no implementation risk
- However, P1/MVP_CRITICAL < P0/LAUNCH_BLOCKER in prioritization
- Strongly recommended as a follow-on or parallel unit after FAM-08

---

## §16 — Candidate E: FTR-LEGAL-002 Privacy/GDPR Inquiry Form Notice

**Unit name proposed:** `PUBLIC-INQUIRY-FORM-PRIVACY-CONSENT-NOTICE-IMPLEMENTATION-001`

**Surface:** `components/Public/PublicInquiryPage.tsx` — add privacy/consent disclosure text.

**IMPORTANT CLARIFICATION:** Despite "LEGAL" in its FTR name, FTR-LEGAL-002 is a **UI content
implementation item**, not a legal gate. It adds a consent/disclosure notice to the public
inquiry form (`/inquire`) for GDPR/privacy compliance. This is:
- NOT the same as FAM-07 supplier onboarding terms
- NOT gated by the FTR-LEGAL-003 legal authority file
- NOT dependent on HOLD_FOR_HUMAN_LEGAL_INPUTS resolution
- A bounded UI text change to the existing `PublicInquiryPage` component

**Why not primary:**
- P1 < P0 in priority
- Implementation requires editing a source file (not pure audit)
- Requires Paresh to confirm the consent disclosure copy text before implementation
- Better suited as a bounded implementation unit after FAM-08 audit establishes workspace truth

---

## §17 — Blocked Candidate Exclusions

The following candidates were considered and explicitly excluded:

| Excluded | Reason |
|---|---|
| FAM-07L14 — Tenant onboarding legal terms implementation | `HOLD_FOR_HUMAN_LEGAL_INPUTS` — explicitly blocked |
| FTR-LEGAL-003 — Supplier onboarding terms authority | FAM-07 legal gate blocks this |
| FTR-NC-001 — Award maker-checker | `DESIGN_GATED` — Paresh G-022 decision required |
| FTR-NC-002 — Supplier quotes QD-6 lift | `BLOCKED` — Paresh QD-6 decision required |
| FTR-LEGAL-001 — TTP external counsel record | `BLOCKED` — awaiting external counsel |
| FAM-05 DPP launch | `HOLD_FOR_PARESH_DECISION` (D-001) |
| FAM-13 NC award | `DESIGN_GATED` (G-022) |
| FAM-14 NC supplier quotes | `BLOCKED` (QD-6) |
| FAM-16 TTP | `HOLD_FOR_COUNSEL_FEEDBACK` |
| FAM-18 White Label Co | `REVIEW-UNKNOWN` |
| FAM-20–24 | `XDEP_ONLY` or `DESIGN_GATED` |
| FTR-SEO-002/003/008/009 | `DESIGN_GATED` — design decisions pending |
| FTR-B2C-003 | `DESIGN_GATED` — design decisions pending |

---

## §18 — Selection Decision

### PRIMARY SELECTION

**Selected Packet:** `FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001`

**Classification:** Candidate A — FAM-08 Tenant Core Workspace  
**Priority:** P0 / LAUNCH_BLOCKER  
**Type:** Opening Repo-Truth Audit (read-only inspection → governance artifact)  
**Legal dependency:** None  
**Blocking dependencies:** None  
**Legal gate conflict:** None

### Selection Rationale

1. **Highest unblocked priority:** FAM-08 is P0 / LAUNCH_BLOCKER and completely NOT_ASSESSED.
   No production verification of the tenant core workspace exists. This is the single largest
   unknown in the launch readiness picture after FAM-07.

2. **Directly in cycle sequence:** LAUNCH-FAMILY-INDEX §4 proposes cycle 7 = FAM-08, immediately
   after FAM-07 (which is paused). An opening audit for FAM-08 is the natural continuation.

3. **No legal dependency:** FAM-08 tenant workspace has no connection to FAM-07 supplier
   onboarding terms. The legal hold does NOT block FAM-08.

4. **Bounded read-only unit:** An opening repo-truth audit cannot break anything. It reads
   existing code (auth, session, workspace routing, org_id isolation patterns) and produces
   a planning artifact that maps the gap between current state and MVP checklist requirements.

5. **Unblocks the largest cluster of NOT_ASSESSED items:** All 6 MVP checklist §3 items
   (T-1 to T-6), all 5 MVP checklist §2 P0 items (A-1 to A-5 minus the legal gate),
   and Pilot Readiness PR-1, PR-5 directly depend on understanding FAM-08 state.

6. **Gate for downstream families:** FAM-09 (supplier profile) and FAM-11 (subscription gating)
   both require FAM-08 workspace foundation to be audited first.

7. **Consistent with established pattern:** Prior opening audits (FAM-06: auth/session,
   FAM-10: control plane) followed this exact model — audit first, implement gaps second.

### RUNNER-UP SELECTION

**Runner-Up A:** `LAUNCH-AGGREGATOR-DIRECTORY-SOFT-LAUNCH-READINESS-DESIGN-001`  
**FTR:** FTR-SL-001 — Priority: P1 / MVP_CRITICAL  
**Recommended cycle:** Immediately after FAM-08 opening audit closes  
**Rationale:** Pre-outreach gate for soft launch; pure design/governance unit; no legal dependency; gates when buyer-facing links can be shared with Surat suppliers

**Runner-Up B:** `LAUNCH-ROLLBACK-PROCEDURE-DOCUMENTATION-001`  
**FTR:** FTR-OPS-003 — Priority: P1 / MVP_CRITICAL  
**Recommended cycle:** Can be opened in parallel with or after FAM-08 audit  
**Rationale:** Pure documentation; zero code risk; directly satisfies Pilot Readiness PR-9; bounded to one session

**Runner-Up C:** `FAM-09-SUPPLIER-PROFILE-CATALOG-OPENING-REPO-TRUTH-AUDIT-001`  
**FAM:** FAM-09 — Priority: P0 / LAUNCH_BLOCKER  
**Recommended cycle:** After FAM-08 closing audit and workspace gaps identified  
**Rationale:** P0/LAUNCH_BLOCKER but cycle 8 after FAM-08 (cycle 7); unstaged M care boundary requires explicit allowlist discipline

---

## §19 — Safety Analysis

The selected packet (FAM-08 opening repo-truth audit) is safe by all governance criteria:

| Safety Dimension | Assessment |
|---|---|
| Legal gate conflict | NONE — FAM-08 has no FAM-07 dependency |
| Org_id isolation risk | NONE — audit is read-only; no auth/RLS/tenancy code changes |
| Source file modification | NONE — opening repo-truth audits produce governance artifacts only |
| Database risk | NONE — no migrations, schema changes, or DB operations |
| Prisma risk | NONE — no Prisma commands required |
| Secret/env risk | NONE — no .env reads, no connection strings, no tokens |
| Staging risk | NONE — artifact is git-ignored; committed with `git add -f` |
| Legal hold conflict | NONE — this is the nonlegal path explicitly authorized by the selection prompt |
| White Label Co conflict | NONE — FAM-08 tenant workspace does not intersect WL brand/routing surfaces |
| DPP hold conflict | NONE — DPP HOLD_FOR_PARESH_DECISION does not block FAM-08 |

---

## §20 — Recommended Unit Scope (For FAM-08 Opening Audit)

The opening repo-truth audit for FAM-08 should inspect the following surfaces:

**Tenant workspace routing and session:**
- `App.tsx` — all `TENANT_*` appState entries and render cases
- `runtime/sessionRuntimeDescriptor.ts` — ORG_ID, TENANT_CONTEXT session types
- `contexts/` — auth context, tenant context providers
- `services/tenantApiClient.ts` — tenant API client configuration and auth headers

**Backend tenant workspace:**
- `server/src/routes/` — tenant-scoped route handlers (auth middleware, org_id injection)
- `server/src/plugins/` — Fastify auth plugins, session plugin
- `server/src/services/` — tenant service layer (org_id scoping)

**Schema and isolation:**
- `server/prisma/schema.prisma` — org_id field presence on tenant-scoped models
- Supabase RLS policy alignment (documentation cross-reference only; no DB calls)

**MVP checklist mapping:**
- T-1 (workspace access), T-2 (org_id isolation), T-3 (feature flags), T-4 (subscription),
  T-5 (admin settings), T-6 (cross-tenant isolation)

**Allowed write output:** One governance artifact file in `artifacts/` (git-ignored, committed with -f).

---

## §21 — Required Layer 0 Pointer Update

Before any implementation unit opens, the following governance pointer update is required:

**File:** `governance/control/NEXT-ACTION.md`  
**Change:** Update `next_candidate_unit` from `HOLD_FOR_HUMAN_LEGAL_INPUTS` to  
`FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001`  
**Condition:** This update must be proposed in a separate governance sync unit with explicit
Paresh approval; it is NOT performed in this selection artifact.

This selection artifact provides the evidence basis for that pointer update.

---

## §22 — Critical Invariants (MUST REMAIN UNCHANGED)

The following invariants are explicitly preserved and were NOT touched by this unit:

| Invariant | Status After This Unit |
|---|---|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` — UNCHANGED |
| FAM-07 legal gate | `HOLD_FOR_HUMAN_LEGAL_INPUTS` — UNCHANGED |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` — UNCHANGED |
| `governance/legal/fam-07/supplier-onboarding-terms-authority.json` | DOES NOT EXIST — UNCHANGED |
| HD-001 | `RUNTIME_CONFIRMED_CONFIGURED` — UNCHANGED |
| FAM-07L14 | BLOCKED until all L13 exit criteria met — UNCHANGED |
| DPP launch gate | `HOLD_FOR_PARESH_DECISION` (D-001) — UNCHANGED |
| NC award E2E | `DESIGN_COMPLETE — awaiting implementation authorization` — UNCHANGED |
| QD-6 | `supplier_quotes.enabled = false` — UNCHANGED |
| White Label Co hold | `REVIEW-UNKNOWN` — UNCHANGED |
| NEXT-ACTION.md | NOT MODIFIED in this unit |
| Any source file | NOT MODIFIED in this unit |
| Any tracker file | NOT MODIFIED in this unit |

---

## §23 — Out-of-Scope Items (Explicitly Not Done Here)

The following actions are explicitly out of scope for this unit:

- Opening FAM-08 (this selection artifact is the prerequisite; implementation not authorized here)
- Updating LAUNCH-FAMILY-INDEX.md FAM-08 status
- Updating FUTURE-TODO-REGISTER.md FTR-SL-001 status
- Updating NEXT-ACTION.md pointer
- Advancing OPEN-SET.md posture
- Any FAM-07 legal work
- Any runtime inspection (no server started, no production endpoints called)
- Any UI validation (no browser automation)
- Any database inspection (no Prisma commands, no psql)
- Installing new packages or dependencies

---

## §24 — Update History

| Date | Update | Author |
|---|---|---|
| 2026-07-01 | Initial creation — all 24 sections complete | Copilot agent (read-only audit + artifact production) |

---

## §25 — Final Enumeration

```
LAUNCH_READINESS_NONLEGAL_NEXT_PACKET_SELECTED

primary_selection:
  unit_id: FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001
  fam: FAM-08
  priority: P0
  launch_class: LAUNCH_BLOCKER
  type: OPENING_REPO_TRUTH_AUDIT
  legal_dependency: NONE
  safety: HIGH
  requires_layer0_pointer_update: true

runner_up_a:
  unit_id: LAUNCH-AGGREGATOR-DIRECTORY-SOFT-LAUNCH-READINESS-DESIGN-001
  ftr: FTR-SL-001
  priority: P1
  launch_class: MVP_CRITICAL
  type: DESIGN_GOVERNANCE_UNIT
  legal_dependency: NONE
  recommended_cycle: AFTER_FAM08_OPENING_AUDIT_CLOSES

runner_up_b:
  unit_id: LAUNCH-ROLLBACK-PROCEDURE-DOCUMENTATION-001
  ftr: FTR-OPS-003
  priority: P1
  launch_class: MVP_CRITICAL
  type: DOCUMENTATION_UNIT
  legal_dependency: NONE
  recommended_cycle: PARALLEL_OR_AFTER_FAM08

runner_up_c:
  unit_id: FAM-09-SUPPLIER-PROFILE-CATALOG-OPENING-REPO-TRUTH-AUDIT-001
  fam: FAM-09
  priority: P0
  launch_class: LAUNCH_BLOCKER
  type: OPENING_REPO_TRUTH_AUDIT
  legal_dependency: NONE
  care_boundary: PublicSupplierProfile.tsx_unstaged_M
  recommended_cycle: AFTER_FAM08_CLOSING_AUDIT

legal_gate_invariant:
  fam07_status: PARTIALLY_IMPLEMENTED
  fam07_hold: HOLD_FOR_HUMAN_LEGAL_INPUTS
  ftr_legal_003: MVP_CRITICAL/OPEN
  authority_file: ABSENT
  fam07l14: BLOCKED

head_at_time_of_selection: ee6252d9
artifact_status: FINAL
```
