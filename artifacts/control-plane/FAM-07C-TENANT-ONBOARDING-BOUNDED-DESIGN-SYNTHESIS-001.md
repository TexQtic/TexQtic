# FAM-07C — Tenant Onboarding and Invite: Bounded Design Synthesis

**Unit ID:** `FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001`
**Document type:** Bounded design synthesis — non-implementation governance artifact
**Date:** 2026-07-07
**Prepared by:** GitHub Copilot agent under Paresh Patel authorization
**Status:** DESIGN_SYNTHESIS_COMPLETE
**Predecessor units:** FAM-07A (backend repo-truth, commit `50bf5bc`), FAM-07B (frontend/tests/runtime repo-truth, commit `860d676`)
**Current HEAD at synthesis:** `860d676`
**Commit authorization:** `docs: synthesize FAM-07 bounded design`

> **Safety invariant:** This unit performs design synthesis and governance planning only.
> No source code, schema, migration, config, test, package, or environment files were modified.
> FAM-07 status is NOT advanced to VERIFIED_COMPLETE.
> FTR-AUTH-001 and FTR-LEGAL-003 remain OPEN / not implemented.
> LAUNCH-FAMILY-INDEX.md and FUTURE-TODO-REGISTER.md are NOT edited by this unit.

---

## 1. Task Identity

**Task:** Synthesize FAM-07A + FAM-07B evidence + legal counsel design context into bounded
implementation and design slices (FAM-07D through FAM-07J), recommend a single next prompt,
and update governance control pointers.

**Authorized by:** Paresh Patel (FAM-07C bounded design synthesis authorization)

**Governance scope boundary:**
- Allowed write: `artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md`,
  `governance/control/NEXT-ACTION.md`, `governance/control/OPEN-SET.md`
- Not allowed: any source, schema, config, test, package, migration file
- Not allowed: LAUNCH-FAMILY-INDEX.md, FUTURE-TODO-REGISTER.md
- Not allowed: advance FAM-07 to VERIFIED_COMPLETE
- Not allowed: implement FTR-AUTH-001, FTR-LEGAL-003, FTR-AUTH-004, HD-001
- Not allowed: merge FAM-08/09/11/18, TTP, NC-TTP into FAM-07

---

## 2. Starting HEAD and Repo State

| Field | Value |
|---|---|
| HEAD at start | `860d676` — `docs: audit FAM-07 frontend tests runtime repo truth` |
| Working tree | CLEAN — confirmed before synthesis began |
| artifacts/ in .gitignore | YES — must use `git add -f` for artifact files |

---

## 3. Prerequisites Confirmed

| Artifact | Commit | Present |
|---|---|---|
| `FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md` | `50bf5bc` | ✅ Confirmed |
| `FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md` | `860d676` | ✅ Confirmed |
| `FAM-07-TENANT-ONBOARDING-OPENING-REPO-TRUTH-AUDIT-001.md` | `402a609` | ✅ Confirmed (earlier opening audit) |
| `LAYER0-FAM-07-AUTHORIZATION-RELEASE-001.md` | N/A | ✅ Confirmed (governance sync artifact) |

FAM-07 family LFI status at start: `REPO_CONFIRMED` — bounded design required.
FTR-AUTH-001: `DESIGN_GATED` / `MVP_CRITICAL` / `P1` / `OPEN`
FTR-LEGAL-003: `NOT_ASSESSED` / `MVP_CRITICAL` / `P1` / `OPEN` — PRIT-012
TTP legal packet: `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` — `LEGAL_REVIEW_PENDING`
Counsel feedback: Initial design-context suggestions received (informal); no formal
`TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001` present in repo at time of synthesis.

---

## 4. Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md` | Backend repo-truth source of record |
| `artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md` | Frontend/tests/runtime source of record |
| `governance/control/NEXT-ACTION.md` | Current Layer 0 pointer and candidate unit state |
| `governance/control/OPEN-SET.md` | Layer 0 posture and operating notes |
| `governance/control/BLOCKED.md` | Current blockers and holds |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 family status (§6 row, §7 detail, §8 summary) |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001, FTR-LEGAL-003, FTR-AUTH-004, FTR-AUTH-002 entries |
| `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` | Legal counsel context packet (consent/ToS design inputs) |
| `TECS.md` | Execution and compliance system operating rules |

---

## 5. Evidence Synthesis — FAM-07A (Backend)

### 5.1 Schema Findings Summary

**Invite model:** Structurally complete. Fields: id, tenantId (FK→Tenant, cascade delete), email,
role (MembershipRole, default MEMBER), tokenHash (SHA-256 of plain token), expiresAt (7-day),
acceptedAt (null=pending; set atomically on activation), createdAt, externalOrchestrationRef,
invitePurpose (default "TEAM_MEMBER"; "FIRST_OWNER_PREPARATION" for provisioning). No structural
gaps. No duplicate-invite guard (S-01 gap).

**Membership model:** `@@unique([userId, tenantId])` correctly enforced. This is the source of
B-02 (unhandled Prisma P2002 on membership.create if user already has membership in this tenant).

**User model:** No ToS fields of any kind (`tos_accepted_at`, `tos_version` etc.) — zero ToS
infrastructure at User level. Critical schema gap for FTR-LEGAL-003.

**Organizations model:** `status` field is the canonical onboarding lifecycle field (not a
Prisma enum; SQL check constraint). Lifecycle:
`(provisioned) → PENDING_VERIFICATION → VERIFICATION_APPROVED/REJECTED/NEEDS_MORE_INFO → ACTIVE`
No ToS fields. No consent fields. No onboarding session/state table.

**Schema gaps table:**

| Gap | FTR | Impact |
|---|---|---|
| No `tos_acceptances` table | FTR-LEGAL-003 | Zero ToS/consent capture |
| No ToS fields on User or organizations | FTR-LEGAL-003 | No version, timestamp, actor |
| No `onboarding_sessions` table | POST_MVP | No server-side step progress |
| No duplicate invite guard on (tenantId, email) | S-01 | Two valid invites per email possible |

### 5.2 Route Findings Summary

**POST /api/tenant/activate — critical analysis:**
- Auth: PUBLIC (invite token is sole credential)
- Activation sequence: hash token → findFirst invite (by tokenHash, acceptedAt null, expiresAt > now) → email match → bcrypt.hash(password) — **computed before transaction** → withDbContext transaction containing:
  1. `user = tx.user.findUnique(email)` → `user ??= tx.user.create(...)` — **B-01 bypass**: if user exists, supplied password is silently discarded without validation
  2. organizations.update: registration_no, jurisdiction, status → PENDING_VERIFICATION
  3. membership.create (resolvedRole = OWNER if no existing owner) — **B-02 risk**: P2002 if membership already exists
  4. invite.acceptedAt set
  5. Audit log written
- Returns: `{ token, user: { id, email }, tenant: { ... }, membership: { role } }`
- Error handler: **all exceptions → 500 INTERNAL_ERROR "Activation failed"** (no specific P2002 handling)

**POST /api/tenant/memberships (invite create):** OWNER/ADMIN only. 7-day expiry token. Fire-and-
forget email. Returns `inviteToken` in response (dev-only behavior; intentional). No duplicate
invite guard.

**GET, resend, patch, delete invite routes:** Present and correct. VIEWER role blocked (422).
409 guards for state transitions. All with audit logs.

**PATCH /api/tenant/memberships/:id (role update):** OWNER only. OWNER invariant enforced
(cannot demote sole OWNER). VIEWER transitions blocked.

**POST /api/control/tenants/:id/onboarding/outcome:** SUPER_ADMIN only. Drives
PENDING_VERIFICATION → VERIFICATION_APPROVED/REJECTED/NEEDS_MORE_INFO. State machine guards.
Covered by integration test.

**POST /api/control/tenants/:id/onboarding/activate-approved:** SUPER_ADMIN only. Requires
VERIFICATION_APPROVED source state. Transitions organizations.status + tenant.status to ACTIVE.

**POST /api/control/tenants/provision (two modes):**
- `LEGACY_ADMIN`: Creates org + tenant + user + OWNER membership + invite immediately.
- `APPROVED_ONBOARDING`: Creates org (status VERIFICATION_APPROVED) + tenant + invite with
  `invitePurpose: 'FIRST_OWNER_PREPARATION'`. No user created, no membership created.
  Returns `firstOwnerAccessPreparation` artifact with inviteToken.

### 5.3 Service and Config Findings Summary

**tenantProvision.service.ts:** 7-day invite expiry. 20s tx timeout. APPROVED_ONBOARDING
provisions org at VERIFICATION_APPROVED (pre-screened; activate-approved step moves to ACTIVE).

**email.service.ts dispatch tree:** DEV_LOGGED (non-production) / SKIPPED_SMTP_UNCONFIGURED
(production, SMTP absent) / SENT (production, SMTP present). All callers fire-and-forget.

**Invite email template:** Raw inline HTML (bare `<p>` tags). No branded template shell.
`orgName` interpolated without `escHtml()` — minor HTML injection risk in email body.
Invite link format: `${FRONTEND_URL}/accept-invite?token=...&action=invite`

**config/index.ts:** SMTP fully optional. No startup failure if absent.
`APPROVED_ONBOARDING_SERVICE_TOKEN_HASH`: optional 64-char hex hash for service bearer auth.
`FRONTEND_URL`: defaults to `'https://app.texqtic.com'`.

### 5.4 Backend Blockers and Gaps

| ID | Description | Classification |
|---|---|---|
| B-01 | Credential bypass for existing users in POST /api/tenant/activate | BLOCKER — security vulnerability (FTR-AUTH-001) |
| B-02 | Unhandled duplicate membership Prisma P2002 → generic 500 | BLOCKER — silent failure path (FTR-AUTH-001) |
| B-03 / HD-001 | SMTP not configured in Vercel production; all invite emails SKIPPED_SMTP_UNCONFIGURED | BLOCKER — functional gate for real-user activation |
| C-01 | No ToS acceptance schema (`tos_acceptances` table absent) | MVP_CRITICAL — FTR-LEGAL-003 |
| C-02 | No ToS field in POST /api/tenant/activate body or enforcement | MVP_CRITICAL — FTR-LEGAL-003 |
| S-01 | No duplicate invite guard for (tenantId, email) | SHOULD_FIX_BEFORE_VERIFY |
| S-02/S-03 | Raw inline HTML in invite email; no branded template; orgName not escaped | SHOULD_FIX_BEFORE_VERIFY (FTR-AUTH-004) |
| S-04 | `inviteToken` returned in API response (dev-only, intentional) | SHOULD_FIX_BEFORE_VERIFY — document scope |
| S-05 | `industry` field collected in OnboardingFlow Step 1 but not written to DB | SHOULD_FIX_BEFORE_VERIFY or OUT_OF_SCOPE |

---

## 6. Evidence Synthesis — FAM-07B (Frontend / Tests / Runtime)

### 6.1 Frontend Findings Summary

**App.tsx and OnboardingFlow.tsx — critical analysis:**
- `App.tsx` routes `/accept-invite` via Vercel catch-all → `?action=invite` query param detection
  (NOT a named SPA route — URL convention only). R-08 finding.
- `App.tsx` `onComplete` handler: always calls `activateTenant(formData)` passing `formData.password` —
  no existing-user branch, no sign-in redirect. **F-01/B-01 frontend mirror confirmed.**
- `OnboardingFlow.tsx`: 4-step form (email → "Create Password" → verification details → confirm).
  Step 2 always shows "Create Password" label — no existing-user detection, no sign-in branch.
- `ActivateTenantRequest` (frontend type): no `tosAccepted` field, no `existingUser` field. Aligned
  with backend body schema gap.
- Token stored before `getCurrentUser()` — no rollback on post-activation failure (FC-03).
- VIEWER role selectable in `InviteMemberForm` but backend returns 422 VIEWER_TRANSITION_OUT_OF_SCOPE (F-08).
- All 4 `InviteEmailDeliveryStatus` values (`SENT`, `DEV_LOGGED`, `SKIPPED_SMTP_UNCONFIGURED`,
  `FAILED`) correctly surfaced in `InviteMemberPanel.tsx` (F-12).
- `/accept-invite?token=...&action=invite` — `action` param detected in App.tsx: triggers
  onboarding flow with invite token pre-populated (R-08).

**ToS frontend status — confirmed zero:**
- No `tosAccepted` field in `OnboardingFlow.tsx` formData
- No ToS checkbox, step, or page in the 4-step form
- No ToS display text or link
- No ToS field in `ActivateTenantRequest` interface
- F-02/C-01 confirmed at frontend level.

**Runtime and config findings:**
- `KILL_SWITCH_ALL` env var: default `false` — global platform kill switch, not activation-specific
- No activation-specific feature flag exists (R-10)
- `/accept-invite` is URL convention only — no dedicated route in SPA router (R-08)
- SMTP env vars: all optional at config level (R-02)

### 6.2 Test Coverage Gaps Summary

| Gap ID | Description | Files affected |
|---|---|---|
| T-GAP-01 | Zero tests for `OnboardingFlow` 4-step form or `ActivationStep` components | `tests/frontend/` — missing activation flow tests |
| T-GAP-02 | No test for existing-user credential bypass path in activation | Backend and frontend |
| T-GAP-03 | No test for duplicate membership P2002 in activation | Backend only |
| T-GAP-04 | No test for ToS acceptance (field absent at all layers) | Backend, frontend, and type contract |
| T-GAP-05 | No test for invalid/expired invite in activate route | Backend — activation error states |
| T-GAP-06 | No test for already-accepted invite reuse attempt | Backend — idempotency guard |
| T-GAP-07 | No test for email mismatch in activate route | Backend |

### 6.3 Frontend/Backend Contract Gaps

| Gap | Description |
|---|---|
| Existing-user path | Frontend sends password always; backend discards for existing users; no contract alignment |
| ToS field | Type contract (`ActivateTenantRequest`) has no ToS field; both sides would need simultaneous update |
| VIEWER in InviteMemberForm | Frontend allows VIEWER selection; backend returns 422; UX shows error with no prevention |
| `industry` field | Collected in step 1 but no backend writes it; silently discarded |

---

## 7. Legal Counsel Context and Design Implications

### 7.1 What Was Read

`TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` — the TradeTrust Pay external legal counsel review
packet (unified Platform TTP + NC-TTP supplement). Status: `LEGAL_REVIEW_PENDING` throughout.
No formal `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001` exists in the repo at time of synthesis.
Initial design-context suggestions received informally from counsel per Paresh.

### 7.2 Legal Counsel Design Inputs (Design Context Only — NOT Final Binding Language)

The following points are extracted from the TTP legal packet as design-context guidance. They are
labeled `LEGAL_REVIEW_PENDING` and must NOT be treated as legally approved wording or final
implementation requirements. They inform architecture direction only.

**Consent framework doctrine (from §5 Surface 12, TTP legal packet):**
- Consent should be: explicit, purpose-specific, informed, revocable, auditable
- Consent wording candidate concept (NOT approved): *"I consent to [purpose]. This consent is
  valid for [duration] and may be revoked at any time."*
- Consent architecture should capture: purpose, duration mechanism, revocation mechanism

**Data-sharing consent doctrine (from §5 Surface 13, TTP legal packet):**
- Data-sharing consent must identify: purpose, data categories, recipients/recipient class, and
  revocation mechanism
- DPDP-aligned consent language required before any data sharing

**ToS / Terms architecture design implications for FAM-07:**
These are architectural inferences only (not counsel instructions for FAM-07 specifically):

| Design implication | Architecture decision |
|---|---|
| Explicit, auditable consent | `tos_acceptances` table preferred over field-on-user pattern |
| Purpose-specific consent | Each acceptance record should carry a `purpose` field |
| Version tracking | `tosVersion` (string, e.g. `"2026-v1"`) required per acceptance record |
| Timestamp | `acceptedAt` timestamptz required |
| Actor association | `userId` FK required |
| Tenant/org relation | `tenantId` FK required |
| Source surface tracking | `sourceContext` (e.g. `"onboarding_activation"`) recommended |
| Revocation mechanism | `revokedAt` (nullable) or separate `tos_revocations` table — to be decided with counsel |
| IP address capture | Optional; DPDP considerations apply |

### 7.3 FTR-LEGAL-003 Classification (This Unit)

**Classification:** `DESIGN-READY_FOR_ARCHITECTURE` + `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT`

Rationale:
- The consent table schema architecture (structure of `tos_acceptances`) can be designed now
  based on pattern principles (explicit, versioned, timestamped, actor-keyed, purpose-scoped)
  without depending on final legal wording.
- The API body schema extension (`tosAccepted: boolean`, `tosVersion: string`) can be designed.
- The frontend UI pattern (checkbox + legal text display area) can be designed.
- HOWEVER: implementation cannot be activated in production without:
  1. Final approved ToS legal text (version identifier + URL)
  2. Paresh explicit approval of final wording
  3. External counsel sign-off (for supplier agreement wording specifically)
- FTR-LEGAL-003 TTP hold (`HOLD_FOR_COUNSEL_FEEDBACK`) applies to TTP-track consent surfaces
  specifically and does NOT block FAM-07 platform ToS consent architecture work.
- The design slice (FAM-07E) can be opened; implementation must be gated by final legal text.

### 7.4 Scope Boundary Note

**TTP / NC-TTP consent design is OUT_OF_SCOPE for FAM-07.** FAM-07 covers platform ToS for
supplier onboarding only (the "you accept TexQtic's terms when creating your account" consent
surface). TTP data-sharing and finance partner consent are a distinct surface under the TTP track.
These must not be conflated.

---

## 8. Scope Classification Matrix

### 8.1 Core Implementation Items (CORE — FAM-07)

| ID | Description | Classification | Slice |
|---|---|---|---|
| FTR-AUTH-001 B-01 | Credential bypass: existing user password not validated in activation | CORE / BLOCKER / MVP_CRITICAL | FAM-07D |
| FTR-AUTH-001 B-02 | Unhandled Prisma P2002 duplicate membership → generic 500 | CORE / BLOCKER / MVP_CRITICAL | FAM-07D |
| FTR-AUTH-001 frontend | OnboardingFlow always collects password; no existing-user branch | CORE / BLOCKER / MVP_CRITICAL | FAM-07G |
| FTR-LEGAL-003 C-01 | No `tos_acceptances` schema | CORE / MVP_CRITICAL / DESIGN_GATED | FAM-07E |
| FTR-LEGAL-003 C-02 | No ToS field or enforcement in activation route | CORE / MVP_CRITICAL / DESIGN_GATED | FAM-07E |
| /accept-invite route hardening | Invalid/expired/already-accepted invite error states | CORE | FAM-07G |
| Activation test coverage | T-GAP-01 through T-GAP-07 (zero tests for activation flow) | CORE | FAM-07F |
| Control-plane onboarding routes | outcome + activate-approved — present; tested adequately | CORE / PRESENT | N/A |
| Invite CRUD lifecycle | Create/resend/edit/delete — present and correct | CORE / PRESENT | N/A |
| Duplicate invite guard S-01 | No uniqueness on (tenantId, email) for pending invites | CORE / SHOULD_FIX | FAM-07D |

### 8.2 Adjacent Items

| ID | Description | Classification | Slice |
|---|---|---|---|
| FTR-AUTH-004 S-02/S-03 | Branded invite email template; HTML escaping; delivery UX polish | ADJACENT / PILOT_REQUIRED / P2 | FAM-07I |
| VIEWER invite UX mismatch F-08 | VIEWER selectable in UI; backend rejects with 422; no prevention | ADJACENT / SHOULD_FIX | FAM-07J |
| FAM-08 Tenant workspace handoff | Post-activation workspace setup flow | ADJACENT / out of FAM-07 scope | FAM-08 |
| Token storage rollback FC-03 | Token stored before getCurrentUser(); no rollback on failure | ADJACENT / SHOULD_FIX | FAM-07G |
| S-05 `industry` field gap | Collected in OnboardingFlow but not written to DB | ADJACENT / OUT_OF_SCOPE_IF_UNTRACKED | FAM-07G or exclude |

### 8.3 Infrastructure Prerequisites (INFRA_PREREQUISITE)

| ID | Description | Classification | Slice |
|---|---|---|---|
| HD-001 SMTP | SMTP not configured in Vercel production; all activation emails SKIPPED | INFRA_PREREQUISITE / BLOCKER | FAM-07H |
| S-04 inviteToken in API response | Plain-text token returned in POST /memberships response | INFRA_PREREQUISITE / DOCUMENT_SCOPE | FAM-07D |

### 8.4 Post-MVP Items (POST_MVP)

| ID | Description | Classification | Slice |
|---|---|---|---|
| M-01 onboarding_sessions table | Server-side onboarding step progress tracking | POST_MVP | — |
| M-02 Invite analytics | Invite open/click/activation funnel | POST_MVP | — |

### 8.5 Out of Scope for FAM-07

| ID | Description | Classification |
|---|---|---|
| FTR-AUTH-002 | White-label onboarding path | OUT_OF_SCOPE — WL Co hold REVIEW-UNKNOWN; POST_MVP/BLOCKED |
| TTP/NC-TTP consent | Finance/data-sharing consent architecture | OUT_OF_SCOPE — separate TTP track |
| FAM-08/09/11/18 | Post-activation workspace, catalog, billing, etc. | OUT_OF_SCOPE — separate families |
| Social/SSO login FTR-AUTH-002 | OAuth2 / social identity providers | OUT_OF_SCOPE — prior governance |
| Referral code self-registration | PublicReferralLanding read-only | OUT_OF_SCOPE — prior governance |
| CRM/CAE reconciliation surfaces | CRM audit/evidence feed, CAE | OUT_OF_SCOPE — separate governance |

---

## 9. Bounded Implementation and Design Slice Plan

This section defines the bounded slices FAM-07D through FAM-07J. Each slice is self-contained.
None of these slices is authorized for implementation by this unit; they require separate explicit
Paresh authorization per slice.

---

### FAM-07D — Existing-User Invite Acceptance Security Fix (FTR-AUTH-001)

**Classification:** CORE / BLOCKER / MVP_CRITICAL / IMPLEMENTATION_READY (no schema migration, no
SMTP dependency, no legal text dependency)

**Problem statement:**
1. B-01: When a known TexQtic user is invited and completes the activation form, the supplied
   password is silently discarded (the bcrypt hash is computed but never validated against the
   existing user's stored `passwordHash`). Any person with a valid invite token and knowledge of
   the recipient's email can activate the workspace as that person using any password. This is a
   credential bypass security vulnerability.
2. B-02: If the invitee already has a Membership row for this tenant (possible in LEGACY_ADMIN
   mode or multi-invite scenarios), `tx.membership.create()` throws Prisma P2002. The generic
   catch returns 500 INTERNAL_ERROR "Activation failed" with no actionable message. The invite
   is not consumed and remains valid — but the user cannot complete activation.
3. S-01: Two active invites can exist for the same email + tenant combination (no duplicate guard).

**Design decision required (Paresh must choose one):**

| Option | Description | Pros | Cons |
|---|---|---|---|
| **Option A — Sign-in-first flow** | If existing user detected on invite token fetch, backend returns a new error code `EXISTING_USER_MUST_SIGN_IN`. Frontend detects this and shows a "You already have an account — sign in to accept this invite" message. After sign-in, a separate `PATCH /accept-invite` endpoint accepts the invite using the authenticated user's session JWT. | UX is cleaner; no password re-entry confusion; aligns with industry norms (GitHub, Slack). | Requires new backend endpoint + frontend branch + additional roundtrip. |
| **Option B — Validate existing password inline** | In POST /api/tenant/activate, after `user = findUnique(email)` succeeds, call `bcrypt.compare(userData.password, user.passwordHash)`. If false → 401 INVALID_CREDENTIALS. If true → proceed. | Single endpoint, minimal code change, no new route needed. | Requires user to know their account password; confusing UX ("Create Password" label is wrong for existing users). |
| **Option C — Email challenge** | If existing user detected, don't accept password at all. Instead send a magic-link/challenge to the existing user's email and require them to click it. | Most secure; no password transmission | Requires SMTP (HD-001 blocker); complex to implement; unsuitable without production SMTP. |

**Recommended design direction:** **Option A** (sign-in-first). This aligns with industry norms,
avoids requiring the user to remember a "wrong" password field, and provides the cleanest
implementation path. It requires SMTP for the invite email delivery itself (HD-001) but does not
require SMTP for the sign-in-then-accept flow.

**Backend allowlist (when authorized):**

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | POST /api/tenant/activate: detect existing user; return new error code `EXISTING_USER_MUST_SIGN_IN` (or validate password per Option B); add pre-check for existing membership before `membership.create()`; return 409 ALREADY_MEMBER with actionable message |
| `server/src/routes/tenant.ts` | POST `/api/tenant/memberships/invites/:id/accept` (new): authenticated endpoint that accepts an invite using session JWT; allows existing user to accept invite after sign-in |
| `server/src/services/email/email.service.ts` | No changes required for B-01/B-02 fix itself |

**Frontend allowlist (when authorized):**

| File | Change |
|---|---|
| `components/Onboarding/OnboardingFlow.tsx` | Detect `EXISTING_USER_MUST_SIGN_IN` error code; render sign-in branch with appropriate message |
| `App.tsx` | Handle new error code from activateTenant(); redirect to sign-in with invite context |
| `services/tenantService.ts` | Update `ActivateTenantRequest` if new field required; update API client for new accept endpoint |

**S-01 fix (duplicate invite guard — same allowlist):**

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | POST /api/tenant/memberships: add `invite.findFirst({ where: { tenantId, email, acceptedAt: null, expiresAt: { gt: now } } })` pre-check; return 409 INVITE_ALREADY_PENDING |

**Test requirements (when authorized):**

- T-GAP-02: test for existing-user credential bypass prevention
- T-GAP-03: test for duplicate membership (pre-check returns 409, not 500)
- T-GAP-06: test for already-accepted invite reuse attempt
- T-GAP-07: test for email mismatch in activation
- All existing invite lifecycle tests must continue to PASS

**No schema migration required.** All changes are route + service + frontend only.

---

### FAM-07E — ToS / Platform Agreement Consent Architecture (FTR-LEGAL-003)

**Classification:** CORE / MVP_CRITICAL / `DESIGN-READY_FOR_ARCHITECTURE` + `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT`

**Problem statement:** Zero ToS infrastructure at schema, route, and frontend levels. Platform
cannot capture, version, timestamp, or audit supplier consent to platform terms at onboarding.
This is a legal requirement (FTR-LEGAL-003 / PRIT-012) classified MVP_CRITICAL/P1. A simplified
pilot supplier agreement is acceptable as first iteration (per PRIT-012 note). External counsel
may be needed for final wording.

**Architecture design (this unit — no implementation):**

**Schema design for `tos_acceptances` table:**

```
model TosAcceptance {
  id              String   @id @default(uuid())
  userId          String
  tenantId        String
  tosVersion      String   @db.VarChar(50)   // e.g. "platform-tos-2026-v1"
  acceptedAt      DateTime @default(now()) @db.Timestamptz
  sourceContext   String   @db.VarChar(100)  // e.g. "onboarding_activation"
  ipAddress       String?  @db.VarChar(45)   // optional; IPv4 or IPv6
  revokedAt       DateTime? @db.Timestamptz  // null = active
  user            User     @relation(fields: [userId], references: [id])
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
}
```

Notes:
- Separate table preferred over field-on-User to support multi-purpose, multi-version consents
- `tosVersion` is a string identifier that maps to a published legal document (URL TBD by Paresh)
- `revokedAt` nullable: captures revocation; a revoked acceptance is not deleted (audit trail)
- GDPR/DPDP consideration: table should be covered by RLS policy scoped to tenantId
- Schema migration requires explicit Paresh authorization before applying

**API body extension design for POST /api/tenant/activate:**

```typescript
// Addition to ActivateTenantRequest Zod schema (NOT YET IMPLEMENTED)
tosAcceptance: z.object({
  accepted: z.literal(true),          // must be true; false = reject
  tosVersion: z.string().min(1),      // version identifier; validated against current valid version
})
```

**Frontend UI design for OnboardingFlow:**

- Add step between verification details and confirm: "Platform Terms" step
- Display rendered ToS text (URL link to published document, not inline HTML)
- Checkbox: "I have read and accept the TexQtic Platform Terms of Service [version]"
- `tosVersion` must be injected from server config or environment (not hardcoded in frontend)
- Disabled "Continue" button until checkbox checked
- No OnboardingFlow source changes authorized until legal text finalized

**Implementation gate:**
- `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT`: schema migration, route change, and frontend
  changes may NOT be implemented until Paresh confirms final ToS document version identifier
  and legal text has been reviewed by counsel.
- This gate applies to the `tos_acceptances` table creation, the activation route body change,
  and the frontend ToS step.
- Architecture planning (this document) does NOT require the final text to be available.

---

### FAM-07F — Activation Route Hardening and Test Coverage

**Classification:** CORE / MVP_CRITICAL (test coverage prerequisite for FAM-07D production launch)

**Problem statement:** Zero tests for the 4-step `OnboardingFlow` component and activation API
route. T-GAP-01 through T-GAP-07 represent a full absence of tests for the most critical user
journey in the platform.

**Backend test file allowlist (when authorized):**

| File | Scope |
|---|---|
| `server/src/__tests__/tenant-activate.integration.test.ts` (new) | POST /api/tenant/activate: happy path, email mismatch, expired invite, already-accepted invite, existing user existing membership (P2002 → 409), invite not found |
| `server/src/__tests__/tenant-activate.integration.test.ts` | JWT issued; audit log written; organization status updated to PENDING_VERIFICATION |
| Existing invite CRUD tests | Must continue to PASS; no regression |

**Frontend test file allowlist (when authorized):**

| File | Scope |
|---|---|
| `tests/frontend/onboarding-activation.test.ts` (new) | OnboardingFlow 4-step form render; step navigation; form validation; `activateTenant()` called on complete; error states displayed |
| `tests/frontend/onboarding-activation.test.ts` | Existing-user error code displayed (after FAM-07D frontend change) |

**Note:** FAM-07F test suite must follow FAM-07D implementation. Tests cannot be written before
the routes they exercise are in their final post-FAM-07D state.

---

### FAM-07G — Frontend Onboarding UX Alignment

**Classification:** CORE (existing-user branch) + ADJACENT (ToS UI, gated by legal text)

**Problem statement:** Multiple frontend gaps identified in FAM-07B that require code changes
after the backend changes in FAM-07D.

**Sub-items:**

| Sub-item | Classification | Gate |
|---|---|---|
| Existing-user branch in OnboardingFlow (detect EXISTING_USER_MUST_SIGN_IN, show sign-in path) | CORE | After FAM-07D backend authorized |
| /accept-invite error states: invalid token, expired token, already accepted, email mismatch | CORE | After FAM-07D backend authorized |
| Token storage rollback (FC-03: store token AFTER getCurrentUser() succeeds, not before) | ADJACENT / SHOULD_FIX | Can be independent small fix |
| VIEWER in InviteMemberForm client-side prevention | ADJACENT / SHOULD_FIX (moved to FAM-07J) | Independent small fix |
| ToS UI step in OnboardingFlow | CORE (but GATED) | IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT |

**Frontend allowlist (when authorized):**

| File | Change |
|---|---|
| `components/Onboarding/OnboardingFlow.tsx` | Existing-user branch; /accept-invite error states; ToS step (gated) |
| `App.tsx` | Handle EXISTING_USER_MUST_SIGN_IN; token storage order fix |
| `services/tenantService.ts` | `ActivateTenantRequest` ToS field (gated by FAM-07E legal text gate) |

---

### FAM-07H — SMTP Production Delivery Prerequisite (HD-001)

**Classification:** INFRA_PREREQUISITE / BLOCKER

**Problem statement:** SMTP is not configured in Vercel production. All invite and activation
emails emit `SKIPPED_SMTP_UNCONFIGURED`. Activation tokens are created in the DB but never
delivered to invitees. The entire `APPROVED_ONBOARDING` flow is functionally blocked for real
users.

**Resolution:** Infrastructure-only (no code changes). Paresh must:

1. Provision an SMTP provider account (e.g. Postmark, SendGrid, AWS SES, or Resend)
2. Configure the following Vercel environment variables in the production project:
   - `SMTP_HOST` — SMTP server hostname
   - `SMTP_USER` — SMTP authentication username
   - `SMTP_PASS` — SMTP authentication password
   - `SMTP_FROM` — From email address (e.g. `noreply@texqtic.com`)
3. Verify delivery via GET /api/control/tenants/provision (test provisioning with real email)

**No source code changes required** for HD-001 resolution. Existing `email.service.ts` dispatch
logic is already production-ready once SMTP env vars are present.

**Note on FTR-OPS-004 (Postmark delivery webhook):** Separate future TODO. Not required for
basic SMTP delivery. HD-001 resolution does not depend on webhook integration.

---

### FAM-07I — Invite Email Template and Delivery Polish (FTR-AUTH-004)

**Classification:** ADJACENT / PILOT_REQUIRED / P2

**Problem statement:** Invite email uses raw inline `<p>` HTML (not branded template shell).
`orgName` interpolated without `escHtml()`. No TexQtic logo. Visually inconsistent with inquiry
notification emails (which use `buildInquiryEmailBodies()` branded shell).

**Resolution design:**

| File | Change |
|---|---|
| `server/src/services/email/email.templates.ts` | Add `buildInviteEmailBodies(orgName, inviteLink, role, expiryDate)` function using branded table-based HTML shell (matching `buildInquiryEmailBodies` pattern); use `escHtml()` for all variable interpolation |
| `server/src/services/email/email.service.ts` | Update `sendInviteMemberEmail()` to call `buildInviteEmailBodies()` instead of raw inline HTML |

**Gate:** Pilot-only priority (P2). Should be completed before production pilot with real users
but is not a security blocker. Depends on HD-001 (SMTP configured) to verify in production.

**Test requirements:** Update existing invite email unit tests to assert `orgName` is escaped.

---

### FAM-07J — VIEWER Invite UX Mismatch

**Classification:** ADJACENT / SHOULD_FIX / SMALL_ISOLATED

**Problem statement:** `InviteMemberForm` in the frontend allows the VIEWER role to be selected
from the role dropdown. The backend returns 422 VIEWER_TRANSITION_OUT_OF_SCOPE when this role is
submitted. The current UX shows an error after submit — preventable with a client-side guard.

**Resolution options:**

| Option | Description |
|---|---|
| A — Remove VIEWER from role options | Remove VIEWER enum from the `<select>` in `InviteMemberForm`. Clean; VIEWER cannot be accidentally selected. |
| B — Add client-side validation | Show inline warning when VIEWER is selected before submit. VIEWER remains visible but cannot be submitted without seeing the warning. |

**Recommended:** Option A — remove VIEWER from the selectable invite roles. VIEWER role
is documented as "not yet supported for invite transitions" (422 VIEWER_TRANSITION_OUT_OF_SCOPE).
Removing it is simpler and less confusing than showing a warning.

**Frontend allowlist (when authorized):**

| File | Change |
|---|---|
| `components/MemberManagement/InviteMemberForm.tsx` | Remove VIEWER from invite role select options |

---

## 10. Recommended Next Single Prompt

### Recommendation: FAM-07D-TENANT-ONBOARDING-EXISTING-USER-INVITE-ACCEPTANCE-DESIGN-OR-IMPLEMENTATION-PREP-001

**Rationale for choosing FAM-07D:**

1. **Security criticality:** B-01 is a confirmed credential bypass vulnerability (security
   vulnerability class). It is the highest-priority item in the FAM-07 family. It cannot be left
   unresolved before any production user onboarding.
2. **No schema migration required:** FAM-07D backend fix requires only changes to
   `server/src/routes/tenant.ts`. No new tables, no Prisma migrations, no DB apply step.
3. **No SMTP dependency:** The B-01/B-02 fix does not require SMTP to be configured. The fix
   works regardless of email delivery status.
4. **No legal text dependency:** The credential bypass fix does not depend on FTR-LEGAL-003 or
   any counsel feedback. It is implementation-ready now.
5. **Unblocks test coverage:** FAM-07F test suite can only be written after FAM-07D routes are
   in their final state. FAM-07D unblocks T-GAP-02 and T-GAP-03.
6. **Design decision required:** Paresh must choose Option A (sign-in-first) or Option B
   (validate-password-inline) for the existing-user path. This design choice should be confirmed
   in the FAM-07D prompt before implementation.
7. **Type-A authorization required:** FAM-07D touches auth-adjacent code in
   `server/src/routes/tenant.ts`. Implementation requires explicit Paresh authorization.

**What FAM-07D prompt should include:**
- Allowlist: `server/src/routes/tenant.ts`, `services/tenantService.ts`,
  `components/Onboarding/OnboardingFlow.tsx`, `App.tsx` (backend first; frontend optional in
  same prompt or separate)
- Forbidden: schema.prisma, migration files, LAUNCH-FAMILY-INDEX.md, FUTURE-TODO-REGISTER.md
- Design decision: Option A or B for existing-user path (Paresh to state preference)
- Test files: `server/src/__tests__/tenant-activate.integration.test.ts` (new)
- Validation: `pnpm --filter server typecheck` EXIT 0; `pnpm --filter server lint` clean;
  existing activation-adjacent tests PASS
- Commit: `fix(auth): resolve credential bypass and duplicate membership 500 in activation`

**Rationale for NOT choosing other slices first:**

| Slice | Why not first |
|---|---|
| FAM-07E (ToS) | `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT` — cannot implement without final legal text and Paresh ToS version decision |
| FAM-07F (tests) | Cannot write tests until FAM-07D routes are in final state |
| FAM-07G (frontend UX) | Depends on FAM-07D backend error codes being defined first |
| FAM-07H (SMTP) | Infrastructure only (no code change); Paresh can do this independently at any time |
| FAM-07I (email template) | PILOT_REQUIRED/P2; not a security blocker; SMTP must be configured first to test |
| FAM-07J (VIEWER fix) | Small and isolated but lower priority than security blocker |

---

## 11. Hub Impact Assessment

**Assessment:** `NO_HUB_UPDATE_REQUIRED`

This unit is a design synthesis and governance planning document. It:
- Does NOT change LFI FAM-07 status (FAM-07 remains `REPO_CONFIRMED`, bounded design required)
- Does NOT change FTR-AUTH-001 status (`DESIGN_GATED` / `OPEN` — unchanged)
- Does NOT change FTR-LEGAL-003 status (`NOT_ASSESSED` / `OPEN` — unchanged; classification
  updated here in governance synthesis but FTR register entry is NOT modified by this unit)
- Does NOT discover new repo-truth evidence that changes LFI evidence level
- Does NOT implement any feature
- Does NOT close any family gap item
- Does NOT touch CRM/CAE reconciliation surfaces
- Does NOT touch TTP/NC-TTP legal surfaces (treated as design context input only)
- Does NOT advance FAM-07 to VERIFIED_COMPLETE

**LFI update required?** NO — LFI §6 FAM-07 row status remains `REPO_CONFIRMED`. No evidence
level change requires LFI update from a design synthesis unit.
**FTR update required?** NO — FTR entries for FTR-AUTH-001 and FTR-LEGAL-003 are not modified
by this unit. Status fields remain as-is. FAM-07D opening should trigger a FTR status update
in its own governance artifact when authorized.
**FUTURE-TODO-REGISTER.md?** NOT edited by this unit.
**LAUNCH-FAMILY-INDEX.md?** NOT edited by this unit.

---

## 12. Control Pointer Changes (Governance Files Updated by This Unit)

**governance/control/NEXT-ACTION.md:**
- `next_candidate_unit`: updated from `FAM-07-TENANT-ONBOARDING-BOUNDED-DESIGN-001` to
  `FAM-07D-TENANT-ONBOARDING-EXISTING-USER-INVITE-ACCEPTANCE-DESIGN-OR-IMPLEMENTATION-PREP-001`
- `next_candidate_unit_status`: updated to reflect design synthesis complete; FAM-07D chosen
- `next_candidate_unit_note`: updated with FAM-07D rationale and design decision required
- `last_closed_governance_unit`: updated to `FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001`
- `last_closed_governance_unit_status`: `DESIGN_SYNTHESIS_COMPLETE (2026-07-07)`

**governance/control/OPEN-SET.md:**
- Operating notes: add record of FAM-07C synthesis completion and FAM-07D as next candidate
- No status table changes (this is a governance-note-only update)

---

## 13. Risks and Blockers

### 13.1 Active Blockers

| ID | Description | Gate |
|---|---|---|
| B-01 | Credential bypass for existing users — MUST be fixed before any real-user production onboarding | FAM-07D authorization |
| B-02 | Unhandled P2002 in activation route → 500 to user — MUST be fixed | FAM-07D authorization |
| HD-001 | SMTP not configured in Vercel production — activation emails not delivered to real users | Infrastructure (Paresh action) |
| FTR-LEGAL-003 | No ToS consent infrastructure — supplier cannot accept platform terms at onboarding | `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT` |

### 13.2 Design Decisions Required from Paresh

| Decision | Options | Impact |
|---|---|---|
| Existing-user path in activation | Option A (sign-in-first) or Option B (validate-inline) | Determines backend route structure and frontend UX branch |
| ToS version identifier | Final string for `tosVersion` (e.g. `"platform-tos-2026-v1"`) | Gates FAM-07E implementation |
| ToS document URL | URL where platform ToS text is published | Gates FAM-07E frontend display |
| SMTP provider selection | Postmark / SendGrid / AWS SES / Resend | Gates HD-001 resolution |

### 13.3 Legal Gates

| Item | Status | Required before |
|---|---|---|
| FTR-LEGAL-003 ToS final wording | Informal counsel inputs received; no formal record | FAM-07E implementation |
| TTP consent wording (`TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001` surfaces) | LEGAL_REVIEW_PENDING | TTP implementation (NOT FAM-07) |
| Supplier platform agreement simplified pilot copy | PRIT-012: acceptable for first iteration | FAM-07E simplified implementation |

### 13.4 Risk Notes

| Risk | Mitigation |
|---|---|
| FAM-07D implementation touches activation route (auth-adjacent) | Type-A authorization required; TECS §3.1 runtime T1-T4 validation required after implementation |
| ToS schema migration (FAM-07E) will need `prisma migrate deploy` in production | Requires DIRECT_DATABASE_URL and explicit Paresh authorization; follow AGENTS.md §6 exact sequence |
| LEGACY_ADMIN vs APPROVED_ONBOARDING path differences | Both paths must be tested in FAM-07D test coverage; different user/membership creation sequences apply |
| `inviteToken` returned in API response | Document as dev-only; should be removed or gated before external production users onboard |
| Token storage order (FC-03) | Small but real risk: stored token becomes valid before `getCurrentUser()` confirms session; fix in FAM-07G |

---

## 14. Safety Confirmation

This unit confirms:

- ✅ No source code files were modified.
- ✅ No schema files were modified.
- ✅ No migration files were created or run.
- ✅ No config or environment files were modified.
- ✅ No test files were created or modified.
- ✅ No package.json files were modified.
- ✅ LAUNCH-FAMILY-INDEX.md was NOT modified.
- ✅ FUTURE-TODO-REGISTER.md was NOT modified.
- ✅ FTR-AUTH-001 remains OPEN / NOT_IMPLEMENTED.
- ✅ FTR-LEGAL-003 remains OPEN / NOT_IMPLEMENTED / `HOLD_FOR_COUNSEL_FEEDBACK` unchanged.
- ✅ FAM-07 status NOT advanced to VERIFIED_COMPLETE.
- ✅ Legal counsel inputs treated as design context only — NOT inlined as final binding language.
- ✅ TTP/NC-TTP legal surfaces are OUT_OF_SCOPE and not merged into FAM-07 design.
- ✅ FAM-08/09/11/18 work is OUT_OF_SCOPE and not merged into FAM-07.
- ✅ No implementation performed in this unit.
- ✅ Allowlisted files modified: this artifact + NEXT-ACTION.md + OPEN-SET.md only.

---

## 15. Completion Checklist

- [x] HEAD confirmed as `860d676` before synthesis
- [x] Working tree confirmed CLEAN before synthesis
- [x] FAM-07A artifact read in full (sections 1–15)
- [x] FAM-07B key findings confirmed (from this session and prior session)
- [x] Governance files read: NEXT-ACTION.md, OPEN-SET.md, BLOCKED.md
- [x] LFI FAM-07 status read: REPO_CONFIRMED
- [x] FTR-AUTH-001 entry read: DESIGN_GATED / MVP_CRITICAL / P1 / OPEN
- [x] FTR-LEGAL-003 entry read: NOT_ASSESSED / MVP_CRITICAL / P1 / OPEN / PRIT-012
- [x] FTR-AUTH-004 entry read: PILOT_REQUIRED / P2
- [x] TTP legal counsel packet read: LEGAL_REVIEW_PENDING; initial design-context inputs noted
- [x] Evidence synthesis complete (§5 FAM-07A, §6 FAM-07B)
- [x] Legal counsel context section complete (§7)
- [x] Scope classification matrix complete (§8)
- [x] Bounded slice plan complete (§9: FAM-07D through FAM-07J)
- [x] Recommended next single prompt identified: FAM-07D
- [x] Hub impact assessment: NO_HUB_UPDATE_REQUIRED confirmed
- [x] Control pointer changes identified (§12)
- [x] Risks and blockers documented (§13)
- [x] Safety confirmation complete (§14)
- [x] FAM-07 NOT advanced to VERIFIED_COMPLETE
- [x] LFI and FTR NOT edited
- [x] NEXT-ACTION.md updated
- [x] OPEN-SET.md updated

---

## 16. Commit Instructions

**Stage only the three allowlisted files. Do not stage any other file.**

```
git add -f "artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md"
git add "governance/control/NEXT-ACTION.md"
git add "governance/control/OPEN-SET.md"
git status --short
git commit -m "docs: synthesize FAM-07 bounded design"
git show --stat HEAD
```

**Expected staged files (exactly three):**
- `A  artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md` (new)
- `M  governance/control/NEXT-ACTION.md` (modified)
- `M  governance/control/OPEN-SET.md` (modified)

**Expected unstaged/untracked:** none (working tree clean)

---

## 17. Final Enum

```
FAM_07C_TENANT_ONBOARDING_BOUNDED_DESIGN_SYNTHESIS_COMPLETE_READY_FOR_NEXT_PROMPT
```

**Summary:**
- FAM-07A and FAM-07B evidence fully synthesized
- FTR-AUTH-001 design approach: FAM-07D (credential bypass fix + duplicate membership 500 fix);
  design decision required from Paresh (Option A sign-in-first vs Option B password-validate-inline)
- FTR-LEGAL-003 classification: `DESIGN-READY_FOR_ARCHITECTURE` + `IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT`;
  consent architecture designed in FAM-07E; implementation gated by final legal text from Paresh/counsel
- HD-001: infrastructure-only (Vercel SMTP env vars); no code change required; Paresh action
- FTR-AUTH-004: ADJACENT/P2; FAM-07I slice; after SMTP configured
- 7 slices defined: FAM-07D through FAM-07J
- Recommended next single prompt: FAM-07D (security-critical, implementation-ready, no schema/SMTP/legal gate)
- No implementation performed; FAM-07 NOT advanced to VERIFIED_COMPLETE
- Three allowlisted governance files updated; commit ready
