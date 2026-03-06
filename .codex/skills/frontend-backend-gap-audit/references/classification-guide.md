# Classification Guide

Use one primary classification per finding. Add a secondary class only when needed.

## frontend-only issue
- Definition: UI/state/client behavior is wrong while backend contract/logic is consistent.
- Typical evidence: incorrect component assumptions, local state bugs, wrong client mapping.
- Do not overclaim: do not mark backend failure without route/service/contract evidence.
- Typical next step: proceed to implementation prompt.

## backend-only issue
- Definition: Route/service/data behavior is wrong while frontend usage aligns with contract.
- Typical evidence: handler logic defect, missing validation, incorrect query/serialization.
- Do not overclaim: do not blame frontend without inspecting request construction.
- Typical next step: proceed to implementation prompt.

## contract mismatch
- Definition: Frontend and backend disagree on shape, field semantics, status codes, or auth expectations.
- Typical evidence: typed client expects fields absent from server response, or opposite.
- Do not overclaim: verify through request/response construction and shared contracts first.
- Typical next step: proceed to implementation prompt.

## missing implementation
- Definition: Expected path has no executable implementation in one or more required layers.
- Typical evidence: UI affordance without handler, API call without route, route without service path.
- Do not overclaim: avoid calling it a bug if scope is explicitly marked as incomplete product work.
- Typical next step: proceed to implementation prompt.

## product-defined stub / intentional incompleteness
- Definition: Code intentionally leaves behavior incomplete by product/design choice.
- Typical evidence: explicit "coming soon", stub components, gated placeholders, documented phase scope.
- Do not overclaim: do not classify as defect unless behavior contradicts stated scope/contract.
- Typical next step: request one additional narrow verification or governance decision if scope intent is unclear.

## auth/authorization mismatch
- Definition: Role/realm/access assumptions differ across frontend, route guards, and policy.
- Typical evidence: UI exposes action but route rejects role, or route allows beyond declared policy.
- Do not overclaim: confirm actual role checks and auth middleware behavior before classifying.
- Typical next step: request governance decision before implementation when policy intent is ambiguous; otherwise proceed to implementation prompt.

## tenancy-sensitive risk
- Definition: Potential tenant isolation weakness, often around scoping, RLS context, or cross-tenant access.
- Typical evidence: absent tenant scoping where expected, context misuse, boundary assumptions not enforced.
- Do not overclaim: distinguish direct leak evidence from defense-in-depth concerns.
- Typical next step: request governance decision before implementation.

## uncertain / needs deeper verification
- Definition: Evidence is incomplete or conflicting.
- Typical evidence: partial trace, missing contract coverage, ambiguous ownership of behavior.
- Do not overclaim: avoid assigning defect ownership without direct proof.
- Typical next step: request one additional narrow verification.
