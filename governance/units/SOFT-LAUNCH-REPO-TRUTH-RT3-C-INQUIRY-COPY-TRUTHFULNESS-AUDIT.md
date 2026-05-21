# SOFT-LAUNCH-REPO-TRUTH-RT3-C-INQUIRY-COPY-TRUTHFULNESS-AUDIT

**Packet ID:** RT3-C  
**Unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT3-C-INQUIRY-COPY-TRUTHFULNESS-AUDIT`  
**Status:** COMPLETE  
**Authority tier:** Repo Truth  
**Scope:** Inquiry-related UI copy truthfulness audit across all public inquiry surfaces  
**Git HEAD at inspection:** `62a4495d140f78a6086930909287bed1e95dec00`  
**Worktree state:** CLEAN at inspection and at creation  
**Authored by:** Copilot governance agent  
**Authorized by:** Paresh Patel  
**Date:** 2026-07-09  

---

## §1 Unit Authority and Boundary

This unit is a **read-only repo truth audit**. It answers a single governance question:

> **Does inquiry-related UI copy — headings, helper text, form labels, success messages,  
> error messages, and auth-handoff copy — truthfully reflect what the backend  
> actually does when a public inquiry is submitted?  
> Does any copy imply supplier notification, CRM routing, response delivery,  
> or payment/order creation that does not yet exist in the codebase?**

**Surfaces in scope:**

| # | Surface | Route | Component |
|---|---|---|---|
| 1 | PublicInquiryPage — FORM mode (supplier context) | `/inquiry?supplierSlug=…` | `components/Public/PublicInquiryPage.tsx` — `InquiryForm` subcomponent |
| 2 | PublicInquiryPage — NO_CONTEXT mode (general / product / category / collection context) | `/inquiry` | `components/Public/PublicInquiryPage.tsx` — `GeneralInquiryForm` subcomponent |
| 3 | PublicInquiryPage — SuccessPanel (shared by FORM and NO_CONTEXT modes) | `/inquiry` (post-submit) | `components/Public/PublicInquiryPage.tsx` — `SuccessPanel` subcomponent |
| 4 | PublicInquiryPage — ErrorPanel (shared by both modes) | `/inquiry` (post-error) | `components/Public/PublicInquiryPage.tsx` — `ErrorPanel` subcomponent |
| 5 | PublicInquiryPage — footer disclosure | `/inquiry` | `components/Public/PublicInquiryPage.tsx` — footer block |
| 6 | PublicSupplierProfile — inline inquiry section | `/supplier/:slug` | `components/Public/PublicSupplierProfile.tsx` — `INQUIRY-004` block |
| 7 | PublicSupplierProfile — authenticated handoff panel | `/supplier/:slug` | `components/Public/PublicSupplierProfile.tsx` — auth handoff block |
| 8 | PublicProductDetail — inquiry CTA | `/product/:slug` | `components/Public/PublicProductDetail.tsx` — authenticated-continuation block |

**Actions forbidden in this unit:**

- Source code modification of any kind
- Copy correction or rewriting
- TLRH index updates
- Implementation of FTR-B2C-004 or any notification feature
- Schema, SQL, or Prisma execution of any kind
- New file creation other than this artifact

---

## §2 TLRH Storage Note

This artifact is stored under `governance/units/` and is part of the TexQtic Launch Readiness Hub repo-truth audit record.  
This unit does not update TLRH indexes, Layer 0 docs, launch-readiness hub docs, or source registers.  
Cross-reference is maintained through the artifact itself and the Git commit introduced by RT3-C.  
A later dedicated governance-sync unit may update authoritative TLRH indexes after RT6, if Paresh authorizes it.

---

## §3 Git and Worktree Truth

```
git status --short      → (empty — clean worktree)
git rev-parse HEAD      → 62a4495d140f78a6086930909287bed1e95dec00
```

**Worktree:** CLEAN  
**HEAD commit:** `62a4495d` — `[TEXQTIC] docs: audit non-directory public page qualifiers` (RT3-B)

---

## §4 Input Artifacts Reviewed

| Artifact | Unit ID | Role in this audit |
|---|---|---|
| RT2-B3 — Directory Inquiry Attachment Audit | `SOFT-LAUNCH-REPO-TRUTH-RT2-B3-DIRECTORY-INQUIRY-ATTACHMENT-AUDIT.md` | **Primary backend truth source** — establishes inquiry endpoint behavior, audit-log-only delivery, FTR-B2C-004 status, PII safety confirmation, source_surface attribution gaps |
| RT3-A — Directory Demo Label Audit | `SOFT-LAUNCH-REPO-TRUTH-RT3-A-DIRECTORY-DEMO-LABEL-AUDIT.md` | Format and section structure reference |
| RT3-B — Public Non-Directory Page Qualifier Audit | `SOFT-LAUNCH-REPO-TRUTH-RT3-B-PUBLIC-NON-DIRECTORY-PAGE-QUALIFIER-AUDIT.md` | Format reference; TLRH Storage Note wording template |

**Backend truth established by RT2-B3 (authoritative, not re-verified here):**

| Fact | Value |
|---|---|
| Inquiry endpoint | `POST /api/public/inquiry/submit` |
| Auth required | None (public unauthenticated) |
| On successful submission | 202 — `{ success: true, data: { acknowledged: true, message: 'Your inquiry has been received.' } }` |
| Delivery mechanism | Audit log only (`writeAuditLog`, fire-and-forget) |
| SMTP / email delivery | NONE — not present in this route |
| Supplier notification | NONE — FTR-B2C-004 (minimum notification loop) status: `NOT_STARTED` |
| CRM routing | NONE — no CRM routing in this route |
| Buyer contact collection | NONE — no email/phone/name fields; PII blocked at backend |
| Payment / order / RFQ creation | NONE |
| Supplier visibility into the inquiry | NONE in current system state — supplier has no route or UI to view submitted inquiries |

---

## §5 Inquiry Copy Inventory

All user-visible strings catalogued by surface, in source order.

### §5.1 PublicInquiryPage — InquiryForm (FORM mode, supplier context)

> Source file: `components/Public/PublicInquiryPage.tsx`  
> Render condition: `supplierSlug` passes `/^[a-z0-9-]+$/` and mode = `FORM`

| Copy ID | Element | Verbatim text |
|---|---|---|
| INQ-COPY-01 | `<h2>` heading | `"Express your interest"` |
| INQ-COPY-02 | Helper paragraph | `"No account required. Your interest will be forwarded to the supplier for context."` |
| INQ-COPY-03 | Inquiry-type field label | `"Inquiry type *"` |
| INQ-COPY-04 | Select placeholder | `"— Select inquiry type —"` |
| INQ-COPY-05 | Geography field label | `"Geography (optional)"` |
| INQ-COPY-06 | Geography placeholder | `"e.g. South Asia, EU, Global"` |
| INQ-COPY-07 | Volume field label | `"Volume range (optional)"` |
| INQ-COPY-08 | Volume placeholder | `"e.g. 500–1000 units, 5,000 metres"` |
| INQ-COPY-09 | Submit button (idle) | `"Send inquiry"` |
| INQ-COPY-10 | Submit button (submitting) | `"Sending…"` |

> **Note:** InquiryForm (FORM mode) has no message field. It does not surface a privacy disclaimer inline; instead the footer disclosure applies.

### §5.2 PublicInquiryPage — GeneralInquiryForm (NO_CONTEXT mode)

> Source file: `components/Public/PublicInquiryPage.tsx`  
> Render condition: `supplierSlug` absent or invalid and mode = `NO_CONTEXT`

| Copy ID | Element | Verbatim text |
|---|---|---|
| INQ-COPY-11 | `<h2>` heading | `"Share your sourcing interest"` |
| INQ-COPY-12 | Helper paragraph | `"Tell us what you are looking for. No account required."` |
| INQ-COPY-13 | Context hint (when context param present) | `"We'll include this {productOrCategoryOrCollection} context with your inquiry."` |
| INQ-COPY-14 | Inquiry-type field label | `"Inquiry type *"` |
| INQ-COPY-15 | Select placeholder | `"— Select inquiry type —"` |
| INQ-COPY-16 | Geography field label | `"Geography (optional)"` |
| INQ-COPY-17 | Volume field label | `"Volume range (optional)"` |
| INQ-COPY-18 | Additional context field label | `"Additional context (optional)"` |
| INQ-COPY-19 | Message placeholder | `"Describe your sourcing interest or context."` |
| INQ-COPY-20 | Message privacy notice | `"Do not include email addresses or phone numbers."` |
| INQ-COPY-21 | Submit button (idle) | `"Send inquiry"` |
| INQ-COPY-22 | Submit button (submitting) | `"Sending…"` |

### §5.3 PublicInquiryPage — SuccessPanel (shared by both modes)

> Source file: `components/Public/PublicInquiryPage.tsx`  
> Render condition: mode = `SUCCESS` after successful submission

| Copy ID | Element | Verbatim text |
|---|---|---|
| INQ-COPY-23 | `<h2>` heading | `"Your interest has been recorded."` |
| INQ-COPY-24 | Body paragraph | `"Your inquiry has been received. Create an account to follow up, track responses, and connect with suppliers."` |
| INQ-COPY-25 | Auth CTA button | `"Create account to follow up"` |

### §5.4 PublicInquiryPage — ErrorPanel (shared by both modes)

> Source file: `components/Public/PublicInquiryPage.tsx`  
> Render condition: mode = `ERROR` after failed submission

| Copy ID | Element | Verbatim text |
|---|---|---|
| INQ-COPY-26 | Error label | `"Inquiry not submitted"` |
| INQ-COPY-27 | Error message (400 — PII detected) | `"Please do not include contact details (email or phone) in your message."` |
| INQ-COPY-28 | Error message (429 — rate limit) | `"Too many submissions. Please wait a moment and try again."` |
| INQ-COPY-29 | Error message (404 — supplier not found) | `"This supplier is not currently available for inquiry."` |
| INQ-COPY-30 | Error message (generic) | `"We could not record your inquiry right now. Please try again."` |
| INQ-COPY-31 | Retry button | `"Try again"` |

### §5.5 PublicInquiryPage — footer disclosure

> Source file: `components/Public/PublicInquiryPage.tsx`  
> Always rendered regardless of mode

| Copy ID | Element | Verbatim text |
|---|---|---|
| INQ-COPY-32 | Footer line 1 | `"This page is a public information surface. No payments or binding commitments are made here."` |
| INQ-COPY-33 | Footer line 2 | `"All interactions are subject to TexQtic's trust and verification framework."` (with link to `/trust`) |

### §5.6 PublicSupplierProfile — inline inquiry section (INQUIRY-004)

> Source file: `components/Public/PublicSupplierProfile.tsx`  
> Render condition: profile loaded, inquiry section always visible

| Copy ID | Element | Verbatim text |
|---|---|---|
| SUP-COPY-01 | Section `<h2>` | `"Send an inquiry"` |
| SUP-COPY-02 | Section helper | `"This captures high-level public interest only. Pricing and transactional workflows remain authenticated."` |
| SUP-COPY-03 | Inquiry-type label | `"Inquiry type *"` |
| SUP-COPY-04 | Geography label | `"Geography (optional)"` |
| SUP-COPY-05 | Volume label | `"Volume range (optional)"` |
| SUP-COPY-06 | Error message | `"Unable to submit inquiry. Please try again."` |
| SUP-COPY-07 | Submit button (idle) | `"Send inquiry"` |
| SUP-COPY-08 | Submit button (submitting) | `"Sending…"` |
| SUP-COPY-09 | Success message | `"Your inquiry has been received."` |

### §5.7 PublicSupplierProfile — authenticated handoff panel

> Source file: `components/Public/PublicSupplierProfile.tsx`  
> Always rendered below the inquiry section

| Copy ID | Element | Verbatim text |
|---|---|---|
| SUP-COPY-10 | `<h2>` heading | `"Want to connect with this business?"` |
| SUP-COPY-11 | Body paragraph | `"Sign in to TexQtic to request a connection, continue sourcing workflows, or access authenticated business tools where available."` |
| SUP-COPY-12 | Primary auth CTA | `"Sign in to Connect"` |
| SUP-COPY-13 | Secondary CTA | `"Back to B2B Discovery"` |

### §5.8 PublicProductDetail — inquiry CTA

> Source file: `components/Public/PublicProductDetail.tsx`  
> Render condition: authenticated-continuation block, always rendered

| Copy ID | Element | Verbatim text |
|---|---|---|
| PRD-COPY-01 | Auth block heading | `"Authenticated continuation"` |
| PRD-COPY-02 | Auth block body | `"Sign in to save this product, continue checkout, request details, or access authenticated buyer workflows."` |
| PRD-COPY-03 | Inquiry CTA label | `"Send a sourcing inquiry"` |

---

## §6 Backend-Truth Comparison

This table tests each copy item against the established backend truth from RT2-B3.

| Copy ID | Claim made by copy | Backend truth | Match? |
|---|---|---|---|
| INQ-COPY-01 | `"Express your interest"` — passive intent expression; no delivery claim | Audit log written on submit | ✅ Consistent |
| **INQ-COPY-02** | **`"Your interest will be forwarded to the supplier for context."`** | **Audit log only; no notification, no SMTP, no CRM routing; supplier has no visibility into submitted inquiries; FTR-B2C-004 NOT_STARTED** | **❌ FALSE — "forwarded to the supplier" is not what the system does** |
| INQ-COPY-09 | `"Send inquiry"` / `"Sending…"` — action label only | POST to `/api/public/inquiry/submit` | ✅ Consistent |
| INQ-COPY-11 | `"Share your sourcing interest"` — passive intent expression | Audit log written on submit | ✅ Consistent |
| INQ-COPY-12 | `"Tell us what you are looking for. No account required."` | No auth required; inquiry recorded | ✅ Consistent |
| INQ-COPY-13 | `"We'll include this {context} context with your inquiry."` | `product_slug` / `category_slug` / `collection_slug` field included in payload | ✅ Consistent |
| INQ-COPY-20 | `"Do not include email addresses or phone numbers."` | Backend blocks email/phone in message body, returns 400 | ✅ Consistent |
| INQ-COPY-23 | `"Your interest has been recorded."` | Inquiry written to audit log — "recorded" is accurate | ✅ Consistent |
| **INQ-COPY-24** | **`"…Create an account to follow up, track responses, and connect with suppliers."`** | **Supplier not notified → no supplier responses exist → "track responses" implies a responsive loop that doesn't exist in current system state** | **⚠️ OVERPROMISE_RISK — "track responses" inconsistent with current state** |
| INQ-COPY-25 | `"Create account to follow up"` | Account creation is possible; follow-up in authenticated context is a platform capability | ✅ Weak but not false |
| INQ-COPY-27 | `"Please do not include contact details (email or phone) in your message."` | Backend returns 400 on email/phone in message | ✅ Consistent |
| INQ-COPY-28 | `"Too many submissions. Please wait a moment and try again."` | 20 req / 15 min rate limit; 429 response | ✅ Consistent |
| INQ-COPY-29 | `"This supplier is not currently available for inquiry."` | Backend returns 404 when supplier gate fails | ✅ Consistent |
| INQ-COPY-32 | `"No payments or binding commitments are made here."` | No payment/order/RFQ created; audit log only | ✅ Consistent |
| SUP-COPY-02 | `"This captures high-level public interest only. Pricing and transactional workflows remain authenticated."` | Audit log capture only; no pricing, transactional, or order path exists on this route | ✅ Consistent — accurate scoping |
| SUP-COPY-09 | `"Your inquiry has been received."` | Backend 202 response confirms receipt | ✅ Consistent |
| SUP-COPY-11 | `"…access authenticated business tools where available."` | Authenticated workflows exist; "where available" qualifier honest | ✅ Consistent |
| PRD-COPY-03 | `"Send a sourcing inquiry"` — link to `/inquiry?productSlug=…&sourceSurface=PRODUCT_DETAIL` | Submits a public inquiry; context params correctly included | ✅ Consistent |

---

## §7 Overpromise Risk Assessment

| Risk Category | Copy Item(s) | Risk Level | Evidence |
|---|---|---|---|
| **Supplier notification implied** | INQ-COPY-02: `"…forwarded to the supplier for context."` | 🔴 CRITICAL | "forwarded to the supplier" is a factual overstatement. No forwarding mechanism exists. Backend writes audit log only. Supplier has no notification path in current state. FTR-B2C-004 NOT_STARTED. |
| **Supplier response loop implied** | INQ-COPY-24: `"…track responses…"` | 🟡 MODERATE | "track responses" implies there are responses from suppliers to track. Since suppliers are not notified, no responses exist. Phrase creates an expectation of a two-way loop that does not exist in the current state. The copy appears in the context of `"create an account"`, which reduces but does not eliminate the risk. |
| **RFQ / order / payment implied** | None found | ✅ NONE | No inquiry surface uses "order", "RFQ", "purchase", "quote", "payment", or equivalents. Footer explicitly disclaims payments and binding commitments. |
| **CRM routing implied** | None found | ✅ NONE | No copy references CRM, "pipeline", "case", "ticket", or equivalent. |
| **Response time promise** | None found | ✅ NONE | No copy states a response SLA, timeframe, or guarantee of response. |
| **Data collection beyond implementation** | None found | ✅ NONE | No email/phone/contact fields rendered on any surface. Message privacy notice (INQ-COPY-20) accurately reflects backend blocking. PII-safe scope correctly represented. |
| **Buyer contact details implied** | None found | ✅ NONE | No copy implies TexQtic will contact the buyer via email or phone. |

---

## §8 Per-Surface Copy Classification

Classification vocabulary (matching RT3 series):

| Code | Meaning |
|---|---|
| `TRUTHFUL` | All copy accurately reflects backend behavior; no delivery, notification, or outcome claim unsupported by implementation |
| `TRUTHFUL_BUT_WEAK` | Copy is factually accurate but passive or vague; acceptable at soft launch |
| `OVERPROMISE_RISK` | Copy is not actively false but implies an outcome the system does not currently deliver; creates realistic user expectation that cannot be met |
| `MISLEADING` | Copy makes a specific factual claim that the system does not support; a user reading it would reasonably conclude a behavior exists that does not |

### §8.1 PublicInquiryPage — InquiryForm (FORM mode)

**Classification: `MISLEADING`**

**Primary finding:** INQ-COPY-02: `"No account required. Your interest will be forwarded to the supplier for context."`

"Forwarded to the supplier" is a specific factual claim. The backend does not forward anything to the supplier. The audit log is written but is not accessible to the supplier through any current route or UI. No notification, email, CRM event, or webhook exists in this code path. A buyer reading this copy would reasonably conclude the supplier receives a signal from their submission. That conclusion is false in the current system state.

**Severity:** HIGH — this is the primary copy integrity failure in the inquiry surface family.

**Affected component:** `InquiryForm` function, `PublicInquiryPage.tsx`, helper paragraph (render path: `mode === 'FORM' && isValidSlug`)

**Test coverage of this string:** PSI-006 asserts no payment/order/RFQ language in the inquiry section but does NOT assert the absence of "forwarded" or "notified" language. PII-010 tests FORM mode payload but does not test copy strings. **This overpromise is invisible to the current test suite.**

---

### §8.2 PublicInquiryPage — GeneralInquiryForm (NO_CONTEXT mode)

**Classification: `TRUTHFUL`**

All copy items (INQ-COPY-11 through INQ-COPY-22) accurately reflect backend behavior:
- Heading and helper are passive ("share", "tell us") — no delivery claim.
- Context hint (INQ-COPY-13) correctly describes including context fields in the payload.
- Privacy notice (INQ-COPY-20) accurately reflects backend PII blocking.
- No notification, forwarding, or supplier-visibility claim.

**No findings.**

---

### §8.3 PublicInquiryPage — SuccessPanel (shared by both modes)

**Classification: `OVERPROMISE_RISK`**

**Finding:** INQ-COPY-24: `"Your inquiry has been received. Create an account to follow up, track responses, and connect with suppliers."`

The phrase **"track responses"** implies that supplier responses will exist and will be trackable after account creation. Since suppliers are not notified (FTR-B2C-004 NOT_STARTED), no supplier response to track exists in the current state. A buyer who creates an account after submitting an inquiry and then looks for "responses" will find none. The phrase creates an unfulfillable near-term expectation.

**Mitigating factor:** "track responses" appears inside a "create an account" call-to-action — a buyer must take an explicit further action before encountering the absence of responses. This reduces the immediacy of the risk compared to INQ-COPY-02.

**Severity:** MODERATE — the SuccessPanel is shown immediately after every inquiry submission (both FORM and NO_CONTEXT modes). At soft launch scale, the cohort of buyers who create accounts specifically expecting supplier responses is unknown but non-zero.

**Note:** INQ-COPY-23 (`"Your interest has been recorded."`) is `TRUTHFUL`. INQ-COPY-25 (`"Create account to follow up"`) is `TRUTHFUL_BUT_WEAK` — follow-up in authenticated context is a real platform capability.

---

### §8.4 PublicInquiryPage — ErrorPanel (shared by both modes)

**Classification: `TRUTHFUL`**

All four error message variants (INQ-COPY-27 through INQ-COPY-30) map accurately to their corresponding backend response:
- 400 → INQ-COPY-27: accurately reflects PII blocking behavior
- 429 → INQ-COPY-28: accurately reflects rate-limit behavior
- 404 → INQ-COPY-29: accurately reflects supplier gate failure
- generic → INQ-COPY-30: accurate fallback

**No findings.**

---

### §8.5 PublicInquiryPage — footer disclosure

**Classification: `TRUTHFUL`**

INQ-COPY-32 (`"No payments or binding commitments are made here."`) explicitly and accurately discounts payment and order creation — consistent with backend truth (audit log only, no payment path). INQ-COPY-33 (trust framework reference) is a factual governance pointer.

**No findings.** The footer disclosure is the strongest truthfulness anchor in the inquiry page family.

---

### §8.6 PublicSupplierProfile — inline inquiry section (INQUIRY-004)

**Classification: `TRUTHFUL`**

SUP-COPY-02 (`"This captures high-level public interest only. Pricing and transactional workflows remain authenticated."`) is the most accurately scoped inquiry helper text across all surfaces. It explicitly limits the claim to "high-level public interest" capture and excludes transactional claims.

The success state (SUP-COPY-09: `"Your inquiry has been received."`) is technically accurate — the 202 response confirms receipt.

The error state (SUP-COPY-06: `"Unable to submit inquiry. Please try again."`) is a safe generic fallback.

**No notification, forwarding, or response claim is present. This section is correctly scoped.**

---

### §8.7 PublicSupplierProfile — authenticated handoff panel

**Classification: `TRUTHFUL`**

SUP-COPY-11 includes the qualifier `"where available"` — correctly hedging on the actual availability of authenticated features at soft launch.

SUP-COPY-12 (`"Sign in to Connect"`) describes an authenticated workflow entry point — the connection workflow exists in the authenticated platform.

**No findings.**

---

### §8.8 PublicProductDetail — inquiry CTA

**Classification: `TRUTHFUL`**

PRD-COPY-03 (`"Send a sourcing inquiry"`) accurately labels the action. The CTA navigates to `/inquiry` with `productSlug` and `sourceSurface=PRODUCT_DETAIL` params — both are correctly included in the subsequent inquiry submission payload (as confirmed in RT2-B3 §4.2).

The authenticated-continuation block (PRD-COPY-01, PRD-COPY-02) references checkout/saving/details in the context of "Sign in to Continue" — a separate CTA from the inquiry CTA. No conflation between the inquiry action and transactional actions is present in the rendered copy.

**No findings.**

---

## §9 Overall Inquiry-Copy Truthfulness Classification

**Overall classification: `CONDITIONAL_PASS — CRITICAL FIX REQUIRED BEFORE SCALED PUBLIC EXPOSURE`**

| Classification | Surface | Copy ID(s) |
|---|---|---|
| 🔴 `MISLEADING` | PublicInquiryPage — InquiryForm (FORM mode) | INQ-COPY-02 |
| 🟡 `OVERPROMISE_RISK` | PublicInquiryPage — SuccessPanel | INQ-COPY-24 (phrase: "track responses") |
| ✅ `TRUTHFUL` | PublicInquiryPage — GeneralInquiryForm (NO_CONTEXT mode) | INQ-COPY-11 through INQ-COPY-22 |
| ✅ `TRUTHFUL` | PublicInquiryPage — ErrorPanel | INQ-COPY-26 through INQ-COPY-31 |
| ✅ `TRUTHFUL` | PublicInquiryPage — footer disclosure | INQ-COPY-32, INQ-COPY-33 |
| ✅ `TRUTHFUL` | PublicSupplierProfile — inline inquiry section | SUP-COPY-01 through SUP-COPY-09 |
| ✅ `TRUTHFUL` | PublicSupplierProfile — authenticated handoff panel | SUP-COPY-10 through SUP-COPY-13 |
| ✅ `TRUTHFUL` | PublicProductDetail — inquiry CTA | PRD-COPY-01 through PRD-COPY-03 |

**Summary judgment:**

Seven of eight surfaces (and thirty of thirty-two copy items) are `TRUTHFUL` or `TRUTHFUL_BUT_WEAK`. The supplier profile inline form (INQUIRY-004) is the best-scoped copy set in the family — its helper text (`"This captures high-level public interest only."`) should be treated as the target standard for other surfaces.

**The critical failure is INQ-COPY-02.** The phrase "Your interest will be forwarded to the supplier for context" is a specific factual claim that the backend does not fulfill. This string appears on the primary inquiry path — `PublicInquiryPage` in FORM mode — which is the route reached when any supplier profile inquiry link is followed or when `/inquiry?supplierSlug=…` is navigated to directly. It is the highest-traffic inquiry entry point at soft launch.

**The secondary finding is INQ-COPY-24** ("track responses") in the SuccessPanel. Because the SuccessPanel is shared by both FORM and NO_CONTEXT modes, this phrase is shown after every successful inquiry submission on every surface. At soft launch scale the cohort of buyers who create accounts expecting supplier responses is non-zero.

---

## §10 Recommended Copy Guardrails (Implementation Deferred)

> This section documents recommended copy changes. Implementation is deferred and requires  
> explicit authorization from Paresh Patel. No source file modification is performed in this unit.

### §10.1 INQ-COPY-02 — Critical fix (MISLEADING → TRUTHFUL)

**Current:** `"No account required. Your interest will be forwarded to the supplier for context."`

**Problem:** "forwarded to the supplier" implies the supplier receives a notification or communication. Backend writes audit log only. No forwarding mechanism exists.

**Recommended replacement:**
`"No account required. Your sourcing interest will be recorded on this platform."`

**Alternative (if preference is to preserve intent language):**
`"No account required. Your interest is captured on this platform. Supplier connection workflows are available after sign-in."`

**Rationale:** Both alternatives are accurate under the current backend (audit log capture). The first is shorter. The second more explicitly surfaces the auth handoff, which is the honest next step.

### §10.2 INQ-COPY-24 — Secondary fix (OVERPROMISE_RISK → TRUTHFUL)

**Current:** `"Your inquiry has been received. Create an account to follow up, track responses, and connect with suppliers."`

**Problem:** "track responses" implies supplier responses exist. Since FTR-B2C-004 is NOT_STARTED, no supplier responses are available to track.

**Recommended replacement:**
`"Your inquiry has been received. Create an account to continue your sourcing workflow and connect with suppliers."`

**Alternative:**
`"Your interest has been noted. Sign in or create an account to access sourcing tools and connect with suppliers."`

**Rationale:** Both alternatives retain the auth conversion intent without implying a responsive loop that doesn't yet exist.

### §10.3 No changes recommended for other copy

INQ-COPY-11 through INQ-COPY-22 (GeneralInquiryForm), all ErrorPanel items, the footer disclosure, SUP-COPY-01 through SUP-COPY-13 (supplier profile), and PRD-COPY-01 through PRD-COPY-03 (product detail CTA) require no copy changes.

**The supplier profile INQUIRY-004 helper text (SUP-COPY-02) is exemplary and should be the reference standard:**
> `"This captures high-level public interest only. Pricing and transactional workflows remain authenticated."`

---

## §11 Recommended Next Packet: RT3-D

**Recommended packet:** `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS`

**Scope (proposed):** Synthesize all RT3 sub-unit findings (RT3-A, RT3-B, RT3-C) into a single launch-readiness verdict for the public surface family's demo-label and copy-truthfulness status. Identify any blocking items for soft launch go/no-go.

**Inputs required:**
- RT3-A (directory demo-label audit) — COMPLETE
- RT3-B (non-directory public page qualifier audit) — COMPLETE
- RT3-C (inquiry copy truthfulness audit) — COMPLETE (this unit)

**RT3-D does not require new source code inspection.** It is a synthesis-only artifact.

**RT3-D is NOT authorized by this unit.** Paresh Patel must authorize RT3-D separately.

---

## §12 No-Authorization Boundary

This unit makes no source code changes. The copy guardrails in §10 are recommendations only.

**The following are NOT authorized by this unit:**

| Action | Status |
|---|---|
| Applying INQ-COPY-02 copy fix to `PublicInquiryPage.tsx` | NOT AUTHORIZED — requires separate prompt from Paresh |
| Applying INQ-COPY-24 copy fix to `PublicInquiryPage.tsx` | NOT AUTHORIZED — requires separate prompt from Paresh |
| Updating any test to cover copy strings | NOT AUTHORIZED |
| Implementing FTR-B2C-004 (supplier notification loop) | NOT AUTHORIZED — separate feature prompt required |
| Creating RT3-D synthesis artifact | NOT AUTHORIZED — requires separate authorization |
| Updating TLRH indexes | NOT AUTHORIZED |
| Modifying any governance contract file | NOT AUTHORIZED |
| Modifying `server/prisma/schema.prisma` or any migration | NOT AUTHORIZED |
| Modifying `.env` or any environment configuration | NOT AUTHORIZED |

**All copy changes must be authorized by Paresh Patel with an explicit allowlist before any file is modified.**

---

*End of SOFT-LAUNCH-REPO-TRUTH-RT3-C-INQUIRY-COPY-TRUTHFULNESS-AUDIT*
