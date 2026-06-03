# FAM-11B2-COMMERCIAL-FRAMING-DECISION-LOCK-001

**Unit:** FAM-11B2-COMMERCIAL-FRAMING-DECISION-LOCK-001
**Family:** FAM-11 — Subscription and Commercial Gating
**Mode:** TECS Safe Founder Decision Lock / Commercial Framing Governance
**Status:** COMPLETE — decision-lock only, no source changes
**Created:** 2026-06-03
**Owner:** Paresh Patel (TexQtic founder)
**Authority boundary:** Decision lock only. Does not authorize implementation.
  Does not widen Layer 0. Does not open a TECS unit. Does not modify any source surface.
  Does not add billing infrastructure. Does not implement payment gateway.

---

## 1. Unit Summary

FAM-11B established the correct founder-lens commercial framing design: visible tier ceilings,
upgrade intent capture, "early access" framing, and a Razorpay parallel readiness track — all
achievable without billing infrastructure.

Before any FAM-11C implementation begins, five founder/business decisions must be locked.
These are not implementation decisions — they are operational, legal-safety, and copy
decisions that Copilot cannot infer from repo truth alone. Implementing commercial UI without
locking these decisions would produce misleading, legally exposed, or operationally broken
commercial surfaces.

This artifact locks those five decisions, defines the final implementation constraints for
FAM-11C and FAM-11D, and initiates the FAM-13A parallel readiness track.

---

## 2. Why FAM-11B Requires Decision Lock Before Implementation

### 2.1 FAM-11B Is Design Authority, Not Implementation Authority

FAM-11B produced a design recommendation set. It did not lock:
- The exact copy text for the "Early Access FREE" label and its promise discipline
- Whether TTP can be displayed as "Included" given its ongoing legal hold
- The exact destination for upgrade CTAs (email address, form, or calendar)
- The exact pricing page copy pattern before ₹ amounts are legally reviewed
- The sequencing decision for FAM-13A (Razorpay readiness)

Without these locks, FAM-11C would be implementing commercial UI under ambiguous operating
conditions. Any one of these gaps could produce:

| Gap | Consequence if Unresolved |
|---|---|
| Early Access FREE promise undefined | Users interpret FREE as permanent; creates contractual ambiguity |
| TTP shown as "Included" while on legal hold | Legal exposure — feature advertising a held capability |
| Upgrade CTA dead-link or unmonitored | Upgrade intent lost; commercial pipeline breaks at first click |
| Pricing page looks "coming soon" in a bad way | Commercial credibility undermined; looks unfinished |
| FAM-13A not started | 8–12 week Razorpay prerequisite chain doesn't begin; commercial gap at payment demand |

### 2.2 Repo Truth Confirmed Before Locking

From FAM-11A and FAM-11B research:
- No analytics infrastructure exists in `components/Tenant/**` (confirmed via grep)
- No upgrade CTA exists anywhere in frontend (confirmed via grep)
- TTP status: `HOLD_FOR_COUNSEL_FEEDBACK`, `ttp_enabled=false` (confirmed via OPEN-SET.md)
- No `hello@texqtic.com` or any email CTA in tenant components (confirmed via grep)
- AI budget default: `AI_BUDGET_DEFAULT_TOKENS = 50000` (confirmed via server/src/lib/aiBudget.ts)

---

## 3. Preflight Results

### 3.1 Git State at Start of Unit

```
git status --short   → (empty — clean working tree)
git rev-parse --short HEAD → 3aaaec7f
git merge-base --is-ancestor 3aaaec7f HEAD → exit code 0 (ancestor=True)
```

**Dirty tree status at start:** CLEAN — no uncommitted source changes.

### 3.2 Guard Checks

```
Test-Path -LiteralPath "governance/legal/fam-07"
  → False  (FAM07_DIR=ABSENT) ✓

Test-Path -LiteralPath "governance/legal/fam-07/supplier-onboarding-terms-authority.json"
  → False  (FAM07_FILE=ABSENT) ✓

Test-Path -LiteralPath "artifacts/launch-readiness/FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001.md"
  → True   (FAM11B=PRESENT) ✓

Test-Path -LiteralPath "artifacts/launch-readiness/FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001.md"
  → True   (FAM11A=PRESENT) ✓
```

All guards pass. FAM-07 legal hold preserved. Both prior artifacts present.

### 3.3 Dirty Tree Status

No dirty files at start. No files in the following areas showed any modifications:
- `types.ts` — clean
- `App.tsx` — clean
- `components/Tenant/**` — clean
- `components/Public/**` — clean
- `components/ControlPlane/**` — clean
- `server/prisma/schema.prisma` — clean
- `server/prisma/seed.ts` — clean

---

## 4. Files Inspected

| File | Purpose |
|---|---|
| `artifacts/launch-readiness/FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001.md` | Design authority — 12 design decisions, 8 matrices, revised sequence |
| `artifacts/launch-readiness/FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001.md` | Prior unit — scenario matrix, taxonomy, repo-truth |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §3.1 PRIT-018, §3.3 D-011 parked, §4.1–4.4 Razorpay methodology, §5 B2B no-money-movement |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer — FAM-11 as next nonlegal candidate; FAM-07 hold state; TTP hold state |
| `governance/control/OPEN-SET.md` | TTP: `HOLD_FOR_COUNSEL_FEEDBACK`, `ttp_enabled=false`; TradeTrust Pay architecture lock state |
| `components/Tenant/**` (grep scan) | No upgrade CTAs, no analytics events, no plan badge, no email CTA |
| `server/src/lib/aiBudget.ts` | `AI_BUDGET_DEFAULT_TOKENS=50000` confirmed |

---

## 5. Decision Lock Table

### DL-01 — Early Access FREE Promise Discipline

**Status: LOCKED**

| Sub-decision | Locked Value |
|---|---|
| Display label approved? | **YES** — `FREE — Early Access` is the approved display label |
| Internal canonical plan value | `FREE` — unchanged; display wrapper only |
| Pilot window policy | **90 days after tenant onboarding date OR until paid tiers launch publicly, whichever is later** |
| Sunset date visible publicly? | **NO** — do not show a hard date on any public-facing surface before pricing/legal review completes |
| When paid tiers launch: existing users | **Grandfather temporarily** → notify via in-app message + email → migrate via manual outreach with upgrade CTA |
| What support/sales must say | `"FREE is an early-access launch tier. It provides full pilot access to the platform. It is not a guarantee of permanent unlimited free access."` |
| Forbidden sales/support phrases | `"free forever"`, `"always free"`, `"no strings attached"` |

**Implementation note for FAM-11C:**
The display wrapper function `getCommercialPlanDisplayLabel('FREE')` must return
`'FREE — Early Access'`. No other canonical plan value changes. No backend changes.

---

### DL-02 — TTP / Legal-Sensitive Feature Display

**Status: LOCKED**

| Sub-decision | Locked Value |
|---|---|
| TTP current status | `HOLD_FOR_COUNSEL_FEEDBACK` / `ttp_enabled=false` (confirmed via OPEN-SET.md) |
| May TTP appear as "Included" in tenant-facing feature matrix? | **NO** — forbidden while legal hold is unresolved |
| TTP display options considered | (a) Omit row entirely, (b) `Under legal review`, (c) `Premium feature — subject to approval` |
| **Chosen option** | **Omit TTP row entirely from FAM-11C tenant-facing feature display matrix** |
| Rationale | "Under legal review" in a commercial matrix risks confusing users about what they are buying. Omission is cleaner and safer than a disclaimered row until counsel resolves the hold. |
| Alternative if founder prefers label over omission | `Premium feature — availability subject to legal approval` (acceptable fallback if Paresh instructs) |
| Does this change backend TTP gates? | **NO** — `ttp_enabled=false` remains unchanged; no gate middleware changes |
| Does this affect FAM-07 legal hold? | **NO** — FAM-07 hold (`HOLD_FOR_HUMAN_LEGAL_INPUTS`) remains unchanged |
| When can TTP be shown as "Included"? | Only after FAM-07L14 (legal counsel inputs complete + Paresh Auth 2 in writing) AND a separate display decision is made |
| Does this affect NC procurement pool display? | **NO** — NC Pool feature flags are operational and separate from TTP. NC Pool rows may appear in the matrix as currently operational. |

**Implementation note for FAM-11C:**
The `ENTITLEMENT_DISPLAY_MATRIX` static data structure in `config/entitlementDisplay.ts`
must not include a TTP row. NC Pool rows are permitted. RFQ rows are permitted.

---

### DL-03 — Upgrade CTA Destination and Operating Protocol

**Status: LOCKED**

| Sub-decision | Locked Value |
|---|---|
| Upgrade CTA target address | `hello@texqtic.com` (approved default; update via operator instruction if mailbox changes) |
| Email subject line (pre-filled) | `TexQtic upgrade interest` |
| Email body template | See template below |
| CTA type in tenant UI | `mailto:` link (no backend endpoint required) |
| Who monitors the mailbox? | Paresh Patel (operator) |
| Response SLA target | Best-effort; 2 business days recommended internally |
| Plan upgrade execution path | Manual: Paresh changes tenant plan via control-plane provisioning surface |
| New backend endpoint required? | **NO** — control plane provisioning already supports plan assignment |
| Analytics event required? | Analytics infrastructure does not currently exist in `components/Tenant/**` (confirmed via grep). **Do not build analytics infrastructure in FAM-11C.** Log as a residual for a future analytics unit. |
| Residual created? | YES — `FAM-11C-RESIDUAL-001: Upgrade CTA click analytics event not fired at MVP. Add when analytics infrastructure is available.` |

**Approved upgrade CTA email template:**

```
mailto:hello@texqtic.com
  ?subject=TexQtic%20upgrade%20interest
  &body=
Company%2FOrg%20name%3A%20%0A
Current%20plan%3A%20FREE%20%E2%80%94%20Early%20Access%0A
Interested%20tier%3A%20%0A
Use%20case%3A%20%0A
Contact%20person%3A%20%0A
```

Decoded template body:
```
Company/Org name:
Current plan: FREE — Early Access
Interested tier:
Use case:
Contact person:
```

**Implementation note for FAM-11C:**
All upgrade CTAs must use the above `mailto:` link. No API call, no form submission,
no external redirect to a third-party tool at MVP. The CTA text may vary by context
(see Matrix 5 in FAM-11B for placement guidance) but all must resolve to this `mailto:`.

---

### DL-04 — Pricing Page Copy Before ₹ Amounts

**Status: LOCKED**

| Sub-decision | Locked Value |
|---|---|
| May exact ₹ amounts appear on the public pricing page at MVP? | **NO** — forbidden until India CA/GST review and Paresh pricing decision complete |
| May blank or empty price fields appear? | **NO** — blank price cards look broken and undermine commercial credibility |
| May "coming soon" price labels appear? | **YES** — with approved copy patterns below |
| FREE tier copy | `Early Access FREE for selected launch participants` |
| FREE price display | `₹0 / month during early access` OR `Free during early access` (no blank) |
| STARTER tier copy | `Early adopter pricing opening soon — join the waitlist` |
| STARTER price display | `Pricing coming soon` with CTA: `Join waitlist →` |
| PROFESSIONAL tier copy | `Priority access for growing suppliers and buyers — contact us` |
| PROFESSIONAL price display | `Contact us for pricing` |
| ENTERPRISE tier copy | `Custom plan — contact sales` |
| ENTERPRISE price display | `Contact sales` |
| Forbidden copy | `"Free forever"`, `"Paid"`, `"Trial"`, `"Checkout now"`, `"₹XX/month"` (any specific amount), blank fields |
| Forbidden elements | Checkout buttons, credit card fields, "Start free trial" button, countdown timers, false scarcity language |
| Waitlist mechanism | A mailto link or static waitlist form is acceptable; do not build a waitlist database backend in FAM-11D |
| GST display | **No GST lines** until India CA advisory is complete |
| Price approval path | Paresh approves ₹ amounts separately after CA/GST review; then a separate allowlisted commit updates pricing page |

**Implementation note for FAM-11D:**
The `/pricing` route is static content only. No backend calls. No checkout sessions.
The STARTER "Join waitlist" CTA may use a `mailto:hello@texqtic.com` link with
subject `TexQtic STARTER waitlist` until a waitlist form is separately designed and approved.

---

### DL-05 — Razorpay Readiness Ownership and Timing

**Status: LOCKED**

| Sub-decision | Locked Value |
|---|---|
| Is Razorpay checkout a launch blocker? | **NO** — confirmed (PRIT-018, D-011 parked) |
| When should the Razorpay readiness track begin? | **Immediately — in parallel with FAM-11C** |
| Rationale | The prerequisite chain is 8–12 weeks of external business processes. Starting at FAM-11C gives the best chance of Razorpay being ready by the time upgrade demand creates commercial pressure (estimated month 2–3 post-launch). |
| FAM-13A timing decision | **Open FAM-13A in parallel with FAM-11C** — design/decision only, no implementation |
| Who owns Razorpay readiness? | Paresh Patel (business/operational track, not engineering track) |
| Is FAM-13A an engineering unit? | **NO** — FAM-13A is a decision/checklist artifact. No source changes. No Razorpay code. |
| Prerequisites to formally track in FAM-13A | See tracker table below |
| Pre-Razorpay upgrade path | `Contact us` mailto CTA → Paresh manually changes plan in control plane → tenant receives confirmation |
| FAM-13A opens before, after, or concurrent with FAM-11D? | **Concurrent with FAM-11C; before or during FAM-11D** |

**FAM-13A prerequisite tracker (seed — formalize in the artifact itself):**

| # | Prerequisite | Owner | External Process | Status at FAM-11B2 |
|---|---|---|---|---|
| PR-01 | Merchant-of-record entity confirmed (D-012) | Paresh | Legal/business | Not started |
| PR-02 | Settlement model decision (D-012) | Paresh | Legal/business | Not started |
| PR-03 | India CA engagement: GST/TDS advisory for SaaS | Paresh | CA/accounting | Not started |
| PR-04 | Razorpay KYC and business account setup | Paresh | Banking/compliance | Not started |
| PR-05 | Refund and dispute policy (D-013/D-014) | Paresh | Legal | Not started |
| PR-06 | PCI boundary design | Engineering | Engineering | Not started |
| PR-07 | Payment event audit/log policy defined | Engineering | Engineering | Not started |
| PR-08 | Price tier ₹ amounts finalized (STARTER/PROFESSIONAL) | Paresh | After CA review | Blocked on PR-03 |

**Gate:** FAM-11F (self-serve checkout) may not begin until all 8 prerequisites are complete
and Paresh issues explicit authorization.

---

## 6. Final FAM-11C Implementation Constraints

### 6.1 Scope Definition

FAM-11C is the first implementation unit in the FAM-11 commercial framing sequence.
It is bounded to the tenant-facing UI layer only. No backend changes, no billing,
no schema changes, no checkout.

### 6.2 Must Include

| # | Requirement | Source |
|---|---|---|
| IC-01 | `PlanBadge` component (or inline badge) displaying `FREE — Early Access` for FREE plan tenants | DL-01, FAM-11B DD-01 |
| IC-02 | Plan badge appears in tenant workspace settings/header surface | FAM-11B Matrix 5 |
| IC-03 | Plan badge appears at onboarding completion / first landing surface (if such route exists in repo) | FAM-11B Matrix 5 |
| IC-04 | AI budget displayed as: `{aiUsage} / 50,000 tokens this month (FREE plan limit)` | FAM-11B DD-11, DL-04 |
| IC-05 | Static UI-readable feature availability matrix in tenant settings | FAM-11B DD-03 |
| IC-06 | TTP row omitted from feature availability matrix | DL-02 |
| IC-07 | NC Pool / RFQ rows included in feature availability matrix as currently operational | DL-02 |
| IC-08 | Upgrade intent CTA using approved `mailto:` link (DL-03) | DL-03 |
| IC-09 | CTA copy: context-sensitive per Matrix 5 (FAM-11B), all resolving to `hello@texqtic.com` | DL-03 |
| IC-10 | `getCommercialPlanDisplayLabel(plan)` display helper in `types.ts` | FAM-11B DD-09, DL-01 |
| IC-11 | `getCommercialPlanDisplayLabel('FREE')` returns `'FREE — Early Access'` | DL-01 |
| IC-12 | Static entitlement data in `config/entitlementDisplay.ts` (no backend call) | FAM-11B §22 |
| IC-13 | Entitlement matrix data type-safe, readonly, no import from `ai_budgets` table at MVP | FAM-11B §22.2 |

### 6.3 Must Exclude

| # | Excluded Item | Reason |
|---|---|---|
| EX-01 | Razorpay code (any) | Not a launch blocker; D-011 parked |
| EX-02 | Stripe code (any) | Not required |
| EX-03 | Billing engine | Post-MVP (P-02) |
| EX-04 | Checkout flow or checkout modal | Post-MVP |
| EX-05 | Plan-gated backend route enforcement | FAM-11E scope (post-MVP) |
| EX-06 | Schema or migration changes | No schema changes required for display-only work |
| EX-07 | AI budget enforcement changes | `aiBudget.ts` already enforces; no change needed |
| EX-08 | Feature gate middleware changes | Gates remain per-named-feature; no per-plan enforcement at MVP |
| EX-09 | Legal authority files | FAM-07 hold preserved |
| EX-10 | Exact ₹ price amounts | DL-04: not approved until CA review |
| EX-11 | TTP row in entitlement matrix | DL-02: legal hold unresolved |
| EX-12 | Analytics infrastructure build | DL-03: residual; do not build in FAM-11C |
| EX-13 | Waitlist database backend | Not needed; mailto CTA is sufficient at MVP |
| EX-14 | `governance/legal/fam-07/` creation | Forbidden |

### 6.4 Proposed Allowed Write Files for FAM-11C

| File | Change Type | Justification |
|---|---|---|
| `components/shared/PlanBadge.tsx` | Create | Plan badge component (IC-01) |
| `components/Tenant/PlanAndUsagePanel.tsx` | Create | AI budget + feature matrix + upgrade CTA (IC-02, IC-04, IC-05, IC-08) |
| `config/entitlementDisplay.ts` | Create | Static entitlement display data (IC-12, IC-13) |
| `types.ts` | Minimal edit | Add `getCommercialPlanDisplayLabel()` helper (IC-10, IC-11) |
| `App.tsx` | Minimal edit | Wire `PlanBadge` and `PlanAndUsagePanel` into tenant workspace shell |

**Explicitly NOT in FAM-11C allowlist:**
`server/**`, `server/prisma/**`, `shared/contracts/**`, `.env`, `governance/legal/fam-07/`,
`services/authService.ts` (read-only reference only), any test infrastructure files.

### 6.5 Proposed Validation Commands for FAM-11C

```powershell
# Pre-implementation preflight
git status --short
git diff --name-only

# Type check (frontend only)
pnpm --filter client typecheck

# Lint (frontend only)
pnpm --filter client lint

# Component display verification (manual or Playwright smoke check)
# 1. Navigate to tenant workspace — plan badge shows "FREE — Early Access"
# 2. AI budget bar shows "X / 50,000 tokens this month (FREE plan limit)"
# 3. Feature matrix renders; TTP row absent; NC Pool row present
# 4. Upgrade CTA link opens mailto:hello@texqtic.com with correct pre-filled template
# 5. No checkout button, no ₹ amounts, no Razorpay SDK reference anywhere

# Commit gate
git diff --name-only --cached  # must show ONLY allowlisted files
git status --short
```

### 6.6 FAM-11C Residual Register (Seed)

| ID | Residual | Priority | Gate |
|---|---|---|---|
| FAM-11C-RES-001 | Upgrade CTA click analytics event not fired at MVP | P2 | When analytics infrastructure available |
| FAM-11C-RES-002 | `aiUsage` hardcoded to 0 in resolved tenant object (App.tsx). AI budget bar shows 0/50,000 until real usage tracking reconnected | P2 | Future metering reconnection unit |
| FAM-11C-RES-003 | Plan badge only shown for FREE plan; STARTER/PROFESSIONAL/ENTERPRISE badge display to be confirmed when those plans are provisioned | P3 | After FAM-11E |

---

## 7. Final FAM-11D Constraints

### 7.1 Scope

FAM-11D creates the public plan comparison/pricing page. It is a static frontend route with
no backend dependency.

### 7.2 Copy and Design Constraints (from DL-04)

| Tier | Headline Copy | Price Display | CTA |
|---|---|---|---|
| FREE | `Early Access FREE for selected launch participants` | `Free during early access` | None (current users are already on FREE) |
| STARTER | `Early adopter pricing opening soon — join the waitlist` | `Pricing coming soon` | `Join waitlist →` → `mailto:hello@texqtic.com?subject=TexQtic%20STARTER%20waitlist` |
| PROFESSIONAL | `Priority access for growing suppliers and buyers — contact us` | `Contact us for pricing` | `Contact sales →` → upgrade `mailto:` |
| ENTERPRISE | `Custom plan — contact sales` | `Contact sales` | `Contact sales →` → upgrade `mailto:` |

### 7.3 Forbidden Elements in FAM-11D

- Exact ₹ amounts of any kind
- Checkout buttons
- Credit card input fields
- "Start free trial" or "Free trial" language
- "Free forever" language
- GST/tax lines
- Countdown timers or false urgency language
- Waitlist database backend

### 7.4 Required Route

Route: `/pricing` — accessible from public navigation and from plan badge tooltip/link in tenant UI.

---

## 8. Final FAM-13A Razorpay Readiness Constraints

### 8.1 Scope

FAM-13A is a design/decision unit only. No source changes. No Razorpay code.
Its output is a decision checklist + prerequisite tracker artifact.

### 8.2 Timing Decision (from DL-05)

**FAM-13A opens in parallel with FAM-11C.** It does not depend on FAM-11C or FAM-11D completion.
It is a business/operational track running alongside the UI implementation track.

### 8.3 Required Content for FAM-13A Artifact

1. Prerequisites tracker table (all 8 items from DL-05 table)
2. D-012 merchant-of-record decision record (Paresh decision input required)
3. D-013/D-014 refund and dispute policy framework
4. PCI boundary design notes
5. Payment event audit/log policy
6. FAM-11F gate conditions: what exactly must be true before FAM-11F (checkout) opens
7. Razorpay account setup operating procedure (external, non-engineering)

### 8.4 FAM-13A Is Not a Gate on FAM-11C or FAM-11D

FAM-13A runs in parallel. FAM-11C and FAM-11D do not wait for FAM-13A.

---

## 9. Risk Register

### R-01 — Early-Access Promise Risk

**Risk:** Users interpret `FREE — Early Access` as a permanent free tier ("early access" is
often used to mean "we're still testing, so it's free forever").

**Likelihood:** Medium — this is a common misreading of the phrase.

**Impact:** High — undermines commercial transition when paid tiers launch.

**Mitigation:**
- Tooltip or adjacent copy: "FREE — Early Access is a time-limited pilot access tier. Paid tiers launch soon."
- Support/sales messaging script locked in DL-01
- Grandfather notification in product when paid tiers launch
- Do not use "free forever" copy anywhere (forbidden in DL-04)

---

### R-02 — TTP Legal Exposure Risk

**Risk:** If TTP is shown as "Included" in any tenant-facing surface before counsel resolves
the legal hold, TexQtic is advertising a feature under active legal review. If that feature
is later modified or restricted based on counsel feedback, users who saw it as "included" may
have grounds for complaint.

**Likelihood:** Low (if DL-02 is followed) / High (if DL-02 is violated).

**Impact:** High — legal exposure, user trust damage.

**Mitigation:** DL-02 locked — TTP row omitted entirely from FAM-11C feature display matrix.
This risk is fully mitigated if DL-02 is respected during implementation.

---

### R-03 — Upgrade CTA Operational Failure Risk

**Risk:** Upgrade CTA sends email to `hello@texqtic.com` but:
(a) the mailbox is not monitored, or
(b) the email never reaches a human, or
(c) the mailto link is broken (URL encoding error).

**Likelihood:** Medium — mailto encoding is easy to get wrong; monitoring discipline required.

**Impact:** High — commercial pipeline breaks at the first click; upgrade intent is lost.

**Mitigation:**
- DL-03 provides exact URL-encoded mailto template (copy-paste without modification)
- Operator (Paresh) must confirm `hello@texqtic.com` is monitored before FAM-11C ships
- FAM-11C implementation must manually test the mailto link in multiple browsers/clients
- FAM-11C-RES-001 tracks analytics upgrade as a residual for future visibility

---

### R-04 — Pricing Page Credibility Risk

**Risk:** The pricing page shows "Pricing coming soon" for 2–3 tier cards and looks like an
incomplete or abandoned product page. For Indian B2B buyers this may signal the platform is
not commercially mature.

**Likelihood:** Medium — incomplete pricing pages are common and often interpreted negatively.

**Impact:** Medium — commercial credibility risk for STARTER/PROFESSIONAL positioning.

**Mitigation:**
- DL-04 provides specific copy per tier that signals intentionality ("Early adopter pricing
  opening soon — join the waitlist") rather than omission ("Coming soon")
- Waitlist CTA for STARTER creates a positive commercial signal (pre-launch demand capture)
- PROFESSIONAL and ENTERPRISE use "Contact us" which is credible for high-touch B2B
- Do NOT use blank price fields or "TBD" (forbidden in DL-04)

---

### R-05 — Razorpay Delay Risk

**Risk:** If FAM-13A is not opened until after FAM-11D, the 8–12 week Razorpay prerequisite
chain begins 4–6 weeks late. If upgrade demand peaks at month 2 post-launch, Razorpay may
not be ready at month 3.

**Likelihood:** Medium — depends on when upgrade demand materializes.

**Impact:** High — commercial pipeline has live upgrade intent with no payment mechanism.

**Mitigation:** DL-05 locked — FAM-13A opens in parallel with FAM-11C (not after FAM-11D).
Paresh begins PR-01 through PR-04 (external processes) immediately after this artifact is
committed, without waiting for FAM-13A artifact to be written.

---

## 10. Recommended Next Execution Step

### 10.1 Immediate (Day 0)

1. **Open FAM-13A in parallel** — Paresh begins external processes (PR-01 merchant-of-record,
   PR-04 Razorpay KYC, PR-03 CA engagement) immediately. Engineering opens the FAM-13A design
   artifact alongside FAM-11C.

2. **Confirm `hello@texqtic.com` is live and monitored** — Before FAM-11C ships, Paresh must
   confirm this mailbox is active and will receive upgrade intent emails.

3. **Open FAM-11C** — Implementation unit: plan badge, AI budget display, feature matrix
   (without TTP), upgrade CTA to `hello@texqtic.com`.

### 10.2 Sequence

```
CURRENT: FAM-11B2 decision lock COMPLETE

→ PARALLEL TRACKS:

  Track A (Engineering): FAM-11C → FAM-11D
    FAM-11C: Plan badge + AI budget display + feature matrix + upgrade CTA
    FAM-11D: Public pricing/plan comparison page (/pricing route)

  Track B (Business, non-blocking): FAM-13A
    FAM-13A: Razorpay readiness checklist design + D-012 merchant-of-record decision record
    Paresh begins: PR-01, PR-03, PR-04 (external processes)

→ POST-MVP:
  FAM-11E: Backend plan-tier feature gates
  FAM-11F: Self-serve checkout (after FAM-13A prerequisites complete)
```

---

## 11. Scope Safety Confirmation

**This artifact (FAM-11B2) made ZERO source changes.**

| Safety Check | Status |
|---|---|
| No source files modified | CONFIRMED — decision-lock artifact only |
| No schema changes | CONFIRMED |
| No migration files | CONFIRMED |
| No billing infrastructure added | CONFIRMED |
| No payment gateway code | CONFIRMED |
| No Razorpay/Stripe code | CONFIRMED |
| No secrets printed or modified | CONFIRMED |
| No .env files modified | CONFIRMED |
| FAM-07 legal hold preserved | CONFIRMED — `governance/legal/fam-07/` absent; `HOLD_FOR_HUMAN_LEGAL_INPUTS` unchanged; `FTR-LEGAL-003` remains MVP_CRITICAL/OPEN; `legal_approved_transition_allowed=false` |
| FAM-08 state preserved | CONFIRMED — FAM-08 remains `CLOSE_READY_WITH_RESIDUALS`; no changes |
| FAM-09 state preserved | CONFIRMED — FAM-09 remains `CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS`; no changes |
| FAM-10 state preserved | CONFIRMED — FAM-10 remains `VERIFIED_COMPLETE`; no changes |
| FAM-11B remains design authority | CONFIRMED — FAM-11B design decisions unchanged; this artifact adds decision locks, not design changes |
| FAM-11B not implementation authority alone | CONFIRMED — FAM-11B2 decision locks are NOW required before FAM-11C begins. Both artifacts together constitute the implementation authority for FAM-11C. |
| LAUNCH-FAMILY-INDEX.md untouched | CONFIRMED |
| NEXT-ACTION.md untouched | CONFIRMED |
| No legal authority files created | CONFIRMED |

---

## 12. Final Enum

`FAM_11B2_COMMERCIAL_FRAMING_DECISION_LOCK_COMPLETE`

---

*End of FAM-11B2-COMMERCIAL-FRAMING-DECISION-LOCK-001*
