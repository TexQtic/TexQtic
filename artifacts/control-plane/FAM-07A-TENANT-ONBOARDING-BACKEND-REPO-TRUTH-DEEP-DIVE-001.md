# FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001

**Artifact type:** Backend repo-truth deep dive — read-only investigation  
**Family:** FAM-07 — Tenant Onboarding and Invite  
**Status:** INVESTIGATION_COMPLETE  
**Date:** 2026-05-28  
**Starting HEAD:** `4653102` (message: "docs: release FAM-07 layer 0 for bounded design")  
**Branch:** `main`  
**Working tree at start:** CLEAN  
**Authorized by:** Paresh Patel — FAM-07A backend deep dive authorization statement  
**Authored by:** GitHub Copilot  

---

## 1. Task Identity

| Field | Value |
|---|---|
| Unit ID | FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001 |
| Unit type | Read-only backend repo-truth investigation |
| Family | FAM-07 — Tenant Onboarding and Invite |
| Family MVP class | LAUNCH_BLOCKER |
| Family priority | P0 |
| Prior unit | LAYER0-FAM-07-AUTHORIZATION-RELEASE-001 |
| Prior final enum | LAYER0_FAM_07_AUTHORIZATION_RELEASE_COMPLETE_WITH_DATE_CORRECTION |
| LFI FAM-07 evidence level | REPO_CONFIRMED (set by Layer 0 unit) |
| FAM-07 implementation status | NOT AUTHORIZED |
| FAM-07 completion status | NOT VERIFIED_COMPLETE |
| Allowlist (write) | `artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md` |
| All other files | READ-ONLY |
| Forbidden | Source, schema, config, test, package, migration, runtime, LFI/FTR edits |

---

## 2. Starting HEAD and Repo State

| Field | Value |
|---|---|
| HEAD commit | `4653102` |
| HEAD message | `docs: release FAM-07 layer 0 for bounded design` |
| Branch | `main` |
| Working tree | CLEAN — `git status --short` produced no output |
| Prior artifact 1 | `artifacts/control-plane/LAYER0-FAM-07-AUTHORIZATION-RELEASE-001.md` — present, verified |
| Prior artifact 2 | `artifacts/control-plane/FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md` — present, verified |

---

## 3. Files Inspected

### Governance files (read-only)

| File | Purpose |
|---|---|
| `governance/control/NEXT-ACTION.md` | Active delivery unit, last closed unit, Layer 0 posture |
| `governance/control/OPEN-SET.md` | Open unit posture, operating notes |
| `governance/control/BLOCKED.md` | Active blockers, TTP hold |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | §5 family matrix, §6 evidence manifest, §7 action register, §9 MVP cutline |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001, FTR-LEGAL-003, FTR-AUTH-004, FTR-AUTH-002 items |
| `artifacts/control-plane/FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md` | Prior repo-truth audit (reference) |
| `artifacts/control-plane/LAYER0-FAM-07-AUTHORIZATION-RELEASE-001.md` | Layer 0 release artifact (reference) |

### Backend source files (read-only)

| File | Lines read | Scope |
|---|---|---|
| `server/prisma/schema.prisma` | All relevant models (lines 1–140, 1054–1160) | Invite, Membership, Tenant, User, organizations, OrganizationSecondarySegment, OrganizationRolePosition |
| `server/src/routes/tenant.ts` | Lines 1390–1820, 6250–6650 | GET memberships, POST memberships (invite create), POST memberships/invites/:id/resend, PATCH memberships/invites/:id (edit), DELETE memberships/invites/:id (revoke), PATCH memberships/:id (role update), POST /tenant/activate |
| `server/src/routes/control.ts` | Lines 490–820 | POST /tenants/:id/onboarding/outcome, POST /tenants/:id/onboarding/activate-approved |
| `server/src/routes/admin/tenantProvision.ts` | Full | POST /api/control/tenants/provision, GET /api/control/tenants/provision/status |
| `server/src/services/tenantProvision.service.ts` | Full (lines 1–600) | provisionTenant (LEGACY_ADMIN + APPROVED_ONBOARDING paths), queryProvisioningStatus |
| `server/src/services/email/email.service.ts` | Lines 1–380 | sendEmail, sendInviteMemberEmail, SMTP dispatch modes |
| `server/src/services/email/email.templates.ts` | Full | buildInquiryEmailBodies (only template present) |
| `server/src/config/index.ts` | Full | SMTP env vars, APPROVED_ONBOARDING_SERVICE_TOKEN_HASH, FRONTEND_URL |
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Lines 1–200 | Unit test coverage for onboarding/outcome route |
| `server/src/__tests__/integration/memberships-invites.rls.db.test.ts` | Lines 1–200 | DB-level RLS tests for memberships + invites |

### Frontend files (read-only, contextual reference)

| File | Scope |
|---|---|
| `components/Onboarding/OnboardingFlow.tsx` | 4-step ActivationFlow component; collects orgName, email, password, registrationNumber, jurisdiction; calls `onComplete(formData)` |
| `components/Tenant/InviteMemberForm.tsx` | InviteMemberForm + InviteMemberSuccessState; calls `createMembership({ email, role })` |
| `components/Public/PublicReferralLanding.tsx` | Static referral landing; NO network calls, read-only display |
| `services/tenantService.ts` | Full API contract surface: activateTenant, getMemberships, createMembership, revokePendingInvite, resendPendingInvite, editPendingInvite, updateMembershipRole |

---

## 4. Backend/Schema Repo-Truth Findings

### 4.1 Invite Model (`server/prisma/schema.prisma`, lines 111–137)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `tenantId` | UUID FK → Tenant | RLS tenant scoping key; cascade delete |
| `email` | String | Invitee email; not normalized at schema level |
| `role` | MembershipRole | Default: MEMBER; enum: OWNER, ADMIN, MEMBER, VIEWER |
| `tokenHash` | String VarChar(255) | SHA-256 of plain-text invite token; never stored raw |
| `expiresAt` | DateTime Timestamptz | 7-day window from creation; enforced in activation query |
| `acceptedAt` | DateTime? Timestamptz | null = pending; set atomically on activation |
| `createdAt` | DateTime | default: now() |
| `externalOrchestrationRef` | String? VarChar(255) | External CRM/orchestration reference |
| `invitePurpose` | String VarChar(50) | default: "TEAM_MEMBER"; FIRST_OWNER_PREPARATION used for provisioning path |

**Indexes:** `[tenantId]`, `[email]`, `[tokenHash]`, `[externalOrchestrationRef]`, `[invitePurpose]`  
**Assessment:** Structurally complete for the core invite lifecycle. No structural gaps in the Invite model itself.

### 4.2 Membership Model (`server/prisma/schema.prisma`, lines 95–109)

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `userId` | FK → User; required |
| `tenantId` | FK → Tenant; required |
| `role` | MembershipRole enum (OWNER, ADMIN, MEMBER, VIEWER) |
| `createdAt`, `updatedAt` | Standard timestamps |

**Unique constraint:** `@@unique([userId, tenantId])` — one membership per user per tenant.  
**Assessment:** Structurally complete. The unique constraint is correct and necessary. It is also the source of the FTR-AUTH-001 duplicate membership risk (see §7).

### 4.3 Tenant Model

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `slug` | Unique VarChar(100) |
| `name` | String |
| `type` | TenantType enum (B2B, B2C, AGGREGATOR, etc.) |
| `status` | TenantStatus |
| `plan` | TenantPlan |
| `isWhiteLabel` | Boolean |
| `externalOrchestrationRef` | String? (unique) |
| `publicEligibilityPosture` | String |

Relations: `organizations?`, `invites[]`, `memberships[]`, `auditLogs[]`, plus many operational domain tables.  
**Assessment:** No onboarding-specific structural gaps in the Tenant model.

### 4.4 User Model

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `email` | String (unique) |
| `passwordHash` | String |
| `emailVerified` | Boolean (default: false) |
| `emailVerifiedAt` | DateTime? |

**Critical gap:** No ToS acceptance fields of any kind. No `tos_accepted_at`, `tos_version`, `platform_agreement_at`, or similar. Zero ToS infrastructure at the User level. This is the FTR-LEGAL-003 gap confirmed at schema level.

### 4.5 Organizations Model (`server/prisma/schema.prisma`, lines 1054–1133)

| Field | Notes |
|---|---|
| `id` | UUID PK (same ID as Tenant.id — 1:1 join; cascade delete from Tenant) |
| `slug` | Unique VarChar(100) |
| `legal_name` | String VarChar(500) |
| `jurisdiction` | String @default("UNKNOWN") VarChar(100); captured during activation |
| `registration_no` | String? VarChar(200); captured during activation |
| `org_type` | String @default("B2B") VarChar(50) |
| `status` | String @default("ACTIVE") VarChar(30) — **canonical onboarding state field** |
| `plan` | String @default("FREE") VarChar(30) |
| `effective_at`, `superseded_at` | Timestamptz; SCD-style fields |
| `is_white_label` | Boolean @default(false) |
| `external_orchestration_ref` | String? @unique VarChar(255) |
| `primary_segment_key` | String? VarChar(100) |
| `publication_posture` | String @default("PRIVATE_OR_AUTH_ONLY") VarChar(30) |
| `price_disclosure_policy_mode` | String? VarChar(30) |
| `is_qa_sentinel` | Boolean @default(false) |

**Sub-tables:** `OrganizationSecondarySegment` (org_id, segment_key), `OrganizationRolePosition` (org_id, role_position_key)

**Canonical `organizations.status` lifecycle values** (enforced by SQL check constraint, NOT a native Prisma enum per schema comment):
```
ACTIVE | SUSPENDED | CLOSED | PENDING_VERIFICATION |
VERIFICATION_APPROVED | VERIFICATION_REJECTED | VERIFICATION_NEEDS_MORE_INFO
```

**Onboarding flow traversal:**
```
(provisioned) → PENDING_VERIFICATION 
  [control-plane review]
  → VERIFICATION_APPROVED    (control.tenants.onboarding_outcome APPROVED)
  → VERIFICATION_REJECTED    (control.tenants.onboarding_outcome REJECTED)
  → VERIFICATION_NEEDS_MORE_INFO (control.tenants.onboarding_outcome NEEDS_MORE_INFO)
  [activation gate]
  → ACTIVE                   (control.tenants.onboarding_activate-approved)
```

**Schema gaps for onboarding:**

| Gap | FTR | Impact |
|---|---|---|
| No `tos_acceptances` table | FTR-LEGAL-003 | ToS capture has zero schema support |
| No ToS fields on User or organizations | FTR-LEGAL-003 | No consent versioning, timestamp, or actor capture |
| No `onboarding_sessions` / `onboarding_state` table | POST_MVP | No server-side step progress tracking |
| `status` merges lifecycle + onboarding state | Design note | Onboarding state and post-activation lifecycle share a single field; acceptable for current scope |

---

## 5. Backend Routes Repo-Truth Findings

### 5.1 POST /api/tenant/activate

**File:** `server/src/routes/tenant.ts` (line 6260)  
**Auth:** Public — no auth required; invite token is the sole credential  
**Purpose:** First-time tenant owner activation via pre-provisioned invite

**Body schema (validated with Zod):**
```
{
  inviteToken: string (min 1)
  userData: { email: string (email format), password: string (min 6) }
  tenantData?: { name?: string, industry?: string }
  verificationData: { registrationNumber: string (min 1), jurisdiction: string (min 1) }
}
```

**Activation sequence (exact, line-by-line derived):**
1. Parse and validate body
2. `crypto.createHash('sha256').update(inviteToken).digest('hex')` → tokenHash
3. `prisma.invite.findFirst({ where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } } })` — expiry enforced in DB query
4. If invite not found → 404 INVALID_INVITE
5. Normalize both emails to `trim().toLowerCase()`; check match → 403 EMAIL_MISMATCH if not equal
6. `passwordHash = await bcrypt.hash(userData.password, 10)` — computed BEFORE transaction
7. Build `dbContext = { orgId: invite.tenantId, actorId: invite.tenantId, realm: 'tenant', requestId: randomUUID() }`
8. `withDbContext(prisma, dbContext, async tx => { ... })`:
   a. Stop-loss: assert `current_setting('app.org_id')` === `invite.tenantId` — throws on mismatch
   b. `user = await tx.user.findUnique({ where: { email: normalizedUserEmail } })`
   c. `user ??= await tx.user.create({ data: { email, passwordHash, emailVerified: true, emailVerifiedAt: new Date() } })`
   d. Temp admin realm: `SET app.realm = 'admin'`, `SET app.is_admin = 'true'`
   e. `tx.organizations.update({ where: { id: invite.tenantId }, data: { registration_no, jurisdiction, status: 'PENDING_VERIFICATION', ...optionalName } })`
   f. Optional: `tx.tenant.update({ data: { name } })` if name supplied
   g. Restore tenant realm: `SET app.realm = 'tenant'`, `SET app.is_admin = 'false'`
   h. `resolvedRole = ownerExists ? invite.role : 'OWNER'` (ownerExists from `invite.tenant.memberships.some(m => m.role === 'OWNER')`)
   i. `tx.membership.create({ data: { userId: user.id, tenantId: invite.tenantId, role: resolvedRole } })`
   j. `tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })`
   k. Write audit log: `user.activated` with inviteId, role, firstOwnerActivated, verificationStatus
9. `resolveTenantSessionIdentity({ tenantId, actorId: user.id, userRole: membership.role })`
10. Issue tenant JWT: `{ userId, tenantId, role }`
11. Return: `{ token, user: { id, email }, tenant: { id, name, slug, type, tenant_category, ... }, membership: { role } }`
12. Error handler: any exception → 500 INTERNAL_ERROR "Activation failed"

**Critical issues in this route:**
- See §7 (FTR-AUTH-001) for full analysis of existing-user credential bypass and duplicate membership risk.

### 5.2 POST /api/tenant/memberships (Invite Create)

**File:** `server/src/routes/tenant.ts` (line 6475)  
**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`; role gate: OWNER or ADMIN only  
**Purpose:** Send a team member invitation to a specified email

**Body schema:** `{ email: string (email), role: enum ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] }`  
**VIEWER blocked:** Returns 422 VIEWER_TRANSITION_OUT_OF_SCOPE if role === 'VIEWER'  
**Token generation:** `randomBytes(32).toString('hex')` → SHA-256 → tokenHash; 7-day expiry  
**DB write:** `tx.invite.create({ data: { tenantId, email, role, tokenHash, expiresAt } })` — RLS-enforced  
**Audit:** `member.invited` (realm TENANT)  
**Email:** Fire-and-forget `sendInviteMemberEmail(email, token, orgDisplayName, ...)` — errors logged, never block response  
**Response:** `{ invite: { id, email, role, expiresAt }, inviteToken: token, emailDelivery }`  

**Observation:** `inviteToken` (plain text) is returned in the API response. This is intentional for dev/test tooling but represents a surface the implementation team should document as dev-only.

**Duplicate invite guard:** None present. Same email can be invited twice to the same tenant. Two active invites for the same email + tenant would both be valid until expiry. This is a SHOULD_FIX_BEFORE_VERIFY item.

### 5.3 GET /api/tenant/memberships

**File:** `server/src/routes/tenant.ts` (line 1412)  
**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`; role gate: OWNER, ADMIN, MEMBER (VIEWER → 403)  
**Returns:** `{ memberships: Membership[], pendingInvites: PendingInvite[], count: memberships.length }`  
- Memberships: all active memberships with `user: { id, email, emailVerified }`
- Pending invites: `{ acceptedAt: null, expiresAt: { gt: now } }` — active window only
- Both queries RLS-enforced via `withDbContext`

### 5.4 POST /api/tenant/memberships/invites/:id/resend

**File:** `server/src/routes/tenant.ts` (line 1473)  
**Auth:** OWNER or ADMIN  
**Effect:** Rotates tokenHash and extends expiresAt (+7 days); sends new invite email  
**Guard:** Returns 409 INVITE_NOT_PENDING if `acceptedAt !== null` OR `expiresAt <= now`  
**Audit:** `member.invite.resent`

### 5.5 PATCH /api/tenant/memberships/invites/:id (Edit Role)

**File:** `server/src/routes/tenant.ts` (line 1596)  
**Auth:** OWNER or ADMIN  
**Body schema:** `{ role: enum ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] }`  
**VIEWER blocked:** Returns 422 VIEWER_TRANSITION_OUT_OF_SCOPE  
**Guards:** 409 INVITE_NOT_PENDING if accepted or expired; 409 NO_OP_ROLE_CHANGE if same role  
**Audit:** `member.invite.updated` with fromRole and toRole

### 5.6 DELETE /api/tenant/memberships/invites/:id (Revoke)

**File:** `server/src/routes/tenant.ts` (line 1714)  
**Auth:** OWNER or ADMIN  
**Effect:** Hard deletes invite record  
**Guard:** 409 INVITE_NOT_PENDING if accepted or expired  
**Audit:** `member.invite.revoked`

### 5.7 PATCH /api/tenant/memberships/:id (Role Update)

**File:** `server/src/routes/tenant.ts` (line 1819)  
**Auth:** OWNER only  
**Purpose:** Change role of an existing membership (not invite)  
**OWNER invariant enforced:** Cannot demote a peer OWNER; sole OWNER cannot self-downgrade; VIEWER transitions blocked  
**Audit:** `membership.role.updated`

### 5.8 POST /api/control/tenants/:id/onboarding/outcome

**File:** `server/src/routes/control.ts` (line 504)  
**Auth:** SUPER_ADMIN only (`requireAdminRole('SUPER_ADMIN')`)  
**Body:** `{ outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO', reason?: string, notes?: string }`  
**State machine:**
```
APPROVED        → organizations.status = 'VERIFICATION_APPROVED'
REJECTED        → organizations.status = 'VERIFICATION_REJECTED'
NEEDS_MORE_INFO → organizations.status = 'VERIFICATION_NEEDS_MORE_INFO' (note: actually PENDING_VERIFICATION)
```
**Guards:** 404 if tenant not found; 409 ONBOARDING_STATUS_CONFLICT if source status not in `mutableOnboardingStatuses` or already the target status  
**Audit:** `control.tenants.onboarding_outcome.recorded` (realm TENANT inside `withOrgAdminWriteContext`)  
**Test coverage:** `server/src/__tests__/control-onboarding-outcome.integration.test.ts` — present, covers happy path and idempotency

### 5.9 POST /api/control/tenants/:id/onboarding/activate-approved

**File:** `server/src/routes/control.ts` (line 639)  
**Auth:** SUPER_ADMIN only  
**Guard:** `organizations.status` must === 'VERIFICATION_APPROVED' → 409 if not  
**Effect:** Updates both `organizations.status` and `tenant.status` to 'ACTIVE' atomically  
**Audit:** `control.tenants.onboarding_activation.recorded`

### 5.10 POST /api/control/tenants/provision (Admin Provisioning)

**File:** `server/src/routes/admin/tenantProvision.ts`  
**Auth:** SUPER_ADMIN JWT **or** service bearer token matching `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` (SHA-256 compared via `timingSafeEqual`)  
**Two provisioning modes:**

**LEGACY_ADMIN mode:**
- Creates organization + tenant + user (immediate) + OWNER membership + invite (TEAM_MEMBER purpose)
- User is created immediately; no activation step required
- Returns: `{ org_id, inviteToken, emailDelivery.status }`

**APPROVED_ONBOARDING mode:**
- Creates organization + tenant + invite with `invitePurpose: 'FIRST_OWNER_PREPARATION'`, `role: 'OWNER'`
- Does NOT create user, does NOT create membership at provisioning time
- Organization status set to `VERIFICATION_APPROVED` on provisioning
- Returns: `{ firstOwnerAccessPreparation: { artifactType: 'PLATFORM_INVITE', inviteId, invitePurpose, email, role, expiresAt, inviteToken } }`

### 5.11 GET /api/control/tenants/provision/status

**File:** `server/src/routes/admin/tenantProvision.ts`  
**Auth:** Same as provision route  
**Query params:** `orgId` or `orchestrationReference` (at least one required)  
**Returns:** Derived provisioning status — see §6.1 (queryProvisioningStatus service)

---

## 6. Backend Services and Config Repo-Truth Findings

### 6.1 tenantProvision.service.ts

**Constants:**
- `INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000` (7 days)
- `PROVISION_TRANSACTION_TIMEOUT_MS = 20_000` (20 seconds)
- `POST_ACTIVATION_ORG_STATUSES = new Set(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED'])`

**`buildInviteArtifact()`:**
- `crypto.randomBytes(32).toString('hex')` → SHA-256 hash
- `expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)` (7 days)
- Returns `{ inviteToken, tokenHash, expiresAt }`

**`provisionTenant()` — APPROVED_ONBOARDING path (exact sequence):**
1. Validates orchestrationReference not reused (`externalOrchestrationRef` unique index)
2. Creates tenant record
3. Creates organization with `status: 'VERIFICATION_APPROVED'`
4. Creates invite: `{ invitePurpose: 'FIRST_OWNER_PREPARATION', role: 'OWNER', tokenHash, expiresAt, externalOrchestrationRef }`
5. **NO user created, NO membership created**
6. Returns `firstOwnerAccessPreparation: { artifactType: 'PLATFORM_INVITE', inviteId, invitePurpose, email, role, expiresAt, inviteToken }`

**Note on APPROVED_ONBOARDING:** The organization is provisioned with status `VERIFICATION_APPROVED` — skipping the initial PENDING_VERIFICATION step. The activate-approved control-plane route (`§5.9`) requires `VERIFICATION_APPROVED` as its source state. This means the APPROVED_ONBOARDING flow is designed for tenants that have been pre-screened externally (via CRM/orchestration) and arrive already approved; the control-plane "activate" step is what moves them to ACTIVE.

**`queryProvisioningStatus()` — Derived activation signal:**
- Derives `ACTIVATED` from: `invite.acceptedAt IS NOT NULL` + OWNER membership exists + org.status in `POST_ACTIVATION_ORG_STATUSES`
- Activation signal label: `INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION`
- Returns: `{ orgId, orchestrationReference, slug, provisioningStatus ('ACTIVATED' | 'PROVISIONED'), organizationStatus, firstOwnerAccessPreparation, firstOwner, activation }`

### 6.2 email.service.ts — SMTP Dispatch Behavior

**`sendEmail()` dispatch decision tree:**

| Condition | Behavior | Return status |
|---|---|---|
| `NODE_ENV !== 'production'` (dev/test) | `console.log(JSON.stringify(devPayload))` | `{ status: 'DEV_LOGGED' }` |
| Production, SMTP not configured (`!SMTP_HOST` etc.) | `console.warn(...)` | `{ status: 'SKIPPED_SMTP_UNCONFIGURED' }` |
| Production, SMTP configured | `nodemailer.sendMail(...)` | `{ status: 'SENT' }` or throws |

**`sendInviteMemberEmail()` — exact implementation:**
```
inviteLink = `${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}&action=invite`
subject = `You've been invited to join ${orgName} on TexQtic`
html = raw inline paragraph HTML (NOT branded template)
text = plain-text fallback
```

**Critical finding — email template quality:**
- Invite email uses raw inline `<p>` tag HTML, NOT the branded `buildInquiryEmailBodies()` shell from `email.templates.ts`
- `email.templates.ts` contains ONLY `buildInquiryEmailBodies()` (for inquiry notification emails)
- No TexQtic-branded invite email template exists — the invite email is bare/unbranded
- This is a SHOULD_FIX_BEFORE_VERIFY item for production quality

**Invite link format:** `/accept-invite?token=...&action=invite`  
This is the frontend URL fragment that the `OnboardingFlow.tsx` / activation UI must handle.

### 6.3 email.templates.ts

Contains only `buildInquiryEmailBodies()` — table-based HTML shell with inline styles and `escHtml()` for injection prevention. Branded for inquiry notifications only. **No invite email template present.** The invite email body is defined inline in `email.service.ts:sendInviteMemberEmail()`.

### 6.4 config/index.ts — Onboarding and SMTP Gates

| Config key | Zod schema | Default | Notes |
|---|---|---|---|
| `SMTP_HOST` | `z.string().optional()` | undefined | Absent → SKIPPED_SMTP_UNCONFIGURED in production |
| `SMTP_USER` | `z.string().optional()` | undefined | — |
| `SMTP_PASS` | `z.string().optional()` | undefined | — |
| `SMTP_FROM` | `z.string().optional()` | undefined | — |
| `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` | `z.string().trim().length(64).optional()` | undefined | Must be a 64-char hex string (SHA-256) if present |
| `FRONTEND_URL` | Non-fatal parse | `'https://app.texqtic.com'` | Used in invite link construction |

**Assessment:** SMTP is fully optional at the config level. No startup failure occurs if SMTP is absent. In production without SMTP, all invite emails silently emit `SKIPPED_SMTP_UNCONFIGURED` and the invite record IS created successfully. This means activation tokens exist in the DB but are never delivered to recipients.

---

## 7. FTR-AUTH-001 Backend Assessment

**FTR-AUTH-001 classification:** MVP_CRITICAL / BOUNDED_DEFERRED_REMAINDER  
**Question being assessed:** Does current backend support a safe reused-existing-user invite acceptance path?

### 7.1 Existing-User Detection — Current State

**Route:** `POST /api/tenant/activate` — the `withDbContext` transaction, lines ~6340–6360

```typescript
// Step A: passwordHash computed BEFORE transaction (will be discarded for existing users)
const passwordHash = await bcrypt.hash(userData.password, 10);

// Step B: Inside transaction
let user = await tx.user.findUnique({ where: { email: normalizedUserEmail } });
user ??= await tx.user.create({
  data: { email: normalizedUserEmail, passwordHash, emailVerified: true, emailVerifiedAt: new Date() }
});
// If user existed: the ??= short-circuits; passwordHash is never used for existing user
```

**Verdict: PARTIAL implementation.** The `user ??= create(...)` pattern correctly avoids creating a duplicate User record. However, what follows is incomplete and unsafe.

### 7.2 Credential Bypass — CONFIRMED SECURITY GAP

**Gap:** When `user` is found (existing user), the `passwordHash` computed from the submitted `userData.password` is:
- NOT used to update `user.passwordHash`
- NOT validated against `user.passwordHash`
- Silently discarded

**Effect:** Any person in possession of a valid invite token for an address that already has a TexQtic user account can complete activation using **any password they choose** without knowing the account's real password. The token is the sole credential — the password field is inert for existing users. The JWT issued is fully valid.

**Classification:** BLOCKER — credential bypass is a security vulnerability.  
**FTR reference:** FTR-AUTH-001 — `BOUNDED_DEFERRED_REMAINDER`  
**FTR current status:** Not yet implemented, not authorized  

### 7.3 Duplicate Membership Risk — CONFIRMED DB EXCEPTION PATH

**Gap:** `tx.membership.create({ data: { userId: user.id, tenantId: invite.tenantId, role: resolvedRole } })` is called unconditionally.

The Membership model enforces `@@unique([userId, tenantId])`. If a user already has a membership in this tenant (possible in LEGACY_ADMIN provisioning path or any scenario where a user was directly provisioned then attempts invite-based activation), this will throw a Prisma P2002 unique constraint violation.

The `catch` handler for this route is:
```typescript
catch (error: unknown) {
  fastify.log.error({ err: error }, '[Tenant Activation] Error');
  return sendError(reply, 'INTERNAL_ERROR', 'Activation failed', 500);
}
```

**Effect:** The user receives a generic 500 with no actionable error code. The invite remains valid (transaction rolled back). The user cannot complete activation.

**Classification:** MVP_CRITICAL — unhandled exception path in production activation.  
**Required fix:** Pre-check for existing membership before calling `create`, and return a controlled error or handle the already-member case gracefully.

### 7.4 No "Sign In First" Pathway

There is no check anywhere in the activation flow that says: "if this email is an existing user, redirect them to sign in and then accept the invite." The current route treats new and existing users identically except for the `user ??= create(...)` shortcut — and the shortcut silently discards the password for existing users.

A correct implementation would need to either:
- **Option A:** Require existing users to authenticate (sign in) before accepting an invite
- **Option B:** Require existing users to enter their current password and validate it with `bcrypt.compare()` before proceeding
- **Option C:** Issue a challenge/confirmation to the existing user's email rather than accepting the invite inline

None of these paths exist today.

### 7.5 Summary — FTR-AUTH-001 Backend State

| Capability | Status |
|---|---|
| Detect existing user by email | ✅ Present (`findUnique` before `create`) |
| Validate credentials for existing users | ❌ ABSENT — credential bypass confirmed |
| Require existing users to sign in first | ❌ ABSENT — no such flow |
| Prevent credential bypass | ❌ ABSENT |
| Prevent duplicate membership (unique constraint 500) | ❌ ABSENT — unhandled P2002 path |
| Return controlled errors for existing-user edge cases | ❌ ABSENT — only generic 500 for constraint violations |
| Files requiring future implementation | `server/src/routes/tenant.ts` (POST /tenant/activate), possibly new auth service function |

---

## 8. FTR-LEGAL-003 Backend Assessment

**FTR-LEGAL-003 classification:** MVP_CRITICAL / NOT_ASSESSED  
**Question being assessed:** Does current backend support supplier ToS / platform agreement capture?

### 8.1 Schema Support — ZERO

| Check | Finding |
|---|---|
| `tos_acceptances` table | ❌ ABSENT — no such table in schema |
| ToS fields on `User` model | ❌ ABSENT — no `tos_accepted_at`, `tos_version`, or similar |
| ToS fields on `organizations` model | ❌ ABSENT — no legal consent fields |
| ToS fields on `Membership` model | ❌ ABSENT |
| ToS versioning infrastructure | ❌ ABSENT — no `tos_versions` or `legal_documents` table |

**Confirmed:** Zero ToS infrastructure at the schema level.

### 8.2 Route Support — ZERO

**POST /api/tenant/activate body schema (Zod):**
```
{
  inviteToken: string
  userData: { email, password }
  tenantData?: { name?, industry? }
  verificationData: { registrationNumber, jurisdiction }
}
```

No ToS acceptance field exists in the body schema. No ToS validation or enforcement occurs during activation. Activation can complete today without any legal consent being recorded.

### 8.3 Enforcement During Activation — NONE

No gate of any kind checks for ToS acceptance before issuing the activation JWT. The absence is total: no schema field, no route validation, no service layer check.

### 8.4 Versioning/Timestamp/Actor Capture — NONE

Since there is no ToS infrastructure, there is no versioning (e.g., `tos_version = '2026-05-01'`), no timestamp, and no actor association for consent.

### 8.5 Legal Input Required

**Yes.** Before FTR-LEGAL-003 can be implemented, the following must be decided by Paresh and/or external counsel:
- Which legal document(s) require consent at onboarding? (Platform ToS? Supplier agreement? Privacy policy?)
- At which step in activation must consent be captured? (Before issuing JWT? After?)
- What constitutes valid consent? (Checkbox? Explicit API field? E-signature?)
- How should consent version be tracked? (Timestamp + version string? External document reference?)
- What is the retention requirement for consent records?
- Does TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001 cover this? (See BLOCKED.md `HOLD_FOR_COUNSEL_FEEDBACK`)

**The current `HOLD_FOR_COUNSEL_FEEDBACK` TTP hold is directly relevant to FTR-LEGAL-003.**

### 8.6 Files Requiring Future Implementation

| File | Scope of change |
|---|---|
| `server/prisma/schema.prisma` | New `tos_acceptances` table (or fields on User/Membership) |
| `server/src/routes/tenant.ts` | POST /api/tenant/activate — add ToS field to body schema; write acceptance record |
| Possibly new migration | Schema migration required — requires explicit Paresh authorization |
| Possibly `services/tenantService.ts` (frontend) | Add ToS acceptance field to `ActivateTenantRequest` type |

### 8.7 Summary — FTR-LEGAL-003 Backend State

| Capability | Status |
|---|---|
| Schema support for ToS/platform agreement | ❌ ABSENT |
| Route body accepts ToS acceptance | ❌ ABSENT |
| Enforcement gate during activation | ❌ ABSENT |
| Version/timestamp/actor capture | ❌ ABSENT |
| Legal input required before implementation | ✅ YES — counsel feedback outstanding (HOLD_FOR_COUNSEL_FEEDBACK) |
| Implementation authorized | ❌ NOT AUTHORIZED |

---

## 9. SMTP / Backend Email Delivery Assessment

### 9.1 Email Dispatch Infrastructure

All transactional emails flow through `sendEmail()` in `server/src/services/email/email.service.ts`. The dispatch decision is runtime-environment-aware:

```
if (NODE_ENV !== 'production') → DEV_LOGGED
else if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) → SKIPPED_SMTP_UNCONFIGURED  
else → nodemailer.sendMail() → SENT or throws
```

All callers treat the dispatch as **fire-and-forget** — non-blocking, non-fatal. The invite record is created and the invite token exists in the DB regardless of email delivery status.

### 9.2 Production SMTP Status (HD-001)

| Field | Status |
|---|---|
| SMTP configured in config | Optional (`z.string().optional()`) |
| SMTP configured in Vercel production | NOT CONFIGURED — VERIFIED_BLOCKED per governance |
| Production email delivery | SKIPPED_SMTP_UNCONFIGURED — invite emails not delivered |
| Prior resolution unit | HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001 (VERIFIED_BLOCKED, 2026-05-20) |
| Invite records in DB | CREATED regardless of SMTP status |
| User impact | Activation tokens provisioned but never received by invitees |

**Classification:** BLOCKER — HD-001 SMTP production gap means no activation emails are delivered in production. The entire `APPROVED_ONBOARDING` flow is functionally blocked for real users.

### 9.3 Invite Email Template Quality

| Check | Finding |
|---|---|
| Uses branded `buildInquiryEmailBodies()` template | ❌ NO — raw inline HTML only |
| Uses TexQtic logo | ❌ NO |
| Subject line | `"You've been invited to join ${orgName} on TexQtic"` — minimal but adequate |
| HTML body | Raw `<p>` tag blocks only — not email-client-safe |
| Plain-text fallback | ✅ Present |
| HTML injection protection | ❌ ABSENT — `orgName` is interpolated directly into HTML without `escHtml()` |

**HTML injection risk:** `orgName` is interpolated directly into the HTML body in `sendInviteMemberEmail` without escaping. If `orgName` contains HTML-special characters (e.g., `<`, `>`, `&`), the email HTML is malformed. Controlled environment (legal_name set by admin), but this is a SHOULD_FIX_BEFORE_VERIFY item.

### 9.4 Invite Link Construction

```
${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}&action=invite
```

- Token is URL-encoded (correct)
- `FRONTEND_URL` defaults to `'https://app.texqtic.com'` (config fallback)
- The `/accept-invite` route must exist and be handled in the frontend router for the activation flow to complete

### 9.5 HD-001 FIRST_OWNER_PREPARATION Email (Provisioning Path)

The admin provisioning route (`POST /api/control/tenants/provision`) dispatches a non-blocking email for the `APPROVED_ONBOARDING` mode using the `inviteToken`. In production without SMTP, this email is also `SKIPPED_SMTP_UNCONFIGURED`. The provisioning record is created and the invite token IS returned in the API response so external CRM/orchestration systems can distribute it through alternative channels — but this is a workaround, not the designed delivery path.

---

## 10. Backend Blockers and Risks

### 10.1 BLOCKER Items

| ID | Description | Severity | FTR/Gate |
|---|---|---|---|
| B-01 | **Credential bypass for existing users** in POST /api/tenant/activate: existing User records are used without any password validation or challenge; the submitted password is silently discarded | BLOCKER — security vulnerability | FTR-AUTH-001 |
| B-02 | **Unhandled duplicate membership exception**: `tx.membership.create()` will throw P2002 unhandled → 500 INTERNAL_ERROR if user already has membership in this tenant | BLOCKER — silent failure path in production | FTR-AUTH-001 |
| B-03 | **HD-001 SMTP production gap**: SMTP not configured in Vercel production; all invite/activation emails emit `SKIPPED_SMTP_UNCONFIGURED`; users never receive activation links | BLOCKER — functional gate for real-user activation | HD-001 / INFRA_PREREQUISITE |

### 10.2 MVP_CRITICAL Items

| ID | Description | Classification |
|---|---|---|
| C-01 | **No ToS acceptance schema**: zero ToS infrastructure in schema; activation can complete without legal consent capture | MVP_CRITICAL — FTR-LEGAL-003; requires legal input + schema migration |
| C-02 | **No ToS gate in activation route**: POST /api/tenant/activate accepts no ToS field; cannot enforce consent requirement | MVP_CRITICAL — FTR-LEGAL-003 |

### 10.3 SHOULD_FIX_BEFORE_VERIFY Items

| ID | Description | Classification |
|---|---|---|
| S-01 | **Duplicate invite guard absent**: same email can receive two active invites for the same tenant; no uniqueness enforcement on (tenantId, email) for pending invites | SHOULD_FIX_BEFORE_VERIFY |
| S-02 | **Raw inline HTML in invite email**: invite email uses bare `<p>` tags; not email-client safe; `orgName` interpolated without `escHtml()` | SHOULD_FIX_BEFORE_VERIFY |
| S-03 | **No branded invite email template**: `email.templates.ts` has branded inquiry shell but no invite template; invite email is visually mismatched with inquiry emails | SHOULD_FIX_BEFORE_VERIFY |
| S-04 | **`inviteToken` returned in API response body**: POST /api/tenant/memberships returns plain-text token; this is intentional for dev tooling but should be explicitly scoped/documented | SHOULD_FIX_BEFORE_VERIFY |
| S-05 | **No `industry` field capture** in organizations model: `OnboardingFlow.tsx` step 1 collects `industry` but POST /api/tenant/activate does not write it; the field has no schema column | SHOULD_FIX_BEFORE_VERIFY (or OUT_OF_SCOPE if industry is not tracked at org level) |

### 10.4 PILOT_ONLY Items

| ID | Description | Classification |
|---|---|---|
| P-01 | **No onboarding progress state**: no server-side step tracking for multi-step activation; loss of state between steps requires full re-entry | PILOT_ONLY — acceptable for MVP |

### 10.5 POST_MVP Items

| ID | Description | Classification |
|---|---|---|
| M-01 | **No onboarding_sessions table**: no server-side onboarding session management | POST_MVP |
| M-02 | **No invite analytics or conversion tracking**: no visibility into invite open/click/activation funnel | POST_MVP |

### 10.6 OUT_OF_SCOPE for FAM-07

| ID | Description | Classification |
|---|---|---|
| O-01 | FTR-AUTH-002 — social/SSO login | OUT_OF_SCOPE per prior governance |
| O-02 | Referral code-based self-registration | OUT_OF_SCOPE — PublicReferralLanding is read-only |

---

## 11. Candidate Backend Implementation Surfaces

The following files will require changes when FAM-07 implementation is authorized. Listed for design planning only — no changes authorized by this unit.

### 11.1 For FTR-AUTH-001 (Credential bypass + duplicate membership)

| File | Required Change |
|---|---|
| `server/src/routes/tenant.ts` | POST /api/tenant/activate: add existing-user credential validation (`bcrypt.compare()`) or sign-in-first gate; add pre-membership-check with controlled error response |
| `server/src/services/email/email.service.ts` | Possibly: add new function for existing-user activation challenge email |

### 11.2 For FTR-LEGAL-003 (ToS acceptance infrastructure)

| File | Required Change |
|---|---|
| `server/prisma/schema.prisma` | Add `tos_acceptances` table (or ToS fields on User / Membership) |
| New migration file | Prisma migration for ToS schema — requires explicit authorization |
| `server/src/routes/tenant.ts` | POST /api/tenant/activate: add ToS acceptance field to Zod body schema; write acceptance record atomically in transaction |
| `services/tenantService.ts` (frontend) | Add ToS acceptance field to `ActivateTenantRequest` interface |
| `components/Onboarding/OnboardingFlow.tsx` | Add ToS consent step/checkbox to activation flow |

### 11.3 For HD-001 (SMTP production gap)

| Action | Owner |
|---|---|
| Configure SMTP in Vercel production environment | Paresh (infrastructure) — not a code change |
| Optional: add SMTP delivery health check | INFRA_PREREQUISITE |

### 11.4 For S-01 (Duplicate invite guard)

| File | Required Change |
|---|---|
| `server/src/routes/tenant.ts` | POST /api/tenant/memberships: add `invite.findFirst({ where: { tenantId, email, acceptedAt: null, expiresAt: { gt: now } } })` pre-check before create; return 409 INVITE_ALREADY_PENDING |

### 11.5 For S-02/S-03 (Invite email template)

| File | Required Change |
|---|---|
| `server/src/services/email/email.templates.ts` | Add `buildInviteEmailBodies()` function using branded table-based shell with `escHtml()` |
| `server/src/services/email/email.service.ts` | Update `sendInviteMemberEmail()` to use `buildInviteEmailBodies()` |

---

## 12. No-Implementation Confirmation

This unit performed **read-only backend investigation only**. The following confirms no implementation was performed:

- No source code files were modified.
- No schema files were modified.
- No migration files were created or run.
- No config or environment files were modified.
- No test files were created or modified.
- No package.json files were modified.
- No SMTP configuration was added.
- No local or production data was mutated.
- No LFI (LAUNCH-FAMILY-INDEX.md) entries were modified.
- No FTR (FUTURE-TODO-REGISTER.md) entries were modified.
- FTR-AUTH-001 remains OPEN / NOT_IMPLEMENTED.
- FTR-LEGAL-003 remains OPEN / NOT_IMPLEMENTED / HOLD_FOR_COUNSEL_FEEDBACK.
- FAM-07 status remains NOT_ASSESSED — NOT advanced to VERIFIED_COMPLETE.
- The single artifact created (`artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md`) is the only file write performed in this unit.

---

## 13. Completion Checklist

- [x] HEAD confirmed as `4653102`
- [x] Working tree confirmed CLEAN at start
- [x] Prior artifacts confirmed present
- [x] Invite model fully documented
- [x] Membership model fully documented
- [x] Tenant model documented
- [x] User model documented (ToS gap confirmed)
- [x] Organizations model fully documented (lines 1054–1133; status field lifecycle documented)
- [x] POST /api/tenant/activate fully traced (line by line for FTR-AUTH-001)
- [x] POST /api/tenant/memberships (invite create) documented
- [x] GET /api/tenant/memberships documented
- [x] POST resend, PATCH edit, DELETE revoke invite routes documented
- [x] PATCH membership role update route documented
- [x] POST /api/control/tenants/:id/onboarding/outcome documented
- [x] POST /api/control/tenants/:id/onboarding/activate-approved documented
- [x] POST /api/control/tenants/provision (both modes) documented
- [x] tenantProvision.service.ts fully documented
- [x] email.service.ts SMTP dispatch tree fully documented
- [x] sendInviteMemberEmail body and invite link format documented
- [x] email.templates.ts scope confirmed (inquiry only; no invite template)
- [x] config/index.ts SMTP gates confirmed optional
- [x] FTR-AUTH-001 credential bypass confirmed (B-01)
- [x] FTR-AUTH-001 duplicate membership exception confirmed (B-02)
- [x] FTR-LEGAL-003 schema absence confirmed (zero ToS infrastructure)
- [x] FTR-LEGAL-003 route absence confirmed (no ToS body field)
- [x] HD-001 SMTP production gap confirmed (SKIPPED_SMTP_UNCONFIGURED)
- [x] No-implementation statement complete
- [x] FAM-07 NOT advanced to VERIFIED_COMPLETE
- [x] FTR items not modified

---

## 14. Commit Instructions

**Stage only the artifact. Do not stage any other file.**

```
git add -f artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md
git status --short
git commit -m "docs: audit FAM-07 backend onboarding repo truth"
git show --stat HEAD
```

**Expected staged files (only):**
- `artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md` (new)

**Expected unstaged/untracked files:** none (working tree should be clean except for this new artifact before staging)

---

## 15. Final Enum

```
FAM_07A_TENANT_ONBOARDING_BACKEND_REPO_TRUTH_COMPLETE
```

**Summary:**
- All required backend surfaces investigated
- FTR-AUTH-001 confirmed: credential bypass (B-01) + unhandled duplicate membership 500 (B-02)
- FTR-LEGAL-003 confirmed: zero ToS infrastructure at schema, route, and enforcement levels; legal input required before implementation; blocked by HOLD_FOR_COUNSEL_FEEDBACK
- HD-001 confirmed: SMTP not configured in Vercel production; activation emails not delivered
- Three BLOCKER items, two MVP_CRITICAL items, five SHOULD_FIX_BEFORE_VERIFY items documented
- No implementation performed
- FAM-07 remains NOT_ASSESSED, not VERIFIED_COMPLETE
- Single artifact created; ready for commit
