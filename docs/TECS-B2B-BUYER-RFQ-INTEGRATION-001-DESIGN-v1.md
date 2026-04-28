# TECS-B2B-BUYER-RFQ-INTEGRATION-001 — RFQ Flow Deep Integration Design Plan v1

## 1. Title / Unit Metadata

**Unit ID:** TECS-B2B-BUYER-RFQ-INTEGRATION-001  
**Mode:** DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED  
**Status:** DESIGN_DRAFT  
**Design date:** 2026-04-28  
**Owner / context:** TexQtic governance and repo-truth planning  
**Predecessor units:**  
- TECS-B2B-BUYER-CATALOG-PDP-001 (VERIFIED_COMPLETE)  
- TECS-DPP-PASSPORT-FOUNDATION-001 (VERIFIED_COMPLETE)  
- TECS-B2B-BUYER-PRICE-DISCLOSURE-001 (VERIFIED_COMPLETE)

> Stop rule: This artifact is planning-only. No backend logic, frontend UI behavior,
> route implementation, schema changes, Prisma migrations, RFQ mutations, supplier
> notifications, or runtime behavior changes are authorized in this unit.

---

## 2. Problem Statement

Buyer discovery now reaches stable catalog/PDP surfaces and price-disclosure states, but RFQ coupling is not yet deep enough to reliably convert product interest into structured RFQ intent. Without an explicit integration model, buyer handoff from catalog/PDP to RFQ can become inconsistent, leak-sensitive, or tenant-unsafe.

This unit defines a design contract for safe and deterministic catalog-to-RFQ progression, including single-item PDP prefill, multi-item RFQ behavior, supplier mapping, and submit-boundary controls.

## 3. Business Rationale

RFQ is the primary commercial bridge between product discovery and textile procurement negotiation. A strong RFQ integration model improves:
- buyer conversion from browsing to intent,
- supplier lead quality and routing clarity,
- policy-compliant handling of non-visible prices,
- governance visibility for revenue activation readiness.

This unit preserves confidentiality and tenant boundaries while enabling measurable demand capture.

## 4. Current System Assumptions

Design assumptions anchored to repo-truth posture:
- Catalog/PDP foundation is complete and stable for buyer discovery.
- Price disclosure is complete and emits safe RFQ/request-quote CTA states.
- RFQ exists, but deeper catalog/PDP coupling is pending.
- DPP/passport foundation remains a separate bounded surface.
- Relationship/access control remains a future unit.
- Tenant isolation (`org_id`) remains constitutional.

Roadmap order preserved:
1. Catalog/PDP foundation (complete)
2. Price disclosure (complete)
3. RFQ deep integration (this unit)
4. Relationship/access control (future)
5. AI supplier matching (future)

## 5. Non-Goals

Explicitly out of scope for this unit:
- Backend route/service implementation for RFQ handoff
- Frontend RFQ/PDP implementation changes
- Prisma schema changes and migrations
- RFQ record creation or mutation behavior
- Supplier notification implementation
- Relationship-gated access implementation
- AI supplier matching or ranking
- Quote negotiation workflow implementation
- Payment, escrow, credit, settlement, commission, or subscription billing logic
- DPP publication or passport-status behavior changes

## 6. Catalog -> RFQ Entry Model

Conceptual RFQ entry points:
- PDP CTA (primary): explicit buyer action from product detail context.
- Price-disclosure CTA states: `REQUEST_QUOTE` and compatible CTA variants.
- Catalog item card CTA (if available): direct single-item RFQ intent entry.
- Future saved/comparison/cart entry: deferred boundary for multi-item expansion.

Context carried into RFQ intent should include only safe, buyer-visible, tenant-scoped data:
- item identity and display metadata,
- supplier organization reference (resolved server-side),
- buyer organization context from authenticated session,
- disclosure state and CTA reason (non-secret),
- optional quantity/spec draft inputs provided by buyer.

No automatic RFQ creation from catalog/PDP render is permitted.

## 7. PDP Pre-filled RFQ Model

Conceptual prefill contract from PDP should support:
- catalog item ID
- product title/name
- supplier organization reference
- buyer organization reference
- category/material/spec summary context
- MOQ/lead-time context if already safe and available
- selected quantity if buyer provided
- buyer notes draft field
- compliance/certification references only if already safe for buyer
- DPP/passport reference only if safe and published

Prefill principles:
- Never include hidden commercial price values.
- Never include supplier internal policy internals.
- Prefill is a draft context only, not submission.

## 8. Multi-item RFQ Model

Conceptual multi-item behavior:
- Support multiple catalog items in one buyer RFQ drafting session.
- Preserve item-level quantity/spec/notes.
- Preserve buyer-level global RFQ notes.
- Grouping policy should be deterministic by supplier organization.

Grouping boundaries:
- Same-supplier items can remain in one supplier-scoped RFQ submission group.
- Cross-supplier items must not produce a single mixed-visibility supplier payload.
- Design default: split submission by supplier at submit-time, while buyer may draft in one aggregated view.

Future boundary:
- Comparison/cart-originated multi-item capture is deferred to future authorized slices.

## 9. Supplier Mapping Model

Supplier mapping requirements:
- Product-to-supplier mapping must resolve server-side using tenant-safe lookup.
- Supplier organization identity must be stable and scoped for notification/visibility rules.
- Buyer org to supplier org linkage must not leak unrelated supplier metadata.
- Inactive/unpublished suppliers or products must fail safely with non-disclosing denial.
- Hidden supplier internals (contacts, policy details, private flags) must never appear in buyer RFQ context.

Supplier contact/notification remains submit-boundary and policy-controlled.

## 10. Buyer Eligibility / Authentication Model

Buyer RFQ requirements (conceptual):
- Unauthenticated buyer: no RFQ creation; route to login boundary.
- Authenticated buyer: required for draft/submit intent.
- Buyer organization context: required; no org-less RFQ mutation path.
- Future verified-buyer requirement: deferred and policy-driven.
- Future relationship/access control integration: explicitly deferred.

Eligibility outcomes must be deterministic and must not bypass price-disclosure restrictions.

## 11. Price Disclosure Integration Model

RFQ integration with completed disclosure model:
- `RFQ_ONLY` -> route to RFQ intent.
- `PRICE_ON_REQUEST` -> route to RFQ intent.
- `HIDDEN` -> policy-controlled contact/RFQ pathway without value exposure.
- `LOGIN_REQUIRED` -> block RFQ creation until authenticated.
- `ELIGIBILITY_REQUIRED` -> block RFQ submit path until eligibility passes.
- Visible price states may still allow RFQ for negotiated textile procurement.

This unit does not alter disclosure resolver logic or state semantics.

## 12. RFQ Lifecycle Model

Conceptual lifecycle phases:
- Draft RFQ intent (buyer-owned, not supplier-visible by default)
- Submitted RFQ (explicit buyer submit action)
- Supplier-visible RFQ (post-submit boundary only)
- Supplier response/quote (existing or future unit boundary)
- Cancellation/expiry controls (future boundary unless already present)

Lifecycle guardrails:
- Draft visibility must remain buyer-org scoped.
- Submit must be explicit and auditable.
- No supplier-facing side effects on draft creation.

## 13. Backend Design Considerations

Future implementation considerations:
- Clear service boundary for prefill context builder and RFQ submission orchestrator.
- Route/API boundaries separating prefill retrieval, draft save, and submit actions.
- Validation for buyer auth, buyer org, item ownership/scope, and supplier mapping.
- Idempotency for submit path to prevent duplicate RFQ creation.
- Tenant-safe product lookup enforced server-side.
- Safe prefill shaping that excludes hidden price and policy internals.
- Persistence boundaries for draft and submitted states with audit metadata.

Migration planning note:
- Any future schema/database changes must use Prisma migration ledger flow only.
- Known historical Prisma shadow replay blocker for `migrate dev` remains out of scope for this design unit.

## 14. Frontend Design Considerations

Future UI/UX considerations:
- PDP CTA should trigger explicit RFQ entry action only.
- RFQ entry can be modal/page, but must preserve deterministic handoff context.
- Prefilled item summary must clearly separate immutable source context vs editable buyer inputs.
- Multi-item UX should show supplier grouping and split behavior before submit.
- Support item-level quantity/spec notes and buyer-level notes.
- Provide clear error states for auth, eligibility, unpublished item, and mapping failures.
- Login-required behavior must redirect or gate before mutation.
- Accessibility and localization-ready labels for disclosure/RFQ states are required.

## 15. Notification Boundary

Notification boundary decision for future implementation:
- Supplier notification is deferred by default unless explicitly authorized in a dedicated slice.
- No notification on draft creation.
- Notification triggers only on explicit submit and only through approved channels.
- Initial scope recommendation when authorized: in-app and/or email notification after submit.

No notification behavior is implemented in this unit.

## 16. Data / Contract Planning - Conceptual Only

```ts
// Design-only conceptual shapes; not implemented.
interface CatalogRfqPrefillContext {
  item_id: string;
  product_name: string;
  supplier_org_id: string;
  buyer_org_id: string;
  category?: string | null;
  material?: string | null;
  spec_summary?: string | null;
  moq?: number | null;
  lead_time_days?: number | null;
  selected_quantity?: number | null;
  buyer_notes?: string | null;
  compliance_refs?: string[];
  published_dpp_ref?: string | null;
  price_visible: boolean;
  price_visibility_state: string;
}

interface RfqLineItemInput {
  item_id: string;
  supplier_org_id: string;
  quantity?: number | null;
  spec_notes?: string | null;
}

interface RfqDraftInput {
  buyer_org_id: string;
  line_items: RfqLineItemInput[];
  buyer_notes?: string | null;
}

interface RfqSupplierGroup {
  supplier_org_id: string;
  line_items: RfqLineItemInput[];
}

interface BuyerRfqSubmissionView {
  rfq_draft_id: string;
  buyer_org_id: string;
  supplier_groups: RfqSupplierGroup[];
  status: 'DRAFT' | 'SUBMITTED';
}

interface SupplierRfqNotificationContext {
  supplier_org_id: string;
  submitted_rfq_ids: string[];
  trigger: 'EXPLICIT_SUBMIT_ONLY';
}
```

## 17. Tenant Isolation Requirements

Future implementation must enforce:
- No cross-tenant RFQ creation.
- No buyer access to RFQs from another buyer org.
- No supplier access to unrelated RFQs.
- No supplier policy internals in buyer RFQ context.
- Trusted server-side supplier mapping only.
- No hidden price exposure through prefill or RFQ payload shaping.

## 18. Security / Anti-Leakage Requirements

Future implementation must prevent:
- Hidden price leakage in prefill, API responses, logs, and client payloads.
- Supplier internal policy leakage.
- Cross-tenant supplier mapping leakage.
- Unpublished product exposure.
- Draft RFQ access by wrong buyer org.
- Supplier visibility before explicit submit for draft-only state.
- Accidental quote creation from UI load.
- Automatic RFQ creation from PDP render.

Fail-safe posture:
- On ambiguity or mapping failure, deny mutation with non-disclosing error semantics.

## 19. DPP / Compliance Boundary

DPP/compliance references in RFQ context are permitted only when:
- Reference is already safe and published,
- No AI draft extraction data is exposed,
- No unpublished evidence is exposed,
- No automatic DPP publication occurs,
- No passport status promotion is triggered.

DPP foundation remains separate and unchanged in this unit.

## 20. Test Strategy for Future Implementation

Planned tests:
- PDP prefill generation correctness
- RFQ-only CTA handoff
- Price-on-request CTA handoff
- Unauthenticated buyer handling
- Authenticated buyer handling
- Buyer org requirement enforcement
- Supplier mapping correctness
- Same-supplier multi-item RFQ behavior
- Cross-supplier grouping/splitting behavior
- Hidden price not copied into RFQ context
- Tenant isolation across buyer and supplier views
- Unpublished product denial behavior
- Draft vs submitted RFQ visibility controls
- No supplier notification before submit unless explicitly authorized
- No automatic RFQ creation from PDP page load

Recommended surfaces:
- Backend contract/unit tests for prefill builder and submit orchestrator
- Route-level tenant/auth validation tests
- Frontend handoff and state tests for explicit user action boundaries

## 21. Runtime Verification Plan for Future Implementation

Planned runtime checks after implementation authorization:
- PDP -> RFQ prefill handoff correctness
- RFQ draft creation occurs only on explicit buyer action
- RFQ submit flow transitions draft to submitted correctly
- Supplier mapping correctness across single and multi-item flows
- No hidden price in API payloads or hydration data
- Buyer tenant isolation enforcement
- Supplier tenant isolation enforcement
- Multi-item RFQ grouping/splitting behavior as designed
- Production PDP health remains stable

This unit performs no runtime behavior change.

## 22. Open Questions

1. Should first implementation persist one aggregate draft and split only at submit, or persist per-supplier drafts from start?
2. What minimum buyer profile completeness is required before submit in v1?
3. Which fields in supplier mapping failures should be user-visible vs internal-only?
4. Is supplier notification part of RFQ integration v1 or explicitly deferred to a dedicated authorization?
5. Should buyer be allowed to submit partially invalid multi-item drafts (valid subset) or require all-or-nothing?
6. How should cancellation/expiry timelines be standardized across tenants in first release?

## 23. Recommended Implementation Slices

- Slice A: RFQ prefill contract and server-side context builder
- Slice B: PDP -> RFQ single-item handoff
- Slice C: RFQ draft/submit persistence alignment
- Slice D: Multi-item RFQ grouping and supplier mapping
- Slice E: Buyer/supplier tenant isolation tests
- Slice F: Supplier notification boundary, if authorized
- Slice G: Production runtime verification and governance closure

## 24. Completion Checklist

- [x] Design artifact created for TECS-B2B-BUYER-RFQ-INTEGRATION-001
- [x] Artifact explicitly marked DESIGN ONLY
- [x] No backend/frontend/schema/migration implementation included
- [x] Catalog -> RFQ entry model documented conceptually
- [x] PDP prefilled RFQ model documented conceptually
- [x] Multi-item RFQ model documented conceptually
- [x] Supplier mapping model documented conceptually
- [x] Buyer eligibility/auth boundary documented
- [x] Price disclosure integration documented
- [x] Tenant isolation and anti-leakage requirements documented
- [x] DPP/compliance boundary documented
- [x] Future implementation slices recommended

---

*Design artifact created: 2026-04-28*  
*Unit: TECS-B2B-BUYER-RFQ-INTEGRATION-001*  
*Mode: DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED*
