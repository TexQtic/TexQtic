# FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001

## 1. Task Identity

| Field | Value |
|---|---|
| Task ID | FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001 |
| Date | 2026-05-28 |
| Mode | GOVERNANCE VERIFICATION PLANNING ONLY — documentation and production-smoke planning; no implementation; no status advancement; no tracker edits |
| Branch | main |
| Start HEAD | bc504b3d7cf06b91a7974a9c8678ecab27fd5a6a |
| Authorization | Paresh (explicit verification planning prompt authorization) |
| Layer 0 Gate for FAM-10 | NONE — `LAUNCH-FAMILY-INDEX.md` §5 records `L0 Gate: NO` for FAM-10 |
| Production execution authorization | NOT GRANTED — this planning artifact does not authorize execution; execution requires separate explicit Paresh authorization via `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001` |

---

## 2. Inputs Inspected

| File | Status | Purpose |
|---|---|---|
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | READ ✅ | FAM-10 row, status, L0 gate, cycle number |
| `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-FAMILY-OPENING-AUDIT-001.md` | READ ✅ | Carry-forward audit state; 9 §12 surfaces; readiness verdict |
| `artifacts/control-plane/FTR-CP-001-PARENT-VERIFY-CLOSE-001.md` | READ ✅ | Prior close evidence; 10 units; 133 tests; accepted risks |
| `governance/control/NEXT-ACTION.md` | READ ✅ | Layer 0 active posture: `HOLD_FOR_AUTHORIZATION` (TTP counsel); no FAM-10 hold |
| `governance/control/BLOCKED.md` | READ ✅ | Active blockers; none apply to FAM-10 |
| `server/src/routes/control.ts` | READ ✅ | Archive, onboarding outcome, activation route bodies and guards |
| `server/src/routes/admin/impersonation.ts` | READ ✅ | Impersonation start/stop/status; body schemas; SUPER_ADMIN gates |
| `server/src/config/controlPlaneTenantReadExclusions.ts` | READ ✅ | Protected slug list; preserved-no-delete list; archive guard function |

---

## 3. Current FAM-10 State

| Field | Value |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` status | `NOT_ASSESSED` |
| Audit verdict (FAM-10-FAMILY-OPENING-AUDIT-001) | `IMPLEMENTATION_COMPLETE` |
| Test evidence | 133 tests PASS across 10 FTR-CP-001 bounded units |
| TypeScript | EXIT 0 (from FTR-CP-001) |
| Prisma validate | PASS (from FTR-CP-001) |
| Production smoke (read paths) | PRODUCTION_CONFIRMED — tenant registry and detail read at `https://app.texqtic.com` (HARDENING-001) |
| Production smoke (mutation paths) | NOT DONE — archive, impersonation, activation, onboarding outcome not yet production-smoked |
| Layer 0 blockers | NONE applicable to FAM-10 |
| Implementation gaps | NONE identified |
| Outstanding accepted risks | R-005: impersonation token revocation gap (ACCEPTED_MVP_RISK / DEFERRED; 30-min TTL is primary mechanism) |

**FAM-10 status does NOT advance in this planning prompt.**
Status remains `NOT_ASSESSED` in `LAUNCH-FAMILY-INDEX.md` until a verified-close artifact establishes `VERIFIED_COMPLETE`.

---

## 4. Audit Carry-Forward Summary

The audit established the following production verification requirements before FAM-10 can close:

| Surface | Evidence Level at Audit | Gap | Verification Requirement |
|---|---|---|---|
| Tenant list read | PRODUCTION_CONFIRMED | NONE | Confirm still reachable and well-formed |
| Tenant detail read | PRODUCTION_CONFIRMED | NONE | Confirm membership array present |
| Protected tenant archive guard | TEST_CONFIRMED (frontend) | No live guard smoke | Confirm POST archive on protected slug → 409 (no mutation) |
| Tenant archive mutation | TEST_CONFIRMED only | No production smoke | Smoke on SAFE expendable test tenant only |
| Onboarding outcome recording | TEST_CONFIRMED only | No production smoke | Smoke on PENDING_VERIFICATION test tenant |
| Activation (APPROVED → ACTIVE) | TEST_CONFIRMED only | No production smoke | Smoke on VERIFICATION_APPROVED test tenant |
| Impersonation start/stop/status | TEST_CONFIRMED only | No production smoke | Start + status + stop on QA test org only |
| Audit log read | TEST_CONFIRMED only | No production smoke | Confirm audit entries appear after mutations |
| Admin whoami | PRODUCTION_CONFIRMED (implicit) | NONE | Confirm admin identity and role present in response |
| System health | PRODUCTION_CONFIRMED (implicit) | NONE | Confirm GET /system/health returns 200 |

---

## 5. Verification Objective

The production verification pass has the following goals:

1. Confirm FAM-10 in-scope routes are reachable and correctly gated at `https://app.texqtic.com`
2. Smoke-test mutation surfaces (archive, onboarding outcome, activation, impersonation) against the live database using SAFE, NON-PRODUCTION test tenants only
3. Confirm audit log entries are written after each mutation step
4. Confirm admin identity (whoami) and RBAC registry are readable
5. Confirm the protected tenant archive guard returns 409 before any mutation on protected slugs
6. Produce a machine-verifiable evidence record for `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001`

This pass will elevate mutation surfaces from `TEST_CONFIRMED` to `PRODUCTION_CONFIRMED`,
enabling FAM-10 advancement to `VERIFIED_COMPLETE`.

---

## 6. Access and Session Safety Rules

The following rules apply to the full verification pass. They are non-negotiable.

| Rule | Detail |
|---|---|
| Admin session | SUPER_ADMIN admin JWT required for all mutation steps; all other operations require at minimum a valid admin JWT |
| Auth mechanism | Admin JWT — obtained via admin login; used in `Authorization: Bearer <token>` header |
| **Secrets policy: NEVER PRINT** | Admin JWT token, any user JWT, DB URLs, passwords, API keys, `.env` contents — MUST NOT appear in any evidence output or artifact |
| Token reference in artifacts | Use `[ADMIN_JWT_REDACTED]` or `"token": "<REDACTED>"` only |
| No browser-driven password flows | Admin password MUST NOT be submitted via any automated test; admin must authenticate manually in browser or via curl with manually obtained JWT |
| No secrets in artifacts | The verify-close artifact MUST NOT contain any token, password, key, URL with credentials, or `.env` value |
| Impersonation JWT | The JWT returned by impersonation start MUST NOT be printed, logged, or recorded in any artifact; record only `impersonationId` and `expiresAt` |
| RLS safety | All mutations operate through the control-plane `withOrgAdminWriteContext` helper; control-plane operations BYPASS RLS by design — use only test targets |

---

## 7. Safe Data Fixture Requirements

### 7.1 Forbidden Targets (Never Use for Mutations)

The following tenants MUST NOT be touched by any mutation step.
They are either production customers, QA infrastructure dependencies, or protected by `isProtectedTenantArchiveTarget()`.

| Category | Slugs / Identifiers | Reason |
|---|---|---|
| **Archive-protected slugs** (returns 409 at API) | `qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`, `white-label-co` | Blocked by `protectedTenantArchiveSlugs` in `control.ts` |
| **Archive-protected name** | Tenant with `name = "WHITE LABEL CO"` | Blocked by `protectedTenantArchiveNames` in `control.ts` |
| **Preserved no-delete slugs** | `qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`, `white-label-co`, `wl-verify-s1-20260328-0510`, `wl-verify-s1-20260328-0445`, `wl-verify-s1-20260328-0440`, `shraddha-industries`, `acme-corp-live-verify`, `ops-casework-seller-681cd6f6`, `ops-casework-buyer-e13b66cb`, `test-tenant-f527b7d2-*`, `test-tenant-wave2-*` | Preserved QA infrastructure; ops casework tenants |
| **Any production customer tenant** | Any tenant with `type = B2B` or `type = B2C` that is not a test tenant | Real customer data |

### 7.2 Required Safe Data Fixtures

The following fixtures must be confirmed BEFORE any mutation step is executed.
If any fixture is missing or in incorrect state, stop and create a `FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001` prompt first.

| Fixture | Required Condition | Purpose | Stop if Missing |
|---|---|---|---|
| **Archive candidate** | An expendable test tenant slug (UUID-based), NOT in any forbidden list, that Paresh confirms is safe to permanently archive (org → CLOSED, tenant → CLOSED) | Step C archive smoke | YES — archive is IRREVERSIBLE |
| **Outcome recording candidate** | A test tenant in `organizations.status = PENDING_VERIFICATION` that Paresh confirms is safe to mutate | Step D onboarding outcome recording | YES |
| **Activation candidate** | A test tenant in `organizations.status = VERIFICATION_APPROVED` that Paresh confirms is safe to activate | Step E activation smoke | YES (or use outcome candidate from Step D if APPROVED outcome was recorded) |
| **Impersonation candidate** | An ACTIVE QA/test org with at least one non-sensitive user in `Membership` table; the user's `userId` must be a test/QA account not belonging to a real customer | Step F impersonation start | YES — userId must be confirmed as non-sensitive |

> **Note on D→E compound flow:** If a suitable VERIFICATION_APPROVED tenant does not exist, Step D can record `outcome: APPROVED` on the PENDING_VERIFICATION test tenant (transitioning it to `VERIFICATION_APPROVED`), and Step E can then activate that same tenant (transitioning to `ACTIVE`). This is a valid compound flow. Paresh must explicitly confirm this path is acceptable if followed.

> **Archive is irreversible via the control-plane surface.** Once archived, the tenant's `organizations.status` and `tenant.status` are both set to `CLOSED`. There is no reverse route in the control plane. Only direct DB intervention can reverse this. Confirm archive candidate with Paresh before executing Step C.

### 7.3 Pre-Execution Data State Confirmation Protocol

Before executing any mutation step, the verify-close executor MUST:

1. Read the current tenant record using `GET /api/control/tenants/:id` to confirm current state
2. Record the `before-state` in the evidence
3. Confirm the slug matches the intended test target
4. Confirm the tenant is NOT in any forbidden list (§7.1)
5. Proceed with mutation only after visual confirmation

---

## 8. Detailed Verification Plan

### Step A — Tenant Registry and Detail Read Sanity

**Objective:** Confirm tenant list is reachable and detail endpoint returns membership array.

**Routes:**
- `GET /api/control/tenants` → 200; expect array with at least one tenant record
- `GET /api/control/tenants/:id` → 200 (using any safe test tenant ID); expect `memberships` array present in response

**Expected behavior:** 200 OK; JSON with `data.tenants` array or similar shape; no 401/403/500.

**Auth requirement:** Valid admin JWT (ANALYST or SUPER_ADMIN role acceptable for read).

**Evidence to capture:**
- HTTP status code
- Response shape (key field names only — do NOT log full response if it contains PII or sensitive org data)
- Presence of `memberships` or equivalent key in detail response
- Confirm no 500 errors

**Mutation:** NONE. Read-only.

**Stop condition:** If 401 or 403 — admin auth is not working; stop and check session. If 500 — server error; stop and report.

---

### Step B — Protected Tenant Archive Guard Sanity

**Objective:** Confirm the `isProtectedTenantArchiveTarget()` guard fires correctly before any mutation, returning 409 for a protected slug.

**Route:**
- `POST /api/control/tenants/:id/archive`
  - `id` = UUID of `qa-b2b` (or any protected slug tenant)
  - Body: `{ "expectedSlug": "qa-b2b", "reason": "FAM-10 production verification guard test" }`

**Expected behavior:** `409 CONFLICT` with error code `TENANT_ARCHIVE_PROTECTED` (or equivalent error shape from server).

**Auth requirement:** SUPER_ADMIN JWT.

**Evidence to capture:**
- HTTP status: 409
- Error response code/message (no secrets)

**Mutation:** NONE — guard fires before any DB write. Transaction rolls back internally; no state change occurs.

**Stop condition:** If any status other than 409 is returned — unexpected behavior; stop and report.

---

### Step C — Tenant Archive Smoke (Expendable Test Tenant)

**Objective:** Confirm the archive route correctly transitions an expendable test tenant to CLOSED state, with audit log written.

**Pre-condition:** Paresh has confirmed a specific UUID-based test tenant slug as the archive candidate. Candidate confirmed NOT in any forbidden list (§7.1). Before-state confirmed: `organizations.status` not CLOSED, `tenant.status` not CLOSED.

**Route:**
- `POST /api/control/tenants/:id/archive`
  - `id` = UUID of the confirmed expendable test tenant
  - Body: `{ "expectedSlug": "<confirmed-slug>", "reason": "FAM-10 production verification smoke test — permanent archive" }`

**Expected behavior:**
- `200 OK` with response including archived tenant slug and `status: CLOSED`
- After-state: `organizations.status = CLOSED`, `tenant.status = CLOSED` (confirmable via `GET /api/control/tenants/:id`)
- Audit log entry written (confirmable via Step G)

**Auth requirement:** SUPER_ADMIN JWT.

**Evidence to capture:**
- Before-state: slug, org status, tenant status
- HTTP status: 200
- Response: slug, returned status value (CLOSED)
- After-state (via GET): confirm CLOSED on both records
- Confirm slug matches the intended archive target

**Mutation:** PERMANENT. `organizations.status → CLOSED`, `tenant.status → CLOSED`. IRREVERSIBLE via control plane.

**Stop conditions:**
- If current org or tenant status is already CLOSED → skip (already_archived); record and proceed
- If `expectedSlug` mismatch is returned → STOP; confirm correct UUID is being used
- If 409 PROTECTED → STOP; wrong target chosen; do not retry on another protected tenant
- If 500 → STOP; server error; do not retry

---

### Step D — Onboarding Outcome Recording

**Objective:** Confirm the onboarding outcome route correctly records a verification result on a test tenant in PENDING_VERIFICATION state.

**Pre-condition:** Paresh has confirmed an outcome recording candidate in `PENDING_VERIFICATION` state. Before-state confirmed via `GET /api/control/tenants/:id`.

**Recommended outcome value:** `NEEDS_MORE_INFO` (transitions to `VERIFICATION_NEEDS_MORE_INFO`; reversible to APPROVED in a subsequent call if D→E compound flow is needed).

**Alternative:** Use `outcome: APPROVED` if Paresh confirms D→E compound flow.

**Route:**
- `POST /api/control/tenants/:id/onboarding/outcome`
  - `id` = UUID of the confirmed outcome recording candidate
  - Body: `{ "outcome": "NEEDS_MORE_INFO", "reason": "FAM-10 production verification smoke test", "notes": "Verification step D smoke only" }`
  - (Or `{ "outcome": "APPROVED", "reason": "FAM-10 production verification smoke test — D→E compound" }` if compound flow authorized)

**Expected behavior:**
- `200 OK` with response confirming status transition
- After-state: `organizations.status = VERIFICATION_NEEDS_MORE_INFO` (or `VERIFICATION_APPROVED` if APPROVED outcome used)
- Audit log entry written (confirmable via Step G)

**Auth requirement:** SUPER_ADMIN JWT.

**Valid source states:** `PENDING_VERIFICATION`, `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO`

**Evidence to capture:**
- Before-state: org status
- HTTP status: 200
- Response: org status after mutation (confirm matches expected nextStatus)
- Audit event: `control.tenants.onboarding_outcome.recorded` (confirm via Step G)

**Mutation:** Forward state transition on `organizations.status`. Tenant.status is NOT mutated in this step.

**Stop conditions:**
- If 409 `INVALID_STATE` → org is not in a mutableOnboardingStatus; stop and report; do not retry
- If 409 `ALREADY_RECORDED` → org already in target status; skip and record as already-confirmed; proceed
- If 404 → tenant not found; stop and confirm correct UUID
- If 500 → stop and report

---

### Step E — Activation Smoke (VERIFICATION_APPROVED → ACTIVE)

**Objective:** Confirm the activate-approved route correctly transitions a VERIFICATION_APPROVED test tenant to ACTIVE state on both org and tenant records.

**Pre-condition:** A test tenant exists in `organizations.status = VERIFICATION_APPROVED` (either pre-existing or produced by Step D with `outcome: APPROVED`). Paresh has confirmed this tenant is safe to activate.

**Route:**
- `POST /api/control/tenants/:id/onboarding/activate-approved`
  - `id` = UUID of the confirmed activation candidate
  - No request body required

**Expected behavior:**
- `200 OK` with response confirming tenant name and `status: ACTIVE`
- After-state: `organizations.status = ACTIVE`, `tenant.status = ACTIVE`
- Audit log entry written: `control.tenants.onboarding_activation.recorded` (confirmable via Step G)

**Auth requirement:** SUPER_ADMIN JWT.

**Evidence to capture:**
- Before-state: org status (must be `VERIFICATION_APPROVED`)
- HTTP status: 200
- Response: org name, status `ACTIVE`
- After-state (via GET): confirm `organizations.status = ACTIVE` and `tenant.status = ACTIVE`
- Audit event confirmed via Step G

**Mutation:** `organizations.status → ACTIVE`, `tenant.status → ACTIVE`. IRREVERSIBLE via control plane once activated.

**Stop conditions:**
- If 409 `ALREADY_ACTIVE` → tenant already active; skip and record; proceed
- If 409 `ONBOARDING_ACTIVATION_CONFLICT` with `INVALID_STATE` → org is not in VERIFICATION_APPROVED; confirm state via GET; do not retry
- If 404 → stop; confirm correct UUID
- If 500 → stop and report

---

### Step F — Impersonation Start / Status / Stop

**Objective:** Confirm the impersonation lifecycle (start → status → stop) operates correctly against a QA/test org.

**Pre-condition:** Paresh has confirmed a QA/test org with at least one non-sensitive test user in Membership. The `orgId` (UUID of the org/tenant) and `userId` (UUID of a QA test user in that org) are confirmed as non-sensitive.

#### Step F.1 — Impersonation Start

**Route:**
- `POST /api/control/impersonation/start`
  - Body: `{ "orgId": "<qa-org-UUID>", "userId": "<qa-user-UUID>", "reason": "FAM-10 production verification smoke test — impersonation lifecycle" }`
  - Note: `reason` must be ≥ 10 characters (schema enforced)

**Expected behavior:**
- `200 OK` with `impersonationId` (UUID), `expiresAt` (ISO timestamp), and a JWT token
- The JWT token has `isImpersonation: true` claim; TTL 30 minutes

**Evidence to capture:**
- HTTP status: 200
- `impersonationId` value (safe to record — UUID only, no token)
- `expiresAt` value
- **MUST NOT record the JWT token itself**

**Mutation:** Creates an `ImpersonationSession` row in DB with `endedAt = null`.

#### Step F.2 — Impersonation Status

**Route:**
- `GET /api/control/impersonation/status/:impersonationId`
  - `:impersonationId` = the UUID from Step F.1

**Expected behavior:**
- `200 OK` with session metadata: `id`, `adminId`, `tenantId`, `reason`, `expiresAt`, `endedAt` (null), `createdAt`
- No token in response (by design — this is the R-001 CLOSED surface)

**Evidence to capture:**
- HTTP status: 200
- `endedAt: null` (session not yet stopped)
- `id` matches the `impersonationId` from F.1

**Mutation:** NONE. Read-only status check.

#### Step F.3 — Impersonation Stop

**Route:**
- `POST /api/control/impersonation/stop`
  - Body: `{ "impersonationId": "<impersonationId-from-F1>", "reason": "FAM-10 production verification smoke test complete" }`
  - Note: `reason` must be ≥ 10 characters (schema enforced)

**Expected behavior:**
- `200 OK` confirming session ended
- After-state: `ImpersonationSession.endedAt` is now set (non-null)

**Evidence to capture:**
- HTTP status: 200
- Confirm stop response indicates session ended
- Audit log entry: `IMPERSONATION_STOP` event (confirmable via Step G)

**Mutation:** Sets `ImpersonationSession.endedAt`; writes audit log entry.

**Note on token revocation (R-005):** The JWT issued in F.1 remains technically valid until `expiresAt` (30 min). There is no server-side revocation. This is an accepted MVP risk (FTR-CP-001 R-005 ACCEPTED_MVP_RISK). The stop endpoint records the session end in DB and writes an audit event. Do not attempt to test real-time token revocation — it is deferred post-MVP.

**Stop conditions for all F steps:**
- If 401/403 → admin auth or role issue; stop
- If 404 (start) → orgId or userId not found; stop and confirm fixtures
- If `ImpersonationAbortError` (start) → tenant is not ACTIVE or user is not a member; stop and confirm fixture state
- If 500 → stop and report

---

### Step G — Audit Log Read Confirmation

**Objective:** Confirm that audit log entries are written after the mutation steps (C, D, E, F).

**Route:**
- `GET /api/control/audit-logs`
  - Query parameters to filter by `tenantId` or `action` (if available in route schema) — check route params at execution time

**Expected behavior:**
- `200 OK` with audit log entries
- At minimum, entries for the following actions should be present:
  - `control.tenants.archive.recorded` (from Step C)
  - `control.tenants.onboarding_outcome.recorded` (from Step D)
  - `control.tenants.onboarding_activation.recorded` (from Step E)
  - `IMPERSONATION_STOP` or equivalent (from Step F.3)

**Evidence to capture:**
- HTTP status: 200
- Presence of expected audit actions in response (action names only — do NOT log full JSON blobs)
- Confirm at least 3 of the 4 expected audit events appear

**Mutation:** NONE. Read-only.

**Stop condition:** If 0 audit entries appear for actions performed in prior steps — investigate; do not advance to close.

---

### Step H — Admin Whoami and RBAC Sanity

**Objective:** Confirm admin identity endpoint and RBAC registry are operational.

**Routes:**
- `GET /api/control/whoami` → 200; expect `id`, `email`, `role: SUPER_ADMIN` in response
- `GET /api/control/admin-access-registry` → 200; expect array of admin users
- `GET /api/control/system/health` → 200; expect health probe response

**Evidence to capture:**
- HTTP status: 200 for all three
- `whoami`: confirm `role: SUPER_ADMIN` present
- `admin-access-registry`: confirm non-empty array
- `system/health`: confirm 200

**Mutation:** NONE. Read-only.

---

## 9. Mutation Safety Matrix

| Step | Target | Mutation | Reversible via Control Plane | Confirm with Paresh before | Evidence Required | Stop Condition |
|---|---|---|---|---|---|---|
| A (read) | Any safe tenant | NONE | N/A | NO | HTTP 200; response shape | 401/403/500 |
| B (guard smoke) | Protected slug (qa-b2b) | NONE (guard fires; no DB write) | N/A | NO | HTTP 409 | Any non-409 |
| C (archive) | Expendable test tenant ONLY | `organizations.status → CLOSED`, `tenant.status → CLOSED` | ❌ NO — PERMANENT | YES — confirm specific UUID | Before-state + 200 + after-state | 409 PROTECTED; slug mismatch; 500 |
| D (outcome) | PENDING_VERIFICATION test tenant | `organizations.status → VERIFICATION_*` | Only via another outcome call | YES — confirm specific UUID and outcome value | Before-state + 200 + after-state | 409 INVALID_STATE; 404; 500 |
| E (activation) | VERIFICATION_APPROVED test tenant | `organizations.status → ACTIVE`, `tenant.status → ACTIVE` | ❌ NO — PERMANENT | YES — confirm specific UUID | Before-state + 200 + after-state | 409 ALREADY_ACTIVE; 409 INVALID_STATE; 500 |
| F (impersonation) | QA test org only; QA test user only | Creates ImpersonationSession; stop sets endedAt | ✅ Session stopped via F.3 | YES — confirm orgId and userId are QA-safe | impersonationId + expiresAt + HTTP 200 for all three sub-steps | 403; ImpersonationAbortError; 500 |
| G (audit log) | NONE | NONE | N/A | NO | HTTP 200; expected action names present | 0 audit entries for prior actions |
| H (whoami/health/rbac) | NONE | NONE | N/A | NO | HTTP 200 × 3 | 401/403/500 |

---

## 10. Acceptance Criteria

FAM-10 production verification is COMPLETE when ALL of the following are true:

1. `GET /api/control/tenants` returns 200 with a non-empty tenant array
2. `GET /api/control/tenants/:id` returns 200 with a `memberships` array present
3. `POST /api/control/tenants/:id/archive` on a protected slug returns 409 (guard smoke — NO mutation)
4. `POST /api/control/tenants/:id/archive` on the confirmed expendable test tenant returns 200; after-state confirmed CLOSED
5. `POST /api/control/tenants/:id/onboarding/outcome` on the confirmed outcome candidate returns 200; after-state reflects expected status transition
6. `POST /api/control/tenants/:id/onboarding/activate-approved` on the confirmed activation candidate returns 200; after-state confirms `organizations.status = ACTIVE` and `tenant.status = ACTIVE`
7. `POST /api/control/impersonation/start` returns 200 with `impersonationId` and `expiresAt`; JWT NOT recorded
8. `GET /api/control/impersonation/status/:impersonationId` returns 200 with `endedAt: null`
9. `POST /api/control/impersonation/stop` returns 200; session confirmed ended
10. `GET /api/control/audit-logs` returns 200 with audit entries for at least 3 of the 4 mutation actions from Steps C, D, E, F
11. `GET /api/control/whoami` returns 200 with `role: SUPER_ADMIN`
12. `GET /api/control/admin-access-registry` returns 200 with non-empty admin list
13. `GET /api/control/system/health` returns 200

---

## 11. Stop Conditions

The verify-close executor MUST STOP and emit a blocker report if any of the following occur:

| Condition | Action |
|---|---|
| Admin JWT cannot be obtained or is rejected (401) on any route | STOP; do not proceed to mutation steps |
| Admin role is not SUPER_ADMIN (mutation steps return 403) | STOP; switch to SUPER_ADMIN session |
| No suitable expendable test tenant exists for archive smoke | STOP; open `FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001` |
| No test tenant in PENDING_VERIFICATION state | STOP; open data preparation prompt |
| No test tenant in VERIFICATION_APPROVED state (and D→E compound flow not authorized) | STOP; open data preparation prompt or request D→E compound authorization |
| No QA org with a non-sensitive Membership user for impersonation | STOP; open data preparation prompt |
| `POST /archive` returns 409 PROTECTED for the intended archive candidate | STOP; wrong candidate selected; do not retry on another tenant without Paresh reconfirmation |
| `POST /archive` returns 409 SLUG_MISMATCH | STOP; UUID and slug are inconsistent; do not retry |
| Any mutation step returns 500 | STOP; server error; record and report |
| Any audit log read returns 0 entries after mutations | STOP; investigate before closing |
| Server is unreachable or returns non-HTTP error | STOP; confirm deployment health |

---

## 12. Evidence Capture Requirements

All evidence must be captured in the `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001` artifact.

### Required Evidence Format

For each step, record:

```
Step <X>: <Name>
Command/URL: <curl command or route description — REDACT any token in Authorization header>
HTTP Status: <actual status code>
Response key fields: <key field names and values — NO full JSON dumps if large>
Before-state: <org status / tenant status before mutation — for mutation steps only>
After-state: <confirmed state after mutation — for mutation steps only>
Pass/Fail: PASS | FAIL
```

### Absolute Evidence Prohibitions

The following MUST NEVER appear in the verify-close artifact or any terminal output pasted into it:

- Admin JWT token (full or partial)
- Impersonation JWT token (full or partial)
- User JWT token (full or partial)
- Database connection strings or URLs
- `.env` file contents
- Passwords or passphrases
- API keys or secrets

**Redact all tokens:** Use `Authorization: Bearer [ADMIN_JWT_REDACTED]` in any curl command shown.
**Redact impersonation token:** Record only `impersonationId` and `expiresAt`; token itself must not appear.

### Evidence Completeness

The verify-close artifact is only accepted if it contains:
- All 8 steps with Pass/Fail status
- Acceptance criteria table (13 items) with PASS/FAIL for each
- `git show --stat HEAD` for the verify-close commit
- `git status --short` confirming only the verify-close artifact is staged

---

## 13. Verify-Close Prompt Requirements

The `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001` prompt MUST:

1. **Pre-execution gate:** Confirm Paresh has identified and confirmed all 4 safe data fixtures (§7.2) before any mutation step
2. **Perform all 8 verification steps** (A through H) in the sequence defined in §8
3. **Emit a blocker report immediately** if any stop condition in §11 is triggered; do not proceed past the blocked step
4. **Create artifact:** `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001.md`
5. **Artifact must contain:** Task identity, data fixtures used (UUIDs of safe test tenants confirmed by Paresh), step-by-step evidence record (§12), acceptance criteria table (§10), pass/fail assessment, risks/follow-up
6. **Status advancement:** Only if ALL 13 acceptance criteria are PASS may the artifact declare FAM-10 `VERIFIED_COMPLETE`; if any criterion fails, declare `PARTIALLY_VERIFIED` with a remediation note
7. **MUST NOT edit:** `LAUNCH-FAMILY-INDEX.md`, `FUTURE-TODO-REGISTER.md`, or any Layer 0 control file — FAM-10 status advancement in the index is a separate governance step authorized explicitly by Paresh
8. **Commit:** `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001.md` only; message: `"docs: verify-close FAM-10 production smoke"`; use `git add -f` (artifacts/ is gitignored)
9. **Final enum on success:** `FAM_10_PLATFORM_OPS_CONTROL_PLANE_PRODUCTION_VERIFIED_COMPLETE`
10. **Final enum on partial pass:** `FAM_10_PLATFORM_OPS_CONTROL_PLANE_PRODUCTION_VERIFY_PARTIAL_PASS`
11. **Final enum if data fixtures missing:** `FAM_10_PLATFORM_OPS_CONTROL_PLANE_PRODUCTION_VERIFY_BLOCKED_BY_MISSING_DATA_FIXTURES`

---

## 14. Adjacent Findings Excluded

The following items were identified during the audit and are explicitly OUT-OF-SCOPE for this verification pass.
They are recorded here for Paresh's awareness and must NOT be merged into the FAM-10 verification execution.

| Finding | Location | Risk Level | Disposition |
|---|---|---|---|
| `GET /feature-flags` lacks explicit SUPER_ADMIN gate (inconsistent with `PUT /feature-flags/:key`) | `server/src/routes/control.ts` | LOW — read-only route; admin JWT still required | Recorded; not blocking; separate governance unit required |
| `TenantAuditLogSummary`, `AuditLogs`, `EventStream` lack explicit empty-state messages | `components/ControlPlane/` | LOW — silent empty table is a UX gap, not a functional failure | Non-blocking for MVP; Polish-track |
| Audit log writes are not transactional with main mutation (separate Prisma call post-mutation) | `server/src/routes/control.ts` | LOW — mutation succeeds; audit may fail silently if server crashes after mutation | Accepted design-level concern for MVP; documented in FTR-CP-001 |
| ImpersonationSession cleanup job absent (expired sessions accumulate) | Schema / cron | LOW — 30-min TTL mitigates; sessions inactive after expiry | Post-MVP operational concern; no audit entitlement |
| Audit log retention / TTL policy absent | `AuditLog` model | LOW — no DB-level cleanup; volume concern for production scale | Post-MVP operational concern |
| R-005: Impersonation token revocation gap (JWT valid until TTL even after stop) | `impersonation.service.ts` | LOW — accepted MVP risk per FTR-CP-001; 30-min TTL is primary mechanism | ACCEPTED_MVP_RISK / DEFERRED — no change before FAM-10 close |

---

## 15. Non-Authorization Statement

This planning artifact:

- DOES NOT authorize execution of any production mutation
- DOES NOT advance FAM-10 status in `LAUNCH-FAMILY-INDEX.md`
- DOES NOT edit `FUTURE-TODO-REGISTER.md`
- DOES NOT constitute a verify-close artifact
- DOES NOT open any implementation unit
- DOES NOT modify any Layer 0 control files

Production execution is authorized ONLY when Paresh submits `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001` and confirms all safe data fixtures in §7.2.

---

## 16. Safety Confirmation

| Safety Dimension | Status |
|---|---|
| Layer 0 gate | CLEAR — `LAUNCH-FAMILY-INDEX.md` records `L0 Gate: NO` for FAM-10 |
| FAM-10-specific blockers | NONE — `BLOCKED.md` and `NEXT-ACTION.md` confirm no FAM-10 hold |
| Implementation authorization | NOT REQUIRED — this is a documentation-only planning pass |
| Production data safety | Protected by §7.1 forbidden target list; archive and activation irreversibility flagged in §7.2 and §9 |
| Secrets policy | Enforced in §6 and §12 |
| Allowlist compliance | Only `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md` is created; no other files touched |
| Governance file integrity | `LAUNCH-FAMILY-INDEX.md` and `FUTURE-TODO-REGISTER.md` NOT modified |

---

## 17. Allowlist and Commit

**Files allowlisted for this prompt:**

| File | Action |
|---|---|
| `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md` | CREATE (this artifact) |

**No other files may be staged or committed.**

**Commit instruction:**
```
git add -f artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md
git status --short  # must show exactly: A  artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md
git commit -m "docs: plan FAM-10 production verification"
git show --stat HEAD
```

---

## 18. Recommended Next Prompt

```
FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001
```

**Pre-condition before submitting:** Paresh must confirm all 4 safe data fixtures (§7.2):
1. Slug of expendable test tenant for archive smoke (UUID-based; not in forbidden list)
2. UUID of test tenant in `PENDING_VERIFICATION` state for outcome recording
3. UUID of test tenant in `VERIFICATION_APPROVED` state for activation (or authorization for D→E compound flow)
4. `orgId` and `userId` of QA test org / QA test user for impersonation smoke (both confirmed non-sensitive)

**Final enum for this planning prompt:** `FAM_10_PLATFORM_OPS_CONTROL_PLANE_VERIFICATION_PLANNING_COMPLETE`
