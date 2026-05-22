# PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001

## 1. Header and Authority Boundary

| Field | Value |
|---|---|
| Unit ID | `PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001` |
| Unit type | Design / Architecture Decision Record — no implementation |
| Status | **DESIGN_ARTIFACT_CREATED** |
| PRIT | PRIT-034 — **REMAINS OPEN** pending content draft, review, and implementation |
| Date | 2026-05-22 |
| Authorized by | Paresh Patel (TexQtic founder) |
| Doctrine basis | D-025 — Production-Intent Staged-Activation Rule |
| Predecessor unit | `PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001` (commit `9a4d25c`) |
| Repository | TexQtic/TexQtic |
| Branch | main |
| HEAD at inspection | `9a4d25c43aade630620094f27d37fb6b4cbb1131` |
| Worktree state | CLEAN — no pre-staged or modified source files |

**Authority boundary for this unit:**

This document is a design/architecture decision record only. It:
- Creates the architecture framework for TexQtic legal documentation
- Records repo-truth findings from read-only inspection
- Decides canonical source-of-truth model, route architecture, legal page hierarchy, versioning model, surface mapping, and implementation sequence
- Does NOT draft production legal copy
- Does NOT implement routes, pages, components, or API endpoints
- Does NOT modify app or marketing code, schema, environment variables, tests, Vercel/Postmark config, or email footer links
- Does NOT constitute or imply legal counsel approval

---

## 2. Inputs Reviewed

| Source | Role |
|---|---|
| `governance/control/DOCTRINE.md` (v1.14) | D-025 production-intent staged-activation rule; all active doctrine invariants |
| `governance/units/PRODUCTION-INTENT-STAGED-ACTIVATION-GOVERNANCE-SYNC-001.md` | Predecessor unit; authorized production-launch architecture requirement |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-034 current status; §5B next action; §6 confirmation rows |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-FAM-002 (PUBLIC-LEGAL-PAGES-BUNDLE-001); FTR-FAM-004 (this design artifact); FTR-LEGAL-001/002/003 |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-008 (production shortcut risk, MITIGATED_BY_DOCTRINE); R-006 (inquiry form no consent disclosure); R-015 (directory promotion gating) |
| `governance/units/SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX.md` | Inquiry copy truth boundary (in-force) |
| `governance/units/SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL.md` | Branded email shell facts; logo asset inventory |
| `governance/units/TLRH-EMAIL-IMPLEMENTATION-SYNC-001.md` | Email implementation truth; PRIT-036 resolved; FTR-B2C-004/005 partial state |
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | TTP (TradeTrust Pay) legal architecture — separate from public legal pages but informing the legal scope boundary |
| `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` | Operator decision gate for TTP; reinforces review dependency model |
| `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | §8/§9 soft-launch checklist (S-1 legal pages prerequisite); directory promotion gates |
| External planning inputs | `texqtic_legal_document_framework(1).html` and `Pasted text(510).txt` — planning references only; no legal copy reproduced |
| `App.tsx` (read-only) | Route structure inspection; confirms this SPA is app.texqtic.com; SUPPLIER_REQUEST_ACCESS_URL hardcoded to texqtic.com |
| `components/Public/PublicInquiryPage.tsx` (read-only) | Footer content; confirmed no legal links; current copy truth boundary in force |
| `components/Public/PublicTrustLandingStub.tsx` (read-only) | Footer stub content; confirmed no legal links |

---

## 3. Repo Route / Site Structure Findings

### 3.1 This Checkout Is app.texqtic.com — Not texqtic.com

**MARKETING_REPO_NOT_PRESENT_IN_CURRENT_CHECKOUT**

This repository is the `app.texqtic.com` Vite + React SPA. Key evidence:
- Framework: Vite + React (not Next.js, Remix, or file-based routing)
- `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` — hard-coded cross-domain reference confirming texqtic.com is a separate site not present in this checkout
- No `pages/`, `app/` (Next.js), or marketing-route directories exist at repo root
- Domain references in code: `app.texqtic.com` (line ~2863 of App.tsx)
- No marketing page components, blog routing, or company/about pages exist in this repo

The `texqtic.com` marketing site is managed separately. This design artifact governs where legal pages must eventually live; it does not implement them from this repo.

### 3.2 No Legal Pages / Routes Exist Anywhere in This Repo

Confirmed absent by code inspection:
- No `/legal` route or component
- No `/privacy` route or component
- No `/terms` route or component
- No `/cookies` route or component
- No `/dsar` route or component
- No `/data-rights` route or component
- No `/grievance` route or component
- No `/disclaimer` route or component
- No `/acceptable-use` route or component
- No `/ip-takedown` route or component

This is consistent with findings from `governance/units/TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001.md` ("No /privacy page component", "No /terms page component").

### 3.3 Existing Footer and Legal-Linking Surfaces

| Surface | Component | Current legal links |
|---|---|---|
| Public inquiry page footer | `PublicInquiryPage.tsx` (line ~502–510) | None — text-only disclosure; links only to internal `/trust` route |
| Public trust landing stub footer | `PublicTrustLandingStub.tsx` (line ~235–242) | None — explanatory text only |
| App navbar (all authenticated routes) | `PublicNavbar.tsx` | Not inspected for this unit — not a linkage surface for initial design |

**Finding:** No legal footer links exist anywhere in the current app.  
Adding legal footer links requires a future implementation unit (`PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005`).

### 3.4 Existing governance/legal Directory

`governance/legal/` contains:
- `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` — TradeTrust Pay legal review packet (for external counsel)
- `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` — Operator decision guide for TTP

These are internal governance artifacts for the TTP feature family, not production legal policy pages. They are outside the scope of this design artifact. PRIT-034 legal architecture is independent of TTP.

### 3.5 Existing Public Inquiry Surfaces

| Surface | Route | Status |
|---|---|---|
| Supplier-context inquiry form | `/inquiry` (SPA client routing) | Active — F1 email loop complete |
| General inquiry form | `/inquiry` (NO_CONTEXT mode) | Active — Phase 2 implementation |
| Public supplier profile | `/supplier/:slug` | Active — ROUTE-001 |
| Public aggregator (B2B discovery) | Rendered in SPA | Active — FAM-01 |
| Public trust landing stub | Rendered in SPA | Active — trust/verification routing |
| Public DPP / product/collection pages | Various `/c/`, `/p/`, `/col/` routes | Active |

All inquiry surfaces collect name-free, contact-free interest signals. None include consent disclosure or privacy notice. PRIT-011 (privacy/consent notice for public inquiry form) remains `MVP_CRITICAL / P1 / OPEN`.

---

## 4. Production-Intent Staged-Activation Interpretation (D-025)

Under D-025, TexQtic's legal documentation architecture must be designed production-launch ready from the outset. This means:

| Dimension | Production-intent requirement |
|---|---|
| Content model | Git-tracked, versioned, counsel-reviewable before publication |
| Route architecture | Canonical routes on texqtic.com; app.texqtic.com links out |
| Naming conventions | Stable, human-readable slugs; no rework after launch |
| Legal scope | Each document's audience and applicability defined before drafting |
| Versioning | Effective date, version number, owner, lawyer-review status on every document |
| Activation | Staged implementation allowed via feature gates and staged deployment |

**Staged activation IS allowed:**
- Deploy core first-wave documents before gated documents
- Gate activation of future documents behind product/feature readiness
- Use `[NOT YET ACTIVE]` or equivalent status labels until legal review completes

**Disposable shortcuts are FORBIDDEN:**
- Do not deploy placeholder "coming soon" pages where real policy is expected by law
- Do not create hardcoded /terms or /privacy that require immediate refactor post-launch
- Do not copy-paste template legal text without lawyer review
- Do not build app-side legal pages that must be migrated to marketing site later

---

## 5. Canonical Legal Source-of-Truth Decision

### Decision

**Recommended source of truth: Git-tracked content files rendered as static pages inside the texqtic.com marketing repository.**

Each legal document is a version-controlled markdown (or MDX) file stored in the texqtic.com repo under a dedicated `content/legal/` directory. The marketing site renders each file as a styled HTML page at its canonical route. Legal counsel reviews the markdown file directly.

### Evaluation Matrix

| Option | Versionable | Counsel-reviewable | No schema work | Easy to deploy | Easy to link | No rework | Verdict |
|---|---|---|---|---|---|---|---|
| **Git-tracked markdown in marketing repo** | ✅ | ✅ (share file or PDF export) | ✅ | ✅ (auto-deployed with marketing site) | ✅ (absolute URL from app + emails) | ✅ | **SELECTED** |
| Static route content inside marketing repo (inline) | ✅ | ⚠️ (must read code) | ✅ | ✅ | ✅ | ⚠️ (harder to update without code change) | Rejected — harder for non-engineer review |
| CMS-backed legal pages (e.g. Contentful, Sanity) | ✅ | ⚠️ (CMS UI access needed) | ❌ (CMS setup required) | ⚠️ (CMS dependency) | ✅ | ✅ | Rejected — CMS overhead for launch phase |
| Prisma/database-backed legal policy records | ✅ (with versioning table) | ❌ (requires DB tooling) | ❌ (schema work required) | ❌ (API + admin required) | ⚠️ | ❌ (significant rework) | Rejected — schema/DB work, over-engineered for first-wave |
| Hybrid (markdown in git + DB-backed acceptance) | ✅ | ✅ | ⚠️ (minimal: acceptance record table) | ⚠️ | ✅ | ⚠️ (DB part deferred to future unit) | Future path — acceptance capture added later as an overlay |

### Recommendation Detail

```
Recommended source of truth:
  Git-tracked markdown/MDX files in the texqtic.com marketing repo
  Location: content/legal/<document-slug>.md (or .mdx)

Reason:
  - Already git-versioned; change history and diffs are automatically preserved
  - Lawyer can review plain-text markdown without engineering access
  - Zero schema work required for first-wave legal documents
  - Marketing site auto-deploys legal pages alongside other content
  - Canonical legal URLs are absolute (texqtic.com/legal/...) — stable for
    linking from app, email, and future mobile clients
  - No infrastructure beyond what texqtic.com already uses
  - Easily extended with frontmatter fields for versioning/metadata

Rejected alternatives:
  CMS: adds infrastructure overhead and CMS access complexity
  Prisma/DB: requires schema migration, admin UI, and versioning table before any legal content
  Inline static route content: makes lawyer review harder (must read React/JSX)

Future migration path:
  Phase 2+: Add a thin user-acceptance capture layer (lightweight DB table: user_id, document_slug,
  document_version, accepted_at) when ToS acceptance, supplier onboarding acceptance, or buyer
  consent flows are needed. This overlay does NOT require moving the source-of-truth.
  Phase 3+: Evaluate CMS migration if legal team grows and non-engineer editing becomes frequent.
```

---

## 6. Canonical Route Architecture Decision

### 6.1 Fundamental Premise

`texqtic.com` is the canonical home for the public Legal Center and all production legal policy pages.  
`app.texqtic.com` links or redirects to canonical `texqtic.com` legal routes — it does not host legal policy pages.

This respects the domain separation established in existing governance: texqtic.com = company/trust/marketing/legal surface; app.texqtic.com = authenticated and public-safe platform application.

### 6.2 Canonical Legal Center Route

```
texqtic.com/legal
```

Top-level Legal Center hub page. Lists all published legal documents with:
- Document title
- Short description of scope/audience
- Effective date
- Status (Active / Coming Soon / Archived)
- Direct link to document

### 6.3 Core Legal Routes (First-Wave)

| Route | Document | Audience |
|---|---|---|
| `texqtic.com/legal` | Legal Center (hub) | All |
| `texqtic.com/legal/terms` | Terms of Use | All platform users |
| `texqtic.com/legal/privacy` | Privacy Policy | All — data subjects |
| `texqtic.com/legal/cookies` | Cookie & Tracking Policy | All — browser users |
| `texqtic.com/legal/grievance` | Grievance Redressal Policy | All — Indian IT Act |
| `texqtic.com/legal/acceptable-use` | Acceptable Use Policy | All active users |
| `texqtic.com/legal/disclaimer` | Disclaimer & Intermediary Notice | All — IT Act §79 |
| `texqtic.com/legal/ip-takedown` | IP / Takedown Policy | All — rights holders |
| `texqtic.com/legal/community-policy` | Content / Community Policy | Suppliers, buyers, public |
| `texqtic.com/legal/data-directory` | Business Data & Directory Data Policy | Suppliers listed in directory |
| `texqtic.com/legal/demo-data` | Demo / QA Data Disclaimer | Internal ops, test participants |
| `texqtic.com/legal/inquiry-terms` | Lead / Inquiry / RFQ Terms | Buyers submitting inquiries |

### 6.4 Future / Gated Legal Route Groups

#### Supplier / Seller Document Group
```
texqtic.com/legal/supplier-terms
texqtic.com/legal/supplier-data-processing
texqtic.com/legal/supplier-profile-policy
texqtic.com/legal/sponsored-listing-terms
```

#### Buyer / B2C / D2C Document Group
```
texqtic.com/legal/buyer-terms
texqtic.com/legal/return-policy
texqtic.com/legal/d2c-purchase-terms
```

#### Directory / Aggregator Document Group
```
texqtic.com/legal/directory-listing-policy
texqtic.com/legal/aggregator-data-policy
texqtic.com/legal/profile-accuracy-policy
```

#### Payments / GST / TCS Document Group (GATED — awaits TTP counsel feedback)
```
texqtic.com/legal/payment-terms
texqtic.com/legal/gst-tcs-disclosure
texqtic.com/legal/refund-policy
```

#### Enterprise / B2B Agreements (Controlled templates — not public pages)
```
Controlled document templates only — not public legal pages
Delivered as PDF/Word templates via counsel or platform admin
Routes not applicable for first-wave
```

#### API / White-Label Document Group (FUTURE)
```
texqtic.com/legal/api-terms
texqtic.com/legal/white-label-terms
```

#### Advertising / Sponsored Visibility (FUTURE)
```
texqtic.com/legal/advertising-policy
texqtic.com/legal/ranking-methodology
```

### 6.5 App-Side Linkage Strategy

`app.texqtic.com` must NOT host canonical legal policy pages. Linkage model:

| Linkage surface | Strategy | URL pattern |
|---|---|---|
| App footer (all public pages) | Absolute external link → texqtic.com/legal | `https://texqtic.com/legal` |
| Signup / onboarding screen | Absolute external link to specific documents | `https://texqtic.com/legal/terms`, `https://texqtic.com/legal/privacy` |
| Inquiry form consent disclosure | Inline text with link → texqtic.com/legal/privacy | `https://texqtic.com/legal/privacy` |
| Email footer (all transactional emails) | Absolute external links — legal center + privacy | `https://texqtic.com/legal` |
| Supplier onboarding ToS acceptance | Specific version link + acceptance capture | `https://texqtic.com/legal/terms` (versioned) |

**No redirects from app.texqtic.com/legal/* are needed** in the initial implementation. If a user navigates to app.texqtic.com/legal, the app may show a 404 or a friendly "Legal documents are at texqtic.com/legal" message. Explicit redirect handling is a future enhancement.

### 6.6 Canonical URL Policy

Every legal page must include:
- `<link rel="canonical" href="https://texqtic.com/legal/[slug]" />` in the HTML head
- `og:url` metadata pointing to the canonical URL
- Consistent slug that never changes after first publication (changing a slug breaks backlinks and citations in legal acceptance records)

---

## 7. Production Legal Page Hierarchy

### 7.1 Document Tier Classification

| Tier | Description | Examples |
|---|---|---|
| **T1 — Universal (all users)** | Required before any data collection or user interaction | Privacy, Terms, Cookie Policy, Disclaimer |
| **T2 — Platform operational** | Required before platform goes live to any users | Grievance, Acceptable Use, IP/Takedown, Community Policy |
| **T3 — Directory / data surface** | Required before directory or aggregator surfaces are promoted to real users | Data & Directory Policy, Demo/QA Disclaimer |
| **T4 — Inquiry surface** | Required before inquiry forms are linked or promoted | Inquiry/RFQ Terms, Consent Disclosure |
| **T5 — Supplier/seller onboarding** | Required before any supplier is formally onboarded with acceptance | Supplier Terms, Supplier Data Processing |
| **T6 — Buyer / commerce** | Required before any buyer commerce or payment | Buyer Terms, Return Policy, D2C Purchase Terms |
| **T7 — Payments / GST / TCS** | Required before any platform-facilitated payment or TCS reporting | Payment Terms, GST/TCS Disclosure |
| **T8 — Controlled / enterprise** | Delivered as controlled templates, not public pages | B2B contract templates |
| **T9 — Advertising / ranking** | Required before sponsored visibility or ranking is sold | Advertising Policy, Ranking Methodology |
| **T10 — API / white-label** | Required before any API or white-label access is granted | API Terms, White-Label Terms |

### 7.2 First-Wave Production Legal Documents

These must be drafted, reviewed, published, and linked before any broad outreach or data collection.

| Doc # | Document Name | Route | Audience | Tier | Activation trigger | Status |
|---|---|---|---|---|---|---|
| L-001 | Legal Center hub | `/legal` | All | T1 | Before any legal link is surfaced | First-wave |
| L-002 | Terms of Use | `/legal/terms` | All platform users | T1 | Before signup or inquiry form linkage | First-wave |
| L-003 | Privacy Policy | `/legal/privacy` | All — data subjects | T1 | Before any data collection (inquiry, analytics, email) | First-wave |
| L-004 | Cookie & Tracking Policy | `/legal/cookies` | All — browser users | T1 | Concurrent with analytics/cookie decision (PRIT-035) | First-wave |
| L-005 | Grievance Redressal Policy | `/legal/grievance` | All — Indian IT Act §2(1)(w) | T2 | Before public launch in India | First-wave |
| L-006 | Acceptable Use Policy | `/legal/acceptable-use` | All active users | T2 | Before supplier onboarding or buyer access | First-wave |
| L-007 | Disclaimer & Intermediary Notice | `/legal/disclaimer` | All — IT Act §79 | T2 | Before any third-party content is displayed publicly | First-wave |
| L-008 | IP / Takedown Policy | `/legal/ip-takedown` | Rights holders, platform | T2 | Before any content-hosting surface is live | First-wave |
| L-009 | Content / Community Policy | `/legal/community-policy` | Suppliers, buyers, public | T2 | Before any user-generated content surface is promoted | First-wave |
| L-010 | Business Data & Directory Data Policy | `/legal/data-directory` | Suppliers listed in directory | T3 | Before directory promotion to real buyers | First-wave |
| L-011 | Demo / QA Data Disclaimer | `/legal/demo-data` | Internal ops, test accounts | T3 | Before any demo/QA data is created | First-wave |
| L-012 | Lead / Inquiry / RFQ Terms | `/legal/inquiry-terms` | Buyers submitting inquiries | T4 | Before inquiry consent disclosure links are added | First-wave |

### 7.3 Activation-Gated Future Legal Document Groups

Each group activates when the corresponding product/feature readiness condition is met.

#### Group G1 — Supplier / Seller Documents

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| Supplier Terms of Service | `/legal/supplier-terms` | Suppliers | Supplier onboarding flow ready (FAM-07) | GATED |
| Supplier Data Processing Agreement | `/legal/supplier-data-processing` | Suppliers | DPDP and data-handling review complete | GATED |
| Supplier Profile Policy | `/legal/supplier-profile-policy` | Suppliers | Supplier profile publication gating decided (PRIT-019) | GATED |
| Sponsored Listing Terms | `/legal/sponsored-listing-terms` | Suppliers with paid listings | Sponsored visibility feature active | FUTURE |

#### Group G2 — Buyer / B2C / D2C Documents

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| Buyer Terms of Service | `/legal/buyer-terms` | Buyers | Buyer-facing commerce features active | GATED |
| Return & Cancellation Policy | `/legal/return-policy` | Buyers (D2C/B2C) | D2C purchase flow active | FUTURE |
| D2C Purchase Terms | `/legal/d2c-purchase-terms` | D2C buyers | D2C checkout active; payment gateway decided (PRIT-029) | FUTURE |

#### Group G3 — Directory / Aggregator Documents

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| Directory Listing Policy | `/legal/directory-listing-policy` | Suppliers, directory users | Directory promotion to real buyers | GATED |
| Aggregator Data Policy | `/legal/aggregator-data-policy` | All directory data subjects | Before aggregator discovery surfaces promoted | GATED |
| Profile Accuracy Policy | `/legal/profile-accuracy-policy` | Suppliers | Before supplier-verified badge claims | GATED |

#### Group G4 — Payments / GST / TCS Documents (BLOCKED — awaits TTP counsel)

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| Payment Terms | `/legal/payment-terms` | Buyers, sellers | Payment gateway live; counsel approved TTP model | BLOCKED |
| GST / TCS Disclosure | `/legal/gst-tcs-disclosure` | Taxable parties | CA review of GST/TCS methodology complete | BLOCKED |
| Refund & Dispute Policy | `/legal/refund-policy` | Buyers | Payment gateway live; B2C purchase active | BLOCKED |

#### Group G5 — Enterprise / B2B Controlled Templates

| Document | Delivery | Audience | Activation trigger | Status |
|---|---|---|---|---|
| B2B Platform Services Agreement template | PDF/Word controlled template | Enterprise buyers | Enterprise sales motion active | CONTROLLED_TEMPLATE |
| B2B Vendor Agreement template | PDF/Word controlled template | Enterprise suppliers | Enterprise sales motion active | CONTROLLED_TEMPLATE |
| Non-Disclosure Agreement (NDA) template | PDF/Word controlled template | Platform partners | Partnership/integration active | CONTROLLED_TEMPLATE |
| Data Processing Agreement template | PDF/Word controlled template | Data-processing counterparties | DPDP compliance review complete | CONTROLLED_TEMPLATE |

**Note:** Controlled templates are not public pages. They do not have canonical texqtic.com routes. They are delivered through an authenticated or admin process. This group does NOT block first-wave legal publication.

#### Group G6 — API / White-Label Documents

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| API Terms of Use | `/legal/api-terms` | API integrators | API / developer access live | FUTURE |
| White-Label Terms | `/legal/white-label-terms` | White-label operators | White-label product active | FUTURE |

#### Group G7 — Advertising / Sponsored Visibility Documents

| Document | Route | Audience | Activation trigger | Status |
|---|---|---|---|---|
| Advertising Policy | `/legal/advertising-policy` | Advertisers, platform users | Sponsored listing product active | FUTURE |
| Ranking / Discovery Methodology | `/legal/ranking-methodology` | Suppliers, buyers | Promoted ranking product active | FUTURE |

---

## 8. Versioning and Lifecycle Model

Every published legal document must include the following metadata fields. For git-tracked markdown files, these appear as frontmatter at the top of the file.

### 8.1 Required Frontmatter Fields

```yaml
---
document_id: L-003
slug: privacy
title: "Privacy Policy"
effective_date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
version: "1.0.0"
applies_to: "All users of texqtic.com and app.texqtic.com"
owner: "TexQtic Legal / Paresh Patel"
lawyer_review_status: "PENDING | REVIEWED | APPROVED | REVIEW_EXPIRED"
lawyer_review_date: "YYYY-MM-DD or null"
archived_versions: []
status: "DRAFT | ACTIVE | ARCHIVED"
change_summary: "Initial publication"
---
```

### 8.2 Versioning Scheme

```
Major.Minor.Patch

Major: Substantive change to rights, obligations, data handling scope, or legal jurisdiction coverage
Minor: Adds new section, new clause, new surface coverage — no change to existing rights
Patch: Wording correction, formatting fix, link update — no legal effect

Examples:
  1.0.0 → Initial publication
  1.1.0 → DSAR section added
  2.0.0 → Data retention scope changed (material change — requires re-acceptance)
  2.0.1 → Typo in grievance officer email address corrected
```

### 8.3 Lifecycle Stages

| Stage | Description |
|---|---|
| `DRAFT` | Document drafted, not published. Counsel review in progress. No user-visible route. |
| `ACTIVE` | Published and live at canonical route. Effective date applies. |
| `ARCHIVED` | Superseded by newer version. Retained at versioned URL for acceptance record evidence. Route pattern: `texqtic.com/legal/[slug]/archive/v[N]` |

### 8.4 Archived Version URL Pattern

```
texqtic.com/legal/privacy              → current active version
texqtic.com/legal/privacy/archive/v1   → v1.0.0 archived
texqtic.com/legal/privacy/archive/v2   → v2.x.x archived
```

Archives must be retained indefinitely to support:
- Evidence in acceptance records (user accepted version X on date Y)
- Regulatory inquiry response
- Legal dispute evidence

### 8.5 Change Log Requirement

Each legal document must maintain an internal change log section:

```markdown
## Change Log

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | YYYY-MM-DD | Initial publication |
| 1.1.0 | YYYY-MM-DD | Added DSAR section |
| 2.0.0 | YYYY-MM-DD | Revised data retention scope |
```

### 8.6 User Acceptance / Consent Capture (Future Requirement)

First-wave: No programmatic acceptance capture is required. Legal documents are published and linked.

Future (supplier onboarding, buyer registration, commerce activation):
- A lightweight `legal_acceptance` table: `user_id`, `document_slug`, `document_version`, `accepted_at`, `ip_address_hash`
- Acceptance is captured at moment of active check / click-wrap — not passive view
- This table is additive and does not change the source-of-truth model
- Governed by a future unit (`PRODUCTION-LAUNCH-LEGAL-CONTENT-REVIEW-PRIT-034-003` or beyond)

### 8.7 Emergency Update Process

If a legal error, regulatory enforcement event, or counselor-directed correction is required:
1. Create a new `PATCH` version in git (same-day branch + review if time allows)
2. Update frontmatter: `last_updated`, `version` (e.g. 1.0.1)
3. Add change log row with date and summary
4. Notify all affected users of material changes (if major version)
5. For material changes to active user agreements: provide 30-day notice (or as required by applicable law) before new terms take effect
6. Archive the prior version at its versioned URL before replacing active page

### 8.8 Lawyer-Review Expiry

`lawyer_review_status: APPROVED` is valid until:
- A material change is made (auto-expires to `REVIEW_EXPIRED`)
- Indian law changes materially (DPDP rule amendment, IT Act amendment, consumer protection update)
- A regulatory enforcement event targets similar language
- A 24-month rolling review cycle (minimum recommended cadence)

---

## 9. Legal Scope and Surface-to-Document Mapping

For each platform surface, the required legal documents and activation state are mapped below.

| Surface | Required documents | Activation gate | Current state | Future implementation unit |
|---|---|---|---|---|
| **texqtic.com marketing pages** | L-002 Terms, L-003 Privacy, L-004 Cookie, L-007 Disclaimer | Before broad marketing outreach | No legal pages exist | `PRODUCTION-LAUNCH-LEGAL-CENTER-MARKETING-IMPLEMENTATION-PRIT-034-004` |
| **app.texqtic.com public pages (inquiry, discovery, profile, DPP)** | L-003 Privacy link, L-012 Inquiry Terms link in footer; L-002 Terms link at onboarding | Before directory promotion to real buyers | No legal footer links — see R-006, R-015 | `PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005` |
| **Public inquiry forms (PRIT-011)** | L-003 Privacy, L-012 Inquiry Terms — inline consent disclosure | Before inquiry form is linked from outreach materials | No consent disclosure — R-006 OPEN risk | `PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005` |
| **Public supplier/profile/product preview surfaces** | L-010 Data/Directory Policy, L-003 Privacy | Before directory promotion | No legal linkage | `PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005` |
| **Aggregator directory** | L-010 Data/Directory Policy, L-003 Privacy, L-012 Inquiry Terms | Before promotion to real buyers (gate R-015) | R-015 gating PRIT-034 as prerequisite | `PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005` |
| **Demo / QA data surfaces** | L-011 Demo/QA Data Disclaimer | Before any demo data is created or shown to external parties | No disclaimer exists | `PRODUCTION-LAUNCH-LEGAL-CENTER-MARKETING-IMPLEMENTATION-PRIT-034-004` |
| **Supplier onboarding (FAM-07)** | L-002 Terms, L-006 Supplier ToS (G1), L-005 Supplier Data Processing (G1) | FAM-07 family cycle; supplier acceptance flow active | FAM-07 not yet opened | Future supplier onboarding unit |
| **Buyer / B2C / D2C commerce** | L-002 Terms, G2 buyer terms, payment terms (G4) | B2C/D2C commerce active; payment gateway decided | Not active | Future commerce unit |
| **Seller / supplier marketplace** | G1 Supplier Terms, G3 Directory Policy | Marketplace active | Not active | Future marketplace unit |
| **Payments / payouts / GST/TCS** | G4 documents — BLOCKED until TTP counsel feedback | TTP counsel approval + CA review | BLOCKED (FTR-LEGAL-001) | Gated post-counsel unit |
| **Enterprise / B2B agreements** | G5 controlled templates — not public pages | Enterprise sales motion active | Not active | Controlled template future unit |
| **Emails / transactional notifications** | L-002 Terms, L-003 Privacy — links in email footer | Before broad email outreach (PRIT-034 gate S-1) | No legal links in email footer — `PRODUCTION-LAUNCH-EMAIL-LEGAL-FOOTER-LINKS-PRIT-034-006` | `PRODUCTION-LAUNCH-EMAIL-LEGAL-FOOTER-LINKS-PRIT-034-006` |
| **Analytics / cookies / tracking (PRIT-035)** | L-004 Cookie Policy — must exist before PII-capturing analytics is activated | Cookie policy must be live before any non-cookieless analytics is enabled | PRIT-035 blocked on PRIT-034 cookie stance | Concurrent with PRIT-035 analytics decision |
| **Reviews / ratings / UGC** | L-009 Community Policy | Before any UGC/review surface is live | Not active | Future UGC unit |
| **Sponsored listings / ranking** | G7 Advertising Policy, G7 Ranking Methodology | Before any paid visibility product | Not active | Future sponsored listings unit |
| **API / white-label / integrations** | G6 API Terms, G6 White-Label Terms | Before any API or white-label access | Not active | Future API unit |

---

## 10. Inquiry / RFQ / Email Truth Boundary (Preserved)

The following truth boundary is established by `SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX` and remains in force. Legal documentation must not claim more than this boundary allows.

### 10.1 Allowed Legal Framing (Inquiry / RFQ Terms)

- Inquiry received and recorded by TexQtic
- TexQtic team may be notified upon receipt
- Where applicable, TexQtic may use the inquiry to coordinate next steps based on available profile and contact data
- If the inquiry relates to a supplier profile, notification may be routed according to available supplier profile/contact data at the time of submission
- No guarantee of supplier receipt, supplier response, or response timeline is made

### 10.2 Forbidden Legal Framing

The following claims are **not yet truthful** and must not appear in legal documents, inquiry pages, email templates, or any TexQtic surface until the corresponding feature is verified in production:

| Forbidden claim | Why forbidden | Feature that would enable it |
|---|---|---|
| Guaranteed supplier receipt of the inquiry | Supplier notification is conditional on available profile/contact data | FTR-B2C-005 supplier notification runtime verification |
| Guaranteed supplier response | No response tracking exists | Supplier inbox workflow (PRIT-033) |
| Response tracking | Not implemented | PRIT-033 Stage 2+ |
| Marketplace transaction / payment / order execution | B2B no-platform-financial-transaction guardrail (PRIT-030) | Explicitly out of scope for B2B |
| Verified legal / compliance posture | PRIT-034 is open; no lawyer approval in place | This PRIT chain completes |
| Buyer-supplier messaging workflow | Not implemented | Future authenticated workflow |
| Guaranteed lead quality | Not implemented | No lead verification |
| Guaranteed RFQ / commercial outcome | Not implemented | Future commerce unit |

### 10.3 Inquiry Email Truth (Applies to All Three Email Wrappers)

From `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` — these are the current truthful email statements in production:

- Admin alert: "public/pre-auth inquiry received"
- Buyer acknowledgement: "Your inquiry has been recorded by TexQtic. The TexQtic team will review."
- Supplier notification (where applicable): "Review the context and follow the current follow-up process" — NOT "review and respond"

Any legal copy in `L-012` (Inquiry/RFQ Terms) must be consistent with these statements.

---

## 11. Demo / QA and Directory Data Boundary

### 11.1 Demo / QA Data Disclaimer Scope

`L-011` (Demo / QA Data Disclaimer) must:
- Clearly identify that certain profiles, products, and data records on the platform may be demo or test data created for internal QA and development purposes
- State that demo data does not represent real suppliers, buyers, or commercial offers
- State that no commercial transactions, binding quotes, or legal commitments arise from demo data interactions
- State that demo data may be removed or modified at any time without notice
- Identify how real users can distinguish demo profiles from live profiles (or state that segregation is the operator's responsibility until a live badge system is deployed)

### 11.2 Directory Data Boundary

`L-010` (Business Data & Directory Data Policy) must:
- Define what data TexQtic collects and displays about listed businesses
- State the basis for collection (submitted by supplier, sourced from public records, or provided by operator)
- State that displayed profile data reflects what was submitted or last verified at the time shown
- NOT claim real-time accuracy or verified commercial standing unless verification workflow is live
- Include a correction / takedown request path
- Align with PRIT-034's inquiry form truth: the directory is a discovery surface, not a transaction owner

---

## 12. Review Dependencies

The following external review dependencies must be resolved before any legal document is published as `ACTIVE` status. **No claim of lawyer approval may be made without these reviews being formally completed.**

| Review type | Scope | Required before | Current state | Dependency |
|---|---|---|---|---|
| **Indian IT Act / e-commerce / DPDP legal counsel review** | All T1–T4 first-wave documents (L-002 through L-012) — particularly Privacy Policy, Terms of Use, Grievance Policy, Disclaimer | Public production publication of any first-wave legal document | NOT STARTED — PRIT-034 content draft does not exist yet | `PRODUCTION-LAUNCH-LEGAL-CONTENT-REVIEW-PRIT-034-003` |
| **CA / tax review** | G4 Payment Terms, GST/TCS Disclosure, Refund Policy | Any payment, payout, or GST/TCS-adjacent language appears in any public document | BLOCKED — TTP counsel feedback outstanding (FTR-LEGAL-001); PRIT-030 B2B financial boundary frozen | Post-TTP counsel unit |
| **Security / privacy review** | Cookie & Tracking Policy (L-004); analytics/PII claims in Privacy Policy (L-003) | Final cookie/tracking/analytics claims; activating any non-cookieless analytics (PRIT-035) | PRIT-035 deferred on PRIT-034 cookie stance | Concurrent with PRIT-035 decision |
| **Ops review** | Grievance Redressal Policy (L-005) — Grievance Officer name, contact, and SLA must be verified | Publishing Grievance Policy with real contact information | Grievance Officer not yet identified in governance records | Before L-005 publication |
| **Product verification** | Any legal claim about verification badges, ranking methodology, supplier onboarding confirmation, payment, review, or sponsored visibility | Corresponding feature is live and verified | Product features not yet active | Gate per feature family readiness |
| **Founder / operator final review** | All first-wave documents before `ACTIVE` publication | Each document goes live | Not started | `PRODUCTION-LAUNCH-LEGAL-CONTENT-REVIEW-PRIT-034-003` |

### 12.1 Review Dependency Hierarchy

```
1. Architecture design complete (this unit — DONE)
2. Legal content drafted (PRIT-034-002)
3. Legal content reviewed by counsel + Paresh (PRIT-034-003)
4. Marketing Legal Center implementation (PRIT-034-004) — may proceed with DRAFT content for structure
5. App linkage (PRIT-034-005) — only after documents are ACTIVE
6. Email footer links (PRIT-034-006) — only after documents are ACTIVE
```

Documents must reach `lawyer_review_status: APPROVED` and `status: ACTIVE` before being linked from any public-facing app or email surface. Linking to a `DRAFT` document is forbidden.

---

## 13. Implementation Sequence After This Design Artifact

### 13.1 Required Bounded Units (In Sequence)

| Unit ID | Name | Description | Pre-condition | Blocks |
|---|---|---|---|---|
| `PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002` | Legal Content Draft | Draft all first-wave legal documents (L-001 through L-012) as markdown files. No production legal copy in this or any governance artifact; content lives in texqtic.com repo only. Paresh reviews structure before sending to counsel. | This architecture design artifact complete | External counsel review |
| `PRODUCTION-LAUNCH-LEGAL-CONTENT-REVIEW-PRIT-034-003` | Legal Content Review | External counsel reviews first-wave documents; Paresh reviews; all material issues resolved; documents reach `lawyer_review_status: APPROVED`. | Draft unit complete; external counsel engaged | Marketing implementation |
| `PRODUCTION-LAUNCH-LEGAL-CENTER-MARKETING-IMPLEMENTATION-PRIT-034-004` | Marketing Legal Center Implementation | Implement `texqtic.com/legal` hub and all approved first-wave legal routes in the marketing repo. Documents rendered from markdown files. SEO metadata, canonical URLs, archive structure. | At minimum L-002, L-003, L-004, L-005, L-007, L-012 must be `ACTIVE` | App linkage |
| `PRODUCTION-LAUNCH-LEGAL-LINKAGE-APP-PRIT-034-005` | App Legal Linkage | Add legal footer links to all public-facing app pages (PublicInquiryPage, PublicTrustLandingStub, B2BDiscovery, etc). Add consent disclosure to inquiry forms (PRIT-011). Link from signup/onboarding screens. | Marketing Legal Center live; documents `ACTIVE` | Email footer links |
| `PRODUCTION-LAUNCH-EMAIL-LEGAL-FOOTER-LINKS-PRIT-034-006` | Email Legal Footer Links | Add legal footer links to all three branded email templates (buyer ack, admin alert, supplier notification). Minimum: privacy policy and terms links. | App linkage unit complete; documents `ACTIVE` | Broad email outreach |

### 13.2 Optional Bounded Units (Not Required for First-Wave)

| Unit ID | Name | Description | Activation condition |
|---|---|---|---|
| `PRODUCTION-LAUNCH-COOKIE-CONSENT-PRIT-034-007` | Cookie Consent Implementation | Implement cookie consent banner or cookieless-first analytics stance. | PRIT-035 analytics tooling decided; L-004 approved |
| `PRODUCTION-LAUNCH-DSAR-WORKFLOW-PRIT-034-008` | Data Rights / DSAR Workflow | Implement DSAR intake form and processing workflow for data subject access/deletion requests. | L-003 Privacy Policy active; DPDP operational requirements clarified by counsel |
| `PRODUCTION-LAUNCH-SUPPLIER-LEGAL-ACCEPTANCE-PRIT-034-009` | Supplier Legal Acceptance | Supplier ToS click-wrap acceptance during onboarding; lightweight acceptance capture table. | FAM-07 supplier onboarding cycle opens; G1 supplier documents approved |
| `PRODUCTION-LAUNCH-BUYER-LEGAL-ACCEPTANCE-PRIT-034-010` | Buyer / Seller Legal Acceptance | Buyer/seller legal acceptance at registration or first commerce action. | Buyer commerce active; G2 documents approved |
| `PRODUCTION-LAUNCH-POLICY-VERSION-ACCEPTANCE-PRIT-034-011` | Policy Archive / Version Acceptance Capture | Retroactive version acceptance auditing; acceptance record table; archive URL policy enforcement. | Any major version bump (v2.0.0) to an active document with existing accepted users |

---

## 14. Risks and Non-Decisions

### 14.1 Risks

| Risk ID | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| LEGAL-RISK-001 | Marketing repo is not yet implemented and no texqtic.com content framework exists | Medium | High — blocks Legal Center implementation | Architecture is forward-compatible; when marketing repo is created, legal content directory structure follows this design artifact |
| LEGAL-RISK-002 | Indian DPDP rules may require specific consent consent mechanisms not yet designed | Medium | High — may require consent banner or explicit click-wrap before data collection | Designed into L-003 and L-004 scope; counsel review (PRIT-034-003) addresses this |
| LEGAL-RISK-003 | Grievance Officer designation may require specific individual with contact disclosure | High (IT Act requirement) | Medium — L-005 cannot be published until officer is identified | Ops review dependency noted; Paresh must designate a Grievance Officer before L-005 is ACTIVE |
| LEGAL-RISK-004 | Demo/QA data policy may conflict with real supplier profile data if profiles overlap | Medium | Medium — user confusion; potential DPDP exposure | L-011 must clearly distinguish demo from live; real profiles should not be used as QA data |
| LEGAL-RISK-005 | Cookie/tracking stance decision (PRIT-035) may create retroactive compliance exposure if analytics activated before L-004 is ACTIVE | Medium | High — GDPR/DPDP cookie consent requirement | Do not activate any PII-capturing analytics until L-004 is ACTIVE and cookie stance is decided |
| LEGAL-RISK-006 | App-side legal footer links added before documents are ACTIVE could link to 404 or draft pages | Low if sequenced correctly | High — user trust damage | Enforce: app linkage unit runs ONLY after documents reach ACTIVE status |

### 14.2 Non-Decisions Recorded (Deferred to Future Units)

| Item | Reason deferred | Unit that will decide |
|---|---|---|
| Specific legal copy for any document | Requires counsel involvement; not a design-time decision | `PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002` + `003` |
| DPDP cookie consent mechanism (banner vs. cookieless-first) | Depends on PRIT-035 analytics tooling decision | PRIT-035 + `PRIT-034-007` |
| DSAR process and tooling | Requires counsel guidance on DPDP operational requirements | `PRODUCTION-LAUNCH-DSAR-WORKFLOW-PRIT-034-008` |
| Grievance Officer designation | Operational/people decision, not technical | Ops review gate before L-005 publication |
| Legal acceptance table schema | Future unit; no schema work in this design phase | `PRODUCTION-LAUNCH-SUPPLIER-LEGAL-ACCEPTANCE-PRIT-034-009` |
| Whether to use MDX vs plain markdown for legal content files | Minor technical decision; depends on marketing repo framework | `PRODUCTION-LAUNCH-LEGAL-CENTER-MARKETING-IMPLEMENTATION-PRIT-034-004` |
| Marketing repo framework and stack | Not present in current checkout; unknown at design time | Marketing repo creation and governance |
| TTP-related payment/tax/GST legal language | BLOCKED on TTP counsel feedback (FTR-LEGAL-001) | Post-TTP counsel unit |

---

## 15. Explicit Non-Implementation Statement

This unit contains:
- **No production legal copy** — no terms, privacy policy, cookie policy, or any other legal text has been drafted or included
- **No legal page routes** — no `/legal`, `/privacy`, `/terms`, `/cookies`, `/dsar`, `/grievance`, or other legal page routes have been created in any codebase
- **No application code changes** — no modifications to `components/`, `services/`, `server/`, `App.tsx`, `index.tsx`, or any other source file
- **No marketing site changes** — the texqtic.com marketing repo is not present in this checkout; no marketing routes have been implemented
- **No footer or navigation changes** — no legal links have been added to any footer, navigation, signup flow, inquiry form, or email template
- **No schema changes** — `server/prisma/schema.prisma`, migrations, and database are unchanged
- **No environment variable changes** — `.env`, `.env.local`, and Vercel config are unchanged
- **No Postmark changes** — email template code and Postmark configuration are unchanged
- **No test file changes** — no test files have been created or modified
- **No package.json changes** — no dependency installations

The only file created by this unit is:
```
governance/units/PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001.md
```

Allowlisted tracker updates are recorded in:
```
governance/launch-readiness/FUTURE-TODO-REGISTER.md
governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md
governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md
```

---

## 16. Final Recommendation

### 16.1 Architecture Summary

| Dimension | Decision |
|---|---|
| Canonical source of truth | Git-tracked markdown files in texqtic.com marketing repo |
| Legal Center canonical host | `texqtic.com` |
| App-side strategy | Link out to texqtic.com/legal/* — do not host legal pages in app.texqtic.com |
| Legal Center hub route | `texqtic.com/legal` |
| Core first-wave documents | L-001 through L-012 (12 documents including hub) |
| Versioning model | Semantic versioning + frontmatter metadata + internal change log + archive URL pattern |
| First-wave activation trigger | External counsel approves all first-wave documents before any are published as ACTIVE |
| Inquiry truth boundary | Preserved from F1-P5; no new legal framing may exceed current truthful claims |
| Demo/QA data | L-011 disclaimer required before any demo data shown to external parties |
| Directory promotion gate | First-wave legal documents must be ACTIVE before directory is promoted to real buyers (R-015) |
| Review dependencies | Counsel, ops (Grievance Officer), and Paresh review required before any document is ACTIVE |

### 16.2 Highest Priority Actions After This Artifact

1. **Engage external Indian e-commerce/privacy counsel** — required before content drafting can be finalised
2. **Create texqtic.com marketing repo** (if not already in progress) — required for Legal Center implementation
3. **Open `PRODUCTION-LAUNCH-LEGAL-CONTENT-DRAFT-PRIT-034-002`** — draft all first-wave documents in markdown format
4. **Designate Grievance Officer** — required by IT Act; blocks L-005 publication
5. **Decide PRIT-035 analytics / cookie stance** — required before L-004 cookie policy can be drafted accurately

### 16.3 PRIT-034 Status

**PRIT-034 REMAINS OPEN.**

This design artifact satisfies the FTR-FAM-004 `DESIGN_REQUIRED` gate. PRIT-034 advances from `NOT_ASSESSED` (design) to `DESIGN_ARTIFACT_CREATED`. It does not close until all five bounded implementation units (PRIT-034-002 through PRIT-034-006) are complete and all first-wave legal documents are live and linked.

---

## 17. Completion Checklist

- [x] Worktree inspected before changes — confirmed CLEAN
- [x] HEAD confirmed: `9a4d25c43aade630620094f27d37fb6b4cbb1131`
- [x] D-025 production-intent staged-activation rule followed
- [x] One design artifact created (`governance/units/PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001.md`)
- [x] PRIT-034 remains open — not marked complete
- [x] No legal copy drafted
- [x] No legal pages/routes implemented
- [x] No app or marketing components modified
- [x] No email footer legal links added
- [x] No server/source/test/schema/env/config files modified
- [x] No Vercel/Postmark settings modified
- [x] Source-of-truth model decided (§5)
- [x] Route architecture decided (§6)
- [x] Legal page hierarchy decided (§7)
- [x] Versioning/lifecycle model decided (§8)
- [x] Surface-to-doc mapping included (§9)
- [x] Inquiry/RFQ/email truth boundary preserved (§10)
- [x] Demo/QA and directory data boundary included (§11)
- [x] Review dependencies clearly marked (§12)
- [x] Future implementation sequence recommended (§13)
- [x] Risks and non-decisions recorded (§14)
- [x] Explicit non-implementation statement included (§15)

---

*Artifact version: 1.0.0 | Created: 2026-05-22 | Unit: PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE-PRIT-034-001*
