# FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001

**Artifact type:** Opening repo-truth audit  
**Family:** FAM-07 — Tenant Onboarding and Invite  
**Status:** AUDIT_COMPLETE  
**Date:** 2026-07-23  
**Start HEAD:** `bb4e9b2` (docs: clean stale SEO family cross-reference)  
**Branch:** `main`  
**Working tree at audit start:** CLEAN  
**Authored by:** GitHub Copilot (authorized by opening prompt)

---

## 1. Task Identity

| Field | Value |
|---|---|
| Unit ID | FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001 |
| Unit type | Read-only repo-truth audit |
| Family | FAM-07 — Tenant Onboarding and Invite |
| Family MVP class | LAUNCH_BLOCKER |
| Family priority | P0 |
| Audit authorized by | FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 §7 (Path A) |
| Layer 0 posture | HOLD_FOR_AUTHORIZATION + HOLD_FOR_COUNSEL_FEEDBACK |
| Allowlist | Read-only (no file writes permitted except this artifact) |
| Forbidden | Any source/schema/config/test/governance modification |

---

## 2. Inputs Inspected

### Governance documents read

| File | Key sections read |
|---|---|
| `governance/control/NEXT-ACTION.md` | Layer 0 posture, active delivery unit, last closed unit note |
| `governance/control/BLOCKED.md` | Active blockers, FAM-07 adjacents |
| `governance/control/OPEN-SET.md` | Open unit set, Layer 0 state |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | §5 family table, §6 evidence manifest, §7 action register, §8 group table, §9 MVP cutline |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001, FTR-LEGAL-003, §12 decision notes |
| `TECS.md` | §0 safe-write mode, §1 gap lifecycle, §8 launch readiness hub drift-control rules |

### Source surfaces inspected

| Surface | Files / Locations |
|---|---|
| Schema | `server/prisma/schema.prisma` — Invite, Membership, Tenant, User, organizations models |
| Backend routes | `server/src/routes/tenant.ts` (activate, memberships CRUD), `server/src/routes/control.ts` (onboarding/outcome, onboarding/activate-approved), `server/src/routes/admin/tenantProvision.ts` |
| Backend services | `server/src/services/tenantProvision.service.ts`, `server/src/services/email/email.service.ts`, `server/src/services/email/email.templates.ts` |
| Frontend service | `services/tenantService.ts` |
| Frontend components | `components/Onboarding/OnboardingFlow.tsx`, `components/Tenant/InviteMemberForm.tsx`, `components/Public/PublicReferralLanding.tsx` |
| Tests | `server/src/__tests__/control-onboarding-outcome.integration.test.ts`, `server/src/__tests__/integration/memberships-invites.rls.db.test.ts` |
| Config / feature flags | `server/src/config/index.ts` |
| SMTP infrastructure | `server/src/services/email/email.service.ts` + `governance/control/NEXT-ACTION.md` (HD-001 note) |

---

## 3. Current Governance State

### Layer 0 Posture (authoritative from `governance/control/NEXT-ACTION.md`)

```
active_delivery_unit: HOLD_FOR_AUTHORIZATION
active_delivery_unit_status: HOLD_FOR_AUTHORIZATION

next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK
next_candidate_unit_status: HOLD_FOR_COUNSEL_FEEDBACK
  — No implementation packet may be opened until external legal counsel provides
    written feedback on TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md (upgraded),
    that feedback is recorded in TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001,
    and Paresh issues explicit written authorization.
```

**Effect on this audit:** Read-only audit is PERMITTED. No implementation, no design opening, no source edits. This audit is authorized as reconnaissance required for FAM-07 to proceed once Layer 0 releases.

### FAM-07 in `LAUNCH-FAMILY-INDEX.md`

| Column | Value |
|---|---|
| Family ID | FAM-07 |
| Name | Tenant Onboarding and Invite |
| Owner | MAIN |
| Status | NOT_ASSESSED |
| MVP Class | LAUNCH_BLOCKER |
| Priority | P0 |
| L0 Gate | NO (no dedicated DPP/WL-class gate; subject to global HOLD_FOR_AUTHORIZATION) |
| Cycle | 6 (natural successor to FAM-06, which closed VERIFIED_COMPLETE 2026-07-22) |

**LFI §6 Evidence Manifest:**

```
Evidence Level:  NEEDS_REPO_INSPECTION
Evidence Source: NEEDS_FAMILY_CYCLE
Last Verified By: —
Last Date: —
Review Trigger: Family cycle open
```

**LFI §7 Action Register:**

```
Next Action: Open family cycle; audit invite flow, onboarding state, control-plane visibility
Notes: Must-haves checklist §2 rows not assessed.
       Known FTR items entering this family cycle:
         FTR-AUTH-001 (reused-existing-user onboarding path, MVP_CRITICAL/P1)
         FTR-LEGAL-003 (supplier ToS/platform agreement, MVP_CRITICAL/P1, PRIT-012)
```

**LFI §8 Group Assignment:** Group B — MVP Launch Blockers  
**LFI §9 MVP Cutline:** `LAUNCH_BLOCKER | NOT_ASSESSED — family cycle required`

### Prior Evidence Context

| Unit | Outcome | Date | Note |
|---|---|---|---|
| FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 | VERIFIED_COMPLETE | 2026-07-22 | FAM-06 closed; Path A (FAM-07 audit) unlocked |
| HD-001-SUPPLIER-INVITE-ONBOARDING-RESOLUTION-001 | IMPLEMENTATION_COMPLETE | 2026-05-20 | Invite token flow added, HD-001 code fix deployed |
| HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001 | VERIFIED_BLOCKED | 2026-05-20 | SMTP not configured in Vercel production; invite emails not delivered |

---

## 4. Schema — Repo-Truth

**File:** `server/prisma/schema.prisma`

### Invite model (lines 111–137)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | — |
| `tenantId` | UUID FK → Tenant | RLS tenant scoping key |
| `email` | String | Invitee email |
| `role` | MembershipRole | Default: MEMBER |
| `tokenHash` | String VarChar(255) | SHA256 hash of plain-text invite token |
| `expiresAt` | DateTime (Timestamptz) | Expiry gate; enforced in activation route |
| `acceptedAt` | DateTime? | null = pending; set on accept |
| `createdAt` | DateTime | default: now() |
| `externalOrchestrationRef` | String? | External orchestration reference |
| `invitePurpose` | String VarChar(50) | Default: "TEAM_MEMBER" |

**Indexes:** `[tenantId]`, `[email]`, `[externalOrchestrationRef]`, `[invitePurpose]`, `[tokenHash]`

**Assessment:** Invite schema is structurally complete. All core lifecycle fields present.

### Membership model (lines 95–109)

| Field | Notes |
|---|---|
| `userId` FK → User, `tenantId` FK → Tenant | Both required |
| `role` | MembershipRole enum (OWNER, ADMIN, MEMBER, VIEWER) |
| Unique constraint | `[userId, tenantId]` — one membership per user per tenant |

**Assessment:** Structurally complete. Unique constraint is correct and necessary.

### Organizations model (relevant onboarding fields)

| Field | Type | Notes |
|---|---|---|
| `status` | String (default: "ACTIVE") | Canonical onboarding state control |
| `org_type` | String (default: "B2B") | B2B, B2C, AGGREGATOR, INTERNAL |
| `publication_posture` | String (default: "PRIVATE_OR_AUTH_ONLY") | — |
| `registration_no` | String? | Captured during activation |
| `jurisdiction` | String? | Captured during activation |
| `is_white_label` | Boolean (default: false) | — |
| `external_orchestration_ref` | String? | Optional external reference |

**Canonical onboarding status values (from activation logic):**
```
PENDING_VERIFICATION → VERIFICATION_APPROVED | VERIFICATION_REJECTED | VERIFICATION_NEEDS_MORE_INFO → ACTIVE
```

**Schema gaps identified:**

| Gap | Impact |
|---|---|
| No `onboarding_status` field — `status` field is the sole state control | Onboarding state and org lifecycle state are merged; no clean separation |
| No `legal_consent`, `tos_acceptance`, `platform_agreement` table or column | FTR-LEGAL-003 supplier ToS gate has zero schema support |
| No `onboarding_sessions` or `onboarding_state` table | No server-side onboarding progress tracking |

---

## 5. Backend Routes — Repo-Truth

### Route A: Admin Provisioning

**Route:** `POST /api/control/tenants/provision`  
**File:** `server/src/routes/admin/tenantProvision.ts`  
**Auth:** `adminAuthMiddleware` (admin-realm JWT)

**Provisioning sequence:**
1. Creates organization (organizations table) with `status: 'PENDING_VERIFICATION'`
2. Creates tenant record (tenants table)
3. Creates first user (users table) with passwordHash
4. Creates OWNER membership (memberships table)
5. Creates invite record (Invite table) with `invitePurpose: 'TEAM_MEMBER'`
6. Dispatches invite email via `sendInviteMemberEmail()` — **non-blocking** (SKIPPED_SMTP_UNCONFIGURED is silent)
7. Returns: `{ org_id, inviteToken, emailDelivery.status }`

**Assessment:** Structurally complete. Email dispatch is correctly non-blocking.

### Route B: Tenant Activate (first-time onboarding)

**Route:** `POST /api/tenant/activate`  
**File:** `server/src/routes/tenant.ts` (line ~6263)  
**Auth:** Public (no auth required — token is the credential)

**Activation sequence:**
1. Parse body: `{ inviteToken, userData: { email, password }, tenantData?: { name?, industry? }, verificationData: { registrationNumber, jurisdiction } }`
2. Hash token → SHA256
3. Look up invite: `{ tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } }` — **expiry IS enforced**
4. Validate email matches invite
5. Hash password (bcrypt, rounds=10)
6. In atomic `withDbContext` transaction:
   a. Stop-loss: assert `app.org_id` matches `invite.tenantId`
   b. `tx.user.findUnique({ email })` → `user ??= tx.user.create(...)` — **find-before-create pattern**
   c. Update organization: sets `status: 'PENDING_VERIFICATION'`, captures `registration_no`, `jurisdiction`
   d. Create membership: role = OWNER if no OWNER exists, else invite.role
   e. Mark `invite.acceptedAt = new Date()`
   f. Write audit log `user.activated`
7. Resolve tenant session identity
8. Issue tenant JWT with `{ userId, tenantId, role }`
9. Return: `{ token, user: { id, email }, tenant: { id, name, slug, type, ... }, org: { status, ... } }`

**Known activation route issues:**

| Issue | Location | Severity | FTR |
|---|---|---|---|
| Existing-user path: `passwordHash` computed but NOT validated or applied to existing user | line ~6350 | HIGH — silent credential bypass | FTR-AUTH-001 |
| Existing-user path: no check for pre-existing membership before `tx.membership.create` — will throw unique constraint violation if user already has membership in this tenant | line ~6390 | HIGH — unhandled DB exception | FTR-AUTH-001 |
| No ToS acceptance field in activation body schema or payload | Entire route | HIGH — FTR-LEGAL-003 gate absent | FTR-LEGAL-003 |
| Invite expiry: ENFORCED via `expiresAt: { gt: new Date() }` in DB query | line ~6291 | ✅ No issue | — |

**FTR-AUTH-001 partial implementation status:**  
The `user ??= tx.user.create(...)` pattern structurally handles the find-before-create case. However, it is incomplete: existing users bypass password validation, and there is no guard against duplicate membership creation. This is `DESIGN_GATED` — not a complete implementation of the reused-user path. The FTR-AUTH-001 classification of `BOUNDED_DEFERRED_REMAINDER` is confirmed correct.

### Route C: Control-Plane Onboarding Outcome

**Route:** `POST /api/control/tenants/:id/onboarding/outcome`  
**File:** `server/src/routes/control.ts` (line ~504)  
**Auth:** SUPER_ADMIN only

**Payload:** `{ outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO' }`  
**Effect:** Updates `organizations.status` → `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, or `VERIFICATION_NEEDS_MORE_INFO`  
**Creates audit entry:** `control.tenants.onboarding_outcome.recorded`  
**Assessment:** Structurally complete. Tested in `control-onboarding-outcome.integration.test.ts`.

### Route D: Control-Plane Onboarding Activation

**Route:** `POST /api/control/tenants/:id/onboarding/activate-approved`  
**File:** `server/src/routes/control.ts` (line ~639)  
**Auth:** SUPER_ADMIN only

**Pre-condition checks:**
- First-owner invite must be pending (acceptedAt IS NULL)
- Organization status must be `VERIFICATION_APPROVED`

**Effect:** Sets `organizations.status → ACTIVE`, tenant `eligibility → PUBLICATION_ELIGIBLE`  
**Creates audit entry:** `control.tenants.onboarding_activation.recorded`  
**Assessment:** Structurally complete. Tested in `control-onboarding-outcome.integration.test.ts`.

### Route E: Invite Management (tenant-plane)

**File:** `server/src/routes/tenant.ts`  
**Auth:** All routes require `tenantAuthMiddleware` + `databaseContextMiddleware`

| Route | Role gate | Function |
|---|---|---|
| `GET /api/tenant/memberships` | OWNER, ADMIN, MEMBER (VIEWER → 403) | Returns memberships + pending invites |
| `POST /api/tenant/memberships` | tenantAuthMiddleware | Creates invite; dispatches email |
| `POST /api/tenant/memberships/invites/:id/resend` | OWNER or ADMIN | New token + extended expiry |
| `PATCH /api/tenant/memberships/invites/:id` | OWNER or ADMIN | Edit role |
| `DELETE /api/tenant/memberships/invites/:id` | OWNER or ADMIN | Revoke invite |
| `PATCH /api/tenant/memberships/:id` | OWNER only | Update existing member role |

**Assessment:** Invite CRUD lifecycle is structurally complete.

### Missing Routes

| Missing Route | FTR | Impact |
|---|---|---|
| No route for existing-user invite acceptance (separate from new-user activate path) | FTR-AUTH-001 | Users with existing accounts cannot cleanly accept invites |
| No route for supplier ToS/legal consent acceptance | FTR-LEGAL-003 | Supplier onboarding cannot enforce legal gate |
| No tenant-self-service onboarding status progression | — | All status transitions require admin action or full activation |

---

## 6. Backend Services — Repo-Truth

### `server/src/services/tenantProvision.service.ts`

**Function:** `provisionTenant(input)` — orchestrates full provisioning sequence.  
Returns: `{ org_id, tenant_id, user_id, invitation: { id, inviteToken, emailDelivery: { status } } }`  
**Assessment:** Structurally complete. Correctly non-blocking on email failures.

### `server/src/services/email/email.service.ts`

**SMTP configuration check:**
```typescript
function isSmtpConfigured(): boolean {
  return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS && config.SMTP_FROM);
}
```

**Required env vars:** `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Dispatch fallback behavior:**

| Context | SMTP absent | SMTP present |
|---|---|---|
| Development / test | Logs `EMAIL_DEV_LOG` event; no send | Logs only (NODE_ENV=test) |
| Production | Logs `EMAIL_SMTP_UNCONFIGURED` warning; returns `{ status: 'SKIPPED_SMTP_UNCONFIGURED' }` | Sends email; throws on failure |

**Assessment:** Fallback logic is correct and non-blocking. Infrastructure gap (SMTP not configured in production) is the only active blocker.

### `server/src/services/email/email.templates.ts`

**Available:** `buildInquiryEmailBodies({ heading, lines, logoUrl? })` — generic transactional shell.  
**Gap:** No invite-specific email template exists. Invite emails use the generic template.  
**FTR:** FTR-AUTH-004 (auth email branded shell extension, PILOT_REQUIRED/P2) — deferred.

---

## 7. Frontend Components — Repo-Truth

### `components/Onboarding/OnboardingFlow.tsx`

**Export:** `ActivationFlow` (alias: `OnboardingFlow`)  
**Props:** `onComplete(data)`, `inviteToken?: string`, `prefilledData?: { orgName?, domain? }`

**Activation stepper (4 steps):**
1. Confirm business details (`orgName`, `industry`)
2. User credentials (`email`, `password`)
3. Verification (`registrationNumber`, `jurisdiction`)
4. Summary / confirm

**Assessment:** Functional for new-user activation. No reused-user path branching. No ToS acceptance step. No feature-flag gating.

### `components/Tenant/InviteMemberForm.tsx`

**Component:** `InviteMemberForm({ onBack })`  
**Calls:** `createMembership({ email, role })` → POST `/api/tenant/memberships`

**Handles all 4 email delivery outcome states:**
- `DEV_LOGGED` → "Invite Recorded; Email dispatch was dev-logged only"
- `SKIPPED_SMTP_UNCONFIGURED` → "Invite Recorded; SMTP not configured"
- `FAILED_NON_FATAL` → "Invite Recorded; Email dispatch failed non-fatally"
- `SENT` → "Invite Recorded and email dispatch completed successfully"

**Assessment:** Functional. Correctly surfaces SMTP state to tenant admin.

### `components/Public/PublicReferralLanding.tsx`

**Relevant text:** "You have been invited" / "Sign in or create an account to begin your supplier onboarding journey"  
**Assessment:** Invite landing page exists. Scope-adjacent to FAM-07; confirm whether this surfaces the activation flow or a standalone CTA page.

### Frontend Gaps

| Gap | Component | Impact |
|---|---|---|
| No reused-user path branching (sign-in vs create-account) in activation flow | OnboardingFlow.tsx | FTR-AUTH-001 UX unimplemented |
| No ToS acceptance step | OnboardingFlow.tsx | FTR-LEGAL-003 gate absent in UI |
| No feature-flag gating on any onboarding surface | All onboarding components | Cannot disable flow without code deploy |
| No supplier-specific onboarding variant | — | FTR-LEGAL-003 supplier gate has no UI |

---

## 8. Tests — Repo-Truth

### Present tests

| Test file | Coverage | Status |
|---|---|---|
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | ~10 tests: outcome recording, activation, SUPER_ADMIN enforcement, duplicate rejection, audit entries | ✅ PRESENT |
| `server/src/__tests__/integration/memberships-invites.rls.db.test.ts` | ~4–6 tests: RLS isolation (Org A / Org B on memberships + invites tables) | ✅ PRESENT |

### Missing tests (gaps)

| Gap | Priority | FTR |
|---|---|---|
| Full activate flow: token → user creation → membership → JWT issued | HIGH | — |
| Invite token SHA256 hashing correctness | MEDIUM | — |
| Existing-user path: find-before-create behavior | HIGH | FTR-AUTH-001 |
| Existing-user path: duplicate membership guard (unique constraint handling) | HIGH | FTR-AUTH-001 |
| Email dispatch fallback scenarios (SMTP absent, invalid email, send failure) | MEDIUM | — |
| First-owner role assignment (no existing OWNER → resolvedRole = OWNER) | MEDIUM | — |
| OWNER invariant: at least one OWNER must remain | MEDIUM | — |
| Invite expiry: expired invite returns 404 / "Invite not found or expired" | MEDIUM | — |
| Supplier onboarding path | HIGH | FTR-LEGAL-003 |
| ToS acceptance capture and validation | HIGH | FTR-LEGAL-003 |

---

## 9. Feature Flags and Runtime Gates — Repo-Truth

**`server/src/config/index.ts` line 19:**
```
APPROVED_ONBOARDING_SERVICE_TOKEN_HASH: optionalOpaqueTokenHash
```
This is an admin service token for orchestrated provisioning, not an onboarding feature flag.

**No onboarding-specific feature flags found.** The general `feature_flags` table exists in the DB but does not gate any onboarding surfaces in the current codebase.

**Gaps:**

| Gap | Impact |
|---|---|
| No feature flag for onboarding UI | Cannot disable or A/B test flow without code deploy |
| No feature flag for reused-user path (FTR-AUTH-001) | No safe rollout mechanism when implemented |
| No feature flag for supplier ToS gate (FTR-LEGAL-003) | No safe rollout mechanism when implemented |

---

## 10. SMTP / Email Infrastructure — Repo-Truth

**Current production state (from `governance/control/NEXT-ACTION.md` HD-001 note):**

> HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001 VERIFIED_BLOCKED (2026-05-20)  
> SMTP not configured in Vercel production; invite token dispatched but email NOT delivered.  
> Blocker is infrastructure-only. SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM not set in Vercel production.

**Impact on FAM-07:**  
Invite emails are silently swallowed in production. Tenant admins who invite members will see `SKIPPED_SMTP_UNCONFIGURED` state. The first-owner invite email from provisioning is also not delivered.  
**This is a production-ready BLOCKER** — FAM-07 cannot reach `VERIFIED_COMPLETE` until an SMTP provider is configured in Vercel and delivery is verified.

**Required action (out of scope for this audit; requires separate infrastructure prompt):**  
Configure SMTP provider in Vercel environment (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT) and run a live invite dispatch test to confirm `{ status: 'SENT' }`.

---

## 11. Critical Findings Summary

### ✅ What IS implemented

| Surface | Status | File(s) |
|---|---|---|
| Invite schema: full lifecycle model | PRESENT | `schema.prisma` |
| Admin provisioning: org/tenant/user/membership/invite creation + email dispatch | COMPLETE | `tenantProvision.ts`, `tenantProvision.service.ts` |
| Invite creation, resend, revoke, edit | COMPLETE | `tenant.ts` (invite CRUD routes) |
| Invite token activation flow (new-user path) | PRESENT — gaps noted | `tenant.ts` (POST /activate) |
| Invite expiry enforcement | CONFIRMED via `expiresAt: { gt: new Date() }` | `tenant.ts` |
| Control-plane onboarding outcome recording | COMPLETE | `control.ts` |
| Control-plane onboarding activation gate | COMPLETE | `control.ts` |
| Email service with SMTP fallback | COMPLETE | `email.service.ts` |
| RLS isolation (memberships + invites) | TEST_CONFIRMED | `memberships-invites.rls.db.test.ts` |
| Control-plane onboarding lifecycle tests | TEST_CONFIRMED | `control-onboarding-outcome.integration.test.ts` |
| Tenant admin invite UI (InviteMemberForm) | FUNCTIONAL | `InviteMemberForm.tsx` |
| Activation UI stepper (new-user path) | FUNCTIONAL — gaps noted | `OnboardingFlow.tsx` |

### ❌ Critical gaps

| Gap | Root file(s) | Severity | FTR |
|---|---|---|---|
| Existing-user invite acceptance: `passwordHash` computed but NOT validated or applied; credential bypass for existing users | `tenant.ts` line ~6350 | HIGH — security gap in FTR-AUTH-001 partial impl | FTR-AUTH-001 |
| Existing-user invite acceptance: no duplicate membership guard before `tx.membership.create` | `tenant.ts` line ~6390 | HIGH — unhandled DB constraint exception | FTR-AUTH-001 |
| No supplier ToS acceptance schema, route, or UI — FTR-LEGAL-003 has zero implementation | schema.prisma, tenant.ts, OnboardingFlow.tsx | HIGH — MVP_CRITICAL P1 | FTR-LEGAL-003 |
| SMTP not configured in Vercel production — invite emails not delivered | Vercel infrastructure | HIGH — production delivery blocked | HD-001 (infra) |
| No invite-specific email template (generic template only) | `email.templates.ts` | MEDIUM | FTR-AUTH-004 |
| No feature-flag gating on onboarding surfaces | All onboarding surfaces | MEDIUM | — |
| Activation flow has no reused-user UX branching (sign-in vs create-account) | `OnboardingFlow.tsx` | MEDIUM | FTR-AUTH-001 |
| No `organizations.onboarding_status` field — `status` conflates lifecycle and onboarding state | `schema.prisma` | LOW (design concern) | — |
| Significant test gaps: activate flow, expiry, SMTP fallback, existing-user path, OWNER invariant | test files | MEDIUM — risk at verify-close | — |

---

## 12. FTR Overlay Classification

All FTR items mapped to or adjacent to FAM-07:

| FTR ID | Description | Status | Readiness | P | Launch Class | FAM-07 Role |
|---|---|---|---|---|---|---|
| FTR-AUTH-001 | Reused-existing-user onboarding path | OPEN | DESIGN_GATED | P1 | MVP_CRITICAL | **CORE SCOPE — must be resolved before VERIFIED_COMPLETE** |
| FTR-LEGAL-003 | Supplier ToS / platform agreement | OPEN | NOT_ASSESSED | P1 | MVP_CRITICAL | **CORE SCOPE (legal overlay) — must be resolved before VERIFIED_COMPLETE** |
| FTR-AUTH-004 | Auth email branded shell extension | OPEN | IMPLEMENTATION_READY | P2 | PILOT_REQUIRED | Adjacent — invite email template; resolvable in same cycle |
| FTR-AUTH-002 | White-label onboarding path | OPEN | BLOCKED | P3 | POST_MVP | Out of FAM-07 core scope; FAM-18 WL hold |

**Anti-drift check (AR-001 through AR-008):**
- AR-001 compliance: FTR-AUTH-001 `→ FAM-07` tag confirms in FTR §6; FTR-LEGAL-003 `→ FAM-07` tag confirms.
- AR-004: Both MVP_CRITICAL items (FTR-AUTH-001, FTR-LEGAL-003) are visible in LFI §7 action register notes. ✅
- AR-008: This audit unit creates bidirectional cross-reference between FAM-07 and FTR items.

---

## 13. Scope Boundary

### FAM-07 core scope

| Surface | In scope | Note |
|---|---|---|
| Invite creation, management, revocation | ✅ | CRUD lifecycle |
| Invite token activation (new user) | ✅ | Current implementation |
| Invite token activation (existing user) | ✅ | FTR-AUTH-001 — must implement |
| Admin provisioning (first-owner path) | ✅ | Structurally complete |
| Control-plane onboarding outcome + activation gates | ✅ | Structurally complete |
| Supplier ToS acceptance gate | ✅ | FTR-LEGAL-003 — must implement |
| Onboarding state lifecycle (PENDING_VERIFICATION → ACTIVE) | ✅ | Status field model |
| SMTP production configuration | ✅ | Infrastructure prerequisite for VERIFIED_COMPLETE |
| Invite email template (branded) | ✅ (adjacent) | FTR-AUTH-004; resolvable in same cycle |

### Out of FAM-07 scope

| Surface | Owner | Note |
|---|---|---|
| Tenant workspace (post-activate) | FAM-08 | Post-onboarding workspace setup |
| Supplier profile / catalog | FAM-09 | Post-onboarding |
| White-label onboarding path | FAM-18 | POST_MVP; FTR-AUTH-002 BLOCKED |
| Subscription / commercial gating | FAM-11 | Separate cycle |

---

## 14. Production / Data Readiness

| Check | Status | Note |
|---|---|---|
| Core onboarding schema deployed | CONFIRMED | Invite, Membership, organizations with status field all in production |
| Admin provisioning route working | CONFIRMED | POST /api/control/tenants/provision tested in FAM-10 production smoke |
| Control-plane onboarding gates working | CONFIRMED | FAM-10 production smoke 15/15 PASS |
| Invite email delivery in production | BLOCKED | SMTP not configured in Vercel (HD-001 VERIFIED_BLOCKED) |
| Invite expiry enforcement | IMPLEMENTED | expiresAt: { gt: new Date() } in activation route |
| Reused-user path handling | PARTIAL | find-before-create exists; credential and membership gaps unresolved |
| Supplier ToS gate | NOT_IMPLEMENTED | No schema, no route, no UI |
| Test suite gate | GAPS | Activate flow, expiry, SMTP fallback, existing-user path not tested |

---

## 15. Implementation-Readiness Decision

**Decision:** `BLOCKED_BY_LAYER0`

**Rationale:**

1. **Layer 0 HOLD_FOR_AUTHORIZATION** is active — no implementation packet may be opened.
2. **Layer 0 HOLD_FOR_COUNSEL_FEEDBACK** is active — external legal counsel feedback on TTP legal packet is pending; no implementation packet may be opened until written authorization is issued by Paresh.
3. The two MVP_CRITICAL gaps (FTR-AUTH-001 and FTR-LEGAL-003) are known and documented; design planning is possible but cannot proceed to implementation under current Layer 0 posture.
4. This audit satisfies the `NEEDS_REPO_INSPECTION` evidence requirement for FAM-07 LFI §6. Upon Layer 0 release, FAM-07 evidence level can be upgraded to `REPO_CONFIRMED`.

**Recommended next prompt (upon Layer 0 release):** `LAYER0-FAM-07-AUTHORIZATION-RELEASE-001`

---

## 16. Verify-Close Hub-Sync Checklist (Q1–Q14)

> Per TECS §8.3 — Verify-Close Hub-Sync Checklist

| Q | Answer |
|---|---|
| Q1. Did this unit change launch readiness truth? | PARTIAL — audit produces REPO_CONFIRMED evidence; FAM-07 LFI §6 may now be updated to `REPO_CONFIRMED` evidence level, but FAM-07 status row (`NOT_ASSESSED`) must NOT be advanced until implementation cycles complete. No hub writes are part of this audit unit. |
| Q2. Which family or requirement changed? | FAM-07 — evidence level upgradeble from `NEEDS_REPO_INSPECTION` to `REPO_CONFIRMED`. No other family changed. |
| Q3. Which hub documents need to be updated? | `LAUNCH-FAMILY-INDEX.md` §6 evidence manifest (FAM-07 row); §7 action register (FAM-07 note update). These are PENDING — not allowlisted in this audit unit. |
| Q4. What evidence supports the update? | This artifact: `FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md` |
| Q5. CRM/CAE duplication risk? | NO — no CRM or CAE content in this audit. |
| Q6. Planned items at risk of incorrect MVP promotion? | NO — no new planned items introduced. FTR-AUTH-001 and FTR-LEGAL-003 pre-exist at MVP_CRITICAL status. |
| Q7. Stale hub rows superseded by this unit? | FAM-07 §6 `NEEDS_REPO_INSPECTION` is now superseded by this audit. Update is PENDING, not applied in this unit. |
| Q8. No hub update: record reason | Hub update NOT allowlisted in this audit unit. Hub update is PENDING for next authorized prompt. |
| Q9. Were hub files allowlisted? | NO. LAUNCH-FAMILY-INDEX.md and FUTURE-TODO-REGISTER.md are NOT allowlisted in this read-only audit. Hub sync is a PENDING action for the next authorized prompt. |
| Q10. FTR items mapped to FAM-07? | FTR-AUTH-001 (DESIGN_GATED, MVP_CRITICAL, P1), FTR-LEGAL-003 (NOT_ASSESSED, MVP_CRITICAL, P1), FTR-AUTH-004 (IMPLEMENTATION_READY, PILOT_REQUIRED, P2), FTR-AUTH-002 (BLOCKED, POST_MVP, P3) |
| Q11. Any MVP_CRITICAL or LAUNCH_BLOCKER FTR items? | YES — FTR-AUTH-001 and FTR-LEGAL-003 are both MVP_CRITICAL/P1. Both OPEN. Both must be resolved before FAM-07 can reach VERIFIED_COMPLETE. |
| Q12. FTR scope classification for FAM-07? | FTR-AUTH-001: CORE SCOPE. FTR-LEGAL-003: CORE SCOPE (legal overlay). FTR-AUTH-004: ADJACENT (resolvable in same cycle). FTR-AUTH-002: OUT_OF_SCOPE (POST_MVP). |
| Q13. LFI §7 surfaces all open MVP_CRITICAL/LAUNCH_BLOCKER gates? | YES — LFI §7 FAM-07 row already references FTR-AUTH-001 and FTR-LEGAL-003 explicitly. Compliant with AR-004. |
| Q14. LFI §9 MVP cutline reflects verified/open split? | Current state: `NOT_ASSESSED — family cycle required`. After hub sync (PENDING): row can be updated to reflect `REPO_CONFIRMED / IMPLEMENTATION_BLOCKED_BY_LAYER0`. Update is PENDING. |

---

## 17. Non-Implementation Statement

This unit made **zero source code changes, zero schema changes, zero test changes, zero governance file changes** (other than creating this read-only artifact). No implementation of any kind has occurred. All source surfaces inspected in read-only mode. The audit artifact itself is the only allowlisted file produced.

**Files modified:** None.  
**Files created:** `artifacts/control-plane/FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md` (this artifact).

---

## 18. Safety Confirmation

- Safe-Write Mode: ✅ RESPECTED  
- Allowlist: ✅ ENFORCED (this artifact only)  
- Layer 0: ✅ RESPECTED (read-only audit; no implementation attempted)  
- Secrets: ✅ NONE disclosed  
- DB URLs: ✅ NONE disclosed  
- Repo state: ✅ No source changes  

---

## 19. Commit Instructions

This artifact is in `artifacts/` which is gitignored. Use `-f` flag:

```powershell
git add -f artifacts/control-plane/FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md
git status --short
git commit -m "docs: audit FAM-07 tenant onboarding repo truth"
git show --stat HEAD
```

Stage ONLY this artifact. Do NOT stage `LAUNCH-FAMILY-INDEX.md` or any other file. Hub sync for LFI §6 FAM-07 evidence level update is a PENDING action for a separate authorized prompt.

---

## 20. Final Enum

```
FAM_07_TENANT_ONBOARDING_OPENING_REPO_TRUTH_AUDIT_COMPLETE_BLOCKED_BY_LAYER0
```

---

*Artifact produced: 2026-07-23. Authorized by FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001 Path A selection.*  
*Awaiting: Layer 0 HOLD_FOR_AUTHORIZATION release → LAYER0-FAM-07-AUTHORIZATION-RELEASE-001.*
