# Tenant Safety Risk Classification

## explicit tenant-scope missing
- Definition: tenant/org boundary predicate or context is absent where required.
- Typical evidence: query or lookup path lacks tenant/org scoping.
- Do not overclaim: verify no equivalent enforced scope exists upstream/downstream.
- Typical next step: implementation prompt next.

## auth/authorization mismatch
- Definition: role/realm/access assumptions differ across UI, route, and service.
- Typical evidence: action exposed in UI but blocked by route, or route allows beyond declared role intent.
- Do not overclaim: confirm actual middleware and role checks before classification.
- Typical next step: implementation prompt next or policy clarification next.

## rls-only reliance / defense-in-depth gap
- Definition: correctness depends only on RLS/context where doctrine expects explicit app-layer scoping too.
- Typical evidence: route/service query has no explicit tenant filter while relying on RLS context.
- Do not overclaim: this is not automatically a leak.
- Typical next step: governance decision next.

## legacy alias confusion but likely safe
- Definition: `tenantId` and `org_id` naming varies, but effective boundary appears preserved.
- Typical evidence: alias mapping is consistent and scoped context is enforced.
- Do not overclaim: do not label as bug without unsafe behavior evidence.
- Typical next step: another narrow verification prompt next or policy clarification next.

## cross-tenant exposure risk
- Definition: path likely enables cross-tenant access.
- Typical evidence: broadened query scope, missing boundary checks, or joins that can span tenants.
- Do not overclaim: call confirmed leak only with direct evidence.
- Typical next step: implementation prompt next.

## admin/superadmin scope ambiguity
- Definition: broader-access logic exists but intended boundaries are unclear.
- Typical evidence: admin flags/context used without clear governance notes or explicit guardrails.
- Do not overclaim: do not assume global-read rights from role names alone.
- Typical next step: governance decision next.

## export/reporting overreach risk
- Definition: export/reporting path can aggregate beyond intended tenant boundaries.
- Typical evidence: report/export query lacks tenant scoping or mixes scoped and unscoped sources.
- Do not overclaim: validate whether explicit control-plane governance permits broader reads.
- Typical next step: governance decision next or implementation prompt next.

## uncertain / needs deeper verification
- Definition: evidence is incomplete or conflicting.
- Typical evidence: missing policy visibility, unresolved route path, ambiguous context setup.
- Do not overclaim: avoid assigning leak status without proof.
- Typical next step: another narrow verification prompt next.

## intentionally broader access with explicit governance backing
- Definition: broader access is explicitly designed, implemented, and governed.
- Typical evidence: documented control-plane policy + matching route/auth/context behavior.
- Do not overclaim: keep scope limited to what evidence directly supports.
- Typical next step: policy clarification next only if governance docs are ambiguous.

## Confidence Wording Examples
- High confidence: "confirmed by direct route and query evidence in reviewed files; no contradictory path found."
- Medium confidence: "likely based on reviewed code path; conclusion depends on unseen policy/config details."
- Low confidence: "insufficient evidence in current scope; additional narrow verification is required."
