# MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001

## 1. Status Header

- Status: EVIDENCE_AUDIT_ONLY
- Repo: TexQtic (Main App)
- Branch: main
- HEAD: 369bbe6
- Mode lock: Main App repo-truth investigation only; no implementation, no runtime behavior changes, no schema/DB changes, no production smoke, no CRM/CAE calls, no provisioning execution
- Date: 2026-05-26

## 2. CRM Request Summary

CRM requested Main App contract evidence for approved-onboarding envelope acceptance before CRM implementation proceeds. The request specifically asks whether envelope fields beyond current provisioning payload are accepted, safely ignored, rejected, or absent from Main App authority, and asks for decision guidance on join key, correlation, idempotency, role classification, and profile sections.

This audit answers from Main App runtime source, Main App tests, Main App contracts, and Main App governance/design docs only.

## 3. Main App Evidence Sources Inspected

| Area | Files/paths inspected | Evidence type | Notes |
|---|---|---|---|
| Provisioning route + request validation | server/src/routes/admin/tenantProvision.ts | Runtime source | Canonical approved-onboarding payload schema, auth gates, conflict/status errors |
| Provisioning service + persistence | server/src/services/tenantProvision.service.ts | Runtime source | Atomic writes to tenant/org/invite, orchestration persistence, activation status derivation |
| Provisioning DTO/types | server/src/types/tenantProvision.types.ts | Runtime source | Request/normalized types, status response contract |
| Provisioning integration tests | server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts | Test | Acceptance/rejection/status/error code behavior evidence |
| Provisioning service tests | server/src/services/tenantProvision.service.test.ts | Test | Persistence fields and invite artifact behavior evidence |
| Activation route behavior | server/src/routes/tenant.ts | Runtime source | Invite acceptance, owner membership creation, activation status transition |
| Shared OpenAPI contract | shared/contracts/openapi.control-plane.json | Contract doc | Documents provisioning request/response; does not include status endpoint |
| Error utility semantics | server/src/utils/response.ts | Runtime source | VALIDATION_ERROR / FORBIDDEN / NOT_FOUND code behavior |
| Schema persistence anchors | server/prisma/schema.prisma | Runtime source/schema evidence | external orchestration ref uniqueness/indexing on core tables |
| Three-system planning docs | governance/launch-readiness/PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md; governance/launch-readiness/PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md; governance/launch-readiness/CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md | Governance/design-only | Design intent only; not runtime acceptance proof |
| Main App CRM handoff contracts | docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md; docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md; docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md | Main App authority docs | Used as contract/guidance evidence where aligned with runtime |

Additional request-source note:
- Requested note title "Main App Team — Required Contract Evidence for CRM Approved-Onboarding Envelope Decision" was not found in this repo. Classification: NOT_FOUND_IN_MAINAPP_AUTHORITY for that specific source artifact.

## 4. Field Acceptance Matrix

| Field | Classification | Evidence | Decision | CRM implementation implication | Confidence |
|---|---|---|---|---|---|
| orchestrationReference | PROVEN_ACCEPTS | Runtime: server/src/routes/admin/tenantProvision.ts:94, 200-206, 355, 449-460; service persistence: server/src/services/tenantProvision.service.ts:192, 278, 303, 315, 346, 491, 538; tests: server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts:206-254, 1259-1309, 1375-1448; schema unique/index: server/prisma/schema.prisma:21, 120, 126 | REMAINS_CANONICAL_CRM_JOIN_KEY | Keep current CRM compatibility behavior: send and retain orchestrationReference; use for duplicate recovery + status lookup fallback; store orgId as durable runtime anchor after 201 | HIGH |
| crossSystemCorrelationId | PROVEN_IGNORES_SAFELY | Runtime route schema does not define this field: server/src/routes/admin/tenantProvision.ts:89-108; parsed body passes through Zod object parse and normalization only (no field usage): tenantProvision.ts:111-137 + types normalization: server/src/types/tenantProvision.types.ts:412-466 | NOT_AUTHORIZED_FOR_RUNTIME | CRM may not depend on Main App consuming/persisting this field now; if sent today, it is not part of runtime contract and must not drive idempotency/recovery logic | MEDIUM |
| idempotencyKey | NOT_FOUND_IN_MAINAPP_AUTHORITY | No provisioning-route acceptance in server/src/routes/admin/tenantProvision.ts approved schema; no tenant provisioning type field in server/src/types/tenantProvision.types.ts request interfaces; dedupe currently handled by orchestration unique + 409 mapping in tenantProvision.ts:166-190 | NOT_AUTHORIZED_FOR_RUNTIME | CRM must continue using orchestrationReference as practical dedupe key for this seam; separate idempotencyKey requires Main App contract update first | HIGH |
| crmVerificationId | NOT_FOUND_IN_MAINAPP_AUTHORITY | Absent from provisioning route schema/types/service/tests; appears only in design docs (governance plan files), not runtime acceptance | NOT_REQUIRED_IN_ENVELOPE | CRM should not send as required runtime field for Main App seam now; if needed for CRM-local traceability, keep internal or map into approvedOnboardingMetadata only after governance approval | HIGH |
| partyType | NOT_FOUND_IN_MAINAPP_AUTHORITY | Absent from runtime provisioning schema/types/service/tests; appears in design-only governance docs | NOT_AUTHORIZED_FOR_RUNTIME | CRM cannot assume buyer/supplier discriminator is accepted at Main App provisioning seam now; buyer/supplier routing must be solved by separate contract/matrix unit | HIGH |
| supplierProfileSection | NOT_FOUND_IN_MAINAPP_AUTHORITY | Absent from runtime provisioning schema/types/service/tests; appears only in design plans | DESIGN_ONLY_FUTURE_SECTION | CRM must not send supplierProfileSection as runtime-contract field today; needs explicit Main App contract extension before implementation | HIGH |
| buyerProfileSection | NOT_FOUND_IN_MAINAPP_AUTHORITY | Absent from runtime provisioning schema/types/service/tests; appears only in design plans | DESIGN_ONLY_FUTURE_SECTION | CRM must not send buyerProfileSection as runtime-contract field today; needs explicit Main App contract extension before implementation | HIGH |

## 5. Current Approved-Onboarding Contract Shape

### 5.1 Required fields (runtime accepted now)

From route validation + normalization:
- provisioningMode = APPROVED_ONBOARDING (server/src/routes/admin/tenantProvision.ts:89-96)
- orchestrationReference (server/src/routes/admin/tenantProvision.ts:94)
- organization.legalName and organization.jurisdiction (server/src/routes/admin/tenantProvision.ts:99-105)
- firstOwner.email (server/src/routes/admin/tenantProvision.ts:106-108)
- Canonical identity requirement resolved by normalization: requires base_family or tenant_category, and commercial_plan defaults to FREE for approved-onboarding if omitted (server/src/types/tenantProvision.types.ts:174-222)

### 5.2 Optional fields (runtime accepted now)

- identity aliases/canonical carriers in provisionIdentitySchemaShape:
  - plan, tenant_category, is_white_label, base_family, aggregator_capability, white_label_capability, commercial_plan, primary_segment_key, secondary_segment_keys, role_position_keys (server/src/routes/admin/tenantProvision.ts:58-86)
- organization.displayName, organization.registrationNumber (server/src/routes/admin/tenantProvision.ts:100-105)
- approvedOnboardingMetadata (server/src/routes/admin/tenantProvision.ts:109)

### 5.3 Rejected/unknown field behavior

- Validation rejects malformed required/typed fields via sendValidationError => VALIDATION_ERROR (400) (server/src/routes/admin/tenantProvision.ts:260-276; server/src/utils/response.ts:56)
- Unknown extra fields are not part of schema contract and are not referenced in normalization/service. In current route parse flow, they are effectively non-contract fields and not persisted (tenantProvision.ts parse path + types normalization). Provisioning-specific explicit unknown-field test is not present.

### 5.4 Duplicate handling behavior

- Prisma P2002 conflict mapping:
  - CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE when target includes orchestration (server/src/routes/admin/tenantProvision.ts:166-184)
  - CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE otherwise (server/src/routes/admin/tenantProvision.ts:186-190)
- Confirmed by integration tests (server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts:1359-1448)

### 5.5 Conflict/error code behavior at this seam

- VALIDATION_ERROR (400) on body parse failure (tenantProvision.ts:274 + response util)
- FORBIDDEN (403) for invalid auth/mode boundaries (tenantProvision.ts:241, 271, 287, 441)
- CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE / CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE (409)
- MISSING_PARAMETERS (400) and NOT_FOUND (404) on status route (tenantProvision.ts:451-464)

### 5.6 Runtime authority

- Tenant/org creation authority: Main App provision service transaction (server/src/services/tenantProvision.service.ts:165-461)
- User/member runtime creation authority after invite acceptance: Main App activation flow (server/src/routes/tenant.ts:6287-6480)
- Invite/access artifact issuance: Main App generates inviteToken + tokenHash, returns one-time token in provisioning response (tenantProvision.service.ts:123-127, 341-381)
- Activation truth: Main App derives ACTIVATED/PROVISIONED from invite acceptedAt + owner membership + org status (tenantProvision.service.ts:466-553)

## 6. Conflict/Error Behavior

| Code | Supported? | Evidence | Semantics | Notes |
|---|---|---|---|---|
| CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE | YES | server/src/routes/admin/tenantProvision.ts:181; tests at server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts:1369-1407 | Duplicate orchestration reference re-submission conflict | CRM-safe idempotent recovery path via status query |
| CONFLICT_TENANT_NAME_OR_SLUG_DUPLICATE | YES | server/src/routes/admin/tenantProvision.ts:187; tests at server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts:1410-1448 | Naming/slug-level conflict distinct from orchestration duplicate | Indicates non-equivalent duplicate |
| MISSING_PARAMETERS | YES | server/src/routes/admin/tenantProvision.ts:454; tests 1333-1347 | Status query missing orgId and orchestrationReference | Applies to GET status |
| NOT_FOUND | YES | server/src/routes/admin/tenantProvision.ts:463; tests 1319-1332 | Status query has no matching tenant | Applies to GET status |
| VALIDATION_ERROR | YES | server/src/routes/admin/tenantProvision.ts:274 + server/src/utils/response.ts:56; tests multiple 400 cases | Payload validation failure | 400 |
| FORBIDDEN | YES | server/src/routes/admin/tenantProvision.ts:241, 271, 287, 441 | Auth/mode restrictions violated | 403 |

Impact of new envelope fields:
- Any newly introduced envelope fields (crossSystemCorrelationId, idempotencyKey, crmVerificationId, partyType, supplierProfileSection, buyerProfileSection) currently have no provisioning-route contract support. They do not change existing conflict semantics today because they are not part of runtime dedupe/validation semantics.

## 7. Runtime Authority Boundary Confirmation

| Authority | Owner | Evidence | CRM constraint |
|---|---|---|---|
| Tenant/org runtime creation | Main App | server/src/services/tenantProvision.service.ts:165-461 | CRM must not mutate tenant/org runtime truth directly |
| User/member runtime creation | Main App | server/src/routes/tenant.ts:6330-6460 | CRM must not create or mutate runtime user/member rows |
| Role assignment authority | Main App | tenant activation + membership creation role path in tenant.ts | CRM must not override Main App role truth |
| Activation truth | Main App | queryProvisioningStatus derivation in tenantProvision.service.ts:466-553 | CRM can observe/poll; must not override activation state |
| Access artifact issuance (invite token) | Main App | tenantProvision.service.ts:123-127, 341-381; email invite link generation in server/src/services/email/email.service.ts:264 | CRM relay is operational only; no long-lived raw token storage |

## 8. Unknown Field / Extra Field Behavior

For approved-onboarding provisioning route:
- Unknown fields are not declared in route schema and are not consumed by normalization/service.
- Validation rejects malformed known fields.
- Runtime acceptance for explicit unknown extra fields is not separately asserted by a provisioning-specific test case, but current parse path indicates non-contract extras are not persisted or used.

Classification for unknown envelope extras at this seam: treated as non-contract and effectively ignored/non-persisted unless and until explicitly added to route schema + normalized types + service writes.

## 9. CRM Allowed Envelope

### 9.1 Fields CRM may send now (runtime contract)

- provisioningMode = APPROVED_ONBOARDING
- orchestrationReference
- organization.legalName
- organization.displayName (optional)
- organization.jurisdiction
- organization.registrationNumber (optional)
- firstOwner.email
- Canonical identity carriers currently accepted by route+normalizer:
  - base_family or tenant_category
  - aggregator_capability / white_label_capability / is_white_label
  - commercial_plan or plan (approved mode defaults to FREE if omitted)
  - primary_segment_key / secondary_segment_keys / role_position_keys (subject to B2B taxonomy rules)
- approvedOnboardingMetadata (optional object)

### 9.2 Fields Main App accepts now

- orchestrationReference: accepted, persisted, queryable
- approvedOnboardingMetadata: accepted (optional)
- No runtime acceptance for crossSystemCorrelationId, idempotencyKey, crmVerificationId, partyType, supplierProfileSection, buyerProfileSection

### 9.3 Fields Main App ignores safely (current seam)

- crossSystemCorrelationId (non-contract at runtime)
- crmVerificationId (non-contract at runtime)
- partyType (non-contract at runtime)
- supplierProfileSection (non-contract at runtime)
- buyerProfileSection (non-contract at runtime)

### 9.4 Fields Main App rejects

- Invalid known required/typed fields -> VALIDATION_ERROR (400)
- Invalid auth/mode combinations -> FORBIDDEN (403)

### 9.5 Requires Main App contract update first

- Separate idempotencyKey on approved-onboarding provisioning seam
- Explicit crossSystemCorrelationId runtime acceptance/persistence semantics
- crmVerificationId runtime contract role
- partyType discriminator as runtime contract field
- supplierProfileSection and buyerProfileSection runtime payload sections

### 9.6 Requires Paresh/cross-repo decision first

- Buyer/supplier role/base-family matrix lock for partyType-driven behavior
- Whether crossSystemCorrelationId is wrapper vs replacement semantics for orchestrationReference

### 9.7 CAE dependency

- None required for current Main App-approved onboarding runtime seam as currently implemented.
- CAE-provided fields in design docs are design-only from Main App runtime perspective until explicitly added to route/type/service contracts.

## 10. Implementation Gate

MAINAPP_CONTRACT_UPDATE_REQUIRED

Reason:
- Core current seam is proven for orchestrationReference-based approved-onboarding provisioning and status polling.
- CRM-requested broader envelope fields are not part of current Main App runtime contract.
- Proceeding with broader envelope implementation in CRM without Main App contract extension would create integration drift.

## 11. Recommended Next Unit

Smallest safe next unit:
- MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-CONTRACT-HARDENING-DESIGN-001

Scope recommendation for that next unit:
- Lock runtime acceptance list for crossSystemCorrelationId, idempotencyKey, crmVerificationId, partyType, supplierProfileSection, buyerProfileSection.
- Publish canonical unknown-field behavior (strict reject vs strip-ignore) as explicit contract.
- Preserve current orchestrationReference compatibility and conflict semantics unless explicitly superseded by approved contract update.
