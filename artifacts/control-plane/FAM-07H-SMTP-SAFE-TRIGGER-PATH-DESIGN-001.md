# FAM-07H SMTP Safe Trigger Path Design 001

**Unit ID:** FAM-07H-SMTP-SAFE-TRIGGER-PATH-DESIGN-001  
**Mode:** TECS Safe-Write audit/design only  
**Date (UTC):** 2026-05-30  
**Scope:** Repo-truth audit + narrow safe-path design only (no live send, no production POST, no source/test/schema/config/package/env/runtime mutation)

---

## 1. Unit ID and Mode

| Field | Value |
|---|---|
| Unit ID | FAM-07H-SMTP-SAFE-TRIGGER-PATH-DESIGN-001 |
| Mode | TECS Safe-Write audit/design only |
| Allowed write file | `artifacts/control-plane/FAM-07H-SMTP-SAFE-TRIGGER-PATH-DESIGN-001.md` |
| Runtime actions | Read-only only (no SMTP send, no production POST transaction) |
| Hard constraints | No secrets, no token printing/handling in artifacts, no hub edits in this unit |

---

## 2. Current HEAD and Branch

- Branch: `main`
- HEAD: `09e3d9ae`
- Worktree at unit start: clean

---

## 3. Preflight Results

Commands executed:

1. `git status --short`
2. `git rev-parse --short HEAD`
3. `git log --oneline -30`

Preflight result summary:

- `git status --short` produced no output (clean).
- HEAD confirmed: `09e3d9ae`.
- Required lineage commits confirmed present in log:
  - `09e3d9ae`
  - `dd9e56c2`
  - `116f7ab3`
  - `cd79582c`
  - `0f8be62b`
  - `8f3dd3f9`
  - `93de7cde`
  - `07c7e14d`

Preflight gate: **PASS**

---

## 4. Prior Retry Evidence Summary

### Retry 002

- Final enum: `FAM_07H_SMTP_RUNTIME_RETRY002_BLOCKED_APP_FLOW_FAILURE`
- Commit truth observed in repo log: `dd9e56c2`
- Result: Controlled request returned 401 before dispatch; no `emailDelivery.status` captured.

### Retry 003

- Final enum: `FAM_07H_SMTP_RUNTIME_RETRY003_BLOCKED_NO_SAFE_AUTH_PATH`
- Commit truth observed in repo log: `09e3d9ae`
- Result: No safe clean trigger path executed; no live send attempted.

### Current status carried forward

- HD-001: `VERIFIED_BLOCKED` (unchanged)
- FAM-07: `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED` (unchanged)
- FTR-LEGAL-003: `MVP_CRITICAL / OPEN` (unchanged)

---

## 5. Repo-Truth SMTP Dispatch Map

### A) Approved onboarding first-owner email path

1. Route: `POST /api/control/tenants/provision` via `server/src/routes/admin/tenantProvision.ts`
2. Request mode discriminator:
   - `provisioningMode: "APPROVED_ONBOARDING"` (approved onboarding branch)
   - `provisioningMode: "LEGACY_ADMIN"` or omitted (legacy branch)
3. Service creates invite artifact in approved onboarding branch:
   - `provisionTenant()` in `server/src/services/tenantProvision.service.ts`
   - returns `firstOwnerAccessPreparation.inviteToken`
4. SMTP call site:
   - `sendInviteMemberEmail(...)` fire-and-forget in `tenantProvision.ts`
   - invoked only when result mode is `APPROVED_ONBOARDING` and invite token exists
5. Dispatch engine:
   - `sendInviteMemberEmail` -> `sendEmail` in `server/src/services/email/email.service.ts`
   - production outcomes: `SENT` / `SKIPPED_SMTP_UNCONFIGURED` / throw -> `EMAIL_SEND_FAILED` log

### B) Tenant member invite email path

1. Route: `POST /api/tenant/memberships` in `server/src/routes/tenant.ts`
2. Auth/role gate:
   - tenant JWT + membership context
   - role must be OWNER or ADMIN
3. SMTP call site:
   - `sendInviteMemberEmail(...)` in route handler
   - failure handled as non-fatal with `FAILED_NON_FATAL`
4. Response includes delivery classification:
   - `emailDelivery.status` is returned to caller

### C) Tenant pending-invite resend path

1. Route: `POST /api/tenant/memberships/invites/:id/resend`
2. Auth/role gate:
   - tenant JWT + OWNER/ADMIN role
3. SMTP call site:
   - `sendInviteMemberEmail(...)`
4. Response includes `emailDelivery.status`

### D) Other existing email paths (not suitable for HD-001 verification)

- Password reset and email verification wrappers exist in `email.service.ts`, but are not the approved onboarding first-owner dispatch path for HD-001.

---

## 6. Existing Trigger Path Inventory

| Candidate path | Exists in repo | SMTP trigger potential | Practical safety for this objective | Notes |
|---|---|---|---|---|
| Control Plane Provision UI (`TenantRegistry` -> `provisionTenant`) | Yes | **No** (legacy mode path) | Safe UI, but wrong mode | UI payload only covers legacy fields; no approved-onboarding mode control surfaced |
| Control Plane tenant detail member section | Yes | No | Safe read-only | Explicitly read-only; no invite mutation actions |
| Tenant member invite UI (`InviteMemberForm`/`TeamManagement`) | Yes | Yes | Unsafe for this objective from SUPER_ADMIN-only session | Requires tenant-context auth + OWNER/ADMIN membership in target tenant |
| `POST /api/control/tenants/provision` with `APPROVED_ONBOARDING` | Yes | **Yes** | Technically valid; operationally risky if used directly as ad-hoc operator call | Creates tenant + invite side effects; currently no dedicated verification guardrail wrapper |
| Service-bearer call to same route | Yes | Yes | Secret-sensitive | Requires handling a secret bearer credential outside normal admin session path |

---

## 7. Auth-Path Inventory

| Path | Auth mode in code | Requires raw service token material | Triggerable from existing SUPER_ADMIN browser session alone | Repo-truth answer |
|---|---|---|---|---|
| `POST /api/control/tenants/provision` (`APPROVED_ONBOARDING`) | Either SUPER_ADMIN admin JWT or approved-onboarding service bearer | No (if using SUPER_ADMIN JWT path) | Not exposed in UI; API-level only | **Yes, API supports SuperAdmin-authenticated approved onboarding without service bearer** |
| `POST /api/control/tenants/provision` (`APPROVED_ONBOARDING`) service caller branch | Service bearer hash match | Yes | No | Restricted bearer path is implemented and valid |
| `POST /api/tenant/memberships` | Tenant JWT + OWNER/ADMIN | No | No (from pure control-plane session) | Not a control-plane/SUPER_ADMIN route |

Key correction from repo truth:

- The provisioning implementation does **not** restrict `APPROVED_ONBOARDING` exclusively to bearer mode.
- Restriction is one-way: if caller is a service caller, mode must be approved onboarding.
- SUPER_ADMIN JWT callers can still submit approved-onboarding payloads.

---

## 8. Secret-Safety Assessment

Primary secret-risk surfaces if runtime verification is executed via operator tooling:

1. Shell history and transcript capture
2. Terminal echo of Authorization headers
3. CI/log collectors retaining command-line arguments
4. Browser devtools/network capture screenshots
5. Artifact contamination via pasted headers/tokens

Mandatory secret-safe constraints for any future runtime unit:

- Never print or store bearer values.
- Do not paste secrets into markdown artifacts.
- Redact all auth headers from command snippets retained in evidence.
- Restrict evidence to masked recipient + status classification + bounded log events.
- Avoid browser-driven password/token entry workflows in recorded evidence paths.

Important security rule upheld:

- `APPROVED_ONBOARDING_SERVICE_TOKEN` remains a secret bearer credential and must not be treated as non-secret-equivalent.

---

## 9. Option Comparison Table

| Option | Feasibility (repo truth) | Security posture | Operational risk | Verdict |
|---|---|---|---|---|
| **A — Secure operator token handoff** | Feasible | Medium risk (secret handling lifecycle) | Risk of leakage in history/log/screenshot unless tightly controlled | **Viable fallback, not preferred primary path** |
| **B — Existing UI member-invite/operator path** | Not confirmed as safe for this objective | Better secret posture, but wrong auth/plane for SUPER_ADMIN-only clean trigger | Requires tenant-context role and/or impersonation; cross-tenant side-effect risk | **Rejected** |
| **C — Minimal code implementation path (admin-only safe verification trigger)** | Feasible and aligns with constraints | Strongest controllable secret and blast-radius posture | Requires small future implementation unit + tests | **Preferred** |
| **D — Modify existing Control Plane provisioning UI to expose approved mode** | Technically feasible | Broadens high-risk production operator surface | Risk of accidental real tenant creation/duplicate invites/wrong recipient confusion | **Rejected / deferred** |

---

## 10. Recommended Next Unit

**Recommended next unit:** `FAM-07H-SMTP-SAFE-VERIFICATION-TRIGGER-IMPLEMENTATION-001`

Recommendation basis:

1. Current UI does not expose a clean safe trigger for approved onboarding delivery verification.
2. Existing API can trigger approved onboarding under SUPER_ADMIN JWT, but using the full provisioning endpoint directly as ad-hoc runtime verification is high side-effect risk.
3. A narrow admin-only verification trigger can enforce:
   - one controlled recipient allowlist
   - one controlled send per run
   - masked evidence only
   - no raw token exposure
   - explicit feature flag and disable/remove plan after verification

Recommended minimal design characteristics for the future implementation unit:

- Control-plane admin-only route (SUPER_ADMIN only)
- feature-gated in production (default off)
- exactly one recipient gate (`p***@texqtic.com` masked in evidence)
- no invite-link/token body disclosure in response
- response includes only masked `emailDelivery.status` evidence envelope
- structured logs without secrets
- focused backend tests for auth gate, allowlist gate, mask discipline, single-send guard

---

## 11. Why Other Options Were Rejected or Deferred

### Option A deferred

- It can unblock runtime quickly, but introduces avoidable bearer-secret operational risk.
- Keep as fallback only if implementation authorization is delayed and Paresh explicitly approves secure out-of-band token handling.

### Option B rejected

- No existing control-plane UI mutation path can safely perform the required SMTP verification action in one bounded step.
- Tenant invite UI is tenant-plane and role-scoped, not a clean SUPER_ADMIN-only verification seam.

### Option D rejected

- Expands normal tenant provisioning UI semantics in production and increases accidental operator risk.
- Not minimal for a single verification objective.

---

## 12. Hub Impact Decision

**Hub impact:** `NO_HUB_UPDATE_REQUIRED`

Reason:

- This unit is audit/design only.
- No runtime verification transaction occurred.
- No HD-001 or FAM-07 status change occurred in this unit.
- No hub files were edited by authorization/scope.

---

## 13. Remaining FAM-07 Gates

1. HD-001 remains `VERIFIED_BLOCKED` until runtime delivery proof is captured.
2. FTR-LEGAL-003 remains `MVP_CRITICAL / OPEN`.
3. SMTP runtime verification still requires a safe bounded trigger execution unit.
4. FAM-07 remains `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED` and must not be marked `VERIFIED_COMPLETE`.
5. FTR-AUTH-004 remains `PILOT_REQUIRED / OPEN`.
6. FTR-AUTH-001 remains `PARTIAL` by governance convention.

---

## 14. Final Enum

`FAM_07H_SMTP_SAFE_TRIGGER_DESIGN_COMPLETE_IMPLEMENTATION_REQUIRED`
