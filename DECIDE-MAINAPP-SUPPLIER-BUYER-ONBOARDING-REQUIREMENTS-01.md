# DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01

---

## 1. Unit ID

**DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01**

---

## 2. Date

2026-06-06

---

## 3. Operator

Paresh Patel, Founder, TexQtic (decision authority)
GitHub Copilot governance sync agent (repo inspection and artifact creation)

---

## 4. Repo

TexQtic (Main App) — `C:\Users\PARESH\TexQtic`

---

## 5. Branch

`main`

---

## 6. Starting HEAD

`8ddbe36e` (commit: `prompt-FTR-SL-001U restore Shraddha public visibility via control-plane approval`)

---

## 7. Worktree Status at Start

**CLEAN** — no modified or untracked files at start of this unit.

```
git status --short --untracked-files=all
(no output — clean tree)
```

---

## 8. Files Inspected

### Governance Documents
- `governance/control/NEXT-ACTION.md` — layer 0 pointer, current status
- `governance/launch-readiness/PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md` — cross-system lifecycle design
- `governance/launch-readiness/PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md` — Main App provisioning role
- `governance/launch-readiness/CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md` — confirmed system-of-record matrix
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` — deferred items register

### Investigation/Decision Documents (root)
- `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` — entity, lifecycle, handoff, join-key inventory
- `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md` — provisioning field acceptance matrix

### Runtime Source
- `App.tsx` (root) — full SPA state machine, public entry, onboarding, invite acceptance, verification-blocked gate, SUPPLIER_REQUEST_ACCESS_URL constant
- `server/src/routes/internal/acquisitionProvisioning.ts` — CRM-originated supplier provisioning webhook
- `server/src/routes/tenant/gst-verification.ts` — GSTIN submission and admin review routes
- `server/src/services/gstVerification.service.ts` — GSTIN validation logic and format rules
- `services/gstVerificationService.ts` (frontend) — GST service API client
- `services/partnerRoutingService.ts` — seller_gstin field reference
- `server/src/routes/public.ts` — source_channel on supplier_profile.viewed.v1 event
- `components/Tenant/GstVerificationCard.tsx` — GSTIN verification UI card

---

## 9. Authority Chain References

- `FD-TEXQTIC-ONBOARDING-AUTH-001.md` — Founder Decision: GSTIN as minimum B2B transactional auth gate
- `governance/launch-readiness/CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md` — confirmed system-of-record matrix (three-system)
- `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md` — approved-onboarding provisioning contract
- `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` — cross-system entity and seam inventory

---

## 10. Founder Decision Artifact Reference

**FD-TEXQTIC-ONBOARDING-AUTH-001.md** — created and repo-recorded in this unit.

Summary: GSTIN validation is the founder-approved minimum bar for B2B transactional access. Entry is not blocked by GSTIN. Transactional actions (RFQ, listing, trade, escrow, payment, contracted services) are blocked until GSTIN is validated. Trust-tier model (Tier 0 → Tier 3) recorded. Udyam-only temporary rule recorded. Main App canonical ownership confirmed. CRM/CAE mirror-only rule confirmed. Source/channel tagging requirement recorded.

---

## 11. Main App Onboarding Requirement Findings

### Current Supported Paths (repo truth)

| Path | Evidence | Status |
|---|---|---|
| Invite-based access: marketing → CRM → Main App provisioning → invite link → `?token=xxx&action=invite` → `ONBOARDING` state → sign in/up → `acceptAuthenticatedInvite` → `activateTenant` | App.tsx:2137, tenantService.ts, server/src/routes/tenant.ts | EXISTS — production-verified (FTR-SL-001T/U) |
| CRM → Main App approved provisioning via `POST /api/admin/tenant-provision` with `provisioningMode: APPROVED_ONBOARDING`, service token, orchestration reference | server/src/routes/admin/tenantProvision.ts, MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md | EXISTS (partial runtime) — contract defined; buyer/service-provider partyType not accepted yet |
| Internal supplier profile provisioning: CRM webhook → `POST /api/internal/acquisition/provision-supplier` (HMAC-signed) | server/src/routes/internal/acquisitionProvisioning.ts | EXISTS — creates org + public projection; invite-based user access not part of this path |
| Self-service direct registration (no invite) | App.tsx, all routes | MISSING — no self-registration surface |
| Request-access (Main App tier 0 surface) | App.tsx | MISSING from Main App — currently on `https://texqtic.com/request-access` (marketing website) |
| Buyer direct registration | App.tsx, all routes | MISSING |
| Service provider registration | App.tsx, all routes | MISSING |
| Waitlist / interest capture (Main App) | App.tsx | MISSING |

### Current Friction Points

1. A web-origin visitor who clicks "Request Access" is redirected to `https://texqtic.com/request-access` — the marketing website. Main App has no capture surface of its own.
2. After submitting on the marketing website, the lead enters CRM (separate repo). CRM must qualify, approve, and trigger provisioning. Main App only receives the provisioned result.
3. The invite link generated by Main App goes to the supplier's email. The supplier must use that link with a valid `?token=xxx&action=invite` URL to create their account.
4. Any break in the marketing → CRM → provisioning → invite chain blocks the lead from reaching the platform.

---

## 12. Marketing Website to Main App Flow Findings

### Current Flow (repo truth)

```
Browser → https://texqtic.com/request-access (marketing website)
  → form submission → marketing proxy → CRM marketing.lead_submissions
  → CRM lead qualification
  → CRM onboarding case approval
  → CRM calls POST /api/admin/tenant-provision (approved provisioning)
  → Main App creates tenant + org + invite
  → CRM relay invite link to supplier
  → supplier opens ?token=xxx&action=invite
  → Main App ONBOARDING state → auth → activateTenant
  → supplier reaches EXPERIENCE workspace
```

### Current Web-Direct Path on Main App

`SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` — hardcoded constant in App.tsx, pointing to the marketing website.

The Main App PUBLIC_ENTRY state shows a "Request Access" CTA that redirects externally. No in-app capture form exists.

### Web-Direct Gap

There is NO `app.texqtic.com` route for:
- Supplier application
- Buyer application
- Waitlist / interest capture
- Tier 0 lite access creation
- Role selection
- Direct self-registration

All of these require implementation. The CRM role in a future direct-web flow must be defined before implementation can proceed.

---

## 13. Trust-Tier Model Support Findings

| Tier | Description | Current Main App Support |
|---|---|---|
| Tier 0 — Claimed Identity / Lite Access | Minimal identity, role intent, source channel, public browsing, express interest | MISSING — no lite-access surface; PUBLIC_ENTRY redirects to marketing |
| Tier 1 — Business Identity Submitted | GSTIN submitted, business name/state declared, review pending | EXISTS — GstVerificationCard, `POST /api/tenant/gst-verification`, org.status = PENDING_VERIFICATION |
| Tier 1A — Business Identity Verified | GSTIN admin-approved, org.status = VERIFICATION_APPROVED | EXISTS — admin review, onboarding outcome approval, verification-blocked gates |
| Tier 2 — Operational Access | Catalog published, full supplier/buyer profile, messaging | PARTIAL — catalog CRUD exists but blocked by verification gate; supplier listing requires Tier 1A |
| Tier 3 — Trusted Member | Trade references, platform history, TTP/TradeTrust eligibility | DESIGN_ONLY — no current implementation |

**Key finding:** The existing `VERIFICATION_BLOCKED_VIEWS` gate and `isVerificationBlockedTenantWorkspace` logic in App.tsx already form the foundation of the GSTIN transactional gate for Tiers 1/1A. This implementation must be mapped to the GSTIN approval status explicitly in a future unit.

---

## 14. GSTIN Validation Support/Gap Findings

### What Exists

| Capability | Evidence | Status |
|---|---|---|
| GSTIN format validation (15-char regex + valid India state codes 01–38) | `server/src/services/gstVerification.service.ts`: `GSTIN_REGEX`, `VALID_STATE_CODES` | EXISTS |
| GSTIN submission by tenant | `POST /api/tenant/gst-verification`, GstVerificationCard UI | EXISTS |
| One-record-per-org constraint | `gst_verifications` table schema | EXISTS |
| Admin review outcome (APPROVED / REJECTED / NEEDS_MORE_INFO) | `PATCH /api/control/gst-verification/:orgId`, admin control panel | EXISTS |
| Transactional view blocking (TRADES, RFQS, ESCROW, SETTLEMENT, INVOICES) | `VERIFICATION_BLOCKED_VIEWS`, `isVerificationBlockedTenantWorkspace` in App.tsx | EXISTS |
| Catalog add/edit blocking under verification | `isVerificationBlockedTenantWorkspace` checks in catalog mutation handlers | EXISTS |

### What Does Not Exist

| Capability | Gap Description |
|---|---|
| Live GSTIN portal verification | Manual admin review only — no external API integration (by design for current phase) |
| Business name mismatch handling | No automated name-match logic; admin reviews manually |
| GSTIN state code mismatch handling | State code captured in submission but no automated mismatch block |
| GSTIN gate directly tied to `gst_verifications.review_outcome = APPROVED` | Current gate is `org.status` based (PENDING_VERIFICATION etc.), not directly from `gst_verifications.review_outcome` |
| Tier 0 entry without GSTIN (ungated entry) | No Tier 0 surface on Main App |
| Source channel tagging at account/tenant level | Only on `supplier_profile.viewed.v1` event; not stored on org or user |
| Udyam registration field or validation | No Udyam-specific field or validation; would be a new schema addition |
| Automated notification when GSTIN review outcome changes | Admin review triggers status update but no explicit user notification observed |

---

## 15. Udyam Edge-Case Findings

| Finding | Status |
|---|---|
| Main App supports Udyam | MISSING — no Udyam field or validation in current source |
| Main App distinguishes GSTIN vs Udyam verification | MISSING — only `gst_verifications` table exists |
| Temporary rule for Udyam-only users | RECORDED in FD-TEXQTIC-ONBOARDING-AUTH-001.md §11 — Tier 0 only, no transactional access |
| Preventing Udyam as GSTIN bypass | Policy rule recorded; no technical bypass risk since Udyam is absent from current source |
| Future unit needed | YES — `DECIDE-UDYAM-EDGE-CASE-TRUST-POLICY-001` should be defined when Udyam support is added |

---

## 16. Source/Channel Tagging Findings

| Finding | Location | Status |
|---|---|---|
| `source_channel` on `supplier_profile.viewed.v1` event | `server/src/routes/public.ts:705-748` — `ALLOWED_SOURCE_CHANNELS = ['organic', 'qr', 'referral', 'event', 'direct']` | EXISTS (event-level only) |
| Account-level source channel tagging | No field found on `tenants`, `organizations`, `memberships`, or `users` | MISSING |
| Campaign ID capture | Not found on any account-level object | MISSING |
| Referring agent / association ID | Not found | MISSING |
| Role intent field at acquisition | Not found at account level | MISSING |
| First-touch timestamp preservation | Not found at account level | MISSING |
| Marketing website source channel values | Marketing repo not inspected in this unit | UNKNOWN |
| `external_orchestration_ref` as cross-system origin anchor | `tenants.externalOrchestrationRef` (schema) — set by approved provisioning | EXISTS (CRM-mediated path only) |

**Finding:** Source channel tagging at the account/tenant level is absent. It must be designed and implemented in `GOV-MAINAPP-SOURCE-CHANNEL-TAGGING-CONTRACT-01` before it can be used for acquisition reporting or CRM sync.

---

## 17. CRM Dependency Findings

### What CRM Currently Provides to Main App

| CRM Provision | Status |
|---|---|
| Approved provisioning request (`POST /api/admin/tenant-provision`) | EXISTS — verified in MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001 |
| `orchestrationReference` (canonical CRM→Main App join key) | CONFIRMED |
| Supplier name, jurisdiction, first owner email | Accepted in provisioning envelope |
| `external_orchestration_ref` on internal acquisition provisioning | EXISTS — `acquisitionProvisioning.ts` uses `crmSupplierId` as anchor |

### What CRM Does NOT Currently Provide

| Missing Provision | Impact |
|---|---|
| `partyType` (supplier/buyer/service_provider) | Not accepted in runtime provisioning contract (DESIGN_ONLY) |
| `supplierProfileSection` or `buyerProfileSection` | Not accepted |
| Cross-system notification of web-origin Tier 0 capture | No such seam exists |
| CRM approval → Main App Tier 0 creation without full provisioning | No path |

### Key CRM Role Question (drives next unit)

Should CRM remain a required pre-condition for ANY Main App account creation (current model), or should CRM be notified after Main App captures a Tier 0 entry (proposed new model)?

This question is the single most important dependency gap. It cannot be resolved from Main App repo truth alone. It requires CRM repo inspection and a cross-system flow decision.

---

## 18. CAE Dependency Findings

| Finding | Status |
|---|---|
| CAE is required for soft launch | NO — Main App soft launch does not require CAE |
| CAE-originated data required before launch | NO — currently no CAE→Main App live seam exists |
| Field-agent acquisition required for launch | NO — for web-origin network building, CAE is not a prerequisite |
| CAE can remain internal/offline-only for launch | YES — offline/field-agent path can proceed independently |
| CAE should feed CRM first | Likely YES per three-system plan (PLAN-THREE-SYSTEM-...) |
| CAE consolidation into CRM | CANDIDATE — not decided; requires CAE repo discovery |
| CAE seam required for soft launch | NONE — defer entirely |
| Agent attribution at Tier 0 | DESIGN_ONLY — source_channel `CAE_FIELD_AGENT` as tag value |

**Finding:** CAE is not a blocking dependency for Main App soft launch. The most urgent discovery is CRM, not CAE.

---

## 19. Main App Canonical Authority Findings

| Entity | Canonical Authority | Notes |
|---|---|---|
| Account (user identity, session) | MAIN_APP_CANONICAL | Supabase Auth via Main App |
| Tenant / Organization runtime record | MAIN_APP_CANONICAL | tenants + organizations tables |
| Workspace | MAIN_APP_CANONICAL | tenant experience state |
| Membership (user ↔ tenant binding) | MAIN_APP_CANONICAL | memberships table |
| Role | MAIN_APP_CANONICAL | JWT claims + memberships.role |
| Activation state | MAIN_APP_CANONICAL | org.status lifecycle |
| Invite (access artifact) | MAIN_APP_CANONICAL | invite table + token |
| Supplier profile (runtime) | MAIN_APP_CANONICAL | organizations + publicB2BProjection |
| Buyer profile (runtime) | MAIN_APP_CANONICAL | organizations (base) — buyer-specific profile DESIGN_ONLY |
| Service provider profile (runtime) | UNKNOWN_REQUIRES_NEXT_UNIT | no service-provider-specific profile found |
| GSTIN validation record and outcome | MAIN_APP_CANONICAL | gst_verifications table |
| Trust tier / transactional eligibility | MAIN_APP_CANONICAL | derived from org.status + gst_verifications |
| Provisioning result | MAIN_APP_CANONICAL | returned by provisioning endpoint |
| Registration status | MAIN_APP_CANONICAL | invite.accepted_at, org.status |
| Source channel metadata (account-level) | MAIN_APP_CANONICAL (but MISSING) | must be added; currently event-level only |
| CRM lead qualification | CRM_CANONICAL | CRM internal only |
| CRM onboarding case approval | CRM_CANONICAL | CRM internal only |
| Field acquisition context | CAE_CANONICAL | CAE internal only |
| Post-activation account servicing | CRM_CANONICAL (CRM reference only) | CRM customer account record |

---

## 20. Main App Onboarding Requirement Matrix

| Scenario | Main App Required? | CRM Required Before Tier 0? | CRM Required Before Transactional? | CAE Required Before Tier 0? | Direct Registration Allowed? | Invite Required? | Approval Required? | GSTIN Required Before Transactional? | Canonical: Account/Access | Canonical: Qualification/Follow-up | Source Tag Required? | Soft-Launch Status | Deferred Automation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Supplier from website | YES | NO (proposed new model) | YES (CRM or admin approval path) | NO | NOT YET (requires Tier 0 implementation) | YES (current) or NO (future Tier 0) | YES (before transactional) | YES | Main App | CRM | YES | PARTIAL — invite path works; Tier 0 MISSING | Tier 0 surface, source tag |
| Buyer from website | YES | NO | YES | NO | NOT YET | YES (current) | YES | YES | Main App | CRM | YES | MISSING — buyer direct path absent | Buyer onboarding, Tier 0 |
| Service provider from website | YES | NO | YES | NO | NOT YET | YES (current) | YES | YES (if B2B transactional) | Main App | CRM | YES | MISSING | partyType, service-provider profile |
| Supplier from CRM lead | YES | YES (current) | YES | NO | NO — invite only | YES | YES | YES | Main App | CRM | YES | EXISTS | CRM provisioning seam improvements |
| Buyer from CRM lead | YES | YES (current) | YES | NO | NO — invite only | YES | YES | YES | Main App | CRM | YES | PARTIAL — partyType not accepted yet | partyType, buyer profile section |
| Service provider from CRM lead | YES | YES (current) | YES | NO | NO | YES | YES | YES | Main App | CRM | YES | MISSING | partyType, service-provider profile |
| Supplier from CAE field agent | YES | YES (via CAE→CRM→Main App) | YES | NO | NO | YES | YES | YES | Main App | CRM | YES | DEFER — CAE seam not built | CAE→CRM seam, agent attribution |
| Buyer from CAE field agent | YES | YES | YES | NO | NO | YES | YES | YES | Main App | CRM | YES | DEFER | CAE buyer acquisition seam |
| WhatsApp/social lead | YES | NO (proposed) | YES | NO | NOT YET | YES (current) | YES | YES | Main App | CRM | YES | MISSING — no WhatsApp capture | WhatsApp/social Tier 0 seam |
| Offline event lead | YES | NO (proposed) | YES | OPTIONAL | NOT YET | YES (current) | YES | YES | Main App | CRM | YES | MISSING | Offline capture → CRM → Main App |
| Referral/QR lead | YES | NO | YES | NO | NOT YET | YES (current) | YES | YES | Main App | CRM | YES | PARTIAL — referral landing exists (`/join/:code`) | Referral→Tier 0 conversion |
| Trade association lead | YES | NO (proposed) | YES | NO | NOT YET | YES (current) | YES | YES | Main App | CRM | YES | MISSING | Association seam |
| Manually approved customer | YES | YES | YES | NO | NO | YES | YES | YES | Main App | CRM | YES | EXISTS (direct invite path) | None |
| Direct invite recipient | YES | NO | YES | NO | NO | YES (mandatory) | Implicit (invite = approval) | YES | Main App | CRM (optional) | YES | EXISTS — production-verified | None |

---

## 21. Friction Comparison Table

| Path | User Friction | Speed to First Value | Fraud/Authenticity Risk | Operational Complexity | Launch Safety | Recommendation |
|---|---|---|---|---|---|---|
| 1. Website → CRM → invite → Main App | HIGH_FRICTION | SLOW (days to weeks) | LOW (human-reviewed before any access) | HIGH (multi-system, multiple human steps) | LAUNCH_SAFE | NOT_RECOMMENDED for web-origin primed visitors |
| 2. Website → Main App Tier 0 → CRM follow-up | LOW_FRICTION | FAST (minutes) | MEDIUM (GSTIN gate blocks transactional before verification) | MEDIUM (requires Tier 0 implementation + CRM webhook) | LAUNCH_SAFE (with GSTIN gate for transactional) | RECOMMENDED — this is the proposed new model |
| 3. Website → Main App full registration → CRM verifies later | MEDIUM_FRICTION | MEDIUM (account created immediately, transactional gated) | MEDIUM | MEDIUM | LAUNCH_SAFE (GSTIN gate must be enforced) | VIABLE — simpler than path 2 if Tier 0 is deferred |
| 4. Website → contact form only | HIGH_FRICTION | VERY_SLOW | LOW | LOW | NOT_LAUNCH_SAFE for network building | NOT_RECOMMENDED (zero Main App connection) |
| 5. CRM campaign link → Main App Tier 0 | LOW_FRICTION | FAST | MEDIUM | LOW (CRM owns the campaign; Main App captures) | LAUNCH_SAFE | RECOMMENDED for CRM-originated campaigns |
| 6. CAE field-agent assist → CRM → Main App Tier 0 | MEDIUM_FRICTION | MEDIUM | LOW | HIGH (three-system) | POST_LAUNCH_ONLY | DEFER — not required for soft launch |

---

## 22. Main App Perspective Recommendation

**`MAINAPP_RECOMMENDS_DIRECT_WEB_REQUEST_ACCESS`**

**Rationale:**

From the Main App perspective, the clearest and most launch-appropriate model is:

1. Marketing website routes primed visitors directly to a Main App Tier 0 entry surface (e.g., `https://app.texqtic.com/request-access` or role-specific entry pages).
2. Main App captures Tier 0: role intent, contact identity, source channel, and expressed interest. No account or tenant is created yet — only a captured lead artifact.
3. Main App immediately notifies CRM via a lightweight webhook (interest-captured event). CRM receives the lead and begins qualification and follow-up.
4. When CRM qualifies and approves, CRM triggers approved provisioning. Main App creates tenant + org + invite. Supplier/buyer is sent their access link.
5. GSTIN gate enforced before any transactional access — this is non-negotiable per FD-TEXQTIC-ONBOARDING-AUTH-001.

This model removes the CRM-blocking-first-capture problem while preserving CRM as the qualification and follow-up authority. Main App captures first; CRM qualifies and enables.

**What makes this LAUNCH_SAFE:**
- GSTIN transactional gate is not weakened
- CRM remains qualification authority
- Main App remains account/access/trust authority
- No invite is issued until CRM approves
- Source channel is captured at Tier 0 for attribution

**What is currently MISSING to enable this:**
- Tier 0 surface on `app.texqtic.com` (no self-service capture form exists)
- CRM notification seam on Tier 0 capture (webhook/event not built)
- Account-level source channel tagging (currently event-level only)
- CRM discovery of new model requirements (requires `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01`)

---

## 23. Candidate Next Unit Classifications

| Unit | Classification |
|---|---|
| `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01` | REQUIRED_NEXT — defines CRM role in new model, what CRM needs before Tier 0 vs before transactional |
| `DECIDE-MAINAPP-WEB-DIRECT-REQUEST-ACCESS-FLOW-01` | REQUIRED_BEFORE_IMPLEMENTATION — needed after CRM role is defined to design the Tier 0 surface |
| `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` | REQUIRED_AFTER_CRM — locks the provisioning seam once CRM flow is defined |
| `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01` | DEFERRED — not blocking soft launch; required before offline/field expansion |
| `DECIDE-TEXQTIC-ACQUISITION-OPERATING-MODEL-SYNTHESIS-01` | REQUIRED_AFTER_CRM — synthesizes Main App + CRM + CAE views into final model |
| `DESIGN-MAINAPP-TRUST-TIER-GSTIN-GATED-ONBOARDING-01` | REQUIRED_BEFORE_IMPLEMENTATION — designs the implementation of trust-tier model per FD-TEXQTIC-ONBOARDING-AUTH-001 |
| `GOV-MAINAPP-SOURCE-CHANNEL-TAGGING-CONTRACT-01` | REQUIRED_BEFORE_IMPLEMENTATION — defines source channel tagging at account level |

---

## 24. Selected Next Unit

**`DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01`**

**Selection rule applied:** Main App requirements are now clear. The CRM role — specifically whether CRM must be involved before first Tier 0 capture or only before transactional access — is the highest unresolved dependency. CRM repo truth must be inspected to confirm:

1. Whether CRM can receive a notification post-Main-App-capture rather than pre-capture.
2. What CRM currently does with web-origin leads.
3. What CRM would need to implement to support the proposed new model.
4. Whether CRM has a seam for post-capture notification or if a new seam must be designed.

Per the prompt selection rule: if Main App finds CRM role must be defined next, select `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01`.

---

## 25. Decision Verdict

**`DECISION_MAINAPP_ONBOARDING_REQUIRES_CRM_FLOW_DISCOVERY`**

Main App requirements for onboarding are now documented with sufficient clarity to proceed. The CRM role must be defined next. Specifically, the question of whether CRM approval is required before Tier 0 capture (current model) or only before transactional access (proposed model) is the central cross-system dependency that must be resolved before any implementation can begin.

---

## 26. Rationale

1. **Main App has no Tier 0 surface.** `SUPPLIER_REQUEST_ACCESS_URL` points to `https://texqtic.com/request-access` — the marketing website. Main App cannot capture a web-origin visitor directly today.

2. **The current CRM-mediated flow adds significant friction.** The path marketing → CRM → provisioning → invite → activation takes days to weeks. For primed web visitors, this breaks acquisition momentum.

3. **The GSTIN gate already exists in substance.** `VERIFICATION_BLOCKED_VIEWS` and `isVerificationBlockedTenantWorkspace` in App.tsx block transactional actions (trades, RFQs, escrow, settlement, invoices) based on org.status. This is the foundation of the trust gate — it just needs to be aligned explicitly to GSTIN approval status.

4. **CRM and CAE seams exist for the CRM-mediated path but not for a direct-web path.** The three-system plan and cross-repo decision lock confirm Main App provisioning endpoints are live. But a direct-web Tier 0 → CRM notification model is not implemented and requires CRM alignment first.

5. **CAE is not a blocking dependency.** CAE can continue offline-only for soft launch. Its eventual role (consolidation into CRM or standalone) requires a separate discovery unit.

6. **The GSTIN founder decision is now recorded** (FD-TEXQTIC-ONBOARDING-AUTH-001.md). All future implementation prompts must reference it.

---

## 27. Safety Confirmations

| Safety Rule | Status |
|---|---|
| No source code edited | CONFIRMED |
| No schema changed | CONFIRMED |
| No migrations run | CONFIRMED |
| No env vars modified | CONFIRMED |
| No provisioning executed | CONFIRMED |
| No production API calls made | CONFIRMED |
| No emails or invites sent | CONFIRMED |
| No CRM repo modified | CONFIRMED |
| No CAE repo modified | CONFIRMED |
| No marketing website repo modified | CONFIRMED |
| No provider settings changed | CONFIRMED |
| No secrets exposed | CONFIRMED |
| Repo tree clean at end | CONFIRMED (only the two docs artifacts are new/untracked) |

---

## 28. Truth Sync Note — Tier 0 Request Access Cutover (2026-06-06)

**TRUTH SYNC NOTE** — added post-implementation by unit `VERIFY-TLRH-TIER0-REQUEST-ACCESS-CYCLE-CLOSE-01`.

The findings recorded in §11, §12, §13, §20, and §26 were correct at the time this document was authored. The following implementation chain has since been completed and production-verified. This section records the truth sync only — no decisions in this document are revoked or superseded.

### What Changed (post-authoring)

| Finding (as written) | Truth at Cycle Close (2026-06-06) |
|---|---|
| §11: `Request-access (Main App tier 0 surface) \| App.tsx \| MISSING from Main App — currently on https://texqtic.com/request-access` | **IMPLEMENTED**: `components/Public/PublicRequestAccess.tsx` implements `/request-access` on `app.texqtic.com`. `SUPPLIER_REQUEST_ACCESS_URL = '/request-access'` in `App.tsx` (was `'https://texqtic.com/request-access'`). 18 downstream usages confirmed routing to internal SPA path. |
| §11 Friction Point 1: "A web-origin visitor who clicks Request Access is redirected to `https://texqtic.com/request-access`" | **RESOLVED**: Visitor is now directed to `https://app.texqtic.com/request-access` (internal SPA). No external marketing site redirect. |
| §12: `Web-Direct Gap — There is NO app.texqtic.com route for Tier 0 lite access creation` | **RESOLVED**: `https://app.texqtic.com/request-access` returns HTTP 200. Form collects name, email, phone, company, city, state, message, and role intent. |
| §12: `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` | **UPDATED**: `SUPPLIER_REQUEST_ACCESS_URL = '/request-access'` (commit `901749a8`). |
| §13: `Tier 0 — Claimed Identity / Lite Access \| MISSING — no lite-access surface; PUBLIC_ENTRY redirects to marketing` | **PARTIALLY IMPLEMENTED**: Capture-only surface live. No local account/tenant created. Lead relayed to CRM `marketing.lead_submissions`. `form_name='Main App Tier 0'`, `source_channel='Website Form'`. Full Tier 0 model (local storage, CRM automation, account conversion) still deferred — see §16 FTR-ACQ register. |
| §20: `Supplier from website \| Soft-Launch Status: PARTIAL — invite path works; Tier 0 MISSING` | **UPDATED**: Soft-Launch Status → `PARTIAL_ADVANCING` — invite path works (unchanged); Tier 0 capture surface IMPLEMENTED (commit `2f1bfd21` + `901749a8`). CRM-to-Main-App automated provisioning still MISSING (FTR-ACQ-005). |
| §22 Recommendation 1: `Main App captures Tier 0 — MISSING` | **IMPLEMENTED** (capture-only): `POST /api/public/tier0/request-access` relays to CRM immediately on form submission. CRM qualification and provisioning chain unchanged. |
| §26 Rationale §1: `Main App has no Tier 0 surface` | **RESOLVED**: `https://app.texqtic.com/request-access` is live. |

### Verified Final User Path (PRODUCTION_VERIFIED)

```
Marketing Website CTA or direct /request-access visit
→ https://app.texqtic.com/request-access (HTTP 200, no auth required)
→ form submit → POST /api/public/tier0/request-access
→ HTTP 201 { success: true, data: { requestId, crmReceiptId, status, message } }
→ CRM marketing.lead_submissions (DB row confirmed: requestId=8201d90b, crmReceiptId=8f3b18d7)
→ CRM qualification / follow-up (unchanged — operator responsibility)
→ CRM provisioning → invite → activation (unchanged — invite path still required)
```

### Implementation Chain (Main App repo)

| Commit | Description |
|---|---|
| `a060febb` | feat: Tier 0 Request Access API (`server/src/routes/public.ts`) |
| `2f1bfd21` | feat: Tier 0 Request Access UI (`components/Public/PublicRequestAccess.tsx`, `services/tier0Service.ts`, App.tsx state machine) — 20/20 tests PASS |
| `901749a8` | fix: route public request access CTAs to app page (4 CTA locations updated; 8/8 source-level CTA tests PASS) |

### Architecture Decision Locked

- `texqtic.com` = marketing / credibility / SEO / conversion website
- `app.texqtic.com` = application AND public-safe platform surface (including public request-access intake)
- Marketing Website explains and routes; Main App owns the canonical request-access surface
- CRM remains the persistent Tier 0 receiver (`marketing.lead_submissions`, `form_name='Main App Tier 0'`)
- Tier 0 is ungated: no GSTIN, no Udyam, no payment, no legal gate at capture point
- GSTIN transactional gate (FD-TEXQTIC-ONBOARDING-AUTH-001.md) applies before any transactional access — UNCHANGED

### Open Backlog Items

See `governance/launch-readiness/FUTURE-TODO-REGISTER.md` §16 (FTR-ACQ-001 through FTR-ACQ-007) for the full open backlog from the cutover cycle.

**Closure enum:** `VERIFY_TLRH_TIER0_REQUEST_ACCESS_CYCLE_CLOSE_COMPLETE`


## 28. Recommended Next Prompt/Unit

**Draft next:**

```
DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01
```

**Context to provide:**
- This unit's verdict: `DECISION_MAINAPP_ONBOARDING_REQUIRES_CRM_FLOW_DISCOVERY`
- Main App recommendation: `MAINAPP_RECOMMENDS_DIRECT_WEB_REQUEST_ACCESS`
- Founder decision: `FD-TEXQTIC-ONBOARDING-AUTH-001` (GSTIN gate recorded)
- Three-system plan: `PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md`
- CRM entity/lifecycle/handoff inventory: `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`
- Prior unit: `DECIDE-CAE-MAIN-APP-DEPENDENCY-CONTRACT-01` (commit `682e7e7`)
- Main App provisioning envelope: `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md`

**Questions to answer in CRM unit:**
1. Does CRM currently support post-capture notification (i.e., can Main App call CRM after Tier 0 capture)?
2. What CRM approval workflow is required before transactional access — and can this run in parallel to Main App Tier 0?
3. What would CRM need to implement to support a `Main App Tier 0 → CRM notify → CRM qualify → Main App provision` flow?
4. Does CRM have a seam for receiving a notification from Main App, or does CRM always initiate?
5. For web-origin leads from `texqtic.com/request-access`, what does CRM receive today and where does it store it?
6. Should CRM remain the owner of qualification authority in the new model?
7. Does the CRM `admin_approved` / `onboarding_case` model map cleanly to Main App provisioning, or is a new API needed?

---

## 29. Appendix: Key Evidence Summary Table

| Evidence Item | Source | Confidence |
|---|---|---|
| `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` | App.tsx:2018 | HIGH — hardcoded constant |
| No direct registration / Tier 0 surface on Main App | App.tsx state machine; all routes inspected | HIGH |
| `VERIFICATION_BLOCKED_VIEWS` blocking trades/RFQs/escrow/settlement/invoices | App.tsx:1076–1083 | HIGH |
| `isVerificationBlockedTenantWorkspace` blocking catalog add/edit/RFQ | App.tsx:2781–2894 | HIGH |
| GSTIN format validation (15-char regex + valid India state codes) | gstVerification.service.ts | HIGH |
| Manual admin review workflow (no live GST portal API) | gst-verification.ts route comments | HIGH |
| Approved provisioning endpoint (`POST /api/admin/tenant-provision`) | MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001 | HIGH |
| `partyType` (buyer/supplier) not accepted in runtime provisioning | MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001:§4 | HIGH |
| `source_channel` event-level only (not account-level) | public.ts:705, shared/contracts/event-names.md | HIGH |
| Internal acquisition provisioning for supplier public profile | acquisitionProvisioning.ts | HIGH |
| Cross-system join key: `orchestrationReference` / `external_orchestration_ref` | provisioning routes, schema | HIGH |
| No CAE seam required for soft launch | three-system plan, CAE not in workspace | HIGH |
| CRM remains qualification authority (three-system plan) | CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001.md | HIGH |
| Marketing website → CRM seam exists and is real | CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md | HIGH |
| CRM → Main App provisioning seam exists but is CRM-initiated only | MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001 | HIGH |
| No Main App → CRM notification seam exists | CRM investigation, acquisitionProvisioning.ts | HIGH |

---

*Unit: DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01*
*Date: 2026-06-06 | Branch: main | Starting HEAD: 8ddbe36e*
*Mode: TECS Safe Decision / Docs-only / No runtime implementation*

---

## 30. Truth Sync Note — Hybrid Onboarding Direct Registration Launch Readiness (2026-06-08)

**TRUTH SYNC NOTE** — added post-implementation by unit `GOV-SYNC-MAINAPP-HYBRID-ONBOARDING-DIRECT-REGISTRATION-TRUTH-01`.

The findings recorded in §11, §12, §13, §20, and §26 were correct at the time this document was authored. The Tier 0 truth sync in §28 updated the request-access surface. The following additional implementation chain has since been completed and production-verified (2026-06-08). This section records the truth sync only — no decisions in this document are revoked or superseded.

### What Changed (post §28 sync, i.e. since 2026-06-06)

| Finding (as written) | Truth at Direct Registration Launch (2026-06-08) |
|---|---|
| §11: `Self-service direct registration (no invite) \| App.tsx, all routes \| MISSING — no self-registration surface` | **IMPLEMENTED**: `/register` route added. `POST /api/public/register` creates `PENDING_VERIFICATION` org + `OWNER` membership without invite. `public.direct_registration.created` audit event with `roleIntent` captured. 500 blocker resolved (commit `da9cbece`). |
| §12: `There is NO app.texqtic.com route for... Direct self-registration` | **RESOLVED**: `https://app.texqtic.com/register` is live. Direct registration without invite is now the primary online acquisition entry point. |
| §13: `Tier 0 — Claimed Identity / Lite Access \| MISSING — no lite-access surface` | **SUPERSEDED** by direct registration lane: online users now land directly at `/register` (Tier 1 entry with provisional PENDING_VERIFICATION account). Tier 0 `/request-access` is retained as legacy/high-touch fallback only. |
| §20: `Supplier from website \| Direct Registration Allowed? \| NOT YET (requires Tier 0 implementation)` | **UPDATED**: Direct registration is now ALLOWED via `/register`. `PENDING_VERIFICATION` org created on submit. Transactional access gated by backend verification guard until GST/KYC approved. |
| §20: `Supplier from website \| Invite Required? \| YES (current) or NO (future Tier 0)` | **UPDATED**: Invite NOT required. Direct registration creates org + OWNER membership without invite. |
| §20: `Supplier from website \| Soft-Launch Status \| PARTIAL_ADVANCING` | **UPDATED**: `DIRECT_REGISTRATION_LIVE` — `/register` live, PENDING_VERIFICATION account created, transactional gate enforced backend-side. CRM-to-Main-App automated provisioning seam unchanged (offline/assisted fallback). |
| §21 Friction Path 3: `Website → Main App full registration → CRM verifies later \| VIABLE` | **CONFIRMED IMPLEMENTED**: This path is now live. Account created immediately, transactional gated backend-side (403 `ORG_VERIFICATION_REQUIRED` on 34 endpoints). |
| §22: `What is currently MISSING to enable this: Tier 0 surface on app.texqtic.com (no self-service capture form exists)` | **RESOLVED (revised model)**: `/register` is the canonical self-service entry — not `/request-access`. Decision locked in `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md`. |

### Additional Implementation (post-§28)

| What Implemented | Commit | Description |
|---|---|---|
| Direct registration API (`POST /api/public/register`) | `da9cbece` | Creates `PENDING_VERIFICATION` org + `OWNER` membership; `public.direct_registration.created` event; 500 blocker fixed |
| Public CTA hierarchy — `Join TexQtic → /register` primary | `1ced08c6` | Request Access removed from primary public navbar; Join TexQtic CTA points to `/register` |
| Request Access public-nav deprecation | `0c44d426` | `/request-access` retained as legacy/high-touch fallback only |
| Provisional success posture | `254aef60` | SUCCESS stage shows pending-verification messaging + locked-transactions notice; no debug fields |
| Backend transactional verification gate — main routes | `b30987f9` | `isOrgVerificationBlocked` guard on catalog, cart, checkout, RFQ, trades, escrow, settlement (26 endpoints, 5 files) |
| Backend transactional verification gate — NC Pool routes | `15548d9a` | Guard extended to pools, poolRfq, poolDemandLines, poolRfqSupplierInvites, poolRfqSupplierQuotes (19 endpoints, 5 files) |

### Backend Verification Guard Summary

- Utility: `server/src/utils/orgVerificationGuard.ts` — `isOrgVerificationBlocked(orgId, reply)`
- Blocked statuses: `PENDING_VERIFICATION`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO`
- Response: HTTP 403, `ORG_VERIFICATION_REQUIRED`
- Fail-closed: returns `true` (blocks) if org not found or DB error
- Total endpoints guarded: 34 across 10 route files
- Unit test coverage: 18/18 tests pass

### Architecture Decision Locked

- Online default = Main App direct registration lane (`/register`)
- CRM-approved provisioning seam = offline/assisted fallback (unchanged, parked)
- `VERIFICATION_BLOCKED_VIEWS` + `isVerificationBlockedTenantWorkspace` in App.tsx = frontend gate (unchanged)
- `isOrgVerificationBlocked` in server routes = backend gate (added 2026-06-08)
- GSTIN transactional gate (FD-TEXQTIC-ONBOARDING-AUTH-001.md) remains the policy authority — UNCHANGED
- Decision authority: `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md`

### Still Open (Not Completed by This Chain)

| Item | Status |
|---|---|
| GST/KYC automation with admin fallback (`DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01`) | OPEN — design unit, not started |
| CRM lifecycle sync event map from direct registration | OPEN — design unit, not started |
| Zoho post-activation contact sync design | OPEN — design unit, not started |
| Marketing Website CTA migration to `/register` | OPEN — Marketing Website repo |
| Role-aware registration entry intent (Supplier / Buyer / Service Provider) | OPEN — design unit, not started |
| E2E online direct registration verification (end-to-end path) | OPEN — pending GST/KYC automation |
| Source channel tagging at account/tenant level | OPEN — no org-level field added |
| B2C audit | OPEN |

### Closure Enum

`VERIFY_MAINAPP_PENDING_VERIFICATION_BACKEND_STATUS_GATE_PRODUCTION_COMPLETE`
