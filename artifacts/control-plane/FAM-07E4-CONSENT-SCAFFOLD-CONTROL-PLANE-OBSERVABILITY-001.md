# FAM-07E4-CONSENT-SCAFFOLD-CONTROL-PLANE-OBSERVABILITY-001

## Unit
- Family: FAM-07
- Slice: E4 Control-Plane Observability (scaffold-only)
- Date: 2026-05-30
- Posture: LEGAL_PENDING scaffold (no legal-finalization claims)

## Scope
- Added read-only control-plane observability projection for consent scaffold records on tenant detail reads.
- Exposed bounded fields only from legal consent snapshot/events (no metadata JSON, no hashes/source URLs, no request/correlation IDs).
- Rendered control-plane tenant detail observability panel with explicit NOT LEGAL-APPROVED guardrail messaging.
- Added targeted backend integration assertions and frontend TenantDetails observability tests.

## Files Changed
- server/src/routes/control.ts
- services/controlPlaneService.ts
- components/ControlPlane/TenantDetails.tsx
- server/src/__tests__/control-onboarding-outcome.integration.test.ts
- tests/frontend/control-plane-consent-observability.test.tsx

## Implementation Notes
- Route: GET /api/control/tenants/:id now reads:
  - latest legal consent snapshot (org-scoped, take 1, updatedAt desc)
  - recent legal consent events (org-scoped, take 10, occurredAt desc)
- Response adds tenant.consent_scaffold_observability:
  - has_records
  - has_legal_approved_record
  - latest_snapshot (bounded)
  - recent_events (bounded)
- UI: Tenant deep-dive overview now includes Consent Scaffold Observability panel that:
  - surfaces LEGAL_PENDING when present
  - shows NOT LEGAL-APPROVED badge unless a LEGAL_APPROVED record exists
  - explicitly states control-plane read-only scaffold boundary
  - safely handles empty records state

## Validation Evidence
- Backend test (updated suite):
  - runTests file: server/src/__tests__/control-onboarding-outcome.integration.test.ts
  - Result: passed=11 failed=0
- Frontend test (new suite):
  - runTests file: tests/frontend/control-plane-consent-observability.test.tsx
  - Result: passed=2 failed=0

## Safety / Governance
- No schema or migration changes.
- No onboarding write-path changes.
- No legal approval, compliance-complete, or closure assertions introduced.
- No secret/token/invite-link fields added to observability projection.

## Status
- E4 implementation complete in scaffold-only LEGAL_PENDING posture.
- FTR-LEGAL-003 remains open; no closure action taken.
