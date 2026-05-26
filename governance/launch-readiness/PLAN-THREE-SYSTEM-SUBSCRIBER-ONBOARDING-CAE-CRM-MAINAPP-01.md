# PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01

Status: DESIGN_ONLY
Type: Cross-repo architecture and lifecycle plan
Mode lock: No implementation, no runtime behavior change, no schema change, no provisioning execution
Date: 2026-05-26
Owner: TexQtic governance design

## 1. Executive Summary

Recommended architecture in plain language:
- CAE captures field acquisition and onboarding intent.
- CRM verifies, approves, or holds the case and sends the verified provisioning request.
- Main App provisions runtime identity and tenancy objects, issues access artifacts, and remains the runtime system of authority.

One-line system-of-record rule:
- CAE is system-of-record for acquisition capture context.
- CRM is system-of-record for verification and approval governance.
- Main App is system-of-record for runtime identity, tenancy, membership, and activation truth.

## 2. Current Repo Evidence

| Repo | Evidence found | File/location | Implication | Confidence |
|---|---|---|---|---|
| Main App | Approved-onboarding provisioning endpoint with service-token path | server/src/routes/admin/tenantProvision.ts | CRM can call Main App provisioning through bounded service credential path | High |
| Main App | Provisioning creates tenant plus organization and invite artifact in one transaction | server/src/services/tenantProvision.service.ts | Runtime tenancy and invite preparation are Main App-owned and atomic | High |
| Main App | Provisioning status query endpoint exists | server/src/routes/admin/tenantProvision.ts; server/src/services/tenantProvision.service.ts | CRM evidence polling is available without schema changes | High |
| Main App | Invite link generation uses accept-invite token action flow | server/src/services/email/email.service.ts; governance/units/SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001.md | Login/access link ownership is already Main App-oriented | High |
| Main App | CRM handoff docs define token handling and evidence mapping | docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md; docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md | Field mapping and post-provision evidence patterns are partially documented | High |
| Main App | Internal acquisition provisioning route exists with HMAC replay controls for supplier profile projection path | server/src/routes/internal/acquisitionProvisioning.ts | Existing internal integration patterns can inform CAE/CRM service-security model | Medium |
| Main App | Buyer bridge blocked; CRM live provisioning smoke unauthorized guardrails | governance/launch-readiness/FUTURE-TODO-REGISTER.md | This plan must not imply activation or production smoke | High |
| CRM | Repo not in active workspace (cannot read repo truth safely in this unit) | Workspace scope limitation | CRM-local plan is draft appendix only in this artifact | Medium |
| CAE | Repo not in active workspace (cannot read repo truth safely in this unit) | Workspace scope limitation | CAE-local plan is draft appendix only in this artifact | Medium |

## 3. System-of-Record Boundaries

| Domain | CAE owns | CRM owns | Main App owns | Notes |
|---|---|---|---|---|
| acquisition capture | Field capture intake, referral/acquisition context, agent assistance context | Intake consumption quality gates | None | CAE capture is pre-runtime |
| verification | None | Verification workflow, checks, reviewer decisions | None | CRM authority before provisioning request |
| approval/rejection/hold | None | Canonical decision state for onboarding case | None | Main App consumes approved requests only |
| platform identity | None | External references only | Tenant, organization, user, membership runtime identifiers | Main App authority boundary |
| tenant/org/workspace | None | Display-only references after provisioning | Creation and lifecycle state | No duplication in CRM or CAE |
| membership/roles | None | Display-only evidence | Membership creation and role assignment | Role truth remains Main App |
| login/access link | Display evidence only | Display/ops evidence only | Invite token and access URL generation | Default owner: Main App |
| QR code | Display evidence only | Display/ops evidence only | Issuance authority (recommended) | No confirmed runtime issuer in current evidence; design decision pending |
| activation state | Assistance visibility only | Governance visibility and milestone tracking | Canonical activation truth | CRM reflects, CAE assists |
| first-login evidence | Display-only evidence | Store/display redacted activation evidence | Canonical event and status derivation | No secret replication |
| catalogue readiness | Assistance coaching | Operational readiness governance | Runtime catalogue state source | Separate from provisioning acceptance |
| inquiry readiness | Assistance coaching | Operational readiness governance | Runtime inquiry readiness source | Must not mix with FTR-B2C-005 execution |
| Field Agent assistance | Full ownership | Visibility and escalation | Runtime status read only | CAE post-activation assist loop |
| customer/account ops visibility | Display evidence for field workflows | Customer account timeline and case operations | Runtime truth export only | CRM and CAE do not mutate runtime truth directly |

## 4. End-to-End Lifecycle

Canonical lifecycle states for cross-system alignment:
1. CAE_CAPTURED
2. CAE_SUBMITTED_TO_CRM
3. CRM_RECEIVED
4. CRM_UNDER_VERIFICATION
5. CRM_APPROVED
6. CRM_REJECTED
7. CRM_HOLD
8. MAINAPP_PROVISIONING_REQUESTED
9. MAINAPP_PROVISIONING_ACCEPTED
10. MAINAPP_PROVISIONED
11. ACCESS_LINK_ISSUED
12. QR_ISSUED
13. SUBSCRIBER_ACTIVATED
14. FIRST_LOGIN_COMPLETE
15. FIELD_AGENT_ASSISTANCE_REQUIRED
16. FIELD_AGENT_ASSISTANCE_COMPLETE
17. CATALOGUE_READINESS_PENDING
18. CATALOGUE_READINESS_COMPLETE
19. INQUIRY_READINESS_PENDING
20. INQUIRY_READINESS_COMPLETE

State ownership notes:
- CAE owns states 1 to 2.
- CRM owns states 3 to 7.
- Main App owns states 8 to 14.
- CAE and CRM track 15 to 20 as assistance and operations overlays while Main App remains runtime authority for canonical activation and readiness facts.

## 5. Proposed Contract Model

### 5.1 CAE to CRM acquisition package shape

Purpose: pre-runtime acquisition transfer for verification.

| Field | Classification |
|---|---|
| crossSystemCorrelationId | required, system-owned by CAE at capture time |
| idempotencyKey | required, system-owned by CAE submission attempt |
| caeAcquisitionId | required, system-owned by CAE |
| acquisitionType | required |
| partyType (buyer or supplier) | required |
| legalName or individualName | required |
| primaryContact | required |
| jurisdiction | required |
| capturedByFieldAgentRef | optional |
| capturedAt | required |
| acquisitionEvidenceBundleRef | optional |
| crmVerificationHints | optional |
| runtimeIds (tenant/org/user/member) | forbidden |
| raw secrets or platform service credentials | forbidden |

### 5.2 CRM to Main App verified provisioning request shape

Purpose: approved onboarding handoff to runtime authority.

Envelope recommendation: one canonical envelope with role-specific sections.

| Field | Classification |
|---|---|
| crossSystemCorrelationId | required |
| idempotencyKey | required |
| crmVerificationId | required, system-owned by CRM |
| orchestrationReference | required, system-owned by CRM |
| provisioningMode | required, value APPROVED_ONBOARDING |
| partyType (buyer or supplier) | required |
| organization.legalName | required |
| organization.displayName | optional |
| organization.jurisdiction | required |
| organization.registrationNumber | optional |
| firstOwner.email | required |
| identity.base_family | required |
| identity.commercial_plan | required or defaulted |
| identity.white_label_capability | optional |
| supplierProfileSection | optional, required when partyType is supplier |
| buyerProfileSection | optional, required when partyType is buyer |
| mainAppTenantId/mainAppOrgId/mainAppUserId/mainAppMemberId | forbidden in request |

### 5.3 Main App to CRM provisioning result shape

Purpose: deterministic response and post-provision visibility.

| Field | Classification |
|---|---|
| crossSystemCorrelationId | required echo |
| orchestrationReference | required echo |
| provisioningAccepted | required |
| mainAppTenantId | derived, system-owned by Main App |
| mainAppOrgId | derived, system-owned by Main App |
| slug | derived |
| firstOwnerAccessPreparation.inviteId | derived |
| firstOwnerAccessPreparation.expiresAt | derived |
| firstOwnerAccessPreparation.inviteToken | derived, secret, one-time handling |
| provisioningStatus | derived |
| conflictCode or rejectionCode | optional, derived |

### 5.4 Main App to CAE activation or assistance evidence shape

Purpose: post-provision assistance visibility without runtime authority duplication.

| Field | Classification |
|---|---|
| crossSystemCorrelationId | required |
| orchestrationReference | required |
| mainAppOrgId | required, derived |
| activation.isActivated | required, derived |
| activation.activatedAt | optional, derived |
| firstLoginCompletedAt | optional, derived |
| assistanceFlags | optional, derived or CRM-provided |
| inviteToken/raw login artifact | forbidden |
| mutable runtime role or org status override | forbidden |

## 6. Canonical Identifier Strategy

| Identifier | Ownership | Known pre-provision? | Returned post-provision? |
|---|---|---|---|
| crossSystemCorrelationId | Created at CAE capture; propagated by CRM and Main App | Yes | Yes |
| idempotencyKey | Sender-owned per integration hop | Yes | Echo recommended |
| caeAcquisitionId | CAE | Yes | Echo optional |
| crmVerificationId | CRM | Yes | Echo optional |
| mainAppTenantId | Main App | No | Yes |
| mainAppOrgId | Main App | No | Yes |
| mainAppUserId | Main App | No | Not at provisioning 201 for approved onboarding; available after activation evidence |
| mainAppMemberId | Main App | No | Not at provisioning 201 for approved onboarding; available after activation evidence |
| subscriberExternalRef | CRM or CAE external business reference | Yes | Echo optional |

ID rules:
- crossSystemCorrelationId is mandatory in all contracts.
- orchestrationReference remains the CRM-to-Main-App join key.
- Runtime UUIDs are Main App issued and never pre-allocated by CRM or CAE.

## 7. Buyer vs Supplier Differences

| Field or lifecycle or permission | Buyer | Supplier | Common? | Notes |
|---|---|---|---|---|
| partyType | buyer | supplier | No | Required discriminator |
| base_family default | B2C (proposed) | B2B (existing evidence) | No | Buyer default requires Main App confirmation |
| supplier profile publication posture | not applicable | may require B2B public posture workflow | No | Keep separate from runtime provisioning |
| catalogue readiness | optional depending on buyer journey | commonly required for supplier launch posture | Partial | Readiness overlays remain outside provisioning transaction |
| inquiry readiness | buyer-facing consumption readiness | supplier-facing response readiness | Partial | Do not conflate with FTR-B2C-005 execution |
| first owner invite | required if buyer account represents org owner | required in current supplier flow | Yes | Same invite purpose pattern recommended |
| role assignment | buyer_owner style role mapping pending design | OWNER role evidenced in current flow | Partial | Buyer role map is open decision |
| activation evidence | needed | needed | Yes | Same status query pattern |

## 8. Login Link and QR Flow

Ownership answers:
- Who generates login or access links: Main App.
- Who sends subscriber-facing access material: Main App direct send or secure CRM operational relay using one-time artifact.
- Who stores evidence: CRM stores redacted evidence and milestone timestamps; CAE stores display-safe assistance evidence.
- Who can display evidence: CRM and CAE may display redacted status only.
- Expiration or rotation assumptions: invite/access artifacts are short-lived and rotatable; no long-term token persistence.
- Security constraints: no cleartext token persistence in CRM or CAE; no browser-exposed service secrets; one-time handling for secret artifacts.

QR ownership:
- Recommended default: Main App issues any onboarding QR/access QR artifact.
- Repo truth status: no confirmed canonical onboarding QR issuer found in this workspace evidence.
- Decision required: QR format, expiry, and relay channel.

## 9. Post-Activation Support Loop

CAE Field Agent role after activation:
- Monitor activation evidence visibility and supplier or buyer assistance tasks.
- Assist with first-login completion, profile completion, catalogue readiness coaching, and inquiry-readiness onboarding.
- Escalate blockers to CRM operations.
- Do not directly mutate Main App runtime entities unless explicitly authorized by a separate bounded unit.

Guidance path:
- User receives Main App-generated access path.
- CAE provides assisted navigation and readiness checklists.
- CRM monitors milestones and exceptions.

## 10. Security and Trust Model

Required controls:
- Service-to-service authentication:
  - CAE to CRM: signed service request model with replay window.
  - CRM to Main App: dedicated bearer hash pattern already evidenced for approved onboarding.
  - Main App to CRM callback/evidence: signed callback or polling endpoint with least privilege.
  - Main App to CAE evidence visibility: signed read model via CRM relay or dedicated bounded endpoint.
- No browser-exposed service secrets.
- Idempotency and replay prevention on all hop boundaries.
- Audit logging for provisioning request, acceptance, activation milestones, and failure paths.
- Least-privilege access and bounded scopes.
- PII minimization and redaction in non-runtime systems.

## 11. Failure Modes

| Failure mode | Owner | Handling model |
|---|---|---|
| CRM rejects package | CRM | Set CRM_REJECTED with reason and remediation path |
| CRM hold state | CRM | Set CRM_HOLD with required evidence checklist |
| Main App rejects provisioning request | Main App | Return deterministic rejection code and validation details safe for CRM |
| Duplicate request | Main App and CRM | Idempotency key plus orchestrationReference conflict code |
| Partial provisioning | Main App | Atomic transaction rollback and explicit failure response |
| Login link issue failure | Main App | Re-issue bounded artifact and record evidence event |
| QR issue failure | Main App | Re-issue bounded artifact and record evidence event |
| Notification failure | Main App and CRM | Record send failure evidence and retry policy |
| CAE or CRM callback failure | CRM and CAE | Retry with idempotency key and reconciliation polling fallback |

## 12. Repo-Local Plan Index

- Main App-local plan path:
  - governance/launch-readiness/PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md
- CRM-local plan path:
  - TO_BE_CREATED_IN_CRM_REPO as PLAN-CRM-VERIFICATION-APPROVAL-HANDOFF-IN-THREE-SYSTEM-ONBOARDING-01.md
  - Draft included in Appendix A.
- CAE-local plan path:
  - TO_BE_CREATED_IN_CAE_REPO as PLAN-CAE-ACQUISITION-FIELD-AGENT-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md
  - Draft included in Appendix B.

## 13. Future Cross-Repo Verification Rules

1. Any future change to provisioning payload fields must be verified against all three repo-local plans.
2. Any lifecycle state addition, removal, or rename must be verified against all three repo-local plans.
3. Any identifier or idempotency strategy change must be verified against all three repo-local plans.
4. Any login link or QR issuance ownership change must be verified against Main App, CRM, and CAE plans.
5. Any CRM evidence storage or display change must be verified against Main App result contract and CAE assistance visibility.
6. Any CAE Field Agent workflow change that touches activation or provisioning state must be verified against CRM and Main App ownership boundaries.
7. No repo may unilaterally mutate cross-system contract fields without a cross-repo design update.
8. If a future issue in one repo could affect another repo contract, lifecycle, evidence, security, or authority boundary, open a cross-repo verification unit before implementing the fix.

## 14. Implementation Sequence Under TECS

- Phase 0: design review and Paresh decision lock.
- Phase 1: Main App canonical provisioning contract design.
- Phase 2: CRM verified provisioning sender design.
- Phase 3: CAE acquisition package design.
- Phase 4: evidence and callback model.
- Phase 5: tests and sandbox verification.
- Phase 6: controlled production smoke only if explicitly authorized.

## 15. Non-Goals and Scope Locks

- No buyer bridge activation.
- No CRM live provisioning smoke.
- No runtime data duplication.
- No DB schema changes in this design unit.
- No production provisioning requests.
- No public-polish work.
- No legal PRIT-034 implementation.
- No auth or session implementation.

## 16. Open Questions

1. Should buyer and supplier provisioning share one contract envelope with role-specific sections, or split endpoint contracts?
2. What is the canonical buyer first-owner role naming in Main App runtime?
3. Should Main App send access artifacts directly, or should CRM relay one-time links under strict controls?
4. What is the QR issuance format and expiry policy for onboarding and post-activation?
5. Should Main App support push callbacks to CRM, or keep polling as canonical in the next bounded phase?
6. How should CAE receive activation evidence: direct Main App feed or CRM-mediated feed?
7. Which readiness milestones are mandatory before CAE marks assistance complete?
8. Which conflict codes are mandatory for idempotent retry decisions in CRM sender logic?

## 17. Recommendation

Recommendation: NEEDS_PARESH_DECISION

Rationale:
- Main App provisioning and activation evidence foundations are strong.
- CRM and CAE repo-local truth could not be inspected in this workspace, so their plans are draft appendices.
- Buyer-specific runtime provisioning differences and QR ownership details require explicit decision lock.

---

## Appendix A — TO_BE_CREATED_IN_CRM_REPO

Target artifact name:
- PLAN-CRM-VERIFICATION-APPROVAL-HANDOFF-IN-THREE-SYSTEM-ONBOARDING-01.md

Draft CRM-local plan content:

### A1. CRM role summary
- CRM owns verification, approval, reject, and hold decisions before Main App provisioning request.

### A2. CRM-owned verification and approval domains
- Case verification checklist, reviewer assignment, legal and operational approval posture, hold/reject rationale.

### A3. CRM input from CAE
- Receive CAE acquisition package with correlation and idempotency data.

### A4. CRM output to Main App
- Send verified provisioning request in canonical approved-onboarding envelope.

### A5. CRM evidence received from Main App
- Provisioning acceptance, runtime org identifiers, invite and activation evidence, first-login milestone evidence.

### A6. What CRM may store vs display only
- Store: correlation IDs, verification IDs, runtime IDs, status milestones, redacted evidence.
- Display only: one-time secrets, raw token content, sensitive runtime internals.

### A7. What CRM must not own or mutate
- Tenant or org runtime authority, role mutation in Main App, direct override of Main App activation state.

### A8. Lifecycle states CRM owns
- CRM_RECEIVED, CRM_UNDER_VERIFICATION, CRM_APPROVED, CRM_REJECTED, CRM_HOLD.

### A9. Idempotency and correlation requirements
- Must include crossSystemCorrelationId and idempotencyKey on all outbound requests.

### A10. Service authentication requirements
- Service credential isolation for CRM sender, replay-safe request handling, least privilege.

### A11. Tests required before implementation
- Contract schema validation tests, deterministic conflict handling tests, retry-idempotency tests, evidence mapping tests.

### A12. Future cross-repo verification instructions
- Verify any CRM sender, approval, or evidence change against Main App master contract and CAE-local plan.
- Verify any new CRM status against shared lifecycle.
- Require cross-repo design update before implementation if Main App provisioning contract is affected.

### A13. Implementation sequence for CRM only
- Sender contract lock.
- Verification gate mapping.
- Error and retry policy.
- Evidence ingestion and timeline display.
- Sandbox contract tests.

### A14. Non-goals
- No runtime object creation authority in CRM.
- No direct mutation of Main App roles or activation state.

---

## Appendix B — TO_BE_CREATED_IN_CAE_REPO

Target artifact name:
- PLAN-CAE-ACQUISITION-FIELD-AGENT-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md

Draft CAE-local plan content:

### B1. CAE role summary
- CAE owns acquisition capture and Field Agent assistance context before and after activation.

### B2. CAE-owned acquisition and capture domains
- Field intake forms, acquisition context, assistance flags, capture quality checks.

### B3. CAE output to CRM
- Send acquisition package with correlation and idempotency envelope.

### B4. CAE evidence received from CRM/Main App
- Receive redacted provisioning and activation milestones for assistance workflow visibility.

### B5. Field Agent post-activation assistance loop
- Guide first login completion, profile completion, catalogue and inquiry readiness assistance.

### B6. What CAE may store vs display only
- Store: CAE capture data and assistance workflow status.
- Display only: Main App runtime evidence snapshots and redacted activation milestones.

### B7. What CAE must not own or mutate
- Main App runtime identity, tenant, org, role, or activation state mutations.

### B8. Lifecycle states CAE owns
- CAE_CAPTURED, CAE_SUBMITTED_TO_CRM, FIELD_AGENT_ASSISTANCE_REQUIRED, FIELD_AGENT_ASSISTANCE_COMPLETE.

### B9. Idempotency and correlation requirements
- Must send crossSystemCorrelationId and idempotencyKey to CRM.

### B10. Service authentication requirements
- Signed service submission to CRM, replay-safe window, least-privilege integration identity.

### B11. Tests required before implementation
- Acquisition envelope schema tests, idempotent submission tests, evidence display-safe redaction tests, assistance-state transition tests.

### B12. Future cross-repo verification instructions
- Verify any CAE capture or payload change against CRM-local plan and Main App master contract.
- Verify any Field Agent assistance workflow touching activation state against CRM and Main App ownership.
- Require cross-repo design update before implementation if CRM or Main App contract is affected.

### B13. Implementation sequence for CAE only
- Capture contract lock.
- Submission payload validation.
- Assistance visibility integration.
- Sandbox verification with CRM and Main App contract stubs.

### B14. Non-goals
- No direct provisioning call into Main App in this plan stage.
- No runtime authority duplication from Main App into CAE.
