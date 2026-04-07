# TexQtic Impersonation Live Verification Supersession v1

## Header

- Date: 2026-04-07
- Type: bounded live verification supersession record
- Scope: impersonation lifecycle continuity only
- Status: current live production verification passes

## Authority Baseline

- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
- `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`
- `governance/analysis/TEXQTIC-IMPERSONATION-STOP-PATH-INVESTIGATION-v1.md`
- `governance/analysis/TEXQTIC-IMPERSONATION-STOP-SERVER-SESSION-LOOKUP-REMEDIATION-001.md`
- `governance/analysis/TEXQTIC-POST-DEPLOY-IMPERSONATION-LIFECYCLE-RUNTIME-RECHECK-v1.md`

## Earlier Live-Failure Record Being Superseded

The earlier bounded live-failure record is:

- `governance/analysis/TEXQTIC-POST-DEPLOY-IMPERSONATION-LIFECYCLE-RUNTIME-RECHECK-v1.md`

That artifact recorded the following live-failure shape as of its own pass:

- start -> `201`
- active status -> `404 SESSION_NOT_FOUND`
- stop -> `404`
- post-stop status -> `404`

That artifact remains valid historical evidence of that earlier pass.

It is no longer the best current runtime truth for impersonation lifecycle continuity because newer live evidence from a later bounded continuation pass now conflicts with it and is stronger as present-tense runtime truth.

## Fresh Live Verification Evidence

### A. Direct Admin-Auth Production API Pass

Fresh live verification was run directly against production control-plane impersonation endpoints using the active admin-auth production session.

Tenant used:

- tenant name: `B2C Browse Proof 20260402080229`
- tenant id: `743c73aa-1b55-4560-a018-e8e554ca65f6`
- target user id: `170eefb2-2066-48dc-b5b9-5165853726a6`
- acting admin id: `16758750-1f22-4c5e-a2a5-c18a1132efa1`

Direct API lifecycle evidence:

- start -> `201`
- returned impersonation id: `5bb60a4c-5f4b-4c08-8eb0-4a4ea0409143`
- active status -> `200`
- active status payload showed:
  - `active = true`
  - `endedAt = null`
- stop -> `200`
- post-stop status -> `200`
- post-stop status payload showed:
  - `active = false`
  - `endedAt != null`

Token continuity evidence from that same pass:

- issued token carried matching impersonation metadata
- decoded token included:
  - `isImpersonation = true`
  - `impersonatorAdminId = 16758750-1f22-4c5e-a2a5-c18a1132efa1`
  - `impersonationId = 5bb60a4c-5f4b-4c08-8eb0-4a4ea0409143`

Audit continuity evidence from that same pass:

- control-plane audit logs returned `200`
- matching `IMPERSONATION_START` and `IMPERSONATION_STOP` entries were present for the same impersonation id
- observed related audit entries included:
  - `IMPERSONATION_START` for entity id `5bb60a4c-5f4b-4c08-8eb0-4a4ea0409143`
  - `IMPERSONATION_STOP` for entity id `5bb60a4c-5f4b-4c08-8eb0-4a4ea0409143`

### B. Fresh Production UI Pass

Fresh live verification was also run through the actual production UI flow on the same tenant.

UI start evidence:

- UI called `/api/control/impersonation/start`
- result -> `201`
- returned impersonation id in the UI-start flow: `203ab128-d2da-4293-b7c7-239de6f52a78`
- tenant shell loaded successfully
- staff impersonation banner rendered visibly
- persisted impersonation session state was present in local storage after start

UI tenant continuity evidence:

- tenant cart request -> `200`
- tenant catalog request -> `200`
- `/api/me` -> `200`

UI stop evidence:

- UI called `/api/control/impersonation/stop`
- result -> `200`
- control-plane shell restored cleanly
- persisted impersonation session state was cleared after exit
- auth realm returned to `CONTROL_PLANE`

### C. Repo / Worktree Posture During This Pass

- no product remediation was performed
- no files were changed
- no files were staged
- no commit was made

## Current Runtime Truth Judgment

Current live production verification now supports impersonation lifecycle continuity as working.

The best current bounded runtime truth from this pass is:

- direct admin-auth production API verification passed end to end
- fresh production UI verification passed end to end
- matching control-plane audit evidence existed for the direct API pass
- no current live reproduction of the earlier `404 SESSION_NOT_FOUND` status/stop failure was observed in this pass

This pass does not prove the exact historical cause of the earlier failed live pass, and no speculation about that historical cause is made here.

## Supercession Statement

`governance/analysis/TEXQTIC-POST-DEPLOY-IMPERSONATION-LIFECYCLE-RUNTIME-RECHECK-v1.md` is superseded as current runtime truth for impersonation lifecycle continuity.

It remains a historical record of an earlier bounded live pass, but it is no longer the controlling present-tense runtime truth because newer live production evidence now shows:

- start working live
- status while active working live
- stop working live
- post-stop status working live
- UI continuity working live

Accordingly:

- the earlier failed post-deploy impersonation runtime recheck is superseded as current runtime truth
- current live production verification now supports impersonation lifecycle continuity as working
- no product remediation was performed in this pass
- no opening authority was created in this pass

## Posture / Non-Opening Statement

- This was a no-edit verification-record step only.
- No product files were modified.
- No remediation was reopened.
- No auth redesign was undertaken.
- No governance selection was resumed.
- No prior artifact was altered; the earlier failed live artifact is only referenced as superseded by newer evidence.

## Recommended Next Step

Preserve this supersession record as the bounded runtime-truth update for impersonation continuity, then continue the runtime/audit lane in the established order:

- run the DPP known-good-node runtime proof
- then fix the control-plane audit filter/search wiring gap
- then investigate slow-load class issues

## Footer

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED
