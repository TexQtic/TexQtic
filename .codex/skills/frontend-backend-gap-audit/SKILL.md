---
name: frontend-backend-gap-audit
description: "audit frontend-backend integration gaps by tracing ui to data access in full-stack applications. use when behavior is mismatched, incomplete, stubbed, or unclear across component, client, api, route, service, and database boundaries, including contract mismatch, missing implementation, broken wiring, response-shape mismatch, auth/tenant mismatch, and incomplete product surfaces. audit-only: inspect, classify, and report without implementing fixes."
---

# Frontend-Backend Gap Audit

## Core Purpose
- Inspect frontend-backend integration paths and classify gaps with evidence.
- Produce a reliable audit report that a separate implementation prompt can execute.
- Stop before implementation.

## Audit-Only Rules
- Do not edit files.
- Do not generate patches or code.
- Do not silently switch into implementation.
- Do not run destructive commands, migrations, or dependency installs for this skill.
- End with one recommended next safe action only:
  - `proceed to implementation prompt`
  - `request one additional narrow verification`
  - `request governance decision before implementation`

## Required Audit Method
Trace one scoped path in this order:
1. UI/component/view entry point.
2. State/hook/store/client layer.
3. API request construction (method, URL, payload, headers).
4. Backend route/handler and validation.
5. Service/business logic and auth checks.
6. ORM/query/data source and effective response shape.

Use direct file evidence whenever possible and mark uncertainty when evidence is incomplete.

## Classification Taxonomy
Classify each finding as one primary type:
- frontend-only issue
- backend-only issue
- contract mismatch
- missing implementation
- product-defined stub / intentional incompleteness
- auth/authorization mismatch
- tenancy-sensitive risk
- uncertain / needs deeper verification

For precise definitions and overclaim guardrails, read [classification-guide.md](references/classification-guide.md).

## TexQtic Rules
- Read and follow `AGENTS.md` before auditing.
- Treat `org_id` as the canonical tenancy boundary.
- Treat `tenantId` as possible legacy/local aliasing unless evidence proves doctrine inconsistency.
- Keep an RLS-sensitive posture; never recommend bypassing or weakening RLS.
- Distinguish product-incomplete surfaces from broken wiring.
- Do not invent backend semantics, status values, or auth behavior not shown by code/contracts.

For repo-specific reminders, read [texqtic-rules.md](references/texqtic-rules.md).

## Required Output
Return a structured audit report containing:
1. Audit target
2. Why chosen
3. Files inspected
4. End-to-end trace
5. Findings
6. Classification (per finding)
7. Confidence level (per finding)
8. Recommended next safe action
9. No-change confirmation

## Verification Guidance
Recommend:
- `proceed to implementation prompt` when scope and root cause are clear with high confidence.
- `request one additional narrow verification` when exactly one missing link blocks confidence.
- `request governance decision before implementation` when policy/doctrine interpretation is ambiguous.

## Examples
### Generic Full-Stack Example
Target: profile settings save path.  
Trace: settings view -> hook -> API client `PATCH /api/profile` -> route -> service -> ORM update.  
Finding: UI expects `displayName` in response, backend does not return it.  
Classification: contract mismatch.  
Next safe action: proceed to implementation prompt.

### TexQtic Example
Target: tenant Team Management memberships path.  
Trace: `TeamManagement` -> tenant service/client -> `GET /api/tenant/memberships` -> route -> Prisma query with tenant DB context.  
Finding: UI renders membership `status`, response shape does not provide it.  
Classification: contract mismatch.  
Next safe action: request governance decision before implementation only if doctrine interpretation remains ambiguous; otherwise proceed to implementation prompt.
