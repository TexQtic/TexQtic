# FTR-SL-016B2B1C - Public Logo URL Adjacent Finding Disposition and B2B1 Close

## 1. Unit Identity

- Unit ID: FTR-SL-016B2B1C-PUBLIC-LOGO-URL-ADJACENT-FINDING-DISPOSITION-AND-B2B1-CLOSE-01
- Date: 2026-06-14
- Mode: governance-first, verification-light, no source changes
- Final enum: FTR_SL_016B2B1C_PUBLIC_LOGO_URL_FOLLOWUP_REGISTERED_B2B1_VERIFIED

## 2. Repo Preflight

Commands run:
- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `git log --oneline -20`
- `git remote -v`

Results:
- branch: `main`
- HEAD: `f4a3352c264d6ea25d5c4c3945251277892234a0`
- `origin/main` aligned at the same commit before B2B1C edits
- tracked worktree clean before B2B1C governance edits
- expected latest governance commit present: `f4a3352c264d6ea25d5c4c3945251277892234a0`

## 3. Files Inspected

Governance artifacts:
- `governance/launch-readiness/FTR-SL-016B2B1B-TENANT-PROFILE-PUT-500-PERSISTENCE-FIX-01.md`
- `governance/launch-readiness/FTR-SL-016B2B1-B2B-COMPANY-PROFILE-RICH-FIELDS-UI-SAVE-READBACK-VERIFY-01.md`
- `governance/launch-readiness/FTR-SL-015C5-B2B-PROFILE-LOGO-DISPLAY-AND-PUBLIC-PROJECTION-FIX-01.md`
- `governance/launch-readiness/FTR-SL-015C5A-B2B-LOGO-DISPLAY-POST-DEPLOY-RUNTIME-VERIFICATION-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Repo truth surfaces:
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/services/storage/tenantLogo.storage.ts`
- `server/src/routes/public.ts`
- `server/src/routes/tenant.ts`
- `components/Public/B2BDiscovery.tsx`

## 4. Public Logo URL Finding Summary

Adjacent finding under disposition:
- `AF-016B2B1B-PUBLIC-LOGO-STORAGE-PATH`
- Observation: public supplier payload includes `logoUrl` with Supabase public storage path style (`.../storage/v1/object/public/catalog-images/...`).

Repo truth:
- Tenant logo upload route explicitly returns a public `logoUrl`.
- Tenant logo storage helper calls Supabase `getPublicUrl(...)`.
- Public B2B projection intentionally includes `logoUrl` on supplier entries.
- Public B2B UI intentionally renders supplier logos from `logoUrl`.

## 5. Runtime / Public Check Results

Safe checks run:
- `GET /api/public/b2b/suppliers` -> `200`
- `/b2b` -> `200`
- `/products` -> `200`

Leakage classification checks:
- signed URL markers: not found
- private bucket path markers (`/storage/v1/object/private`): not found
- certificate document markers: not found
- private rich-profile identifiers (`businessEmail`, `cinNumber`, `udyamNumber`, `iecNumber`): not found
- QA verification values (`B2B1B displayName...`, `QA City B2B1B...`): not found
- public storage path marker (`/storage/v1/object/public/`): found only in public `logoUrl` context

## 6. Classification Decision

Classification:
- Separate follow-up, non-blocking for B2B1

Decision rationale:
- Public supplier logos are intentionally public and already part of public projection/display behavior.
- Observed URL form reveals implementation detail (public storage path), but runtime evidence did not show forbidden/private leakage classes.
- No evidence that this adjacent finding invalidates the B2B1 save/readback verification scope.

## 7. B2B1 Closure Decision

- B2B1 blocker scope: Company Profile save/readback with displayName path
- B2B1B fixed and deployed this blocker (`PUT` no longer 500 with displayName)
- B2B1C confirms adjacent logo URL finding does not block B2B1 closure
- B2B1 final status: VERIFIED

## 8. B2B1B Verification Status

- B2B1B remains verified for its scope
- Final enum retained: `FTR_SL_016B2B1B_FIXED_DISPLAYNAME_LEGACY_TENANT_MIRROR_WRITE_FAILURE`

## 9. Next Unit Readiness

- `FTR-SL-016B2C` can start next
- This unit does not start B2B1C successor work; it only confirms readiness

## 10. Adjacent Finding Disposition

- ID: `QA-MEDIA-003 / FTR-SL-015D`
- Title: Public media URL abstraction / logo storage-path hardening
- Priority: `P3`
- Status: `QUEUED`
- Launch class: `WATCH_ITEM`
- Blocking status: non-blocking for B2B1, B2C, and Company Profile save/readback closure

## 11. Validation Commands / Results

- `git diff --check -- governance/launch-readiness/FUTURE-TODO-REGISTER.md governance/launch-readiness/FTR-SL-016B2B1-B2B-COMPANY-PROFILE-RICH-FIELDS-UI-SAVE-READBACK-VERIFY-01.md governance/launch-readiness/FTR-SL-016B2B1B-TENANT-PROFILE-PUT-500-PERSISTENCE-FIX-01.md governance/launch-readiness/FTR-SL-016B2B1C-PUBLIC-LOGO-URL-ADJACENT-FINDING-DISPOSITION-AND-B2B1-CLOSE-01.md`
  - result: recorded after governance edits and before commit

## 12. Governance Commit / Push Proof

- Governance commit message target: `[TEXQTIC] governance: close B2B profile save-readback verification`
- Governance commit hash: recorded after commit in this unit
- Push status: recorded after push in this unit
- Final `git status --short`: recorded after push in this unit
