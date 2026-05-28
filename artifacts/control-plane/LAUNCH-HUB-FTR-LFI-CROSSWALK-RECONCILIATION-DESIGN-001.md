# LAUNCH-HUB-FTR-LFI-CROSSWALK-RECONCILIATION-DESIGN-001

**Task:** `LAUNCH-HUB-FTR-LFI-CROSSWALK-RECONCILIATION-DESIGN-001`
**Mode:** GOVERNANCE DESIGN ONLY — no hub file edits; no source/schema/config/package edits; no production mutation
**Date:** 2026-05-28
**Start HEAD:** `c4cc62fbccfe1f832a0832ad56e4368feca50a5e`
**Branch:** main
**Prior unit:** `LAUNCH-HUB-FTR-LFI-DRIFT-RECONCILIATION-001` (commit `c4cc62f`)

---

## 1. Task Identity

Build a durable crosswalk and anti-drift design between:
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR)
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` (LFI)

**Design goal:** Identify all remaining semantic disparities. Define which require document updates
and which do not. Produce a repeatable anti-drift rule set. Scope a Step 2 apply prompt.

**Not in scope:** updating either hub file, modifying source/schema/config/package/test files,
production API calls, DB mutations, family status advancement, or FTR item status changes.

---

## 2. Start State

| Item | Value |
|---|---|
| Branch | `main` |
| Start HEAD | `c4cc62fbccfe1f832a0832ad56e4368feca50a5e` |
| Prior commit message | `docs: reconcile launch hub FTR and family index drift` |
| Working tree at design start | CLEAN (git status --short = no output) |

---

## 3. Inputs Inspected (Read-Only)

| File | Sections Read | Status |
|---|---|---|
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Full file — §1–§15.5 | READ ✓ |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Full file — §1–§13 | READ ✓ |
| `governance/launch-readiness/README.md` | Full file | READ ✓ |
| `artifacts/control-plane/LAUNCH-HUB-FTR-LFI-DRIFT-RECONCILIATION-001.md` | Full file | READ ✓ (prior session) |
| `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-GOVERNANCE-SYNC-CLOSE-001.md` | Existence confirmed | CONFIRMED ✓ |
| `governance/control/NEXT-ACTION.md` | Full file | READ ✓ |
| `governance/control/BLOCKED.md` | Full file | READ ✓ |
| `governance/control/OPEN-SET.md` | Full file | READ ✓ |

**Design-only confirmation:** No hub file will be edited in this prompt. All FTR/LFI updates
are deferred to `LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001`.

---

## 4. Problem Statement

### The semantic gap

FTR and LFI are complementary but structurally asymmetric:

| Dimension | FTR answers | LFI answers |
|---|---|---|
| Granularity | Item-level (individual deferred/partial/open work units) | Family-level (24 launch-readiness families) |
| Scope | What remains deferred, open, partial, or gated | What is the readiness status of each family |
| Authority | What exists to be done before launch | What has been done per family cycle |
| Update trigger | FTR items update when implementation, deferral, or resolution occurs | LFI updates only when a verified family cycle closes |

### Two opposite error modes to prevent

**Error 1 — FALSE_COMPLETION:** LFI says a family is VERIFIED_COMPLETE. FTR has MVP_CRITICAL or
LAUNCH_BLOCKER open items mapped to that family. Paresh reads LFI and believes launch obligations
for that family are complete. In fact there are open launch gates still required.

**Error 2 — FALSE_DOWNGRADE:** An FTR item is open/partial, mapped to a verified family, but
the item is a post-MVP overlay, a PILOT_REQUIRED future step, or a deferred enhancement — not a
blocker for the verified core scope. Treating it as a status defect would incorrectly suggest
the verified family should be downgraded.

### Structural gap identified in FTR

The FTR register tables (§3–§10) lack an explicit "Destination Family (FAM-xx)" column.
Family mapping is only inferred from:
- Section headings (e.g., §7 = Control Plane → FAM-10)
- PRIT §12 confirmation notes (FTR-LEGAL-002 → FAM-03; FTR-LEGAL-003 → FAM-07; FTR-OPS-* → FAM-10)
- Contextual reading (FTR-B2C-003 → FAM-09; FTR-NC-001 → FAM-13; etc.)

This makes FTR-to-LFI tracing error-prone for any reader (human or agent) who does not cross-read
both documents together.

---

## 5. FTR-to-Family Crosswalk Table

**Legend:**
- LFI Surfaced: YES = item or its domain appears in LFI §6/§7; NO = not mentioned in LFI
- Affects LFI: YES_ACTION = should appear in §7 action note; YES_CUTLINE = should appear in §9 cutline note; NO = adequately handled

| FTR ID | Title (short) | Status | Readiness | Priority | Launch Class | Dest. Family | Inferred Family | LFI Surfaced? | Affects LFI? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| FTR-SEO-001 | SEO canonical domain strategy | STRATEGY_DEFINED | STRATEGY_DEFINED | P1 | LAUNCH_DEPENDENCY | FAM-04 | FAM-04 | PARTIAL — §6 review trigger mentions it but trigger not updated | YES_ACTION | LFI §7 FAM-04 still says "FTR-SEO-001 (canonical domain) gated"; should reflect STRATEGY_DEFINED. §6 review trigger should note trigger satisfied. |
| FTR-SEO-002 | Product detail sitemap expansion | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-04 | FAM-04 | NO | YES_ACTION (overlay only) | Post-canonical-strategy item; LFI §7 FAM-04 should note remaining open overlay SEO items. |
| FTR-SEO-003 | Supplier profile indexability | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-04 / FAM-09 | FAM-04 | NO | YES_ACTION (overlay only) | Depends on supplier profile design (FAM-09). Surface as open overlay in LFI §7 FAM-04. |
| FTR-SEO-004 | /trust page SEO metadata | OPEN | DESIGN_GATED | P2 | PILOT_REQUIRED | FAM-04 | FAM-04 | NO | NO | PILOT_REQUIRED only; not MVP cutline; FAM-04 VERIFIED_COMPLETE for core scope. |
| FTR-SEO-005 | /industries page SEO metadata | OPEN | DESIGN_GATED | P2 | POST_MVP | FAM-04 | FAM-04 | NO | NO | POST_MVP; no LFI surfacing required. |
| FTR-SEO-006 | /aggregator page SEO metadata | OPEN | DESIGN_GATED | P3 | POST_MVP | FAM-04 | FAM-04 | NO | NO | POST_MVP; no LFI surfacing required. |
| FTR-SEO-007 | Canonical domain implementation | STRATEGY_RESOLVED | STRATEGY_RESOLVED | P1 | LAUNCH_DEPENDENCY | FAM-04 | FAM-04 | PARTIAL — §6 trigger references this as pending | YES_ACTION | Implementation confirmed correct; no changes needed. LFI §7 FAM-04 note and §6 review trigger should reflect STRATEGY_RESOLVED. |
| FTR-SEO-008 | Product detail JSON-LD expansion | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-04 | FAM-04 | NO | YES_ACTION (overlay) | LAUNCH_DEPENDENCY; should appear as open overlay gate in LFI §7 FAM-04. |
| FTR-SEO-009 | Supplier profile JSON-LD | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-04 / FAM-09 | FAM-04 | NO | YES_ACTION (overlay) | Depends on FTR-SEO-003 and supplier profile policy (FAM-09). |
| FTR-NC-001 | Award maker-checker E2E path | OPEN | IMPLEMENTATION_READY | P2 | LAUNCH_DEPENDENCY | FAM-13 | FAM-13 | YES — LFI §7 FAM-13 mentions G-022 and design complete | NO | LFI §7 FAM-13 text already references the design state. No update needed. |
| FTR-NC-002 | Supplier quote flag activation (QD-6) | OPEN | BLOCKED | P2 | LAUNCH_DEPENDENCY | FAM-14 | FAM-14 | YES — LFI §7 FAM-14 mentions QD-6 hold | NO | LFI §7 FAM-14 adequately captures the block. |
| FTR-NC-003 | TradeTrust Pay design opening | OPEN | BLOCKED | P2 | LAUNCH_DEPENDENCY | FAM-16 | FAM-16 | YES — LFI §7 FAM-16 mentions HOLD_FOR_COUNSEL_FEEDBACK | NO | LFI §7 FAM-16 adequately captures the hold. |
| FTR-NC-004 | NC Phase 1 remote DB schema verify | OPEN | BLOCKED | P2 | LAUNCH_DEPENDENCY | FAM-13 | FAM-13 | NO | NO | BLOCKED pending FTR-NC-001 authorization; FAM-13 is DESIGN_GATED; consistent. |
| FTR-B2C-001 | B2C–D2C boundary decision | OPEN | DESIGN_GATED | P2 | PILOT_REQUIRED | FAM-01/FAM-02 | FAM-01 | NO | NO | PILOT_REQUIRED; LFI FAM-01/02 are VERIFIED_COMPLETE maintain-only; no LFI update needed. |
| FTR-B2C-002 | Inquiry schema expansion (Phase 3+) | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-03 | FAM-03 | NO | YES_ACTION (overlay) | LAUNCH_DEPENDENCY; should appear as open overlay gate in LFI §7 FAM-03. |
| FTR-B2C-003 | Supplier profile public pages | OPEN | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | FAM-09 | FAM-09 | NO | NO | FAM-09 is NOT_ASSESSED; FTR-B2C-003 dependency is natural; no LFI update needed (FAM-09 will cover this in its cycle). |
| FTR-B2C-004 | Minimum inquiry notification loop | PARTIAL | PARTIAL | P1 | MVP_CRITICAL | FAM-03 (primary) / FAM-08 | FAM-03 | PARTIAL — §7 FAM-03 mentions BS-002 but not FTR-B2C-004 explicitly | YES_ACTION | MVP_CRITICAL overlay gate; LFI §7 FAM-03 should explicitly reference FTR-B2C-004 (PARTIAL) and FTR-B2C-005 (OPEN). |
| FTR-B2C-005 | Supplier-context notification runtime verify | OPEN | IMPLEMENTATION_READY | P1 | MVP_CRITICAL | FAM-03 (primary) / FAM-08 | FAM-03 | NO | YES_ACTION | MVP_CRITICAL; required before buyer-facing outreach. Must appear in LFI §7 FAM-03 as explicit open overlay gate. |
| FTR-AUTH-001 | Reused-existing-user onboarding path | OPEN | DESIGN_GATED | P1 | MVP_CRITICAL | FAM-07 | FAM-07 | NO | YES_ACTION | MVP_CRITICAL; LFI §7 FAM-07 should note FTR-AUTH-001 as a known open item within the family. |
| FTR-AUTH-002 | White label onboarding path | OPEN | BLOCKED | P3 | POST_MVP | FAM-18 | FAM-18 | YES — LFI §7 FAM-18 mentions WL hold | NO | POST_MVP; LFI §7 FAM-18 already mentions the hold. No update needed. |
| FTR-AUTH-003 | Auth/private-route crawl exclusion verify | PARTIAL / ROBOTS_DEPLOYED | ROBOTS_DEPLOYED | P2 | LAUNCH_DEPENDENCY | FAM-06 | FAM-06 | YES — LFI §7 FAM-06 explicitly mentions G-06-003 NON_BLOCKING_FOLLOWUP | NO | Adequately surfaced in LFI §7 FAM-06 as NON_BLOCKING_FOLLOWUP. |
| FTR-AUTH-004 | Auth email branded shell (F1-P6C) | OPEN | IMPLEMENTATION_READY | P2 | PILOT_REQUIRED | FAM-06 | FAM-06 | NO | YES_ACTION (minor) | PILOT_REQUIRED; LFI §7 FAM-06 should note this as an open overlay gate (lower priority than MVP_CRITICAL items). |
| FTR-CP-001 | Control plane tenant operations | VERIFIED_COMPLETE | — | — | — | FAM-10 | FAM-10 | YES — LFI §7 FAM-10 VERIFIED_COMPLETE | NO | Already VERIFIED_COMPLETE in both docs. Consistent. |
| FTR-OPS-001 | Error monitoring / alerting setup | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-10 | FAM-10 | NO | YES_ACTION + YES_CUTLINE | MVP_CRITICAL; PRIT-013 maps to FAM-10; NOT surfaced in LFI §7 FAM-10. Key disparity. |
| FTR-OPS-002 | Performance budget / load testing | OPEN | NOT_ASSESSED | P2 | PILOT_REQUIRED | FAM-10 | FAM-10 | NO | YES_ACTION | PILOT_REQUIRED; PRIT-014 maps to FAM-10; not surfaced in LFI §7 FAM-10. |
| FTR-OPS-003 | Rollback procedure documentation | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-10 | FAM-10 | NO | YES_ACTION + YES_CUTLINE | MVP_CRITICAL; PRIT-015 maps to FAM-10; NOT surfaced in LFI §7 FAM-10. Key disparity. |
| FTR-OPS-004 | Postmark delivery webhook / bounce | OPEN | NOT_ASSESSED | P2 | PILOT_REQUIRED | FAM-03 / FAM-08 | FAM-03 | NO | NO | PILOT_REQUIRED; not yet assigned a family; no immediate LFI update required. |
| FTR-LEGAL-001 | TTP legal counsel feedback record | OPEN | BLOCKED | P2 | LAUNCH_DEPENDENCY | FAM-16 | FAM-16 | YES — LFI §7 FAM-16 mentions counsel feedback hold | NO | LFI §7 FAM-16 adequately captures the gate. |
| FTR-LEGAL-002 | Privacy/GDPR basics for inquiry form | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-03 | FAM-03 | NO | YES_ACTION | MVP_CRITICAL; PRIT-011 maps to FAM-03. NOT surfaced in LFI §7 FAM-03. Key disparity. |
| FTR-LEGAL-003 | Terms of service for supplier onboarding | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-07 | FAM-07 | NO | YES_ACTION | MVP_CRITICAL; PRIT-012 maps to FAM-07. NOT surfaced in LFI §7 FAM-07. Key disparity (FAM-07 is NOT_ASSESSED but the dependency should be recorded). |
| FTR-SL-001 | Soft-launch aggregator directory readiness design | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-01 (pre-outreach overlay) | FAM-01 | NO | YES_ACTION | MVP_CRITICAL; required before first real supplier profile goes live in promotion context. LFI §7 FAM-01 mentions BS-001 but not FTR-SL-001. Key disparity. |
| FTR-SL-002 | XDEP CAE + CRM soft-launch integration strategy | OPEN | NOT_ASSESSED | P2 | PILOT_REQUIRED | FAM-22 / XDEP | FAM-22 | NO | NO | PILOT_REQUIRED; XDEP; FAM-22 is XDEP_ONLY. Not required in main repo LFI. |
| FTR-SL-003 | Minimum inquiry notification loop implementation | PARTIAL | PARTIAL | P1 | MVP_CRITICAL | FAM-03 / FAM-08 | FAM-03 | PARTIAL — LFI §7 FAM-03 mentions BS-002 | YES_ACTION | Same family as FTR-B2C-004; same overlay cluster. LFI §7 FAM-03 should consolidate these. |
| FTR-SL-004 | Supplier inquiry inbox design | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | FAM-08 (candidate) | FAM-08 | NO | YES_ACTION (prospective) | FAM-08 is NOT_ASSESSED; this should be noted as a known planned item for FAM-08's cycle opening. |
| FTR-FAM-001 | FAM-06 auth/session opening audit | VERIFIED_COMPLETE | — | — | — | FAM-06 | FAM-06 | YES — LFI §7 FAM-06 VERIFIED_COMPLETE | NO | Consistent. |
| FTR-FAM-002 | PUBLIC-LEGAL-PAGES-BUNDLE-001 | PRODUCTION_INTENT_ARCHITECTURE_REQUIRED / HOLD_FOR_AUTHORIZATION | — | P1 | MVP_CRITICAL | Standalone unit | standalone | PARTIAL — LFI §13 soft-launch note mentions legal pages | NO | Standalone unit; not a family cycle item. Adequately noted in LFI §13. |
| FTR-FAM-003 | INQUIRY-NOTIFICATION-MINIMUM (FTR-B2C-004 driver) | PARTIAL | — | P1 | MVP_CRITICAL | FAM-03 | FAM-03 | PARTIAL — same as FTR-B2C-004 | NO | Same issue as FTR-B2C-004/FTR-B2C-005. Consolidated in §8-D below. |
| FTR-FAM-004 | PRODUCTION-LAUNCH-LEGAL-ARCHITECTURE | DESIGN_ARTIFACT_CREATED / HOLD_FOR_CONTENT_DRAFT | — | P1 | MVP_CRITICAL | Standalone unit | standalone | NO | NO | Design artifact created; next unit is content draft; standalone. Not a family cycle item. |
| FTU-COMM-001 | Subscription tier entitlement design | PARKED | POST_MVP | P2 | POST_MVP | FAM-11 | FAM-11 | NO | NO | POST_MVP; no LFI update needed. |
| FTU-COMM-002 | Razorpay payment gateway design | PARKED | DESIGN_GATED | P2 | POST_MVP | — | PARKED | NO | NO | Design-gated; not a launch dependency. |
| FTU-COMM-003 | B2C/D2C checkout payment design | PARKED | DESIGN_GATED | P2 | POST_MVP | — | PARKED | NO | NO | Design-gated; post-MVP. |
| FTU-COMM-004 | Commission deduction policy design | PARKED | DESIGN_GATED | P2 | POST_MVP | — | PARKED | NO | NO | Design-gated; post-MVP. |
| FTU-COMM-005 | B2B financial boundary guardrail | PARKED | HOLD_FOR_COUNSEL_FEEDBACK | P1 | LAUNCH_DEPENDENCY | FAM-12/13/14/15/16 boundary | multi-family | NO | NO | HOLD_FOR_COUNSEL_FEEDBACK (same gate as FTR-LEGAL-001 / FAM-16). Not a separate LFI update needed. |

---

## 6. LFI Family-to-FTR Overlay Table

For each above-cutline and maintain-only family, the related FTR items and whether LFI
adequately surfaces them.

| Family | LFI Status | Evidence Level | Action Register Summary | MVP Cutline | Related FTR Items | Has MVP_CRITICAL/LAUNCH_BLOCKER open? | LFI adequately surfaces? |
|---|---|---|---|---|---|---|---|
| FAM-01 B2C Browse | VERIFIED_COMPLETE | PRODUCTION_CONFIRMED | Maintain-only; run BS-001 before outreach | VERIFIED_COMPLETE | FTR-SL-001 (MVP_CRITICAL), FTR-B2C-001 (PILOT_REQUIRED) | YES — FTR-SL-001 MVP_CRITICAL | NO — FTR-SL-001 not mentioned |
| FAM-02 D2C Collections | VERIFIED_COMPLETE | PRODUCTION_CONFIRMED | Maintain-only; SEO expansion deferred (FTR-SEO-001, FTR-SEO-002) | VERIFIED_COMPLETE | FTR-SEO-001 (STRATEGY_DEFINED), FTR-SEO-002 | YES — FTR-SEO-001 now resolved | PARTIAL — §7 still mentions "FTR-SEO-001 (canonical domain) gated" which is stale |
| FAM-03 Inquiry | VERIFIED_COMPLETE | PRODUCTION_CONFIRMED | Maintain-only; verify notification reach (BS-002) before buyer-facing marketing | VERIFIED_COMPLETE | FTR-B2C-004 (MVP_CRITICAL/PARTIAL), FTR-B2C-005 (MVP_CRITICAL/OPEN), FTR-LEGAL-002 (MVP_CRITICAL/OPEN), FTR-SL-003 (MVP_CRITICAL/PARTIAL), FTR-B2C-002 (LAUNCH_DEPENDENCY) | YES — multiple MVP_CRITICAL open | NO — none of these explicitly named in §7 note |
| FAM-04 SEO | VERIFIED_COMPLETE | PRODUCTION_CONFIRMED | Maintain-only; FTR-SEO-001 gated; validate JSON-LD externally (BS-005) | VERIFIED_COMPLETE | FTR-SEO-001 (STRATEGY_DEFINED — resolved), FTR-SEO-007 (STRATEGY_RESOLVED), FTR-SEO-002/003/008/009 (LAUNCH_DEPENDENCY/OPEN) | YES — FTR-SEO-002/008/009 LAUNCH_DEPENDENCY | PARTIAL — mentions FTR-SEO-001 as still gated (stale); missing open overlay items |
| FAM-06 Auth | VERIFIED_COMPLETE | TEST_CONFIRMED | VERIFIED_COMPLETE; G-06-003 NON_BLOCKING_FOLLOWUP | VERIFIED_COMPLETE | FTR-AUTH-003 (LAUNCH_DEPENDENCY/PARTIAL), FTR-AUTH-004 (PILOT_REQUIRED/OPEN) | NO — FTR-AUTH-003 is NON_BLOCKING; FTR-AUTH-004 PILOT_REQUIRED | PARTIAL — FTR-AUTH-003 surfaced; FTR-AUTH-004 missing |
| FAM-07 Onboarding | NOT_ASSESSED | NEEDS_REPO_INSPECTION | Open family cycle; audit invite flow | NOT_ASSESSED | FTR-AUTH-001 (MVP_CRITICAL/OPEN), FTR-LEGAL-003 (MVP_CRITICAL/OPEN) | YES — two MVP_CRITICAL items | NO — neither mentioned in §7 |
| FAM-08 Tenant Core | NOT_ASSESSED | NEEDS_REPO_INSPECTION | Open family cycle; audit workspace, org_id | NOT_ASSESSED | FTR-SL-004 (MVP_CRITICAL/OPEN — candidate), FTR-B2C-004/FTR-B2C-005 (shared candidate) | YES — FTR-SL-004 MVP_CRITICAL | NO — not mentioned |
| FAM-09 Supplier Profile | NOT_ASSESSED | NEEDS_REPO_INSPECTION | Open family cycle; audit supplier profile | NOT_ASSESSED | FTR-B2C-003 (LAUNCH_DEPENDENCY), FTR-SEO-003/009 (LAUNCH_DEPENDENCY) | YES — multiple LAUNCH_DEPENDENCY items | NO — not mentioned; but NOT_ASSESSED so cycle opening will surface them |
| FAM-10 Platform Ops | VERIFIED_COMPLETE | PRODUCTION_CONFIRMED | VERIFIED_COMPLETE; production smoke 15/15; DEV-001/DEV-002 documented | VERIFIED_COMPLETE — production verified | FTR-OPS-001 (MVP_CRITICAL/OPEN), FTR-OPS-003 (MVP_CRITICAL/OPEN), FTR-OPS-002 (PILOT_REQUIRED/OPEN), FTR-OPS-004 (PILOT_REQUIRED/OPEN) | YES — two MVP_CRITICAL items | NO — none surfaced in §7 or §9 cutline |
| FAM-11 Subscription | NOT_ASSESSED | NEEDS_REPO_INSPECTION | Open cycle after P0 families | NOT_ASSESSED | FTU-COMM-001 (POST_MVP) | NO | N/A — NOT_ASSESSED; no surfacing required yet |
| FAM-12 NC/RFQ | PARTIALLY_IMPLEMENTED | TEST_CONFIRMED | E2E blocked by FAM-13 gate | PARTIALLY_IMPLEMENTED | FTU-COMM-005 (HOLD_FOR_COUNSEL_FEEDBACK boundary) | NO — counsel gate applies to whole cluster | NO — but FTU-COMM-005 is a shared gate, not specific to FAM-12 |
| FAM-13 NC/Award | DESIGN_GATED | REPO_CONFIRMED | Await Paresh G-022 decision | DESIGN_COMPLETE_BLOCKED | FTR-NC-001 (LAUNCH_DEPENDENCY), FTR-NC-004 (LAUNCH_DEPENDENCY) | YES | YES — LFI §7 FAM-13 adequately captures design complete + G-022 gate |
| FAM-14 NC/Quotes | BLOCKED | REPO_CONFIRMED | Await QD-6 lift | CONFIG_ONLY | FTR-NC-002 (LAUNCH_DEPENDENCY) | YES | YES — LFI §7 FAM-14 adequately captures QD-6 hold |
| FAM-16 TTP | DESIGN_GATED | GOVERNANCE_CLAIM_ONLY | Await counsel feedback | DESIGN_GATED | FTR-NC-003 (LAUNCH_DEPENDENCY), FTR-LEGAL-001 (LAUNCH_DEPENDENCY) | YES | YES — LFI §7 FAM-16 mentions counsel hold |

---

## 7. Disparity Classification Table

| Disp ID | Location | Type | Description | Severity | Proposed Resolution |
|---|---|---|---|---|---|
| DISP-001 | LFI §7 FAM-04 | STALE_TEXT_DRIFT | Action note says "FTR-SEO-001 (canonical domain) gated"; truth is STRATEGY_DEFINED (Option F confirmed; no changes needed) | MEDIUM | Update §7 FAM-04 note to say strategy resolved; add open overlay items FTR-SEO-002/003/008/009 |
| DISP-002 | LFI §6 FAM-04 | STALE_TEXT_DRIFT | Review trigger says "Domain canonical decision (FTR-SEO-001)" — trigger has been satisfied by STRATEGY_DEFINED | MEDIUM | Update §6 review trigger for FAM-04 to reflect FTR-SEO-001 STRATEGY_DEFINED |
| DISP-003 | LFI §7 FAM-02 | STALE_TEXT_DRIFT | §7 FAM-02 notes "SEO expansion deferred (FTR-SEO-001, FTR-SEO-002)" — FTR-SEO-001 is now STRATEGY_DEFINED, not gated | LOW | Minor note update: change "FTR-SEO-001 gated" to "FTR-SEO-001 STRATEGY_DEFINED" |
| DISP-004 | LFI §7 FAM-10 | OVERLAY_GATE_NOT_SURFACED | FAM-10 VERIFIED_COMPLETE note makes no mention of FTR-OPS-001 (MVP_CRITICAL: error monitoring) and FTR-OPS-003 (MVP_CRITICAL: rollback procedure) remaining open. These are mapped to FAM-10 by PRIT-013 and PRIT-015. Paresh could read LFI §7 FAM-10 and conclude Platform Ops is fully launch-ready when two MVP_CRITICAL gates remain open. | HIGH — FALSE_COMPLETION_RISK | Add overlay note to LFI §7 FAM-10: "Control Plane lane VERIFIED_COMPLETE. Platform Ops overlay gates remain open in FTR: FTR-OPS-001 (error monitoring, MVP_CRITICAL), FTR-OPS-003 (rollback procedure, MVP_CRITICAL), FTR-OPS-002 (load testing, PILOT_REQUIRED). These require separate implementation authorization." |
| DISP-005 | LFI §9 FAM-10 cutline | OVERLAY_GATE_NOT_SURFACED | §9 MVP cutline row for FAM-10 says "VERIFIED_COMPLETE — production verified 2026-05-28" with no mention of FTR-OPS MVP_CRITICAL open gates | HIGH — FALSE_COMPLETION_RISK | Add overlay note to §9 FAM-10 row or add a separate "Overlay Gates" column/note |
| DISP-006 | LFI §7 FAM-03 | OVERLAY_GATE_NOT_SURFACED + FALSE_COMPLETION_RISK | FAM-03 VERIFIED_COMPLETE for inquiry submission core. §7 note says "verify notification reach (BS-002) before buyer-facing marketing." However: FTR-B2C-004 (MVP_CRITICAL/PARTIAL), FTR-B2C-005 (MVP_CRITICAL/OPEN), FTR-LEGAL-002 (MVP_CRITICAL/OPEN: privacy consent), and FTR-SL-003 (MVP_CRITICAL/PARTIAL) are all open and mapped to FAM-03. These are not mentioned by FTR ID in LFI. | HIGH | Add overlay note to LFI §7 FAM-03: explicitly name FTR-B2C-004 (PARTIAL), FTR-B2C-005 (OPEN), FTR-LEGAL-002 (OPEN — privacy/GDPR), FTR-SL-003 (PARTIAL). Distinguish inquiry submission core (verified) from notification/legal overlay (open). |
| DISP-007 | LFI §7 FAM-01 | OVERLAY_GATE_NOT_SURFACED | FAM-01 VERIFIED_COMPLETE for B2C browse. §7 note says "run real-data smoke test (BS-001) before public outreach." But FTR-SL-001 (MVP_CRITICAL: aggregator directory readiness design) is an explicit pre-outreach gate that is not mentioned. | HIGH — FALSE_COMPLETION_RISK | Add FTR-SL-001 to LFI §7 FAM-01 note as a required pre-outreach gate alongside BS-001. |
| DISP-008 | LFI §7 FAM-06 | OVERLAY_GATE_NOT_SURFACED (minor) | FTR-AUTH-004 (auth email branded shell, PILOT_REQUIRED/P2) is open and mapped to FAM-06 but not mentioned in LFI §7 FAM-06. | LOW — PILOT_REQUIRED only | Add minor overlay note to LFI §7 FAM-06: "FTR-AUTH-004 (auth email branded shell, PILOT_REQUIRED) open; no action until PILOT phase." |
| DISP-009 | LFI §7 FAM-07 | OVERLAY_GATE_NOT_SURFACED | FAM-07 is NOT_ASSESSED. FTR-AUTH-001 (MVP_CRITICAL: reused-existing-user path) and FTR-LEGAL-003 (MVP_CRITICAL: supplier ToS) are both mapped to FAM-07 by PRIT. Neither is mentioned in LFI §7 FAM-07. Though the family is NOT_ASSESSED, the cycle opening should be aware of these pre-existing known items. | MEDIUM | Add known planned items to LFI §7 FAM-07: "Known FTR items entering this family cycle: FTR-AUTH-001 (MVP_CRITICAL), FTR-LEGAL-003 (MVP_CRITICAL)." |
| DISP-010 | FTR §3–§10 tables | FTR_STRUCTURAL_GAP | FTR register tables lack explicit "Destination Family" column. Family mapping is implicit (section heading, PRIT §12, contextual). Makes FTR-to-LFI tracing fragile. | MEDIUM | In Step 2 apply: add family mapping note to Description field for MVP_CRITICAL/LAUNCH_BLOCKER items that currently have no explicit family column value. |
| DISP-011 | LFI §7 FAM-03 (FTR-B2C-002) | OVERLAY_GATE_NOT_SURFACED | FTR-B2C-002 (inquiry schema expansion, LAUNCH_DEPENDENCY/P2, Phase 3+) mapped to FAM-03; not mentioned in LFI. | MEDIUM | Add as lower-priority overlay note in LFI §7 FAM-03 action section. |
| DISP-012 | LFI §7 FAM-08 (FTR-SL-004) | OVERLAY_GATE_NOT_SURFACED | FTR-SL-004 (supplier inquiry inbox, MVP_CRITICAL/P1) is a known planned item for FAM-08. Not mentioned. | MEDIUM | Add to LFI §7 FAM-08 as a known planned item: "FTR-SL-004 (supplier inquiry inbox, MVP_CRITICAL) is a known planned requirement entering this family cycle." |
| DISP-013 | Date chronology (FTR + LFI) | DATE_CHRONOLOGY_ANOMALY | Multiple 2026-07-xx dates in FTR/LFI while current active execution date is 2026-05-28. Specifically: FAM-06 verify-close date 2026-07-22, FTR-SEO-001 strategy date 2026-07-22, NC Phase 1 audit 2026-07-06, PRIT confirmation date 2026-07-14. | INFORMATIONAL | See §13 for full handling recommendation. No date changes in this design. |
| DISP-014 | FTR/LFI CRM/CAE boundary | XDEP_BOUNDARY_RISK | No XDEP boundary violations found in either FTR or LFI. LFI §4 and §6 correctly mark FAM-20/21/23 as XDEP_ONLY. FTR §15.3 correctly records CRM status as cross-repo only. | NONE | Confirm as boundary-safe. See §14. |

---

## 8. Analysis of Minimum Known Disparities

### A. FAM-04 / SEO (DISP-001, DISP-002, DISP-003)

**Current state:**
- LFI §7 FAM-04: "Maintain-only; **FTR-SEO-001 (canonical domain) gated**; validate JSON-LD externally (BS-005)"
- LFI §6 FAM-04 review trigger: "Domain canonical decision (FTR-SEO-001)"

**Truth (from FTR):**
- FTR-SEO-001: STRATEGY_DEFINED — app.texqtic.com confirmed canonical; Option F; no redirect/sitemap changes needed
- FTR-SEO-007: STRATEGY_RESOLVED — existing canonical tag implementation confirmed correct; no further implementation gate

**Nature of disparity:** STALE_TEXT_DRIFT. FAM-04's core scope (sitemap + robots.txt + JSON-LD) is VERIFIED_COMPLETE and correctly so. The strategic canonical question has been resolved. LFI still says it's "gated." This is not a status error — FAM-04 should remain VERIFIED_COMPLETE — but the action note and review trigger text are stale.

**Additional open overlays not mentioned in LFI:** FTR-SEO-002 (LAUNCH_DEPENDENCY), FTR-SEO-003 (LAUNCH_DEPENDENCY), FTR-SEO-008 (LAUNCH_DEPENDENCY), FTR-SEO-009 (LAUNCH_DEPENDENCY). These are design-gated overlays that do not invalidate FAM-04 VERIFIED_COMPLETE status but should be visible.

**Step 2 proposed change:**
- LFI §7 FAM-04 action note: Replace "FTR-SEO-001 (canonical domain) gated" with "FTR-SEO-001 STRATEGY_DEFINED (2026-07-22; Option F; no implementation change); FTR-SEO-007 STRATEGY_RESOLVED. Open overlay gates: FTR-SEO-002 (product sitemap, LAUNCH_DEPENDENCY), FTR-SEO-003 (supplier indexability, LAUNCH_DEPENDENCY), FTR-SEO-008 (product JSON-LD, LAUNCH_DEPENDENCY), FTR-SEO-009 (supplier JSON-LD, LAUNCH_DEPENDENCY)."
- LFI §6 FAM-04 review trigger: Replace "Domain canonical decision (FTR-SEO-001)" with "FTR-SEO-001 STRATEGY_DEFINED (trigger satisfied); review on sitemap schema expansion (FTR-SEO-002), supplier indexability decision (FTR-SEO-003), or JSON-LD expansion (FTR-SEO-008/009)."

**Does this require downgrading FAM-04?** NO. FAM-04 VERIFIED_COMPLETE is correct for the core scope. Open overlay items are design-gated dependencies on future content/supplier policy decisions.

---

### B. FAM-10 / Platform Ops (DISP-004, DISP-005)

**Current state:**
- LFI §7 FAM-10: "VERIFIED_COMPLETE (2026-05-28) via FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001. Production smoke 15/15 PASS..."
- LFI §9 FAM-10 cutline: "VERIFIED_COMPLETE — production verified 2026-05-28"

**Truth (from FTR):**
- FTR-OPS-001 (error monitoring/alerting): OPEN, MVP_CRITICAL, P1, NOT_ASSESSED — PRIT-013 → FAM-10
- FTR-OPS-002 (load testing): OPEN, PILOT_REQUIRED, P2, NOT_ASSESSED — PRIT-014 → FAM-10
- FTR-OPS-003 (rollback procedure documentation): OPEN, MVP_CRITICAL, P1, NOT_ASSESSED — PRIT-015 → FAM-10

**Nature of disparity:** OVERLAY_GATE_NOT_SURFACED + FALSE_COMPLETION_RISK. FAM-10's verified scope was the control plane tenant operations lane (10 bounded units, production smoke 15/15). This is correctly VERIFIED_COMPLETE. However FAM-10 also covers Platform Ops infrastructure — and three items within that scope (Sentry, rollback docs, load testing) remain open in FTR with MVP_CRITICAL and PILOT_REQUIRED classifications. Paresh reading LFI §7 FAM-10 currently sees "VERIFIED_COMPLETE" with no indication that FTR-OPS-001 and FTR-OPS-003 are still open MVP gates.

**Key distinction:** FAM-10 has two sub-lanes:
1. Control Plane lane (tenant operations) — VERIFIED_COMPLETE ✓
2. Platform Ops overlay lane (monitoring, rollback, load testing) — OPEN ✗

**Does this require downgrading FAM-10?** NO — unless repo-truth audit proves the control-plane verification was over-broad. The control plane lane evidence is strong (10 bounded units, production smoke, test suite). The FTR-OPS items are overlay gates that require separate implementation authorization. FAM-10 family cycle status should remain VERIFIED_COMPLETE for its verified control-plane lane, with an explicit overlay note.

**Step 2 proposed change:**
- LFI §7 FAM-10: Add after existing text: "Platform Ops overlay gates remain open in FTR (PRIT confirmed): FTR-OPS-001 (error monitoring/Sentry, MVP_CRITICAL/P1), FTR-OPS-003 (rollback procedure documentation, MVP_CRITICAL/P1), FTR-OPS-002 (load testing, PILOT_REQUIRED/P2). These require separate implementation authorization. Control Plane lane scope of FAM-10 is VERIFIED_COMPLETE; FTR-OPS overlay gates are distinct."
- LFI §9 FAM-10 cutline note: Add "Control Plane lane VERIFIED_COMPLETE. Platform Ops overlay: FTR-OPS-001, FTR-OPS-003 (MVP_CRITICAL) remain open."

---

### C. FAM-03 / Inquiry Submission (DISP-006, DISP-011)

**Current state:**
- LFI §7 FAM-03: "Maintain-only; verify notification reach (BS-002) before buyer-facing marketing"

**Truth (from FTR):**
- FTR-B2C-004 (notification loop): PARTIAL/MVP_CRITICAL/P1 — buyer ack + admin alert production-verified; supplier-context NOT runtime-verified
- FTR-B2C-005 (supplier-context notification verify): OPEN/MVP_CRITICAL/P1 — explicit prerequisite before buyer-facing outreach
- FTR-LEGAL-002 (privacy/GDPR inquiry consent): OPEN/MVP_CRITICAL/P1 — PRIT-011 → FAM-03
- FTR-SL-003 (notification loop implementation unit): PARTIAL/MVP_CRITICAL/P1 — same cluster as FTR-B2C-004
- FTR-B2C-002 (inquiry schema expansion Phase 3+): OPEN/LAUNCH_DEPENDENCY/P2

**Nature of disparity:** OVERLAY_GATE_NOT_SURFACED + FALSE_COMPLETION_RISK. FAM-03's verified scope is the inquiry submission DB path (form → DB). This is correctly VERIFIED_COMPLETE. However BS-002 (notification pipeline) is a post-submission reach/delivery verification — and LFI mentions it only by blind-spot register code, not by FTR ID. More critically, FTR-LEGAL-002 (privacy consent notice, MVP_CRITICAL) and the notification cluster (FTR-B2C-004/005) are not explicitly named.

**Does this require downgrading FAM-03?** NO. FAM-03 core scope (DB submission) is verified. Notification and legal overlay gates are explicitly separate.

**Step 2 proposed change:**
- LFI §7 FAM-03: Replace action note with: "Maintain-only for inquiry submission core. Open launch overlay gates: FTR-B2C-004 (notification loop, MVP_CRITICAL/PARTIAL), FTR-B2C-005 (supplier-context notification runtime verify, MVP_CRITICAL/OPEN — required before buyer-facing outreach), FTR-LEGAL-002 (privacy/GDPR consent notice for inquiry form, MVP_CRITICAL/OPEN — PRIT-011), FTR-B2C-002 (inquiry schema expansion, LAUNCH_DEPENDENCY/OPEN — Phase 3+). All four must advance before promotion of public inquiry form to buyers."

---

### D. FAM-06 / Auth (DISP-008)

**Current state:**
- LFI §7 FAM-06: VERIFIED_COMPLETE; G-06-003 NON_BLOCKING_FOLLOWUP = FTR-AUTH-003

**Truth (from FTR):**
- FTR-AUTH-003 (crawl exclusion verify): PARTIAL/ROBOTS_DEPLOYED — adequately surfaced in LFI §7 as NON_BLOCKING_FOLLOWUP ✓
- FTR-AUTH-004 (auth email branded shell): OPEN/PILOT_REQUIRED/P2 — not mentioned in LFI

**Nature of disparity:** Minor OVERLAY_GATE_NOT_SURFACED for FTR-AUTH-004 only. FTR-AUTH-003 is already well surfaced. FTR-AUTH-004 is PILOT_REQUIRED (not MVP_CRITICAL), so the FALSE_COMPLETION_RISK is low.

**Does LFI need a change?** YES — minor. Adding FTR-AUTH-004 as a lower-priority overlay item makes the picture complete.

**Step 2 proposed change:**
- LFI §7 FAM-06: Append to Notes column: "FTR-AUTH-004 (auth email branded shell extension, PILOT_REQUIRED/P2) open; implement in PILOT phase after core auth verified."

---

### E. FAM-01 / Soft-launch directory readiness (DISP-007)

**Current state:**
- LFI §7 FAM-01: "Maintain-only; run real-data smoke test (BS-001) before public outreach"

**Truth (from FTR):**
- FTR-SL-001 (aggregator directory readiness design): OPEN/MVP_CRITICAL/P1 — "Gate before first real supplier profile goes live in promotion context"

**Nature of disparity:** OVERLAY_GATE_NOT_SURFACED with FALSE_COMPLETION_RISK. FAM-01's B2C browse is VERIFIED_COMPLETE for the technical surface. But FTR-SL-001 is an explicit pre-outreach governance gate that has no implementation unit yet. It is MVP_CRITICAL. LFI §7 FAM-01 currently only mentions BS-001 (real-data smoke test). Paresh could read LFI and think only BS-001 is pending before outreach. In fact FTR-SL-001 (directory readiness design unit) is also required.

**Does this require downgrading FAM-01?** NO. FAM-01 core scope is PRODUCTION_CONFIRMED.

**Step 2 proposed change:**
- LFI §7 FAM-01: Update action note to: "Maintain-only for B2C browse technical surface. Pre-outreach gates: (1) BS-001 real-data smoke test; (2) FTR-SL-001 (soft-launch aggregator directory readiness design, MVP_CRITICAL/OPEN) — required before first real supplier profile goes live in promotion context; no governance unit yet opened."

---

### F. Legal prerequisites (DISP-009)

**Current state:**
- LFI §7 FAM-07: "Open family cycle; audit invite flow, onboarding state, control-plane visibility"
- FTR-LEGAL-002 → FAM-03 (addressed in §8-C above)

**Truth (from FTR):**
- FTR-LEGAL-003 (supplier ToS/platform agreement): OPEN/MVP_CRITICAL/P1 — PRIT-012 → FAM-07
- FTR-AUTH-001 (reused-existing-user): OPEN/MVP_CRITICAL/P1 — maps to FAM-07

**Nature of disparity:** OVERLAY_GATE_NOT_SURFACED for FAM-07. Since FAM-07 is NOT_ASSESSED, the disparity is pre-emptive — no verify-close exists to contradict LFI. However, the family cycle opening audit should be aware of these pre-existing known items so they are not lost when FAM-07 opens.

**Step 2 proposed change:**
- LFI §7 FAM-07 Notes column: Add "Known planned requirements entering this cycle: FTR-AUTH-001 (reused-existing-user onboarding, MVP_CRITICAL/P1), FTR-LEGAL-003 (supplier ToS/platform agreement, MVP_CRITICAL/P1 — PRIT-012)."

---

### G. Date chronology anomaly (DISP-013)

See §13 for full handling. No date changes in Step 2.

---

## 9. Proposed FTR/LFI Data Model

The following model clarifies the intended relationship between the two documents.

### FTR data model (current → target)

Every FTR item should carry:

| Field | Current state | Target state |
|---|---|---|
| ID | ✓ Sequential; unique | No change |
| Title | ✓ Action-oriented | No change |
| Description | ✓ | No change |
| Readiness class | ✓ | No change |
| Priority | ✓ | No change |
| Launch class | ✓ | No change |
| Status | ✓ | No change |
| **Destination Family** | ✗ MISSING from register tables; only in PRIT §12 notes | ADD: explicit family notation in Description or Notes for all MVP_CRITICAL and LAUNCH_DEPENDENCY items — minimum: `→ FAM-xx` suffix |
| **Overlay vs. core distinction** | ✗ Not explicit | ADD: note whether item is "family core scope" or "family overlay gate (separate authorization required)" |

### LFI data model (current → target)

Every verified family row should include:

| Field | Current state | Target state |
|---|---|---|
| Status | ✓ | No change |
| Evidence level | ✓ | No change |
| Action register | ✓ but incomplete for overlays | ADD: explicit "open overlay gates: FTR-xxx (class)" for any MVP_CRITICAL/LAUNCH_BLOCKER items mapped to this family |
| MVP cutline note | ✓ | ADD: overlay gate notation for verified families with open MVP_CRITICAL/LAUNCH_BLOCKER items |
| **VERIFIED_COMPLETE qualification** | ✗ Not explicit | ADD: "Control Plane lane VERIFIED_COMPLETE; overlay gates: FTR-OPS-001/003 remain open" pattern |

### Structural rule: "VERIFIED_COMPLETE" has a scope

LFI VERIFIED_COMPLETE means: the identified core scope of this family was verified in a closed
governance unit with cited evidence. It does NOT mean all launch obligations associated with this
family have been discharged. Open FTR overlay items in the same domain are tracked separately
and require their own authorization and implementation.

---

## 10. Anti-Drift Rules

These rules govern all future FTR updates and LFI updates.

### Rule AR-001 — Every FTR Item Must Have a Family Tag

Every FTR item in §3–§10 (and §14) must include one of these tags in its Description or Notes:

- `→ FAM-xx` — explicit destination family
- `→ FAM-xx (overlay)` — item is an overlay gate for a verified family, not core family scope
- `→ XDEP-only` — CRM/CAE item; no main repo family assignment
- `→ POST_MVP/no-family` — explicitly deferred post-MVP; no active family
- `→ STANDALONE` — independent unit not tied to a family cycle (e.g., legal pages bundle)
- `→ MULTI-FAM: FAM-xx, FAM-yy` — item spans multiple families
- `→ DECISION_GATED` — cannot be assigned until a pending decision resolves

### Rule AR-002 — Every Verified Family Must Carry an Overlay Inventory

When any LFI family row advances to VERIFIED_COMPLETE, the verify-close unit MUST answer:
"What FTR items remain open and mapped to this family?" and add a concise overlay note to
LFI §7 action register in one of these two forms:

- (a) `Open launch overlay gates: FTR-xxx (launch class), FTR-yyy (launch class)` — if items exist
- (b) `No known open launch overlay gates in FTR.` — if no open items exist

### Rule AR-003 — Status Separation

LFI family status MUST NOT be downgraded solely because an open FTR overlay item exists.
Downgrade is only permitted if the open item invalidates the verified core scope.

**Decision test before any downgrade:**
1. Does the open FTR item prove the verified core scope was incorrect? If YES → downgrade.
2. Does the open FTR item represent additional work within the same family domain? If YES → overlay note only; no downgrade.
3. Does the open FTR item represent a separate system/phase concern? If YES → separate FTR entry; no LFI status change.

### Rule AR-004 — MVP Cutline Overlay Gate

Any FTR item with launch class MVP_CRITICAL or LAUNCH_BLOCKER that is mapped to a verified
(VERIFIED_COMPLETE) LFI family MUST be visible in at least one of:
- LFI §7 action register for that family
- LFI §9 MVP cutline note for that family
- A dedicated overlay field/section in LFI

It must NOT be invisible across all LFI surfaces.

### Rule AR-005 — FTR Status Update Trigger Check

Any future FTR status change (OPEN → VERIFIED_COMPLETE, OPEN → PARTIAL, PARTIAL → VERIFIED_COMPLETE,
OPEN → CANCELLED, etc.) must answer before committing:

1. Does this change affect an LFI family row?
2. Which family (§5 status, §6 evidence, §7 action, §9 cutline)?
3. Does it change the family's implementation status (requires full verify-close), or only overlay wording?
4. If overlay wording only: is the new wording accurate in LFI?
5. If hub update required: is a separate hub-sync commit warranted, or is it minimal enough to include in the FTR commit?

### Rule AR-006 — Verify-Close Hub Sync Checklist (extend existing Q1–Q9)

The existing Q1–Q9 hub-sync checklist (from `TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001`)
should be extended with:

Q10: What FTR items are mapped to this family?
Q11: Are any of them MVP_CRITICAL or LAUNCH_BLOCKER?
Q12: Are they in-scope (core), overlay, post-MVP, or unrelated?
Q13: Does the LFI §7 action register note these as open overlay gates?
Q14: Does the LFI §9 cutline note reflect the verified/open split?

### Rule AR-007 — CRM/CAE XDEP Hard Boundary

No CRM or CAE implementation truth may be inlined into main repo LFI rows. Any claim about
CRM/CAE family status must cite a CRM/CAE repo audit unit. Until cited, all CRM/CAE rows remain
`XDEP_ONLY` with `NEEDS_REPO_INSPECTION` evidence level.

### Rule AR-008 — Bidirectional Cross-Reference Discipline

When adding a new FTR item:
1. If it maps to a verified family → check whether the LFI §7 note should be updated to mention it.
2. If it maps to a NOT_ASSESSED family → add it to LFI §7 "Known planned requirements" list.

When adding a new LFI verify-close:
1. Check FTR for all open items mapped to this family.
2. If none → write "No known open FTR overlay gates."
3. If some → add overlay note per AR-002.

---

## 11. Proposed Updates for Step 2 — LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001

### Step 2 scope: LFI changes

| Location | Change | Disparity Ref | Priority |
|---|---|---|---|
| LFI §7 FAM-01 action note | Add FTR-SL-001 as required pre-outreach gate alongside BS-001 | DISP-007 | HIGH |
| LFI §7 FAM-03 action note | Replace BS-002 reference with explicit FTR-B2C-004/B2C-005/LEGAL-002/SL-003 overlay list | DISP-006, DISP-011 | HIGH |
| LFI §7 FAM-04 action note | Update "FTR-SEO-001 gated" → "FTR-SEO-001 STRATEGY_DEFINED; open overlay: FTR-SEO-002/003/008/009" | DISP-001, DISP-003 | MEDIUM |
| LFI §6 FAM-04 review trigger | Update from "Domain canonical decision (FTR-SEO-001)" to reflect STRATEGY_DEFINED | DISP-002 | MEDIUM |
| LFI §7 FAM-06 Notes | Add FTR-AUTH-004 (PILOT_REQUIRED) as minor overlay note | DISP-008 | LOW |
| LFI §7 FAM-07 Notes | Add FTR-AUTH-001 (MVP_CRITICAL) and FTR-LEGAL-003 (MVP_CRITICAL) as known planned items | DISP-009 | MEDIUM |
| LFI §7 FAM-10 action note | Add platform ops overlay gates: FTR-OPS-001, FTR-OPS-003 (MVP_CRITICAL), FTR-OPS-002 (PILOT_REQUIRED) | DISP-004 | HIGH |
| LFI §9 FAM-10 cutline row | Add overlay note: FTR-OPS-001/003 MVP_CRITICAL open | DISP-005 | HIGH |

### Step 2 scope: FTR changes

| Location | Change | Disparity Ref | Priority |
|---|---|---|---|
| FTR §8 FTR-OPS-001 row | Add `→ FAM-10 (overlay)` to Description/Notes | DISP-010 | HIGH |
| FTR §8 FTR-OPS-002 row | Add `→ FAM-10 (overlay)` to Description/Notes | DISP-010 | HIGH |
| FTR §8 FTR-OPS-003 row | Add `→ FAM-10 (overlay)` to Description/Notes | DISP-010 | HIGH |
| FTR §9 FTR-LEGAL-002 row | Confirm `→ FAM-03 (overlay)` mapping (already in PRIT §12; add inline note) | DISP-010 | HIGH |
| FTR §9 FTR-LEGAL-003 row | Confirm `→ FAM-07 (overlay)` mapping (already in PRIT §12; add inline note) | DISP-010 | HIGH |
| FTR §10 FTR-SL-001 row | Add `→ FAM-01 (pre-outreach overlay)` | DISP-010 | HIGH |
| FTR §10 FTR-SL-004 row | Add `→ FAM-08 (candidate — Paresh to confirm at FAM-08 cycle opening)` | DISP-012 | MEDIUM |
| FTR §6 FTR-AUTH-004 row | Add `→ FAM-06 (overlay, PILOT_REQUIRED)` | DISP-008 | LOW |

### Step 2 scope: what NOT to change

- FTR §7 FTR-CP-001 — already VERIFIED_COMPLETE; consistent; no change
- FTR §14 FTR-FAM-001/FTR-FAM-002/FTR-FAM-003/FTR-FAM-004 status rows — correctly reflect current state
- LFI §5 Classification Matrix — no family status changes permitted in Step 2; only §6/§7/§9 text updates
- LFI §5 FAM-10 Status — remains VERIFIED_COMPLETE; overlay note goes in §7/§9 only
- LFI §5 FAM-03 Status — remains VERIFIED_COMPLETE; overlay note goes in §7 only
- LFI §5 FAM-01 Status — remains VERIFIED_COMPLETE; overlay note goes in §7 only
- LFI §8 cycle order — advisory; no change
- LFI §11/§12 rules — no change
- LFI §13 soft-launch note — no change needed
- Any CRM/CAE rows (FAM-20/21/22/23/24) — remain XDEP_ONLY; no change

### Step 2 commit scope

Exactly three files:
1. `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
2. `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
3. `artifacts/control-plane/LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001.md` (normalization artifact)

---

## 12. Rows That Should Not Change and Why

| Row | Doc | Reason not to change |
|---|---|---|
| FAM-10 §5 Status: VERIFIED_COMPLETE | LFI | Verified by 10 bounded units + production smoke 15/15. Open FTR-OPS items are overlay gates, not invalidations of the verified control-plane scope. Downgrade would be FALSE_DOWNGRADE_RISK. |
| FAM-03 §5 Status: VERIFIED_COMPLETE | LFI | Inquiry submission DB path production-confirmed. Notification/legal overlay items are separate authorization scope. Downgrade would be FALSE_DOWNGRADE_RISK. |
| FAM-01 §5 Status: VERIFIED_COMPLETE | LFI | B2C browse production-confirmed. FTR-SL-001 is a governance design unit to be opened, not a defect in what was verified. |
| FAM-04 §5 Status: VERIFIED_COMPLETE | LFI | Core SEO (sitemap/robots/JSON-LD) production-confirmed. Open FTR-SEO items are design-gated overlays dependent on future content and supplier policy decisions. |
| FAM-06 §5 Status: VERIFIED_COMPLETE | LFI | Auth/session family cycle closed with strong test evidence. FTR-AUTH-003 NON_BLOCKING_FOLLOWUP and FTR-AUTH-004 PILOT_REQUIRED are overlay items, not core scope defects. |
| FTR-AUTH-003 status (ROBOTS_DEPLOYED / PARTIAL) | FTR | Correctly PARTIAL; FU-004 recrawl evidence pending; no new evidence available. |
| FTR-B2C-005 status (OPEN / DEFERRED) | FTR | Correctly OPEN/DEFERRED; no approved supplier slug or observability source; no Paresh rerun authorization. |
| FTR-FAM-002 (PRODUCTION_INTENT_ARCHITECTURE_REQUIRED — HOLD_FOR_AUTHORIZATION) | FTR | Layer 0 HOLD; no authorization event occurred. |
| FTR-FAM-004 (DESIGN_ARTIFACT_CREATED — HOLD_FOR_CONTENT_DRAFT) | FTR | Correctly reflects architecture artifact created; next step PRIT-034-002 requires explicit Paresh authorization. |
| LFI §8 cycle order | LFI | Advisory only per LFI §11; no new family cycle completed in this unit. |
| LFI §11 maintenance rules | LFI | Governance rules; not updated during normalization passes. |
| LFI §12 audit gate | LFI | Binding hard gate; not updated during normalization passes. |
| LFI §9 VERIFIED_COMPLETE rows for FAM-01/02/03/04/06 | LFI | These are status-correct; only the overlay note for FAM-10 cutline row needs updating (DISP-005). |
| All CRM/CAE rows (FAM-20–24) | LFI | XDEP_ONLY boundary; no main repo implementation truth available; do not change. |
| All OPEN/BLOCKED/NOT_ASSESSED FTR rows status | FTR | No implementation or governance close event occurred; status fields are correct. |
| FTR §11 Update History entries | FTR | Historical record; do not retroactively alter. |
| FTR §10 (HIST-001 through HIST-011) resolved items | FTR | Historical record; do not alter. |
| FTR §13 Commerce/payments parked units | FTR | Correctly PARKED; all gated on Paresh decisions and counsel feedback. |
| Layer 0 files (NEXT-ACTION.md, BLOCKED.md, OPEN-SET.md) | Layer 0 | Read-only in this design and in Step 2; never updated from bounded hub-sync work. |

---

## 13. Date Chronology Handling Recommendation

### Observed anomaly

Multiple dates in FTR/LFI reference months July 2026 (2026-07-xx) while the current active
execution date is 2026-05-28 (May). Specific occurrences:

| Date | Location | Context |
|---|---|---|
| 2026-07-14 | FTR §11 Update History | FTR-B2C-004 added; FTR-SL-004 etc. |
| 2026-07-14 | PRIT §12 PRIT confirmation date | PRIT confirmed by Paresh |
| 2026-07-22 | FTR §11 | FTR-SEO-001 STRATEGY_DEFINED; FTR-AUTH-003 evidence; FU-002 GSC check |
| 2026-07-22 | LFI §6 FAM-06 | Last Verified Date |
| 2026-07-22 | LFI §7 FAM-06 | VERIFIED_COMPLETE date |
| 2026-07-06 | NEXT-ACTION.md | NC Phase 1 post-audit QA seed reset VERIFIED_COMPLETE |
| 2026-07-06 | OPEN-SET.md | Same unit |
| 2026-07-06 | LFI §6 FAM-12/13/16 | Various NC unit verification dates |
| 2026-06-xx | BLOCKED.md | Various NC resolved blocker dates |

### Classification of the anomaly

These are not future-dated forecast entries. They are **historical governance record dates** that
were captured in prior sessions where the session date was set to July 2026. The governance corpus
was built across multiple sessions. The session execution dates in July 2026 predate the current
active session date of May 2026 in calendar terms — this is a session-date inversion artifact,
not a deliberate forward-dating.

Evidence: The commit dates are in May 2026 (e.g., HEAD `c4cc62f`, prior commits `979f838`,
`6f9796c` all timestamped in May 2026). The governance document dates appear to have been
supplied as session dates by the AI assistant during those prior sessions.

### Handling rule

1. **Do not retroactively alter any date already recorded in FTR, LFI, or governance artifacts.**
   Altering historical dates would make the governance changelog unreliable.

2. **For new entries added in Step 2 (normalization apply):** Use the actual current execution
   date `2026-05-28` for any new dated notes or history entries.

3. **For ongoing work:** Record actual execution dates from `git log` timestamp or prompt-supplied
   current date. Do not use session-inferred future dates.

4. **When reading FTR/LFI:** Treat 2026-07-xx dates in governance records as historical session
   dates from prior governance work, not as launch timeline targets or future-scheduled events.

5. **Recommendation:** Add a single explanatory note to FTR §1 Purpose section in a future
   maintenance pass (not Step 2) clarifying: "Dates in this register reflect governance session
   dates and may not correspond to calendar chronology. For actual commit dates, refer to git log."

6. **No audit or cleanup of dates is required in Step 2.** Step 2 adds new notes with current dates.

---

## 14. CRM/CAE XDEP Boundary Confirmation

| Check | Finding |
|---|---|
| LFI FAM-20/21/23 rows | Correctly `XDEP_ONLY`; `NEEDS_REPO_INSPECTION` evidence level; no main repo internals recorded |
| LFI FAM-22/24 rows | Correctly `XDEP_ONLY` with `GOVERNANCE_CLAIM_ONLY` or `DESIGN_GATED`; main platform XDEP side only |
| FTR §15.3 CRM Pending Units | Correctly recorded as cross-repo status only; no CRM implementation truth inlined |
| FTR §15.2 Marketing Pending Units | Correctly recorded as cross-repo status only |
| FTR §15.4 FTR-SL-002 | Correctly marked as XDEP/pending; not assigned to a main repo family |
| FTU-COMM-005 B2B financial boundary | Applies to main repo families (FAM-12–16 boundary); correctly PARKED; no CRM/CAE boundary risk |
| This design artifact | No CRM/CAE implementation details inlined; XDEP boundary preserved throughout |

**CRM/CAE boundary: CONFIRMED CLEAN.** No violations found in FTR, LFI, or this design artifact.

---

## 15. Recommended Next Prompt

**Recommended:** `LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001`

### Allowlist for Step 2

**Writable:**
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `artifacts/control-plane/LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001.md`

**Read-only:** all other governance, source, schema, config, and package files

### Step 2 minimum required preflight

1. Confirm HEAD matches Step 2 carry-forward (expected: this design commit or later)
2. Confirm working tree clean
3. Confirm no family status (§5) changes are in scope
4. Read this design artifact in full before applying any updates

### Step 2 boundaries

- Apply only the changes listed in §11 above
- Do not downgrade any VERIFIED_COMPLETE family status
- Do not change FTR item status fields (Status, Readiness, Priority columns)
- Do not change LFI §5 Classification Matrix status column
- Do not update Layer 0 files
- Do not change LFI §11/§12 governance rules
- Do not alter any historical dates
- Do not apply CRM/CAE implementation truth from main repo evidence

### Step 2 commit message

```
docs: normalize FTR LFI crosswalk overlay gates and family mappings
```

---

## 16. Non-Update Statement

This unit performed governance design work only. Neither `FUTURE-TODO-REGISTER.md` nor
`LAUNCH-FAMILY-INDEX.md` were edited during this prompt. No source code, schema, seed, config,
or package files were modified. No production API calls, no DB mutations, no secrets accessed
or printed. No family status was advanced. No FTR item status was changed. No CRM/CAE
implementation details were inlined. Only the allowed design artifact was created.

---

## 17. Safety Confirmation

| Guard | Status |
|---|---|
| `FUTURE-TODO-REGISTER.md` edited | NO |
| `LAUNCH-FAMILY-INDEX.md` edited | NO |
| Layer 0 files (NEXT-ACTION.md, BLOCKED.md, OPEN-SET.md) edited | NO |
| Source/test/schema/config/package files edited | NO |
| Migration created or run | NO |
| Production API call or DB mutation executed | NO |
| Family status advanced | NO |
| FTR item status changed | NO |
| CRM/CAE implementation details inlined | NO |
| `org_id` tenant isolation | NOT TOUCHED |
| Auth/session logic | NOT TOUCHED |
| Secrets (DB URLs, JWTs, API keys) | NOT TOUCHED |
| Only allowed design artifact created | YES — `artifacts/control-plane/LAUNCH-HUB-FTR-LFI-CROSSWALK-RECONCILIATION-DESIGN-001.md` |

---

## 18. Final Enum

```
LAUNCH_HUB_FTR_LFI_CROSSWALK_RECONCILIATION_DESIGN_COMPLETE
```

**Design complete.** 14 disparities identified and classified. 5 high-severity
OVERLAY_GATE_NOT_SURFACED / FALSE_COMPLETION_RISK items found for FAM-10, FAM-03, and FAM-01.
2 medium-severity STALE_TEXT_DRIFT items found for FAM-04. 8 anti-drift rules defined.
Step 2 scope scoped and bounded. Hub files not edited. CRM/CAE boundary clean.
Recommended next: `LAUNCH-HUB-FTR-LFI-CROSSWALK-NORMALIZATION-APPLY-001`.
