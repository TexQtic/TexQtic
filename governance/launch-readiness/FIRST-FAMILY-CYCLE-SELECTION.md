# FIRST-FAMILY-CYCLE-SELECTION.md — First Launch Family Cycle and Soft-Launch Prerequisite Queue

**Hub:** `governance/launch-readiness/`
**Unit:** `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`
**Status:** SELECTION_COMPLETE
**Authority class:** Governance selection only — not a family opening; not a repo-truth audit; not an implementation authorization; not a Layer 0 change
**Date:** 2026-07-14
**Authored by:** Copilot/Design unit — Paresh Patel, TexQtic founder

---

> **AUTHORITY BOUNDARY**
>
> This document records the formal selection of the **first full family cycle** and the
> **standalone soft-launch prerequisite queue** for TexQtic. It does not open a family cycle.
> It does not begin a repo-truth audit. It does not authorize any implementation. It does not
> modify Layer 0. Family opening, repo-truth inspection, and implementation are each separate
> governance steps that require their own explicitly authorized units.

---

## 1. Purpose

This document formally selects:

1. **The first full family cycle** to be opened after Layer 0 `HOLD_FOR_AUTHORIZATION` releases
2. **The standalone soft-launch prerequisite queue** — units that may be opened before or alongside
   the first family cycle because they are not family-audit-gated

This selection exists to:
- Provide a durable, auditable record of the selection decision
- Prevent the first family cycle from being chosen ad hoc or implicitly
- Identify the soft-launch prerequisite units that must be queued separately from the family audit
- Give Paresh a clear view of what needs to happen, in what sequence, before the Surat pilot
  can begin onboarding real suppliers and inviting real buyers

---

## 2. Authority Boundary

| What this document IS | What this document IS NOT |
|---|---|
| A formal record of family cycle selection | A family opening or initiation |
| A queue of soft-launch prerequisite units | An implementation authorization |
| An identifier of the next unit after selection | A Layer 0 update or posture change |
| A planning anchor for TLRH registers | A repo-truth inspection for FAM-06 |
| A record of items deferred and why | A scope expansion beyond current posture |

**Layer 0 posture is unchanged.** `HOLD_FOR_AUTHORIZATION` remains the active delivery unit.
No implementation may open until Paresh explicitly releases `HOLD_FOR_AUTHORIZATION`.

**This selection does not open FAM-06.** It selects FAM-06 as the first family cycle. Opening
the cycle requires a separate explicit governance unit: `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`.

---

## 3. Documents Inspected

The following TLRH and Layer 0 documents were read before making this selection:

| # | Document | Purpose |
|---|---|---|
| 1 | `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Family classification matrix; proposed cycle order; action register |
| 2 | `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | Soft launch definition; allowed/prohibited surfaces; prerequisite checklists; Decisions A–G; CAE/CRM readiness |
| 3 | `governance/launch-readiness/README.md` | TLRH structure; read order; authority boundary |
| 4 | `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Deferred items; FTR-B2C-004, FTR-SL-001–004, FTR-SEO-001, FTR-AUTH-001 |
| 5 | `governance/launch-readiness/DECISION-PARKING-LOT.md` | Parked decisions D-001 through D-017 |
| 6 | `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-001–007, HD-001–006, R-001–R-015 |
| 7 | `governance/control/NEXT-ACTION.md` | Layer 0 active delivery unit; next candidate unit |
| 8 | `governance/control/OPEN-SET.md` | Live canon; control set; operating notes |
| 9 | `governance/control/BLOCKED.md` | Blockers, holds, and governance exceptions |

---

## 4. Decision Context Summary

### Layer 0 Posture
- `active_delivery_unit: HOLD_FOR_AUTHORIZATION`
- `next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK`
- No implementation may open. Governance-only selection work proceeds under this posture.

### Family Index (§5 and §8)
- 24 families classified across Groups A–F proposed cycle order
- **Groups A** (FAM-01–04): `VERIFIED_COMPLETE` — maintain-only; not candidates for "first cycle"
- **Group B** (FAM-05): `VERIFIED_COMPLETE` — maintain-only
- **First non-verified Group B entry** (FAM-06): `NOT_ASSESSED` / `LAUNCH_BLOCKER` / `P0` / Cycle 5 — auth and session management
- FAM-07 through FAM-10: also `NOT_ASSESSED` / `LAUNCH_BLOCKER` / `P0` — subsequent cycles

### Soft-Launch Strategy Context
- Soft launch phase uses **unauthenticated surfaces only** (aggregator directory + public inquiry form)
- Soft launch may proceed **before FAM-06 completes** if standalone prerequisites are met
- Standalone prerequisite units (legal pages, notification loop) do NOT require a family opening
- CRM/CAE XDEP is manual for soft launch — no automation needed for first cohort
- R-013 notification conflict: RESOLVED by split-scope classification (`TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` + `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001`)
- D-016 (B2B financial boundary): CONFIRMED — no platform transactions during soft launch
- D-017 (free/manual provisioning): CONFIRMED — first cohort operator-provisioned, zero charge

### PRIT Confirmations from Prior Units
- PRIT-032 (cart governance): `PILOT_REQUIRED / P2` — cart surface must NOT be exposed during soft launch
- PRIT-033 (inquiry response): `MVP_CRITICAL / P1` — minimum notification before buyer outreach (Stage 1); full inbox (Stage 2, FAM-03 or FAM-08)
- PRIT-034 (legal pages): `MVP_CRITICAL / P1` — hard soft-launch blocker
- PRIT-035 (analytics): `PILOT_REQUIRED / P2` — not a first-cohort blocker; required before broad outreach

---

## 5. Candidate Options Evaluated

| Option | Family | Cycle order | Status | Launch class | Rationale for or against |
|---|---|---|---|---|---|
| **A** | FAM-01 B2B Aggregator Directory | Cycle 1 | `VERIFIED_COMPLETE` | `PRODUCTION_VERIFIED` | Already complete. Re-opening is maintain-only. Not a "first cycle" candidate. |
| **B** | FAM-04 D2C Public Browse | Cycle 4 | `VERIFIED_COMPLETE` | `PRODUCTION_VERIFIED` | Already complete. Re-opening is maintain-only. Not a "first cycle" candidate. |
| **C** | FAM-05 Supplier Profile Public Pages | Cycle 5 | `VERIFIED_COMPLETE` | `PRODUCTION_VERIFIED` | Already complete. Cycle order 4 in the proposed sequence. Not an open cycle. |
| **D** | FAM-06 Auth and Session Management | Cycle 5 | `NOT_ASSESSED` | `LAUNCH_BLOCKER / P0` | Constitutional foundation for all authenticated flows. First non-verified LAUNCH_BLOCKER family. Recommended by index. Confirmed by soft-launch strategy §Q15 and §Q16. **SELECTED.** |
| **E** | FAM-07 Supplier Onboarding | Cycle 6 | `NOT_ASSESSED` | `LAUNCH_BLOCKER / P0` | Upstream-depends on FAM-06 auth. Cannot open before auth/session is resolved. |
| **F** | FAM-08 Buyer Registration and Auth | Cycle 7 | `NOT_ASSESSED` | `LAUNCH_BLOCKER / P0` | Depends on FAM-06 supplier auth. Cannot open before auth/session is resolved. |

**None of the XDEP families (FAM-18, FAM-20–24) are candidates for the first full family cycle.**
These are either `REVIEW-UNKNOWN` (WL Co) or `XDEP_ONLY` (CRM/CAE) and must be addressed in
their respective external repos or deferred per strategy.

---

## 6. Selected First Full Family Cycle

> **FAM-06 — Auth and Session Management**

| Attribute | Value |
|---|---|
| Family name | Auth and Session Management |
| Family ID | FAM-06 |
| Current status | `NOT_ASSESSED` — **this selection does not change the status** |
| Evidence level | `NEEDS_REPO_INSPECTION` — **this selection does not change the evidence level** |
| Launch class | `LAUNCH_BLOCKER` |
| Priority | P0 |
| Proposed cycle order | Cycle 5 (first non-verified family in Group B) |
| Layer 0 gate | `HOLD_FOR_AUTHORIZATION` must release before this cycle opens |
| Family Opening Audit Gate | Required — `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001` Rules A–H apply |
| Selection authority | `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` (this unit) |
| Next unit required | `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001` |

**FAM-06 status remains `NOT_ASSESSED`.** Selection ≠ opening. Status advances only after the
Family Opening Audit Gate (Rule F) is passed by a completed repo-truth inspection.

---

## 7. Rationale for FAM-06 Selection

### 7.1 Constitutional necessity

Authentication and session management is the constitutional foundation on which every subsequent
authenticated family depends:
- FAM-07 (Supplier Onboarding) cannot proceed until auth routes and session handling are confirmed safe
- FAM-08 (Buyer Registration and Auth) builds on or reuses FAM-06 patterns
- FAM-09 (Supplier Profile Management) requires authenticated supplier sessions
- FAM-10 (Platform Ops) requires authenticated operator sessions
- Every B2B family (FAM-12 through FAM-16) relies on auth infrastructure

### 7.2 Priority and classification

- `LAUNCH_BLOCKER` classification means the platform cannot launch with this family unresolved
- `P0` priority is the highest defined in the family classification matrix
- All families in Groups B–F are blocked on or downstream of FAM-06 auth

### 7.3 No upstream dependency

FAM-06 has no upstream family dependency in the proposed cycle order. It is the first family in
the proposed sequence that is not already `VERIFIED_COMPLETE`.

### 7.4 Alignment with soft-launch strategy

`SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §Q15 confirms:
> "The proposed first family cycle (FAM-06 Auth and Session Management) remains the correct first
> cycle. Auth is the constitutional foundation on which every subsequent family depends."

§Q16 confirms:
> "FAM-06 should remain the recommended first full family cycle when Layer 0 HOLD_FOR_AUTHORIZATION
> releases. CRM/CAE XDEP audits are not required before soft launch."

### 7.5 Specific FAM-06 audit scope (per LAUNCH-FAMILY-INDEX §7 action)

Per the family index action register:
> "Open family cycle after Layer 0 authorization; audit auth routes, session, reused-user edge case"

Known audit surfaces:
- Auth routes (Supabase Auth invite flow, login, session refresh)
- Session management (JWT handling, token refresh, session expiry)
- Reused-existing-user edge case (`FTR-AUTH-001` — BOUNDED_DEFERRED_REMAINDER)
- `org_id` scoping on all auth-gated backend routes
- Fastify auth plugin chain (`server/src/plugins/`)
- Frontend auth context and auth state management
- Feature flag behavior for newly provisioned tenants (BS-004)
- noindex on auth/tenant routes (BS-003)

---

## 8. Standalone Soft-Launch Prerequisite Queue

The following units are identified as standalone soft-launch prerequisites. They do NOT require
FAM-06 to be complete before opening. They do NOT require a family opening. They may proceed as
standalone units once Layer 0 `HOLD_FOR_AUTHORIZATION` releases (or, in the case of PRIT-034 and
FTR-B2C-004, may be opened with explicit Paresh authorization even before L0 releases if needed
for a soft-launch timeline).

| # | Unit candidate | Source | Priority | Launch class | Family gated? | Required before |
|---|---|---|---|---|---|---|
| a | `PUBLIC-LEGAL-PAGES-BUNDLE-001` | PRIT-034; SOFT-LAUNCH §Q17; §§8 S-1, §9 B-1, §10 A-5 | P1 | MVP_CRITICAL | NO — standalone | Any public network-building outreach or data collection |
| b | `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` | FTR-B2C-004 / FTR-SL-003; R-013 RESOLVED; §Q18 B-3 | P1 | MVP_CRITICAL | NO — standalone (implementation unit for FTR-SL-003) | Buyer-facing outreach; directory promotion |
| c | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | FTR-SEO-001; D-005; BS-007; §Q19 A-4 | P1 | LAUNCH_DEPENDENCY | NO — standalone decision/design unit | Any press release, paid backlinks, or GSC submission; product sitemap expansion |
| d | `SOFT-LAUNCH-AGGREGATOR-DIRECTORY-READINESS-DESIGN-001` | FTR-SL-001; §Q19 | P1 | MVP_CRITICAL | NO — standalone design gate | Promoting the aggregator directory to real buyers |
| e | `SUPPLIER-REAL-DATA-SEEDING-AND-PROFILE-READINESS-001` | BS-001; HD-002; §Q17 S-4, S-6 | P1 | MVP_CRITICAL | Partial — requires supplier onboarding path working (HD-001) | First Surat pilot supplier discovery via directory |

**Queue processing rule:** Queue items do not have a fixed sequence between themselves. Items (a)
and (b) are hard blockers for buyer outreach. Items (c), (d), and (e) are hard blockers for
directory promotion. Item (e) requires the onboarding path to be confirmed working (HD-001).

**None of these units open or authorize FAM-06.** They are entirely separate from the family cycle
work and may proceed in parallel with FAM-06 once authorized.

---

## 9. Immediate Next Unit

> **`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`**

This unit is the first unit to open after Layer 0 `HOLD_FOR_AUTHORIZATION` releases.

It must produce:
1. A current-cycle family-local repo-truth note for FAM-06 (per Audit Gate Rule E)
2. Verification of all surfaces listed in §7.5 above
3. Evidence level codes per `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` §13
4. A gap register identifying what is missing, partial, or GOVERNANCE_CLAIM_ONLY
5. Identification of any Layer 0 holds that directly apply to FAM-06
6. A recommendation for the first implementation unit within FAM-06

Until this unit is completed, FAM-06 status remains `NOT_ASSESSED` and may not advance.

---

## 10. Second and Third Likely Units

After `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001` completes, the likely sequence is:

| Sequence | Unit | Gated on |
|---|---|---|
| 2nd | `PUBLIC-LEGAL-PAGES-BUNDLE-001` (standalone) | Paresh authorization; not family-gated |
| 3rd | `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` (standalone) | Paresh authorization; not family-gated |
| 4th | First FAM-06 implementation unit (name to be determined by audit findings) | FAM-06 repo-truth audit complete; Paresh authorization |

Units 2nd and 3rd may be ordered differently or run concurrently at Paresh's discretion, since
they are independent of each other and of the FAM-06 audit.

---

## 11. Items Deferred by This Selection

### 11.1 FAM-07–FAM-10 sequencing

FAM-07 through FAM-10 are deferred pending FAM-06 completion. Their proposed cycle order (Cycles
6–9) is unchanged. No sequencing commitment is made here beyond FAM-06 as first cycle.

### 11.2 CRM / CAE family audits

CRM families (FAM-20, FAM-21, FAM-22) and CAE families (FAM-23, FAM-24) are `XDEP_ONLY` and are
deferred. CRM and CAE XDEP audits are not required for the Surat pilot soft launch. The
integration chain (CRM → Main, CAE → CRM, CAE → Main) can be fully manual for the first cohort.
CRM/CAE automation governance is tracked in FTR-SL-002.

### 11.3 PRIT-033 Stage 2 family assignment

The full supplier inquiry inbox (PRIT-033 Stage 2) requires a family assignment decision (FAM-03
or FAM-08). This decision is parked. Stage 1 (minimum notification loop, FTR-B2C-004) proceeds as
a standalone unit. Stage 2 family assignment is deferred to Paresh confirmation at family selection
of FAM-03 or FAM-08.

### 11.4 PRIT-032 cart governance

Cart code (Cart.tsx, cartService.ts, MarketplaceCartSummary, CartSummariesPanel) is ungoverned
(R-014). Cart surface must NOT be exposed during soft launch. Cart governance is assigned to a
future family cycle (buyer commerce scope, likely FAM-01 maintain cycle or new family). No
implementation may open for cart code until a governing unit is explicitly authorized.

### 11.5 D-005 canonical domain strategy

D-005 remains PARKED. No SEO backlinks, press release, or GSC submission may occur before D-005
is decided. `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` is queued as a standalone prerequisite (§8
item c) but the decision itself must come from Paresh.

---

## 12. CRM and CAE Handling

| Dimension | Posture |
|---|---|
| Soft launch CRM role | Manual only — Paresh records supplier/buyer leads directly in TexQtic-CRM |
| Soft launch CAE role | None — acquisition through Paresh's direct Surat network |
| CRM → Main App provisioning | Manual — Paresh provisions tenants directly as operator |
| WEBHOOK-007 (CRM → Main App) | BLOCKED (OpenAPI contract + jurisdiction auth gate) — not required for soft launch |
| CAE → CRM handoff | Manual for first cohort — no automated lead pipeline needed |
| CRM repo audit (FAM-20/21) | Deferred — required before scaled tenant onboarding |
| CAE repo audit (FAM-23) | Deferred — gated behind TTP legal + CAE repo inspection |
| FAM-24 integration chain | DESIGN_GATED (TTP legal gate blocks full chain) |
| When automation becomes required | Before scaled tenant onboarding beyond first cohort |
| Future unit | FTR-SL-002 (`XDEP-CAE-CRM-MAIN-SOFT-LAUNCH-STRATEGY-001`) |

CRM and CAE are `XDEP_ONLY` families. Their governance authority lives in their respective repos.
The main TexQtic repo records only XDEP status and main-platform integration surface notes.

---

## 13. Layer 0 Requirement

> **`HOLD_FOR_AUTHORIZATION` must be released by Paresh before any implementation unit may open.**

This selection was made as a governance-only action permitted under `HOLD_FOR_AUTHORIZATION`
posture (which blocks implementation but does not block planning and selection work).

The full Layer 0 release required before implementation:
1. Paresh explicitly releases `HOLD_FOR_AUTHORIZATION` via a Layer 0 update
2. `NEXT-ACTION.md` must reflect the new active delivery unit
3. The Family Opening Audit Gate (Audit Gate Rules A–H) must be passed before any FAM-06
   implementation may begin

Additionally, `HOLD_FOR_COUNSEL_FEEDBACK` (TTP legal counsel) does not gate FAM-06. FAM-06 is
auth/session work — it is not TTP-adjacent. `HOLD_FOR_COUNSEL_FEEDBACK` gates NC Phase 2 work and
any TTP-touching family cycle openings. It does not gate FAM-06.

---

## 14. Family Opening Audit Gate Reminder

> All Family Opening Audit Gate rules (A–H) from `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001` apply.

Key rules:

| Rule | Requirement |
|---|---|
| Rule A | Every family cycle MUST begin with a repo-truth inspection |
| Rule B | Inspection must cover routes, services, schema, frontend, tests, feature flags, blockers, prior unit evidence, and production data |
| Rule C | No design or implementation work may precede the inspection in the same unit |
| Rule D | If the inspection reveals blockers, it must stop and report before design begins |
| Rule E | Inspection must produce a family-local repo-truth note |
| Rule F | Status advancement from NOT_ASSESSED is gated on a completed current-cycle inspection |
| Rule G | CRM/CAE families must be audited in their own repos (XDEP_ONLY; not in main repo) |
| Rule H | These rules are mandatory, non-skippable hard gates |

FAM-06 is currently `NOT_ASSESSED`. It cannot advance status without the audit gate being passed.

---

## 15. Impact on TLRH Registers

| Register | Change made |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` | Selection note added to FAM-06 §7 Action Register row — FAM-06 selected as first cycle by this unit; status and evidence level unchanged |
| `FUTURE-TODO-REGISTER.md` | New §11 Launch Family Cycle Opening Audit Units added: FAM-06 opening audit unit; PUBLIC-LEGAL-PAGES-BUNDLE-001; INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001 (as opening-audit precursor to FTR-SL-003) |
| `DECISION-PARKING-LOT.md` | D-018 added: PRIT-033 Stage 2 family assignment (FAM-03 vs FAM-08 pending Paresh decision) |
| `README.md` | Item 16 added to §2 read order; table row added to §3 |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | No status changes. All BS/R items remain as-is. No new items added by this selection alone. |

---

## 16. Completion Checklist

- [x] Authoritative docs inspected (9 docs read; key sections of all strategy docs confirmed)
- [x] Layer 0 posture confirmed (HOLD_FOR_AUTHORIZATION — governance-only work permitted)
- [x] Candidate options A–F evaluated
- [x] FAM-06 selected as first full family cycle — rationale documented
- [x] Selection note added to LAUNCH-FAMILY-INDEX §7 Action Register (FAM-06 row)
- [x] Standalone soft-launch prerequisite queue identified (items a–e)
- [x] Immediate next unit named: `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`
- [x] CRM/CAE handling documented — manual for soft launch; XDEP audit deferred
- [x] Items deferred documented (§11)
- [x] Layer 0 requirement stated (§13)
- [x] Family Opening Audit Gate reminder stated (§14)
- [x] TLRH register impacts documented (§15)
- [x] No implementation opened
- [x] No family audit performed
- [x] No runtime files touched
- [x] No Layer 0 posture change
- [x] FAM-06 status not advanced from `NOT_ASSESSED`
- [x] TLRH registers updated in separate commit gate

---

*Document created: 2026-07-14 — `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`*
*Next unit: `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001` (after Layer 0 HOLD_FOR_AUTHORIZATION releases)*
