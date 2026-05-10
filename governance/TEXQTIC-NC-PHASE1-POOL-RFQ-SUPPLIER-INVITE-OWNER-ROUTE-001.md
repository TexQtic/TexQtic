# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001 |
| **Type** | OWNER_ROUTE_IMPLEMENTED |
| **Status** | OWNER_ROUTE_IMPLEMENTED |
| **Date** | 2026-05-31 |
| **Predecessor** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001 (commit: `3a0e285`) |
| **Basis commit** | `3a0e285` (feat(network-commerce): add supplier invite supplier service) |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |

---

## §2 — Authority Sources Read

The following sources were read before any implementation was written:

| Source | Purpose |
|---|---|
| `server/src/services/networkPoolRfq.service.ts` | Confirmed exact service method signatures for `sendInvite`, `listInvites`, `getInvite`, `cancelInvite`; `SendInviteInput` interface; all 8 error classes for mapping |
| `server/src/routes/tenant/poolRfq.ts` (before modifications) | Confirmed existing route style: `handleBodyValidation`, `mapNetworkPoolRfqServiceError`, `sendSuccess`, `sendError`, `sendValidationError`; `poolParamSchema` / `issueRfqBodySchema` reference; `.strict()` pattern |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | Confirmed auth mock pattern (`vi.mock('../../middleware/auth.js', ...)`), test headers (`x-test-auth`, `x-test-org-id`, `x-test-user-id`, `x-test-user-role`), `buildApp()` shape, DB harness (`withBypassForSeed`, `seedTenantForTest`, `hasDb`, `describe.skipIf`) |
| `server/src/__tests__/helpers/dbGate.js` | Confirmed `hasDb` export |
| `server/src/__tests__/helpers/seedRls.js` | Confirmed `seedTenantForTest(orgId, label)` signature |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001.md` | Owner service reference; `NetworkPoolRfqSupplierInviteRecord` DTO fields |

---

## §3 — Pre-Work Verification

```
git log --oneline -n 1   →  3a0e285 feat(network-commerce): add supplier invite supplier service
git status --short       →  (clean working tree — no uncommitted files)
```

Predecessor commit `3a0e285` confirmed as HEAD. Working tree clean before any changes.

---

## §4 — Locked OD Decisions — Route Implementation Mapping

### OD-1: No Re-Invite (LOCKED)

`sendInvite` service call throws `NetworkPoolRfqSupplierInviteAlreadySentError` when a PENDING/ACCEPTED invite for the same `(rfqId, supplierOrgId)` pair already exists.

**How implemented at route layer:** `mapSupplierInviteServiceError` catches `NetworkPoolRfqSupplierInviteAlreadySentError` → returns `409 SUPPLIER_INVITE_ALREADY_SENT`. The route itself has no re-invite logic; defers entirely to service.

### OD-2: Lazy EXPIRED (LOCKED)

The `NetworkPoolRfqSupplierInviteRecord` DTO returned from all four owner service methods already applies `computeEffectiveInviteStatus`. Routes pass the service response directly to `sendSuccess` — no status mutation at the route layer.

**OD-5 overlap:** Response is owner DTO (18 fields) with `metadataInternalJson` excluded at service layer. Routes add no fields; no DTO remapping at route layer.

### OD-3: expiresAt Set by Owner (LOCKED)

`POST /:poolId/rfq/:rfqId/invites` body accepts `expires_at` as optional ISO datetime. If absent, service inherits `rfq.responseDeadlineAt`. Route layer does not default this value — passes `bodyResult.data.expires_at` (may be `undefined`) directly to `sendInvite`.

### OD-4: Supplier Org Validation (LOCKED — service concern, N/A at route layer)

`supplier_org_id` is validated as a UUID by `sendInviteBodySchema`. ACTIVE state check is service-owned; route layer does not re-validate supplier org status.

**How implemented:** `sendInviteBodySchema` enforces `z.string().uuid()` for `supplier_org_id`. Route passes through to service; service throws `NetworkPoolRfqSupplierInviteInvalidInputError` for inactive org → `mapSupplierInviteServiceError` returns `400 INVALID_INPUT`.

### OD-5: No metadataInternalJson in Response (LOCKED)

Exclusion enforced at service layer in `toInviteOwnerRecord`. Routes return `sendSuccess(reply, record, ...)` directly — no additional field stripping or filtering at route layer.

### OD-6: Three-Gate Feature Chain (LOCKED)

All four owner invite routes share a single pre-handler array:

```typescript
const ownerInvitePreHandler = [
  ncPoolFeatureGateMiddleware,
  ncPoolRfqFeatureGateMiddleware,
  ncPoolSupplierInviteFeatureGateMiddleware,
];
```

If any gate returns 503 FEATURE_DISABLED the request short-circuits before the route handler executes.

### OD-7: StateMachineService.transition Never Called (LOCKED)

No route handler calls `StateMachineService.transition()` for invite lifecycle events. Lifecycle logging is handled inside the service's `cancelInvite` via `writeInviteLifecycleLog`. Routes instantiate `StateMachineService` only as a constructor argument to `NetworkPoolRfqService` (required by the service's existing constructor signature) — transition is not invoked.

---

## §5 — Schemas Added

### Param Schemas

```typescript
const rfqParamSchema = z.object({
  poolId: uuidSchema,
  rfqId:  uuidSchema,
});

const inviteParamSchema = z.object({
  poolId:   uuidSchema,
  rfqId:    uuidSchema,
  inviteId: uuidSchema,
});
```

### `sendInviteBodySchema` (strict)

| Field | Type | Rule |
|---|---|---|
| `supplier_org_id` | string | Required; must be UUID |
| `expires_at` | string \| null | Optional; ISO datetime with offset; nullable |
| `supplier_message` | string \| null | Optional; max 2000 chars; nullable |
| `org_id` | z.never | Forbidden — rejected as validation error |
| `owner_org_id` | z.never | Forbidden |
| `pool_id` | z.never | Forbidden |
| `rfq_id` | z.never | Forbidden |
| `user_id` | z.never | Forbidden |
| `invited_by_user_id` | z.never | Forbidden |
| `invite_ref` | z.never | Forbidden |
| `status` | z.never | Forbidden |
| `accepted_at` | z.never | Forbidden |
| `declined_at` | z.never | Forbidden |
| `cancelled_at` | z.never | Forbidden |
| `metadata_internal_json` | z.never | Forbidden |
| `lifecycle_state_id` | z.never | Forbidden |
| Unknown fields | `.strict()` | Rejected as validation error |

### `cancelInviteBodySchema` (strict)

| Field | Type | Rule |
|---|---|---|
| `cancel_reason` | string \| null | Optional; max 2000 chars; nullable |
| `status` | z.never | Forbidden |
| `cancelled_at` | z.never | Forbidden |
| `metadata_internal_json` | z.never | Forbidden |
| `org_id` | z.never | Forbidden |
| `owner_org_id` | z.never | Forbidden |
| `supplier_org_id` | z.never | Forbidden |
| `user_id` | z.never | Forbidden |
| Unknown fields | `.strict()` | Rejected as validation error |

Empty body `{}` is valid for `cancelInviteBodySchema`.

---

## §6 — Error Mapper Added

`mapSupplierInviteServiceError(reply, err)` — returns `true` if error matched and response sent, `false` otherwise. Called in all four route `catch` blocks before the `INTERNAL_ERROR` fallback.

| Error Class | HTTP Status | Error Code |
|---|---|---|
| `NetworkPoolRfqSupplierInviteInvalidInputError` | 400 | `INVALID_INPUT` |
| `NetworkPoolRfqPoolNotFoundError` | 404 | `POOL_NOT_FOUND` |
| `NetworkPoolRfqRfqNotFoundError` | 404 | `RFQ_NOT_FOUND` |
| `NetworkPoolRfqSupplierInviteNotFoundError` | 404 | `SUPPLIER_INVITE_NOT_FOUND` |
| `NetworkPoolRfqInvalidPoolStateError` | 422 | `INVALID_STATE` |
| `NetworkPoolRfqSupplierInviteAlreadySentError` | 409 | `SUPPLIER_INVITE_ALREADY_SENT` |
| `NetworkPoolRfqSupplierInviteInvalidTransitionError` | 422 | `INVALID_TRANSITION` |
| `NetworkPoolRfqConflictError` | 409 | `SUPPLIER_INVITE_CONFLICT` |

---

## §7 — Routes Registered

All four routes live in the existing `poolRfqRoutes` Fastify plugin (`server/src/routes/tenant/poolRfq.ts`). The plugin is already registered in `server/src/routes/tenant.ts` at `/tenant/network-commerce/pools`. **`tenant.ts` was not modified.**

| Method | Path (relative to plugin prefix) | Response on success | Handler function |
|---|---|---|---|
| `POST` | `/:poolId/rfq/:rfqId/invites` | `201` | sendInvite |
| `GET` | `/:poolId/rfq/:rfqId/invites` | `200` (array) | listInvites |
| `GET` | `/:poolId/rfq/:rfqId/invites/:inviteId` | `200` | getInvite |
| `POST` | `/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | `200` | cancelInvite |

Full resolved paths (from Fastify app root):
- `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites`
- `GET  /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites`
- `GET  /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites/:inviteId`
- `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel`

### Common route structure (all four routes)

```typescript
onRequest:  [tenantAuthMiddleware, databaseContextMiddleware]
preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware, ncPoolSupplierInviteFeatureGateMiddleware]
Role gate:  OWNER | ADMIN — MEMBER → 403 FORBIDDEN
Param parse: rfqParamSchema (send/list) or inviteParamSchema (get/cancel)
Body parse:  sendInviteBodySchema (send) or cancelInviteBodySchema (cancel) or none (list/get)
orgId:       request.dbContext.orgId  (D-017-A)
userId:      request.userId ?? null
```

---

## §8 — Files Modified

| File | Change |
|---|---|
| `server/src/routes/tenant/poolRfq.ts` | Added import of `ncPoolSupplierInviteFeatureGateMiddleware`; extended service error class imports with 4 new supplier invite error classes; added `rfqParamSchema`, `inviteParamSchema`; added `sendInviteBodySchema`, `cancelInviteBodySchema`; added `mapSupplierInviteServiceError()` function; added 4 owner invite routes inside `poolRfqRoutes` plugin |

---

## §9 — Files NOT Modified

| File | Reason |
|---|---|
| `server/src/routes/tenant.ts` | No change needed — invite routes live in the existing `poolRfqRoutes` plugin already registered in this file |
| `server/prisma/schema.prisma` | Schema unchanged |
| `server/prisma/migrations/` | No migration in this packet |
| Any middleware files | Feature gate middleware unchanged |
| `.env` / any config files | Forbidden by governance |

---

## §10 — Test Coverage Summary

**Test file:** `server/src/routes/tenant/poolRfqInvites.integration.test.ts` (NEW — 50 tests)

| Group | Test IDs | Count | What Is Tested |
|---|---|---|---|
| Feature gate + auth (sendInvite) | ORI-01 → ORI-06 | 6 | 401 unauthenticated; 403 MEMBER role; 503 pool flag off; 503 rfq flag off; 503 invite flag off; 200-range when all gates on + OWNER |
| Feature gate + auth (list/get/cancel) | ORI-07 → ORI-15 | 9 | 401/403/503 for listInvites, getInvite, cancelInvite |
| Body validation (sendInvite) | ORI-16 → ORI-25 | 10 | Missing supplier_org_id (400); bad UUID (400); bad expires_at (400); valid expires_at accepted; supplier_message too long (400); forbidden fields: org_id, owner_org_id, pool_id, rfq_id, unknown field |
| Body validation (cancelInvite) | ORI-26 → ORI-30 | 5 | Empty body OK; cancel_reason too long (400); forbidden: status, org_id, unknown |
| Service error mapping (sendInvite) | ORI-31 → ORI-36 | 6 | POOL_NOT_FOUND → 404; INVALID_STATE (pool in AGGREGATING) → 422; RFQ_NOT_FOUND → 404; INVALID_INPUT (supplier not found) → 400; INVALID_INPUT (self-invite) → 400; SUPPLIER_INVITE_ALREADY_SENT → 409 |
| Success — sendInvite | ORI-37 → ORI-42 | 6 | 201 + DTO shape; OD-5 (no metadataInternalJson); listInvites empty array; listInvites after send; cross-tenant isolation (otherOrg 404); ADMIN role allowed |
| Success — getInvite | ORI-43 → ORI-45 | 3 | 200 + shape; cross-tenant 404; wrong rfqId → 404 |
| Success — cancelInvite | ORI-46 → ORI-50 | 5 | 200 + CANCELLED status; with cancel_reason; already-cancelled → 422 INVALID_TRANSITION; cross-tenant 404; OD-5 no metadataInternalJson |

**Total:** 50 integration tests.

### Test harness details

- Auth mock: `vi.mock('../../middleware/auth.js', ...)` using `x-test-auth`, `x-test-org-id`, `x-test-user-id`, `x-test-user-role` headers; `authHeaders(orgId, userId, userRole='OWNER')` helper
- DB harness: `withBypassForSeed`, `seedTenantForTest`, `hasDb`, `describe.skipIf(!hasDb)`
- Feature flag management: `ensureAllGatesEnabled()` sets all 3 global flags + per-tenant overrides for 3 orgs; flags restored in `afterAll`
- Fixture helpers: `createIssuedRfqFixture(orgId)` creates full pool/demand/snapshot/RFQ chain in ISSUED state; `createInviteFixture(ownerOrg, supplierOrg)` calls the above then creates invite row via bypass
- 4 test org IDs: `ownerOrgId`, `otherOrgId`, `supplierOrgId`, `ownerUserId`

---

## §11 — Validation Results

```
tsc --noEmit:
  pnpm -C server exec tsc --noEmit 2>&1 | Select-Object -First 60
  → (no output) = 0 errors

Integration tests — invite routes (50/50):
  pnpm exec vitest run src/routes/tenant/poolRfqInvites.integration.test.ts
  → 50 passed (ORI-01 through ORI-50)

Regression suites:
  poolRfq.integration + networkPoolRfq.service.unit + ncPoolSupplierInviteFeatureGate.middleware.unit + ncPoolRfqFeatureGate.middleware.unit
  → Test Files 4 passed (4) / Tests 187 passed (187)

  pools.demandLines.integration
  → Test Files 1 passed (1) / Tests 77 passed (77)

  tests/stateMachine.g020.test.ts
  → Test Files 1 passed (1) / Tests 33 passed (33)
```

---

## §12 — Risk Assessment

| Risk | Mitigation |
|---|---|
| Route conflict with existing `/:poolId/rfq/issue` | Routes added inside same plugin — `find-my-way` resolves `/rfq/:rfqId/invites` vs `/rfq/issue` by specificity. No conflict observed (tsc clean, integration tests pass). |
| `metadataInternalJson` leak via route | OD-5 enforced at service layer in `toInviteOwnerRecord`; routes pass `record` directly to `sendSuccess`. No field remapping at route layer. |
| Cross-tenant data exposure | Routes source `orgId` from `request.dbContext.orgId` (D-017-A). Service filters all queries by `ownerOrgId`. Cross-tenant tests (ORI-40, ORI-44, ORI-48) all return 404. |
| `StateMachineService.transition` called for invite | OD-7: No route handler calls `stateMachine.transition`. Lifecycle log is written in service via `writeInviteLifecycleLog`. |
| Role escalation (MEMBER reads invites) | Role gate applied in all 4 handlers: `if (!userRole.includes('ADMIN') && userRole !== 'OWNER') → 403`. Tested in ORI-02, ORI-08, ORI-11, ORI-14. |

---

## §13 — Authorization and Hold Status

```
active_delivery_unit: HOLD_FOR_AUTHORIZATION (unchanged)
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION (unchanged)
```

No authorization hold state was changed by this packet. Owner routes are implemented and tested; production accessibility remains gated by the feature flag seeds (`nc.procurement_pools.supplier_invites.enabled = false`).

---

## §14 — Governance Review

| Contract | Applicable | Outcome |
|---|---|---|
| `shared/contracts/openapi.control-plane.json` | No — tenant plane only | N/A |
| `shared/contracts/openapi.tenant.json` | Yes — new tenant endpoints | Routes conform to existing tenant route patterns; OpenAPI contract update is a separate packet |
| `shared/contracts/db-naming-rules.md` | No — no schema changes | N/A |
| `shared/contracts/rls-policy.md` | No — no RLS policy changes | N/A |
| `shared/contracts/event-names.md` | No — no event emission | N/A |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Yes — new routes added | Routes added to existing plugin; plane boundary (tenant) unchanged; `org_id` isolation verified |

---

*Governance document generated: 2026-05-31 — TexQtic governance corpus, main branch.*
