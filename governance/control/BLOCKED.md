# BLOCKED.md — Layer 0 Blocker / Hold Register

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-05-12 (TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001 VERIFIED_COMPLETE. FE-8 VERIFIED_COMPLETE. QA invite SQL committed. SupplierQuoteSurface feature-disabled path confirmed. No quote submitted. supplier_quotes.enabled=false unchanged. DPP posture HOLD_FOR_PARESH_DECISION unchanged.)

> Read this file after `NEXT-ACTION.md`. It records only current blockers, holds, and governance
> exceptions relevant to live Layer 0 posture. It does not originate ordinary product delivery
> sequencing.

---

## Section 1 — BLOCKED

| Item | Status | Posture |
| --- | --- | --- |
| `NC-RUNTIME-MISMATCH-A: nc.procurement_pools.enabled absent/test-labeled` | `RESOLVED — TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001 (2026-06-02)` | CONFIRMED: Both flags were already true (seeded by integration tests 2026-05-11/12 with test-label descriptions). SQL transaction (BEGIN; INSERT ON CONFLICT DO UPDATE; COMMIT → INSERT 0 2 + COMMIT) updated descriptions to production-canonical values: 'NC Phase 1: procurement pools feature — global enable' and 'NC Phase 1: pool RFQ feature — global enable'. Post-state verified: nc.procurement_pools.enabled=t, nc.procurement_pools.rfq.enabled=t. supplier_quotes.enabled=f unchanged (QD-6 hold maintained). See governance/TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001.md. |
| `NC-RUNTIME-MISMATCH-B: invite/pool/rfq gate !== true semantics` | `RESOLVED — TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001 (2026-06-02)` | FIXED: ncPoolSupplierInviteFeatureGateMiddleware + ncPoolFeatureGateMiddleware + ncPoolRfqFeatureGateMiddleware Layer 2 changed from !==true to ===false (canonical semantics). No-override row now ALLOWS (global=true is sufficient). 49/49 gate unit tests PASS. Production function pending nc.procurement_pools.enabled DB provisioning. See governance/TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001.md. |
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
