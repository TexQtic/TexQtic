# UNIT: SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH

**Unit type:** Bug fix  
**Status:** COMPLETE — committed  
**Authored:** 2026-07-14  
**Author:** GitHub Copilot (instructed by Paresh Patel)

---

## 1. Authority Boundary

This unit operates within the **public inquiry route** (`server/src/routes/public.ts`) and its **unit tests** (`server/src/__tests__/public-buyer-inquiry.unit.test.ts`).

No frontend changes. No schema changes. No migrations. No `.env` changes. No Vercel/Postmark configuration. No TLRH index updates.

---

## 2. References

| Reference | Detail |
|---|---|
| Prior implementation | `9fa8b12` — `[TEXQTIC] feat: inquiry notification loop (FTR-B2C-004 / PRIT-033)` |
| Runtime verification | `be2cf9f` — `[TEXQTIC] governance: runtime verify P1B inquiry notification loop — partial (email dispatch not delivered)` |
| Verification status | `PARTIAL_VERIFIED — Blocking finding recorded` |
| Blocking finding | Fire-and-forget IIFE abandoned by Vercel serverless execution context after `reply.send()` |
| Feature ref | FTR-B2C-004 / PRIT-033 |
| Design authority | MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004 |

---

## 3. TLRH Storage Note

This unit is a bug fix to production behaviour confirmed via runtime verification. It does not introduce new capability. The canonical implementation record remains at `9fa8b12` (notification loop). This unit patches the serverless lifecycle defect discovered during runtime verification (`be2cf9f`).

Git is the truth for all code changes. This governance artifact records intent, root cause, and verification state.

---

## 4. Inputs Reviewed

- `server/src/routes/public.ts` — full supplier-path and general-path dispatch blocks (read before modification)
- `server/src/__tests__/public-buyer-inquiry.unit.test.ts` — all 33 existing tests (INQ-001 through INQ-033)
- `api/index.ts` — Vercel serverless handler entry point (`await fastify.server.emit(...)`)
- `server/src/services/email/email.service.ts` — email dispatch wrappers (read-only; not modified)
- `server/src/config/index.ts` — `ADMIN_NOTIFICATION_EMAIL` config field (read-only; not modified)
- Runtime verification artifact at `be2cf9f`
- Postmark activity log (verified: 0 inquiry emails reached Postmark during controlled test)

---

## 5. Runtime Failure Summary (from `be2cf9f`)

**Controlled test performed:** POST `/api/public/inquiry/submit` with `buyer_email` and `supplier_slug` to production `https://app.texqtic.com` at 02:23:55 UTC.

**Response observed:** 202 Accepted. X-Vercel-Id: `bom1::iad1::brf5g-1779416635165-e50663707ce8`.

**Email outcome:** Postmark quota counter unchanged (11/100 before AND after). Zero inquiry emails appeared in Postmark activity log (All Time filter, verified by page read). No buyer acknowledgement, no supplier notification, no admin alert.

**SMTP configuration:** All 5 SMTP vars confirmed present in Vercel production environment. Postmark `ACTIVE_EXTERNAL_SEND_ENABLED`. DKIM and RETURN_PATH verified. Email service `isSmtpConfigured()` returns true in production.

---

## 6. Root Cause

`api/index.ts` exports:
```typescript
export default async function handler(req, res) {
  await fastify.server.emit('request', req, res);
}
```

This `await` resolves when the Fastify route handler's returned promise resolves — i.e., when `reply.send()` is called. After `reply.send()`, the route handler promise resolves, the `await fastify.server.emit(...)` resolves, the Vercel handler function returns, and **Vercel freezes the Lambda execution context immediately**.

The original dispatch used:
```typescript
void (async () => {
  // ... build dispatches ...
  await Promise.allSettled(_dispatches);
})().catch(...);
return reply.status(202).send({ ... });
```

The IIFE is started but **not awaited**. `reply.send()` is called while `Promise.allSettled` is still pending. The Lambda context is frozen before the IIFE's internal `await` can complete. **No emails are dispatched.**

This affects both the **supplier-path dispatch block** and the **general-path dispatch block** identically.

---

## 7. Files Modified

| File | Change type |
|---|---|
| `server/src/routes/public.ts` | Bug fix — two dispatch blocks refactored |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | Tests added — INQ-034, INQ-035, INQ-036; config mock added |

---

## 8. Implementation Summary

### `server/src/routes/public.ts`

**Supplier-path dispatch block** (previously ~lines 1406–1469):

Removed the `void (async () => { ... })().catch(...)` wrapper entirely. The dispatch logic (DB lookup + email pushes) is now executed directly in the route handler's `async` function body, wrapped in `try/catch` for failure isolation. `Promise.race` with a 4 000 ms timeout guard replaces bare `Promise.allSettled`:

```typescript
// Before reply.send():
const _notificationTimeoutMs = 4000;
await Promise.race([
  Promise.allSettled(_dispatches),
  new Promise<void>(resolve => setTimeout(resolve, _notificationTimeoutMs)),
]);
return reply.status(202).send({ ... });
```

**General-path dispatch block** (previously ~lines 1500–1543):

Same transformation. `void (async () => { ... })().catch(...)` removed. Dispatch logic moved inline, wrapped in `try/catch`, with identical `Promise.race` timeout guard before `reply.send()`.

### `server/src/__tests__/public-buyer-inquiry.unit.test.ts`

**Config mock added** at top of vi.mock block:
```typescript
vi.mock('../config/index.js', () => ({
  config: { ADMIN_NOTIFICATION_EMAIL: null as string | null },
}));
```

**`config` imported** in imports section.

**`beforeEach` reset** added: `(config as { ADMIN_NOTIFICATION_EMAIL: string | null }).ADMIN_NOTIFICATION_EMAIL = null;`

**New tests added:**

- `INQ-034` — General inquiry with `buyer_email` → `sendBuyerInquiryAcknowledgementEmail` called before 202 returned.
- `INQ-035` — General inquiry with `ADMIN_NOTIFICATION_EMAIL` configured → `sendAdminInquiryAlertEmail` called with correct address before 202 returned.
- `INQ-036` — Notification timeout (4 000 ms via `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync(5000)`) → route still returns 202 even when email service hangs indefinitely.

---

## 9. Timeout Behaviour

The `Promise.race` guard ensures:
- If all dispatches settle within 4 000 ms → race resolves immediately, route returns 202.
- If any dispatch hangs past 4 000 ms → timeout resolves the race, route returns 202.
- The per-dispatch `.catch()` handlers remain in place for individual failure isolation.
- No `try/catch` on the race itself is needed beyond the outer `try/catch` block; the timeout resolve is graceful and never throws.

The 4 000 ms value is conservative for Vercel's default serverless function timeout (10 s for Hobby, 60 s for Pro). It leaves sufficient headroom for the route to complete and return 202 before any hard Vercel timeout.

---

## 10. Failure-Safe Behaviour

| Failure scenario | Behaviour |
|---|---|
| Email service throws (SMTP error) | Per-dispatch `.catch()` logs warn; `Promise.allSettled` settles; route returns 202 |
| Email service hangs indefinitely | Timeout resolves `Promise.race` at 4 000 ms; route returns 202 |
| Supplier DB lookup throws | Outer `try/catch` catches; `fastify.log.warn` emitted; route falls through to 202 |
| Outer `try/catch` catches any unexpected error | `fastify.log.warn` emitted; route falls through to 202 |
| All dispatches succeed | `Promise.allSettled` settles; route returns 202 |

**In all cases: route returns 202. Email dispatch outcome does not affect the buyer-facing response.**

---

## 11. PII Safety

`buyer_email` is still **transient only** — used for dispatch context but never pushed to `afterJson` or any persistence layer. Confirmed unchanged. INQ-032 regression test continues to verify this.

No other PII handling changes.

---

## 12. Test / Validation Results

| Check | Command | Result |
|---|---|---|
| TypeScript typecheck | `cd server && npx tsc --noEmit` | ✅ Exit 0, no errors |
| Unit tests | `pnpm exec vitest run src/__tests__/public-buyer-inquiry.unit.test.ts` | ✅ 36/36 passed (INQ-001 through INQ-036) |

Tests INQ-034, INQ-035, INQ-036 all green on first run.

---

## 13. Remaining Blockers

| Blocker | Description |
|---|---|
| Runtime re-verification required | Fix must be deployed to production and a controlled inquiry must confirm Postmark receives emails. Quota counter must increase by ≥ 1. Email content must match expected templates. |
| PRIT-034 | Legal pages (Privacy Policy, Terms of Service) — required for full D2C launch; not addressed here |
| INQ-COPY-02 / INQ-COPY-24 | Email copy refinement — subject lines and body text review; not addressed here |
| Postmark webhook future design | Delivery receipts / bounce handling deferred; not in scope for this fix |

---

## 14. Recommended Next Packet

**`SOFT-LAUNCH-F1-P1B-FIX-RV`** — Runtime verify awaited inquiry notification dispatch.

Objective: deploy this fix to production, submit a controlled inquiry with `buyer_email` and `supplier_slug`, and confirm:
1. Route returns 202 within acceptable latency.
2. Postmark quota counter increments.
3. Buyer acknowledgement email received at test address.
4. Supplier notification email received at supplier owner address (if resolvable).
5. Admin alert email received at `ADMIN_NOTIFICATION_EMAIL` address.

---

## 15. Commit

```
[TEXQTIC] fix: await inquiry notifications before response
```

**Staged files (only):**
- `server/src/routes/public.ts`
- `server/src/__tests__/public-buyer-inquiry.unit.test.ts`
- `governance/units/SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md`
