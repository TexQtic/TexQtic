# CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-DESIGN-001

## 1. Status Header

- Unit ID: CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-DESIGN-001
- Mode: Design-only dependency export / dry-run planning (no mutation)
- Date: 2026-05-26
- Branch: main
- HEAD at audit start: 753c8cb18515e3ca1cca15cdf70776ce4fc19663
- Final recommendation enum: EXPORT_DESIGN_REQUIRES_LOCAL_SCRIPT

## 2. Background

This unit is opened after CONTROL-PLANE-TEST-TENANT-DELETE-FEASIBILITY-DECISION-001 concluded that delete feasibility cannot be declared globally for current safe candidates without per-tenant dependency export.

Paresh clarified that delete/remove feasibility should be explored if safe and non-disruptive, but QA tenants must not be archived or deleted.

Mandatory no-action exclusion in this lane:

- qa-b2b
- qa-b2c
- qa-wl
- qa-agg
- qa-pend
- white-label-co / White Label Co
- known QA/WL baseline fixtures
- WL verification fixtures unless separately decommissioned by explicit Paresh decision

This unit designs read-only dependency export and dry-run classification only. It does not authorize delete/archive/close/activate/reinstate/suspend/provision/invite/revoke/remove/mutation.

## 3. Verified Prior Checkpoints

Preflight confirmed all required checkpoints exist:

- 6be1f93 (commit)
- 369bbe6 (commit)
- 83d140f (commit)
- 517b8eb (commit)
- a878a9f6 (commit)
- 97ac3e80 (commit)
- cae26415dda03f3334073228a6826d981b25a69a (commit)
- e2465b9 (commit)
- 5dba693 -> 5dba693f108106c93e0f4d6edd694bcd7a74b28a
- 7b842dd -> 7b842ddd53507f1398f19c74f74f9c478eff44f5
- 4a609da -> 4a609dafb1a64d740d961c76c055c0b66e428ebc
- 50a21424f4530d0ba5fb056a85524a7b72208962 (commit)
- 753c8cb -> 753c8cb18515e3ca1cca15cdf70776ce4fc19663

## 4. Prior Candidate and Exclusion Summary

From prior authority artifacts reviewed in this unit:

- Active safe candidates: 22
- Closed safe candidates: 25
- Protected no-action set: 10 examples (policy + observed protected fixtures)
- Ambiguous manual-review records: 4
- Prior delete-feasibility verdict: DELETE_FEASIBILITY_REQUIRES_RUNTIME_DATA_EXPORT

Explicit safety rule in this design:

- QA tenants must not be archived or deleted.
- Protected and ambiguous records are excluded from delete allowlists.

## 5. Repo-Truth Findings

### 5.1 Tenant/org graph has broad delete blast radius

- tenants -> organizations is coupled by deferred FK with ON DELETE CASCADE.
- Deleting tenant can cascade organization row deletion, which is an anchor for many domains.

### 5.2 Referential behavior is mixed (CASCADE + RESTRICT + NO ACTION)

Repo migration history confirms mixed constraints across critical domains:

- CASCADE in several shallow surfaces (tenant domains/branding/memberships/invites/catalog/cart and multiple network tables).
- RESTRICT/NO ACTION in critical domain chains (reasoning logs, trades, escrow, sanctions, traceability, RFQ, DPP, TTP score snapshots, invoices/VPC-linked paths).

Consequence:

- delete safety is per-tenant and graph-depth dependent.
- no global hard-delete claim is safe without per-tenant dependency export and classification.

### 5.3 Control-plane route support remains archive-only

Audited control route surface supports:

- onboarding outcome record
- activate approved onboarding
- archive to CLOSED

No tenant delete endpoint exists in control routes.

### 5.4 Test/fixture dependency usage is widespread

Tests and scripts use generated test-tenant patterns and tenant cleanup in test contexts. This confirms fixture-heavy usage and reinforces strict separation between:

- production/runtime tenant records
- ephemeral test records

### 5.5 Protected keep-set is implemented in backend and UI

Protected slugs/names are present in control-plane archive guards and tenant details behavior, including QA baselines and white-label-co conventions.

### 5.6 Why export is required

Given mixed relation semantics, no delete endpoint, and audit/compliance preservation concerns, a read-only dependency export is a mandatory precondition before any future delete design or execution.

## 6. Dependency Export Specification

### 6.1 Candidate Input

#### A) Active safe candidates (22)

- test-tenant-nll-other-f333d3c9-7cc7995d
- test-tenant-nll-owner-f333d3c9-3904418f
- test-tenant-ni-route-other-201518c0
- test-tenant-ni-route-owner-5adce6d0
- test-tenant-sri-other-ada20264
- test-tenant-sri-supplier-2-00f18b4a
- test-tenant-sri-supplier-1-d51e0a13
- test-tenant-sri-owner-66a00c2f
- test-tenant-ns-comp-dup-member-1c37aa07
- test-tenant-ns-prev-mat-member-1ba324dc
- test-tenant-ns-prev-member-a5fbe6d8
- test-tenant-ns-member-org-9faafb2b
- test-tenant-ns-route-other-b33663d6
- test-tenant-ns-route-owner-2c8611a0
- test-tenant-rfq-read-other-094d5dde
- test-tenant-rfq-read-owner-6b707770
- test-tenant-award-route-supplier-e77ec63d
- test-tenant-award-route-owner-7f7f1a07
- test-tenant-rfq-route-other-9eae5cf5
- test-tenant-rfq-route-owner-33416ed7
- test-tenant-nll-other-43b6a714-2d3bf800
- test-tenant-nll-owner-43b6a714-320e600a

#### B) Closed safe candidates (25)

- test-tenant-email-verification-1779163982162
- b2c-browse-proof-20260402080229
- activation-verify-2026-04-02-org-status-close-gate-exec
- activation-verify-2026-04-01-deep-dive-exec
- test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb
- test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-4b7e9738
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-af635052
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-4cb0014e
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-092a4636
- test-tenant-wave2-1774063117878
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-3df1138c
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-1269c633
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-e30e20b3
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-719592c3
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-21245947
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-aad3f4ef
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-51206629
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-2d974209
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-d3d6228d
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f638febf
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-254c8dfd
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f49b0ca1

#### C) Protected no-action exclusions (hard block)

- qa-b2b
- qa-b2c
- qa-wl
- qa-agg
- qa-pend
- white-label-co
- White Label Co
- wl-verify-s1-20260328-0510
- wl-verify-s1-20260328-0445
- wl-verify-s1-20260328-0440

#### D) Ambiguous no-action exclusions (manual decision)

- shraddha-industries
- acme-corp-live-verify
- ops-casework-seller-681cd6f6
- ops-casework-buyer-e13b66cb

### 6.2 Per-Tenant Export Fields

For each input slug, export one row/object with:

- tenantId
- tenantSlug
- tenantName
- tenantStatus
- onboardingStatus
- organizationId
- classification
- blockerReasons[]
- evidenceSnapshotRef

Dependency counters (read-only counts):

- membershipCount
- userCountViaMemberships
- domainCount
- tenantBrandingCount
- auditLogCount
- eventLogCount
- reasoningLogCount
- marketplaceCatalogCount
- cartCount
- marketplaceCartSummaryCount
- rfqCountAsBuyer
- rfqCountAsSupplier
- rfqResponseCount
- orderCount
- orderItemCount
- tradeCount
- tradeEventCount
- invoiceCount
- vpcCount
- escrowCount
- escalationCount
- sanctionsCount
- traceabilityNodeCount
- traceabilityEdgeCount
- dppPassportCount
- dppEvidenceClaimCount
- dppEvidenceItemCount
- tenantFeatureOverrideCount
- aiBudgetCount
- aiUsageMeterCount
- inviteCount
- impersonationSessionCount
- refreshTokenCountViaMembers
- wlDomainCount
- wlCustomDomainCount
- crmCaeReferenceCount (0 if no explicit CRM/CAE-owned tables are discoverable in schema for tenant/org)
- otherDependencyCounts: key/value map for newly discovered tenant/org relations

### 6.3 Classification Rules

- PROTECTED_NO_ACTION
  - slug/name in protected QA/WL keep-set, or known baseline/WL verification fixture.

- AMBIGUOUS_NO_ACTION
  - in ambiguous manual-review list.

- DELETE_UNSUPPORTED
  - delete mechanism absent in app route surface and classification cannot prove safe deletion path from repo truth alone.

- DELETE_BLOCKED
  - non-zero dependencies in critical RESTRICT/NO ACTION domains or governance-critical history domains.
  - examples: reasoning_logs, trades, escrow constraints, sanctions, traceability, DPP, TTP snapshots, invoice/VPC, RFQ trade-linking chains.

- DELETE_POSSIBLE
  - candidate is not protected/ambiguous,
  - no critical blockers,
  - dependency profile indicates only shallow removable/cascading records,
  - and export evidence is complete and approved.

Design guardrail:

- DELETE_POSSIBLE is a dry-run classification only; not a delete authorization.

### 6.4 Blocker Reasons Taxonomy

Use stable blocker codes in output:

- PROTECTED_QA_BASELINE
- PROTECTED_WL_BASELINE
- AMBIGUOUS_REQUIRES_PARESH_DECISION
- UNSUPPORTED_NO_DELETE_ROUTE
- BLOCKED_REASONING_LOG_DEPENDENCY
- BLOCKED_TRADE_DOMAIN_DEPENDENCY
- BLOCKED_RFQ_DOMAIN_DEPENDENCY
- BLOCKED_TRACEABILITY_DEPENDENCY
- BLOCKED_DPP_DEPENDENCY
- BLOCKED_TTP_FINANCE_DEPENDENCY
- BLOCKED_AUDIT_EVIDENCE_RETENTION
- BLOCKED_UNKNOWN_RELATION

### 6.5 Output Artifact Format

Produce both:

- JSON report:
  - machine-consumable full record list
  - totals by classification
  - blocker histogram
- Markdown report:
  - executive summary
  - per-tenant table
  - protected and ambiguous exclusion confirmations
  - explicit candidate subset for possible future approval

Evidence snapshot reference format:

- timestamped report path + git HEAD + script version marker.

## 7. Implementation Mechanism Options

| Option | Summary | Benefits | Risks | Required files | Production credentials needed | Direct DB access needed | Source changes required | Tests required | Recommendation Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | One-off direct DB read-only query session | Fast for one run | Fragile, low repeatability, weak governance trace | none committed | yes | yes | no | no | NOT_RECOMMENDED |
| B | Local read-only Prisma script producing JSON + markdown reports | Repeatable, auditable, minimal blast radius, no route change | Requires careful query mapping and read-only enforcement | one new script + output artifact paths | yes (read-only env) | via Prisma read-only context | yes (script only) | yes (dry-run script checks) | RECOMMENDED |
| C | Backend SuperAdmin read-only dry-run endpoint | central API contract and runtime UX alignment | route/auth surface expansion before decision closure | route + service + tests + API client | yes | indirect | yes (backend+frontend possibly) | yes | DECISION_GATED |
| D | Control-plane UI dry-run report | operator-friendly | highest change surface and coupling | ui + api + backend + tests | yes | indirect | yes | yes | DEFERRED |
| E | No export tooling, archive-only forever | simplest operations | delete feasibility never resolved; permanent cleanup debt | none | no | no | no | no | ACCEPTABLE |
| F | Defer delete until staging clone rehearsal | strongest safety rehearsal | schedule and environment dependency; no immediate resolution | rehearsal plan artifacts | yes (staging) | yes | possible | yes | ACCEPTABLE |

## 8. Recommended Path

Selected option: Option B (local read-only script using Prisma client).

Rationale:

- aligned with current repo truth (no delete route; mixed FK behavior; strong need for per-tenant graph export)
- minimal implementation surface compared with backend route/UI additions
- preserves design-only constraints in this unit and enables future dry-run gates without mutation.

Future implementation unit ID (proposed):

- CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-IMPLEMENTATION-001

### 8.1 Future likely file allowlist (implementation unit only)

- server/scripts/control-plane/tenant-delete-dependency-export.ts (new)
- artifacts/control-plane/test-tenant-delete-dependency-export.json (generated report)
- artifacts/control-plane/test-tenant-delete-dependency-export.md (generated report)
- optional: server/scripts/README.md section update only if required by repo convention

### 8.2 Future forbidden files/surfaces

- server/src/routes/** (no delete route in export implementation unit)
- server/prisma/schema.prisma
- server/prisma/migrations/**
- components/**
- services/**
- tests/** (except narrowly-scoped script-level validation if explicitly allowlisted)
- any runtime mutation surfaces in control plane

### 8.3 Test plan (future implementation unit)

- script dry-run with fixed candidate input list
- verify report includes all required fields and classifications
- verify protected + ambiguous exclusions are hard-blocked
- verify no write methods are called (read-only Prisma operations only)

### 8.4 Validation plan (future implementation unit)

- run script in read-only mode
- validate report schema (required keys, classifier enum, blocker code set)
- compare totals to known candidate counts (22 active, 25 closed, protected and ambiguous excluded)
- run git diff --check on implementation changes

### 8.5 Production data posture

- production read-only environment access is needed to produce true dependency counts.
- direct DB writes are forbidden.
- deletion remains unauthorized after export until Paresh reviews export results and explicitly approves exact DELETE_POSSIBLE subset.

### 8.6 Required Paresh approval wording after export

Proposed approval statement for any future destructive lane:

"I reviewed the dependency export report for CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-IMPLEMENTATION-001 and approve only the exact DELETE_POSSIBLE tenant subset listed by tenant ID and slug. I confirm QA/WL protected tenants and ambiguous tenants remain no-action. I acknowledge this approval does not authorize bulk delete outside the named subset."

## 9. Decision Gates

Before any delete/remove action, all gates must pass:

1. Export-complete gate
- read-only dependency export executed successfully for full candidate input set.

2. Hard-block gate
- protected QA/WL set classified PROTECTED_NO_ACTION.
- ambiguous set classified AMBIGUOUS_NO_ACTION.

3. Dry-run classification gate
- each non-excluded candidate classified DELETE_POSSIBLE, DELETE_BLOCKED, or DELETE_UNSUPPORTED.

4. Paresh subset approval gate
- explicit approval of exact DELETE_POSSIBLE subset by tenant ID and slug.

5. Implementation safety gate
- irreversible-action safeguards designed and approved in a separate unit.

6. Post-action verification gate (future destructive unit only)
- no protected/ambiguous mutations,
- evidence reconciliation report produced.

## 10. Final Verdict

EXPORT_DESIGN_REQUIRES_LOCAL_SCRIPT
