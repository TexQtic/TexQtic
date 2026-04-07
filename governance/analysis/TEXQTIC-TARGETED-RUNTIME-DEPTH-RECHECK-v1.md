# TexQtic Targeted Runtime Depth Recheck v1

## Authority and Scope

- Runtime authority for this recheck remains:
  - `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
  - `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
- Layer 0 posture was rechecked before runtime probing:
  - `governance/control/OPEN-SET.md`
- This unit is bounded runtime investigation only.
- Scope is limited to exactly four surfaces requested for live depth recheck:
  - catalog admin mutations
  - order lifecycle transitions
  - DPP with a known-good node
  - impersonation start/stop continuity
- This unit does not:
  - create opening authority
  - authorize implementation
  - modify product code
  - broaden into generic QA
  - reopen marketing-repo work

## Method

- Runtime target: `https://app.texqtic.com/`
- Evidence mode: live browser interaction against production runtime only
- Seeded identities used were confirmed from repo truth before login:
  - `owner@whitelabel.example.com`
  - `owner@acme.example.com`
  - `admin@texqtic.com`
- Request evidence was captured with bounded browser-side `fetch` and `XMLHttpRequest` logging to confirm whether UI actions fired real network calls and what status codes returned.
- Classification set is restricted to the set requested for this recheck:
  - `WORKING_END_TO_END`
  - `WORKING_BUT_THIN`
  - `SLOW_LOAD_BUT_RECOVERS`
  - `WIRING_DEFECT`
  - `NON_WIRING_RUNTIME_DEFECT`
  - `NEEDS_FURTHER_RECHECK`

## Executive Readout

- Catalog admin mutations are materially real and runtime-proven end to end.
- Order lifecycle transitions are materially real, but the visible state transition includes a bounded processing interval before the table rehydrates to the persisted status.
- DPP remains repo-wired and live-entry-capable, but this pass could not truthfully prove end-to-end continuity because no known-good live traceability node was available in the current runtime context.
- Impersonation start continuity is real and lands in tenant context under staff impersonation, but exit continuity is not clean: the stop request returned `404` and the client cleared impersonation state anyway, which is a runtime defect rather than a wiring absence.

## Surface Matrix

| Surface | Classification | Runtime Evidence | Recheck Conclusion |
| --- | --- | --- | --- |
| Catalog admin mutations | `WORKING_END_TO_END` | `POST /api/tenant/catalog/items = 201`; `PATCH /api/tenant/catalog/items/:id = 200`; `DELETE /api/tenant/catalog/items/:id = 200`; product card appeared, updated, then disappeared without manual reload | Create, edit, and delete continuity is live and persisted through real backend calls. |
| Order lifecycle transitions | `SLOW_LOAD_BUT_RECOVERS` | `GET /api/tenant/orders = 200`; `PATCH /api/tenant/orders/:id/status = 200`; follow-up `GET /api/tenant/orders = 200`; row changed from `Pending` to `Confirmed` after a bounded `Processing...` interval and lifecycle history updated | Transition path is real, but user-visible recovery is delayed rather than immediate. |
| DPP with a known-good node | `NEEDS_FURTHER_RECHECK` | `DPP Passport` surface loads; empty submit shows `Node ID is required.` and fires no request; enterprise `Traceability Nodes` surface showed `No nodes found` during this pass | Current blocker is absence of a known-good live node, not proven runtime breakage. |
| Impersonation start/stop continuity | `NON_WIRING_RUNTIME_DEFECT` | `POST /api/control/impersonation/start = 201`; tenant shell loaded with staff impersonation banner and `Exit Impersonation`; `POST /api/control/impersonation/stop = 404`; client logged stop error and still restored control-plane shell | Start continuity is real, but stop continuity is server-defective and only recovers because the client force-clears state. |

## Detailed Runtime Evidence

### 1. Catalog Admin Mutations

Persona used: white-label tenant owner

Surface used: `Products` inside the live white-label admin shell

Observed chain:

- A temporary product was created from the live `+ Add Item` flow.
- Request evidence captured:
  - `POST /api/tenant/catalog/items` -> `201`
- Visible runtime result:
  - the new product card appeared immediately in the rendered list
- The same product was edited in place.
- Request evidence captured:
  - `PATCH /api/tenant/catalog/items/<id>` -> `200`
- Visible runtime result:
  - the product card updated immediately with the changed name and price
- The same product was then deleted through the live delete affordance and confirm dialog.
- Request evidence captured:
  - `DELETE /api/tenant/catalog/items/<id>` -> `200`
- Visible runtime result:
  - the product card disappeared from the list without requiring page refresh

Why this classification is not thinner:

- The chain includes real mutation requests, success responses, and visible list rehydration for create, update, and delete.
- No evidence in this pass suggested a local-state-only illusion or stubbed admin surface.

### 2. Order Lifecycle Transitions

Persona used: white-label tenant owner

Surface used: `Orders` inside the live white-label admin shell

Observed chain:

- Initial table load fired `GET /api/tenant/orders` -> `200`.
- The first pending order in view was transitioned through the live `Confirm` action.
- The confirmation modal rendered and was accepted.
- After submission, the row entered a visible `Processing...` state before final rehydration.
- Request evidence captured during recovery:
  - `PATCH /api/tenant/orders/30dce713-379e-48dd-a667-12921faad015/status` -> `200`
  - follow-up `GET /api/tenant/orders` -> `200`
- Visible runtime result after bounded wait:
  - the row changed from `Pending` to `Confirmed`
  - actions changed to `Fulfill` and `Cancel`
  - lifecycle history showed `PAYMENT_PENDING -> CONFIRMED`

Why this is classified `SLOW_LOAD_BUT_RECOVERS` instead of `WORKING_END_TO_END`:

- The transition path is real and persisted.
- The most truthful runtime behavior observed here is not instant continuity, but a bounded recovery interval between operator action and stable post-transition UI state.

### 3. DPP With a Known-Good Node

Persona used: enterprise tenant owner

Surfaces used:

- `Traceability`
- `DPP Passport`

Observed chain:

- The enterprise shell recovered and the traceability surface was reached through the live shell handlers.
- `Traceability Nodes` rendered `No nodes found` in the current runtime context.
- The `DPP Passport` surface itself loaded correctly with:
  - heading `DPP Passport`
  - `Traceability Node ID` input
  - live `Load` button
- Empty submit was tested after clearing network logs.
- Visible runtime result:
  - validation message `Node ID is required.`
- Request evidence captured:
  - no request fired for empty submit

Why this remains `NEEDS_FURTHER_RECHECK`:

- This pass established that DPP entry and validation behavior are live.
- This pass did not establish end-to-end DPP continuity against a known-good node because none was available from the live runtime context reached here.
- The most truthful conclusion is missing-good-input evidence, not a proven runtime failure.

### 4. Impersonation Start/Stop Continuity

Persona used: super admin

Surface used: control-plane `Tenant Registry` row action for `Acme Corporation`

Observed start chain:

- The control-plane shell recovered through `Staff Control Plane` login.
- The live tenant registry rendered real tenant rows including `Acme Corporation`.
- The row-level impersonation action opened a real `Impersonate Tenant` modal.
- After reason entry, `Start Impersonation` was submitted.
- Request evidence captured:
  - `POST /api/control/impersonation/start` -> `201`
- Visible runtime result:
  - the app landed in enterprise tenant context
  - a staff impersonation banner rendered: staff active, impersonating `Acme Corporation`, with expiry information
  - `Exit Impersonation` rendered as an available control
  - tenant-shell data requests continued successfully, including catalog and identity reads

Observed stop chain:

- `Exit Impersonation` was clicked from the active impersonated tenant shell.
- Request evidence captured:
  - `POST /api/control/impersonation/stop` -> `404`
- Runtime error evidence surfaced in client logging:
  - stop error was logged and explicitly ignored by the client
- Visible runtime result:
  - the control-plane shell was restored
  - the impersonation banner disappeared
  - control-plane identity remained active

Why this is classified `NON_WIRING_RUNTIME_DEFECT`:

- The path is not missing frontend-backend wiring. Start continuity is real and runtime-proven.
- Stop continuity is not cleanly successful at the server boundary, because the stop request returned `404`.
- The user-facing recovery depends on client-side fallback state clearing after the failed stop request.
- That makes this a runtime defect in a real path, not a missing implementation chain.

## Recheck Conclusion

- This targeted runtime depth pass upgrades catalog admin mutations from repo-wired-only confidence to live runtime proof.
- This pass upgrades order lifecycle transitions from repo-wired-only confidence to live runtime proof with bounded recovery delay.
- This pass does not downgrade DPP into a defect class; it preserves the truthful gap as missing-good-node evidence.
- This pass establishes that impersonation start is real but that impersonation stop currently contains a server-visible runtime defect masked by client recovery behavior.

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED