# BLOCKED.md — Layer 0 Blocker / Hold Register

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-06-02 (TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001 PENDING_PRODUCTION_VERIFY: AF-2 gate !==true semantics FIXED in 3 middlewares; AF-3 PoolListSurface error mapping FIXED. DB provisioning of nc.procurement_pools.enabled still BLOCKED_PARESH_PROVISIONING_REQUIRED. FE-8 remains BLOCKED_PARESH_AUTHORIZATION_REQUIRED.)

> Read this file after `NEXT-ACTION.md`. It records only current blockers, holds, and governance
> exceptions relevant to live Layer 0 posture. It does not originate ordinary product delivery
> sequencing.

---

## Section 1 — BLOCKED

| Item | Status | Posture |
| --- | --- | --- |
| `NC-RUNTIME-MISMATCH-A: nc.procurement_pools.enabled absent` | `BLOCKED_PARESH_PROVISIONING_REQUIRED` | Production DB missing nc.procurement_pools.enabled flag. All pool-owner routes return 503 FEATURE_DISABLED. NC Pools surface shows feature-disabled state (PoolListSurface error mapping fix delivered in TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001). Fix: INSERT nc.procurement_pools.enabled=true in feature_flags via psql (requires Paresh). Gate semantics now canonical — seeding this flag will allow pool access without per-tenant overrides. See governance/TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001.md §7. |
| `NC-RUNTIME-MISMATCH-B: invite/pool/rfq gate !== true semantics` | `RESOLVED — TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001 (2026-06-02)` | FIXED: ncPoolSupplierInviteFeatureGateMiddleware + ncPoolFeatureGateMiddleware + ncPoolRfqFeatureGateMiddleware Layer 2 changed from !==true to ===false (canonical semantics). No-override row now ALLOWS (global=true is sufficient). 49/49 gate unit tests PASS. Production function pending nc.procurement_pools.enabled DB provisioning. See governance/TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001.md. |
| `TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001` | `BLOCKED_PARESH_AUTHORIZATION_REQUIRED` | FE-8 supplier quote UI: backend complete (Packets 11 + 12 + 13 all VERIFIED_COMPLETE). Routes: GET + POST /supplier-rfq-invites/:inviteId/quote live. Blocked on separate Paresh FE-8 authorization before frontend execution begins. Design authority: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001 DESIGN_COMPLETE. |
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
