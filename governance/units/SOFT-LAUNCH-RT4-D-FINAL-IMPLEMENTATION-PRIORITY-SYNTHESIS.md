# SOFT-LAUNCH-RT4-D — Final Implementation Priority Synthesis

**Unit ID:** `SOFT-LAUNCH-RT4-D-FINAL-IMPLEMENTATION-PRIORITY-SYNTHESIS`
**Series:** RT4 — Domain Separation & Public Surface Alignment
**Sequence:** D (synthesis — closes RT4 investigation series)
**Author:** Paresh Patel
**Status:** COMPLETE — GOVERNANCE RECORD
**Type:** Cross-repo priority synthesis — no source implementation

---

## 1. Header and Authority Boundary

| Dimension | Value |
|---|---|
| Platform app domain | `https://app.texqtic.com` (canonical) |
| Marketing domain | `https://texqtic.com` |
| Domain lock | Option F — locked in `SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK.md` (commit `cb6c4b5`) |
| Repo inspected | TexQtic/TexQtic — `main` branch |
| HEAD at synthesis | `4f9447853a14b147758c651e7cd6a5bd23d7385c` |
| Worktree state | CLEAN |
| Synthesis authority | All completed RT2 through RT4-C4A app-repo artifacts + marketing repo RT4-C2 through RT4-C6 findings from prompt context |
| Strategic authority | Paresh Patel — core decisions listed in section 12 |

**Authoritative binding decisions carried forward from prompt:**

1. `texqtic.com` = production marketing, SEO, credibility, trust, legal, education, conversion, routing website.
2. `app.texqtic.com` = platform application + all public-safe platform surfaces.
3. `texqtic.com` explains, educates, builds credibility, converts, and routes. `app.texqtic.com` executes.
4. Marketing/explainer pages belong on `texqtic.com`.
5. Dynamic/public-safe app pages reachable from `texqtic.com` CTAs only when gate-safe.
6. Demo/mock/profile preview lives on `app.texqtic.com`; `texqtic.com` explains and routes.
7. `texqtic.com/request-access` is transitional only — removed, redirected, or converted after app-side route available.
8. Investigations and audits are complete. Priority synthesis is the final step before implementation begins.

---

## 2. TLRH Storage Note

This document is a governance-only synthesis record. It makes no changes to source code,
database schema, migration state, environment configuration, or deployment targets.
It is stored in `governance/units/` as part of the TexQtic soft-launch readiness corpus.
This unit does NOT update TLRH indexes, Layer 0 docs, launch-readiness docs, or governance
source registers. A later dedicated governance-sync unit may update authoritative TLRH indexes
after the first implementation family completes, if Paresh authorizes it.

---

## 3. Git / Worktree Truth

**Commands run:** `git status --short ; git rev-parse HEAD`

**Output:**
```
(no untracked or modified files)
4f9447853a14b147758c651e7cd6a5bd23d7385c
```

| Attribute | Value |
|---|---|
| HEAD commit | `4f9447853a14b147758c651e7cd6a5bd23d7385c` |
| Commit message | `[TEXQTIC] docs: audit app public content destinations` (RT4-C4A) |
| Worktree state | CLEAN |
| Branch | `main` |

---

## 4. Inputs Reviewed

### Main app repo artifacts (all read at HEAD `4f94478`)

| Artifact | File | Key findings carried |
|---|---|---|
| RT2-B4 Aggregator Synthesis | `SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md` | B2B/B2C `IMPLEMENTED_DATA_EMPTY`; `/aggregator` is static stub; `/supplier/:slug` is strongest surface; FTR-B2C-004 P1 (no notification); zero B2B-public supplier data provisioned |
| RT3-D Demo Label Synthesis | `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` | 6 surfaces `NO_LABELING_SUPPORT`; no `isDemoData` field at any layer; INQ-COPY-02 `MISLEADING`; INQ-COPY-24 `OVERPROMISE_RISK`; RT3-BLKR-001 (PRIT-034 P0) confirmed |
| RT4-A Legal Pages Audit | `SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT.md` | All 6 legal surfaces `NOT_IMPLEMENTED`; inquiry and sign-up both `BLOCKED` for public data collection at scale; `/contact` also absent; PRIT-034 P0 |
| RT4-B Notification Loop Audit | `SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md` | Zero notification side effect in inquiry route; `sendBuyerInquiryNotificationEmail` does not exist; HD-001-SMTP-INFRA-GAP-001 P0 (all SMTP returns `SKIPPED_SMTP_UNCONFIGURED`); email code correct but infrastructure absent; FTR-B2C-004 `NOT_STARTED` |
| RT4-C1 Domain Separation | `SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK.md` | Option F locked; non-overlap rules N-01 through N-08 established; `app.texqtic.com` public pages may be linked as product proof from `texqtic.com`; legal routes must resolve on `app.texqtic.com` (or redirect from there) |
| RT4-C4A App Content Audit | `SOFT-LAUNCH-RT4-C4A-APP-PUBLIC-PAGES-CONTENT-DESTINATION-AUDIT.md` | 17 public surfaces catalogued; D-01 through D-10 design drift items; `SUPPLIER_REQUEST_ACCESS_URL` domain violation; `PUBLIC_B2B_DISCOVERY` no URL; CTA classification matrix; marketing content reuse classification |
| TLRH Inventory | `TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md` | Artifact naming convention; governance storage rules |

### Marketing repo findings (carried from prompt context — RT4-C2 through RT4-C6)

| Finding source | Key findings carried |
|---|---|
| RT4-C2 (marketing page audit) | Current pages retained; Company/About and Resources strong; `/request-access` too heavy; contact/legal/trust/founder-depth/location hubs missing |
| RT4-C3 (marketing sitemap plan) | New required pages: contact, founder/vision, trust cluster, legal pages, onboarding education, buyer discovery, supplier onboarding, location hubs; app-owned pages must NOT be duplicated on `texqtic.com` |
| RT4-C4B (CTA/claims guardrails) | `/request-access` classified `CONFLICTING`; Contact and Explore OS are safe; Browse Suppliers blocked until B2BDiscovery URL/data/guardrails; Inquiry blocked until legal/copy/notification; product browse blocked until product data; app proof links permitted with guardrails |
| RT4-C5 (SEO/CRO/onboarding plan) | Location hubs and multilingual SEO are future-phased; supplier/buyer/ecosystem/investor onboarding journeys defined; demo/profile preview must be app-hosted |
| RT4-C6 (final marketing synthesis) | Final production marketing design accepted; final blocker/dependency list created; candidate implementation units identified |

---

## 5. Candidate Implementation Unit Inventory

The following 14 candidates are drawn from cross-repo findings and grouped by domain.

| ID | Candidate Unit | Domain | Type |
|---|---|---|---|
| CU-01 | Legal pages bundle — `/privacy`, `/terms`, `/contact`, cookie stance | Cross-repo (content decision → texqtic.com + app.texqtic.com routing) | Policy decision + content + source implementation |
| CU-02 | SMTP provider decision + Vercel production env vars | App-repo infra / Vercel ops | Policy decision + infra/env |
| CU-03 | INQ-COPY quick fixes — INQ-COPY-02 + INQ-COPY-24 | App-repo source | Source implementation (tiny) |
| CU-04 | FTR-B2C-004 — Buyer inquiry notification loop (supplier + admin) | App-repo source + env | Source implementation (medium) |
| CU-05 | D-01 Request Access relocation — new in-app interest form + remove `SUPPLIER_REQUEST_ACCESS_URL` | Cross-repo (app-side new route + marketing redirect) | Source implementation (medium) + policy decision |
| CU-06 | D-02 B2B Discovery URL — add `/discover` or `/suppliers` route | App-repo source | Source implementation (small) |
| CU-07 | Demo/preview labeling — add labels on 6 live-data surfaces | App-repo source | Source implementation (small-medium) |
| CU-08 | App-proof links verification — valid supplier slug, passport ID, collection slugs | App-repo data + verification | Data provisioning + verification |
| CU-09 | Marketing CTA/copy rewrite — apply RT4-C4B CTA permission table | Marketing-repo content | Content implementation |
| CU-10 | Marketing minimum viable page set — contact, founder/vision, trust cluster, how-it-works | Marketing-repo source + content | Source + content implementation |
| CU-11 | Marketing new page set (full) — supplier onboarding, buyer discovery, platform-preview explainer | Marketing-repo source + content | Source + content implementation |
| CU-12 | B2B/aggregator data readiness — real supplier data or clearly labeled demo data | App-repo data / provisioning | Data provisioning |
| CU-13 | Product/B2C data readiness — real product data or labeled demo data | App-repo data / provisioning | Data provisioning |
| CU-14 | Location hub SEO pages + multilingual SEO expansion | Marketing-repo source + content | Source + content implementation |

---

## 6. Candidate Classification Table

| ID | Repo | Implementation Type | Blocker Severity | Must Precede | Can Run Parallel | Must Follow | Launch Impact |
|---|---|---|---|---|---|---|---|
| CU-01 | Cross-repo | Policy decision + content + source impl | **P0** | All public data collection; sign-up scale; inquiry CTA; marketing activation | CU-02 (infra parallel), CU-03 (copy parallel) | — | Blocks broad public soft launch; blocks buyer outreach; blocks supplier onboarding |
| CU-02 | App infra | Policy decision + infra/env (no code) | **P0** | CU-04 (notification delivery); all invite email; auth email | CU-01, CU-03, CU-05 | — | Blocks supplier invite delivery; blocks inquiry notification; blocks all email flows |
| CU-03 | App source | Source implementation (tiny, ≤2 files) | **P1** | All public inquiry CTA activation on marketing | CU-01, CU-02 | — | Blocks buyer outreach (misleading copy risk) |
| CU-04 | App source + env | Source implementation (medium) | **P1** | Broad buyer outreach; supplier visibility into inquiries | CU-01, CU-02, CU-03 | CU-02 (SMTP must be live) | Blocks buyer outreach at scale; blocks supplier operational value |
| CU-05 | Cross-repo | Source impl (medium) + policy | **P1** | Marketing /request-access activation at scale; in-app supplier onboarding UX | CU-01 (legal pages gate any new form that collects data), CU-02 | CU-03 | Blocks supplier onboarding UX; blocks marketing /request-access removal |
| CU-06 | App source | Source implementation (small) | **P1** | Marketing B2B directory CTA deep-link | CU-08 (data), CU-07 (demo labels) | CU-04 | Blocks marketing "Browse Suppliers" CTA; blocks B2B marketing activation |
| CU-07 | App source | Source implementation (small-medium) | **P1** | Demo/preview promotion; data seeding (CU-08 must follow CU-07) | CU-01, CU-03 | — | Blocks demo amplification; blocks data provisioning safety |
| CU-08 | App data | Data provisioning + verification | **P1** | Marketing app-proof links (supplier, passport, collection) | CU-07 (demo labels must exist first) | CU-07 | Blocks marketing activation with live proof links |
| CU-09 | Marketing | Content implementation | **P1** | Safe marketing CTA activation | CU-01, CU-03, CU-07 | CU-10 | Blocks marketing activation |
| CU-10 | Marketing | Source + content implementation | **P1** | Minimum marketing presence for soft-launch credibility | CU-01 | CU-09, CU-11 | Blocks marketing activation; blocks investor/buyer credibility |
| CU-11 | Marketing | Source + content implementation | **P2** | Full marketing page set | CU-10, CU-09 | CU-10 | Improves SEO/CRO; enables detailed onboarding journeys |
| CU-12 | App data | Data provisioning | **P2** | B2B directory surfaces showing real data | CU-07 (demo labels), CU-06 (URL), CU-01 (legal) | CU-07, CU-06 | Improves supplier operational value; enables B2B discovery |
| CU-13 | App data | Data provisioning | **P2** | B2C product browse activation | CU-07 (demo labels), CU-01 (legal) | CU-07 | Improves B2C value; future buyer operational value |
| CU-14 | Marketing | Source + content implementation | **P3** | SEO expansion / location marketing | CU-10 (core IA), CU-01 (legal on main domain) | CU-10, CU-11 | Future SEO/CRO expansion only |

---

## 7. Final Ranked Priority Order

The ranking below applies these criteria in order:
1. Legal/compliance risk (P0 gates that block ALL data collection)
2. User trust / misleading-claim risk
3. Onboarding unblock
4. Marketing activation unblock
5. Buyer/supplier operational value
6. Dependency order
7. Implementation size

### Tier 0 — Hard prerequisites (nothing else is safe to promote without these)

| Rank | Unit | Rationale |
|---|---|---|
| **T0-1** | **CU-01: Legal pages bundle** | PRIT-034 P0. Every public inquiry submission and every account creation at scale requires a privacy disclosure and terms reference at the point of collection. The inquiry form, auth sign-up, and any new access-request form all capture personal data. Without legal pages, the platform cannot safely solicit any buyer or supplier interaction at scale. This is a content-and-legal decision gate, not purely a technical gate. Paresh must decide: (a) host on `texqtic.com` and redirect from `app.texqtic.com`, or (b) implement on both domains. Either way, `/privacy` and `/terms` must be reachable from every data-collection surface. |
| **T0-2** | **CU-02: SMTP provider + Vercel env vars** | HD-001-SMTP-INFRA-GAP-001 P0. All email is currently silently failing in production (`SKIPPED_SMTP_UNCONFIGURED`). This affects invite delivery (blocking supplier onboarding), password reset (affecting all auth), and will block CU-04 (inquiry notification). The code is correct — only the infrastructure decision is missing. This is a Paresh action item: choose a provider (Resend, Postmark, SendGrid, SES) and set Vercel env vars. No source changes needed. Can and should run in parallel with CU-01. |

### Tier 1 — P1 unblockers (required before any buyer-facing outreach or marketing activation)

| Rank | Unit | Rationale |
|---|---|---|
| **T1-1** | **CU-03: INQ-COPY quick fixes** | INQ-COPY-02 is `MISLEADING`. The copy "Your interest will be forwarded to the supplier for context" is a factual overstatement — no notification exists. This is a 1–2 line change in `PublicInquiryPage.tsx`. It can be implemented immediately after CU-01 legal pages are in progress. INQ-COPY-24 (SuccessPanel "We'll help you track responses") is `OVERPROMISE_RISK` and should be softened in the same pass. These are the smallest source changes with the highest trust protection. |
| **T1-2** | **CU-07: Demo/preview labeling** | Six live-data surfaces have `NO_LABELING_SUPPORT` (B2BDiscovery, supplier profile, passport, products, product detail, category pages). QA/demo data passing publication gates is visually indistinguishable from real supplier data. This must be resolved before any demo data is provisioned (CU-08) and before any marketing links point buyers at these surfaces. Demo labels unblock safe data provisioning and safe marketing amplification. |
| **T1-3** | **CU-05: Request Access relocation** | `SUPPLIER_REQUEST_ACCESS_URL` sends suppliers off-platform to `texqtic.com/request-access`. The marketing page should explain and route — not collect. A new lightweight in-app interest capture form (`app.texqtic.com/access` or `/request-access`) is needed. This depends on CU-01 (legal pages — the new form will collect name/email/company and requires a privacy disclosure). Depends on CU-02 for confirmation email after submission. Medium scope: new component + new App.tsx route + new backend endpoint + CTA update in `PublicTrustLandingStub`, `PublicAggregatorPreview`, and `App.tsx`. |
| **T1-4** | **CU-04: FTR-B2C-004 notification loop** | Buyers submitting inquiries get no confirmation. Suppliers have zero visibility into inquiries. This is a P1 blocker for operational utility of the platform at soft launch. Implementation scope: new `sendBuyerInquiryNotificationEmail` wrapper in `email.service.ts` + DB join (Membership → User.email) + optional `ADMIN_NOTIFICATION_EMAIL` env var + test coverage. Depends on CU-02 (SMTP must be live before notification can deliver). Can be coded before SMTP is configured but should not be promoted as "implemented" until SMTP is live. |
| **T1-5** | **CU-10: Marketing minimum viable page set** | `texqtic.com` needs at minimum: a truthful homepage, contact page, founder/vision section, and trust cluster content before scaled marketing activation. This is marketing-repo work but it is a credibility prerequisite for buyer and supplier outreach. Depends on CU-01 (legal pages must be linked from this site). |
| **T1-6** | **CU-09: Marketing CTA/copy rewrite** | Current marketing CTAs must be rewritten to match the RT4-C4B CTA permission table — removing blocked CTAs, applying safe-to-activate CTAs, and framing conditional CTAs with appropriate guardrails. Depends on CU-01 (legal), CU-03 (inquiry copy truthful), CU-07 (demo labels). |
| **T1-7** | **CU-08: App-proof links verification** | Before marketing CTAs point to live app surfaces as product proof, a valid set of supplier slug, passport ID, and collection slugs must be identified and verified as publicly resolvable. This is a verification task, not a code task. Must follow CU-07 (demo labels must be in place before data is provisioned). |
| **T1-8** | **CU-06: B2B Discovery URL (D-02)** | Adding `/discover` or `/suppliers` as a URL path for `PUBLIC_B2B_DISCOVERY` makes marketing deep-linking possible. Currently blocked entirely — no URL exists. This is a small App.tsx routing change. Must follow CU-07 (demo labeling on B2BDiscovery surface) and CU-12 (supplier data). Can proceed at any point after CU-07 is complete, but marketing should not activate the CTA until CU-12 is resolved. |

### Tier 2 — P2 value items (improves platform after Tier 1 is stable)

| Rank | Unit | Rationale |
|---|---|---|
| **T2-1** | **CU-11: Marketing new page set (full)** | Supplier onboarding education, buyer discovery hub, platform-preview explainer, full onboarding journeys. High SEO value. Depends on CU-10 (core IA stable). |
| **T2-2** | **CU-12: B2B/aggregator data readiness** | Real supplier data provisioned into B2B-eligible state. Requires: demo labels (CU-07), B2B Discovery URL (CU-06), legal pages live (CU-01). Until these are all in place, provisioning real data creates a misleading-claim risk. |
| **T2-3** | **CU-13: Product/B2C data readiness** | Real product data for B2C browse. Lower urgency than B2B — B2B is the stronger commercial surface. Requires: demo labels (CU-07), legal pages live (CU-01). |

### Tier 3 — P3 future expansion

| Rank | Unit | Rationale |
|---|---|---|
| **T3-1** | **CU-14: Location hub SEO + multilingual** | High SEO value post-launch. No value before core IA is stable, data is provisioned, and core credibility pages exist. Location hubs (Surat, Tiruppur, Ludhiana, Ahmedabad, Bhilwara) are phase 2 marketing. |

---

## 8. Deferral / Do-Not-Start-First List

The following must explicitly NOT be started before their stated gate conditions are met.

| Candidate action | Defer until | Reason |
|---|---|---|
| Full demo supplier/product seeding | CU-01 (legal) + CU-07 (demo labels) both complete | Seeding demo data before legal pages and demo labels are live creates a public surface showing unreal data to real users with no disclosure — a trust and compliance violation |
| Broad product browse promotion | CU-13 (real product data) + CU-07 (demo labels) + CU-01 (legal) | Promoting `/products` with no data creates a dead-end experience that damages credibility; with only demo data and no labels, creates misleading presentation |
| Location hub SEO pages (CU-14) | CU-10 (core marketing IA stable) + CU-01 (legal on marketing domain) | Building location SEO pages before the main website is credible wastes SEO authority and dilutes crawl budget |
| Multilingual SEO | CU-14 (English location hubs stable) + explicit Paresh scope decision | Multilingual expansion requires content localization strategy that cannot begin until core English IA is stable |
| "Browse Suppliers" CTA on marketing | CU-06 (B2B Discovery URL) + CU-07 (demo labels) + CU-12 (real B2B supplier data) | Marketing CTA pointing to a state-only surface with no URL, no demo label, and no real data = broken experience and credibility damage |
| Public inquiry CTA on marketing | CU-01 (legal pages) + CU-03 (INQ-COPY fix) + CU-04 (notification loop, partial) | Driving buyer traffic to an inquiry form that tells them their message is "forwarded to the supplier" (false), with no privacy disclosure, and no actual notification to the supplier = double trust violation |
| "List Your Business Free" / free-listing claim | Explicit Paresh pricing policy decision | The free-listing claim has not been confirmed as the pricing policy. Making this claim on marketing without a policy decision is premature. Defer until Paresh explicitly decides the free-listing model and commits it to governance |
| App-side access-request form (CU-05) | CU-01 (legal pages) | The new access request form will collect name/email/company — personal data. It cannot be deployed without a privacy disclosure on the same domain. |
| Full marketing page set (CU-11) | CU-10 (minimum viable page set stable) + CU-09 (CTA rewrite) | Full supplier onboarding journeys and buyer discovery content built before the minimum credibility baseline is established will require rework when the baseline is locked |

---

## 9. Recommended First Implementation Family

### Decision: Family 1 — Legal/Contact/Trust Essentials + SMTP

**Rationale:**

Family 1 is the single highest-leverage unblocking family. Without it:

- Every public buyer-facing inquiry is non-compliant (no privacy disclosure at data collection)
- Every supplier invite email silently fails (SMTP absent)
- Every marketing CTA that routes buyers to the inquiry form creates misleading-claim exposure
- The access-request relocation (CU-05) cannot proceed — any new form that collects data needs legal pages
- The notification loop (CU-04) cannot be promoted as live — SMTP not configured
- Demo data cannot be safely amplified on marketing without legal pages protecting the site

The legal/SMTP family is the dependency root of the entire implementation tree. Resolving it
unlocks Tier 1 items in cascade. It is also small enough to complete without cross-cutting risk:
CU-02 requires no source code change at all, and CU-01 is new static pages (no modification of
existing functionality).

**Family 1 rationale vs. alternatives:**

| Alternative family | Why not first |
|---|---|
| Family 2: Request-access relocation | Depends on CU-01 (legal) and CU-02 (SMTP for confirmation); cannot safely proceed first |
| Family 3: Inquiry copy safety fix | CU-03 is valuable and fast, but does not unblock data collection; optimal as Family 1b in parallel or immediately after |
| Family 4: Notification/SMTP loop | CU-04 depends on CU-02 (SMTP) and is more complex than the legal/SMTP decision + infra; cannot safely amplify until legal pages exist anyway |

---

## 10. Recommended First-Family Packet Slicing

Family 1 is sliced into 5 bounded implementation packets.

### Packet F1-P1: SMTP Provider Decision + Vercel Configuration

| Dimension | Value |
|---|---|
| Objective | Select an SMTP/transactional email provider; configure Vercel production env vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_PORT`) |
| Repo | Infra / Vercel ops (no source changes needed; env-var only) |
| Likely file surface | Vercel dashboard environment variable settings; `.env.local` (local dev only; never committed) |
| Dependency | None — can start immediately |
| Verification requirement | Resend/trigger a test email via a known flow (e.g., password reset or invite) and confirm `EMAIL_SENT` in server logs, not `SKIPPED_SMTP_UNCONFIGURED` |
| Production verification required | Yes — must be confirmed in Vercel production environment |
| Notes | Paresh must select provider (Resend, Postmark, SendGrid, SES, or equivalent). This is a policy/ops action. Once SMTP_FROM is set, all existing email wrappers (`sendPasswordResetEmail`, `sendEmailVerificationEmail`, `sendInviteMemberEmail`) will begin delivering. |

### Packet F1-P2: Privacy Policy Content Decision + texqtic.com /privacy Page

| Dimension | Value |
|---|---|
| Objective | Draft and publish Privacy Policy content on `texqtic.com/privacy` covering: data collected (name, email, company, sourcing intent via inquiry form); lawful basis (legitimate interest / consent); data retention; GDPR/DPDP data-subject rights (access, deletion, correction); DSAR contact path; third-party processors (Supabase, SMTP provider, analytics if any) |
| Repo | Marketing repo (texqtic.com) — new page |
| Likely file surface | Marketing repo privacy page component + routing config |
| Dependency | Paresh legal content decision (can use a simple operator-drafted privacy policy initially; does not require external counsel for soft-launch scale); F1-P1 (know your SMTP provider = know your third-party processors) |
| Verification requirement | URL `texqtic.com/privacy` resolves and renders correct content; page is indexed by crawlers (robots.txt allows) |
| Production verification required | Yes |
| Notes | For soft launch at limited invite-only scale, a clear and honest operator-drafted privacy policy (not a legal-counsel-reviewed document) is sufficient. The key is truthfulness and accessibility. This is not a sophisticated legal document — it describes what the platform actually does with data. |

### Packet F1-P3: Terms of Service Content Decision + texqtic.com /terms Page

| Dimension | Value |
|---|---|
| Objective | Draft and publish Terms of Service on `texqtic.com/terms` covering: who may use the platform; buyer inquiry terms (platform is not a marketplace; no payment or binding commitment on the platform); supplier listing terms; data use consent; disclaimer language; governing law (India / DPDP) |
| Repo | Marketing repo (texqtic.com) — new page |
| Likely file surface | Marketing repo terms page component + routing config |
| Dependency | F1-P2 (privacy policy first — terms reference it); Paresh legal content decision |
| Verification requirement | URL `texqtic.com/terms` resolves; page is linked from `texqtic.com/privacy` and from inquiry form / auth sign-up |
| Production verification required | Yes |
| Notes | Platform terms should be clear that no payments or binding commitments are made on `app.texqtic.com` (consistent with existing inquiry footer disclosure). For a B2B discovery + inquiry platform, this is a relatively simple terms document. |

### Packet F1-P4: App-Side Legal Route Resolution + Inquiry Form + Auth Sign-Up Linkage

| Dimension | Value |
|---|---|
| Objective | (a) Decide whether `app.texqtic.com/privacy` and `/terms` redirect to `texqtic.com` equivalents or host content directly. (b) Implement: `/privacy` and `/terms` routes on `app.texqtic.com` (either redirect or new pages). (c) Add privacy/terms footer links to `PublicNavbar.tsx`. (d) Add privacy disclosure + terms link to `PublicInquiryPage.tsx` footer section (currently missing). (e) Add terms-acceptance link to `AuthFlows.tsx` sign-up form. |
| Repo | App repo (app.texqtic.com) |
| Likely file surface | `App.tsx` (new appState cases `PUBLIC_PRIVACY`, `PUBLIC_TERMS`); `components/Public/PublicNavbar.tsx` (footer legal nav); `components/Public/PublicInquiryPage.tsx` (footer linkage); `components/Auth/AuthFlows.tsx` (sign-up legal link) |
| Dependency | F1-P2 (privacy page must exist before it can be linked); F1-P3 (terms must exist before it can be linked); Paresh redirect-vs-host decision |
| Verification requirement | `app.texqtic.com/privacy` resolves (either renders or redirects); privacy link present in public navbar; terms link present in inquiry form footer; terms link present on auth sign-up page |
| Production verification required | Yes — verify `GET app.texqtic.com/privacy` returns 200 or 3xx redirect to live `texqtic.com/privacy` |
| Notes | The redirect approach is simpler — one canonical legal page on `texqtic.com` redirected from `app.texqtic.com`. The host-directly approach has no SEO advantage for app-subdomain legal pages. Redirect is recommended. |

### Packet F1-P5: Inquiry Copy Truthfulness Fix (INQ-COPY-02 + INQ-COPY-24)

| Dimension | Value |
|---|---|
| Objective | Fix two misleading copy strings in `PublicInquiryPage.tsx`: (a) INQ-COPY-02: Replace "Your interest will be forwarded to the supplier for context" with a truthful equivalent such as "Your interest will be recorded. Our team will follow up with you or the supplier." (b) INQ-COPY-24: Soften SuccessPanel "We'll help you track responses" to avoid implying an automated tracking system that does not exist. |
| Repo | App repo (app.texqtic.com) |
| Likely file surface | `components/Public/PublicInquiryPage.tsx` — two targeted string replacements |
| Dependency | None — can proceed immediately; does not require legal pages to be live first (fixing misleading copy is independently safe) |
| Verification requirement | Both strings updated; no `@ts-ignore` introduced; `pnpm --filter web typecheck` passes; visual confirm in dev server that updated copy renders correctly |
| Production verification required | Optional — copy change is low-risk; dev confirmation sufficient before commit |
| Notes | This is the smallest change with the highest trust protection. The copy fix is independent of SMTP, legal pages, or any backend change. It can technically be the very first implementation commit of the family. The only reason it is listed last in the family is that the legal pages are the harder gate — but both can be worked on in parallel. |

---

## 11. Cross-Repo Dependency Map

```
                      ┌─────────────────────────────────────────────────────────────┐
                      │  CU-01: Legal pages (texqtic.com + app.texqtic.com routing)  │ ← P0 ROOT
                      │  CU-02: SMTP + Vercel env vars                               │ ← P0 ROOT (parallel)
                      └──────────────────────┬──────────────────────────────────────┘
                                             │ (both must be resolved)
                     ┌───────────────────────┼──────────────────────────────────────┐
                     │                       │                                      │
              ┌──────▼──────┐       ┌────────▼────────┐                  ┌──────────▼──────────┐
              │  CU-03:     │       │  CU-05:          │                  │  CU-04:              │
              │  INQ-COPY   │       │  Request Access  │                  │  FTR-B2C-004        │
              │  quick fix  │       │  relocation      │                  │  notification loop   │
              └──────┬──────┘       └────────┬─────────┘                  └──────────┬──────────┘
                     │                       │                                        │
                     └───────────────────────┴──────────────────────────────────────-┤
                                             │ (all three complete)                  │
                                    ┌────────▼────────────────┐                     │
                                    │  CU-07: Demo labels     │                     │
                                    │  (6 live-data surfaces)  │                     │
                                    └────────┬────────────────┘                     │
                                             │                                       │
                          ┌──────────────────┴──────────────────────┐               │
                          │                                          │               │
                  ┌───────▼──────────┐                    ┌─────────▼─────────┐     │
                  │  CU-08: App proof │                    │  CU-06: B2B       │     │
                  │  links verified   │                    │  Discovery URL    │     │
                  └───────┬──────────┘                    └─────────┬─────────┘     │
                          │                                          │               │
                          └──────────────────┬──────────────────────┘               │
                                             │                                       │
                                    ┌────────▼────────────────┐                     │
                                    │  CU-09: Marketing CTA   │◄────────────────────┘
                                    │  rewrite (permission    │
                                    │  table applied)         │
                                    └────────┬────────────────┘
                                             │
                                    ┌────────▼──────────────────────────────────────┐
                                    │  CU-10: Marketing minimum viable page set     │
                                    │  (contact, founder/vision, trust cluster)     │
                                    └────────┬──────────────────────────────────────┘
                                             │
                               ┌─────────────┴───────────────────────┐
                               │                                      │
                    ┌──────────▼──────────┐                ┌─────────▼──────────┐
                    │  CU-11: Marketing   │                │  CU-12: B2B data   │
                    │  full page set      │                │  provisioning      │
                    └──────────┬──────────┘                └─────────┬──────────┘
                               │                                      │
                               └─────────────┬───────────────────────┘
                                             │
                                    ┌────────▼──────────────────────────────────────┐
                                    │  CU-13: B2C product data + CU-14: Location   │
                                    │  hub SEO (future phased)                      │
                                    └──────────────────────────────────────────────-┘
```

**Cross-repo dependency summary:**

| Decision in one repo | Required before | Other repo affected |
|---|---|---|
| Legal pages on `texqtic.com` (CU-01) | App legal route implementation (F1-P4) | `app.texqtic.com` routes, components |
| SMTP provider selected (CU-02) | Notification loop code (CU-04); invite email live | Vercel ops (no repo) |
| INQ-COPY fix (CU-03) | Marketing inquiry CTA activation | Marketing CTA/copy rewrite (CU-09) |
| App-side demo labels (CU-07) | Marketing proof-link activation; data provisioning (CU-08, CU-12, CU-13) | Marketing CTA permission table |
| Request Access relocation (CU-05) | Marketing `/request-access` can be removed or redirected | Marketing routing; `texqtic.com/request-access` page |
| B2B Discovery URL (CU-06) | Marketing "Browse Suppliers" CTA can activate | Marketing CTA/copy rewrite (CU-09) |
| Marketing minimum page set (CU-10) | Full marketing activation; investor/buyer credibility | App-derived content reuse |

---

## 12. Final Decision Summary

### What must happen before ANY scaled public activation

1. **PRIT-034 legal pages** — zero tolerance. No public inquiry form, no sign-up, no new access form may be presented to anonymous users at scale without `/privacy` and `/terms` reachable and linked at point of data collection.
2. **HD-001-SMTP-INFRA-GAP-001** — all email silently fails. Supplier invite, auth reset, and future notification all need SMTP. This is a Paresh ops decision, not a code task.
3. **INQ-COPY-02** — "forwarded to supplier" is factually false. The current copy creates a misleading impression in every buyer who submits an inquiry today. Fix this before any buyer is intentionally directed to the inquiry form.

### What order makes operational sense

| Phase | Focus | Gate condition |
|---|---|---|
| Phase 0 | SMTP provider decision (CU-02) + INQ-COPY fix start (CU-03) | Immediately; no dependencies |
| Phase 1 | Legal pages content + texqtic.com implementation (CU-01) | Paresh legal content decision |
| Phase 1b | App-side legal routing + inquiry/auth linkage (F1-P4) | Follows legal pages live on texqtic.com |
| Phase 2 | Demo labels (CU-07) + Request Access relocation (CU-05) + notification loop implementation (CU-04) | SMTP live; legal pages live |
| Phase 3 | Marketing minimum page set (CU-10) + CTA rewrite (CU-09) + app-proof link verification (CU-08) | Demo labels live; legal pages live; copy fixed |
| Phase 4 | B2B Discovery URL (CU-06) + B2B data provisioning (CU-12) | Demo labels live; URL added; legal pages live |
| Phase 5 | Full marketing page set (CU-11) + B2C data provisioning (CU-13) | Phase 3 stable |
| Phase 6 | Location hub SEO (CU-14) | Phase 5 stable |

### What is explicitly deferred

- Full demo/product data seeding: **after** legal + demo labels
- Location hub SEO: **after** core IA and English credibility baseline
- Multilingual SEO: **future phase only**
- "Browse Suppliers" marketing CTA: **after** B2B Discovery URL + real data
- Public inquiry marketing CTA: **after** legal + copy fix + notification loop partial
- "List Your Business Free" copy: **after** pricing policy decision by Paresh
- Broad product browse promotion: **after** real product data + demo labels + legal

---

## 13. Explicit No-Authorization Statement

**RT4-D authorizes zero implementation.**

This artifact is a planning and synthesis record only.

It does not authorize, design in detail, or implement:

- Any legal page, privacy policy, or terms of service
- Any SMTP configuration or Vercel env var change
- Any source file modification in `app.texqtic.com` or `texqtic.com`
- Any inquiry copy change
- Any notification loop
- Any request-access form
- Any demo labeling
- Any routing change
- Any CTA or marketing copy change
- Any data provisioning
- Any schema or migration change
- Any test change
- Any TLRH index update

**Implementation begins only after Paresh explicitly approves the priority order above and
issues the first implementation prompt with an explicit allowlist.**

The recommended first implementation prompt covers Family 1 as a whole or as individual
packets (F1-P1 through F1-P5), at Paresh's discretion.

---

*TexQtic governance corpus — soft-launch readiness series RT4-D. Authored by Paresh Patel.*
*This synthesis closes the RT4 investigation series. Implementation series begins on Paresh's authorization.*
