# FAM-11C — Canonical Vocabulary and Tier Awareness Implementation
## Closure Artifact

**Unit:** FAM-11C  
**Artifact ID:** FAM-11C-CANONICAL-VOCABULARY-AND-TIER-AWARENESS-IMPLEMENTATION-001  
**Commit:** `cd2b2730`  
**Branch:** main  
**Date:** 2026-06-03  
**Author:** Paresh Patel  
**Status:** `FAM_11C_TIER_AWARENESS_IMPLEMENTED_BLOCKED_MAILBOX_CONFIRMATION`

---

## 1. Unit Summary

FAM-11C is the first source-code implementation unit in the FAM-11 commercial framing family. It introduces tenant-facing plan awareness, a static feature entitlement matrix, and an upgrade CTA to the TexQtic platform — all as display-only surfaces with zero backend enforcement, zero checkout, and zero payment infrastructure.

Five new items were delivered:
1. `getCommercialPlanDisplayLabel` helper in `types.ts`
2. `components/shared/PlanBadge.tsx` — reusable plan badge component
3. `config/entitlementDisplay.ts` — static entitlement display matrix
4. `components/Tenant/PlanAndUsagePanel.tsx` — full plan, usage, and feature panel
5. Wire-up in `App.tsx` SETTINGS block

---

## 2. Preflight Results

| Check | Result |
|---|---|
| `git status --short` | Empty — clean tree |
| `git rev-parse --short HEAD` | `b1967dec` (confirmed) |
| `git merge-base --is-ancestor b1967dec HEAD` | exit=0 — b1967dec is ancestor of HEAD |
| `governance/legal/fam-07/` exists | **False** — FAM-07 gate confirmed absent |
| `governance/legal/fam-07/supplier-onboarding-terms-authority.json` exists | **False** |
| `artifacts/.../FAM-11B2-COMMERCIAL-FRAMING-DECISION-LOCK-001.md` | True |
| `artifacts/.../FAM-11B-COMMERCIAL-FRAMING-AND-PRE-MVP-TIER-AWARENESS-DESIGN-001.md` | True |
| `artifacts/.../FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001.md` | True |

All guards passed. Execution authorized.

---

## 3. Dirty Tree at Start

None. Tree was clean at `b1967dec` when FAM-11C execution began.

---

## 4. Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `types.ts` | Read full structure — confirmed `CommercialPlan`, `normalizeCommercialPlan`, `TenantConfig.aiBudget` and `TenantConfig.aiUsage` |
| `App.tsx` lines 1–200 | Read import block — confirmed `normalizeCommercialPlan` imported, identified Tenant component import pattern |
| `App.tsx` lines 2655–2680 | Read `currentTenant` resolver — confirmed `aiUsage: 0, // No longer tracked in mock format` and `billingStatus: 'CURRENT'` hardcoded |
| `App.tsx` lines 5820–5900 | Read full SETTINGS block — confirmed existing Workspace Profile section structure and injection point |
| `App.tsx` lines 7940–7990 | Read SETTINGS button and ExperienceShell context |
| `components/shared/index.ts` | Read barrel — confirmed no `PlanBadge` existed |
| `components/Tenant/` directory listing | Confirmed no `PlanAndUsagePanel`, no plan badge, no upgrade CTA |
| `config/` directory listing | Confirmed no `entitlementDisplay.ts` |

---

## 5. Files Changed

| File | Action | Notes |
|---|---|---|
| `types.ts` | Modified | Added `getCommercialPlanDisplayLabel` export |
| `App.tsx` | Modified | Added import + `<PlanAndUsagePanel>` in SETTINGS block |
| `components/shared/PlanBadge.tsx` | Created | New component |
| `components/Tenant/PlanAndUsagePanel.tsx` | Created | New component |
| `config/entitlementDisplay.ts` | Created | New static config |

---

## 6. Helper Changes (`types.ts`)

### Added: `getCommercialPlanDisplayLabel`

```typescript
export const getCommercialPlanDisplayLabel = (plan: string | null | undefined): string => {
  const normalized = normalizeCommercialPlan(plan);
  if (normalized === 'FREE') return 'FREE \u2014 Early Access';
  return normalized;
};
```

- Returns `'FREE — Early Access'` for all FREE/TRIAL/BASIC/unknown inputs (via `normalizeCommercialPlan`)
- Returns bare tier name for STARTER, PROFESSIONAL, ENTERPRISE
- Display-only: must NOT be used for DB writes, API calls, or logic gates
- `CommercialPlan` internal value unchanged — remains `'FREE'`
- JSDoc explicitly states this is a display wrapper

---

## 7. PlanBadge Component Behavior

**File:** `components/shared/PlanBadge.tsx`

- Props: `plan: string | null | undefined`, optional `className`
- Calls `normalizeCommercialPlan` + `getCommercialPlanDisplayLabel` internally
- FREE tier: slate styling (`bg-slate-100 text-slate-700`) — neutral, no "trial" or "paid" implication
- STARTER: blue
- PROFESSIONAL: indigo
- ENTERPRISE: violet
- `aria-label` attribute: `Current plan: FREE — Early Access` (or appropriate tier)
- No tooltip, no billing hint, no "free forever"

---

## 8. PlanAndUsagePanel Component Behavior

**File:** `components/Tenant/PlanAndUsagePanel.tsx`

### Panel sections:

**Header:**
- "Plan & Features" eyebrow label
- `<PlanBadge>` showing plan label
- Tier copy from `TIER_UPGRADE_COPY` (locked labels only):
  - FREE: "Free during early access"
  - STARTER: "Early adopter pricing opening soon — join the waitlist"
  - PROFESSIONAL: "Contact us for pricing"
  - ENTERPRISE: "Contact sales"

**Upgrade CTA (FREE only):**
- "Interested in upgrading?" callout block
- Body: "Paid tiers will open later. Reach out to be among the first to access STARTER or PROFESSIONAL."
- `<a href="mailto:...">Contact us to upgrade</a>` — exact DL-03 locked href
- CTA only rendered when `normalized === 'FREE'`

**AI usage display (no fake progress bar):**
- Shows: `FREE plan AI limit: {aiBudgetDisplay} tokens/month`
- `aiBudgetDisplay` = `aiBudget.toLocaleString()` if `aiBudget > 0`, else fallback `'50,000'`
- Shows: `Usage tracking display coming soon.`
- **No progress bar rendered** — `aiUsage: 0` in App.tsx is confirmed placeholder; displaying `0 / 50,000` would be false data

**Feature matrix (collapsible):**
- Toggle button `Show/Hide feature availability`
- Table: Feature | FREE | STARTER | PROFESSIONAL | ENTERPRISE
- Category grouping (Core workspace, Network Commerce, AI, Compliance, Platform, Support)
- Per-cell `AvailabilityCell` with colored badges
- Disclaimer: "Feature availability is indicative and subject to change. No checkout or payment is available at this time."

---

## 9. Entitlement Matrix Summary

**File:** `config/entitlementDisplay.ts`

| Category | Feature | FREE |
|---|---|---|
| Core workspace | B2B workspace | Included |
| Core workspace | Supplier profile | Included |
| Core workspace | Product & catalog management | Included |
| Core workspace | Team management | Included |
| Network Commerce | RFQ (request for quote) | Included |
| Network Commerce | Procurement Pools | Included |
| Network Commerce | Aggregator workspace | Coming soon |
| AI | AI Document Intelligence | Included |
| AI | Extended AI budget | Coming soon |
| Compliance | Certifications & compliance | Included |
| Compliance | Audit logs | Included |
| Platform | White-label overlay | Coming soon |
| Platform | API access | Coming soon |
| Platform | Custom integrations | Coming soon |
| Support | Community support | Included |
| Support | Priority support | Coming soon |
| Support | Dedicated onboarding assistance | Coming soon |

---

## 10. TTP Omission Confirmation

**TTP (Trade Transaction Platform) is absent from:**
- `config/entitlementDisplay.ts` — no TTP row
- `components/Tenant/PlanAndUsagePanel.tsx` — no TTP reference
- `components/shared/PlanBadge.tsx` — no TTP reference

**Reason:** `HOLD_FOR_COUNSEL_FEEDBACK` — `FTR-LEGAL-003` is open `MVP_CRITICAL`. `legal_approved_transition_allowed=false`. TTP is gated at backend (`ttp_enabled=false`). No TTP surface is permitted in this unit.

NC Pool / RFQ rows: **present** — operational in NC Phase 1, confirmed by prior repo audit.

---

## 11. Upgrade CTA and Manual Validation

**Upgrade CTA href (exact, per DL-03):**
```
mailto:hello@texqtic.com?subject=TexQtic%20upgrade%20interest&body=Company%2FOrg%20name%3A%20%0ACurrent%20plan%3A%20FREE%20%E2%80%94%20Early%20Access%0AInterested%20tier%3A%20%0AUse%20case%3A%20%0AContact%20person%3A%20%0A
```

**Manual validation checklist:**
- [ ] Badge renders `FREE — Early Access` (not `FREE`, not `Trial`)
- [ ] Badge does NOT render "free forever", "always free", "trial", "paid"
- [ ] Upgrade CTA mailto opens exactly as above
- [ ] No ₹ amounts anywhere in panel
- [ ] No checkout flow, no Razorpay, no Stripe
- [ ] TTP row absent from feature matrix
- [ ] NC Pool / RFQ rows present in matrix
- [ ] AI section shows static limit copy, no progress bar with `0 / 50,000`
- [ ] Feature matrix togglable — collapses and expands
- [ ] No `/pricing` route or link added

---

## 12. Mailbox Confirmation Status

**Status: UNCONFIRMED by engineering**

The upgrade CTA sends to `hello@texqtic.com`. Engineering cannot confirm this mailbox is monitored. Paresh must confirm:

> "Is `hello@texqtic.com` actively monitored and will upgrade inquiries be responded to promptly?"

Until confirmed: enum remains `FAM_11C_TIER_AWARENESS_IMPLEMENTED_BLOCKED_MAILBOX_CONFIRMATION`.

On Paresh's confirmation, enum advances to `FAM_11C_TIER_AWARENESS_IMPLEMENTATION_COMPLETE`.

---

## 13. AI Usage Display Decision

**Decision:** Static limit copy only. No progress bar.

**Evidence:**
- `App.tsx` line ~2672: `aiUsage: 0, // No longer tracked in mock format` — confirmed placeholder
- `aiBudget: tenant.aiBudget?.monthlyLimit || 0` — real data from DB
- Displaying `0 / 50,000` would imply accurate usage data, which it is not

**What renders:**
```
FREE plan AI limit: 50,000 tokens/month
Usage tracking display coming soon.
```

(Fallback to `'50,000'` if `aiBudget === 0`; actual DB value used if present)

---

## 14. Workspace Placement

`PlanAndUsagePanel` is wired into **`appState === 'SETTINGS'` (non-white-label path)** in `App.tsx`.

- Added as a second section after the existing Workspace Profile `<section>` block
- Inside the outer `<div className="space-y-6 animate-in fade-in duration-500">`
- Props passed: `plan={currentTenant.commercial_plan ?? currentTenant.plan}`, `aiBudget={currentTenant.aiBudget}`, `tenantName={currentTenant.name}`
- `commercial_plan` is the canonical carrier; `.plan` is the compatibility fallback

Settings button visibility: controlled by `tenantCanAccessSharedSettingsSurface` (pre-existing logic — not modified in this unit).

---

## 15. Validation Results

| Validation | Result |
|---|---|
| `pnpm tsc --noEmit` | **PASS** — no output, exit 0 |
| `pnpm lint` — new files | **PASS** — zero errors or warnings in new files |
| `pnpm lint` — pre-existing errors | Present in non-allowlisted files (GstVerificationQueue, InvoiceOversight, VpcConsole, PublicAggregatorPreview, PublicInquiryPage, PublicNavbar, App.tsx line 2400) — all pre-existed before this unit |
| `git diff --name-only --cached` | `App.tsx`, `components/Tenant/PlanAndUsagePanel.tsx`, `components/shared/PlanBadge.tsx`, `config/entitlementDisplay.ts`, `types.ts` — exactly 5 allowlisted files |
| `git status --short` post-commit | Empty — clean tree |

---

## 16. Non-Goals Preserved

| Non-goal | Status |
|---|---|
| Backend plan enforcement | Not implemented — display only |
| Razorpay / Stripe / checkout | Not present — zero payment infrastructure |
| `/pricing` page | Not created |
| TTP row or surface | Absent |
| Analytics infrastructure | Not added |
| FAM-07 legal folder | Not created |
| Exact ₹ pricing amounts | Not present |
| Billing engine or status indicators | Not present |
| Backend aiBudget modification | Not touched |
| `aiBudget.ts` modification | Not touched |
| Governance tracker modifications | Not touched |

---

## 17. Residuals / Follow-Up

| Item | Notes |
|---|---|
| Mailbox confirmation | Paresh must confirm `hello@texqtic.com` monitoring before advancing enum |
| `aiUsage` real data | When real usage data becomes available, PlanAndUsagePanel should be updated to render a real progress bar. No change to component API needed — add `aiUsage?: number` prop at that time |
| `tenantCanAccessSharedSettingsSurface` gate | Currently requires sharedAdminCore or white-label capability. If ALL tenants should see plan info, the settings button visibility may need adjustment in a future unit |
| `components/shared/index.ts` barrel | `PlanBadge` was not added to the barrel export — add if needed by a future importing unit |
| FAM-11D | Next unit: pricing page / tier comparison page (separate unit, not in this scope) |
| FAM-13A | Parallel track: Razorpay integration |

---

## 18. Scope Safety 12-Item Confirmation

| # | Check | Status |
|---|---|---|
| 1 | Only allowlisted files modified | ✅ Confirmed — 5 files, all allowlisted |
| 2 | No backend/server files touched | ✅ Confirmed |
| 3 | No Prisma schema or migrations touched | ✅ Confirmed |
| 4 | No governance tracker files modified | ✅ Confirmed |
| 5 | No TTP surface created | ✅ Confirmed — TTP absent from all new files |
| 6 | No FAM-07 folder created | ✅ Confirmed — governance/legal/fam-07 does not exist |
| 7 | No Razorpay/Stripe/payment code introduced | ✅ Confirmed |
| 8 | No exact ₹ pricing amounts rendered | ✅ Confirmed |
| 9 | No fake aiUsage progress bar | ✅ Confirmed — static copy only |
| 10 | No `/pricing` page or route | ✅ Confirmed |
| 11 | No analytics infrastructure | ✅ Confirmed |
| 12 | Upgrade CTA matches DL-03 locked href exactly | ✅ Confirmed |

---

## 19. Final Enum

```
FAM_11C_TIER_AWARENESS_IMPLEMENTED_BLOCKED_MAILBOX_CONFIRMATION
```

Advances to `FAM_11C_TIER_AWARENESS_IMPLEMENTATION_COMPLETE` on Paresh's confirmation that `hello@texqtic.com` is actively monitored.

---

## 20. Recommended Next Unit

**FAM-11D** — Pricing / tier comparison page (display-only `/pricing` route).  
**FAM-13A** — Razorpay integration (parallel track, separate family boundary).

---

*Artifact committed under git-ignored `artifacts/` path — staged with `git add -f`.*
