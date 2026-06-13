# FTR-SL-016B2A3 - B2B Company Profile Rich Fields PUT Runtime Fix

## 1. Unit Identity

- Unit ID: FTR-SL-016B2A3-B2B-COMPANY-PROFILE-RICH-FIELDS-PUT-RUNTIME-FIX-01
- Date: 2026-06-13
- Mode: bounded backend runtime bugfix, production verify, governance sync
- Final enum: FTR_SL_016B2A3_IMPLEMENTED_RUNTIME_PARTIAL

## 2. Repo Preflight

- Branch: main
- HEAD before implementation: cd146939b6c697c09dce2ae02a10c1ef68c3b533
- Mandatory preflight commands run: git branch --show-current, git rev-parse HEAD, git status --short, git log --oneline -15, git remote -v
- Worktree before implementation: clean

## 3. Root Cause Capture

Production runtime error capture from Vercel logs on deployed B2A3 implementation candidate showed:

- route: PUT /api/tenant/profile
- tenant context: authenticated tenant lane (QA B2B)
- status: 500
- sanitized error class: PrismaClientKnownRequestError
- sanitized error code: P2028
- sanitized error message: Transaction API error: Transaction not found
- stack location: /vercel/path0/server/src/routes/tenant.ts:8134
- operation phase: in-transaction PUT path under withDbContext

Observed behavior alignment:

- GET /api/tenant/profile remained 200.
- Valid PUT failed with 500 before persistence in failing deployment.
- Read-only and invalid validations remained correct.

Why DB migration/RLS/grants were not the cause:

- B2A1 already verified migration/table/constraints/indexes/RLS/policies/grants.
- B2A3 focused runtime evidence identified transaction lifecycle failure (P2028), not missing schema or permissions.

## 4. Fix Summary

### Files changed (implementation)

- server/src/routes/tenant.ts

### Source fix

1. Added explicit transaction options for tenant profile read/write flow:
   - TENANT_PROFILE_TX_OPTIONS with timeoutMs=20000 and maxWaitMs=5000.
2. Applied TENANT_PROFILE_TX_OPTIONS to both withDbContext calls used by:
   - GET /tenant/profile
   - PUT /tenant/profile
3. Retained non-blocking audit posture in PUT path so audit/event write issues do not convert successful profile mutation into 500.

No schema/migration changes.
No public projection changes.
No frontend changes.

## 5. Validation

Commands run:

- pnpm --dir server exec prisma validate -> PASS (existing known SetNull warning only)
- pnpm --dir server exec prisma generate -> PASS
- pnpm --dir server typecheck -> PASS
- pnpm typecheck -> PASS
- git diff --check -> PASS

Focused tenant-profile test file was not run because no existing focused test file exists in server/src/__tests__ for this route and this unit prioritized production-runtime closure.

## 6. Deployment / Active Commit Evidence

Implementation commits pushed:

- 94a6609d480b856590f59ed9e531b0a295f2606b
- 6a747620538a67ce409bbdfb0698a08e9255a9bb

Deployment evidence:

- vercel list --meta githubCommitSha=6a747620538a67ce409bbdfb0698a08e9255a9bb -> Ready production deployment URL:
  https://texqtic-azin3uwbo-tex-qtic.vercel.app
- deployment alias includes https://app.texqtic.com

## 7. Production Runtime Verification Matrix

### QA B2B lane (shared authenticated session)

- GET /api/tenant/profile -> 200
- Valid PUT /api/tenant/profile -> 200
- Follow-up GET -> 200
- Persistence proof -> PASS (tagline changed to unique runtime probe value and read back)

### Guardrails

- Read-only mutation payload -> 400 VALIDATION_ERROR
- Invalid website/email/band/description payload -> 400 VALIDATION_ERROR
- Unauthenticated GET -> 401
- Unauthenticated PUT -> 401

### Shraddha lane

- Shraddha GET: NOT VERIFIED in this unit
- Reason: available shared browser context remained QA B2B despite requesting Shraddha OWNER/ADMIN switch; runtime profile response confirmed slug qa-b2b.

### Lower-role lane

- non-OWNER/ADMIN PUT -> SKIPPED
- Reason: no safe lower-role session provided.
- Repo-truth guard remains explicit in route: OWNER/ADMIN only; others return 403.

## 8. Public Non-Exposure Verification

Verified after fix:

- /api/public/b2b/suppliers -> 200; no private rich profile fields exposed
- /b2b -> no forbidden private rich profile fields exposed
- /products -> no forbidden private rich profile fields exposed

Checked absence of:

- businessEmail, phone, cinNumber, udyamNumber, iecNumber
- tagline, description, websiteUrl, city, state, capacityBand, companySizeBand
- signed URLs, certificate storage paths, bucket names

## 9. Residuals

1. Shraddha GET runtime confirmation remains pending in shared browser context.
2. Lower-role 403 runtime confirmation remains pending due missing safe role lane.

## 10. Adjacent Findings

- ID: AF-B2A3-001
- Finding: profile route transaction duration in production can exceed Prisma interactive defaults (~5s), causing P2028 under serverless latency.
- Disposition: fixed in-scope via explicit tx options on profile GET/PUT.
- Priority: P1
- Owner/status: backend/main app, RESOLVED in B2A3

## 11. Hub-Sync Checklist

1. Did this unit change launch readiness truth? yes
2. Which family/requirement changed? FTR-SL-016B2A profile PUT runtime fix state
3. Which hub docs updated? FUTURE-TODO-REGISTER and this B2A3 artifact
4. Evidence source? production Vercel logs (P2028 root cause), deployment ready proof, runtime matrix re-run
5. CRM/CAE duplication risk? no
6. Incorrect MVP promotion risk? controlled; enum remains partial due missing Shraddha and lower-role runtime lanes
7. Stale rows superseded? B2A2 blocker superseded by B2A3 implementation+runtime partial closure
8. If no hub update needed, reason? not applicable
9. Hub files allowlisted? yes

## 12. Commits

Implementation commits:

- [TEXQTIC] fix rich company profile PUT runtime (94a6609d480b856590f59ed9e531b0a295f2606b)
- [TEXQTIC] fix rich company profile PUT runtime (6a747620538a67ce409bbdfb0698a08e9255a9bb)

Governance commit: created in this unit after artifact/register updates.

## 13. Final Status

- QA production PUT runtime failure fixed and verified.
- Governance synced with partial-complete enum due outstanding Shraddha/lower-role verification lanes.
