# FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001

**Unit:** FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001
**Family:** FAM-11 — Subscription and Commercial Gating
**Mode:** TECS Safe Product Architecture / Repo-Truth Design + Founder-Lens Correction
**Status:** COMPLETE — design-only, no source changes
**Created:** 2026-06-03
**Owner:** Paresh Patel (TexQtic founder)
**Authority boundary:** Design and framing definition only. Does not authorize implementation.
  Does not widen Layer 0. Does not open a TECS unit. Does not modify any source surface.
  Does not add billing infrastructure. Does not implement payment gateway.

---

## 1. Unit Summary

This artifact establishes the commercial framing and pre-MVP tier-awareness design for
TexQtic — correcting the founder-identified gap in FAM-11A's recommendation set.

FAM-11A correctly established the subscription vocabulary, scenario matrix, and entitlement
taxonomy. FAM-11A's final recommendation was a "vocabulary-only" next slice. This artifact
provides the founder-lens correction: commercial psychology for Indian MSME users requires
visible tier ceilings, upgrade intent capture, and "early access" framing at MVP — all
achievable without billing infrastructure, payment gateway integration, or backend plan-gate
enforcement.

This artifact resolves 12 design decisions, defines 8 requirement matrices, and proposes
the revised implementation sequence for FAM-11C through FAM-13A.

---

## 2. Why FAM-11A Needs Founder-Lens Correction

### 2.1 What FAM-11A Got Right

FAM-11A correctly documented:
- Canonical plan vocabulary: `FREE | STARTER | PROFESSIONAL | ENTERPRISE`
- MVP posture: admin-assigned FREE plans only (PRIT-018 confirmed)
- Self-serve payment: POST_MVP (D-011 parked)
- AI budget as the only materially enforced commercial control
- Feature flags as operational gates (per-named-feature, not per plan tier)
- Recommended Option E — Hybrid Pilot Model

### 2.2 The Vocabulary-Only Gap

FAM-11A recommended `FAM-11B-SUBSCRIPTION-CANONICAL-VOCABULARY-ALIGNMENT-SLICE-1-001` as the
next unit — a vocabulary normalization slice with no commercial UI requirements.

That recommendation is technically correct but **commercially insufficient** for the following
founder-identified reasons:

### 2.3 The Indian MSME Commercial Psychology Problem

**Core problem:** If TexQtic launches as an unnamed "free tool" with no visible tier structure,
Indian MSME users will anchor their willingness-to-pay (WTP) at zero.

This is not a general SaaS rule — it is a specific behavioral dynamic documented in Indian SME
product adoption:

1. **Anchoring effect:** The first price signal a user receives anchors all future price
   negotiations. A tool that launches with no visible pricing signal produces a zero anchor
   that is extremely difficult to move later.

2. **Free-tool perception:** Indian SME buyers distinguish between "commercial SaaS" and
   "free tool." Once categorized as a free tool, a product faces a categorization reversal
   problem — users resist reclassification as paid software even when pricing is introduced.

3. **Pilot-duration credibility:** Without visible tier ceilings, pilot users do not perceive
   their free access as conditional or temporary. They perceive it as the permanent product
   experience. When pricing arrives post-MVP, it appears as an arbitrary fee imposition, not
   a natural graduation from a clearly communicated limited-access tier.

4. **B2B budget cycle dynamics:** Indian MSMEs allocate software spend in budget cycles.
   A product with no visible commercial framing is not submitted for budget approval. A
   product with a clear STARTER/PROFESSIONAL tier and a visible upgrade path IS submitted —
   even before actual checkout exists.

5. **Commercial credibility in B2B trust networks:** TexQtic's B2B model depends on network
   effects among suppliers and buyers. Commercial credibility signals — plan badges,
   tier visibility, pricing pages — function as trust signals that a vendor relationship
   is long-term. A free-tool appearance weakens that trust signal.

### 2.4 What Must Change Before Launch

The following cannot wait for post-MVP:

| Required Pre-MVP | Reason |
|---|---|
| Visible plan badge ("FREE — Early Access") | Sets commercial expectation at first session |
| Tier ceiling labels (what FREE does not include) | Anchors the STARTER/PROFESSIONAL upgrade path |
| Upgrade intent capture ("Contact us") | Begins WTP signal collection before Razorpay |
| Public plan comparison page (static, no checkout) | Establishes commercial framing pre-launch |
| AI budget framed as a plan limit | Converts a raw cap into a commercial boundary signal |
| "Early Access FREE" framing | Communicates limited-time, not permanent free-tool |
| Razorpay parallel readiness track | Ensures no commercial gap between WTP capture and checkout |

None of these require billing infrastructure, payment gateway, or backend plan gates.
All are achievable through UI-layer and static-content changes only.

---

## 3. Preflight Results

### 3.1 Git State at Start of Unit

```
git status --short   → (empty — clean working tree)
git rev-parse --short HEAD → 5588400c
git merge-base --is-ancestor 5588400c HEAD → ancestor_check=True
```

**Dirty tree status at start:** CLEAN — no uncommitted source changes.

### 3.2 FAM-07 Guard Checks

```
Test-Path -LiteralPath "governance/legal/fam-07"      → FAM07_DIR=ABSENT
Test-Path -LiteralPath "governance/legal/fam-07/supplier-onboarding-terms-authority.json" → FAM07_FILE=ABSENT
```

FAM-07 legal hold preserved. This unit did not touch FAM-07.

### 3.3 FAM-11A Artifact Guard

```
Test-Path -LiteralPath "artifacts/launch-readiness/FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001.md" → FAM11A=PRESENT
```

FAM-11A is committed and present. This unit builds on it.

---

## 4. Files Inspected

All files read as part of this design unit:

| File | Purpose |
|---|---|
| `artifacts/launch-readiness/FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001.md` | Prior unit — scenario matrix, taxonomy, Option E recommendation |
| `types.ts` | CommercialPlan union, normalizeCommercialPlan, TenantConfig.billingStatus |
| `App.tsx` | Plan rehydration, billingStatus hardcoded as 'CURRENT', aiUsage hardcoded as 0 |
| `components/ControlPlane/TenantDetails.tsx` | PLAN tab — plan text label only, AI budget progress bar; BILLING tab — "boundary reminder only" |
| `components/ControlPlane/TenantRegistry.tsx` | PROVISION_PLAN_GUIDANCE one-liners for each plan; no tenant-facing plan display |
| `components/Tenant/` (all 22 files scanned) | No plan badge, no upgrade CTA, no tier display, no subscription UI |
| `services/authService.ts` | commercial_plan field in tenant runtime identity |
| `services/controlPlaneService.ts` | Plan exposed as admin metadata only |
| `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md` | 5 module design — vocabulary, display containment, contract tightening, CP truthfulness, onboarding |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §3.1 PRIT-018, §3.3 D-011 parked, §4.3 prerequisites, §5.1 B2B no-money-movement |
| `server/src/lib/aiBudget.ts` | AI_BUDGET_DEFAULT_TOKENS=50000, hard-stop, month key format |

---

## 5. Current State — Commercial UI Audit

### 5.1 What Exists

| Surface | Current State | Commercial Signal |
|---|---|---|
| TenantDetails PLAN tab | `tenant.plan` as plain text label | Minimal — raw enum string only |
| TenantDetails BILLING tab | "Billing remains outside this surface" | Boundary notice only |
| App.tsx `billingStatus` | Hardcoded `'CURRENT'` always | No commercial signal |
| App.tsx `aiUsage` | Hardcoded `0` ("no longer tracked in mock format") | No enforcement signal |
| TenantRegistry provisioning | PROVISION_PLAN_GUIDANCE one-liner per plan | Admin-only, not tenant-facing |
| normalizeCommercialPlan | Maps TRIAL/PAID/BASIC to canonical | Internal normalization only |
| PROVISION_PLAN_GUIDANCE | 4 plan descriptions | Admin provisioning guide only |

### 5.2 What Is Absent (Commercial UI Gaps)

| Absent Surface | Impact |
|---|---|
| No styled plan badge in tenant UI | Users do not see their plan identity |
| No "Early Access" or "Pilot" qualifier on FREE | Users perceive permanent free access |
| No tier ceiling labels ("Upgrade to access X") | No upgrade anchor exists anywhere |
| No public pricing/plan comparison page | Commercial framing absent pre-launch |
| No upgrade intent CTA ("Contact us to upgrade") | No WTP signal collection |
| No AI budget framed as plan limit | Raw cap not readable as commercial boundary |
| No entitlement awareness panel in tenant settings | Users cannot see what they have / don't have |
| No Razorpay readiness track | Commercial gap from WTP capture to checkout undefined |

---

## 6. Founder-Lens Commercial Diagnosis

The following 10 diagnoses define the commercial psychology layer that FAM-11A did not address:

### D-01: Indian MSME Anchoring Risk

**Finding:** TexQtic launches as a B2B SaaS platform serving Indian SME suppliers. If no visible
commercial framing exists at launch, the first perception is "free tool." This anchors WTP at
zero with high reversal resistance.

**Required response:** Commercial framing must precede first user session, not follow it.

### D-02: Education Prerequisite for WTP Formation

**Finding:** Indian MSME users are not familiar with SaaS subscription pricing models. They
require explicit education about what a "tier" means, what they get, and what they would pay
to get more. The tier vocabulary must exist in the UI before it can become the basis for a
pricing conversation.

**Required response:** Static UI showing tier names + feature descriptions + "Coming Soon"
pricing is an educational investment, not a sales motion. It must exist at MVP.

### D-03: Tier Ceiling as Upgrade Motivator

**Finding:** A user who never sees a locked feature or a tier ceiling has no natural motivation
to upgrade. The FAM-11A recommendation to enforce plan gates post-MVP is correct — but the
*visual* tier ceiling (label only, no enforcement) must appear at MVP.

**Required response:** Tenant settings/dashboard shows a feature availability matrix where
some features show "Included" and others show "Available in STARTER — Contact us." This is
display-only, requiring zero backend changes.

### D-04: Contact-Us CTA as Pre-Razorpay WTP Capture

**Finding:** Between "user wants to upgrade" and "Razorpay checkout available," there must be
a WTP capture mechanism. Without it, upgrade intent is lost. A simple "Contact us to upgrade"
email CTA or Calendly-style link costs nothing to implement and begins commercial pipeline
formation.

**Required response:** Upgrade CTAs must exist in tenant UI before Razorpay is available,
routing to a designated upgrade intent endpoint (email/form/calendar — defined by operator).

### D-05: WTP Signal Collection Is Pre-MVP Business Intelligence

**Finding:** Upgrade intent clicks — even if they only trigger an email — are the most
valuable commercial signal in an early-stage B2B SaaS. Every click is a qualified lead.
Missing this signal pre-launch means commercial intelligence is lost forever (users who
found the product but didn't upgrade and eventually churned without ever being contacted).

**Required response:** Upgrade CTAs must fire an analytics event or email even at MVP,
before any checkout infrastructure exists.

### D-06: Commercial Credibility in B2B Buying Process

**Finding:** Indian B2B buyers evaluate platforms through a supplier network credibility lens.
A supplier using "a free tool" is trusted differently than a supplier using "a professional
B2B platform." TexQtic's plan badge and tier framing are as much a supplier credibility signal
as they are a billing mechanism.

**Required response:** Plan badge in tenant UI should use credibility-positive language
("Professional Platform — Early Access" or "TexQtic FREE — Early Access").

### D-07: Free-Tool Risk vs. Free-Tier Risk

**Finding:** There is a categorical difference between:
- **Free tool:** A product with no commercial model, no tiers, no pricing signal. Users expect
  it to remain free forever or to shut down.
- **Free tier:** A commercial SaaS product with a limited free tier that clearly communicates
  "this is a free entry point into a paid platform."

The current TexQtic MVP launch as described would land in "free tool" territory, not
"free tier" territory. The difference is entirely in framing, not in billing infrastructure.

**Required response:** All user-visible language must use "free tier" framing, not
"free tool" framing. This is a copy/labeling change, not a billing change.

### D-08: Overbuild Risk

**Finding:** The commercial psychology problem does not require building:
- Billing engine
- Invoice system
- Razorpay checkout
- Subscription management UI
- Feature gate enforcement

All required commercial framing is achievable through:
- Static copy / labels
- Plan badge component
- Static pricing/plan comparison page
- Feature availability matrix (display only)
- Upgrade CTA (email link or form)

**Required response:** Constrain implementation to UI/copy layer only. Do not use commercial
psychology as justification for billing infrastructure.

### D-09: Psychology vs. Infrastructure — The Critical Separation

**Finding:** This is the central insight of FAM-11B:

> **Commercial psychology operates on perception. Billing infrastructure operates on
> enforcement. These are separable concerns and must be built in sequence: perception first,
> enforcement second.**

Attempting to solve commercial psychology through billing infrastructure is both slower
(requiring payment gateway, merchant-of-record, CA review) and less effective (users who
are commercially confused before billing is introduced will be confused after as well).

**Required response:** Solve commercial psychology at the perception layer (UI, copy,
framing) before investing in enforcement infrastructure.

### D-10: Razorpay Parallel Readiness Track

**Finding:** Razorpay integration requires 5 prerequisites (per COMMERCE methodology §4.3):
1. Merchant-of-record decision (D-012)
2. India CA/legal review
3. Razorpay KYC and account setup
4. Refund/dispute policy (D-013/D-014)
5. PCI boundary definition

None of these block MVP launch. But none can be started the day before Razorpay is needed.
They require 4–8 weeks of external process. If payment intent data shows upgrade demand at
month 2 post-launch, Razorpay must be ready to activate at month 3 — meaning readiness
activities must begin at or near launch, not after.

**Required response:** A Razorpay parallel readiness track (non-blocking, non-implementing)
must be defined alongside the MVP commercial UI work. The track specifies what must be
completed before Razorpay can be activated, without implementing Razorpay.

---

## 7. Revised Pre-MVP Requirement Set

Supersedes FAM-11A's "vocabulary-only" recommendation. All items are UI/copy-layer only.

### 7.1 Required Before Launch (Pre-MVP)

| # | Requirement | Implementation Layer | Blocking? |
|---|---|---|---|
| R-01 | Styled plan badge in tenant UI header or settings | Frontend — new component | YES |
| R-02 | "Early Access FREE" framing on plan badge and settings | Frontend — copy | YES |
| R-03 | AI budget displayed as "50,000 tokens/month (FREE plan limit)" | Frontend — display label | YES |
| R-04 | Feature availability matrix in tenant settings (display only) | Frontend — new component | YES |
| R-05 | Tier ceiling labels for STARTER+ features ("Contact us to access") | Frontend — copy + CTA | YES |
| R-06 | Upgrade intent CTA routing to designated upgrade email/calendar | Frontend — link | YES |
| R-07 | Public plan comparison page (static — no checkout) | Frontend — new route/page | YES |
| R-08 | STARTER / PROFESSIONAL / ENTERPRISE tiers show "Coming Soon / Contact Sales" | Frontend — static content | YES |
| R-09 | Canonical plan vocabulary normalized in frontend types (FAM-11A vocabulary work) | Frontend — types.ts | YES |
| R-10 | Razorpay readiness track defined (non-implementing parallel track design) | Design artifact | YES |

### 7.2 Required Post-MVP (Not Launch Blocking)

| # | Requirement | Gate | Dependency |
|---|---|---|---|
| P-01 | Self-serve checkout (Razorpay) | Post-MVP | D-011, D-012, CA review, KYC |
| P-02 | Backend plan-tier feature gates | Post-MVP | Entitlement design (FAM-11D+) |
| P-03 | Subscription billing engine | Post-MVP | Merchant-of-record, legal review |
| P-04 | Invoice/statement generation | Post-MVP | Billing engine |
| P-05 | Prorated upgrade/downgrade billing | Post-MVP | Billing engine |
| P-06 | Tax calculation (GST/TDS) | Post-MVP | India CA review, Razorpay |
| P-07 | Subscription cancellation workflow | Post-MVP | Billing engine |
| P-08 | Usage-based billing | Post-MVP | Billing engine + metering |

---

## 8. Matrix 1 — Pre-MVP vs Post-MVP Commercial Requirements

| Commercial Requirement | Pre-MVP (R) / Post-MVP (P) | Requires Billing Infra? | Blocks Launch? |
|---|---|---|---|
| Plan badge component | R | NO | YES |
| Early Access FREE framing | R | NO | YES |
| AI budget as plan limit display | R | NO | YES |
| Feature availability matrix (display) | R | NO | YES |
| Upgrade intent CTA (email link) | R | NO | YES |
| Public plan comparison (static) | R | NO | YES |
| Coming Soon / Contact Sales tier labels | R | NO | YES |
| Canonical plan vocabulary alignment | R | NO | YES |
| Razorpay readiness track design | R | NO | YES |
| Self-serve checkout (Razorpay) | P | YES | NO |
| Backend plan-tier feature gates | P | NO | NO |
| Subscription billing engine | P | YES | NO |
| Invoice/statement generation | P | YES | NO |
| Tax calculation (GST/TDS) | P | YES | NO |

---

## 9. Matrix 2 — Commercial Psychology Layer

| Psychology Goal | Mechanism | Layer | MVP? |
|---|---|---|---|
| Anchor users to "commercial SaaS" not "free tool" | Plan badge + "Early Access FREE" label | UI copy | YES |
| Establish upgrade expectation | Tier ceiling labels with "Contact us" | UI display | YES |
| Enable B2B budget cycle submission | Public pricing page with tier structure | Static route | YES |
| Capture WTP signal before checkout | Upgrade intent CTA → email/calendar | Frontend link | YES |
| Signal commercial credibility to buyers | Plan badge visible in supplier-facing contexts | UI component | YES |
| Avoid zero-anchor formation | "Early Access" framing creates time-limited perception | Copy | YES |
| Enable peer comparison ("what do others pay?") | Public pricing page | Static route | YES |
| Establish commercial vocabulary for sales calls | Canonical tier names in all UI surfaces | Types + display | YES |
| Create upgrade urgency without false scarcity | "Coming Soon" on paid tiers | Static content | YES |
| Support post-MVP pricing conversation | Commercial framing established pre-MVP | All above | YES |

---

## 10. Matrix 3 — Tier Visibility

| Tier | Display Label | Badge Color | Status Label | Upgrade CTA |
|---|---|---|---|---|
| FREE (current) | "FREE — Early Access" | Slate/grey | "Pilot Access" | — (no CTA on FREE itself) |
| STARTER | "STARTER" | Indigo | "Coming Soon" | "Contact us to learn more" |
| PROFESSIONAL | "PROFESSIONAL" | Blue | "Coming Soon" | "Contact sales" |
| ENTERPRISE | "ENTERPRISE" | Amber/gold | "Contact Sales" | "Request a demo" |

**Notes:**
- FREE badge does NOT say "upgrade" to itself — it reads as a current access state
- STARTER/PROFESSIONAL/ENTERPRISE appear as "what comes next," not as locked features
- Actual plan enforcement for STARTER+ remains POST_MVP
- This matrix is display-only — zero backend changes required

---

## 11. Matrix 4 — Entitlement Awareness (Display-Only Feature Matrix)

This matrix defines what the tenant-side feature availability panel should display.
All cells are **display-only** — no backend gate enforcement at MVP.

| Feature Category | FREE (Early Access) | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|---|
| B2B workspace | ✓ Included | ✓ Included | ✓ Included | ✓ Included |
| Digital Product Passport | ✓ Included | ✓ Included | ✓ Included | ✓ Included |
| TTP (Trade Trust Protocol) | ✓ Included (pilot) | ✓ Included | ✓ Included | ✓ Included |
| RFQ / Procurement Pools | ✓ Included (pilot) | ✓ Included | ✓ Included | ✓ Included |
| AI Document Intelligence | Up to 50,000 tokens/mo | Higher limit | Higher limit | Custom limit |
| White-label overlay | Contact us | Contact us | ✓ Included | ✓ Included |
| Aggregator workspace | Not included | Not included | Contact us | ✓ Included |
| Priority support | Community | Email | Priority | Dedicated |
| Onboarding assistance | Self-serve | Guided | Dedicated | Enterprise CSM |
| API access | Limited | Standard | Full | Full + SLA |
| Custom integrations | Not included | Not included | Contact us | ✓ Included |

**Implementation notes:**
- Checkmarks = `✓ Included` display only, not enforced
- "Contact us" = CTA link to upgrade email, no backend state
- Token limits shown are display labels matching `AI_BUDGET_DEFAULT_TOKENS=50000` for FREE
- Higher tier limits are aspirational display only until billing infra exists

---

## 12. Matrix 5 — Upgrade Nudge Placement

| Placement Location | Nudge Type | Copy Pattern | CTA Action | Priority |
|---|---|---|---|---|
| Tenant settings sidebar/header | Plan badge with tier name | "FREE — Early Access" | None (awareness only) | P0 |
| Tenant settings — Plan & Usage section | Plan details + feature matrix | "Your current plan includes..." with ceiling labels | "Interested in STARTER? Contact us" | P0 |
| AI budget usage bar (near limit) | Soft nudge | "You're at X% of your FREE plan AI limit. Interested in higher limits?" | "Contact us to learn about higher tiers" | P1 |
| Feature availability panel | Tier comparison | "Available in STARTER and above" | "Contact us to upgrade" | P0 |
| Onboarding completion | Welcome message | "You're on TexQtic FREE — Early Access. Explore what's possible across all tiers." | Link to pricing page | P1 |
| Public plan comparison page | Full tier matrix | "Compare plans" | "Contact Sales" per tier | P0 |

**What this is NOT:**
- Not a modal popup on every action
- Not an aggressive upsell wall
- Not gating any currently available feature
- Not a checkout flow

---

## 13. Matrix 6 — Payment Readiness

| Prerequisite | Owner | Status | Required Before Razorpay? | Parallel Pre-MVP? |
|---|---|---|---|---|
| Merchant-of-record decision (D-012) | Paresh Patel | Not started | YES | YES — begin at launch |
| India CA / legal review | External CA | Not started | YES | YES — begin at launch |
| Razorpay KYC and account setup | Paresh Patel | Not started | YES | YES — begin at launch |
| Refund / dispute policy (D-013/D-014) | Paresh Patel | Not started | YES | YES — define at launch |
| PCI boundary definition | Engineering | Not started | YES | YES — design at launch |
| Settlement model decision (D-012) | Paresh Patel | Not started | YES | YES — begin at launch |
| GST/TDS advisory | India CA | Not started | YES | YES — begin at launch |
| Upgrade intent data collected | System | Pre-MVP | YES — informs tier pricing | YES |

**Key principle:** None of these block MVP launch. All must be in-flight before upgrade demand
creates commercial pressure to activate Razorpay.

---

## 14. Matrix 7 — Razorpay Parallel-Track Decision

| Decision Point | Recommendation | Rationale |
|---|---|---|
| Is Razorpay checkout a launch blocker? | NO | PRIT-018 confirmed; D-011 parked |
| Should Razorpay work begin at MVP launch? | YES — parallel readiness track | 4–8 week external process; must start before demand arrives |
| What constitutes "Razorpay ready"? | All 7 prerequisites in Matrix 6 complete | Cannot shortcut any of the 7 items |
| Manual upgrade flow before Razorpay? | YES | "Contact us to upgrade" → manual admin plan change in control plane |
| Self-serve plan selection in control plane? | Admin-side only (already exists) | Paresh provisions plan changes via control plane until Razorpay is live |
| Upgrade intent CTA format pre-Razorpay? | Email CTA or embedded calendar link | Zero backend required; should fire analytics event |
| Post-Razorpay activation pathway? | Defined in FAM-13A (separate design unit) | Do not design Razorpay checkout here |
| Price anchoring risk during readiness period? | LOW if public pricing page exists | Pricing page establishes tier prices before checkout is live |

---

## 15. Matrix 8 — Implementation Sequence

| Unit | Scope | MVP? | Billing Infra? | Source Changes? |
|---|---|---|---|---|
| FAM-11C-CANONICAL-VOCABULARY-AND-TIER-AWARENESS-IMPLEMENTATION-001 | Plan badge, Early Access framing, AI budget as plan limit, feature availability matrix (display), upgrade CTA, vocabulary normalization | YES — pre-MVP | NO | YES — UI components and copy |
| FAM-11D-PUBLIC-PLAN-COMPARISON-AND-UPGRADE-INTENT-001 | Static public pricing/plan comparison page, tier display, Coming Soon labels, upgrade intent CTA | YES — pre-MVP | NO | YES — new route/page |
| FAM-13A-RAZORPAY-SUBSCRIPTION-PAYMENT-READINESS-DECISION-001 | Razorpay readiness checklist design, merchant-of-record decision record, payment readiness gate | Parallel pre-MVP | NO | NO — design only |
| FAM-11E-BACKEND-PLAN-TIER-FEATURE-GATE-001 | Backend hard plan gates for STARTER+ features | POST_MVP | NO (conditional) | YES — middleware + enforcement |
| FAM-11F-SELF-SERVE-SUBSCRIPTION-CHECKOUT-001 | Razorpay checkout, subscription management UI, billing lifecycle | POST_MVP | YES | YES — major |

---

## 16. Design Decisions Resolved

### DD-01: Plan Badge Pre-MVP Required?
**DECISION: YES.**
A styled plan badge in tenant UI is required before launch. Current state shows `tenant.plan`
as a plain text label inside the admin-only PLAN tab of TenantDetails. Tenant-side UI has
zero plan visibility. A plan badge component must be added to the tenant-facing experience.

### DD-02: Public Pricing/Plan Comparison Pre-MVP Required?
**DECISION: YES.**
A static public-facing page showing FREE / STARTER / PROFESSIONAL / ENTERPRISE tier comparison
is required before launch. It requires no backend — it is static content only. It anchors
commercial framing before the first user session.

### DD-03: Static UI-Readable Entitlement Matrix Pre-MVP?
**DECISION: YES.**
A tenant-settings panel showing a feature availability matrix (display only, no enforcement)
is required before launch. This provides the tier ceiling visibility without any backend
plan-gate enforcement. See Matrix 4 for the required content.

### DD-04: Soft Upgrade Nudges Pre-MVP?
**DECISION: YES — informational CTAs only.**
Soft upgrade nudges (CTA links, not blocking modals) must appear in tenant settings at MVP.
They route to an upgrade intent email/form, not a checkout. No backend required. See Matrix 5.

### DD-05: Backend Hard Plan Gates Remain Post-MVP?
**DECISION: YES — unchanged from FAM-11A.**
No plan-tier enforcement in MVP backend. Feature gates remain per-named-feature, not per tier.
Backend hard gates are FAM-11E scope (post-MVP).

### DD-06: Payment Gateway — Post-MVP or Parallel Pre-MVP Readiness?
**DECISION: PARALLEL PRE-MVP READINESS TRACK.**
Razorpay checkout is post-MVP (D-011 parked). But the readiness prerequisites (Matrix 6) must
begin in parallel with MVP launch. A non-blocking parallel readiness track is defined.

### DD-07: Razorpay Checkout a Launch Blocker?
**DECISION: NO.**
Razorpay checkout is not a launch blocker. The prerequisite chain (merchant-of-record, CA
review, KYC, refund policy, PCI boundary) is 4–8 weeks and cannot be completed before MVP.
Manual upgrade via "Contact us" is the pre-Razorpay upgrade path.

### DD-08: Manual Upgrade / Contact-Sales Flow Before Razorpay?
**DECISION: YES.**
A "Contact us to upgrade" CTA is the pre-Razorpay upgrade flow. On the operator side, Paresh
can manually change a tenant's plan via the control plane provisioning surface. No new backend
endpoint required — the provisioning path already supports plan assignment.

### DD-09: FREE Renamed as "Early Access FREE"?
**DECISION: YES — for display only. Internal canonical plan remains `FREE`.**
- Internal: `CommercialPlan = 'FREE'` — unchanged
- Display: "FREE — Early Access" or "TexQtic FREE (Early Access)"
- Canonical plan store (`Tenant.plan`, `organizations.plan`): remains `'FREE'`
- No `normalizeCommercialPlan` change required
- Display label is a UI-layer-only mapping: `FREE → 'FREE — Early Access'`

This is a one-line change in a display label function, not a canonical type change.

### DD-10: Plan Tiers Show "Coming Soon / Contact Us"?
**DECISION: YES.**
STARTER, PROFESSIONAL, and ENTERPRISE tiers on the public pricing page and tenant
entitlement matrix show:
- Status: "Coming Soon" or "Available — Contact Sales"
- Price: TBD / "Contact us for pricing"
- CTA: "Contact sales" → upgrade intent email

No checkout, no price points committed publicly until CA/legal review is complete.

### DD-11: AI Budget Shown as Concrete Plan Limit?
**DECISION: YES.**
Current display in TenantDetails PLAN tab: raw number labels ("Configured cap: 50,000 units").
Required display: "50,000 tokens/month (FREE plan limit)" — framing the cap as a plan feature
boundary, not an arbitrary configured number.

In tenant-facing UI, this becomes the primary commercial signal. Users see their AI budget
as a plan-tier artifact, creating a natural upgrade motivator when they approach the limit.

### DD-12: Next Unit — Vocabulary-Only or Expanded?
**DECISION: EXPANDED.**
FAM-11C scope is:
1. Plan badge component (`PlanBadge.tsx` or inline) with "Early Access FREE" display
2. AI budget framed as plan limit in tenant settings
3. Feature availability matrix panel in tenant settings (display only)
4. Upgrade intent CTAs in tenant settings (email link)
5. Canonical plan vocabulary alignment (types.ts, normalizeCommercialPlan display wrapper)
6. Remove `billingStatus: 'CURRENT'` hardcode from visual surfaces where it creates false
   commercial impression (audit only — do not break TenantConfig interface)

---

## 17. What Remains Post-MVP

The following are explicitly excluded from pre-MVP scope and must not be included in FAM-11C:

| Excluded Item | Reason |
|---|---|
| Razorpay checkout UI | D-011 parked; prerequisites not met |
| Subscription management page (cancel/upgrade/downgrade) | Requires billing engine |
| Invoice/statement generation | Requires billing engine |
| Backend plan-tier feature gates | Post-MVP (FAM-11E) |
| Hard entitlement enforcement | Post-MVP (FAM-11E) |
| Plan upgrade/downgrade API endpoints | Post-MVP |
| Price points published (₹ amounts) | Requires CA/legal review; do not commit pre-review |
| GST/tax display on pricing page | Requires India CA advisory |
| Trial-to-paid conversion flow | Post-MVP; requires billing |
| Stripe/Razorpay subscription webhooks | Post-MVP |
| `TenantStatus.TRIAL` state management | Not needed pre-MVP (pilot tenants are FREE not TRIAL) |

---

## 18. What Becomes Parallel Pre-MVP Readiness

These items are not source code changes. They are operational activities that must begin
concurrently with FAM-11C and FAM-11D implementation:

| Activity | Owner | Dependency | Target |
|---|---|---|---|
| Merchant-of-record decision (D-012) | Paresh Patel | None | Pre-Razorpay |
| India CA engagement for legal review | Paresh Patel | D-012 | Pre-Razorpay |
| Razorpay KYC and account setup | Paresh Patel | D-012 | Pre-Razorpay |
| Refund/dispute policy draft (D-013/D-014) | Paresh Patel | CA review | Pre-Razorpay |
| Upgrade intent email/calendar setup | Paresh Patel | None | Pre-launch (MVP) |
| Upgrade intent analytics event spec | Engineering | None | FAM-11C |
| Pricing tier definition (₹ amounts) | Paresh Patel | CA review | Pre-Razorpay |
| FAM-13A design artifact | Engineering | None | Concurrent with FAM-11D |

---

## 19. Plan / Tier Display Recommendation

### 19.1 Tenant-Facing Plan Badge

**Location:** Tenant workspace header or tenant settings page header.

**Content:**
```
[FREE — Early Access]   ← badge/pill component
```

**Behavior:**
- Display only — no click action required at MVP
- Color: Slate/grey (not indigo, which should be reserved for paid tiers)
- Font: Small caps, consistent with TexQtic design system (see existing badge patterns in
  TenantDetails.tsx for reference: `rounded border border-slate-700 px-2 py-1 text-[10px]
  font-bold uppercase tracking-widest text-slate-400`)

### 19.2 Tenant Settings — Plan & Usage Section

**Content:**
- Plan name: "FREE — Early Access"
- AI usage bar: "X / 50,000 tokens this month (FREE plan limit)"
- Feature matrix: Matrix 4 content (display only)
- Upgrade CTA: "Interested in STARTER or PROFESSIONAL? Contact us →"

---

## 20. Upgrade Nudge Recommendation

### 20.1 Nudge Design Principles

- **Soft nudges only at MVP:** No blocking modals, no feature walls, no "locked" overlays on
  currently accessible features
- **Informational, not aggressive:** "Here is what you could access" — not "You can't do this"
- **One upgrade path:** All nudges point to the same upgrade intent contact (email or calendar)
- **Respect admin-assigned pilot posture:** Pilot users are guests of the operator; nudges must
  not create pressure that contradicts the pilot relationship

### 20.2 Nudge Copy Patterns

| Context | Copy | CTA |
|---|---|---|
| Plan badge tooltip or adjacent text | "You're on TexQtic FREE — Early Access. Explore all tiers." | Link to pricing page |
| Feature matrix ceiling label | "Available in STARTER and above" | "Learn more →" → pricing page |
| AI budget near limit (>80%) | "You're approaching your FREE plan AI limit. Higher limits available in STARTER." | "Contact us →" |
| Settings plan section subtitle | "Your pilot access includes full B2B workspace capabilities." | — |
| Pricing page CTA per paid tier | "Interested in [TIER]? We'd love to hear from you." | "Contact sales →" |

---

## 21. Public Pricing / Plan Comparison Recommendation

### 21.1 Page Design

**Route:** `/pricing` or accessible from public homepage header
**Type:** Static React component — no backend calls, no checkout

**Sections:**
1. Header: "TexQtic Plans — Built for Indian B2B Commerce"
2. Tier cards (4 columns): FREE, STARTER, PROFESSIONAL, ENTERPRISE
3. Feature comparison table (Matrix 4 rows)
4. Footnote: "Prices coming soon. Early access participants enjoy FREE pilot access."
5. CTA per paid tier: "Contact sales" → upgrade intent email

### 21.2 What to NOT include on pricing page

- No ₹ price amounts (pending CA/legal review)
- No checkout button
- No "Start free trial" button (users are already on FREE; this creates confusion)
- No countdown timer or false scarcity
- No implied launch date for paid tier availability

---

## 22. UI-Readable Entitlement Matrix Recommendation

### 22.1 Rendering

The Matrix 4 feature availability table should render in tenant settings as:
- Table with feature category rows
- Columns: FREE (current), STARTER, PROFESSIONAL, ENTERPRISE
- Current plan column highlighted (FREE)
- Cells: ✓ Included | "Coming Soon" | "Contact us" | limit labels

### 22.2 Technical Notes

- Static data structure (no backend call required)
- Can be a `const ENTITLEMENT_DISPLAY_MATRIX` in a new file
  (e.g. `config/entitlementDisplay.ts` — read-only config, not enforcement)
- Do not couple to feature flag table or `ai_budgets` table at MVP
- AI budget limit row reads from `tenant.aiBudget` (already in TenantConfig)

---

## 23. Razorpay / Payment Readiness Recommendation

### 23.1 What This Is NOT

This is NOT a Razorpay implementation design. No Razorpay code, API keys, webhook handlers,
subscription plans, or checkout UI is designed here or authorized for implementation.

### 23.2 What This IS

A readiness track definition — the checklist of non-engineering prerequisites that must be
completed before FAM-11F (self-serve checkout) can begin implementation.

### 23.3 Readiness Track

**Track name:** FAM-13A-RAZORPAY-SUBSCRIPTION-PAYMENT-READINESS-DECISION-001

**Prerequisites before FAM-11F begins:**

| # | Prerequisite | Type | Estimated Lead Time |
|---|---|---|---|
| PR-01 | Merchant-of-record entity confirmed (D-012) | Legal/business | 2–4 weeks |
| PR-02 | Settlement model decision (D-012): who holds funds during trade? | Legal/business | 2–4 weeks |
| PR-03 | India CA engagement: GST/TDS advisory for SaaS subscription | Legal/accounting | 4–8 weeks |
| PR-04 | Razorpay KYC and business account setup | Banking/compliance | 2–4 weeks |
| PR-05 | Refund and dispute policy written and approved (D-013/D-014) | Legal | 2–4 weeks |
| PR-06 | PCI boundary design: which services handle card data? | Engineering | 1–2 weeks |
| PR-07 | Price tier amounts finalized (₹ values for STARTER/PROFESSIONAL) | Business | After CA review |

**Earliest Razorpay implementation start:** When all 7 prerequisites are complete.
**Expected timeline (if started at MVP launch):** 8–12 weeks from today.

### 23.4 Pre-Razorpay Upgrade Path

Until FAM-13A/FAM-11F are complete, the upgrade path is:
1. User clicks "Contact us to upgrade" CTA in tenant UI
2. Email/calendar reaches Paresh Patel (operator)
3. Paresh changes tenant plan via control plane provisioning surface
4. Tenant receives confirmation; plan badge updates in next session

This path requires zero new backend endpoints. The control plane provisioning surface
already supports plan assignment by operator.

---

## 24. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| "Coming Soon" creates false urgency expectations | Medium | Medium | Add "We'll reach out when STARTER is available" framing |
| Pricing page anchors WTP too low (free forever expectation) | Medium | High | "Early Access FREE" framing must communicate time-bounded pilot access |
| AI budget display causes support tickets ("why only 50k?") | Low | Low | Tooltip: "FREE plan includes 50,000 AI tokens/month. Higher limits available in STARTER." |
| Upgrade CTAs not tracked → lost commercial intelligence | Medium | High | Require analytics event on all upgrade CTA clicks as part of FAM-11C |
| Parallel Razorpay track not started → delays payment activation | Medium | High | FAM-13A design artifact starts in parallel with FAM-11C |
| Paid tier feature matrix creates false enforcement expectations | Low | Medium | Matrix uses "display only" labels; no enforcement implied |
| Plan badge in tenant UI confuses impersonated sessions | Low | Low | Plan badge shows plan of the impersonated tenant, not the CP operator |

---

## 25. Revised Implementation Sequence

```
FAM-11C: CANONICAL-VOCABULARY-AND-TIER-AWARENESS-IMPLEMENTATION-001
  ├── Plan badge component (displays "FREE — Early Access")
  ├── AI budget framed as plan limit in tenant settings
  ├── Feature availability matrix panel (static, display only)
  ├── Upgrade intent CTAs in tenant settings
  ├── Analytics event on upgrade CTA clicks
  └── Vocabulary normalization (types.ts display wrapper for "Early Access FREE")

FAM-11D: PUBLIC-PLAN-COMPARISON-AND-UPGRADE-INTENT-001 (concurrent or immediately after)
  ├── Static pricing/plan comparison page (/pricing route)
  ├── Tier cards: FREE, STARTER, PROFESSIONAL, ENTERPRISE
  ├── Feature comparison table
  ├── "Coming Soon / Contact Sales" CTAs per paid tier
  └── Upgrade intent email CTA target configured

FAM-13A: RAZORPAY-SUBSCRIPTION-PAYMENT-READINESS-DECISION-001 (parallel, design only)
  ├── Prerequisite checklist formalized
  ├── D-012 merchant-of-record decision record
  ├── D-013/D-014 refund/dispute policy framework
  ├── FAM-11F gate conditions specified
  └── No source changes

FAM-11E: BACKEND-PLAN-TIER-FEATURE-GATE-001 (post-MVP)
  └── Backend enforcement for STARTER+ plan gates

FAM-11F: SELF-SERVE-SUBSCRIPTION-CHECKOUT-001 (post-MVP, after FAM-13A complete)
  └── Razorpay checkout, subscription management, billing lifecycle
```

---

## 26. Recommended Next Implementation Unit

**Title:** `FAM-11C-CANONICAL-VOCABULARY-AND-TIER-AWARENESS-IMPLEMENTATION-001`

**Scope summary:**
- Plan badge component in tenant UI
- AI budget display as plan limit
- Feature availability matrix (display only, static data)
- Upgrade intent CTAs (email link + analytics event)
- Display wrapper for "Early Access FREE" label (UI layer only, no canonical type change)
- Remove any visual surfaces that hardcode "billing complete" false impression

---

## 27. Proposed Allowed Write Files for FAM-11C

Minimal allowlist to implement DD-01 through DD-12 at the UI layer:

| File | Change Type |
|---|---|
| `components/shared/PlanBadge.tsx` | Create — new plan badge component |
| `components/Tenant/PlanAndUsagePanel.tsx` | Create — plan + AI usage + feature matrix panel |
| `config/entitlementDisplay.ts` | Create — static display data for feature availability matrix |
| `App.tsx` | Minimal — wire plan badge and panel into tenant workspace |
| `types.ts` | Minimal — add display label helper `getCommercialPlanDisplayLabel(plan)` |

**Explicitly NOT in FAM-11C allowlist:**
- `server/prisma/schema.prisma` — no schema changes
- `server/src/middleware/*` — no feature gate changes
- `server/src/lib/aiBudget.ts` — no enforcement changes
- `shared/contracts/openapi.*.json` — no contract changes
- `.env` or environment files — no secrets/config changes
- `governance/legal/fam-07/` — do not create

---

## 28. Proposed Validation Commands for FAM-11C

```powershell
# Preflight
git status --short
git diff --name-only

# Type check (frontend only — minimal scope)
pnpm --filter client typecheck

# Lint (frontend only)
pnpm --filter client lint

# Component display verification (manual or Playwright)
# 1. Navigate to tenant settings — confirm plan badge shows "FREE — Early Access"
# 2. Confirm AI budget shows "X / 50,000 tokens this month (FREE plan limit)"
# 3. Confirm feature matrix renders with correct display labels
# 4. Confirm upgrade CTA links are present and resolve to correct target
# 5. Navigate to /pricing — confirm static tier comparison renders

# Commit gate
git diff --name-only --cached   # must show only allowlisted files
git status --short
```

---

## 29. Scope Safety Confirmation — No Source Changes This Unit

**This artifact (FAM-11B) made ZERO source changes.**

| Safety Check | Status |
|---|---|
| No source files modified | CONFIRMED — design artifact only |
| No schema changes | CONFIRMED |
| No migration files | CONFIRMED |
| No billing infrastructure added | CONFIRMED |
| No payment gateway code | CONFIRMED |
| No secrets printed or modified | CONFIRMED |
| No .env files modified | CONFIRMED |
| FAM-07 legal hold preserved | CONFIRMED — governance/legal/fam-07 absent |
| FAM-08 residuals untouched | CONFIRMED |
| FAM-09 real supplier onboarding untouched | CONFIRMED |
| FAM-10 verified complete status preserved | CONFIRMED |
| LAUNCH-FAMILY-INDEX.md untouched | CONFIRMED |

---

## 30. Final Enum

`FAM_11B_COMMERCIAL_FRAMING_PRE_MVP_TIER_AWARENESS_DESIGN_COMPLETE`

---

*End of FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001*
