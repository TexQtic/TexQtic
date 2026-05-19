# PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001

**Unit ID:** PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001
**Status:** VERIFIED_COMPLETE
**Verified:** PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001-VERIFY-CLOSE
**Date:** 2026-05-19
**Verification Date:** 2026-05-19
**Tracker Section:** 32
**Design Authority:** PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001 / Phase 2

---

## 1. Purpose

Activates the general inquiry form on `/inquiry` when no valid `supplierSlug` is present.

Phase 1 showed a passive no-context landing (copy + "Find suppliers" CTA). Phase 2 replaces it with a live general inquiry form that submits without `supplier_slug`, using `source_surface: 'GENERAL_PUBLIC'`. The backend endpoint (`POST /api/public/inquiry/submit`) was already Phase 2-ready from `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`.

---

## 2. Files Changed

### Modified
- `components/Public/PublicInquiryPage.tsx` — general inquiry form + classifySubmitError 400 case + handleRetry fix
- `tests/frontend/public-inquiry-page.test.tsx` — PII-001, PII-002 updated; PII-013–020 added
- `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` — Section 32 appended

### Not Modified (confirmed by git diff)
- `App.tsx` — already Phase 2-ready; no changes
- `services/publicB2BService.ts` — already Phase 2-ready (`supplier_slug?: string`); no changes
- `server/` — no backend changes
- `shared/contracts/` — no contract changes

---

## 3. Key Changes

### `components/Public/PublicInquiryPage.tsx`

**Removed:** `NoContextLanding` component (passive copy + "Find suppliers" CTA).

**Added:** `GeneralInquiryForm` component:
- Fields: `inquiry_category` (required, `id="inquiry-category"`), `geo_band` (optional, `id="inquiry-geo"`), `volume_band` (optional, `id="inquiry-volume"`), `message` (optional textarea, `id="inquiry-message"`, label `"Additional context"`)
- Header: `"Share your sourcing interest"` / `"Tell us what you are looking for. No account required."`
- Textarea guidance: `"Do not include email addresses or phone numbers."`
- Submit payload: `{ inquiry_category, source_surface: 'GENERAL_PUBLIC', geo_band?, volume_band?, message? }` — no `supplier_slug`
- Submit button: disabled until `inquiry_category` selected
- `aria-label="Submit a general inquiry"` on the section wrapper

**Updated:** `classifySubmitError` — added `status === 400` duck-type check:
```typescript
const status = (err as { status?: number }).status;
if (status === 400) {
  return 'Please do not include contact details (email or phone) in your message.';
}
```

**Fixed:** `handleRetry` — was unconditionally returning to `'FORM'`:
```typescript
// Before (Phase 1 bug):
const handleRetry = () => setMode('FORM');

// After (Phase 2 fix):
const handleRetry = () => setMode(isValidSlug ? 'FORM' : 'NO_CONTEXT');
```

**Updated:** `NO_CONTEXT` render block:
```tsx
// Before: <NoContextLanding onFindSuppliers={...} />
// After:
{mode === 'NO_CONTEXT' && (
  <GeneralInquiryForm onSuccess={handleSuccess} onError={handleError} />
)}
```

### `tests/frontend/public-inquiry-page.test.tsx`

**Updated tests:**
- `PII-001`: now asserts general form renders (`getByLabelText(/Inquiry type/i)`, send button disabled, no "Find suppliers" button)
- `PII-002`: same update for invalid slug

**Added tests (PII-013–020):**

| ID | Scenario | Assertion |
|---|---|---|
| PII-013 | No supplierSlug → general form | `getByRole('region', { name: /general inquiry/i })` visible |
| PII-014 | General form PII exclusion | No name/email/phone/company inputs |
| PII-015 | General submit — no supplier_slug | `submitPublicInquiry` called; payload has no `supplier_slug` |
| PII-016 | General submit — source_surface | `payload.source_surface === 'GENERAL_PUBLIC'` |
| PII-017 | General submit — with message | `payload.message` matches input value |
| PII-018 | General submit — without message | `payload.message === undefined` |
| PII-019 | Success state — no echo | Unique message token not visible after submit |
| PII-020 | 400 error classification | Error with `{ status: 400 }` → `/do not include contact details/i` |

---

## 4. Supplier-Context Mode Backward Compatibility

Phase 1 supplier-context mode is completely unchanged:

- `InquiryForm` component receives `supplierSlug` prop; no `message` field; payload includes `supplier_slug`.
- Tests PII-003–012 cover the supplier-context path; all pass unchanged.
- `isValidSlug` guard on `{mode === 'FORM' && isValidSlug && <InquiryForm ...>}` unchanged.
- `handleRetry` fix only changes the general-path behavior (was never reachable from supplier form anyway, but now correctly documented).

---

## 5. Adjacent Findings

### AF-001: General Inquiry Event Infrastructure Deferred

The backend general path uses `'public.buyer.inquiry.general.created'` (not in `AUDIT_ACTION_TO_EVENT_NAME`), so no event is emitted. This is correct — see `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001` AF-001 for the full rationale.

**Deferred unit:** `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001` — define entity UUID strategy for platform-level inquiries before wiring `buyer_inquiry.created.v1` emission for general mode.

### AF-002: Supplier-Context Message Expansion Deferred

The supplier-context `InquiryForm` intentionally does not include a `message` field in this unit (by design decision in Phase 1). Expanding supplier-context to include `message` is a separate decision.

---

## 6. Verification Evidence

### Implementation Commit

- **Hash:** `f4ee194916ccc7abb93697ba197bf4a870ad45ab`
- **Message:** `[TEXQTIC] public: add general inquiry mode`
- **Files:** exactly 3 (all allowlisted)
  - `components/Public/PublicInquiryPage.tsx` (+172/-34)
  - `tests/frontend/public-inquiry-page.test.tsx` (+197/-8)
  - `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` (+74)

### Repo-Truth Inspection

| # | Question | Result |
|---|---|---|
| 1 | Commit hash at HEAD | ✅ `f4ee194` confirmed via `git show --stat` |
| 2 | Files limited to approved allowlist | ✅ 3 files, all allowlisted |
| 3 | No backend/server files changed | ✅ None in commit |
| 4 | No OpenAPI contract files changed | ✅ None in commit |
| 5 | No event contract files changed | ✅ None in commit |
| 6 | No Prisma/migration files changed | ✅ None in commit |
| 7 | No App.tsx change | ✅ Absent from commit diff |
| 8 | No `services/publicB2BService.ts` change | ✅ Absent from commit diff |
| 9 | `GeneralInquiryForm` renders in NO_CONTEXT mode | ✅ `{mode === 'NO_CONTEXT' && <GeneralInquiryForm>}` |
| 10 | `InquiryForm` (supplier-context) unchanged | ✅ No `message` field; `supplier_slug` still in payload |
| 11 | Payload has no `supplier_slug` for general mode | ✅ `submitPublicInquiry({ inquiry_category, source_surface: 'GENERAL_PUBLIC', ... })` |
| 12 | `source_surface: 'GENERAL_PUBLIC'` in general payload | ✅ Confirmed in `GeneralInquiryForm.handleSubmit` |
| 13 | `classifySubmitError` 400 case present | ✅ Duck-type `(err as {status?:number}).status === 400` |
| 14 | `handleRetry` returns to NO_CONTEXT for general mode | ✅ `isValidSlug ? 'FORM' : 'NO_CONTEXT'` |
| 15 | No PII fields in general form | ✅ No name/email/phone/company inputs |
| 16 | Success state opaque — no message echo | ✅ Success panel shows fixed copy only |

### Local Validation

| Command | Result |
|---|---|
| `pnpm typecheck` (frontend + server) | ✅ PASS — 0 errors (exit 0) |
| PII-001 through PII-020 (20 tests) | ✅ PASS — 20/20 |

### Production Verification (`https://app.texqtic.com`)

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | `GET /api/health` | `{status:'ok'}` | ✅ `{"status":"ok","timestamp":"2026-05-19T02:09:07.752Z"}` |
| 2 | `/inquiry` (no slug) → general form | "Share your sourcing interest" heading | ✅ General form rendered |
| 3 | No PII fields on general form | No name/email/phone/company inputs | ✅ Confirmed via page snapshot |
| 4 | Inquiry type dropdown present + required | Dropdown with 5 options; submit disabled until selected | ✅ Submit button `[disabled]` pre-selection |
| 5 | Additional context textarea + PII warning | Textarea + "Do not include email addresses..." | ✅ Confirmed via page snapshot |
| 6 | Submit without message → opaque success | "Your interest has been recorded." heading | ✅ Success state; form replaced |
| 7 | Submit with message → no echo | Unique token not visible in success state | ✅ `tokenEchoVisible: false` |
| 8 | `/inquiry/` trailing slash → general form | Same form; canonical points to `/inquiry` | ✅ Form renders; `canonical: https://app.texqtic.com/inquiry` |
| 9 | SEO title | "Express Interest — TexQtic" | ✅ Confirmed via `page.title()` |
| 10 | SEO canonical | `https://app.texqtic.com/inquiry` | ✅ Confirmed via `link[rel=canonical]` |
| 11 | SEO robots | `index, follow` | ✅ Confirmed via `meta[name=robots]` |
| 12 | Invalid slug → general form | "Share your sourcing interest" heading | ✅ `?supplierSlug=INVALID%20Slug!` → general form |
| 13 | Valid slug format → FORM mode | "Express your interest" heading; no message field | ✅ `?supplierSlug=test-supplier` → supplier form |
| 14 | handleRetry from supplier error → FORM mode | Returns to supplier form (not general) | ✅ 404 error → "Try again" → supplier form |
| 15 | PII 400 error copy | `/do not include contact details/i` | ⚠️ Rate-limited; covered by PII-020 unit test |
| 16 | Rate-limit 429 | Specific UI copy | ⚠️ Data limitation (20 req/15 min); covered by PII-006 unit test |

**Data limitations (checks 15–16):** Rate-limited after multiple test submissions. These scenarios are fully covered by PII-020 and PII-006 unit tests, both passing. Production endpoint behavior is correct per checks 1–14.

### Final Close Decision

**Status: `VERIFIED_COMPLETE`**

- Implementation commit in scope: ✅ `f4ee194`
- Diff limited to allowlist: ✅ 3 files
- Local validation: ✅ 20/20 tests, typecheck pass
- Production checks 1–14: ✅
- Phase 1 supplier-context path preserved: ✅
- No PII collected or echoed: ✅
