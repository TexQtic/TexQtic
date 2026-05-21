---
unit_id: SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK
title: RT4-C1 — texqtic.com / app.texqtic.com Production Domain Separation Benchmark
type: DESIGN_PLANNING
status: COMPLETE
date: 2026-05-21
commit_basis: cce53013e7707d370f9419b19467e1b494659fe8
authorized_by: Paresh Patel
---

# RT4-C1 — texqtic.com / app.texqtic.com Production Domain Separation Benchmark

**Unit ID:** `SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK`
**Unit type:** Design-planning artifact — no source implementation
**Mode:** Safe-Write Mode / TECS Repo-Truth-Informed Design Planning / Report Only
**Date created:** 2026-05-21
**Author:** Copilot (TexQtic governance agent)
**Authorized by:** Paresh Patel

**Git HEAD at creation:** `cce53013e7707d370f9419b19467e1b494659fe8`
**Worktree state:** CLEAN — zero staged, zero modified, zero untracked

**This artifact is part of the TexQtic Launch Readiness Hub repo-truth audit record.**

---

## §1 Header and Authority Boundary

### Purpose

This artifact establishes the authoritative production-role separation between:

1. **`texqtic.com`** — production marketing, credibility, SEO, conversion, company/founder/trust/vision,
   resources, legal, and education website.
2. **`app.texqtic.com`** — application and public-safe platform surface; displays B2B, B2C, and D2C
   public surfaces so unregistered users can experience the TexQtic platform/OS; also the entry door
   for registered users.

It records the correct framing for this decision:

> The correct question is not "What should texqtic.com become for soft launch?"
> The correct question is:
> **"What is texqtic.com for the production launch, and what minimum truthful version of that
> production-facing website must exist before soft launch?"**

This artifact benchmarks the role separation against common SaaS and marketplace practice and
produces a non-overlap ruleset binding on all future content and routing decisions for both domains.

### Authority boundary

This unit is a **design-planning and classification record only**. It does not authorize, design
detailed page layouts, implement routing, or commission copy.

**This unit may not:**
- Modify any source file
- Implement any route, page, component, or URL redirect
- Modify any test file
- Modify any schema, migration, or RLS policy
- Modify any `.env` or config file
- Mutate production data
- Run SQL, Prisma commands, or scripts
- Update TLRH indexes
- Update launch-readiness hub docs
- Update governance source registers
- Modify Layer 0 docs
- Stage files other than this artifact

---

## §2 TLRH Storage Note

This artifact is stored under `governance/units/` per the storage rule established in
`TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md §6`. It is part of the RT4 sub-series
within the TexQtic Launch Readiness Hub repo-truth audit record.

This unit does not update TLRH indexes, Layer 0 docs, launch-readiness hub docs, or source
registers. Cross-reference is maintained through the artifact itself and the Git commit introduced
by RT4-C1.

---

## §3 Git / Worktree Truth

```
git status --short      → (empty — clean worktree)
git rev-parse HEAD      → cce53013e7707d370f9419b19467e1b494659fe8
```

| Attribute | Value |
|---|---|
| HEAD commit | `cce53013e7707d370f9419b19467e1b494659fe8` |
| Commit message | `[TEXQTIC] docs: audit notification loop readiness from repo truth` (RT4-B) |
| Worktree state at creation | CLEAN — zero staged, zero modified, zero untracked |
| Branch | `main` |

All design decisions in this artifact are informed by the HEAD state above.

---

## §4 Inputs Reviewed

### Prior RT series artifacts (read-only)

| Artifact | Key content used |
|---|---|
| `SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md` | B2B/B2C surface posture: `IMPLEMENTED_DATA_EMPTY`; `/aggregator` confirmed as static marketing stub (not a discovery surface); `/supplier/:slug` strongest public surface; FTR-B2C-004 P1 blocker (no SMTP notification) |
| `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` | RT3-BLKR-001 (PRIT-034 P0 legal pages); inquiry-copy truthfulness gap; public surfaces confirmed present in `app.texqtic.com` |
| `SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT.md` | Legal pages (`/privacy`, `/terms`) confirmed `NOT_STARTED` at any layer; PRIT-034 P0 blocker; routes belong under a credibility surface — domain assignment is a design decision |
| `SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md` | `FRONTEND_URL` confirmed as `https://app.texqtic.com`; notification loop `NOT_STARTED`; email infrastructure present but unconfigured |
| `TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md` | RT series storage convention confirmed; artifact naming standard; RT4-C1 is the correct next-packet designation |

### Domain-separation governance docs (read-only)

| Artifact | Key content used |
|---|---|
| `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md` | **Option F locked**: `texqtic.com` = marketing domain; `app.texqtic.com` = platform app domain; canonical platform URL is `https://app.texqtic.com`; no apex redirect; D-005 CLOSED |
| `governance/units/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001.md` | Repo-truth inspection confirming Option F lock; all public canonical tags point to `app.texqtic.com`; FTR-SEO-001 STRATEGY_DEFINED; FTR-SEO-007 STRATEGY_RESOLVED |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-SEO-001, FTR-SEO-007) | Option F confirmed; `app.texqtic.com` canonical; no redirect policy change needed |
| `governance/analysis/TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002-POST-024-025-READINESS.md` | Production URL confirmed `https://app.texqtic.com`; DPP/passport/JSON-LD all on `app.texqtic.com`; vocab namespace at `https://texqtic.com/dpp/v1#` |
| `governance/launch-readiness/BS-005-JSONLD-RICH-RESULTS-VALIDATION.md` | All public page canonical URLs on `https://app.texqtic.com`; `isPartOf.url = https://app.texqtic.com` consistent |
| `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | "Marketing site" referenced as a distinct origin entity for CRM intake; marketing proxy as a separate concern from platform app |

### Absence findings

The following were searched for and **not found** in `docs/`, `governance/`:

| Search target | Finding |
|---|---|
| Explicit `texqtic.com` page inventory or content plan | ABSENT — no artifact defining what pages `texqtic.com` should have |
| Marketing site IA / sitemap document | ABSENT |
| `app.texqtic.com` vs `texqtic.com` copy-boundary rules | ABSENT — this artifact is the first explicit record |
| Domain separation non-overlap rules in source form | ABSENT — not yet formalized anywhere in governance |
| Onboarding pathway between the two domains | ABSENT as a designed flow; implied only by Option F framing |

**These absences are expected and correct.** RT4-C1 is the first artifact to formally define these
rules. This does not represent a governance gap requiring a blocker — it is the purpose of this
unit.

---

## §5 Domain-Role Decision

### Decision statement

This is a **production launch role decision**, not a soft-launch workaround.

The two domains serve permanently distinct roles. The roles are not feature-flags or phases — they
are constitutional domain assignments.

| Domain | Role |
|---|---|
| `texqtic.com` | Production marketing website — credibility, education, SEO, conversion, company narrative, legal |
| `app.texqtic.com` | Platform application and public-safe app surface — marketplace, registered-user workflows, auth, B2B/B2C/D2C public surfaces |

### Soft-launch implication

For soft launch, the question is not whether `texqtic.com` should exist — it should and must.
The question is: **what is the minimum truthful version of `texqtic.com` that must exist before
scaled soft launch begins?**

The answer to that question is out of scope for RT4-C1. It belongs to RT4-C2
(current marketing assets and retained-pages audit) and a subsequent implementation unit.

RT4-C1 defines the role boundary. RT4-C2 will audit what is already there.

---

## §6 Industry-Practice Benchmark Summary

### 6.1 Shopify-style marketing vs. app/admin separation

Shopify separates:
- `shopify.com` — marketing, pricing, features, case studies, blog, trust, legal
- `{store}.myshopify.com` — merchant storefronts (tenant surfaces)
- `accounts.shopify.com` / `admin.shopify.com` — auth entry and merchant dashboard

**Implication for TexQtic:** The analogy is direct. `texqtic.com` = `shopify.com`. `app.texqtic.com` =
the combination of platform app, public product/discovery surfaces, and the authenticated admin
surface. The marketing website never hosts live app functionality.

### 6.2 B2B SaaS marketing domain vs. app subdomain

Standard B2B SaaS practice:
- `company.com` — landing pages, pricing, blog, documentation, trust, compliance, legal, API docs
- `app.company.com` — authenticated application; sometimes also the public signup/login entry
- `docs.company.com` — sometimes separated; sometimes under `company.com/docs`

Examples: Notion (`notion.so` + `www.notion.so`), Linear (`linear.app` = combined marketing + app
entry), HubSpot (`hubspot.com` marketing + `app.hubspot.com` registered user workflows).

**Implication for TexQtic:** The practice of a separate marketing domain is near-universal at the
B2B SaaS tier TexQtic targets. The credibility of the marketing website is independent of the
application's current completion status. A sparse but truthful `texqtic.com` is better than a
missing one at the point of targeted buyer outreach.

### 6.3 Marketplace SEO/explainer pages vs. listing/detail/product surfaces

Common marketplace practice:
- Marketing domain owns: category explainer pages (e.g., "sustainable textiles in India"),
  region/niche education pages, value-chain concept pages (e.g., "what is DPP?"), trust/compliance
  concept articles, founder/origin story.
- App domain owns: the live product listings, supplier profiles, collection browsing, inquiry
  submission, real DPP/passport records, auth.

**Implication for TexQtic:** The industry/value-chain/hub pages that explain what TexQtic
aggregates belong on `texqtic.com`. The live supplier profiles, product detail, DPP records, and
collections that demonstrate it belong on `app.texqtic.com`.

### 6.4 Benchmark verdict

TexQtic's Option F lock is consistent with industry-standard practice. The risk of deviating
from it — placing marketing/explainer content in `app.texqtic.com` — is:
1. SEO dilution: mixing editorial content with app surfaces confuses crawler content classification
2. Trust dilution: the app surface loses clarity as a focused platform entry
3. User journey confusion: onboarding should move from marketing education to app action,
   not loop inside the app

The non-overlap rules in §9 codify this directly.

---

## §7 texqtic.com Role Table

`texqtic.com` is the **production marketing and credibility website**.

Its content responsibility:

| Category | Examples | Priority |
|---|---|---|
| **Marketing / explainer pages** | "What is TexQtic?", "How it works", "For buyers", "For suppliers", feature overview | Must exist before scale |
| **Company / founder / vision** | About us, founder story, mission, origin, team | Must exist before scale |
| **Trust / credibility narrative** | Compliance approach, data privacy stance, platform integrity, partner logos | Must exist before scale |
| **Legal pages** | Privacy Policy, Terms of Service, Cookie stance, DSAR path | PRIT-034 P0 — required before public data collection |
| **Resources / education** | Blog, case studies, white papers, guides, FAQ | P2 — valuable but not scale-blockers individually |
| **Industry / value-chain / hub pages** | "Sustainable textiles", "Indian handloom supply chain", "What is DPP?", category context pages, regional origin explainers | P2 for soft launch; high SEO value post-launch |
| **SEO pages** | Location pages, niche/vertical pages, search-intent landing pages | P2; build iteratively after scale |
| **Conversion CTAs** | "Request access", "Apply as a supplier", "Get early access", "Book a demo" | Must exist — links into `app.texqtic.com` signup/onboarding |
| **Onboarding education** | "How onboarding works", "What to expect as a supplier", buyer journey explainer | P1 — precedes signup entry in `app.texqtic.com` |
| **White paper / credibility docs** | Downloadable trust, compliance, or supply-chain reports (if available) | P2 |

**What `texqtic.com` must be at minimum for soft launch:**

1. A page that truthfully describes what TexQtic is and who it is for.
2. A page or section that establishes founder / company credibility.
3. Legal pages (`/privacy`, `/terms`) — PRIT-034 P0.
4. At least one conversion CTA that directs to `app.texqtic.com` for signup or inquiry.
5. No false claims about platform capabilities that are not yet live in `app.texqtic.com` (repo truth governs).

The full marketing website build-out is a post-soft-launch activity — but the minimum above
must exist before scaled buyer outreach and public data collection begins.

---

## §8 app.texqtic.com Role Table

`app.texqtic.com` is the **platform application and public-safe app surface**.

Its content responsibility:

| Category | Examples | Priority |
|---|---|---|
| **Application shell** | SPA entry, routing, layout, auth context, global nav | Exists — PRODUCTION_VERIFIED |
| **Public-safe B2C product browse** | `/products`, `/products/category/:slug` | `IMPLEMENTED_DATA_EMPTY` — live but no data |
| **Public-safe collections** | `/collections`, `/collections/:slug` | `IMPLEMENTED_TEST_COVERED` |
| **B2B supplier profiles** | `/supplier/:slug` | `IMPLEMENTED_TEST_COVERED` — strongest public surface |
| **B2B discovery directory** | `B2BDiscoveryPage` (`PUBLIC_B2B_DISCOVERY`) | `IMPLEMENTED_DATA_EMPTY` |
| **DPP / Product Passport records** | `/passport/:id`, `/dpp/v1/context.jsonld`, structured-data route | PRODUCTION_VERIFIED |
| **Inquiry surfaces** | `/inquiry`, inline inquiry forms on supplier/product/collection pages | `IMPLEMENTED_TEST_COVERED` — notification loop blocked (FTR-B2C-004) |
| **Auth entry** | Sign-in, sign-up, magic link, password reset | PRODUCTION_VERIFIED (HD-001 SMTP gap separate) |
| **Onboarding action entry** | Supplier onboarding flow, workspace setup, first-login experience | `IMPLEMENTED` per HD-001 series |
| **Registered-user workflows** | Tenant dashboard, catalog management, RFQ, DPP editing, collection curation | Implemented (various gates) |
| **White-label storefronts** | `<slug>.texqtic.com` tenant surfaces (future), WL sub-paths (current) | WL implementation complete; slug routing deferred |
| **Legal page routes (technical)** | `/privacy`, `/terms` — routes must exist here even if linked from `texqtic.com` | `NOT_STARTED` — PRIT-034 P0 blocker |

**Scope note on legal pages:** Although the legal content and credibility narrative belong on
`texqtic.com`, the `/privacy` and `/terms` routes must also resolve on `app.texqtic.com` (or
redirect to `texqtic.com` equivalents). Any public data collection form in the app (inquiry,
signup, onboarding) must be able to link to reachable legal pages from within the app domain.
The implementation path (host on `app.texqtic.com` directly, or redirect to `texqtic.com`) is
a decision for the legal pages implementation unit — not decided here.

---

## §9 Non-Overlap Rules

These rules are binding on all future content, routing, and copy decisions for both domains.
They supplement the Option F lock.

### Rule N-01: Marketing/explainer content belongs on texqtic.com — not app.texqtic.com

Broad marketing pages (feature explainers, "how it works", company narrative, value-chain education,
industry hub pages, pricing pages) must not be built into `app.texqtic.com`. Adding them there
dilutes the app surface and contradicts the Option F domain separation decision.

### Rule N-02: app.texqtic.com public pages may be linked from texqtic.com as product proof

`texqtic.com` pages may contain CTAs and deep links into `app.texqtic.com` public surfaces
(e.g., "Browse suppliers →", "See a live DPP →", "Explore collections →"). This is the intended
cross-domain referral pattern. It is not a violation of separation — it is the conversion bridge.

### Rule N-03: app pages must not overclaim marketing promises

Content within `app.texqtic.com` (UI copy, surface descriptions, inquiry form text) must not
claim platform capabilities that are blocked by current repo truth. Specifically:
- Inquiry copy must not state "forwarded to supplier" when no notification exists (INQ-COPY-02 gap).
- Public surfaces must not present demo or QA data as live supplier engagement without demo labeling.
- No surface should imply live RFQ, payment, or transaction capabilities unless explicitly
  implemented and verified.

### Rule N-04: Marketing pages must not imply app capabilities that are blocked by repo truth

`texqtic.com` copy must be written to the current state of `app.texqtic.com`, not to a future
vision. Claims about live supplier directories, real-time inquiry routing, DPP capabilities, etc.
must be truthful relative to what `app.texqtic.com` can actually deliver at the time of publication.
This rule is enforced by repo-truth audits (RT series) before any marketing copy approval.

### Rule N-05: Onboarding must move from texqtic.com education into app.texqtic.com action

The onboarding journey is directional:
1. User arrives at `texqtic.com` (marketing, education, company story)
2. User is converted via CTA → enters `app.texqtic.com` (sign-up / early access)
3. User completes onboarding inside `app.texqtic.com` (supplier or buyer workflow)

The reverse — starting onboarding inside `app.texqtic.com` with inline marketing explainers that
repeat what `texqtic.com` should contain — is a UX and SEO anti-pattern.

### Rule N-06: No parallel marketing site inside app

`app.texqtic.com` must not be expanded to include a `/about`, `/features`, `/pricing`, `/why-us`,
or similar marketing-site section. The `/trust` route currently in `app.texqtic.com` is a P2
stub and should ultimately redirect or link to the equivalent `texqtic.com/trust` or
`texqtic.com/about` page — not grow into an in-app marketing surface.

### Rule N-07: Legal pages on app.texqtic.com must link to or be consistent with texqtic.com legal

If legal page content is hosted on `texqtic.com`, the `/privacy` and `/terms` routes in
`app.texqtic.com` should redirect to the canonical `texqtic.com` equivalents, or maintain
identical content. Divergent legal text between the two domains is a compliance risk.

---

## §10 Onboarding Implication

The domain separation has a direct onboarding design implication that must inform future
onboarding flow design and marketing content planning:

| Phase | Domain | Expected experience |
|---|---|---|
| **Discovery** | `texqtic.com` | User finds TexQtic via SEO, referral, or direct. Reads about platform, value chain, DPP concept, founder story. |
| **Interest / credibility** | `texqtic.com` | User reads trust, compliance, legal pages. Evaluates if TexQtic is legitimate and relevant. |
| **Conversion** | `texqtic.com` → `app.texqtic.com` | CTA (early access, supplier application, buyer inquiry) redirects into `app.texqtic.com` sign-up or inquiry form. |
| **Pre-auth exploration** | `app.texqtic.com` | Unregistered user may browse public surfaces (products, collections, supplier profiles, DPP records) to see the platform in action before registering. |
| **Registration / onboarding** | `app.texqtic.com` | User registers. Onboarding flow begins. Supplier provisioning or buyer workspace entry. |
| **Active use** | `app.texqtic.com` | Registered user operates within tenant dashboard, catalog, inquiry, DPP workflows. |

**Key rule:** The pre-auth exploration phase on `app.texqtic.com` is a **product proof surface**,
not a marketing surface. It demonstrates real platform capability (browsable products, real DPP
records, inquiry forms) — but does not replace the education and credibility work that belongs on
`texqtic.com`.

**Current state:** The `texqtic.com` marketing website (discovery/credibility/conversion phases)
is unaudited by the RT series. RT4-C2 will audit what currently exists there and what minimum
state is needed before soft-launch outreach begins.

---

## §11 Recommended Next Packet

### RT4-C2 — Current marketing assets and retained-pages audit

**Scope:**
- Audit what currently exists at `texqtic.com` (live pages, routes, copy, links, CTAs)
- Identify which pages or sections are truthful and retained vs. misleading or placeholder
- Map current marketing pages against the role table defined in §7 of this artifact
- Identify minimum production-launch website gaps: what is missing that must exist before scaled
  soft-launch outreach begins
- Record what is present, what is absent, and what is misleading
- Do not implement, do not design page layouts, do not commission copy

**Dependency:** RT4-C2 depends on RT4-C1 (this artifact) for the role boundary definitions it
uses to classify retained vs. out-of-scope pages.

**Framing:** RT4-C2 is not "design the texqtic.com homepage." It is "audit what exists at
texqtic.com against the production-role definition established in RT4-C1."

**Expected outcome:** A classification table of existing marketing pages with truthfulness and
retention status, plus an itemized list of minimum-viable marketing pages required before soft
launch. Implementation of those pages is out of scope for the RT series and requires separate
authorization.

---

## §12 Explicit No-Authorization Statement

This artifact is a bounded design-planning and classification record only.

- **No code changes were made.** No source file, test file, schema file, migration file, env file,
  config file, or data file was modified.
- **No governance index was updated.** NEXT-ACTION, OPEN-SET, launch-readiness docs, TLRH hub
  indexes, and source registers are unchanged.
- **No SQL was run.** No database queries, no Prisma commands, no RLS changes.
- **No scripts were executed.** No build, no migration, no seeding, no server start.
- **No marketing pages were designed or implemented.** This artifact contains role definitions
  and rules only — not page layouts, copy, wireframes, or routing changes.
- **No routing changes were proposed.** The legal page routing decision (host vs. redirect) is
  deferred to the legal pages implementation unit.

Files read (read-only) for this artifact:
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md`
- `governance/units/TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md`
- `governance/units/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001.md`
- `governance/launch-readiness/PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-SEO-001, FTR-SEO-007 entries)
- `governance/analysis/TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002-POST-024-025-READINESS.md`
- `governance/launch-readiness/BS-005-JSONLD-RICH-RESULTS-VALIDATION.md`
- `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md` (searched for domain references)
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DISCOVERY.md` (searched for domain references)
- `git status --short` — worktree state
- `git rev-parse HEAD` — HEAD hash

---

*SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK COMPLETE. Commit follows.*
