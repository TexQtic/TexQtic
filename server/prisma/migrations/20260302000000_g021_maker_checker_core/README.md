# G-021 Day 2 – Maker–Checker Core Migration

**Migration ID:** `20260302000000_g021_maker_checker_core`  
**Task ID:** G-021-DAY2-SCHEMA-SERVICE  
**Date:** 2026-03-02  
**Doctrine:** v1.4 + Addendum Draft v1  
**Constitutional Review:** APPROVED 2026-02-24  
**Directives:** D-021-A · D-021-B · D-021-C  

## What This Migration Creates

| Object | Type | Notes |
|---|---|---|
| `public.pending_approvals` | TABLE | One record per in-flight MC request. D-021-A hash + D-021-C fingerprint. |
| `public.approval_signatures` | TABLE | Append-only Checker decisions. Three-layer immutability. |
| `pending_approvals_active_unique` | PARTIAL UNIQUE INDEX | D-021-B: active slot uniqueness over REQUESTED + ESCALATED. |
| `prevent_approval_signature_modification()` | FUNCTION | Layer 2 immutability backstop → raises P0001 on UPDATE/DELETE. |
| `trg_immutable_approval_signature` | TRIGGER BEFORE UPDATE/DELETE | Calls immutability function on `approval_signatures`. |
| `check_maker_checker_separation()` | FUNCTION SECURITY DEFINER | D-021-C: DB-level Maker≠Checker enforcement → raises P0002. |
| `trg_check_maker_checker_separation` | TRIGGER AFTER INSERT | Calls D-021-C function on `approval_signatures`. |
| RLS policies × 10 | POLICY | org-scoped SELECT/INSERT; UPDATE/DELETE denied or org-scoped. |

## Prerequisite Migrations

- G-015 Phase A: `public.organizations` table must exist (live FK target).
- G-020 Day 2: `public.lifecycle_states` table must exist (pre-flight check).

## Soft References (No FKs — recorded for future hardening)

| Column | Target | Hardening Gate |
|---|---|---|
| `pending_approvals.entity_id` | `trades.id` / `escrow_accounts.id` | G-017, G-018 |
| `pending_approvals.escalation_id` | `escalation_records.id` | G-022 |

## Rollback

This migration has no automatic rollback. To reverse manually (requires `postgres` role):

```sql
DROP TRIGGER IF EXISTS trg_check_maker_checker_separation ON public.approval_signatures;
DROP TRIGGER IF EXISTS trg_immutable_approval_signature ON public.approval_signatures;
DROP FUNCTION IF EXISTS public.check_maker_checker_separation();
DROP FUNCTION IF EXISTS public.prevent_approval_signature_modification();
DROP TABLE IF EXISTS public.approval_signatures;
DROP TABLE IF EXISTS public.pending_approvals;
```

**Do not run in production without explicit authorization from TexQtic Platform Lead.**
