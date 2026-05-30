# FAM-07H SMTP Safe Verification Trigger Runtime 002 Auth Path Verify

**Unit ID:** FAM-07H-SMTP-SAFE-VERIFICATION-TRIGGER-RUNTIME-002-AUTH-PATH-VERIFY  
**Mode:** TECS Safe-Write auth-path audit / verification  
**Date (UTC):** 2026-05-30

---

## 1. Unit ID and mode

| Field | Value |
|---|---|
| Unit ID | FAM-07H-SMTP-SAFE-VERIFICATION-TRIGGER-RUNTIME-002-AUTH-PATH-VERIFY |
| Mode | TECS Safe-Write auth-path audit / verification |
| Objective | Determine why production safe trigger call returned 401 before route execution and identify narrowest safe next action without sending SMTP |

---

## 2. Current HEAD/branch

- Branch: `main`
- HEAD at unit start: `b3acbb75`

---

## 3. Preflight results

Commands executed:

1. `git status --short`
2. `git rev-parse --short HEAD`
3. `git log --oneline -20`
4. `vercel whoami`
5. `vercel ls --scope tex-qtic`
6. `vercel inspect app.texqtic.com --scope tex-qtic`
7. `git rev-parse --short origin/main`
8. `git merge-base --is-ancestor 29b47e62 origin/main`

Results:

- Worktree at preflight start: clean.
- HEAD confirmed: `b3acbb75`.
- Required lineage commits confirmed present:
  - `b3acbb75`
  - `da068831`
  - `29b47e62`
  - `20990ec6`
  - `09e3d9ae`
  - `dd9e56c2`
  - `116f7ab3`
- Vercel identity/scope confirmed:
  - identity: `texqtic-connect`
  - active team: `tex-qtic`
- Deployment proof gate confirmed:
  - active production alias `app.texqtic.com` resolved to deployment `dpl_86MUrazom4UaYm6Cw7zSVesBBNbR`
  - `origin/main` = `b3acbb75`
  - `git merge-base --is-ancestor 29b47e62 origin/main` => `ANCESTOR_TRUE`

Preflight verdict: **PASS**

---

## 4. Prior runtime evidence summary

Prior deployed runtime unit (`...RUNTIME-001-RETRY-DEPLOYED`) established:

- Exactly one SMTP-triggering POST attempt made.
- Endpoint returned HTTP `401`.
- No `SMTP_VERIFICATION_TRIGGER_EXECUTED` log observed.
- No `EMAIL_SENT` / `EMAIL_SEND_FAILED` observed.
- Effective SMTP send attempts: `0`.
- Final enum: `FAM_07H_SMTP_SAFE_TRIGGER_RUNTIME_RETRY_DEPLOYED_BLOCKED_AUTH`.

---

## 5. Route auth stack map

Target route:

- `POST /api/control/tenants/smtp-verification-trigger`

Auth stack (repo-truth):

1. Global `onRequest` hooks (`server/src/index.ts`):
   - `tenantResolutionHook`
   - `realmHintGuardOnRequest`
2. Route-level `preHandler` in `server/src/routes/admin/tenantProvision.ts`:
   - `adminAuthMiddleware(request, reply)`
   - then `requireAdminRole('SUPER_ADMIN')`
3. Handler-level guard:
   - requires `request.isAdmin` and `request.adminId`
4. Only after body parse and allowlist pass does `sendEmail` execute.

Critical auth behavior:

- `adminAuthMiddleware` calls `request.adminJwtVerify()`.
- JWT admin realm is registered in `server/src/index.ts` without cookie mode options.
- Effective production path relies on admin bearer JWT material accepted by `adminJwtVerify`.

---

## 6. Working Control Plane auth comparison

Known working control-plane route:

- `GET /api/control/tenants`

Comparison outcome from live browser probes:

1. Cookie/session-only request style (`credentials: include`, no bearer header):
   - `GET /api/control/tenants` => `401`
2. Control-plane client style (bearer token + `X-Texqtic-Realm: control`):
   - `GET /api/control/tenants` => `200`
3. Verification route non-send probe, cookie-only:
   - `POST /api/control/tenants/smtp-verification-trigger` with invalid body `{}` => `401`
4. Verification route non-send probe, bearer+realm-hint:
   - `POST /api/control/tenants/smtp-verification-trigger` with invalid body `{}` => `400` (validation), proving auth passed and handler was reached without send.

Conclusion:

- Target route uses the same admin auth model as working control-plane routes.
- The failing runtime method used cookie-only/manual fetch semantics rather than the established control-plane bearer path.

---

## 7. Runtime 401 root-cause analysis

Root cause:

- Prior runtime call was executed as manual browser fetch with `credentials: include` but without the control-plane bearer JWT header flow used by the existing API client.
- Because `adminAuthMiddleware`/`adminJwtVerify` did not accept the request as authenticated admin context, request failed at auth gate with `401` before route execution.

Supporting live evidence:

- Same production session and same endpoint family showed:
  - cookie-only => `401`
  - bearer + realm hint => route access (`200` on control GET, `400` validation on non-send SMTP trigger probe)

Not root cause:

- Route prefix/mounting issue (endpoint clearly mounted; logs show direct route hits).
- SMTP/provider configuration (auth fails before send path).
- Recipient allowlist (not reached in `401` case).

---

## 8. Secret-safety assessment

- No tokens, cookies, or Authorization values recorded.
- No SMTP values recorded.
- No raw request headers recorded.
- Evidence captured only as status/accepted-vs-rejected outcomes.

Secret-safety verdict: **PASS**

---

## 9. Whether any production send occurred

- Any production SMTP send in this unit: **NO**

Safety controls used:

- No valid-recipient SMTP-triggering POST was executed.
- Only non-send auth probes were used.
- Verification-route POST probe used invalid body `{}` so handler returns validation error before any `sendEmail` call.

Bounded log evidence (`vercel logs ... --limit 25`):

- `GET /api/control/tenants` => `401` and `200` (comparison probes)
- `POST /api/control/tenants/smtp-verification-trigger` => `401` and `400`
- No `200` trigger execution evidence and no email send event evidence.

---

## 10. Recommended next unit

- `FAM-07H-SMTP-SAFE-VERIFICATION-TRIGGER-RUNTIME-003-AUTHENTICATED`

Required operator procedure for runtime-003 (no code change required):

1. Execute runtime call via existing control-plane API client path (or equivalent request that includes admin bearer auth material and control-plane realm hint).
2. Perform exactly one controlled POST to safe trigger route with approved recipient.
3. Do not retry automatically.

---

## 11. HD-001 status decision

- HD-001: **UNCHANGED**
- Remains: `VERIFIED_BLOCKED`

Reason:

- Auth-path was diagnosed, but SMTP delivery proof was not performed in this unit.

---

## 12. FAM-07 status decision

- FAM-07: **UNCHANGED**
- Remains: `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED`

Reason:

- This unit is auth-path verification only; no delivery confirmation.

---

## 13. Hub impact decision

`NO_HUB_UPDATE_REQUIRED`

Reason:

- Auth-path analysis alone does not establish runtime delivery proof.

---

## 14. Remaining FAM-07 gates

1. Execute runtime-003 using authenticated control-plane operator procedure.
2. Capture API/log/mailbox proof for exactly one successful SMTP verification delivery.
3. Keep FTR-LEGAL-003 tracked as `MVP_CRITICAL / OPEN`.

---

## 15. Final enum

`FAM_07H_SMTP_TRIGGER_AUTH_PATH_REQUIRES_OPERATOR_BROWSER_PROCEDURE`
