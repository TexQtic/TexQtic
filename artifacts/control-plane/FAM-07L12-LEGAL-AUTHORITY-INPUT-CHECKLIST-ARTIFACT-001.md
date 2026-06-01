# FAM-07L12 — LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001

**Unit ID:** FAM-07L12-LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001
**Unit Type:** Bounded Planning Artifact — Input Checklist Only
**Status:** VERIFIED_COMPLETE
**Closed:** 2026-06-01
**Branch:** main
**Depends on:** FAM-07L11-CONSENT-RECORDS-ABSENT-AUTHORITY-COEXISTENCE-TEST-001 (180387ce)
**Next Recommended Unit:** FAM-07L13-LEGAL-AUTHORITY-PENDING-INPUTS-HANDOFF-PACKET-001

---

## 1. Unit Summary

This artifact defines the complete set of legal, product, technical, and runtime inputs that
must be present and verified before any future unit may open an authority-file creation task for:

```
governance/legal/fam-07/supplier-onboarding-terms-authority.json
```

This unit does **not** create, approve, simulate, or advance any legal authority record.
It is a planning and handoff preparation artifact only.

All inputs defined herein are `PENDING_*` placeholders. No values are invented.
No legal package is synthesized. No authority record is written.

---

## 2. Preflight Evidence

```
git status --short            → (clean — no output)
git rev-parse --short HEAD    → 180387ce
ancestry(180387ce ∈ HEAD)     → 0 (TRUE — L11 commit in ancestry)

artifacts/control-plane/FAM-07L11-*.md   → True (exists)
artifacts/control-plane/FAM-07L10-*.md   → True (exists)
governance/legal/fam-07/                 → False (directory absent)
governance/legal/fam-07/supplier-onboarding-terms-authority.json → False (absent)
```

Legal gate confirmed absent. No unexpected authority file found. Proceeding to artifact creation.

---

## 3. Repo-Truth Sources Inspected (Read-Only)

| Source | Purpose |
|---|---|
| `server/src/lib/legalPackageAuthority.ts` | Canonical type definitions, field constraints, loader, validator, env-match checker, diagnostic builder |
| `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` | 18-test suite grounding expected record shape and validation paths |
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Route-level consent scaffold observability shape including L11 coexistence test |
| `shared/contracts/openapi.control-plane.json` | `consent_scaffold_observability.authority_record` OpenAPI diagnostic schema |
| `artifacts/control-plane/FAM-07L8-*` | OpenAPI sync record (L8) |
| `artifacts/control-plane/FAM-07L9-*` | Next-action selection record (L9) |
| `artifacts/control-plane/FAM-07L10-*` | Governance tracker sync record (L10) |
| `artifacts/control-plane/FAM-07L11-*` | Coexistence test record (L11) |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer — confirms L10 as last active unit, L11 as next candidate |
| `governance/control/OPEN-SET.md` | FAM-07 posture — PARTIALLY_IMPLEMENTED, FTR-LEGAL-003 MVP_CRITICAL/OPEN, HD-001 RUNTIME_CONFIRMED_CONFIGURED |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 launch blocker status, L-lane chain provenance, FTR-LEGAL-003/HD-001 preservation |

---

## 4. Current Legal Authority State

These facts are grounded in repo truth and must not be altered by this unit.

| Fact | State |
|---|---|
| Authority file path | `governance/legal/fam-07/supplier-onboarding-terms-authority.json` |
| Authority file exists | **NO** |
| `present` | `false` |
| `blocking_reason_code` | `AUTHORITY_FILE_ABSENT` |
| `legal_approved_transition_allowed` | `false` |
| `status` | `null` |
| FAM-07 | **NOT VERIFIED_COMPLETE** |
| FTR-LEGAL-003 | **MVP_CRITICAL / OPEN** |
| HD-001 | **RUNTIME_CONFIRMED_CONFIGURED** |
| L-lane technical foundation | L1–L11 COMPLETE (loader, validator, tests, route shape, OpenAPI, coexistence coverage) |
| Legal gate status | **BLOCKED — awaiting legal package authority inputs** |

---

## 5. Required Legal Package Inputs

These inputs must be supplied by external legal counsel and/or the founder/product owner.
All values are `PENDING_*` until explicitly provided and recorded.

### 5.1 Final Legal Document

| Input | Status | Notes |
|---|---|---|
| Final legal document title | `PENDING_LEGAL_INPUT` | Must be the final, counsel-reviewed title of the supplier onboarding terms |
| Final legal document location | `PENDING_LEGAL_INPUT` | Immutable source path or repository location; not a draft location |
| Canonical public-facing source URL | `PENDING_SOURCE_URL` | The URL that will appear in `sourceUrl` field of the authority file; must be stable, publicly accessible, and immutable for the given version |
| Agreement type identifier | `SUPPLIER_ONBOARDING_TERMS` | **Fixed value.** Confirmed from `legalPackageAuthority.ts`. Do not change. |
| Format version | `1` | **Fixed value.** Confirmed from `legalPackageAuthority.ts`. Do not change. |

### 5.2 Package Identity

| Input | Field in authority file | Max length (from schema) | Status |
|---|---|---|---|
| Package version string | `packageVersion` | 120 chars | `PENDING_VERSION` |
| Package content hash | `packageHash` | 256 chars | `PENDING_HASH` |
| Hash algorithm | `hashAlgorithm` | — (fixed: `sha256`) | `sha256` — **Fixed** |
| Effective date | `effectiveDate` | — | `PENDING_LEGAL_INPUT` |
| Jurisdiction / scope | — (narrative context) | — | `PENDING_LEGAL_INPUT` (if applicable) |

### 5.3 Approval Identity

| Input | Field in authority file | Status |
|---|---|---|
| Approving party name | `approvedBy` | `PENDING_LEGAL_INPUT` |
| Approving party role | `approvedByRole` | `PENDING_LEGAL_INPUT` |
| Approval evidence reference | `approvalEvidence` | `PENDING_LEGAL_INPUT` (document ref, email thread ID, or artifact ID) |
| Approval timestamp (ISO 8601) | `approvalTimestamp` | `PENDING_LEGAL_INPUT` |
| Legal counsel reference | `legalCounselReference` | `PENDING_LEGAL_INPUT` (e.g. counsel packet reference) |

### 5.4 Governance Identifiers

| Input | Field in authority file | Status |
|---|---|---|
| Unit ID for the creation unit | `unitId` | Will be determined when a future creation unit is opened |
| Artifact version | `artifactVersion` | Will be `1.0.0` for first issuance |

---

## 6. Required Product / Founder Approval Inputs

These inputs must come from Paresh Patel (founder/operator) as explicit written authorization.
Prior discussion, informal notes, and counsel feedback do **not** constitute approval.

| Input | Status | Notes |
|---|---|---|
| Explicit founder authorization to create an `APPROVED_FOR_RUNTIME` authority record | `PENDING_FOUNDER_APPROVAL` | Must be a dated, named, written approval — not implied by prior work |
| Explicit authorization to open a future legal-authority creation unit | `PENDING_FOUNDER_APPROVAL` | The creation unit must not be opened without this |
| Explicit authorization to proceed toward future legal-approved transition implementation | `PENDING_FOUNDER_APPROVAL` | This is the step after authority-file creation; requires separate authorization |
| Named approver | `PENDING_FOUNDER_APPROVAL` | Expected: Paresh Patel, Founder/Operator |
| Approval date | `PENDING_FOUNDER_APPROVAL` | Must be an explicit, recorded date |
| Approval artifact or decision reference | `PENDING_FOUNDER_APPROVAL` | A traceable artifact ID, email, or governance decision document |

---

## 7. Required Technical Metadata

Grounded in `legalPackageAuthority.ts` (read-only). These are the technical constraints that
the authority file **must** satisfy to pass the loader/validator without error.

### 7.1 Authority File Path

```
governance/legal/fam-07/supplier-onboarding-terms-authority.json
```

This path is hardcoded in `AUTHORITY_RECORD_RELATIVE_PATH` (legalPackageAuthority.ts line 22).
Do not change the path without a new technical foundation unit.

### 7.2 Required Fields (from LegalPackageAuthorityRecord interface)

All the following fields must be present, non-empty strings unless noted:

| Field | Type | Constraint |
|---|---|---|
| `unitId` | string | Non-empty |
| `artifactVersion` | string | Non-empty |
| `agreementType` | string | Must be exactly `SUPPLIER_ONBOARDING_TERMS` |
| `packageVersion` | string | Non-empty; max 120 chars |
| `packageHash` | string | Non-empty; max 256 chars |
| `hashAlgorithm` | string | Must be exactly `sha256` |
| `sourceUrl` | string | Non-empty; max 1024 chars |
| `effectiveDate` | string | Non-empty |
| `status` | string | Must be one of: `DRAFT`, `APPROVED_FOR_RUNTIME`, `SUPERSEDED`, `REVOKED` |
| `approvedBy` | string | Non-empty |
| `approvedByRole` | string | Non-empty |
| `approvalEvidence` | string | Non-empty |
| `approvalTimestamp` | string | Non-empty |
| `legalCounselReference` | string | Non-empty |
| `reconsentsRequired` | boolean | Required; must be `true` or `false` |
| `reconsentsReason` | string \| null | Required if `reconsentsRequired=true`; may be null otherwise |
| `supersededBy` | string \| null | May be null; key must be present |
| `revokedAt` | string \| null | May be null; key must be present |
| `revokedReason` | string \| null | Required non-empty if `revokedAt` is set; may be null otherwise |
| `formatVersion` | string | Must be exactly `"1"` |

### 7.3 Required Status for Legal Approval Gate

For `legal_approved_transition_allowed` to become `true`, all three of the following must hold:

1. `status === "APPROVED_FOR_RUNTIME"` (not DRAFT, SUPERSEDED, or REVOKED)
2. `env_match === true` (runtime env coordinates match authority record)
3. Authority file present, parseable, and structurally valid

No other status value unlocks the gate. `LEGAL_APPROVED`, `ACCEPTED_FINAL`, and `ADMIN_REVIEW`
are **not valid status values** and must not be introduced.

### 7.4 Runtime Diagnostic Fields (from OpenAPI contract)

When the authority file is present and valid, the `authority_record` diagnostic will expose:

| Field | Present-and-approved value | Current (absent) value |
|---|---|---|
| `present` | `true` | `false` |
| `status` | `"APPROVED_FOR_RUNTIME"` | `null` |
| `package_version` | `<packageVersion>` | `null` |
| `source_url` | `<sourceUrl>` | `null` |
| `env_match` | `true` (after env alignment) | `null` |
| `legal_approved_transition_allowed` | `true` | `false` |
| `blocking_reason_code` | `null` | `"AUTHORITY_FILE_ABSENT"` |

---

## 8. Required Source / Hash / Version Evidence

This section defines the evidence that must be produced and verified before the package hash
is recorded in the authority file.

| Evidence Item | Status | Notes |
|---|---|---|
| Canonical source URL (stable, immutable for version) | `PENDING_SOURCE_URL` | Must be the final URL used in `sourceUrl` field |
| Package version string | `PENDING_VERSION` | Semantic version; must match `packageVersion` field |
| Content hash (sha256) | `PENDING_HASH` | Computed over the exact document artifact being hashed |
| Hash algorithm confirmation | `sha256` — Fixed | Confirmed from `legalPackageAuthority.ts`; no other algorithm is accepted |
| Exact artifact being hashed | `PENDING_LEGAL_INPUT` | Must be defined: is it the PDF, the HTML, the raw markdown, or a canonical canonical text artifact? |
| Who computed the hash | `PENDING_LEGAL_INPUT` | Named party or toolchain |
| When the hash was computed | `PENDING_LEGAL_INPUT` | ISO 8601 timestamp |
| Reproducibility / drift detection plan | `PENDING_LEGAL_INPUT` | How will future drift be detected if the source document changes? |

**Important:** The hash must not be computed by Copilot and must not be invented.
It must be derived from the actual final legal document artifact by a human party
or a verified toolchain, and independently confirmed before being recorded.

---

## 9. Required Re-Consent Policy Inputs

The following policy decisions must be made explicitly before authority-file creation can proceed.
These affect whether existing `LEGAL_PENDING` consent records require re-consent after final
legal package approval.

| Decision Required | Status | Notes |
|---|---|---|
| Must existing LEGAL_PENDING tenants/users re-consent after final approval? | `PENDING_FOUNDER_APPROVAL` | Policy decision by Paresh/product/legal |
| Must existing accepted consent snapshots be invalidated? | `PENDING_FOUNDER_APPROVAL` | Affects `reconsentsRequired` field |
| If re-consent required: what is the `reconsentsReason` text? | `PENDING_LEGAL_INPUT` | Drives `reconsentsReason` field; must be non-empty if `reconsentsRequired=true` |
| Transition rules for old consent snapshots / events | `PENDING_FOUNDER_APPROVAL` | What happens to records in `LEGAL_PENDING` state at the moment of authority approval? |
| Audit and event recording requirements | `PENDING_LEGAL_INPUT` | What events must be emitted when authority transitions to approved? |
| User-facing copy owner | `PENDING_LEGAL_INPUT` | Who owns and approves the user-facing consent prompt text? |
| Rollout gating plan | `PENDING_FOUNDER_APPROVAL` | Is the transition gated by deployment phase, tenant segment, or time? |
| User notification plan | `PENDING_LEGAL_INPUT` | Are users notified of terms update? By whom? Via what channel? |

---

## 10. Required Environment / Runtime Alignment Inputs

The env-match check in `legalPackageAuthority.ts` (`checkAuthorityEnvMatch`) validates three
environment variables against the authority record at runtime:

| Env Variable | Purpose | Status |
|---|---|---|
| `CONSENT_SCAFFOLD_EXPECTED_VERSION` | Must match `packageVersion` in authority file | `PENDING_VERSION` — must be set after package version is confirmed |
| `CONSENT_SCAFFOLD_EXPECTED_HASH` | Must match `packageHash` in authority file | `PENDING_HASH` — must be set after hash is computed |
| `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL` | Must match `sourceUrl` in authority file | `PENDING_SOURCE_URL` — must be set after source URL is confirmed |

Additional runtime alignment inputs:

| Input | Status | Notes |
|---|---|---|
| Environment names where approval is valid | `PENDING_FOUNDER_APPROVAL` | Which environments (e.g. production, staging) are authorized to enable `legal_approved_transition_allowed=true`? |
| Deploy/apply ordering | `PENDING_FOUNDER_APPROVAL` | Should env variables be set before or after authority file is committed? |
| Rollback / supersession plan | `PENDING_LEGAL_INPUT` | What is the plan if the authority record must be superseded or revoked after deployment? Who authorizes that? |

**Security reminder:** Env variable values must not be printed, logged, or echoed in any
Copilot output, terminal command, or governance artifact at any time.

---

## 11. Required Future Validation Before Authority-File Creation

Before a future authority-file creation unit may be opened, all of the following must be
confirmed present and recorded:

### Legal / Counsel Gate
- [ ] Final legal document text is complete and counsel-reviewed (not in draft)
- [ ] Counsel has provided written feedback on `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md`
- [ ] Counsel feedback has been recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
- [ ] All legal package field values (§5 above) are known and confirmed

### Founder / Product Gate
- [ ] Paresh has issued explicit written authorization to create an `APPROVED_FOR_RUNTIME` record
- [ ] All product/founder approval inputs (§6 above) are confirmed
- [ ] Re-consent policy decisions (§9 above) are resolved and recorded

### Technical Gate
- [ ] Package hash has been computed over the final document artifact and independently verified
- [ ] Package version, hash, and source URL are finalized and immutable
- [ ] `formatVersion: "1"` and `hashAlgorithm: "sha256"` are confirmed correct
- [ ] All field length constraints (§7.2 above) are satisfied before file creation
- [ ] Future authority-file creation unit has been opened with an explicit allowlist

### Runtime / Env Gate
- [ ] All three env coordinates (`CONSENT_SCAFFOLD_EXPECTED_VERSION`, `_HASH`, `_SOURCE_URL`) are confirmed for target environments
- [ ] Deploy ordering has been decided and documented
- [ ] Rollback / supersession plan has been decided

### Governance Gate
- [ ] No current governance tracker (NEXT-ACTION, OPEN-SET, LAUNCH-FAMILY-INDEX) points to a
  stale or incorrect posture before creation unit opens
- [ ] FAM-07 status explicitly remains NOT VERIFIED_COMPLETE until legal-final verification is
  complete in a separate future unit after authority-file creation

---

## 12. Proposed Future Authority-File Creation Unit Title

When all inputs in §11 are confirmed, the following unit title is proposed:

```
FAM-07L14-LEGAL-AUTHORITY-FILE-CREATION-APPROVED-001
```

(L13 is the human-facing handoff packet; L14 would be the creation unit, contingent on
all gates in §11 being closed. Unit numbering may shift if intervening units are inserted.)

**This unit must not be opened until:**
- All §5–§10 inputs are present and explicitly authorized
- §11 checklist is fully cleared and recorded
- A separate unit or decision artifact explicitly authorizes the creation

---

## 13. Explicit Non-Authority Statement

This artifact does **not**:

- Create or simulate a legal authority record
- Approve any legal package text or version
- Claim `LEGAL_APPROVED` status for any consent record
- Emit or reference `ACCEPTED_FINAL` events
- Implement or activate `ADMIN_REVIEW` as a live status
- Compute or propose any hash value for any legal document
- Confirm any source URL as final
- Set or read any environment variable
- Modify any runtime source file, route, test, schema, migration, or governance tracker
- Advance FAM-07 toward `VERIFIED_COMPLETE`
- Close FTR-LEGAL-003
- Advance HD-001 beyond `RUNTIME_CONFIRMED_CONFIGURED`

---

## 14. Forbidden Assumptions

The following must never be assumed by any future unit reading this artifact:

- That prior counsel discussions or informal alignment constitute formal legal approval
- That L12's existence implies L14 (creation unit) may be opened without §11 gate closure
- That the checklist items have been resolved because they are listed here
- That hash computation can be delegated to Copilot or any automated agent
- That the authority record schema can be changed from `formatVersion: "1"` without a new
  technical foundation unit
- That `LEGAL_APPROVED`, `ACCEPTED_FINAL`, or `ADMIN_REVIEW` are valid status transitions
  in the current schema
- That env variable values may be shared, printed, or echoed in any artifact or command

---

## 15. Status Preservation Statement

The following statuses are confirmed unchanged and must remain so after this unit:

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

## 16. Risks / Follow-up

| Risk | Mitigation |
|---|---|
| Checklist items become stale if `legalPackageAuthority.ts` schema evolves | Re-inspect `legalPackageAuthority.ts` before opening any creation unit |
| Env variable names in §10 could change if a future technical unit renames them | Re-read `checkAuthorityEnvMatch` in `legalPackageAuthority.ts` before env setup |
| `reconsentsRequired` policy may force re-consent of all existing LEGAL_PENDING tenants | Resolve re-consent policy (§9) before committing to a rollout timeline |
| Hash drift if source document is edited after hash is computed | Use an immutable artifact (versioned, tagged) as the hash source; do not hash a mutable draft |
| Opening creation unit before §11 gates are closed | §12 unit title proposal explicitly states no creation unit may open without §11 clearance |

---

## 17. Final Enum

```
FAM_07L12_LEGAL_AUTHORITY_INPUT_CHECKLIST_COMPLETE
```
