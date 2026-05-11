# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001 |
| **Type** | SUPPLIER_ROUTE_IMPLEMENTED |
| **Status** | SUPPLIER_ROUTE_IMPLEMENTED |
| **Date** | 2026-06-01 |
| **Predecessor** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001 |
| **Basis commit** | `ed0cc06` (Revert "feat(network-commerce): add supplier invite supplier routes") |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |
| **Recovery note** | An earlier implementation was committed prematurely as `442ebfa` before full validation. It was reverted cleanly as `ed0cc06` and this packet represents the clean re-execution from that revert state. |

---

## §2 — Authority Sources Read

The following sources were read before any implementation was written:

| Source | Purpose |
|---|---|
| `server/src/services/networkPoolRfq.service.ts` | Confirmed supplier service method signatures: `listSupplierInvites(orgId)`, `viewInvite(orgId, inviteId)`, `acceptInvite(orgId, userId, inviteId, note)`, `declineInvite(orgId, userId, inviteId, declineReason)`; `NetworkPoolRfqSupplierInviteInvalidTransitionError`, `NetworkPoolRfqInvalidInputError`, `NetworkPoolRfqSupplierInviteNotFoundError`; `toInviteSupplierRecord` DTO shape |
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` | Confirmed gate checks only `nc.procurement_pools.supplier_invites.enabled`; intentionally does not require parent pool/RFQ flags — correct for OD-6 supplier paths |
| `server/src/routes/tenant/poolRfq.ts` | Confirmed existing plugin style: `sendSuccess`, `sendError`, `sendValidationError`; Fastify plugin structure; `onRequest` hook array pattern |
| `server/src/routes/tenant.ts` | Confirmed how plugins are imported and registered; existing `prefix` conventions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001.md` | Owner route reference for style consistency and OD decision mapping |

---

## §3 — Pre-Work Verification

```
git log --oneline -n 3  →
  ed0cc06 (HEAD -> main) Revert "feat(network-commerce): add supplier invite supplier routes"
  442ebfa feat(network-commerce): add supplier invite supplier routes
  a1abb4a (origin/main) docs(network-commerce): sync tracker through supplier invite owner frontend

git status --short (after revert, before implementation)  →
  (clean working tree)
```

Revert commit `ed0cc06` confirmed as HEAD. Working tree was clean before any reimplementation was written.

---

## §4 — Locked OD Decisions — Route Implementation Mapping

### OD-2: Lazy EXPIRED — Supplier Side (LOCKED)

`computeEffectiveInviteStatus` is applied inside `toInviteSupplierRecord` at the service layer. Supplier routes return service response directly via `sendSuccess` — no status mutation at route layer.

### OD-5: No metadataInternalJson / No Internal Fields in Supplier Response (LOCKED)

The supplier DTO (`toInviteSupplierRecord`) already excludes `metadataInternalJson`, `ownerOrgId`, `cancelReason`, `invitedByUserId`, and all cost/settlement fields. Routes pass the service record to `sendSuccess` with no additional field stripping.

**Privacy contract assertion** (SRI-11): `assertSupplierSafeShape` helper verifies that `metadataInternalJson`, `metadata_internal_json`, `owner_org_id`, `cancel_reason`, `lines`, `rfq_lines`, `snapshot_lines`, `member_identities`, `member_org_ids`, `per_member_quantities`, `quote_amount`, `award_amount`, `order_id`, `settlement_id` are all absent from every supplier response.

### OD-6: Single-Gate Feature Chain for Supplier Routes (LOCKED)

Supplier routes use **only** `ncPoolSupplierInviteFeatureGateMiddleware` — parent pool/RFQ gates are intentionally absent from the supplier route `onRequest` array. This matches the decision that suppliers should be reachable when `nc.procurement_pools.supplier_invites.enabled = true` regardless of pool/RFQ flag state.

**Verified by SRI-03:** pool and RFQ global flags disabled → supplier routes still return 200 when invite flag is enabled.

### OD-7: StateMachineService.transition Never Called for Invite Lifecycle (LOCKED)

`acceptInvite` and `declineInvite` are service methods that manage their own lifecycle state. No route handler calls `StateMachineService.transition()`. `StateMachineService` is only instantiated as a required constructor argument to `NetworkPoolRfqService`.

---

## §5 — Schemas Added

All schemas live inside the new `poolRfqSupplierInvites.ts` plugin file (not shared with owner routes).

### `inviteIdParamSchema`

```typescript
z.object({ inviteId: z.string().uuid('inviteId must be a valid UUID') })
```

### `acceptBodySchema` (strict)

| Field | Type | Rule |
|---|---|---|
| `note` | string \| null | Optional; max 2000 chars; nullable |
| Unknown fields | `.strict()` | Rejected as validation error |

Empty body `{}` is valid.

### `declineBodySchema` (strict)

| Field | Type | Rule |
|---|---|---|
| `declineReason` | string \| null | Optional; max 2000 chars; nullable |
| Unknown fields | `.strict()` | Rejected as validation error |

Empty body `{}` is valid.

---

## §6 — Error Mapper Added

`mapSupplierRouteError(reply, err)` — returns `true` if error matched and response sent, `false` otherwise. Called in all four route `catch` blocks.

| Error Class | HTTP Status | Error Code |
|---|---|---|
| `NetworkPoolRfqInvalidInputError` | 400 | `INVALID_INPUT` |
| `NetworkPoolRfqSupplierInviteNotFoundError` | 404 | `SUPPLIER_INVITE_NOT_FOUND` |
| `NetworkPoolRfqSupplierInviteInvalidTransitionError` | 422 | `INVALID_TRANSITION` |

---

## §7 — Routes Registered

All four routes live in the new `poolRfqSupplierInvitesRoutes` Fastify plugin (`server/src/routes/tenant/poolRfqSupplierInvites.ts`). The plugin is registered in `server/src/routes/tenant.ts` at prefix `/tenant/network-commerce`.

| Method | Path (relative to plugin prefix) | Response on success | Service method |
|---|---|---|---|
| `GET` | `/supplier-rfq-invites` | `200` (array) | `listSupplierInvites` |
| `GET` | `/supplier-rfq-invites/:inviteId` | `200` | `viewInvite` |
| `POST` | `/supplier-rfq-invites/:inviteId/accept` | `200` | `acceptInvite` |
| `POST` | `/supplier-rfq-invites/:inviteId/decline` | `200` | `declineInvite` |

Full resolved paths (from Fastify app root):
- `GET  /api/tenant/network-commerce/supplier-rfq-invites`
- `GET  /api/tenant/network-commerce/supplier-rfq-invites/:inviteId`
- `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/accept`
- `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/decline`

### Common route structure (all four routes)

```typescript
onRequest:  [tenantAuthMiddleware, databaseContextMiddleware, ncPoolSupplierInviteFeatureGateMiddleware]
// Note: No role gate — any authenticated supplier org can access their own invites
orgId:      request.dbContext.orgId  (D-017-A)
userId:     request.userId ?? null   (accept/decline only)
```

No role gate is applied (MEMBER/OWNER/ADMIN all allowed) — isolation is enforced by the service filtering on `supplierOrgId = orgId`.

---

## §8 — Files Modified

| File | Change |
|---|---|
| `server/src/routes/tenant/poolRfqSupplierInvites.ts` | **NEW FILE** — Fastify plugin with all 4 supplier invite routes, `inviteIdParamSchema`, `acceptBodySchema`, `declineBodySchema`, `mapSupplierRouteError`, `parseStrictBody` |
| `server/src/routes/tenant.ts` | Added `import tenantPoolRfqSupplierInvitesRoutes from './tenant/poolRfqSupplierInvites.js';` and `await fastify.register(tenantPoolRfqSupplierInvitesRoutes, { prefix: '/tenant/network-commerce' });` |

---

## §9 — Files NOT Modified

| File | Reason |
|---|---|
| `server/src/routes/tenant/poolRfq.ts` | No change — supplier routes live in a separate plugin |
| `server/prisma/schema.prisma` | Schema unchanged |
| `server/prisma/migrations/` | No migration in this packet |
| Any middleware files | Feature gate middleware unchanged |
| `.env` / any config files | Forbidden by governance |

---

## §10 — Test Coverage Summary

**Test file:** `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts` (NEW — 11 tests)

| Test ID | Description | What Is Tested |
|---|---|---|
| SRI-01 | Unauthenticated request returns 401 | Auth gate |
| SRI-02 | Supplier invite feature gate disabled returns 503 | Feature gate |
| SRI-03 | Parent pool/RFQ flags do not block supplier routes when invite flag is enabled | OD-6 single-gate |
| SRI-04 | List returns own invites only | Supplier-scoped isolation |
| SRI-05 | View own invite returns 200 | Happy path — view |
| SRI-06 | Wrong supplier receives non-leaking 404 | Cross-supplier isolation |
| SRI-07 | Accept pending invite succeeds | Happy path — accept |
| SRI-08 | Decline pending invite succeeds | Happy path — decline |
| SRI-09 | Invalid transitions return 422 | State machine guard — accept-accepted, decline-expired |
| SRI-10 | Strict body validation rejects forbidden/unknown fields | Input validation — strict schema |
| SRI-11 | Privacy contract: supplier responses do not expose internal/member/other supplier data | OD-5 privacy |

**Total:** 11 integration tests.

### Test harness details

- Auth mock: `vi.mock('../../middleware/auth.js', ...)` using `x-test-auth`, `x-test-org-id`, `x-test-user-id`, `x-test-user-role` headers
- DB harness: `withBypassForSeed`, `seedTenantForTest`, `hasDb`, `describe.skipIf(!hasDb)`
- Feature flag management: `ensureDefaultFlagsEnabled()` sets all 3 global flags + per-tenant overrides for 4 orgs; flags restored in `afterAll`
- Fixture helpers: `createIssuedRfqFixture(orgId)` creates full pool/demand-line/snapshot/RFQ chain in ISSUED state (no snapshot lines created — avoids immutable table constraint); `createInviteFixture(ownerOrg, supplierOrg, overrides?)` calls the above then creates invite row directly via bypass
- 4 test org IDs: `ownerOrgId`, `supplierOrgId`, `supplierOrg2Id`, `otherOrgId`
- Cleanup in `afterEach`: snapshot lines intentionally NOT deleted (immutable table — deletes are forbidden by DB trigger); snapshots, RFQs, demand lines, pools all deleted in dependency order

---

## §11 — Validation Results

```
tsc --noEmit:
  pnpm -C server exec tsc --noEmit
  → (no output) = 0 errors

prisma validate + generate:
  pnpm -C server exec prisma validate  →  passed (schema warning on SetNull/required — pre-existing)
  pnpm -C server exec prisma generate  →  passed

Supplier invite supplier route integration tests (11/11):
  pnpm exec vitest run src/routes/tenant/poolRfqSupplierInvites.integration.test.ts
  → 11 passed (SRI-01 through SRI-11)

Owner invite regression (50/50):
  pnpm exec vitest run src/routes/tenant/poolRfqInvites.integration.test.ts
  → Test Files 1 passed (1) / Tests 50 passed (50)

Service unit regression (117/117):
  pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts
  → Test Files 1 passed (1) / Tests 117 passed (117)

Feature gate regression (27/27):
  pnpm exec vitest run src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts
  pnpm exec vitest run src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts
  → Test Files 2 passed (2) / Tests 27 passed (27)

Demand line route regression (77/77):
  pnpm exec vitest run src/routes/tenant/pools.demandLines.integration.test.ts
  → Test Files 1 passed (1) / Tests 77 passed (77)

Pool route regression (56/56):
  pnpm exec vitest run src/routes/tenant/pools.integration.test.ts
  → Test Files 1 passed (1) / Tests 56 passed (56)

State machine regression (33/33):
  pnpm exec vitest run tests/stateMachine.g020.test.ts
  → Test Files 1 passed (1) / Tests 33 passed (33)

Runtime routing + session descriptor (20/20):
  pnpm run test:runtime-routing:focused
  → Test Files 2 passed (2) / Tests 20 passed (20)

Frontend tests (19/19):
  pnpm run test:frontend
  → Test Files 1 passed (1) / Tests 19 passed (19)
```

---

## §12 — Risk Assessment

| Risk | Mitigation |
|---|---|
| `metadataInternalJson` / internal fields leak via supplier route | OD-5 enforced at service layer in `toInviteSupplierRecord`; privacy contract tested in SRI-11 via `assertSupplierSafeShape`. |
| Cross-supplier data exposure (supplier A sees supplier B invites) | Service `listSupplierInvites` and `viewInvite` filter by `supplierOrgId = orgId`. SRI-04 (list isolation) and SRI-06 (wrong-supplier 404) cover both paths. |
| Parent feature flag gates bypass | Intentional — OD-6. Supplier routes use only `ncPoolSupplierInviteFeatureGateMiddleware`. Verified by SRI-03. |
| `StateMachineService.transition` side-effects on accept/decline | OD-7: Routes do not call `transition`. Service manages invite lifecycle state. No transition log written for invite accept/decline. |
| Route registration conflict with owner pool routes | Supplier plugin registered at `/tenant/network-commerce` (no `/pools` prefix). Owner invite routes registered inside `poolRfqRoutes` at `/tenant/network-commerce/pools`. No path overlap. |

---

## §13 — Authorization and Hold Status

```
active_delivery_unit: HOLD_FOR_AUTHORIZATION (unchanged)
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION (unchanged)
```

No authorization hold state was changed by this packet. Supplier routes are implemented and tested; production accessibility remains gated by the feature flag seeds (`nc.procurement_pools.supplier_invites.enabled = false` in production).

---

## §14 — Governance Review

| Contract | Applicable | Outcome |
|---|---|---|
| `shared/contracts/openapi.control-plane.json` | No — tenant plane only | N/A |
| `shared/contracts/openapi.tenant.json` | Yes — new tenant endpoints | Routes conform to existing tenant route patterns; OpenAPI contract update is a separate packet |
| `shared/contracts/db-naming-rules.md` | No — no schema changes | N/A |
| `shared/contracts/schema-budget.md` | No — no schema changes | N/A |
| `shared/contracts/rls-policy.md` | No — RLS unchanged | N/A |
| `shared/contracts/event-names.md` | No — no events emitted | N/A |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Yes — new route file added | New plugin follows existing tenant route architecture; registered at established `/tenant/network-commerce` prefix |

Governance review: **PASS**
