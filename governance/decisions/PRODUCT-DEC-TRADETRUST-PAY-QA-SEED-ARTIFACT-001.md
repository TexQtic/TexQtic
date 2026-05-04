# PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ARTIFACT-001

**Status:** COMPLETE  
**Date:** 2025-05-27  
**Commit:** (pending — see §Commit Message)  
**Unit:** Unit 2 of TTP Activation Readiness Sprint (Option B)  
**Governance parent:** `PRODUCT-DEC-TRADETRUST-PAY-FULL-RUNTIME-AUDIT-001.md`  
**Prerequisite:** `PRODUCT-DEC-TRADETRUST-PAY-ACTIVATION-GATE-PRODUCTION-VERIFIED-001.md` (Unit 1 — COMPLETE, commit `374ac27`)

---

## Plan

Unit 2 of the TTP Activation Readiness Sprint: create the QA seed data artifact (`scripts/qa-ttp-seed.sql`) that populates the minimum viable dataset required to execute all TTP happy-path flows in a QA/staging environment.

All 8 data gaps identified in the Full Runtime Audit (`PRODUCT-DEC-TRADETRUST-PAY-FULL-RUNTIME-AUDIT-001.md §7`) must be addressed. The artifact must:

1. Be idempotent (safe to re-run).
2. Never activate TTP (`ttp_enabled` remains `false`).
3. Never execute against production (pre-flight and post-seed assertions enforced in the SQL itself).
4. Use deterministic sentinel UUIDs (prefixed `ee000000-`) for reliable cross-reference.
5. Not require Prisma migration commands or schema changes.

---

## Findings / Root Cause

Audit confirmed 8 absent QA data gaps blocking Unit 3 (E2E Activation Readiness Verification):

| Gap | Description | Status Before |
|-----|-------------|---------------|
| Gap 1 | Org with APPROVED `gst_verifications` record | ❌ Absent |
| Gap 2 | `ttp_eligibility_assessments` with outcome ELIGIBLE | ❌ Absent |
| Gap 3 | Invoice in VERIFIED or SUBMITTED state | ❌ Absent |
| Gap 4 | VPC in ACTIVE state | ❌ Absent |
| Gap 5 | VPC in ROUTING_READY state | ❌ Absent |
| Gap 6 | `ttp_enrollment_logs` record to_state=REQUESTED | ❌ Absent |
| Gap 7 | `ttp_enrollment_logs` record to_state=APPROVED | ❌ Absent |
| Gap 8 | Trade with complete TTP readiness chain | ❌ Absent (all above missing) |

Root cause: The TTP foundation migration (`20260515120000_ttp_foundation_001`) created all tables and seeded lifecycle states and feature flags, but no QA seed data was provisioned. The full TTP implementation (Slices 1–7, commit `becb171`) was built and verified against production but never had QA scenario data for happy-path testing.

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `scripts/qa-ttp-seed.sql` | CREATE | QA seed data artifact |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ARTIFACT-001.md` | CREATE | This governance record |

No schema changes. No Prisma migration commands. No `.env` modifications.

---

## Changes Made

### `scripts/qa-ttp-seed.sql`

A 12-section SQL transaction artifact:

**Data created (all idempotent — ON CONFLICT DO NOTHING):**

| UUID | Type | Description |
|------|------|-------------|
| `ee000000-...-000000000001` | `tenants` + `organizations` | QA TTP Seller Org (slug: `qa-ttp-seller-001`) |
| `ee000000-...-000000000002` | `tenants` + `organizations` | QA TTP Buyer Org (slug: `qa-ttp-buyer-001`) |
| `ee000000-...-000000000010` | `trades` | QA Trade: INR 500,000 (seller → buyer) |
| `ee000000-...-000000000030` | `gst_verifications` | APPROVED GST record for seller org (Gap 1) |
| `ee000000-...-000000000040` | `ttp_eligibility_assessments` | ELIGIBLE, risk_tier=1, max_invoice=250000 INR (Gap 2) |
| `ee000000-...-000000000020` | `invoices` | QA-INV-001: VERIFIED (Gap 3, source for VPC ACTIVE) |
| `ee000000-...-000000000021` | `invoices` | QA-INV-002: VERIFIED (source for VPC ROUTING_READY) |
| `ee000000-...-000000000022` | `invoices` | QA-INV-003: SUBMITTED (Gap 3, InvoiceOversight queue) |
| `ee000000-...-000000000050` | `verified_payable_certificates` | VPC 1: ACTIVE (Gap 4) |
| `ee000000-...-000000000051` | `verified_payable_certificates` | VPC 2: ROUTING_READY (Gap 5) |
| `ee000000-...-000000000060` | `partner_routing_stubs` | NBFC_STUB stub for VPC 2, status=PENDING |
| `ee000000-...-000000000070` | `ttp_enrollment_logs` | LOG-1: NULL → REQUESTED (Gap 6) |
| `ee000000-...-000000000071` | `ttp_enrollment_logs` | LOG-2: REQUESTED → APPROVED (Gap 7) |

**Safety mechanisms embedded in the artifact:**

1. **Pre-flight guard (§0):** Aborts the entire transaction if `ttp_enabled = true` is detected. Prevents accidental seed execution in a live-TTP environment.
2. **Post-seed assertion (§10):** Re-checks `ttp_enabled = false` after all writes. Fails loudly if the flag changed mid-transaction.
3. **Idempotency:** All INSERTs use `ON CONFLICT (id) DO NOTHING` (except `gst_verifications` which uses `ON CONFLICT (org_id) DO NOTHING` to respect its UNIQUE constraint on `org_id`).
4. **Verification queries (§11):** Commented SELECT statements to confirm seed correctness after execution.
5. **Cleanup section (§12):** Commented, dependency-ordered DELETE statements. Includes note about `ttp_enrollment_logs` immutability trigger requiring explicit superuser action before cleanup.

**Execution requirement:**  
Script must be run as `postgres` (superuser) or Supabase `service_role`. These roles bypass `FORCE ROW LEVEL SECURITY` automatically. Running via `texqtic_app` role is not supported for this seed.

---

## Validation Run

This artifact is a SQL file intended for QA/staging environment execution. It has not been and must not be executed against production.

**Pre-artifact validation (schema compatibility checks):**

| Check | Method | Result |
|-------|--------|--------|
| `tenants` required fields | `schema.prisma` lines 11–49 | ✅ `id, slug, name` only required; all others have defaults |
| `organizations` required fields | `schema.prisma` lines 1052–1110 | ✅ `id, slug, legal_name` only required; `effective_at` has `@default(now())` |
| `trades` required fields | `schema.prisma` lines 845–887 | ✅ `tenant_id, buyer_org_id, seller_org_id, lifecycle_state_id, trade_reference, currency, gross_amount` |
| `gst_verifications` UNIQUE | `migration.sql` §12 | ✅ `UNIQUE(org_id)` — guarded with `ON CONFLICT (org_id) DO NOTHING` |
| `invoices` UNIQUE | `migration.sql` §5 | ✅ `UNIQUE(org_id, trade_id, invoice_number)` — different invoice numbers per insert |
| `verified_payable_certificates` UNIQUEs | `schema.prisma` lines 1635+ | ✅ `UNIQUE(invoice_id)` and `UNIQUE(vpc_reference)` — distinct per VPC |
| `ttp_enrollment_logs` append-only | `migration.sql` (immutability trigger) | ✅ INSERT only; no UPDATE path in seed |
| `ttp_eligibility_assessments` no UNIQUE | `schema.prisma` lines 1592–1611 | ✅ Multiple assessments per org allowed; ON CONFLICT (id) only needed |
| `lifecycle_state_id` subqueries | `migration.sql` §32–33 (INVOICE + VPC seeds) | ✅ VERIFIED, SUBMITTED (INVOICE) and ACTIVE, ROUTING_READY (VPC) confirmed seeded by TTP-FOUNDATION-001 |
| RLS bypass pattern | `migration.sql` §7, §15 | ✅ `app.bypass_enabled()` — requires postgres/service_role execution |
| UUID validity | Manual inspection | ✅ All UUIDs use `ee000000-0000-0000-0000-00000000000X` — valid hex format |

**Artifact not executed:** Per TexQtic governance doctrine, QA seed artifacts are reviewed and committed as staging-only artifacts. Execution against a QA/staging environment is part of Unit 3 validation.

---

## Gap Coverage Matrix

| Audit Gap | Seed Section | Record Type | Key Field |
|-----------|-------------|-------------|-----------|
| Gap 1: APPROVED GST | §4 | `gst_verifications` | `review_outcome = 'APPROVED'` |
| Gap 2: ELIGIBLE assessment | §5 | `ttp_eligibility_assessments` | `eligibility_outcome = 'ELIGIBLE'`, `risk_tier = 1` |
| Gap 3: VERIFIED invoice | §6 INV-001 + INV-002 | `invoices` | state_key = 'VERIFIED' |
| Gap 3: SUBMITTED invoice | §6 INV-003 | `invoices` | state_key = 'SUBMITTED' |
| Gap 4: VPC ACTIVE | §7 VPC 1 | `verified_payable_certificates` | state_key = 'ACTIVE' |
| Gap 5: VPC ROUTING_READY | §7 VPC 2 | `verified_payable_certificates` | state_key = 'ROUTING_READY' |
| Gap 6: Enrollment REQUESTED | §9 LOG-1 | `ttp_enrollment_logs` | `to_state = 'REQUESTED'` |
| Gap 7: Enrollment APPROVED | §9 LOG-2 | `ttp_enrollment_logs` | `to_state = 'APPROVED'` |
| Gap 8: Full readiness chain | §3–§9 combined | All TTP tables | All upstream gates satisfied |

---

## Risks / Follow-up

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `ttp_enrollment_logs` immutability trigger blocks cleanup | LOW | §12 documents that `DISABLE TRIGGER` requires explicit superuser approval. Cleanup is not required for QA testing. |
| Trade `lifecycle_state_id` resolved via `LIMIT 1` subquery | LOW | The trade lifecycle state is not tested in TTP happy-path flows. Any valid TRADE state satisfies FK integrity. If no TRADE lifecycle states exist, the INSERT will fail with a NOT NULL violation — operator must seed TRADE states first. |
| `invoices` `lifecycle_state_id` subquery could return NULL | MEDIUM | If TTP-FOUNDATION-001 migration was not applied, INVOICE lifecycle states won't exist. The INSERT will fail with a FK violation. Mitigation: confirm migration is applied before running seed. |
| `gst_verifications.gstin = '27AAACQ0000A1ZX'` is not a real GSTIN | INTENTIONAL | This is by design. QA data must not reference real legal entities or real GST registrations. The service layer's GSTIN format validation is not enforced at the DB level (no regex CHECK constraint). |
| `ttp_enabled` remains `false` | INTENTIONAL | This seed never activates TTP. Unit 3 sign-off (separate governance decision) is required before activation. |

**Follow-up required:**
- **Unit 3:** E2E Activation Readiness Verification — execute the seed against QA/staging, then verify all 6 TTP routes return expected non-503 responses when called with valid auth and seed data.
- **Unit 3 gate:** operator must apply this seed to the staging environment, run verification queries (§11), and confirm all 8 gaps are resolved before proceeding to TTP activation.

---

## Activation Invariant

This decision record explicitly affirms:

> **`ttp_enabled` is `false` as of this commit. TTP is NOT activated. The kill-switch remains active in production.**

No change to `feature_flags.ttp_enabled` is made by this artifact. TTP activation requires a separate, explicitly governed commit with Unit 3 sign-off.

---

## Commit Message

```
[TEXQTIC] tradetrust-pay: add qa seed artifact (Unit 2)
```
