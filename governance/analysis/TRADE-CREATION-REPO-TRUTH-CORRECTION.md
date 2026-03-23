# TRADE-CREATION-REPO-TRUTH-CORRECTION-001

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS
Status: RECORDED
Scope: Repo-truth correction only. No implementation authorized. No Layer 0 status transition.

## Original Prior Framing

The prior framing treated tenant trade work as if the platform still had a broad
"backend exists, frontend absent" condition for the entire tenant trade surface.
That framing is now stale.

The stale source is explicitly visible in the older audit posture recorded in
`docs/governance/audits/2026-03-copilot-frontend-backend-audit.md`, which
classified G-017 as `BACKEND_COMPLETE / FRONTEND_ABSENT` and stated there was no
tenant or control-plane trade surface wired from the browser.

## Corrected Repo-Truth Framing

Current repo truth is narrower and materially different:

1. A tenant trade read-only UI already exists.
2. That existing tenant trade surface is explicitly bounded to listing only.
3. The remaining unresolved tenant trade gap is the create/write path, not the
   existence of a tenant trade UI in general.
4. Trade lifecycle transitions remain a separate concern and must not be folded
   into the create/write gap.
5. The backend already exposes tenant create and transition routes, and the
   trade service layer already supports creation.
6. The current state does not support describing this as a simple ready-to-wire
   UI gap, because create inputs and placement constraints remain unresolved.

## Repo Evidence

### 1. Tenant read-only trade surface exists

`components/Tenant/TradesPanel.tsx` already exists and self-classifies its scope
as:

- `Read-only trade list`
- `Create trade — out of scope`
- `Lifecycle transitions — out of scope`
- `Trade detail drill-down — out of scope`

This is decisive evidence that the tenant trade surface is not absent; it is
present and intentionally bounded.

### 2. Frontend tenant trade service is list-only by design

`services/tradeService.ts` already exists and is explicitly documented as:

- `Tenant-plane trade read surface`
- `Read-only: listTenantTrades only. No create / update / delete surfaces.`

This confirms the unresolved gap is the missing create/write client path, not a
missing trade service altogether.

### 3. Backend tenant create route exists

`server/src/routes/tenant/trades.g017.ts` already defines:

- `GET /api/tenant/trades`
- `POST /api/tenant/trades`
- `POST /api/tenant/trades/:id/transition`

The create route validates create inputs at the route boundary and derives
`tenantId` from authenticated context rather than client input.

### 4. Service-layer trade creation support exists

`server/src/routes/tenant/trades.g017.ts` calls `tradeSvc.createTrade(...)`.

`server/src/services/trade.g017.types.ts` defines `TradeCreateInput`, requiring:

- `tenantId`
- `buyerOrgId`
- `sellerOrgId`
- `tradeReference`
- `currency`
- `grossAmount`
- `reason`
- optional `reasoningLogId`
- optional `createdByUserId`

This proves the backend is not awaiting service-layer design before a tenant
create surface can exist.

### 5. Tenant dashboard placement is not canonically declared

`docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md` is the authoritative dashboard
surface definition and explicitly states that no module ships without a declared
entry there.

Within the tenant matrix, there is no dedicated declared tenant `Trades` module.
This means create-surface placement cannot be treated as fully pre-decided by
the current canonical surface map.

### 6. Counterparty integrity remains non-trivial

`docs/audits/GAP-015-016-017-019-VALIDATION-REPORT.md` records that
`buyerOrgId` and `sellerOrgId` have no foreign key to `organizations`.

That creates a real counterparty integrity risk:

- a trade can reference a non-existent organization UUID
- a trade can reference a cross-org UUID without DB-level guarantee

This weakens any claim that tenant trade creation is merely a thin UI wiring
exercise.

## Governance-History Evidence

`governance/units/TECS-FBW-002-B.md` is already CLOSED and VERIFIED.

That unit records all of the following as completed historical truth:

1. Backend `GET /api/tenant/trades` route designed, implemented, and verified.
2. `components/Tenant/TradesPanel.tsx` implemented against the live backend
   route.
3. `services/tradeService.ts` created for the read-only trade list surface.
4. Verification completed on 2026-03-17.

This means any current description that starts from "tenant trade UI is missing"
is governance-inaccurate.

## Current Exact Status

The exact current status is:

- Tenant trade read-only list surface: present
- Tenant trade read-only frontend service wrapper: present
- Tenant backend list route: present
- Tenant backend create route: present
- Tenant backend transition route: present
- Service-layer trade creation support: present
- Tenant trade create/write frontend path: absent
- Tenant trade transition frontend path: absent and separate
- Canonical tenant dashboard placement for a trade module: ambiguous / not
  declared in the current authoritative matrix

## Explicit Separations

The following separations must remain explicit:

1. Read-only trade listing is already implemented history, not open missing
   scope.
2. Trade creation is separate from trade lifecycle transitions.
3. Tenant-plane trade creation is separate from control-plane trade oversight.
4. Backend availability is separate from frontend decision-readiness.
5. Existence of routes is separate from adequacy of product inputs and placement.

## Constraints / Unresolved Requirements

The remaining unresolved constraints are material:

1. Create input requirements are non-trivial and already backend-shaped.
2. `buyerOrgId` and `sellerOrgId` imply a counterparty/org-selection dependency
   that is not currently resolved by an obvious tenant-plane selector surface.
3. The authoritative dashboard matrix does not currently anchor a tenant
   `Trades` module, so placement is not canonically settled.
4. Transition handling is already separate in scope and should not be bundled
   into a create-write unit without deliberate authorization.
5. Counterparty integrity remains weakened by the known lack of DB foreign-key
   guarantees on `buyerOrgId` and `sellerOrgId`.

## Decision-Readiness Implication

The corrected repo truth supports the following conclusion:

This area should not be described as a broad missing trade UI or as a purely
mechanical "wire the existing backend to the frontend" task.

The true unresolved work is narrower than the stale framing, but it is also not
fully implementation-ready on repo evidence alone because product placement,
counterparty selection, and create-input handling remain unresolved.

## Recommended Handling In Future Sequencing

If this area is later sequenced, it should be handled as a create-path-specific
decision or implementation track, not as a generic tenant trade UI build.

Any future framing should preserve all of the following:

1. read-only tenant trades already exist
2. transitions remain separate
3. create-path placement is not canonically anchored yet
4. counterparty selection is a real prerequisite, not a minor detail

This analysis does not open that work and does not rank it against other
candidates.

## Confidence Level

Confidence: HIGH

Basis for confidence:

1. direct repo evidence in the tenant component, frontend service, backend
   routes, and backend types
2. direct governance-history evidence from the already-closed TECS-FBW-002-B
   unit
3. direct architectural evidence from the canonical dashboard matrix
4. direct audit evidence identifying the counterparty-integrity constraint

## Final Correction Statement

The current repo does not support the statement "tenant trade UI is still
missing."

The repo does support the narrower statement: tenant trade read-only UI already
exists; tenant trade create/write frontend support is still missing; lifecycle
transitions remain separate; and create-path readiness is constrained by real
input and placement ambiguity.