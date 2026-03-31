# Investigation Scope Confirmation

This was handled as a read-only cross-repo investigation from the TexQtic main repo, with the main repo treated as orchestration and platform-truth context. I inspected the TexQtic main repo, the local CRM repo, and the local marketing repo, and did not modify runtime code, schema, or migrations.

The evidence shows three distinct bounded domains already exist today, but the boundaries are only partially normalized:

- Marketing owns public request capture and browser-side acquisition context.
- CRM owns internal commercial intake, qualification, onboarding case progression, issuance tracking, activation completion as CRM business truth, and post-activation internal customer servicing.
- The TexQtic platform owns actual tenant, organization, membership, invite, and runtime workspace truth.

# Entity Inventory

| Entity | Repo(s) where found | Current representation / model | Created where first | Used where | Current authority / system-of-record posture | Duplicate / overlap risk | Notes / ambiguity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Website Access Request / Lead Submission | Marketing, CRM | Marketing form payload; CRM `marketing.lead_submissions`; legacy marketing `marketing_access_requests` | Marketing form submission | Marketing proxy, CRM lead inbox, CRM qualification flow | Raw submission truth is effectively in CRM `marketing.lead_submissions` | High | Marketing still retains a legacy parallel intake/storage path |
| CRM Lead | CRM | `crm.leads` via qualification from submission | CRM admin qualification step | CRM lead queue, assignment, activity, onboarding eligibility | CRM | Low | Clearly separated from raw submission |
| Company / Account / Prospect | Marketing, CRM, Platform | `company_name` on submission/lead/case; CRM `customer_account_records.organization_name`; platform `tenants.name` and `organizations.legal_name` | Marketing first captures name; CRM operationalizes; platform provisions runtime org | All three | Split | High | `Company`, `account`, `tenant`, and `organization` are not normalized today |
| Contact / User / First Owner | Marketing, CRM, Platform | Marketing contact fields; CRM applicant/contact fields and `issued_auth_user_id`; platform `User`, `Membership`, owner role | Marketing captures contact first; CRM may mint external auth identity; platform creates/fetches platform user on provisioning or invite activation | All three | Split | High | No stable cross-system person identity was found beyond email and local IDs |
| Tenant / Organization / Workspace | Platform, CRM | Platform `Tenant`, `organizations`, `Membership`; CRM `workspace/current` is a customer-account view, not the platform tenant | Platform | Platform runtime; CRM only as internal activated-account context | Platform | Medium | CRM workspace is not the platform workspace model |
| Onboarding Record / Review | CRM | `crm.onboarding_cases`, `onboarding_case_events`, KYC/KYB posture | CRM | CRM onboarding workbench, issuance, activation completion | CRM | Low | Strongest canonical object in the cross-system flow today |
| Approval State | CRM, Platform | CRM `admin_approved`; platform `organizations.status` uses `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO` | CRM and platform separately | CRM onboarding flow; platform control-plane activation flow | Split | High | Two approval vocabularies exist for related but not identical concerns |
| Access Issuance | CRM, Platform | CRM `onboarding_case_issuances`; platform `Invite` for tenant member activation/invite flows | CRM and platform separately | CRM external activation; platform invite/member access | Split | High | CRM issuance and platform invite are not currently unified |
| Activation | CRM, Platform | CRM `first_login_at`, `activation_completed_at`, `client_activated`; platform `/api/tenant/activate`, org status updates, tenant `ACTIVE` state | CRM and platform separately | CRM applicant activation and customer account promotion; platform tenant runtime activation | Split | High | `Activated` means different things in CRM and platform |
| Plan / Subscription / Entitlement | CRM, Platform | Platform `tenant.plan` and `organizations.plan`; CRM `commercial_posture` and customer-account servicing state | Platform for plan; CRM for commercial posture | Platform runtime, CRM internal ops | Mostly platform for runtime entitlement | Medium | No canonical cross-system subscription object was found |
| Audit / Lifecycle Event | Marketing, CRM, Platform | Marketing `form_events`; CRM `onboarding_case_events` and lifecycle history; platform audit logs and tenant events | Local to each repo | Local to each repo | Local per bounded domain | Medium | No shared event backbone across the three systems was found |
| Marketing attribution fields | Marketing, CRM | URL params, referrer, landing URL in marketing proxy; intended top-level CRM submission fields plus `raw_payload` | Marketing | CRM submission storage and review | Raw capture starts in marketing, persisted raw truth should be CRM submission record | Medium | Current implementation drifts from the documented canonical intake contract |

# Lifecycle Inventory

| Lifecycle object | States found today | Repo(s) where state lives | What triggers transitions | Who/what consumes the state | Ambiguities / missing transitions | Whether state is internal-only, platform-only, or cross-system |
| --- | --- | --- | --- | --- | --- | --- |
| Website lead received | `new`, `under_review`, `duplicate_candidate`, `qualified`, `rejected`, `converted` | CRM marketing schema and CRM bridge code | Marketing proxy submission; CRM review actions; qualification | CRM lead inbox and qualification flow | Marketing legacy path still has separate `pending` style state | Cross-system entry seam |
| CRM lead | `new`, `contacted`, `unqualified`, `converted` | CRM | Qualification and lead-status updates | CRM sales/ops users; onboarding eligibility | `Converted` points to downstream ops, but not enough alone to imply onboarding or tenant creation | Internal-only |
| Onboarding case | `new`, `under_review`, `approved_pending_docs`, `docs_requested`, `docs_received`, `docs_rework_required`, `docs_verified`, `rep_recommended`, `admin_approved`, `credentials_sent`, `client_activated`, `rejected`, `stalled_timed_out` | CRM | Lead promotion, KYC/KYB actions, approval actions, issuance, activation completion | CRM onboarding, activation surface, customer-account promotion | Very clear internally, but not reconciled to platform org/tenant status | Internal with cross-system implications |
| KYC/KYB posture | `not_required`, `pending_request`, `evidence_received`, `rework_required`, `verified`, `exception_hold`, `waived` | CRM | Onboarding case actions | CRM onboarding/compliance | Separate from approval, which is good, but not linked to platform verification status | Internal-only |
| Access issuance | `sent`, `delivery_failed`, `expired`, `invalidated`, `consumed` | CRM | Issue, resend, reissue, invalidate, first-login evidence | CRM onboarding and applicant activation surface | No observed direct bridge from issuance record to platform tenant/org creation | Internal with cross-system intent |
| First login evidence | Timestamp only via `first_login_at` plus issuance consumed | CRM | Authenticated visit to CRM applicant activation surface | CRM onboarding activation context | First login is treated as evidence, not final activation | Internal with cross-system intent |
| Activation completion | `client_activated` on onboarding case; customer account auto-promotion | CRM | Explicit CRM completion endpoint after first-login evidence | CRM workspace/current, customer account record, service flows | No observed main-platform callback or mirrored status | Internal CRM business truth |
| Customer account record | `active`, `restricted`, `inactive`, `closed` | CRM | Auto-promotion from `client_activated`; lifecycle operations | CRM post-activation service and ownership | Internal account state is distinct from platform tenant plan/status, which is correct but unresolved | Internal-only |
| Platform tenant/org onboarding | `PENDING_VERIFICATION`, `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO`, then `ACTIVE` | Platform | Tenant activation, control-plane onboarding outcome route, control-plane activate-approved route | Platform control plane, tenant session identity | Duplicates part of CRM onboarding/approval semantics without shared contract | Platform-only |
| Platform tenant runtime | Tenant `ACTIVE`, `SUSPENDED`, `CLOSED`; org carries runtime identity and plan | Platform | Admin provisioning, control-plane state changes | Platform auth, workspace, tenant session resolution | Not linked to CRM `client_activated` or CRM customer account automatically | Platform-only |
| Post-activation operational state | CRM customer-account lifecycle and service tickets | CRM | Customer account lifecycle operations and service tickets | CRM operators | No observed reflection from platform usage/tenant state back into CRM lifecycle | Internal-only |

# Join-Key Inventory

| Object pair / handoff | Current linking field(s) | Repo where field exists | Whether the join is stable, missing, indirect, or duplicated | Risk / ambiguity | Recommended normalization question |
| --- | --- | --- | --- | --- | --- |
| Marketing submission ↔ CRM lead | `submissionId` / `submission_id` | CRM | Stable | Low | Should this remain the canonical intake-to-lead bridge? |
| CRM lead ↔ CRM onboarding case | `source_lead_id` | CRM | Stable | Low | This is a good canonical internal promotion key |
| CRM onboarding case ↔ raw submission | `source_submission_id` | CRM | Stable | Low | Keep as historical origin anchor? |
| CRM onboarding case ↔ CRM issuance | `case_id` | CRM | Stable | Low | Good bounded issuance anchor |
| CRM onboarding case ↔ CRM customer account | `onboarding_case_id` | CRM | Stable | Low | Good post-activation internal anchor |
| CRM auth identity ↔ CRM customer account | `issued_auth_user_id` and `platform_auth_user_id` | CRM | Stable, but CRM-local | Medium | Is this `platform auth` name now misleading if it is not the TexQtic main platform identity? |
| CRM approval ↔ CRM activation event | Onboarding case status plus onboarding case events | CRM | Stable | Low | Good internal business-truth chain |
| Platform tenant ↔ platform organization | Same UUID: `tenants.id = organizations.id` | Platform | Stable | Low | This is already a strong internal platform identity seam |
| Platform user ↔ platform tenant | `memberships.user_id`, `memberships.tenant_id` | Platform | Stable | Low | Good internal platform ownership seam |
| Marketing submission ↔ platform tenant/org | None observed | None cross-repo | Missing | High | Should a future bridge use submission ID, CRM lead ID, or a new orchestration ID? |
| CRM lead ↔ platform tenant/org | None observed | None cross-repo | Missing | High | What is the canonical cross-system business object that deserves a platform org ID? |
| CRM company/account ↔ platform tenant/org | None observed beyond names/emails | CRM and platform | Indirect | High | Is the platform org created from CRM onboarding approval, CRM activation, or independent platform provisioning? |
| CRM contact ↔ platform first-owner/user | Email only, plus unrelated local auth/user IDs | CRM and platform | Indirect | High | Do we need a cross-system person identity or only a bounded handoff contract? |
| CRM approval / issuance ↔ platform activation event | None observed | None cross-repo | Missing | High | Which event should be the lawful cross-system handoff: approval, issuance, first login, or activation completion? |
| Marketing attribution ↔ CRM lead / onboarding / account | Submission-origin fields only | CRM | Stable only at submission layer | Medium | Which attribution fields should survive beyond raw intake and how far downstream? |

# Handoff / Seam Inventory

| Handoff name | From system | To system | Trigger/event | Current payload / contract | Current status | Blocking questions | Repo where later implementation would likely belong |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marketing website → CRM intake | Marketing | CRM | Public form POST to marketing proxy | Real server-to-server JSON payload and CRM webhook | real | Canonical payload drift still exists; legacy endpoint still survives | Marketing repo and CRM repo |
| CRM lead qualification → onboarding case | CRM lead workflow | CRM onboarding workflow | Operator promotes eligible lead | `source_lead_id`, `source_submission_id`, applicant/contact fields | real | None major inside CRM | CRM repo |
| CRM onboarding review → issuance | CRM onboarding workflow | CRM issuance workflow | Admin-approved onboarding case | Onboarding case plus auth-user issuance record | real | Still internal to CRM, not a platform handoff yet | CRM repo |
| CRM lead qualification → onboarding/issuance as one combined seam | CRM lead workflow | CRM onboarding + issuance | Qualification then later approval | Not one single contract; it is a staged internal chain | partial | This is not actually one bounded event today | CRM repo |
| CRM approval / issuance → platform tenant/org provisioning | CRM | Platform | Not observed | No real cross-repo payload or ID bridge found | missing | What object is handed off, and when? | Starts in main repo design, then likely split between CRM and platform repos |
| Platform activation / first login → CRM state reflection | Platform | CRM | Not observed in main platform repo | No real callback/webhook/consumer found | missing | Is CRM supposed to listen to platform activation, or remain independent? | Main repo design first, then CRM repo for reflection consumer |
| CRM applicant activation surface → CRM activation completion | CRM external applicant route | CRM onboarding/customer account | Authenticated applicant completes activation | First-login evidence plus explicit completion endpoint | real | This is inside CRM, not a platform seam | CRM repo |
| Platform provisioning → platform workspace runtime | Platform control plane | Platform tenant experience | Admin provisioning or invite activation | Platform-local tenant/org/user/membership model | real | Not connected to CRM onboarding chain | Main repo |
| Platform invite/member invite → platform user onboarding | Platform | Platform | Invite token acceptance | Invite token, tenant/user/membership state | real | Distinct from CRM issuance; needs normalization later | Main repo |

# System-of-Record Draft

| Core entity | Draft posture | Confidence | Notes |
| --- | --- | --- | --- |
| Raw website submission | system of record: CRM `marketing.lead_submissions` | High | Marketing repo should remain capture/proxy, not long-term storage authority |
| Legacy marketing request record | temporary bridge object | High | Existing legacy `marketing_access_requests` path should not be treated as future canonical truth |
| Qualified lead | system of record: CRM lead | High | Clear commercial-ops object |
| Onboarding case | system of record: CRM onboarding case | High | Clear pre-activation business-truth ledger |
| Approval for issuance | system of record: CRM onboarding case state | High | Strong internal business authority |
| Access issuance | system of record: CRM onboarding issuance record | Medium | Canonical for CRM issuance evidence, not yet for platform access |
| Customer account record | workflow-owned non-canonical record | Medium | Canonical for internal CRM servicing, but not equivalent to platform tenant/org |
| Platform tenant | system of record: platform tenant/org model | High | Runtime org/workspace truth belongs in main platform repo |
| Platform organization identity | system of record: platform `organizations` | High | Carries platform legal/runtime identity and plan |
| Platform membership / first owner | system of record: platform membership/user model | High | Runtime access truth belongs in platform |
| Marketing attribution | system of record: raw CRM submission record | Medium | Originates in marketing, should be persisted canonically in CRM raw intake |
| Plan / entitlement | system of record: platform | Medium | CRM has commercial posture, not a runtime entitlement model |
| Activation business truth | system of record: CRM `client_activated` | Medium | Strong for CRM operations, but not yet reconciled with platform runtime activation |
| Activation runtime truth | system of record: platform tenant/org status | Medium | Strong for platform runtime, but not reconciled with CRM business activation |
| Audit / lifecycle events | projection / local subsystem truth | High | Each repo has its own local event/audit model today |
| Cross-system orchestration ID | missing | High | No canonical orchestration identifier exists across all three systems today |

# Open Questions / Blind Spots

1. Company vs account vs tenant vs organization is not normalized. CRM has lead/company and customer-account language; the platform has tenant and organization language; none of that is joined by a shared ID.
2. Contact vs first-owner vs auth user is unresolved. Marketing captures contact intent, CRM can mint a CRM-local auth identity, and the platform has its own user and membership model.
3. Approval vs provisioning vs access issuance vs activation are separate tracks today. CRM approval and issuance do not automatically create or link a platform tenant, and platform activation does not obviously reflect back to CRM.
4. Plan / commercial / entitlement truth is split. The platform clearly owns runtime plan, while CRM owns commercial posture and customer servicing posture.
5. CRM-origin and platform-origin identifiers do not reconcile cleanly yet. Stable links exist inside each repo, but no durable cross-repo key was found.
6. Marketing raw submissions should remain permanently separate from CRM operational leads unless TexQtic explicitly decides to collapse raw intake and qualified lead history, which would likely be a mistake.
7. The marketing repo still carries a legacy intake/storage path in parallel with the newer CRM proxy path. That creates ongoing ambiguity about which path is canonical.
8. CRM’s `platform auth user` naming is semantically risky if that identity is only for the CRM external activation/workspace surface and not the main TexQtic platform.
9. The main platform repo has its own onboarding outcome and activation state machine on `organizations.status`, which currently overlaps conceptually with CRM onboarding approval and activation completion.
10. No real cross-system event seam was found for `CRM approved, now provision tenant` or `platform activated, now reflect back to CRM`.

# Repo Trigger Guidance

## A. Investigation phase

Trigger in the TexQtic main repo.

Why:

- This is the orchestration context for tenant/org/workspace truth, platform-facing lifecycle interpretation, and cross-system boundary decisions.
- CRM and marketing should remain read-only evidence sources during reconciliation.

## B. Canonical business-model design phase

Trigger in the TexQtic main repo.

Why:

- The unresolved questions are cross-system questions, not CRM-only or marketing-only questions.
- The design needs to decide how CRM onboarding truth, platform tenant truth, and marketing-origin submission truth relate without collapsing bounded roles.

## C. CRM-side intake / commercial contract implementation phase

Trigger in the CRM repo.

Why:

- Raw intake persistence, qualification, onboarding cases, approval, issuance, activation completion, customer-account records, and service operations already live there.
- The main repo should remain a read-only evidence source for tenant/org/workspace boundaries during this phase.

## D. Platform-side tenant / activation / workspace handoff implementation phase

Trigger in the TexQtic main repo.

Why:

- Tenant provisioning, org status, invites, memberships, activation, and the actual runtime workspace live there.
- CRM should remain a read-only evidence source unless a companion reflection contract is explicitly being implemented in the CRM repo too.

## E. Marketing-site submission contract implementation phase

Trigger in the marketing repo.

Why:

- The request-access form, UTM/referrer capture, and server-side proxy route live there.
- CRM should remain the read-only target-contract source unless the webhook contract itself changes.

# Recommended Next Roadmap

Investigation is complete enough to open the canonical cross-system business-model design phase. It is not complete enough to start schema design safely.

The next artifact should be a bounded cross-system canonical model and handoff-contract design prompt, triggered in the TexQtic main repo. The CRM repo and marketing repo should remain read-only evidence sources for that next step.

Before any schema design begins, these decisions need to be explicit:

1. What is the canonical cross-system object chain from raw submission to qualified lead to onboarding case to customer account to platform tenant/org.
2. Whether CRM `client_activated` is the lawful trigger for platform provisioning, platform activation reflection, or neither.
3. Whether platform provisioning happens before CRM issuance, after CRM approval, or after CRM activation completion.
4. Whether a single orchestration ID is needed across the three systems, and which object should own it.
5. Whether marketing legacy intake/storage is formally retired or kept as a bridge with strict non-canonical status.
6. Whether `customer account record` is purely internal CRM ops truth or must be linked one-to-one with a platform tenant/org.
7. How first-owner/contact/auth identity should be represented without conflating CRM applicant identity with platform user identity.

The likely next prompt routing remains:

1. Investigation / system reconciliation: TexQtic main repo.
2. Canonical cross-system design: TexQtic main repo.
3. CRM ingestion / lead-lifecycle implementation: CRM repo.
4. Marketing request-access payload / submission implementation: marketing repo.
5. Platform tenant / activation / workspace implementation: TexQtic main repo.