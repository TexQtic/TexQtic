# CROSSREPO-THREE-SYSTEM-ONBOARDING-DECISION-LOCK-001

## 1. Status Header

- Status: DESIGN_ONLY
- Type: Cross-repo governance decision-lock matrix
- Mode lock: no implementation, no runtime behavior change, no schema change, no provisioning execution, no production smoke
- Date: 2026-05-26
- Scope: Main App + CRM + CAE three-system subscriber onboarding

## 2. Source Artifacts Reviewed

| Repo | Commit | Artifact | Review result |
|---|---|---|---|
| Main App | 40e9085 | PLAN-THREE-SYSTEM-SUBSCRIBER-ONBOARDING-CAE-CRM-MAINAPP-01.md | reviewed |
| Main App | 40e9085 | PLAN-MAINAPP-SUBSCRIBER-PROVISIONING-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md | reviewed |
| CRM | d0fb8e4 | docs/product-truth/design/PLAN-CRM-VERIFICATION-APPROVAL-HANDOFF-IN-THREE-SYSTEM-ONBOARDING-01.md | reviewed |
| CAE | 6b0f4ed | docs/governance/PLAN-CAE-ACQUISITION-FIELD-AGENT-ROLE-IN-THREE-SYSTEM-ONBOARDING-01.md | reviewed |
| CAE | 6b0f4ed | docs/governance/README.md delta | reviewed |

## 3. System-of-Record Confirmation

| Domain | Owner | Display-only systems | Notes |
|---|---|---|---|
| acquisition capture context | CAE | CRM, Main App | CAE owns intake and field-capture context |
| verification and approval governance | CRM | CAE, Main App | CRM owns approve/reject/hold and orchestration reference |
| runtime identity (tenant/org/user/member) | Main App | CRM, CAE | Runtime identifiers are Main App authority |
| runtime role authority | Main App | CRM, CAE | CRM and CAE cannot mutate runtime roles |
| access artifacts (invite/login link) | Main App | CRM, CAE | CRM or CAE may only relay/display redacted evidence |
| activation truth | Main App | CRM, CAE | CRM and CAE consume evidence timeline only |
| field-agent assistance model | CAE | CRM, Main App | Assistance cannot override runtime authority |
| operational verification timeline | CRM | CAE, Main App | CRM timeline does not override runtime status truth |

System-of-record outcome:
- Confirmed alignment across all three plans.
- No plan grants CRM or CAE runtime mutation authority over Main App objects.

## 4. Contract Alignment Matrix

| Contract | Source repo | Consumer repo | Status | Gaps |
|---|---|---|---|---|
| CAE to CRM acquisition package | CAE | CRM | ALIGNED | Buyer/supplier capture delta detail still decision-gated |
| CRM to Main App approved provisioning envelope | CRM | Main App | ALIGNED | Buyer role/family mapping and conflict-code vocabulary not locked |
| Main App to CRM provisioning and activation evidence | Main App | CRM | ALIGNED | Evidence retention and redaction duration policy not locked |
| CRM/Main App to CAE display-safe assistance evidence | Main App + CRM | CAE | PARTIAL_ALIGN | Feed topology decision needed: CRM-mediated vs direct Main App feed |
| Login or access artifact ownership and handling | Main App + CRM + CAE | CRM + CAE | PARTIAL_ALIGN | Direct-send vs relay model and relay constraints not fully locked |
| QR issuance and evidence model | Main App + CRM + CAE | CRM + CAE | DECISION_GATED | Canonical issuer details, format, expiry, and display policy not locked |

## 5. Lifecycle Alignment Matrix

| Lifecycle state | CAE plan | CRM plan | Main App master/local plan | Alignment |
|---|---|---|---|---|
| CAE_CAPTURED | present (owner) | referenced | present | ALIGNED |
| CAE_SUBMITTED_TO_CRM | present (owner) | referenced | present | ALIGNED |
| CRM_RECEIVED | display-only | present (owner) | present | ALIGNED |
| CRM_UNDER_VERIFICATION | display-only | present (owner) | present | ALIGNED |
| CRM_APPROVED | display-only | present (owner) | present | ALIGNED |
| CRM_REJECTED | display-only | present (owner) | present | ALIGNED |
| CRM_HOLD | display-only | present (owner) | present | ALIGNED |
| MAINAPP_PROVISIONING_REQUESTED | implied/request stage | display-only | present (owner) | ALIGNED |
| MAINAPP_PROVISIONING_ACCEPTED | display-only | display-only | present (owner) | ALIGNED |
| MAINAPP_PROVISIONED | display-only | display-only | present (owner) | ALIGNED |
| ACCESS_LINK_ISSUED | display-only | display-only | present (owner) | ALIGNED |
| QR_ISSUED | display-only | display-only | present (owner, decision-gated details) | PARTIAL_ALIGN |
| SUBSCRIBER_ACTIVATED | display-only | display-only | present (owner) | ALIGNED |
| FIRST_LOGIN_COMPLETE | display-only | display-only | present (owner) | ALIGNED |
| FIELD_AGENT_ASSISTANCE_REQUIRED | present (owner) | referenced | present overlay | ALIGNED |
| FIELD_AGENT_ASSISTANCE_COMPLETE | present (owner) | referenced | present overlay | ALIGNED |
| CATALOGUE_READINESS_PENDING | display/assist | display timeline | present overlay | ALIGNED |
| CATALOGUE_READINESS_COMPLETE | display/assist | display timeline | present overlay | ALIGNED |
| INQUIRY_READINESS_PENDING | display/assist | display timeline | present overlay | ALIGNED |
| INQUIRY_READINESS_COMPLETE | display/assist | display timeline | present overlay | ALIGNED |

Lifecycle outcome:
- Shared lifecycle is compatible across all three artifacts.
- QR detail modeling remains decision-gated but does not break lifecycle naming alignment.

## 6. Blocking Decision Matrix

| Decision | Classification | Owner | Blocks which implementation | Next action |
|---|---|---|---|---|
| Buyer role/family mapping | DECISION_GATED | Main App plus CRM | CRM sender finalization; Main App contract hardening; buyer path | Lock buyer role matrix and base family defaults in cross-repo review |
| QR ownership, format, expiry, evidence display | DECISION_GATED | Main App plus CRM plus CAE | QR and access-artifact implementation; CAE evidence visibility | Lock canonical issuer, payload format, TTL, and redaction view rules |
| CRM relay vs Main App direct-send for access artifacts | DECISION_GATED | Main App plus CRM | Access-artifact implementation; evidence payload hardening | Select one sending model and define one-time artifact handling controls |
| Conflict code vocabulary | DECISION_GATED | Main App plus CRM | CRM sender and Main App contract hardening | Publish canonical conflict code set and mapping semantics |
| Evidence retention and redaction policy | DECISION_GATED | CRM plus CAE with Main App constraints | CAE evidence visibility; CRM evidence ingestion | Lock retention windows, token redaction rules, and audit visibility rules |
| CRM-mediated vs direct Main App evidence feed to CAE | DECISION_GATED | CRM plus Main App plus CAE | CAE assistance evidence visibility | Decide feed topology and trust boundary with least-privilege model |
| CAE Field Agent assistance state model | DECISION_GATED | CAE | CAE assistance evidence visibility; capture package implementation | Lock assistance state machine and escalation transitions |
| Mandatory catalogue and inquiry readiness milestones | DECISION_GATED | Main App plus CRM plus CAE | Supplier path completion and assistance completion logic | Define minimum mandatory milestones by party type |
| Buyer/supplier capture differences | REPO_TRUTH_NEEDED | CAE plus CRM | CAE capture package and CRM workflow implementation | Confirm capture-specific mandatory fields and validation per party type |

## 7. Implementation Readiness Matrix

| Future family | Status | Why | Required next step |
|---|---|---|---|
| CAE capture package implementation | NEEDS_DECISION_LOCK | Capture differences and assistance state model are not fully locked | Finalize party-specific capture matrix and CAE assistance transitions |
| CRM verification or approval workflow implementation | READY_FOR_BOUNDED_DESIGN | CRM authority boundary is explicit and aligned | Start bounded design prompt constrained to verification and approval internals |
| CRM to Main App provisioning sender | NEEDS_DECISION_LOCK | Conflict vocabulary and buyer role mapping are unresolved | Lock conflict codes and buyer mapping before sender contract implementation |
| Main App provisioning contract hardening | NEEDS_DECISION_LOCK | Buyer mapping and access-artifact send model unresolved | Lock buyer matrix plus send model; then harden contract fields |
| Main App status or evidence payload hardening | NEEDS_DECISION_LOCK | Evidence retention and CAE feed topology unresolved | Lock retention and feed topology rules |
| CAE assistance evidence visibility | NEEDS_DECISION_LOCK | Feed topology and redaction constraints unresolved | Lock evidence path and display-safe schema |
| QR or access artifact implementation | BLOCKED | QR issuer detail and relay model unresolved | Decision lock QR model and artifact ownership rules first |
| Buyer onboarding path | NEEDS_DECISION_LOCK | Buyer role and family mapping unresolved | Cross-repo buyer matrix lock required |
| Supplier onboarding path | READY_FOR_BOUNDED_DESIGN | Supplier direction and authority split are largely aligned | Proceed with bounded design while preserving current guardrails |

## 8. CAE README Delta Review

Commit reviewed: 6b0f4ed

Findings:
- Root README.md was not changed in this commit.
- The README delta is in docs/governance/README.md.
- Delta behavior: indexing/reference addition for the new CAE plan artifact.
- No runtime behavior changes found.
- No implementation instructions found.
- No service-auth guidance changes found.
- No authority boundary rewrites found.

Result:
- ACCEPTED (index/reference-only change)

## 9. Drift-Control Rules

1. No repo may change shared lifecycle states unilaterally.
2. No repo may add, remove, or rename shared contract fields without cross-repo review.
3. No repo may change access-link or QR ownership without cross-repo review.
4. No repo may change evidence retention or redaction rules without cross-repo review.
5. Any implementation prompt must cite the relevant repo-local plan and this decision-lock artifact.
6. CRM and CAE must never assume Main App runtime authority.
7. Main App must never assume CAE or CRM verification authority.
8. No repo may encode new cross-system authority assumptions by implementation before decision-lock updates are merged.

## 10. Repo Connection Recommendation

- Recommendation: YES
- Rationale: Future bounded design and contract-lock prompts require live repo-truth checks across all three repos to prevent divergence and stale assumptions.
- Operating constraint: use same safe governance workspace pattern as prior multi-repo collaboration; no credentials, remotes, submodules, or workspace configuration edits in this unit.

## 11. Open Questions

1. Final buyer role and base family mapping.
2. Canonical QR issuer details, payload format, and expiry policy.
3. Access-artifact direct-send versus CRM relay operating mode.
4. Canonical conflict-code vocabulary for deterministic retries and non-equivalent duplicates.
5. Evidence retention and redaction policy boundaries for CRM and CAE.
6. CAE evidence feed topology: CRM-mediated or direct Main App source.
7. Mandatory readiness milestones by party type for completion criteria.
8. Buyer versus supplier capture mandatory field differences.

## 12. Final Recommendation

NEEDS_PARESH_DECISION

Reason:
- System-of-record and lifecycle alignment are strong.
- Key cross-repo implementation-gating decisions remain unresolved and must be locked before sender, QR, buyer-path, and evidence-topology implementations begin.
