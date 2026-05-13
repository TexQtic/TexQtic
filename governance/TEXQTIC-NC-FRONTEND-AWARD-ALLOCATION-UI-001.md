# TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001

> **STATUS: IMPLEMENTED_PENDING_PROD_VERIFY (2026-06-08)**
> FE-9 award allocation frontend is implemented. Component renders feature-disabled state when backend returns 503 FEATURE_DISABLED — expected in production while `nc.procurement_pools.rfq.award.enabled=false`. No feature flag activated. DPP: HOLD_FOR_PARESH_DECISION unchanged.

## Packet Metadata

| Field | Value |
|-------|-------|
| Packet ID | TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001 |
| Feature Tag | FE-9 |
| Date | 2026-06-08 |
| Type | FRONTEND_IMPLEMENTATION |
| Status | IMPLEMENTED_PENDING_PROD_VERIFY |
| Prerequisite | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-ROUTE-001 VERIFIED_COMPLETE (6ed77bc). All 3 award routes live, gated at 503 FEATURE_DISABLED. TEXQTIC-NC-PROD-RFQ-AWARD-FLAG-RESEED-001 VERIFIED_COMPLETE (9c5324f). Award flag row present in production feature_flags with enabled=false. |
| Commit | `feat(network-commerce): add award allocation frontend` |

---

## §1 — Objective

Implement the owner-facing quote review / award allocation UI surface for Network Commerce Phase 1D.

This packet covers:
1. Three owner-facing service methods added to `services/networkCommerceService.ts`
2. New `QuoteReviewPanel` component — owner-facing quote review/award surface
3. Narrow integration in `PoolRfqSurface` — "Review Submitted Quotes" button + inline panel
4. 17 frontend tests (all passing)
5. Feature-disabled state when backend returns 503 FEATURE_DISABLED

No backend changes. No schema changes. No feature flag activation. `nc.procurement_pools.rfq.award.enabled` remains `false` in production. `nc.procurement_pools.supplier_quotes.enabled` remains `false` (QD-6 hold). DPP: HOLD_FOR_PARESH_DECISION unchanged.

---

## §2 — Starting Repo State

| Property | Value |
|---|---|
| HEAD at FE-9 start | `9c5324f` — `docs(network-commerce): verify award flag reseed` |
| origin/main | `9c5324f` (aligned) |
| Working tree | Clean |
| nc.procurement_pools.rfq.award.enabled | `false` (production feature_flags, row PRESENT) |
| nc.procurement_pools.supplier_quotes.enabled | `false` (QD-6 hold) |

---

## §3 — Architecture Decision: Inline Approach

`QuoteReviewPanel` is rendered **inline within `PoolRfqSurface`** via a `showQuoteReviewPanel` boolean state variable — NOT as a separate route. No changes to `App.tsx` or `sessionRuntimeDescriptor.ts`.

This follows the established FE-8 inline pattern: `showInviteOwnerPanel` → early return rendering `<SupplierInviteOwnerSurface>`. FE-9 adds `showQuoteReviewPanel` → early return rendering `<QuoteReviewPanel>`.

---

## §4 — Files Changed

| File | Change Type | Description |
|---|---|---|
| `services/networkCommerceService.ts` | Modified | Added `OwnerQuote` interface, `AcceptQuoteInput` interface, `RejectQuoteInput` interface, `getOwnerQuotesForRfq()`, `acceptQuoteForRfq()`, `rejectQuoteForRfq()` |
| `components/Tenant/NetworkCommerce/QuoteReviewPanel.tsx` | Created | Owner-facing quote review/award surface — 5 UI states, accept/reject controls, reject dialog, feature-disabled gate |
| `components/Tenant/NetworkCommerce/PoolRfqSurface.tsx` | Modified | Import + `showQuoteReviewPanel` state + reset in loadPanel try/catch + early-return render + "Review Submitted Quotes" button |
| `tests/frontend/network-commerce-quote-review.test.tsx` | Created | 17 test cases |

**Not changed:** `App.tsx`, `sessionRuntimeDescriptor.ts`, any backend files, `schema.prisma`, `.env`, `.env.local`.

---

## §5 — Service Methods Added

### `getOwnerQuotesForRfq(poolId, rfqId): Promise<OwnerQuote[]>`
→ `tenantGet<OwnerQuote[]>('/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes')`

### `acceptQuoteForRfq(poolId, rfqId, quoteId, requestId?): Promise<OwnerQuote>`
→ `tenantPost<OwnerQuote>('.../quotes/:quoteId/accept', { request_id })`

### `rejectQuoteForRfq(poolId, rfqId, quoteId, rejectReason?, requestId?): Promise<OwnerQuote>`
→ `tenantPost<OwnerQuote>('.../quotes/:quoteId/reject', { reject_reason, request_id })`

**Excluded from `OwnerQuote` interface:** `metadataInternalJson` (QD-5 internal ops field), `withdrawReason` (supplier-internal field). Neither field is ever rendered in the component.

---

## §6 — QuoteReviewPanel Component Architecture

**Props:** `{ poolId: string; rfqId: string; onBack: () => void }`

### UI States

| State | Trigger | Renders |
|---|---|---|
| `loading` | On mount | `<LoadingState message="Loading quotes..." />` |
| `feature-disabled` | 503 `FEATURE_DISABLED` | Amber banner — shows flag name `nc.procurement_pools.rfq.award.enabled`, NO accept/reject controls |
| `empty` | 200 — empty array | "No Quotes Yet" — awaiting supplier submissions message |
| `ready` | 200 — quotes present | Quote cards with status badges + action controls for SUBMITTED quotes |
| `error` | Other errors | Rose error banner with Retry |

### Quote Status Badges

| Status | Color |
|---|---|
| `ACCEPTED` | Emerald |
| `REJECTED` | Rose |
| `WITHDRAWN` | Slate |
| `SUBMITTED` | Sky |

### Accept / Reject Wiring

- **SUBMITTED quote:** Accept button (`acceptQuoteForRfq` → refresh list) + Reject button (opens inline `rejectDialog` with reason textarea → `rejectQuoteForRfq` → refresh list)
- **ACCEPTED quote:** `Winning Quote` badge + `accepted_at` shown. No action buttons.
- **REJECTED quote:** `reject_reason` shown if present. `rejected_at` shown. No action buttons.
- **`acceptingId` state:** tracks in-flight accept; disables ALL controls during action
- **`rejectDialog` state:** `{ quoteId, reason, submitting, error } | null` — inline reject form

### Accessibility

- Accept button: `aria-label={`Accept quote ${quote.quote_ref}`}`
- Reject button: `aria-label={`Reject quote ${quote.quote_ref}`}`
- Reject form panel: `role="dialog" aria-label="Reject quote"`

---

## §7 — Integration in PoolRfqSurface

Four targeted patches applied to `PoolRfqSurface.tsx`:

1. `QuoteReviewPanel` import added
2. `showQuoteReviewPanel` state: `const [showQuoteReviewPanel, setShowQuoteReviewPanel] = useState(false);`
3. `loadPanel` try block: `setShowQuoteReviewPanel(false);` reset on panel load
4. `loadPanel` catch block: `setShowQuoteReviewPanel(false);` reset on error
5. Early return (after `showInviteOwnerPanel` block):
   ```tsx
   if (showQuoteReviewPanel && issuedRfq) {
     return (
       <QuoteReviewPanel
         poolId={poolId}
         rfqId={issuedRfq.id}
         onBack={() => setShowQuoteReviewPanel(false)}
       />
     );
   }
   ```
6. "Review Submitted Quotes" button added in `uiState === 'success'` block (after "Manage Supplier Invites" button)

---

## §8 — Feature-Disabled Behavior (Production State)

When `getOwnerQuotesForRfq` returns `APIError(503, 'FEATURE_DISABLED')`:

- Component renders amber banner: "Award Review Not Active"
- Displays flag name `nc.procurement_pools.rfq.award.enabled` in `<code>` element
- Displays: "is set to `false`. Accept and reject controls will be available once this flag is activated by an authorized operator."
- Footer: "Award review is not yet active (nc.procurement_pools.rfq.award.enabled=false)."
- NO accept/reject controls rendered — flag cannot be gamed via UI interaction
- Back button always visible — user can return to PoolRfqSurface

This is the expected production state. Flag activation requires separate explicit Paresh authorization.

---

## §9 — Data Safety

**`OwnerQuote` interface excludes:**
- `metadataInternalJson` — internal ops field (QD-5); excluded from API contract shape
- `withdrawReason` — supplier-internal field; not rendered in owner surface

**Component never renders these fields.** FE-9 test case `TC-FE-9-009` verifies neither field appears in the rendered DOM.

---

## §10 — Test Coverage

**17 tests in `tests/frontend/network-commerce-quote-review.test.tsx`**

| Block | Test(s) | Coverage |
|---|---|---|
| Service: `getOwnerQuotesForRfq` | 1 | GET endpoint URL |
| Service: `acceptQuoteForRfq` | 2 | POST endpoint + request_id; null when omitted |
| Service: `rejectQuoteForRfq` | 2 | POST endpoint + reject_reason + request_id; nulls when omitted |
| Feature-disabled (503) | 3 | Disabled state renders; no accept/reject controls; flag name shown |
| Empty state | 1 | "No Quotes Yet" renders |
| Submitted quote | 2 | Quote ref/amount/note renders; Accept+Reject buttons present |
| Accepted quote | 2 | "Winning Quote" badge; no action buttons |
| Rejected quote | 2 | "Rejected" status; reject_reason shown |
| Data safety | 1 | metadataInternalJson/withdraw_reason not rendered |
| Accept action | 1 | POST fires; list refreshes showing "Winning Quote" |
| Reject action | 1 | Dialog opens; POST fires with reason; list refreshes |

---

## §11 — Validation

```
pnpm run test:frontend

 ✔ tests/frontend/network-commerce-quote-review.test.tsx (17 tests)
 Test Files  6 passed (6)
       Tests  64 passed (64)
   Duration  3.38s

pnpm run typecheck → exit 0 — no type errors (frontend tsc + server tsc both pass)

git diff --name-only → 9 allowlisted files only
  1. services/networkCommerceService.ts
  2. components/Tenant/NetworkCommerce/QuoteReviewPanel.tsx (new)
  3. components/Tenant/NetworkCommerce/PoolRfqSurface.tsx
  4. tests/frontend/network-commerce-quote-review.test.tsx (new)
  5. governance/TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001.md (new)
  6. governance/control/OPEN-SET.md
  7. governance/control/NEXT-ACTION.md
  8. governance/control/BLOCKED.md
  9. governance/control/GOVERNANCE-CHANGELOG.md
```

---

## §12 — Production Behavior (Feature Flags Off)

| Flag | Value | Behavior |
|---|---|---|
| `nc.procurement_pools.rfq.award.enabled` | `false` | `QuoteReviewPanel` shows feature-disabled amber banner on load |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` | QD-6 hold unchanged; no quotes submitted |

Both flags remain `false`. No flag activation performed. Flag activation requires separate explicit Paresh authorization.

---

## §13 — Governance Constraints

| Constraint | Status |
|---|---|
| `nc.procurement_pools.rfq.award.enabled` | `false` — NOT changed |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` — NOT changed (QD-6 hold) |
| DPP launch authorization | `HOLD_FOR_PARESH_DECISION` — UNCHANGED |
| Backend changes | NONE |
| Schema changes | NONE |
| Migration changes | NONE |
| App.tsx | NOT changed |
| sessionRuntimeDescriptor.ts | NOT changed |

---

## §14 — Production Verification Checklist (Pending Paresh)

1. Open TexQtic app as owner-role session
2. Navigate to a pool → RFQ that is ISSUED
3. Click "Review Submitted Quotes" button in the PoolRfqSurface success state
4. Confirm `QuoteReviewPanel` renders feature-disabled amber banner (expected — flag = false)
5. Confirm flag name `nc.procurement_pools.rfq.award.enabled` appears in banner
6. Confirm no Accept/Reject buttons are rendered in feature-disabled state
7. Confirm "Back" button returns to PoolRfqSurface
8. Confirm no console errors

FE-9 status advances to `VERIFIED_COMPLETE` when the above checklist passes in production.

---

## §15 — Next Action Pointer

| Item | Required | Authority |
|---|---|---|
| Production verification of `QuoteReviewPanel` feature-disabled state | Paresh | This packet §14 |
| `nc.procurement_pools.rfq.award.enabled` flag activation | Explicit Paresh decision | Separate authorization — NOT this packet |
| `nc.procurement_pools.supplier_quotes.enabled` flag activation | Explicit Paresh decision (QD-6 lift) | Separate authorization — NOT this packet |
| DPP Passport Network launch | Explicit Paresh decision | TECS-DPP-PASSPORT-NETWORK-LAUNCH-GATE-001 |
