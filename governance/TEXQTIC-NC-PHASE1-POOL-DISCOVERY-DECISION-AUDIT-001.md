# TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-AUDIT-001
## Repo-Truth Audit and Decision Options for Pool Discovery Section 14

Document ID: TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-AUDIT-001
Status: AUDIT AND DECISION OPTIONS ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded repo-truth audit packet
Date: 2026-05-07

Implementation gate:
- This packet provides evidence, options, and recommendations for Section 14 decisions.
- This packet does NOT authorize route/service/schema/test/UI implementation work.

---

## 1. Executive Summary

This audit evaluates current TexQtic repo truth to support decisions required before any Network Commerce pool discovery implementation.

Current repo-truth posture strongly favors a conservative first release:
- tenant owner list and joined list first
- no non-member open-pool discovery yet
- no owner identity exposure to non-members
- target_qty owner-only
- member count hidden
- raw metadata hidden from discovery payloads
- control-plane cross-tenant discovery as a separate packet

The above aligns with established patterns in tenant routes:
- strong org scoping
- explicit safe-field projection
- policy/internal-field suppression
- non-leak error semantics
- clear tenant vs control-plane separation

---

## 2. Pre-work Verification

### 2.1 Preflight git status
- `git status --short` returned empty output at packet start.

### 2.2 Required commit confirmation
- Commit `37d574ce2059fa69f372f0e6ea09d9c7b72b7894` exists.

---

## 3. Files Inspected

Governance and design references:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/GOVERNANCE-CHANGELOG.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001.md
- governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-ROUTE-DESIGN-001.md
- docs/TEXQTIC-NC-PHASE1-POOL-FEATURE-FLAG-PROD-VERIFY-001.md

NC implementation anchors:
- server/prisma/schema.prisma
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.ts
- server/src/middleware/ncPoolFeatureGate.middleware.ts
- server/src/routes/tenant/pools.integration.test.ts

Tenant list/discovery and visibility patterns:
- server/src/routes/tenant.ts
- server/src/routes/tenant/trades.g017.ts
- server/src/routes/tenant/escrow.g018.ts
- server/src/routes/tenant/certifications.g019.ts
- server/src/routes/tenant/traceability.g016.ts

Public and control-plane patterns:
- server/src/routes/public.ts
- server/src/routes/control/trades.g017.ts
- server/src/routes/control/certifications.g019.ts
- server/src/routes/admin/traceability.g016.ts

Response/auth/context utilities:
- server/src/utils/response.ts
- server/src/middleware/auth.ts
- server/src/middleware/database-context.middleware.ts

---

## 4. Repo-Truth Findings

### 4.1 Existing NC Pool surface
- Pool routes currently include create/open/join/get-by-id/get-membership only.
- No discovery/list endpoint currently exists.
- Existing pool reads are owner/member scoped.
- Existing pool DTO includes sensitive fields (`target_qty`, `metadata`) when caller is owner/member scoped.

### 4.2 Feature gate precedent
- `ncPoolFeatureGateMiddleware` is applied to all current pool routes, including GET routes.
- Gate is two-layer (global + tenant override) and fail-closed to 503 FEATURE_DISABLED.
- Precedent supports mandatory reuse on future discovery routes.

### 4.3 Tenant list route patterns
- Tenant list routes use strict query validation, bounded pagination, and explicit field projection.
- Common patterns:
  - cursor pagination for catalog and orders
  - limit/offset for other tenant lists
  - stable sort keys
  - explicit exclusion of policy/internal fields
- Several routes document anti-leak behavior explicitly (for example invalid cursor returns generic 400 without cross-tenant reveal).

### 4.4 Marketplace/listing visibility patterns
- Buyer-facing catalog browse route intentionally suppresses policy/internal fields in response.
- Recommendation route explicitly excludes internals such as score/rank/confidence/relationshipState/internal metadata.
- Public supplier discovery exists, but it is a dedicated public route family with controlled projection and eligibility gating.

### 4.5 Participant-scoped visibility patterns
- RFQ/trade/order routes are participant scoped.
- Non-participant data is not listed by default in tenant routes.
- Trade and order list routes use org scoping plus RLS context and return controlled projections.

### 4.6 Metadata JSON exposure patterns
- Metadata JSON appears in multiple domains, but discovery/listing endpoints generally avoid returning raw internal metadata unless route-specific and actor-appropriate.
- Sensitive/internal metadata is often routed to audit logs (`metadataJson`) rather than broad list payloads.
- Catalog and recommendation surfaces demonstrate explicit suppression of internal policy/metadata fields.

### 4.7 Control-plane and tenant separation
- Control-plane routes provide cross-tenant list capabilities with explicit admin context and separate route namespace.
- Tenant routes remain org scoped.
- This separation is consistent across trades, certifications, traceability, and other domains.

### 4.8 RLS and service boundary patterns
- Tenant routes commonly combine:
  - authenticated dbContext org scoping
  - withDbContext RLS execution
  - explicit defensive where filters
- Multi-actor list semantics are typically encoded intentionally per route/service; no broad cross-org default behavior exists.

---

## 5. Decision-by-Decision Options and Recommendations

## Decision 1 - Open-pool discovery policy
Question: Should non-member tenants discover OPEN/AGGREGATING pools?

Repo-truth evidence:
- Current pool routes are owner/member scoped.
- Tenant listing patterns prioritize safe projection and anti-leak behavior.
- Public discovery routes in other domains are separate, constrained surfaces.

Options:
- Option A (conservative): defer non-member open discovery; implement owner + joined lists only.
- Option B (moderate): allow open discovery with minimal projection only (no counts, no quantities, no metadata, no owner identity).
- Option C (broad/future): richer open discovery with policy-controlled fields and explicit opt-in.

Risk analysis:
- Privacy risk: A low, B medium, C high.
- Commercial leakage risk: A low, B medium, C high.
- Implementation complexity: A low, B medium, C high.
- Rollout risk: A low, B medium, C high.
- Future RFQ impact: A clean baseline, B manageable, C higher coupling risk.

Recommendation:
- Recommend Option A.
- Does it block implementation: No. Owner + joined discovery can proceed after decision record.

---

## Decision 2 - Owner identity exposure
Question: Should owner identity be visible in future non-member discovery payloads?

Repo-truth evidence:
- Tenant browse responses commonly suppress policy/internal ownership details unless required.
- Recommendation/pdp surfaces use deliberate allowlists and suppression comments.

Options:
- Option A (conservative): hide owner identity.
- Option B (moderate): expose opaque `owner_ref` only.
- Option C (broad/future): expose verified owner display name for opt-in pools.

Risk analysis:
- Privacy risk: A low, B medium, C medium/high.
- Commercial leakage risk: A low, B medium, C high.
- Implementation complexity: A low, B medium, C medium.
- Rollout risk: A low, B medium, C medium/high.
- Future RFQ impact: A decoupled, B manageable, C could bias supplier/member behavior.

Recommendation:
- Recommend Option A for first implementation packet.
- Does it block implementation: No.

---

## Decision 3 - target_qty sensitivity
Question: Is target_qty commercially sensitive outside owner context?

Repo-truth evidence:
- Existing pool DTO includes `target_qty`, but current reads are owner/member scoped only.
- Marketplace routes in other domains often hide sensitive commercial fields from broad discovery.

Options:
- Option A (conservative): owner-only.
- Option B (moderate): joined members can see exact target_qty.
- Option C (moderate/future): non-members see bucketed/rounded target_qty.
- Option D (broad/future): opted-in pools expose exact target_qty publicly.

Risk analysis:
- Privacy risk: A low, B medium, C medium/high, D high.
- Commercial leakage risk: A low, B medium, C high, D high.
- Implementation complexity: A low, B low/medium, C medium, D medium/high.
- Rollout risk: A low, B medium, C high, D high.
- Future RFQ impact: A preserves negotiation privacy, D can pre-signal demand leverage.

Recommendation:
- Recommend Option A now.
- Does it block implementation: No.

---

## Decision 4 - member count exposure
Question: Can member participation count be shown to joined or non-member viewers?

Repo-truth evidence:
- Existing pool routes do not expose membership aggregates.
- Participant-scoped patterns are common; cross-participant aggregate exposure is not default.

Options:
- Option A (conservative): hidden.
- Option B (moderate): joined members only.
- Option C (moderate/future): bucketed count.
- Option D (broad/future): exact count for opted-in open pools.

Risk analysis:
- Privacy risk: A low, B medium, C medium, D medium/high.
- Commercial leakage risk: A low, B medium, C medium/high, D high.
- Implementation complexity: A low, B medium, C medium, D medium.
- Rollout risk: A low, B medium, C medium/high, D high.
- Future RFQ impact: count visibility can influence pricing behavior and crowding effects.

Recommendation:
- Recommend Option A in first release.
- Does it block implementation: No.

---

## Decision 5 - metadata JSON policy
Question: Is any metadata JSON safe for tenant discovery responses?

Repo-truth evidence:
- NetworkPool model includes `metadata` JSONB.
- Existing routes in multiple domains carefully project explicit fields and suppress policy/internal details.
- Audit metadata is commonly logged internally, not broadly surfaced in discovery payloads.

Options:
- Option A (conservative): hide raw metadata everywhere in tenant discovery.
- Option B (moderate): expose allowlisted metadata keys only.
- Option C (moderate): expose raw metadata to owner/admin only.
- Option D (future): add dedicated `safe_public_metadata` shape/field.

Risk analysis:
- Privacy risk: A low, B medium, C low/medium, D medium (until hardened).
- Commercial leakage risk: A low, B medium/high (depends on key discipline), C low for owner/admin paths, D medium.
- Implementation complexity: A low, B medium, C medium, D high (new contract).
- Rollout risk: A low, B medium, C medium, D high.
- Future RFQ impact: uncontrolled metadata can leak strategy/spec timing signals.

Recommendation:
- Recommend Option A now, with a future Option B allowlist packet only after key-by-key policy review.
- Does it block implementation: No.

---

## Decision 6 - Control-plane sequencing
Question: Should admin cross-tenant discovery be designed before tenant open-pool discovery?

Repo-truth evidence:
- Control-plane cross-tenant lists already exist in several domains under separate route families.
- Tenant and control-plane concerns are consistently separated.

Options:
- Option A (conservative): tenant owner+joined first; admin later.
- Option B (moderate): admin discovery first; tenant later.
- Option C (parallel/future): both in separate parallel design packets.

Risk analysis:
- Privacy risk: A low, B low/medium, C medium.
- Commercial leakage risk: A low, B low (admin-only), C medium if timelines overlap without policy lock.
- Implementation complexity: A low, B medium, C medium/high.
- Rollout risk: A low, B medium, C medium/high.
- Future RFQ impact: admin-first can improve observability but may delay tenant value.

Recommendation:
- Recommend Option A for near-term velocity and minimal scope.
- Option C is acceptable if Paresh explicitly wants control observability in parallel and keeps packets separate.
- Does it block implementation: No for owner+joined tenant discovery.

---

## 6. Recommended Decision Set (Default)

Recommended defaults:
1. Decision 1: Option A
2. Decision 2: Option A
3. Decision 3: Option A
4. Decision 4: Option A
5. Decision 5: Option A
6. Decision 6: Option A (or C only by explicit Paresh direction)

Interpretation:
- Proceed with owner list + joined list only.
- Defer non-member open discovery.
- Hide owner identity for non-members.
- Keep target_qty owner-only.
- Keep member count hidden.
- Keep raw metadata hidden.
- Keep control-plane discovery as separate future packet.

---

## 7. Risks and Mitigations

Primary risks under broader options:
- privacy leakage through aggregate demand/count signals
- commercial leakage affecting negotiation leverage
- accidental exposure via raw metadata JSON
- rollout instability from policy drift across multiple route families

Mitigations:
- strict explicit response projection allowlists
- default-deny for sensitive fields
- uniform non-leak error semantics
- phase-gated expansion only after decision records
- maintain tenant/control-plane packet separation

---

## 8. Decisions Requiring Explicit Paresh Approval

Required explicit approvals before implementation:
1. Whether non-member open discovery remains deferred.
2. Whether any owner identity signal is allowed for non-members.
3. Whether target_qty can be exposed outside owner context.
4. Whether any member count signal can be exposed.
5. Whether any metadata key allowlist should be introduced now.
6. Whether control-plane discovery should remain deferred or run as parallel design.

---

## 9. Implementation Readiness Under Conservative Defaults

Can discovery implementation proceed under conservative defaults?
- Yes.

Condition:
- Paresh should first record selected decisions in a dedicated decision-record packet.

Scope that can proceed after decision record:
- tenant owner list
- tenant joined list
- mandatory nc pool feature gate reuse
- no schema change required by this packet

---

## 10. Proposed Follow-up Packets

Proposed decision-record packet:
- TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001

Proposed implementation packet (after decision record):
- TEXQTIC-NC-PHASE1-POOL-DISCOVERY-IMPLEMENTATION-001

---

## 11. Completion Checklist

- [x] git status checked
- [x] discovery design commit confirmed
- [x] discovery design artifact reviewed
- [x] current pool route/service/gate inspected
- [x] existing tenant list patterns inspected
- [x] marketplace/listing visibility patterns inspected where present
- [x] metadata exposure patterns inspected
- [x] control-plane/admin separation inspected
- [x] RLS/service scoping patterns inspected
- [x] all six Section 14 decisions analyzed
- [x] options provided for each decision
- [x] recommended decision set provided
- [x] Paresh decision requirements listed
- [x] one audit artifact created
- [x] no code/schema/migration/test/UI changes made
- [ ] one atomic commit made (execution step)
