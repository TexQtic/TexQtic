# TEXQTIC - LAUNCH READINESS ACCELERATION MOBILE SHELL NAVIGATION CONTINUITY WORK ITEM 005 - 2026-04-12

Status: bounded execution record
Date: 2026-04-12
Labels: ACCELERATION-ONLY; EVIDENCE-CANDIDATE; NOT-FOR-GOVERNANCE-PROMOTION

## 1. purpose and bounded scope

This artifact records the bounded Work Item 005 deployment-source parity investigation for the
exact QA B2B handheld shell/navigation continuity gap previously established in Work Item 004.

Its purpose is strictly limited to:

1. determining whether the currently served QA B2B bundle is simply older than the Work Item 001
   handheld fallback implementation commit
2. determining whether current repo evidence instead points to deployment-source divergence,
   branch/source mismatch, build-input mismatch, or stale promoted artifact state
3. determining whether `metadata.json`, `vercel.json`, `vite.config.ts`, `package.json`, or other
   available repo-side deployment evidence can identify the exact deployed source revision or build
   lineage
4. classifying the smallest lawful next deployment-side action without widening into repo-side
   mobile correction

This pass is bounded deployment-source investigation only.

It does not widen into Aggregator, B2C, WhiteLabel, or WhiteLabelAdmin parity, secondary table or
modal adaptivity, repo-wide responsive redesign, shell-family widening, deployment repair
execution, Vercel dashboard mutation, or any repo-side mobile correction.

## 2. preflight result

Exact command run:

`git diff --name-only; git status --short`

Result:

- no output
- repo clean before execution

## 3. exact files read

The exact files read or directly inspected in this pass were:

1. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-001-2026-04-12.md`
2. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-003-2026-04-12.md`
3. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-004-2026-04-12.md`
4. `App.tsx`
5. `layouts/Shells.tsx`
6. `runtime/sessionRuntimeDescriptor.ts`
7. `tests/runtime-verification-tenant-enterprise.test.ts`
8. `metadata.json`
9. `vercel.json`
10. `vite.config.ts`
11. `package.json`
12. `.github/workflows/runtime-parity-preview.yml`

Additional targeted inspection confirmed:

1. `App.tsx` still resolves B2B experience sessions through `B2BShell`
2. `runtime/sessionRuntimeDescriptor.ts` still maps `b2b_workspace` directly to `B2BShell`
3. `layouts/Shells.tsx` still mounts `MobileShellMenu` inside `B2BShell` with
   `title="workspace navigation menu"`
4. focused test truth still expects `data-mobile-nav="b2b"` in current repo state
5. `metadata.json` exposes no commit, build hash, or source-revision lineage marker
6. `vercel.json` exposes a build command and output directory only; it does not expose a source
   revision marker, branch pin, or promoted deployment identifier
7. `vite.config.ts` is minimal and does not inject build or revision metadata into the frontend
   bundle
8. `package.json` exposes root build script `tsc && vite build` and no revision-stamping step
9. `.github/workflows/runtime-parity-preview.yml` proves a manual preview deploy-from-source path,
   but no repo-tracked production Vercel deploy or promotion workflow was discovered in
   `.github/workflows/**`
10. no `.vercel/` linkage directory was present in the repo snapshot inspected in this pass

## 4. exact runtime environment used

No new live runtime environment was exercised in this pass.

This pass was repo-truth and deployment-lineage investigation only.

The exact live runtime truth carried forward from Work Item 004 was:

1. already-authenticated manual session handoff on `https://app.texqtic.com/`
2. active browser page title `QA B2B | TexQtic B2B Workspace`
3. deployed asset references observed there:
   - `https://app.texqtic.com/assets/index-B9cJaR0R.js`
   - `https://app.texqtic.com/assets/index-DSQGhBe4.css`
4. live JS header evidence from that pass:
   - `last-modified = Mon, 13 Apr 2026 01:54:00 GMT`
   - `x-vercel-cache = HIT`
5. live bundle-content evidence from that pass:
   - `hasWorkspaceMenuString = false`
   - `hasMobileNavString = false`
   - `hasOpenWorkspaceNavigationMenu = false`
   - `hasCatalogString = false`
   - `hasMembersString = false`

## 5. exact files changed

The exact files changed in this pass are:

1. `governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-005-2026-04-12.md`

## 6. whether older-deployment explanation, deployment-source divergence, or unresolved gap was found

The simple older-deployment explanation was not supported.

Deployment-source parity gap was found.

Exact result:

1. current repo truth still contains the Work Item 001 B2B handheld fallback in the controlling
   B2B shell path
2. both `main` and `origin/main` currently contain the Work Item 001 implementation commit
   `2f7d63a`
3. the live JS bundle observed in Work Item 004 reports `last-modified = Mon, 13 Apr 2026
   01:54:00 GMT`, which is later than the Work Item 001 implementation commit timestamp and later
   than the current `origin/main` tip timestamp observed in this pass
4. despite that later deployed-bundle timestamp, the live JS bundle still lacks the B2B handheld
   fallback strings that current repo truth requires
5. current repo-side config does not expose an embedded source revision marker that can name the
   exact production source commit behind the served bundle
6. current repo-tracked automation proves only a manual preview deploy-from-source workflow and does
   not prove the production project, production branch, or production promotion path behind
   `https://app.texqtic.com/`
7. the narrowest truthful explanation is therefore production deployment-source divergence,
   branch/source mismatch, or stale promoted artifact state outside repo-tracked automation, not a
   repo-side regression and not simply a deployment older than the fallback implementation commit

## 7. exact classification outcome

`DEPLOYMENT-SOURCE-PARITY-GAP - the live QA B2B bundle observed in Work Item 004 is timestamped later than the Work Item 001 handheld fallback implementation and later than the current origin/main tip, yet still lacks the B2B handheld fallback strings that current repo truth requires; repo-side config carries no production source-revision marker and repo-tracked automation only proves a manual preview deploy path, so the smallest truthful explanation is production deployment-source divergence / branch-source mismatch or stale promoted artifact state outside repo-tracked automation, not a repo-side regression and not simply an older deployment than the implementation commit`

Why this classification is exact:

1. `git branch -a --contains 2f7d63a` returned `main`, `remotes/origin/HEAD -> origin/main`, and
   `remotes/origin/main`, proving the Work Item 001 implementation commit is already present in the
   remote-tracked main lineage
2. `git log --pretty=format:"%h %cI %d %s" -n 6` showed `2f7d63a` at
   `2026-04-12T22:37:59+05:30` and `origin/main` at `0280d7b` with timestamp
   `2026-04-12T23:28:42+05:30`
3. Work Item 004 already established that the live JS asset served to QA B2B reported
   `last-modified = Mon, 13 Apr 2026 01:54:00 GMT`, which is later than both of those repo-side
   commit times when normalized to UTC
4. that same live JS asset still lacked `workspace navigation menu`, `Open workspace navigation
   menu`, `data-mobile-nav`, `Catalog`, and `Members`, all of which are expected from current repo
   truth
5. `metadata.json`, `vercel.json`, `vite.config.ts`, and `package.json` expose no commit hash,
   release ID, build ID, or embedded production source lineage marker capable of identifying the
   exact served source revision
6. `.github/workflows/runtime-parity-preview.yml` is explicitly a manual preview deployment path
   and no repo-tracked Vercel production deploy or promotion workflow was discovered in
   `.github/workflows/**`
7. because repo truth still contains the fix while the served bundle is later-timestamped yet still
   missing the fix, the repo evidence supports deployment-source divergence more narrowly than a
   generic stale-cache or older-deploy explanation

Smallest lawful next action:

1. verify in Vercel deployment metadata or dashboard that the production project behind
   `https://app.texqtic.com/` is linked to this repository and to the intended production branch
2. if that linkage is correct, redeploy production from the current remote-tracked main lineage
   that already contains `2f7d63a`
3. if that linkage is not correct, correct the production project/repo/branch mapping first and
   then redeploy
4. do not widen into repo-side mobile correction until production source parity is established

## 8. exact bounded proof added

No bounded code fix was added.

The exact bounded proof added in this pass is:

1. repo-lineage proof that `main` and `origin/main` already contain the Work Item 001
   implementation commit `2f7d63a`
2. repo-chronology proof that the Work Item 001 implementation commit and the current `origin/main`
   tip both predate the later live JS bundle timestamp carried forward from Work Item 004
3. repo-config proof that `metadata.json`, `vercel.json`, `vite.config.ts`, and `package.json` do
   not expose a production source revision marker
4. repo-automation proof that the only discovered Vercel workflow in the repo is a manual preview
   deploy-from-source path
5. carry-forward live-runtime proof that the later-timestamped deployed bundle still lacks the B2B
   handheld fallback strings present in repo truth

## 9. exact checks run and results

Exact checks and observed results used in this pass:

1. preflight check
   - command: `git diff --name-only; git status --short`
   - result: no output
   - result: repo clean at start of the pass
2. recent commit-lineage check
   - command: `git log --oneline --decorate --graph -n 12`
   - key result lines:
     - `244b296 (HEAD -> main) [TEXQTIC] governance: close out Work Item 004 runtime rerun`
     - `0280d7b (origin/main, origin/HEAD) [TEXQTIC] governance: close out Work Item 003 deployment mismatch record`
     - `2f7d63a prompt-mobile-wi001 implement handheld shell navigation continuity`
3. exact recent commit timestamp check
   - command: `git log --pretty=format:"%h %cI %d %s" -n 6`
   - key result lines:
     - `244b296 2026-04-13T07:35:29+05:30  (HEAD -> main) [TEXQTIC] governance: close out Work Item 004 runtime rerun`
     - `0280d7b 2026-04-12T23:28:42+05:30  (origin/main, origin/HEAD) [TEXQTIC] governance: close out Work Item 003 deployment mismatch record`
     - `2f7d63a 2026-04-12T22:37:59+05:30  prompt-mobile-wi001 implement handheld shell navigation continuity`
4. main-lineage containment check
   - command: `git branch -a --contains 2f7d63a`
   - result:
     - `* main`
     - `  remotes/origin/HEAD -> origin/main`
     - `  remotes/origin/main`
5. workflow and linkage search
   - search scope: `.github/workflows/**`
   - result: Vercel-related workflow matches were found only in `.github/workflows/runtime-parity-preview.yml`
   - result: no repo-tracked `vercel deploy --prod` or other Vercel production deployment workflow was discovered
6. local Vercel linkage directory search
   - search scope: `.vercel/**`
   - result: no files found
7. config-surface inspection
   - `metadata.json`: no commit or build lineage marker present
   - `vercel.json`: build command = `npm install && cd server && npm install && cd .. && npm run build`; output directory = `dist`
   - `vite.config.ts`: no build hash or revision injection present
   - `package.json`: root build script = `tsc && vite build`; no revision-stamping step present
8. carry-forward live-runtime evidence from Work Item 004
   - result: JS asset = `https://app.texqtic.com/assets/index-B9cJaR0R.js`
   - result: JS `last-modified = Mon, 13 Apr 2026 01:54:00 GMT`
   - result: `hasWorkspaceMenuString = false`
   - result: `hasMobileNavString = false`
   - result: `hasOpenWorkspaceNavigationMenu = false`
   - result: `hasCatalogString = false`
   - result: `hasMembersString = false`

## 10. code-truth established

The bounded code-truth established in this pass is:

1. `App.tsx` still resolves B2B tenant experience sessions into `B2BShell`
2. `runtime/sessionRuntimeDescriptor.ts` still maps `b2b_workspace` to `B2BShell`
3. `layouts/Shells.tsx` still mounts `MobileShellMenu` in the B2B shell header with
   `shellId="b2b"`
4. the current B2B mobile-menu configuration in repo truth still includes unconditional `Catalog`
   and `Members` entries
5. focused test truth still expects `data-mobile-nav="b2b"` in current repo state
6. `main` and `origin/main` both already contain commit `2f7d63a`, so the remote-tracked main
   lineage already contains the handheld fallback implementation
7. current repo truth therefore still says the B2B handheld fallback should be present in any
   production deployment sourced from the intended main lineage

## 11. UI/runtime/deployment truth established

The bounded UI/runtime/deployment truth established in this pass is:

1. the live JS asset previously served to QA B2B was later than the Work Item 001 implementation
   commit and later than the current `origin/main` tip observed in this pass
2. that later-timestamped live bundle still lacked the B2B handheld fallback strings present in
   repo truth
3. current repo-side metadata and build config cannot identify the exact source revision behind the
   served production bundle
4. current repo-tracked automation proves a preview deploy path from source but does not prove the
   production project linkage or production promotion path for `https://app.texqtic.com/`
5. the narrowest truthful explanation is therefore production deployment-source divergence,
   branch/source mismatch, or stale promoted artifact state outside repo-tracked automation
6. this pass does not claim anything about Aggregator, B2C, WhiteLabel, or WhiteLabelAdmin

## 12. governance-state statement

Governance state unchanged: yes.

The downstream governance-family posture remains frozen under
`HOLD-FOR-BOUNDARY-TIGHTENING`.

Layer 0 remains read-only.

## 13. recording artifact path updated

`governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-005-2026-04-12.md`

## 14. final git diff --name-only

Exact final output observed at the end of this pass:

- no output

## 15. final git status --short

Exact final output observed at the end of this pass:

- `?? governance/analysis/TEXQTIC-LAUNCH-READINESS-ACCELERATION-MOBILE-SHELL-NAVIGATION-CONTINUITY-WORK-ITEM-005-2026-04-12.md`

## 16. commit hash if any

No commit created in this pass.

Reason:

1. this pass was bounded deployment-source investigation and recording only
2. no deployment action or repo-side correction was attempted
3. any later artifact-only closeout commit should be handled separately if requested

## 17. final verdict for Mobile Shell/Navigation Continuity Work Item 005

`WORK-ITEM-005-DEPLOYMENT-SOURCE-PARITY-GAP-OLDER-DEPLOY-EXPLANATION-NOT-SUPPORTED`

Interpretation:

1. the available repo and runtime evidence no longer supports the narrow explanation that QA B2B is
   merely serving a deployment older than the Work Item 001 handheld fallback commit
2. the remote-tracked main lineage already contains the handheld fallback implementation
3. the later-timestamped live bundle still lacks the handheld fallback strings required by that
   lineage
4. current repo-side config cannot identify the exact production source revision behind the served
   bundle
5. the smallest lawful next action is deployment-source verification and production redeploy from
   the correct repo/branch lineage, not another repo-side mobile correction