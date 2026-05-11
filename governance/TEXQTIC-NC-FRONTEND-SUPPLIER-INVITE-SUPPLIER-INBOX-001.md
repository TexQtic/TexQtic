# TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-SUPPLIER-INBOX-001

## Packet Metadata

| Field | Value |
|-------|-------|
| Packet ID | TEXQTIC-NC-FRONTEND-SUPPLIER-INVITE-SUPPLIER-INBOX-001 |
| Feature Tag | FE-7 |
| Date | 2026-05-11 |
| Prerequisite Commit | `2ae2bbb` — docs(network-commerce): close supplier invite production verification (GOV-CLOSE-002) |
| Production Commit | `4cd7c0a` at `origin/main` — backend supplier invite supplier routes live |
| Local HEAD at commit | Post-commit of this packet (see commit hash below) |
| Branch | main |
| Status | TEXQTIC_NC_FRONTEND_SUPPLIER_INVITE_SUPPLIER_INBOX_001_VERIFIED_COMPLETE |

---

## Prerequisite Confirmation

Packet TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-002 (`2ae2bbb`) was
completed and committed prior to this unit. Production commit `4cd7c0a` at `origin/main`
carries all 4 backend supplier invite route handlers:

- `GET  /api/tenant/network-commerce/supplier-rfq-invites`
- `GET  /api/tenant/network-commerce/supplier-rfq-invites/:inviteId`
- `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/accept`
- `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/decline`

These routes were verified PASS in GOV-CLOSE-002 (SRI 11/11, ORI 50/50, DLT 77/77).

---

## Scope

This unit implements the frontend supplier invite inbox surface (FE-7): the supplier-facing
view for listing, inspecting, accepting, and declining incoming RFQ pool invitations.

**What this unit does NOT do:**
- No FE-8 (supplier quote UI) — held HOLD_FOR_PARESH_DECISION.
- No backend changes — all routes were already live at `4cd7c0a`.
- No DPP or non-NC changes.
- No control-plane changes.
- No changes to `active_delivery_unit` (remains `HOLD_FOR_AUTHORIZATION`).
- No changes to `dpp_launch_authorization` (remains `HOLD_FOR_PARESH_DECISION`).

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `services/networkCommerceService.ts` | Modified | FE-7 section appended: 2 interfaces, 4 service functions |
| `components/Tenant/NetworkCommerce/SupplierInviteInbox.tsx` | Created (NEW) | Supplier invite inbox component |
| `App.tsx` | Modified (narrow patch) | Import added; `nc_pool_invite_inbox` route wired to `<SupplierInviteInbox />` |
| `tests/frontend/network-commerce-supplier-invite-inbox.test.tsx` | Created (NEW) | 11 Vitest tests for FE-7 inbox surface |

---

## Service Methods Added (`services/networkCommerceService.ts`)

### Interfaces

```typescript
export interface SupplierInviteInboxItem {
  id: string;
  invite_ref: string;
  status: string;            // OD-2: Effective — may be EXPIRED even if DB is PENDING
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  expires_at: string | null;
  supplier_message: string | null;
  rfq_ref: string | null;    // null on list; populated on detail (view endpoint)
  rfq_version: number | null;
  rfq_status: string | null;
  issued_at: string | null;
  response_deadline_at: string | null;
  issue_basis: string | null;
  line_count: number | null;
  total_qty: string | null;
  qty_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcceptInviteInput { note?: string | null; }
export interface DeclineInviteInput { declineReason?: string | null; }
```

### Functions

```typescript
listIncomingSupplierInvites(): Promise<SupplierInviteInboxItem[]>
viewIncomingSupplierInvite(inviteId: string): Promise<SupplierInviteInboxItem>
acceptIncomingSupplierInvite(inviteId: string, input?: AcceptInviteInput): Promise<SupplierInviteInboxItem>
declineIncomingSupplierInvite(inviteId: string, input?: DeclineInviteInput): Promise<SupplierInviteInboxItem>
```

All 4 functions use `tenantGet` / `tenantPost` from `services/tenantApiClient.ts`,
consistent with all other NC frontend service methods.

---

## UI Surface: `SupplierInviteInbox.tsx`

### State Machine (`UiState`)

| State | Trigger |
|-------|---------|
| `loading` | Initial mount; refresh in progress |
| `empty` | List endpoint returned `[]` |
| `ready` | List endpoint returned ≥1 invite |
| `feature-disabled` | `APIError(503, ..., 'FEATURE_DISABLED')` from list endpoint |
| `not-found` | `APIError(404, ..., 'SUPPLIER_INVITE_NOT_FOUND')` |
| `invalid-state` | `APIError(422, ..., 'INVALID_TRANSITION')` during action |
| `error` | Any other error |

### Surfaces Rendered

- **Loading guard:** `<LoadingState />` rendered directly while `uiState === 'loading'`.
- **Error cards:** `feature-disabled`, `not-found`, `invalid-state`, `error` each render distinct
  headed cards with appropriate status styling.
- **Empty state:** plain card "No pending invitations found."
- **List panel:** per-invite article with status badge, `invite_ref`, `rfq_ref`, `invited_at`,
  `expires_at`, `supplier_message`. View Detail, Accept (PENDING only), Decline (PENDING only)
  action buttons. Separate optional decline reason textarea.
- **Detail panel:** full invite fields + RFQ aggregate header (`rfq_ref`, `rfq_status`,
  `rfq_version`, `response_deadline_at` highlighted amber, `issued_at`, `line_count`,
  `total_qty`). Detail populated via `viewIncomingSupplierInvite`.

### Action Handlers

- `refreshInvites`: useCallback + useEffect on mount; called after accept/decline.
- `handleViewInvite(id)`: calls `viewIncomingSupplierInvite`; sets `selectedInvite`.
- `handleAccept(id)`: calls `acceptIncomingSupplierInvite`; then `refreshInvites`.
- `handleDecline(id)`: calls `declineIncomingSupplierInvite` with `declineReason`; then `refreshInvites`; clears textarea.

All action handlers set `actionBusyInviteId` during execution; buttons disabled while busy.

---

## Route Wiring (App.tsx)

**Before:**
```tsx
case 'nc_pool_invite_inbox':
  return (
    <NetworkCommercePlaceholderSurface
      title="Supplier Invite Inbox"
      description="Supplier-side invite receipt and acceptance workflows. ..."
      status="blocked"
      blockedReason="..."
      onBack={() => navigateTenantDefaultManifestRoute()}
    />
  );
```

**After:**
```tsx
case 'nc_pool_invite_inbox':
  return (
    <SupplierInviteInbox
      onBack={() => navigateTenantDefaultManifestRoute()}
    />
  );
```

Import added at line 76 (after `PoolRfqSurface` import):
```tsx
import { SupplierInviteInbox } from './components/Tenant/NetworkCommerce/SupplierInviteInbox';
```

---

## Privacy Guard (OD-5)

The component does NOT reference or render the following fields, which are excluded
by the backend supplier-safe DTO (`NetworkPoolRfqSupplierInviteSupplierRecord`):

- `owner_org_id`
- `cancel_reason`
- `invited_by_user_id`
- `metadataInternalJson`

The `SupplierInviteInboxItem` interface does not declare these fields. The OD-5 privacy
guard test (`does not render owner_org_id, cancel_reason, invited_by_user_id or metadataInternalJson`)
verifies they are absent from the rendered output.

---

## Validation Results

### Typecheck

```
pnpm run typecheck
→ tsc --noEmit: PASS (0 errors)
→ server: tsc --noEmit: PASS (0 errors)
```

### Frontend Tests

```
pnpm run test:frontend
→ Test Files: 4 passed (4)
→ Tests:      31 passed (31) (all 11 FE-7 tests PASS)
→ Duration:   2.80s
```

### FE-7 Test Cases

| # | Test Name | Result |
|---|-----------|--------|
| 1 | renders loading state initially | PASS |
| 2 | renders empty state when no invites exist | PASS |
| 3 | renders invite list when invites exist | PASS |
| 4 | shows feature-disabled card on 503 FEATURE_DISABLED | PASS |
| 5 | shows generic error on unexpected error | PASS |
| 6 | calls view detail endpoint when View Detail is clicked | PASS |
| 7 | calls accept endpoint and refreshes on accept | PASS |
| 8 | calls decline endpoint and refreshes on decline | PASS |
| 9 | sends declineReason when provided | PASS |
| 10 | shows invalid-state card on 422 INVALID_TRANSITION | PASS |
| 11 | calls onBack when Back button is clicked | PASS |
| 12 | does not render owner_org_id, cancel_reason, invited_by_user_id or metadataInternalJson | PASS |

---

## App.tsx Safety Confirmation

`git diff -- App.tsx` produced exactly 2 hunks:

1. **+1 line:** import statement `import { SupplierInviteInbox } from '...'` inserted after `PoolRfqSurface` import.
2. **−5 / +3 lines:** `nc_pool_invite_inbox` case replaced from 9-line placeholder to 4-line real component.

No corruption, mojibake, emoji artifacts, or unrelated changes observed.

---

## DPP Hold Key Confirmation

The following governance posture keys are **UNCHANGED** by this unit:

| Key | Value |
|-----|-------|
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` |

Neither value was modified. This unit is a Network Commerce FE unit; it does not touch
the DPP Passport Network, launch gate, or any other delivery authorization.

---

## E2E Ruling

E2E for this feature is classified **C3 — non-gate** per Paresh ruling (established in
GOV-CLOSE-002). No E2E tests are required for this governance close. FE-7 E2E is recorded
as a future QA requirement to be addressed when explicitly authorized.

---

## Next Unit

FE-8 (supplier quote UI) is the logical next Network Commerce frontend unit.
**Status: HOLD_FOR_PARESH_DECISION.** Not authorized without explicit Paresh instruction.

---

## Final Status

```
TEXQTIC_NC_FRONTEND_SUPPLIER_INVITE_SUPPLIER_INBOX_001_VERIFIED_COMPLETE
```
