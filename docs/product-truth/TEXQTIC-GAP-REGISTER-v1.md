# TEXQTIC-GAP-REGISTER-v1

## Purpose

This document is the canonical product-truth gap register for TexQtic.

It exists to record the gap state between:

- the corrected product definition established in Phase A1
- the repo-reality implementation audit established in Phase A2
- the launch-critical gap assessment established in Phase A3

This register is not a doctrine file, not a governance sequence, and not a historical execution log.

It is the bounded planning base for identifying what TexQtic actually is, what TexQtic can materially do today, and what gaps remain between current repo reality and launch-usable product truth.

## Authority Statement

Authority for this document is product-truth-first and repo-reality-first.

The governing assumptions for this register are:

- repo reality overrides stale planning language
- a capability is not implemented unless it is materially usable end to end
- UI presence alone does not count as delivery
- backend presence alone does not count as delivery
- static, conceptual, or shallow surfaces must be recorded explicitly when they create misleading delivery signals
- launch-critical execution loops take precedence over surface completeness

This document should be used as the primary gap reference for product-facing execution planning until it is explicitly superseded.

## Operating Rules

1. Record only product-relevant implementation truth.
2. Prefer bounded gap statements tied to real surfaces.
3. Distinguish between working, partial, broken, missing, backend-only, UI-only, and fake-complete states.
4. Mark misleading surfaces explicitly when they distort product understanding.
5. Do not mark a capability as delivered on the basis of narrative intent, documentation presence, or route existence alone.
6. Treat launch blockers, execution blockers, and misleading authority surfaces as first-class register categories.
7. Preserve a strict separation between this register and governance-layer sequencing systems.

## Status Taxonomy

| Status | Meaning |
|---|---|
| `CLOSED` | Gap is resolved and closure evidence is recorded in the register |
| `FULLY_IMPLEMENTED` | Materially usable end to end in the current product surface |
| `PARTIALLY_IMPLEMENTED` | A meaningful portion exists, but the capability is incomplete or one-sided |
| `BROKEN` | Intended capability exists in part, but current behavior blocks reliable use |
| `MISSING` | Required capability is absent from the current product surface |
| `BACKEND_ONLY` | Backend capability exists without a materially usable product surface |
| `UI_ONLY` | UI surface exists without sufficient backend reality |
| `FAKE_COMPLETE` | Surface appears complete or authoritative but is static, shallow, misleading, or non-operational |
| `DEFERRED` | Explicitly out of current execution scope and not required for immediate launch readiness |

## Gap Table Schema

Every gap entry in this register uses the following fields:

| Field | Meaning |
|---|---|
| `Gap ID` | Stable gap identifier |
| `Title` | Short bounded description |
| `Layer` | `OS`, `WORKFLOW`, or `EXCHANGE` |
| `Category` | Gap category label |
| `Current Status` | One value from the status taxonomy |
| `Launch Impact` | Why the gap matters to launch usability |
| `Current Reality` | Repo-evidenced statement of what exists today |
| `Required Outcome` | The minimally true product state required to close the gap |
| `Primary Surface` | File, module, or flow that anchors the gap |
| `Notes` | Important limits, asymmetries, or misleading signals |

## Gap Categorization Model

The register groups gaps into the following categories:

- `ENTERABILITY` — onboarding, activation, first-user entry, and first-tenant usability
- `TWO_SIDED_EXCHANGE` — buyer-supplier loop completion and response visibility
- `EXECUTION_LOOP` — trade, escrow, settlement, and transaction continuity
- `OPS_CASEWORK` — finance, compliance, disputes, and admin control reality
- `MODE_COMPLETENESS` — white-label, storefront, or mode-specific product completeness
- `PRODUCT_SCOPE_TRUTH` — marketed scope that is materially narrower in the repo
- `MISLEADING_SURFACE` — static, shallow, or fake-complete surfaces that distort execution planning

## Seeded Verified Gap Entries

| Gap ID | Title | Layer | Category | Current Status | Launch Impact | Current Reality | Required Outcome | Primary Surface | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `GAP-ENTRY-001` | Business verification onboarding is not operational | `OS` | `ENTERABILITY` | `BROKEN` | Blocks onboarding into trade- and funds-capable usage | Activation includes a business verification step, but the step is currently a visual upload placeholder while also stating trade and fund operations remain blocked until approval | A materially usable verification step and approval path must exist inside the onboarding flow | `components/Onboarding/OnboardingFlow.tsx` | Launch blocker |
| `GAP-ENTRY-002` | Tenant provisioning does not complete first-owner activation cleanly | `OS` | `ENTERABILITY` | `BROKEN` | Blocks reliable tenant onboarding and first-owner handoff | Control-plane provisioning creates the tenant record but then instructs operators to generate an invite later from a separate tenant flow | Provisioning must reach a coherent first-owner activation handoff without a broken intermediate step | `components/ControlPlane/TenantRegistry.tsx` | Launch blocker; verified in A3 |
| `GAP-EXCHANGE-001` | Supplier RFQ inbox and response flow is absent from the product UI | `EXCHANGE` | `TWO_SIDED_EXCHANGE` | `CLOSED` | Blocks the first real buyer-supplier exchange loop | Buyer RFQ create/list/detail exists, and supplier response routes exist in backend, but the surfaced product experience remains buyer read-only and pre-negotiation | Supplier inbox, supplier detail, and supplier response actions must be materially surfaced | `server/src/routes/tenant.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-002`; closed at `2026-03-25`; evidence `3d704188d32e33b7acca12b16941b2dba6ad4664` |
| `GAP-EXCHANGE-002` | Tenant trade lifecycle is not usable from the tenant product surface | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Blocks visible trade progression from tenant-facing product use | Tenant trade create and transition routes exist in backend, but the tenant trades panel is explicitly read-only | Trade creation and lifecycle actions must be tenant-visible and usable in the product surface | `components/Tenant/TradesPanel.tsx` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-004`; closed at `2026-03-25`; evidence `24588d7d0bb36a1f54020193aa32e670d04b38b4` |
| `GAP-OPS-001` | Finance operations are thin and event-backed | `WORKFLOW` | `OPS_CASEWORK` | `PARTIALLY_IMPLEMENTED` | Weakens live control over payout-related decisions | Control-plane finance routes and UI exist, but they operate as authority-event views rather than deep payout casework | Operational finance surfaces must reflect robust, durable case handling instead of thin event-only reads | `server/src/routes/control.ts` | Shallow control surface, not fake-static |
| `GAP-OPS-002` | Compliance operations are thin and event-backed | `WORKFLOW` | `OPS_CASEWORK` | `PARTIALLY_IMPLEMENTED` | Weakens live control over compliance review and intervention | Control-plane compliance requests are wired but backed by event-derived authority data rather than a deeper compliance system | Compliance casework must be materially operational, not just event-backed | `server/src/routes/control.ts` | High-impact admin gap |
| `GAP-OPS-003` | Dispute operations are thin and event-backed | `WORKFLOW` | `OPS_CASEWORK` | `PARTIALLY_IMPLEMENTED` | Weakens real exception handling and admin intervention | Control-plane disputes surfaces are real but shallow and event-backed rather than a full dispute case system | Dispute handling must support durable operational casework | `server/src/routes/control.ts` | High-impact admin gap |
| `GAP-MODE-001` | White-label admin is not fully complete | `OS` | `MODE_COMPLETENESS` | `PARTIALLY_IMPLEMENTED` | Prevents treating white-label mode as consistently launch-ready | Some WL surfaces are real, but the repo still contains a generic coming-soon stub path and a mixed completeness story | White-label admin must present a consistently real operator surface for promised capabilities | `components/WhiteLabelAdmin/WLStubPanel.tsx` | Mixed with real WL orders/domains/product behavior |
| `GAP-SCOPE-001` | DPP/passport capability is narrower than marketed scope | `WORKFLOW` | `PRODUCT_SCOPE_TRUTH` | `PARTIALLY_IMPLEMENTED` | Limits compliance and chain-context visibility relative to product promise | A real DPP snapshot/read surface exists, but not the broader operating passport scope implied by the product truth | Product-facing planning must treat DPP as narrower than the marketed system until broader continuity exists | `components/Tenant/DPPPassport.tsx` | Narrow-scope truth correction |
| `GAP-SCOPE-002` | AI governance is a mixed real/static surface | `OS` | `PRODUCT_SCOPE_TRUTH` | `PARTIALLY_IMPLEMENTED` | Distorts the apparent maturity of AI governance operations | The panel contains a real tenant fetch and insight path, but also static prompt registry content that reads as operational | AI governance must be treated as partly real, not a finished control surface | `components/ControlPlane/AiGovernance.tsx` | Not a launch blocker by itself, but misleading |
| `GAP-TRUTH-001` | API docs surface is fake-complete | `OS` | `MISLEADING_SURFACE` | `FAKE_COMPLETE` | Misroutes execution and product understanding | The API docs panel is a static contract skeleton and does not represent live runtime authority | This surface must not be treated as product or execution truth | `components/ControlPlane/ApiDocs.tsx` | High misleading-authority risk |
| `GAP-TRUTH-002` | Architecture blueprints surface is fake-complete and stack-misaligned | `OS` | `MISLEADING_SURFACE` | `FAKE_COMPLETE` | Misroutes planning by presenting conceptual architecture as current truth | The architecture blueprint panel is static and describes a stack that does not match current implementation reality | This surface must not be used as an implementation or sequencing authority | `components/ControlPlane/ArchitectureBlueprints.tsx` | High misleading-authority risk |
| `GAP-EXCHANGE-003` | RFQ tenant routes are missing from tenant API authority | `EXCHANGE` | `TWO_SIDED_EXCHANGE` | `CLOSED` | Weakens authority alignment around the first exchange loop and obscures live repo truth | Buyer RFQ create/list/detail and supplier inbox/respond routes exist in repo reality, but the tenant OpenAPI authority does not describe the RFQ surface | Tenant API authority must reflect the live RFQ surface that the product and backend already expose | `shared/contracts/openapi.tenant.json` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-001`; closed at `2026-03-25`; evidence `99258252de206d0357ad1934de4fce31197bc8d1` |
| `GAP-EXCHANGE-004` | RFQ create contract does not match persisted RFQ state reality | `EXCHANGE` | `TWO_SIDED_EXCHANGE` | `CLOSED` | Distorts RFQ state continuity at the start of the exchange path | RFQ create returns `RFQ_INITIATED`, while the created RFQ row is written with `OPEN` and the read surfaces treat `OPEN` as the live state | RFQ create and RFQ read surfaces must communicate the same materially true RFQ state model | `server/src/routes/tenant.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-001`; closed at `2026-03-25`; evidence `99258252de206d0357ad1934de4fce31197bc8d1` |
| `GAP-EXCHANGE-005` | Supplier RFQ operability remains backend-only | `EXCHANGE` | `TWO_SIDED_EXCHANGE` | `CLOSED` | Prevents the buyer RFQ path from becoming a real two-sided product loop | Supplier inbox list/detail/respond routes exist in backend, but no supplier-facing tenant product surface materially exposes them | Supplier tenants must be able to receive, review, and respond to RFQs through the product surface | `server/src/routes/tenant.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-002`; closed at `2026-03-25`; evidence `3d704188d32e33b7acca12b16941b2dba6ad4664` |
| `GAP-EXCHANGE-006` | Supplier response model is too thin for exchange continuity | `EXCHANGE` | `TWO_SIDED_EXCHANGE` | `CLOSED` | Prevents supplier response from becoming a meaningful conversion handoff into trade | The current response artifact is a single bounded message with one response per RFQ and no negotiation semantics | Supplier response must support the minimal decision semantics required to advance exchange continuity truthfully | `server/prisma/schema.prisma` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-002`; closed at `2026-03-25`; evidence `3d704188d32e33b7acca12b16941b2dba6ad4664` |
| `GAP-EXCHANGE-007` | RFQ-to-trade linkage is missing | `EXCHANGE` | `EXECUTION_LOOP` | `CLOSED` | Breaks the core exchange loop at the exact point where interaction must become execution | RFQ and supplier response domains are real, and trade create exists, but there is no route, service, schema link, or product affordance that converts RFQ context into trade creation | RFQ response state must materially link into trade creation through an explicit continuity path | `server/src/routes/tenant/trades.g017.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-003`; closed at `2026-03-25`; evidence `92f6aa0e10adc55a972852e4dac69701cd6c4a4c` |
| `GAP-EXCHANGE-008` | Tenant trade creation trusts client-supplied org identity | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Weakens execution integrity at the point of trade creation | Tenant trade create accepts buyer and seller org IDs from the request body instead of deriving counterparties from a validated upstream exchange context | Trade creation must derive or verify org context safely before execution continues | `server/src/routes/tenant/trades.g017.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-003`; closed at `2026-03-25`; evidence `92f6aa0e10adc55a972852e4dac69701cd6c4a4c` |
| `GAP-EXCHANGE-009` | Tenant trade lifecycle remains materially hidden in product UI | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Prevents visible tenant-side execution continuity after trade exists | Tenant trade list is surfaced, but creation and lifecycle actions remain backend-real while the tenant trade panel is explicitly read-only | Tenant execution must expose the lifecycle actions required to advance trade state in-product | `components/Tenant/TradesPanel.tsx` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-004`; closed at `2026-03-25`; evidence `24588d7d0bb36a1f54020193aa32e670d04b38b4` |
| `GAP-EXCHANGE-010` | Trade-to-escrow attach flow is missing | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Breaks execution continuity after trade because escrow remains a standalone domain entry point | Trade has an optional escrow relation and escrow create exists, but there is no attach flow or visible handoff from trade into escrow | Execution must include a materially usable trade-to-escrow attachment path | `server/prisma/schema.prisma` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-005`; closed at `2026-03-25`; evidence `75b05f238b0ae91ede8291e6e337ac414e307e2d` |
| `GAP-EXCHANGE-011` | Settlement preview contract is misaligned with loop continuity | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Weakens trust in the settlement handoff by collecting trade context that preview logic does not actually use | Tenant settlement preview UI requires trade ID and escrow ID, but the preview service path computes preview from escrow balance only | Settlement preview must align with the real trade-plus-escrow continuity it claims to validate | `server/src/routes/tenant/settlement.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-006`; closed at `2026-03-25`; evidence `fdb14465dacd25ef58fce6510d890c5876d31021` |
| `GAP-EXCHANGE-012` | Settlement does not validate trade-escrow pairing | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Breaks loop integrity at the final handoff because settlement can proceed without proving the trade and escrow belong together | Settlement execution loads trade and escrow independently within the same tenant scope but does not verify that the provided pair is the intended linked execution pair | Settlement must validate trade-to-escrow pairing before preview and execution are treated as credible continuity | `server/src/services/settlement/settlement.service.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-006`; closed at `2026-03-25`; evidence `fdb14465dacd25ef58fce6510d890c5876d31021` |
| `GAP-EXCHANGE-013` | Tenant settlement actor classification is client-trusted | `WORKFLOW` | `EXECUTION_LOOP` | `CLOSED` | Weakens execution safety in the final settlement path | Tenant settlement route accepts `actorType` from the request and forwards it into settlement execution logic | Settlement actor classification must be derived or tightly constrained server-side | `server/src/routes/tenant/settlement.ts` | Closed by `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-006`; closed at `2026-03-25`; evidence `fdb14465dacd25ef58fce6510d890c5876d31021` |

## Loop Continuity Blockers — EXCHANGE CORE

- Status: `IMPLEMENTATION COMPLETED`
- Closed At: `2026-03-25`
- Closed By: `EXCHANGE-CORE-LOOP-001 / EXC-ENABLER-001..006`
- Evidence: `99258252de206d0357ad1934de4fce31197bc8d1`, `3d704188d32e33b7acca12b16941b2dba6ad4664`, `92f6aa0e10adc55a972852e4dac69701cd6c4a4c`, `24588d7d0bb36a1f54020193aa32e670d04b38b4`, `75b05f238b0ae91ede8291e6e337ac414e307e2d`, `fdb14465dacd25ef58fce6510d890c5876d31021`
- Result: `RFQ -> Supplier Response -> Trade Creation -> Trade Lifecycle -> Escrow -> Settlement`

## Layer Summary

### OS / Infrastructure

- Core multi-tenant runtime and auth foundations are materially real.
- The main OS-layer launch risks are enterability and authority conflict, not tenant isolation.
- The largest OS-layer truth problems are misleading authority-bearing docs and fake-complete control surfaces.

### Workflow / Coordination

- Certifications, traceability, escrow, settlement, and escalation flows are materially stronger than the repo's top-level planning language suggests.
- The main workflow gaps are trade execution visibility, shallow operational casework, and narrower-than-marketed DPP scope.

### Exchange / Transactional Surface

- Catalog, cart, checkout, and orders are materially real.
- The exchange core closure is now recorded under `EXCHANGE-CORE-LOOP-001`.
- Verified continuity now reaches `RFQ -> Supplier Response -> Trade Creation -> Trade Lifecycle -> Escrow -> Settlement`.

## Launch Blockers

The following seeded gaps are treated as launch blockers:

- `GAP-ENTRY-001` — business verification onboarding is not operational
- `GAP-ENTRY-002` — tenant provisioning to first-owner activation is broken

## Execution Blockers

The following seeded gaps block the first credible execution loop or weaken launch-grade operations:

- `GAP-OPS-001` — finance ops thin/event-backed
- `GAP-OPS-002` — compliance ops thin/event-backed
- `GAP-OPS-003` — dispute ops thin/event-backed
- `GAP-MODE-001` — white-label admin incomplete

## Fake-Complete Surfaces

The following seeded gaps are explicitly misleading and must not be treated as delivery proof:

- `GAP-TRUTH-001` — API docs fake-complete/static
- `GAP-TRUTH-002` — architecture blueprints fake-complete/misaligned

## Backend-Only Opportunities

No open backend-only opportunities remain inside `EXCHANGE-CORE-LOOP-001` scope after closure on `2026-03-25`.

## Maintenance Rules

1. Update this register only when repo evidence or verified product-truth review changes the state of a gap.
2. Do not add speculative architecture work, governance sequencing, or doctrine-derived placeholders.
3. Prefer updating an existing gap over creating duplicate labels for the same bounded reality.
4. When a gap is closed, the closure statement must describe the materially usable product outcome, not just the code delta.
5. When a surface is found to be static, shallow, or misleading, record that explicitly instead of allowing it to imply delivery.
6. If a later truth document supersedes this register, that replacement must be named explicitly at the top of the file.
