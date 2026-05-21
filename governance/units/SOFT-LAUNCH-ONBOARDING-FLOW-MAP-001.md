# SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001

**Packet ID:** SOFT-LAUNCH-ONBOARDING-FLOW-MAP-A4-MINI-SYNTHESIS  
**Unit ID:** SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001  
**Status:** GOVERNANCE_SYNTHESIS — no implementation, no schema changes, no source mutations  
**Date:** 2026-05-21  
**Synthesizes:** A1 governance scan · A2 provisioning source scan · A3 CRM handoff scan  
**Authority boundary:** Findings only. This unit does not open any family cycle, authorize any implementation, or change Layer 0 posture.

---

## 1. Synthesis Summary

Five onboarding paths are known across the TexQtic governance corpus. They are not equally
implemented. Only one is unconditionally available at soft launch today. The table below
summarises all five; detail follows in §3–§7.

| # | Path | Actors | Source status | Soft-launch suitability | MVP/90-day suitability |
|---|---|---|---|---|---|
| 1 | Manual / admin operator provisioning | Paresh (SUPER_ADMIN) | **IMPLEMENTED** (HD-001 VERIFIED) | ✅ Recommended — no blockers | ✅ Backup / manual fallback at any scale |
| 2 | Marketing → CRM → Main App approval | CRM system, Paresh | **PARTIAL** — platform side ready; CRM operational config missing | ⚠️ Not required for Surat pilot | 🚨 Critical path — must complete before CRM-automated volume |
| 3 | CAE-assisted supplier profile provisioning (WEBHOOK-007) | CAE / CRM, HMAC webhook | **IMPLEMENTED** (commit `6de5002`) — public profile only, no tenant login | ❌ Not required, not activated | ⚠️ Required once CAE acquisition pipeline goes live |
| 4 | Supplier self-onboarding | Supplier (unaided) | **DOES NOT EXIST** — FAM-07 `NOT_ASSESSED` | ❌ Not available | 🚨 Critical path — requires FAM-07 full family cycle |
| 5 | Buyer onboarding / account creation | Buyer | **INQUIRY ONLY** — no buyer tenant provisioning; FAM-08 `NOT_ASSESSED` | ⚠️ Inquiry capture only | 🚨 Critical path — requires FAM-08 full family cycle |

---

## 2. Object Chain Reference (Repo-Verified)

The canonical provisioned-tenant object chain for Paths 1 and 2 (from `tenantProvision.service.ts`
and confirmed in `TEXQTIC-MAIN-APP-CRM-HANDOFF-READINESS-v1.md`):

```
CRM Approval / Paresh Decision
        │
        ▼
POST /api/control/tenants/provision
  (APPROVED_ONBOARDING mode — bearer token or admin JWT)
        │
        ▼  [atomic transaction — 20-second timeout]
┌──────────────────────────────────┐
│ tenants row   (id = UUID)        │
│ organizations row (id = same UUID, status: VERIFICATION_APPROVED) │
│ invites row   (invitePurpose: FIRST_OWNER_PREPARATION, TTL 7d)    │
└──────────────────────────────────┘
        │
        ▼  [invite token delivered to supplier]
POST /api/tenant/activate
  (supplier clicks invite link)
        │
        ▼  [atomic transaction]
  organizations.status → PENDING_VERIFICATION
  memberships row created (role: OWNER)
  invites.acceptedAt set
  audit log: user.activated
        │
        ▼  [Paresh admin review — 2 manual steps]
POST /api/control/tenants/:id/onboarding/outcome (outcome=APPROVED)
POST /api/control/tenants/:id/onboarding/activate-approved
        │
        ▼
  organizations.status → ACTIVE
```

**Identifiers produced at provisioning (both returned in 201 response):**
- `orgId` — platform-issued durable UUID (`tenants.id = organizations.id`) — CRM's permanent identifier
- `orchestrationReference` — CRM-issued link-time join key (echoed back); stored in `tenants.externalOrchestrationRef` and `organizations.external_orchestration_ref`

---

## 3. Path 1 — Manual / Admin Operator Provisioning

**Status: IMPLEMENTED — SOFT-LAUNCH RECOMMENDED PATH**

### Flow

```
Paresh identifies Surat pilot supplier (direct network)
        │
        ▼
POST /api/control/tenants/provision
  Authorization: Bearer <admin-JWT> (SUPER_ADMIN role)
  body: { provisioningMode: "APPROVED_ONBOARDING",
          orchestrationReference: "<internal-ref>",
          organization: { legalName, jurisdiction },
          firstOwner: { email } }
        │
        ▼
201 response → extract inviteToken (64-char hex)
        │
        ▼
Paresh constructs invite link:
  https://app.texqtic.com/onboarding?token=<inviteToken>
  (or current frontend onboarding route)
        │
        ▼
Paresh delivers link to supplier (email / WhatsApp)
        │
        ▼
Supplier opens link → POST /api/tenant/activate
        │
        ▼
Supplier is live on platform (PENDING_VERIFICATION)
        │
        ▼
Paresh runs 2-step admin review → ACTIVE
```

### Actors
- **Paresh** — the only required actor; acts as CRM, provisioning agent, and operator

### Required Data
| Field | Required | Notes |
|---|---|---|
| `organization.legalName` | Yes | Supplier company name |
| `organization.jurisdiction` | Yes | Country code (e.g., `IN`) |
| `firstOwner.email` | Yes | Supplier first-owner email; invite is sent to this address |
| `orchestrationReference` | Recommended | Paresh's internal tracking ref (e.g., `surat-pilot-001`); max 255 chars |
| Admin JWT | Yes | SUPER_ADMIN role; obtained via Supabase Auth at app.texqtic.com |

### Blockers
**None.** Everything required is implemented and production-verified (HD-001 VERIFIED).

### Soft-Launch Suitability
**✅ FULLY SUITABLE — Recommended path for Surat pilot (10–30 suppliers)**  
No CRM, no CAE, no automation, no external team coordination needed.
Invite TTL is 7 days — sufficient for direct-network outreach.
Scale ceiling: manual throughput is ~10–20 provisioning actions/day; adequate for pilot cohort.

### MVP / 90-Day Suitability
**✅ Still valid as manual backup at any scale.**  
Admin JWT path is always available as fallback. Should be supplemented by Path 2 (CRM automation) before attempting volume > 100 suppliers.

---

## 4. Path 2 — Marketing → CRM → Main App Approval Path

**Status: PARTIAL — Platform side ready; CRM operational config missing**

### Flow

```
Marketing website → inquiry/lead captured
        │  (marketing proxy → CRM webhook — external to this repo)
        ▼
CRM marketing.lead_submissions
        │  (CRM internal qualification)
        ▼
CRM Qualified Lead → CRM Onboarding Case → CRM Approval
        │
        ▼
CRM calls:
POST /api/control/tenants/provision
  Authorization: Bearer <crm-service-token>
  body: { provisioningMode: "APPROVED_ONBOARDING",
          orchestrationReference: "<crm-case-id>",
          organization: { legalName, jurisdiction },
          firstOwner: { email } }
        │
        ▼
201 response → orgId + inviteToken returned to CRM
        │  CRM stores orgId as durable platform identifier
        │  CRM delivers invite to supplier (own mechanism)
        ▼
Supplier activates → POST /api/tenant/activate
        │
        ▼
CRM polls: GET /api/control/tenants/provision/status?orgId=<uuid>
  response: { provisioningStatus: "ACTIVATED", activation: { isActivated: true } }
```

### Actors
- **CRM system** — calls provisioning endpoint with bearer token
- **CRM team** — manages onboarding case, issues invite, monitors activation
- **Paresh** — CRM admin + Main App SUPER_ADMIN; still required for 2-step admin review (PI-001)

### Required Data (Platform Side)
| Item | Status |
|---|---|
| `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` set in Vercel | Must be configured (env var exists; value must be provisioned) |
| Bearer token pre-shared with CRM team | Not yet done — operational task only |
| CRM endpoint spec document (white paper) | Exists: `docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md` |
| CRM polling endpoint spec | Exists: `docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md` |

### Blockers
| ID | Blocker | Blocking? |
|---|---|---|
| B-1 | `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` not confirmed in Vercel production | Soft-launch: No (Paresh uses admin JWT). MVP: Yes. |
| B-2 | CRM team not yet given token or endpoint spec | Soft-launch: No. MVP: Yes. |
| PI-001 | `ACTIVE` status requires 2 manual SUPER_ADMIN steps; no automated transition | Soft-launch: Acceptable (Paresh reviews each). MVP: Needs automation. |
| PI-002 | No platform-to-CRM push on activation; CRM must poll | Soft-launch: N/A. MVP: Operational latency risk. |
| PI-003 | No CRM→platform sync-back route | MVP/post-launch: operational gap only. |

### Soft-Launch Suitability
**⚠️ NOT REQUIRED for Surat pilot.**  
CRM/CAE integration is explicitly deferred for the first cohort per `FIRST-FAMILY-CYCLE-SELECTION.md §12`:  
> "The integration chain (CRM → Main, CAE → CRM, CAE → Main) can be fully manual for the first cohort."

### MVP / 90-Day Suitability
**🚨 CRITICAL PATH — required before CRM-automated provisioning at volume.**  
Three operational tasks must complete: (1) generate and configure the service token, (2) share token + endpoint spec with CRM team, (3) implement automated `ACTIVE` status transition (PI-001). PI-002 is recommended but not blocking if CRM can tolerate polling.

---

## 5. Path 3 — CAE-Assisted Supplier Profile Provisioning (WEBHOOK-007)

**Status: IMPLEMENTED — public supplier profile only; full tenant onboarding NOT included**

> **Critical distinction:** WEBHOOK-007 provisions a **public B2B supplier profile** (an
> `organizations` row + `tenants` row with no invite, no user, no membership). This is
> NOT the same as onboarding a paying tenant supplier with login access. It is an
> acquisition/discovery tool — a supplier appears in the directory, but cannot log in.

### Flow

```
CAE (field acquisition agent captures supplier details)
        │  (CAE → CRM acquisition pipeline — external to this repo)
        ▼
CRM sends webhook:
POST /api/internal/acquisition/provision-supplier
  x-texqtic-provisioning-hmac: <HMAC-SHA256>
  x-texqtic-provisioning-ts: <timestamp-ms>
  body: { eventName: "public_supplier_profile.provision_requested.v1",
          external_orchestration_ref: "<crm-supplier-id>",
          crmSupplierId: "<crm-id>",
          supplierName: "<name>",
          publication_posture_target: "B2B_PUBLIC",
          jurisdiction: "IN",   ← defaults to IN if absent
          ... }
        │
        ▼
201 → public supplier profile live at /supplier/:slug
200 → already_exists (idempotent)
202 → gate_failed (projection safety gates not passed)
409 → conflict (same ref, different identity)
```

### Actors
- **CAE / CRM system** — webhook caller with HMAC auth
- **No Paresh action required** — fully automated if configured

### Required Data
| Item | Status |
|---|---|
| `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` set in Vercel | OPTIONAL in schema; if absent → 503 |
| HMAC headers correctly generated by CRM | CAE/CRM-side responsibility |
| `external_orchestration_ref` (CRM supplier ID) | Required; idempotency key |

### Blockers
| ID | Blocker | Blocking? |
|---|---|---|
| B-1 | `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` not confirmed configured in Vercel | Must be set before WEBHOOK-007 goes live |
| B-2 | CAE FAM-23/24 are `XDEP_ONLY` / `NOT_ASSESSED` — no CAE source audit has been performed | Soft-launch: N/A. Live CAE pipeline: yes. |
| B-3 | WEBHOOK-007 does NOT create an invite, user, or membership — supplier cannot log in | By design; not a blocker but must be understood: this path does not replace Path 1 or 2 |

### Soft-Launch Suitability
**❌ NOT REQUIRED and NOT ACTIVATED for Surat pilot.**  
Soft-launch acquisition is through Paresh's direct network. WEBHOOK-007 is the automated acquisition pipeline — not relevant until CAE/CRM field acquisition pipeline is operational.

### MVP / 90-Day Suitability
**⚠️ REQUIRED before automated CAE-sourced supplier profile provisioning.**  
Pre-conditions: (1) `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` set in Vercel, (2) CRM configured to call the endpoint with correct HMAC, (3) CAE FAM-23/24 scoped and opened.

---

## 6. Path 4 — Supplier Self-Onboarding

**Status: DOES NOT EXIST — FAM-07 Supplier Onboarding `NOT_ASSESSED` / `LAUNCH_BLOCKER`**

No self-registration route exists in the current codebase. There is no:
- `POST /api/public/register`
- Self-serve tenant creation endpoint
- Sign-up form in the frontend

The `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md §5` confirms:  
> "Free / manual operator-provisioned supplier tenants — ALLOWED. Paresh provisions suppliers manually; no self-serve required at soft launch."

`FIRST-FAMILY-CYCLE-SELECTION.md §5` identifies FAM-07 (Supplier Onboarding) as a `LAUNCH_BLOCKER / P0` family that depends on FAM-06 (Auth and Session Management) being complete first.

### Soft-Launch Suitability
**❌ NOT AVAILABLE.** No implementation exists. Not required for Surat pilot — all provisioning is operator-driven (Path 1).

### MVP / 90-Day Suitability
**🚨 CRITICAL PATH — required for any self-serve onboarding model at hard MVP launch.**  
Must be preceded by: FAM-06 (Auth) full family cycle → FAM-07 family opening audit → FAM-07 implementation units.

---

## 7. Path 5 — Buyer Onboarding

**Status: INQUIRY CAPTURE ONLY — no buyer tenant provisioning; FAM-08 `NOT_ASSESSED` / `LAUNCH_BLOCKER`**

Buyers currently interact with the platform only through:

| Surface | Status | Route |
|---|---|---|
| B2B directory browse | PRODUCTION_VERIFIED | `GET /api/public/b2b/suppliers` |
| D2C product browse | PRODUCTION_VERIFIED | `GET /api/public/b2c/products` |
| Public supplier profile | PARTIALLY_IMPLEMENTED | `GET /api/public/supplier/:slug` |
| Inquiry submission | IMPLEMENTED (commit `bee4e33`) | `POST /api/public/inquiry/submit` |

No buyer account, buyer tenant, or buyer authentication surface exists in the codebase. FAM-08
(Buyer Registration and Auth) is `NOT_ASSESSED / LAUNCH_BLOCKER` and depends on FAM-06 auth being
complete first.

The inquiry endpoint captures:
- `inquiry_category` (GENERAL / CAPABILITY_FIT / OFFERING_PREVIEW / SOURCING_INTENT / QUALIFICATION_CHECK)
- `supplier_slug` (optional) — emits `buyer_inquiry.created.v1` event if supplier exists
- `source_surface`, `geo_band`, `volume_band`, `message` (optional; PII-blocked, HTML-stripped)
- Rate limited: 20 requests per 15 minutes per IP

**General inquiry path note:** General inquiries (no `supplier_slug`) emit `public.buyer.inquiry.general.created` only — this action is not registered in `AUDIT_ACTION_TO_EVENT_NAME`, so no event fires. Event infrastructure for general inquiries is pending PI-005.

### Soft-Launch Suitability
**⚠️ INQUIRY ONLY — no authenticated buyer flow.**  
Buyers can discover suppliers and submit inquiries. Buyer account creation is deferred. This is sufficient for Surat pilot network-building where buyer engagement is primarily via inquiry email capture.

### MVP / 90-Day Suitability
**🚨 CRITICAL PATH — buyer account registration required for any repeat-buyer or authenticated buyer surface.**  
Must be preceded by: FAM-06 (Auth) full family cycle → FAM-08 family opening audit → FAM-08 implementation units.

---

## 8. Implementation Gap Map

| Gap | Affects paths | PI/FAM ref | Blocking soft-launch? | Blocking MVP? |
|---|---|---|---|---|
| `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` not confirmed in Vercel | Path 2 | B-1 | No | Yes |
| Bearer token not shared with CRM team | Path 2 | B-2 | No | Yes |
| No platform-to-CRM push on activation (PI-002) | Path 2 | PI-002 | No | Partial (CRM must poll) |
| `ACTIVE` status no automated transition (PI-001) | Path 1, 2 | PI-001 | No (manual OK) | Yes (needs automation at volume) |
| `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` not confirmed in Vercel | Path 3 | B-1 | No | Yes (WEBHOOK-007 needs it live) |
| Supplier self-onboarding (FAM-07) `NOT_ASSESSED` | Path 4 | FAM-07 | No | Yes (LAUNCH_BLOCKER) |
| Buyer account registration (FAM-08) `NOT_ASSESSED` | Path 5 | FAM-08 | No | Yes (LAUNCH_BLOCKER) |
| General inquiry event infrastructure (PI-005) | Path 5 | PI-005 | No | Low priority |
| Inquiry notification loop (FTR-B2C-004 / PRIT-033) | Path 5 | FTR-B2C-004 | Yes — required before buyer outreach at scale | Yes |
| Legal pages bundle (PRIT-034) | All paths | PRIT-034 | Yes — required before any public data collection | Yes |

---

## 9. Recommended Path by Phase

### Surat Pilot Soft Launch (10–30 suppliers, curated network)

> **Use Path 1 — Manual / Admin Operator Provisioning exclusively.**

Steps:
1. Paresh generates admin JWT at `app.texqtic.com`
2. For each supplier: `POST /api/control/tenants/provision` (SUPER_ADMIN JWT, `APPROVED_ONBOARDING` mode)
3. Extract `inviteToken` from 201 response
4. Deliver `https://app.texqtic.com/onboarding?token=<inviteToken>` to supplier
5. Supplier completes activation via invite link
6. Paresh runs 2-step admin review (onboarding outcome → activate-approved)
7. Supplier is live and `ACTIVE`

Path 1 requires no external coordination, no new configuration, and no additional implementation.
It is the only path with zero blockers today.

### MVP / 90-Day CRM-Automated Onboarding

> **Use Path 2 — CRM → Main App Approval Path**, triggered by CRM approval of onboarding case.

Pre-conditions before opening Path 2:
1. Generate service bearer token; set `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` in Vercel
2. Share token + `docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md` with CRM team
3. Implement automated `ACTIVE` status transition (PI-001)
4. Confirm CRM polling is operational (`GET /api/control/tenants/provision/status`)
5. Optionally: implement platform-to-CRM push (PI-002) to replace polling

### Later — CAE Acquisition Pipeline

> **Use Path 3 (WEBHOOK-007)** once CAE/CRM acquisition pipeline is operational and FAM-23/24 are scoped.

Pre-conditions:
1. Set `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` in Vercel
2. CRM configured with HMAC secret and endpoint spec
3. CAE FAM-23/24 opened and audited

---

## 10. No-Files-Changed Confirmation (A1, A2, A3)

All three predecessor packets (A1, A2, A3) were read-only governance scans.  
No source files, migrations, RLS policies, or configuration files were modified in any of A1, A2, A3, or this synthesis.  
This file (A4 synthesis artifact) is the only file created.
