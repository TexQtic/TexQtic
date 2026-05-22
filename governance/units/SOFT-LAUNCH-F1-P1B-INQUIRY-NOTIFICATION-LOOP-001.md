# SOFT-LAUNCH-F1-P1B — Public Inquiry Notification Loop

**Unit ID:** SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001
**Feature refs:** FTR-B2C-004 / PRIT-033
**Status:** COMPLETE
**Date:** 2026-07-15

---

## 1. Objective

Implement the minimum viable public inquiry notification loop for the pre-auth
buyer inquiry endpoint (`POST /api/public/inquiry/submit`).

On each accepted inquiry, dispatch up to three non-blocking email notifications:

| Recipient | Condition | Wrapper |
|---|---|---|
| Buyer | `buyer_email` field present in request | `sendBuyerInquiryAcknowledgementEmail` |
| Supplier owner/admin | Supplier path only; membership resolved | `sendSupplierInquiryNotificationEmail` |
| Platform admin | `ADMIN_NOTIFICATION_EMAIL` env var set | `sendAdminInquiryAlertEmail` |

All three dispatches are **fire-and-forget** (non-blocking). A failure in any
notification path MUST NOT affect the 202 response to the buyer.

---

## 2. Files Changed

| File | Change type |
|---|---|
| `server/src/config/index.ts` | Added `ADMIN_NOTIFICATION_EMAIL` (optional, safeParse, non-fatal → `null`) |
| `server/src/services/email/email.service.ts` | Added `InquiryNotificationContext` interface + 3 wrappers |
| `server/src/routes/public.ts` | Added `buyer_email` to inquiry schema; added notification dispatch in both supplier and general paths |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | Updated prisma + email mocks; added INQ-028 – INQ-033 |
| `server/src/__tests__/email-inquiry-wrappers.unit.test.ts` | New: EML-001 – EML-008 |

---

## 3. Design Decisions

### 3.1 `buyer_email` is transient — never persisted

`buyer_email` is extracted from the Zod-parsed body but intentionally excluded
from `afterJson`. This prevents buyer PII from entering the audit log while still
allowing the acknowledgement email to be dispatched.

INQ-032 asserts this guarantee explicitly.

### 3.2 `ADMIN_NOTIFICATION_EMAIL` is non-fatal

Parsed via `z.string().email().safeParse(...)` outside the main `envSchema.parse()`
call. An invalid or absent value resolves to `null` and admin notification is
silently skipped. Server startup is unaffected.

### 3.3 Supplier email resolved via Membership model

No `contact_email` column exists on the `organizations` table. Supplier email is
resolved best-effort via:

```typescript
prisma.membership.findFirst({
  where: { tenantId: supplierOrgId, role: { in: ['OWNER', 'ADMIN'] } },
  orderBy: { role: 'desc' }, // 'OWNER' (O) > 'ADMIN' (A) alphabetically
  include: { user: { select: { email: true } } },
});
```

If no OWNER/ADMIN membership is found, supplier notification is skipped with a
`fastify.log.warn` entry. The 202 response is unaffected.

### 3.4 Notification templates — non-overpromising

Buyer acknowledgement template asserts only: "Your inquiry has been recorded by
TexQtic." It does NOT claim the supplier has received or replied.

EML-004 and EML-005 enforce this at test level.

---

## 4. Schema / Migration Impact

**None.** No schema.prisma changes. No migration required.

---

## 5. Verification Evidence

### Typecheck

```
pnpm exec tsc --noEmit  (from server/)
→ No output (zero errors)
```

### Tests

```
Vitest — targeted run
Files: public-buyer-inquiry.unit.test.ts, email-inquiry-wrappers.unit.test.ts
Result: 41 passed, 0 failed

Tests added:
  INQ-028: supplier inquiry with buyer_email → buyer + supplier notifications dispatched
  INQ-029: no buyer_email → buyer acknowledgement not dispatched, still 202
  INQ-030: supplier email lookup fails → route still returns 202 (non-blocking)
  INQ-031: email service throws → route still returns 202 (non-blocking)
  INQ-032: buyer_email is NOT persisted in afterJson
  INQ-033: validation failure → no notification dispatched, 400 returned
  EML-001: sendBuyerInquiryAcknowledgementEmail returns DEV_LOGGED in test env
  EML-002: sendSupplierInquiryNotificationEmail returns DEV_LOGGED in test env
  EML-003: sendAdminInquiryAlertEmail returns DEV_LOGGED in test env
  EML-004: buyer acknowledgement does NOT claim supplier received or replied
  EML-005: buyer acknowledgement does NOT contain guarantee/promise language
  EML-006: invalid `to` address → throws EmailValidationError
  EML-007: supplier notification text includes geo_band and volume_band
  EML-008: admin alert text includes supplier_slug when present
```

---

## 6. Governance Review

- **db-naming-rules.md:** N/A — no schema changes
- **schema-budget.md:** N/A — no schema changes
- **rls-policy.md:** N/A — notification dispatch uses no DB writes
- **openapi.tenant.json / openapi.control-plane.json:** N/A — no new endpoints; `buyer_email` is an optional additive field on existing endpoint
- **event-names.md:** N/A — notification dispatch is email-only; no event emission added

---

## 7. Security Notes

- `buyer_email` is validated by Zod (`z.string().email().max(255)`) before use
- `buyer_email` is passed only to `sendBuyerInquiryAcknowledgementEmail` and is never logged, never persisted in `afterJson`, never returned in the response
- `ADMIN_NOTIFICATION_EMAIL` is never printed in logs (redacted by governance rule)
- Supplier owner email is resolved from the database and passed directly to `sendSupplierInquiryNotificationEmail` — never logged at DEBUG level

---

## 8. Commit

```
[TEXQTIC] feat: implement public inquiry notification loop
```
