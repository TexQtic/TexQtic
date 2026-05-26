# PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01

Status: DESIGN_ONLY
Type: Main App local design and implementation-plan artifact
Date: 2026-05-26

## 1. Purpose and Scope

Main App is the runtime authority in the CAE to CRM to Main App subscriber onboarding chain.
This artifact defines Main App contract ownership, request and response boundaries, lifecycle authority, idempotency expectations, security controls, and implementation-sequencing guidance for future bounded units.

## 2. What Main App Owns

Main App ownership boundaries:
- Runtime tenant creation.
- Runtime organization creation and canonical org status progression.
- First owner invite preparation and access artifact generation.
- Membership and runtime role assignment authority.
- Canonical activation-state derivation.
- Canonical runtime identifiers and status query outputs.

Main App does not own:
- CAE acquisition capture and field intake.
- CRM verification approval lifecycle.

## 3. Runtime Contract Role in Three-System Flow

Inbound from CRM (approved onboarding path):
- Main App accepts verified onboarding requests through the approved provisioning route with service credential support.

Outbound to CRM and CAE evidence flows:
- Main App returns deterministic provisioning acceptance output with runtime identifiers and first owner access preparation metadata.
- Main App exposes provisioning and activation status evidence via bounded query model.
- CRM and CAE consume display-safe evidence only; Main App remains runtime source of truth.

## 4. Main App Endpoint and Service Evidence

Known current evidence in this repo:
- Provisioning request endpoint with approved-onboarding path and service auth boundary.
- Provisioning status query endpoint for orchestration references and lifecycle progress.
- Provisioning transaction service that creates runtime entities and invite artifacts in one flow.
- Internal service-to-service HMAC route pattern for bounded internal provisioning operations.

## 5. Main App Input Contract Expectations

Required inbound envelope expectations:
- crossSystemCorrelationId.
- idempotencyKey.
- crmVerificationId.
- orchestrationReference.
- provisioningMode set to APPROVED_ONBOARDING.
- partyType as buyer or supplier.
- organization identity block.
- firstOwner identity block.

Forbidden inbound data:
- Client-supplied runtime UUIDs for tenant or org or user or membership.
- Any attempt to override runtime activation authority.
- Any long-lived secret artifacts in payload.

## 6. Main App Output Contract Expectations

Provisioning result should include:
- crossSystemCorrelationId and orchestrationReference echoes.
- provisioning acceptance status.
- mainAppTenantId and mainAppOrgId.
- slug and firstOwnerAccessPreparation metadata.
- deterministic rejection or conflict codes when not accepted.

Activation evidence model should include:
- canonical activated or not activated state.
- first-login milestone timestamps when available.
- readiness overlays exposed as status evidence without exposing runtime secrets.

## 7. Main App Idempotency and Determinism Rules

Rules:
- Treat orchestrationReference plus sender context as deterministic dedupe boundary.
- Use idempotency key to protect against duplicate sender retries.
- Return same canonical success envelope for repeat-safe duplicate submissions that map to same successful provisioning.
- Return explicit conflict code for non-equivalent duplicate attempts.

## 8. Main App Security and Trust Requirements

Authentication and authorization:
- Dedicated service bearer for approved onboarding sender.
- Bounded admin JWT path retained for direct admin provisioning operations.
- Replay-safe patterns where applicable.

Secret handling:
- No cleartext secret persistence in external systems.
- One-time invite artifacts treated as sensitive and short-lived.

Auditability:
- Emit audit events for provisioning accepted or rejected outcomes and key lifecycle milestones.

## 9. Main App Lifecycle Authority Mapping

Main App canonical states:
- MAINAPP_PROVISIONING_REQUESTED.
- MAINAPP_PROVISIONING_ACCEPTED.
- MAINAPP_PROVISIONED.
- ACCESS_LINK_ISSUED.
- QR_ISSUED.
- SUBSCRIBER_ACTIVATED.
- FIRST_LOGIN_COMPLETE.
- CATALOGUE_READINESS_PENDING and COMPLETE as runtime evidence overlays.
- INQUIRY_READINESS_PENDING and COMPLETE as runtime evidence overlays.

State notes:
- CRM may display these states as evidence timeline but must not overwrite them.
- CAE may display selected milestones for field-assistance guidance but must not mutate them.

## 10. Buyer and Supplier Runtime Differences

Main App planning assumptions:
- Supplier path has current evidence for approved-onboarding runtime creation and invite preparation.
- Buyer path requires explicit role and family mapping lock before implementation.

Decision requirement:
- Lock buyer role mapping and default base family in a bounded cross-repo design review before implementation.

## 11. Login and QR Ownership in Main App

Ownership recommendation:
- Main App generates login access artifacts.
- Main App is default owner for QR issuance if QR remains part of onboarding flow.

Evidence note:
- Invite-token based first-owner flow is evidenced.
- QR issuer details for onboarding are not conclusively evidenced in this workspace and require explicit design lock.

## 12. Test and Verification Requirements Before Any Implementation

Required tests for future implementation units:
- Approved-onboarding contract validation tests.
- Idempotent duplicate handling tests.
- Deterministic conflict-code response tests.
- Provisioning status query lifecycle progression tests.
- Activation signal and first-login evidence tests.
- Security tests for service credential misuse, replay attempts, and unauthorized paths.

## 13. Integration with CRM and CAE

Cross-system behavior rules:
- CRM sends only verified approved requests.
- Main App returns deterministic provisioning outputs and status evidence.
- CAE consumes display-safe activation and assistance evidence only.
- No cross-system runtime authority duplication.

## 14. Non-Goals for This Unit

- No runtime endpoint implementation changes.
- No Prisma schema or migration changes.
- No auth middleware changes.
- No buyer bridge execution.
- No CRM live provisioning smoke.
- No public-polish scope items.

## 15. Future Cross-Repo Verification Instructions

1. Any Main App request or response contract field change must be verified against CRM and CAE local plans.
2. Any Main App lifecycle state change must be verified against shared lifecycle model in master plan.
3. Any change to login-link or QR ownership must trigger cross-repo design review.
4. Any idempotency key strategy change must be reflected in CRM sender logic and CAE submission assumptions.
5. Any change in activation evidence model must be reviewed for CRM evidence storage and CAE display safety.
6. No unilateral Main App contract mutation without cross-repo design update.

## 16. Sequenced Implementation Guidance for Future Units

- Step 1: Lock contract field list and deterministic error code vocabulary.
- Step 2: Lock buyer and supplier discriminator mapping and role matrix.
- Step 3: Lock status evidence payload for CRM and CAE visibility.
- Step 4: Run sandbox contract tests with CRM sender stubs and CAE evidence-consumer stubs.
- Step 5: Run controlled smoke only after explicit authorization and guardrail clearance.

## 17. Recommendation

Recommendation: READY_FOR_CROSS_REPO_REVIEW

Reason:
- Main App already has strong approved-onboarding primitives for runtime provisioning and status evidence.
- Remaining uncertainty is primarily cross-repo contract lock and buyer-path role mapping decisions, not Main App runtime capability absence.
