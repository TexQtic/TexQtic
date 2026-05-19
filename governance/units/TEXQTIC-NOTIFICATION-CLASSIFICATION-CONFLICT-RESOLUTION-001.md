# TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001

## §1 Unit Summary

| Field | Value |
|---|---|
| Unit ID | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 |
| Unit Type | GOVERNANCE_CLASSIFICATION_RESOLUTION |
| Status | VERIFIED_COMPLETE |
| Authorized by | Paresh Patel |
| Executed by | GitHub Copilot (agent) |
| Date | 2026-07-14 |
| Layer 0 posture | `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — **UNCHANGED** |

---

## §2 Objective

Resolve governance unit **R-013**: the notification classification conflict between two TLRH documents:

- `MVP-LAUNCH-READINESS-ROADMAP.md` row 26: messaging/notifications classified as `NOT_ASSESSED / P3 / POST_MVP`
- `MVP-MUST-HAVES-CHECKLIST.md` I-4: "Inquiry notification reaches supplier/admin" classified as `NOT_ASSESSED / P0`

This conflict had to be resolved before `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` and `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` could open, as both documents would be used in family planning.

---

## §3 Scope

**In scope:**
- Resolving R-013 by Paresh-approved split-scope classification
- Updating all five affected TLRH register documents
- Recording Paresh decisions on PRIT-032 through PRIT-035
- Creating this unit artifact as governance evidence

**Explicitly out of scope:**
- No implementation: no notification code, no email wiring, no inbox route, no UI
- No family cycle opening
- No family audit
- No runtime files modified
- No Prisma, schema, OpenAPI, or event-contract changes
- BS-002 (notification delivery risk) remains OPEN — it is NOT resolved by this governance-only unit
- Layer 0 posture is NOT changed

---

## §4 Conflict Detail (R-013)

### R-013 Root Cause

Two documents in the TLRH governed the same capability at contradictory priority levels:

| Document | Row / Item | Classification |
|---|---|---|
| `MVP-LAUNCH-READINESS-ROADMAP.md` | Row 26: Messaging/notifications | `NOT_ASSESSED / P3 / POST_MVP` |
| `MVP-MUST-HAVES-CHECKLIST.md` | I-4: Inquiry notification reaches supplier/admin | `NOT_ASSESSED / P0` |

If the ROADMAP classification was used during family planning, the I-4 P0 item (inquiry notification) would be deprioritized or missed entirely, breaking the inquiry loop at launch.

---

## §5 Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | Row 26 conflict source |
| `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | I-4 conflict source |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | R-013 open risk |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-032–035 status; §6 Paresh-Confirmed table |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | §5 B2C register; §12 Paresh confirmation; §11 update history |
| `governance/launch-readiness/MISSING-FAMILY-AND-FEATURE-SCAN.md` | SCAN-001 findings that surfaced R-013 |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Family mapping cross-reference |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | Upstream decision dependencies |
| `governance/launch-readiness/BLOCKED.md` | Blocked item registry |
| `governance/launch-readiness/BS-002` cross-reference via risk register | Notification delivery blind spot (must remain OPEN) |
| `governance/launch-readiness/README.md` | TLRH index |
| `governance/units/TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001.md` | Predecessor unit that added R-013 |
| `AGENTS.md` / `.github/copilot-instructions.md` | Governance operating constraints |

---

## §6 Files Changed

| File | Change Type | Description |
|---|---|---|
| `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | MODIFY | Row 26 Notes updated; update history row added |
| `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | MODIFY | I-4 renamed, reclassified P0→P1, Notes updated; update history row added |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | MODIFY | R-013 status: OPEN → MITIGATED; mitigation evidence added; update history row added |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | MODIFY | PRIT-032–035 Part B launch classes updated to confirmed; PRIT-033 Part A scope note added; §6 Paresh-Confirmed table extended; §12 changelog row added |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | MODIFY | FTR-B2C-004 added to §5; §12 Paresh confirmation row added; §11 update history row added |
| `governance/units/TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001.md` | CREATE | This unit artifact |

**Runtime files modified:** NONE  
**Frontend files modified:** NONE  
**Backend files modified:** NONE  
**Prisma/schema modified:** NONE

---

## §7 R-013 Conflict Summary

**Conflict:** ROADMAP row 26 classified the entire messaging/notifications domain as POST_MVP/P3. CHECKLIST I-4 classified a subset of that domain — "Inquiry notification reaches supplier/admin" — as P0. These two documents contradicted each other on the same capability.

**Consequence if unresolved:** Family planning teams using the ROADMAP would deprioritize or miss the I-4 P0 item, resulting in no notification mechanism at inquiry at launch. The buyer inquiry loop would be incomplete.

**Paresh-approved resolution:** Split-scope classification.

---

## §8 Final Classification Resolution (Paresh-Approved)

| Scope | Classification | Documents Updated |
|---|---|---|
| **Scope A — Full/general multi-channel messaging-notification platform** | `POST_MVP / P3 / DEFERRED` | ROADMAP row 26 Notes updated to clarify this scope only |
| **Scope B — Minimum inquiry notification loop (buyer inquiry reaches supplier/admin)** | `MVP_CRITICAL / P1 / REQUIRED_BEFORE_BUYER_OUTREACH` | CHECKLIST I-4 updated; PRIT-033 confirmed; FTR-B2C-004 added |

**Classification gate:** Minimum inquiry notification is required before buyer-facing outreach, public network-building promotion, or any open solicitation of buyer inquiries. It does NOT require full messaging platform infrastructure.

---

## §9 ROADMAP Row 26 Update Summary

| Field | Before | After |
|---|---|---|
| Title | Messaging/notifications | Messaging/notifications (full platform) |
| Priority | P3 | P3 (unchanged) |
| Launch Class | POST_MVP | POST_MVP (unchanged) |
| Notes | — | Full/general multi-channel messaging platform only. Minimum inquiry notification tracked separately as MVP_CRITICAL/P1. See CHECKLIST I-4, PRIT-033, FTR-B2C-004. Resolved by this unit. |

Update history row added: 2026-07-14.

---

## §10 CHECKLIST I-4 Update Summary

| Field | Before | After |
|---|---|---|
| Title | Inquiry notification reaches supplier/admin | Minimum inquiry notification reaches supplier/admin |
| Priority | P0 | P1 |
| Notes | Email/notification wiring? | MVP_CRITICAL. Minimum path only — not full messaging platform. Required before buyer-facing outreach. See PRIT-033, FTR-B2C-004. R-013 resolved. |

Update history row added: 2026-07-14.

**Rationale for P0→P1:** P1 = MVP_CRITICAL, which correctly captures that this is required before buyer-facing outreach. P0 was previously used without distinction from P1 in the checklist context; P1/MVP_CRITICAL is the correct TLRH-consistent classification.

---

## §11 Risk Register R-013 Update Summary

| Field | Before | After |
|---|---|---|
| Status | OPEN | MITIGATED |
| Action/mitigation | "Paresh must resolve…" | Split-scope resolution recorded; ROADMAP row 26 and CHECKLIST I-4 updated; BS-002 remains OPEN |

Update history row added: 2026-07-14.

**Note:** MITIGATED means the classification conflict is resolved. It does NOT mean notification delivery is implemented. The delivery risk (BS-002) remains OPEN until implementation and production verification.

---

## §12 PRIT / FTR Cross-Reference Updates

### PRIT-032 through PRIT-035 (Paresh-Confirmed)

| PRIT | Classification Confirmed | Launch Class Confirmed |
|---|---|---|
| PRIT-032 (Cart-as-intent governance) | P2 | PILOT_REQUIRED |
| PRIT-033 (Supplier inquiry response workflow) | P1 | MVP_CRITICAL |
| PRIT-034 (Public legal pages bundle) | P1 | MVP_CRITICAL |
| PRIT-035 (Product analytics and funnel tracking) | P2 | PILOT_REQUIRED |

All four Part B rows updated in `PLANNED-REQUIREMENTS-INTAKE.md`: `GOVERNANCE_CLAIM_ONLY → confirmed class`, `SCAN_IDENTIFIED → PARESH_CONFIRMED`, `PARESH_REQUIRED → PARESH_CONFIRMED (2026-07-14)`.

**PRIT-033 scope note added (Part A):** Minimum inquiry notification to supplier/admin is part of PRIT-033 scope. Tracked separately as FTR-B2C-004 / INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001 pending family assignment.

§6 Paresh-Confirmed table extended with PRIT-032–035 rows.
§12 changelog row added.

### FTR-B2C-004 Added

New FTR added to Section 5 (Public Pages / B2C / D2C):

| Field | Value |
|---|---|
| ID | FTR-B2C-004 |
| Title | Minimum inquiry notification loop (soft-launch prerequisite) |
| Launch Class | MVP_CRITICAL |
| Priority | P1 |
| Status | OPEN |
| Readiness | DESIGN_GATED |
| PRIT cross-ref | PRIT-033 |
| Family assignment | FAM-03 or FAM-08 (Paresh to confirm at family selection) |

§12 Paresh confirmation row added for FTR-B2C-004.
§11 update history row added.

**Future unit candidate:** `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` — DESIGN_GATED, MVP_CRITICAL/P1. Requires family assignment decision (FAM-03 or FAM-08) at first family selection.

---

## §13 BS-002 Status Confirmation

**BS-002 (Notification Delivery Blind Spot) remains OPEN.**

This governance unit resolved the CLASSIFICATION conflict only. It did not:
- Implement any notification delivery mechanism
- Verify any email/webhook/in-app notification path works in production
- Confirm family assignment for notification implementation
- Open any family cycle

BS-002 must remain OPEN until notification delivery is implemented and production-verified as part of a future family cycle (FAM-03 or FAM-08).

---

## §14 Absolute Prohibitions Confirmed

- ✅ No implementation performed
- ✅ No family cycle opened or audited
- ✅ No runtime, frontend, or backend files modified
- ✅ No Prisma, schema, migration, OpenAPI, or event-contract changes
- ✅ Layer 0 posture unchanged
- ✅ BS-002 remains OPEN
- ✅ No notification delivery marked as implemented or verified
- ✅ No secrets, DB URLs, or credentials printed or modified

---

## §15 TECS Hub-Sync (Q1–Q9)

| Question | Answer |
|---|---|
| Q1: Does this unit change any governance classification or TLRH document? | YES — ROADMAP row 26 Notes, CHECKLIST I-4 (priority + title), Risk Register R-013 (OPEN → MITIGATED), PRIT-032–035 (launch class + Paresh flag), FTR-B2C-004 (new) |
| Q2: Which items changed? | R-013 MITIGATED; ROADMAP row 26 Notes updated; CHECKLIST I-4 P0→P1; PRIT-032–035 PARESH_CONFIRMED; FTR-B2C-004 added |
| Q3: Which documents were modified? | MVP-LAUNCH-READINESS-ROADMAP.md; MVP-MUST-HAVES-CHECKLIST.md; BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md; PLANNED-REQUIREMENTS-INTAKE.md; FUTURE-TODO-REGISTER.md; this unit artifact |
| Q4: Was this Paresh-authorized? | YES — Paresh approved the split-scope resolution in session (2026-07-14) |
| Q5: Does this unit open a family cycle? | NO |
| Q6: Does this unit unblock any subsequent governance unit? | YES — unblocks TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001 and TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001 |
| Q7: Does any downstream unit now depend on this unit? | YES — FIRST-FAMILY-CYCLE-SELECTION-001 required R-013 resolved; NETWORK-BUILDING-STRATEGY-001 required it resolved |
| Q8: Are there any open Layer 0 risks introduced or removed? | N/A — Layer 0 posture unchanged; no new risks introduced |
| Q9: Is this unit standalone or does it require a follow-on? | Requires follow-on: `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` (DESIGN_GATED) for actual notification implementation |

---

## §16 Validation

### Pre-flight (before commit)

```
git diff --name-only
git status --short
```

Expected: only allowlisted governance files; pre-existing ` M` runtime files (`components/Public/PublicSupplierProfile.tsx`, `tests/frontend/public-referral-landing.test.tsx`) MUST NOT be staged.

### Staging gate

```
git add governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md
git add governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md
git add governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md
git add governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md
git add governance/launch-readiness/FUTURE-TODO-REGISTER.md
git add "governance/units/TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001.md"
git status --short
```

Expected: only the 6 listed files staged (`A` for new unit, `M` for 5 modified files).

### Commit message

```
[TEXQTIC] governance: resolve notification classification conflict (R-013)
```

### Post-commit backfill

Commit hash `[TO BE BACKFILLED IN §17]` written to this file, then second commit:

```
[TEXQTIC] governance: backfill commit hash in NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 unit artifact
```

---

## §17 Commit Hash

**Primary commit hash:** `[TO BE BACKFILLED]`

---

## §18 Next Unit

**`TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001`**

R-013 resolution was listed as a prerequisite for this unit. This unit is now unblocked.
`TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` is also unblocked by this resolution.

---

*TexQtic governance unit — Paresh Patel authorized — 2026-07-14*
