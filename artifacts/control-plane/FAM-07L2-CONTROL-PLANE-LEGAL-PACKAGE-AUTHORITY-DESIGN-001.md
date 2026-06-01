# FAM-07L2-CONTROL-PLANE-LEGAL-PACKAGE-AUTHORITY-DESIGN-001

## Section 1 — Unit Identity and Mode

| Field | Value |
|---|---|
| Unit ID | FAM-07L2-CONTROL-PLANE-LEGAL-PACKAGE-AUTHORITY-DESIGN-001 |
| Family | FAM-07 — Tenant Onboarding and Invite |
| Lane | L (Legal Gate Continuation) |
| Unit | L2 — Legal Package Authority Design |
| Mode | TECS Safe Design / Legal Package Authority Specification |
| Objective | Design the committed legal package authority model required to unblock FTR-LEGAL-003, without implementing code, changing schema, mutating runtime, or closing the legal gate |
| Execution Date | 2026-06-01 |
| Authorized By | Paresh Patel (founder/operator) |
| Predecessor | FAM-07L1-CONTROL-PLANE-LEGAL-GATE-NEXT-ACTION-DESIGN-001 (`f163bacb`) |

---

## Section 2 — Branch and HEAD

| Field | Value |
|---|---|
| Branch | `main` |
| HEAD commit | `f163bacb` (L1 artifact commit) |
| HEAD summary | `docs(control-plane): FAM-07L1 legal gate next-action design artifact` |

---

## Section 3 — Preflight Results

| Check | Command | Result |
|---|---|---|
| Working tree clean | `git status --short` | No output — clean tree ✅ |
| Current HEAD | `git rev-parse --short HEAD` | `f163bacb` ✅ |
| L1 commit ancestry | `git merge-base --is-ancestor f163bacb HEAD` | exit code 0 — PASS ✅ |
| K14 commit ancestry | `git merge-base --is-ancestor 4c8c40cc HEAD` | exit code 0 — PASS ✅ |
| K8 hardening ancestry | `git merge-base --is-ancestor 970f235d HEAD` | exit code 0 — PASS ✅ |

**Preflight verdict: PASS — clean tree, L1 at HEAD confirmed, K14 and K8 lineage confirmed. No source changes pending.**

---

## Section 4 — L1 / K14 / K8 Lineage Confirmation

| Unit | Commit | Status |
|---|---|---|
| K8 — ErrorBoundary hardening/test | `970f235d` | ✅ confirmed ancestor |
| K14 — Minimal hub sync | `4c8c40cc` | ✅ confirmed ancestor |
| L1 — Legal gate next-action design | `f163bacb` | ✅ confirmed HEAD |

All K-lane stabilization (K8–K14) and L1 design artifacts are present in the commit ancestry. No divergence. This unit (L2) builds on L1 directly.

---

## Section 5 — Repo-Truth Basis

This section records the confirmed current state of legal/consent surfaces in the repository, as the factual basis for this design. All items were confirmed read-only during this unit.

### 5.1 — L1 Gap Labels (Carried Forward, Unchanged)

| Label | Status |
|---|---|
| `MISSING_FINAL_LEGAL_PACKAGE_AUTHORITY` | OPEN — no committed authority record exists |
| `MISSING_VERSION_HASH_SOURCE_ACTOR_PROOF` | OPEN — no committed attribution record |
| `MISSING_APPROVAL_STATE_TRANSITION_DESIGN` | OPEN — no LEGAL_APPROVED write path |
| `MISSING_RECONSENT_POLICY` | OPEN — RECONSENT_REQUIRED/COMPLETED defined but unimplemented |
| `MISSING_RUNTIME_VERIFICATION` | OPEN — has_legal_approved_record has never been true |
| `MISSING_TEST_COVERAGE` | OPEN — no tests for LEGAL_APPROVED, ACCEPTED_FINAL, ADMIN_REVIEW |

### 5.2 — Runtime Policy Intake (confirmed from `server/src/routes/tenant.ts`)

`getConsentPolicyExpectation()` reads three env vars and normalizes them:

```typescript
CONSENT_SCAFFOLD_EXPECTED_VERSION   → agreementVersion
CONSENT_SCAFFOLD_EXPECTED_HASH      → agreementHash
CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL → agreementSourceUrl
```

These values are used in `validateConsentForActivation()` to reject intake submissions whose version/hash/sourceUrl do not match the expected policy. This is a runtime input-validation gate, not a committed legal authority record. The distinction is critical and is the root of `MISSING_FINAL_LEGAL_PACKAGE_AUTHORITY`.

### 5.3 — Production Write Path (confirmed from `server/src/routes/tenant.ts`)

`recordLegalPendingConsentScaffold()` is the only legal consent write path. It writes:
- `LegalConsentSnapshot.legalStatus = 'LEGAL_PENDING'`
- `LegalConsentEvent.eventType = 'ACCEPTED_PENDING'`
- `LegalConsentEvent.legalStatus = 'LEGAL_PENDING'`

No function exists anywhere in the codebase that writes `LEGAL_APPROVED`, `ACCEPTED_FINAL`, `ADMIN_REVIEW`, `SUPERSEDED`, `RECONSENT_REQUIRED`, `RECONSENT_COMPLETED`, or `GATE_REJECTED`.

### 5.4 — Control-Plane Read Surface (confirmed from `server/src/routes/control.ts`)

`hasLegalApprovedRecord` is a read-only derived boolean:
```
latestConsentSnapshot?.legalStatus === 'LEGAL_APPROVED'
|| consentEvents.some(e => e.legalStatus === 'LEGAL_APPROVED')
```
Surfaced in `consent_scaffold_observability.has_legal_approved_record`. Always `false` in production. No write trigger or action button exists in the control-plane surface.

### 5.5 — Existing Governance Legal Directory

`governance/legal/` exists and contains:
- `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` — TTP/NC-TTP external legal counsel review packet
- `TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` — TTP operator decision guide

This confirms `governance/legal/` is the established repo convention for legal governance artifacts. The FAM-07 supplier onboarding authority record should follow the same directory convention, under a subdirectory for organizational clarity.

---

## Section 6 — Authority Record Purpose

### 6.1 — What the Authority Record Is

The authority record is a committed, version-controlled governance artifact that makes the following binding statement:

> "This exact legal package is the final approved supplier onboarding terms of service for agreement type `<type>`, version `<version>`, identified by document hash `<hash>` at source URL `<source_url>`, approved by actor `<actor_ref>` of type `<actor_type>` on `<approval_timestamp>`, under approval basis `<approval_basis>`, referenced by approval evidence `<evidence_ref>`."

It is a **repo-committed record of a human/legal decision** — not a code artifact, not a migration, not runtime configuration.

### 6.2 — Why It Is Different From Runtime Env Vars

| Dimension | Runtime Env Vars | Committed Authority Record |
|---|---|---|
| Location | Deployment environment (Vercel/Supabase env) | `governance/legal/fam-07/` (git-committed) |
| Purpose | Input-validation gate: reject intake that doesn't match current policy coordinates | Governance statement: declare which package is the approved final authority |
| Mutability | Can change without a git commit | Requires a git commit, review, and audit trail |
| Audit trail | No — env var history is not tracked in git | Yes — git history records when, by whom, and what changed |
| Legal function | Operational constraint enforcement | Approval record and attribution proof |
| Scope | Runtime behavior of `validateConsentForActivation()` | Governs which package is eligible for `LEGAL_APPROVED` transition |
| Required for LEGAL_APPROVED | No — env vars alone are not sufficient | **Yes** — a committed authority record is a prerequisite for `LEGAL_APPROVED` transition |

### 6.3 — The Two-Tier Model

The design establishes a **two-tier model**:

**Tier 1 — Committed Authority Record** (`governance/legal/fam-07/`)  
The governance artifact that formally declares the approved final legal package. This is the legal-truth record.

**Tier 2 — Runtime Env Policy Coordinates** (`CONSENT_SCAFFOLD_EXPECTED_*`)  
The operational configuration that enforces intake validation at runtime. These values must be derived from and match the committed authority record when the approval transition is performed.

Neither tier alone is sufficient. The authority record without matching env vars means intake is not being validated against the approved package. Env vars without an authority record mean intake is being validated against an informally defined package with no committed approval attribution.

---

## Section 7 — Proposed Authority Record Shape

The authority record is a structured JSON document committed to the repository. The following fields are the minimum required definition.

### 7.1 — Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `authority_id` | string (UUID or slug) | ✅ | Unique stable identifier for this authority record. Used for cross-referencing and supersession. Example: `"fam07-tos-001"` |
| `agreement_type` | string (enum) | ✅ | The `LegalConsentAgreementType` value this record governs. Must be one of: `PLATFORM_TERMS`, `SUPPLIER_ONBOARDING_TERMS`, `PRIVACY_NOTICE_ACK`. For FAM-07 onboarding: `SUPPLIER_ONBOARDING_TERMS`. |
| `package_name` | string | ✅ | Human-readable name of the legal document. Example: `"TexQtic Supplier Onboarding Terms of Service"` |
| `package_version` | string (max 120 chars) | ✅ | Version string of the legal document. Must match `CONSENT_SCAFFOLD_EXPECTED_VERSION` when this record is `APPROVED_FOR_RUNTIME`. Example: `"v1.0.0"` |
| `package_hash` | string (max 256 chars) | ✅ | Cryptographic hash of the canonical document content. Must match `CONSENT_SCAFFOLD_EXPECTED_HASH`. Hash must be computed over a stable canonical form of the document (e.g., UTF-8 bytes of the canonical text/PDF content). |
| `hash_algorithm` | string | ✅ | The algorithm used to compute `package_hash`. Required for verification and future algorithm migration. Example: `"SHA-256"` |
| `source_url` | string (max 1024 chars) | ✅ | Publicly accessible URL where the canonical document can be retrieved and verified. Must match `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL`. Example: `"https://texqtic.com/legal/supplier-onboarding-terms/v1.0.0"` |
| `source_document_location` | string | ✅ | Repo-relative or absolute path to the local copy of the document text, if stored in the repository. If not stored in repo, must be an external reference (e.g., cloud storage, document system). Example: `"governance/legal/fam-07/supplier-onboarding-terms-v1.0.0.md"` or `"external:https://..."` |
| `approved_by_actor_type` | string (enum) | ✅ | Category of approving actor. Allowed values: `FOUNDER_OPERATOR`, `EXTERNAL_LEGAL_COUNSEL`, `COMBINED_FOUNDER_COUNSEL`. See Section 10 for actor proof model. |
| `approved_by_actor_ref` | string | ✅ | Identifier for the approving actor. For founder: full name and role. For counsel: firm and lawyer reference (no personal PII beyond professional attribution). Example: `"Paresh Patel — Founder/Operator, TexQtic"` |
| `approval_timestamp` | ISO 8601 datetime | ✅ | When the approval decision was made. Example: `"2026-06-15T00:00:00Z"` |
| `approval_basis` | string | ✅ | A statement of the basis for approval. Options: `"FOUNDER_REVIEW_AND_APPROVAL"`, `"EXTERNAL_LEGAL_COUNSEL_OPINION"`, `"COMBINED_REVIEW"`. Indicates whether the approval rests on founder/operator judgment, external legal opinion, or both. |
| `approval_evidence_ref` | string or null | ✅ | Reference to supporting approval evidence. For founder approval: may be the git commit hash of this record's first committed state (self-referential). For counsel approval: reference to counsel opinion letter file path or external document ID. Null only if no external evidence exists beyond the committed record itself (founder self-attestation case). |
| `effective_from` | ISO 8601 date | ✅ | Date from which this package is the active approved authority. May differ from `approval_timestamp` (e.g., approved in advance of effective date). |
| `supersedes_authority_id` | string or null | ✅ | `authority_id` of the prior authority record this record supersedes. Null for the first version. Used to construct the authorization lineage chain. |
| `requires_reconsent_on_supersession` | boolean | ✅ | Whether existing `LEGAL_APPROVED` consent holders must re-consent when this record supersedes a prior version. `true` means all existing approved snapshots for this agreement type will need reconsent. See Section 12 for policy details. |
| `runtime_expected_version_env` | string | ✅ | The env var name whose value must equal `package_version` at runtime: `"CONSENT_SCAFFOLD_EXPECTED_VERSION"` |
| `runtime_expected_hash_env` | string | ✅ | The env var name whose value must equal `package_hash` at runtime: `"CONSENT_SCAFFOLD_EXPECTED_HASH"` |
| `runtime_expected_source_url_env` | string | ✅ | The env var name whose value must equal `source_url` at runtime: `"CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL"` |
| `status` | string (enum) | ✅ | Current lifecycle status of this authority record. See Section 7.2. |

### 7.2 — Authority Record Status Enum

| Status | Meaning | Transition Rules |
|---|---|---|
| `DRAFT` | Record is being prepared; not yet suitable for any runtime use; no `LEGAL_APPROVED` transition permitted | Can transition to `APPROVED_FOR_RUNTIME` when all fields are complete and approval decision is made |
| `APPROVED_FOR_RUNTIME` | Record is the active approved authority; runtime env values must match; `LEGAL_APPROVED` transitions are permitted for matching intake records | Only one record per `agreement_type` may hold this status at a time; transitioning a new record to this status must simultaneously move the prior record to `SUPERSEDED` |
| `SUPERSEDED` | This record was previously the active authority but has been replaced by a newer record; `supersedes_authority_id` of the successor record points here | Terminal — cannot revert to `APPROVED_FOR_RUNTIME` once superseded without a new authority record |
| `REVOKED` | Record has been invalidated (e.g., document error, legal recall); no `LEGAL_APPROVED` transitions permitted; existing `LEGAL_APPROVED` records under this authority must be reviewed | Terminal — human action required to handle existing approved consents |

### 7.3 — Example Illustrative Skeleton (Placeholder — NOT a final authority record)

The following illustrates the shape of a future committed authority record. All values are illustrative placeholders. No values here constitute an actual approval or real document reference.

```json
{
  "authority_id": "fam07-supplier-tos-001",
  "agreement_type": "SUPPLIER_ONBOARDING_TERMS",
  "package_name": "TexQtic Supplier Onboarding Terms of Service",
  "package_version": "v1.0.0",
  "package_hash": "<SHA-256-OF-CANONICAL-DOCUMENT-BYTES-PLACEHOLDER>",
  "hash_algorithm": "SHA-256",
  "source_url": "https://texqtic.com/legal/supplier-onboarding-terms/v1.0.0",
  "source_document_location": "governance/legal/fam-07/supplier-onboarding-terms-v1.0.0.md",
  "approved_by_actor_type": "FOUNDER_OPERATOR",
  "approved_by_actor_ref": "Paresh Patel — Founder/Operator, TexQtic",
  "approval_timestamp": "<ISO-8601-DATETIME-PLACEHOLDER>",
  "approval_basis": "FOUNDER_REVIEW_AND_APPROVAL",
  "approval_evidence_ref": "<GIT-COMMIT-HASH-OF-THIS-RECORD-PLACEHOLDER>",
  "effective_from": "<ISO-8601-DATE-PLACEHOLDER>",
  "supersedes_authority_id": null,
  "requires_reconsent_on_supersession": false,
  "runtime_expected_version_env": "CONSENT_SCAFFOLD_EXPECTED_VERSION",
  "runtime_expected_hash_env": "CONSENT_SCAFFOLD_EXPECTED_HASH",
  "runtime_expected_source_url_env": "CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL",
  "status": "DRAFT"
}
```

**This skeleton is illustrative only. Creating an actual authority record with real values, committing it with status `APPROVED_FOR_RUNTIME`, and setting matching env vars are all separate actions requiring explicit operator authorization in a future unit.**

---

## Section 8 — Proposed Future Authority Record File Path

### 8.1 — Recommended Path

```
governance/legal/fam-07/supplier-onboarding-terms-authority.json
```

**Rationale:**
- `governance/legal/` is the established repo convention for legal governance artifacts (confirmed: TTP counsel packet and operator guide live here).
- `fam-07/` subdirectory creates a bounded namespace for FAM-07 legal artifacts, preventing pollution of the top-level `governance/legal/` directory.
- `supplier-onboarding-terms-authority.json` is descriptive and identifies both the agreement type and artifact role.
- JSON format allows structured parsing by future diagnostic tooling (e.g., a server startup check that reads the authority record and compares to env vars).

### 8.2 — Companion Document Path (if document is stored in repo)

If the canonical legal text is stored in the repository rather than served externally:

```
governance/legal/fam-07/supplier-onboarding-terms-v1.0.0.md
```

Where `v1.0.0` is the actual final version. The version suffix must be frozen at the time of approval — this file must not be modified after being referenced in a committed authority record.

### 8.3 — Do Not Create These Files in L2

Neither `governance/legal/fam-07/supplier-onboarding-terms-authority.json` nor any companion document is created in this unit. Their creation constitutes a separate future unit (`FAM-07L3`) requiring explicit operator authorization.

---

## Section 9 — Runtime Env Relationship

### 9.1 — Core Rule

> **Runtime env values used by `getConsentPolicyExpectation()` must exactly match the committed authority record for the active `APPROVED_FOR_RUNTIME` package.**

Specifically:
- `CONSENT_SCAFFOLD_EXPECTED_VERSION` must equal `authority_record.package_version`
- `CONSENT_SCAFFOLD_EXPECTED_HASH` must equal `authority_record.package_hash`
- `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL` must equal `authority_record.source_url`

If any of these values diverge, the consent intake path is accepting submissions against a different package than the one formally approved — breaking the audit chain.

### 9.2 — Validation Expectations for Future Implementation

The following validation expectations define what a future diagnostic or startup check must enforce. These are design requirements, not implementation in this unit.

| Validation Point | Description |
|---|---|
| **Server startup diagnostic** | On startup, the server may (optionally for MVP) read `governance/legal/fam-07/supplier-onboarding-terms-authority.json` and compare its `package_version`/`package_hash`/`source_url` against the three `CONSENT_SCAFFOLD_EXPECTED_*` env vars. A mismatch should surface as a startup warning log at minimum, and as a blocking condition if `FAM07_CONSENT_SCAFFOLD_ENFORCE === 'true'`. |
| **LEGAL_APPROVED transition gate** | When a future control-plane approval action is triggered, the server must read the committed authority record and confirm the env vars match before writing `LEGAL_APPROVED`. If no `APPROVED_FOR_RUNTIME` record exists, the transition must be rejected with a clear error: `NO_APPROVED_AUTHORITY_RECORD`. |
| **Missing authority record** | If the authority record file does not exist or has status `DRAFT` or `REVOKED`, no `LEGAL_APPROVED` transition is permitted. The control-plane approval endpoint must return an actionable error. |
| **Mismatch behavior** | If env vars do not match the authority record at transition time: reject the transition with error code `AUTHORITY_ENV_MISMATCH`, surface the mismatched field(s) in the error payload, and do not write any `LEGAL_APPROVED` record. |
| **REVOKED handling** | If the active authority record transitions to `REVOKED`, the system should surface a high-severity admin alert. Existing `LEGAL_APPROVED` consent records are not automatically invalidated — this requires a separate human review decision. |

### 9.3 — Env Var Change Discipline

When a new authority record supersedes the prior one and env vars must be updated:

1. Prepare and commit the new `APPROVED_FOR_RUNTIME` authority record first (with prior record moving to `SUPERSEDED`).
2. Update env vars to match the new authority record's package_version/hash/source_url.
3. The window between steps 1 and 2 means env vars temporarily mismatch the new authority record. This is acceptable only if step 2 is executed atomically with the deployment that activates the new authority record.
4. Do not update env vars before the authority record is committed. The reverse order creates a state where intake accepts the new package before the authority record is formally committed.

---

## Section 10 — Approval Actor Proof Model

### 10.1 — Actor Type Definitions

| Actor Type | Definition | Evidence Requirement |
|---|---|---|
| `FOUNDER_OPERATOR` | The platform founder/operator (Paresh Patel) exercises their authority as the responsible platform operator to approve the legal package for MVP use. This is a self-attested approval. | The git commit of the authority record itself, signed by the operator's git identity, constitutes the primary evidence. The `approval_evidence_ref` should reference the commit hash. |
| `EXTERNAL_LEGAL_COUNSEL` | A licensed external legal counsel has reviewed the document and provided a written opinion authorizing use. | The `approval_evidence_ref` must reference a counsel opinion letter (file path in `governance/legal/fam-07/` or external document reference). Counsel name, firm, and opinion date must be identifiable. |
| `COMBINED_FOUNDER_COUNSEL` | Both founder/operator and external legal counsel have reviewed and approved. | Both evidence references must be present — founder git commit + counsel opinion reference. |

### 10.2 — MVP Recommendation: Founder/Operator Approval

For MVP, `FOUNDER_OPERATOR` approval (`approved_by_actor_type: "FOUNDER_OPERATOR"`) is sufficient to create an `APPROVED_FOR_RUNTIME` authority record and unblock the `LEGAL_APPROVED` transition path.

**Rationale:**
- Paresh Patel as founder/operator is the accountable responsible party for platform legal terms at MVP stage.
- The committed authority record creates an auditable, version-controlled record of the approval decision, which is more rigorous than the current env-var-only approach.
- External legal counsel review is strongly recommended before broad production use but is not a technical prerequisite for the MVP code path.
- The `approval_basis` field captures the distinction: `"FOUNDER_REVIEW_AND_APPROVAL"` vs. `"EXTERNAL_LEGAL_COUNSEL_OPINION"` vs. `"COMBINED_REVIEW"`.
- If counsel is engaged (as suggested by `FTR-LEGAL-003`'s legal package authority requirement), the authority record can be updated to `COMBINED_FOUNDER_COUNSEL` and the `approval_evidence_ref` populated with the counsel opinion reference.

### 10.3 — What Actor Proof Does NOT Mean

- This design does not invent or attribute any current counsel approval that does not exist.
- No counsel approval exists in the repository at the time of this unit.
- "Actor proof" means: when the authority record is eventually created and committed, it must clearly identify who made the approval decision, on what basis, and with what evidence reference. It does not pre-approve anything.

---

## Section 11 — Approval Transition Design Preview

This section defines the minimum prerequisites and semantics for the future `LEGAL_PENDING` → `LEGAL_APPROVED` transition. This is a design specification only. No implementation is performed in this unit.

### 11.1 — Transition Prerequisites (all must be satisfied)

| # | Prerequisite | Check Location |
|---|---|---|
| 1 | An `APPROVED_FOR_RUNTIME` authority record exists at `governance/legal/fam-07/supplier-onboarding-terms-authority.json` | File read + status check |
| 2 | Runtime env values (`CONSENT_SCAFFOLD_EXPECTED_VERSION`, `*_HASH`, `*_SOURCE_URL`) exactly match the authority record's `package_version`, `package_hash`, `source_url` | Env comparison at transition time |
| 3 | A `LegalConsentSnapshot` with `legalStatus = 'LEGAL_PENDING'` and matching `agreementType`, `agreementVersion`, `agreementHash`, `agreementSourceUrl` exists for the target user | DB read |
| 4 | The snapshot's `agreementVersion/Hash/SourceUrl` match the active authority record (i.e., the user consented against the currently approved package) | Cross-field comparison |
| 5 | The actor performing the transition has control-plane admin authority (verified by control-plane auth context, not just any authenticated user) | Auth middleware |
| 6 | No superseding authority record has been committed that would make the current intake's version/hash stale | Authority record version check |

### 11.2 — Transition Write Operations (future implementation only)

When all prerequisites are satisfied, the transition performs:

1. **Update `LegalConsentSnapshot`:**
   - Set `legalStatus = 'LEGAL_APPROVED'`
   - Set `reviewedAt = <transition timestamp>`
   - Set or update `metadataJson` to include approval metadata (authority_id, approving admin actor, timestamp, approval_basis)
   - Source flow becomes `ADMIN_REVIEW` on this update

2. **Create `LegalConsentEvent`:**
   - `eventType = 'ACCEPTED_FINAL'`
   - `legalStatus = 'LEGAL_APPROVED'`
   - `sourceFlow = 'ADMIN_REVIEW'`
   - All agreement metadata fields match the authority record values
   - `occurredAt = <transition timestamp>`
   - `actorUserId = <admin actor user ID>`

3. Both writes must be in a single Prisma transaction, following the established transaction pattern from `recordLegalPendingConsentScaffold`.

### 11.3 — `ACCEPTED_FINAL` Event Semantics

- Emitted exactly once per snapshot, at the point of `LEGAL_PENDING` → `LEGAL_APPROVED` transition.
- Represents the admin review and final confirmation that the consent record is legally valid and tied to the approved authority package.
- The `legalStatus` on the event must be `LEGAL_APPROVED` (matching the snapshot state after transition).
- The event `actorUserId` records the admin who performed the review, not the original consenting user. This distinguishes `ACCEPTED_FINAL` from `ACCEPTED_PENDING` (which records the consenting user's actor).

### 11.4 — `ADMIN_REVIEW` Source Flow Semantics

- `ADMIN_REVIEW` is the `sourceFlow` value that marks the transition as having been performed by an authenticated control-plane administrator.
- It contrasts with `ACTIVATE_NEW_USER` and `ACTIVATE_AUTHENTICATED_INVITE` (which are user-side flows).
- When a snapshot's `sourceFlow` is updated to `ADMIN_REVIEW` during the transition, it signals that the record has undergone a legal review step beyond the original user intake.
- The `ADMIN_REVIEW` source flow on a snapshot implies `legalStatus = 'LEGAL_APPROVED'` (the two co-occur at the transition point).

---

## Section 12 — Re-Consent Policy Draft

This section defines the decision points for the re-consent lifecycle. This is a policy draft — implementation comes in a later unit.

### 12.1 — Trigger Conditions for Re-Consent

Re-consent is required when a user's previously `LEGAL_APPROVED` consent record becomes stale due to a change in the authoritative legal package.

| Trigger | Description | Automatic? |
|---|---|---|
| **Package version change** | A new authority record is committed with a different `package_version` (and `requires_reconsent_on_supersession = true` on the new record) | Yes — determined by authority record field |
| **Package hash change with same version** | The document content changes (hash changes) even if the version label did not increment | Yes — a hash change without a version change is a data integrity violation; a new authority record is mandatory |
| **Source URL change** | The canonical document location changes | Depends — if the document content is identical (hash unchanged), source URL change alone may not require re-consent; if hash also changes, treat as package change |
| **Authority record REVOKED** | The active authority record is revoked | Yes — all `LEGAL_APPROVED` records under that authority must be reviewed; re-consent required before any new `LEGAL_APPROVED` transition is permitted |

### 12.2 — Re-Consent Not Required

| Case | Reason |
|---|---|
| Authority record version supersession with `requires_reconsent_on_supersession = false` | Operator explicitly declared no re-consent needed (e.g., editorial/typo fix that does not change material terms) |
| Admin review transition (`ACCEPTED_FINAL`) of an existing `LEGAL_PENDING` record against the current approved version | This is the normal first-approval flow, not a re-consent |
| Authority record administrative metadata update (e.g., updating `approval_evidence_ref` without changing package identity fields) | No change to the document itself |

### 12.3 — Re-Consent Flow Decision Points

When re-consent is required for a user:

1. **`RECONSENT_REQUIRED` event emitted** — recorded on the affected `LegalConsentSnapshot` at the point when the system detects the existing approved record is now stale (either at new authority record activation or at next user login/interaction).

2. **Snapshot `legalStatus` transition** — When re-consent is required, the snapshot's `legalStatus` transitions from `LEGAL_APPROVED` back to `LEGAL_PENDING` (or a dedicated `RECONSENT_PENDING` status if future implementation introduces one). The existing `ACCEPTED_FINAL` event is not deleted — it records the historical approval; the new `RECONSENT_REQUIRED` event records the re-consent obligation.

3. **User must accept the new version** — The user must go through the consent checkpoint again against the new package version/hash. This flows through the existing `recordLegalPendingConsentScaffold` path with the new agreement metadata.

4. **`RECONSENT_COMPLETED` event emitted** — After the admin review transition approves the new consent record, `RECONSENT_COMPLETED` is emitted (in addition to or in place of a new `ACCEPTED_FINAL` event). The distinction between `RECONSENT_COMPLETED` and `ACCEPTED_FINAL` on a re-consent may be resolved in a future policy implementation unit.

5. **Gate behavior** — Until re-consent is completed, the user's access to features gated on `has_legal_approved_record` is blocked. The specific gate behavior (hard block vs. soft warning) is a product decision for a future unit.

### 12.4 — `GATE_REJECTED` Semantics (draft)

`GATE_REJECTED` is the event type for when an activation or legal gate check fails due to consent state. The precise trigger conditions (e.g., activation attempt with no valid `LEGAL_PENDING` record, or re-consent check failure) are to be specified in the approval transition implementation unit.

### 12.5 — `SUPERSEDED` on Snapshot (draft)

The `SUPERSEDED` status on `LegalConsentStatus` represents a snapshot whose approved consent has been superseded by a new package version requiring re-consent. The transition sequence is:
- `LEGAL_APPROVED` → `SUPERSEDED` (when authority record is superseded with `requires_reconsent_on_supersession = true`)
- `SUPERSEDED` → `LEGAL_PENDING` (when user re-accepts the new version through the intake flow)
- `LEGAL_PENDING` → `LEGAL_APPROVED` (when admin review transition approves the new consent)

The exact timing of the `LEGAL_APPROVED` → `SUPERSEDED` transition (at authority record supersession vs. at next user interaction) is a future implementation decision.

---

## Section 13 — Future Implementation Sequence

The following sequence of bounded units is recommended after L2. Each unit is independent and requires explicit authorization before execution.

| Unit | ID Pattern | Description | Primary Gap Addressed | Mode | Prerequisite |
|---|---|---|---|---|---|
| L3 | `FAM-07L3-SUPPLIER-ONBOARDING-TERMS-AUTHORITY-RECORD-CREATE-001` | Create the actual legal document text (or confirm it exists externally) and commit the `governance/legal/fam-07/supplier-onboarding-terms-authority.json` with `status: "APPROVED_FOR_RUNTIME"` and real version/hash/sourceUrl values. Requires operator approval decision. | `MISSING_FINAL_LEGAL_PACKAGE_AUTHORITY`, `MISSING_VERSION_HASH_SOURCE_ACTOR_PROOF` | WRITE — governance only (no source changes) | L2 committed; operator review and approval of final ToS document text; Paresh explicit authorization |
| L4 | `FAM-07L4-APPROVAL-TRANSITION-ROUTE-IMPLEMENTATION-001` | Implement the control-plane approval route/service: `POST /api/control/tenants/:id/consent/approve`. Writes `LEGAL_APPROVED` snapshot + `ACCEPTED_FINAL` event in a single transaction. Enforces all transition prerequisites from Section 11. | `MISSING_APPROVAL_STATE_TRANSITION_DESIGN` | IMPLEMENTATION — backend source, Prisma client (no schema changes) | L3 committed with APPROVED_FOR_RUNTIME authority record |
| L5 | `FAM-07L5-APPROVAL-TRANSITION-TEST-COVERAGE-001` | Add tests for: `LEGAL_APPROVED` write path; `ACCEPTED_FINAL` event emission; `ADMIN_REVIEW` source flow; transition prerequisite failures (missing authority, env mismatch, no LEGAL_PENDING snapshot, wrong version); `hasLegalApprovedRecord = true` in control-plane observability. | `MISSING_TEST_COVERAGE` | IMPLEMENTATION — test only | L4 committed |
| L6 | `FAM-07L6-LEGAL-APPROVED-RUNTIME-VERIFICATION-001` | Runtime end-to-end proof: trigger approval transition in production; verify `has_legal_approved_record = true` in `consent_scaffold_observability`; verify `ACCEPTED_FINAL` event in tenant detail. | `MISSING_RUNTIME_VERIFICATION` | VERIFICATION — runtime only (no source changes) | L4+L5 committed and deployed |
| L7 | `FAM-07L7-LEGAL-GATE-GOVERNANCE-SYNC-CLOSE-001` | Update governance trackers: advance NEXT-ACTION.md, OPEN-SET.md; update LAUNCH-FAMILY-INDEX.md FAM-07 row; record FTR-LEGAL-003 closure if all prerequisite evidence is present. | All remaining FAM-07 legal gaps | GOVERNANCE SYNC — tracker edits only | L3+L4+L5+L6 complete; FTR-LEGAL-003 closure requires final legal package authority with all six gap labels resolved |

### Note on L3 Authorization

L3 is the highest-stakes unit in the sequence. It requires Paresh Patel to:
1. Review and finalize the legal document text (or confirm an externally hosted canonical URL).
2. Compute the document hash (or authorize the agent to compute it from the document bytes).
3. Explicitly authorize the `APPROVED_FOR_RUNTIME` status on the authority record.

L3 must not be executed speculatively or from a design artifact alone. It requires explicit Paresh authorization with the actual document text decision in hand.

---

## Section 14 — Residual Gaps After L2

L2 (this unit) resolves the design gap only. The following gaps remain open after L2 and require subsequent units to close.

| Gap Label | Resolved by L2? | Resolution Unit |
|---|---|---|
| `MISSING_FINAL_LEGAL_PACKAGE_AUTHORITY` | ❌ Design defined but no authority record created | L3 |
| `MISSING_VERSION_HASH_SOURCE_ACTOR_PROOF` | ❌ Record shape defined but no actual record committed | L3 |
| `MISSING_APPROVAL_STATE_TRANSITION_DESIGN` | ⚠️ Partially — design preview in Section 11; no implementation | L4 |
| `MISSING_RECONSENT_POLICY` | ⚠️ Partially — policy draft in Section 12; no implementation | L4/L5 |
| `MISSING_RUNTIME_VERIFICATION` | ❌ No runtime action performed | L6 |
| `MISSING_TEST_COVERAGE` | ❌ No test edits authorized | L5 |

**L2 output:** A committed design artifact that fully specifies the authority record model, actor proof requirements, runtime env relationship, approval transition prerequisites, and re-consent policy decision points. This is the necessary design foundation that L3–L7 build on.

---

## Section 15 — Legal-Gate Preservation Statement

The following statuses are **unchanged** by this unit and must not be altered by any downstream unit without explicit authorization.

| Item | Status Before L2 | Status After L2 | Changed? |
|---|---|---|---|
| FAM-07 | PARTIALLY_IMPLEMENTED / TEST_CONFIRMED | PARTIALLY_IMPLEMENTED / TEST_CONFIRMED | **NO** |
| FTR-LEGAL-003 | OPEN / MVP_CRITICAL / NOT_ASSESSED | OPEN / MVP_CRITICAL / NOT_ASSESSED | **NO** |
| HD-001 | RUNTIME_CONFIRMED_CONFIGURED | RUNTIME_CONFIRMED_CONFIGURED | **NO** |
| LAUNCH-FAMILY-INDEX.md FAM-07 row | NOT VERIFIED_COMPLETE | NOT VERIFIED_COMPLETE | **NO** |
| NEXT-ACTION.md | active_delivery_unit = K14 | active_delivery_unit = K14 | **NO** |

**No legal-final claim is made in this unit. No `LEGAL_APPROVED` status is synthesized, implied, or attributed. The authority record skeleton in Section 7.3 is illustrative only and explicitly marked as a placeholder. FTR-LEGAL-003 remains OPEN.**

---

## Section 16 — Source / Backend / Schema / Runtime / Governance Action Statement

| Surface | Action Taken? |
|---|---|
| Source files (`server/src/`) | **NO** — zero changes |
| Frontend files (`components/`, `services/`, etc.) | **NO** — zero changes |
| Prisma schema (`server/prisma/schema.prisma`) | **NO** — zero changes |
| Prisma migrations | **NO** — zero changes |
| Test files (`server/src/__tests__/`, `tests/`) | **NO** — zero changes |
| Governance trackers (`governance/control/`, `governance/launch-readiness/`) | **NO** — zero changes |
| `.env` / environment variables | **NO** — not read directly, not modified, not printed |
| Runtime / deployed services | **NO** — no deployment action |
| `governance/legal/fam-07/` directory | **NOT CREATED** — no authority record file created; design only |
| Legal document text | **NOT DRAFTED** — no legal document drafted in this unit |

The only file written in this unit is this artifact:  
`artifacts/control-plane/FAM-07L2-CONTROL-PLANE-LEGAL-PACKAGE-AUTHORITY-DESIGN-001.md`

---

## Section 17 — Adjacent Findings

The following findings are adjacent to L2 scope and recorded here for completeness. No action is authorized for any of these in this unit.

1. **TTP legal gate is a separate workstream.** `governance/legal/TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md` and its operator guide address TTP/NC-TTP legal concerns. They are entirely separate from FTR-LEGAL-003 / FAM-07 supplier onboarding ToS. The same `governance/legal/` directory houses both workstreams; they must remain distinct namespaces. L3 and subsequent L-lane units should use `governance/legal/fam-07/` as their dedicated subdirectory.

2. **Hash computation tooling note.** When L3 is executed, computing `package_hash` requires a stable canonical form of the legal document. For a Markdown file stored in the repo, the hash should be computed over the UTF-8 byte content of the file with normalized line endings (LF) and no BOM. If the document is an external PDF, the hash must be over the PDF bytes. The algorithm must be recorded as `hash_algorithm` in the authority record. L3 should specify the exact computation command (e.g., PowerShell `Get-FileHash -Algorithm SHA256`) as part of its execution evidence.

3. **`has_legal_approved_record` is forward-compatible.** The read-only detection in `control.ts` (`latestConsentSnapshot?.legalStatus === 'LEGAL_APPROVED'`) requires no changes for L4 to work — it will activate automatically once a `LEGAL_APPROVED` record exists. L4 needs only to implement the write path.

4. **Env var precedence risk.** If `CONSENT_SCAFFOLD_EXPECTED_VERSION` is currently set to a placeholder or test value in production, live activations are being accepted against an informally defined package version. This risk cannot be assessed from code alone (env vars are not readable without secrets access). It should be confirmed as part of L3's authority record creation step by having the operator verify the current env var values match the document they intend to approve.

---

## Section 18 — Final Enum

**`FAM_07L2_LEGAL_PACKAGE_AUTHORITY_DESIGN_COMPLETE`**

**Summary:**

| Field | Value |
|---|---|
| Design decision | Legal package authority model fully specified |
| Authority record file path | `governance/legal/fam-07/supplier-onboarding-terms-authority.json` (proposed; not created) |
| Selected actor proof model | `FOUNDER_OPERATOR` for MVP; `COMBINED_FOUNDER_COUNSEL` recommended for production at scale |
| Runtime env rule | Env vars must exactly match committed `APPROVED_FOR_RUNTIME` authority record fields; mismatch blocks transition |
| Future implementation sequence | L3 (authority record creation) → L4 (approval transition route) → L5 (test coverage) → L6 (runtime verification) → L7 (governance sync close) |
| Residual gaps | All 6 L1 gap labels remain open; L2 provides design foundation for L3–L7 |
| FAM-07 status | NOT VERIFIED_COMPLETE — PARTIALLY_IMPLEMENTED / TEST_CONFIRMED |
| FTR-LEGAL-003 status | OPEN / MVP_CRITICAL |
| HD-001 status | RUNTIME_CONFIRMED_CONFIGURED |
| Source/backend/schema/runtime changes | **NONE** |
| Governance tracker changes | **NONE** |
| Legal-gate | **PRESERVED** — no legal-final claim, no LEGAL_APPROVED synthesized |
