# BLOCKED.md — Layer 0 Blocker / Hold Register

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-06-09 (TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-PROD-VERIFY-GOV-CLOSE-001 VERIFIED_COMPLETE. FE-4 DemandLineSurface polished surface confirmed live in production. All 12-point checklist PASS. Controlled-form fix verified in browser. DB invariants unchanged. No flag activation. No data mutation. QD-6 unchanged. rfq.award.enabled ABSENT. DPP HOLD_FOR_PARESH_DECISION unchanged.)

> Read this file after `NEXT-ACTION.md`. It records only current blockers, holds, and governance
> exceptions relevant to live Layer 0 posture. It does not originate ordinary product delivery
> sequencing.

---

## Section 1 — BLOCKED

| Item | Status | Posture |
| --- | --- | --- |
| `NC-RUNTIME-MISMATCH-A: nc.procurement_pools.enabled absent/test-labeled` | `RESOLVED — TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001 (2026-06-02)` | CONFIRMED: Both flags were already true (seeded by integration tests 2026-05-11/12 with test-label descriptions). SQL transaction (BEGIN; INSERT ON CONFLICT DO UPDATE; COMMIT → INSERT 0 2 + COMMIT) updated descriptions to production-canonical values: 'NC Phase 1: procurement pools feature — global enable' and 'NC Phase 1: pool RFQ feature — global enable'. Post-state verified: nc.procurement_pools.enabled=t, nc.procurement_pools.rfq.enabled=t. supplier_quotes.enabled=f unchanged (QD-6 hold maintained). See governance/TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001.md. |
| `NC-RUNTIME-MISMATCH-B: invite/pool/rfq gate !== true semantics` | `RESOLVED — TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001 (2026-06-02)` | FIXED: ncPoolSupplierInviteFeatureGateMiddleware + ncPoolFeatureGateMiddleware + ncPoolRfqFeatureGateMiddleware Layer 2 changed from !==true to ===false (canonical semantics). No-override row now ALLOWS (global=true is sufficient). 49/49 gate unit tests PASS. Production function pending nc.procurement_pools.enabled DB provisioning. See governance/TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001.md. |
| `TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001` | `VERIFIED_COMPLETE (2026-06-08)` | Fix: { timeout: 30000 } added to issueRfq $transaction. Root cause: Prisma default 5 s tx timeout exceeded in Vercel serverless + Supabase pooler (≥8 round-trips). SM lifecycle log write hit closed tx → 422 TRANSITION_DENIED in production. PRQ-16: ✓ 201. tsc EXIT 0. No route/frontend/schema/migration/env/flag changes. QD-6 hold unchanged. DPP HOLD_FOR_PARESH_DECISION unchanged. Deploy required to unblock FE-9. See governance/TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-TX-TIMEOUT-FIX-001.md. |
| `TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-PROD-VERIFY-GOV-CLOSE-001` | `VERIFIED_COMPLETE (2026-06-09)` | FE-4 DemandLineSurface polished surface confirmed live in production. All 12-point browser checklist PASS. Controlled-form fix verified in browser (typed value TEST-CONTROLLED-FORM-001 retained). No console errors on Demand Lines page. Back navigation works. DB post-check: supplier_quotes.enabled=false unchanged (QD-6), rfq.award.enabled ABSENT, demand line LOCKED_FOR_RFQ unchanged, quote_count=0 unchanged. No data mutation. DPP HOLD_FOR_PARESH_DECISION unchanged. See governance/TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-PROD-VERIFY-GOV-CLOSE-001.md. |
| `TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001` | `VERIFIED_COMPLETE (2026-06-09)` | DemandLineSurface.tsx fully rewritten with Tailwind utility classes matching TexQtic platform visual standard. Data-flow bug fixed: DemandLineForm made fully controlled (parent owns formState via onFieldChange callback). 27 new frontend tests created. 91/91 total frontend tests PASS. pnpm run typecheck EXIT 0. Lint clean on all touched files. No backend/schema/migration/env/flag/production-data changes. QD-6 unchanged. rfq.award.enabled ABSENT. DPP HOLD_FOR_PARESH_DECISION unchanged. See governance/TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001.md. |
| `TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001` | `VERIFIED_COMPLETE (2026-06-08)` | FE-9 production verification complete. QuoteReviewPanel feature-disabled path confirmed in production (v2.4.0). nc.procurement_pools.rfq.award.enabled row ABSENT in production feature_flags (middleware fails closed → 503 FEATURE_DISABLED — same as false). All 14-point §14 checks PASS. QA RFQ issued (b3abfbdb, ISSUED, SNAPSHOT_LOCK). Amber banner rendered, flag code element present, zero Accept/Reject controls, Back navigation confirmed. post-check: supplier_quotes.enabled=false unchanged (QD-6), quote_count=0 unchanged. No source/schema/migration/env/flag changes. FE-10 HOLD_FOR_PARESH_DECISION unchanged. DPP: HOLD_FOR_PARESH_DECISION unchanged. See governance/TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-PROD-VERIFY-GOV-CLOSE-001.md. |
| `TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001` | `VERIFIED_COMPLETE (2026-05-12)` | FE-8 supplier quote frontend VERIFIED_COMPLETE. QA-DATA-SETUP-001 VERIFIED_COMPLETE. QA invite inserted (invite_id=37e10cc1, ACCEPTED, invite_ref=QA-DATA-SETUP-001-INV). SupplierQuoteSurface confirmed: feature-disabled amber banner (`Supplier Quote Submission Disabled`). Back navigation confirmed. No quote submitted. No quote row created. supplier_quotes.enabled=false unchanged (QD-6 hold maintained). See: governance/TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001.md, governance/TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-PROD-VERIFY-001.md. Next: feature flag activation requires separate explicit Paresh decision to lift QD-6. |
| `TEXQTIC-NC-REMOTE-DB-PRISMA-LEDGER-RECONCILIATION-001` | `RESOLVED` | Subsumed and resolved by DEPLOYMENT-RESOLUTION-001. All 3 migrations now applied to remote Supabase DB. See `governance/TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-RESOLUTION-001.md`. |
| `TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-001` | `RESOLVED` | **RESOLVED by TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-RESOLUTION-001 (2026-05-12).** Option A executed: `prisma migrate resolve --applied 20260530000000_nc_pool_supplier_invite_feature_flag_seed` + `prisma migrate deploy`. 20260531000000 + 20260532000000 applied. `network_pool_rfq_supplier_quotes` live. `nc.procurement_pools.supplier_quotes.enabled` seeded false. `nc.procurement_pools.supplier_invites.enabled` remains true (preserved). Prisma: "Database schema is up to date!". 104/104 regression tests pass. See `governance/TEXQTIC-NC-REMOTE-DB-MIGRATION-DEPLOYMENT-RESOLUTION-001.md`. |

## Section 2 — HOLDS / REVIEW-UNKNOWN

| Item | Status | Posture |
| --- | --- | --- |
| `White Label Co` | `REVIEW-UNKNOWN` | Preserved as the sole current hold under fixed post-verdict posture `EXACT_EXCEPTION_STILL_REMAINS`. No normalization claim, disposition work, or implementation follow-up is implied by this sync. |

- Exact post-verdict exception: no fixed bounded authority yet proves the remaining seam is already
    one cleanly separable, overlay-owned downstream governance slice that can advance without unsafe
    normalization into broader `B2C`, domain / routing / brand-surface, identity / tenancy,
    tenant-back-office, or canon-expansion work.

## Section 3 — Excluded from blocker treatment in this pass

- Ordinary product sequencing belongs to the product-truth authority stack and is not set here.
- Planning-package recommendations are not live authority and are not blockers in this reset pass.
- Closed onboarding-family chains remain preserved aligned anchors only and are not reopened here.
- The reused-existing-user bucket remains `BOUNDED-DEFERRED-REMAINDER`, but it is not reopened,
  re-sequenced, or promoted into a reset blocker by this pass.

## Section 4 — Non-Blocking Hold Confirmation — Historical Record (unit closed)

The following non-blocking confirmation was produced for `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE`
and was slice-bounded only. It does NOT carry forward to any future slice.

| Closed Unit | Hold | Closure Status | Basis |
| --- | --- | --- | --- |
| `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE` | White Label Co `REVIEW-UNKNOWN` | **CLOSED — VERIFIED_COMPLETE** | Non-blocking confirmation was scope-bounded to this slice only. All six WL Co risk domains (brand-surface, domain/routing, identity/tenancy, admin overlay, canon expansion, unsafe B2C normalization) tested as NOT APPLICABLE. Confirmed by `TEXQTIC-WL-CO-B2C-SLICE3-COMPATIBILITY-REASSESSMENT-v1.md` (commit `1f01a84`). Hold remains `REVIEW-UNKNOWN` for WL Co work itself; not resolved by this confirmation. |

Carry-forward truth: WL Co hold remains `REVIEW-UNKNOWN` (unresolved generally). Any future slice
intersecting WL brand-surface, domain/routing, identity/tenancy, admin overlay, or canon-expansion
domains requires a fresh WL Co reassessment before that slice may proceed.
