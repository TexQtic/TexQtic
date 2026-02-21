# WAVE 2 — STABILIZATION
Status: NOT STARTED
Branch: wave-2-stabilization

---

# 🔴 CRITICAL PATH

- [ ] G-001 — RLS context variable unification (`app.tenant_id` → `app.org_id` in all policies)
- [ ] G-002 — FORCE RLS on all tenant commerce tables (`carts`, `orders`, `order_items`, `catalog_items`, `cart_items`)
- [ ] G-003 — Add SELECT + INSERT RLS policies for `orders` + `order_items`
- [ ] G-013 — CI 0-row cross-tenant proof (automated, PR-gated)

---

# 🟡 STABILIZATION TASKS

- [ ] G-004 — Remove dual `withDbContext`; unify `control.ts` to canonical pattern (`src/lib/database-context.ts`)
- [ ] G-005 — Standardize middleware: ALL tenant routes use `[tenantAuthMiddleware, databaseContextMiddleware]`
- [ ] G-006 — Align admin bypass to new context model (control-plane realm check replaces `app.is_admin`)
- [ ] G-007 — Fix `supabase_hardening.sql` `set_config(..., false)` → `true` (transaction-local, pooler-safe)
- [ ] G-008 — Add `schema_version` + `reasoning_hash` FK to `EventLog` schema
- [ ] G-009 — Seed `OP_PLATFORM_READ_ONLY` and `OP_AI_AUTOMATION_ENABLED` feature flags
- [ ] G-010 — Implement tax/fee computation in checkout (replace stub)
- [ ] G-011 — Add impersonation session routes to `control.ts`
- [ ] G-012 — Replace `emailStubs.ts` with real email provider integration
- [ ] G-014 — Refactor `POST /tenant/activate` to single transaction (remove nested `tx.$transaction`)

---

# Completion Gate

Wave 2 is complete ONLY when ALL of the following are true:

- [ ] All Critical Path gaps status = VALIDATED
- [ ] RLS Compliance Ledger updated in `governance/coverage-matrix.md`
- [ ] CI cross-tenant 0-row proof exists and passes on PR
- [ ] `coverage-matrix.md` reflects new statuses
- [ ] `gap-register.md` shows all W2 gaps = VALIDATED
- [ ] Full commerce regression (auth → cart → checkout → orders) passes
- [ ] Wave tagged in Git (`git tag wave-2-complete`)
- [ ] Wave entry logged in `governance/wave-execution-log.md`

---

# Evidence Required Per Gap

| Gap ID | Minimum Proof |
|--------|--------------|
| G-001 | `pg_policies` shows `app.org_id` in all `qual`/`with_check` expressions; cross-tenant 0-row query returns 0 |
| G-002 | `SELECT relname, relforcerowsecurity FROM pg_class WHERE relname IN (...)` returns `true` for all commerce tables |
| G-003 | `SELECT * FROM pg_policies WHERE tablename IN ('orders','order_items')` shows SELECT + INSERT policies |
| G-013 | CI run output shows 0-row assertion passing; linked PR |
| G-004 | `grep -r "withDbContextLegacy\|from '../db/withDbContext'" server/src/routes` returns no results |
| G-005 | All routes in `tenant.ts` use `[tenantAuthMiddleware, databaseContextMiddleware]` in `onRequest` |
| G-006 | Admin routes tested with non-admin token → 403; with admin token → 200 |
| G-007 | All `set_config` in `supabase_hardening.sql` use `true` (third argument) |
| G-008 | `prisma/schema.prisma` shows `schemaVersion` and `reasoningHash` on `EventLog` |
| G-009 | `SELECT key FROM feature_flags WHERE key IN ('OP_PLATFORM_READ_ONLY','OP_AI_AUTOMATION_ENABLED')` returns 2 rows |
| G-014 | Activation flow works; no `$transaction` nesting inside `withDbContext` |
