# FTR-SL-016B2B1B - Tenant Profile PUT 500 Persistence Fix

## 1. Unit Identity

- Unit ID: FTR-SL-016B2B1B-TENANT-PROFILE-PUT-500-PERSISTENCE-FIX-01
- Date: 2026-06-14
- Mode: source fix + deployed runtime verification + governance sync
- Final enum: FTR_SL_016B2B1B_FIXED_DISPLAYNAME_LEGACY_TENANT_MIRROR_WRITE_FAILURE

## 2. Source Root Cause

- Runtime isolation before patch:
  - tagline-only `PUT /api/tenant/profile` -> `200`
  - city-only `PUT /api/tenant/profile` -> `200`
  - companySizeBand-only `PUT /api/tenant/profile` -> `200`
  - any request including `displayName` -> `500 INTERNAL_ERROR`
- Repo root cause in `server/src/routes/tenant.ts` displayName branch:
  - canonical update `organizations.legal_name` was followed by a redundant legacy mirror write `tx.tenant.update(...)`
  - this redundant tenant-name write was the failing step

## 3. Source File Changed

- `server/src/routes/tenant.ts`

## 4. Exact Function/Area Changed

- Route: `PUT /api/tenant/profile`
- Area: displayName update branch around the tenant profile mutation block (around line 8148 in current file history)
- Change:
  - kept canonical `organizations.update({ legal_name })`
  - removed redundant legacy `tx.tenant.update({ name })`
  - left rich profile detail upsert unchanged

## 5. Worktree Classification Before Commit

- Commands run:
  - `git status --short`
  - `git diff --name-only`
  - `git diff -- server/src/routes/tenant.ts`
  - `git diff -- governance/launch-readiness`
- Result:
  - `server/src/routes/tenant.ts` = active source fix diff
  - `governance/launch-readiness/FTR-SL-016B2B1-B2B-COMPANY-PROFILE-RICH-FIELDS-UI-SAVE-READBACK-VERIFY-01.md` = prior governance carryover
- Source commit hygiene:
  - governance carryover left unstaged during source commit

## 6. Source Validation Commands / Results

- `get_errors` on touched route file: no errors
- `pnpm -C server exec eslint src/routes/tenant.ts`: pass, 0 errors, 2 pre-existing warnings
- `git diff --check -- server/src/routes/tenant.ts`: pass (no output)

## 7. Source Commit / Push

- Source commit message: `[TEXQTIC] backend: stop displayName saves from failing`
- Source commit hash: `5e5b0f1670f84a7ca4c9f480b6fbef68a35a3440`
- Push status: pushed to `origin/main` (`70178c69..5e5b0f16`)

## 8. Deployment Status

- Deployment mode: automatic deploy expected from `main` push
- Runtime confirmation basis:
  - live `https://app.texqtic.com/b2b` now returns `200` for displayName-including save paths that previously returned `500`
  - indicates deployed behavior reflects source fix

## 9. Live QA B2B Protected Read Precheck

- Workspace visible: yes (`QA B2B | TexQtic B2B Workspace`)
- Realm: `TENANT`
- Role signal: active QA B2B owner/admin verification lane with `canEdit=true` (explicit role field not returned by current session endpoint probe)
- Protected `GET /api/tenant/profile`: `200`
- `canEdit`: `true`

## 10. UI Save With displayName Included

- Company Profile UI edited with QA-safe values:
  - `tagline = B2B1B displayName save verification 2026-06-14`
  - `city = QA City B2B1B 2026-06-14`
  - payload included `displayName: QA B2B`
- Save execution via UI button path:
  - endpoint: `PUT /api/tenant/profile`
  - response status: `200`
  - response shape: `{ success: true, data: { profile: ... } }`
  - UI result: `Company profile updated.` visible

## 11. Authenticated PUT Result

- Direct protected probe after deploy:
  - `PUT /api/tenant/profile` with `{ displayName: 'QA B2B' }` -> `200`
- Confirms displayName branch no longer produces `500`

## 12. Protected GET Readback Result

- Protected `GET /api/tenant/profile` after UI save:
  - status: `200`
  - persisted:
    - `displayName = QA B2B`
    - `tagline = B2B1B displayName save verification 2026-06-14`
    - `city = QA City B2B1B 2026-06-14`
  - `canEdit = true`

## 13. Hard Reload Readback Result

- Hard reload action executed (`Ctrl+Shift+R`)
- Post-reload checks:
  - tenant session still valid
  - realm still `TENANT`
  - protected `GET /api/tenant/profile` still `200`
  - saved values remain persisted

## 14. Restore / Cleanup Result

- Verification values left in place as QA-safe markers:
  - no private identifiers
  - clearly QA-tagged

## 15. Public Non-Exposure Smoke

- Checked:
  - `/api/public/b2b/suppliers` -> `200`
  - `/b2b` -> `200`
  - `/products` -> `200`
- Results:
  - no leakage of QA verification tagline/city values
  - no leakage of private rich profile fields (`businessEmail`, `cinNumber`, `udyamNumber`, `iecNumber`)
  - no certificate document/signed URL leakage detected
  - adjacent finding: supplier payload still includes a public logo URL using Supabase storage path (`.../storage/v1/object/public/catalog-images/...`)

## 16. Adjacent Findings Disposition

- AF-016B2B1B-PUBLIC-LOGO-STORAGE-PATH
  - finding: public supplier payload includes a public storage URL path for supplier logo
  - B2B1C disposition: non-blocking / separate follow-up
  - classification: expected public media URL behavior in current projection model (logo intentionally public)
  - no leakage observed for signed URLs, private certificate/document URLs, private rich-profile values, or QA verification values
  - follow-up registration: `QA-MEDIA-003 / FTR-SL-015D` (Public media URL abstraction/logo storage-path hardening), priority `P3`, status `QUEUED`, non-blocking

## 17. B2B1 Relationship / Supersession

- B2B1 blocker root cause fixed in B2B1B:
  - removed failing legacy mirror write in displayName path
  - deployed runtime confirms displayName-including saves return `200` with readback persistence
- Closure outcome after B2B1C:
  - B2B1 is now verified for Company Profile save/readback scope
  - adjacent logo URL finding does not block B2B1 closure

## 18. Governance Commit / Push Proof

- Governance commit message target: `[TEXQTIC] governance: record tenant profile PUT persistence fix`
- Governance commit hash: `f4a3352c264d6ea25d5c4c3945251277892234a0`
- Push status: `origin/main` aligned at `f4a3352c264d6ea25d5c4c3945251277892234a0`
- Final `git status --short`: clean at B2B1B closeout point
