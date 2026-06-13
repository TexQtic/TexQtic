# FTR-SL-016B - B2B Company Profile Rich Profile + Certification Upload Access Design

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B-B2B-COMPANY-PROFILE-RICH-PROFILE-CERTIFICATION-UPLOAD-DESIGN-01`
- **Adjacent finding:** `QA-CERT-UX-001`
- **Date:** 2026-06-13
- **Mode:** Design-only / governance-only
- **Final enum:** `FTR_SL_016B_RICH_COMPANY_PROFILE_CERTIFICATION_ACCESS_DESIGN_COMPLETE_IMPLEMENTATION_READY`

## 2. Scope And Guardrails

### Objective

Design the next implementation path for a richer B2B Dashboard -> Company Profile experience, including safe access to certification/certificate document upload from Company Profile.

### Modify allowlist

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016B-B2B-COMPANY-PROFILE-RICH-PROFILE-CERTIFICATION-UPLOAD-DESIGN-01.md`
- `governance/launch-readiness/README.md` only if clearly needed; not used in this unit.

### Forbidden in this unit

- No source implementation.
- No schema, migration, SQL, Prisma mutation, RLS, storage, env, or deploy changes.
- No production data mutation.
- No call to `GET /api/public/supplier/:slug` or browser navigation to `/supplier/:slug`.
- No `/products` changes.
- No certification, logo, catalog, public posture, inquiry, email, CRM, CAE, Zoho, legal, payment, or TTP mutation.

## 3. Preflight Evidence

Command:

```text
git diff --name-only; git status --short
```

Observed output:

```text
[no output]
```

Interpretation: tracked worktree was clean before governance edits.

## 4. Repo Truth Findings

### Current Company Profile surface

`components/Tenant/B2BProfileSettings.tsx` is the current normal B2B Company Profile surface. It is a settings-style panel, not yet a rich business profile workspace.

Current capabilities:

- Loads `getTenantProfile()`.
- Edits only `displayName` via `updateTenantProfile({ displayName })`.
- Uploads logo through `uploadTenantLogo(file)` and persists it through `updateBranding({ logoUrl })`.
- Shows tenant identity fields: slug, tenant type, status, plan, and taxonomy/access model summaries.
- Calculates completeness only from display name, logo, and secondary segment presence.
- Restricts edit controls by `profile.canEdit`, matching OWNER/ADMIN intent.

Current limitations:

- No business description, contact/inquiry routing, website, location detail, services/capabilities narrative, operating markets, capacity bands, compliance notes, media gallery, public visibility controls, or certification document entry point.
- No rich profile field save contract beyond display name.
- Completeness is too narrow for supplier/public-readiness workflows.

### Routing and navigation

TexQtic is a Vite + React SPA. There is no `app/` or `pages/` directory. Company Profile is reached through app state and shell navigation:

- `layouts/Shells.tsx` exposes `Company Profile` through `navigation.onNavigateCompanyProfile`.
- `App.tsx` routes `appState === 'SETTINGS'` to `B2BProfileSettings` for normal B2B tenants.
- White Label settings remain separate for WL-capable tenants.

### Tenant profile API/client contract

`server/src/routes/tenant.ts` exposes:

- `GET /api/tenant/profile`: returns tenant/org identity, taxonomy summary, logo URL, and `canEdit`.
- `PUT /api/tenant/profile`: OWNER/ADMIN only; currently accepts only `{ displayName }`; updates `organizations.legal_name` and aligns `tenants.name`; uses request-scoped `dbContext.orgId`.

`services/tenantService.ts` mirrors this narrow contract. Rich Company Profile implementation will require explicit API and OpenAPI expansion before source work begins.

### Certification and document capability

`components/Tenant/CertificationsPanel.tsx` already owns the full certification lifecycle UI:

- list, create, detail, and transition states;
- upload/replace certificate document;
- open short-lived signed document access;
- remove/delete certificate document;
- OWNER/ADMIN mutation controls with server-side enforcement.

`services/certificationService.ts` already provides list/detail/create/update/transition/upload/access/delete client methods.

`server/src/routes/tenant/certifications.g019.ts` already provides tenant-scoped document routes:

- `POST /api/tenant/certifications/{id}/document/upload`
- `GET /api/tenant/certifications/{id}/document`
- `DELETE /api/tenant/certifications/{id}/document`

The storage helper uses the private `certificate-documents` bucket, 5 MB max, PDF/JPG/PNG/WEBP magic-byte validation, private storage paths, and 300-second signed URLs. Certificate document paths and signed URLs are not returned in list/detail public summaries.

### Public B2B projection

`server/src/services/publicB2BProjection.service.ts` is the public-safe projection authority for `/api/public/b2b/suppliers`. It applies publication/eligibility/status/QA gates and explicitly prohibits price, org UUIDs, negotiation/order state, admin/governance fields, risk score, plan, registration number, external orchestration refs, and draft/unpublished data.

Current public-safe supplier fields include:

- slug;
- legal name;
- logo URL;
- org type;
- jurisdiction;
- taxonomy summary;
- certification count and deduped certification types for issued certifications;
- traceability evidence presence;
- public offering preview items with name, MOQ, and image URL.

`services/publicB2BService.ts` mirrors these fields for the frontend. `components/Public/B2BDiscovery.tsx` uses them for filters, supplier cards, trust badges, certification summary chips, traceability presence, and offering previews. It does not expose certificate document metadata, storage paths, signed URLs, uploaded filenames, private contact data, pricing, negotiation, or trade workflow data.

## 5. Design Decision

Company Profile should become the primary tenant-owned business profile workspace. Certifications should appear inside it as a focused `Certifications & Documents` subsection, but the existing full `CertificationsPanel` should not be embedded wholesale.

Reasoning:

- The existing panel is a complete standalone lifecycle workspace with list/detail/create navigation, back links, max-width layout, and transition controls.
- Company Profile needs a concise profile-readiness subsection: certification summary, document status, upload/replace/open/remove controls, and a link into the full Certifications workspace for create and lifecycle transitions.
- Reusing `certificationService` is appropriate immediately; extracting smaller UI widgets from `CertificationsPanel` should be the implementation path rather than duplicating document logic.

## 6. Rich Company Profile Information Architecture

### A. Profile Overview

- Display/legal name.
- Logo.
- Slug and public profile posture summary.
- Tenant status and editability.
- Profile completeness score with section-level missing items.

### B. Business Details

- Short business description.
- Business category/segment narrative.
- Jurisdiction and operating regions.
- Website and general business contact channel, if approved by public/private policy.
- Optional founded year/company size/capacity bands only after schema and privacy classification are approved.

### C. Capabilities

- Primary segment.
- Secondary segments.
- Role positions.
- Product/service capability summary.
- Linkage to catalog offering previews without leaking private catalog fields.

### D. Certifications & Documents

- Certification count and active/issued status summary.
- Certification type chips.
- Per-certification document state: none/uploaded, uploaded filename metadata if private tenant-only, MIME/size/uploaded timestamp.
- OWNER/ADMIN controls: upload/replace, open signed access, remove document.
- Non-edit users: read-only summary and signed-access open only if policy allows authenticated tenant members to view.
- Link to full Certifications workspace for create/detail/lifecycle transitions.

### E. Trust & Compliance

- Traceability evidence presence.
- Certification health summary.
- Verification/publication readiness status.
- Audit-safe explanation of what is public versus authenticated-only.

### F. Media & Branding

- Logo upload already exists.
- Future media gallery requires separate storage/publication design; do not mix certificate private storage with public media storage.

### G. Public Visibility Controls

- Read-only display of current public posture/eligibility for tenant users.
- Any mutation of publication posture remains control-plane governed unless a separate tenant self-publish policy is approved.
- Preview should use public projection semantics, not raw private profile fields.

## 7. Public vs Private Classification

### Public-safe candidates

- Legal/display name once publication gates pass.
- Logo URL.
- Org type.
- Jurisdiction.
- Taxonomy summary.
- Certification count.
- Certification types for issued/approved certifications.
- Traceability presence signal.
- Public offering preview fields already selected by projection.
- Curated business description only after explicit schema/API/public projection design.

### Authenticated tenant-only fields

- Certificate document uploaded filename, MIME, size, upload timestamp, storage status.
- Signed URL responses.
- Detailed certification lifecycle state if not already classified public.
- Profile edit controls and completeness diagnostics.
- Internal readiness warnings.

### Must remain private / prohibited from public projection

- Certificate document storage path.
- Certificate document bucket name.
- Signed URLs.
- Uploaded raw certificate documents.
- Buyer/supplier private contact fields unless explicitly public-approved.
- Price/pricing, negotiation state, order/trade state, admin/governance fields, risk score, plan, registration number, external orchestration refs, draft/unpublished data.

## 8. Role And Permission Model

- OWNER/ADMIN: edit profile, upload/replace/remove certificate documents, manage logo, navigate to full certification lifecycle controls.
- MEMBER: view profile and certification summaries; signed document access should follow existing tenant-auth policy and should be re-confirmed before implementation.
- VIEWER/read-only: no mutation controls; view-only behavior must be explicit in tests.
- Control Plane: public posture and tenant eligibility mutations remain separate.

## 9. Implementation Slice Plan

### Slice 1 - Company Profile certification access widget

Scope:

- Extract/reuse certification summary and document controls from `CertificationsPanel` into a Company Profile subsection.
- Use existing `certificationService` methods.
- No schema change if only current certification fields are shown.
- Preserve private document handling and server-side OWNER/ADMIN restrictions.

Expected source surfaces for future implementation:

- `components/Tenant/B2BProfileSettings.tsx`
- new or extracted tenant certification widget component if allowlisted
- `services/certificationService.ts` only if small client ergonomics are needed
- focused frontend tests

Validation recommendation:

- Focused frontend render tests for editable/read-only states.
- Existing server certification tests if API client contract remains unchanged.
- Production verification only with explicit safe tenant/certification authorization.

### Slice 2 - Rich profile API design and schema decision

Scope:

- Decide storage model for business description, website/contact, operating regions, capability narrative, and public visibility flags.
- Update API/OpenAPI design before implementation.
- Review `shared/contracts/db-naming-rules.md`, `schema-budget.md`, `rls-policy.md`, and tenant OpenAPI contract before any schema/API work.

This slice likely requires explicit schema/migration authorization.

### Slice 3 - Rich profile UI expansion

Scope:

- Add sectioned Company Profile UI for business details, capabilities, trust/compliance, and completeness.
- Keep White Label branding separate.
- Add progressive save states and section-level validation.

### Slice 4 - Public projection expansion

Scope:

- Only after profile fields are classified public-safe.
- Extend `publicB2BProjection.service.ts`, `services/publicB2BService.ts`, public UI, and OpenAPI/contracts as needed.
- Keep certificate documents excluded.
- Include neighbor-path smoke tests for `/api/public/b2b/suppliers` and `/b2b`.

### Slice 5 - Production runtime verification

Scope:

- Verify with approved safe OWNER/ADMIN tenant session.
- Upload/open/remove certificate document from Company Profile path only after explicit mutation authorization.
- Confirm public non-exposure remains clean.

## 10. Relationship To FTR-SL-017

FTR-SL-016B should not absorb broader supplier profile/public SEO/indexability work. It defines the tenant dashboard Company Profile design and certification access placement. Any broader public supplier profile page, public projection enrichment, SEO/indexability, or outreach-readiness gate should remain in the appropriate FTR-SL/FTR-SEO follow-up unit.

## 11. Risks And Follow-ups

- Embedding the whole `CertificationsPanel` would create duplicate navigation and confusing lifecycle controls inside Company Profile.
- Rich profile fields may require schema and OpenAPI changes; do not implement without explicit DB/API allowlist.
- Public projection expansion must not leak certificate document metadata or private profile fields.
- Certificate signed URLs must stay short-lived and never be logged or stored in governance artifacts.
- Company Profile completeness should not become a public-readiness claim until public projection and publication gates are included.

## 12. Closure

This design unit closes the `QA-CERT-UX-001` design question: certificate document upload/access should be reachable from Company Profile through a focused `Certifications & Documents` subsection backed by the existing certification service/routes, while full lifecycle management remains in the dedicated Certifications workspace.

Recommended next implementation unit:

`FTR-SL-016B1-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-IMPLEMENTATION-01`

Initial boundary for next unit:

- Implement Company Profile certification/document access widget using existing APIs.
- No schema migration.
- No public projection change.
- No production mutation unless explicitly authorized with exact safe tenant/certification lane.
