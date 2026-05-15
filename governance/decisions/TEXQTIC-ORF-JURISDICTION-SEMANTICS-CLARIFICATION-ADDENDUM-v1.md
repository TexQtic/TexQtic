# TEXQTIC-ORF-JURISDICTION-SEMANTICS-CLARIFICATION-ADDENDUM-v1

**Unit ID:** MAIN-PLATFORM-ORF-JURISDICTION-CLARIFICATION-ADDENDUM-001  
**Title:** Jurisdiction Semantics Clarification — `organizations.jurisdiction` is Country/Market Jurisdiction, Not Court Forum  
**Status:** DECIDED — Docs/governance clarification only. No implementation authorized.  
**Date:** 2026-05-15  
**Parent Decision:** `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` (ORF-AUTHORITY-006)  
**Authorized by:** Paresh (explicit — submitted as ORF-JURISDICTION-CLARIFICATION-ADDENDUM-001 prompt; docs/governance unit only; Layer 0 hold applies to implementation units only)  
**Basis:** Repo-truth inspection of `server/prisma/schema.prisma`, `publicB2BProjection.service.ts`, DPP snapshot design, QA seed matrix, and all governance/doctrine docs containing "jurisdiction", "Surat", "Gujarat", "court", "forum", or "geo" references.

---

## §0 — Layer 0 and Authorization

Layer 0 posture at HEAD `0be3d93` is unchanged: `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`. This unit is docs/governance only. Paresh explicitly authorized it. TTP legal hold does not apply to docs/governance clarification units.

**What this unit does NOT authorize:**

- WEBHOOK-007 implementation
- ROUTE-001 implementation
- Any schema mutation, migration, or DB change
- Any court/legal forum field creation
- Any modification to Layer 0 control files

---

## §1 — Purpose

The parent decision `TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` (ORF-AUTHORITY-006, §8) states:

> "For acquisition-sourced supplier provisioning where CRM omits the `jurisdiction` field in the handoff payload, Main Platform WEBHOOK-007 must default `organizations.jurisdiction` to `'IN'` (India)."

Paresh has raised the following concern:

> "If `jurisdiction` means **court jurisdiction** (i.e., the court forum or legal venue where disputes are heard), then `IN` (India) may be too broad — the correct court venue for TexQtic's Surat-first operations would be Surat, not India."

This addendum resolves that concern. It definitively establishes the semantics of `organizations.jurisdiction` based on comprehensive repo-truth inspection and states the boundary between:

1. `organizations.jurisdiction` — country/market/regulatory jurisdiction (a business entity attribute used for geographic discovery and DPP projection)
2. Legal court jurisdiction / dispute forum — a legal terms-of-service concept that is NOT represented by this field

This addendum does not change any code, schema, migration, route, event registry, or OpenAPI contract. It clarifies the ORF-AUTHORITY-006 rule and provides guardrails for WEBHOOK-007 implementers to prevent misinterpretation.

---

## §2 — Source Artifacts and Files Reviewed

### 2.1 Primary Governance Artifacts

| Artifact | Path | Key content reviewed |
| --- | --- | --- |
| ORF-AUTHORITY-006 decision | `governance/decisions/TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` | §8 jurisdiction default rule (GAP-ACQ-007 resolution); the rule this addendum clarifies |
| Acquisition tracker v2 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | GAP-ACQ-007 description; tracker line for ORF-AUTHORITY-006; WEBHOOK-007 blocker list |
| Acquisition stream refresh v1 | `docs/product-truth/MAIN-PLATFORM-ACQUISITION-AND-AGGREGATOR-STREAM-REPO-TRUTH-REFRESH-AND-OPENING-v1.md` | §6.8 GAP-ACQ-007 full description; discovery quality risk |
| CRM data reality reconciliation | `CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md` | Confirms CRM `public.suppliers` lacks `jurisdiction` field |
| CRM canonical business model | `CRM-PLATFORM-CANONICAL-BUSINESS-MODEL-AND-HANDOFF-CONTRACT-v1.md` | Cross-system handoff contract; no court/legal forum mentions |

### 2.2 Public Projection Decision Docs

| Artifact | Path | Jurisdiction-related finding |
| --- | --- | --- |
| B2B public discovery and inquiry model decision | `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | Uses "geography" and "geographic" as discovery qualifiers (lines 35, 56, 95, 118); no court jurisdiction mentions |
| Public visibility and projection model decision | `governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md` | No jurisdiction mentions; covers posture/projection eligibility |

### 2.3 Schema and Service Files

| File | Lines inspected | Key finding |
| --- | --- | --- |
| `server/prisma/schema.prisma` | Lines 1054–1140 | `jurisdiction` at line 1058; sibling fields are `legal_name`, `registration_no`, `org_type`, `slug`, `status`, `plan` — all organizational identity/market fields |
| `server/src/services/publicB2BProjection.service.ts` | Lines 55–105, 140–170 | `jurisdiction` is used as `geo` filter: `...(params.geo ? { jurisdiction: params.geo } : {})`. Discovery param is named `geo`. Explicitly geographic. |

### 2.4 Architecture and Design Docs

| Artifact | Path | Key finding |
| --- | --- | --- |
| DPP snapshot views design | `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md` | Line 150: `jurisdiction` from `organizations.jurisdiction` is listed under "Manufacturer" group alongside `legal_name` and `registration_no`. Manufacturer jurisdiction = country of registration. |
| DPP TECS design | `docs/TECS-DPP-PASSPORT-FOUNDATION-001-DESIGN-v1.md` | Contains `manufacturerJurisdiction: string | null; // organizations.jurisdiction` — explicitly labeled manufacturer jurisdiction. |
| QA tenant seed matrix | `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-B-STAGING-SEED-PLAN.md` | `organizations.jurisdiction = 'IN'` used consistently for all test organizations (7 occurrences). |
| Doctrine v1.4 Part 3 | `docs/doctrine/doctrine_v1_4_part_3_EXECUTABLE.md` | Line 1760: `"city": "Surat"` in a trade/logistics event payload alongside `"country": "IN"`. Surat is used as a city-level geographic location in logistics context, not as a court venue. |

### 2.5 Repo-Wide Grep Results

| Search pattern | Files searched | Finding |
| --- | --- | --- |
| `court jurisdiction` | All repo files | 0 matches in relation to `organizations.jurisdiction` |
| `legal jurisdiction` | All repo files | 0 matches in relation to `organizations.jurisdiction` |
| `dispute forum` | All repo files | 0 matches in relation to `organizations.jurisdiction` |
| `governing law` | `governance/**` | 1 match in an archived governance analysis doc; not related to `organizations.jurisdiction` |
| `Surat` | All repo files | 3 matches: (1) ORF-AUTHORITY-006 (India-first context); (2) DPP doctrine payload as city field; (3) this addendum. No court venue context anywhere. |
| `Gujarat` | All repo files | 0 matches |
| `ISO 3166` / country code / `geo` | All repo files | Multiple: consistently confirm `IN` as India country code in geographic/market context |

---

## §3 — Ambiguity Statement

### 3.1 The Concern

The word "jurisdiction" carries two possible meanings in commercial and legal contexts:

| Meaning | Description | Example values |
| --- | --- | --- |
| **Country/market/regulatory jurisdiction** | The country or legal territory in which an organization is registered, operates, or is subject to local commerce and regulatory law | `IN`, `US`, `GB`, `AE` (ISO 3166-1 alpha-2 country codes) |
| **Court jurisdiction / dispute forum** | The court, tribunal, or city-level venue in which contractual disputes between parties are heard and adjudicated | `Surat, Gujarat, India`, `New Delhi`, `Delhi High Court`, `LCIA London` |

### 3.2 Paresh's Concern — Recorded

Paresh has raised the following concern, recorded verbatim:

> "If 'jurisdiction' means court jurisdiction, then the correct value should be Surat, not India."

This concern is valid in the legal sense: if `organizations.jurisdiction` were a court forum field, then for TexQtic's Surat-first India operations, the correct court venue would be expressed as "Surat, Gujarat, India" or "Courts at Surat" — not the country-level `IN`.

However, as established by repo-truth inspection (§4), this concern does not apply to `organizations.jurisdiction` because that field is definitively a country/market jurisdiction field, not a court forum field.

### 3.3 Why This Clarification Matters

WEBHOOK-007, when eventually implemented, will write to `organizations.jurisdiction`. An implementer who interprets "jurisdiction" as "court forum" might:

- Reject `IN` as "too broad" and look for a city/court value
- Store `Surat` in the field (incorrect — `Surat` is not an ISO country code)
- Store `India` as a full English name rather than `IN` (incorrect — the field uses ISO 3166-1 alpha-2 codes by repo convention)

This addendum prevents those errors by establishing the field semantics before implementation.

---

## §4 — Repo-Truth Finding

### 4.1 Primary Finding

> **`organizations.jurisdiction` is country/market/regulatory jurisdiction. It is NOT a court forum field.**

This finding is supported by five independent lines of evidence from repo inspection.

### 4.2 Evidence Chain

#### Evidence 1 — Schema Sibling Fields

`organizations.jurisdiction` sits at schema.prisma line 1058 alongside:

```
legal_name       String  @db.VarChar(500)           # company's legal registered name
jurisdiction     String  @default("UNKNOWN") @db.VarChar(100)
registration_no  String? @db.VarChar(200)             # company registration/CIN number
org_type         String  @default("B2B") @db.VarChar(50)
```

`registration_no` is the company's national business registration number (e.g., Indian CIN number). A company registers in a **country** (India), not in a court venue. The field cluster confirms these are organizational identity fields, not legal forum fields.

#### Evidence 2 — Public B2B Projection: `geo` Filter

`server/src/services/publicB2BProjection.service.ts` line 147–148:

```typescript
// Geo filter: jurisdiction exact match when provided
...(params.geo ? { jurisdiction: params.geo } : {}),
```

The API consumer passes a `geo` parameter (e.g., `geo=IN`) and the service filters organizations by `jurisdiction`. The API parameter is explicitly named `geo` — geographic/country. Buyers filter suppliers by country of operation, not by court venue.

#### Evidence 3 — DPP Snapshot: Manufacturer Jurisdiction

`docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md` (DPP = Digital Product Passport):

| DPP Group | Field | Source |
| --- | --- | --- |
| Manufacturer | `legal_name` | `organizations.legal_name` |
| **Manufacturer** | **`jurisdiction`** | **`organizations.jurisdiction`** |
| Manufacturer | `registration_no` | `organizations.registration_no` |

The DPP snapshot presents this field as the manufacturer's jurisdiction — the country where the manufacturing organization is registered. This is a product provenance field used for supply chain transparency, regulatory compliance, and trade trust scoring. It is definitively country/market jurisdiction.

#### Evidence 4 — QA Seed Matrix: Consistent `IN` Usage

`docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-B-STAGING-SEED-PLAN.md` uses `organizations.jurisdiction = 'IN'` for all 7 test organizations. `IN` is the ISO 3166-1 alpha-2 country code for India. No city or court venue values appear anywhere.

#### Evidence 5 — Zero Court Jurisdiction Mentions in Relation to This Field

Repo-wide search for "court jurisdiction", "dispute forum", "governing law", "legal venue" found **zero results** associated with `organizations.jurisdiction`. The repo's court/dispute concept is entirely in separate systems: trade dispute workflows (`EscalationEvent`, `resolveDispute`, dispute state machines), TTP legal counsel packet, and arbitration scoring — none of which use `organizations.jurisdiction`.

### 4.3 Surat Context in the Repo

The only occurrences of "Surat" in the repo are:

1. **ORF-AUTHORITY-006** (this decision's parent): `"TexQtic's Surat-based field acquisition targets India-based fabric and yarn suppliers"` — geographic business context.
2. **Doctrine v1.4 Part 3**: `"city": "Surat"` in a trade logistics event payload alongside `"country": "IN"` — city-level logistics geography, not a court venue.
3. **This addendum**: Documenting Paresh's concern (§3.2).

Surat is referenced in the repo as a **geographic business location** (TexQtic's primary acquisition city; a major textile hub). It is not referenced as a court venue anywhere.

---

## §5 — Decision

### 5.1 Confirmed Semantics

> **DECIDED: `organizations.jurisdiction` is country/market/regulatory jurisdiction.**

It represents the country (as ISO 3166-1 alpha-2 code) in which an organization is registered, operates, and is subject to regulatory law. In the Main Platform, it serves two distinct purposes:

| Purpose | Description |
| --- | --- |
| **Geographic discovery filter** | Buyers filter public supplier profiles by country. `GET /api/public/b2b/suppliers?geo=IN` returns India-based suppliers. |
| **DPP manufacturer provenance** | The Digital Product Passport presents the manufacturer's country of registration as a supply chain transparency attribute. |

### 5.2 Jurisdiction Default Rule Confirmed Correct

ORF-AUTHORITY-006 §8.1 stated:

> "For acquisition-sourced supplier provisioning where CRM omits the `jurisdiction` field, WEBHOOK-007 must default `organizations.jurisdiction` to `'IN'` (India)."

This rule is **confirmed correct**. `IN` is the ISO 3166-1 alpha-2 country code for India. It is the appropriate market jurisdiction for all Surat-based fabric and yarn suppliers acquired by TexQtic's India-first acquisition engine.

The value `IN` in this context means: "This supplier operates in India, is registered under Indian law, and should appear in geographic discovery results filtered for India." It does not mean "disputes about this supplier are heard in Indian courts."

---

## §6 — Court Jurisdiction / Dispute Forum Rule

### 6.1 Court Jurisdiction Is Not Stored in `organizations.jurisdiction`

Court jurisdiction (the legal forum where contractual disputes are adjudicated) is fundamentally different from market/regulatory jurisdiction. It is a legal terms-of-service concept, not an organizational entity attribute.

**Authoritative rule:**

> `organizations.jurisdiction` must NOT be used to record or derive the court/dispute forum for TexQtic platform legal terms, supplier contracts, or trade agreements.

### 6.2 Correct Location for Court/Forum Rules

If TexQtic's legal terms require a court jurisdiction or dispute forum clause (e.g., "Subject to the exclusive jurisdiction of courts at Surat, Gujarat, India"), that rule belongs in:

- TexQtic's legal terms of service document (external legal artifact)
- A dedicated TTP/legal governance artifact (internal — a future unit outside the scope of WEBHOOK-007)
- NOT in `organizations.jurisdiction`

### 6.3 Surat as Court Venue — If Ever Required

If Paresh decides that a Surat-specific court venue must be recorded in platform data for legal reasons (e.g., supplier contracts that specify "all disputes to be resolved at Surat courts"), the appropriate approach is:

- A new schema field (e.g., `dispute_venue` or `legal_forum`) on the relevant contract/agreement model — not on `organizations`
- A separate governance decision artifact authorizing that field design
- A schema migration and Prisma regeneration following the mandatory SQL-first sequence
- Legal counsel review (this falls squarely within the existing TTP legal gate)

This is explicitly **not opened by this addendum**. Any such field would require a separate governance prompt with explicit Paresh authorization.

### 6.4 Candidate Wording for Legal Venue (If Ever Authored)

If a future legal governance artifact is created for Surat court venue, candidate wording is:

```
"Subject to the exclusive jurisdiction of the courts at Surat, Gujarat, India."
```

This wording is offered as a documentation placeholder only. It is subject to legal counsel review and is not an operative clause until a legal team approves it. This addendum does not authorize its use.

---

## §7 — Impact on ORF-AUTHORITY-006

### 7.1 GAP-ACQ-007 Closure Confirmed Valid

ORF-AUTHORITY-006 §8 closed GAP-ACQ-007 with the rule: `organizations.jurisdiction = 'IN'` for acquisition-sourced suppliers.

This addendum confirms that closure is valid and correct. The ambiguity Paresh raised does not affect the correctness of the rule — `IN` is the right value for country/market jurisdiction for India-first acquisition.

**GAP-ACQ-007 remains CLOSED.**

### 7.2 How ORF-AUTHORITY-006 Should Be Read

ORF-AUTHORITY-006 §8 should be read as follows (with this addendum as a clarifying supplement):

| ORF-AUTHORITY-006 text | Reading per this addendum |
| --- | --- |
| "`organizations.jurisdiction` defaults to `'IN'` (India)" | `IN` = ISO 3166-1 alpha-2 country code for India. Country/market jurisdiction. |
| "`IN` is the ISO 3166-1 alpha-2 country code for India" | Explicitly confirmed — `IN` is a country code, not a city or court venue |
| "consistent with TexQtic's primary market" | The "primary market" is India (country-level), not Surat (city-level) |

No amendment to ORF-AUTHORITY-006 is required. This addendum supplements it by establishing the semantic boundary.

### 7.3 WEBHOOK-007 Must Apply `IN` as Country/Market Jurisdiction

WEBHOOK-007, when eventually implemented, must:

- Write `'IN'` to `organizations.jurisdiction` when CRM omits jurisdiction
- Treat `'IN'` as the India country code in ISO 3166-1 alpha-2 format
- NOT interpret `'IN'` as a court venue, legal forum, or city designation
- NOT store `Surat`, `Gujarat`, `India` (full name), or any court venue string in `organizations.jurisdiction`

---

## §8 — Implementation Guardrails for WEBHOOK-007

These guardrails are recorded as binding governance constraints. They do **not** authorize WEBHOOK-007 implementation.

| Guardrail | Statement |
| --- | --- |
| **Use ISO 3166-1 alpha-2 format** | `organizations.jurisdiction` accepts ISO 3166-1 alpha-2 country codes. The India default is `'IN'` — two characters, uppercase. Do not store `'India'`, `'india'`, `'IND'`, or `'IN_SURAT'`. |
| **Do not store city names** | `'Surat'`, `'Mumbai'`, `'Delhi'` and other city names must NOT be stored in `organizations.jurisdiction`. The field does not have city-level granularity. |
| **Do not store court venue strings** | `'Surat, Gujarat, India courts'`, `'subject to Surat jurisdiction'`, or any legal forum string must NOT be stored in `organizations.jurisdiction`. |
| **Validate supplied CRM values** | If CRM later supplies a `jurisdiction` value, validate it against ISO 3166-1 alpha-2 before writing. A value that is not a valid ISO country code must be rejected with a validation error. |
| **No public profile interprets `IN` as court venue** | Any public-facing rendering of `jurisdiction = 'IN'` must present it as country/market context (e.g., "India" as country of operation), never as a legal forum or dispute venue. |
| **Court jurisdiction requires separate field/design** | If legal forum tracking is ever required in platform data, create a dedicated field on the appropriate contract/agreement model in a separate authorized schema change. Do not reuse `organizations.jurisdiction`. |

---

## §9 — Readiness Verdict

| Item | Status |
| --- | --- |
| **Jurisdiction semantics** | **CLARIFIED** — `organizations.jurisdiction` is country/market/regulatory jurisdiction. Not court forum. |
| **ORF-AUTHORITY-006 validity** | **CONFIRMED VALID** — The parent decision's `IN` default rule is correct for India as country/market jurisdiction. |
| **GAP-ACQ-007** | **REMAINS CLOSED** — The ambiguity is resolved; the rule is unaffected. |
| **Tracker update required** | **NO** — GAP-ACQ-007 closed status does not change. ORF-AUTHORITY-006 is fully valid. No tracker field needs updating. The tracker may optionally reference this addendum as a supplementary clarification in a future tracker refresh prompt if Paresh chooses. |
| **Court forum / Surat legal venue** | **NOT OPENED** — If Surat court venue is needed, a separate schema field, separate governance artifact, and legal counsel review are required. This addendum does not open that unit. |
| **WEBHOOK-007** | **STILL BLOCKED** — For all reasons stated in ORF-AUTHORITY-006 §10.4: EVENTS-003 incomplete; auth model undefined; callback URL not designed; OpenAPI contract not authored; response/idempotency contract not defined; Layer 0 legal gate active. This addendum resolves no new blockers and opens no new units. |
| **ROUTE-001** | **NOT BLOCKED** — Unaffected by this addendum. |
| **EVENTS-003** | **NOT BLOCKED by this addendum** — Unaffected. |
| **Next recommended unit** | Unchanged from ORF-AUTHORITY-006: **EVENTS-003** if Team A event authority is ready; **ROUTE-001 planning** may proceed in parallel. |

---

## §10 — Invariants Confirmed

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
| ORF-AUTHORITY-006 not modified | ✅ |
| No court jurisdiction field created | ✅ |
| No `.env` file modified | ✅ |
| No secrets printed | ✅ |
| `org_id` / tenant isolation preserved | ✅ |
| WEBHOOK-007 not opened | ✅ |
| ROUTE-001 not opened | ✅ |

---

*Produced under TECS discipline v1.4 — governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md.  
HEAD at time of artifact creation: `0be3d93`. Date: 2026-05-15.  
Parent decision: `TEXQTIC-ORCHESTRATION-REF-CANONICAL-AUTHORITY-DECISION-v1.md` (HEAD `0be3d93`, commit `0be3d93`).*
