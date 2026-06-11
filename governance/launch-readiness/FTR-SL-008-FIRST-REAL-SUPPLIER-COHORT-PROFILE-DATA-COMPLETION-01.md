# FTR-SL-008 First Real Supplier Cohort Profile Data Completion

**Unit:** `FTR-SL-008-FIRST-REAL-SUPPLIER-COHORT-PROFILE-DATA-COMPLETION-01`
**Date:** 2026-06-11
**Status:** AUDIT_COMPLETE_WITH_BOUNDED_TOOLING_FOLLOW_UP_REQUIRED
**Final enum:** `FTR_SL_008_FIRST_REAL_SUPPLIER_COHORT_PROFILE_DATA_COMPLETION_AUDIT_COMPLETE_TOOLING_FOLLOW_UP_REQUIRED_NO_PRODUCTION_MUTATION`

---

## 1. Scope And Final Posture

This bounded repo-truth audit/design defines the exact minimum public-safe supplier profile data completion path for Shraddha Industries and the first real Surat supplier cohort so the public B2B directory can move toward buyer-promotion readiness without unsafe production mutation.

Final posture:

- Shraddha Industries is already public/eligible by previously recorded directory evidence, but its public profile is incomplete for buyer promotion.
- The public projection, schema, and public UI already support the required buyer-safe profile fields.
- Existing tenant/control routes support publication, catalog item creation/update, certification lifecycle, traceability node creation, and AI-assisted completeness review.
- A bounded post-provision taxonomy/profile-completion write path for existing supplier organizations was not found in repo truth.
- Therefore the minimum path is operations-first plus a bounded tooling follow-up for existing-supplier taxonomy/profile completion. No direct SQL, Prisma migration, seed, env, production browser profile view, production data mutation, or public profile GET is authorized by this unit.

---

## 2. Mandatory Preflight

Preflight from this FTR-SL-008 run:

```text
branch=main
HEAD=339cf291a1994a18aabcaea4f66ba4facc726b57
origin/main=339cf291a1994a18aabcaea4f66ba4facc726b57
git status --short: [no output]
```

Previously completed launch-readiness commits on this chain:

```text
38c03d08 docs(launch): register supplier inbox role-matrix verification residual
b581fcf0 docs(launch): audit aggregator directory readiness
2474d8d8 launch: label demo pilot supplier
339cf291 docs(launch): review supplier profile view audit side effect
```

No production profile GET was run for this unit. No SQL, Prisma, migration, seed, server start, package install, browser action, inquiry, email, or production data mutation was performed.

---

## 3. Files Inspected

Governance and prior launch truth:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-006-AGGREGATOR-DIRECTORY-READINESS-AUDIT-01.md`
- `governance/launch-readiness/FTR-SL-007-PUBLIC-SUPPLIER-PROFILE-VIEW-AUDIT-SIDE-EFFECT-REVIEW-01.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Projection, schema, route, and UI surfaces:

- `server/src/services/publicB2BProjection.service.ts`
- `server/src/routes/public.ts`
- `server/prisma/schema.prisma`
- `server/src/types/tenantProvision.types.ts`
- `server/src/lib/database-context.ts`
- `server/src/routes/control.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/tenant/certifications.g019.ts`
- `server/src/routes/tenant/traceability.g016.ts`
- `server/src/routes/admin/traceability.g016.ts`
- `services/publicB2BService.ts`
- `services/catalogService.ts`
- `services/certificationService.ts`
- `services/aggregatorDiscoveryService.ts`
- `components/Public/B2BDiscovery.tsx`
- `components/Public/PublicSupplierProfile.tsx`
- `components/Tenant/AggregatorDiscoveryWorkspace.tsx`
- `config/publicReferenceB2B.ts`
- `server/src/routes/tenant.supplierProfileCompleteness.test.ts`
- `server/src/services/ai/supplierProfileCompletenessRubric.ts`
- `server/src/services/ai/supplierProfileCompletenessService.ts`

---

## 4. Starting Production Evidence

This unit relies on already-run FTR-SL-006 directory evidence only:

```text
GET https://app.texqtic.com/api/public/b2b/suppliers
status=200
total=2 itemCount=2 page=1 limit=20
slugs=shraddha-industries,lt-b2b-001
supplier=shraddha-industries posture=B2B_PUBLIC eligible=PUBLICATION_ELIGIBLE jurisdiction=Surat, Gujarat taxonomyPrimary=null secondaryCount=0 roleCount=0 offeringCount=0 certTypeCount=0 traceability=false
supplier=lt-b2b-001 posture=B2B_PUBLIC eligible=PUBLICATION_ELIGIBLE jurisdiction=IN taxonomyPrimary=Weaving secondaryCount=0 roleCount=0 offeringCount=3 certTypeCount=0 traceability=false
```

Interpretation:

- `shraddha-industries` is the only confirmed real public supplier in this evidence.
- `lt-b2b-001` remains a demo/pilot supplier and must not count toward the first real supplier cohort.
- Shraddha is visible but incomplete for buyer-promotion readiness.

---

## 5. Public-Safe Projection Support

`publicB2BProjection.service.ts` already projects the fields needed for the July minimum profile-readiness path:

| Field | Projection Source | Public Safety Posture |
|---|---|---|
| `slug` | `organizations.slug` | Safe public identifier |
| `legalName` | `organizations.legal_name` | Safe if supplier-approved |
| `orgType` | `organizations.org_type` | Safe, must be `B2B` for projection |
| `jurisdiction` | `organizations.jurisdiction` | Safe market context |
| `taxonomy.primarySegment` | `organizations.primary_segment_key` | Safe capability context |
| `taxonomy.secondarySegments` | `organization_secondary_segments.segment_key` | Safe capability context |
| `taxonomy.rolePositions` | `organization_role_positions.role_position_key` | Safe role context |
| `offeringPreview` | active public `CatalogItem` rows | Safe only if item is intentionally public |
| `certificationCount` | issued `Certification` rows | Safe count only, no document reveal |
| `certificationTypes` | issued `Certification.certificationType` | Safe type labels only |
| `hasTraceabilityEvidence` | `TraceabilityNode.visibility = SHARED` | Safe boolean only |
| `publicationPosture` | `organizations.publication_posture` | Safe status label in current contract |
| `eligibilityPosture` | `Tenant.publicEligibilityPosture` | Safe status label in current contract |

Projection gates remain intact:

- `Tenant.publicEligibilityPosture = PUBLICATION_ELIGIBLE`
- `organizations.publication_posture IN ('B2B_PUBLIC', 'BOTH')`
- `organizations.org_type = 'B2B'`
- `organizations.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- `organizations.is_qa_sentinel = false`

No prohibited fields are needed for this completion path.

---

## 6. Schema Support Matrix

| Readiness Area | Schema Support | Current Assessment |
|---|---|---|
| Publication eligibility | `Tenant.publicEligibilityPosture` enum includes `PUBLICATION_ELIGIBLE` | Supported |
| Public org posture | `organizations.publication_posture` | Supported |
| Public org type/status/sentinel gate | `organizations.org_type`, `status`, `is_qa_sentinel` | Supported |
| Primary taxonomy | `organizations.primary_segment_key` | Supported |
| Secondary taxonomy | `OrganizationSecondarySegment` | Supported |
| Role position | `OrganizationRolePosition` | Supported; allowed provisioning role keys are `manufacturer`, `trader`, `service_provider` |
| Offering preview | `CatalogItem.name`, `moq`, `imageUrl`, `active`, `publicationPosture` | Storage supported; public posture setting path is limited |
| Certification signal | `Certification.certificationType`, `issuedAt` | Supported |
| Traceability signal | `TraceabilityNode.visibility` | Supported; public projection uses `SHARED` |

Conclusion: no schema change is required for FTR-SL-008. The issue is not storage capability; it is safe data completion and bounded existing-supplier update tooling.

---

## 7. UI Support Matrix

| Surface | Support Found | Notes |
|---|---|---|
| Public B2B directory | Search/filter by company, region, capability, certification, verified-only | Uses taxonomy, certifications, offering names, jurisdiction, and posture fields |
| Public directory cards | Shows legal name, org type, jurisdiction, taxonomy/capability signals, trust/offering indicators | Safe fallbacks exist for missing fields |
| Public supplier profile | Shows business snapshot, segment/role, market, visibility, capability highlights, taxonomy, certifications, traceability, offering preview | Missing fields render fallback copy, but fallback-heavy real profiles are not buyer-promotion ready |
| Tenant aggregator discovery workspace | Shows read-only discovery entries with taxonomy and trust cues | Helpful for authenticated review, not public mutation |
| Reference preview suppliers | Clearly static examples | Must not count as real supplier cohort |
| Demo/pilot supplier labeling | Implemented separately by FTR-SL-005 for `lt-b2b-001` | Must remain preserved |

Conclusion: public display support already exists. No public UI implementation is required before data completion can be designed, but production visual verification must avoid public profile GET unless explicitly authorized because FTR-SL-007 established that successful profile GET is write-producing.

---

## 8. Existing Tooling Support Matrix

| Data Completion Area | Existing Tooling | Sufficiency |
|---|---|---|
| Publish public supplier posture | `POST /api/control/tenants/:id/publish` | Sufficient for public/eligible gate; Shraddha already appears public/eligible in evidence |
| First-owner reinvite | `POST /api/control/tenants/:id/first-owner/reinvite` | Already implemented; not part of FTR-SL-008 data completion |
| Catalog item create/update | `POST/PATCH /api/tenant/catalog/items` and `catalogService` | Sufficient for item data, but current body/service do not expose `publicationPosture`; public offering-preview readiness may need bounded posture tooling or an authorized existing admin/data path |
| Certification create/update/transition | `/api/tenant/certifications` and `certificationService` | Sufficient for tenant-submitted/approved certification lifecycle; issued rows drive public count/types |
| Traceability nodes | `/api/tenant/traceability/nodes` | Sufficient for tenant SHARED traceability signal if evidence is real and approved |
| Admin traceability | `/api/control/traceability` | Read-only only; not a data entry path |
| Existing org taxonomy update | Provisioning accepts taxonomy fields; org identity reads expose them | Not sufficient for already-provisioned suppliers; no bounded post-provision taxonomy update route found |
| AI completeness review | `POST /api/tenant/supplier-profile/ai-completeness` | Read/AI/audit support only; no write authority and no auto-apply |

Conclusion: most field families have existing safe surfaces, but existing-supplier taxonomy/profile completion is a bounded tooling gap. Public offering-preview posture may also require a bounded publication-posture path if no current operator route can safely set `CatalogItem.publicationPosture` for existing items.

---

## 9. Minimum Public-Safe Completeness Standard

The July minimum for buyer-promotion readiness is intentionally narrow. It is not a full supplier marketing profile, full catalog, full certification vault, or traceability passport.

Each real supplier promoted through the public B2B directory should have, at minimum:

| Field | Minimum | Required For Promotion | Public-Safe Rule |
|---|---|---|---|
| Cohort classification | Confirmed real supplier, not QA/demo/reference | YES | Exclude `lt-b2b-001` and all reference previews |
| Publication gates | Public/eligible and not QA sentinel | YES | Use existing projection gates only |
| Legal name | Supplier-approved public legal/display name | YES | No owner email, phone, GSTIN, registration number, or contact reveal |
| Jurisdiction | City/state/country level public market context | YES | Shraddha currently has `Surat, Gujarat` |
| Primary segment | One buyer-understandable textile segment | YES | Must not be null for promotion |
| Role position | At least one role, preferably from canonical role keys | YES | `manufacturer`, `trader`, or `service_provider` where applicable |
| Secondary segments | One or more public-safe capability tags | RECOMMENDED | Required if primary segment is broad |
| Offering preview | At least two public-safe offering rows, or one if the supplier has only one launch-safe offering | YES | Name and MOQ are enough; image optional; no price requirement |
| Certification posture | Verified certification types if real; otherwise approved `None on record` posture | YES | Do not invent certifications or imply trust claims without issued records |
| Traceability posture | SHARED signal only if real; otherwise approved `Not published` posture | YES | Boolean only; no document/source reveal |
| Supplier approval | Human approval that all public fields are safe to show | YES | Must be recorded outside this no-mutation unit |
| Verification path | Directory GET/static/local tests only by default | YES | Avoid production profile GET unless audit/event write is explicitly accepted |

This standard allows honest zero-certification and zero-traceability states if explicitly reviewed. It does not allow a real promoted supplier to remain taxonomy-empty and offering-empty.

---

## 10. Shraddha Industries Checklist

Current state from already-run directory evidence:

| Field | Current | Minimum Required | Status |
|---|---|---|---|
| Real supplier classification | Real supplier by governance chain | Real supplier | MET |
| Slug | `shraddha-industries` | Stable public slug | MET |
| Publication posture | `B2B_PUBLIC` | `B2B_PUBLIC` or `BOTH` | MET |
| Eligibility posture | `PUBLICATION_ELIGIBLE` | `PUBLICATION_ELIGIBLE` | MET |
| Jurisdiction | `Surat, Gujarat` | Public market context | MET |
| Primary taxonomy | `null` | One public segment | NOT_MET |
| Secondary taxonomy | 0 | One or more recommended | NOT_MET |
| Role positions | 0 | At least one | NOT_MET |
| Offering preview | 0 | At least two public-safe rows, or one if accurate | NOT_MET |
| Certification types | 0 | Verified certs or approved `None on record` posture | REVIEW_REQUIRED |
| Traceability signal | false | SHARED if real, otherwise approved `Not published` posture | REVIEW_REQUIRED |
| Supplier approval | Not evidenced in this unit | Required before promotion | NOT_EVIDENCED |

Minimum Shraddha completion path:

1. Confirm Shraddha's public-safe business category and role in human operations notes.
2. Capture a primary segment and at least one role position.
3. Capture at least one public-safe secondary segment if the primary segment is broad.
4. Add or identify at least two public-safe offering-preview items with names and MOQ, or record why only one offering is accurate for launch.
5. Confirm whether Shraddha has any issued certifications that may be publicly summarized. If not, explicitly approve `None on record` copy.
6. Confirm whether any traceability node may be marked `SHARED`. If not, explicitly approve `Not published` copy.
7. Run a no-mutation verification using `GET /api/public/b2b/suppliers` only after separately authorized data-entry/tooling work is complete.

---

## 11. First Real Surat Cohort Checklist

The first real Surat cohort must exclude:

- `lt-b2b-001`
- reference preview suppliers from `config/publicReferenceB2B.ts`
- QA/sentinel/test/synthetic organizations
- suppliers without explicit public-safe approval

For each real supplier in the cohort, capture this operations worksheet before any production write unit:

| Item | Required Value |
|---|---|
| Supplier slug | Existing or proposed stable slug |
| Public legal/display name | Supplier-approved value |
| Jurisdiction | City/state/country public-safe context |
| Public eligibility readiness | Whether publish gate can be applied safely |
| Primary segment | One public-safe segment |
| Secondary segments | Public-safe capability tags |
| Role positions | One or more role positions |
| Offering preview rows | Names, MOQ, optional image URL; no private pricing requirement |
| Certification posture | Issued cert rows if real; otherwise approved `None on record` |
| Traceability posture | SHARED evidence if real; otherwise approved `Not published` |
| Supplier approval evidence | Human approval that public fields are safe |
| Verification plan | Directory GET/static/local only unless profile GET side effect is accepted |

Minimum cohort threshold before buyer promotion:

- Shraddha completed to the standard above.
- At least two additional real Surat suppliers completed to the same standard, or Paresh explicitly approves a Shraddha-first promotion posture with a smaller cohort.
- `lt-b2b-001` remains labeled demo/pilot and excluded from real-supplier counts.

---

## 12. No-Mutation Verification Path

Allowed verification patterns for this data-completion track:

- Static repo inspection of projection, schema, and UI code.
- Local/frontend tests or component inspection where no production profile GET occurs.
- Production `GET /api/public/b2b/suppliers` after a separately authorized data-entry/tooling unit, because the directory GET route has no audit/event write found in repo truth.
- Tenant/control read-only inspection if explicitly authorized and secret-safe.

Forbidden by default for no-mutation verification:

- Production `GET /api/public/supplier/:slug`.
- Production browser visit to `/supplier/:slug`.
- Direct SQL updates.
- Prisma `db push`, `migrate dev`, ad hoc seed scripts, or environment edits.
- Any profile, catalog, certification, traceability, publish, reinvite, inquiry, email, CRM, CAE, Zoho, payment, or legal mutation.

If production profile GET visual verification is later needed, the prompt must explicitly accept the expected profile-view audit/event write established by FTR-SL-007.

---

## 13. Operations Path Without Unsafe Mutation

FTR-SL-008 does not authorize data entry. It defines the safe sequence for later authorized units:

1. Freeze the first real supplier cohort roster.
2. Complete the public-safe worksheet for Shraddha and each cohort supplier.
3. Decide whether existing tenant catalog/certification/traceability routes are sufficient for each field.
4. Open FTR-SL-009 for bounded existing-supplier taxonomy/profile-completion tooling before touching taxonomy on already-provisioned orgs.
5. If catalog offering preview requires item-level public posture not exposed by existing tenant tooling, include that in FTR-SL-009 or a sibling bounded tooling unit.
6. After tooling/data-entry authorization, apply data through governed APIs only.
7. Verify with directory GET and local/static evidence.
8. Preserve legal, demo/pilot, supplier approval, and profile-view audit guardrails before any buyer-promotion claim.

---

## 14. Tooling Gap Follow-Up

Register follow-up:

`FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01`

Purpose:

- Provide a bounded, audited way to complete taxonomy/profile fields for existing real suppliers after provisioning.
- Avoid direct production SQL for `organizations.primary_segment_key`, `organization_secondary_segments`, and `organization_role_positions`.
- Clarify whether public offering preview publication posture can be set through existing tenant/catalog tooling or needs a bounded route/control.
- Preserve `org_id` boundaries, RLS, SUPER_ADMIN/OWNER/ADMIN role rules, audit logging, and no-contact/no-pricing public projection constraints.

Minimum implementation scope for FTR-SL-009 should be separately authorized and allowlisted. FTR-SL-008 does not implement it.

---

## 15. Gate Review

| Gate | Current Status | Reason |
|---|---|---|
| GATE-SL-01 Real B2B supplier data readiness | PARTIAL | Shraddha exists and is public, but profile is incomplete; broader real cohort not proven |
| GATE-SL-02 First real supplier accepted/membership established | SUBSTANTIALLY_MET_FOR_SHRADDHA | Prior governance and supplier inbox verification support Shraddha OWNER path; broader cohort not proven |
| GATE-SL-03 Taxonomy/public profile completeness | NOT_MET_FOR_BUYER_PROMOTION | Shraddha has null taxonomy and zero offering preview in directory evidence |
| GATE-SL-04 Legal/notification/outreach loop | PARTIAL | Notification/inbox core are verified; legal pages and profile completion remain blockers |

Buyer-promotion readiness must not be claimed from FTR-SL-008 alone.

---

## 16. Adjacent Findings And Disposition

| Finding | Disposition | Classification |
|---|---|---|
| Existing-supplier taxonomy update route not found | Register FTR-SL-009 | P1 / MVP_CRITICAL pre-promotion tooling gap |
| Catalog item create/update does not expose `publicationPosture` in inspected frontend service/body schema | Include in FTR-SL-009 scope review | P1 / may block public offering preview completion |
| AI supplier profile completeness endpoint is read/audit only | Accepted | Useful review aid, not a write path |
| Admin traceability route is read-only | Accepted | Correct safety posture; tenant traceability creates SHARED nodes if authorized |
| Shraddha certification/traceability false/zero state may be accurate | Require human review | Do not fabricate trust claims |
| `lt-b2b-001` remains demo/pilot | Preserve FTR-SL-005 posture | Must not count as real cohort |
| Production profile GET is write-producing | Preserve FTR-SL-007 guardrail | Avoid for no-mutation verification |

No loose adjacent finding remains unregistered or unclassified.

---

## 17. Tracker Update Summary

`FUTURE-TODO-REGISTER.md` is updated to:

- Add FTR-SL-008 as audit-complete with bounded tooling follow-up required and no production mutation.
- Add FTR-SL-009 as the bounded supplier profile completeness tooling follow-up.
- Preserve FTR-SL-005 as implemented pending safe production visual verification.
- Preserve FTR-SL-007 as review complete accepted with verification guardrails.

No `NEXT-ACTION.md`, `OPEN-SET.md`, or `LAUNCH-FAMILY-INDEX.md` pointer/status update is required by this bounded docs-only unit.

---

## 18. Closeout

No source code changed. No schema changed. No migrations ran. No supplier/product/certification/traceability records were created, updated, deleted, seeded, or visibility-changed. No production profile GET or production browser profile view was performed. No inquiries were submitted. No emails were sent. No secrets were printed.

Final enum:

`FTR_SL_008_FIRST_REAL_SUPPLIER_COHORT_PROFILE_DATA_COMPLETION_AUDIT_COMPLETE_TOOLING_FOLLOW_UP_REQUIRED_NO_PRODUCTION_MUTATION`
