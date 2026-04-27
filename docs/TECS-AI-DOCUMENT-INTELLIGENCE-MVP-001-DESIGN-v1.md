# TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 — Design v1

**Unit ID:** TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001
**Status:** DESIGN_ACTIVE
**Authorized by:** Paresh (design-only authorization — implementation NOT opened)
**Design date:** 2026-04-27
**Governance unit type:** AI-Assisted Document Intelligence
**Predecessor unit:** TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 (VERIFIED_COMPLETE, 2026-04-27)
**AI Foundation:** TECS-AI-FOUNDATION-DATA-CONTRACTS-001 (IMPLEMENTATION_COMPLETE, f671995)

> **Design-only document.** No code changes, schema changes, API implementation, frontend
> implementation, AI provider calls, OCR pipelines, or automatic data writes are included in
> this artifact. Each implementation slice requires explicit Paresh authorization before opening.

---

## A. Problem Statement

### A.1 Why TexQtic Needs AI-Assisted Document Intelligence

TexQtic operates as a B2B textile platform where supplier trust, product legitimacy, and compliance
readiness directly influence buyer confidence and transaction flow. Suppliers upload certification
documents, lab test reports, and compliance declarations to evidence their product claims. At MVP
scale these documents are uploaded as files and stored with metadata, but their contents are
opaque — field extraction is manual, error-prone, and does not feed structured data into any
platform workflow.

This creates four compounding problems:

1. **Unverified claims.** Suppliers self-declare certification metadata (certificate number, issuer,
   expiry). The platform stores what the supplier types, not what the document says. There is no
   cross-check against the actual uploaded file.

2. **Buyer trust gap.** Buyers can see that a supplier has uploaded a document, but cannot assess
   the quality or recency of the underlying certificate from the platform's structured data alone.
   Trust signals are weak.

3. **DPP readiness blocked.** Digital Product Passport (DPP) and export compliance workflows
   require structured certification data: standard name, issue date, expiry date, lab name, tested
   parameters, pass/fail results, reference numbers. Without AI-assisted extraction this data must
   be keyed in manually at scale — which will not happen.

4. **Compliance audit friction.** Buyer procurement teams and third-party auditors need to verify
   supplier compliance quickly. Manual document review across hundreds of suppliers is not
   scalable. Structured extracted data enables audit-ready packs.

### A.2 What This Unit Solves (MVP)

The MVP introduces **assistive extraction only** — an AI pass over uploaded documents that:
- Attempts to identify the document type.
- Extracts candidate field values (certificate number, issuer, dates, material, tested standard,
  results) into a structured draft.
- Attaches a per-field and overall confidence score.
- Surfaces the draft to a human reviewer (supplier or admin) for confirmation, editing, or
  rejection before any extracted value is used in platform workflows.

The MVP is **not** autonomous certification validation. It does not:
- Mark a certificate as "valid" or "approved" without human review.
- Replace the existing certification lifecycle state machine.
- Feed extraction output directly into public-facing surfaces.
- Make compliance decisions.

### A.3 Relationship to Existing Modules

| Module | Relationship |
|---|---|
| `Certification` model (Prisma) | Source entities for document association |
| Certification lifecycle SM (G-022) | Governs certificate state; extraction does NOT change lifecycle state |
| `document_embeddings` (G-028 / RAG) | Document text may be indexed; extraction pipeline is separate |
| Supplier Profile Completeness (TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001) | Extraction results may improve completeness scores in future — not MVP |
| DPP Passport (future) | Primary downstream consumer of approved extracted fields |
| Audit packs (future) | Extraction results as structured evidence |

---

## B. MVP Scope

### B.1 Supported Document Types (MVP)

| Document Type | Description | MVP Support |
|---|---|---|
| Certification PDF | GOTS, OEKO-TEX, ISO 9001, REACH compliance certificates | ✅ MVP |
| Textile lab test report | Colorfastness, tensile strength, GSM, shrinkage, pH, azo dye tests | ✅ MVP |
| Compliance declaration | Supplier declaration of conformity (DoC) | ✅ MVP |
| Inspection report | Third-party factory/product inspection report, low-risk structured forms | ✅ MVP (low-risk structured) |
| Uploaded supplier evidence | General compliance evidence PDFs submitted as supporting docs | ✅ MVP |
| Image-based certificate scan | JPG/PNG scan of printed certificate | ✅ MVP (best-effort; lower confidence) |

### B.2 Explicitly Excluded from MVP

| Excluded Item | Reason |
|---|---|
| Legal contract interpretation | Legal text requires specialist review; out of AI safety scope |
| Automatic certificate approval | Certificate lifecycle state changes require human authority |
| Payment or escrow decisions | Constitutionally forbidden from AI paths |
| Buyer ranking or scoring | No supplier-comparative scoring in AI output |
| Risk scoring | Control-plane domain; out of tenant AI scope |
| Regulatory submission automation | Requires jurisdictional compliance authority |
| Public DPP publication | DPP is future; extraction does not trigger publication |
| Multi-document cross-reference | Comparing two documents together for conflict — future |
| Audio or video evidence | Not relevant to certification documents |
| Handwritten free-text interpretation beyond structured fields | Low reliability; scoped to structured/semi-structured documents |

### B.3 MVP Scale Assumptions

- One document processed per extraction request.
- Documents up to reasonable PDF/image file size (implementation to define exact limit).
- Extraction is on-demand (triggered by user action), not background batch.
- Extraction results are stored as draft records; they do not auto-promote.
- Language: English primary; multi-language documents will degrade confidence scores gracefully.

---

## C. Extracted Field Model

### C.1 Core Extracted Fields

| Field | Type | Description | Confidence Tracked |
|---|---|---|---|
| `document_type` | `enum / string` | Classified document type (e.g., `GOTS_CERTIFICATE`, `LAB_TEST_REPORT`, `DOC`, `INSPECTION_REPORT`, `UNKNOWN`) | ✅ |
| `issuer_name` | `string \| null` | Name of the issuing body, certification authority, or lab | ✅ |
| `certificate_number` | `string \| null` | Official certificate or reference number | ✅ |
| `report_number` | `string \| null` | Lab report or test report number (where applicable) | ✅ |
| `holder_name` | `string \| null` | Certificate or report holder (may differ from uploader) | ✅ |
| `product_name` | `string \| null` | Product or material name as stated in document | ✅ |
| `material_composition` | `string \| null` | Fibre/material composition as stated in document | ✅ |
| `standard_name` | `string \| null` | Standard or regulation referenced (e.g., GOTS 6.0, ISO 105-E04) | ✅ |
| `test_parameters` | `string[] \| null` | List of test parameters performed | ✅ |
| `test_results` | `object \| null` | Extracted test result values (parameter → result/value) | ✅ |
| `issue_date` | `ISO8601 date \| null` | Date the certificate or report was issued | ✅ |
| `expiry_date` | `ISO8601 date \| null` | Expiry date if stated; null if not present or perpetual | ✅ |
| `validity_status_candidate` | `"VALID" \| "EXPIRED" \| "EXPIRING_SOON" \| "UNKNOWN"` | Computed from `issue_date`/`expiry_date`; candidate only — not authoritative | ✅ |
| `country_or_lab_location` | `string \| null` | Stated country, lab name, or testing location | ✅ |
| `uploaded_by` | `user_id ref` | Who uploaded the source document (from session context) | N/A (system-set) |
| `source_file_id` | `string` | Reference to the original uploaded file record | N/A (system-set) |
| `confidence_score` | `number [0,1]` | Overall extraction confidence (average of field-level scores) | N/A (aggregate) |
| `human_review_required` | `true` | Structural; always true; cannot be overridden | N/A (structural constant) |
| `extraction_notes` | `string \| null` | AI-generated notes on document quality, ambiguities, or extraction limitations | N/A |

### C.2 Field-Level Confidence Schema

Every extracted field (except system-set fields) carries its own confidence annotation:

```
ExtractedField {
  field_name: string
  raw_value: string | null          // As found in document
  normalized_value: string | null   // Parsed/normalized form (dates → ISO, etc.)
  confidence: number                // [0, 1] — AI confidence for this field
  source_region: string | null      // Textual region in document where found (debug/review aid)
  flagged_for_review: boolean       // true if confidence < threshold or value appears anomalous
}
```

### C.3 Confidence Thresholds (Design Guidance)

| Confidence Range | Meaning | UI Treatment |
|---|---|---|
| ≥ 0.85 | High confidence | Shown with light highlight; reviewer can approve quickly |
| 0.50 – 0.84 | Medium confidence | Shown with amber indicator; reviewer should verify |
| < 0.50 | Low confidence | Flagged red; reviewer must explicitly confirm or correct |
| `null` / not extracted | Field not found | Shown as blank with "Not found in document" label |

### C.4 Unknown and Null Handling

- Fields not found in the document: `raw_value: null`, `normalized_value: null`, `confidence: 0.0`.
- Ambiguous values (e.g., date format unclear): extracted as `raw_value` with low confidence;
  reviewer sees the raw text for manual parsing.
- Documents where classification is impossible: `document_type: "UNKNOWN"`, overall
  `confidence_score < 0.30`, `extraction_notes` explains the limitation.
- `human_review_required` is **always `true`** regardless of confidence. This is structural and
  cannot be lowered by AI output.

---

## D. Human Review Boundary

### D.1 Governing Principle

All extraction output from this unit is a **draft** — never authoritative. The human reviewer
is the sole authority for any extracted value to become a platform-usable fact.

> **Governance label (hardcoded, must appear on all extraction review surfaces):**
> `AI-generated extraction · Human review required before acting on any extracted data`

This label is structural, not advisory. It must appear on every surface that renders extraction
output. It cannot be removed, hidden, or made conditional.

### D.2 Human Review Rules

1. **No certificate becomes "verified" automatically.** The certification lifecycle state machine
   (APPROVED / PENDING / REJECTED states) is controlled exclusively by human action. AI extraction
   does not transition any lifecycle state.

2. **Low-confidence fields must be flagged.** Any field with `confidence < 0.50` must be
   visually flagged in the review panel. Reviewers must explicitly act on flagged fields — they
   cannot be auto-approved in bulk.

3. **Original file is the source of truth.** Extracted fields are derived from the document.
   The original uploaded file remains the canonical record. If there is any conflict between the
   extracted value and the document, the document wins.

4. **Reviewer can reject the entire extraction.** If the document cannot be reliably processed,
   the reviewer can reject the draft in full. Rejection records the attempt but discards all
   extracted values.

5. **Reviewer can edit any extracted value.** Manual overrides are recorded as
   `reviewer_edited: true` on the relevant field. The audit log must distinguish AI-sourced
   values from reviewer-corrected values.

6. **Approved values are immutable until explicitly edited.** Once a reviewer approves extracted
   fields, those fields cannot be silently overwritten by a future extraction run. Re-extraction
   creates a new draft; existing approved values are preserved.

### D.3 What Counts as "Acting On" Extracted Data

Extracted data may be "acted on" — i.e., used in platform workflows — only after:

1. A human reviewer has reviewed the draft.
2. The reviewer has confirmed (approved) the relevant fields.
3. The draft status has transitioned to `"reviewed"`.

Draft data with status `"draft"` or `"rejected"` must not flow into:
- Certification validation workflows
- DPP Passport fields
- Supplier profile completeness inputs
- Buyer-facing trust signals
- Audit pack exports
- Any external output

---

## E. Workflow Design

### E.1 MVP End-to-End Workflow

```
1. UPLOAD
   Supplier uploads a document (PDF or image) via the supplier document upload surface.
   Document is stored as a file record with metadata (type, size, uploader, org_id, timestamp).

2. TRIGGER EXTRACTION (manual — not automatic)
   Supplier or admin explicitly triggers AI extraction on a stored document.
   This is an on-demand action, not a background auto-process.

3. CLASSIFY
   AI classifies the document type:
   → GOTS_CERTIFICATE / LAB_TEST_REPORT / DOC / INSPECTION_REPORT / UNKNOWN
   Overall confidence score is computed.

4. EXTRACT CANDIDATE FIELDS
   AI extracts the fields defined in Section C.1 from the document content.
   Each field receives a confidence score and a flagged_for_review indicator.
   Result is a DocumentExtractionDraft (Section I).

5. DRAFT STORED
   The extraction draft is stored with status = "draft".
   human_review_required = true (structural constant).
   No downstream workflows are triggered.

6. REVIEW SURFACE SHOWN
   The supplier (or admin, depending on document context) sees the structured review panel.
   Governance label is displayed: "AI-generated extraction · Human review required before
   acting on any extracted data".
   High-confidence fields are pre-highlighted for quick review.
   Low-confidence fields (< 0.50) are flagged in red.

7. HUMAN REVIEW
   Reviewer acts on each field:
   → Accept (as-is)
   → Edit (override with corrected value; field marked reviewer_edited: true)
   → Mark as Not Found / Not Applicable
   → Reject entire draft if document is unusable.

8. APPROVAL
   Reviewer submits review. Draft status transitions to "reviewed" or "rejected".
   If "reviewed": approved field values are promoted and become eligible for internal workflows.
   If "rejected": draft is discarded; original file remains on record.

9. ORIGINAL FILE PRESERVED
   In all cases the original uploaded document remains linked and accessible.
   Extracted/approved fields are metadata derived from the document; they do not replace it.

10. FUTURE USE (NOT MVP — see Section J)
    Approved fields may be consumed by: DPP Passport, supplier profile completeness, audit packs,
    certification vault, buyer trust signals.
```

### E.2 Re-Extraction

- Re-extraction on the same document creates a new draft.
- Previously approved values are NOT overwritten by the new draft.
- Reviewer can compare new draft against prior approved values.
- The system must preserve a complete extraction history per document.

### E.3 Failure Handling

| Failure Case | Behaviour |
|---|---|
| Document cannot be parsed (corrupted, password-protected) | Draft created with `document_type: "UNKNOWN"`, all fields null, `confidence_score: 0.0`, `extraction_notes` explains failure |
| AI provider call fails | Extraction request fails gracefully; no draft created; error surfaced to user |
| Document too large / unsupported format | Validation at upload time; extraction not attempted |
| All fields < 0.50 confidence | Draft created; all fields flagged; reviewer must explicitly handle each |

---

## F. UI Surface Design

### F.1 Supplier-Side Document Upload Surface

**Where:** Supplier's internal workspace → Certifications / Documents section
**Data surface ID:** `supplier-internal` (consistent with TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 pattern)
**Who sees it:** Authenticated supplier (org-scoped; own documents only)

Panel elements:
- Upload button for document (PDF/image)
- List of uploaded documents with file name, upload date, document type (if classified)
- Per-document: "Analyse Document" button (triggers extraction on demand)
- Extraction draft review panel (see F.2)

**Testid convention (design-level):**
- `document-intelligence-card` — container
- `upload-document-button`
- `analyse-document-button`
- `document-extraction-review-panel`
- `extraction-loading-indicator`
- `extraction-error-fallback`
- `extraction-governance-label`
- `extraction-field-{field_name}` (one per extracted field)
- `extraction-confidence-indicator-{field_name}`
- `extraction-flagged-{field_name}` (visible when flagged_for_review)
- `extraction-approve-button`
- `extraction-reject-button`
- `extraction-edit-{field_name}` (inline edit trigger)

### F.2 Extraction Review Panel

Displayed immediately after extraction completes (or when a draft exists):

```
┌─────────────────────────────────────────────────────────────────────┐
│  AI-generated extraction · Human review required before acting      │
│  on any extracted data                                [governance]  │
├─────────────────────────────────────────────────────────────────────┤
│  Document type:  LAB_TEST_REPORT                  [confidence 0.92] │
│  Issuer name:    SGS Testing (China) Ltd.         [confidence 0.88] │
│  Report number:  CN-2026-TXT-004821               [confidence 0.90] │
│  Product name:   100% Cotton Jersey Fabric         [confidence 0.85] │
│  Standard name:  ISO 105-E04                       [confidence 0.82] │
│  Issue date:     2026-03-14                        [confidence 0.95] │
│  Expiry date:    Not found in document             [confidence 0.00] │
│  ──────────────────────────────────────────────────────────────────  │
│  ⚠ Material composition: Cotton (unspecified %)    [confidence 0.42] ← FLAGGED │
│  ⚠ Test results: Extracted but format ambiguous   [confidence 0.38] ← FLAGGED │
├─────────────────────────────────────────────────────────────────────┤
│  [Approve Selected]   [Edit]   [Reject Entire Draft]                │
└─────────────────────────────────────────────────────────────────────┘
```

### F.3 Admin / Compliance Review Surface (Future)

**Not part of MVP implementation.** Future admin surface in the control plane.
- Admin can view extraction drafts and approved fields across all tenants (scoped by org_id).
- Admin can override reviewer decisions in audit context.
- Admin view is read-only by default; edits require explicit admin role.

### F.4 Buyer-Facing Trust Display (Future — NOT MVP)

**Not part of MVP.** Future surface.
- Buyers may see structured certification metadata on supplier/product pages.
- Only human-approved fields are eligible for buyer visibility.
- A future governance gate must explicitly authorize each field's public eligibility.
- No auto-publish of extracted fields to buyer surfaces.

### F.5 DPP Passport Reuse (Future — NOT MVP)

**Not part of MVP.** Future surface.
- DPP Passport fields will consume approved extracted values where applicable.
- DPP publication requires a separate authorization gate beyond extraction approval.
- Extraction is a data-preparation step, not a DPP publication trigger.

### F.6 Field Visibility Classification

| Field | Supplier View | Admin View | Buyer View | DPP View |
|---|---|---|---|---|
| `document_type` | ✅ | ✅ | Future (gated) | Future (gated) |
| `issuer_name` | ✅ | ✅ | Future (gated) | Future (gated) |
| `certificate_number` | ✅ | ✅ | Future (gated) | Future (gated) |
| `report_number` | ✅ | ✅ | ❌ Internal only | ❌ Internal only |
| `holder_name` | ✅ | ✅ | Future (gated) | Future (gated) |
| `product_name` | ✅ | ✅ | Future (gated) | Future (gated) |
| `material_composition` | ✅ | ✅ | Future (gated) | Future (gated) |
| `standard_name` | ✅ | ✅ | Future (gated) | Future (gated) |
| `test_parameters` | ✅ | ✅ | ❌ Internal only | Future (gated) |
| `test_results` | ✅ | ✅ | ❌ Internal only | Future (gated) |
| `issue_date` | ✅ | ✅ | Future (gated) | Future (gated) |
| `expiry_date` | ✅ | ✅ | Future (gated) | Future (gated) |
| `validity_status_candidate` | ✅ (review only) | ✅ | ❌ Never raw candidate | Future (reviewed only) |
| `country_or_lab_location` | ✅ | ✅ | Future (gated) | Future (gated) |
| `uploaded_by` | ✅ | ✅ | ❌ Never | ❌ Never |
| `source_file_id` | ✅ | ✅ | ❌ Never | ❌ Never |
| `confidence_score` | ✅ (review only) | ✅ | ❌ Never | ❌ Never |
| `human_review_required` | ✅ (always shown) | ✅ | N/A | N/A |
| `extraction_notes` | ✅ | ✅ | ❌ Never | ❌ Never |

---

## G. Security and Data Classification

### G.1 Data Classification Table

| Data Type | Classification | Visibility | Notes |
|---|---|---|---|
| Original uploaded document | Restricted | Supplier + Admin only | Must be stored with org_id isolation; RLS enforced |
| Extraction draft (status: draft) | Restricted internal | Supplier (own) + Admin | Not eligible for any external surface |
| Extraction draft (status: rejected) | Restricted internal | Supplier (own) + Admin | Audit record only; values must not flow downstream |
| Human-approved extraction fields | Internal operational | Supplier + Admin; future gated externals | Eligible for internal workflows only; external use requires explicit gate |
| Confidence scores | Internal review only | Supplier (review context) + Admin | Never shown to buyers; never in DPP |
| `uploaded_by` / actor fields | Restricted PII | Supplier (own) + Admin | Never externally visible |
| Public DPP fields | Public (future, gated) | Buyers + external | Requires separate publication authorization; not derived from draft |
| Sensitive business data (test results, trade secrets) | Restricted | Supplier + Admin | Default: never public; each field requires explicit eligibility decision |

### G.2 Tenancy Isolation Rules

- All extraction records must be scoped by `org_id`.
- No extraction record for org A may be returned in any query for org B.
- RLS policies on any future `document_extraction_drafts` table must enforce `org_id` isolation.
- Admin access (cross-tenant) requires `is_admin = true` GUC context and audit log emission.
- `uploaded_by` (user_id) must never be exposed outside the tenant's own admin view.

### G.3 Document Storage Security

- Original documents must be stored with access control enforced at the storage layer.
- Signed URLs with short TTL are required for document access (Supabase Storage pattern).
- Document metadata must not leak the storage path or bucket structure to clients.
- File type validation must be enforced at upload time (MIME type + extension check).

### G.4 AI Provider Data Handling

- Document content sent to the AI provider for extraction must be treated as sensitive business data.
- The AI provider must not be sent `org_id`, `uploaded_by`, or any PII-bearing fields.
- Content sent to AI must be stripped of authentication tokens, JWT fragments, and URL parameters
  before transmission.
- The AI call must occur outside any Prisma transaction (HOTFIX-MODEL-TX-001 pattern applies).

---

## H. AI Safety Boundaries

The following actions are **constitutionally forbidden** from this unit and any future
implementation derived from it:

| Forbidden Action | Rationale |
|---|---|
| Autonomous certificate validation | Human authority is mandatory; AI cannot grant certificate validity |
| Legal or regulatory advice | Out of scope; requires jurisdictional legal expertise |
| Buyer ranking or scoring | No supplier-comparative output is permitted |
| Supplier ranking or scoring | Extraction is document-scoped; no cross-supplier comparison |
| Credit scoring or financial assessment | Constitutionally forbidden from all AI paths |
| Payment or escrow decisions | Constitutionally forbidden from all AI paths |
| Public claims without human review | `human_review_required: true` is structural; all public use requires reviewed status |
| Overwriting user-entered data without approval | AI output is draft only; existing approved values are never silently overwritten |
| Setting lifecycle state on any certification | Lifecycle SM is human-controlled; AI has no write authority to lifecycle tables |
| Confidence score shown to buyers | Confidence is an internal review aid; it must not create buyer-perceived quality signals |
| Autonomous DPP publication | DPP requires explicit publication authorization; extraction is not a trigger |
| Cross-tenant document comparison | Each extraction is org_id-scoped; no cross-tenant analysis permitted |
| Price inference from document content | Constitutionally forbidden; price does not appear in any AI path |
| `publicationPosture` inference | Constitutionally forbidden from all AI context packs |

> `humanReviewRequired: true` is a **structural constant** in the output type, not a field the AI
> model can set to false. Implementation must enforce this at the type level.

---

## I. API / Data Contract Sketch

> **Design-only.** No implementation. These contracts define the intended shape; precise types
> and validation schemas are defined at implementation time.

### I.1 Core Types

```typescript
// Document type classification
type DocumentType =
  | 'GOTS_CERTIFICATE'
  | 'OEKO_TEX_CERTIFICATE'
  | 'ISO_CERTIFICATE'
  | 'REACH_COMPLIANCE'
  | 'LAB_TEST_REPORT'
  | 'DECLARATION_OF_CONFORMITY'
  | 'INSPECTION_REPORT'
  | 'SUPPLIER_EVIDENCE'
  | 'UNKNOWN';

// Per-field extraction result
type ExtractedField = {
  field_name: string;
  raw_value: string | null;
  normalized_value: string | null;
  confidence: number;               // [0, 1]
  source_region: string | null;
  flagged_for_review: boolean;      // true if confidence < threshold or anomalous
  reviewer_edited?: boolean;        // set to true if human overrides value
};

// Validity candidate (computed, never authoritative)
type ValidityStatusCandidate = 'VALID' | 'EXPIRED' | 'EXPIRING_SOON' | 'UNKNOWN';

// Extraction draft — primary output type
type DocumentExtractionDraft = {
  documentId: string;                    // Source file record ID
  orgId: string;                         // Tenant scope
  documentType: DocumentType;
  extractedFields: ExtractedField[];
  overallConfidence: number;             // [0, 1] — average of field-level scores
  humanReviewRequired: true;             // Structural constant — always true
  status: 'draft' | 'reviewed' | 'rejected';
  extractionNotes: string | null;
  extractedAt: string;                   // ISO 8601 timestamp
  reviewedAt: string | null;             // Set when reviewer submits
  reviewedByUserId: string | null;       // Set when reviewer submits
};

// Route sketch: trigger extraction
// POST /api/tenant/documents/:documentId/extract
// Request: {} (no body — documentId in path)
// Response: DocumentExtractionDraftResponse

type DocumentExtractionDraftResponse = {
  draft: DocumentExtractionDraft;
  humanReviewRequired: true;             // Echoed at response envelope level
};

// Route sketch: submit review
// POST /api/tenant/documents/:documentId/extraction/review
// Request: DocumentExtractionReviewRequest
// Response: DocumentExtractionDraft (updated)

type DocumentExtractionReviewRequest = {
  action: 'approve' | 'reject';
  fieldOverrides?: Record<string, string | null>;  // field_name → corrected value
};
```

### I.2 Audit Log Entry Shape (Design)

Every extraction trigger and review submission must emit an `AuditLog` entry:

```typescript
// On extraction trigger:
{
  action: 'document.extraction.triggered',
  actorId: string,
  orgId: string,
  targetType: 'document',
  targetId: string,        // documentId
  metadata: {
    documentType: DocumentType,
    overallConfidence: number
  }
}

// On review submission:
{
  action: 'document.extraction.reviewed',
  actorId: string,
  orgId: string,
  targetType: 'document_extraction_draft',
  targetId: string,        // draftId
  metadata: {
    reviewAction: 'approve' | 'reject',
    fieldOverrideCount: number,
    humanReviewRequired: true
  }
}
```

### I.3 AI Call Architecture (Design)

Following the HOTFIX-MODEL-TX-001 pattern established in TECS-AI-RFQ-ASSISTANT-MVP-001 and
TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001:

```
Request received
  │
  ├── Validate documentId (org_id scoped — RLS enforced)
  ├── Fetch document content (outside Prisma tx)
  │
  ├── AI CALL (outside Prisma tx)
  │     → Send document content to AI provider
  │     → Receive DocumentExtractionDraft candidate
  │     → Apply confidence thresholds
  │     → Classify flagged fields
  │
  ├── BEGIN Prisma tx
  │     ├── INSERT document_extraction_drafts record
  │     ├── INSERT AuditLog (extraction.triggered)
  │     ├── INSERT ReasoningLog (AI reasoning trace)
  │     └── INSERT AiUsageMeter (token usage)
  └── COMMIT tx
      └── Return DocumentExtractionDraftResponse
```

The AI call and document fetch must complete before the transaction opens. The transaction
contains only fast DB writes. This prevents the P2028 Prisma interactive transaction timeout
that would otherwise occur when AI provider latency exceeds 5 s.

---

## J. Future Integration Points

> All items in this section are **future only**. None are part of MVP implementation.

### J.1 DPP Passport

- Approved extracted fields (standard name, issue date, expiry date, lab name, material
  composition) will feed into the DPP Passport data model.
- DPP publication requires a separate authorization gate; extraction approval alone does not
  trigger DPP publication.
- DPP field mapping: each extraction field must have an explicit DPP field ID assigned at
  implementation time; no implicit mapping.

### J.2 Supplier Profile Completeness

- `TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001` scoring currently uses the presence of
  `certificationType` and `expiresAt` on the `Certification` model.
- Future: document intelligence approved results can enrich the completeness context —
  e.g., an approved `expiry_date` extraction updates the certification's actual expiry in the
  profile completeness analysis.
- This linkage requires a future unit authorization; it is not in MVP scope.

### J.3 Certification Vault

- A future "certification vault" surface will allow suppliers to manage all uploaded documents,
  their extraction status, and review history in one place.
- The vault will link extracted documents to the `Certification` model's lifecycle state.
- MVP extraction operates independently of the vault surface.

### J.4 Buyer Trust Signals

- Once documents are reviewed and approved, structured certification data (standard name, issue
  date, expiry) may become eligible to appear in buyer-facing trust displays on product/supplier
  pages.
- This requires an explicit field-level public eligibility gate and a future UI authorization.
- No extraction output appears in buyer surfaces without this gate.

### J.5 Audit Packs

- Future audit pack export will include:
  - Original document (linked by `source_file_id`)
  - Approved extracted fields
  - Reviewer history (who reviewed, when, what was edited)
  - AI confidence scores (audit context only — never shown to buyers)
- Audit packs require a future authorization gate for each document type included.

### J.6 Export Readiness and Trade Compliance

- Approved extraction results (standard names, test results, issue/expiry dates) may feed
  future export compliance checks.
- For example: a buyer's market requires REACH compliance; the platform can surface whether
  the supplier has an approved REACH document with a valid extraction date.
- This requires a future compliance assistant unit with explicit scope definition.

### J.7 AI Compliance Assistant (Future Unit Candidate)

- A future `TECS-AI-COMPLIANCE-ASSISTANT-001` unit may use approved extraction results as
  structured context for answering supplier questions about standard compliance requirements.
- This unit is a candidate only; it requires explicit Paresh authorization to open.

---

## K. Implementation Slice Structure (Design Only — Slices NOT Authorized)

> The following slices are defined for planning purposes. None are authorized.
> Each requires explicit Paresh authorization before opening.

| Slice | Description | Key Outputs |
|---|---|---|
| K-1 | Document intake and type classification | `classifyDocumentType()`, route stub, `document_type` enum |
| K-2 | Field extraction AI prompt and output schema | Extraction prompt, `ExtractedField[]` schema, confidence computation |
| K-3 | Backend route + draft storage + audit trail | `POST /api/tenant/documents/:id/extract`, `document_extraction_drafts` schema design, AuditLog + ReasoningLog + AiUsageMeter |
| K-4 | Frontend review panel | `DocumentIntelligenceCard` component, extraction review panel, governance label, field-level confidence indicators |
| K-5 | Review submission + approval workflow | `POST /api/tenant/documents/:id/extraction/review`, status transitions, reviewer audit |

---

## L. Non-Goals (Explicit, Permanent)

| Non-Goal | Notes |
|---|---|
| No new database table in MVP without explicit authorization | Schema budget requires Paresh authorization per `schema-budget.md` |
| No persistent AI-generated certificate validity status | Validity is always `_candidate` and `human_review_required: true` |
| No buyer-facing extraction output without review gate | Reviewed data requires explicit public eligibility gate |
| No cross-tenant document analysis | `org_id` isolation is constitutional |
| No automated compliance decisions | Human authority is mandatory |
| No RAG integration for extraction MVP | RAG is separate infrastructure (G-028); extraction uses direct document content |
| No price, risk_score, or publicationPosture in AI context | Constitutionally forbidden |
