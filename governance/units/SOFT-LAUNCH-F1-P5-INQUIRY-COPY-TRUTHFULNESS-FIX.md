# SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX

## 1. Unit Identity

| Field | Value |
|---|---|
| Unit ID | `SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX` |
| Phase | Soft-Launch F1 |
| Status | **COMPLETE** |
| Commit | `[TEXQTIC] fix: align inquiry copy with runtime truth` |
| Depends on | `SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY` (closed: `389c166`) |
| Date | 2026-07-18 |

---

## 2. Objective

Align all public inquiry UI copy and notification email templates with verified runtime truth. Eliminate misleading claims about supplier forwarding behaviour, response tracking, and buyer-supplier workflow features that do not exist.

**Defects addressed:**
- `INQ-COPY-02` (`MISLEADING`): "Your interest will be forwarded to the supplier for context" — factually overstated; supplier notification is conditional on profile/contact data availability.
- `INQ-COPY-24` (`OVERPROMISE_RISK`): "track responses, and connect with suppliers" — implies features that do not exist at this stage.
- `RT3-C` findings (email truthfulness audit): Admin alert lacked pre-auth context cue; supplier notification implied an active response workflow.

---

## 3. Copy Truth Boundary (In-Force)

**Allowed statements:**
- "Your inquiry has been received."
- "Your inquiry has been recorded by TexQtic."
- "The TexQtic team has been notified."
- "Where applicable, TexQtic may use this inquiry to coordinate next steps."
- "If your inquiry relates to a supplier profile, notification may be routed according to available profile/contact data."

**Forbidden (until explicitly built and verified):**
- Claim supplier definitely received the inquiry for all inquiry types
- Promise supplier response / response tracking
- Promise marketplace transaction handling
- Imply payment / order / RFQ execution
- Imply verified legal/compliance posture (PRIT-034 open)
- Imply buyer-supplier messaging workflow

---

## 4. Files Changed

| File | Change |
|---|---|
| `components/Public/PublicInquiryPage.tsx` | `InquiryForm` subtitle: replaced "forwarded to the supplier" (INQ-COPY-02); `SuccessPanel` body: replaced "track responses / connect with suppliers" (INQ-COPY-24) |
| `server/src/services/email/email.service.ts` | `sendAdminInquiryAlertEmail`: added "public/pre-auth inquiry" context line; `sendSupplierInquiryNotificationEmail`: softened "review and respond" to "review the context and follow the current follow-up process" |
| `server/src/__tests__/email-inquiry-wrappers.unit.test.ts` | Added EML-009 through EML-013 |
| `tests/frontend/public-inquiry-page.test.tsx` | Added PII-032 and PII-033 |

**Files NOT changed (confirmed truthful / no-change needed):**
- `GeneralInquiryForm` subtitle: "Tell us what you are looking for. No account required." — already safe
- `SuccessPanel` heading: "Your interest has been recorded." — already safe
- `sendBuyerInquiryAcknowledgementEmail` body: already uses "recorded by TexQtic" + "TexQtic team will review" — no change required

---

## 5. Change Detail

### 5a. `InquiryForm` helper text (INQ-COPY-02)

```
BEFORE: "No account required. Your interest will be forwarded to the supplier for context."
AFTER:  "No account required. Your inquiry will be recorded by TexQtic. The TexQtic team is notified and may coordinate next steps where appropriate."
```

### 5b. `SuccessPanel` body (INQ-COPY-24)

```
BEFORE: "Your inquiry has been received. Create an account to follow up, track responses, and connect with suppliers."
AFTER:  "Your inquiry has been received. Create an account to continue with TexQtic and access authenticated platform workflows."
```

### 5c. Admin alert: pre-auth context note

Added to `sendAdminInquiryAlertEmail` `lines` array:
```
'This is a public/pre-auth inquiry. Review context before follow-up.'
```

### 5d. Supplier notification: soften CTA

```
BEFORE: 'Log in to your TexQtic workspace to review and respond.'
AFTER:  'Log in to your TexQtic workspace to review the context and follow the current follow-up process.'
```

---

## 6. Tests Added

### Email (EML-009 → EML-013)

| ID | Assertion |
|---|---|
| EML-009 | Buyer ack does NOT contain "track responses" |
| EML-010 | Buyer ack does NOT contain "payment" or "order" |
| EML-011 | Buyer ack INCLUDES "recorded" AND "TexQtic team" |
| EML-012 | Admin alert INCLUDES "public/pre-auth" |
| EML-013 | Supplier notification does NOT contain "payment", "order", "RFQ", or "transact" |

### Frontend (PII-032 → PII-033)

| ID | Assertion |
|---|---|
| PII-032 | InquiryForm does NOT contain "forwarded to the supplier" |
| PII-033 | SuccessPanel does NOT contain "track responses" or "connect with suppliers" |

---

## 7. Validation Output

```
Email tests:    13 passed, 0 failed   (EML-001 → EML-013)
Frontend tests: 33 passed, 0 failed   (PII-001 → PII-033)
```

---

## 8. Open Items (Out of Scope for This Unit)

| ID | Description | Risk | Owner |
|---|---|---|---|
| PRIT-034 | Legal pages (Privacy Policy, Terms of Service) absent | MEDIUM — blocks public marketing activation | Future unit (F1-P6 or F2) |
| SUP-NOTIFY-VERIFY | Supplier-path notification verified only structurally; runtime path (slug → profile → contact email) not yet production-tested | LOW-MEDIUM | Future ops unit |
| POSTMARK-WEBHOOK | Postmark delivery webhook not configured | LOW | Future ops unit |

---

## 9. Governance Contracts Reviewed

| Contract | Review result |
|---|---|
| `AGENTS.md` — Copy truth boundary | PASS — all new strings comply |
| `AGENTS.md` — Tenant isolation | N/A — copy-only change |
| `AGENTS.md` — No route/schema/env change | PASS — no route, schema, config, or env touched |
| `openapi.tenant.json` | N/A — no endpoint shape changed |
| `db-naming-rules.md` | N/A — no DB interaction |

---

## 10. Findings

**Root cause of INQ-COPY-02:** The supplier notification path is conditional on the `supplier_slug` being present and the corresponding supplier profile having a reachable contact email. The original copy "will be forwarded to the supplier" was written as an unconditional statement, creating a factual overstatement that cannot be guaranteed for all inquiry submissions.

**Root cause of INQ-COPY-24:** The SuccessPanel body was written with features ("track responses", "connect with suppliers") that exist neither in the current auth-gated platform experience nor in any planned near-term sprint. This constituted a product promise without a delivery path.

**Buyer ack (already compliant):** The `sendBuyerInquiryAcknowledgementEmail` function was correct — it already stated "recorded by TexQtic" and "TexQtic team will review" with no overpromise. No change was required.

---

## 11. Commit Message

```
[TEXQTIC] fix: align inquiry copy with runtime truth
```

---

## 12. Recommended Next Packet

`SOFT-LAUNCH-F1-P6` — Privacy Policy / Terms of Service page implementation (closes PRIT-034, unblocks public marketing CTA activation).

---

## 13. Sign-Off

| Item | Status |
|---|---|
| All INQ-COPY-02 strings corrected | ✅ CLOSED |
| All INQ-COPY-24 strings corrected | ✅ CLOSED |
| Admin alert pre-auth context note added | ✅ DONE |
| Supplier notification CTA softened | ✅ DONE |
| Email tests EML-009–013 passing | ✅ PASS (13/13) |
| Frontend tests PII-032–033 passing | ✅ PASS (33/33) |
| No route/schema/env changes introduced | ✅ CONFIRMED |
| Governance artifact created | ✅ THIS FILE |
