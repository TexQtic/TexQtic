# TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001
## TexQtic TradeTrust Pay — Operator Legal Packet Decision Guide

**Unit ID:** `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001`
**Document type:** Operator-facing decision guide — non-code, internal governance
**Audience:** Paresh Patel (TexQtic founder / operator) — NOT for external distribution without review
**Date (original):** 2026-05-06
**Date (cross-reference updated):** 2026-07-06
**`ttp_enabled` state:** `false` — UNCHANGED.
**Legal status:** `LEGAL_REVIEW_PENDING` throughout. No wording or decision in this document is legally approved.
**Code changes:** None.
**Schema / migration changes:** None.

> **UPGRADE NOTICE (2026-07-06):** The canonical external legal counsel packet (`TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`) has been upgraded under `TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001` to cover **Unified Platform TTP + NC-TTP** scope. §12–§25 have been added to that packet, including: NC-TTP product description, regulatory posture matrix, consent framework doctrine, partner routing legal gate, user-facing wording review pack, disclaimer pack (D-001–D-007), terms acceptance flow requirements, data sharing / privacy questions (Q1–Q16), open legal questions (O–Y), expanded counsel output expected, future packet impact map (8 HOLD packets), and the final legal gate statement. **This operator guide is a supporting reference only. The canonical packet is the single authority for counsel engagement.** All decisions listed in §5 of this guide are superseded by the activation blockers in §25 of the upgraded packet. No implementation or activation is authorized. Proceed by sending the upgraded canonical packet to external legal counsel.

---

## 1. Why This Legal Packet Exists

TradeTrust Pay has been under careful, governance-gated development. Until now, every component built has been internal — backend services, admin routes, scoring computation, feature gates, and monitoring. Nothing tenant-visible has been implemented. The feature flag (`ttp_enabled=false`) has kept all TTP routes gated.

**The transition we are approaching is different.** The next logical implementation steps involve exposing surfaces to tenants (sellers and buyers) and eventually to finance partners. Specifically:

- Showing TexQticScore to sellers (their own readiness score)
- Surfacing a Verified Payment Certificate (VPC) to tenants
- Recording consent for data sharing
- Routing sellers toward finance partner engagement

These steps cross a threshold that requires legal due diligence. Once a score or readiness indicator is shown to a tenant:
- It may be interpreted as a credit determination
- It may attract regulatory scrutiny under Indian consumer protection or financial services law
- If the wording is wrong, TexQtic may be unintentionally representing itself as a credit bureau, NBFC, or payment intermediary

**This is not a reason to stop the product.** It is a reason to get qualified legal counsel before proceeding.

**The legal counsel packet** (`governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`) captures all the wording, surfaces, and questions in a form that a corporate lawyer can review and provide written opinion on.

**This document** explains the packet to you, Paresh — in plain terms — so you can make an informed decision about what to send, what to ask, and what comes next.

---

## 2. What Has Already Been Built Safely

These items are already in production and carry no pending legal risk. They are internal, gated, and admin-only.

| Item | Why it is safe |
|---|---|
| Feature gate (`ttp_enabled=false`) | Tenants never see TTP. All routes return 503. |
| QA sentinel isolation | Testing is isolated from real tenant data. |
| Structured monitoring events | Logs are internal server-side only. |
| Activation/rollback runbook | Governance documentation only. |
| `TTP_DISCLAIMER_TEXT` constant | Written and stored in code. Not yet visible to tenants. |
| `SCORE_DISCLAIMER` constant | Same — internal code only. |
| `TEXQTICSCORE_V2_DISCLAIMER` constant | Same — internal code only. |
| `ttp_score_snapshots` database table | Admin/backend only. RLS prevents tenant access. |
| Score snapshot service and triggers | Internal — best-effort background capture. No tenant exposure. |
| Admin score snapshot read routes | SUPER_ADMIN only. Not accessible to tenants. |
| TexQticScore v2 computation | Pure service function — no route, no tenant surface. |
| TexQticScore v2 admin read/filter | SUPER_ADMIN only. |
| Control-plane feature-disabled UX | Only SUPER_ADMIN sees this text. |
| Frontend test harness (RTL/jsdom, CI) | Developer tooling only. |

**You are not at legal risk for anything in this list.** These have been built carefully, within defined product boundaries, behind a hard feature gate.

---

## 3. What Is Currently Blocked

The following items are deliberately blocked and will remain blocked until legal review is complete and you have approved the next step.

| Blocked item | Why blocked | Gate |
|---|---|---|
| Tenant-visible TexQticScore | `LEGAL_REVIEW_PENDING` unresolved — showing a score to tenants could be interpreted as credit assessment | `BLOCKED_LEGAL` |
| Consent / data-sharing design and UI | Requires legally-approved consent text and DPDP alignment before any design begins | `LEGAL_GATED__WAITING` |
| Partner workflow and transmission | No partner contract, no legal framework, no consent mechanism | `PARTNER_GATED__WAITING` |
| Finance request / offer tables | Same gate — no partner contract and no legal framework | `PARTNER_GATED__WAITING` |
| Dynamic discounting | Same gate | `PARTNER_GATED__WAITING` |
| Fee events | Fee disclosure requirements not yet reviewed | `FUTURE_DESIGN_TARGET__WAITING` |
| Live GSTN / CIBIL / Account Aggregator | No government/bureau agreement, no consent design | Not designed |
| External score sharing with partners | No consent mechanism, no data-sharing agreement | Not designed |

---

## 4. Legal Decision Areas — Plain English

Here is what counsel needs to review, and what it means for you.

### 4.1 Disclaimer wording (`TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, `TEXQTICSCORE_V2_DISCLAIMER`)

**What it is:** These are text strings that appear in API responses alongside readiness signals and scores. They tell the reader that the information is advisory only.

**The concern:** If the wording is too weak, weak disclaimers may not protect TexQtic if a tenant or partner claims they relied on the information as a credit determination. If the wording is too aggressive (e.g., "this is not financial advice"), it may create an obligation to explain what TexQtic is actually providing.

**What counsel needs to do:** Review the current and candidate wording. Confirm which version is legally safe (or provide a revision).

**If counsel approves:** Update the constants in code. No structural change needed.
**If counsel requires revision:** Update the constants with the approved wording. Minor code change only.

### 4.2 TexQticScore wording and name

**What it is:** TexQticScore is a 0–100 platform-internal readiness indicator. It is computed from internal signals (enrollment status, VPC status, invoice history, GST data, payment history). It is NOT a CIBIL score, bureau score, or regulated credit product.

**The concern:** The word "Score" — especially when shown to a party in a trade finance context — may imply credit scoring. If a seller interprets their TexQticScore as a form of credit score, and TexQtic has not registered as a credit bureau, this could be a regulatory issue.

**What counsel needs to do:** Confirm whether "TexQticScore" is a safe name. Confirm whether sellers can see their own score (and with what wording).

**If counsel approves score visibility with wording:** Open `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001`.
**If counsel requires rename or restricts visibility:** Redesign the product name and surface before opening that unit.

### 4.3 Tenant-visible score surface

**What it is:** Whether sellers can see their TexQticScore on the TexQtic platform.

**The concern:** Showing a readiness score to a trade participant in a finance context is the most legally sensitive step. This is the surface that could, if incorrectly positioned, attract credit bureau or NBFC regulation.

**What counsel needs to do:** Give a clear yes/no (or yes-with-conditions) on seller score visibility. If conditions apply, state them precisely.

**If counsel approves:** Open `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` with approved wording.
**If counsel requires further conditions:** Do not open until conditions are implemented.
**If counsel says no:** Redesign the surface (admin-only permanently, or different product positioning).

### 4.4 Consent and data-sharing wording

**What it is:** Before any readiness data (score, VPC status, enrollment state) is shared with a finance partner, TexQtic must record the seller's informed consent.

**The concern:** Under India's Digital Personal Data Protection Act (DPDP 2023) and general contract law, data sharing without valid consent is both legally and commercially problematic. The consent text must be specific about purpose, recipient class, duration, and revocation rights.

**What counsel needs to do:** Provide model consent wording. Confirm what data categories require consent.

**If counsel provides consent wording:** Design Wave 3 (consent/data-sharing) with that text. Do not start Wave 3 without this.
**If counsel defers:** Wave 3 remains `LEGAL_GATED__WAITING`.

### 4.5 VPC wording

**What it is:** The Verified Payment Certificate is a platform record TexQtic issues to indicate an organisation met internal readiness criteria. Currently it exists only as label strings (`VPC_ISSUED`, `VPC_ACTIVE`). No display copy exists.

**The concern:** "Verified", "Payment", and "Certificate" are individually and collectively terms that could imply regulatory authority, payment guarantee, or official government documentation.

**What counsel needs to do:** Confirm the label strings are safe. Provide approved display copy if VPC is to be surfaced to tenants.

### 4.6 Partner/finance/fee wording

**What it is:** Wording that would be used when TexQtic routes a seller toward a finance partner, describes what TexQtic does, or collects a platform fee.

**The concern:** Describing TexQtic as connecting sellers to "financing" or "lenders" could imply TexQtic is a lending arranger, a broker, or a TReDS platform — all regulated categories.

**What counsel needs to do:** Provide safe wording for partner routing, and flag any fee structures that require regulatory disclosure.

---

## 5. Decision Options and Implications

For each major decision area, here are your options and what each implies.

| # | Decision area | Option A | Option B | Option C | Option D | Option E | Option F | Option G |
|---|---|---|---|---|---|---|---|---|
| 1 | Disclaimer wording | **Use current wording as-is** (if counsel approves) — update constants, open tenant surface | **Use candidate revised wording** (if counsel approves) — update constants, open tenant surface | **Use counsel-supplied wording** — update constants, open tenant surface | **Keep wording as-is for admin only** — do not surface to tenants; re-review before any tenant exposure | **Redesign product** — remove disclaimers as scope is too risky | — | — |
| 2 | TexQticScore name | **Keep "TexQticScore"** (if counsel approves) — no rename needed | **Rename to "Readiness Indicator"** (or counsel-approved term) — update all references in code and governance | **Keep for admin only** — never expose "TexQticScore" name to tenants; use different name for tenant surface | — | — | — | — |
| 3 | Seller score visibility | **Sellers can see their own TexQticScore** (if counsel approves with wording) — open `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | **Sellers can see a readiness band only** (no numeric score) — redesign surface before opening | **Sellers cannot see score or band** — admin-only permanently; redesign product for tenant engagement differently | **Sellers can see score with explicit consent** — add consent gate before score display | — | — | — |
| 4 | Buyer/partner score visibility | **Buyers can see a seller's readiness band** (if counsel approves) — design buyer-facing surface in Wave 3 | **Buyers cannot see score** — buyer surfaces never show readiness data | **Partners can see score with data-sharing agreement** — partner API gated by consent + contract | **Partners cannot see any TexQtic score** — partner routing uses separate non-score signals | — | — | — |
| 5 | Consent/data-sharing | **Implement consent with counsel-approved text** — begin Wave 3 design after counsel feedback | **Defer consent design** — Wave 3 remains blocked until further legal input | **Use opt-in only** (tightest scope) — sellers must explicitly opt in; no default sharing | **Use opt-out** — sellers are enrolled in data sharing by default; opt-out available | — | — | — |
| 6 | VPC tenant surface | **Surface VPC to tenants with counsel-approved wording** — open VPC tenant design in Wave 3 | **Keep VPC admin-only** — never surface VPC to tenants; admin evidence record only | **Surface VPC to sellers only** (not buyers) — narrow exposure | **Surface VPC to finance partners only** (not tenants) — requires partner contract | — | — | — |
| 7 | Implementation path after counsel feedback | **Proceed with smallest approved unit first** (e.g., update disclaimer constants only) | **Proceed with disclaimer + band label + tenant score surface in one unit** (if all approved) | **Pause all tenant surfaces** — keep everything admin-only pending further legal review | **Pause all TradeTrust Pay work** — stop Wave 2 extension, pending deeper legal review | — | — | — |

---

## 6. How Decisions Map to Implementation Units

When counsel provides feedback, here is how the decisions map to what gets opened in the implementation tracker.

| Decision | Implementation unit it unlocks | What changes in code |
|---|---|---|
| Disclaimer wording approved / revised | `TTP-IMPL-002` extension — update constants | `TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, `TEXQTICSCORE_V2_DISCLAIMER` in their respective constant files |
| TexQticScore name approved + seller score visibility approved | `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` (currently `BLOCKED_LEGAL`) | New tenant-facing API route + frontend component |
| Consent wording approved | `TTP-DATA-CONSENT-DESIGN-001` (Wave 3 gate) | Consent schema, consent table (SQL/RLS), consent UI |
| Data-sharing wording approved | Wave 3 data-sharing design unit | Data-sharing API, consent check in partner routing |
| Partner/finance wording approved | Wave 4 partner marketplace units | Partner routing tables, partner API |
| Fee wording approved | Wave 5 fee events unit | Fee event table (SQL/RLS), fee API |
| Any item NOT approved | Nothing unlocked for that item | No code change; governance record updated only |
| Pause / pending further review | No implementation units opened | No code change; tracker updated with pause state |

---

## 7. Recommended Safest Path

**Step 1:** Send the legal counsel packet (`governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`) to your corporate lawyer. Export it to PDF if needed.

**Step 2:** Wait for written feedback. Do not open any implementation units until you have it in writing.

**Step 3:** When feedback arrives, open `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001` in the governance tracker. Record every counsel answer against the 14 questions in §7 of the counsel packet.

**Step 4:** Identify the smallest approved next step. Do not open multiple units in one prompt. One approval → one unit.

**Step 5:** If counsel approves disclaimer wording, update the constants first (safest, lowest-risk change). Confirm the update is clean. Then proceed to the next approved item.

**Step 6:** If counsel requires a redesign (e.g., rename TexQticScore), do the rename in a dedicated governance unit. Record the decision. Then proceed.

**Why this is the safest path:** Each step is reversible (or the smallest possible forward move). No step exposes tenants to any surface until the specific wording for that surface is legally cleared.

---

## 8. What to Send Counsel

Here is a checklist of what to prepare for your legal counsel engagement:

- [ ] Export `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` to PDF (or share the Markdown file directly)
- [ ] Ask counsel to provide written answers to questions A through N (§7 of the counsel packet)
- [ ] Ask counsel to complete the decision grid (§8 of the counsel packet) for each topic
- [ ] Ask counsel to provide approved/revised wording for any disclaimer or surface they mark as needing change
- [ ] Ask counsel to provide redlines on the candidate wording (§5, rows 2, 4, 11, 12) where changes are needed
- [ ] Ask counsel to confirm what role/surface restrictions apply (admin only, seller only, buyer excluded, etc.)
- [ ] Ask counsel to flag any regulatory red flags (NBFC, TReDS, credit bureau, DPDP, etc.) proactively
- [ ] Ask counsel whether TexQtic's Terms of Service or Privacy Policy need to be updated before any TTP surface goes live for tenants
- [ ] Ask counsel for an estimated timeline for written feedback
- [ ] Ask counsel for their preferred format for providing approved wording (email, tracked-changes Word document, annotated PDF)

---

## 9. What NOT to Do Yet

Until counsel feedback is received and formally recorded:

- **Do NOT open `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001`.** It remains `BLOCKED_LEGAL`.
- **Do NOT design or implement any consent UI or data-sharing table.** Wave 3 remains `LEGAL_GATED__WAITING`.
- **Do NOT build any partner workflow, partner API, or finance request table.** Wave 4 remains `PARTNER_GATED__WAITING`.
- **Do NOT update `TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, or `TEXQTICSCORE_V2_DISCLAIMER` constants** — even if you believe the current wording is correct. Wait for counsel to confirm.
- **Do NOT surface any score, score band, or score factor to any tenant** — not even as read-only.
- **Do NOT change `ttp_enabled` from `false`.**
- **Do NOT share any TexQticScore data with any finance partner** — no live partner API exists, but do not design one until consent and legal framework are in place.
- **Do NOT add any fee events, fee calculations, or fee-related UI.**

---

## 10. Final Operator Decision Status

```
TTP_LEGAL_PACKET_OPERATOR_DECISION_GUIDE_001_STATUS = READY_FOR_PARESH_REVIEW
LEGAL_COUNSEL_REVIEW_PACKET_READY_TO_SEND = true
IMPLEMENTATION_PAUSED_PENDING_LEGAL_COUNSEL = true
ttp_enabled = false (UNCHANGED)
LEGAL_REVIEW_PENDING = true (UNCHANGED)
NEXT_REPO_ACTION_AFTER_COUNSEL_FEEDBACK = TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001
```

**You are not being asked to make a legal decision right now.** You are being asked to send this packet to counsel and wait for written feedback before proceeding.

The governance system is prepared to receive and record counsel feedback cleanly when you are ready.

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*Date: 2026-05-06*
*`ttp_enabled=false` — UNCHANGED. `LEGAL_REVIEW_PENDING` — UNCHANGED. No code changed.*
