# CONTROL-PLANE-TEST-TENANT-CLEANUP-RUNTIME-PARITY-INVESTIGATION-001

## 1. Unit Header

- Unit ID: CONTROL-PLANE-TEST-TENANT-CLEANUP-RUNTIME-PARITY-INVESTIGATION-001
- Mode: Runtime parity investigation and decision (no implementation mutation)
- Date: 2026-05-27
- Branch: main
- HEAD at investigation start: e6f3368d49126ee3c1eec4ca9626c76a7a7a46f0

## 2. Repo-Truth Preflight

- git branch --show-current: main
- git rev-parse HEAD: e6f3368d49126ee3c1eec4ca9626c76a7a7a46f0
- git status --short: clean
- Authority artifact existence: pass
  - artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-IMPLEMENTATION-001.md
  - artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-VERIFY-CLOSE-001.md
- Authority enum checks: pass
  - READ_SIDE_HIDE_IMPLEMENTED_AND_VERIFIED
  - READ_SIDE_HIDE_VERIFICATION_NEEDS_PARESH_DECISION
- Commit existence checks: pass
  - 73bc4dcca382529d86673fa8fbc425f75771242b
  - e6f3368d49126ee3c1eec4ca9626c76a7a7a46f0

## 3. Authority Artifacts Reviewed

- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-IMPLEMENTATION-001.md
- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-VERIFY-CLOSE-001.md
- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-CLEANUP-REMEDIATION-DESIGN-001.md

## 4. Runtime Discrepancy Summary

Prior verify-close concluded local/source/test validation passed, but runtime list still displayed approved cleanup slugs. This unit re-ran read-only runtime checks to isolate whether the discrepancy is deployment, cache, route mismatch, or implementation gap.

## 5. Deployment Parity Findings

- Runtime headers observed from authenticated API responses include Vercel edge IDs, but no commit SHA/version metadata is exposed.
- Deployment parity with commit 73bc4dcca382529d86673fa8fbc425f75771242b cannot be proven directly from available runtime metadata.

Finding:
- Deployment commit parity is not directly attestable from exposed runtime metadata.

## 6. Route/API Parity Findings

Source findings:
- server/src/routes/control.ts has exactly one list route: fastify.get('/tenants').
- That list route applies filterControlPlaneLaunchFacingTenantList before response mapping.
- Detail route fastify.get('/tenants/:id') remains separate and unfiltered.

Frontend/read-path findings:
- components/ControlPlane/TenantRegistry.tsx list load uses getTenants().
- Shared runtime page resource activity includes https://app.texqtic.com/api/control/tenants.
- Authenticated in-page fetch to /api/control/tenants returned 200 and returned approved cleanup slugs that should be hidden.

Observed examples returned from runtime API:
- approved still visible: test-tenant-nll-other-f333d3c9-7cc7995d
- approved still visible: test-tenant-rfq-route-owner-33416ed7
- preserved visible: qa-wl, qa-b2c, white-label-co, qa-b2b

Finding:
- Runtime endpoint path matches expected list API path, but runtime response behavior does not match committed source behavior.

## 7. Filter Placement Findings

- Source confirms filter placement is before read-model mapping on list route.
- No second list route found in server/src/routes/control.ts.
- Tests referencing filter helper and guardrail report are present and passing.

Finding:
- Local implementation placement is correct by source and tests.

## 8. Cache/Staleness Findings

- Fresh runtime reload performed.
- Runtime page no longer in loading/error state.
- Authenticated API fetch with no-store still returned approved slugs.

Finding:
- Pure stale DOM snapshot alone is unlikely.
- A runtime cache layer or stale deployment artifact remains possible, but not directly provable without deployment/version telemetry.

## 9. Fresh Runtime Smoke Result

- Status: RUN (read-only)
- Session: existing authenticated SuperAdmin session
- Mutation actions performed: none
- Results:
  - Approved cleanup slugs still visible in runtime list/API response.
  - Preserved examples remain visible as expected.

## 10. Root-Cause Classification

Root-cause classification:
- INCONCLUSIVE

Rationale:
- Source and tests validate correct implementation.
- Runtime path appears correct (/api/control/tenants), yet behavior differs.
- Available runtime metadata does not expose deploy SHA, so stale deployment versus runtime API stack mismatch cannot be deterministically separated in this unit.

## 11. Recommended Next Action

Recommended next unit:
- CONTROL-PLANE-TEST-TENANT-CLEANUP-RUNTIME-DEPLOY-PARITY-VERIFY-001

Required scope for next unit:
1. Obtain deployment SHA/version evidence for app.texqtic.com API runtime.
2. Confirm whether deployed API bundle includes commit 73bc4dcca382529d86673fa8fbc425f75771242b changes in server/src/routes/control.ts and server/src/config/controlPlaneTenantReadExclusions.ts.
3. If stale deployment: redeploy/roll-forward and rerun runtime smoke.
4. If deployed SHA is current but behavior still unfiltered: open dedicated route-runtime adapter mismatch fix unit.

## 12. No-Mutation Statement

This investigation unit did not perform database mutation, deletion, archive, tenant lifecycle mutation, onboarding mutation, Prisma write, raw SQL mutation, migration, or seed execution.

## 13. Final Recommendation Enum

RUNTIME_PARITY_INCONCLUSIVE_NEEDS_PARESH_DECISION