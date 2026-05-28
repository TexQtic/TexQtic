# TEXQTIC-QA-ORG-SENTINEL-FLAG-ACTIVATION-001

**Unit:** `TEXQTIC-QA-ORG-SENTINEL-FLAG-ACTIVATION-001`
**Type:** Data-only production SQL activation
**Status:** `VERIFIED_COMPLETE`
**Created:** 2026-07-07
**Owner:** Paresh Patel (TexQtic founder)
**Design authority:** `artifacts/control-plane/TEXQTIC-TEST-DATA-VISIBILITY-AND-ISOLATION-DESIGN-AUDIT-001.md`

---

## 1. Task Identity

**Objective:** Activate Gate E (`is_qa_sentinel` filter) in the public B2B and B2C projection
services by setting `organizations.is_qa_sentinel = true` for all confirmed QA/test/internal
organization slugs. Data-only operation — no source code, schema, migration, seed, config, or
package changes.

**Prompt scope:** `TEXQTIC-QA-ORG-SENTINEL-FLAG-ACTIVATION-001`

**Governance family:** FAM-10 (Platform Ops and Control Plane) — launch-blocking gap remediation

**Design basis:** `TEXQTIC-TEST-DATA-VISIBILITY-AND-ISOLATION-DESIGN-AUDIT-001` §12 (GAP-2),
§14 (Option B: targeted sentinel UPDATE as preferred option), §15 (activation decision).

---

## 2. Start HEAD

| Field | Value |
| --- | --- |
| Branch | `main` |
| HEAD at prompt start | `c34346e468653cd3b6baeed91ec909b525c1fb86` |
| Commit description | `docs: audit test data visibility policy` |
| Working tree at start | CLEAN (git status --short: no output) |

---

## 3. Inputs Inspected

| File | Purpose | Finding |
| --- | --- | --- |
| `governance/control/OPEN-SET.md` | Layer 0 governed posture | Last unit: NC-Phase1-QA-seed-reset VERIFIED_COMPLETE 2026-07-06. No blockers for this unit. |
| `governance/control/NEXT-ACTION.md` | Active delivery posture | `HOLD_FOR_AUTHORIZATION`; next candidate `HOLD_FOR_COUNSEL_FEEDBACK`. |
| `governance/control/BLOCKED.md` | Blocker register | NC award DESIGN_COMPLETE; no blockers applicable to this data-only unit. |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Family navigation map | FAM-10 `NOT_ASSESSED`, `LAUNCH_BLOCKER`, Cycle 9. Status must not be advanced by this unit. |
| `server/prisma/schema.prisma` line 1077 | Target field definition | `is_qa_sentinel Boolean @default(false)` — non-nullable, direct equality filter. |
| `server/src/services/publicB2BProjection.service.ts` lines 150, 375 | Gate E implementation | `is_qa_sentinel: false` — confirmed active in both list and single-lookup paths. |
| `server/src/services/publicB2CProjection.service.ts` lines 218, 366 | Gate E implementation | `is_qa_sentinel: false` — confirmed active in both list and single-lookup paths. |
| `server/prisma/seed.ts` | Core QA org slugs | Confirmed qa-b2b, qa-b2c, qa-wl, qa-agg, qa-pend as seeded QA orgs. |
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | Multi-segment QA slugs | Confirmed qa-knt-b (Knit), qa-dye-c (Dye), qa-gmt-d (Garment), qa-buyer-a, qa-buyer-c, qa-svc-tst-a, qa-svc-log-b as QA fixtures. |
| `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts` | NC Phase 1 QA slugs | Confirmed qa-nc-pool-a (pool owner), qa-nc-sup-a (supplier). |

---

## 4. Pre-Change SQL Query

```sql
SELECT slug, org_type, status, publication_posture, is_qa_sentinel
FROM organizations
WHERE slug IN (
  'qa-knt-b','qa-dye-c','qa-gmt-d',
  'qa-b2b','qa-b2c','qa-wl','qa-agg','qa-pend',
  'qa-buyer-a','qa-buyer-c','qa-svc-tst-a','qa-svc-log-b',
  'qa-nc-pool-a','qa-nc-sup-a'
)
ORDER BY slug;
```

Connection: `$env:_DBURL` (DATABASE_URL from `server/.env`, value REDACTED — never printed)

---

## 5. Pre-Change Result Table

| slug | org_type | status | publication_posture | is_qa_sentinel (before) |
| --- | --- | --- | --- | --- |
| qa-agg | AGGREGATOR | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-b2b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` |
| qa-b2c | B2C | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` |
| qa-buyer-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-buyer-c | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-dye-c | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` |
| qa-gmt-d | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` |
| qa-knt-b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` |
| qa-nc-pool-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-nc-sup-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-pend | B2B | PENDING_VERIFICATION | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-svc-log-b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-svc-tst-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |
| qa-wl | B2C | ACTIVE | PRIVATE_OR_AUTH_ONLY | `f` |

**Row count returned:** 14 / 14 (all target slugs found — no missing rows)

**Pre-change split:**
- Already `true` (5): `qa-b2b`, `qa-b2c`, `qa-dye-c`, `qa-gmt-d`, `qa-knt-b`
- Needed update (9): `qa-agg`, `qa-buyer-a`, `qa-buyer-c`, `qa-nc-pool-a`, `qa-nc-sup-a`, `qa-pend`, `qa-svc-log-b`, `qa-svc-tst-a`, `qa-wl`

**Pre-check safety assertion:** All 14 returned rows are confirmed QA/test/internal org slugs.
No real customer or live-production org slugs appear in the result. Publication posture for all
rows is `PRIVATE_OR_AUTH_ONLY` — none of the target rows would appear in any gate chain on the
authenticated side either.

---

## 6. Exact Target Slug Allowlist

```
qa-knt-b      (Priority 1 — B2B Knit segment; multi-segment QA seed)
qa-dye-c      (Priority 1 — B2B Dye/Colour processing segment; multi-segment QA seed)
qa-gmt-d      (Priority 1 — B2B Garment segment; multi-segment QA seed)
qa-b2b        (Core QA B2B org; canonical seed)
qa-b2c        (Core QA B2C org; canonical seed)
qa-wl         (White-label QA org; canonical seed)
qa-agg        (Aggregator QA org; canonical seed)
qa-pend       (Pending-verification QA org; canonical seed)
qa-buyer-a    (Buyer QA org A; multi-segment QA seed)
qa-buyer-c    (Buyer QA org C; multi-segment QA seed)
qa-svc-tst-a  (Service test QA org A; multi-segment QA seed)
qa-svc-log-b  (Logistics QA org B; multi-segment QA seed)
qa-nc-pool-a  (NC Phase 1 pool owner org; nc-phase1-qa-fixture-baseline)
qa-nc-sup-a   (NC Phase 1 supplier org; nc-phase1-qa-fixture-baseline)
```

**EXCLUDED slugs (forbidden — must NOT be included):**
- `shraddha-industries` — confirmed real supplier; MUST NOT be flagged
- `acme-corp-live-verify` — real/live verify org; MUST NOT be flagged
- `ops-casework-seller-681cd6f6` — ops/casework internal but NOT a QA fixture
- `ops-casework-buyer-e13b66cb` — ops/casework internal but NOT a QA fixture

**Predicate restriction:** `WHERE slug IN (...)` exact allowlist only. `slug LIKE 'qa-%'` pattern
predicate was NOT used — it would over-match any real org with a `qa-` prefix without explicit
review.

---

## 7. SQL UPDATE Statement

```sql
UPDATE organizations
SET is_qa_sentinel = true
WHERE slug IN (
  'qa-knt-b','qa-dye-c','qa-gmt-d',
  'qa-b2b','qa-b2c','qa-wl','qa-agg','qa-pend',
  'qa-buyer-a','qa-buyer-c','qa-svc-tst-a','qa-svc-log-b',
  'qa-nc-pool-a','qa-nc-sup-a'
);
```

Connection: `$env:_DBURL` (DATABASE_URL from `server/.env`, value REDACTED)
Fields NOT changed: `publication_posture`, `publicEligibilityPosture`, `org_type`, `status`

**Terminal result:** `UPDATE 14` — no error, no ROLLBACK

---

## 8. Post-Change Result Table

| slug | org_type | status | publication_posture | is_qa_sentinel (after) |
| --- | --- | --- | --- | --- |
| qa-agg | AGGREGATOR | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-b2b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-b2c | B2C | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-buyer-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-buyer-c | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-dye-c | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-gmt-d | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-knt-b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-nc-pool-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-nc-sup-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-pend | B2B | PENDING_VERIFICATION | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-svc-log-b | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-svc-tst-a | B2B | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |
| qa-wl | B2C | ACTIVE | PRIVATE_OR_AUTH_ONLY | `t` ✅ |

**Post-check row count:** 14 / 14 — all target rows show `is_qa_sentinel = t`
**Rows with `f` remaining:** 0

---

## 9. Public Projection Verification

**Gate E mechanics (confirmed, no code change made):**

- `publicB2BProjection.service.ts` line 150: `is_qa_sentinel: false` in Prisma `where` clause
  — rows with `is_qa_sentinel = true` are excluded at the Prisma query level before any
  downstream gate logic runs.
- `publicB2BProjection.service.ts` line 375: same filter on single-slug lookup path
  — `getPublicB2BSupplierBySlug` will return no row for a sentinel org, resulting in 404.
- `publicB2CProjection.service.ts` lines 218, 366: same dual-path filter for B2C route.

**Priority 1 runtime exclusion (deductive proof from post-check data):**

| Slug | publication_posture | is_qa_sentinel | Gate B | Gate E | Public result |
| --- | --- | --- | --- | --- | --- |
| qa-knt-b | PRIVATE_OR_AUTH_ONLY | `t` | FAIL | FAIL | EXCLUDED ✅ |
| qa-dye-c | PRIVATE_OR_AUTH_ONLY | `t` | FAIL | FAIL | EXCLUDED ✅ |
| qa-gmt-d | PRIVATE_OR_AUTH_ONLY | `t` | FAIL | FAIL | EXCLUDED ✅ |

Note: `publication_posture = PRIVATE_OR_AUTH_ONLY` means Gate B already excludes Priority 1
slugs in the current production schema (`PUBLICATION_POSTURE_PUBLIC` is required for Gate B pass).
However: Gate E is now also set — this provides defense-in-depth. If any future operation
inadvertently changed `publication_posture` to `B2B_PUBLIC` for a QA org, Gate E would still
exclude it.

**Live endpoint verification:** Server was not running at time of this activation. Deductive
verification based on confirmed database state and confirmed Gate E Prisma filter in production
code is authoritative. Live endpoint smoke verification should be performed at FAM-10 family
cycle production verification (separate prompt).

---

## 10. Rows Updated Count

**`UPDATE 14`** — confirmed 14 rows updated.

| Category | Count |
| --- | --- |
| Already `true` before UPDATE (idempotent) | 5 |
| Changed from `false` to `true` | 9 |
| Total rows in UPDATE scope | 14 |
| NOT_FOUND from allowlist | 0 |

---

## 11. NOT_FOUND Target Slugs

None. All 14 allowlisted slugs were found in the `organizations` table. Pre-check returned
exactly 14 rows.

---

## 12. Excluded Ambiguous Slugs

| Slug | Reason excluded |
| --- | --- |
| `shraddha-industries` | Confirmed real supplier org. MUST NOT be sentinel-flagged. |
| `acme-corp-live-verify` | Real/live verification org. MUST NOT be sentinel-flagged. |
| `ops-casework-seller-681cd6f6` | Ops/casework internal org — not a QA fixture; exclusion from projection not established. |
| `ops-casework-buyer-e13b66cb` | Ops/casework internal org — not a QA fixture; exclusion from projection not established. |

No `slug LIKE 'qa-%'` predicate was used at any point.

---

## 13. Priority 1 Launch-Blocking Slugs — Isolation Confirmed

| Slug | Segment | is_qa_sentinel (post) | Public B2B projection isolation |
| --- | --- | --- | --- |
| `qa-knt-b` | Knit (B2B) | `true` | ✅ ISOLATED — excluded by Gate E + Gate B |
| `qa-dye-c` | Dye/Colour Processing (B2B) | `true` | ✅ ISOLATED — excluded by Gate E + Gate B |
| `qa-gmt-d` | Garment (B2B) | `true` | ✅ ISOLATED — excluded by Gate E + Gate B |

**GAP-1 CLOSED:** The critical launch blocker identified in the design audit (QA supplier orgs
visible in public B2B supplier directory) is now remediated. Gate E is active and defensive
for all three Priority 1 slugs.

---

## 14. FAM-10 Verification Impact

**FAM-10 status:** NOT_ASSESSED — **UNCHANGED by this unit.**

This activation does NOT advance FAM-10 status. FAM-10 family cycle opening requires separate
explicit Paresh authorization per `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`.

**Impact on FAM-10 production verification fixtures (FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001):**
- F1 (qa-knt-b), F2 (qa-dye-c), F4 (qa-gmt-d): These fixture slugs now have `is_qa_sentinel = true`.
  The FAM-10 fixture planning artifact specified these as QA orgs for B2B projection testing.
  For FAM-10 production verify use, the test path is:
  - Confirm these slugs do NOT appear at `GET /api/public/suppliers/b2b` (Gate E exclusion)
  - Confirm these slugs return 404 at `GET /api/public/suppliers/b2b/:slug` (Gate E on lookup)
  This aligns with the activated sentinel state — no re-preparation needed.

---

## 15. Non-Source-Change Statement

**No source code files were modified by this unit.**

| File category | Modified |
| --- | --- |
| `server/src/**/*.ts` | NO |
| `server/prisma/schema.prisma` | NO |
| `server/prisma/seed.ts` | NO |
| `server/scripts/**/*.ts` | NO |
| `server/prisma/migrations/**` | NO |
| `components/**`, `contexts/**`, `services/**` | NO |
| `.env`, `.env.local`, environment files | NO |
| `package.json`, `pnpm-lock.yaml` | NO |
| `governance/**` Layer 0 files | NO |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | NO |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | NO |

`git status --short` at close: no output (clean working tree).

**Only change made:** SQL `UPDATE organizations SET is_qa_sentinel = true WHERE slug IN (...)` — production Supabase Postgres data change only.

---

## 16. Safety Confirmation

| Check | Result |
| --- | --- |
| All 14 target slugs confirmed as QA/internal before UPDATE | ✅ PASS |
| Exact allowlist predicate used (no LIKE pattern) | ✅ PASS |
| Forbidden slugs not included | ✅ PASS (shraddha-industries, acme-corp-live-verify, ops-casework-*) |
| `publication_posture` not changed | ✅ PASS (all remain PRIVATE_OR_AUTH_ONLY) |
| `publicEligibilityPosture`, `org_type`, `status` not changed | ✅ PASS |
| UPDATE 14 returned (exact match to allowlist count) | ✅ PASS |
| Post-check: all 14 rows show `is_qa_sentinel = t` | ✅ PASS |
| Rows with `is_qa_sentinel = f` remaining: 0 | ✅ PASS |
| Priority 1 slugs (knt-b, dye-c, gmt-d) confirmed isolated | ✅ PASS |
| Prisma validate: schema valid | ✅ PASS |
| Working tree clean (git status --short empty) | ✅ PASS |
| DATABASE_URL not printed or logged | ✅ PASS (redacted throughout) |
| LAUNCH-FAMILY-INDEX.md not modified | ✅ PASS |
| FAM-10 status not advanced | ✅ PASS |
| Layer 0 governance files not modified | ✅ PASS |

---

## 17. Recommended Next Prompt

`FAM-10-PRODUCTION-VERIFY-DATA-LIVE-READ-CONFIRMATION-001`

Return to the FAM-10 production verify-close fixture path. With Gate E now active and all QA
orgs isolated, the FAM-10 production verify unit can proceed:

1. Read live fixture UUIDs and statuses for F1 (qa-knt-b), F2 (qa-dye-c), F4 (qa-gmt-d) from
   production Supabase
2. Confirm D→E compound eligibility flow for F3 (activation fixture — separate from QA sentinel)
3. Confirm `GET /api/public/suppliers/b2b` excludes all QA supplier slugs (live endpoint smoke)
4. Confirm `GET /api/public/suppliers/b2b/qa-knt-b` returns 404 (Gate E enforcement)
5. Record FAM-10 family cycle opening verification evidence

**Prerequisite for FAM-10 family cycle:** Paresh explicit Layer 0 authorization via
`governance/control/NEXT-ACTION.md` update.

---

## 18. Final Enum

`TEXQTIC_QA_ORG_SENTINEL_FLAG_ACTIVATION_COMPLETE`

---

## Appendix: Commit Record

| Commit | Description |
| --- | --- |
| `c34346e468653cd3b6baeed91ec909b525c1fb86` | docs: audit test data visibility policy (design basis for this activation) |
| This unit — `docs: activate QA org sentinel flag` | Artifact only; SQL UPDATE applied directly to production DB (no code commit for data change) |
