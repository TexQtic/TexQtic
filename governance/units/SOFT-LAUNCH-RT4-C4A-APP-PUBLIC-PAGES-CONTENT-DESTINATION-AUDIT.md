# SOFT-LAUNCH-RT4-C4A — App Public Pages Content & Destination Audit

**Unit ID:** `SOFT-LAUNCH-RT4-C4A-APP-PUBLIC-PAGES-CONTENT-DESTINATION-AUDIT`
**Series:** RT4 — Domain Separation & Public Surface Alignment
**Sequence:** C4A (follows RT4-C1 domain separation benchmark)
**Author:** Paresh Patel
**Status:** COMPLETE — GOVERNANCE RECORD

---

## TLRH Storage Note

This document is a governance-only read record. It makes no changes to source code,
database schema, migration state, environment configuration, or deployment targets.
It is stored in `governance/units/` as part of the TexQtic soft-launch readiness
corpus and is referenced by the TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.

---

## 1. Authority Boundary

| Dimension | Value |
|---|---|
| Platform app domain | `https://app.texqtic.com` (canonical) |
| Marketing domain | `https://texqtic.com` |
| Lock reference | `MARKETING-APP-PUBLIC-PAGES-DOMAIN-SEPARATION-DECISION-LOCK-001` |
| Governing benchmark | `SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK.md` (commit `cb6c4b5`) |
| Repo inspected | TexQtic main app repo (this repo, `main` branch) |
| HEAD at audit | `cb6c4b5ee1c90f9fbad41a6a53fb86e06d436abd` |
| Worktree state | CLEAN |

The boundary between `texqtic.com` and `app.texqtic.com` is **locked at Option F**:
`texqtic.com` owns marketing, credibility, and education.
`app.texqtic.com` owns all platform surfaces, public and authenticated.

---

## 2. Git / Worktree Truth

**Command run:** `git status --short ; git rev-parse HEAD`

**Output:**
```
(no untracked or modified files)
cb6c4b5ee1c90f9fbad41a6a53fb86e06d436abd
```

Worktree is clean. Audit is against this exact commit.

---

## 3. Inputs Reviewed

| Input | Source | Status |
|---|---|---|
| App routing | `App.tsx` — `resolveInitialAppState()` + `AppState` type | READ |
| Public component inventory | `components/Public/` directory listing | READ |
| Public route URLs (direct-link capable) | `App.tsx` lines 2019–2115 | READ |
| State-only nav transitions (no URL) | `App.tsx` navbar callbacks + `setAppState` calls | READ |
| `SUPPLIER_REQUEST_ACCESS_URL` constant | `App.tsx` line 2004 | READ |
| PublicNavbar nav sections | `components/Public/PublicNavbar.tsx` | READ |
| PublicTrustLandingStub content | `components/Public/PublicTrustLandingStub.tsx` | READ |
| PublicAggregatorPreview content | `components/Public/PublicAggregatorPreview.tsx` | READ |
| PublicIndustryClusterLanding content | `components/Public/PublicIndustryClusterLanding.tsx` | READ |
| B2BDiscovery categories | `components/Public/B2BDiscovery.tsx` | READ |
| PublicCollectionsStub | `components/Public/PublicCollectionsStub.tsx` | READ |
| PublicReferralLanding | `components/Public/PublicReferralLanding.tsx` | READ |
| RT4-A legal pages audit | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT.md` | READ |
| RT4-B notification loop audit | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md` | READ |
| RT4-C1 domain separation benchmark | `governance/units/SOFT-LAUNCH-RT4-C1-DOMAIN-SEPARATION-BENCHMARK.md` | READ |
| RT3-D demo label synthesis | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` | READ |
| RT2-B4 aggregator synthesis | `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS.md` | READ |
| TLRH inventory | `governance/units/TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md` | READ |
| Marketing repo RT4-C2 / RT4-C3 findings | Prior session context (summarized) | CARRIED |

**Absence findings noted:**
- Legal pages (`/privacy`, `/terms`) — no route exists in `resolveInitialAppState()`. Confirmed NOT_STARTED (PRIT-034).
- `B2BDiscoveryPage` — no URL path in `resolveInitialAppState()`. State-only navigation. Cannot be deep-linked.
- Demo labeling — no demo/preview label present on any live public surface. Confirmed absent (RT3-D finding).
- `PUBLIC_ENTRY` (home `/`) — not matched by any pathname rule; resolved as default when no session.

---

## 4. App Public Surface Inventory

Each surface below is derived from the `AppState` type union and `resolveInitialAppState()`.

| # | App State | Direct-Link URL | Component | Surface Type | Data Source | Readiness | Safe-to-Link |
|---|---|---|---|---|---|---|---|
| 1 | `PUBLIC_ENTRY` | `/` (default) | Inline (App.tsx) | Home / Role selector | Static copy + auth check | `IMPLEMENTED_STABLE` | YES — cautiously |
| 2 | `PUBLIC_B2B_DISCOVERY` | ❌ NO URL — state-only | `B2BDiscovery.tsx` | B2B supplier directory | API: `getPublicB2BSuppliers` | `IMPLEMENTED_DATA_EMPTY` | NO — not deep-linkable |
| 3 | `PUBLIC_B2C_BROWSE` | `/products` or `/products/` | `B2CBrowse.tsx` | B2C product browse | Live data, currently empty | `IMPLEMENTED_DATA_EMPTY` | CONDITIONAL |
| 4 | `PUBLIC_B2C_CATEGORY_STORY` | `/products/category/:slug` | `PublicB2CCategoryPage.tsx` | B2C category editorial | Config-driven (`publicB2CCategoryPages.ts`) | `IMPLEMENTED_DATA_EMPTY` | CONDITIONAL |
| 5 | `PUBLIC_AGGREGATOR` | `/aggregator` | `PublicAggregatorPreview.tsx` | Aggregator explainer stub | Static — no live data | `STATIC_STUB` | YES — labeling required |
| 6 | `PUBLIC_COLLECTIONS` | `/collections` | `PublicCollectionsStub.tsx` | Collections listing | Config-driven projection | `IMPLEMENTED_TEST_COVERED` | YES — safe |
| 7 | `PUBLIC_COLLECTION_DETAIL` | `/collections/:slug` | `PublicCollectionDetail.tsx` | Collection detail page | Config projection + RLS-scoped DB | `IMPLEMENTED_TEST_COVERED` | YES — per approved slug |
| 8 | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `/collections/:slug` (unapproved) | `PublicCollectionUnavailable.tsx` | Collection unavailable guard | Config-driven | `IMPLEMENTED` | N/A — guard only |
| 9 | `PUBLIC_PRODUCT_DETAIL` | `/product/:slug` | `PublicProductDetail.tsx` | B2C product detail + inquiry CTA | Live data, currently empty | `IMPLEMENTED_DATA_EMPTY` | CONDITIONAL |
| 10 | `PUBLIC_PASSPORT` | `/passport/:id` | `PublicPassport.tsx` | DPP / Digital Product Passport | Live DB + JSON-LD | `PRODUCTION_VERIFIED` | YES — per valid ID |
| 11 | `PUBLIC_TRUST_LANDING` | `/trust` | `PublicTrustLandingStub.tsx` | Trust & origin explainer | Static stub copy | `STATIC_STUB` | YES — labeling required |
| 12 | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `/industries` | `PublicIndustryClusterLanding.tsx` | Industry cluster directory | Static/config | `STATIC_STUB` | YES — labeling required |
| 13 | `PUBLIC_SUPPLIER_PROFILE` | `/supplier/:slug` | `PublicSupplierProfile.tsx` | Supplier public profile + inquiry | Live DB | `IMPLEMENTED_TEST_COVERED` | YES — strongest surface |
| 14 | `PUBLIC_REFERRAL_LANDING` | `/join/:referral_code` | `PublicReferralLanding.tsx` | Referral join landing | Referral code validation | `IMPLEMENTED` | CONDITIONAL |
| 15 | `PUBLIC_INQUIRY` | `/inquiry` or `/inquiry/` | `PublicInquiryPage.tsx` | Inquiry intent capture form | DB write + notification | `IMPLEMENTED_TEST_COVERED` | CONDITIONAL — INQ-COPY-02 |
| 16 | `AUTH` | `/` (state) | `AuthForm.tsx` | Sign-in / magic link entry | Supabase Auth | `PRODUCTION_VERIFIED` | YES — via CTA only |
| 17 | `ONBOARDING` | `/?token=&action=invite` | `OnboardingFlow.tsx` | Invite-based onboarding | Invite token + DB | `IMPLEMENTED` | YES — invite-only |

**Readiness classification key:**
- `IMPLEMENTED_STABLE` — Implemented and stable; no known blockers.
- `IMPLEMENTED_TEST_COVERED` — Implemented with test coverage; known conditional blockers noted separately.
- `IMPLEMENTED_DATA_EMPTY` — Implemented; route resolves; no live tenant data to display yet.
- `STATIC_STUB` — Static content only; no live data; functions as an explainer page.
- `PRODUCTION_VERIFIED` — Verified in production environment.
- `IMPLEMENTED` — Implemented; no test coverage noted; conditional state possible.

---

## 5. App Public Content Extraction Table

Content themes extracted per surface, for potential reuse by `texqtic.com` marketing pages.

| Surface | Content Themes Available | Marketing Reuse Class | Notes |
|---|---|---|---|
| `PUBLIC_ENTRY` (home) | "Trusted textile partners", "Showcase your capability", "B2B discovery", "B2C browse", "Supplier listing" | ADAPT_ONLY | Copy is platform-entry framing; marketing version needs educating angle, not portal-entry angle |
| `PUBLIC_TRUST_LANDING` (`/trust`) | "Trust and origin behind every textile journey", "Public-safe trust, origin, traceability, verification", "From supplier capability to product confidence", "How trust works", "What a passport is" | REUSE_DIRECTLY_WITH_EDITING | Strong credibility content; directly usable on `texqtic.com/trust` explainer with minor edits to remove in-app navigation CTAs |
| `PUBLIC_AGGREGATOR` (`/aggregator`) | "Aggregator preview", "AI-driven sourcing network", "Supply-side intelligence", "Ecosystem capability map" | ADAPT_ONLY | Static explainer stub; content available but labeling needed before amplifying |
| `PUBLIC_INDUSTRY_CLUSTER_LANDING` (`/industries`) | Industry cluster taxonomy, textile sector verticals, supply chain positioning | ADAPT_ONLY | Config-driven; content is taxonomic, not narrative — marketing site needs narrative wrapper |
| `PUBLIC_B2B_DISCOVERY` (state-only) | 7 supplier categories: Yarn & Fiber, Fabric Manufacturers, Garment Manufacturers, Designers, Certification & Compliance, Logistics & Trade, Consultants | ADAPT_ONLY | Category taxonomy is reusable for marketing; but page is not deep-linkable — MUST fix URL gap first before amplifying |
| `PUBLIC_SUPPLIER_PROFILE` (`/supplier/:slug`) | Supplier name, capability overview, product range, inquiry CTA, origin signals, certifications | REUSE_DIRECTLY_WITH_EDITING | Strongest public surface; individual profiles can be linked/featured on marketing case studies |
| `PUBLIC_COLLECTIONS` (`/collections`) | "Verified Textile Collections", collection titles, public-safe concept showcases | ADAPT_ONLY | Content describes platform capability, not marketing value proposition — adapt with narrative |
| `PUBLIC_COLLECTION_DETAIL` (`/collections/:slug`) | Collection positioning, material context, ecosystem framing | ADAPT_ONLY | Useful for vertical-specific marketing pages when data is populated |
| `PUBLIC_PASSPORT` (`/passport/:id`) | DPP/product passport context, traceability signals, JSON-LD structured data, verification posture | REUSE_DIRECTLY_WITH_EDITING | Live production data; passport concept is credibility asset for marketing — link to live examples |
| `PUBLIC_INQUIRY` (`/inquiry`) | "Connect with trusted suppliers", inquiry intent, B2B contact flow | DO_NOT_REUSE_OVERCLAIM_RISK | Blocked by INQ-COPY-02 (copy implies notification loop that does not exist — FTR-B2C-004 NOT_STARTED) |
| `PUBLIC_B2C_BROWSE` (`/products`) | Product catalogue, textile browse | DO_NOT_REUSE_OVERCLAIM_RISK | No live data; linking to empty product browse creates poor experience — wait for data |
| `PUBLIC_B2C_CATEGORY_STORY` (`/products/category/:slug`) | Category editorial copy, material stories | DO_NOT_REUSE_OVERCLAIM_RISK | No live data; similar risk as product browse |
| `PUBLIC_REFERRAL_LANDING` (`/join/:code`) | Invitation messaging, referral copy | DO_NOT_REUSE_OVERCLAIM_RISK | Platform-internal use only; not for marketing amplification |

**Content reuse key:**
- `REUSE_DIRECTLY_WITH_EDITING` — Content is production-ready; minor copy edits needed to adapt tone for marketing.
- `ADAPT_ONLY` — Content is thematically useful but requires structural adaptation; do not copy verbatim.
- `DO_NOT_REUSE_OVERCLAIM_RISK` — Surface is blocked, empty, or carries a risk of overclaiming a capability not yet live.
- `NEEDS_SOURCE_FIX_FIRST` — Content reuse is blocked by a source-side issue (data gap, copy error, legal gap).

---

## 6. Request Access / Onboarding Relocation Finding

**Current state (repo-truth):**

The constant `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` is hardcoded in `App.tsx` (line 2004). When a supplier-role visitor on `app.texqtic.com` clicks "Request Access", they are navigated **off the platform app** to the marketing site.

This is a misaligned flow:
- The marketing site owns credibility and education.
- The **access request and onboarding flow** must live on `app.texqtic.com`, not `texqtic.com`.
- A visitor arriving at `app.texqtic.com` who wants access should receive a native app-side entry form, not be bounced to the marketing domain.

**Invite-based onboarding already exists:**
- `ONBOARDING` state → `OnboardingFlow.tsx` handles `/?token=&action=invite` — works for invited suppliers.
- `ONBOARDING_CONTINUATION` state exists for returning to an in-progress onboarding.

**Classification for each known path:**

| Path / Action | Current State | Classification | Required Action |
|---|---|---|---|
| `app.texqtic.com` → Request Access CTA → `texqtic.com/request-access` | BOUNCES OFF APP | APP_ROUTE_EXISTS_BUT_NEEDS_RENAME_OR_COPY | Replace `SUPPLIER_REQUEST_ACCESS_URL` with an app-side access request form or onboarding entry point |
| `/?token=&action=invite` → OnboardingFlow | EXISTS | APP_ROUTE_READY | No change needed; invite flow is already native |
| Supplier interest capture form (pre-invite) | NOT_STARTED | NEW_APP_ROUTE_REQUIRED | A lightweight "Request access" form on `app.texqtic.com` is needed — captures name/email/company and queues for manual admin review |
| `texqtic.com/request-access` marketing page | EXISTS IN MARKETING REPO | SHOULD_BECOME_EXPLAINER_WITH_CTA_TO_APP | Marketing page should explain the process and link to the app-side form, not BE the form |

**Key finding:** The `SUPPLIER_REQUEST_ACCESS_URL` constant represents a domain-authority violation. The access-gathering mechanism must be in-app. The marketing site should explain and route, not collect.

**Classification: APP_ROUTE_EXISTS_BUT_NEEDS_RENAME_OR_COPY** (for the existing invite path)
**Classification: NEW_APP_ROUTE_REQUIRED** (for a pre-invite interest capture form)

---

## 7. Demo / Mock / Profile Preview Location Finding

**Current state (repo-truth):**

No demo, mock, or preview labeling exists on any live-data surface. This was confirmed by RT3-D. The specific absence findings:

| Surface | Demo Label Present | Actual Data Status | Classification |
|---|---|---|---|
| `/supplier/:slug` | ABSENT | Live DB (test/seed data may exist) | DEMO_ROUTE_EXISTS_BUT_UNLABELED |
| `/collections/:slug` | ABSENT | Live config + DB | DEMO_ROUTE_EXISTS_BUT_UNLABELED |
| `/passport/:id` | ABSENT | Live production DB + JSON-LD | DEMO_ROUTE_EXISTS_BUT_UNLABELED |
| `/products` | ABSENT | Live DB — empty | DEMO_ROUTE_NOT_IMPLEMENTED |
| `/product/:slug` | ABSENT | Live DB — empty | DEMO_ROUTE_NOT_IMPLEMENTED |
| `/trust` | ABSENT | Static stub | CAN_USE_SUPPLIER_PROFILE_WITH_LABELING_LATER |
| `/aggregator` | ABSENT | Static stub | CAN_USE_SUPPLIER_PROFILE_WITH_LABELING_LATER |

**Marketing repo RT4-C3 finding carried:**
- `texqtic.com/platform-preview` was recommended as an explainer page that **explains** the demo concept and links to `app.texqtic.com` surfaces — it should NOT contain the demo itself.
- Actual demo or preview must live on `app.texqtic.com`.

**Recommended path for demo/preview:**
1. Short-term: Supplier profile (`/supplier/:slug`) with a known seed-data slug is the strongest demo surface — use it with added demo/preview label copy.
2. Medium-term: A dedicated `/preview` or `/demo` route on `app.texqtic.com` with explicit demo labeling would satisfy RT3-D recommendations.
3. `texqtic.com/platform-preview` → explain what the demo is → CTA → `app.texqtic.com/supplier/:slug` (demo supplier).

**Classification: DEMO_ROUTE_EXISTS_BUT_UNLABELED** (supplier profile, collections, passport)
**Classification: DEMO_ROUTE_NOT_IMPLEMENTED** (products, product detail)

---

## 8. Dynamic App Page Reachability Map

This map shows which public surfaces of `app.texqtic.com` can be reached by URL (deep-linkable from `texqtic.com` marketing CTAs) and which require in-app state navigation.

| Surface | Reachable by Direct URL | In-App Nav Only | Linkable from Marketing | Blocker |
|---|---|---|---|---|
| `/` (home / entry) | ✅ | — | ✅ cautiously | None |
| `/trust` | ✅ | — | ✅ | None |
| `/industries` | ✅ | — | ✅ cautiously | Static stub — label as preview |
| `/aggregator` | ✅ | — | ✅ cautiously | Static stub — label as preview |
| `/products` | ✅ | — | CONDITIONAL | No product data yet |
| `/products/category/:slug` | ✅ | — | CONDITIONAL | No product data yet |
| `/product/:slug` | ✅ | — | CONDITIONAL | No product data yet |
| `/collections` | ✅ | — | ✅ | Safe — config-backed |
| `/collections/:slug` | ✅ (approved slugs only) | — | ✅ per approved slug | Unapproved slugs → unavailable guard |
| `/supplier/:slug` | ✅ | — | ✅ | Strongest public surface |
| `/passport/:id` | ✅ | — | ✅ | Live production — safe |
| `/inquiry` | ✅ | — | CONDITIONAL | INQ-COPY-02 + FTR-B2C-004 + PRIT-034 |
| `/join/:referral_code` | ✅ | — | BLOCKED | Platform-internal use only |
| B2B Discovery | ❌ NO URL | ✅ state-only | ❌ BLOCKED | No dedicated URL — must add `/discover` or `/suppliers` route |
| Auth / Sign In | ❌ NO dedicated URL | ✅ state-only | CONDITIONAL | Should be accessible as CTA from all pages, not deep-linkable alone |

**Critical gap: `PUBLIC_B2B_DISCOVERY` has no dedicated URL.**
- Marketing CTAs cannot deep-link to the B2B supplier discovery surface.
- All other public surfaces with URLs can be deep-linked.
- This is a product-track item: adding `/discover` or `/suppliers` as a URL path is required before the B2B discovery surface can be linked from marketing.

---

## 9. CTA Destination Classification Matrix

CTAs that appear across the app's public surfaces, classified by safe-to-activate status for soft-launch.

| CTA Label / Action | Target | Classification | Blocker / Condition |
|---|---|---|---|
| "Browse Products" → `/products` | `PUBLIC_B2C_BROWSE` | CONDITIONAL | No live product data; experience is empty |
| "Explore B2B Network" → B2B Discovery | `PUBLIC_B2B_DISCOVERY` | BLOCKED | No URL; state-only; no deep-link possible |
| "List Your Business" / "Request Access" → `texqtic.com/request-access` | External marketing site | CONDITIONAL | Domain boundary violation; must be replaced with in-app form |
| "Sign in to Continue" → `AUTH` state | Sign-in form | SAFE_NOW | Auth is production-verified |
| "Explore Collections" → `/collections` | `PUBLIC_COLLECTIONS` | SAFE_NOW | Config-backed; safe |
| "Browse Collection" → `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL` | SAFE_NOW | Per approved slug |
| "View Supplier" → `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | SAFE_NOW | Strongest surface |
| "Submit Inquiry" on supplier profile / `/inquiry` | `PUBLIC_INQUIRY` or DB write | CONDITIONAL | INQ-COPY-02: copy implies notification; FTR-B2C-004 not implemented |
| "Learn How Trust Works" → `/trust` | `PUBLIC_TRUST_LANDING` | SAFE_NOW | Static stub; accurate copy |
| DPP Passport link → `/passport/:id` | `PUBLIC_PASSPORT` | SAFE_NOW | Production-verified |
| "Industry clusters" → `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | SAFE_NOW | Static stub; accurate |
| "Aggregator Preview" → `/aggregator` | `PUBLIC_AGGREGATOR` | SAFE_NOW | Static stub; accurate |
| Referral join → `/join/:code` | `PUBLIC_REFERRAL_LANDING` | FUTURE_ONLY | Platform-internal; not for public marketing |
| Legal (`/privacy`, `/terms`) | Not implemented | BLOCKED | PRIT-034 P0 blocker; legal pages must exist before public data collection |

**CTA classification key:**
- `SAFE_NOW` — CTA can be activated; target is live and not blocked.
- `CONDITIONAL` — CTA is implementable with specific conditions or copy changes.
- `BLOCKED` — CTA must not be surfaced; target is not ready or has unresolved P0/P1 blockers.
- `FUTURE_ONLY` — CTA is planned but not ready for current soft-launch phase.

---

## 10. Marketing Content Reuse Recommendations

Actionable mapping from `app.texqtic.com` public surfaces to target `texqtic.com` marketing pages.

| Source Surface (app) | Content Themes | Target Marketing Page | Reuse Status | Action Required |
|---|---|---|---|---|
| `/trust` — PublicTrustLandingStub | Trust & origin, DPP explainer, verification posture, "How trust works" | `texqtic.com/trust` or `/platform-preview` | REUSE_DIRECTLY_WITH_EDITING | Edit in-app nav CTAs to marketing equivalents; remove "Sign in to Continue" CTA; add marketing CTA to demo |
| `/supplier/:slug` — PublicSupplierProfile | Supplier capability, inquiry CTA, origin signals, certifications | `texqtic.com` homepage case study, `/supply-network` | REUSE_DIRECTLY_WITH_EDITING | Link from marketing; add demo supplier profile; note inquiry blocker separately |
| `/passport/:id` — PublicPassport | DPP context, traceability, structured data | `texqtic.com/trust`, `/texqtic-os` | REUSE_DIRECTLY_WITH_EDITING | Link live passport from marketing as credibility proof; no edits needed to source |
| `/aggregator` — PublicAggregatorPreview | "AI-driven sourcing", aggregator capability, ecosystem map | `texqtic.com/texqtic-os` or `/solutions/aggregator` | ADAPT_ONLY | Copy is preview-level; label clearly as preview capability; do not present as live product |
| `/industries` — PublicIndustryClusterLanding | Industry taxonomy, vertical categories, supply chain map | `texqtic.com/supply-network`, `/why-now` | ADAPT_ONLY | Category taxonomy is useful foundation; marketing needs to add narrative layering |
| B2BDiscovery categories — state-only | 7 category titles + descriptions (Yarn, Fabric, Garment, Designers, Compliance, Logistics, Consultants) | `texqtic.com/supply-network` | ADAPT_ONLY | Category copy is strong; cannot yet link to page (no URL); adapt copy for marketing narrative |
| `/collections` — PublicCollectionsStub | "Verified Textile Collections", collection titles | `texqtic.com` homepage, `/solutions/` | ADAPT_ONLY | Add narrative context; link to `/collections` on app; note no image hosting yet |
| `/inquiry` — PublicInquiryPage | Inquiry capture, B2B contact intent | `texqtic.com` homepage CTA | NEEDS_SOURCE_FIX_FIRST | INQ-COPY-02 must be fixed; FTR-B2C-004 notification loop must be resolved first |
| `/products` — B2CBrowse | Product browse, B2C catalogue | Any marketing page | DO_NOT_REUSE_OVERCLAIM_RISK | No live data; do not link or reference in marketing until data populated |

---

## 11. Design Implications / Drift Table

These are design observations that arise from the surface audit. They are not source changes; they identify drift between the current implementation and the target state needed for soft-launch.

| ID | Observation | Drift Type | Severity | Required Resolution |
|---|---|---|---|---|
| D-01 | `SUPPLIER_REQUEST_ACCESS_URL` sends supplier-role visitors off-platform to `texqtic.com/request-access` | Domain boundary violation | HIGH | Replace with in-app interest capture form on `app.texqtic.com`; marketing page becomes explainer only |
| D-02 | `PUBLIC_B2B_DISCOVERY` has no URL path — state-only navigation | Routing gap | HIGH | Add dedicated route (e.g., `/discover` or `/suppliers`) to enable deep-linking from marketing |
| D-03 | No demo label on any live-data surface (`/supplier/:slug`, `/collections/:slug`, `/passport/:id`) | Demo labeling absent | HIGH | RT3-D finding confirmed; labeling required before amplifying via marketing |
| D-04 | Legal pages (`/privacy`, `/terms`) have no route or component — `resolveInitialAppState()` does not handle these paths | Legal surface absent | P0 BLOCKER | PRIT-034; must resolve before any marketing-driven public data collection |
| D-05 | Inquiry copy ("forwarded to supplier") overstates notification capability (FTR-B2C-004 NOT_STARTED) | Copy overclaim | HIGH | INQ-COPY-02: fix copy to match actual behavior; inquiry CTA on marketing site must be CONDITIONAL |
| D-06 | B2C product browse and product detail resolve correctly but show empty state | Data gap | MEDIUM | Not a code defect; resolved by tenant data population |
| D-07 | `PublicTrustLandingStub` and `PublicAggregatorPreview` contain "Request Access" CTAs that call `openSupplierRequestAccess()` (→ `texqtic.com/request-access`) | CTA routing violation | HIGH | Consistent with D-01; fix together when in-app form is created |
| D-08 | PublicNavbar has `onGoB2B` prop that triggers state-only navigation to `PUBLIC_B2B_DISCOVERY` — no URL update | Navbar routing inconsistency | MEDIUM | When B2B Discovery URL is added (D-02), navbar `onGoB2B` handler must also call `history.replaceState` |
| D-09 | No standalone `/sign-in` URL; auth entry is state-only | Auth URL gap | LOW | Not a blocker for soft-launch; auth is production-verified via invite token flow |
| D-10 | `PUBLIC_REFERRAL_LANDING` (`/join/:code`) is a platform-internal route not suitable for marketing amplification | Scope classification | LOW | Governance note only; not a defect |

---

## 12. Recommended Next Packet: RT4-C4B

**Recommended Unit ID:** `SOFT-LAUNCH-RT4-C4B-MARKETING-CTA-CLAIMS-GUARDRAILS`

**Purpose:**
Having established the app public page inventory, content themes, and CTA classifications in RT4-C4A, the next packet should define the guardrail rules that govern what marketing (`texqtic.com`) is **permitted** to claim and link to at soft-launch.

**Proposed scope for RT4-C4B:**
1. A CTA permission table — every marketing page CTA mapped to its permitted target and the condition required for activation.
2. A claims guardrail — which product capabilities may be stated as live vs. must be described as "in preview" or "coming soon".
3. Resolution path for D-01 (off-platform Request Access) — design the in-app interest form that replaces `texqtic.com/request-access`.
4. Resolution path for D-02 (B2B Discovery URL) — proposed URL pattern and routing change.
5. Pre-launch copy review table — marketing copy that requires amendment before amplification.
6. A readiness gate for marketing soft-launch activation.

RT4-C4B is a governance-only planning artifact and requires no source changes.

---

## 13. No-Authorization Statement

This document:

- Makes **no changes** to any source file, configuration, schema, migration, or environment variable.
- Makes **no claims** about future product roadmap beyond what is evidenced in the current codebase.
- Makes **no approval** of any marketing copy, CTA, or claim — that approval is the domain of RT4-C4B and subsequent guardrail artifacts.
- Is **not an implementation plan** — it is an audit record. Any implementation flowing from this audit requires a separate prompt with explicit allowlist authorization.

Findings in this document reflect the state of the repository at commit `cb6c4b5ee1c90f9fbad41a6a53fb86e06d436abd`.

---

*TexQtic governance corpus — soft-launch readiness series RT4-C4A. Authored by Paresh Patel.*
