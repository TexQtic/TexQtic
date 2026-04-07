# TexQtic DPP Seeded Runtime Verification v1
# TexQtic DPP Seeded Runtime Verification v1

## 1. Header

- Date: 2026-04-07
- Type: bounded seeded runtime verification record
- Scope: Enterprise + White Label tenant-context DPP verification only
- Result posture: WL tenant produced a lawful known-good node and DPP is now runtime-proven end to end; Enterprise branch remained separately blocked by tenant-auth throttling

## 2. Authority Baseline

- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
- `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`
- `governance/analysis/TEXQTIC-DPP-KNOWN-GOOD-NODE-RUNTIME-PROOF-v1.md`

## 3. Prior DPP Thin-Data Posture

The starting runtime truth before this seeded pass remained:

- control-plane traceability node sourcing returned `200` with `0` rows
- sampled tenant traceability node lists returned `200` with `0` rows
- the DPP panel itself rendered correctly inside a live tenant shell
- the prior truthful classification remained `WORKING_BUT_THIN`

This seeded pass existed only to determine whether the minimum lawful tenant-side data creation path could promote that posture to a real end-to-end DPP proof.

## 4. Enterprise Tenant Verification Context

Requested primary verification context:

- Enterprise tenant owner account for Acme

Observed runtime sequence:

- tenant-access auth surface loaded successfully
- entering the Enterprise owner email resolved the organisation correctly as `Acme Corporation`
- corrected password used: `Password123!`
- submitting the live login request returned `429`
- the visible runtime message was: `Too many attempts. Wait 10 minutes.`

Enterprise branch failure type:

- `runtime-related tenant-auth throttle / lockout`

What this does and does not mean:

- it was not a routing failure
- it was not a realm-selection failure
- it was not a DPP-route failure
- it blocked the Enterprise tenant branch before traceability inventory, seed, or DPP verification could be attempted through the requested owner session
- it did not block the entire seeded DPP proof, because the secondary WL branch remained available and was completed

Enterprise result summary:

- Enterprise tenant did **not** produce a known-good node in this pass
- the blocker was runtime-related and specific to tenant authentication, not to DPP wiring

## 5. White-Label Tenant Verification Context

Requested secondary verification context:

- White Label tenant owner account

Observed runtime sequence:

- tenant-access auth surface loaded successfully
- entering the WL owner email resolved the organisation correctly as `White Label Co`
- corrected password used: `Password123!`
- tenant token was issued successfully and the runtime restored into WL Admin
- the WL owner route exposed a live storefront path and a live WL runtime shell
- the WL storefront navigation visibly exposed both:
  - `DPP Snapshot`
  - `Traceability`

WL meaning:

- WL is not non-applicable by design for this pass
- WL provided direct supporting runtime evidence
- WL provided the actual successful seeded verification branch when Enterprise remained temporarily blocked by auth throttling

Initial WL traceability posture before seed:

- `GET /api/tenant/traceability/nodes?limit=20` -> `200`
- returned node count -> `0`

## 6. Seed Method / Lawful Data-Creation Path

Before mutation, the repo/server contract was rechecked.

Confirmed code-path truth:

- tenant traceability node creation is exposed by the existing lawful tenant route `POST /api/tenant/traceability/nodes`
- the DPP product snapshot view is backed directly by `traceability_nodes`
- one tenant-created node is sufficient to produce a DPP product snapshot row
- no product-file changes are required to exercise this path

Chosen seed method:

- WL tenant only
- one single tenant-scoped traceability node
- created through the existing production tenant API path
- no edges seeded
- no bulk data seeded

This was the narrowest available live mutation that could produce one known-good DPP node when no existing tenant node was available.

## 7. Exact Data Seeded or Created

Tenant used:

- `White Label Co`

Exactly one traceability node was created.

Seeded node data:

- `nodeId`: `629cb901-a749-4159-ac52-001ccdf2ae01`
- `batchId`: `DPP-WL-VERIFY-20260407-0615`
- `nodeType`: `DPP_VERIFY`
- `visibility`: `TENANT`
- `meta.purpose`: `dpp_seeded_runtime_verification`
- `meta.scope`: `bounded_single_node`
- `meta.createdBy`: `github-copilot-runtime-pass`
- `meta.cleanupRecommended`: `true`

Exact seeded scope:

- one WL traceability node only
- zero edges
- zero certifications directly added
- zero product-file changes

## 8. Runtime Verification Evidence

### A. WL Seed / Source Evidence

- `POST /api/tenant/traceability/nodes` -> `201`
- returned `nodeId` -> `629cb901-a749-4159-ac52-001ccdf2ae01`
- follow-up `GET /api/tenant/traceability/nodes?limit=20` -> `200`
- follow-up node count -> `1`

### B. WL DPP API Proof

- `GET /api/tenant/dpp/629cb901-a749-4159-ac52-001ccdf2ae01` -> `200`

Returned proof summary:

- `nodeId` matched the seeded node id
- `product.batchId` -> `DPP-WL-VERIFY-20260407-0615`
- `product.nodeType` -> `DPP_VERIFY`
- `product.visibility` -> `TENANT`
- `lineageCount` -> `1`
- `certificationsCount` -> `1`

### C. WL Visible DPP UI Proof

The same seeded node id was loaded through the visible WL `DPP Snapshot` surface.

Observed visible render:

- DPP panel opened successfully in the WL storefront shell
- seeded node id was accepted by the live `Load` action
- rendered `Product Identity` block showed:
  - node id `629cb901-a749-4159-ac52-001ccdf2ae01`
  - org id `960c2e3b-64cf-4ba8-88d1-4e8f72d61782`
  - batch id `DPP-WL-VERIFY-20260407-0615`
  - node type `DPP_VERIFY`
  - visibility `TENANT`
  - manufacturer `White Label Co`
  - jurisdiction `UNKNOWN`
- rendered `Certifications` block was present
- rendered `Supply Chain Lineage` block was present and showed the seeded node as depth `0`
- export controls rendered:
  - `Copy JSON`
  - `Download JSON`

### D. Read-Side Audit Evidence

- `GET /api/tenant/audit-logs` -> `200`
- observable relevant actions included:
  - `tenant.dpp.read`
  - `tenant.dpp.read`

This confirms the DPP read path also produced observable tenant audit activity in production.

## 9. Final Classification

Final DPP classification for this pass is:

- `WORKING_END_TO_END`

Why this is now the most truthful classification:

- a lawful tenant-scoped node was created through the live traceability path
- tenant traceability inventory rehydrated successfully after create
- the DPP API returned `200` for that exact seeded node
- the visible DPP UI rendered the same node end to end in the WL tenant shell
- observable tenant audit evidence confirmed DPP read activity

What remains separate from DPP classification:

- the Enterprise owner branch remained blocked by a tenant-auth runtime throttle
- that blocker is real, but it is not evidence of DPP wiring failure
- the earlier thin-data posture is now superseded as the best current DPP runtime truth because a lawful seeded node has been carried through the real DPP path successfully

## 10. Cleanup / Persistence Note

- The seeded WL node currently persists in production.
- It was intentionally bounded to one clearly tagged verification row.
- A direct tenant-surface cleanup path was not observed during this pass.
- Cleanup is therefore recommended later through an approved maintenance path if the row should not persist as runtime-proof residue.

## 11. Governance-Useful Conclusion

This pass resolves the core DPP runtime question:

- Enterprise did not produce a known-good node because its owner login branch was blocked by runtime auth throttling
- White Label produced both supporting evidence and the actual seeded end-to-end DPP proof
- WL runtime proves that DPP and Traceability are exposed, real, and not non-applicable by design in the WL tenant context reached here
- DPP is now runtime-proven end to end
- the remaining limit from this pass is not DPP data thinness and not a DPP wiring defect; it is a separate Enterprise tenant-auth throttle issue

NO_COMMIT_REQUIRED

## 12. Footer

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED