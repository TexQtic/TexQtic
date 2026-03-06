---
name: tenant-safety-check
description: "review tenant-isolation and authorization-boundary safety in multi-tenant systems. use when code touches org or tenant scoping, admin access, role checks, rls-sensitive paths, exports, reports, dashboards, search/list endpoints, joins, or any potentially cross-tenant read/write flow, including missing org filters, over-broad admin access, unsafe fallback queries, rls-only reliance, tenantid/org_id alias confusion, and cross-tenant exposure risk. review-only: inspect, classify, and report without implementing fixes."
---

# Tenant Safety Check

## Core Purpose
- Inspect and classify tenant-boundary safety risks.
- Identify likely cross-tenant exposure risks with evidence.
- Produce a reliable review report for a separate implementation prompt.
- Stop before implementation.

## Review-Only Rules
- Do not edit files.
- Do not generate patches or code.
- Do not silently switch into implementation.
- Do not propose bypassing or weakening auth/RLS controls.
- End with one recommended next safe action only.

## Required Review Method
Trace one scoped path in this order:
1. Entry point (UI, route, background job, export, report, admin action, or API).
2. Auth context and role assumptions.
3. Tenant/org identifier source and propagation.
4. Middleware/context setup and request scoping.
5. Route and service behavior.
6. ORM/query/data-access behavior.
7. Joins, filters, derived lookups, and returned shape.

## Risk Taxonomy
Classify each finding with one primary class:
- explicit tenant-scope missing
- auth/authorization mismatch
- rls-only reliance / defense-in-depth gap
- legacy alias confusion but likely safe
- cross-tenant exposure risk
- admin/superadmin scope ambiguity
- export/reporting overreach risk
- uncertain / needs deeper verification
- intentionally broader access with explicit governance backing

For detailed definitions and confidence wording, read [risk-classification.md](references/risk-classification.md).

## TexQtic Rules
- Read and follow `AGENTS.md` before review work.
- Treat `org_id` as the canonical tenant boundary.
- Treat `tenantId` as possible legacy/local aliasing unless evidence shows unsafe behavior.
- Do not treat aliasing alone as a bug.
- Keep RLS-sensitive wording precise; separate proven leaks from plausible risk.
- Prefer noting defense-in-depth gaps when app-layer filters are expected by doctrine.
- Do not assume superadmin/global access unless explicitly implemented and governed.

For repo-specific rules and thresholds, read [texqtic-tenancy-rules.md](references/texqtic-tenancy-rules.md).

## Evidence Discipline
- Require direct evidence before calling something a confirmed leak.
- Distinguish clearly:
  - confirmed leak
  - plausible risk
  - doctrine mismatch without leak evidence
- Label confidence for each finding (`high`, `medium`, `low`).
- If conclusion depends on policy/RLS config not visible in code, state that dependency explicitly.

## Required Output
Return a structured review report containing:
1. Review target
2. Why chosen
3. Files inspected
4. Auth/tenant boundary trace
5. Findings
6. Classification (per finding)
7. Confidence level (per finding)
8. Recommended next safe action
9. No-change confirmation

## Verification Guidance
Recommend:
- `implementation prompt next` when root cause and boundary behavior are clear with high confidence.
- `another narrow verification prompt next` when one unresolved link blocks confidence.
- `governance decision next` when doctrine interpretation determines acceptable behavior.
- `policy clarification next` when required auth/RLS policy intent is not visible in reviewed artifacts.

## Examples
### Generic SaaS Example
Target: `GET /api/customers/export` in a multi-tenant CRM.  
Trace: export UI -> client -> route -> service -> SQL join.  
Finding: export query scopes by role but misses tenant/org predicate.  
Classification: explicit tenant-scope missing.  
Confidence: high.  
Next safe action: implementation prompt next.

### TexQtic Example
Target: tenant list endpoint using `tenantId` fields with RLS context.  
Trace: tenant UI -> service -> tenant route -> with DB context -> Prisma query.  
Finding: aliasing between `tenantId` and canonical `org_id` appears consistent, but no explicit app-layer filter where doctrine may prefer defense in depth.  
Classification: rls-only reliance / defense-in-depth gap.  
Confidence: medium.  
Next safe action: governance decision next if doctrine requires explicit app-layer filters for this path.
