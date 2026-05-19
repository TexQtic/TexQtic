# TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001

**Status:** VERIFIED_COMPLETE
**Type:** GOVERNANCE_SCAN (read-only output — not implementation authority)
**Layer 0 posture at open:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`
**Layer 0 posture at close:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` (UNCHANGED)
**Predecessor unit:** `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001`
**Successor unit:** `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`
**Commit hash:** `8ec5515bb3ed4a0b568f0112a038951e12d2005c`
**Created:** 2026-07-14
**Closed:** 2026-07-14

---

## §1 Unit Summary

This unit performs a **governance-only scan** to identify missing capability families,
ungoverned feature areas, and guardrail gaps in the TexQtic Launch Readiness Hub (TLRH)
before `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` opens.

The scan evaluates 10 candidate groups (Groups A–J) against all 13 existing TLRH documents
and performs a high-level inspection of the repo structure. No implementation was performed.
No family cycle was opened. No product or legal decisions were made.

**Net outputs:**
- 1 new governance document: `governance/launch-readiness/MISSING-FAMILY-AND-FEATURE-SCAN.md`
- 4 new PRIT entries: PRIT-032, PRIT-033, PRIT-034, PRIT-035
- 2 new Risk entries: R-013, R-014
- 1 README.md update: item 14 added to read order and §3 table

---

## §2 Objective

Answer: **What capability areas, feature groups, or guardrail items are absent from the
current TLRH registers that should be represented before any family cycle opens?**

Deliverables:
- `governance/launch-readiness/MISSING-FAMILY-AND-FEATURE-SCAN.md` — the scan document
- `governance/units/TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001.md` — this file
- Optional additive updates to PRIT register, Risk register, README (all additive only)

---

## §3 Scope

| In scope | Out of scope |
|---|---|
| Evaluate 10 candidate groups (A–J) against all TLRH registers | Implementing any item |
| Inspect repo structure for ungoverned code (high level only) | Opening any family cycle |
| Identify new PRIT / Risk candidates | Making payment, legal, or product decisions |
| Additive register updates (PRIT-032–035, R-013, R-014) | Changing Layer 0 posture |
| README.md pointer update (item 14) | Modifying frontend/backend/Prisma/OpenAPI |
| Identifying classification conflicts in existing registers | Resolving those conflicts (Paresh must do that) |
| Confirming already-represented items | Deep audit of any single family (done at family opening) |

---

## §4 Authoritative Documents Inspected

All 13 existing TLRH documents plus 3 Layer 0 control files and TECS.md were read before
this unit was written. See `MISSING-FAMILY-AND-FEATURE-SCAN.md §3` for the full table with
key observations per document.

---

## §5 Repo Structure Inspected

The following repo locations were inspected at a high level:

- `components/` — Auth/, Cart/, ControlPlane/, Onboarding/, Public/, shared/, Tenant/
- `services/` — all service files
- `server/src/routes/` — all route files including public.ts, tenant/, control/, admin-cart-summaries.ts
- `server/src/services/email/email.service.ts` — email infrastructure
- `server/src/services/impersonation.service.ts` — impersonation service

No security audit, code quality review, or implementation audit was performed.
Inspection was limited to presence/absence of components, services, and routes to identify
ungoverned code areas.

---

## §6 Scan Findings — Missing Items

Four new PRIT candidates and two new Risk candidates were identified:

### PRIT-032 — Cart-as-Intent Buyer Surface Governance

**Finding:** `components/Cart/Cart.tsx`, `services/cartService.ts`,
`server/src/routes/admin-cart-summaries.ts` (using `prisma.marketplaceCartSummary`), and
`components/ControlPlane/CartSummariesPanel.tsx` all exist in the repo. No governing family,
PRIT, FTR, or design unit exists for this code. This is the most significant ungoverned code
finding from the scan — live code with implicit design decisions and no authoritative artifact
to govern them.

**Proposed destination:** FAM-01 (B2C Browse) opening audit or a dedicated buyer commerce
family cycle.
**Provisional priority:** P2 / PILOT_REQUIRED
**Requires Paresh decision:** YES — what is the authorized cart scope for the Surat pilot?

---

### PRIT-033 — Supplier Inquiry Response Workflow (Tenant Dashboard Inquiry Inbox)

**Finding:** The inquiry loop in TexQtic ends at a DB write. `POST /inquiry/submit` in
`server/src/routes/public.ts` writes the inquiry to the database. No tenant-facing route
or UI surface exists for a supplier to see incoming inquiries or respond to them. No tenant
route in `server/src/routes/tenant/` handles inquiry viewing. No inquiry inbox component
exists in `components/Tenant/`. No PRIT, FTR, or family currently governs this gap.

Without supplier response capability, a buyer who submits an inquiry has no visibility into
whether it was received, and a supplier has no platform surface to respond. The core
value proposition of the inquiry workflow is unverifiable without this.

**Proposed destination:** FAM-03 (Inquiry) or FAM-08 (Tenant Core Workspace) — Paresh to decide.
**Provisional priority:** P1 / MVP_CRITICAL
**Requires Paresh decision:** YES — which family owns the supplier inbox? What is the minimum
inbox capability for the Surat pilot?

---

### PRIT-034 — Public Legal Pages Bundle (Privacy + Terms + Cookie Stance + DSAR Path)

**Finding:** `FTR-LEGAL-002` / `PRIT-011` covers the inline privacy notice on the inquiry
form. `FTR-LEGAL-003` / `PRIT-012` covers the supplier ToS acceptance flow. But no
standalone public-facing legal pages exist in the repo:
- No `/privacy` page component
- No `/terms` page component
- No cookie/analytics consent stance
- No data subject access/deletion request path

`D-5` in `MVP-MUST-HAVES-CHECKLIST.md` (GDPR/data handling basics) is `NOT_ASSESSED / P1`
and is unlinked to any PRIT or FTR.

Without a public privacy policy page, the platform should not collect any personal data from
public visitors. This is a prerequisite for deploying any analytics tooling (PRIT-035).

**Proposed destination:** Standalone unit scoped under FAM-03 (public surface) or FAM-07.
**Provisional priority:** P1 / MVP_CRITICAL
**Requires Paresh decision:** YES — legal content, DPDP/GDPR stance, counsel involvement.

---

### PRIT-035 — Product Analytics / Funnel Tracking Infrastructure

**Finding:** No analytics service exists in `services/`. No GA4, Mixpanel, Segment, PostHog,
or comparable analytics integration is present in the repo. The `buyer_inquiry.created.v1`
event is defined in `server/src/events.ts` but is commented as a "future INQUIRY-004
emission" — it is not currently being emitted. Without any funnel tracking, the Surat pilot
will produce no actionable data about public-page conversion, inquiry funnel performance, or
supplier onboarding rates.

**Proposed destination:** Infrastructure choice in FAM-10 (Platform Ops); event
instrumentation in FAM-01/FAM-02 (public surface family cycles).
**Provisional priority:** P2 / PILOT_REQUIRED
**Requires Paresh decision:** YES — tooling choice (GA4, Mixpanel, Segment, PostHog, etc.).
PRIT-034 (cookie consent stance) must be decided first if analytics captures any PII.

---

### R-013 — Notification Classification Conflict (ROADMAP POST_MVP vs. CHECKLIST P0)

**Finding:** Two TLRH documents assign contradictory priority classifications to the same
capability:
- `MVP-LAUNCH-READINESS-ROADMAP.md` row 26: messaging/notifications = `NOT_ASSESSED / P3 / POST_MVP`
- `MVP-MUST-HAVES-CHECKLIST.md` I-4: "Inquiry notification reaches supplier/admin" = `NOT_ASSESSED / P0`

`BS-002` in the risk register captures the notification delivery risk (SMTP not verified in
production) but does not capture this classification conflict as a governance issue.

If ROADMAP row 26 is used as the planning input during family selection, I-4 P0 will be
deprioritized or missed entirely. This could leave the inquiry notification permanently
unimplemented while the platform considers it resolved.

**Paresh decision required:** YES — resolve before `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`.

---

### R-014 — Cart Code Ungoverned: Implicit Design Decisions Without a Governing Unit

**Finding:** See PRIT-032 above. `Cart.tsx`, `cartService.ts`, `admin-cart-summaries.ts`,
and `CartSummariesPanel.tsx` contain live code with implicit design decisions — cart data
model, cart_id cursor semantics, admin visibility scope, cart lifecycle — that have no
authoritative design artifact. A family cycle opening that audits the buyer commerce surface
will encounter this code unexpectedly.

**Mitigation:** PRIT-032 (added by this scan) brings the cart under governance. The family
opening audit must explicitly inspect these files before proposing any cart design.

---

## §7 Scan Findings — Confirmed Already Represented

See `MISSING-FAMILY-AND-FEATURE-SCAN.md §7` for the full table of 30+ items confirmed as
already adequately represented in TLRH registers.

Key examples:
- Invite email (`sendInviteMemberEmail`) — implemented in `email.service.ts`
- Privacy notice for inquiry form — `FTR-LEGAL-002` / `PRIT-011`
- Supplier ToS acceptance — `FTR-LEGAL-003` / `PRIT-012`
- Error monitoring — `FTR-OPS-001` / `PRIT-013`
- Rollback procedure — `FTR-OPS-003` / `PRIT-015`
- B2C public browse, product detail, collections — FAM-01/FAM-02 VERIFIED_COMPLETE
- Inquiry submission (public) — I-1–I-3 PRODUCTION_VERIFIED
- SEO metadata/sitemap/JSON-LD — FAM-04 PRODUCTION_VERIFIED (partial)
- Control plane tenant ops — `FTR-CP-001` / `PRIT-010`
- B2B no-money-movement boundary — `PRIT-030` CONFIRMED_BOUNDARY

---

## §8 New PRIT Additions

| PRIT ID | Title | Provisional Priority | Launch Class | Paresh Decision? | Added |
|---|---|---|---|---|---|
| PRIT-032 | Cart-as-intent buyer surface governance | P2 | PILOT_REQUIRED | YES | ✅ |
| PRIT-033 | Supplier inquiry response workflow — tenant dashboard inquiry inbox | P1 | MVP_CRITICAL | YES | ✅ |
| PRIT-034 | Public legal pages bundle — privacy policy, terms page, cookie stance, DSAR path | P1 | MVP_CRITICAL | YES | ✅ |
| PRIT-035 | Product analytics and funnel tracking infrastructure | P2 | PILOT_REQUIRED | YES | ✅ |

**Next available PRIT ID after this unit:** PRIT-036

---

## §9 New Risk Additions

| Risk ID | Category | Title | Priority | Added |
|---|---|---|---|---|
| R-013 | GOVERNANCE | Notification classification conflict: ROADMAP row 26 POST_MVP vs. CHECKLIST I-4 P0 | P1 | ✅ |
| R-014 | GOVERNANCE | Cart code ungoverned — implicit design decisions without a governing unit | P2 | ✅ |

**Next available Risk ID after this unit:** R-015

---

## §10 Items Deferred to Family Opening Audit

The following items were evaluated but deliberately deferred to the relevant family cycle
opening rather than added to registers now:

| Item | Family | Rationale |
|---|---|---|
| Resend-invite control plane capability | FAM-10 | FTR-CP-001 general scope covers this; exact gap needs code inspection at family open |
| Tenant deactivation path | FAM-10 | FTR-CP-001 scope; inspection at FAM-10 opening |
| Event stream / failed event observability | FAM-10 | EventStream.tsx exists; gap needs inspection not scan-level assumption |
| Supplier staff / member role boundary | FAM-07/FAM-08 | Code exists; formal matrix needs full role audit, not scan-level assumption |
| Anonymous shopper vs. authenticated buyer auth boundary | FAM-06 | Depends on D-012 and PRIT-032 scope |
| Supabase backup plan tier verification | FAM-10 | Operational check, not repo work |
| Safe demo seed policy documentation | FAM-09 | NC Phase 1 seed script exists; policy needs formal confirmation at FAM-09 |

---

## §11 Items Excluded as Out-of-Repo Business / GTM

The following were evaluated and excluded as business/GTM decisions outside repo scope.
No PRIT, FTR, or Risk was created for these:

- Pricing / subscription commercial model (D-008 already parked)
- Investor pitch or fundraising materials
- Sales script or field materials
- B2B wholesale pricing strategy
- Marketing channel / campaign decisions
- Customer success / support SLA
- Surat pilot supplier selection
- Brand identity / logo / design tokens
- India DPDP vs. GDPR regulatory stance (requires external counsel)

---

## §12 README.md Update

**File modified:** `governance/launch-readiness/README.md`

Changes made:
1. Added item 14 to §2 read order:
   `MISSING-FAMILY-AND-FEATURE-SCAN.md` — pre–first-family-cycle scan; read before
   `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`; identifies PRIT-032–035 and R-013, R-014

2. Added row to §3 table:
   `MISSING-FAMILY-AND-FEATURE-SCAN.md | Pre–first-family-cycle scan of missing families,
   features, and guardrails; identifies PRIT-032–035 and risks R-013/R-014; scan only,
   not implementation authority`

3. Updated "Last updated" to 2026-07-14.

---

## §13 PRIT Register Update

**File modified:** `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`

Changes made (additive only):
1. Added PRIT-032 through PRIT-035 rows to Part A table
2. Added PRIT-032 through PRIT-035 rows to Part B table (with dependency/blocker detail)
3. Updated "Next available PRIT ID" note from `PRIT-032` to `PRIT-036`
4. Added `✅ PRIT-032 THROUGH PRIT-035 ADDED VIA TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001 (2026-07-14)` changelog block

No existing PRIT rows were modified or removed.

---

## §14 Blind-Spot/Risk Register Update

**File modified:** `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`

Changes made (additive only):
1. Added R-013 (notification classification conflict) to §5 Risks table
2. Added R-014 (cart code ungoverned) to §5 Risks table
3. Added update history row dated 2026-07-14

No existing Risk, BS, or HD rows were modified or removed.
Next available Risk ID: R-015. Next BS ID: BS-008. Next HD ID: HD-007 (all unchanged).

---

## §15 Commit Hash

**`8ec5515bb3ed4a0b568f0112a038951e12d2005c`**

---

## §16 Pre-Implementation Discipline

| Discipline gate | Status |
|---|---|
| No implementation proposed or implied | ✅ PASS |
| No family cycle opened | ✅ PASS |
| No payment, legal, or product decisions made | ✅ PASS |
| Only additive register changes | ✅ PASS |
| Pre-existing unstaged M files untouched (PublicSupplierProfile.tsx, public-referral-landing.test.tsx) | ✅ PASS |
| No frontend/backend/Prisma/schema/OpenAPI/event contract changes | ✅ PASS |
| Layer 0 posture unchanged | ✅ PASS (HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK) |

---

## §17 Forbidden Actions (Confirmed Not Taken)

| Forbidden action | Status |
|---|---|
| `prisma migrate dev` or `prisma db push` | NOT TAKEN |
| Modifying `.env` or any connection string | NOT TAKEN |
| Staging `components/Public/PublicSupplierProfile.tsx` | NOT TAKEN |
| Staging `tests/frontend/public-referral-landing.test.tsx` | NOT TAKEN |
| Creating implementation code, routes, services, or schemas | NOT TAKEN |
| Opening a family cycle | NOT TAKEN |
| Making a payment/checkout/commission/GTM decision | NOT TAKEN |
| Using `npx prisma` instead of `pnpm -C server exec prisma` | NOT TAKEN |
| Recording GTM/marketing/business items as repo requirements | NOT TAKEN |
| Marking any item MVP_CRITICAL without governance backing | NOT TAKEN |

---

## §18 Static Gates (N/A for Governance-Only Unit)

No runtime code was changed. Static gates (T1–T4 per TECS.md) do not apply to this unit.
TECS-GR-007 (tenant context integrity proof) does not apply — no implementation.

---

## §19 Files Modified

| File | Change type | Description |
|---|---|---|
| `governance/launch-readiness/MISSING-FAMILY-AND-FEATURE-SCAN.md` | CREATED | Full scan document — core deliverable of this unit |
| `governance/launch-readiness/README.md` | MODIFIED | Item 14 added to read order; §3 table row added; last updated date updated |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | MODIFIED | PRIT-032–035 added to Part A and Part B tables; next PRIT ID updated; changelog added |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | MODIFIED | R-013, R-014 added to risks table; update history row added |
| `governance/units/TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001.md` | CREATED | This file |

**Files NOT modified (pre-existing unstaged M files — never staged):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §20 Governance Risks

| Risk | Mitigation |
|---|---|
| PRIT-032–035 provisional priority classifications may not match Paresh's intent | All marked PARESH_REQUIRED; Paresh must confirm at first family selection |
| R-013 notification conflict resolution not included in this unit | Flagged explicitly; must be resolved before FIRST-FAMILY-CYCLE-SELECTION-001 planning begins |
| Cart code (PRIT-032, R-014) was not fully audited | Scan was surface-level; full audit must happen at the family cycle opening |
| Legal content for PRIT-034 may require external counsel review | Noted; gated on Paresh decision; no implementation proposed |
| PRIT-035 analytics tooling may affect PRIT-034 cookie consent stance | Dependency documented; PRIT-034 must be decided first if analytics captures PII |

---

## §21 Next Unit

`TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`

Pre-requisites before that unit opens:
1. Layer 0 `HOLD_FOR_AUTHORIZATION` must be released (Paresh authorizes)
2. R-013 notification conflict should be resolved (or explicitly deferred by Paresh)
3. PRIT-032–035 should be confirmed or rejected by Paresh at the selection meeting
4. This unit (TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001) must be VERIFIED_COMPLETE

---

## §22 Version History

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-07-14 | Created — scan complete; PRIT-032–035 and R-013/R-014 identified and added to registers |
