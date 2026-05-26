# MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-CONTRACT-HARDENING-DESIGN-001

## 1. Status Header

- Status: DESIGN_ONLY
- Scope: Main App approved-onboarding contract hardening
- Mode lock: no runtime implementation, no runtime behavior changes, no schema changes, no DB changes, no migrations, no Prisma changes, no RLS changes, no production smoke, no provisioning execution, no CRM runtime changes, no CAE runtime changes, no invite/send behavior changes, no access-artifact behavior changes
- Repo: TexQtic Main App
- Branch at design time: main
- HEAD at design time: f78559e
- Baseline audit: `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001`

## 2. Source Authority References

Main App authority sources reviewed for this design:

- `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md`
- `server/src/routes/admin/tenantProvision.ts`
- `server/src/services/tenantProvision.service.ts`
- `server/src/types/tenantProvision.types.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`
- `server/src/services/tenantProvision.service.test.ts`
- `server/src/routes/tenant.ts`
- `shared/contracts/openapi.control-plane.json`
- `server/src/utils/response.ts`
- `server/prisma/schema.prisma`
- `governance/launch-readiness/PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md`
- `governance/launch-readiness/PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md`
- `governance/launch-readiness/CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md`
- `docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md`
- `docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md`
- `docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md`

External input considered as non-authoritative for Main App runtime contract:

- `CRM-APPROVED-ONBOARDING-ENVELOPE-SYNC-DESIGN-001`
- `GOV-CROSSREPO-APPROVED-ONBOARDING-ENVELOPE-DECISION-001`
- `GOV-CRM-THREE-SYSTEM-ONBOARDING-CONTRACT-CORRECTION-001`
- `GOV-CRM-WORKSPACE-BOUNDARY-NORMALIZATION-002`

## 3. Evidence Audit Baseline

Baseline conclusion inherited from the committed Main App evidence audit:

- `orchestrationReference` is runtime-proven as accepted, persisted, unique-constrained, and used for status lookup and duplicate recovery.
- The approved-onboarding runtime seam already accepts a bounded request shape including `approvedOnboardingMetadata`.
- The runtime seam does not currently authorize the broader fields as top-level contract fields:
  - `crossSystemCorrelationId`
  - `idempotencyKey`
  - `crmVerificationId`
  - `partyType`
  - `supplierProfileSection`
  - `buyerProfileSection`
- Main App owns tenant/org runtime creation, user/member creation after invite acceptance, role assignment, activation truth, and access-artifact issuance.
- Final gate from the evidence audit is `MAINAPP_CONTRACT_UPDATE_REQUIRED`.

## 4. Current Runtime Contract To Preserve

The current approved-onboarding runtime contract must remain unchanged unless a separate implementation unit is explicitly opened and approved.

Preserved request contract:

- `provisioningMode = APPROVED_ONBOARDING`
- `orchestrationReference`
- `organization.legalName`
- `organization.displayName` optional
- `organization.jurisdiction`
- `organization.registrationNumber` optional
- `firstOwner.email`
- accepted identity carriers:
  - `base_family` or `tenant_category`
  - `aggregator_capability`
  - `white_label_capability`
  - `is_white_label`
  - `commercial_plan` or `plan`
  - `primary_segment_key`
  - `secondary_segment_keys`
  - `role_position_keys`
- `approvedOnboardingMetadata` optional object

Preserved runtime authority:

- Main App owns tenant/org runtime creation.
- Main App owns user/member runtime creation after invite acceptance.
- Main App owns role assignment authority.
- Main App owns activation truth.
- Main App owns invite/access artifact issuance.
- CRM may orchestrate, relay one-time operational artifacts, and observe evidence only.

## 5. Contract Hardening Strategy

Primary strategy: `HARDEN_CURRENT_ORCHESTRATION_REFERENCE_CONTRACT_ONLY`

| Area | Decision | Reason | Implementation implication |
|---|---|---|---|
| Main join key | `orchestrationReference` remains canonical accepted CRM join key | This is the only runtime-proven provisioning seam anchor and is already tied to dedupe and recovery behavior | Future implementation must preserve backward compatibility and must not replace it silently |
| Broader top-level envelope | Do not authorize as runtime contract yet | Repo truth does not support these fields as top-level accepted runtime fields | Any future support requires explicit route/type/test/service update unit |
| Unknown field policy | `ALLOW_ONLY_APPROVED_METADATA_CONTAINER` | Current runtime behavior strips unknown top-level fields; the only bounded extension surface already present is `approvedOnboardingMetadata` | Future implementation should make that posture explicit and test it |
| Party/profile expansion | Gate behind buyer/supplier role matrix | `partyType`, `supplierProfileSection`, and `buyerProfileSection` would otherwise duplicate or conflict with existing family/taxonomy fields | No runtime addition until matrix unit resolves role/family mapping |
| Acquisition-originated fields | Gate behind CAE input contract | `crossSystemCorrelationId` and sender-hop idempotency semantics originate outside current Main App runtime authority | No runtime addition until CAE-to-CRM-to-Main-App contract is locked |
| Current seam safety | Preserve current runtime behavior and conflict semantics | Avoid integration drift while documenting a narrower, explicit contract | Hardening implementation should be limited to explicit validation/documentation/tests, not behavioral expansion |

## 6. Unknown / Extra Field Policy

Chosen posture: `ALLOW_ONLY_APPROVED_METADATA_CONTAINER`

Current runtime behavior:

- The approved-onboarding body is parsed with a Zod object schema that declares specific top-level fields and an optional `approvedOnboardingMetadata` record.
- There is no explicit `.strict()` contract on the route schema.
- Current parse flow therefore behaves as strip/ignore for undeclared top-level fields rather than authorizing them as runtime contract members.
- This behavior is not explicitly asserted by a provisioning-specific unknown-field integration test.

Recommended contract posture:

- Main App should document that undeclared top-level envelope fields are non-contract and must not be relied on.
- Main App should reserve extension flexibility to the existing `approvedOnboardingMetadata` container only.
- `approvedOnboardingMetadata` must remain bounded as observational or relay metadata until a later runtime unit explicitly defines consumption, persistence, or echo semantics.

Required test gap before implementation:

- Add explicit tests for unknown top-level field handling.
- Add explicit tests confirming the only tolerated extension surface is `approvedOnboardingMetadata`.
- Add explicit tests preventing accidental promotion of design-only fields into accepted runtime contract.

## 7. Field-by-Field Future Contract Decision

| Field | Decision | Main App posture | CRM guidance | Needs implementation? | Needs separate decision? |
|---|---|---|---|---|---|
| `orchestrationReference` | `REMAINS_CANONICAL` | Remains canonical accepted join key, unique/dedupe anchor, recovery lookup, and compatibility bridge | Continue sending and storing it; do not replace it with any new correlation field | No behavior change needed for design; only future hardening tests/docs | No |
| `crossSystemCorrelationId` | `REQUIRES_MAINAPP_RUNTIME_CONTRACT_UPDATE` | Not authorized as top-level runtime field now; if ever adopted, it must not replace `orchestrationReference` and should first be treated as bounded metadata | Keep design-only for now; do not send as required top-level runtime field; if future carriage is needed, propose it inside `approvedOnboardingMetadata` only after Main App tests exist | Yes | Yes: CAE input contract |
| `idempotencyKey` | `ORCHESTRATION_REFERENCE_REMAINS_IDEMPOTENCY_ANCHOR` | Separate idempotency field is not authorized on this seam; current duplicate semantics are already deterministic through `orchestrationReference` and conflict codes | Do not add a separate idempotency field to Main App provisioning yet; continue using `orchestrationReference` for retry/recovery logic | Only if Main App later chooses transport-hop idempotency | Yes: deterministic rule design |
| `crmVerificationId` | `CRM_LOCAL_ONLY` | Main App should not consume it as a runtime contract field now; it is traceability metadata, not runtime authority | Keep it in CRM evidence/docs; do not depend on Main App consuming it; future metadata carriage requires explicit contract update | Not now | No for current seam; yes if future echo/persistence desired |
| `partyType` | `NOT_AUTHORIZED_UNTIL_BUYER_SUPPLIER_MATRIX` | Current `base_family` / `tenant_category` already drive runtime family classification; `partyType` would otherwise duplicate or conflict with existing taxonomy | Keep design-only; do not send as runtime field until buyer/supplier matrix locks mapping and conflict rules | Yes | Yes: buyer/supplier role matrix |
| `supplierProfileSection` | `MAINAPP_PROFILE_CONTRACT_REQUIRED` | Not authorized for provisioning runtime; profile sections are outside current provisioning contract and would require dedicated profile contract semantics | Keep design-only; do not send as runtime field | Yes | Yes: buyer/supplier role matrix plus profile contract |
| `buyerProfileSection` | `MAINAPP_PROFILE_CONTRACT_REQUIRED` | Not authorized for provisioning runtime; buyer section would need a distinct Main App profile contract and role/family mapping | Keep design-only; do not send as runtime field | Yes | Yes: buyer/supplier role matrix plus profile contract |

Additional field notes:

- `crossSystemCorrelationId` must never wrap or replace `orchestrationReference` by implication. If it is ever added, it must be additive and explicitly scoped.
- `idempotencyKey` should not be introduced unless the team first defines who generates it, whether it is hop-specific or end-to-end, how it interacts with existing 409 conflict codes, and whether replay returns original results or only conflict evidence.
- `crmVerificationId` should remain outside Main App runtime authority unless a later unit explicitly justifies audit echo or metadata persistence.

## 8. Boundary Preservation Rules

This design explicitly preserves the following boundaries:

- `orchestrationReference` remains canonical until explicitly superseded by a later approved decision.
- Main App remains issuer of invite and access artifacts.
- Main App owns tenant/org/user/member runtime truth.
- Main App owns activation truth.
- CRM remains orchestration, relay, and evidence consumer only.
- CRM must not persist long-lived raw invite or access tokens.
- CRM must not mutate Main App runtime objects.
- CRM must not mutate Main App roles.
- CRM must not override Main App activation truth.
- `CRM-ACQ-12` remains paused as the primary subscriber-onboarding seam unless separately reclassified.
- No sender, provisioning, or access-artifact expansion is authorized by this design.

## 9. Buyer / Supplier Role-Matrix Dependency

Classification: REQUIRED BEFORE ANY `partyType` OR PROFILE-SECTION RUNTIME WORK

Reason:

- Current runtime taxonomy already accepts `base_family`, `tenant_category`, `primary_segment_key`, `secondary_segment_keys`, and `role_position_keys`.
- The design plans introduce `partyType` as buyer/supplier plus role-specific profile sections, but runtime does not yet define how those concepts map to existing family and role structures.
- Without a matrix, `partyType` could duplicate, contradict, or partially override current identity carriers.

Minimum buyer/supplier matrix questions that must be answered before implementation:

- Whether buyer is a new runtime family, a derived posture, or a separate onboarding flavor.
- Whether supplier maps strictly to existing B2B family plus current role/taxonomy fields.
- Whether buyer/supplier is mutually exclusive, additive, or lifecycle-dependent.
- Whether buyer/supplier changes role assignment or only provisioning metadata.
- Whether profile sections belong in provisioning at all, or in later post-provision profile flows.

## 10. CAE Input Dependency

Classification: REQUIRED BEFORE ANY ACQUISITION-ORIGINATED FIELD IS ACCEPTED

Fields affected:

- `crossSystemCorrelationId`
- `idempotencyKey`
- any future acquisition-originated evidence bundle or capture provenance fields

Reason:

- The three-system planning docs classify these fields as upstream or hop-owned values, not Main App runtime identifiers.
- Main App currently has no runtime contract semantics for generating, persisting, echoing, or validating them on the approved-onboarding seam.
- Accepting them prematurely would create hidden contract coupling between CAE, CRM, and Main App without a locked sender/echo/ownership model.

Required CAE questions before implementation:

- Who creates the value.
- Whether the value is end-to-end or hop-local.
- Whether Main App must persist, echo, or merely tolerate the field.
- Whether retry semantics are transport-level, business-level, or both.
- Whether the field belongs in a top-level contract or only bounded metadata.

## 11. Main App Implementation Readiness

Readiness classification: `MAINAPP_READY_FOR_CONTRACT_IMPLEMENTATION`

Scope of what is ready:

- Main App is ready for a bounded implementation that hardens the current approved-onboarding contract only.
- That implementation may document and test explicit unknown-field posture, preserve `orchestrationReference` as canonical, and explicitly keep broader fields out of the runtime seam.

Scope of what is not ready:

- Main App is not ready to implement `partyType`, `supplierProfileSection`, or `buyerProfileSection`.
- Main App is not ready to implement `crossSystemCorrelationId` or `idempotencyKey` as runtime contract fields.
- Main App is not ready to authorize broader sender or access-artifact expansion.

## 12. CRM Guidance

After this design, CRM may:

- Continue using the current approved-onboarding contract exactly as implemented.
- Continue using `orchestrationReference` as the provisioning-time join, dedupe, and recovery anchor.
- Continue storing `orgId` as the long-term Main App servicing reference after provisioning succeeds.
- Update CRM-side docs to reflect that the broader envelope remains design-only.
- Re-audit against Main App only after a bounded Main App contract-hardening implementation is completed.

After this design, CRM may not:

- Implement the expanded top-level envelope against Main App runtime.
- Treat `crossSystemCorrelationId`, `idempotencyKey`, `crmVerificationId`, `partyType`, `supplierProfileSection`, or `buyerProfileSection` as authorized Main App runtime fields.
- Replace `orchestrationReference` with any new correlation field.
- Assume buyer/supplier role mapping has been decided.
- Assume CAE-originated fields are accepted by Main App.
- Treat `approvedOnboardingMetadata` as a guaranteed persisted or consumed runtime channel.

## 13. Recommended Next Unit

Chosen next unit: `IMPL-MAINAPP-APPROVED-ONBOARDING-CONTRACT-HARDENING-001`

Recommended scope for that next unit:

- Make unknown top-level field posture explicit.
- Preserve `approvedOnboardingMetadata` as the only bounded extension container.
- Add tests confirming `orchestrationReference` remains canonical and backward-compatible.
- Add tests confirming broader design-only fields are not silently promoted into runtime contract.
- Do not add new fields, DB columns, schema changes, or provisioning behavior.

Out of scope for that next unit:

- Any buyer/supplier matrix decision.
- Any CAE input contract adoption.
- Any sender, invite, access-artifact, or provisioning behavior expansion.