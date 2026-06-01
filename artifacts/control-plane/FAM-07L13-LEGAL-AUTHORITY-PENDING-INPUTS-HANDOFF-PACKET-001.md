# FAM-07L13 — LEGAL-AUTHORITY-PENDING-INPUTS-HANDOFF-PACKET-001

**Unit ID:** FAM-07L13-LEGAL-AUTHORITY-PENDING-INPUTS-HANDOFF-PACKET-001
**Unit Type:** Bounded Planning Artifact — Human-Facing Handoff Packet
**Status:** VERIFIED_COMPLETE
**Closed:** 2026-06-01
**Branch:** main
**Depends on:** FAM-07L12-LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001 (43dc42d2)
**Next Recommended Unit:** FAM-07L13A-LEGAL-AUTHORITY-PENDING-INPUTS-HUMAN-REVIEW-HOLD-001

---

## 1. Unit Summary

This is the human-facing handoff packet for the TexQtic FAM-07 legal authority gate.

It extracts the technical input checklist from L12 into a clean collection template that
Paresh (founder/operator) and/or external legal counsel can use to supply the information
required before a future supplier onboarding authority-file creation unit may be opened.

**This packet:**
- Collects specific legal package inputs from counsel and/or Paresh
- Is structured as a series of collection forms, one per input domain
- Uses `[PENDING_*]` placeholders that must be filled in with real values

**This packet does not:**
- Create, approve, simulate, or validate any legal authority record
- Advance FAM-07 toward `VERIFIED_COMPLETE`
- Close FTR-LEGAL-003 or change HD-001 status
- Authorize a future authority-file creation unit by itself
- Constitute Paresh's approval of anything

---

## 2. Preflight Evidence

```
git status --short            → (clean — no output)
git rev-parse --short HEAD    → 43dc42d2
git merge-base --is-ancestor 43dc42d2 HEAD → exit code 0 (TRUE)

artifacts/control-plane/FAM-07L12-*.md   → True (exists)
artifacts/control-plane/FAM-07L11-*.md   → True (exists)
governance/legal/fam-07/                 → False (directory absent — legal gate intact)
governance/legal/fam-07/supplier-onboarding-terms-authority.json → False (absent)
```

No unexpected authority file found. Proceeding.

---

## 3. Repo-Truth Sources Inspected (Read-Only)

| Source | Purpose |
|---|---|
| `artifacts/control-plane/FAM-07L12-LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001.md` | Primary L12 checklist — all input requirements grounded here |
| `artifacts/control-plane/FAM-07L11-CONSENT-RECORDS-ABSENT-AUTHORITY-COEXISTENCE-TEST-001.md` | L11 coexistence test record |
| `server/src/lib/legalPackageAuthority.ts` | Canonical field types, constraints, env-match logic, loader |
| `shared/contracts/openapi.control-plane.json` | `authority_record` diagnostic shape (lines 85–145) |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer (stale — still points to L11; will not be modified) |
| `governance/control/OPEN-SET.md` | FAM-07 posture — PARTIALLY_IMPLEMENTED, FTR-LEGAL-003 MVP_CRITICAL/OPEN |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 LAUNCH_BLOCKER status, L-lane chain provenance |

---

## 4. Current Legal Authority State

These facts are grounded in repo truth and must not be altered by this unit or by
filling in this packet.

| Fact | State |
|---|---|
| Authority file | **ABSENT** |
| `present` | `false` |
| `blocking_reason_code` | `AUTHORITY_FILE_ABSENT` |
| `legal_approved_transition_allowed` | `false` |
| `status` | `null` |
| FAM-07 | **NOT VERIFIED_COMPLETE** |
| FTR-LEGAL-003 | **MVP_CRITICAL / OPEN** |
| HD-001 | **RUNTIME_CONFIRMED_CONFIGURED** |
| L-lane technical foundation | L1–L12 COMPLETE |

---

## 5. Purpose of This Handoff Packet

The TexQtic supplier onboarding consent system is technically complete (L1–L12).
The system correctly detects that no legal package authority record exists and
responds with `legal_approved_transition_allowed: false` at runtime.

**What is blocking supplier consent activation is not a code gap — it is a legal gap.**

Specifically, the following have not yet been supplied:

1. A finalized, counsel-reviewed legal document (the supplier onboarding terms)
2. An approved package version, hash, and source URL for that document
3. Explicit founder authorization (Paresh Patel) to proceed with authority-file creation
4. Re-consent policy decisions affecting existing LEGAL_PENDING tenants
5. Runtime environment configuration decisions

Until these inputs are collected and confirmed, the authority file cannot be created,
and the consent scaffold remains in a safe blocked state by design.

This packet is the vehicle for collecting those inputs.

---

## 6. How to Use This Packet

### For Paresh (Founder/Operator)

1. Review §8 (Founder authorization form) and complete each `[PENDING_FOUNDER_APPROVAL]` field.
2. Review §11 (Re-consent policy) and make the required product policy decisions.
3. Review §12 (Runtime/environment alignment) and decide which environments are authorized.
4. Once §8 is complete, forward §7 (Legal counsel form) to external legal counsel.
5. When all forms are complete, a future unit (FAM-07L14) may be opened to create the authority file.

### For Legal Counsel

1. Complete §7 (Legal counsel input form) with final document details and approval evidence.
2. Complete §10 (Source/version/hash evidence form) once the final document is ready.
3. Do not forward draft document values. The `packageHash` field must reflect the final,
   immutable version of the legal document only.
4. Return the completed forms to Paresh for final authorization and governance recording.

### Important — what completing this packet does NOT do

- Completing this packet does not create the authority file.
- Completing this packet does not activate the consent scaffold.
- Completing this packet is a necessary but not sufficient condition for authority-file creation.
- A separate, explicitly authorized governance unit (FAM-07L14) must be opened by Paresh after
  this packet is reviewed and all gates in §13 are confirmed.

---

## 7. Legal Counsel Input Collection Form

Complete all fields with final, counsel-reviewed values.
Do not supply draft values. Leave `[PENDING_LEGAL_INPUT]` if a field is not yet resolved.

---

### 7.1 Final Legal Document Identity

```
Final legal document title:
  [PENDING_LEGAL_INPUT]

Final document description (brief — one sentence):
  [PENDING_LEGAL_INPUT]

Is this document in final, counsel-reviewed form (not draft)?
  [ ] YES — final text, no further revisions expected
  [ ] NO — still in draft (do not complete remaining fields until final)

Document location / source of truth (immutable path or repository):
  [PENDING_LEGAL_INPUT]

Canonical public-facing source URL (must be stable, publicly accessible, version-locked):
  [PENDING_SOURCE_URL]
  Note: This value will appear as `sourceUrl` in the authority file.
  It must not be a draft or staging URL. It must be the live, permanent URL
  for this specific version of the document.

Agreement type (fixed — do not change):
  SUPPLIER_ONBOARDING_TERMS

Format version (fixed — do not change):
  1

Effective date (ISO 8601 date, e.g. 2026-MM-DD):
  [PENDING_LEGAL_INPUT]

Jurisdiction / geographic scope (if applicable):
  [PENDING_LEGAL_INPUT]
```

---

### 7.2 Legal Approval Identity

```
Name of approving legal counsel or legal owner:
  [PENDING_COUNSEL_APPROVAL]

Role of approving party:
  [PENDING_COUNSEL_APPROVAL]
  Example: External Legal Counsel, General Counsel, Legal Advisor

Date of approval (ISO 8601, e.g. 2026-MM-DD):
  [PENDING_LEGAL_INPUT]

Approval timestamp (ISO 8601 with time, e.g. 2026-MM-DDThh:mm:ssZ):
  [PENDING_LEGAL_INPUT]
  Note: This value will appear as `approvalTimestamp` in the authority file.

Approval evidence reference:
  [PENDING_LEGAL_INPUT]
  Example: email thread ID, letter reference number, DocuSign envelope ID,
           signed approval document artifact ID

Legal counsel reference (internal tracking reference for this counsel engagement):
  [PENDING_LEGAL_INPUT]
  Note: This value will appear as `legalCounselReference` in the authority file.
  Example: TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001 engagement reference.

Feedback recorded in TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001?
  [ ] YES — recorded and retrievable
  [ ] NO — not yet recorded (creation unit may not open until this is YES)
```

---

### 7.3 User-Facing Consent Copy

```
Who owns the user-facing consent prompt text (the text shown to suppliers during onboarding)?
  [PENDING_LEGAL_INPUT]

Has that copy been reviewed and approved by counsel for final use?
  [ ] YES
  [ ] NO

Owner name and role:
  [PENDING_LEGAL_INPUT]
```

---

## 8. Founder / Product Authorization Collection Form

**These authorizations must come from Paresh Patel, Founder/Operator, in explicit written form.**
Prior discussions, design sessions, and council feedback do not constitute authorization.

Each `[PENDING_FOUNDER_APPROVAL]` field must be filled in with a dated, named decision.

---

### 8.1 Core Authorizations

```
Authorization 1 — Create APPROVED_FOR_RUNTIME authority record
  Description: Explicit authorization to create a legal package authority record with
               status=APPROVED_FOR_RUNTIME at path:
               governance/legal/fam-07/supplier-onboarding-terms-authority.json

  Authorized?
    [ ] YES — I, [PENDING_FOUNDER_APPROVAL: name], authorize this action
    [ ] NO — hold pending further review

  Authorizing party name:   [PENDING_FOUNDER_APPROVAL]
  Authorizing party role:   [PENDING_FOUNDER_APPROVAL]
  Authorization date:       [PENDING_FOUNDER_APPROVAL]
  Authorization reference:  [PENDING_DECISION_REFERENCE]
    (e.g. email, governance doc, or artifact ID)

---

Authorization 2 — Open future authority-file creation unit (FAM-07L14)
  Description: Explicit authorization to open the bounded implementation unit that will
               create the authority file (once all legal inputs are confirmed).

  Authorized?
    [ ] YES — I authorize opening FAM-07L14-LEGAL-AUTHORITY-FILE-CREATION-APPROVED-001
    [ ] NO — hold

  Authorizing party name:   [PENDING_FOUNDER_APPROVAL]
  Authorization date:       [PENDING_FOUNDER_APPROVAL]
  Authorization reference:  [PENDING_DECISION_REFERENCE]

---

Authorization 3 — Proceed toward legal-approved transition implementation
  Description: After authority-file creation, a separate future unit will implement
               the runtime behavior for legal_approved_transition_allowed=true.
               This is a separate authorization from L14.

  Authorized?
    [ ] YES — I authorize proceeding toward this after L14 completes
    [ ] NO — hold for further review

  Authorizing party name:   [PENDING_FOUNDER_APPROVAL]
  Authorization date:       [PENDING_FOUNDER_APPROVAL]
  Authorization reference:  [PENDING_DECISION_REFERENCE]
```

---

### 8.2 Rollout Scope

```
Which TexQtic environment(s) is the authority record authorized for?
  [ ] Production only
  [ ] Staging + Production
  [ ] Other: [PENDING_FOUNDER_APPROVAL]

Is the rollout gated by deployment phase, tenant segment, or time window?
  [ ] No gating — immediate on deployment
  [ ] Gated — describe: [PENDING_FOUNDER_APPROVAL]

Who is the named approver for this decision?
  [PENDING_FOUNDER_APPROVAL]

Decision date:
  [PENDING_FOUNDER_APPROVAL]
```

---

## 9. Technical Metadata Confirmation Form

These values are fixed by the technical implementation. They are included here for
cross-reference and confirmation before the authority file is created.

**Do not change these values. They are set by the schema and the loader.**

```
Authority file path (fixed):
  governance/legal/fam-07/supplier-onboarding-terms-authority.json

agreementType (fixed):
  SUPPLIER_ONBOARDING_TERMS

formatVersion (fixed):
  "1"

hashAlgorithm (fixed):
  sha256

Allowed status values:
  DRAFT                  ← authority file exists but not yet approved for use
  APPROVED_FOR_RUNTIME   ← gate-opens consent scaffold (requires env_match=true)
  SUPERSEDED             ← replaced by a newer authority record
  REVOKED                ← authority record withdrawn; reason required

Required status for runtime gate to open:
  APPROVED_FOR_RUNTIME (only — no other status unlocks the gate)

Invalid status values (do not use):
  LEGAL_APPROVED, ACCEPTED_FINAL, ADMIN_REVIEW — these are not valid in this schema

Diagnostic fields exposed by the runtime API (read-only, no sensitive data exposed):
  present                       → boolean
  status                        → string | null
  package_version               → string | null
  source_url                    → string | null
  env_match                     → boolean | null
  legal_approved_transition_allowed → boolean
  blocking_reason_code          → string | null

Current diagnostic state (before authority file is created):
  present = false
  status = null
  package_version = null
  source_url = null
  env_match = null
  legal_approved_transition_allowed = false
  blocking_reason_code = AUTHORITY_FILE_ABSENT
```

---

## 10. Source / Version / Hash Evidence Collection Form

**Important rules for this section:**

- The package hash must be computed over the **final, immutable** legal document artifact.
- Copilot / automated agents must not compute the hash.
- The hash must not be invented or estimated.
- The exact artifact being hashed must be named and agreed upon before hashing begins.
- The hash must be independently verified before being recorded.

```
Package version string (semantic version, max 120 chars):
  [PENDING_VERSION]
  Note: This value will appear as `packageVersion` in the authority file.
  Example format: 1.0.0, 2024-v1, etc. (use whatever versioning scheme is agreed)

Exact artifact being hashed (describe precisely — PDF, HTML, canonical markdown, etc.):
  [PENDING_LEGAL_INPUT]
  Note: This must be the same artifact served at the canonical source URL.
  It must not be a converted or reformatted version unless that version is the canonical one.

Hash algorithm (fixed — do not change):
  sha256

Package content hash (sha256 hex digest, max 256 chars):
  [PENDING_HASH]
  Note: This value will appear as `packageHash` in the authority file.
  Do not fill this in until the final document is ready and the exact artifact is agreed.

Who computed the hash?
  [PENDING_LEGAL_INPUT]
  (Named party or verified toolchain — not Copilot)

When was the hash computed? (ISO 8601):
  [PENDING_LEGAL_INPUT]

Who independently verified the hash?
  [PENDING_LEGAL_INPUT]

Canonical source URL (stable, version-locked, publicly accessible):
  [PENDING_SOURCE_URL]
  Note: This must match the `sourceUrl` field and the `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL`
  environment variable. A staging or draft URL is not acceptable.

Drift detection plan (how will future hash drift be detected if the document changes?):
  [PENDING_LEGAL_INPUT]
  Example: "Source document is stored in a versioned git repository and tagged for each release.
            The tag and hash are verified against the authority file on each deploy."
```

---

## 11. Re-Consent Policy Decision Form

These decisions determine whether existing LEGAL_PENDING tenants/users must re-consent
when the authority package is activated. They drive the `reconsentsRequired` and
`reconsentsReason` fields in the authority file.

```
Must existing LEGAL_PENDING tenants/users re-consent after final authority approval?
  [ ] YES — reconsentsRequired: true
  [ ] NO  — reconsentsRequired: false
  Current decision: [PENDING_FOUNDER_APPROVAL]

If YES — re-consent reason text (will appear as `reconsentsReason` in authority file):
  [PENDING_LEGAL_INPUT]
  Note: Required and must be non-empty if reconsentsRequired=true.
  Example: "Terms updated to reflect final approved version. Prior LEGAL_PENDING consents
            are not valid against the approved package."

What happens to existing LEGAL_PENDING consent snapshots/events at moment of approval?
  [ ] They remain valid under the new authority (no re-consent required)
  [ ] They are invalidated; tenants must re-consent
  [ ] Other: [PENDING_FOUNDER_APPROVAL]

Must an audit event be emitted when authority transitions to APPROVED_FOR_RUNTIME?
  [ ] YES — describe required event: [PENDING_LEGAL_INPUT]
  [ ] NO

Who owns the user-facing consent prompt copy?
  [PENDING_LEGAL_INPUT]
  (Returned to here from §7.3 for reference)

User notification plan (how are tenants notified of terms update, if applicable?):
  [ ] No notification required
  [ ] In-app notification — owner: [PENDING_LEGAL_INPUT]
  [ ] Email notification — owner: [PENDING_LEGAL_INPUT]
  [ ] Other: [PENDING_LEGAL_INPUT]

Rollout gating plan:
  [ ] All tenants simultaneously on deploy date
  [ ] Phased — describe: [PENDING_FOUNDER_APPROVAL]
  [ ] Manual per-tenant activation — describe: [PENDING_FOUNDER_APPROVAL]
```

---

## 12. Runtime / Environment Alignment Decision Form

The authority record must have its three package coordinates align with corresponding
environment variables before `legal_approved_transition_allowed` can become `true`.

**Reference only — do not record actual env values in this artifact or any other artifact.**

```
Env variable names (reference only — do not record values here):
  CONSENT_SCAFFOLD_EXPECTED_VERSION   → must match packageVersion in authority file
  CONSENT_SCAFFOLD_EXPECTED_HASH      → must match packageHash in authority file
  CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL → must match sourceUrl in authority file

Which environments are authorized to have legal_approved_transition_allowed=true?
  [ ] Production only
  [ ] Staging + Production
  [ ] Other: [PENDING_FOUNDER_APPROVAL]

Deploy / apply ordering decision:
  Should env variables be set before or after the authority file is committed?
    [ ] Env vars first, then authority file committed
    [ ] Authority file committed first (gate stays closed until env vars are set)
    [ ] Simultaneously in same deploy
    [ ] Decision: [PENDING_FOUNDER_APPROVAL]

Rollback / supersession plan:
  If the authority record must be revoked or superseded after deployment, who authorizes?
    [PENDING_FOUNDER_APPROVAL]
  What is the process?
    [ ] Create a new authority record with status=SUPERSEDED referencing the old one
    [ ] Revoke with revokedAt + revokedReason and deploy a replacement
    [ ] Other: [PENDING_LEGAL_INPUT]

Confirmation: env variable values must NOT be printed, logged, echoed, or recorded in
any artifact, governance document, terminal session, or commit message.
  [ ] Confirmed (required before env variables are set)
```

---

## 13. Completion Checklist Before Any Authority-File Creation Unit (FAM-07L14)

All of the following must be confirmed before FAM-07L14 may be opened.
This checklist must be reviewed by Paresh before any creation unit is initiated.

### Legal / Counsel Gate
- [ ] Final legal document is complete, final, and counsel-reviewed (not draft)
- [ ] Legal counsel has provided written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`
- [ ] Counsel feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
- [ ] §7 (Legal counsel input collection form) is complete — all `[PENDING_LEGAL_INPUT]` filled
- [ ] §7.1 canonical source URL is finalized and immutable (not draft/staging)
- [ ] §7.2 approval identity is complete (approvedBy, approvedByRole, approvalTimestamp, approvalEvidence, legalCounselReference)
- [ ] User-facing consent copy is approved (§7.3)

### Founder / Product Gate
- [ ] Authorization 1 (§8.1) is complete — APPROVED_FOR_RUNTIME record authorized
- [ ] Authorization 2 (§8.1) is complete — FAM-07L14 unit opening authorized
- [ ] §8.2 rollout scope decision is complete
- [ ] §11 re-consent policy decisions are complete
- [ ] §12 deploy ordering and rollback plan are complete

### Technical Gate
- [ ] Package version is finalized (§10)
- [ ] Package hash is computed over the final document artifact (§10) — not by Copilot
- [ ] Hash is independently verified (§10)
- [ ] All field length constraints are satisfied:
  - `packageVersion` ≤ 120 chars
  - `packageHash` ≤ 256 chars
  - `sourceUrl` ≤ 1024 chars

### Runtime / Env Gate
- [ ] All three env coordinate names are confirmed (§12 — values NOT recorded here)
- [ ] Deploy ordering is decided (§12)
- [ ] Rollback / supersession plan is confirmed (§12)

### Governance Gate
- [ ] No governance tracker (NEXT-ACTION, OPEN-SET, LAUNCH-FAMILY-INDEX) contains a stale
  pointer that misrepresents the current L-lane state before L14 opens
  (Note: as of L13, NEXT-ACTION.md and OPEN-SET.md still point to L11 — this must be
  resolved in a dedicated tracker sync unit before or alongside L14)

---

## 14. What This Packet Does Not Authorize

Completing or submitting this packet does **not**:

- Create the authority file at `governance/legal/fam-07/supplier-onboarding-terms-authority.json`
- Activate `legal_approved_transition_allowed=true` at runtime
- Authorize any commit to the `governance/legal/fam-07/` directory
- Open FAM-07L14 — that requires Paresh's explicit Authorization 2 (§8.1)
- Change FAM-07 status to VERIFIED_COMPLETE
- Close FTR-LEGAL-003
- Change HD-001 status
- Constitute final legal approval by any party
- Supersede or replace the hold condition documented in `governance/control/NEXT-ACTION.md`
  (`prior_next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK`)

---

## 15. Proposed Future Sequence After Packet Completion

Once this packet is fully completed and Paresh has confirmed all §13 gates:

```
Step 1 — Governance tracker sync (optional bounded unit)
  If NEXT-ACTION.md and OPEN-SET.md stale state is a concern:
  FAM-07L13B-LEGAL-AUTHORITY-TRACKER-STALENESS-SYNC-001
  (Only if Paresh authorizes; may be deferred to coincide with L14 prep)

Step 2 — Authority file creation unit
  FAM-07L14-LEGAL-AUTHORITY-FILE-CREATION-APPROVED-001
  (Requires: §13 checklist complete + Paresh Authorization 2 issued)

Step 3 — Legal-approved transition implementation unit
  FAM-07L15-LEGAL-APPROVED-TRANSITION-IMPLEMENTATION-001
  (Separate authorization required — Authorization 3 from §8.1)
  (Only after L14 artifact is verified and runtime confirms present=true)

Step 4 — FAM-07 closure verification
  FAM-07-VERIFY-CLOSE-001 (or equivalent)
  Only after L15 is verified and FTR-LEGAL-003 conditions are met
```

**Important:** The above sequence is a planning outline only.
Each step requires a separate, explicitly authorized unit.
No future unit may be opened without Paresh's written authorization.

---

## 16. Status Preservation Statement

These statuses are confirmed unchanged after this unit and must remain so:

| Status | Value |
|---|---|
| FAM-07 | **NOT VERIFIED_COMPLETE** |
| FTR-LEGAL-003 | **MVP_CRITICAL / OPEN** |
| HD-001 | **RUNTIME_CONFIRMED_CONFIGURED** |
| Authority file | **ABSENT** |
| `present` | `false` |
| `blocking_reason_code` | `AUTHORITY_FILE_ABSENT` |
| `legal_approved_transition_allowed` | `false` |

---

## 17. Risks / Follow-up

| Risk | Description | Mitigation |
|---|---|---|
| Tracker staleness | NEXT-ACTION.md and OPEN-SET.md still point to L11 as next candidate; L11, L12, L13 are now complete | Resolve with a bounded tracker sync before or alongside FAM-07L14 |
| Schema drift | If `legalPackageAuthority.ts` is updated after this packet is completed, field constraints may change | Re-inspect `legalPackageAuthority.ts` before opening L14 regardless of this packet's completion state |
| Hash drift | If source document is revised after hash computation, the recorded hash will be stale | Use a versioned, immutable artifact; record the tag/version alongside the hash |
| Draft URL in sourceUrl | If a staging or draft URL is recorded and later changes, env_match will fail in production | Confirm the source URL is the final, permanent, public URL before recording |
| Re-consent ripple | If `reconsentsRequired=true`, existing LEGAL_PENDING tenants must re-consent; this may affect active pilot tenants | Decide §11 before L14 — not after |
| Packet used as approval | Risk that this packet being "complete" is treated as authorization to proceed | §14 explicitly states this packet does not authorize L14; Paresh must issue Authorization 2 separately |
| Counsel feedback hold not lifted | The HOLD_FOR_COUNSEL_FEEDBACK condition in NEXT-ACTION.md (prior_next_candidate_unit) remains the governing hold condition | This hold must be formally resolved before L14; it cannot be resolved by this packet alone |

---

## 18. Final Enum

```
FAM_07L13_LEGAL_AUTHORITY_HANDOFF_PACKET_COMPLETE
```
