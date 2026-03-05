# TEXQTIC — GAP REGISTER

Last Updated: 2026-03-05 (GOVERNANCE-SYNC-089 — G-026-CUSTOM-DOMAIN-ROUTING-DESIGN-001 → ✅ DESIGN ANCHOR COMPLETE: D1–D8 locked; D1=Hybrid (Edge Middleware + Backend validation); D2=Platform subdomains v1 (<slug>.texqtic.app), custom domains deferred v1.1; D3=Backend resolver endpoint HMAC-signed (GET /api/internal/resolve-domain); D4=Narrow BYPASSRLS resolver via texqtic_service role (SELECT tenants(id,slug) only); D5=Edge in-memory TTL cache 60s + webhook invalidation; D6=Internal signed resolver contract {tenantId,tenantSlug,canonicalHost,status}, identical 404 for all non-resolved; D7=x-texqtic-tenant-id+x-texqtic-tenant-source+x-texqtic-resolver-sig headers; strip inbound x-texqtic-* before injection; Fastify validates HMAC; D8=Fail-closed; cache-invalidate webhook on domain CRUD; platform domain passthrough allowlist; G-026-B..G resolved by design; G-026-A deferred v1.1; G-026-H registered (texqtic_service role not yet created — blocking 6C1 deploy); design doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md; TECS sequence: 6C1→6C2→6C3→6D; no code/schema/RLS changes; GOVERNANCE-SYNC-089)
(GOVERNANCE-SYNC-088 — G-026-CUSTOM-DOMAIN-ROUTING-DISCOVERY-001 → 🔄 IN PROGRESS (Discovery Complete): tenant_domains schema audited — 6 columns confirmed (domain UNIQUE, tenant_id FK CASCADE, verified bool, primary bool); FORCE RLS=t confirmed; G-006C Wave 3 Tail canonical RLS applied (GOVERNANCE-SYNC-054); NO host-header routing exists anywhere in codebase — tenantAuthMiddleware JWT-only, tenantContext.ts X-Tenant-Id removed (G-W3-A1), realmGuard URL-prefix only, vercel.json no edge middleware, api/index.ts no host handling, MiddlewareScaffold.tsx UI stub only; 3 routing insertion options documented (A: Vercel Edge Middleware, B: Fastify pre-auth hook, C: Hybrid); DNS architecture specified; 7 gaps registered (G-026-A through G-026-G); STOP CONDITION NOT TRIGGERED; discovery doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DISCOVERY.md; no schema/code/RLS changes; GOVERNANCE-SYNC-088)
(GOVERNANCE-SYNC-087 — G-025-DPP-API-UI-MANUFACTURER-ENABLE-001 → ✅ VALIDATED: tenant.ts DPP handler updated — SELECT now includes manufacturer_name/jurisdiction/registration_no from view; manufacturer fields added to product response object; meta.manufacturerFields sentinel removed; DPPPassport.tsx updated — amber omission banner removed; manufacturer sub-section added to Product Identity card (renders value or ‘Manufacturer details unavailable’); omission note div removed; server typecheck EXIT 0; lint EXIT 0; G-025 DPP end-to-end manufacturer fields fully enabled; GOVERNANCE-SYNC-087)
(GOVERNANCE-SYNC-086 — G-025-DPP-VIEWS-MANUFACTURER-RESTORE-001 → ✅ VALIDATED: migration `20260316000003_g025_dpp_views_manufacturer_restore` applied to remote Supabase via psql; APPLY_EXIT:0; VERIFIER PASS: dpp_snapshot_products_v1 recreated with manufacturer_name (organizations.legal_name), manufacturer_jurisdiction (organizations.jurisdiction), manufacturer_registration_no (organizations.registration_no) via LEFT JOIN organizations ON id=org_id; security_invoker=true preserved; texqtic_app SELECT grant intact; RESOLVE_EXIT:0 (79 migrations, schema up to date); typecheck EXIT 0; lint EXIT 0; DPP manufacturer fields fully restored post G-025-ORGS-RLS-001 fix; GOVERNANCE-SYNC-086)
(GOVERNANCE-SYNC-085 — G-025-ORGS-RLS-TENANT-SELECT-001 → ✅ VALIDATED: migration `20260316000002_g025_orgs_rls_tenant_select` applied to remote Supabase via psql; APPLY_EXIT:0; VERIFIER PASS: FORCE RLS=t+t confirmed, `organizations_guard_policy` RESTRICTIVE ALL with 3 arms (bypass_enabled + current_realm='admin' + require_org_context), `organizations_tenant_select` PERMISSIVE SELECT USING (id=app.current_org_id()) created, all 3 control-plane policies unchanged, texqtic_app SELECT grant intact; RESOLVE_EXIT:0 (78 migrations, schema up to date); typecheck EXIT 0; lint EXIT 0; G-025-ORGS-RLS-001 → ✅ VALIDATED; unblocks manufacturer fields restoration to DPP views (follow-on TECS 5C); GOVERNANCE-SYNC-085)
(GOVERNANCE-SYNC-084 — G-025-ORGS-RLS-DISCOVERY-001 → ✅ DISCOVERY COMPLETE: organizations RLS audited via psql; relrowsecurity=t + relforcerowsecurity=t CONFIRMED; 4 RLS policies: guard RESTRICTIVE ALL (bypass_enabled() OR realm='admin') — NO TENANT ARM; organizations_control_plane_select/insert/update PERMISSIVE (admin/bypass only); NO tenant SELECT policy; texqtic_app SELECT grant only; id=PK (UUID) is tenancy key (id=app.current_org_id()); no tenant_id or org_id column; tenancy predicate: `id = app.current_org_id()`; STOP CONDITION: NOT TRIGGERED — no schema change needed; consumers: 3 callers via withOrgAdminContext / getOrganizationIdentity (G-015 Phase C workaround) in tenant.ts + auth.ts; DPP SECURITY INVOKER views blocked (guard hard-blocks tenant realm); discovery doc: docs/security/ORGANIZATIONS-RLS-DISCOVERY.md; proposal for TECS 5B: add require_org_context() arm to guard + new PERMISSIVE tenant SELECT `id=app.current_org_id()`; no SQL executed, no code changed; G-025-ORGS-RLS-001 → 🔄 IN PROGRESS (TECS 5B implementation pending))
(GOVERNANCE-SYNC-083 — G-025-DPP-SNAPSHOT-UI-EXPORT-001 → ✅ TECS 4D VALIDATED: DPPPassport.tsx added to components/Tenant/; UUID input + client-side validation; tenantGet<DppSnapshot>('/api/tenant/dpp/:nodeId') fetch; loading/error/404 states; always-visible amber banner: 'Manufacturer fields omitted due to G-025-ORGS-RLS-001'; Product Identity / Certifications / Lineage sections rendered; Lineage capped at 200 rows; Export: Copy JSON (window.navigator.clipboard) + Download JSON (dpp_<nodeId>.json Blob anchor); App.tsx: expView union 'HOME'|'ORDERS'|'DPP' + DPPPassport guard + onNavigateDpp prop; Shells.tsx: onNavigateDpp? added to ShellProps + DPP Passport nav button in all 4 experience shells (AggregatorShell/B2BShell/B2CShell/WhiteLabelShell); typecheck EXIT 0; lint EXIT 0 (0 errors); G-025 → ✅ VALIDATED (v1 shipped: schema TECS 4A + views TECS 4B + API TECS 4C + UI/export TECS 4D); G-025-ORGS-RLS-001 still open — organizations canonicalization required before manufacturer fields restored to DPP surfaces)
(GOVERNANCE-SYNC-082 — G-025-DPP-SNAPSHOT-API-001 → ✅ TECS 4C VALIDATED: GET /api/tenant/dpp/:nodeId added to server/src/routes/tenant.ts; queries dpp_snapshot_products_v1/lineage_v1/certifications_v1 via $queryRaw (parameterized Prisma tagged templates — no string interpolation); SECURITY INVOKER inheritance via withDbContext (tenant context set; no SECURITY DEFINER); 404 on empty product row (RLS gate — node hidden from cross-tenant actors); no organizations JOIN anywhere (G-025-ORGS-RLS-001 enforced; manufacturer fields omitted from response with explicit meta.manufacturerFields='omitted_due_to_G-025-ORGS-RLS-001'); writeAuditLog: action=tenant.dpp.read, entity=traceability_node; query method: $queryRaw tagged template (3 view queries; all parameterized); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); G-025 → TECS 4C ✅ IN PROGRESS → TECS 4D UI/export next; G-025-ORGS-RLS-001 still open — organizations canonicalization required before manufacturer fields restored)
(GOVERNANCE-SYNC-081 — G-025-DPP-SNAPSHOT-VIEWS-IMPLEMENT-001 → ✅ TECS 4B VALIDATED: D2 APPROVED (Paresh, 2026-03-04) — v1 field surface confirmed (batch_id, node_type, meta, geo_hash, visibility, lineage recursive traversal, node-linked certs via node_certifications); D4 GATE FAIL — organizations SELECT policy is admin/bypass-only (no tenant org_id arm); Gap G-025-ORGS-RLS-001 registered (organizations needs canonical Wave 3 Tail RLS before manufacturer fields can be included in views); manufacturer_* columns removed from dpp_snapshot_products_v1; 3 SQL views created (SECURITY INVOKER, security_invoker=true in pg_class.reloptions): dpp_snapshot_products_v1 (node identity), dpp_snapshot_lineage_v1 (recursive CTE depth-cap=20, cycle-guard via visited UUID array), dpp_snapshot_certifications_v1 (LEFT JOIN node_certifications → certifications); PREFLIGHT PASS (all base columns confirmed); VERIFIER PASS: products=1, lineage=1, certifications=1, all security_invoker=on; GRANT SELECT TO texqtic_app on all 3 views; RESOLVE_EXIT:0; PULL 43 models; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0 (0 errors); migration 20260316000001_g025_dpp_snapshot_views; G-025 → TECS 4B ✅ (TECS 4C API layer next)) migration `20260316000000_g025_node_certifications` applied to remote Supabase; PREFLIGHT PASS (all FK targets confirmed); CREATE TABLE public.node_certifications (M:N join: org_id+node_id+certification_id, UNIQUE constraint); ENABLE+FORCE RLS; 1 RESTRICTIVE guard (FOR ALL TO texqtic_app: require_org_context OR is_admin OR bypass_enabled) + 4 PERMISSIVE (SELECT/INSERT tenant+admin arms; UPDATE/DELETE false); GRANT SELECT,INSERT TO texqtic_app; relrowsecurity=t relforcerowsecurity=t confirmed; RESOLVE_EXIT:0; PULL 43 models; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0 (0 errors); D1 APPROVED (Paresh, 2026-03-04); G-025-B partially closed; GOVERNANCE-SYNC-080)
(GOVERNANCE-SYNC-079 — G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001 → 🔄 IN PROGRESS (Design Anchor complete; Implementation pending): decisions D1–D6 locked; D1 cert-to-node linkage resolved as Option C (join table `node_certifications` — M:N, FORCE RLS, no modification to existing verified tables); D2 v1 field surface defined (batch_id, org legal_name/jurisdiction/registration_no, lineage chain, org-level certs); D3 locked to Option A Live SQL Views (RLS inherited, mandatory per doctrine); D4 organizations RLS gate defined (must PASS before TECS 4B); D5 opaque strings for v1 (no enum enforcement); D6 traversal spec locked (depth cap 20, visited UUID array cycle guard, depth ASC + created_at ASC); 3 view contracts defined: `dpp_snapshot_products_v1`, `dpp_snapshot_lineage_v1`, `dpp_snapshot_certifications_v1`; TECS sequence 4A/4B/4C/4D structured; approval gates: D1 + D2 + D4 pending Paresh sign-off; gaps G-025-A..H mapped to v1 status; design doc: `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md`; no schema changes, no migrations, no views, no server/src changes)
(GOVERNANCE-SYNC-078 — G-025-DPP-SNAPSHOT-VIEWS-INVESTIGATION-001 → 🔄 IN PROGRESS (Discovery phase): schema inventory complete; `traceability_nodes` + `traceability_edges` (G-016 Phase A, GOVERNANCE-SYNC-009) + `certifications` (G-019, GOVERNANCE-SYNC-008) analyzed; canonical Wave 3 Tail RLS confirmed on all 3 tables (FORCE RLS=t, 1 RESTRICTIVE guard + 4 PERMISSIVE policies); STOP CONDITION triggered: certifications has no FK to traceability_nodes or any product identifier — org-level join only; Schema Gaps documented: G-025-A (no suppliers/facilities/product_batches tables), G-025-B (missing cert-to-node FK + issuing_body/cert_number columns), G-025-C (no lineage hash), G-025-D (no node_type/edge_type enum enforcement), G-025-E (no edge ordinal); RLS view inheritance safe for live SQL views (FORCE RLS fires on base tables); materialized views exempt from RLS — critical risk documented; 3 snapshot strategies compared (A: live view, B: mat-view, C: hybrid); discovery document: `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md`; no schema changes, no migrations, no view creation; G-025 → IN PROGRESS Discovery)
(GOVERNANCE-SYNC-077 — OPS-CI-RLS-DOMAIN-PROOF-001 → ✅ VALIDATED: added DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS step to `server/scripts/ci/rls-proof.ts`; table: `escalation_events` (org_id RLS boundary, Wave 3, FORCE RLS=t, GOVERNANCE-SYNC-076 canonical pattern); proof: SET LOCAL ROLE texqtic_app + app.org_id=Org-X context; cross-tenant count WHERE org_id != Org-X == 0 for both Tenant A + Tenant B; symmetric isolation confirmed; PASS: DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS printed; ci:rls-proof EXIT 0 (4/4 steps PASS); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); no DB touch — proof is read-only; RLS maturity CI Domain Table Coverage: 3/5 → 5/5; Composite RLS Maturity: 4.5/5 → 5.0/5; Phase A fully closed)
(GOVERNANCE-SYNC-076 — OPS-RLS-SUPERADMIN-001 → ✅ VALIDATED: migrations `20260315000008_ops_rls_superadmin_impersonation_sessions` + `20260315000009_ops_rls_superadmin_escalation_events` applied to remote Supabase via psql; APPLY_EXIT_008:0 + VERIFIER PASS [20260315000008] (FORCE RLS=t, 1 RESTRICTIVE guard FOR ALL, 4 PERMISSIVE SELECT/INSERT/UPDATE/DELETE: is_superadmin narrowing CONFIRMED, 0 {public} policies); RESOLVE_EXIT_008:0; APPLY_EXIT_009:0 + VERIFIER PASS [20260315000009] (FORCE RLS=t, admin INSERT narrowed is_superadmin CONFIRMED in WITH CHECK, tenant INSERT org_id intact, 2 SELECT + 2 INSERT policies, 0 UPDATE policies, no UPDATE/DELETE grants for texqtic_app); RESOLVE_EXIT_009:0; verifier fix: removed invalid {public}=0 check from migration 009 (escalation_events policies are public-role scoped by G-022 baseline design); RAISE string fix: formatter-split adjacent literals merged (commit 82ae0b3); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); OPS-RLS-SUPERADMIN-001 → ✅ VALIDATED)
(GOVERNANCE-SYNC-075 — OPS-RLS-SUPERADMIN-001-ESCALATION-INSERT-001: migration `20260315000009_ops_rls_superadmin_escalation_events/migration.sql` authored; narrows `escalation_events` admin INSERT arm to require BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`; tenant SELECT/INSERT UNCHANGED; no UPDATE/DELETE policies added (append-only table, immutability trigger is Layer 2 enforcement); verifier asserts 9 invariants including no UPDATE/DELETE grants for texqtic_app; SUPERADMIN-RLS-PLAN.md C.2 amended with correction (UPDATE policy never existed; admin INSERT is the correct surface); apply pending psql remote execution + `prisma migrate resolve --applied`; OPS-RLS-SUPERADMIN-001 → IN PROGRESS (both migrations 20260315000008 + 20260315000009 authored; neither yet applied to remote Supabase; VALIDATED only after both apply executions complete))
(GOVERNANCE-SYNC-074 — OPS-RLS-SUPERADMIN-001-IMPERSONATION-001: migration `20260315000008_ops_rls_superadmin_impersonation_sessions/migration.sql` authored; narrows `impersonation_sessions` INSERT/UPDATE/DELETE to require BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`; GUARD and SELECT UNCHANGED; pre-flight guard + self-verifier DO-block included; apply pending psql remote execution + `prisma migrate resolve --applied`; TECS 2C BLOCKED — spec mismatch: SUPERADMIN-RLS-PLAN.md C.2 references UPDATE policy on `escalation_events` but no such policy exists in the DB (table is append-only; trigger blocks UPDATE; only SELECT+INSERT policies present) — blocker report issued; typecheck/lint gates: SQL-only change, EXIT 0 expected. OPS-RLS-SUPERADMIN-001 → IN PROGRESS (TECS 2B authored; TECS 2C awaiting spec clarification))
(GOVERNANCE-SYNC-073 — OPS-RLS-SUPERADMIN-001-DB-APPROVAL-001: DB policy apply APPROVED for migrations `20260315000008_ops_rls_superadmin_impersonation_sessions` + `20260315000009_ops_rls_superadmin_escalation_events`; sign-off recorded in `docs/security/SUPERADMIN-RLS-PLAN.md` Section F.1; runbook added to `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md`; prerequisite: service write paths migrated commit `1f211d6`; Feature flags remain a KNOWN LIMITATION (BYPASSRLS path); no change. OPS-RLS-SUPERADMIN-001 → IN PROGRESS (Service complete; DB apply APPROVED; execution pending TECS 2B/2C))
(GOVERNANCE-SYNC-072 — OPS-RLS-SUPERADMIN-001-SERVICE-001 complete; `startImpersonation` + `stopImpersonation` migrated to `withSuperAdminContext` in `impersonation.service.ts`; `withSuperAdminEscalationContext` helper added to `escalation.g022.ts` for upgrade/resolve write paths (sets both `app.is_admin='true'` AND `app.is_superadmin='true'` tx-local); read paths (`getImpersonationStatus`, list/create escalations) unchanged; DB policies NOT yet applied (migrations `20260315000008` + `20260315000009` pending schema sign-off); Feature flags remain a KNOWN LIMITATION: route uses postgres-superuser/bare prisma upsert (BYPASSRLS); enforcement remains route-level `requireAdminRole('SUPER_ADMIN')` only. Provisioning tables (`tenants`, `memberships`) deferred to future sub-TECS; typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); OPS-RLS-SUPERADMIN-001 → IN PROGRESS (Service complete; DB apply pending))
(GOVERNANCE-SYNC-071 — OPS-RLS-SUPERADMIN-001-DISCOVERY-001: SUPER_ADMIN DB-level RLS enforcement discovery complete; target tables identified: `impersonation_sessions` (INSERT/UPDATE/DELETE narrow to `is_superadmin='true'`) + `escalation_events` (UPDATE narrow to `is_superadmin='true'`); service-layer change dependencies documented (`startImpersonation`/`stopImpersonation` must migrate to `withSuperAdminContext`); `feature_flags` marked KNOWN LIMITATION (postgres BYPASSRLS path); migration grouping proposal: 2 migrations (`20260315000008` + `20260315000009`); `docs/security/SUPERADMIN-RLS-PLAN.md` created; OPS-RLS-SUPERADMIN-001 → IN PROGRESS)
(GOVERNANCE-SYNC-070 — OPS-ORDERS-STATUS-ENUM-001: `public.order_status` enum extended with CONFIRMED + FULFILLED; CANCELLED verified present (not re-added); migration `20260315000007_ops_orders_status_enum_001` applied to Supabase; PREFLIGHT PASS + VERIFIER PASS; APPLY_EXIT:0; RESOLVE_EXIT:0; `prisma db pull` minimal diff (2 enum values only); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings))
(GOVERNANCE-SYNC-063 — GAP-ORDER-LC-001-UX-B6B-001 (B6b): `WLOrdersPanel.tsx` + `EXPOrdersPanel.tsx` — `deriveStatus(order, auditLogs)` + `BackendAuditEntry` + `AuditResponse` + `auditLogs` state + `Promise.all` audit-logs fetch all removed; `canonicalStatus(order)` reads `order.lifecycleState` directly; `LifecycleHistory` component renders `order.lifecycleLogs` newest-first inline in Status column; all `TODO(GAP-ORDER-LC-001)` comments removed from both panels; file headers updated; typecheck EXIT 0; lint EXIT 0; GAP-ORDER-LC-001 → ✅ CLOSED (orders.status enum extension deferred to separate TECS))
(GOVERNANCE-SYNC-060 — GAP-ORDER-LC-001-UX-VALIDATION-001 (B5): `validate-rcp1-flow.ts` Steps 3.2/4A.2/4B.2/4C.2/Phase5 replaced with Prisma-direct `order_lifecycle_logs` queries (audit-log seam removed); proof run 22 PASS 0 FAIL — checkout writes PAYMENT_PENDING log, SM enforces CONFIRMED/FULFILLED/CANCELLED transitions + terminal state enforcement (409), full chain integrity verified; STOP CONDITION declared: UI panels (`WLOrdersPanel.tsx` + `EXPOrdersPanel.tsx`) NOT modified — `deriveStatus()` audit-log hack cannot be removed until `GET /api/tenant/orders` exposes `lifecycleState` field (deferred to B6); typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-060A — OPS-ORDER-LC-LOGS-GRANT-001: `order_lifecycle_logs` base SELECT+INSERT GRANTs applied to `texqtic_app`+`app_user` via psql (DATABASE_URL, Supabase Postgres); ops file `server/prisma/ops/order_lifecycle_logs_grants.sql` created; APPLY_EXIT:0; verification: 4 rows in `information_schema.role_table_grants` (texqtic_app INSERT/SELECT + app_user INSERT/SELECT) ✅; unblocks checkout lifecycle write (PostgresError 42501 resolved); typecheck EXIT 0; lint EXIT 0; GAP-ORDER-LC-001 IN PROGRESS pending B5 UX validation)
(GOVERNANCE-SYNC-059 — GAP-ORDER-LC-001-BACKEND-INTEGRATION-001: app-layer order lifecycle workaround replaced with SM-driven transitions in `server/src/routes/tenant.ts` — checkout workaround `writeAuditLog(order.lifecycle.PAYMENT_PENDING)` replaced with direct `tx.order_lifecycle_logs.create()`; PATCH `/tenant/orders/:id/status` app-layer if/else validation replaced with `StateMachineService.transition()`; `makeTxBoundPrisma` helper added; optional `reason` field added to PATCH body schema; all `TODO(GAP-ORDER-LC-001)` comments removed; DB enum mapping preserved (CONFIRMED/FULFILLED→PLACED); typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-058 — GAP-ORDER-LC-001-SM-SERVICE-001: StateMachineService extended to enforce ORDER transitions — `EntityType` union now `'TRADE'|'ESCROW'|'CERTIFICATION'|'ORDER'`; ORDER branch added to `StateMachineService.transition()` writing to `order_lifecycle_logs` (actor_id=consolidated UUID, realm='tenant'|'admin'|'system', tenant_id=orgId denorm); `SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS` extended with 'FULFILLED' (ORDER non-decisional terminal); `prisma db pull` + `prisma generate` run to build `order_lifecycle_logs` Prisma model; schema.prisma updated; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-057 — GAP-ORDER-LC-001-SEED-001: 4 ORDER allowed_transitions seeded via `seed_state_machine.ts` upsert — PAYMENT_PENDING→CONFIRMED, CONFIRMED→FULFILLED, CONFIRMED→CANCELLED, PAYMENT_PENDING→CANCELLED; `allowedActorType` per D-020-A contract; script updated to 47 total transitions (29 TRADE + 8 ESCROW + 6 CERTIFICATION + 4 ORDER); VERIFIER PASS: lifecycle_states ORDER=4, allowed_transitions ORDER=4; SEED_EXIT:0; typecheck EXIT 0; lint EXIT 0; no SQL migration applied — seed script approach (idempotent Prisma upsert))
(GOVERNANCE-SYNC-056 — GAP-ORDER-LC-001-SCHEMA-FOUNDATION-001: ORDER lifecycle schema foundation applied — migration `20260315000005_gap_order_lc_001_schema_foundation`; created `public.order_lifecycle_logs` (7 columns incl. tenant_id denorm for RLS + from_state/to_state TEXT + 3 indexes + FK → orders CASCADE); extended `lifecycle_states.entity_type` CHECK + `allowed_transitions.entity_type` CHECK from ARRAY['TRADE','ESCROW','CERTIFICATION'] → includes 'ORDER' (DROP + recreate — reversible); seeded 4 ORDER lifecycle states (PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED); RLS: Wave 3 Tail canonical (1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT with tenant+admin arms + UPDATE/DELETE permanently false for immutability); VERIFIER PASS: table + FK + 3 indexes + FORCE RLS=t + guard + 4 PERMISSIVE + 0 {public} + ORDER states seeded; prisma migrate resolve RESOLVE_EXIT:0; typecheck EXIT 0; lint EXIT 0; orders.status enum NOT touched — ALTER TYPE ADD VALUE deferred to B3 per STOP CONDITION)
(GOVERNANCE-SYNC-055 — G-006C-P2-IMPERSONATION_SESSIONS-RLS-UNIFY-001: `impersonation_sessions` RLS unified to canonical admin-only Wave 3 Tail pattern — migration `20260315000004_g006c_p2_impersonation_sessions_rls_unify` applied to remote Supabase; DROP 5 non-canonical policies (guard named `restrictive_guard` was {public}, missing is_admin, had non-standard WITH CHECK; CRITICAL: DELETE had NO admin arm — bypass_enabled() only) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app, require_admin_context) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with admin_id actor arm + is_admin arm replacing bypass_enabled(); admin-only design: tenant_id is metadata, NOT a RLS predicate; tenant JWTs rejected at guard; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL (require_admin_context + is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), DELETE critical fix applied, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0; G-006C-WAVE3-REMAINING → ✅ COMPLETE)
(GOVERNANCE-SYNC-054 — G-006C-P2-TENANT_DOMAINS-RLS-UNIFY-001: `tenant_domains` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000003_g006c_p2_tenant_domains_rls_unify` applied to remote Supabase; DROP 5 existing policies (guard renamed from tenant_domains_guard_policy → tenant_domains_guard, promoted from {public} to texqtic_app; CRITICAL: DELETE policy had NO tenant arm — only bypass_enabled() — rebuilt with full tenant + is_admin arms) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); enhanced verifier explicitly checks DELETE tenant_id arm + 0 {public} policies; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, DELETE tenant_id arm present, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-053 — G-006C-P2-TENANT_BRANDING-RLS-UNIFY-001: `tenant_branding` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000002_g006c_p2_tenant_branding_rls_unify` applied to remote Supabase; DROP 5 existing policies (guard renamed from tenant_branding_guard_policy → tenant_branding, promoted from {public} to texqtic_app; DELETE policy had NO tenant arm — fixed) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-052 — G-006C-P2-MEMBERSHIPS-RLS-UNIFY-001: `memberships` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000001_g006c_p2_memberships_rls_unify` applied to remote Supabase; DROP 5 existing bypass_enabled() policies (guard renamed from memberships_guard_require_context → memberships_guard, promoted from {public} to texqtic_app) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-051 — G-006C-P2-CATALOG_ITEMS-RLS-UNIFY-001: `catalog_items` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000000_g006c_p2_catalog_items_rls_unify` applied to remote Supabase; DROP 5 existing bypass_enabled() policies + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-050 — OPS-LINT-CLEANUP-001: G-QG-001 → ✅ VALIDATED — root `pnpm run lint` exits 0 (0 errors, 0 warnings); 23 frontend ESLint errors across 11 files cleared (unused vars, React-not-defined, AbortController global, setState-in-effect); `pnpm run typecheck` EXIT 0; root lint gate fully closed)
(GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001: `orders_update_unified` tenant arm applied to remote Supabase via psql — APPLY_EXIT:0; DO-block VERIFY PASS: `orders_update_unified has tenant + admin arms in USING and WITH CHECK`; RCP-1 Phases 4–5 re-run: 16/16 PASS (CONFIRMED→PLACED audit-seam ✅, FULFILLED derivedStatus ✅, CANCELLED direct+terminal 409 ✅); typecheck EXIT 0; lint EXIT 0 (0 errors, 105 pre-existing warnings); GAP-RLS-ORDERS-UPDATE-001 → ✅ OPERATIONALLY CLOSED; GAP-REVENUE-VALIDATE-002 → ✅ FULLY VALIDATED Phases 0–5)
(GOVERNANCE-SYNC-048 — OPS-REMOTE-MIGRATIONS-CATCHUP-001: Remote migration ledger reconciled — 2 pending migrations applied to Supabase (`aws-1-ap-northeast-1.pooler.supabase.com`): `20260303110000_g006c_p2_cart_items_rls_unify` (VERIFIER PASS: guard=1 RESTRICTIVE, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies), `20260303120000_g022_p2_cert_entity_type` ([G-022-P2 VERIFIER OK]: escalation_events_entity_type_check present and includes CERTIFICATION); both resolved in Prisma ledger via resolve --applied; post-flight: 64/64 distinct migrations in _prisma_migrations with finished_at NOT NULL; pre-existing rolled_back_at anomaly documented in docs/ops/REMOTE-MIGRATION-APPLY-LOG.md (historical artifact, not new, non-blocking); TC EXIT 0; LINT EXIT 0)
(GOVERNANCE-SYNC-047 — GAP-G022-02: `'CERTIFICATION'` added to `EscalationEntityType` union (`server/src/services/escalation.types.ts`) + `escalation_events.entity_type` DB CHECK constraint extended via migration `20260303120000_g022_p2_cert_entity_type` (DROP old auto-named CHECK + ADD new CHECK including 'CERTIFICATION'); T-G022-CERT-ENTITY-FROZEN test activated in `certification.g022.freeze.test.ts` (stop-loss block removed; entity-level freeze for CERTIFICATION now production-reachable); typecheck EXIT 0; lint EXIT 0, 105 pre-existing warnings; pending psql apply via DATABASE_URL)
(GOVERNANCE-SYNC-046 — G-006C-P2-CART_ITEMS-RLS-UNIFY-001: cart_items RLS unified to canonical Wave 3 Tail pattern — migration `20260303110000_g006c_p2_cart_items_rls_unify` created; RESTRICTIVE guard rebuilt with is_admin arm; PERMISSIVE SELECT/INSERT/UPDATE/DELETE unified with JOIN-based tenant arm (no direct tenant_id) + is_admin arm replacing bypass_enabled(); DO-block verifier present; typecheck EXIT 0; lint EXIT 0; pending psql apply)
(GOVERNANCE-SYNC-045 — OPS-RLS-ORDERS-UPDATE-001: GAP-RLS-ORDERS-UPDATE-001 → ✅ VALIDATED (governed ops SQL `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` created; `orders_update_unified` extended with tenant arm `(app.require_org_context() AND tenant_id = app.current_org_id()) OR (is_admin='true')` in USING + WITH CHECK; admin arm preserved; governance sign-off embedded in SQL header; DO-block verifier included; pending psql apply via DATABASE_URL); GAP-REVENUE-VALIDATE-002 → ✅ VALIDATED (Phases 4–5 unblocked once SQL applied; `--only-transitions` flag added to `validate-rcp1-flow.ts` for Phases 4–5 re-run; typecheck EXIT 0; lint EXIT 0; 0 new errors))
(GOVERNANCE-SYNC-044 — OPS-REVENUE-FLOW-VALIDATION-002: GAP-REVENUE-VALIDATE-002 → 🟡 PARTIALLY VALIDATED (TECS 4 — Phases 0–3 PASS: DB/JWT, catalog create, cart→checkout→PAYMENT_PENDING, orders list + audit; Phases 4–5 BLOCKED by GAP-RLS-ORDERS-UPDATE-001 — orders_update_unified RLS policy requires app.is_admin=true; withDbContext does not set app.is_admin for tenant actors; no RLS changes in RCP-1; privilege grant GRANT UPDATE ON public.orders TO texqtic_app/app_user applied; script + evidence report committed))
(GOVERNANCE-SYNC-043 — OPS-EXPERIENCE-ORDERS-UX-001: GAP-EXP-ORDERS-001 → VALIDATED (TECS 3 complete — EXPOrdersPanel created; expView state + onNavigateOrders threaded through all four EXPERIENCE shells; canonical RCP-1 derived-status algorithm; same Promise.all(orders+audit-logs) pattern; typecheck EXIT 0; 0 new lint errors; no backend/schema/RLS/shell-merge changes))
(GOVERNANCE-SYNC-042 — OPS-WLADMIN-ORDERS-PANEL-001: GAP-ORDER-TRANSITIONS-001 → VALIDATED (TECS 1 complete, commit 0a03177); GAP-WL-ORDERS-001 → VALIDATED (TECS 2 complete — WLOrdersPanel created; App.tsx ORDERS case wired; typecheck EXIT 0; 0 new lint errors); no backend/schema/RLS/shell-merge changes)
(GOVERNANCE-SYNC-041 — OPS-RCP1-GAP-RECONCILIATION-001: RCP-1 anchored as PLANNED roadmap; 5 new gap entries registered (GAP-ORDER-LC-001, GAP-ORDER-TRANSITIONS-001, GAP-WL-ORDERS-001, GAP-EXP-ORDERS-001, GAP-REVENUE-VALIDATE-002); GAP-RUV-006 schema re-entry linked to GAP-ORDER-LC-001; drift analysis recorded; no implementation begun; B1/D-5/control-plane posture affirmed unchanged)
(GOVERNANCE-SYNC-040 — OPS-WLADMIN-PRODUCTS-MVP-001: G-WL-ADMIN Products panel VALIDATED — real catalog list + create form replacing WLStubPanel; catalog fetch useEffect extended to WL_ADMIN; commit 6a7bf41 · typecheck EXIT 0 · 0 new lint errors · App.tsx only)
(GOVERNANCE-SYNC-039 — OPS-ORDER-LIFECYCLE-AUDIT-001: GAP-RUV-006 PARTIAL — lifecycle audit trail added via audit_logs; G-020 ORDER blocked by DB CHECK constraint; commit 5e13fe5 · typecheck EXIT 0 · lint EXIT 0 · 1 file only)
(GOVERNANCE-SYNC-038 — OPS-ACTIVATE-JWT-FIX-001: GAP-RUV-001 invite URL action=invite param VALIDATED · GAP-RUV-002 /activate JWT issuance VALIDATED · GAP-RUV-003 tenant.type from response VALIDATED · GAP-RUV-005 industry onChange wired VALIDATED · commit 43ef9c6 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · 4 files only)
(GOVERNANCE-SYNC-037 — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001: RU-001 invite activation wiring VALIDATED · RU-002 provision UI enablement VALIDATED · RU-003 catalog create API+service+frontend VALIDATED · S1 end-to-end happy path A–F confirmed · 5 commits: 3923069 fc66637 5d4c3bf 2cda383 739f6d8 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · no schema/RLS/auth changes)
(GOVERNANCE-SYNC-036 — OPS-TENANT-ROLE-DIFFERENTIATION-B1-RECORD-001: D-5 resolved by architectural decision B1; DB role-agnostic by design; `app.roles` intentionally dormant for live requests; role enforcement remains app-layer only; no code changes; no migrations; no RLS changes; single governance commit)
(GOVERNANCE-SYNC-035 — OPS-CONTROL-HARDENING-PHASE-2-001 VALIDATED: control-plane CI guardrails implemented; `scripts/control-plane-manifest.ts` + `scripts/control-plane-guard.ts` added; `.github/workflows/control-plane-guard.yml` added; `package.json` scripts `control:manifest` + `control:guard` added; guard EXIT 0 on main: 37 routes scanned, 17 mutations checked, 0 audit violations, 8/8 SUPER_ADMIN surfaces gated; artifact `artifacts/control-plane-manifest.json` emitted; no runtime changes; no DB changes; no migrations; no RLS changes; 2 atomic commits)
(GOVERNANCE-SYNC-032 — OPS-CONTROL-READ-AUDIT-001 VALIDATED: 14 control-plane GET route handlers now emit exactly one `writeAuditLog` read-audit entry on 200 success; action strings follow `control.<domain>.read[_one]` convention; `ADMIN` realm, `actor_type=ADMIN`; Sim A: 2 audit rows confirmed in DB; Sims B+C: 0 rows on rejected auth; typecheck EXIT 0; no SQL changes; no migrations; 2 atomic commits)
(GOVERNANCE-SYNC-030 — G006C-ORDERS-GUARD-001 VALIDATED: orders + order_items RESTRICTIVE guard added; role normalized {public} → texqtic_app; DO block VERIFIER PASS; 3 RLS sims PASS; Prisma ledger synced; migration `20260302000000_g006c_orders_guard_normalize`; admin arm preserved as current_setting('app.is_admin') — NOT replaced by bypass_enabled() per Gate 1 investigation)
(GOVERNANCE-SYNC-021 — G-020 Runtime Enforcement Atomicity CLOSED; two-phase atomicity gap eliminated: SM lifecycle log INSERT + entity state UPDATE now share a single Prisma $transaction; opts.db shared-tx pattern added to StateMachineService.transition(); TradeService + EscrowService wired; dead CERTIFICATION APPLIED branch removed; atomicity regression tests T-15 + E-09 added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass; impl commit 61d1a96)
(GOVERNANCE-SYNC-015 — G-017 Day4 Pending Approvals FK Hardening DB Applied (env: Supabase dev); migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (with parse-safe patch to adjacent-literal RAISE NOTICE); function `g017_enforce_pending_approvals_trade_entity_fk` + trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals, SECURITY DEFINER, tgenabled=O) both confirmed present; DO block 5-check VERIFY PASS; Prisma ledger synced via resolve --applied; migration file also patched for parse-safety (impl commit `bdb9ab7`); pending after: 5 migrations)
(GOVERNANCE-SYNC-014 — G-020 DB Applied (ledger-sync only; all objects confirmed in DB out-of-band); migration `20260301000000_g020_lifecycle_state_machine_core`; 4 tables + 1 function + 2 triggers verified present; FORCE RLS t/t on all 4 tables; 14 RLS policies; key constraints verified; row counts 0 (vacuous); Prisma ledger synced via resolve --applied; also ledger-synced gw3_db_roles_bootstrap (20260212) in same sync; pending after: 6 migrations; C: g017_day4_trigger_hardening absent from DB — separate TECS needed)
(GOVERNANCE-SYNC-013 — G-018 cycle-fix migration file repaired (parse-safe); migration file `20260308010000_g018_day1_escrow_schema_cycle_fix/migration.sql` patched: 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors fixed + non-ASCII chars replaced with ASCII equivalents; no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d`)
(GOVERNANCE-SYNC-012 — G-018 Cycle Fix DB Applied; migration `20260308010000_g018_day1_escrow_schema_cycle_fix` applied via psql to Supabase dev; `escrow_accounts.trade_id` column + 2 indexes dropped (circular FK eliminated); `trades.escrow_id → escrow_accounts.id` canonical FK preserved and verified; Prisma ledger synced via resolve --applied; migration file note: pre-flight DO block has PL/pgSQL adjacent-string-literal syntax error in non-executed branch — operational SQL applied manually via psql -c with identical effect)
(GOVERNANCE-SYNC-011 — G-018 Day 1 DB Applied; migration `20260308000000_g018_day1_escrow_schema` applied via psql to Supabase dev; impl commit `7c1d3a3`; §16 PASS notice; pg_policies: escrow_accounts 3 rows, escrow_transactions 5 rows (incl. no_update/no_delete deny); FORCE RLS: t/t on both tables; FKs verified: trades_escrow_id_fk ON DELETE RESTRICT, escrow_lifecycle_logs_escrow_id_fk ON DELETE CASCADE; data: 0 rows; Prisma ledger synced via resolve --applied)
(GOVERNANCE-SYNC-010 — G-007C VALIDATED — `/api/me` explicit errors + frontend stub tenant + amber banner prevents infinite spinner; backend commit `be66f41`; frontend commit `7bacd80`; governance-only commit; no migration, no RLS change)
(GOVERNANCE-SYNC-009 — G-016 traceability graph Phase A CLOSED; migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes + public.traceability_edges; 5 RLS policies each (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS on both tables; Prisma ledger synced; impl commit `44ab6d6`; typecheck EXIT 0, lint 0 errors/92 warnings; G-016 Phase A CLOSED)
(GOVERNANCE-SYNC-008 — G-019 certifications domain CLOSED; migration `20260311000000_g019_certifications_domain`: public.certifications table + 5 RLS policies (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS; Prisma ledger synced; impl commit `3c7dae7`; typecheck EXIT 0, lint 0 errors/92 warnings; G-019 CLOSED)
(GOVERNANCE-SYNC-005 — G-017 FK Hardening CLOSED; migration `20260309000000_g017_fk_buyer_seller_orgs` adds `fk_trades_buyer_org_id` + `fk_trades_seller_org_id` FK constraints (ON DELETE RESTRICT) with embedded preflight DO block; schema.prisma updated with `buyerOrg`/`sellerOrg` Prisma relations + `tradesBuyer[]`/`tradesSeller[]` back-refs on organizations; impl commit `8069d48`; typecheck EXIT 0, lint 0 errors/92 warnings; G-017 ⚠️ CAVEAT CLOSED)
(GOVERNANCE-SYNC-004 — G-015 Phase C CLOSED via Option C admin-context; `withOrgAdminContext` + `getOrganizationIdentity` implemented in `database-context.ts`; GET /me + invite-email wired; no RLS change; no migration; commit `790d0e6`; gap-register G-015 row updated to VALIDATED; GOVERNANCE-SYNC-003 also on this date — G-019 label-misuse fix recorded; `settlement.g019.ts` renamed to `settlement.ts` (tenant + control planes), impl commit `6e94a9a`; gap-register G-019 row updated to reflect fix)
Doctrine Version: v1.4

---

## Status Legend

- NOT STARTED
- IN PROGRESS
- VALIDATED
- LOCKED

---

# WAVE 2 — Stabilization

## 🔴 Critical Path

| Gap ID | Description                                                                                           | Affected Files                                                      | Risk    | Status    | Commit  | Validation Proof                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-001  | **RLS policies check `app.tenant_id`; new routes set `app.org_id`** — policies do not fire            | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`       | 🔴 High | VALIDATED | 1389ed7 | Step 1: 0 policies reference `app.tenant_id` · Step 2: 20 policies reference `app.org_id` · Step 3: cross-tenant 0 rows                              |
| G-002  | `FORCE ROW LEVEL SECURITY` missing on `carts`, `orders`, `order_items`, `catalog_items`, `cart_items` | `server/prisma/rls.sql`; `server/prisma/supabase_hardening.sql`     | 🔴 High | VALIDATED | 2d16e73 | All 13 tables: relrowsecurity=true, relforcerowsecurity=true · cross-tenant COUNT’s 0 · positive control passes                                      |
| G-003  | `orders` and `order_items` RLS policies absent from all SQL files                                     | `server/prisma/rls.sql`                                             | 🔴 High | VALIDATED | no-code | Live policies already correct: SELECT+INSERT+admin_all on both tables referencing `app.org_id` · cross-tenant COUNT 0                                |
| G-013  | CI cross-tenant 0-row proof not automated                                                             | `server/scripts/ci/rls-proof.ts`; `.github/workflows/rls-proof.yml` | 🟠 Med  | VALIDATED | 7f474ab | Step 1: 0 `app.tenant_id` policy refs · Step 2: Tenant A cross-tenant 0, own-count 2 · Step 3: Tenant B cross-tenant 0, own-count 0 · non-vacuous ✅ |

---

## 🟡 Stabilization

| Gap ID           | Description                                                                                                                                                                                                                                                                                                | Affected Files                                                   | Risk    | Status      | Commit                     | Validation Proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- | ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-004            | Two `withDbContext` implementations coexist; `control.ts` imports both                                                                                                                                                                                                                                     | `server/src/routes/control.ts`; `server/src/db/withDbContext.ts` | 🟠 Med  | VALIDATED   | a19f30b                    | `withDbContextLegacy` import removed · `withAdminContext` helper added using canonical `withDbContext` + `app.is_admin = 'true'` · 13 call sites migrated · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                                           |
| G-005-BLOCKER    | **`public.users` has FORCE+ENABLE RLS but no SELECT policy for `texqtic_app`** — auth route returns AUTH_INVALID even for valid credentials; root cause: `users_tenant_read` dropped in G-001 cleanup with no replacement                                                                                  | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | b060f60                    | Proof 1: `users_tenant_select` present in `pg_policies` with `app.org_id` + EXISTS-memberships qual · Proof 2: member read returns 1 row · Proof 3: cross-tenant read returns 0 rows · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                |
| G-TENANTS-SELECT | **`public.tenants` has `tenants_deny_all` (FOR ALL/false) but no SELECT for `app_user`** — Prisma nested select `membership.tenant` resolves `null` under FORCE RLS → `membership.tenant.status` TypeError → 500 INTERNAL_ERROR; code path reached for first time after G-005-BLOCKER unblocked user reads | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | 94da295                    | A: `tenants_app_user_select` in pg_policies (SELECT, `id::text = app.org_id`) · B: cross-tenant 0 rows · C: ACME org 1 row ACTIVE · D: `set_tenant_context` login path 1 row ACTIVE · `tenants_deny_all` intact · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                     |
| G-005            | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline                                                                                                                                                                                                  | `server/src/routes/tenant.ts`, `server/src/routes/ai.ts`         | 🟠 Med  | VALIDATED   | 830c0c4                    | 10 routes migrated: POST/GET /tenant/cart, POST /tenant/cart/items, PATCH /tenant/cart/items/:id, POST /tenant/checkout, GET /tenant/orders, GET /tenant/orders/:id, PUT /tenant/branding, GET /insights, POST /negotiation-advice · 2 exclusions justified: /tenant/activate (invite-manual), GET /me (non-tenant-scoped) · buildContextFromRequest import removed · typecheck EXIT 0 · lint 68w/0e · local runtime: 0 × 500, 0 × context-missing (10/10 routes) · prod smoke: cart 200, orders 200 count=2, insights 200 · No new 500s · Auth context preserved · RLS isolation unchanged |
| G-006            | Admin bypass pattern differs between old and new `withDbContext` — **scoped to auth.ts only**; resolved via Option B: direct `prisma.adminUser.findUnique()` for pre-auth admin lookup (no role switch; `admin_users` is not tenant-scoped)                                                                 | `server/src/routes/auth.ts`                                      | 🟠 Med  | VALIDATED   | `4971731`                  | Option B applied: `auth.ts` lines 438+653 replaced with direct `prisma.adminUser.findUnique()` (no `withDbContext`, no role switch) · lines 166+889 deferred → G-006D · `admin-cart-summaries.ts` deferred → G-006C · typecheck EXIT 0 · lint EXIT 0 (68w/0e) · T1 admin login 200 ✅ · T2 control route 200 ✅ · T3 tenant login 200 ✅ · T4 tenant orders 200 ✅ · 0 regressions · No `SET LOCAL ROLE texqtic_app` emitted (PG-42501 path eliminated) |
| G-006C           | Remove remaining legacy `withDbContext({ isAdmin: true }, …)` in control-plane routes — `admin-cart-summaries.ts` lines 52 + 140                                                                                                                                                                           | `server/src/routes/admin-cart-summaries.ts`; `server/src/lib/database-context.ts`; `server/prisma/migrations/20260314000000_g006c_admin_cart_summaries_admin_rls/migration.sql` | 🟠 Med  | VALIDATED   | `6f673ad`                  | `withAdminContext(prismaClient, callback)` + `ADMIN_SENTINEL_ID` exported from `database-context.ts`; both `withDbContext({ isAdmin: true }, async () =>` call sites replaced with `withAdminContext(prisma, async tx =>`; all `prisma.marketplaceCartSummary.*` inside callbacks replaced with `tx.*`; legacy `import { withDbContext }` removed from `admin-cart-summaries.ts`; migration `20260314000000_g006c_admin_cart_summaries_admin_rls` adds PERMISSIVE SELECT `admin_select` (USING is_admin='true') + extends `restrictive_guard` with admin arm + DO block VERIFY PASS; typecheck EXIT 0; lint EXIT 0 (0 errors / 104 warnings, all pre-existing). Migration DB application: pending psql apply to Supabase dev. No other tables touched. |
| G-006D           | Remove legacy `withDbContext({ tenantId }, …)` 2-arg usage in tenant auth path — `auth.ts` lines 166, 889                                                                                                                                                                                                  | `server/src/routes/auth.ts`; `server/src/lib/database-context.ts` | 🟡 Low  | VALIDATED   | `56c0387`                  | `withLoginContext(prismaClient, tenantId, callback)` + `LOGIN_SENTINEL_ACTOR` sentinel exported from `database-context.ts`; both 2-arg `withDbContext({ tenantId }, …)` call sites in `auth.ts` replaced; `where: { tenantId }` added to memberships in unified `/login` endpoint (latent filter gap closed); legacy `import { withDbContext } from '../db/withDbContext.js'` removed from `auth.ts`; typecheck EXIT 0; lint EXIT 0 (0 errors / 103 warnings, all pre-existing). No migrations. No RLS changes. |
| G-007 + G-007B   | `supabase_hardening.sql` uses `set_config(..., false)` (session-global) — pooler bleed risk; fixed to `is_local=true`; G-007-HOTFIX restores `app.org_id` canonical RLS key (Doctrine v1.4); **G-007B: repo reconcile — all Part 5+6 tenant-scoped-table policies updated `app.tenant_id` → `app.org_id` (anti-regression proof; prevents standalone-apply login failure)** | `server/prisma/supabase_hardening.sql`                           | 🟠 Med  | VALIDATED   | 09365b2 + 80d4501 + 80a6971 | 6 `false`→`true` (G-007 `09365b2`) · G-007-HOTFIX (`80d4501`): `set_tenant_context` was setting `app.tenant_id` but RLS policies read `app.org_id` (Doctrine v1.4 canonical key) → tenant login invisible rows → AUTH_INVALID in prod · Hotfix sets `app.org_id`, clears `app.tenant_id` defensively, `clear_context` also clears `app.org_id` · tx-local (`is_local=true`) preserved throughout · DB applied + pg_get_functiondef confirmed `app.org_id` present · **G-007B (`80a6971`): repo reconcile — Part 5 policies (8 tenant-scoped tables) + Part 6 audit_logs policies: all `app.tenant_id` → `app.org_id`; Doctrine v1.4 comment header added; pooler-bleed prevention note added; typecheck EXIT 0; lint EXIT 0** |
| G-007C           | **/api/me silent `tenant=null` caused infinite "Loading workspace…" spinner** — `OrganizationNotFoundError` and missing `tenantId` in JWT silently returned `tenant: null`; frontend `handleAuthSuccess` never seeded `tenants[]`; `currentTenant` remained null → infinite spinner. Fix: backend returns explicit 401 (missing tenantId) / 404 (org not provisioned); frontend seeds stub `Tenant` into `tenants[]` on any failure path + shows amber "Tenant not provisioned yet" banner on 404. **Deps / Caused-by:** frontend assumes `tenants[]` seeded from `/api/me`; backend previously swallowed `OrganizationNotFoundError` silently → `tenant: null`. **Follow-on:** G-WL-TYPE-MISMATCH (NOT STARTED) — WL tenant stub defaults `type: 'B2B'`; may render wrong shell if org unprovisioned. | `server/src/routes/tenant.ts` (/api/me handler) · `App.tsx` (handleAuthSuccess + EXPERIENCE render) | 🟠 Med  | VALIDATED   | `be66f41` + `7bacd80` | ACME login → workspace loads ✅; WL login → workspace loads ✅; org NOT yet provisioned → EXPERIENCE renders + amber banner (dismissible) ✅; no infinite spinner on any auth path ✅; `currentTenant` always non-null after login ✅ |
| G-008            | Canonical provisioning endpoint missing under `/api/control`; `EventLog` `schema_version`/`reasoning_hash` column alignment verified | `server/src/services/tenantProvision.service.ts` (canonical) | 🟡 Low  | VALIDATED   | `1eb5a46` + `009150d`      | Provisioning endpoint under `/api/control/tenants/provision`; realm guard enforced; GR-007 proof executed 2026-02-22T18:30:18Z: 5 PASS + 1 Conditional PASS                                                         |
| G-009            | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                                                                                                                                                                                                                              | `server/prisma/seed.ts`                                          | 🟡 Low  | VALIDATED   | `380fde7`                          | Seed runs; both flags present in `feature_flags` table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| G-010            | Tax/fee computation is a stub                                                                                                                                                                                                                                                                              | `server/src/services/pricing/totals.service.ts` (NEW) + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `39f0720`                  | Checkout returns deterministic totals object: subtotal, discountTotal=0, taxTotal=0, feeTotal=0, grandTotal; stop-loss throws TotalsInputError on invalid inputs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| G-011            | Impersonation session route not found in route files                                                                                                                                                                                                                                                       | `server/src/routes/admin/impersonation.ts` (NEW)                 | 🟡 Low  | VALIDATED   | `3860447`                  | POST /start (201 + token), POST /stop (200 + endedAt), GET /status/:id; negatives: tenant JWT → 401, missing reason → 400, non-member userId → 404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| G-012            | Email notifications are stubs — no real delivery                                                                                                                                                                                                                                                           | `server/src/services/email/email.service.ts` (NEW) + `server/src/routes/auth.ts` + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `1fe96e1`                  | Dev/test: EMAIL_DEV_LOG console JSON; prod+SMTP: real nodemailer send; prod-no-SMTP: EMAIL_SMTP_UNCONFIGURED warn; stop-loss: EmailValidationError on bad inputs; invite email fire-and-forget in tenant route |
| G-014            | `tenant/activate` POST has nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)                                                                                                                                                                                                    | `server/src/routes/tenant.ts`                                    | 🟠 Med  | VALIDATED   | `c451662`                  | Activation flow works in single transaction; no nested tx                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## Regressions / Incidents (Post-Validation)

| Gap ID | Symptom | Root Cause | Fix | Caused-by Chain | Follow-on |
|--------|---------|------------|-----|-----------------|-----------|
| G-007C | Infinite "Loading workspace…" spinner after tenant login | `handleAuthSuccess` seeded `tenants[]` only on `me.tenant` truthy; both failure paths (`else` + `catch`) only called `setCurrentTenantId`, leaving `tenants[]` empty → `currentTenant` null → spinner looped forever | Backend: `/api/me` explicit 401/404 instead of `tenant: null`. Frontend: stub `Tenant` always pushed to `tenants[]`; `APIError` 404 path shows amber banner. | G-015 Phase C introduced `getOrganizationIdentity` in `/api/me`; `OrganizationNotFoundError` was silently swallowed; missing `tenantId` JWT had no guard | G-WL-TYPE-MISMATCH (**VALIDATED** `65ab907`+`ef46214`) · G-WL-ADMIN (**VALIDATED** `46a60e4`) |

---

# INFRASTRUCTURE & RUNTIME GAPS

| Gap ID    | Description                                                          | Files                                                                          | Risk   | Status    | Commit      | Validation Proof                                                                                                        |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| G-BCR-001 | `bcrypt@5.1.1` native binding fails on Node 24+ — server cannot start | `server/package.json`, `server/src/lib/authTokens.ts`, `server/src/routes/auth.ts`, `server/src/routes/tenant.ts`, `server/src/services/tenantProvision.service.ts`, `server/prisma/seed.ts`, 7 test files | 🟠 Med  | VALIDATED | `3f16bf6`   | bcryptjs@3.0.3 (pure-JS); `GET /health` → 200 on Node 24; hash/compare proof recorded; tsc EXIT 0; eslint EXIT 0 |

> Policy: Wave work may proceed when **all gates pass** (`pnpm -C server run typecheck` + `pnpm -C server run lint` + `pnpm run lint` + `pnpm run typecheck`). Root lint gate closed — G-QG-001 ✅ VALIDATED (GOVERNANCE-SYNC-050).

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Wave             | Risk   | Status      | Commit | Validation Proof                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ----------- | ------ | -------------------------------------------------- |
| G-QG-001 | **Frontend ESLint debt blocks root lint gate** — 23 errors across 11 files: `App.tsx` (unused vars), `Auth/ForgotPassword.tsx` + `Auth/TokenHandler.tsx` + `Auth/VerifyEmail.tsx` (`React` not defined / unused vars), `Auth/AuthFlows.tsx` (unused var), `Cart/Cart.tsx` (unused vars), `ControlPlane/AuditLogs.tsx` + `ControlPlane/TenantRegistry.tsx` (unused vars), `ControlPlane/EventStream.tsx` (setState-in-effect), `constants.tsx` (unused imports), `services/apiClient.ts` (`AbortController` not defined) | Wave 3 / cleanup | 🟡 Low | ✅ **VALIDATED** — GOVERNANCE-SYNC-050 (OPS-LINT-CLEANUP-001, 2026-03-03) | — | `pnpm run lint` EXIT 0 · 0 errors · 0 warnings; `pnpm run typecheck` EXIT 0; 23→0 errors across 11 files |

---

# WAVE 3 — Canonical Doctrine Buildout

## RLS Entropy Elimination

| Gap ID        | Description                                                                                                              | Affected Files                                                                                                                                                                                                                   | Risk    | Status      | Migration Timestamp Range          | Validation Proof                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| G-006C (RLS)  | **Multiple permissive RLS policies per command per table** — Supabase Performance Advisor flagged policy sprawl across 11 tables; eliminates OR-policy explosion before G-016–G-023 domains are added | `server/prisma/migrations/20260223010000…20260315000004` (11 original + 7 P2 migrations) | 🟠 Med  | ✅ **VALIDATED** (GOVERNANCE-SYNC-064 audit 2026-03-03) — all 11 tables consolidated; 0 bypass_enabled() in active USING/WITH CHECK clauses; 1 RESTRICTIVE guard + 1 PERMISSIVE per command per table; FORCE RLS t on all tables | 20260223010000 – 20260315000004 | All 11 tables complete: audit_logs ✅ · carts ✅ · cart_items ✅ · catalog_items ✅ · orders ✅ · order_items ✅ · memberships ✅ · tenant_branding ✅ · tenant_domains ✅ · event_logs ✅ · impersonation_sessions ✅ |

**Tables in scope (apply in order) — P2 status:**
✅ `audit_logs` (GOVERNANCE-SYNC-029) → ✅ `carts` (OPS-DB-RECOVER-001) → ✅ `cart_items` (20260303110000 — GOVERNANCE-SYNC-046/048; applied) → ✅ `catalog_items` (20260315000000 — GOVERNANCE-SYNC-051) → ✅ `orders` (GOVERNANCE-SYNC-030) → ✅ `order_items` (GOVERNANCE-SYNC-030) → ✅ `memberships` (20260315000001 — GOVERNANCE-SYNC-052) → ✅ `tenant_branding` (20260315000002 — GOVERNANCE-SYNC-053) → ✅ `tenant_domains` (20260315000003 — GOVERNANCE-SYNC-054) → ✅ `event_logs` (GOVERNANCE-SYNC-031) → ✅ `impersonation_sessions` (20260315000004 — GOVERNANCE-SYNC-055)

**Expected end state per table:**
- 1 permissive policy per command (SELECT / INSERT / UPDATE / DELETE)
- RESTRICTIVE guard policies untouched
- FORCE RLS: unchanged
- Cross-tenant 0-row proof: PASS
- Supabase Performance Advisor: cleared

---

## Schema Domain Buildout

> **GOVERNANCE-SYNC-001 (2026-02-27):** Table expanded with Commit + Validation Proof columns. All statuses corrected per drift-detection audit `2066313`. False G-015 Phase C ✅ entry in wave-execution-log retracted. Source: `docs/audits/GAP-015-016-017-019-VALIDATION-REPORT.md`.

| Gap ID | Description | Status | Commit(s) | Validation Proof / Notes |
| ------ | ----------- | ------ | --------- | ------------------------ |
| G-015  | `organizations` table — Phase A: introduce org table + RLS + dual-write trigger; Phase B: deferred FK `organizations.id → tenants.id`; **Phase C: read cutover to `organizations` as canonical identity — IMPLEMENTED via Option C (admin-context; no RLS change; no migration)** | VALIDATED | Phase A: `bb9a898` · Phase B: `a838bd8` · Phase C: `790d0e6` | Phase A ✅ table + trigger + 3 RLS policies (admin-realm-only); Phase B ✅ deferred FK, parity-check preflight; Phase C ✅ implemented via Option C (GOVERNANCE-SYNC-004, 2026-02-27): `withOrgAdminContext` + `getOrganizationIdentity` + `OrganizationNotFoundError` added to `database-context.ts`; GET /me and invite-email paths wired; **tenant realm reads remain blocked by org RESTRICTIVE guard policy** (no RLS change); typecheck EXIT 0 · lint 0 errors |
| G-016  | `traceability_nodes` and `traceability_edges` tables — Phase A schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`44ab6d6`) | VALIDATED | `44ab6d6` | ✅ migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes (org_id FK→organizations ON DELETE RESTRICT, UNIQUE(org_id,batch_id), INDEX(org_id,node_type), meta JSONB, visibility, geo_hash, updated_at trigger) + public.traceability_edges (org_id FK→organizations, from_node_id/to_node_id FK→traceability_nodes ON DELETE CASCADE, edge_type, transformation_id, meta JSONB; 2x partial UNIQUE indexes for NULL/NOT NULL transformation_id, 2x graph traversal indexes); ENABLE+FORCE RLS on both tables; 5 policies each (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS (both tables); **DB APPLIED ✅ (GOVERNANCE-SYNC-009, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows each verified; relrowsecurity=t relforcerowsecurity=t on both tables; constraints: pkey + org_id FK on nodes; pkey + org_id FK + from_node_id FK + to_node_id FK on edges; data: 0 rows (vacuous — structure proven by DO block PASS notice); TraceabilityService: createNode/listNodes/createEdge/listEdges/getNodeNeighbors; meta 16KB stop-loss; tenant routes: POST+GET /nodes · GET /nodes/:id/neighbors · POST+GET /edges; admin control routes: GET /traceability/nodes · GET /traceability/edges (cross-tenant, is_admin context); wired in tenant.ts + control.ts; Prisma: TraceabilityNode + TraceabilityEdge models + organizations back-refs; typecheck EXIT 0 · lint 0 errors/92 warnings |
| G-017  | `trades` + `trade_events` tables + RLS + lifecycle FK + Day 4 pending_approvals trigger hardening + FK hardening for buyer/seller org refs + admin-plane SELECT RLS | VALIDATED | `96b9a1c` `3bc0c0f` `b557cb5` `0bb9cf3` `8069d48` `2512508` `7350164` `bdb9ab7` | ✅ schema + RLS (RESTRICTIVE guard + PERMISSIVE SELECT/INSERT) + lifecycle FK + route (`trades.g017.ts`) + service (`trade.g017.service.ts`) + 17 tests; **FK HARDENING CLOSED (GOVERNANCE-SYNC-005)**: migration `20260309000000_g017_fk_buyer_seller_orgs` adds 2 FK constraints (ON DELETE RESTRICT); embedded preflight DO block; Prisma schema updated; **DB APPLIED ✅ (GOVERNANCE-SYNC-006, 2026-02-27, env: Supabase dev)**: psql + resolve --applied; **ADMIN-PLANE RLS CLOSED ✅ (GOVERNANCE-SYNC-007, 2026-02-27)**: migration `20260310000000_g017_trades_admin_rls` adds `trades_admin_select` + `trade_events_admin_select` (PERMISSIVE SELECT, USING `is_admin=true`); RESTRICTIVE guards on both tables rebuilt with `OR current_setting('app.is_admin',true)='true'`; pattern mirrors GATE-TEST-003 (audit_logs); migration DO block verified all 6 policy invariants (PASS); pg_policies proof: 6 rows — guards RESTRICTIVE with admin pred, tenant_select scoped to current_org_id (isolation preserved), admin_select PERMISSIVE SELECT; data in dev: 0 rows trades/trade_events (vacuous data proof — policy structure proven via DO block); Prisma ledger synced; no admin INSERT/UPDATE/DELETE (SELECT only per scope); gap register was incorrectly NOT STARTED — corrected GOVERNANCE-SYNC-001; **Day4 FK Hardening DB Applied ✅ (GOVERNANCE-SYNC-015, 2026-02-28, env: Supabase dev)**: migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (migration file first patched: adjacent-literal RAISE NOTICE in verification DO block merged into single literal, impl commit `bdb9ab7`); function `g017_enforce_pending_approvals_trade_entity_fk` created (RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, SET search_path=public); trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals FOR EACH ROW) created; tgrelid=pending_approvals, tgenabled=O; DO block 5-check VERIFY PASS (function EXISTS, trigger EXISTS, tgenabled=O, pending_approvals EXISTS, trades EXISTS); trigger/function counts post-apply: 1/1; SQLSTATE P0003 enforcement; Prisma ledger synced via resolve --applied; required for pending_approvals → trade entity FK integrity; **trades_domain Ledger-Sync ✅ (GOVERNANCE-SYNC-016, 2026-02-28)**: migration `20260306000000_g017_trades_domain` ledger-synced (resolve-only, no psql apply); `public.trades` + `public.trade_events` confirmed present in DB via to_regclass; applied out-of-band previously as G-017 Day1 schema prerequisite; row counts: trades=0, trade_events=0 (vacuous) |
| G-018  | `escrow_accounts` table + lifecycle FK + Day 3 tenant+control routes | VALIDATED | `7c1d3a3` `efeb752` `8d7d2ee` `98eb08d` | ✅ schema + RLS + service (ledger + lifecycle + governance) + routes (tenant + control); **Day 1 DB Applied ✅ (GOVERNANCE-SYNC-011, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308000000_g018_day1_escrow_schema`, commit `7c1d3a3`) + resolve --applied; §16 PASS notice; RLS t/t on both tables; FKs verified; **Cycle Fix DB Applied ✅ (GOVERNANCE-SYNC-012, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308010000_g018_day1_escrow_schema_cycle_fix`) + resolve --applied; `escrow_accounts.trade_id` + 2 indexes dropped; `trades.escrow_id → escrow_accounts.id` canonical FK preserved (ON DELETE RESTRICT); RLS t/t on both escrow tables unchanged; verification PASS; **Migration File Repaired ✅ (GOVERNANCE-SYNC-013, 2026-02-28)**: patched 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors + non-ASCII chars (em dash `—`, Unicode arrow `→`) replaced with ASCII (`--`, `->`); no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d` |
| G-019  | `certifications` table — schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`3c7dae7`) | VALIDATED | `3c7dae7` | ✅ migration `20260311000000_g019_certifications_domain`: public.certifications (org_id FK→organizations ON DELETE RESTRICT, lifecycle_state_id FK→lifecycle_states ON DELETE RESTRICT, CHECK expires_after_issued, partial UNIQUE per-pending + full UNIQUE per-issued); ENABLE+FORCE RLS; 5 policies (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); updated_at trigger; GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS; **DB APPLIED ✅ (GOVERNANCE-SYNC-008, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows verified; relrowsecurity=t relforcerowsecurity=t; constraints: pkey + 2 FKs + CHECK; data: 0 rows (vacuous — structure proven by DO block); CertificationService: create/list/get/update/transition (entity_type='CERTIFICATION' enforced); tenant routes: POST / · GET / · GET /:id · PATCH /:id · POST /:id/transition; admin control routes: GET / · GET /:id (cross-tenant, is_admin context); wired in tenant.ts + control.ts; typecheck EXIT 0 · lint 0 errors/92 warnings |
| G-020  | State machine transition tables (trade, escrow, certification lifecycle) **+ G-020 Runtime Enforcement Atomicity (GOVERNANCE-SYNC-021)** | VALIDATED | `aec967f` `9c3ca28` `61d1a96` | ✅ schema + RLS + seed (43-edge graph across TRADE/ESCROW/CERTIFICATION entities) + `StateMachineService` transition enforcement + 20 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-014, 2026-02-28, env: Supabase dev)**: all 4 tables (`lifecycle_states`, `allowed_transitions`, `trade_lifecycle_logs`, `escrow_lifecycle_logs`) + `prevent_lifecycle_log_update_delete` fn + 2 immutable-log triggers confirmed present in DB out-of-band (applied as prerequisite for G-017 trades); pre-flight guard blocks re-apply (lifecycle_states already existed); FORCE RLS t/t on all 4 tables; 14 RLS policies (lifecycle_states: 2, allowed_transitions: 2, trade_lifecycle_logs: 5, escrow_lifecycle_logs: 5); key constraints: pkey+unique on lifecycle_states, pkey+unique+2FKs+3CHECKs on allowed_transitions, pkey+FKs+CHECKs on log tables; row counts: 0 (vacuous — structure proven by constraints/policies); Prisma ledger synced via resolve --applied; **Runtime Enforcement Atomicity CLOSED ✅ (GOVERNANCE-SYNC-021, 2026-02-28)**: two-phase atomicity gap eliminated — `StateMachineService.transition()` accepts `opts?.db` (shared `PrismaClient`); when provided, SM log write uses `opts.db` directly (no nested `$transaction`); `TradeService.transitionTrade()` wraps SM log INSERT + `trade.lifecycleStateId` UPDATE + `tradeEvent` INSERT in ONE `$transaction`; `EscrowService.transitionEscrow()` wraps SM log INSERT + `$executeRaw UPDATE escrow_accounts.lifecycle_state_id` in ONE `$transaction`; dead CERTIFICATION APPLIED branch removed (SM always returns `CERTIFICATION_LOG_DEFERRED`); atomicity regression tests T-15 (trade) + E-09 (escrow) added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass |
| G-021  | Maker-Checker dual-signature enforcement **+ G-021 Runtime Enforcement Wiring (GOVERNANCE-SYNC-022)** | VALIDATED | `407013a` `de3be8f` `9c15026` | ✅ schema + RLS + replay integrity hash + `maker_id ≠ checker_id` DB trigger + active-uniqueness constraint + idempotency + 29 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-017, 2026-03-01, env: Supabase dev)**: all objects confirmed present in DB out-of-band prior to ledger sync; pre-flight guard blocks re-apply (`pending_approvals` already existed); resolve-only path; 10 RLS policies (pg_policies: 10); ENABLE+FORCE RLS: t/t on both tables (`pending_approvals`, `approval_signatures`); 2 trigger functions (`prevent_approval_signature_modification`, `check_maker_checker_separation`); 2 triggers on `approval_signatures` (immutability BEFORE UPDATE/DELETE + D-021-C AFTER INSERT); partial unique index `pending_approvals_active_unique` (D-021-B: WHERE status IN (REQUESTED, ESCALATED)); row counts: 0/0 (vacuous — structure proven by RLS + triggers + index + constraints); Prisma ledger synced via resolve --applied; **Runtime Enforcement Wiring CLOSED ✅ (GOVERNANCE-SYNC-022, 2026-02-28)**: Fix A — `TradeService` constructor `_makerChecker` unused-underscore removed; `makerChecker` now stored + called on PENDING_APPROVAL; `trade.g017.types.ts` PENDING_APPROVAL result gains `approvalId?: string`; Fix A2 — tenant + control trade transition routes construct `MakerCheckerService` and inject into `TradeService`; Fix B — control-plane escrow route gains POST `/:escrowId/transition` endpoint with MC injection (mirrors tenant plane); Fix C — `buildService()` in `routes/internal/makerChecker.ts` injects `EscalationService` into SM + MC so `verifyAndReplay()` enforces freeze checks (D-022-D); Implementation commit `9c15026`; 19/19 tests pass (17 trade + 2 makerChecker); typecheck EXIT 0 · lint 0 errors; pending migrations = 0 BEFORE + AFTER; **Depends on G-020 SM enforcement boundary; integrates with G-022 escalation freeze checks**; **Prevents trade lifecycle dead-end where PENDING_APPROVAL had no pending_approvals row** |
| G-022  | Escalation levels + kill-switch mechanism **+ G-022 Runtime Enforcement — CERTIFICATION Freeze Wiring (GOVERNANCE-SYNC-023)** | VALIDATED | `e138ff0` `5d8e43c` `e8d0811` | ✅ schema + RLS + `EscalationService` (freeze gate D-022-B/C) + tenant routes (LEVEL_0/1) + control routes (upgrade/resolve) + 28 tests (23 Day2 + 5 Day3); **DB Applied ✅ (GOVERNANCE-SYNC-018, 2026-02-28, env: Supabase dev)**: `escalation_events` table + 2 trigger functions (`escalation_events_immutability`, `escalation_severity_upgrade_check`) + 2 triggers confirmed present in DB out-of-band; pre-flight guard blocks re-apply (escalation_events already existed); resolve-only path; ENABLE+FORCE RLS: t/t; 4 RLS policies (tenant_select, admin_select, tenant_insert, admin_insert); 5 indexes (pkey + entity_freeze + org_freeze + org_id + parent); D-022-A severity upgrade trigger ✅; D-022-B org freeze via entity_type=ORG ✅; row count: 0 (vacuous); Prisma ledger synced via resolve --applied; **GAP-G022-01 CLOSED ✅ (GOVERNANCE-SYNC-023, 2026-02-28)**: CERTIFICATION routes (`certifications.g019.ts`) — all 5 SM instantiation sites now inject `EscalationService` (createCertification, listCertifications, getCertification, updateCertification, transitionCertification); SM Step 3.5 org-level freeze checks now enforced for all CERTIFICATION operations; 2 tests added (T-G022-CERT-ORG-FROZEN: org freeze blocks CERTIFICATION transition ✅, T-G022-CERT-NOT-FROZEN: no freeze → SM proceeds to CERTIFICATION_LOG_DEFERRED ✅); **GAP-G022-02 ✅ VALIDATED (GOVERNANCE-SYNC-047, 2026-03-03)**: `'CERTIFICATION'` added to `EscalationEntityType` union (`escalation.types.ts`) + `escalation_events.entity_type` CHECK constraint extended (migration `20260303120000_g022_p2_cert_entity_type`: DROP `escalation_events_entity_type_check` + ADD with CERTIFICATION included; DO-block verifier present); T-G022-CERT-ENTITY-FROZEN test activated in `certification.g022.freeze.test.ts` (entity-level freeze for CERTIFICATION now production-reachable); stop-loss block removed; typecheck EXIT 0; lint EXIT 0; pending psql apply via DATABASE_URL |
| GATE-TEST-003 | `audit_logs` admin SELECT + RESTRICTIVE guard admin predicate fix | VALIDATED | — | ✅ migration `20260304000000_gatetest003_audit_logs_admin_select`: drops+recreates `audit_logs_guard` RESTRICTIVE policy adding `current_setting('app.is_admin',true)='true'` predicate; adds `audit_logs_admin_select` PERMISSIVE SELECT (admin context, `tenant_id IS NULL` rows only); VERIFY DO block passes 5 invariant checks; parse-safe (no adjacent literals, no non-ASCII in RAISE strings); tenant isolation unchanged; **DB Applied ✅ (GOVERNANCE-SYNC-019, 2026-02-28, env: Supabase dev)**: all objects confirmed present in DB out-of-band; resolve-only path; FORCE RLS t/t on `audit_logs`; 6 total policies (`audit_logs_guard` RESTRICTIVE + `audit_logs_select_unified` PERMISSIVE SELECT + `audit_logs_admin_select` PERMISSIVE SELECT + `audit_logs_insert_unified` + `audit_logs_no_update` + `audit_logs_no_delete`); `has_admin_predicate=t` ✅; PERMISSIVE SELECT policies = 2 (matches VERIFY check); `audit_logs` row count: 55 (live data); Prisma ledger synced via resolve --applied |
| G-023  | `reasoning_logs` table + `reasoning_hash` FK for AI events | VALIDATED | `48a7fd3` `2f432ad` | ✅ schema (reasoning_logs + audit_logs FK) + service (emit reasoning_log per AI call) + wave log evidence doc; **DB Applied ✅ (GOVERNANCE-SYNC-020, 2026-02-28, env: Supabase dev)**: `reasoning_logs` table + `audit_logs.reasoning_log_id` FK column + fn `reasoning_logs_immutability` + trigger `trg_reasoning_logs_immutability` + 3 RLS policies + 4 indexes all confirmed present in DB out-of-band; resolve-only path (migration uses CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS patterns); ENABLE+FORCE RLS: t/t; 3 policies (`reasoning_logs_guard` RESTRICTIVE ALL, `reasoning_logs_tenant_select` PERMISSIVE SELECT, `reasoning_logs_tenant_insert` PERMISSIVE INSERT); 4 indexes on reasoning_logs (pkey + created_at + request_id + tenant_id); immutability trigger enabled=O (append-only, bypass-rls DELETE escape for test seed only); `audit_logs.reasoning_log_id` FK ✅ (col_exists=1); row counts: reasoning_logs=23 (live AI audit data), audit_logs with reasoning_log_id IS NOT NULL=5 (FK live and used); Prisma ledger synced via resolve --applied; **🎉 MILESTONE: All 57 migrations ledger-synced. `Database schema is up to date!`** |
| G-024  | `sanctions` table — runtime enforcement for sanctioned orgs/entities | VALIDATED | `a133123` | M scope; migration `20260313000000_g024_sanctions_domain` adds `public.sanctions` table + SECURITY DEFINER enforcement functions; SanctionsService injected into StateMachineService(3.5a), TradeService(buyer+seller), CertificationService, EscrowService(create+RELEASE); 7 route files wired; replay-safe via SM.transition() path; T-G024-01..06 (6/6 PASS); typecheck EXIT 0; lint 0 errors; **DB Migration APPLIED ✅ (OPS-ENV-002 + OPS-DB-RECOVER-001, 2026-03-01, env: Supabase prod)**; **CLOSED (GOVERNANCE-SYNC-024 / GOVERNANCE-SYNC-026, 2026-03-13 / 2026-03-01)** |

---

# WAVE 4 — Governance + Infrastructure

| Gap ID | Description                                                         | Status      | Notes                                      |
| ------ | ------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| G-025  | DPP snapshot views (`dpp_product_passport`) — MISSING               | NOT STARTED | XL scope; regulator-facing read models     |
| G-026  | Custom domain routing / tenant resolution (white-label) | **TECS 6C1 ✅ Validated (GOVERNANCE-SYNC-090) · TECS 6C2 ✅ Validated (GOVERNANCE-SYNC-091) — TECS 6C3/6D pending** | L scope; D1=Hybrid Edge+Backend; D2=platform subdomains v1 (<slug>.texqtic.app); D3=HMAC resolver endpoint; D4=texqtic_service BYPASSRLS narrow; D5=60s Edge TTL cache (invalidation webhook in 6C3); D6=internal signed contract; D7=x-texqtic-* headers + Edge HMAC signing; D8=fail-closed; G-026-A deferred v1.1; G-026-H ✅ VALIDATED; G-026-C ✅ VALIDATED (middleware.ts — TECS 6C2); G-026-D ✅ VALIDATED (slug-subdomain routing via middleware.ts); ENV: TEXQTIC_RESOLVER_SECRET required in Vercel Edge env vars; TECS 6C3/6D queued |
| G-026-H | `texqtic_service` DB role with BYPASSRLS SELECT on tenants(id,slug) | ✅ VALIDATED — TECS 6C1 (GOVERNANCE-SYNC-090) | migration 20260317000000_g026_texqtic_service_role applied to remote Supabase; APPLY_EXIT=0; VERIFIER PASS: texqtic_service role confirmed — BYPASSRLS=true, SELECT on tenants + tenant_domains, granted to postgres |
| G-027  | The Morgue (Level 1+ failure event bundles) — schema foundation + canonical producer complete | **VALIDATED** | L scope; post-mortem + regulator review — `morgue_entries` table + canonical RLS applied 2026-03-03 (GOVERNANCE-SYNC-065); StateMachineService ORDER branch extended to write `morgue_entries` row atomically on terminal transitions (FULFILLED/CANCELLED) with dedup guard — typecheck EXIT 0, lint EXIT 0 (GOVERNANCE-SYNC-068) |
| G-028  | Insight caching / vector store / inference separation for AI        | NOT STARTED | XL scope; future AI infrastructure         |
| G-WL-TYPE-MISMATCH | WL tenant renders as wrong shell/type when org is unprovisioned — stub defaulted `type: 'B2B'`; WL org in provisioning gap rendered B2B/Enterprise sidebar | **VALIDATED** | `65ab907` (backend) · `ef46214` (frontend). Backend: `tenantType: string\|null` in login response via `getOrganizationIdentity`; fail-open on `OrganizationNotFoundError`. Frontend: `LoginResponse.tenantType` typed; `stubType` enum-validated from `data.tenantType` (AGGREGATOR fallback); both stub paths fixed. Happy path unchanged. Gates: tsc EXIT 0 · eslint 0 errors · gate-e-4-audit login PASS. |
| G-WL-ADMIN | WL Store Admin back-office surface missing — WL OWNER/ADMIN landed on storefront shell; no back-office access to Branding, Staff, Products, Collections, Orders, Domains | **VALIDATED** | `46a60e4`. `'WL_ADMIN'` appState added. Router rule: WHITE_LABEL + OWNER/ADMIN → `WL_ADMIN` in all handleAuthSuccess paths. `WhiteLabelAdminShell` in Shells.tsx: sidebar with 6 panels (no B2B chrome). BRANDING→WhiteLabelSettings, STAFF→TeamManagement; PRODUCTS/COLLECTIONS/ORDERS/DOMAINS→WLStubPanel (stub). Provision banner compatible. "← Storefront" link restores WhiteLabelShell. Gates: tsc EXIT 0 · eslint 0 errors. Follow-ons: Products, Collections, Orders, Domains full panels (Wave 4). |

---

## Ops / Infrastructure Gaps

| Gap ID | Description | Status | Notes |
| ------ | ----------- | ------ | ----- |
| OPS-ENV-001 | Prisma migration env var naming mismatch: `MIGRATION_DATABASE_URL` (schema.prisma) vs `DIRECT_DATABASE_URL` (TECS prompts + copilot-instructions). Caused 3 consecutive prod deploy blocks during G-024 migration cycle. | **VALIDATED** | Option A: standardized on `DIRECT_DATABASE_URL`. `schema.prisma directUrl` updated. Preflight script (`server/scripts/prisma-env-preflight.ts`) blocks TX_POOLER (exit 1). Deploy wrapper (`server/scripts/migrate-deploy.ts`) auto-loads .env. `package.json` scripts: `prisma:preflight`, `migrate:deploy:prod`. Docs: `docs/ops/prisma-migrations.md`. Proof: 4/4 exit code tests PASS. typecheck EXIT 0. GOVERNANCE-SYNC-025. |
| OPS-ENV-002 | Rename `MIGRATION_DATABASE_URL` → `DIRECT_DATABASE_URL` in `server/.env` (gitignored) and deploy G-024 to production. | **VALIDATED** | `server/.env` key renamed (no tracked change). Preflight: DIRECT_DATABASE_URL, SESSION_POOLER (aws-1-*:5432), EXIT 0. G-024 deploy: SUCCESS — "Applying migration `20260313000000_g024_sanctions_domain`". Post-deploy: "Database schema is up to date!" (0 pending). GOVERNANCE-SYNC-026. |
| OPS-DB-RECOVER-001 | `_prisma_migrations` stuck row for `20260223020000_g006c_rls_carts_consolidation` (finished_at=NULL, applied_steps_count=0 from Mar-1 failed deploy attempt). Blocked G-024 deploy. | **VALIDATED** | Investigation: all carts unified policies already present in DB (carts_select/insert/update/delete_unified + FORCE RLS). Path B chosen: `UPDATE _prisma_migrations SET finished_at=NOW(), applied_steps_count=1 WHERE migration_name='20260223020000_g006c_rls_carts_consolidation' AND finished_at IS NULL AND rolled_back_at IS NULL` — 1 row affected. Deploy unblocked. GOVERNANCE-SYNC-026. |

---

# REVENUE UNBLOCK — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001

**TECS:** OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001  
**Date:** 2026-03-02  
**Commits:** `3923069` `fc66637` `5d4c3bf` `2cda383` `739f6d8`  
**Scope:** RU-001 (invite activation wiring) · RU-002 (provision UI enablement) · RU-003 (catalog create API + service + frontend inline form)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, 1 pre-existing warning)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No route plugins added outside tenant.ts allowlist

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| RU-001 | **Invite activation wiring** — `action=invite` URL token was intercepted by TokenHandler; `pendingInviteToken` state missing in App root; `activateTenant` never called on onboarding completion; OnboardingFlow step 2 had no email/password fields | `App.tsx` · `components/Onboarding/OnboardingFlow.tsx` | 🟠 Med | VALIDATED | `5d4c3bf` `739f6d8` | `action=invite` URL detection routes to ONBOARDING (not TOKEN_HANDLER) ✅ · `pendingInviteToken` state seeded from URL param ✅ · OnboardingFlow step 2 "Set Up Your Account" collects `email` + `password` ✅ · `activateTenant({inviteToken, userData})` called exactly once on step 4 completion ✅ · On success: `tenants[]` seeded, `currentTenantId` set, `pendingInviteToken` cleared, transition to EXPERIENCE ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-002 | **Provision UI enablement** — "Provision New Tenant" button was `disabled` with note "will be enabled in Wave 5"; no modal or form existed; `provisionTenant` service function had no UI entry point | `components/ControlPlane/TenantRegistry.tsx` | 🟡 Low | VALIDATED | `2cda383` `739f6d8` | Provision button enabled (removed `disabled` flag) ✅ · Modal opens with form (orgName, ownerEmail, ownerPassword) ✅ · `handleProvision`: auto-slugifies orgName, calls `provisionTenant({name, slug, type:'B2B', ownerEmail, ownerPassword})` ✅ · On success: shows orgId + slug + next-step guidance for invite link ✅ · Tenant list refreshed via `fetchTenants()` ✅ · All form labels a11y-compliant (`htmlFor`/`id`) ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-003 | **Catalog item creation** — `POST /api/tenant/catalog/items` endpoint absent; `catalogService.ts` had no write ops; no frontend UI to add items; `catalog.item.created` audit action did not exist | `server/src/routes/tenant.ts` · `services/catalogService.ts` · `App.tsx` | 🟠 Med | VALIDATED | `3923069` `fc66637` `5d4c3bf` `739f6d8` | `POST /api/tenant/catalog/items`: `tenantAuthMiddleware` + `databaseContextMiddleware` guards ✅ · Role guard: OWNER or ADMIN only ✅ · Zod schema: `name` (required), `sku?`, `description?`, `price` (positive), `moq` (int, default 1) ✅ · `withDbContext` → `tx.catalogItem.create` (RLS-safe) ✅ · `writeAuditLog(action: 'catalog.item.created')` ✅ · Returns 201 with created item ✅ · `createCatalogItem(payload)` added to `catalogService.ts` via `tenantPost` ✅ · Inline "+ Add Item" form in B2B (Wholesale Catalog) + B2C (New Arrivals) shells ✅ · typecheck EXIT 0 · lint EXIT 0 |

### S1 Happy Path — Validated (2026-03-02)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| A | Control Plane → Tenant Registry → "Provision New Tenant" → fill form | Success modal: orgId + slug shown; tenant list refreshed | ✅ VALIDATED |
| B | Use invite member flow → capture `?token=<token>&action=invite` URL | Token routed to ONBOARDING — distinct from `reset-password`/`verify-email` (TokenHandler bypassed) | ✅ VALIDATED |
| C | Open invite URL → OnboardingFlow step 2 collects email+password → "Complete Activation" | `POST /api/tenant/activate` called exactly once → transitions to EXPERIENCE | ✅ VALIDATED |
| D | OWNER in B2B or B2C → "+ Add Item" → fill name/price/[sku] → Save | Item prepended to product list; `catalog.item.created` audit row written | ✅ VALIDATED |
| E | Member adds item to cart → checkout | Order appears in orders list | ✅ VALIDATED |
| F | Audit trail check | `control.tenants.provisioned` + `user.activated` + `catalog.item.created` + checkout audit — all present | ✅ VALIDATED |

---

# REVENUE UNBLOCK — OPS-ACTIVATE-JWT-FIX-001

**TECS:** OPS-ACTIVATE-JWT-FIX-001  
**Date:** 2026-03-02  
**Commit:** `43ef9c6`  
**Scope:** GAP-RUV-001 (invite URL action param) · GAP-RUV-002 (activate JWT issuance) · GAP-RUV-003 (tenant type from response) · GAP-RUV-005 (industry field data integrity)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No new routes

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-001 | **Invite email URL missing `action=invite` param** — invite link generated as `?token=<tok>` only; `App.tsx` `useEffect` routes to ONBOARDING only when `action=invite` present; without it, user lands in TOKEN_HANDLER (password-reset handler) and never reaches activation form | `server/src/services/email/email.service.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `sendInviteMemberEmail` URL now `?token=<tok>&action=invite` ✅ · invite click routes to ONBOARDING (not TOKEN_HANDLER) ✅ |
| GAP-RUV-002 | **`POST /api/tenant/activate` returned no JWT** — backend `sendSuccess` response contained `{user, tenant, membership}` with no `token` field; `setToken()` was never called; all post-activation EXPERIENCE API calls hit `tenantAuthMiddleware` → 401 | `server/src/routes/tenant.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `/activate` calls `reply.tenantJwtSign({userId, tenantId, role})` after `withDbContext` commits ✅ · response includes `{token, user, tenant:{id,name,slug,type}, membership}` ✅ · same JWT claim shape as `/api/auth/login` ✅ · no new signing helper · no new DB queries ✅ |
| GAP-RUV-003 | **`App.tsx` hardcoded `type: 'B2B'` after activation** — `onComplete` in ONBOARDING seeded tenant stub with `type: 'B2B'` regardless of actual provisioned type; WHITE_LABEL invite-activated users would land in B2B EXPERIENCE shell instead of WL shell; `setToken()` was also absent | `App.tsx` | 🟠 User abandonment | VALIDATED | `43ef9c6` | `setToken(raw.token, 'TENANT')` called before `setAppState('EXPERIENCE')` ✅ · `type: (raw.tenant.type ?? 'B2B') as TenantType` — derives type from server response, not hardcoded ✅ · `setToken` import added to `apiClient` import line ✅ |
| GAP-RUV-005 | **`OnboardingFlow.tsx` industry input uncontrolled** — step 1 `<input id="industry">` had no `value` or `onChange`; `formData.industry` was always `''`; data silently dropped on submit; `tenantData.industry` always received undefined | `components/Onboarding/OnboardingFlow.tsx` | 🟡 Data integrity | VALIDATED | `43ef9c6` | `value={formData.industry}` + `onChange={e => setFormData({...formData, industry: e.target.value})}` wired ✅ · field now controlled; data flows into `tenantData.industry` on activate ✅ |

---

# REVENUE UNBLOCK — OPS-ORDER-LIFECYCLE-AUDIT-001

**TECS:** OPS-ORDER-LIFECYCLE-AUDIT-001  
**Date:** 2026-03-02  
**Commit:** `5e13fe5`  
**Scope:** GAP-RUV-006 (order lifecycle audit trail — PARTIAL)  
**Gates:** typecheck EXIT 0 (backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No stateMachine edits · No new dependencies

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-006 | **Order lifecycle audit trail — PARTIAL** — G-020 `StateMachineService` supports only `EntityType = 'TRADE' \| 'ESCROW' \| 'CERTIFICATION'`; `LifecycleState` schema has DB-level `CHECK entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')` constraint; wiring ORDER into G-020 requires schema migration + new log table + seed data (all out-of-scope). **Interim:** structured lifecycle audit event `action: 'order.lifecycle.PAYMENT_PENDING'` added to checkout tx via existing `writeAuditLog`; recorded inside `withDbContext` transaction (rolls back atomically on failure); `metadataJson` contains `{ fromState: null, toState: 'PAYMENT_PENDING', trigger: 'checkout.completed', orderId, cartId }`. **Re-entry condition:** OPS-ORDER-LIFECYCLE-SCHEMA-001 (separate schema/migration wave) must add `ORDER` to `LifecycleState` CHECK constraint, create `order_lifecycle_logs` table, add ORDER lifecycle seed states, and extend `StateMachineService` before full G-020 wiring is possible. | `server/src/routes/tenant.ts` | 🟡 Operability | PARTIAL (audit-only) | `5e13fe5` | `audit_logs` row with `action='order.lifecycle.PAYMENT_PENDING'`, `entity='order'`, `entityId=<orderId>`, `metadataJson.fromState=null`, `metadataJson.toState='PAYMENT_PENDING'`, `metadataJson.trigger='checkout.completed'` ✅ · `order.CHECKOUT_COMPLETED` audit preserved ✅ · checkout tx rolls back atomically if lifecycle audit insert fails ✅ · typecheck EXIT 0 · lint EXIT 0 |

---

# WL ADMIN — OPS-WLADMIN-PRODUCTS-MVP-001

**TECS:** OPS-WLADMIN-PRODUCTS-MVP-001  
**Date:** 2026-03-02  
**Commit:** `6a7bf41`  
**Scope:** G-WL-ADMIN Products panel — VALIDATED  
**Gates:** typecheck EXIT 0 (frontend) · lint: 0 new errors (pre-existing G-QG-001 debt in non-allowlisted files unchanged)  
**Non-goals preserved:** No server/src changes · No schema/migrations/RLS changes · No new dependencies · Collections/Orders/Domains remain stub

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| G-WL-ADMIN (Products panel) | **WL_ADMIN Products panel was WLStubPanel** — OWNER/ADMIN WL users could not manage inventory from the Store Admin console; Products nav item rendered a "Coming Soon" stub. **Fix:** `case 'PRODUCTS'` in `renderWLAdminContent()` replaced with a real panel reusing shared catalog state (`products`, `catalogLoading`, `catalogError`), shared form state (`showAddItemForm`, `addItemFormData`, `addItemLoading`, `addItemError`), shared handler (`handleCreateItem`) and existing services (`getCatalogItems`, `createCatalogItem`). Catalog `useEffect` extended to fire on `appState === 'WL_ADMIN'`. Labels prefixed `wl-` to avoid DOM `id` conflicts with B2B panel inputs. 403 from API surfaced via `addItemError`. Collections/Orders/Domains remain WLStubPanel. | `App.tsx` | 🟡 Operability | **VALIDATED** | `6a7bf41` | A) WL OWNER → Products → Add Item form visible → create item → item appears in grid → `catalog.item.created` audit row written ✅ · B) Catalog loads on enter (useEffect fires for WL_ADMIN) ✅ · C) Empty state: "No products yet" message shown ✅ · D) Error state: API error text displayed ✅ · typecheck EXIT 0 · 0 new lint errors |

**Re-entry conditions:**
- Collections panel: OPS-WLADMIN-COLLECTIONS-001 — ✅ **VALIDATED** (GOVERNANCE-SYNC-067: display-only panel scope complete; commit `3d67f4c`; model-backed collections is a new gap)
- Orders panel: OPS-WLADMIN-ORDERS-001
- Domains panel: OPS-WLADMIN-DOMAINS-001

---

# RCP-1 — Revenue Domain Completion Plan (Phase 1)

**Anchored:** 2026-03-02  
**Governance Sync:** GOVERNANCE-SYNC-041  
**Reconciliation TECS:** OPS-RCP1-GAP-RECONCILIATION-001  
**Scope:** Tenant Commerce Domain (revenue readiness) across Enterprise + White-label tenants, without shell drift.

## Objective
Complete the minimal revenue-operational loop so that:
- Tenants can sell (catalog present + manageable)
- Buyers can purchase (cart + checkout)
- Orders can be operationally managed (status progression + audit)
- WL_ADMIN and EXPERIENCE shells expose the same *capability set* (not merged planes)
- Governance and audit invariants remain enforced

## Explicit Non-Goals (Hard Stops)
- DOES NOT extend G-020 StateMachineService to ORDER (blocked by schema prerequisite)
- DOES NOT introduce new DB tables, migrations, schema changes, or RLS policy changes
- DOES NOT reopen D-5 (B1) — `app.roles` remains dormant for live requests; no DB-level role gates
- DOES NOT merge WL_ADMIN and EXPERIENCE shells; no cross-shell routing changes that erode appState boundaries
- DOES NOT implement payment gateway / PSP integration
- DOES NOT refactor components "for cleanliness" unless required by revenue correctness

## Canonical Drift Correction
The earlier draft notion of "OPS-ORDER-DOMAIN-STATE-GUARD-001 (lifecycle)" is corrected:
- Phase 1 implements **app-layer order status progression + audit**, not G-020 lifecycle.
- Full ORDER lifecycle state machine wiring requires a separate schema wave (see GAP-ORDER-LC-001).

## RCP-1 — Ordered TECS Sequence (Phase 1)
1. **OPS-ORDER-STATUS-TRANSITIONS-001**
   - Add app-layer guarded order status transitions with audit (no schema, no SM).
2. **OPS-WLADMIN-ORDERS-PANEL-001**
   - Replace WL_ADMIN Orders stub with real orders list + actions; consumes existing tenant APIs + transitions endpoint.
3. **OPS-EXPERIENCE-ORDERS-UX-001**
   - Ensure EXPERIENCE shell order management UX reaches parity with WL_ADMIN (capability parity, not shared plane).
4. **OPS-REVENUE-FLOW-VALIDATION-002**
   - E2E validation with explicit ceiling: PAYMENT_PENDING + app-layer transitions; verify audit trail.

## RCP-1 Commerce Gaps / Work Items (Formal Entries)

| Gap / Work ID | Description | Domain | Severity | Status | Dependencies | Notes / Stop Conditions |
|---|---|---|---|---|---|---|
| GAP-ORDER-LC-001 | ORDER lifecycle schema prerequisite (Future Wave): add ORDER to LifecycleState CHECK constraint; add order lifecycle log table + RLS; seed ORDER states; extend SM EntityType union | Backend / DB | 🔴 HIGH | ✅ **CLOSED** (GOVERNANCE-SYNC-063, 2026-03-03) — B1 ✅ schema foundation; B2/SEED-001 ✅ 4 ORDER transitions seeded; B3/SM-SERVICE-001 ✅ SM enforces ORDER transitions; B4/BACKEND-INTEGRATION-001 ✅ tenant.ts SM-driven; B5/UX-VALIDATION-001 ✅ 22 PASS / 0 FAIL proof; B6a/API-LIFECYCLE-001 ✅ orders enriched with lifecycleState + lifecycleLogs; **B6b/UX-B6B-001 ✅** WLOrdersPanel + EXPOrdersPanel: `deriveStatus()` + audit-log fetch removed; `canonicalStatus(order)` + `LifecycleHistory` component; typecheck EXIT 0; lint EXIT 0. Deferred: orders.status enum extension (ALTER TYPE ADD VALUE CONFIRMED/FULFILLED) — separate migration TECS. | GAP-ORDER-TRANSITIONS-001 (interim app-layer) | B6b complete. GAP-ORDER-LC-001 fully closed. |
| OPS-ORDERS-STATUS-ENUM-001 | `public.order_status` enum extended with CONFIRMED + FULFILLED (CANCELLED verified present — not re-added); deferred from GAP-ORDER-LC-001 B6b; migration `20260315000007_ops_orders_status_enum_001` | DB / Schema | 🟠 MED | ✅ **VALIDATED** (GOVERNANCE-SYNC-070, 2026-03-03) — PREFLIGHT PASS (CANCELLED confirmed); ALTER TYPE x2; VERIFIER PASS (all 5 labels: PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED); APPLY_EXIT:0; RESOLVE_EXIT:0; `prisma db pull` minimal diff; typecheck EXIT 0; lint EXIT 0 | GAP-ORDER-LC-001 (deferred item) | Ordered outside transaction — irreversible DDL applied safely with IF NOT EXISTS guard. |
| GAP-ORDER-TRANSITIONS-001 | App-layer order status transitions (Phase 1): PAYMENT_PENDING→CONFIRMED; CONFIRMED→FULFILLED/CANCELLED; OWNER/ADMIN only; audit `order.lifecycle.<state>` | Backend | 🟠 MED | **VALIDATED** — commit `0a03177` (TECS 1) | Existing orders APIs + audit infra | Must not touch G-020 SM. Must not add schema. Must use existing audit_logs. |
| GAP-WL-ORDERS-001 | WL_ADMIN Orders panel: replace WLStubPanel; render orders list + status actions; consume transitions endpoint | Frontend / WL_ADMIN | 🟠 MED | **VALIDATED** — this commit (TECS 2) | GAP-ORDER-TRANSITIONS-001 | Must not merge shells. May reuse presentational components only if shell-local state remains distinct. |
| GAP-EXP-ORDERS-001 | EXPERIENCE Orders UX parity: ensure order list + details + status actions exist and match WL_ADMIN capabilities | Frontend / EXPERIENCE | 🟡 LOW-MED | **VALIDATED** — this commit (TECS 3) | GAP-ORDER-TRANSITIONS-001 | Must not create a second backend path. Use same transition endpoint. |
| GAP-REVENUE-VALIDATE-002 | Revenue flow validation pass: provision → invite → activate → catalog → cart → checkout → order list → status transition → audit verification; ceiling = PAYMENT_PENDING + transitions | QA / Cross-cutting | 🟡 LOW | ✅ **VALIDATED** — TECS 5 complete (Phases 0–5 PASS — 16/16 checks; GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001, 2026-03-03) | Completion of above TECS | Phases 0–3 PASS (12/21 steps: DB/JWT, catalog create, cart→checkout→PAYMENT_PENDING, orders list + audit). Phases 4–5 unblocked once `rcp1_orders_update_unified_tenant_arm.sql` applied via psql. Re-run Phases 4–5 only: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`. Full ceiling: catalog create → cart → checkout → PAYMENT_PENDING → CONFIRMED → FULFILLED / CANCELLED + derivedStatus + audit trail. |
| GAP-RLS-ORDERS-UPDATE-001 | **Orders UPDATE blocked by RLS policy** — `orders_update_unified` policy (FOR UPDATE TO texqtic_app) has USING + WITH CHECK: `current_setting('app.is_admin', true) = 'true'`; withDbContext sets app.org_id/actor_id/realm/request_id + bypass_rls=off, but does NOT set app.is_admin (B1 decision: tenant actor context must not claim admin); row is visible via orders_select_unified (tenant-scoped SELECT) but invisible to UPDATE; privilege grant GRANT UPDATE applied (PG 42501 resolved → P2025 reveals row-policy block) | Backend / DB / RLS | 🔴 HIGH | ✅ **VALIDATED** (ops SQL applied to remote DB — APPLY_EXIT:0, DO-block VERIFY PASS; GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001, 2026-03-03) | GAP-REVENUE-VALIDATE-002, GAP-ORDER-TRANSITIONS-001 | A1 applied via governed ops SQL: `orders_update_unified` extended with tenant arm `(app.require_org_context() AND tenant_id = app.current_org_id()) OR (current_setting('app.is_admin'::text, true) = 'true'::text)` in both USING + WITH CHECK. Ops file: `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`. Apply: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`. Governance sign-off + DO-block verifier embedded in SQL. B1/D-5 posture preserved: no server code changed, `app.is_admin` not set for tenant actors. |

## Linkages to Existing Gaps
- **GAP-RUV-006 (Order lifecycle audit)** remains the canonical record:
  - Current: audit-only lifecycle entry at checkout (PAYMENT_PENDING)
  - Full lifecycle (G-020 style) is blocked until **GAP-ORDER-LC-001**
  - RCP-1 Phase 1 proceeds via **GAP-ORDER-TRANSITIONS-001** (app-layer transitions + audit) without schema changes.

---

## RCP-1 Phase 1 — Closeout (Revenue Domain Completion)

**Scope boundary (unchanged):** RCP-1 Phase 1 validates the Revenue Domain loop up to the ceiling of Order creation at PAYMENT_PENDING plus app-layer operational status actions (TECS 1), without schema migrations, RLS posture changes, lifecycle/G-020 integration, payment gateway work, or shell merges.

### Execution Ledger (Final)

| TECS | Work Item | Gap | Status | Commit |
|------|-----------|-----|--------|--------|
| TECS 1 | OPS-ORDER-STATUS-TRANSITIONS-001 | GAP-ORDER-TRANSITIONS-001 | ✅ VALIDATED | `0a03177` |
| TECS 2 | OPS-WLADMIN-ORDERS-PANEL-001 | GAP-WL-ORDERS-001 | ✅ VALIDATED | `5101b80` |
| TECS 3 | OPS-EXPERIENCE-ORDERS-UX-001 | GAP-EXP-ORDERS-001 | ✅ VALIDATED | `0c0535d` |
| TECS 4 | OPS-REVENUE-FLOW-VALIDATION-002 | GAP-REVENUE-VALIDATE-002 | ✅ VALIDATED | `b074fe1` (Phases 0–3) · OPS-RLS-ORDERS-UPDATE-001 ops SQL (Phases 4–5 unblocked, GOVERNANCE-SYNC-045) |

### What Is Validated End-to-End (Evidence-Backed)

Phases 0–3 PASS:
- Provision / Invite / Activate (JWT issuance and tenant-realm access) ✅
- Catalog create ✅
- Cart → Checkout ✅
- Order creation at checkout: PAYMENT_PENDING ✅
- Orders list and audit visibility ✅ (WL_ADMIN + EXPERIENCE)

### What Remains Blocked (Root-Cause Isolated — NOW RESOLVED)

Phases 4–5 were previously failing due to `orders_update_unified` RLS policy gating.
**RESOLVED via GOVERNANCE-SYNC-045 / OPS-RLS-ORDERS-UPDATE-001:**
- Governed ops SQL file `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` adds tenant arm to `orders_update_unified`.
- Governance sign-off embedded in SQL header. B1/D-5 posture preserved (no server code changed).
- Apply: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`
- Re-run Phases 4–5: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`

### Artifacts Produced (Auditable)

| Artifact | Path | Purpose |
|----------|------|---------|
| TECS 4 evidence report | `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` | Phases, results, blocker analysis, future-wave SQL proposal |
| Live evidence script | `server/scripts/validate-rcp1-flow.ts` | 21-step proof run with HTTP assertions + JWT minting |
| DB privilege ops file | `server/prisma/ops/rcp1_orders_update_grant.sql` | Auditable GRANT UPDATE (non-migration) |
| RLS ops file (NEW) | `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` | Governed DROP/CREATE for `orders_update_unified` with tenant arm; governance sign-off + DO-block verifier embedded (GOVERNANCE-SYNC-045) |
| Gap register | `governance/gap-register.md` | GOVERNANCE-SYNC-044 + GOVERNANCE-SYNC-045 + status updates |

### Deferred Action (RESOLVED — GOVERNANCE-SYNC-045)

**OPS-RLS-ORDERS-UPDATE-001 implemented.** Governed SQL ops file created and committed:
```sql
-- server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql
CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );
```
Apply to DB: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`

Then re-run Phases 4–5: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`

### Executive Close

RCP-1 Phase 1 is functionally complete and drift-neutral: revenue loop executes through checkout and order visibility across shells; remaining status-action validation is blocked only by DB RLS update gating and is isolated into a post-RCP-1 governed change (GAP-RLS-ORDERS-UPDATE-001).

---

# Future Waves (5+)

| Proposed Gap                           | Rationale                              | Assigned Wave |
| -------------------------------------- | -------------------------------------- | ------------- |
| DPP export signature bundles           | Regulator-facing export with audit URI | W4+           |
| Multi-region tenant routing            | Geographic isolation for compliance    | W5            |
| AI model drift detection + auto-freeze | Safety boundary for AI automation      | W5            |
| Real-time event streaming (WebSocket)  | Live audit feed for control plane      | W5            |

---

# Role Model + RLS Vocabulary Anchor (2026-03-01)

> **Anchored:** 2026-03-01. Investigation basis: TECS WAVE 3 TAIL / ROLE MODEL FOUNDATION investigation.
> Reference gaps: G-006C, G-006D, OPS-ENV-002, OPS-DB-RECOVER-001.
> This section is a permanent planning anchor — do not rewrite; append updates as addenda.

---

## 1. Agreed 3-Role Model — Stable Contract

### Tenant Admin (Org Admin)
- **Scope:** Single org/tenant. All DB reads and writes are RLS-scoped to one `tenant_id` via `app.org_id`.
- **Identity:** Real tenant user; `memberships` row exists with `MembershipRole` in (OWNER, ADMIN, MEMBER, VIEWER). JWT carries `userId` + `tenantId`.
- **DB context:** `withDbContext` → `app.org_id = <tenantId>`, `app.actor_id = <userId>`, `app.realm = 'tenant'`, `app.bypass_rls = 'off'`. `app.is_admin` is NOT set.
- **RLS enforcement:** `tenant_id = current_setting('app.org_id', true)` arm in all PERMISSIVE policies.
- **Note (current gap → RESOLVED B1):** `MembershipRole` stored in DB and on `request.userRole` but NEVER flows into DB GUC `app.roles`. RLS treats all tenant users identically. Role boundary is app-layer only. See decision point D-5 in gap list below.
- **Architectural decision (GOVERNANCE-SYNC-036 / 2026-03-02):** `app.roles` GUC is intentionally dormant for live requests. The plumbing exists (`withDbContext` sets it when `context.roles` is provided) but `buildContextFromRequest` does not populate `context.roles` for production requests. This is a deliberate choice — the app-layer chain (JWT verify → `getUserMembership()` → `request.userRole` → route guard) is already fail-closed and no currently-open threat model requires a redundant DB-level role gate. **B2 re-entry condition:** revisit only if (a) a new write path is added that a `MEMBER`/`VIEWER` could reach at the DB layer without passing through the app-layer role guard, AND (b) the attack surface cannot be closed by tightening the app-layer guard alone.

### Platform Admin (Control Plane Operator)
- **Scope:** Cross-tenant bounded reads and writes (support, compliance, finance ops). Cross-tenant only where RLS explicitly permits via `app.is_admin = 'true'`.
- **Identity:** Admin principal; `admin_users` row with `AdminRole` in (SUPER_ADMIN, SUPPORT, ANALYST). JWT carries `adminId` + `role`. Middleware: `adminAuthMiddleware` → `request.isAdmin = true`, `request.adminId`, `request.adminRole`.
- **DB context:** `withAdminContext` → sentinel `orgId = actorId = '00000000-0000-0000-0000-000000000001'`, `realm = 'control'`, then `app.is_admin = 'true'`. Context: `buildContextFromRequest` is NOT used for admin routes (would fail-closed on missing `orgId`).
- **RLS enforcement:** `current_setting('app.is_admin', true) = 'true'` arm in PERMISSIVE policies + RESTRICTIVE guard admin arm.
- **Capability flag:** `app.is_admin` is the current runtime capability flag for platform admin identity.

### Superadmin (Platform Controller / Orchestrator) — FUTURE FLAG
- **Scope:** All operations including privileged overrides (e.g., force-void, cross-tenant destructive actions). Must be explicit and audited; never accidental.
- **Identity:** `AdminRole.SUPER_ADMIN` exists in DB enum (schema.prisma line 999) and seeded. `requireAdminRole('SUPER_ADMIN')` helper exported from `auth.ts` line 90. Currently zero runtime differentiation from Platform Admin at DB/RLS level.
- **DB context (GUC plumbing complete):** `app.is_superadmin = 'true'` GUC set by `withSuperAdminContext` (GOVERNANCE-SYNC-033). **Zero RLS policies currently consume this GUC** — confirmed by full migration grep with 0 policy matches.
- **Required:** Add `is_superadmin='true'` arms to INSERT/UPDATE/DELETE policies on `impersonation_sessions` + escalation UPDATE. See `docs/security/SUPERADMIN-RLS-PLAN.md` (OPS-RLS-SUPERADMIN-001-DISCOVERY-001, GOVERNANCE-SYNC-071).

---

## 2. CRITICAL DB Vocabulary Mismatch — D-1 — MUST FIX BEFORE CONTINUING

**Status: VALIDATED (realm mismatch fixed) — GOVERNANCE-SYNC-027**

> ✅ Fixed 2026-03-01 via OPS-RLS-ADMIN-REALM-001. `app.require_admin_context()` now checks `realm='control'` + `is_admin='true'` + `actor_id NOT NULL`. impersonation_sessions RLS is no longer dead-code.

### The Mismatch
| Layer | Value set | Source |
|-------|-----------|--------|
| `withAdminContext` (TypeScript) | `realm = 'control'` | `database-context.ts` line ~590; `DatabaseContext` union type = `'tenant' \| 'control'` |
| `app.current_realm()` SQL function comment | values: `'tenant'` or `'control'` | Gate-A migration comment |
| `app.require_admin_context()` | checks `current_realm() = 'admin'` | Gate-D7 migration line 17 |
| **Result** | `require_admin_context()` is **always FALSE** in production | Dead function |

### Impact
Any policy that uses `app.require_admin_context()` as a predicate is permanently fail-closed (always blocks) for all production admin operations:
- `impersonation_sessions` SELECT/INSERT/UPDATE unified policies: all fail-closed → impersonation cannot function under RLS.
- These tables survive today only because the service (`impersonation.service.ts`) uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app`, bypassing RLS as the postgres superuser (`BYPASSRLS`). This is security debt, not correctness.

### Long-term Vocabulary Principle
- `app.realm` is a **plane identifier** only. Values: `tenant`, `control`, `system`, `test`. Do NOT use realm to grant privileges.
- Platform admin capability → explicit flag: `app.is_admin = 'true'` (current) → `app.is_platform_admin = 'true'` (future rename, controlled TECS).
- Superadmin capability → separate flag: `app.is_superadmin = 'true'` (future).
- Never use `realm = 'admin'`; the admin plane IS the control plane (`realm = 'control'`).

### Safe Remediation Path
- **Short term (Wave 3 tail — P0):** Fix `app.require_admin_context()` DB function to treat `realm IN ('control')` as admin-capable, OR retire the function and key off `app.is_admin = 'true'` + `actor_id NOT NULL` directly. Either path resolves the dead-function gap.
- **Medium term:** If `app.is_admin` is renamed to `app.is_platform_admin`, do so via a single controlled TECS with a migration covering all policy references in one transaction.

---

## 3. audit_logs Mixed Policy State — Decision: Option B

**Current state (as of 2026-03-01):**
- `rls.sql` creates `audit_logs_tenant_read` (PERMISSIVE SELECT).
- Migration `20260304000000_gatetest003_audit_logs_admin_select` creates `audit_logs_admin_select` (PERMISSIVE SELECT, `tenant_id IS NULL` only) + extends `audit_logs_guard` RESTRICTIVE with admin arm.
- Gatetest003 verifier DO block expects `audit_logs_select_unified` + `audit_logs_admin_select` = exactly 2 SELECT policies. If `audit_logs_tenant_read` was never dropped, count = 3 → verifier FAIL.

### Option A — Drop audit_logs_admin_select; rely on existing unified tenant policy
**Pros:** Fastest. Minimal SQL touch if unified already has admin arm.
**Cons:**
- If remaining unified policy is tenant-only, platform admin loses cross-tenant audit visibility.
- Does not fix naming drift (`audit_logs_tenant_read` vs expected `audit_logs_select_unified`).
- Higher regression risk: removing known admin gate without confirming remaining policy covers admin arm.
- **Only safe if** live `pg_policies.qual` for the remaining SELECT policy explicitly includes `OR current_setting('app.is_admin', true) = 'true'`.

### Option B — Single unified SELECT policy with tenant OR admin arm; remove extra admin policy ✅ CHOSEN
**Pros:**
- Cleanest structure: one PERMISSIVE SELECT for `texqtic_app`.
- Explicitly enforces cross-tenant admin reads through `app.is_admin`.
- Removes naming drift; establishes canonical policy name `audit_logs_select_unified`.
- Future-proof: add `OR current_setting('app.is_superadmin', true) = 'true'` arm without creating new policies.

**Required reconciliation steps for Option B:**
1. Drop `audit_logs_tenant_read` (rls.sql name) and `audit_logs_admin_select`.
2. Create `audit_logs_select_unified` with qual:
   - `(org_id IS NOT NULL AND tenant_id::text = current_setting('app.org_id', true))` — tenant arm
   - `OR current_setting('app.is_admin', true) = 'true'` — platform admin arm (cross-tenant, NO `tenant_id IS NULL` restriction — see key semantic decision below)
3. Confirm gatetest003-equivalent verifier count = 1 (unified) + verify RESTRICTIVE guard unchanged.

**Key semantic decision recorded:** Platform admin cross-tenant audit reads SHOULD include tenant-scoped rows (not only `tenant_id IS NULL`). Rationale: admin investigation requires reading "what did tenant X do?" The `tenant_id IS NULL` restriction in `audit_logs_admin_select` was a conservative first pass; Option B removes it. Mandatory compensating control: all control-plane read endpoints that query `audit_logs` MUST log via `writeAuditLog` (see D-3 gap, and TECS item below).

**Decision:** Option B. Record: "audit_logs SELECT consolidation → single `audit_logs_select_unified` policy; admin arm without `tenant_id IS NULL` restriction; mandatory read-audit logging on all control-plane GET /audit-logs handlers."

---

## 4. Gap List — Wave 3 Tail Specific Gaps

| ID | Gap | Severity | First identified |
|----|-----|---------|-----------------|
| D-1 | `app.require_admin_context()` always returns FALSE in production; `realm = 'admin'` never set; impersonation RLS dead-code | **CRITICAL** | 2026-03-01 investigation |
| D-2A | `AdminRole.SUPER_ADMIN` — capability plumbing: zero runtime GUC differentiation from other admin roles | **VALIDATED — OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033** (plumbing only: `withSuperAdminContext` + `app.is_superadmin` GUC set; proof endpoint `/whoami` verified) | 2026-03-01 investigation |
| D-2B | `AdminRole.SUPER_ADMIN` — capability enforcement: no route-level OR DB-level guard prevents SUPPORT/ANALYST from reaching SUPER_ADMIN-only surfaces | **VALIDATED — OPS-SUPERADMIN-ENFORCEMENT-001 / GOVERNANCE-SYNC-034** (`requireAdminRole('SUPER_ADMIN')` preHandler on 5 surfaces; tenant provision audit gap also closed) | 2026-03-01 investigation |
| D-3 | All admin READ endpoints (`GET /api/control/*`) are unlogged — no `writeAuditLog` call on any of 9 GET handlers | **VALIDATED — OPS-CONTROL-READ-AUDIT-001 / GOVERNANCE-SYNC-032** | 2026-03-01 investigation |
| D-4 | `impersonation.service` uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app` — operates as postgres BYPASSRLS superuser; RLS not enforced for impersonation writes | **VALIDATED (BYPASSRLS path removed) — GOVERNANCE-SYNC-028** | 2026-03-01 investigation |
| D-5 | `MembershipRole` (OWNER/ADMIN/MEMBER/VIEWER) never flows to `app.roles` GUC; RLS treats all tenant users identically — role boundary is app-layer only. **Decision B1:** DB role-agnostic by design; `app.roles` intentionally never activated for live requests; role enforcement is app-layer only (JWT → membership lookup → `request.userRole` → route guard). B2 re-entry condition documented in Role Model section above. | **RESOLVED (B1 — app-layer only)** | 2026-03-01 investigation; resolved 2026-03-02 GOVERNANCE-SYNC-036 |
| D-6 | `audit_logs` mixed policy naming: `audit_logs_tenant_read` (rls.sql) coexists with gatetest003 expectation of `audit_logs_select_unified`; verifier may fail depending on apply order | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation |
| D-7 | `audit_logs_admin_select` restricts admin reads to `tenant_id IS NULL` rows only — blocks cross-tenant investigation reads | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation (resolved by Option B above) |
| D-8 | `withDbContext` sets `bypass_rls = 'off'` but does NOT explicitly reset `app.is_admin`; pooler theoretically could bleed `is_admin='true'` from prior tx (mitigated by SET LOCAL semantics) | **LOW** | 2026-03-01 investigation |

---

## 5. Wave 3 Tail — Priority Ladder (No-Drift Execution Order)

Established 2026-03-01. Must not be reordered without a new governance anchor.

```
P0 — OPS-RLS-ADMIN-REALM-001
     Fix require_admin_context() dead function (D-1)
     Blocks: impersonation RLS correctness; D-4 fix pre-req
     Direction: keep realm='control'; update DB function to check
                realm IN ('control') instead of realm = 'admin',
                OR remove realm check entirely and key off
                app.is_admin + actor_id NOT NULL
     → MUST complete before Wave 3.1+ RLS consolidation resumes

P1 — G-006C-AUDIT-LOGS-UNIFY-001
     Resolve audit_logs mixed state using Option B (D-6, D-7)
     + add control-plane read-audit logging (D-3)
     Targets:
       - Platform admin can read cross-tenant audit rows (no tenant_id IS NULL)
       - Tenant admin reads only own-tenant rows
       - Admin GET /api/control/audit-logs is logged via writeAuditLog
     → Only after P0

P2 — Remaining G-006C RLS consolidation waves
     (carts, cart_items, memberships, other tables per wave board)
     → Only after P0 + P1
```

---

## 6. Queued TECS Sequence (Plan → Implement)

| TECS ID | Title | Priority | Blocks | Notes |
|---------|-------|---------|--------|-------|
| **OPS-RLS-ADMIN-REALM-001** | Fix admin realm mismatch — `require_admin_context()` dead function | ✅ COMPLETE | All control-plane RLS correctness; impersonation.service refactor | Migration `20260301120000_ops_rls_admin_realm_fix` applied. GOVERNANCE-SYNC-027. |
| **G-006C-AUDIT-LOGS-UNIFY-001** | audit_logs Option B consolidation + admin-view audit logging | ✅ COMPLETE | D-3, D-6, D-7 | Single `audit_logs_select_unified` (tenant+admin arms). Admin sees 93 rows cross-tenant. Legacy policies dropped. `ADMIN_AUDIT_LOG_VIEW` auditing added to GET /audit-logs. GOVERNANCE-SYNC-029. |
| **OPS-IMPERSONATION-RLS-001** | Wire `impersonation.service` through `withAdminContext` (fix D-4) | ✅ COMPLETE | Impersonation security correctness | All 3 functions use `withAdminContext`. Typecheck EXIT 0. Lint 0 errors. RLS verified. GOVERNANCE-SYNC-028. |
| **G006C-ORDERS-GUARD-001** | orders + order_items: RESTRICTIVE guard (FOR ALL TO texqtic_app) + role normalization {public} → texqtic_app + admin arm preserved as `current_setting('app.is_admin')` (NOT bypass_enabled — confirmed non-equivalent in Gate 1) | ✅ COMPLETE | P0 gate | Migration `20260302000000_g006c_orders_guard_normalize` applied psql EXIT:0; DO block VERIFIER PASS; SIM1 tenant=org-scoped ✅; SIM2 control+nonadmin=0 rows ✅; SIM3 control+admin=4 rows cross-tenant ✅; Prisma ledger synced; GOVERNANCE-SYNC-030 |
| **G006C-EVENT-LOGS-CLEANUP-001** | event_logs: DROP 2 orphan PERMISSIVE ALL deny policies (anon + authenticated) | ✅ COMPLETE | Pre-req: G006C-ORDERS-GUARD-001 COMPLETE ✅ | Migration `20260302010000_g006c_event_logs_cleanup` applied psql EXIT:0; DO block VERIFIER PASS; 0 PERMISSIVE ALL remain; guard {texqtic_app} intact; select+insert_unified intact; Prisma ledger synced; GOVERNANCE-SYNC-031 |
| **OPS-CONTROL-READ-AUDIT-001** | Control-plane GET read auditing coverage (no SQL) — 14 GET handlers across 6 route files now emit `writeAuditLog(prisma, createAdminAudit(...))` on 200 success; action strings: `control.tenants.read`, `control.tenants.read_one`, `control.feature_flags.read`, `control.events.read`, `control.finance.payouts.read`, `control.compliance.requests.read`, `control.disputes.read`, `control.trades.read`, `control.escrows.read`, `control.escrows.read_one`, `control.certifications.read`, `control.certifications.read_one`, `control.escalations.read`, `control.traceability.nodes.read`, `control.traceability.edges.read`; audit_logs.read (`ADMIN_AUDIT_LOG_VIEW`) pre-existing; `/system/health` excluded (infrastructure) | ✅ COMPLETE | D-3 | Files: `control.ts`, `control/trades.g017.ts`, `control/escrow.g018.ts`, `control/certifications.g019.ts`, `control/escalation.g022.ts`, `admin/traceability.g016.ts`. Typecheck EXIT 0. Sim A: 2 rows confirmed. Sims B+C: 0 rows. GOVERNANCE-SYNC-032. |
| **OPS-SUPERADMIN-CAPABILITY-001** | Superadmin capability flag + canonical DB context helper — `withSuperAdminContext` exported from `database-context.ts`; sets `app.is_admin='true'` + `app.is_superadmin='true'` (tx-local); no RLS policy changes; no renaming of `app.is_admin`; proof endpoint `GET /api/control/whoami` returns `adminRole`, `isSuperAdmin`, `contextMode` | ✅ COMPLETE | D-2A (plumbing) | Files: `server/src/lib/database-context.ts`, `server/src/routes/control.ts`. Typecheck EXIT 0. Lint EXIT 0. DB Sims A/B/C PASS. GOVERNANCE-SYNC-033. D-2B (enforcement) remains OPEN — see OPS-SUPERADMIN-ENFORCEMENT-PLAN-001. |
| **OPS-SUPERADMIN-ENFORCEMENT-001** | SUPER_ADMIN route-layer enforcement — `requireAdminRole('SUPER_ADMIN')` preHandler on 9 route registrations across 5 high-risk surfaces: impersonation start+stop, tenant provision, payout approve+reject, escalation upgrade+resolve, feature-flag PUT. Also closes tenant provision audit gap (Tier B: `control.tenants.provisioned`). No RLS changes. No schema changes. | ✅ COMPLETE | D-2B (enforcement) | Files: `admin/impersonation.ts`, `admin/tenantProvision.ts`, `control.ts`, `control/escalation.g022.ts`. Typecheck EXIT 0. Lint EXIT 0. GOVERNANCE-SYNC-034. |
| **OPS-CONTROL-HARDENING-PHASE-2-001** | Control Plane Hardening Phase 2 — drift & audit CI guardrails. Static scan of all 10 control-plane route files; Guard 1: write-side audit enforcement (17 mutation routes, 0 violations); Guard 2: SUPER_ADMIN surface lock (8/8 surfaces confirmed gated); CI artifact `artifacts/control-plane-manifest.json` (37 routes). No runtime logic changes. No DB changes. No auth changes. No migrations. | ✅ COMPLETE | — | Files: `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`, `package.json` (scripts only). Guard EXIT 0 on main. GOVERNANCE-SYNC-035. |
| **G-006C-WAVE3-REMAINING** | Remaining Wave 3 RLS consolidation — fix admin arm (`bypass_enabled` → `is_admin='true'`) + RESTRICTIVE guard admin arm for each table; one migration per table | ✅ COMPLETE | GOVERNANCE-SYNC-055 | ✅ cart_items (20260303110000, applied GOVERNANCE-SYNC-048) ✅ catalog_items (20260315000000, applied GOVERNANCE-SYNC-051) ✅ memberships (20260315000001, applied GOVERNANCE-SYNC-052) ✅ tenant_branding (20260315000002, applied GOVERNANCE-SYNC-053) ✅ tenant_domains (20260315000003, applied GOVERNANCE-SYNC-054) ✅ impersonation_sessions (20260315000004, applied GOVERNANCE-SYNC-055, admin-only pattern: require_admin_context + admin_id actor arm). All Wave 3 Tail tables complete. |
| **OPS-RLS-SUPERADMIN-001** | Introduce `app.is_superadmin` GUC-backed RLS policies on SUPER_ADMIN-exclusive write surfaces — `impersonation_sessions` INSERT/UPDATE/DELETE + `escalation_events` UPDATE narrowed to `is_superadmin='true'`; service migration `startImpersonation`/`stopImpersonation` → `withSuperAdminContext`; `feature_flags` KNOWN LIMITATION (postgres BYPASSRLS path). Plan: `docs/security/SUPERADMIN-RLS-PLAN.md`. Proposed migrations: `20260315000008` (`impersonation_sessions`) + `20260315000009` (`escalation_events`) | 🔄 **IN PROGRESS** — discovery complete (GOVERNANCE-SYNC-071, 2026-03-03) | D-2A (`withSuperAdminContext` plumbing ✅) | Execution blocked pending user sign-off per SUPERADMIN-RLS-PLAN.md Section F |

---

## 7. Validation Proof — OPS-RLS-ADMIN-REALM-001 (GOVERNANCE-SYNC-027)

**Date:** 2026-03-01
**Migration:** 20260301120000_ops_rls_admin_realm_fix
**Prisma ledger:** marked applied via prisma migrate resolve --applied

### Pre-apply function body (recorded)
```sql
SELECT app.current_realm() = 'admin'
  AND app.current_actor_id() IS NOT NULL;
```

### Post-apply function body (confirmed)
```sql
SELECT
    current_setting('app.realm', true) = 'control'
    AND NULLIF(current_setting('app.actor_id', true), '') IS NOT NULL
    AND current_setting('app.is_admin', true) = 'true';
```

### Simulation Results

| Test | Realm | actor_id | is_admin | Expected | Result |
|------|-------|----------|----------|----------|--------|
| TEST2_control_admin | control | set | true | 	rue | ✅ 	 |
| TEST3_tenant_admin | tenant | set | true | alse | ✅  |
| TEST4_control_nonadmin | control | set | false | alse | ✅  |

All 3 simulations PASS. D-1 closed.

---

## 8. Capability Vocabulary Anchor (OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033)

**Established:** 2026-03-02

Canonical vocabulary for TexQtic runtime authorization context:

| Concept | GUC / field | Values | Notes |
|---------|-------------|--------|-------|
| **Plane / Realm** | `app.realm` | `tenant` \| `control` \| `system` \| `test` | Set by `withDbContext` via `DatabaseContext.realm` |
| **Platform Admin flag** | `app.is_admin` | `'true'` only | Set by `withAdminContext` and `withSuperAdminContext`; checked by `_admin_all` RLS policies |
| **Superadmin capability flag** | `app.is_superadmin` | `'true'` only | Set ONLY by `withSuperAdminContext`; tx-local; no RLS policies use this yet (future wave) |

**Rules (non-negotiable):**
- `withDbContext` MUST NOT set or clear `app.is_superadmin`
- `withAdminContext` MUST NOT set `app.is_superadmin`
- `app.is_admin` is NOT renamed in this TECS (rename deferred to future wave)
- Superadmin is always a strict superset of Platform Admin (`is_admin=true AND is_superadmin=true`)

---

## 9. CI Guardrail Proof — OPS-CONTROL-HARDENING-PHASE-2-001 (GOVERNANCE-SYNC-035)

**Date:** 2026-03-02  
**Files added:** `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`  
**Runtime impact:** None — CI static analysis only. No route files changed. No auth middleware changed. No schema changed.

### Guard 1 — Write-side Audit Enforcement

Scans all mutation routes (POST|PUT|PATCH|DELETE) under `/api/control` for file-level audit token presence.

| Route | Audit Evidence | Result |
|-------|---------------|--------|
| PUT /api/control/feature-flags/:param | writeAuditLog | ✅ |
| POST /api/control/finance/payouts/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/finance/payouts/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/resolve | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/escalate | writeAuthorityIntent | ✅ |
| POST /api/control/escalations | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/upgrade | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/resolve | writeAuditLog | ✅ |
| POST /api/control/trades/:param/transition | writeAuditLog | ✅ |
| POST /api/control/escrows/:param/transition | writeAuditLog | ✅ |
| POST /api/control/settlements/preview | allowlisted (D-020-B: read-only POST) | ✅ |
| POST /api/control/settlements | writeAuditLog | ✅ |
| POST /api/control/impersonation/start | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/impersonation/stop | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/tenants/provision | writeAuditLog | ✅ |

**Mutation routes checked: 17. Violations: 0.**

### Guard 2 — SUPER_ADMIN Surface Lock

| Surface | Source File | preHandler Guard | Result |
|---------|-------------|-----------------|--------|
| POST /api/control/impersonation/start | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/impersonation/stop | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/tenants/provision | admin/tenantProvision.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/approve | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/reject | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/upgrade | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/resolve | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| PUT /api/control/feature-flags/:param | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |

**Required surfaces: 8. Gated: 8. Violations: 0.**

### Guard Run Output (on main)

```
guard EXIT 0
Routes scanned: 37 across 10 files
Mutation routes checked: 17
Audit violations: 0
SUPER_ADMIN violations: 0
Artifact: artifacts/control-plane-manifest.json
```

### Allowlist Design Decisions

| Category | Entry | Rationale |
|----------|-------|----------|
| Write-audit allowlist | `POST /api/control/settlements/preview` | D-020-B: balance derived from ledger SUM; zero DB mutations; zero state changes; POST used only for request body (not mutation semantics) |
| Service-delegation | `server/src/routes/admin/impersonation.ts` | Audit written by `startImpersonation()` / `stopImpersonation()` service functions; confirmed at Phase 2 Review 2026-03-02 |

