# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001` |
| **Type** | `PLANNING_ONLY` — `DECISION_AUDIT` |
| **Status** | `PARESH_AUTHORIZED` |
| **Domain** | Network Commerce — Phase 1C |
| **Date** | 2026-05-11 |
| **Basis commit** | `fd3b694` — HEAD at audit time |
| **Parent design packet** | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001` (DESIGN_COMPLETE, `900ea66`) |
| **Mode** | `GOVERNANCE / DECISION ONLY` |
| **Governed posture** | `active_delivery_unit: TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001` (Packet 11 authorized) |
| **DPP launch** | `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` (UNCHANGED — separate DPP decision) |
| **Author** | Paresh Patel |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |

### Files changed by this packet

| File | Action |
|---|---|
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001.md` | NEW — this document |
| `governance/control/GOVERNANCE-CHANGELOG.md` | UPDATED — DECISION_AUDIT entry prepended |
| `governance/control/NEXT-ACTION.md` | UPDATED — last_closed_unit advanced to DECISION-AUDIT-001 |
| `governance/control/OPEN-SET.md` | UPDATED — Last Updated line only |

### Files NOT changed by this packet

| File category | Status |
|---|---|
| `server/prisma/schema.prisma` | UNCHANGED — no schema touches until Packet 11 authorized |
| `server/prisma/migrations/` | UNCHANGED |
| `server/src/services/` | UNCHANGED |
| `server/src/routes/` | UNCHANGED |
| `server/src/middleware/` | UNCHANGED |
| Any test file | UNCHANGED |
| Any frontend file | UNCHANGED |

---

## §2 — Starting Repo State and Uncommitted-File Classification

### 2.1 Working Tree State at Audit Start

| Check | Result |
|---|---|
| `git status --short` | **CLEAN** — no modified files, no staged files, no untracked files |
| `git diff --name-only` | **EMPTY** — zero dirty files |
| HEAD commit | `fd3b694` — `docs(network-commerce): add supplier invite prod-verify gov-close-001 partial blocked record` |
| Working tree origin | `fd3b694` is `origin/main` — all previous packets pushed |

### 2.2 Classification of GOV-CLOSE-001 Historical Artifact

In the prior session summary, `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-001.md`
was recorded as an untracked file. Classification result:

| File | Status |
|---|---|
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-001.md` | **COMMITTED at `fd3b694`** — historical audit record, no longer untracked |

The working tree is fully clean. No untracked residue exists. No uncommitted file
requires remediation before this audit begins.

### 2.3 Recent Git Log

```
fd3b694  docs(network-commerce): add supplier invite prod-verify gov-close-001 partial blocked record
900ea66  docs(network-commerce): design supplier quote backend contract
82ba96e  docs(network-commerce): block supplier quote frontend on backend contract
037eeb9  feat(network-commerce): add supplier invite inbox frontend
2ae2bbb  docs(network-commerce): close supplier invite production verification
4cd7c0a  feat(network-commerce): add supplier invite supplier routes
```

---

## §3 — Authority Sources Read

All of the following were read before any audit analysis was written:

| Source | Purpose |
|---|---|
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001.md` (749 lines) | Full design: §6 QD-1–QD-8 locked decisions; §8 data model; §9 supplier DTO; §11 route; §12 gate; §13 service; §14 lifecycle; §15 RFQ transition; §18 tests; §20 Q-1–Q-8 open decisions |
| `governance/control/NEXT-ACTION.md` | Current governed posture; DPP hold keys; `last_closed_unit` = DESIGN-001 |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Most recent entries: DESIGN_COMPLETE (DESIGN-001), BLOCKED (FE-8), VERIFIED_COMPLETE (FE-7) |
| `governance/control/OPEN-SET.md` | Last Updated; operating notes; live control set |
| `governance/control/BLOCKED.md` | Section 1: FE-8 only blocked item; Section 2: WL Co REVIEW-UNKNOWN hold |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions; decision format and structure reference |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001.md` | `NetworkPoolRfqSupplierInvite` schema pattern; constraint naming convention; migration pattern |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001.md` | `toInviteSupplierRecord` helper pattern; `computeEffectiveInviteStatus` pattern |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001.md` | Route plugin style; `mapSupplierRouteError` pattern; `parseStrictBody` pattern |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-002.md` | Production state at `4cd7c0a`; all 4 invite routes live |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` (Phase 1C lines) | Packets 10–13 NOT_STARTED; Tracker placeholder route path `/poolId/rfq/:rfqId/quote`; Tracker placeholder schema "quote fields on `network_pool_rfqs`" |
| `server/prisma/schema.prisma` (lines 2213–2300) | `NetworkPoolRfqSupplierInvite` model; no `NetworkPoolRfqSupplierQuote` model confirmed absent |
| `server/src/services/networkPoolRfq.service.ts` (lines 1–300) | Error class naming pattern; `NetworkPoolRfqService`; existing invite error classes; `NetworkPoolRfqSupplierInviteSupplierRecord` interface; `computeEffectiveInviteStatus` |
| `server/src/routes/tenant/poolRfqSupplierInvites.ts` (full) | `supplierOnlyGuards` array; `mapSupplierRouteError`; `parseStrictBody`; all 4 supplier invite routes |
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` (full) | Two-layer gate pattern; `NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY`; `sendError 503`; log event names |
| `server/src/routes/tenant.ts` (line 9005) | `fastify.register(tenantPoolRfqSupplierInvitesRoutes, { prefix: '/tenant/network-commerce' })` |
| `server/prisma/migrations/20260530000000_nc_pool_supplier_invite_feature_flag_seed/migration.sql` | Feature flag INSERT pattern; `ON CONFLICT (key) DO NOTHING`; provisioning notes structure |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | PRQ-28: `expect(data).not.toHaveProperty('quotes')` guard confirmed |
| `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts` | SRI-11: `expect(record['quote_amount']).toBeUndefined()` guard confirmed |

---

## §4 — Repo-Truth Summary at HEAD `fd3b694`

### 4.1 Phase 1C Absent (confirmed)

| What | Confirmed absent |
|---|---|
| `NetworkPoolRfqSupplierQuote` Prisma model | NOT IN `schema.prisma` |
| `network_pool_rfq_supplier_quotes` table | DOES NOT EXIST in DB |
| `submitQuote` / `getQuote` service methods | NOT IN `networkPoolRfq.service.ts` |
| `nc.procurement_pools.supplier_quotes.enabled` flag | NOT IN migrations |
| `ncPoolSupplierQuoteFeatureGate.middleware.ts` | NOT IN `server/src/middleware/` |
| `poolRfqSupplierQuotes.ts` route plugin | NOT IN `server/src/routes/tenant/` |

### 4.2 Phase 1B Present (confirmed live)

| What | Status |
|---|---|
| All 4 supplier invite routes (`/supplier-rfq-invites`) | LIVE @ `4cd7c0a` |
| `NetworkPoolRfqSupplierInvite` model (19 columns) | DEPLOYED |
| Two-layer feature gate pattern | IMPLEMENTED and verified |
| OD-1 through OD-7 | LOCKED — DECISION-AUDIT-001 |
| `computeEffectiveInviteStatus` (lazy EXPIRED) | IMPLEMENTED |
| `assertSupplierSafeShape` test helper | IN TEST SUITE |
| RFQ status enum: `ISSUED|QUOTED|ACCEPTED|REJECTED|EXPIRED|CANCELLED` | DEPLOYED |

### 4.3 Active Test Guards (must not regress)

| Guard | Assertion | Still valid |
|---|---|---|
| PRQ-28 | `expect(data).not.toHaveProperty('quotes')` — RFQ response has no quotes array | ✅ VALID — no quote routes exist |
| SRI-11 | `expect(record['quote_amount']).toBeUndefined()` — invite record has no quote_amount | ✅ VALID — invite model unchanged |

### 4.4 Tracker Placeholder Deviations Flagged in Design

The Tracker (Packets 11 and 13) contains placeholders written before the multi-supplier quote
model was fully designed:

| Tracker Packet | Tracker Placeholder | Design Recommendation | Deviation |
|---|---|---|---|
| 11 (Schema) | `quote_amount, currency, quote_status` fields added to `network_pool_rfqs` | Dedicated `NetworkPoolRfqSupplierQuote` table | **Q-2** |
| 13 (Route) | `POST /:poolId/rfq/:rfqId/quote` under pools prefix | `POST /supplier-rfq-invites/:inviteId/quote` invite-anchored | **Q-1** |

Both deviations require Paresh authorization before the respective implementation packets
begin (Packet 11 for Q-2; Packet 13 for Q-1).

---

## §5 — Decision Matrix Overview

Eight open decisions were flagged in `§20` of the parent design packet. This audit provides
detailed analysis of each, including options, risk, reversibility, and downstream impact, to
enable Paresh to authorize or amend each decision independently.

| ID | Decision Topic | Packet Gate | Reversibility after lock | Design Recommendation |
|----|---------------|-------------|--------------------------|----------------------|
| **Q-1** | Route path (invite-anchored vs tracker placeholder) | Packet 13 | Hard — requires route refactor + test migration | Invite-anchored |
| **Q-2** | Schema approach (dedicated table vs RFQ fields) | Packet 11 | **Irreversible** once deployed — schema migration required | Dedicated table |
| **Q-3** | `withdrawQuote` route timing (Phase 1C vs 1D) | Packet 13 | Soft — route addition in Phase 1D has no schema impact | Defer to Phase 1D |
| **Q-4** | Owner read route timing (Phase 1C vs 1D) | Packet 13 | Soft — no schema impact | Defer to Phase 1D |
| **Q-5** | UNIQUE constraint type (non-partial vs partial) | Packet 11 | Medium — Phase 1D schema amendment needed if revised | Non-partial Phase 1C |
| **Q-6** | `quote_amount` precision (`DECIMAL(18,2)` vs `DECIMAL(18,6)`) | Packet 11 | Hard — `ALTER COLUMN` required to change precision | `DECIMAL(18,2)` |
| **Q-7** | Currency representation (free-form vs FK) | Packet 11 | Medium — normalization migration needed later | Free-form `VARCHAR(10)` |
| **Q-8** | GET /quote read route timing (Phase 1C vs 1D) | Packet 13 | Soft for backend; **blocks FE-8 if deferred** | Include in Phase 1C |

Critical authorization gating:
- **Before Packet 11 begins:** Q-2, Q-5, Q-6, Q-7 must be resolved.
- **Before Packet 13 begins:** Q-1, Q-3, Q-4, Q-8 must be resolved.
- Q-3 and Q-4 have no schema impact and may be re-evaluated between Packets 12 and 13.

---

## §6 — Q-1: Route Path (Invite-Anchored vs Tracker Placeholder)

### Decision question

Should the supplier quote route be:

**Option A (Design recommendation) — Invite-anchored:**
```
POST  /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
GET   /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
```
Defined in new plugin file `server/src/routes/tenant/poolRfqSupplierQuotes.ts`.
Registered in `tenant.ts` under `prefix: '/tenant/network-commerce'`.

**Option B (Tracker placeholder) — Pool/RFQ-scoped:**
```
POST  /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quote
```
Defined alongside existing RFQ routes in `poolRfq.ts` or a pools-prefixed sub-file.

### Analysis

| Dimension | Option A (invite-anchored) | Option B (tracker placeholder) |
|---|---|---|
| Consistency with Phase 1B | ✅ Matches all 4 supplier invite routes in `poolRfqSupplierInvites.ts` (`/supplier-rfq-invites` prefix) | ❌ Supplier routes in Phase 1B use no `/:poolId/rfq/:rfqId` prefix |
| OD-6 compliance | ✅ Supplier routes do not require parent pool/RFQ flags in `onRequest` | ⚠️ Placeholder file context (`poolRfq.ts`) carries owner-oriented guards |
| Supplier identity check | ✅ `inviteId` is sufficient: supplier already holds it and it encodes `rfqId + poolId + supplierOrgId` | ❌ Requires supplier to carry `poolId` and `rfqId` — owner-domain identifiers the supplier should not need to know |
| Route isolation | ✅ Separate plugin file; clean concern separation from owner routes | ❌ Mixes supplier-facing quote routes with owner-facing RFQ and invite routes in same file |
| Implementation scope change vs tracker | ⚠️ Deviates from tracker placeholder — requires Paresh authorization | ✅ Matches tracker placeholder wording |
| Test suite structure | ✅ New integration test file `poolRfqSupplierQuotes.integration.test.ts` — clean | ❌ Must extend existing `poolRfq.integration.test.ts` (risk of extending owner test file with supplier cases) |
| Reversibility | Hard — all route URLs, tests, frontend service URLs, and OpenAPI contracts change if switched after Packet 13 | Hard (same) |

### Risks of Option A (recommended)

- **Tracker alignment:** The Tracker document records the placeholder path. This audit authorizes the deviation. Tracker document is NOT updated in this packet (it is a historical record in its own cadence).
- **No structural risk:** The route plugin separation is the established Phase 1B pattern.

### Risks of Option B (not recommended)

- **OD-6 violation risk:** Adding supplier quote routes to `poolRfq.ts` (which has owner guards at the plugin level) risks inadvertently applying owner-oriented `onRequest` guards to supplier routes. Phase 1B specifically separated supplier routes into a dedicated plugin to avoid this problem (OD-6).
- **Supplier identity leakage risk:** Requiring `/:poolId/rfq/:rfqId` forces the supplier to carry owner-domain IDs, which the supplier should not need to manage — the invite already provides the full context.
- **FE-8 impact:** Frontend will need to reconstruct `poolId` and `rfqId` from the invite context just to build the URL, adding unnecessary complexity.

### Impact on dependent packets

| Packet | If Option A | If Option B |
|---|---|---|
| Packet 11 (Schema) | No impact | No impact |
| Packet 12 (Service) | No impact on method signatures | No impact on method signatures |
| Packet 13 (Route) | New plugin file; `tenant.ts` import + register | Extends `poolRfq.ts` — mixed concern |
| FE-8 | Service URL: `/supplier-rfq-invites/${inviteId}/quote` | Service URL: `/pools/${poolId}/rfq/${rfqId}/quote` — requires `poolId`+`rfqId` in FE state |
| SQR tests | New integration test file | Appended to owner test file |

### Recommendation

**Option A — Invite-anchored.** Consistent with OD-6, existing supplier route pattern, and Phase 1B separation principle. The tracker placeholder was written before OD-6 was locked; this deviation is deliberate and documented.

**Required: Paresh authorization before Packet 13 begins.**

---

## §7 — Q-2: Schema Approach (Dedicated Table vs RFQ Fields)

### Decision question

Should the quote be:

**Option A (Design recommendation) — Dedicated table:**
New `NetworkPoolRfqSupplierQuote` model → table `network_pool_rfq_supplier_quotes` (20 columns).
Anchored to invite via `invite_id FK → network_pool_rfq_supplier_invites(id) ON DELETE CASCADE`.

**Option B (Tracker placeholder) — Quote fields on `network_pool_rfqs`:**
Add columns `quote_amount`, `currency`, `quote_status` directly to `network_pool_rfqs` table.

### Analysis

| Dimension | Option A (dedicated table) | Option B (tracker placeholder) |
|---|---|---|
| Multi-supplier support | ✅ Each invited supplier can submit a separate row | ❌ Only one quote per RFQ — breaks multi-supplier RFQ model |
| RLS anchor | ✅ Dual RLS: `owner_org_id` (buyer) + `supplier_org_id` (supplier); correct for both planes | ❌ RFQ row is `owner_org_id` only — embedding `supplier_org_id` + `quote_amount` in owner row violates supplier privacy |
| Invite linkage | ✅ `invite_id` FK creates explicit constraint (QD-1: only accepted invites may have quotes) | ❌ No invite linkage — quote existence is not tied to invite acceptance |
| Lifecycle isolation | ✅ Quote has its own `status` column, `submitted_at`, `withdrawn_at` — independent of RFQ lifecycle | ❌ Quote status conflated with RFQ status — `QUOTED` on the RFQ already encodes "first quote arrived"; no separate quote status |
| Supplier DTO safety | ✅ `toQuoteSupplierRecord` excludes `owner_org_id`, `rfq_id`, `pool_id` from supplier view | ❌ Supplier quote data sits on owner's RFQ row — impossible to expose safely without exposing owner data |
| Phase 1D readiness | ✅ Owner quote read, quote comparison, award decision are all natural extensions of the dedicated table | ❌ Any Phase 1D capability requires a schema rework |
| Tracker alignment | ⚠️ Deviates from tracker placeholder | ✅ Matches tracker placeholder |
| Reversibility | **Irreversible** — once deployed, only `ALTER TABLE + data migration` can merge back | **Irreversible** — once deployed, reversing requires adding dedicated table anyway |
| Blast radius if wrong | Low — adding a separate table is additive | **CRITICAL** — single-quote-per-RFQ constraint would require DROP + recreate in Phase 1D |

### Risks of Option A (recommended)

- **Tracker deviation:** Tracker placeholder was `quote_amount, currency, quote_status` on `network_pool_rfqs`. This deviates. The deviation is deliberate and documented.
- **Migration complexity:** New table with 8 indexes and 5 FKs. More Packet 11 work than Option B. This is appropriate complexity for the correct design.

### Risks of Option B (not recommended)

- **Multi-supplier model broken:** TexQtic's NC Phase 1B allows multiple suppliers to be invited per RFQ. Option B only permits one quote per RFQ — the column approach collapses all quote submissions to a single row on the RFQ. This is **architecturally incompatible** with the already-deployed invite model.
- **RLS violation:** Embedding `supplier_org_id` and `quote_amount` on the owner's RFQ row creates a cross-tenant data hazard. The supplier's bid data would live in the buyer's row — exactly what dual-RLS anchor design prevents.
- **Phase 1D dead-end:** Any owner quote comparison (Phase 1D) would require reading multiple quote rows by `rfqId`. Option B cannot support this without a full table redesign.

### Impact on dependent packets

| Packet | If Option A | If Option B |
|---|---|---|
| Packet 11 (Schema) | New table, 20 columns, 8 indexes, 5 FKs, feature flag | Add 3–4 columns to `network_pool_rfqs` |
| Packet 12 (Service) | `tx.networkPoolRfqSupplierQuote.create()` | `tx.networkPoolRfq.update()` |
| Packet 13 (Route) | No impact | No impact |
| Phase 1D owner read | ✅ `findMany({ where: { rfqId } })` | ❌ Impossible — there is only one quote slot |
| RLS policy | Dual `owner_org_id` + `supplier_org_id` anchors | Broken — supplier data in owner row |
| PRQ-28 guard | ✅ Preserved — RFQ shape unchanged | ⚠️ PRQ-28 may need amendment if columns added to RFQ row change the response shape |

### Recommendation

**Option A — Dedicated `NetworkPoolRfqSupplierQuote` table.** This is the most consequential decision in Phase 1C. Option B is incompatible with the already-deployed multi-supplier invite model and would create an RLS hazard. The Tracker placeholder was a pre-design estimate that predates OD-6 and the full multi-supplier NC model.

**This is the highest-priority decision. Required: Paresh authorization before Packet 11 begins.**

---

## §8 — Q-3: `withdrawQuote` Route Timing (Phase 1C vs Phase 1D)

### Decision question

Should the `withdrawQuote` method and `POST /supplier-rfq-invites/:inviteId/quote/withdraw` route be
delivered in Phase 1C (Packet 13) or deferred to Phase 1D?

**Option A (Design recommendation) — Defer withdraw route to Phase 1D.**
`WITHDRAWN` status enum value IS included in Phase 1C schema CHECK constraint (for forward compatibility).
The `withdrawQuote` service method and route are NOT delivered in Phase 1C.

**Option B — Include withdraw in Phase 1C (expand Packet 13 scope).**
`WITHDRAWN` status, `withdrawn_at`, and `withdraw_reason` columns + the `withdrawQuote` method + withdraw route all delivered in Phase 1C.

### Analysis

| Dimension | Option A (defer route — recommended) | Option B (include in Phase 1C) |
|---|---|---|
| Phase 1C scope | ✅ Minimal: submit + optional GET only | ❌ Expands Packet 13 scope |
| Schema impact | IDENTICAL — `WITHDRAWN` enum value required in Phase 1C schema regardless (for `UNIQUE(invite_id)` non-partial constraint to make sense) | IDENTICAL — same columns required |
| FE-8 unblock | ✅ FE-8 only needs submit + GET; withdraw is a secondary action | ✅ FE-8 could also show withdraw button (but this is not a Phase 1C FE-8 requirement) |
| Service complexity | ✅ Simpler Packet 12: `submitQuote` only | ❌ Adds `withdrawQuote` with its own validation (SUBMITTED→WITHDRAWN, UNIQUE partial index considerations deferred) |
| UNIQUE(invite_id) coherence | ⚠️ Non-partial UNIQUE means a withdrawn quote blocks re-submission — but withdraw is deferred anyway, so no user flow exposes this in Phase 1C | ✅ Can address UNIQUE + withdraw consistently in same packet |
| Phase 1D readiness | ✅ Schema already has WITHDRAWN column + status; Phase 1D adds only service + route | IDENTICAL — Phase 1D would upgrade UNIQUE to partial if revisions needed |
| Reversibility | Soft — adding a route in Phase 1D has zero schema impact | N/A (not applicable) |

### Critical schema note (regardless of option choice)

**Both options require the same schema in Packet 11:**
- `status` column: CHECK constraint must include `'WITHDRAWN'` as a valid value — even if the withdraw route is deferred. This prevents a Phase 1D schema amendment just to add a CHECK value.
- `withdrawn_at TIMESTAMPTZ NULL` column: Required in Phase 1C schema.
- `withdraw_reason TEXT NULL` column: Required in Phase 1C schema.

These columns are already specified in the design (§8.2). They are required regardless of whether the withdraw route is delivered in Phase 1C or Phase 1D.

### Impact on dependent packets

| Packet | If Option A (defer) | If Option B (include) |
|---|---|---|
| Packet 11 (Schema) | IDENTICAL — all columns present | IDENTICAL |
| Packet 12 (Service) | Simpler: `submitQuote` only | Adds `withdrawQuote` |
| Packet 13 (Route) | POST submit + GET only | POST submit + GET + POST withdraw |
| Test plan | SQ-01–SQ-15 only | Adds SQ-16 through SQ-20+ (withdraw cases) |
| FE-8 | ✅ No impact — withdraw is not in FE-8 scope | ✅ No impact — FE-8 is submit-focused |
| FE-9 (Phase 1D) | Phase 1D owner read sees WITHDRAWN status | IDENTICAL |

### Recommendation

**Option A — Defer `withdrawQuote` route to Phase 1D.** Phase 1C scope is deliberately bounded to supplier submit + GET. The schema must still include `WITHDRAWN` in the status CHECK constraint and the `withdrawn_at`/`withdraw_reason` columns — this is not an option; it is a Phase 1C requirement regardless of route timing.

**Required: Paresh authorization before Packet 13 begins.**

---

## §9 — Q-4: Owner Read Route Timing (Phase 1C vs Phase 1D)

### Decision question

Should a read-only route for the pool owner to view submitted quotes be included in Phase 1C
(Packet 13) or deferred to Phase 1D?

**Option A (Design recommendation) — Defer owner read to Phase 1D.**
Phase 1C delivers only supplier-facing routes (submit + GET). No owner-facing quote routes.

**Option B — Include owner read in Phase 1C.**
Adds `GET /pools/:poolId/rfq/:rfqId/quotes` (or equivalent) to Packet 13.
Requires `NetworkPoolRfqSupplierQuoteOwnerRecord` DTO (§10 of design doc — already specified).

### Analysis

| Dimension | Option A (defer — recommended) | Option B (include in Phase 1C) |
|---|---|---|
| Phase 1C scope | ✅ Minimal: supplier submit + supplier GET | ❌ Adds owner route + owner DTO + owner tests |
| FE-8 unblock | ✅ FE-8 is supplier-facing only — no owner read needed for FE-8 | Irrelevant for FE-8 |
| FE-9 unblock | ❌ FE-9 (owner quote review) remains blocked until owner route exists | ✅ FE-9 unblock possible earlier |
| Route plugin separation | ✅ Supplier plugin only for Phase 1C | ⚠️ Owner routes should go in owner-side plugin (different plugin file, different guards) |
| Owner DTO design | ✅ `NetworkPoolRfqSupplierQuoteOwnerRecord` designed in §10 of DESIGN-001 — ready | ✅ Design exists, can be implemented |
| Feature gate | ✅ Owner read uses parent gate chain (nc.procurement_pools + rfq + supplier_quotes) | Same |
| Reversibility | Soft — owner route is an additive extension; no schema impact | N/A |
| RLS impact | ✅ Defers RLS policy for owner read to Phase 1D | ⚠️ Owner read RLS policy must be written in Packet 11 if Phase 1C includes owner route |

### Impact on FE-9

Deferring owner read to Phase 1D means `TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001` (FE-9)
cannot begin until Phase 1D owner read route exists. This is an acceptable sequencing constraint
per the design — FE-8 (supplier submit) is the Phase 1C priority.

### Recommendation

**Option A — Defer owner read route to Phase 1D.** Phase 1C is bounded to supplier quote submission and supplier quote retrieval. The owner DTO (`NetworkPoolRfqSupplierQuoteOwnerRecord`) is already designed in §10 of DESIGN-001 to prevent Phase 1D dead-ends. No additional design work is needed when Phase 1D begins.

**Required: Paresh authorization before Packet 13 begins.**

---

## §10 — Q-5: UNIQUE Constraint Type (Non-Partial vs Partial)

### Decision question

Should the UNIQUE constraint on `invite_id` be:

**Option A (Design recommendation) — Non-partial `UNIQUE(invite_id)` across all rows (all statuses).**

**Option B — Partial `UNIQUE(invite_id) WHERE status = 'SUBMITTED'`.**
This would allow a new quote row after the first is WITHDRAWN.

### Analysis

| Dimension | Option A (non-partial — recommended) | Option B (partial) |
|---|---|---|
| Phase 1C semantics | ✅ Clean: one quote per invite, period. No re-submit in Phase 1C | ⚠️ Partial unique requires `withdrawQuote` route to exist before it makes business sense (a partial constraint without a withdraw path is confusing) |
| Q-3 interaction | ✅ Consistent: defer withdraw route + non-partial constraint = clean Phase 1C "submit once" model | ⚠️ Partial unique without a working withdraw route creates a partial-unique constraint that cannot be exercised in Phase 1C |
| Schema migration complexity | ✅ Standard unique index: `CREATE UNIQUE INDEX ... ON ... (invite_id)` | ⚠️ Partial index: `CREATE UNIQUE INDEX ... ON ... (invite_id) WHERE status = 'SUBMITTED'` — slightly more complex; rare in codebase |
| Phase 1D revision support | ⚠️ Schema amendment needed in Phase 1D to switch to partial if revisions required | ✅ Ready for re-submit after WITHDRAWN without schema change |
| Risk of getting it wrong | Medium — Phase 1D amendment is a simple `DROP INDEX + CREATE UNIQUE INDEX WHERE` operation | Low — but requires the withdraw route to be delivered before it is useful |
| Precedent in codebase | ✅ Phase 1B used non-partial `UNIQUE(rfq_id, supplier_org_id)` across all statuses (OD-1). Same pattern. | ❌ No partial unique indexes currently used in NC schema |

### Impact of Phase 1D amendment (if Option A chosen)

If Paresh later requires re-submission after withdrawal (Phase 1D), the schema amendment is:

```sql
-- Phase 1D amendment: DROP non-partial + CREATE partial
DROP INDEX nc_pool_rfq_supplier_quotes_invite_unique;
CREATE UNIQUE INDEX nc_pool_rfq_supplier_quotes_invite_submitted_unique
  ON network_pool_rfq_supplier_quotes(invite_id)
  WHERE status = 'SUBMITTED';
```

This is a low-risk, low-blast-radius migration. Non-partial → partial is reversible.

### Recommendation

**Option A — Non-partial `UNIQUE(invite_id)` Phase 1C.** Consistent with OD-1 precedent (non-partial unique on invites). Phase 1C semantics are "one quote per invite." Phase 1D can amend if re-submission is productized.

**Required: Paresh authorization before Packet 11 begins.**

---

## §11 — Q-6: `quote_amount` Precision (`DECIMAL(18,2)` vs `DECIMAL(18,6)`)

### Decision question

Should `quote_amount` be stored as:

**Option A (Design recommendation) — `DECIMAL(18,2)`**
2 decimal places. Sufficient for standard currency amounts (e.g., `1234567890.99`).

**Option B — `DECIMAL(18,6)`**
6 decimal places. Appropriate for unit pricing, commodity trading, or cryptocurrency.

### Analysis

| Dimension | Option A `DECIMAL(18,2)` | Option B `DECIMAL(18,6)` |
|---|---|---|
| Business context | ✅ NC Phase 1C is aggregate B2B quote value — 2dp is correct for standard fiat currency | ⚠️ 6dp is for unit pricing (e.g., per-gram metal pricing) or crypto — not the Phase 1C use case |
| TexQtic money doctrine | ✅ Platform is read-only audit/reporting; no money movement implied; 2dp is industry standard for fiat | N/A |
| Precision wastage | None | 4 extra decimal places stored and serialized for no Phase 1C benefit |
| ORM serialization | `Prisma.Decimal` → `String` in DTO in both cases | IDENTICAL |
| Reversibility | Hard — `ALTER COLUMN quote_amount TYPE DECIMAL(18,6)` is DDL; requires DB downtime window | Hard — same |
| Zod validation | `z.number().positive()` → no precision enforcement at route layer; both options equivalent | IDENTICAL |
| Future-proof concern | ⚠️ If Phase 1D introduces line-level quotes with per-unit pricing, 2dp may be insufficient | ✅ 6dp supports per-unit pricing without schema change |

### Phase 1D risk assessment for Option A

If Phase 1D introduces per-unit pricing (e.g., per-kg commodity quotes where unit price =
`0.001234`), `DECIMAL(18,2)` would truncate the value. This scenario is not in Phase 1C or
any currently authorized phase. The risk is real but speculative.

To mitigate: if per-unit pricing is anticipated, Option B `DECIMAL(18,6)` prevents a future
`ALTER COLUMN` at the cost of 4 extra decimal places now.

### Recommendation

**Option A — `DECIMAL(18,2)`.** Phase 1C quote amounts are aggregate B2B fiat quote values
(e.g., "GBP 85,000.00 for the full pool demand"). 2dp is correct and industry-standard for
this scenario. If Phase 1D introduces per-unit pricing, that will be a new column on a new
`NetworkPoolRfqQuoteLine` model — not an ALTER on the aggregate `quote_amount`.

**Required: Paresh authorization before Packet 11 begins.**
_Paresh may also choose Option B if per-unit pricing is planned for Phase 1D._

---

## §12 — Q-7: Currency Representation (Free-Form vs FK)

### Decision question

Should `currency` be:

**Option A (Design recommendation) — Free-form `VARCHAR(10)`.** ISO 4217 code accepted as-is.
Service validation: `length(currency) >= 3 AND length(currency) <= 10`. No FK. No currencies table.

**Option B — FK to a `currencies` table.**
`currency_id UUID FK → currencies(id)`. Requires a `currencies` table to be created (does not exist).

### Analysis

| Dimension | Option A (free-form — recommended) | Option B (FK) |
|---|---|---|
| Current state | ✅ No currencies table exists in `schema.prisma` | ❌ Requires creating `currencies` table — new entity outside Phase 1C scope |
| ISO 4217 compliance | ✅ 3-char ISO codes (USD, GBP, EUR, AED, etc.) fit within VARCHAR(10). Length validation enforces basic correctness | ✅ FK enforces controlled vocabulary |
| Implementation complexity | ✅ Zero extra schema work; validation at service layer | ❌ New table, migration, seed data (all ISO 4217 codes), service-layer lookup — adds 1–2 packets |
| Phase 1D normalization path | ✅ Free-form can be normalized later via: `ADD COLUMN currency_id FK; UPDATE ... SET currency_id = (SELECT id FROM currencies WHERE code = currency); DROP COLUMN currency` | IDENTICAL end-state |
| Codebase precedent | ✅ `rfq.totalQty` uses `qty_unit VARCHAR(50)` free-form. Same pattern. | ❌ No FK-based unit/currency pattern in current NC schema |
| Validation at route layer | `z.string().min(3).max(10)` — catches length violations | Service-layer `findUnique` on currencies table; 404 if invalid code |
| Reversibility | Medium — normalization migration needed later; safe if currencies table is added before normalization | N/A |

### Recommendation

**Option A — Free-form `VARCHAR(10)` Phase 1C.** Consistent with the `qty_unit` precedent.
Creating a currencies table is a new entity outside Phase 1C scope. ISO 4217 validation is
enforced at the route layer via length constraints and can be extended to an explicit code
list in Phase 1D.

**Required: Paresh authorization before Packet 11 begins.**

---

## §13 — Q-8: GET /quote Read Route Timing (Phase 1C vs Phase 1D)

### Decision question

Should `GET /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` be included in
Phase 1C (Packet 13) or deferred to Phase 1D?

**Option A (Design recommendation) — Include GET /quote in Phase 1C.**
Phase 1C Packet 13 delivers both:
- `POST /supplier-rfq-invites/:inviteId/quote` — submit
- `GET /supplier-rfq-invites/:inviteId/quote` — read back submitted quote

**Option B — Defer GET /quote to Phase 1D.**
Only `POST` is delivered in Phase 1C. GET is deferred.

### Analysis

| Dimension | Option A (include GET — recommended) | Option B (defer GET) |
|---|---|---|
| FE-8 unblock | ✅ FE-8 quote form needs to check on page load whether a quote has already been submitted (prevents duplicate submit UI) | ❌ **FE-8 remains effectively blocked** — without GET, the frontend cannot detect whether a quote was already submitted and cannot render the correct state |
| Implementation complexity | ✅ GET is trivially simple: `findFirst({ where: { inviteId, supplierOrgId: orgId } })` — 5 lines of service code | N/A |
| Test coverage | Adds SQR-11 and SQR-12 (trivial) | Saves 2 test cases |
| Phase 1C scope discipline | ⚠️ Adds 1 route to Packet 13 | ✅ Minimal |
| FE-8 usability | ✅ Form can initialize with existing quote data if already submitted (edit-aware UX) | ❌ Form cannot know if quote was submitted; duplicate submit attempt → 409 QUOTE_ALREADY_SUBMITTED error — poor UX |
| Reversibility | Soft — trivial additive route | Soft — trivial additive in Phase 1D |
| Blocking risk | None | **CRITICAL** — FE-8 cannot be properly functional without GET |

### FE-8 dependency chain on GET /quote

```
FE-8 component mounts
→ GET /supplier-rfq-invites/:inviteId/quote
  → 200 with quote data: render quote details + "already submitted" state
  → 404 SUPPLIER_QUOTE_NOT_FOUND: render submit form
```

Without this GET route, the FE-8 component cannot determine which state to render. The
submit form cannot prevent a second submit attempt. Even if the backend rejects duplicates
with a 409, the UX is broken — the user sees an error instead of the existing quote.

This GET route is **effectively a prerequisite for FE-8 being functional**, not just a
nice-to-have enhancement.

### Recommendation

**Option A — Include GET /quote in Phase 1C (Packet 13).** The GET route is a prerequisite
for FE-8 to be fully functional. Its implementation cost is minimal (1 service query, 1 route
handler, 2 test cases). Deferring it would effectively keep FE-8 blocked even after Packet 13
is delivered.

**Required: Paresh authorization before Packet 13 begins.**

---

## §14 — Hidden-Risk Review of QD-1 through QD-8 (Design-Locked Decisions)

The following decisions are **locked** in the parent design packet (§6.2 of DESIGN-001).
This section reviews each for hidden implementation risks that may affect Packets 11–13.

| ID | Locked decision | Hidden risks to flag before implementation |
|----|-----------------|-------------------------------------------|
| **QD-1** | Invite must be in ACCEPTED status (effective, per OD-2 lazy-EXPIRED check) before quote may be submitted | `computeEffectiveInviteStatus(invite)` must be called, not just a DB column check. Implementation must NOT use `invite.status === 'ACCEPTED'` directly — must use `computeEffectiveInviteStatus` to catch lazy-EXPIRED invites. Test SQ-04 must cover this boundary. |
| **QD-2** | One quote per invite — `UNIQUE(invite_id)` non-partial | Superseded by Q-5 (authorized in this audit). Consistent with Q-5 recommendation. No conflict. |
| **QD-3** | No lazy-expiry for quotes in Phase 1C | `validity_until` is stored but not computed. Implementation must NOT add any `computeEffectiveQuoteStatus` function in Phase 1C — adding one is out-of-scope scope creep. The field is stored only. |
| **QD-4** | `quoteAmount` + `currency` required; `validityUntil` + `supplierNote` optional | Zod strict schema at route layer: both required fields are validated `z.number().positive()` and `z.string().min(3).max(10)`. No service-level default. Implementation must reject `quote_amount = 0` (CHECK constraint + Zod). |
| **QD-5** | `metadataInternalJson` is NEVER exposed to suppliers | `toQuoteSupplierRecord` helper MUST exclude `metadata_internal_json`. `assertSupplierSafeQuoteShape` test helper MUST assert its absence. This is a test-enforced invariant, not just a comment. |
| **QD-6** | Quote feature gate is independent of invite gate | `ncPoolSupplierQuoteFeatureGate.middleware.ts` checks ONLY `nc.procurement_pools.supplier_quotes.enabled`. It does NOT check the parent invite gate. Route test SQR-04 must explicitly test: invite gate enabled + quote gate disabled → 503/403. |
| **QD-7** | Direct lifecycle log only — `StateMachineService.transition()` is NEVER called | Critical: the SM's `transition()` validates `allowedTransitions`. The QUOTED state is the RFQ status (not pool state). The SM governs pool state; calling `SM.transition()` for RFQ ISSUED→QUOTED would fail or cause an unintended pool state write. Implementation must use `tx.networkPoolRfq.update()` directly + `tx.networkLifecycleLog.create()` directly. |
| **QD-8** | RFQ ISSUED→QUOTED written directly via `tx.networkPoolRfq.update()` | Service step 9 must check `invite.rfq.status === 'ISSUED'` before updating. If RFQ is already QUOTED (concurrent quote from different supplier), step 9 must skip the update. This requires reading the RFQ status from the invite join in step 1, not re-querying in step 9 (to avoid TOCTOU within the transaction). |

### Critical hidden risk: QD-8 TOCTOU note

In `submitQuote` step 1, the service fetches the invite with RFQ join:
```typescript
findFirst({ where: { id: inviteId, supplierOrgId: orgId }, include: { rfq: true } })
```
The RFQ status read here (inside the `$transaction`) is the value used in step 9. This is
correct: Prisma `$transaction` with default isolation level is READ COMMITTED in PostgreSQL.
Two concurrent transactions can both read ISSUED and both attempt the update. This is
**safe** because:
1. `UNIQUE(invite_id)` prevents two quotes from the same invite (concurrent submissions
   of the SAME invite are blocked by the unique constraint on insert).
2. If two DIFFERENT invites are submitted concurrently and both see ISSUED:
   - First committing transaction updates RFQ to QUOTED.
   - Second committing transaction's `=== 'ISSUED'` check inside the transaction reads
     the status from the beginning of its own transaction (READ COMMITTED). If the first
     committed before the second's check, the second sees QUOTED and skips the update.
   - If both read ISSUED before either commits: both attempt `UPDATE ... SET status = 'QUOTED'`
     where `status = 'QUOTED'` is not a conditional — it is an unconditional SET. Both
     updates succeed (last writer wins, both set QUOTED). No data corruption.
3. Result: ISSUED→QUOTED is idempotent under concurrent first-quote submissions.

This is already captured in §15.1 race condition note of DESIGN-001. Flagging here for
Packet 12 implementer awareness.

---

## §15 — Packet Sequencing Recommendation

### 15.1 Prerequisites for each packet

| Packet | Hard prerequisite | Can begin when |
|---|---|---|
| 11 (Schema) | Q-2, Q-5, Q-6, Q-7 authorized | Paresh authorizes all 4 |
| 12 (Service) | Packet 11 COMPLETE; `NetworkPoolRfqSupplierQuote` in `schema.prisma`; `prisma generate` PASS | Packet 11 closed |
| 13 (Route) | Packet 12 COMPLETE; Q-1, Q-3, Q-4, Q-8 authorized | Packet 12 closed + all 4 authorized |
| FE-8 unblock | Packet 13 COMPLETE; Paresh explicitly authorizes FE-8 | Separate authorization step |

### 15.2 Feature gate middleware placement

The new `ncPoolSupplierQuoteFeatureGate.middleware.ts` is created in **Packet 12** (Service),
not Packet 13 (Route). Rationale:

- The service integration tests (Packet 12) need to confirm the gate functions independently
  of the invite gate (QD-6 / SQR-04 requirement).
- Moving middleware creation to Packet 12 means Packet 13 just imports and uses it — simpler
  route file authoring.
- This mirrors the Phase 1B pattern: `ncPoolSupplierInviteFeatureGate.middleware.ts` was
  created alongside the service work, not as a separate step.

### 15.3 `assertSupplierSafeQuoteShape` test helper

Must be defined in Packet 12 (service tests) in `poolRfqSupplierQuotes.integration.test.ts`.
Will be re-used by Packet 13 route tests (SQR-05, SQR-11). Follow the Phase 1B
`assertSupplierSafeShape` precedent.

### 15.4 Tracker note

The Tracker document records Packets 10–13 as `NOT_STARTED`. After this audit:
- Packet 10 status is `DESIGN_COMPLETE` (committed at `900ea66`).
- Packets 11–13 remain `NOT_STARTED` until individual authorization.

The Tracker document itself is **not** updated in this audit packet. It captures a
historical snapshot. Control state is authoritative in `NEXT-ACTION.md` and
`GOVERNANCE-CHANGELOG.md`.

### 15.5 RLS policy note

The new `network_pool_rfq_supplier_quotes` table requires RLS policies:
- **Supplier read:** `supplier_org_id = current_setting('app.org_id')::uuid`
- **Owner read:** `owner_org_id = current_setting('app.org_id')::uuid`
- **Insert:** `supplier_org_id = current_setting('app.org_id')::uuid`

RLS policy SQL should be drafted as part of Packet 11 (Schema) alongside the table creation
SQL. This is not currently captured in the design doc and is a minor gap. The Packet 11
author must include RLS policies in the migration SQL before applying.

---

## §16 — Final Recommendation Table

| ID | Decision | Recommendation | Authorization level | Must resolve before |
|----|----------|---------------|---------------------|---------------------|
| **Q-1** | Route path | **Invite-anchored** `/supplier-rfq-invites/:inviteId/quote` in dedicated plugin | Paresh required | Packet 13 |
| **Q-2** | Schema approach | **Dedicated `NetworkPoolRfqSupplierQuote` table** (not RFQ fields) | Paresh required | Packet 11 |
| **Q-3** | `withdrawQuote` timing | **Defer to Phase 1D** — WITHDRAWN columns in schema; route deferred | Paresh required | Packet 13 |
| **Q-4** | Owner read timing | **Defer to Phase 1D** — OwnerRecord DTO designed; route deferred | Paresh required | Packet 13 |
| **Q-5** | UNIQUE constraint | **Non-partial** `UNIQUE(invite_id)` — consistent with OD-1 | Paresh required | Packet 11 |
| **Q-6** | Amount precision | **`DECIMAL(18,2)`** — standard fiat money precision | Paresh required | Packet 11 |
| **Q-7** | Currency representation | **Free-form `VARCHAR(10)`** — ISO 4217; normalize in Phase 1D if needed | Paresh required | Packet 11 |
| **Q-8** | GET /quote timing | **Include in Phase 1C** — prerequisite for FE-8 functional unblock | Paresh required | Packet 13 |

Minimum authorization set before Packet 11 begins: **Q-2 + Q-5 + Q-6 + Q-7.**
Minimum authorization set before Packet 13 begins: **Q-1 + Q-3 + Q-4 + Q-8.**

---

## §17 — Explicit Paresh Authorization Checklist

The following items require Paresh's explicit authorization before the indicated packet may
begin. No implementation work is authorized without these decisions.

**For Packet 11 (Schema) to begin — authorize all of the following:**

- [x] **Q-2 AUTHORIZED:** Dedicated `NetworkPoolRfqSupplierQuote` table (not quote fields on `network_pool_rfqs`)
- [x] **Q-5 AUTHORIZED:** Non-partial `UNIQUE(invite_id)` constraint (one quote per invite in Phase 1C)
- [x] **Q-6 AUTHORIZED:** `quote_amount DECIMAL(18,2)` — standard 2-decimal-place money precision
- [x] **Q-7 AUTHORIZED:** Free-form `VARCHAR(10)` currency representation (ISO 4217; no currencies table)

**For Packet 13 (Route) to begin — authorize all of the following:**

- [x] **Q-1 AUTHORIZED:** Invite-anchored route path `/supplier-rfq-invites/:inviteId/quote` (deviates from tracker placeholder)
- [x] **Q-3 AUTHORIZED:** `withdrawQuote` deferred to Phase 1D (WITHDRAWN columns still in Phase 1C schema)
- [x] **Q-4 AUTHORIZED:** Owner read route deferred to Phase 1D (FE-9 will remain blocked until Phase 1D)
- [x] **Q-8 AUTHORIZED:** GET `/supplier-rfq-invites/:inviteId/quote` read route included in Phase 1C (required for FE-8 functional unblock)

**Additional confirmation (no change required — just acknowledge):**

- [x] **QD-1 through QD-8 CONFIRMED:** All Phase 1C locked decisions in §6.2 of DESIGN-001 remain unchanged (no amendments)
- [x] **PRQ-28 + SRI-11 ACKNOWLEDGED:** These guards must not regress through Packets 11–13

**Once all items in the Packet 11 set are checked, Packet 11 is authorized to begin.**
**Once all items in the Packet 13 set are checked, Packet 13 is authorized to begin.**

---

## §18 — DPP Hold Key Confirmation

The following governed posture keys from `NEXT-ACTION.md` are **UNCHANGED** by this packet
and must remain unchanged through all subsequent Phase 1C implementation packets:

| Key | Value | Status |
|---|---|---|
| `active_delivery_unit` | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001` | ADVANCED — Packet 11 authorized 2026-05-11 |
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` | PRESERVED — UNCHANGED |
| `dpp_passport_network_readiness` | `PRODUCTION_READY` | PRESERVED — UNCHANGED |
| `dpp_readiness_authority` | `TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002` | PRESERVED — UNCHANGED |
| `dpp_readiness_commit` | `17c252c` | PRESERVED — UNCHANGED |
| `dpp_v3_design_status` | `OPTIONAL_POLISH` | PRESERVED — UNCHANGED |

`active_delivery_unit` was advanced by the Paresh authorization event (2026-05-11) from
`HOLD_FOR_AUTHORIZATION` to `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001`.
All DPP hold keys (`dpp_launch_authorization`, `dpp_passport_network_readiness`,
`dpp_readiness_authority`, `dpp_readiness_commit`, `dpp_v3_design_status`) remain UNCHANGED.
DPP Passport Network launch requires a separate, independent Paresh authorization event.

---

## §19 — Final Status

```
TEXQTIC_NC_PHASE1_POOL_RFQ_SUPPLIER_QUOTE_DECISION_AUDIT_001_PARESH_AUTHORIZED
```

All 8 open decisions (Q-1 through Q-8) have been analyzed, recommendations stated, and
Paresh's explicit authorization received on 2026-05-11. All Q decisions match the design
recommendations; no amendments. Packet 11 (Schema) is now authorized to begin.

This packet is `PLANNING_ONLY`. No schema, service, route, middleware, test, or frontend file
was modified by this packet.

---

## §20 — Formal Authorization Record

**Date:** 2026-05-11  
**Authorizer:** Paresh Patel (Founder)  
**Authorization basis:** Explicit Paresh response to DECISION-AUDIT-001 §17 checklist

### Packet 11 (Schema) gate — all AUTHORIZED ✓

| Decision | Authorized option |
|---|---|
| **Q-2** | Dedicated `NetworkPoolRfqSupplierQuote` table (`network_pool_rfq_supplier_quotes`). Do not add quote fields to `network_pool_rfqs`. |
| **Q-5** | Non-partial `UNIQUE(invite_id)` constraint. One quote per invite in Phase 1C. Quote re-submission deferred. |
| **Q-6** | `quote_amount DECIMAL(18,2)`. |
| **Q-7** | Free-form `currency VARCHAR(10)`, ISO-style currency text. Validated at service/route layer. No currencies table in Phase 1C. |

### Packet 13 (Route) gate — all AUTHORIZED ✓

| Decision | Authorized option |
|---|---|
| **Q-1** | Invite-anchored routes: `POST /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` and `GET /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote`. |
| **Q-3** | `withdrawQuote` route deferred to Phase 1D. Packet 11 schema must still include `WITHDRAWN` status in CHECK constraint, `withdrawn_at`, and `withdraw_reason` columns. |
| **Q-4** | Owner read-only quote list route deferred to Phase 1D. Owner DTO design documented; no owner route in Phase 1C. |
| **Q-8** | `GET /supplier-rfq-invites/:inviteId/quote` included in Phase 1C. Required for FE-8 to detect existing submitted quote state. |

### Confirmations

| Item | Status |
|---|---|
| **QD-1 through QD-8** | CONFIRMED — no amendments to locked Phase 1C design decisions |
| **PRQ-28** | ACKNOWLEDGED — `expect(data).not.toHaveProperty('quotes')` must not regress through Packets 11–13 |
| **SRI-11** | ACKNOWLEDGED — `expect(record['quote_amount']).toBeUndefined()` must not regress through Packets 11–13 |

### Effective authorization state after this record

| Packet | Authorization state |
|---|---|
| Packet 11 (Schema) | **AUTHORIZED — may begin** |
| Packet 12 (Service) | BLOCKED on Packet 11 COMPLETE |
| Packet 13 (Route) | BLOCKED on Packet 12 COMPLETE |
| FE-8 unblock | BLOCKED on Packet 13 VERIFIED_COMPLETE + separate Paresh authorization |

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001*
