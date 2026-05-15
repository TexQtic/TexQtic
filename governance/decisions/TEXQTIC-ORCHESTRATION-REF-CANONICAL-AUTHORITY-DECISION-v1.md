# TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1

**Unit ID:** MAIN-PLATFORM-ORF-AUTHORITY-006  
**Title:** Canonical `external_orchestration_ref` Authority for CRM / CAE Acquisition Provisioning  
**Status:** DECIDED — Docs/governance only. No implementation authorized.  
**Date:** 2026-05-15  
**Authorized by:** Paresh (explicit — submitted as ORF-AUTHORITY-006 prompt despite Layer 0 hold; docs/governance unit only)  
**Basis:** Repo-truth inspection of `server/prisma/schema.prisma`, CRM-platform handoff contract, acquisition tracker v2, and boundary design artifact. No code, schema, migration, route, service, frontend, event, or OpenAPI changes.

---

## §0 — Layer 0 Posture and Authorization

**Current Layer 0 posture (at HEAD `1b7ecda`, 2026-05-15):**

| Field | Value |
| --- | --- |
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `active_delivery_unit_status` | `HOLD_FOR_AUTHORIZATION` |
| `next_candidate_unit` | `HOLD_FOR_COUNSEL_FEEDBACK` |
| `next_candidate_unit_status` | `HOLD_FOR_COUNSEL_FEEDBACK — No implementation packet may be opened until external legal counsel provides written feedback on TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001.md (upgraded)` |
| TTP legal gate | Active (`HOLD_FOR_COUNSEL_FEEDBACK`) |
| WL Co hold | `REVIEW-UNKNOWN` (Section 2 of BLOCKED.md) |

**Authorization basis for this unit:**

The TTP legal hold applies to implementation units, feature-flag activations, schema mutations, and runtime behavior changes. This unit is `docs/governance decision` only: no code, no schema, no migration, no route, no event registration, no OpenAPI modification. Paresh explicitly authorized this docs/governance unit by submitting the ORF-AUTHORITY-006 prompt. Authorization is present in the current session context.

**What this unit does NOT authorize:**

- WEBHOOK-007 implementation
- ROUTE-001 implementation
- EVENTS-003 event registration
- Any schema mutation or migration
- Any change to Layer 0 control files

---

## §1 — Purpose

This governance decision artifact resolves two open gaps in the Main Platform acquisition stream:

- **GAP-ACQ-001** — `external_orchestration_ref` dual-column authority unresolved: both `tenants.externalOrchestrationRef` and `organizations.external_orchestration_ref` exist in the schema with separate `@unique` constraints, and no governance document has previously named which column is the canonical CRM ↔ Main Platform supplier provisioning lookup key.

- **GAP-ACQ-007** — CRM jurisdiction payload gap: CRM does not currently supply a `jurisdiction` field in the handoff payload, and the Main Platform `organizations.jurisdiction` defaults to `'UNKNOWN'`. For India-first acquisition, the correct default is `IN`.

This artifact is **planning and governance only**. It does not authorize any implementation, does not trigger schema mutations or migrations, and does not register events or modify API contracts. It records a binding governance decision that constrains how WEBHOOK-007 and PROVISIONED-EVENTS-008 are later implemented when those units are authorized.

---

## §2 — Source Artifacts and Files Reviewed

### 2.1 Primary Tracker Baseline

| Artifact | Path | Role |
| --- | --- | --- |
| **Main Platform Acquisition Implementation Plan Tracker v2** | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | Current tracker baseline; records GAP-ACQ-001 and GAP-ACQ-007 as OPEN; lists ORF-AUTHORITY-006 as first priority |

### 2.2 Supporting Product-Truth Artifacts

| Artifact | Path | Relevant content |
| --- | --- | --- |
| Main Platform Acquisition and Aggregator Stream Repo-Truth Refresh and Opening v1 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md` | §6.2 GAP-ACQ-001, §6.8 GAP-ACQ-007 full descriptions; Unit F (ORF-AUTHORITY-006) prerequisite detail |
| Main Platform Acquisition Engine Boundary Design v1 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` | §2.6 cross-system identity fields; §3.3 provisioning webhook prerequisite; §5.4 non-ownership boundary; §6 gap register |

### 2.3 CRM Artifacts (Main-Repo Copies — External Evidence)

| Artifact | Path | Role |
| --- | --- | --- |
| CRM–Platform Data Reality Reconciliation Investigation v1 | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Join-key inventory; identifies missing cross-system orchestration seam; confirms `external_orchestration_ref` dual-column gap |
| CRM–Platform Canonical Business Model and Handoff Contract v1 | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system ID strategy; canonical object chain; confirms onboarding case as handoff anchor; specifies platform org as runtime identity holder |

> **Note:** CRM repo artifacts and CAE repo artifacts are not present in this repo. CRM evidence above is from investigation artifacts written and committed to the TexQtic main repo. CRM internal schemas (e.g., `public.suppliers` lacking `jurisdiction`) are recorded as external evidence from `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`.

### 2.4 Layer 0 Control Files

| File | Path | Relevant finding |
| --- | --- | --- |
| OPEN-SET.md | `governance/control/OPEN-SET.md` | Layer 0 posture; last closed unit TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001 (VERIFIED_COMPLETE 2026-07-06) |
| NEXT-ACTION.md | `governance/control/NEXT-ACTION.md` | `active_delivery_unit: HOLD_FOR_AUTHORIZATION`; `next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK`; TTP legal gate active |
| BLOCKED.md | `governance/control/BLOCKED.md` | WL Co `REVIEW-UNKNOWN` hold; all NC Phase 1 items RESOLVED; QD-6 maintained |

### 2.5 Schema File Inspected

| File | Lines inspected | Finding |
| --- | --- | --- |
| `server/prisma/schema.prisma` | Lines 10–35, 110–135, 1055–1090 | Three `externalOrchestrationRef` / `external_orchestration_ref` occurrences confirmed (see §3) |

### 2.6 Governance Decision Docs Checked

`grep_search` over `governance/**` for `external_orchestration_ref`, `externalOrchestrationRef`, `jurisdiction default`, and `CRM provisioning handoff`:

- **Found:** `external_orchestration_ref` listed as a Gate E prohibited field in `TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md`, `TEXQTIC-B2C-PUBLIC-BROWSE-FINAL-READINESS-REASSESSMENT-v1.md`, and `TEXQTIC-D021-B2C-SUCCESSOR-NARROW-REVALIDATION-v1.md`.
- **Not found:** Any governance document naming `external_orchestration_ref` canonical column authority for CRM provisioning.
- **Not found:** Any governance document specifying jurisdiction default for acquisition-sourced suppliers.

**Conclusion:** No prior governance decision covers GAP-ACQ-001 or GAP-ACQ-007. This artifact is the first and authoritative resolution.

---

## §3 — Problem Statement

### 3.1 Schema Reality: Three Occurrences of `external_orchestration_ref`

Inspection of `server/prisma/schema.prisma` at HEAD `1b7ecda` confirms three distinct occurrences of the `external_orchestration_ref` concept:

| Model | Prisma field name | Schema line | Column name | Uniqueness | DB table |
| --- | --- | --- | --- | --- | --- |
| `Tenant` | `externalOrchestrationRef` | 21 | `external_orchestration_ref` | `@unique` (single-column unique constraint) | `tenants` |
| `Invite` | `externalOrchestrationRef` | 120 | `external_orchestration_ref` | Non-unique; `@@index` only | `invites` |
| `organizations` | `external_orchestration_ref` | 1073 | `external_orchestration_ref` | `@unique` (single-column unique constraint) | `organizations` |

Both `Tenant.externalOrchestrationRef` and `organizations.external_orchestration_ref` carry independent `@unique` constraints. This means:

- If CRM writes the same `external_orchestration_ref` value to `organizations.external_orchestration_ref` for the idempotency check, and WEBHOOK-007 also tries to upsert on `tenants.externalOrchestrationRef`, the two writes are NOT the same constraint — the DB treats them as separate identity assertions on separate tables.
- If no canonical decision exists, WEBHOOK-007 could check idempotency on the `tenants` column while CRM thinks idempotency lives on the `organizations` column — resulting in double-provisioning, orphaned tenant records, or silent idempotency failures.

### 3.2 The Risk: Idempotency Failure and Duplicate Provisioning

The provisioning handoff (WEBHOOK-007) must be strictly idempotent: if CRM re-submits the same provisioning request with the same `external_orchestration_ref`, the platform must recognize the existing record and return the current state rather than creating a second record.

Without a canonical column decision:

- WEBHOOK-007 cannot safely implement idempotency — it would not know which column to check first.
- Two platform records could be created for one CRM-sourced supplier: one if the first call writes to `organizations` and a second if a retry checks `tenants`.
- After a restart or retry, the platform might find a row on one table but not the other, leading to inconsistent state.

### 3.3 The CRM Jurisdiction Gap

Per `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md`, the CRM `public.suppliers` table does not include a `jurisdiction` field. When WEBHOOK-007 receives the provisioning payload and writes to `organizations.jurisdiction`, there is no CRM-supplied value to use.

The current schema default is `'UNKNOWN'` (schema.prisma line 1058: `@default("UNKNOWN")`). For TexQtic's India-first Surat acquisition, `'UNKNOWN'` is incorrect and could produce poor discovery output quality.

---

## §4 — Decision: Canonical Column

### 4.1 Canonical Column

> **DECIDED:** `organizations.external_orchestration_ref` is the canonical CRM ↔ Main Platform supplier provisioning lookup key for acquisition-sourced public supplier profiles.

Schema reference: `server/prisma/schema.prisma`, model `organizations`, line 1073, field `external_orchestration_ref`, `@unique`, `VarChar(255)`.

### 4.2 Rationale

| Rationale point | Detail |
| --- | --- |
| **CRM-ACQ-10 provisions supplier/profile records, not tenant records** | The CRM Customer Acquisition Engine maps to the platform organization entity (the "supplier" on the public discovery surface). The tenant is the tenancy container; the organization is the business identity that appears in public projection. |
| **WEBHOOK-007 creates/updates platform organization records** | Per `MAIN-PLATFORM-ACQUISITION-ENGINE-BOUNDARY-DESIGN-v1.md` §3.3, the provisioning endpoint writes `external_orchestration_ref` to `organizations.external_orchestration_ref`. |
| **`organizations.external_orchestration_ref` is unique and entity-scoped** | The unique constraint on the `organizations` table directly enforces one organization per CRM supplier. Idempotency is expressed as a constraint on the provisioned entity. |
| **Public supplier profile routing uses `organizations.slug`** | `GET /api/public/supplier/:slug` (ROUTE-001) routes by `organizations.slug`, not by `external_orchestration_ref`. The two fields serve different purposes: slug is the public identity; `external_orchestration_ref` is the internal cross-system seam. |
| **`external_orchestration_ref` must never be exposed publicly** | Gate E prohibits this field in all public APIs. Keeping it on `organizations` (internal, auth-guarded, Gate-E-prohibited) is consistent. |
| **CRM–Platform Canonical Business Model** | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` states: "Platform organization stores the same reference for identity-level traceability." This aligns with the decision to anchor on `organizations.external_orchestration_ref`. |

---

## §5 — Non-Canonical Field Handling

### 5.1 `Tenant.externalOrchestrationRef`

`tenants.externalOrchestrationRef` (schema.prisma line 21, `@unique`) is **not** the canonical key for acquisition-sourced supplier profile provisioning.

Rules:

- WEBHOOK-007 must **not** use `Tenant.externalOrchestrationRef` for supplier provisioning idempotency.
- If a future tenant-level provisioning unit (e.g., a different provisioning flow that creates tenants from CRM) explicitly decides to use this field, that decision must be recorded in a separate governance artifact, narrowly scoped to that unit.
- Until a future explicit decision authorizes it, `Tenant.externalOrchestrationRef` remains a reserved field for potential future tenant-level provisioning — not for acquisition-sourced organization provisioning.
- The field's `@unique` constraint must not be treated as equivalent to the organization-level constraint.

### 5.2 `Invite.externalOrchestrationRef`

`invites.externalOrchestrationRef` (schema.prisma line 120, non-unique, indexed) is **not** the canonical key for supplier provisioning idempotency.

Rules:

- `Invite.externalOrchestrationRef` is invite-level. It is intended to correlate a platform invite to a specific CRM issuance artifact (e.g., to track that a platform invite was dispatched in response to CRM issuance record X).
- It must not be used as the supplier provisioning identity anchor.
- WEBHOOK-007 must not write the acquisition canonical ref to the invites table as an idempotency mechanism.
- The indexed (non-unique) constraint on `invites.externalOrchestrationRef` correctly reflects that one CRM issuance could, in theory, correspond to multiple invite records over time (re-invites, re-issuances). It is a correlation field, not an identity field.

### 5.3 No Divergent Multi-Column Writes

WEBHOOK-007 must not write the same `external_orchestration_ref` value to multiple models (e.g., both `organizations.external_orchestration_ref` AND `Tenant.externalOrchestrationRef`) as part of a single provisioning operation unless a future governance artifact explicitly authorizes dual-write for a stated reason.

Divergent writes to both columns would reintroduce the dual-column authority problem this decision resolves.

---

## §6 — CRM Value Rule

### 6.1 What CRM Must Send

| Rule | Statement |
| --- | --- |
| **Canonical CRM value** | CRM must send the canonical CRM supplier identifier as the `external_orchestration_ref` in the provisioning payload. The canonical CRM supplier identifier is the CRM onboarding case UUID or equivalent stable identifier that uniquely identifies the approved supplier candidate in CRM across retries and re-submissions. |
| **Stable identifier** | The value must be stable across CRM retries. The same supplier must always produce the same `external_orchestration_ref` value in CRM — not a per-attempt or per-call generated ID. |
| **No `acquisition_submission_id`** | The raw submission ID from the marketing intake layer must **not** be used as the canonical platform orchestration ref. The raw submission is too early and too noisy; a single submission might be deduplicated, rejected, or resubmitted. |
| **No field-agent IDs** | Field-agent identifiers, device identifiers, or assignment IDs must **not** be used as the canonical platform orchestration ref. |
| **No onboarding-case event IDs** | Individual case event row IDs or action IDs must **not** be used. The case itself is the anchor, not its events. |
| **No referral IDs** | Referral codes or referral record IDs must **not** be used as the cross-system identity anchor. Referral codes are marketing attribution fields; they flow through the platform as passthrough parameters, not as identity seams. |
| **No CAE draft IDs** | Customer Acquisition Engine draft or pipeline-stage IDs must **not** be used. Those are internal to the CAE workflow tool. |

### 6.2 Recommended CRM Identifier Type

The CRM canonical handoff contract (`CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md`) designates the **onboarding case** as the cross-system handoff anchor. Therefore:

The recommended canonical value for `external_orchestration_ref` is the CRM **onboarding case UUID** (or equivalent stable, unique CRM onboarding case identifier).

This is the identifier the CRM repo should persist and use in the provisioning handoff payload when WEBHOOK-007 is later implemented.

> **External note:** This recommendation is written for the Main Platform repo record. CRM repo implementation is outside the scope of this artifact. CRM implementation of the provisioning handoff payload belongs to the CRM repo, per `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` Repo Trigger Guidance.

---

## §7 — WEBHOOK-007 Read/Write Rule

These rules are recorded as governance constraints. They do **not** authorize WEBHOOK-007 implementation — WEBHOOK-007 remains BLOCKED until Layer 0 clears, EVENTS-003 is complete, and additional prerequisites are met (see §10.4).

### 7.1 Idempotency Lookup

| Rule | Statement |
| --- | --- |
| **Canonical column for idempotency** | WEBHOOK-007 must check `organizations.external_orchestration_ref` for idempotency before creating or updating any organization record. |
| **Write target** | WEBHOOK-007 must write the CRM canonical ref to `organizations.external_orchestration_ref` only. |
| **Not `tenants`** | WEBHOOK-007 must **not** use `tenants.externalOrchestrationRef` as the idempotency check column for supplier provisioning. |
| **Not `invites`** | WEBHOOK-007 must **not** use `invites.externalOrchestrationRef` as the supplier provisioning idempotency check column. |

### 7.2 Re-Submission Behavior

| Rule | Statement |
| --- | --- |
| **Idempotent re-submission** | If WEBHOOK-007 receives a provisioning request with an `external_orchestration_ref` that already exists in `organizations.external_orchestration_ref`, it must treat this as a re-submission and return the existing organization record state rather than creating a second record. |
| **No duplicate creation** | A second call with the same canonical ref must **not** create a second `organizations` row. |
| **Conflict response for ambiguous duplicates** | If a re-submission arrives with a canonical ref that already exists AND the current provisioning payload conflicts with the stored record state in a way the platform cannot safely resolve automatically (e.g., different `legal_name` for the same ref), WEBHOOK-007 must return an appropriate conflict/error response rather than silently overwriting. The exact HTTP status and error shape are to be defined in the WEBHOOK-007 OpenAPI contract when that unit is built. |

### 7.3 Public Exposure Prohibition

| Rule | Statement |
| --- | --- |
| **Gate E applies** | `external_orchestration_ref` is a Gate E prohibited field. It must never appear in `GET /api/public/b2b/suppliers`, in any future `GET /api/public/supplier/:slug`, or in any event payload consumed by public or unauthenticated consumers. |
| **No public API leakage** | WEBHOOK-007 response payloads destined for CRM (internal) may reference the canonical ref for correlation. No public-facing endpoint may echo or include `external_orchestration_ref`. |
| **No event leakage** | Future events (`public_supplier_profile.provisioned.v1`, `public_supplier_profile.provision_requested.v1`) may include `external_orchestration_ref` in the payload **only if** those events are strictly internal/audit-scoped. They must **not** be forwarded to public consumers. This constraint is to be enforced in EVENTS-003 and PROVISIONED-EVENTS-008. |

---

## §8 — Jurisdiction Default Rule (GAP-ACQ-007)

### 8.1 Decision

> **DECIDED:** For acquisition-sourced supplier provisioning where CRM omits the `jurisdiction` field in the handoff payload, Main Platform WEBHOOK-007 must default `organizations.jurisdiction` to `'IN'` (India).

### 8.2 Rationale

| Rationale point | Detail |
| --- | --- |
| **CRM does not currently provide jurisdiction** | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` (entity inventory + system-of-record draft) confirms the CRM `public.suppliers` table lacks a `jurisdiction` field. This is an external evidence finding recorded as a main-repo artifact. |
| **Current schema default is `'UNKNOWN'`** | `server/prisma/schema.prisma` line 1058: `jurisdiction String @default("UNKNOWN") @db.VarChar(100)`. The `'UNKNOWN'` default is correct for general platform provisioning but is insufficient for acquisition-sourced India-first suppliers. |
| **India-first acquisition context** | TexQtic's Surat-based field acquisition targets India-based fabric and yarn suppliers. Setting jurisdiction to `'UNKNOWN'` would produce poor discovery quality (the five-gate projection uses `jurisdiction` for surface filtering in future versions). |
| **`IN` is the correct launch default** | `IN` is the ISO 3166-1 alpha-2 country code for India. It is the correct platform value for India-based suppliers. |
| **Forward-compatible** | If CRM later supplies a `jurisdiction` value in its handoff payload, WEBHOOK-007 should use the CRM-supplied value (after validation) rather than overriding it with the default. The default is a fallback for absent `jurisdiction` only. |

### 8.3 Implementation Rules for WEBHOOK-007 (Future Constraint)

These rules are governance constraints. They do not authorize WEBHOOK-007 implementation.

| Rule | Statement |
| --- | --- |
| **Apply `IN` default only for acquisition-sourced provisioning** | The `IN` jurisdiction default applies only when WEBHOOK-007 is the caller — i.e., the provisioning request originates from the CRM acquisition handoff path. Other provisioning paths (control-plane admin provisioning, self-signup) must not use this default and must follow their own existing rules. |
| **CRM-supplied jurisdiction takes precedence** | If the CRM provisioning payload includes a non-null, non-empty `jurisdiction` field, WEBHOOK-007 must use the supplied validated value. |
| **Validate supplied jurisdiction values** | If CRM supplies a jurisdiction value, WEBHOOK-007 must validate it against the platform's accepted jurisdiction vocabulary before writing. An invalid jurisdiction value must result in a validation error, not silent acceptance. |
| **Multi-country normalization is deferred** | This decision covers India-first (`IN`) acquisition. A future normalization unit may add multi-country jurisdiction mapping rules. That unit is not opened by this artifact. |
| **Do not override `'UNKNOWN'` for non-acquisition paths** | The schema default `'UNKNOWN'` remains correct for general provisioning. WEBHOOK-007 must not globally change the platform's jurisdiction default. |

---

## §9 — Public Projection Safety

These rules apply to all current and future acquisition-stream surfaces.

| Rule | Applies to | Statement |
| --- | --- | --- |
| **Gate E: `external_orchestration_ref` prohibited** | All public APIs | `external_orchestration_ref` must never appear in `GET /api/public/b2b/suppliers`, `GET /api/public/supplier/:slug` (future), or any other unauthenticated or public-scoped endpoint. The existing Gate E enumeration in `publicB2BProjection.service.ts` and in the governance decision `TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md` explicitly prohibits this field. |
| **`jurisdiction` in public projection** | Public supplier APIs | `jurisdiction` is an allowed field in the B2B public discovery payload (per the five-gate model). It may appear in `GET /api/public/b2b/suppliers` and in future `GET /api/public/supplier/:slug` per the existing allowed-field model. Setting it to `'IN'` for India-first acquisition-sourced suppliers is a data-quality improvement, not a policy change. |
| **No orchestration ref in events for public consumers** | Event system | `external_orchestration_ref` must not be included in any event payload that could reach public or unauthenticated consumers. Audit/internal events may include it only in strictly internal-scoped event channels. |
| **CRM canonical ref is an internal seam** | All surfaces | The CRM canonical `external_orchestration_ref` value is operational internal data. It must never be derived from or surfaced to the public discovery API, buyer inquiry surface, or any unauthenticated consumer. |

---

## §10 — Impact on Acquisition Tracker

### 10.1 Gaps Closed by This Unit

| Gap ID | Description | Status after this unit |
| --- | --- | --- |
| **GAP-ACQ-001** | `external_orchestration_ref` dual-column authority unresolved | **CLOSED** — `organizations.external_orchestration_ref` is the canonical column. Decision recorded in this artifact. |
| **GAP-ACQ-007** | CRM jurisdiction payload gap | **CLOSED** — `IN` is the acquisition-sourced jurisdiction default when CRM omits jurisdiction. Decision recorded in this artifact. |

### 10.2 Gaps Unaffected by This Unit

| Gap ID | Status unchanged | Note |
| --- | --- | --- |
| GAP-ACQ-002 | OPEN | `supplier_profile.*` events not registered. Requires EVENTS-003. |
| GAP-ACQ-004 | OPEN | No OpenAPI entries for acquisition endpoints. Self-closes per implementing unit. |
| GAP-ACQ-005 | OPEN | `buyer_inquiry.*` and `public_supplier_profile.*` events not registered. Requires EVENTS-003. |
| GAP-ACQ-006 | OPEN | No rate-limit budget for inquiry endpoint. Requires INQUIRY-004. |

### 10.3 Acquisition Stream Tracker Update Guidance

The acquisition tracker v2 (`docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md`) should be updated in a future tracker-refresh prompt to record:

- GAP-ACQ-001: CLOSED (this artifact)
- GAP-ACQ-007: CLOSED (this artifact)
- Unit F (ORF-AUTHORITY-006): DECISION_RECORDED

> That tracker update is not part of this unit. It should be a separate docs-only prompt after this artifact is committed.

### 10.4 WEBHOOK-007 Remaining Blockers

WEBHOOK-007 (`POST /api/internal/acquisition/provision-supplier`) remains BLOCKED. The following conditions must ALL be met before WEBHOOK-007 may open:

| Blocker | Condition for unblocking |
| --- | --- |
| **ORF-AUTHORITY-006** | ✅ **RESOLVED by this artifact** |
| **EVENTS-003** | OPEN — Team A event authority sign-off required; `supplier_profile.viewed.v1`, `public_supplier_profile.provision_requested.v1`, `public_supplier_profile.provisioned.v1`, `public_supplier_profile.gate_failed.v1` must be registered in both `shared/contracts/event-names.md` and `KnownEventName` in `server/src/lib/events.ts` |
| **Auth model for internal webhook caller** | Not yet defined — WEBHOOK-007 must use authenticated internal caller or signed webhook. Auth model must be specified before build. |
| **Callback URL design** | Not yet defined — CRM must have a known callback URL scheme for provisioning result notification. |
| **OpenAPI path** | GAP-ACQ-004 — must be authored for `POST /api/internal/acquisition/provision-supplier` before or within the WEBHOOK-007 implementation wave. |
| **Response and idempotency contract** | Not yet defined — the full HTTP response shape, idempotency key header, and conflict response schema must be specified in the WEBHOOK-007 design prompt. |
| **Universal gate cleared** | Layer 0 `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` must be cleared. Paresh must issue explicit written authorization after TTP legal counsel feedback is recorded. |

### 10.5 ROUTE-001 Benefit

`GET /api/public/supplier/:slug` (ROUTE-001) is not blocked by GAP-ACQ-001 or GAP-ACQ-007. The profile endpoint routes by `organizations.slug`, not by `external_orchestration_ref`. However, this decision clarifies the handoff model that ROUTE-001 data consumers will eventually depend on.

---

## §11 — Boundary Preservation

These boundary rules are carried forward from the acquisition engine boundary design and the CRM canonical handoff contract.

| Boundary rule | Statement |
| --- | --- |
| **CRM must not write directly to Main Platform tables** | CRM must interact with the Main Platform only through the governed provisioning handoff endpoint (WEBHOOK-007 when built). CRM must not hold a direct database connection to the TexQtic Supabase instance and must not write to platform tables directly. |
| **CAE must not write directly to Main Platform tables** | The Customer Acquisition Engine follows the same rule. It may trigger CRM provisioning actions, which in turn use the governed provisioning endpoint. It must not bypass the provisioning seam. |
| **Aggregator does not own provisioning** | The Aggregator discovery surface (`GET /api/tenant/aggregator/discovery`) is a read-only authenticated surface. The Aggregator does not own supplier provisioning, slug generation, or public profile lifecycle. Per `AGGREGATOR-DIRECTORY-ACQUISITION-INTEGRATION-DESIGN-v1.md` decision D-01, `GET /api/public/supplier/:slug` (ROUTE-001) is a general Main Platform surface, not Aggregator-owned. |
| **Main Platform owns platform org creation/update** | Only the Main Platform (via WEBHOOK-007 when implemented) may create or update `organizations` records for acquisition-sourced suppliers. No external system may write directly to the `organizations` table. |
| **Main Platform owns slug generation** | `organizations.slug` is generated and owned by the Main Platform. CRM must not dictate the slug value. CRM may supply `legal_name`, `org_type`, `jurisdiction`, and segment data; the platform derives the slug. |
| **Main Platform owns public projection** | The five-gate projection safety architecture (`publicB2BProjection.service.ts`) is Main Platform-owned. No external system may override Gate A–E logic. |
| **Main Platform owns provisioning idempotency** | Idempotency on `organizations.external_orchestration_ref` is enforced by the Main Platform. CRM may only check idempotency state indirectly via WEBHOOK-007 response — it must not access the `organizations` table directly to check for existing records. |

---

## §12 — Readiness Verdict

| Item | Status |
| --- | --- |
| **ORF-AUTHORITY-006 decision** | RECORDED — This artifact |
| **GAP-ACQ-001** | **CLOSED** — `organizations.external_orchestration_ref` is canonical |
| **GAP-ACQ-007** | **CLOSED** — `IN` default for acquisition-sourced suppliers when CRM omits jurisdiction |
| **WEBHOOK-007** | **BLOCKED** — Multiple conditions remain (see §10.4); earliest unblock requires EVENTS-003 + auth model + OpenAPI contract + Layer 0 clearance |
| **ROUTE-001** | **NOT BLOCKED by this decision** — ROUTE-001 (public supplier profile endpoint) routes by slug, not by orchestration ref; it benefits from the clarified handoff model but does not depend on it |
| **EVENTS-003** | **NOT BLOCKED by this decision** — Should proceed if Team A event authority is ready; does not depend on ORF-AUTHORITY-006 |
| **CRM repo work** | **EXTERNAL** — CRM must implement the provisioning handoff payload with the canonical CRM onboarding case UUID as the `external_orchestration_ref` value when WEBHOOK-007 is built; that work belongs in the CRM repo |
| **Next recommended unit** | **EVENTS-003** — Register `supplier_profile.*`, `buyer_inquiry.*`, and `public_supplier_profile.*` event names in `shared/contracts/event-names.md` and `server/src/lib/events.ts` with Team A sign-off. If Team A event authority is not yet available, **ROUTE-001 planning** may proceed in parallel (ROUTE-001 does not require EVENTS-003 at planning stage). |

---

## §13 — Invariants Confirmed

| Invariant | Confirmed |
| --- | --- |
| No code changed | ✅ |
| No schema mutated | ✅ |
| No migration created | ✅ |
| No route added | ✅ |
| No service modified | ✅ |
| No frontend modified | ✅ |
| No event registered | ✅ |
| No OpenAPI contract modified | ✅ |
| No Layer 0 control file modified | ✅ |
| No `.env` file modified | ✅ |
| No secrets printed | ✅ |
| `external_orchestration_ref` not exposed publicly | ✅ |
| `org_id` / tenant isolation preserved | ✅ |
| WEBHOOK-007 not opened | ✅ |
| ROUTE-001 not opened | ✅ |
| CRM-direct DB access not authorized | ✅ |

---

*Produced under TECS discipline v1.4 — governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md.  
HEAD at time of artifact creation: `1b7ecda`. Date: 2026-05-15.*
