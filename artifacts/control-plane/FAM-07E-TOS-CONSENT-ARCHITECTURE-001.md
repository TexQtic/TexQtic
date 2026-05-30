# FAM-07E-TOS-CONSENT-ARCHITECTURE-001

Status: DESIGN_ONLY
Mode: TECS safe-write audit/design only
Scope: Supplier onboarding legal consent architecture for FAM-07
Date: 2026-05-30

## 1) Authorization Boundary and Preflight

Authorized action:
- Produce architecture/design artifact only.
- No implementation, no schema migration, no route mutation, no UI mutation.

Preflight commands run:
- git status --short --ignored
- git rev-parse --short HEAD
- git rev-parse --verify <commit>^{commit} for: 672f4d46, d93cb720, b56e43d5, b3acbb75, da068831, 29b47e62
- git check-ignore -v artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md

Preflight summary:
- HEAD resolved to 672f4d46.
- Required lineage commits verified present: 672f4d46, d93cb720, b56e43d5, b3acbb75, da068831, 29b47e62.
- Artifact location check:
  - Root path FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md: not present.
  - Required path artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md: present.
- Ignore rule confirmed for artifacts path; this artifact requires force-add for durable repo tracking.

## 2) Family and Governance Truth (Repo-Truth Anchors)

Current governance pointers confirm:
- Active candidate is FAM-07E-TOS-CONSENT-ARCHITECTURE-001.
- HD-001 is now RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 remains PARTIALLY_IMPLEMENTED.
- FTR-LEGAL-003 remains MVP_CRITICAL and OPEN.

Evidence:
- governance/control/NEXT-ACTION.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

Interpretation:
- FAM-07 cannot be advanced to VERIFIED_COMPLETE without a legal-consent closure path.
- This unit should lock architecture boundaries and decision points, not code.

## 3) Repo-Truth Surfaces Inspected

Primary backend surfaces:
- server/src/routes/tenant.ts
  - /tenant/activate
  - /tenant/activate-authenticated
  - invite acceptance and membership creation flows
  - audit actions user.activated and user.invite_accepted
- server/src/services/tenantProvision.service.ts
  - APPROVED_ONBOARDING provisioning mode
  - FIRST_OWNER_PREPARATION invite issuance
  - derived activation status logic in queryProvisioningStatus
- server/src/routes/control.ts
  - /tenants/:id/onboarding/outcome
  - /tenants/:id/onboarding/activate-approved
  - control-plane audit read path
- server/src/lib/auditLog.ts and server/src/lib/events.ts
  - append-only audit/event primitives
  - metadataJson and payloadJson support for consent telemetry fields

Primary frontend surfaces:
- App.tsx
  - pending invite token continuation path
  - onboarding completion handoff
  - existing-user sign-in-first continuation
- components/Onboarding/OnboardingFlow.tsx
  - current 4-step activation UX has no ToS consent check/version capture
- services/tenantService.ts
  - activateTenant payload currently has no consent object
  - acceptAuthenticatedInvite payload currently has no consent object
- components/ControlPlane/TenantDetails.tsx
  - onboarding outcome and activation controls exist
  - no legal-consent observability panel

Data model surfaces:
- server/prisma/schema.prisma
  - Invite, Membership, Tenant, organizations, AuditLog, EventLog inspected
  - no dedicated ToS/platform agreement acceptance model identified

Public/legal visibility checks:
- App.tsx: no direct /legal /privacy /terms route matches in inspected search
- server/src/routes/public.ts: no direct /legal /privacy /terms route matches in inspected search
- server/src/services/email/email.templates.ts: legal footer text-only with links deferred note

## 4) Current Flow Map (As-Is)

A) Provisioning to first-owner preparation
1. Control/admin provisioning creates tenant and organization records.
2. APPROVED_ONBOARDING path creates FIRST_OWNER_PREPARATION invite.
3. Tenant is in pre-activation/pre-verification lifecycle states until invite acceptance path runs.

B) New-user activation path
1. User opens invite link with token.
2. Frontend onboarding captures org/account/verification data.
3. Backend validates invite and email match.
4. Backend creates user, membership, updates organization verification fields/status.
5. Backend marks invite accepted and writes audit log.
6. JWT issued and tenant session bootstrapped.

C) Existing-user authenticated invite acceptance path
1. User signs in with existing account.
2. Frontend preserves pending invite token.
3. Backend verifies token and email match.
4. Backend creates membership, marks invite accepted, writes audit log.
5. JWT for target tenant is issued and session context flips.

Observed gap:
- No mandatory legal consent capture, version lock, or explicit acceptance timestamp tied to these activation transitions.

## 5) Data Map (As-Is vs Needed)

As-is authoritative records available:
- Invite: tenantId, role, invitePurpose, acceptedAt, expiresAt
- Membership: userId, tenantId, role
- organizations: onboarding/verification lifecycle status
- AuditLog/EventLog: immutable append-only telemetry carriers

Missing for legal compliance durability:
- No canonical consent artifact with legal text version fingerprint.
- No explicit acceptance snapshot fields bound to user + tenant + agreement type.
- No explicit withdrawal/re-consent model.
- No deterministic evidence model for what exact legal text was accepted.

## 6) Consent Architecture Recommendation

Recommended model: Consent Snapshot + Immutable Consent Event

A) Consent snapshot authority (state view)
- One current-state row per scope and agreement type, with fields conceptually including:
  - agreementType (for example PLATFORM_TERMS, PRIVACY_NOTICE)
  - agreementVersion (human version)
  - agreementHash (content fingerprint)
  - acceptedAt
  - actorUserId
  - tenantId
  - sourceFlow (activate, activate-authenticated, admin-override-if-ever-authorized)
  - locale/jurisdiction context

B) Immutable consent event authority (history view)
- Append-only events for every acceptance/re-acceptance/withdrawal.
- Event payload must include:
  - agreementType
  - agreementVersion
  - agreementHash
  - effectiveAt
  - acceptedAt
  - actorId
  - tenantId
  - requestId / correlation id

C) Audit linkage
- Each consent event should map to audit action names with stable taxonomy.
- Suggested action namespace examples:
  - legal.consent.accepted
  - legal.consent.reaccepted
  - legal.consent.withdrawn

D) Minimalism rule
- Do not broaden to a full legal CMS in this unit.
- Lock only contract needed for onboarding hard gate + durable evidence.

## 7) Gating Behavior Recommendation

Policy objective:
- No completion of tenant activation without required legal acceptance.

Proposed gate points:
- Gate 1 (frontend): onboarding submit disabled until required checkboxes accepted.
- Gate 2 (backend hard gate): /tenant/activate rejects request missing valid consent payload.
- Gate 3 (backend hard gate): /tenant/activate-authenticated rejects request missing valid consent payload.
- Gate 4 (version gate): backend must verify submitted agreementHash/version is currently acceptable.

Failure behavior:
- Deterministic legal error code for stale/missing/mismatched consent payload.
- No silent fallback to non-consent activation.

## 8) Observability and Evidence Model

Control-plane visibility should include:
- Legal consent status per tenant first-owner.
- Accepted agreement version/hash.
- Acceptance timestamp and actor.
- Last re-consent event (if any).

Operational telemetry should include:
- Consent gate rejects by reason code.
- Consent acceptance success counts by flow.
- Drift alerts when active agreement version changes and re-consent is required.

Evidence durability expectations:
- Consent events immutable and queryable.
- Consent snapshot deterministic for runtime gates.
- Audit and event rows linkable for incident review.

## 9) Legal Gaps Blocking Implementation Completion

Open blocking inputs:
- Final legal text and approved wording package for supplier onboarding.
- Versioning policy for legal documents (semantic vs date-based).
- Jurisdiction and language strategy for first launch cohort.
- Re-consent trigger policy when legal text changes.
- Minimum UI disclosure rules for public/legal pages and email templates.

Repo-truth signal:
- FTR-LEGAL-003 is still MVP_CRITICAL OPEN, which aligns with these unresolved inputs.

## 10) Phased Delivery Plan (Design-Forward)

Phase A: Legal contract freeze
- Freeze agreement taxonomy, versioning policy, and acceptance evidence requirements.
- Produce counsel-approved text package and hash authority process.

Phase B: Backend contract and data authority
- Define backend request/response contract for consent payload.
- Define consent snapshot + consent event persistence design.
- Define gate error taxonomy.

Phase C: Frontend onboarding contract alignment
- Add consent capture UX in both activation paths.
- Ensure version/hash payload round-trip to backend.

Phase D: Control-plane observability
- Add read model for legal consent posture in tenant detail.
- Add audit/event query affordances for operator review.

Phase E: Verification and governance closure
- Test matrix for both activation paths with legal gate enforcement.
- Runtime verification in production-safe mode.
- Hub sync against FTR-LEGAL-003 closure criteria.

## 11) Risks and Failure Modes

Key risks if done incorrectly:
- Legal acceptance not tied to exact content hash (non-defensible evidence).
- Frontend-only checkbox without backend gate (bypass risk).
- Missing re-consent strategy on version change (silent non-compliance drift).
- Consent writes not immutable or not linkable to actor/request context.
- Cross-tenant leakage risk if consent queries do not preserve org_id boundaries.

Mitigation principles:
- Backend gate is mandatory authority.
- Immutable event + snapshot dual model.
- Explicit org_id scoping in all consent reads/writes.
- Stable audit/event taxonomy from first implementation slice.

## 12) Hub Decision for This Unit

Decision:
- Architecture baseline is now clarified and bounded.
- Implementation should remain blocked until legal input package is formally provided and authorized.

Why:
- Technical primitives already exist for durable evidence capture.
- Missing piece is legal content/version governance and explicit acceptance contract.
- Proceeding without this creates high rework and compliance risk.

Hub impact decision:
- NO_HUB_UPDATE_REQUIRED

Hub contradiction check during normalization:
- No stale contradiction requiring Layer 0 or launch-readiness hub file edits was found in the inspected authority files.

## 13) Final Enum

FINAL_ENUM: FAM_07E_TOS_CONSENT_ARCHITECTURE_COMPLETE_LEGAL_INPUT_REQUIRED

Meaning:
- Next action is not immediate implementation.
- Required next move is legal-package freeze plus explicit authorization for a bounded implementation unit that applies this architecture.

## 14) Remaining FAM-07 Gates

Remaining FAM-07 gate posture (unchanged by this design unit):
- HD-001: RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 family status: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- FAM-07 is not VERIFIED_COMPLETE.
- FTR-LEGAL-003 remains MVP_CRITICAL / OPEN.
- Implementation remains blocked pending legal input package + version authority + explicit authorization.

## 15) Recommended Next Unit (Not Executed Here)

Candidate:
- FAM-07E-TOS-LEGAL-INPUT-FINALIZATION-001

Entry condition:
- Counsel-approved legal text and versioning policy are delivered and recorded.
- Paresh authorization explicitly opens implementation scope.

Out of scope for this artifact:
- Any code changes, schema changes, migrations, runtime mutations, or production operations.