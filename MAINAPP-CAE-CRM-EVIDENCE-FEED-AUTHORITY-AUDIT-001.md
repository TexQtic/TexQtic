# MAINAPP-CAE-CRM-EVIDENCE-FEED-AUTHORITY-AUDIT-001

## 1) Status Header
- Status: EVIDENCE_FEED_AUTHORITY_AUDIT_ONLY
- Repo: Main App
- Mode lock: no implementation, no runtime behavior change, no schema/DB change, no CRM/CAE calls, no provisioning/evidence delivery
- Date: 2026-05-26
- Final verdict: MAIN_APP_AUTHORITATIVE_WITH_CRM_MEDIATED_FEED

## 2) CAE Request Summary
- CAE commit: a0ed800
- CAE unit: GOV-CAE-DISPLAY-SAFE-EVIDENCE-SCHEMA-DESIGN-001
- CAE verdict: NEEDS_CROSS_REPO_EVIDENCE_FEED_DECISION
- CAE is not authorized to implement runtime evidence feed/persistence/UI/routes/schema/worker/QR/login/Main App/CRM authority handling yet.

## 3) Main App Evidence State Matrix

| State | Runtime Evidence | Classification | CRM Safe? | CAE Safe? | Notes |
|---|---|---|---|---|---|
| MAINAPP_PROVISIONING_ACCEPTED | Control provisioning route and approved-onboarding seam | READY | Yes (curated) | Yes (curated display) | Main App runtime authority present |
| MAINAPP_PROVISIONED | CRM-safe provisioning status polling and derived status model | READY | Yes (curated) | Yes (curated display) | Main App authoritative source |
| ACCESS_LINK_ISSUED | Invite artifact creation and first-owner access preparation surface | READY | Yes (without secrets) | Partial (display-safe only) | Raw token remains forbidden for CAE |
| QR_ISSUED | Onboarding QR issuer details unresolved in cross-repo governance | DECISION_GATED | N/A | N/A | Onboarding QR authority remains gated |
| SUBSCRIBER_ACTIVATED | Activation route, invite acceptance, membership creation, status transition | READY | Yes (curated) | Yes (curated display) | Activation evidence is authoritative in Main App |
| FIRST_LOGIN_COMPLETE | Login success audit traces exist | PARTIAL | Yes (ops context) | Partial (redacted display only) | Not yet joined to orchestrationReference in one contract-safe feed |
| CATALOGUE_READINESS_PENDING | Catalogue capability/read paths exist but onboarding-readiness contract is incomplete | PARTIAL | Yes (with mediation) | Partial | Explicit onboarding readiness state contract not unified |
| CATALOGUE_READINESS_COMPLETE | Catalogue surfaces exist; unified evidence-state contract is not complete | PARTIAL | Yes (with mediation) | Partial | Requires mediated interpretation and contract hardening |
| INQUIRY_READINESS_PENDING | Public inquiry intake and context-safe audit recording present | READY | Yes (curated) | Yes (curated display) | State can be represented safely via mediator |
| INQUIRY_READINESS_COMPLETE | Inquiry workflow evidence and alerting traces present | READY | Yes (curated) | Yes (curated display) | Use redacted, non-secret relay only |
| EVENT_FEED_AVAILABLE | Admin/control event and audit read surfaces exist | READY | Yes (ops/admin context) | No direct broad pull | Not authorized for direct CAE broad consumption |
| UNIFIED_EVIDENCE_FEED_FOR_CAE_CRM | No single versioned unified endpoint covering QR+catalogue+inquiry full lifecycle | PARTIAL | N/A | N/A | Building blocks exist; unified contract not implemented |

## 4) Evidence Feed Path Decision
- Decision enum: CRM_MEDIATED_PULL_FROM_MAIN_APP

Meaning:
- CRM polls authoritative Main App provisioning/status/activation evidence using the approved service-auth/polling seams.
- CRM relays curated, non-secret, display-safe evidence to CAE.
- CAE must not directly consume broad Main App control-plane logs/events at this stage.
- CRM must prove in its own repo that it can mediate/consume and relay this model before CAE implements against it.

Also recorded:
- Main App remains runtime authority.
- CRM is mediator/consumer candidate, not proven until CRM repo verifies.
- CAE is display/assistance consumer only.

## 5) Security / Trust Model
- Main App evidence access must use least-privilege service-auth / approved polling seams.
- No browser-exposed service secrets.
- No raw invite token relay to CAE.
- No tokenHash relay.
- No QR payload relay.
- No direct CAE broad read of Main App control-plane logs/events.
- CRM relay must be curated, redacted, and non-secret.

## 6) Concrete v1 CRM-to-CAE Evidence Payload Schema
- Schema name: CrmToCaeMainAppEvidenceSnapshotV1
- Schema intent: CRM-produced, Main App-derived, CAE-display-safe evidence snapshot.
- This is not a Main App runtime endpoint contract.
- This is not an authorization for CRM runtime implementation.
- CRM must first verify/tune this schema against CRM repo truth before forwarding to CAE.

Proposed governance schema (design target):

CrmToCaeMainAppEvidenceSnapshotV1
- schemaVersion: "mainapp-evidence-snapshot.v1"
- evidenceSnapshotRef: string
- correlation:
  - orchestrationReference: string
  - crmCaseRef: string (optional)
  - caeAcquisitionRef: string (optional)
- observedAt: ISO datetime
- source:
  - sourceSystem: "MAIN_APP"
  - mediatedBy: "CRM"
  - sourceConfidence: "MAIN_APP_AUTHORITATIVE" | "CRM_OBSERVED"
- lifecycle:
  - provisioningStatus: "ACCEPTED" | "PROVISIONED" | "ACTIVATED" | "UNKNOWN"
  - provisioningAcceptedAt: ISO datetime (optional)
  - provisionedAt: ISO datetime (optional)
  - activatedAt: ISO datetime (optional)
  - firstLoginObservedAt: ISO datetime (optional)
- organization:
  - mainAppOrgRef: string
  - mainAppTenantRef: string (optional)
  - slug: string (optional)
  - organizationStatus: string (optional)
- accessArtifact:
  - availabilityIndicator: "ISSUED" | "NOT_AVAILABLE" | "EXPIRED" | "UNKNOWN"
  - inviteIdRef: string (optional)
  - rawInviteToken: FORBIDDEN
  - rawAccessUrl: FORBIDDEN
  - tokenHash: FORBIDDEN
- qr:
  - status: "DECISION_GATED" | "NOT_IMPLEMENTED" | "AVAILABLE" | "UNKNOWN"
  - artifactRef: string (optional)
  - payload: FORBIDDEN
  - liveQrUrl: FORBIDDEN
- readiness:
  - catalogueReadinessObservedState: "PENDING" | "COMPLETE" | "PARTIAL" | "UNKNOWN"
  - inquiryReadinessObservedState: "PENDING" | "COMPLETE" | "PARTIAL" | "UNKNOWN"
- assistance:
  - caeDisplayStatus: string
  - fieldAgentActionHint: string (optional)
  - escalationRequired: boolean (optional)
- errors:
  - errorCode: string (optional)
  - errorClass: "VALIDATION" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "UNKNOWN" (optional)
  - redactedMessage: string (optional)
  - rawErrorPayload: FORBIDDEN

## 7) Payload Field Safety Classification

| Field | Safety Level | CRM Storage | CAE Display | Notes |
|---|---|---|---|---|
| evidenceSnapshotRef | OPS_SAFE / FIELD_AGENT_SAFE | Allowed | Allowed | Snapshot correlation handle |
| orchestrationReference | OPS_SAFE | Allowed | Restricted or redacted display | Show only when operationally required |
| mainAppOrgRef | OPS_SAFE | Allowed | Restricted | Operational reference |
| mainAppTenantRef | OPS_SAFE | Allowed | Restricted | Operational reference |
| slug | Conditional FIELD_AGENT_SAFE | Allowed | Allowed if public-facing slug; else restricted | Context dependent |
| provisioningStatus | FIELD_AGENT_SAFE | Allowed | Allowed | Core display-safe status |
| activatedAt | FIELD_AGENT_SAFE | Allowed | Allowed | Milestone timestamp |
| firstLoginObservedAt | FIELD_AGENT_SAFE | Allowed | Allowed | If available and safe |
| inviteIdRef | OPS_SAFE | Allowed | Restricted | Internal artifact reference |
| rawInviteToken | FORBIDDEN | Forbidden | Forbidden | Secret credential |
| rawAccessUrl | FORBIDDEN | Forbidden | Forbidden | Secret/sensitive transport artifact |
| tokenHash | FORBIDDEN | Forbidden | Forbidden | Sensitive security artifact |
| qr.payload | FORBIDDEN | Forbidden | Forbidden | Forbidden raw QR payload |
| qr.liveQrUrl | FORBIDDEN | Forbidden | Forbidden | Forbidden direct QR URL relay |
| error/conflict codes | OPS_SAFE | Allowed | Redacted status view only | Avoid raw internal payload leakage |

## 8) Runtime ID Display Matrix
- CRM may store operational references required for support/evidence reconciliation.
- CAE may receive only curated display-safe references.
- mainAppUserId/mainAppMemberId should remain restricted unless a future evidence contract proves CAE needs them.
- inviteToken/tokenHash/QR payload/raw access URL are forbidden.

## 9) Known Runtime Gaps / Decision Gates
- No unified Main App evidence feed endpoint exists yet.
- First-login evidence is not joined to orchestrationReference in one feed contract.
- Onboarding QR remains decision-gated.
- Catalogue readiness is partial and lacks explicit onboarding-readiness state contract.
- CAE must not infer Main App readiness from Field Agent coaching completion.
- CRM must prove it can act as mediator/consumer before forwarding to CAE.

## 10) CRM Verification Requirement Before CAE Forwarding
Before forwarding this model to CAE for implementation, CRM must run a repo-truth verification/design unit to prove whether existing CRM runtime, schemas, services, evidence timeline, and UI can consume, store, redact, and relay the Main App-derived evidence model without violating Main App authority or exposing restricted fields.

## 11) Final Verdict
MAIN_APP_AUTHORITATIVE_WITH_CRM_MEDIATED_FEED

## 12) Final Recommendation
ASK_CRM_FOR_MATCHING_EVIDENCE_FEED_PROOF

## 13) Recommended Next Unit
- Unit: CRM-MAINAPP-EVIDENCE-MEDIATOR-CONSUMER-PROOF-001
- Purpose: CRM must verify its existing repo situation, tune/match it to the Main App evidence model, and prove whether it can mediate curated evidence to CAE before CAE implementation begins.

Verification Requirements:
- git status --short
- git log --oneline -5
- git diff --name-only
- inspect MAINAPP-CAE-CRM-EVIDENCE-FEED-AUTHORITY-AUDIT-001.md for duplicate headings, unsupported implementation authorization, or accidental runtime instructions
- ensure only governance/audit documentation is changed
- ensure no runtime/test/schema files are modified

Completion Checklist:
- [x] Current branch and HEAD confirmed.
- [x] Working tree before edit confirmed.
- [x] Audit artifact created.
- [x] Final verdict recorded as MAIN_APP_AUTHORITATIVE_WITH_CRM_MEDIATED_FEED.
- [x] Final recommendation recorded as ASK_CRM_FOR_MATCHING_EVIDENCE_FEED_PROOF.
- [x] v1 safe CRM-to-CAE evidence payload schema drafted.
- [x] CRM verification-before-CAE-forwarding rule recorded.
- [x] No runtime files changed.
- [x] No tests changed.
- [x] No schema/DB files changed.
- [x] No CRM/CAE calls made.
- [x] No provisioning/evidence delivery executed.
- [x] One atomic governance/audit commit created.
