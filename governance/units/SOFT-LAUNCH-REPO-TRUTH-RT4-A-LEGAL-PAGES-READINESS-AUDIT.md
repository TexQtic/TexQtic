# SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT

**Unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT`  
**Unit type:** Repo-truth audit — no source implementation  
**Mode:** Safe-Write Mode / TECS Repo-Truth-First Audit / Report Only  
**Date created:** 2026-05-21  
**Author:** Copilot (TexQtic governance agent)  
**Authorized by:** Paresh Patel  

**Git HEAD at creation:** `41bcd34502bc77b344925570ffe3501597b1c953`  
**Worktree state:** CLEAN — zero staged, zero modified, zero untracked  

---

## §1 Header and Authority Boundary

### Purpose

This artifact audits actual repo truth for the legal and public compliance pages required before scaled public buyer-facing soft launch and public data collection.

Specifically, this audit establishes:

1. **What legal/compliance surfaces already exist** — route, component, implementation state.
2. **What is completely missing** — with zero implementation at any layer.
3. **What governance claims exist vs. what repo truth confirms** — drift table.
4. **Whether the current state blocks specific public data-collection activities.**
5. **Priority implication** relative to other identified soft-launch blockers.

This is an investigation-only unit. It does not authorize, design, or implement any legal page, copy change, notification loop, demo-labeling mechanism, or any other source change.

### Authority boundary

This unit is a **repo-truth audit and classification record only**.

**This unit may not:**
- Implement any legal page (privacy policy, terms of service, cookie stance, DSAR path)
- Modify `App.tsx`, `PublicNavbar.tsx`, `PublicInquiryPage.tsx`, `AuthFlows.tsx`, or any source file
- Draft or edit legal policy content in source files
- Implement cookie banners or consent notices
- Fix INQ-COPY-02 or INQ-COPY-24
- Implement FTR-B2C-004 (notification loop)
- Implement demo-labeling
- Update TLRH indexes
- Update launch-readiness docs
- Update governance source registers
- Modify Layer 0 docs
- Run SQL, scripts, or tests
- Stage any file other than this audit artifact

---

## §2 TLRH Storage Note

This artifact is stored under `governance/units/` and is part of the TexQtic Launch Readiness Hub repo-truth audit record.  
This unit does not update TLRH indexes, Layer 0 docs, launch-readiness hub docs, or source registers.  
Cross-reference is maintained through the artifact itself and the Git commit introduced by RT4-A.  
A later dedicated governance-sync unit may update authoritative TLRH indexes after RT6, if Paresh authorizes it.

---

## §3 Git / Worktree Truth

```
git status --short      → (empty — clean worktree)
git rev-parse HEAD      → 41bcd34502bc77b344925570ffe3501597b1c953
```

| Attribute | Value |
|---|---|
| HEAD commit | `41bcd34502bc77b344925570ffe3501597b1c953` |
| Commit message | `[TEXQTIC] docs: synthesize demo label readiness` |
| Worktree state at creation | CLEAN — zero staged, zero modified, zero untracked |
| Branch | `main` |

All findings in this audit unit are asserted against the HEAD state above.

---

## §4 Input Artifacts Reviewed

### Governance units

| Artifact | Key content used |
|---|---|
| `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` | RT3-BLKR-001 (PRIT-034 P0); §8 Rule D (legal pages prerequisite); §11 priority implication |
| `SOFT-LAUNCH-REPO-TRUTH-RT3-C-INQUIRY-COPY-TRUTHFULNESS-AUDIT.md` | Inquiry-page footer copy; INQ-COPY-02 / INQ-COPY-24 classification; inquiry disclosure section |
| `SOFT-LAUNCH-REPO-TRUTH-RT2-B3-DIRECTORY-INQUIRY-ATTACHMENT-AUDIT.md` | OI-B3-005: PRIT-034 `NOT_STARTED`, P0 |

### Launch-readiness docs

| Artifact | Key content used |
|---|---|
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` (line 129, 171) | PRIT-034 entry: `NOT_ASSESSED`, P1/MVP_CRITICAL, legal content and GDPR/DPDP stance gate |
| `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` (lines 175–198, 277, 332, 424) | Required routes (`/privacy`, `/terms`); Decision D; network-building gate conditions |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (line 98: R-015) | Risk of directory promotion before PRIT-034 deployed; compliance exposure |
| `governance/launch-readiness/PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` (line 81) | `/contact` listed as F-6 (P2, `PILOT_REQUIRED`); no `/privacy`, `/terms`, or `/cookie` entry exists |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (line 210: FTR-FAM-002) | `PUBLIC-LEGAL-PAGES-BUNDLE-001` registered as P1, `NOT_ASSESSED`, HOLD_FOR_AUTHORIZATION |

### Legal governance docs (non-implementation)

| Artifact | Relevance to RT4-A |
|---|---|
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | TradeTrust Pay legal counsel review packet — governance-only. **Not a public-facing legal page.** Not PRIT-034 implementation. |
| `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` | TTP operator decision guide — governance-only. **Not a public-facing legal page.** |

### Source files inspected (read-only)

| File | Purpose |
|---|---|
| `components/Public/PublicNavbar.tsx` | Public navigation — checked for footer and legal link presence |
| `components/Public/PublicInquiryPage.tsx` (line 502–520) | Inquiry footer/disclosure section — checked for privacy/terms/DSAR links |
| `App.tsx` (appState cases, line 2982–3040) | All appState routes — checked for legal page routes |
| `components/Auth/AuthFlows.tsx` | Sign-up / sign-in flow — checked for terms / privacy links |
| `components/Auth/ForgotPassword.tsx` | Password reset — checked for terms / privacy links |
| `components/Auth/VerifyEmail.tsx` | Email verify — checked for terms / privacy links |
| `components/Auth/TokenHandler.tsx` | Token handler — checked for terms / privacy links |
| `server/src/routes/auth.ts` (scan) | Server routes — checked for any legal endpoints |
| All `components/Public/*.tsx` (scan) | All public components — checked for any `/privacy`, `/terms`, `/cookie`, `/dsar` href links |
| All `components/shared/**` (scan) | Shared components — checked for legal links |

---

## §5 Route / Component Discovery Table

All public routes, components, and links related to privacy, terms, cookie stance, DSAR, legal navigation, or consent were searched workspace-wide using:

- Pattern search: `\/privacy|\/terms|\/cookie|\/dsar|\/legal|\/contact|\/data-rights`
- Symbol search: `PrivacyPage|TermsPage|CookiePage|DsarPage|LegalPage|FooterLegal|PrivacyPolicy|TermsOfService|CookieBanner`
- Full search of `href` and anchor attributes across all `.tsx` / `.ts` source files

### Route discovery results

| Route | Component | Exists in source? | Public? | Implementation state | Notes |
|---|---|---|---|---|---|
| `/privacy` | — | **No** | — | **ABSENT** | No component, no appState case, no server endpoint |
| `/terms` | — | **No** | — | **ABSENT** | No component, no appState case, no server endpoint |
| `/cookie` | — | **No** | — | **ABSENT** | No component, no appState case, no server endpoint |
| `/dsar` | — | **No** | — | **ABSENT** | No component, no appState case, no server endpoint |
| `/legal` | — | **No** | — | **ABSENT** | No component, no appState case, no server endpoint |
| `/contact` | — | **No** | — | **ABSENT** | Registered as F-6 in SEO expansion register (P2 / PILOT_REQUIRED) — not yet implemented |
| `/trust` | `PublicTrustLandingStub.tsx` | Yes | Yes | Static editorial stub | Links here from `PublicInquiryPage.tsx` footer. NOT a legal page. Addresses capability-scope and verification workflows, not privacy/terms/data rights. |

### Component discovery results

| Component or symbol | File | Exists? | Purpose |
|---|---|---|---|
| `PrivacyPage` / `PublicPrivacy` | (none) | **No** | — |
| `TermsPage` / `PublicTerms` | (none) | **No** | — |
| `CookieBanner` / `CookieConsent` | (none) | **No** | — |
| `DsarPage` / `DataRightsPage` | (none) | **No** | — |
| `LegalPage` / `FooterLegal` | (none) | **No** | — |
| `PublicTrustLandingStub` | `components/Public/PublicTrustLandingStub.tsx` | Yes | Static editorial stub for trust/verification framework positioning. Not a legal page. |

### Navigation / footer discovery results

| Surface | Component | Legal nav present? | Notes |
|---|---|---|---|
| Public navbar | `PublicNavbar.tsx` | **No** | Nav links: Home, B2B Network, Products, Collections, Industry & Clusters, Trust & Origin, Aggregator Preview, Inquire. No footer section. No legal links. |
| Public inquiry page footer | `PublicInquiryPage.tsx` (line 502–520) | **Partial — non-legal only** | Footer disclosure exists: "This page is a public information surface. No payments or binding commitments are made here." Links to `/trust` (trust framework). **Zero links to privacy policy, terms of service, DSAR, or cookie notice.** |
| Auth sign-up / sign-in | `AuthFlows.tsx` | **No** | Zero mentions of terms, privacy, consent, cookie, dsar, legal, or policy. No terms-acceptance checkbox. |
| Auth forgot password | `ForgotPassword.tsx` | **No** | Zero legal links. |
| Auth verify email | `VerifyEmail.tsx` | **No** | Zero legal links. |

### App.tsx appState cases — legal routes

All public appState cases found in `App.tsx`:

```
PUBLIC_ENTRY, PUBLIC_TRUST_LANDING, PUBLIC_INDUSTRY_CLUSTER_LANDING,
PUBLIC_AGGREGATOR, PUBLIC_B2B_DISCOVERY, PUBLIC_SUPPLIER_PROFILE,
PUBLIC_PRODUCT_DETAIL, PUBLIC_COLLECTIONS, PUBLIC_COLLECTION_DETAIL,
PUBLIC_COLLECTION_DETAIL_UNAVAILABLE, PUBLIC_INQUIRY, PUBLIC_B2C_BROWSE,
PUBLIC_B2C_CATEGORY_STORY
```

No `PUBLIC_PRIVACY`, `PUBLIC_TERMS`, `PUBLIC_COOKIE`, `PUBLIC_DSAR`, `PUBLIC_LEGAL`, or equivalent appState case exists.

### Governance legal directory note

`governance/legal/` contains `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` and `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md`. Both are TradeTrust Pay governance-only counsel review packets. Neither is a public-facing legal page, a component, or a PRIT-034 implementation. They are not relevant to the public legal pages requirement.

---

## §6 Legal Readiness Matrix

**Classification vocabulary:**

| Code | Definition |
|---|---|
| `IMPLEMENTED_PRODUCTION_READY` | Page exists, is linked, has appropriate content, and is publicly accessible |
| `IMPLEMENTED_PLACEHOLDER` | Page exists (route + component) but content is placeholder or stub text |
| `IMPLEMENTED_UNLINKED` | Page exists and has content but is not linked from relevant public surfaces |
| `LINK_PRESENT_PAGE_MISSING` | A link to the page exists on a public surface but the target route/page does not exist |
| `NOT_IMPLEMENTED` | No page, no route, no component, no link — entirely absent from the codebase |
| `CONFLICTING` | Contradictory or inconsistent implementation across surfaces |

### Matrix

| Required legal surface | Route (governance docs specify) | Component | Linked from public surfaces? | Content | Classification |
|---|---|---|---|---|---|
| **Privacy Policy** | `/privacy` | None | No | None | **`NOT_IMPLEMENTED`** |
| **Terms of Service** | `/terms` | None | No | None | **`NOT_IMPLEMENTED`** |
| **Cookie Policy / Cookie Stance** | (unspecified route) | None — no banner, no notice, no page | No | None | **`NOT_IMPLEMENTED`** |
| **DSAR / Data Rights / Contact Pathway** | (unspecified — `/dsar` or contact form) | None | No | None | **`NOT_IMPLEMENTED`** |
| **Public Footer / Legal Navigation** | N/A (nav component) | None — `PublicNavbar.tsx` has no footer section | N/A | N/A | **`NOT_IMPLEMENTED`** |
| **Inquiry-page legal disclosure/linkage** | Footnote + link from `PublicInquiryPage.tsx` | Partial footer exists but links `/trust` only | Yes — links `/trust` | Boundary-only, non-legal | **`NOT_IMPLEMENTED`** — legal linkage specifically absent; existing footer addresses operational scope only, not privacy/terms/data rights |
| **Auth sign-up / terms-acceptance gate** | (checkbox or link on sign-up form) | None | No — `AuthFlows.tsx` has zero legal links or acceptance gestures | None | **`NOT_IMPLEMENTED`** |

### Summary

**All six required legal surfaces are `NOT_IMPLEMENTED`** in the current repository state.

The one partial exception (`PublicInquiryPage.tsx` footer) provides a capability-scope boundary disclaimer and a link to `/trust` (a static editorial stub). This is not a legal disclosure. It does not reference privacy policy, terms, data rights, or DSAR.

---

## §7 Public Data-Collection Impact Table

This table assesses whether the current legal-pages absence blocks each public data-collection scenario.

**Classification:**
- `BLOCKED` — Legal pages absence directly prevents this activity from being compliant at scale
- `CONDITIONALLY_PERMITTED` — Activity can proceed on a limited/internal basis but not at scale
- `NOT_BLOCKED` — Legal pages absence does not affect this specific activity

| Activity | Current legal readiness | Impact | Classification |
|---|---|---|---|
| **Public inquiry submissions at scale** (real buyers submitting inquiries via `PublicInquiryPage.tsx`) | No privacy disclosure linked from inquiry form; no terms linked from inquiry form | Submitting a form that captures sourcing intent + product interest constitutes personal data collection. No privacy notice, no terms reference, no data handling explanation at point of collection. | **`BLOCKED`** — GDPR/DPDP requires lawful basis disclosure and privacy notice at point of data collection |
| **Account creation / sign-up at scale** (via `AuthFlows.tsx`) | No terms-acceptance checkbox; no privacy policy link; no legal disclosure on sign-up form | Account creation binds a user to the platform. No terms acceptance, no privacy notice. | **`BLOCKED`** — Terms acceptance and privacy disclosure at sign-up are standard requirements for any SaaS/marketplace account creation |
| **Demo / QA public pages** (internal Paresh use) | No external buyer data collection triggered by internal browsing | Internal use does not create a data collection obligation to third parties | **`NOT_BLOCKED`** — legal pages absence does not affect internal use; demo-labeling is the separate blocker for demo/QA data on live surfaces |
| **Real supplier / product public pages** (limited internal or investor preview with known parties) | No anonymous public buyer traffic; data collection minimal | Limited personal invitation does not constitute bulk public data collection | **`CONDITIONALLY_PERMITTED`** — safe for limited known-party use; blocked for scaled promotion to anonymous buyers |
| **Broad soft-launch promotion** (sharing public directory links with buyers, investors, press) | No legal pages deployed | Any visitor who submits an inquiry or creates an account does so without legal disclosures | **`BLOCKED`** — this is precisely the R-015 risk from BLIND-SPOT-DEPENDENCY-RISK-REGISTER |
| **Analytics instrumentation** (page view tracking, event tracking) | Cookie stance / analytics consent approach not decided (PRIT-034 / PRIT-035 dependency) | If analytics collects PII (user agent, IP, session) without consent disclosure, GDPR/DPDP exposure applies | **`BLOCKED`** for PII-capturing analytics; `CONDITIONALLY_PERMITTED` for privacy-safe/cookieless tracking (PostHog/Plausible with no PII) if consent disclosure is not required under chosen stance |
| **Limited personal / offline demos** (Paresh demoing live platform to known parties, no data submitted) | No data collection triggered by live platform viewing without form submission | Observational viewing without form submission does not create data collection obligations | **`NOT_BLOCKED`** — legal pages absent but no data collection event triggered |

### Key assertion

**Legal pages absence blocks the two primary data collection touchpoints:** inquiry submissions and account creation. These are the exact mechanisms through which soft-launch network-building depends on capturing buyer and supplier identities. Both are `BLOCKED` until legal pages are deployed.

---

## §8 Governance Drift Table — Legal Pages Scope

Drift items limited to legal pages readiness. Drift in RT1/RT2/RT3/other PRIT items not recatalogued here.

| Governance claim | Document (line) | Repo truth | Drift |
|---|---|---|---|
| "`/privacy` — privacy policy (DPDP/GDPR stance; who handles data; retention; DSAR path)" required | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` line 175 | No `/privacy` route, component, or link exists | **UNIMPLEMENTED — confirmed** |
| "`/terms` — platform terms of service (for buyers and suppliers)" required | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` line 176 | No `/terms` route, component, or link exists | **UNIMPLEMENTED — confirmed** |
| "Legal pages bundle deployed (`/privacy`, `/terms`, cookie stance)" — S-1 / B-1 checklist | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` lines 277, 332, 348 | Zero implementation at any layer | **NOT_ASSESSED status confirmed as accurate — all items absent** |
| PRIT-034 status `NOT_ASSESSED` | `PLANNED-REQUIREMENTS-INTAKE.md` line 129 | Zero implementation found | **`NOT_ASSESSED` status confirmed as accurate** |
| "no /privacy page, no /terms page, no cookie consent stance, no DSAR path in repo" | `PLANNED-REQUIREMENTS-INTAKE.md` line 171 (from MISSING-FAMILY-AND-FEATURE-SCAN.md §6) | Confirmed by direct source inspection at HEAD `41bcd34` | **CONFIRMED — no change since initial scan** |
| "PRIT-034 legal pages bundle is a P0 hard prerequisite before public buyer data collection at scale" | `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` RT3-BLKR-001; `RT2-B3` OI-B3-005 | Confirmed — nothing deployed; inquiry submissions and account creation remain uncovered | **CONFIRMED — RT3-D blocker classification accurate** |
| "Cookie consent stance must be decided before any analytics tool that [captures PII]" | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` line 198, 440 | No cookie consent stance anywhere in codebase | **CONFIRMED — PRIT-035 dependency also unmet** |
| `/contact` — P2 / PILOT_REQUIRED | `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` line 81 | `/contact` route does not exist in source | **`PILOT_REQUIRED` status accurate — not yet implemented** |
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` / `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` exists | `governance/control/OPEN-SET.md` lines 120–121 | Both files exist in `governance/legal/` | No drift — governance-only docs, not source implementation; not PRIT-034 |
| Auth sign-up has terms-acceptance flow with 10 required elements | `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` §terms acceptance (TTP-scoped) | `AuthFlows.tsx` has zero legal links, zero terms-acceptance gesture | Note: TTP terms-acceptance flow requirements are TTP-feature-specific; standard platform terms-acceptance at sign-up is **separately absent** |
| `FTR-FAM-002 / PUBLIC-LEGAL-PAGES-BUNDLE-001` — P1, `NOT_ASSESSED`, HOLD_FOR_AUTHORIZATION | `FUTURE-TODO-REGISTER.md` line 210 | Confirmed — no implementation | **`NOT_ASSESSED` status accurate** |

### New drift item identified by RT4-A

| Item | Finding |
|---|---|
| RT4-DRIFT-001 | `governance/launch-readiness/PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` lists `/contact` (F-6) as a SEO expansion page but does not register `/privacy` or `/terms` — both of which are higher-priority legal prerequisites than `/contact`. The absence of legal pages from the SEO expansion register creates a risk that `/privacy` and `/terms` could be deprioritized as "SEO additions" rather than P0/P1 compliance prerequisites. This is a classification gap in the SEO expansion register, not an implementation gap. No action required by this audit. |

---

## §9 Priority Implication Notes

This section provides input to final priority synthesis. It does not finalize implementation order.

### What PRIT-034 requires

PRIT-034 legal pages bundle requires three distinct gates:

1. **Legal content decisions** — Paresh + optional counsel: privacy policy wording, terms of service wording, GDPR/DPDP data-subject rights stance, cookie/analytics consent approach. This is **not a technical gate**. It requires human decisions and may require external counsel depending on complexity.

2. **Technical implementation** — Route, component, and navigation. Once content is available, implementation is straightforward (new static page components, appState cases, footer links). Low technical complexity.

3. **Linkage from data-collection surfaces** — inquiry form disclosure, auth sign-up page, public footer. These are individual targeted changes to existing components.

The primary non-technical dependency distinguishes PRIT-034 from the inquiry copy fix and demo-labeling.

### Legal pages vs. inquiry copy fix (INQ-COPY-02 + INQ-COPY-24)

| Comparison point | Legal pages (PRIT-034) | Inquiry copy fix |
|---|---|---|
| Technical complexity | Low (once content decided) | Very low — two string replacements in one file |
| Content gate | **Yes** — legal content requires Paresh / counsel approval; cannot be assumed | No — exact replacement wording already specified in RT3-C §10.1 / §10.2 |
| Implementation time (technical) | Moderate — new components, routes, nav linkage | Minimal — sub-1h in a single file |
| Blocking scenario | Inquiry data collection and account creation at scale | Buyer seeing misleading copy on inquiry surface now |
| Can be done in parallel? | **Yes** — PRIT-034 and copy fix are fully independent; no sequencing dependency | Yes |
| Sequence recommendation input | Legal pages can be opened in parallel with copy fix; copy fix should not wait for legal content decisions | Copy fix should proceed immediately; does not require legal decisions |

**Input:** The inquiry copy fix has no content gate and can be completed in a single prompt. Legal pages cannot proceed until Paresh makes legal content decisions. These are independent workstreams. The copy fix is the faster path to eliminating an active misleading claim.

### Legal pages vs. FTR-B2C-004 (notification loop)

| Comparison point | Legal pages (PRIT-034) | FTR-B2C-004 |
|---|---|---|
| Content gate | Yes — legal content required | No — technical implementation |
| Technical complexity | Low (once content decided) | High — SMTP/notification infrastructure, supplier-facing UI |
| Blocking scenario | Data collection compliance at scale | Inquiry copy accuracy, supplier awareness |
| Dependency | PRIT-034 independent of FTR-B2C-004 | FTR-B2C-004 independent of PRIT-034 |
| Can be done in parallel? | Yes | Yes |

**Input:** Legal pages and FTR-B2C-004 are independent. FTR-B2C-004 is significantly more complex technically. Legal pages, once content is decided, are faster to implement.

### Legal pages vs. demo-labeling implementation

| Comparison point | Legal pages (PRIT-034) | Demo-labeling |
|---|---|---|
| Content gate | Yes — legal content required | No — technical design required |
| Technical complexity | Low (once content decided) | High — schema change, API projection change, multiple component changes |
| Blocking scenario | All buyer-facing public data collection | QA/demo data on live surfaces only |
| Urgency if no demo/QA data is seeded | Legal pages still required before any real buyer traffic | Demo-labeling not urgent until QA/demo data is intentionally seeded |

**Input:** If no demo/QA data is seeded before real suppliers are onboarded, demo-labeling has no immediate urgency. Legal pages have urgency tied to any buyer form submission. Legal pages implementation (after content decision) ranks ahead of demo-labeling implementation in terms of compliance urgency.

### Legal pages vs. aggregator directory data / provisioning

| Comparison point | Legal pages (PRIT-034) | Aggregator provisioning |
|---|---|---|
| Blocking scenario | Legal compliance before any buyer data collection | Real supplier data visible to buyers without consent/notifications (R-015 risk) |
| Dependency | Independent | R-015 in BLIND-SPOT-DEPENDENCY-RISK-REGISTER flags: directory promotion should be gated behind PRIT-034 + FTR-B2C-004 |

**Input:** BLIND-SPOT-DEPENDENCY-RISK-REGISTER R-015 explicitly gates directory promotion behind PRIT-034. Aggregator provisioning and directory promotion should not proceed ahead of legal pages.

### Summary input for final priority synthesis

| Item | Pre-condition | Urgency source | Relative to other items |
|---|---|---|---|
| **Inquiry copy fix** (INQ-COPY-02 + INQ-COPY-24) | None — wording fully specified | Active misleading claim visible on live inquiry surface now | Fastest to implement; no content gate; should not wait for legal pages |
| **Legal pages** (PRIT-034) | Paresh legal content decisions first | P0/P1 compliance before any buyer data collection at scale | Can be opened in parallel with copy fix; content gate is the rate-limiting step |
| **FTR-B2C-004** (notification loop) | None | P1 — needed before supplier notification promise is accurate | Independent of legal pages; higher technical complexity |
| **Demo-labeling** | Design unit first, then schema/API/component changes | P1 — needed only if demo/QA data is seeded | Largest workstream; deferred unless demo/QA seeding is imminent |
| **Aggregator provisioning** | PRIT-034 + FTR-B2C-004 as prerequisites | Gated by R-015 | Should not precede PRIT-034 |

**This is a priority input, not a final ordering decision.** Final implementation order is Paresh's decision based on timeline, resource availability, and legal content readiness.

---

## §10 Recommended Next Packet

### Recommendation: RT4-B notification-loop readiness audit

**Proposed unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT`  
**Type:** Repo-truth audit (not implementation)  
**Allowlist required:** `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md` (single file)

### Rationale

1. **FTR-B2C-004 (minimum supplier notification loop) is `NOT_STARTED`** — confirmed by RT3-C §3 and RT2-B3 OI-B3-004. Before implementation priority is finalized, repo truth must establish: what notification infrastructure already exists (email configuration, webhook setup, any notification model in Prisma schema), what is completely absent, and what the implementation scope would require.

2. **INQ-COPY-02 is `MISLEADING` partly because FTR-B2C-004 is absent** — once the notification loop is implemented, the copy becomes truthful. Understanding the notification-loop implementation scope is an input to whether INQ-COPY-02 should be fixed now (copy-first) or deferred until FTR-B2C-004 is implemented (implementation-first).

3. **RT4-B follows the same audit pattern as RT4-A** — investigate before implementing. Paresh has directed that all investigations/audits be completed before implementation priority is finalized.

4. **After RT4-A and RT4-B are complete**, a final RT4 synthesis (RT4-C or equivalent) can consolidate the legal pages and notification-loop findings alongside RT3's inquiry-copy and demo-labeling findings into a single prioritized implementation order recommendation.

### Scope of RT4-B

- Audit existence of SMTP / email infrastructure (server-side configuration, sendEmail service, transactional email provider)
- Audit notification-related Prisma schema fields
- Audit any existing notification routes or service functions
- Classify: `IMPLEMENTED_FULL`, `IMPLEMENTED_PARTIAL`, `NOT_IMPLEMENTED` for each notification sub-component
- Determine whether any existing email infrastructure is usable for FTR-B2C-004 or whether it is fully absent
- Identify implementation scope estimate (minimal viable vs. full)
- No implementation authorized

---

## §11 Explicit No-Authorization Statement

This unit authorizes **no implementation work of any kind**.

The following actions are explicitly **not authorized** by this audit:

- Implementing any legal page (privacy policy, terms, cookie notice, DSAR)
- Adding `/privacy`, `/terms`, `/cookie`, `/dsar`, or `/legal` routes to `App.tsx`
- Creating `PublicPrivacyPage.tsx`, `PublicTermsPage.tsx`, or equivalent components
- Adding legal navigation links to `PublicNavbar.tsx` or any public footer
- Adding privacy/terms links to `PublicInquiryPage.tsx`, `AuthFlows.tsx`, or any auth surface
- Adding terms-acceptance checkbox or consent gesture to `AuthFlows.tsx`
- Drafting or editing legal policy content in any source or governance file
- Implementing cookie consent banner or cookie opt-in/opt-out
- Correcting INQ-COPY-02 or INQ-COPY-24 inquiry copy
- Implementing FTR-B2C-004 (notification loop)
- Implementing demo-labeling
- Updating TLRH indexes
- Updating launch-readiness hub docs
- Updating governance source registers
- Modifying Layer 0 docs
- Modifying any Prisma schema, migration, or RLS policy
- Modifying any `.env` or environment config file
- Running SQL, scripts, or test suites
- Opening RT4-B audit packet
- Committing any file other than this governance unit

If Paresh wishes to implement any of the above, a separate explicit prompt with an allowlist must be issued.

---

*End of RT4-A legal pages readiness audit artifact.*
