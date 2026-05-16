# TEXQTIC-WEBHOOK-007-PROVISIONING-AUTH-CONTRACT-DECISION-v1

**Unit ID:** MAIN-PLATFORM-WEBHOOK-007-AUTH-CONTRACT-DECISION-001  
**Title:** Acquisition Provisioning Webhook Contract — Auth, Payload, Idempotency, Response, and OpenAPI Decisions for WEBHOOK-007  
**Status:** DECIDED — Docs/governance only. No implementation authorized.  
**Date:** 2026-05-15  
**Authorized by:** Paresh (explicit — submitted as MAIN-PLATFORM-WEBHOOK-007-AUTH-CONTRACT-DECISION-001 prompt; docs/governance unit only)  
**Basis:** Repo-truth inspection of internal route patterns, HMAC utilities, schema, event contracts, and all prerequisite governance decisions. No code, schema, migration, route, service, frontend, event, or OpenAPI changes.

---

## §0 — Purpose and Scope

This decision artifact resolves the remaining non-code blockers for:

**`MAIN-PLATFORM-ACQUISITION-PROVISIONING-WEBHOOK-007`**

Specifically, it decides and documents:

1. WEBHOOK-007 endpoint path
2. CRM → Main Platform auth model
3. Required request headers
4. Environment variable names
5. Request payload contract
6. Idempotency key and conflict behavior
7. Response contract
8. Retry/failure behavior for CRM
9. OpenAPI same-wave implementation requirement
10. Callback URL and deployment configuration
11. Event emission expectations
12. Remaining implementation guardrails

**This artifact does NOT authorize WEBHOOK-007 runtime implementation.** It is a prerequisite docs/governance unit only. WEBHOOK-007 remains blocked until Paresh issues explicit implementation authorization and zero-TTP-intersection is verified in the same wave.

---

## §1 — Layer 0 Posture and Authorization

| Field | Current Truth |
| --- | --- |
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `active_delivery_unit_status` | `HOLD_FOR_AUTHORIZATION` |
| `next_candidate_unit` | `HOLD_FOR_COUNSEL_FEEDBACK` |
| TTP legal gate | Active (`HOLD_FOR_COUNSEL_FEEDBACK`) |
| WL Co hold | `REVIEW-UNKNOWN` (BLOCKED.md §2) |
| Last closed unit | `TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001` (VERIFIED_COMPLETE 2026-07-06) |

**Authorization basis:** The TTP legal hold applies to implementation units, feature-flag activations, schema mutations, and runtime behavior changes. This unit is docs/governance decision only. Paresh explicitly authorized this unit by submitting the WEBHOOK-007-AUTH-CONTRACT-DECISION-001 prompt. No runtime files are modified by this unit.

**What this unit does NOT authorize:**
- WEBHOOK-007 implementation
- Schema mutations or migrations
- OpenAPI contract modifications
- Event registry changes
- Any Layer 0 control file changes
- Any frontend changes

---

## §2 — Source Artifacts and Files Reviewed

### 2.1 Governance Prerequisites (All Resolved)

| Artifact | Path | Status |
| --- | --- | --- |
| ORF-AUTHORITY-006 decision | `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` | **DECIDED** — canonical `external_orchestration_ref` = `organizations.external_orchestration_ref`; idempotency key confirmed |
| ORF jurisdiction addendum | `governance/decisions/TEXQTIC-ORF-JURISDICTION-SEMANTICS-CLARIFICATION-ADDENDUM-v1.md` | **DECIDED** — `organizations.jurisdiction` is country/market code; default `'IN'` for acquisition-sourced suppliers where CRM omits field |
| Event names contract | `shared/contracts/event-names.md` | **EVENTS-003 REGISTERED** — `buyer_inquiry.created.v1`, `public_supplier_profile.provision_requested.v1`, `public_supplier_profile.provisioned.v1`, `public_supplier_profile.gate_failed.v1` all registered |

### 2.2 Completed Implementation Prerequisites

| Unit | Status |
| --- | --- |
| ROUTE-001 — `GET /api/public/supplier/:slug` | **LIVE** (commit `41c2ef1`) |
| QR-SOURCE-002 — `?source=` attribution param | **LIVE** (commit `7a4efa6`) |
| REFERRAL-005 — `/join/:referral_code` landing | **LIVE** (commit `dd2a3ca`) |
| INQUIRY-004 — `POST /api/public/inquiry/submit` | **LIVE** (commit `bee4e33`) |

### 2.3 Tracker Documents

| Artifact | Path | Role |
| --- | --- | --- |
| Acquisition tracker v2 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | Current wave sequencing; WEBHOOK-007 listed as Wave 5 |
| Repo-truth refresh v1 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md` | Confirmed `POST /api/internal/acquisition/provision-supplier` ABSENT |
| Aggregator acquisition merged tracker v1 | `docs/product-truth/MAIN-PLATFORM-AGGREGATOR-ACQUISITION-MERGED-IMPLEMENTATION-TRACKER-v1.md` | Per-unit detail blocks for WEBHOOK-007 — still accurate for payload specs and guardrails |

### 2.4 Layer 0 Control Files

| File | Reviewed | Key finding |
| --- | --- | --- |
| `governance/control/OPEN-SET.md` | ✅ | Last updated 2026-07-06; TTP legal gate active; WL Co `REVIEW-UNKNOWN` |
| `governance/control/NEXT-ACTION.md` | ✅ | `HOLD_FOR_COUNSEL_FEEDBACK`; no implementation packet may open until TTP counsel feedback recorded |
| `governance/control/BLOCKED.md` | ✅ | All NC Phase 1 items RESOLVED; QD-6 maintained; WL Co `REVIEW-UNKNOWN` unchanged |

### 2.5 Runtime Files Inspected (Repo Truth)

| File / Area | Finding |
| --- | --- |
| `server/src/routes/internal/` | Contains `resolveDomain.ts`, `cacheInvalidate.ts`, `makerChecker.ts`, `index.ts`. **No acquisition route.** |
| `server/src/hooks/tenantResolutionHook.ts` | HMAC-SHA256 verification pattern for internal routes. `tenantResolutionHook` explicitly **skips** `/api/internal/` routes: "they validate separately via HMAC" (line 20). |
| `server/src/lib/resolverHmac.ts` | `verifyResolverHmac()` helper using `createHmac('sha256', secret)` + `timingSafeEqual`. Replay window: 30,000 ms. Headers: `x-texqtic-resolver-hmac` + `x-texqtic-resolver-ts`. |
| `server/src/routes/internal/resolveDomain.ts` | HMAC-only, no JWT. `GET /api/internal/resolve-domain`. Machine-to-machine. 401 on failure. |
| `server/src/routes/internal/cacheInvalidate.ts` | HMAC-only, no JWT. `POST /api/internal/cache-invalidate`. Body-hash included in HMAC canonical message. |
| `server/src/routes/admin/tenantProvision.ts` | Admin-JWT protected provisioning route. Uses `createHash`, `timingSafeEqual` from `node:crypto`. |
| `server/src/config/index.ts` | Env schema uses `TEXQTIC_*` prefix for internal/service secrets; `z.string().min(32)` validation pattern; `TEXQTIC_RESOLVER_SECRET` is the existing HMAC secret env var. |
| `server/src/lib/events.ts` | Acquisition events now registered after EVENTS-003. `writeAuditLog` + `maybeEmitEventFromAuditEntry` is established emission pattern. |
| `server/prisma/schema.prisma` | `organizations.external_orchestration_ref` (`@unique`) confirmed as canonical idempotency key (ORF-AUTHORITY-006). `organizations.jurisdiction` defaults `'UNKNOWN'`. |
| `shared/contracts/openapi.control-plane.json` | Present (v0.3.0, admin-JWT-facing). `POST /api/internal/acquisition/provision-supplier` is **ABSENT**. |
| `shared/contracts/openapi.tenant.json` | Present (v0.3.0, tenant-user-facing). WEBHOOK-007 does NOT belong here. |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Same-wave OpenAPI obligation: "the corresponding `openapi.tenant.json` or `openapi.control-plane.json` must be updated in the same implementation wave." |

### 2.6 CRM and CAE Artifacts — External Evidence Only

The following CRM-specific artifacts are **NOT present in this repository**:

| Artifact | Status |
| --- | --- |
| `CRM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v1.md` | **NOT FOUND** — external CRM artifact |
| `CRM-ACQ-10-PUBLIC-SUPPLIER-PROFILE-PROVISION-REQUEST-DECISION-v1` | **NOT FOUND** — external CRM governance decision |
| CRM handoff note identifying Main Platform blockers | **NOT FOUND** — external CRM artifact |

CRM payload structure facts are sourced from:
- `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` (present at repo root — external evidence committed for reference)
- `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` (present at repo root — external evidence committed for reference)

---

## §3 — Problem Statement

WEBHOOK-007 cannot open for implementation until the Main Platform defines:

1. **Auth model** — What mechanism authenticates incoming CRM requests? Which headers carry the credential? What env vars store the shared secret on both sides?
2. **Endpoint path** — The tracker records `POST /api/internal/acquisition/provision-supplier` as the target; this decision confirms it.
3. **Callback URL** — How does CRM know where to call? What env var does CRM configure?
4. **Request payload** — What JSON fields does CRM send? Which are required vs optional? What is prohibited?
5. **Response contract** — What status codes and JSON bodies does the Main Platform return for newly provisioned, already-exists, gate-failed, validation error, unauthorized, conflict, and server error cases?
6. **Idempotency behavior** — What is the idempotency key? What constitutes a conflicting replay?
7. **Retry guidance** — Which responses should CRM retry, and which should it surface as non-retryable?
8. **OpenAPI obligation** — Which contract file does the WEBHOOK-007 implementation unit update?
9. **Event emission** — Which events fire at which points in the provisioning lifecycle?

Without these decisions documented, the WEBHOOK-007 implementation prompt cannot be written, reviewed, or authorized. CRM-ACQ-10 (external) remains blocked until WEBHOOK-007 is implemented and deployed with the callback URL and auth credentials communicated to the CRM team.

---

## §4 — Endpoint Decision

**DECIDED:**

```
POST /api/internal/acquisition/provision-supplier
```

**Rationale:**
- Aligns with existing `/api/internal/*` route pattern for machine-to-machine calls.
- `tenantResolutionHook` explicitly skips `/api/internal/*` routes (they use HMAC, not Edge-injected tenant headers).
- Path segment `acquisition/` scopes the route to the acquisition provisioning domain without ambiguity.
- The tracker (`MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md`, line 188) already records this path.

**Route nature:**
- Internal, machine-to-machine only
- Not a public route
- Not a tenant-user-facing route
- Not authenticated via user JWT or admin JWT
- No browser access
- CRM service-to-service only
- CAE does NOT call this endpoint directly in this phase — CRM is the sole caller

---

## §5 — Auth Model Decision

### 5.1 Selected Model: HMAC-SHA256 with Timestamp

**DECIDED: Option C — HMAC-SHA256**

This aligns with the existing Main Platform internal route auth pattern established in:
- `server/src/lib/resolverHmac.ts` (HMAC-SHA256 + `timingSafeEqual` + replay window)
- `server/src/routes/internal/resolveDomain.ts` (HMAC-only, no JWT)
- `server/src/routes/internal/cacheInvalidate.ts` (HMAC-only, no JWT, body-hash in canonical message)

HMAC-SHA256 was chosen over bearer token (Option A) because:
1. A bearer token is static and provides no replay protection — a stolen token allows unlimited replay attacks.
2. HMAC with a timestamp provides both authenticity and replay protection within the window.
3. The repo already has `createHmac`, `timingSafeEqual`, and the `verifyResolverHmac` pattern — the implementation unit can follow the same pattern with a new secret and canonical message format.

### 5.2 Headers

| Header | Type | Description |
| --- | --- | --- |
| `x-texqtic-provisioning-hmac` | Required | Hex-encoded HMAC-SHA256 of the canonical message (see §5.4) |
| `x-texqtic-provisioning-ts` | Required | Unix timestamp in **milliseconds** as a decimal string |

Both headers must be present. Absence of either → 401, no detail leaked.

### 5.3 Environment Variables

| Variable | Side | Constraint | Purpose |
| --- | --- | --- | --- |
| `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` | **Main Platform** | `min(32)` characters | Secret used to verify incoming HMAC signatures from CRM |
| `MAIN_PLATFORM_PROVISIONING_WEBHOOK_SECRET` | **CRM** | Same value as above | Secret used by CRM to sign outgoing provisioning requests |

> **Security note:** `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` is a **distinct secret** from `TEXQTIC_RESOLVER_SECRET`. They must not be the same value. The resolver secret is shared with the Vercel Edge function; the provisioning secret is shared with CRM only. Never use the same secret for two distinct trust boundaries.

The Main Platform config (`server/src/config/index.ts`) must add:
```
ACQUISITION_PROVISIONING_WEBHOOK_SECRET: z.string().min(32),
```
This is an **implementation note only** — not authorized by this decision unit.

### 5.4 Canonical HMAC Message Format

```
"provision:" + tsMs + ":" + sha256Hex(canonicalBodyJson)
```

Where:
- `tsMs` = the value of `x-texqtic-provisioning-ts` (milliseconds as decimal string)
- `sha256Hex(canonicalBodyJson)` = hex SHA-256 of the request body after JSON parsing and re-serialization with keys in deterministic order

> **Implementation note (not authorized here):** The implementation unit must define the exact key-ordering rule for the canonical body hash. The `cacheInvalidate.ts` pattern (`JSON.stringify({ hosts, reason, requestId })` with explicit key order) is the established repo precedent.

### 5.5 Replay Window

**60,000 ms (60 seconds)**

The existing resolver endpoint uses 30,000 ms because it is an intra-platform Edge→API call (sub-second round-trip). WEBHOOK-007 is a cross-system CRM→Main Platform call that may traverse network boundaries with higher latency variability. 60 seconds provides adequate protection against replay attacks while tolerating realistic clock skew and network delays in a cross-system context.

### 5.6 Rotation Expectation

`ACQUISITION_PROVISIONING_WEBHOOK_SECRET` should be rotatable by:
1. Generating a new secret (min 32 chars) on the CRM side
2. Updating `MAIN_PLATFORM_PROVISIONING_WEBHOOK_SECRET` in CRM
3. Updating `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` in Main Platform
4. Redeploying both services atomically (or with a brief overlap window)

No dual-secret rotation protocol is defined at this stage. If live rotation without downtime is required, a future decision unit must define a dual-accept window pattern.

### 5.7 Failure Response

All HMAC failures (missing headers, invalid timestamp, replay window exceeded, bad signature) → **`401 Unauthorized`**.

The 401 response must not indicate which check failed. No error detail beyond the HTTP status code is returned.

---

## §6 — Callback URL and Deployment Configuration

### 6.1 CRM Environment Variable

CRM should configure the following environment variable to point to the Main Platform provisioning endpoint:

```
MAIN_PLATFORM_PROVISION_CALLBACK_URL=https://<main-platform-host>/api/internal/acquisition/provision-supplier
```

**Value for production:**
```
MAIN_PLATFORM_PROVISION_CALLBACK_URL=https://api.texqtic.com/api/internal/acquisition/provision-supplier
```

> *Note: The exact production API host (`api.texqtic.com` or similar) must be confirmed against the current Vercel deployment configuration at the time WEBHOOK-007 is deployed. This decision records the path and env var name as canonical; the host is informational.*

**Value for staging/preview:**
```
MAIN_PLATFORM_PROVISION_CALLBACK_URL=https://<staging-api-host>/api/internal/acquisition/provision-supplier
```

CRM should parameterize this URL per environment, not hardcode it.

### 6.2 Main Platform Configuration

Main Platform does not need a callback URL env var — it is the receiver, not the caller. Its only new env var requirement is:

```
ACQUISITION_PROVISIONING_WEBHOOK_SECRET=<min 32 chars, shared with CRM>
```

This must be present in:
- Local development `.env`
- Staging/preview environment variables (Vercel environment settings)
- Production environment variables (Vercel environment settings)

### 6.3 Firewall / Access Control Expectation

Since `/api/internal/*` routes are reachable from the public internet (the Vercel deployment does not network-isolate them), the only authentication gate is the HMAC verification. This is consistent with the existing `resolve-domain` and `cache-invalidate` endpoints.

If network-level CRM IP allowlisting is implemented in the future, it should be additive (not a replacement for HMAC verification).

---

## §7 — Request Payload Contract

### 7.1 Required Fields

| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| `eventName` | `string` | Must be `"public_supplier_profile.provision_requested.v1"` | Contract version sentinel |
| `eventId` | `string` | UUID or stable deduplicated ID generated by CRM | CRM-side idempotency reference for audit |
| `requestedAt` | `string` | ISO 8601 UTC datetime | When CRM triggered the provisioning request |
| `external_orchestration_ref` | `string` | Non-empty; max 255 chars | Canonical CRM onboarding/supplier reference. Per ORF-AUTHORITY-006: this is the canonical idempotency key for `organizations.external_orchestration_ref` |
| `crmSupplierId` | `string` | Non-empty; max 255 chars | CRM-internal supplier record identifier. Stored in audit log for cross-system traceability; **never returned in public APIs** |
| `supplierName` | `string` | Non-empty; min 2 chars; max 200 chars | Display/legal name of the supplier |
| `publication_posture_target` | `string` | Must be `"B2B_PUBLIC"` | Target publication posture for the provisioned profile |

### 7.2 Optional Fields

| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| `cluster` | `string \| null` | Max 100 chars | Textile/industry cluster (e.g., `"surat_synthetics"`) |
| `category` | `string \| null` | Max 100 chars | Product/service category |
| `likelyPrimarySegment` | `string \| null` | Max 100 chars | CRM-assessed primary market segment |
| `provisionalPlan` | `string \| null` | Max 50 chars | Suggested plan level; Main Platform does not guarantee activation |
| `jurisdiction` | `string \| null` | Max 100 chars; country/market code | Country/market/regulatory jurisdiction. If absent or null, Main Platform defaults to `'IN'` (per ORF-AUTHORITY-006 + jurisdiction semantics addendum). Must be a country/regulatory code — NOT a court venue or city name. |

### 7.3 Canonical Payload Example

```json
{
  "eventName": "public_supplier_profile.provision_requested.v1",
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "requestedAt": "2026-05-15T09:00:00.000Z",
  "external_orchestration_ref": "crm-onboarding-ref-0042",
  "crmSupplierId": "crm-supplier-id-0042",
  "supplierName": "Acme Textiles Pvt Ltd",
  "cluster": "surat_synthetics",
  "category": "woven_fabric",
  "likelyPrimarySegment": "B2B",
  "provisionalPlan": "STARTER",
  "jurisdiction": "IN",
  "publication_posture_target": "B2B_PUBLIC"
}
```

---

## §8 — Prohibited Request Fields

The following fields are **explicitly prohibited** from the WEBHOOK-007 request payload. If received:

- **Silent-ignore strategy:** The implementation unit must validate the request body with `additionalProperties: false` in the Zod schema (or equivalent strict validator). Any extra field causes a 400 validation error.
- Under no circumstances should any prohibited field be stored in the organization record, audit entry, or public projection.

| Prohibited Field | Reason |
| --- | --- |
| `phone` / `supplier_phone_comparable` | Contact data — forbidden per public projection safety |
| `email` / `contact_email` / `contact_phone` | Contact data — forbidden per public projection safety |
| `field_agent_uid_raw` / `field_agent_id` | Internal CRM/CAE ID — not a platform orchestration ref |
| `acquisition_submission_id` | CAE submission ID — not the canonical ORF key |
| `referral_id` / `referral_code` | Referral system ID — not the canonical ORF key |
| `cae_draft_id` / `cae_draft_payload` (raw) | CAE-internal draft — prohibited per EVENTS-003 guardrails |
| `photo_attachment_urls` | Contact/identity data — forbidden per public projection safety |
| `commission_data` / `commission_rate` | Finance/commission data — never in provisioning payload |
| `payment_data` / `payment_terms` | Finance/payment data — forbidden |
| `private_crm_notes` / `internal_notes` | Internal CRM content — forbidden |
| `buyer_data` | Buyer identity — forbidden |
| `order_state` / `trade_state` / `negotiation_state` | TTP/order/trade fields — forbidden |
| `ttp_enabled` / `escrow_account_id` | TTP/payment/checkout fields — forbidden |

---

## §9 — Idempotency Decision

### 9.1 Canonical Idempotency Key

**DECIDED: `organizations.external_orchestration_ref`**

This is the binding ORF-AUTHORITY-006 decision. No other field may serve as the idempotency key.

The following are **NOT idempotency keys** for WEBHOOK-007:

| Field | Why it cannot be the idempotency key |
| --- | --- |
| `acquisition_submission_id` | CAE-internal, not a platform orchestration ref (ORF-AUTHORITY-006 §4.2) |
| `cae_draft_id` | CAE-internal, not canonical |
| `referral_id` | Referral system ID, different semantic |
| `field_agent_uid_raw` | Prohibited field — personal identifier |
| `crmSupplierId` | CRM-internal reference, not the orchestration anchor |
| `eventId` | CRM-side deduplication for CRM's own retry logic; not a platform idempotency key |

### 9.2 Idempotent Replay Behavior

| Scenario | Behavior |
| --- | --- |
| Same `external_orchestration_ref`, compatible `supplierName` and `publication_posture_target` | **Idempotent replay** → return 200 with `"status": "already_exists"`, existing `slug` and `publicUrl` |
| Same `external_orchestration_ref`, different `supplierName` (material conflict) | **Conflict** → return 409 |
| Same `external_orchestration_ref`, same payload, supplier previously gate-failed | **Non-idempotent re-try** → re-evaluate gates; return appropriate status (201 if now passes, 202 if still gate-failed) |
| New `external_orchestration_ref` | **Newly provisioned** → return 201 |

### 9.3 Platform-Owned Slug

The platform (not CRM) generates and owns the `slug`. CRM never specifies the slug. The slug is derived from `supplierName` with platform-side collision resolution. The slug is returned in the 201 and 200 responses and forms part of the `publicUrl`.

### 9.4 `external_orchestration_ref` Public Visibility

`external_orchestration_ref` must **never** appear in:
- Public API responses (`GET /api/public/supplier/:slug`)
- The public supplier profile projection output
- Any event payload sent to public consumers
- Logs (other than internal/audit-scoped logs)

---

## §10 — Response Contract

### 10.1 Case A — Newly Provisioned

**HTTP 201 Created**

```json
{
  "accepted": true,
  "idempotent": false,
  "status": "provisioned",
  "slug": "<platform-owned slug>",
  "publicUrl": "https://www.texqtic.com/supplier/<slug>",
  "platformRequestId": "<uuid>",
  "reasonCode": null
}
```

### 10.2 Case B — Already Provisioned (Idempotent Replay)

**HTTP 200 OK**

```json
{
  "accepted": true,
  "idempotent": true,
  "status": "already_exists",
  "slug": "<platform-owned slug>",
  "publicUrl": "https://www.texqtic.com/supplier/<slug>",
  "platformRequestId": "<uuid>",
  "reasonCode": null
}
```

### 10.3 Case C — Gate Failed (Accepted but Not Published)

**DECIDED: HTTP 202 Accepted**

Rationale: 202 semantically means "the request has been accepted for processing, but the processing has not been completed." A gate-failed outcome means the request was validly received and recorded, but one or more public projection gates prevented publication. The request was not rejected (400) and not fully completed (201). 202 correctly expresses "we have your request and it is recorded, but it did not result in publication."

```json
{
  "accepted": true,
  "idempotent": false,
  "status": "gate_failed",
  "slug": null,
  "publicUrl": null,
  "platformRequestId": "<uuid>",
  "reasonCode": "<safe_reason_code>"
}
```

Where `reasonCode` is a safe, human-readable, non-PII code such as:
- `"MISSING_REQUIRED_PROJECTION_FIELDS"` — insufficient data to pass public projection gates
- `"PUBLICATION_POSTURE_INELIGIBLE"` — supplier does not meet public eligibility criteria
- `"DUPLICATE_SLUG_UNRESOLVABLE"` — platform cannot generate a unique slug for this supplier
- `"INTERNAL_GATE_ERROR"` — unexpected internal error during gate evaluation (distinct from 5xx)

### 10.4 Case D — Validation Error

**HTTP 400 Bad Request**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "<description of first validation failure>"
  }
}
```

### 10.5 Case E — Unauthorized (HMAC Failure)

**HTTP 401 Unauthorized**

No body. No detail. Consistent with existing repo pattern in `resolverHmac.ts`.

### 10.6 Case F — Conflict

**HTTP 409 Conflict**

```json
{
  "success": false,
  "error": {
    "code": "ORCHESTRATION_REF_CONFLICT",
    "message": "A supplier with this external_orchestration_ref already exists with incompatible identity data."
  }
}
```

### 10.7 Case G — Server Error

**HTTP 500 Internal Server Error**

```json
{
  "success": false,
  "error": {
    "code": "PROVISIONING_ERROR",
    "message": "An unexpected error occurred during provisioning. Please retry."
  }
}
```

---

## §11 — Retry and Failure Guidance for CRM

### 11.1 CRM Should Retry (with exponential backoff + jitter)

| Response | Retry behavior |
| --- | --- |
| Network timeout / connection error | Retry |
| `5xx` (500, 502, 503, 504) | Retry with backoff |
| `429 Too Many Requests` | Retry after the `Retry-After` duration (if ever returned) |

### 11.2 CRM Must NOT Blindly Retry

| Response | Required behavior |
| --- | --- |
| `400 Bad Request` | Surface validation error; fix payload before retrying |
| `401 Unauthorized` | Alert operations team; do not retry until secret is verified |
| `409 Conflict` | Record conflict; surface for manual review; do not auto-retry |

### 11.3 CRM Should Record and Surface (Not Silently Drop)

| Response | Required behavior |
| --- | --- |
| `202 gate_failed` | Record the `platformRequestId` and `reasonCode`; surface to ops/review queue |
| `400` validation errors | Record full error detail for ops review |
| `409` conflicts | Record for manual identity reconciliation |

### 11.4 CRM Should NOT Treat `202 gate_failed` as a Success

A `202 gate_failed` response means the supplier was NOT published to the Main Platform public profile surface. CRM must record this as a partial outcome, not a success. A supplier receiving `202 gate_failed` does not have a live `publicUrl` and cannot be directed to the public profile.

---

## §12 — Event Emission Expectations

The WEBHOOK-007 implementation must emit the following events. All emission follows the existing `writeAuditLog` → `maybeEmitEventFromAuditEntry` → `AUDIT_ACTION_TO_EVENT_NAME` lookup → `emitEventToSink` + `storeEventBestEffort` pattern established in the codebase.

### 12.1 `public_supplier_profile.provision_requested.v1`

**Trigger:** Valid provisioning request received (HMAC verified, body validated) — before gate evaluation.  
**Payload (allowed):** `external_orchestration_ref` (internal/audit-scoped only), `org_type`, segment/category metadata (optional), `timestamp`  
**Prohibited in payload:** Public consumer fields, contact data, commission data, payment data, CAE draft payload, buyer data

### 12.2 `public_supplier_profile.provisioned.v1`

**Trigger:** Supplier profile successfully provisioned or confirmed idempotent (201 or 200 response).  
**Payload (allowed):** `slug`, `external_orchestration_ref` (internal/audit-scoped only), `publication_posture`, `timestamp`  
**Prohibited in payload:** Contact data, price, registration number, risk score, plan, payment or commission data, public leakage of internal IDs

### 12.3 `public_supplier_profile.gate_failed.v1`

**Trigger:** Request accepted but provisioning cannot publish due to public projection/gate failure (202 response).  
**Payload (allowed):** `external_orchestration_ref` (internal/audit-scoped only), `failed_gate`, `reason_code`, `timestamp`  
**Prohibited in payload:** Raw CRM payload, private notes, contact data, field-agent IDs, payment or commission data

### 12.4 Internal/Audit Scoping Rule

`external_orchestration_ref` may appear in audit-log entries and internal/audit-scoped event payloads only. It must **never** reach public API responses, public consumer event payloads, or log lines visible outside the audit backbone.

---

## §13 — Public Projection Safety

WEBHOOK-007 provisions an organization/profile for public exposure. The following safety constraints are non-negotiable:

| Safety Rule | Constraint |
| --- | --- |
| No contact data in public profile | `contact_email`, `contact_phone`, personal phone numbers, personal email addresses must never be written to the public organization record |
| No `external_orchestration_ref` in public profile | `organizations.external_orchestration_ref` must never appear in `GET /api/public/supplier/:slug` response |
| No CRM IDs in public profile | `crmSupplierId`, CRM internal references — never in public projection output |
| No CAE IDs in public profile | `cae_draft_id`, `acquisition_submission_id`, `field_agent_uid_raw` — never in public projection output |
| No payment/commission/order/trade/TTP fields | No payment terms, commission rates, escrow fields, trade state, TTP lifecycle state |
| Five-gate projection compliance | The provisioned organization must satisfy the existing `getPublicB2BSupplierBySlug` five-gate filters: active organization, B2B_PUBLIC publication posture, non-null taxonomy, valid slug, non-empty legal name |

---

## §14 — OpenAPI Same-Wave Implementation Requirement

### 14.1 Obligation

Per `shared/contracts/ARCHITECTURE-GOVERNANCE.md` (OpenAPI Contract Governance):

> "When a frontend-backend contract gap fix modifies request/response shape or newly exposes an endpoint, the corresponding `openapi.tenant.json` or `openapi.control-plane.json` must be updated in the same implementation wave — not as deferred cleanup."

WEBHOOK-007 introduces a new endpoint. The implementation unit must update the correct OpenAPI contract in the same commit wave.

### 14.2 Recommended Contract Document

**DECIDED: `shared/contracts/openapi.control-plane.json`**

Rationale:
- `openapi.tenant.json` is the **tenant-user-facing** API (browser clients, authenticated tenant users). WEBHOOK-007 is not tenant-user-facing.
- `openapi.control-plane.json` is the **admin/control-plane** contract and is the natural home for machine-to-machine internal endpoints.
- However, `openapi.control-plane.json` currently describes "Admin-facing control plane API" with `adminJwt` as the sole security scheme. The implementation unit must either:
  - Add a new `hmacInternal` security scheme to `openapi.control-plane.json` alongside the existing `adminJwt` scheme, or
  - Create a new `openapi.internal.json` document for strictly machine-to-machine HMAC-authenticated endpoints.
- **The implementation unit must make this specific sub-decision at implementation time.** It must document which file was chosen and why. Either choice is acceptable so long as the endpoint appears in exactly one OpenAPI contract and the same-wave obligation is met.

### 14.3 What This Decision Artifact Does NOT Do

This decision artifact does **not** modify `openapi.control-plane.json`, `openapi.tenant.json`, or any other OpenAPI contract. The OpenAPI update is deferred to the WEBHOOK-007 implementation unit.

---

## §15 — Implementation Readiness Verdict

### 15.1 WEBHOOK-007 Remains Blocked Until:

1. ✅ **ORF-AUTHORITY-006** — COMPLETE (DECIDED 2026-05-15)
2. ✅ **EVENTS-003** — COMPLETE (registered; confirmed in `shared/contracts/event-names.md` and `server/src/lib/events.ts`)
3. ✅ **This decision artifact** (DECIDED by this unit)
4. ❌ **Paresh explicit implementation authorization** — required for runtime implementation
5. ❌ **TTP legal gate** — `HOLD_FOR_COUNSEL_FEEDBACK` active; no implementation unit may open until counsel feedback recorded and Paresh authorizes

### 15.2 After This Decision

After this decision artifact is complete:

- Non-code blockers for WEBHOOK-007 are **resolved**.
- WEBHOOK-007 **may open for implementation** only upon Paresh's explicit written authorization.
- The implementation prompt must include zero-TTP-intersection verification before any code is written.
- CRM-ACQ-10 remains blocked until WEBHOOK-007 is implemented, deployed, and auth/callback details are communicated to the CRM team.

### 15.3 Zero-TTP-Intersection Requirement

Before WEBHOOK-007 implementation opens, the prompt must verify:

- WEBHOOK-007 does not touch payment terms, escrow, settlement, commission, lending, money movement, or any TTP-family field.
- The provisioned organization record does not include any TTP lifecycle state.
- The provisioned public profile does not imply any financial transaction capability.
- `ttp_enabled` remains `false` and is not referenced by WEBHOOK-007 logic.

---

## §16 — Impact on Trackers

### 16.1 Tracker Status Update Guidance

The following tracker records are impacted by this decision:

| Tracker | Unit | Previous Status | Status After This Decision |
| --- | --- | --- | --- |
| `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | WEBHOOK-007 Wave 5 gate condition | BLOCKED (ORF + auth model undefined + callback URL undefined + response contract undefined) | Auth/callback/response contract blockers **resolved** — pending Paresh implementation authorization only |
| `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | GAP-ACQ-001 | OPEN (resolved by ORF-AUTHORITY-006) | Already RESOLVED in tracker |
| `MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | GAP-ACQ-007 | OPEN (resolved by ORF-AUTHORITY-006 + jurisdiction addendum) | Already RESOLVED in tracker |

A tracker docs-sync unit may update these records if needed in a later docs pass. This decision artifact does not modify the tracker files.

### 16.2 ORF and Jurisdiction Blockers

Confirmed resolved (not re-opened by this unit):
- GAP-ACQ-001: `organizations.external_orchestration_ref` is the canonical idempotency key (ORF-AUTHORITY-006)
- GAP-ACQ-007: `organizations.jurisdiction` defaults to `'IN'` for acquisition-sourced suppliers where CRM omits field (ORF-AUTHORITY-006 + jurisdiction semantics addendum)

---

## §17 — Summary of All Decisions

| Decision Point | Decision |
| --- | --- |
| Endpoint path | `POST /api/internal/acquisition/provision-supplier` |
| Auth model | HMAC-SHA256 with timestamp and replay window |
| HMAC header | `x-texqtic-provisioning-hmac` (hex digest) |
| Timestamp header | `x-texqtic-provisioning-ts` (Unix ms) |
| Main Platform env var | `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` (≥ 32 chars) |
| CRM env var | `MAIN_PLATFORM_PROVISIONING_WEBHOOK_SECRET` |
| CRM callback URL env var | `MAIN_PLATFORM_PROVISION_CALLBACK_URL` |
| Replay window | 60,000 ms |
| Unauthorized response | 401, no body detail |
| Idempotency key | `organizations.external_orchestration_ref` (ORF-AUTHORITY-006) |
| Idempotent replay response | 200 `"status": "already_exists"` |
| New provision response | 201 `"status": "provisioned"` |
| Gate-failed response | **202** `"status": "gate_failed"` |
| Conflict response | 409 `"code": "ORCHESTRATION_REF_CONFLICT"` |
| Validation error response | 400 |
| Server error response | 500 |
| Slug ownership | Platform-owned; not CRM-specified |
| `external_orchestration_ref` in public API | NEVER |
| Jurisdiction default (CRM omits field) | `'IN'` |
| OpenAPI contract | `openapi.control-plane.json` (preferred) or new `openapi.internal.json` — implementation unit decides |
| CRM-ACQ-10 unblock condition | WEBHOOK-007 implemented + deployed + auth/callback communicated |

---

## §18 — Governing Invariants (Non-Negotiable — Implementation Must Not Violate)

1. `external_orchestration_ref` is NEVER returned in public APIs.
2. Contact data (phone, email) is NEVER written to the organization public record.
3. `ttp_enabled` remains `false` — WEBHOOK-007 must not reference TTP state.
4. `org_id` is the canonical tenancy boundary — all provisioned organization data is properly scoped.
5. RLS policies are not weakened by provisioning logic.
6. No cross-tenant data exposure from provisioning logic.
7. No platform-held funds, escrow, payment execution, or money movement implied or implemented.
8. CAE does not call WEBHOOK-007 directly — CRM is the sole caller.
9. CRM does not write directly to Main Platform database tables — only through WEBHOOK-007.
10. Slug is platform-generated — CRM never specifies the slug.
11. `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` ≠ `TEXQTIC_RESOLVER_SECRET` — distinct secrets, distinct trust boundaries.

---

*Prepared by: Copilot (TexQtic governance unit MAIN-PLATFORM-WEBHOOK-007-AUTH-CONTRACT-DECISION-001)*  
*Authorized by: Paresh (explicit prompt authorization)*  
*Date: 2026-05-15*  
*Status: DECIDED — Docs/governance only*
