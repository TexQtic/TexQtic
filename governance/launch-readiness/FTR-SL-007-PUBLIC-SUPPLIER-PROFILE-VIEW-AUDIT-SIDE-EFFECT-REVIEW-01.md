# FTR-SL-007 Public Supplier Profile View Audit Side-Effect Review

**Unit:** `FTR-SL-007-PUBLIC-SUPPLIER-PROFILE-VIEW-AUDIT-SIDE-EFFECT-REVIEW-01`  
**Date:** 2026-06-11  
**Status:** REVIEW_COMPLETE_ACCEPTED_WITH_VERIFICATION_GUARDRAILS  
**Final enum:** `FTR_SL_007_PUBLIC_SUPPLIER_PROFILE_VIEW_AUDIT_SIDE_EFFECT_REVIEW_COMPLETE_ACCEPTED_WITH_VERIFICATION_GUARDRAILS`

---

## 1. Scope And Final Posture

This bounded repo-truth audit/design review answers whether successful public supplier profile GET audit/event emission is expected, safe, scalable, privacy-appropriate, and compatible with launch verification.

Final posture:

- The behavior is expected and contract-registered.
- It is privacy-appropriate for current launch scope because the public event payload is slug/source/timestamp only and explicitly excludes org UUID, buyer identity, contact data, raw IP, and private supplier data.
- It is launch-compatible only with verification guardrails: production `GET /api/public/supplier/:slug` must be treated as a write-producing analytics/audit action, not as a no-mutation smoke check.
- No product behavior change is authorized or needed in this unit.
- No source, schema, database, environment, supplier data, inquiry, email, CRM, CAE, Zoho, payment, legal, deployment, or production browser action was performed.

---

## 2. Mandatory Preflight

Preflight before FTR-SL-007 docs edits:

```text
git diff --name-only
[no output]

git status --short
[no output]
```

Known resume baseline from FTR-SL-007 inspection:

```text
branch=main
HEAD=2474d8d828abc45148b42a942f31dd2236a8c1d9
origin/main=2474d8d828abc45148b42a942f31dd2236a8c1d9
working tree clean
```

---

## 3. Files Inspected

Governance and contracts:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-006-AGGREGATOR-DIRECTORY-READINESS-AUDIT-01.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`
- `shared/contracts/event-names.md`
- `shared/contracts/openapi.tenant.json`

Public profile and event path:

- `services/publicB2BService.ts`
- `components/Public/PublicSupplierProfile.tsx`
- `server/src/routes/public.ts`
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/lib/auditLog.ts`
- `server/src/lib/events.ts`
- `server/src/events/eventSchemas.ts`
- `server/src/events/aiEmitter.ts`
- `server/src/events/projections/index.ts`
- `server/src/events/projections/projector.ts`
- `server/src/events/handlers/index.ts`
- `server/src/events/handlers/marketplace.projector.ts`
- `server/prisma/schema.prisma`
- `server/src/__tests__/public-b2b-projection.unit.test.ts`
- `server/src/__tests__/public-b2b-supplier-profile.unit.test.ts`

---

## 4. Exact Route Behavior

`GET /api/public/supplier/:slug` in `server/src/routes/public.ts`:

1. Validates route params with `supplierSlugParamsSchema`.
2. Normalizes optional `?source=` to one of the allowed source-channel values.
3. Calls `getPublicB2BSupplierBySlug(slug, prisma)`.
4. Returns safe 404 if no eligible profile is found.
5. On success, starts a fire-and-forget Prisma transaction that calls `writeAuditLog()` with:
   - `realm: 'TENANT'`
   - `tenantId: result.orgId`
   - `actorType: 'SYSTEM'`
   - `actorId: null`
   - `action: 'public.supplier.profile.viewed'`
   - `entity: 'organization'`
   - `entityId: result.orgId`
   - `afterJson: { slug, source_channel, timestamp }`
6. Catches and logs any transaction failure as non-blocking.
7. Returns `sendSuccess(reply, result.profile)`.

Frontend consequence: `components/Public/PublicSupplierProfile.tsx` calls `getPublicSupplierBySlug(slug, source)` when the public profile view renders. Therefore opening `/supplier/:slug` in a production browser can trigger the backend profile GET and the audit/event side effect.

---

## 5. Exact Audit/Event Write Path

`writeAuditLog()` in `server/src/lib/auditLog.ts` writes an `audit_logs` row, then calls `maybeEmitEventFromAuditEntry(tx, createdAuditLog)`. Both the audit insert and event work are wrapped in a catch block that logs and does not throw.

`maybeEmitEventFromAuditEntry()` in `server/src/lib/events.ts` maps `public.supplier.profile.viewed` to `supplier_profile.viewed.v1`. It builds a deterministic event envelope using the audit log ID as the event ID, validates the event, checks the payload for secret-key names, emits to the console sink, and calls `storeEventBestEffort()`.

`storeEventBestEffort()` inserts an `event_logs` row linked to `audit_log_id`. It catches and logs errors without throwing. Duplicate event IDs are explicitly swallowed. After a successful event-log insert, projection scheduling runs best-effort.

Projection review: only marketplace cart projection handlers are currently registered. No handler is registered for `supplier_profile.viewed.v1`, so profile-view projection scheduling is currently a no-op after event storage.

DB model review:

- `AuditLog` stores realm, tenantId, actorId, actorType, action, entity, entityId, beforeJson, afterJson, metadataJson, and createdAt.
- `EventLog` stores id, version, name, occurredAt, tenantId, realm, actorType, actorId, entityType, entityId, payloadJson, metadataJson, auditLogId, and createdAt.
- `EventLog.auditLogId` is unique and links the event row back to the audit log row.

---

## 6. Data Fields And Privacy Review

Public HTTP response remains public-safe. `getPublicB2BSupplierBySlug()` returns `profile` plus internal-only `orgId`; the route returns only `result.profile` to callers. Projection tests confirm prohibited internal/private fields are excluded from public profile output.

Event payload privacy posture:

- Included: `slug`, `source_channel`, `timestamp`.
- Not included in payload: org UUID, buyer identity, email, phone, contact data, raw IP, session ID, auth token, external orchestration reference, pricing, trade state, or private supplier data.
- Internal envelope/audit/entity fields do include the supplier org UUID through `tenantId` and `entityId`; that is internal audit/event metadata, not public response or public event payload.

Contract alignment:

- `shared/contracts/event-names.md` registers `supplier_profile.viewed.v1` with allowed payload `slug`, `source_channel`, optional `viewer_geo_band`, `timestamp` and prohibits org UUID, buyer identity, contact data, and raw IP.
- `shared/contracts/openapi.tenant.json` documents successful public supplier profile 200 responses as emitting `supplier_profile.viewed.v1` best-effort/non-blocking.

Privacy finding: acceptable for launch analytics/audit under current contracts, provided future consumers continue to treat `tenantId` and `entityId` as internal metadata and do not export them into public/acquisition analytics payloads.

---

## 7. Traffic, Cost, And Volume Risk Review

Current behavior creates up to two DB rows per successful public profile view: one `audit_logs` row and one `event_logs` row. It also emits a console event line and schedules best-effort projections that currently no-op for this event.

Launch-scale risk is acceptable for invite-only/internal soft launch and small pilot traffic. It is not proven for broad public promotion, crawler traffic, press spikes, bot traffic, or sitemap/indexing exposure.

Risk classification:

- Small pilot traffic: acceptable.
- Broad buyer outreach before legal/profile completeness gates: not ready, but blocked by FTR-SL-006 and legal/profile gates independent of this unit.
- Public SEO/indexing promotion of supplier profiles: requires a later volume posture decision.
- Abuse/bot traffic: future follow-up should consider rate limiting, sampling, deduplication, or an analytics-specific queue if profile traffic grows.

No implementation follow-up is required before the current soft-launch verification posture, but broad-promotion readiness should not be claimed from this review alone.

---

## 8. Verification-Safety Impact

Successful production profile GET is not a no-mutation operation. It is a legitimate read response plus best-effort audit/event persistence.

Guardrail now established:

- Do not use production `GET /api/public/supplier/:slug` as default verification evidence in no-mutation prompts.
- Do not open production `/supplier/:slug` in a browser merely to visually verify FTR-SL-005 labeling unless Paresh explicitly accepts one profile-view audit/event write.
- Prefer local frontend tests, static UI/component inspection, existing already-run production evidence, directory GET evidence, or non-production/local profile rendering for no-mutation verification.
- If a production profile GET is needed later, the prompt must explicitly authorize the audit/event side effect and record the expected write.

FTR-SL-005 status remains `IMPLEMENTED_PENDING_SAFE_PRODUCTION_VISUAL_VERIFICATION`. This review does not close FTR-SL-005 visually in production because the safe no-mutation verification path remains local/static unless Paresh authorizes a production profile view.

---

## 9. Product And Analytics Interpretation

The event is useful as acquisition/source-channel analytics, not as proof of buyer qualification or commercial intent.

Interpretation guardrails:

- A profile view is a view event only.
- It must not be treated as a lead, inquiry, supplier acceptance, commercial readiness signal, or buyer identity signal.
- `source_channel` is event-level attribution only; it is not account-level source-of-truth and is not stored on org/user records by this path.
- Demo/pilot supplier views for `lt-b2b-001` must remain non-commercial and should not be reclassified as genuine buyer interest.

---

## 10. Options Considered

| Option | Decision | Rationale |
|---|---|---|
| Keep behavior as-is and document verification guardrails | SELECTED | Contract-registered, expected, privacy-bounded, and already best-effort/non-blocking. |
| Keep behavior but throttle/deduplicate/sample | DEFERRED | Sensible before broad indexed traffic, but not required for current pilot-scale launch posture. |
| Make async/best-effort | ALREADY TRUE | Route uses fire-and-forget transaction; audit/event code catches and does not throw. |
| Remove/disable for unauthenticated views | NOT RECOMMENDED NOW | Would break current acquisition analytics/source-channel design without a stronger privacy or cost finding. |
| Add a safe verification endpoint/test-only pattern | DEFERRED | Useful if production profile visual verification remains frequent; not needed for this docs-only review. |
| Close FTR-SL-005 via production browser check | NOT AUTHORIZED | Would cause a profile-view audit/event write; no explicit production write authorization in this unit. |

---

## 11. Recommendation

Keep public supplier profile view audit/event emission enabled for launch under guardrails.

Recommended guardrails:

- Treat the behavior as accepted product analytics/audit, not a defect.
- Treat successful production profile GET as write-producing for governance verification.
- Use local/static/frontend verification for FTR-SL-005 unless Paresh explicitly authorizes a production profile GET and accepts the audit/event row.
- Before broad public promotion or supplier-profile SEO indexing, open a follow-up to review traffic controls, bot/crawler posture, retention, observability, and analytics export boundaries.

---

## 12. Paresh Decision Needed

No immediate product behavior decision is required for current launch verification posture.

Future decision required before broad promotion or SEO-indexed supplier-profile traffic:

- Accept raw per-view audit/event volume as-is; or
- authorize throttling, sampling, deduplication, or a separate analytics queue; and
- define whether production visual verification of `/supplier/:slug` may intentionally create one audit/event write when needed.

---

## 13. Tracker Updates

`FUTURE-TODO-REGISTER.md` should update FTR-SL-007 from `REGISTERED_FOLLOW_UP` to `REVIEW_COMPLETE_ACCEPTED_WITH_VERIFICATION_GUARDRAILS`.

No `NEXT-ACTION.md` or `OPEN-SET.md` pointer change is required. This unit does not change the active delivery candidate, legal gate posture, P0 gate queue, FAM-09 family status, or FTR-SL-005 implementation status.

---

## 14. Adjacent Findings And Disposition

| Finding | Disposition |
|---|---|
| Profile-view audit/event writes make production profile GET unsuitable for no-mutation verification | Closed by this review with verification guardrails. |
| No registered projection handler for `supplier_profile.viewed.v1` | Accepted for current launch scope; event storage and console sink still exist. Future analytics projection can be a separate unit if needed. |
| No volume controls specific to profile views found in repo truth | Deferred before broad promotion/indexed traffic; not a current soft-launch blocker. |
| FTR-SL-005 production visual verification remains pending | Preserved; do not close via production browser profile GET without explicit write acceptance. |

---

## 15. Validation Plan

Validation for this docs-only unit is non-mutating and local/static only:

- Confirm changed files are only the FTR-SL-007 artifact and `FUTURE-TODO-REGISTER.md`.
- Run `git diff --check`.
- Run static grep evidence for `public.supplier.profile.viewed`, `supplier_profile.viewed.v1`, `writeAuditLog`, and `maybeEmitEventFromAuditEntry`.
- Confirm final staged set before commit.

No production profile GET, no production browser `/supplier/:slug`, no SQL, no Prisma, no DB mutation, no server start, no deployment, no package command, and no test data mutation should be performed for this unit.

---

## 16. Final Enum

`FTR_SL_007_PUBLIC_SUPPLIER_PROFILE_VIEW_AUDIT_SIDE_EFFECT_REVIEW_COMPLETE_ACCEPTED_WITH_VERIFICATION_GUARDRAILS`