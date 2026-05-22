# SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL

## 1. Header and Authority Boundary

| Field | Value |
|---|---|
| Unit ID | `SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL` |
| Phase | Soft-Launch F1 |
| Status | **COMPLETE** |
| Commit | `[TEXQTIC] feat: add branded inquiry email template shell` |
| Depends on | `SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX` (commit `e0ebc7c`) |
| Date | 2026-07-22 |

**Authority boundary:** This unit adds a branded email shell to the three public inquiry notification emails. It does not modify frontend inquiry copy, route logic, config/env, schema/migrations, Postmark settings, or marketing assets.

---

## 2. TLRH Storage Note

Artifact stored at: `governance/units/SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL.md`

TLRH indexes, Layer 0 docs, launch-readiness registers, and governance indices are **not** updated by this unit. They are not in the allowlist.

---

## 3. Git / Worktree Truth

| Item | Value |
|---|---|
| Repo | TexQtic/TexQtic |
| Branch | main |
| HEAD at start | `e0ebc7c6bc3aed4f77acf0da58b6323279300d13` |
| Worktree state | **CLEAN** (no uncommitted files) |
| F1-P5 commit present | ✅ `e0ebc7c` in ancestry |

---

## 4. Inputs Reviewed

| File | Purpose |
|---|---|
| `governance/units/SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX.md` | Prior unit — truthful copy boundary confirmed |
| `governance/units/SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY.md` | Email delivery verified — SMTP/Postmark/DKIM confirmed |
| `server/src/services/email/email.service.ts` | Existing email wrappers (buyer ack, admin alert, supplier notification) |
| `server/src/__tests__/email-inquiry-wrappers.unit.test.ts` | Existing tests EML-001 through EML-013 |
| `public/brand/` | Logo asset directory — contents inventoried |

---

## 5. Logo Asset Inventory

| Asset | Path | Type | Usage |
|---|---|---|---|
| Full TexQtic logo | `public/brand/texqtic-logo.png` | PNG | ✅ Used in email header |
| Short TexQtic logo | `public/brand/texqtic logo small.png.jpeg` | JPEG | Not used in this unit (reserved for future compact header) |

**Note:** The brand asset directory is `public/brand/` (singular) — not `public/brands/`.

**Logo URL construction:**
```
${FRONTEND_URL}/brand/texqtic-logo.png
```
`FRONTEND_URL` is already defined at module level in `email.service.ts` (`config.FRONTEND_URL ?? 'http://localhost:4000'`). No new environment variable was added.

In production: `https://app.texqtic.com/brand/texqtic-logo.png` (absolute HTTPS).

**Image-blocked fallback:** When the logo URL is absent or the image cannot load, the template renders a styled `<span>TexQtic</span>` text mark. The email remains fully readable without the image.

---

## 6. Template Architecture

### Helper file created

**`server/src/services/email/email.templates.ts`** (new file)

Exports:
- `buildInquiryEmailBodies(opts: InquiryEmailShellOptions): InquiryEmailBodies`

Input interface:
```typescript
interface InquiryEmailShellOptions {
  heading: string;      // rendered as <h1> in HTML
  lines: string[];      // rendered as <p> elements in HTML; newline-joined in text
  logoUrl?: string;     // absolute HTTPS URL to logo; absent → text fallback
}
```

Output interface:
```typescript
interface InquiryEmailBodies {
  html: string;
  text: string;
}
```

### Brand shell design

- Table-based layout with inline styles (email-client safe — Outlook, Gmail, Apple Mail)
- No external fonts
- No JavaScript
- No tracking pixels
- No hidden content
- `escHtml()` applied to all dynamic content (`heading`, each `lines` item) to prevent injection
- Header: full logo `<img alt="TexQtic">` or `<span>TexQtic</span>` fallback
- Body: `<h1>` heading + `<p>` paragraphs
- Footer: "TexQtic · Transactional notification" — text only, no legal links (deferred, see §8)
- Accessible `alt` text on logo: `alt="TexQtic"`
- Email is readable with images blocked (text fallback active)

### Plain-text fallback

Format:
```
{heading}

{line 1}
{line 2}
...

TexQtic · Transactional notification
```

Always present alongside HTML. No content is lost when plain text only.

---

## 7. Emails Updated

### `sendBuyerInquiryAcknowledgementEmail`

| Item | Before | After |
|---|---|---|
| HTML | Raw `<p>` tags | Branded shell via `buildInquiryEmailBodies` |
| Subject | "We received your TexQtic inquiry" | unchanged |
| Heading | — | "We received your TexQtic inquiry" |
| Lines | Same truthful content (F1-P5) | unchanged |
| Text fallback | Raw newlines | Structured with heading + footer |

### `sendAdminInquiryAlertEmail`

| Item | Before | After |
|---|---|---|
| HTML | Raw `<p>` tags | Branded shell |
| Subject | "New public inquiry submitted — TexQtic" | unchanged |
| Heading | — | "New public inquiry" |
| Lines | Same content incl. pre-auth note (F1-P5) | unchanged |

### `sendSupplierInquiryNotificationEmail`

| Item | Before | After |
|---|---|---|
| HTML | Raw `<p>` tags | Branded shell |
| Subject | "New public sourcing interest for your TexQtic profile" | unchanged |
| Heading | — | "New sourcing interest on your TexQtic profile" |
| Lines | Same content (F1-P5 softened CTA) | unchanged |

**Copy truth boundary preserved:** No F1-P5 content was altered. No new claims about supplier receipt, response tracking, payment, or order were introduced.

---

## 8. Legal Footer Decision

**Decision: No legal links included.**

PRIT-034 (Privacy Policy / Terms of Service implementation) remains open. Live legal routes have not been verified in source.

Footer uses plain text only:
```
TexQtic · Transactional notification
```

Legal links are deferred to PRIT-034 / future unit F1-P6B.

---

## 9. Tests and Validation Results

### Test results

| Scope | Count | Result |
|---|---|---|
| Email wrapper tests (EML-001 → EML-013, existing) | 13 | ✅ PASS |
| Branded template tests (EML-014 → EML-020, new) | 7 | ✅ PASS |
| **Total** | **20** | **✅ 20/20 PASS** |

### New tests added (EML-014 → EML-020)

| ID | Assertion |
|---|---|
| EML-014 | `buildInquiryEmailBodies` HTML includes `alt="TexQtic"` when `logoUrl` supplied |
| EML-015 | Text fallback used (no `<img>`) when `logoUrl` absent; HTML still contains "TexQtic" |
| EML-016 | Plain text includes heading and "Transactional notification" |
| EML-017 | HTML escapes `<script>` in lines — injection prevention verified |
| EML-018 | Buyer ack log output includes "TexQtic"; no forbidden copy |
| EML-019 | Admin alert log output includes "TexQtic" and "public/pre-auth" |
| EML-020 | Supplier notification log output includes "TexQtic"; no payment/order language |

### TypeScript typecheck

```
npx tsc --noEmit (in server/)
Result: No errors
```

---

## 10. Remaining Blockers

| ID | Description | Risk | Recommended action |
|---|---|---|---|
| PRIT-034 | Privacy Policy / Terms of Service pages absent | MEDIUM — blocks public marketing CTA | Unit F1-P6B — legal pages content decision and implementation |
| SUP-NOTIFY-RUNTIME | Supplier notification path (slug → profile → contact email) not yet production-tested | LOW-MEDIUM | Future ops unit — supplier path verification |
| POSTMARK-WEBHOOK | Postmark delivery webhook not configured | LOW | Future ops unit |
| F1-P6C-FUTURE | Invite / password-reset / email-verification emails still use raw HTML | LOW | Unit F1-P6C — extend branded shell to auth emails |

---

## 11. Recommended Next Packet

**F1-P6B** — Privacy Policy / Terms of Service: implementation or content decision to close PRIT-034.

**F1-P6C** (later) — Extend branded email shell to invite, password-reset, and email-verification emails.

---

## 12. Explicit No-Secrets / No-Schema / No-Env / No-Postmark-Template Statement

| Category | Status |
|---|---|
| Secrets / .env contents | Not printed, not modified |
| DATABASE_URL / connection strings | Not accessed |
| schema.prisma | Not modified |
| Migrations | Not created or run |
| .env files | Not modified |
| Vercel settings | Not modified |
| Postmark dashboard templates | Not created |
| Postmark Template API | Not used |
| Route logic | Not modified |
| Config/env parsing | Not modified |
| Frontend inquiry copy | Not modified |
| Marketing repo | Not modified |
| TLRH indexes / Layer 0 docs | Not modified |
| Production data | Not mutated |
| SQL | Not run |

---

## 13. Files Changed

| File | Change type |
|---|---|
| `server/src/services/email/email.templates.ts` | **Created** — branded email shell helper |
| `server/src/services/email/email.service.ts` | **Modified** — import + 3 inquiry wrapper updates |
| `server/src/__tests__/email-inquiry-wrappers.unit.test.ts` | **Modified** — EML-014 → EML-020 added |
| `governance/units/SOFT-LAUNCH-F1-P6A-BRANDED-INQUIRY-EMAIL-TEMPLATE-SHELL.md` | **Created** — this artifact |
