# TexQtic Post-Deploy Impersonation Lifecycle Runtime Recheck v1

## Header

- Date: 2026-04-07
- Type: bounded post-deploy runtime recheck
- Scope: impersonation lifecycle only
- Status: defect reproduces live

## Authority Baseline

- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
- `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`
- `governance/analysis/TEXQTIC-IMPERSONATION-STOP-SERVER-SESSION-LOOKUP-REMEDIATION-001.md`

## Scope / Non-Scope

### In Scope

- impersonation start
- impersonation status while active
- impersonation stop
- post-stop status behavior

### Out of Scope

- product-code changes
- new investigation branching
- token revocation semantics beyond the bounded lifecycle check
- unrelated control-plane or tenant runtime review
- opening authority

## Method

- Live runtime target: `https://app.texqtic.com/`
- Starting state: authenticated control-plane session already active
- Tenant used for the bounded check: `B2C Browse Proof 20260402080229`
- Evidence capture method:
  - page-level request instrumentation for live fetch status capture
  - direct read of stored impersonation session state after start
  - direct status fetch against the stored active `impersonationId`

## Runtime Evidence Summary

| Step | Result | Evidence |
| --- | --- | --- |
| Start | `201` | `POST /api/control/impersonation/start -> 201` |
| Stored impersonation id behavior | persisted but not resolvable | stored `impersonationId = 4554c593-0b29-4b34-aa4f-c316a072786e` was present in persisted impersonation state after start |
| Status while active | `404 SESSION_NOT_FOUND` | `GET /api/control/impersonation/status/4554c593-0b29-4b34-aa4f-c316a072786e -> 404` while the staff impersonation banner was visibly active |
| Stop | `404 SESSION_NOT_FOUND` | `POST /api/control/impersonation/stop -> 404` |
| Post-stop status | `404 SESSION_NOT_FOUND` | `GET /api/control/impersonation/status/4554c593-0b29-4b34-aa4f-c316a072786e -> 404` after exit |

## Detailed Live Pass

### 1. Start

- Control-plane session was already live at `Tenant Registry`.
- The visible impersonation action was triggered from the `B2C Browse Proof 20260402080229` tenant row.
- The impersonation modal opened and the reason field was filled.
- Live request result:
  - `POST /api/control/impersonation/start` -> `201`
- Visible UI result:
  - the app entered tenant context
  - the staff impersonation banner rendered
  - the tenant shell loaded normally

### 2. Stored Session Behavior

- After start, persisted impersonation state existed in local storage.
- The stored session contained an active `impersonationId`:
  - `4554c593-0b29-4b34-aa4f-c316a072786e`
- The persisted state proved that the client still believes a live impersonation session exists after start.

### 3. Status While Active

- While the staff impersonation banner was still visible and tenant context was active, status was checked directly on the stored active id.
- Live request result:
  - `GET /api/control/impersonation/status/4554c593-0b29-4b34-aa4f-c316a072786e` -> `404`
- Response body:
  - `SESSION_NOT_FOUND`
- This means the prior defect is not gone in live production.
- The previously remediated expected behavior from repo validation was not observed in deployment.

### 4. Stop

- Exit was triggered from the active impersonated tenant shell.
- Live request result:
  - `POST /api/control/impersonation/stop` -> `404`
- Response behavior remained consistent with the prior defect family.

### 5. Post-Stop Status

- After exit returned the UI to control-plane context, status was checked again on the same stored id.
- Live request result:
  - `GET /api/control/impersonation/status/4554c593-0b29-4b34-aa4f-c316a072786e` -> `404`
- Response body remained:
  - `SESSION_NOT_FOUND`

## Defect Closure Result

The previously observed live impersonation lifecycle defect is not closed in production.

Most important bounded truths from this recheck:

- start remains live and real
- the stored active `impersonationId` still fails status lookup with `404 SESSION_NOT_FOUND`
- stop still fails on the same family with `404`
- post-stop status remains `404 SESSION_NOT_FOUND`

So the previously observed `404 SESSION_NOT_FOUND` behavior is not gone; it reproduces live after the supposed deployment.

## UI Masking Observation

- UI masking still remains present and unsurprising relative to prior truth.
- After the failed stop call, the UI still restored control-plane context locally.
- No new unexpected masking behavior beyond that prior known local recovery was observed in this bounded pass.

## Recheck Conclusion

- This was a bounded post-deploy runtime recheck only.
- The live runtime result does not confirm closure.
- Production still exhibits the exact impersonation lifecycle continuity failure that the remediation record was intended to resolve.

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED
