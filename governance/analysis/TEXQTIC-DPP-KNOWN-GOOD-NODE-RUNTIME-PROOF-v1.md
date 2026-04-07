# TexQtic DPP Known-Good Node Runtime Proof v1

## Header

- Date: 2026-04-07
- Type: bounded runtime proof record
- Scope: DPP with a lawful known-good live node only
- Status: `WORKING_BUT_THIN`

## Authority Baseline

- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
- `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`

## Bounded Goal

This pass was limited to the following question only:

- can current live production supply a lawful known-good traceability node that can be carried through the DPP surface for real request and render proof

This pass did not:

- create or seed traceability data
- modify product code
- broaden into catalog, order, or audit-filter work
- reopen impersonation remediation as a defect lane

## Method

- Runtime target: `https://app.texqtic.com/`
- Evidence mode: live browser interaction plus bounded browser-side `fetch` against production runtime
- Source attempt order:
  - control-plane cross-tenant traceability node read
  - tenant membership resolution for live tenants reachable from the active admin session
  - bounded impersonation start -> tenant traceability node list -> stop for tenants with an eligible active member
  - live tenant-shell DPP panel render check in a B2B tenant where DPP navigation is always visible

## Live Evidence

### A. Cross-Tenant Node Source Attempt

Control-plane traceability read was queried first to find a lawful candidate node without guessing ids.

Observed result:

- `GET /api/control/traceability/nodes?limit=20` -> `200`
- returned row count -> `0`

Meaning:

- the control-plane read surface is live
- no cross-tenant node inventory was returned from the current production runtime during this pass

### B. Tenant-Scoped Traceability Inventory Sampling

Because the cross-tenant node source returned empty, the pass sampled reachable active-member tenants directly.

Active-member tenants with bounded start/list/stop evidence:

| Tenant | Tenant Type | Start | Traceability Node List | Returned Nodes | Stop |
| --- | --- | --- | --- | --- | --- |
| `B2C Browse Proof 20260402080229` | `B2C` | `POST /api/control/impersonation/start -> 201` | `GET /api/tenant/traceability/nodes?limit=5 -> 200` | `0` | `POST /api/control/impersonation/stop -> 200` |
| `Test Tenant [tag:f527b7d2-62e5-4593-92c3-69a807a99c0d]` | `B2B` | `201` | `200` | `0` | `200` |
| `White Label Buyer [tag:f527b7d2-62e5-4593-92c3-69a807a99c0d]` | `B2B` | `201` | `200` | `0` | `200` |
| `Test Tenant [tag:f527b7d2-62e5-4593-92c3-69a807a99c0d]` | `B2B` | `201` | `200` | `0` | `200` |

Additional sampled tenants were inspected but not used for tenant-plane reads because no eligible active member was present in the control-plane tenant detail payload during this pass.

Observed posture from the bounded sample:

- tenant-scoped traceability list continuity is live
- sampled active-member tenants all returned `200` with zero rows
- no lawful known-good node emerged from the reachable live sample

### C. DPP Surface Render Continuity

Because no live node was available, the pass still verified that the DPP panel itself remains reachable and correctly rendered in a live tenant shell.

Observed result in the sampled B2B tenant shell:

- tenant workspace restored successfully under bounded impersonation
- left-nav rendered live tenant affordances including `DPP Passport`
- clicking `DPP Passport` opened the DPP surface successfully
- visible render elements included:
  - heading `DPP Passport`
  - subtitle `Digital Product Passport — Supply Chain Snapshot`
  - `Traceability Node ID` input
  - live `Load` button

What this did and did not prove:

- it proved the DPP tenant-shell entry and render path are live
- it did not prove a `200` DPP snapshot response for a real node, because no lawful live node existed to submit during this pass

## Classification Judgment

Current classification for this bounded pass is:

- `WORKING_BUT_THIN`

Why this is the most truthful classification now:

- the DPP surface is not absent; it renders inside the live tenant shell
- the upstream traceability inventory reads are not broken; they return `200`
- the sampled tenant traceability lists are not broken; they return `200`
- the current blocker is thin live data availability: zero reachable traceability nodes in the sampled production runtime

Why this is not `WORKING_END_TO_END`:

- no lawful known-good live node was available, so this pass could not truthfully demonstrate `GET /api/tenant/dpp/:nodeId -> 200` with a real snapshot payload

Why this is not a defect classification:

- no evidence in this pass showed wrong-realm failure, broken route wiring, or a server error path on DPP entry
- no evidence in this pass showed tenant traceability reads failing; they returned empty successful reads instead

## Runtime Truth Update

This pass upgrades the earlier DPP posture from a generic missing-node recheck gap to a sharper current runtime truth:

- DPP tenant-shell render continuity is live
- control-plane node sourcing is live but currently empty
- sampled tenant traceability inventories are live but currently empty
- present-tense production posture is thin traceability inventory, not a proven DPP wiring break

Accordingly:

- DPP should not be opened from this pass as a wiring defect
- DPP is not yet live-proven end to end with a real node
- the correct bounded runtime label for this pass is `WORKING_BUT_THIN`

## Posture

- No product files were modified.
- No traceability data was created.
- No seed-data workaround was introduced.
- No opening authority was created.

## Footer

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED