# MAIN-PLATFORM-ACQUISITION-WEBHOOK-007-HANDOFF-AND-TRACKER-SYNC-v1

Unit ID: MAIN-PLATFORM-ACQUISITION-WEBHOOK-HANDOFF-AND-TRACKER-SYNC-001
Status: DOCS_ONLY_COMPLETE
Date: 2026-05-16
Mode: Docs-only verification, tracker sync, and CRM handoff artifact

## 1) Purpose

This artifact is a docs-only handoff and tracker-sync unit executed after WEBHOOK-007 implementation commit 6de5002.

It verifies current repository truth for the acquisition provisioning webhook and records Main Platform to CRM handoff details for CRM-ACQ-10.

This artifact does not authorize any new runtime implementation, schema change, migration, route/service/frontend/test mutation, event registry mutation, OpenAPI mutation, Layer 0 mutation, or runtime behavior change.

## 2) Source Files Reviewed

Governance and tracker sources:
- governance/decisions/TEXQTIC-WEBHOOK-007-PROVISIONING-AUTH-CONTRACT-DECISION-v1.md
- docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md
- docs/product-truth/MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/BLOCKED.md

Contract and event sources:
- shared/contracts/event-names.md
- server/src/lib/events.ts
- shared/contracts/openapi.control-plane.json

Runtime implementation and tests:
- server/src/routes/internal/acquisitionProvisioning.ts
- server/src/routes/internal/index.ts
- server/src/config/index.ts
- server/src/__tests__/internal-acquisition-provisioning.unit.test.ts
- server/src/__tests__/openapi-acquisition-provisioning.contract.unit.test.ts

Commit evidence reviewed:
- 6de5002 ([TEXQTIC] backend: add acquisition provisioning webhook)

## 3) WEBHOOK-007 Implementation Verification (Repo Truth)

Verified in current repo state:

1. Endpoint path
- POST /api/internal/acquisition/provision-supplier exists.

2. Route registration
- acquisitionProvisioningRoutes is registered in internal route aggregator with /api/internal prefix.

3. HMAC headers
- x-texqtic-provisioning-hmac required.
- x-texqtic-provisioning-ts required.

4. Environment variable
- ACQUISITION_PROVISIONING_WEBHOOK_SECRET required in server config with min length validation.

5. Replay window
- 60000 ms enforced.

6. Strict payload validation
- Zod strict object validation is used.
- eventName and publication_posture_target literals are enforced.

7. Prohibited-field rejection
- Explicit prohibited-field set exists for contact data, field-agent IDs, CAE payload fields, photo URLs, commission/payment data, private notes, buyer data, and order/trade/negotiation/TTP fields.

8. Jurisdiction default
- jurisdiction defaults to IN when absent/null/empty.

9. Idempotency key behavior
- Canonical lookup uses organizations.external_orchestration_ref.
- Same ref + compatible identity returns already_exists (200).
- Same ref + incompatible supplier identity returns 409 conflict.

10. Response cases
- 201 provisioned
- 200 already_exists
- 202 gate_failed
- 400 validation error
- 401 unauthorized
- 409 conflict
- 500 provisioning error

11. OpenAPI coverage
- /api/internal/acquisition/provision-supplier is present in shared/contracts/openapi.control-plane.json.
- Required HMAC headers are documented.
- Request schema and response codes are documented.

12. Tests
- internal-acquisition-provisioning.unit.test.ts covers auth, validation, prohibited fields, jurisdiction behavior, idempotency, conflict, gate_failed behavior, and unauthorized no-event behavior.
- openapi-acquisition-provisioning.contract.unit.test.ts verifies endpoint/header/response contract documentation.

## 4) PROVISIONED-EVENTS-008 Status Decision

Decision: PROVISIONED-EVENTS-008 is FUNCTIONALLY_SATISFIED_BY_WEBHOOK_007.

Basis:
1. Event names are registered in shared/contracts/event-names.md:
- public_supplier_profile.provision_requested.v1
- public_supplier_profile.provisioned.v1
- public_supplier_profile.gate_failed.v1

2. Action-to-event mappings exist in server/src/lib/events.ts:
- internal.public_supplier_profile.provision_requested -> public_supplier_profile.provision_requested.v1
- internal.public_supplier_profile.provisioned -> public_supplier_profile.provisioned.v1
- internal.public_supplier_profile.gate_failed -> public_supplier_profile.gate_failed.v1

3. WEBHOOK-007 writes audit actions for requested/provisioned/gate_failed.

4. writeAuditLog triggers maybeEmitEventFromAuditEntry in existing event pipeline.

5. WEBHOOK-007 tests verify expected audit actions for provisioned and gate_failed flows and no audit actions on unauthorized requests.

Tracker handling decision:
- Mark PROVISIONED-EVENTS-008 as FUNCTIONALLY_SATISFIED_BY_WEBHOOK_007.
- Do not open a separate runtime unit unless a concrete event-emission gap is found later.

## 5) Tracker Status Update Summary

Status synchronization record:
- ORF-AUTHORITY-006: CLOSED
- GAP-ACQ-001: CLOSED
- GAP-ACQ-007: CLOSED
- EVENTS-003: CLOSED
- ROUTE-001: CLOSED
- QR-SOURCE-002: CLOSED
- REFERRAL-005: CLOSED
- INQUIRY-004: CLOSED
- WEBHOOK-007: CLOSED
- PROVISIONED-EVENTS-008: FUNCTIONALLY_SATISFIED_BY_WEBHOOK_007

Acquisition tracker v2 residual state:
- From Main Platform webhook perspective, no additional runtime work is required for WEBHOOK-007 or PROVISIONED-EVENTS-008.
- Layer 0 governance hold remains active at control level (HOLD_FOR_COUNSEL_FEEDBACK), so any new implementation packet still requires governance authorization.

## 6) CRM Handoff Summary (for CRM-ACQ-10)

Endpoint:
- POST /api/internal/acquisition/provision-supplier

CRM env:
- MAIN_PLATFORM_PROVISION_CALLBACK_URL

Main Platform env:
- ACQUISITION_PROVISIONING_WEBHOOK_SECRET

CRM secret env:
- MAIN_PLATFORM_PROVISIONING_WEBHOOK_SECRET

Required headers:
- x-texqtic-provisioning-hmac
- x-texqtic-provisioning-ts

Auth model:
- HMAC-SHA256 over canonical payload/timestamp form implemented by Main Platform.
- 60-second replay window.
- 401 on auth failure.

Required payload fields:
- eventName
- eventId
- requestedAt
- external_orchestration_ref
- crmSupplierId
- supplierName
- publication_posture_target

Optional payload fields:
- cluster
- category
- likelyPrimarySegment
- provisionalPlan
- jurisdiction

Jurisdiction rule:
- If jurisdiction is absent/null/empty, Main Platform defaults to IN.

Prohibited payload fields (non-exhaustive categories, enforced):
- phone/email/contact data
- field-agent IDs
- CAE draft payload fields
- photo URLs
- commission/payment fields
- private CRM notes
- buyer data
- order/trade/negotiation/TTP-family fields

## 7) Response Contract and Retry Guidance

Response contract:
- 201: provisioned
- 200: already_exists
- 202: gate_failed
- 400: validation error
- 401: unauthorized
- 409: conflict
- 500: server error

Retry guidance for CRM:
- Retry: network timeout and 5xx (with exponential backoff + jitter).
- Do not blindly retry: 400, 401, 409.
- 202 gate_failed: record and surface to ops/review flow; do not treat as publication success.

## 8) Deployment Checklist Before CRM Production Calls

All items required:
1. Main Platform deployed with WEBHOOK-007 implementation commit lineage including 6de5002.
2. ACQUISITION_PROVISIONING_WEBHOOK_SECRET configured in target Main Platform environment.
3. CRM configured with matching MAIN_PLATFORM_PROVISIONING_WEBHOOK_SECRET.
4. CRM configured with MAIN_PLATFORM_PROVISION_CALLBACK_URL.
5. Main Platform host confirmed for target environment.
6. CRM HMAC signing implementation confirmed against canonical contract.
7. One staging smoke test executed with non-production payload.
8. CRM payload verified to exclude contact and TTP/payment/order/trade fields.

Production-ready note:
- This artifact does not declare production-ready by itself. Production readiness depends on deployment, environment wiring, and successful staging smoke verification.

## 9) Security and Boundary Guardrails

Confirmed guardrails:
1. CRM integration is webhook-only; CRM must not write Main Platform DB tables directly.
2. CAE does not call WEBHOOK-007 directly in this phase.
3. WEBHOOK-007 does not implement TTP/payment/checkout/order/dispute behavior.
4. WEBHOOK-007 rejects prohibited contact/TTP/payment/trade fields.
5. external_orchestration_ref remains internal; it is not returned in public profile responses.
6. Public supplier publication continues through existing five-gate projection safety path.

## 10) Remaining Blockers and Next Cross-Repo Step

Main Platform perspective:
- CRM-ACQ-10 is unblocked from webhook contract/runtime availability perspective, subject to deployment and integration execution conditions.

Still required to complete CRM integration:
- Deployment in target env.
- Secret/env wiring on both sides.
- CRM HMAC implementation alignment.
- Staging smoke test pass and feedback loop.

Recommended next cross-repo action:
1. Hand this artifact to CRM team as Main Platform handoff record.
2. CRM opens/continues CRM-ACQ-10 integration execution.
3. Main Platform waits for CRM staging smoke feedback and only opens new work if a concrete defect is reported.
