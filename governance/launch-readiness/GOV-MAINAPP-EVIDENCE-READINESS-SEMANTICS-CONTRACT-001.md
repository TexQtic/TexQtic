# GOV-MAINAPP-EVIDENCE-READINESS-SEMANTICS-CONTRACT-001

## 1. Status Header

- Unit: GOV-MAINAPP-EVIDENCE-READINESS-SEMANTICS-CONTRACT-001
- Status: DECISION_ONLY
- Scope: Main App readiness-semantics contract for CRM mediated evidence relay design gating
- Repo: TexQtic Main App
- Date: 2026-05-26
- Branch at lock: main
- Guardrails:
  - no runtime implementation
  - no runtime behavior changes
  - no schema or DB changes
  - no migrations
  - no Prisma changes
  - no CRM runtime changes
  - no CAE runtime changes
  - no evidence relay execution

## 2. Source Authority References

Main App authority (reviewed):

- MAINAPP-CAE-CRM-EVIDENCE-FEED-AUTHORITY-AUDIT-001.md
- MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md
- governance/launch-readiness/MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-CONTRACT-HARDENING-DESIGN-001.md
- governance/launch-readiness/PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md
- governance/launch-readiness/CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md
- server/src/routes/admin/tenantProvision.ts
- server/src/services/tenantProvision.service.ts
- server/src/types/tenantProvision.types.ts
- server/src/routes/tenant.ts
- server/prisma/schema.prisma
- shared/contracts/openapi.control-plane.json
- docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md
- docs/TEXQTIC-MAIN-APP-CRM-IDENTIFIER-AND-FIELD-MAPPING-CONTRACT-v1.md
- docs/TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md

External input references requested but not present in this repo workspace:

- CRM-MAINAPP-EVIDENCE-MEDIATOR-CONSUMER-PROOF-001.md (not found in Main App repo)
- CRM-MAINAPP-EVIDENCE-MEDIATOR-REDACTION-DESIGN-001.md (not found in Main App repo)
- CRM-MAINAPP-EVIDENCE-MEDIATOR-CROSSREPO-CONTRACT-LOCK-001.md (not found in Main App repo)
- GOV-CAE-DISPLAY-SAFE-EVIDENCE-SCHEMA-DESIGN-001 (not found in Main App repo)

## 3. Repo-Truth Evidence Reviewed

Authoritative findings used for this lock:

- Main App has implemented provisioning and activation evidence signals for `APPROVED_ONBOARDING` via:
  - `POST /api/control/tenants/provision`
  - `GET /api/control/tenants/provision/status`
  - `POST /api/tenant/activate`
- Main App status contract currently carries `provisioningStatus`, `organizationStatus`, `firstOwnerAccessPreparation.acceptedAt`, and `activation.activatedAt`.
- No runtime field named `provisioningAcceptedAt` exists in current route or OpenAPI contracts.
- `sourceConfidence`, `catalogueReadinessObservedState`, and `inquiryReadinessObservedState` are present in Main App governance design artifacts, but are not present in current runtime source types/routes/contracts.
- Main App evidence audit already classifies restricted fields as forbidden for relay: raw invite token, raw access URL, token hash, raw QR payload/live URL, raw error payload.
- Cross-repo decision lock marks catalogue/inquiry readiness milestones as decision-gated across Main App, CRM, and CAE.

## 4. Provisioning Acceptance Timestamp Decision

Decision: `DERIVED_FROM_PROVISIONING_EVENT`

Definition lock:

- `provisioningAcceptedAt` is defined as the Main App acceptance moment for approved-onboarding provisioning.
- Canonical source category: derived timestamp.
- Canonical source evidence precedence:
  1. Main App provisioning acceptance event timestamp for the successful provisioning transaction.
  2. Main App runtime creation timestamp at provisioning root (`tenants.created_at` / `organizations.created_at`) when event timestamp is not contract-carried.

Relay and display policy:

- CRM relay allowed: yes, only when derived from Main App authoritative evidence.
- CRM may not invent or synthesize this timestamp from CRM-local workflow timing.
- CAE display allowed: yes, as display-safe milestone timestamp.

Runtime requirement status:

- Runtime work required for a future explicit field-level API contract guarantee: yes.
- This unit does not authorize that runtime work.

## 5. Source Confidence Decision

Decision: `MAIN_APP_AUTHORITATIVE_OR_CRM_OBSERVED`

Allowed values and semantics:

- `MAIN_APP_AUTHORITATIVE`: value is directly sourced from Main App runtime authority evidence.
- `CRM_OBSERVED`: value reflects CRM observation timing or mediation context over Main App-derived state, without overriding Main App truth.

Setter rules:

- Main App does not currently emit `sourceConfidence` as a runtime field.
- CRM, as mediator, may assign this field in relay payloads under this semantic contract.

Computation and display policy:

- CRM may compute `sourceConfidence` only within the above two-value vocabulary.
- CRM may not use `sourceConfidence` to override Main App runtime evidence.
- CAE may display this field as display-safe provenance context.

## 6. Catalogue Readiness Semantics Decision

Decision: `NEEDS_MAINAPP_RUNTIME_CONTRACT`

Current source-of-truth state:

- Main App runtime source/contracts reviewed in this unit do not expose a canonical runtime field named `catalogueReadinessObservedState`.
- Main App governance artifacts contain design vocabulary, but no locked runtime contract field for this observed state.

Enum and evidence lock:

- No runtime enum is locked in this unit.
- CRM must not treat design-only vocabulary as runtime-authoritative until Main App runtime contract is opened and locked.

Relay and display policy:

- CRM carry allowed in v1: no.
- CAE display allowed in v1: no.

Blocking impact:

- This blocks inclusion of `catalogueReadinessObservedState` in CRM relay v1.
- This does not block CRM proceeding with bounded relay design if readiness fields are omitted from v1.

## 7. Inquiry Readiness Semantics Decision

Decision: `NEEDS_MAINAPP_RUNTIME_CONTRACT`

Current source-of-truth state:

- Main App runtime source/contracts reviewed in this unit do not expose a canonical runtime field named `inquiryReadinessObservedState`.
- Main App governance artifacts contain design vocabulary, but no locked runtime contract field for this observed state.

Enum and evidence lock:

- No runtime enum is locked in this unit.
- CRM must not treat design-only vocabulary as runtime-authoritative until Main App runtime contract is opened and locked.

Relay and display policy:

- CRM carry allowed in v1: no.
- CAE display allowed in v1: no.

Blocking impact:

- This blocks inclusion of `inquiryReadinessObservedState` in CRM relay v1.
- This does not block CRM proceeding with bounded relay design if readiness fields are omitted from v1.

## 8. Readiness Relay Policy

Decision: `READINESS_FIELDS_OMIT_FROM_V1`

Policy lock:

- CRM future v1 relay may proceed with Main App-derived provisioning and activation evidence that is already runtime-authoritative.
- CRM v1 relay must omit:
  - `catalogueReadinessObservedState`
  - `inquiryReadinessObservedState`
- CAE display of omitted readiness fields is not authorized in v1.
- Main App runtime contract work is required before readiness fields can be included in a later relay version.

## 9. Boundary Preservation Rules

This unit preserves the following boundaries exactly:

- Main App remains authoritative for runtime evidence truth.
- CRM may only mediate observed Main App-derived evidence after separate CRM implementation authorization.
- CAE remains display-safe Field Agent assistance consumer only.
- No direct CAE broad Main App control-plane access.
- No raw invite token relay.
- No raw access URL relay.
- No tokenHash relay.
- No QR payload or live QR URL relay.
- No raw error payload relay.
- No browser-exposed service secrets.
- No CRM mutation of Main App tenant/org/user/member/activation truth.
- No CRM sender/provisioning/access-artifact expansion.
- No CAE runtime implementation is authorized by this unit.

## 10. Main App Next Gate

Decision: `READINESS_FIELDS_MUST_BE_OMITTED_FROM_CRM_V1`

Gate meaning:

- Main App readiness semantics for catalogue/inquiry observed state remain runtime-contract gated.
- CRM may continue bounded relay runtime design only under explicit v1 omission of readiness fields.

## 11. Recommended Next Unit

Recommended next unit: `CRM-MAINAPP-EVIDENCE-RELAY-BOUNDED-RUNTIME-DESIGN-001`

Required instruction for that unit:

- Proceed with bounded relay design using Main App-authoritative provisioning and activation evidence.
- Explicitly omit readiness fields in v1 (`catalogueReadinessObservedState`, `inquiryReadinessObservedState`) until a later Main App runtime readiness contract unit is approved.
