# TexQtic Impersonation Stop Server Session Lookup Remediation 001

## Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: server-side impersonation session lookup continuity only
- Status: implemented

## Opening Authority / Scope

- Authority baseline:
  - `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
  - `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
  - `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`
  - `governance/analysis/TEXQTIC-IMPERSONATION-STOP-PATH-INVESTIGATION-v1.md`
- This remediation stayed limited to the server-side impersonation lifecycle path needed to keep an active `impersonationId` resolvable across start, status, and stop.
- Adjacent client masking behavior was not broadened in this unit.

## Confirmed Defect Baseline

- impersonation start was already live and real
- active stored `impersonationId` failed status lookup with `404 SESSION_NOT_FOUND`
- stop failed on the same server-side lookup family
- the client restored control-plane context locally after the stop failure, masking the server error secondarily

## Root Cause

The impersonation start and stop service wrote admin audit entries inside the same transaction as the impersonation session row.

Those audit writes were hitting `audit_logs` RLS rejection in control-plane context. The audit helper swallowed the insert error, but the failure still poisoned the surrounding impersonation transaction, leaving the lifecycle in an unlawful partial state: start returned an `impersonationId`, tenant entry could proceed, but later status and stop could not resolve a durable session row by that id.

## Files Changed

- `server/src/services/impersonation.service.ts`
- `server/src/__tests__/wave3-realm-isolation.spec.ts`

## Fix Summary

1. Kept the impersonation session persistence path inside the existing server-side impersonation transaction.
2. Moved impersonation admin audit writes out of the session transaction in `server/src/services/impersonation.service.ts` so an `audit_logs` RLS failure cannot poison session persistence or later lookup continuity.
3. Tightened the focused impersonation lifecycle test so it now proves:
   - start returns an `impersonationId`
   - status succeeds while the session is active
   - stop succeeds on that same id
   - post-stop status shows the session ended lawfully

## Verification Evidence

Targeted verification performed:

- focused impersonation lifecycle test in `server/src/__tests__/wave3-realm-isolation.spec.ts`
- verification target sequence:
  - start -> `201`
  - status(active) -> `200`, `active=true`, `endedAt=null`
  - stop -> `200`
  - status(post-stop) -> `200`, `active=false`, `endedAt!=null`

## Residual Risk / Adjacent Findings

- client-side exit masking remains unchanged in this unit by design
- real-time tenant-token revocation semantics remain bounded by the existing stop-path architecture and were not changed here
- impersonation audit writes are now best-effort after session persistence instead of being attempted inside the same session transaction
- live production still requires deployment/runtime verification after this repo change before the earlier live `404` can be considered fully closed

## Close Recommendation

- deploy and run one bounded live verification of the impersonation lifecycle:
  - start
  - status while active
  - stop
  - status after stop
- if that passes, the server-session lookup defect can be considered remediated and the remaining client masking behavior can stay adjacent unless it still obscures operator truth materially

## Completion Checklist

- scope stayed limited to server-side impersonation session lookup continuity
- only minimum necessary files were changed
- status and stop now resolve correctly on an active impersonation id in targeted verification
- verification proves start -> status -> stop lifecycle
- no unrelated product areas were modified
- adjacent client masking behavior was not broadened
- governance remediation record created

## Guardrail Footer

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED
