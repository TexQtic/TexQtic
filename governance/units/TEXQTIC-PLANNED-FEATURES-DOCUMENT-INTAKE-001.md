# TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001

**Unit ID:** TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001  
**Unit Type:** PLANNED_FEATURE_DOCUMENT_INTAKE  
**Status:** PLANNED_FEATURE_DOCUMENT_INTAKE_COMPLETE  
**Date:** 2026-05-19  
**Author:** Paresh Patel (TexQtic founder) / Governance agent  
**Layer 0 posture at unit open:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED  
**Pre-existing unstaged M files (never stage):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Unit Summary

This unit records the intake of three Paresh-provided planned-feature documents into the
`PLANNED-REQUIREMENTS-INTAKE.md` queue as PRIT-022 through PRIT-027.

**What this unit did:**
- Reviewed three Paresh-provided planned-feature documents (PWA, CoWorker, 7 Pillars)
- Extracted technical features into parent-level planned requirements
- Added PRIT-022 through PRIT-027 to the intake queue
- Cross-referenced DPP Passport (Pillar 1 → FAM-05/D-001) and TexCredit (Pillar 2 → FAM-16/D-002)
  as already covered by existing governance; no duplicate rows created
- Noted that Pillar 7 was not present in the provided artifact; no row created
- Updated §7 notice, §11 completion checklist, §12 update history, and added §13 to the intake document

**What this unit did NOT do:**
- Did not authorize implementation of any item
- Did not open any family cycle
- Did not perform a family audit
- Did not mark any item as P0/P1/MVP_CRITICAL/LAUNCH_BLOCKER
- Did not change Layer 0 posture
- Did not modify any runtime file, schema, migration, frontend, backend, or environment file

---

## §2 Scope and Non-Scope

### In Scope
- Reading required governance documents (13 files)
- Reviewing Paresh-provided planned-feature documents (3 documents, in-prompt context)
- Extracting technical features at parent-level granularity only
- Adding PRIT-022–027 to `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`
- Creating this unit artifact

### Out of Scope
- Implementation design for any new feature
- Opening a family implementation cycle
- Performing a family opening audit gate
- Changing classification of existing PRIT-001 through PRIT-021 items
- Recording CRM or CAE internal feature inventories in the main repo
- Recording business/GTM/revenue/investor/sales content as intake rows
- Staging or modifying `components/Public/PublicSupplierProfile.tsx` or
  `tests/frontend/public-referral-landing.test.tsx`

---

## §3 Files Inspected

| # | File | Purpose | Status |
|---|---|---|---|
| 1 | `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | Primary document to update; intake queue; PRIT-001–021 | READ + MODIFIED |
| 2 | `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Family mappings for cross-reference (FAM-02, FAM-05, FAM-10, FAM-12, FAM-17, FAM-19) | READ |
| 3 | `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Confirmed no existing FTR items for new features; no conflicts | READ |
| 4 | `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-001 (DPP), D-002 (TTP); confirmed existing coverage for Pillars 1 and 2 | READ |
| 5 | `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | SKELETON; no conflicts with new rows | READ |
| 6 | `governance/launch-readiness/README.md` | Read order and document table; PLANNED-REQUIREMENTS-INTAKE.md already in hub | READ (no modification needed) |
| 7 | `governance/control/NEXT-ACTION.md` | Layer 0 posture confirmed: HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK | READ |
| 8 | `TECS.md` | Q1–Q9 checklist; unit type rules | READ |
| 9 | `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.md` | Prior intake unit; confirms PRIT-001–021 baseline; VERIFIED_COMPLETE | REFERENCED |
| 10 | `governance/units/TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001.md` | Intake rules authority | REFERENCED |
| 11 | `governance/units/TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001.md` | Audit gate rules for family opening | REFERENCED |
| 12 | `governance/units/TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md` | Hub drift-control addendum; sync requirements | REFERENCED |
| 13 | `governance/control/BLOCKED.md` | Active blockers (WEBHOOK-007, QD-6); Layer 0 posture confirmed unchanged | REFERENCED |

---

## §4 User-Provided Documents Reviewed

All three documents were provided as Paresh in-prompt context. They are not file-system
artifacts in the repository.

| # | Document | Provided As | Summary |
|---|---|---|---|
| 1 | Progressive Web App / PWA concept | Paresh-provided planned-feature document | Platform installability strategy: web app manifest, service worker, offline shell caching, push notifications, HTTPS gate, auth/session implications, subscriber gating, update lifecycle, Electron wrapper as later/conditional only |
| 2 | TexQtic CoWorker / AI Workbench concept | Paresh-provided planned-feature document | Governed AI coworker platform: in-app assistant first; skills layer; tenant-scoped memory; tool invocation logging; action approval queue; human-confirmed prepared actions; domain-specific skill personas (RFQ, DPP, profile, support, governance); external channels later; strict non-autonomous execution boundary; no speculative AI actions |
| 3 | 7 Pillars of TexQtic — concise version | Paresh-provided planned-feature document | Platform strategic pillars: DPP Passport (Pillar 1), TexCredit/embedded supply-chain finance (Pillar 2), China+1 Discovery Engine (Pillar 3), AI Pricing Oracle (Pillar 4), Collective Sustainability Certification Pool (Pillar 5), Artisan IP and Heritage Commerce Layer (Pillar 6). Pillar 7 not present in provided artifact. |

---

## §5 Extracted Planned Features — By Document

### §5.1 From PWA Concept Document

**Technical features extracted (parent-level only):**
- One-codebase browser/desktop/mobile installability via Progressive Web App
- Web app manifest (name, icons, start URL, display mode)
- Service worker and app shell caching strategy
- HTTPS requirement and installability gate
- Secure auth/session handling for installed app context (auth token persistence, expiry)
- Subscriber/tier gating implications for offline-capable vs. full-featured shell
- Update/versioning behavior (cache invalidation, version prompt)
- Offline/cache strategy for read-heavy surfaces
- Push notification infrastructure (subscription management, opt-in/opt-out, delivery)
- Electron wrapper: deferred; conditional on proven PWA limitations; not in initial scope

**Features extracted to PRIT:** PRIT-022 (PWA installability and offline shell strategy)

**Features excluded (non-technical / GTM / business):**
- Market adoption narratives
- Competitive install rate comparisons
- Revenue impact projections from installability

---

### §5.2 From TexQtic CoWorker / AI Workbench Document

**Technical features extracted (parent-level only):**
- In-app AI assistant surface (first, bounded)
- Skills layer: modular skill personas (RFQ assistant, DPP assistant, profile completeness
  assistant, support summary, governance prompt assistant)
- Tenant-scoped memory: per-tenant context store; must be org_id-isolated
- Tool invocation logging: audit trail for all CoWorker-initiated tool calls
- Action approval queue: human-in-the-loop; no direct write actions without explicit approval
- Human-confirmed prepared actions: draft-then-confirm pattern for all state mutations
- External channels (later phase only): WhatsApp Business API, Slack App, email integration,
  calendar integration; not in initial scope
- Strict non-autonomous execution boundary: CoWorker must never take unconfirmed action
- Multi-tenant isolation requirement: CoWorker memory, tool scope, and skill context must be
  strictly org_id-scoped

**Features extracted to PRIT:** PRIT-023 (TexQtic CoWorker / AI Workbench foundation)

**Features excluded (non-technical / GTM / business):**
- AI market positioning claims
- CoWorker revenue model language
- Vendor selection commentary without technical scope

---

### §5.3 From 7 Pillars of TexQtic Document

**Technical features extracted (parent-level only):**

| Pillar | Technical Concept | Action |
|---|---|---|
| Pillar 1: DPP Passport | Digital Product Passport creation, verification, and sharing | Cross-ref FAM-05/D-001; no new row |
| Pillar 2: TexCredit / embedded supply-chain finance | Embedded BNPL-style financing for supplier/buyer transactions via platform | Cross-ref FAM-16/D-002/TTP; no new row |
| Pillar 3: China+1 Discovery Engine | AI-assisted supplier discovery; RFQ matching across geographies; buyer intent routing | PRIT-024 |
| Pillar 4: AI Pricing Oracle | Predictive pricing engine using platform transaction data, lead-time, and quality signals | PRIT-025 |
| Pillar 5: Collective Sustainability Certification Pool | Shared certification pool for SME suppliers; group certification coordination; DPP integration | PRIT-026 |
| Pillar 6: Artisan IP and Heritage Commerce Layer | IP protection layer for artisan goods; heritage commerce attributes; provenance documentation | PRIT-027 |
| Pillar 7 | Not present in provided artifact | No row created |

**Features excluded (non-technical / GTM / business from 7 Pillars doc):**
- Market size claims and revenue projections for each pillar
- Competitive differentiation narratives
- Investor pitch language
- Commercial pricing projections

---

## §6 New PRIT Rows Added

### PRIT-022 — PWA installability and offline shell strategy

| Field | Value |
|---|---|
| PRIT ID | PRIT-022 |
| Title | PWA installability and offline shell strategy |
| Target System | MAIN |
| Proposed Primary Family | FAM-10 (Platform Ops and Control Plane) |
| Related Families | FAM-06 (Auth — session handling for installed app), FAM-11 (Subscription — tier gating for offline shell) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | P2_PILOT_ENABLER |
| Prov. Priority | P2 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

### PRIT-023 — TexQtic CoWorker / AI Workbench foundation

| Field | Value |
|---|---|
| PRIT ID | PRIT-023 |
| Title | TexQtic CoWorker / AI Workbench foundation |
| Target System | MAIN (initial in-app assistant); CROSS_SYSTEM (external channels — future phase only) |
| Proposed Primary Family | FAM-19 (AI and Document Intelligence) |
| Related Families | FAM-10 (Platform Ops — logging, audit trail), FAM-12 (NC RFQ — RFQ skill persona), FAM-05 (DPP — DPP skill persona), FAM-09 (Supplier Profile — profile completeness skill) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | POST_MVP |
| Prov. Priority | P3 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Note | In-app read-only assistant sub-feature may be reconsidered as P2 pilot-enabler in review; external channels are deferred and out of initial scope |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

### PRIT-024 — China+1 Discovery Engine / RFQ matching strategy

| Field | Value |
|---|---|
| PRIT ID | PRIT-024 |
| Title | China+1 Discovery Engine / RFQ matching strategy |
| Target System | MAIN |
| Proposed Primary Family | FAM-12 (Network Commerce — RFQ, Pools) |
| Related Families | FAM-19 (AI — matching intelligence layer), FAM-09 (Supplier Profile — supplier index for discovery) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | POST_MVP |
| Prov. Priority | P3 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

### PRIT-025 — AI Pricing Oracle

| Field | Value |
|---|---|
| PRIT ID | PRIT-025 |
| Title | AI Pricing Oracle |
| Target System | MAIN |
| Proposed Primary Family | FAM-19 (AI and Document Intelligence) |
| Related Families | FAM-12 (NC — transaction and lead-time data source), FAM-15 (Invoices and Settlement — quality and payment signal source), FAM-16 (TTP — after TTP data exists) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | POST_MVP |
| Prov. Priority | P3 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Hard Data Dependency | Requires real platform transaction data, lead-time data, and quality rejection data before any pricing model can be designed or built. Cannot proceed until the platform has meaningful usage history. |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

### PRIT-026 — Collective Sustainability Certification Pool

| Field | Value |
|---|---|
| PRIT ID | PRIT-026 |
| Title | Collective Sustainability Certification Pool |
| Target System | MAIN |
| Proposed Primary Family | FAM-17 (Traceability and Certifications) |
| Related Families | FAM-05 (DPP — certification anchor in passport), FAM-09 (Supplier Profile — eligibility tracking), FAM-19 (AI Document Intelligence — certificate extraction) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | POST_MVP |
| Prov. Priority | P3 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Note | Priority could be reconsidered to P2 if Paresh chooses a certification-led pilot narrative for Surat |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

### PRIT-027 — Artisan IP and Heritage Commerce Layer

| Field | Value |
|---|---|
| PRIT ID | PRIT-027 |
| Title | Artisan IP and Heritage Commerce Layer |
| Target System | MAIN |
| Proposed Primary Family | FAM-02 (D2C Public Collections) or future artisan family (if Paresh chooses to carve out a distinct family for artisan commerce) |
| Related Families | FAM-05 (DPP — provenance documentation anchor), FAM-17 (Traceability — origin and heritage tracing), FAM-09 (Supplier Profile — artisan producer profile attributes) |
| Feature Source | USER_PLANNED_ONLY |
| Evidence Level | USER_PLANNED_ONLY |
| Confirmation Status | PARESH_CONFIRMED_AS_PLANNED |
| Prov. Launch Class | POST_MVP |
| Prov. Priority | P3 |
| Readiness | DESIGN_GATED |
| Implementation-ready | NO |
| Next Action | Review in TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

## §7 Existing Families / Decisions Cross-Referenced (No New Row)

| Planned Feature | Source | Existing Governance Coverage | Rationale |
|---|---|---|---|
| DPP Passport (7 Pillars — Pillar 1) | 7 Pillars document | FAM-05 (DPP, PARKED_DECISION, HOLD_FOR_PARESH_DECISION) / D-001 (DPP launch auth, PARKED) | DPP Passport is fully represented by FAM-05 and D-001. Creating a duplicate PRIT row would create governance confusion. Cross-reference only. |
| TexCredit / embedded supply-chain finance (7 Pillars — Pillar 2) | 7 Pillars document | FAM-16 (TTP, HOLD_FOR_COUNSEL_FEEDBACK) / D-002 (TTP activation scope, PARKED) | TexCredit as described in Pillar 2 is treated as part of or dependent on TexQtic Trust Pay / embedded transaction finance under FAM-16 and D-002. Unless Paresh later confirms TexCredit is a separate product family (separate identity, separate commercial model), it does not get its own PRIT row. Cross-reference to FAM-16. |

---

## §8 Items Excluded — Business / GTM / Revenue / Non-Technical Content

The following content from the user-provided documents was explicitly reviewed and excluded
from the intake queue. It is out-of-repo business, marketing, or revenue narrative:

| Category | Reason Excluded |
|---|---|
| Market size claims and revenue projection figures | Business/financial — no repo artifact |
| Investor pitch language and fundraising positioning | Business/financial — no repo artifact |
| Competitive market analysis and positioning narrative | GTM — no repo artifact |
| GTM battle plan language (90-day, city-specific outreach) | Operational/field — no repo artifact |
| Commercial pricing projections (tier pricing, revenue targets) | Business/financial — no repo artifact |
| Sales enablement scripts and field outreach copy | Commercial/field — no repo artifact |
| Pillar 7: not present in provided artifact | No content to extract; no row created |

---

## §9 Confirmation: No Implementation Opened

No implementation unit was opened by this governance unit.

- No family cycle was opened
- No design artifact was created
- No backend route, schema, migration, or frontend component was modified
- No governed unit was opened that authorizes any feature from PRIT-022 through PRIT-027
- Layer 0 posture is HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK — UNCHANGED

All new PRIT rows are INTAKE-ONLY staging entries.

---

## §10 Confirmation: No Family Audit Performed

No Family Opening Audit Gate was performed by this unit.

A Family Opening Audit Gate (defined in `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`)
is a separate governed activity. It requires:
- Explicit Paresh authorization
- A dedicated governance unit
- Full repo inspection of the target family's current state

This unit only adds intake rows. The family audit for any of PRIT-022 through PRIT-027 must
be performed in a future unit under Paresh authorization.

---

## §11 Confirmation: No PRIT Row Marked Implementation-Ready

None of the new rows (PRIT-022 through PRIT-027) have been marked:
- `IMPLEMENTATION_READY`
- `MVP_CRITICAL`
- `LAUNCH_BLOCKER`
- `LAUNCH_DEPENDENCY`

All new rows carry `DESIGN_GATED` readiness and `PARESH_CONFIRMED_AS_PLANNED` confirmation
status. These classifications were not inherited from governance source documents — they reflect
the conservative default for user-planned-only intake items.

---

## §12 Confirmation: No Row Marked P0/P1/MVP_CRITICAL/LAUNCH_BLOCKER

| PRIT ID | Prov. Launch Class | Prov. Priority | P0/P1/MVP_CRITICAL? |
|---|---|---|---|
| PRIT-022 | P2_PILOT_ENABLER | P2 | NO |
| PRIT-023 | POST_MVP | P3 | NO |
| PRIT-024 | POST_MVP | P3 | NO |
| PRIT-025 | POST_MVP | P3 | NO |
| PRIT-026 | POST_MVP | P3 | NO |
| PRIT-027 | POST_MVP | P3 | NO |

No new row was classified as P0, P1, MVP_CRITICAL, or LAUNCH_BLOCKER by this unit.

---

## §13 CRM / CAE Handling

None of the new PRIT rows (PRIT-022 through PRIT-027) are CRM or CAE internal features.

- PRIT-023 (CoWorker) includes an external channels phase (WhatsApp, Slack, email, calendar)
  that may eventually require cross-system integration contracts. This is deferred and
  out-of-initial-scope. When that phase is designed, a cross-system integration contract
  must be defined in `shared/contracts/` and a separate XDEP intake entry created.
- No CRM or CAE feature inventories are recorded in this unit.
- All CoWorker scope recorded here is limited to the main platform repo in-app assistant surface.

---

## §14 TECS Q1–Q9 Checklist

| Q | Question | Answer |
|---|---|---|
| Q1 | Is this a governance-only unit (no runtime delivery)? | YES — intake only; no runtime changes |
| Q2 | Does this unit touch any runtime file, schema, migration, frontend, or environment? | NO |
| Q3 | Does this unit create or modify a governed document in `governance/`? | YES — modifies `PLANNED-REQUIREMENTS-INTAKE.md`; creates this unit artifact |
| Q4 | Is there evidence for all claims made in this unit? | YES — evidence source is Paresh-provided planned-feature documents (in-prompt context); cited as such throughout |
| Q5 | Does this unit authorize any implementation? | NO |
| Q6 | Does this unit change Layer 0 posture? | NO — HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK UNCHANGED |
| Q7 | Does this unit activate any feature flag or change any runtime gate? | NO |
| Q8 | Does this unit require Paresh runtime sign-off before execution? | N/A — governance-only; no runtime action |
| Q9 | Is the recommended next unit correctly identified? | YES — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 |

---

## §15 Validation

### Preflight
```
git diff --name-only     → expected: pre-existing M files (PublicSupplierProfile.tsx, etc.)
git status --short       → expected: M components/Public/PublicSupplierProfile.tsx (unstaged)
                                      M tests/frontend/public-referral-landing.test.tsx (unstaged)
```

Pre-existing unstaged M files confirmed. No staged files before this unit started.

### Implementation Gate
Files modified or created by this unit:
- `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` — modified (§13, PRIT-022–027, §7, §11, §12)
- `governance/units/TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001.md` — created (this file)

No runtime files. No frontend. No backend. No Prisma. No OpenAPI. No event contracts.

### Staging Gate
```
git add governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md
git add governance/units/TEXQTIC-PLANNED-FEATURES-DOCUMENT-INTAKE-001.md
git status --short       → must show ONLY these 2 files staged (AM or M prefix)
```

No other files may be staged.

---

## §16 Commit Hash

**[TO BE BACKFILLED after commit]**

---

## §17 Recommended Next Unit

**`TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`**

This review unit must:
- Cover PRIT-011 through PRIT-027 (all unconfirmed and user-planned items)
- Confirm or revise classification for PRIT-011–019 (items awaiting Paresh confirmation per §10 of PLANNED-REQUIREMENTS-INTAKE.md)
- Confirm or revise classification for PRIT-022–027 (new planned feature items from this unit)
- Confirm priority, launch class, and readiness for each item
- Identify which items should advance to family opening audit gate
- Confirm Pillar 7 definition (PRIT-028 if Paresh provides the seventh pillar)

This unit must be opened under Paresh authorization when ready to advance any of these items.
Layer 0 posture does not block governance-only review units of this type.
