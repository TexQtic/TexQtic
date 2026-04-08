# QA-TENANT-CLASSIFICATION-SEED-NAMING-AND-SUPERADMIN-CLEANUP-PLAN-v1

Status: planning only
Date: 2026-04-08

This artifact defines the canonical TexQtic QA tenant classification system, the missing verification
seed plan, the naming standard for recurring runtime verification, and the operational cleanup model
for the current 440-tenant superadmin inventory.

This artifact does not authorize or execute:

- tenant seeding
- tenant renaming
- tenant deletion
- tenant archiving
- runtime or backend changes
- governance or product-code implementation

Authority and basis used:

- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-TENANT-MODE-TAXONOMY-AND-COMMERCIAL-CONTINUITY-VALIDATION-v1.md`
- `governance/analysis/TEXQTIC-CONTROL-PLANE-TENANT-LIST-LATENCY-REMEDIATION-001.md`
- `governance/analysis/TEXQTIC-FOUNDATION-CORRECTION-AND-DESCRIPTOR-CUTOVER-IMPLEMENTATION-PLAN-v1.md`
- `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
- `docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md`
- `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
- `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
- `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
- `docs/ops/ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001.md`

## 1. Executive judgment

Yes. TexQtic now has enough verified runtime truth to define a canonical QA tenant system and a
superadmin cleanup plan.

Why this is now sufficient:

- control-plane runtime is verified and stable enough to serve as the staff-side QA anchor
- non-white-label B2B workspace runtime is verified through direct login
- non-white-label B2C storefront runtime is verified through exact tenant-context proof, but the
  current proof tenant is not a clean recurring QA identity
- WL storefront plus WL admin overlay are verified as runtime realities, but the currently named
  direct-login WL credential is not backend-true WL and must not remain canonical QA labeling
- there is no clean current aggregator QA tenant
- there is no clean current blocked or provisioning-pending QA tenant
- the superadmin registry is already large enough that cleanup must be classification-first, not
  action-first

One non-blocking carry-forward gap remains:

- the immediate repo corpus does not preserve the exact display name or tenant id of the separate
  backend-true WL-capable impersonation proof tenant referenced by the latest operational pass

That gap does not block the system decision made here, because canonical WL QA should move to a
direct-login QA WL tenant rather than depending on impersonation-only proof.

## 2. Canonical tenant classification model

The canonical recurring QA model should use runtime-family truth, not brand-like names, not billing
plan labels, and not historical shorthand.

| QA class | Runtime family | Overlay expectation | Verification purpose | Existing coverage already exists | New seeding required |
| --- | --- | --- | --- | --- | --- |
| QA Control Plane | `control_plane` | none | staff login, tenant registry, tenant-context entry, inventory review | yes | no |
| QA B2B Workspace | `b2b_workspace` | none | direct-login business workspace verification for the non-WL B2B path | yes, through the legacy Acme B2B baseline | no; use repurpose-and-rename |
| QA B2C Storefront | `b2c_storefront` | none | direct-login non-WL storefront verification with truthful browse and cart-entry coverage | partial only; current proof depends on legacy or impersonated tenants | yes |
| QA WL Runtime | `wl_storefront` | `wl_admin` overlay available to owner or admin only | direct-login WL storefront verification plus direct-login WL admin overlay verification | partial only; current direct login is misleading and current true-WL proof is not a clean canonical identity | yes |
| QA WL Member edge-case | `wl_storefront` | must not receive `wl_admin` overlay | verify branded storefront continuity for a non-owner, non-admin member on the same WL tenant | no clean current coverage | yes |
| QA Aggregator Workspace | `aggregator_workspace` | none | direct-login curated directory and intent-handoff workspace verification | no clean current coverage | yes |
| QA Pending / Blocked | `blocked_pending_verification` | none | verify provisioning-pending or verification-pending tenant entry, status visibility, and blocked trade-capable posture | no clean current coverage | yes |

Normalization rules preserved by this model:

- `WL_ADMIN` remains overlay-only and must never be treated as a base runtime family
- `ENTERPRISE` remains billing-plan language only and must never be used as runtime shorthand
- WL runtime naming must describe runtime truth, not branding-style labels
- blocked or pending verification is a tenant-entry posture, not a synonym for B2B, B2C, WL, or
  Aggregator family identity

## 3. Current known tenant mapping

| Current identity | Actual runtime truth | Current naming problem | Recommended action |
| --- | --- | --- | --- |
| `admin@texqtic.com` | control-plane staff login; no tenant runtime ambiguity | none material; this is a staff identity, not a tenant label | `KEEP_AS_IS` |
| `owner@acme.example.com` | direct-login non-WL `b2b_workspace` | `Acme` is a sample brand name and current practice lets it stand in for generic "enterprise tenant" wording | `REPURPOSE_AND_RENAME` |
| `Acme Corporation` / `acme-corp` | non-WL `b2b_workspace` tenant row | legacy sample naming keeps the B2B proof path tied to enterprise-style shorthand instead of the canonical QA system | `REPURPOSE_AND_RENAME` |
| `owner@whitelabel.example.com` | backend-truth non-WL `b2c_storefront`; frontend currently normalizes it into WL runtime behavior | the email, tenant name, slug, and custom-domain posture all imply WL while backend truth says non-WL B2C | `REMOVE_FROM_QA_SET` |
| `White Label Co` / `white-label-co` | backend-truth non-WL `b2c_storefront` tenant row carrying WL-like residue | the row itself preserves the exact WL naming and domain residue the clean QA system is supposed to retire | `REMOVE_FROM_QA_SET` |
| `B2C Browse Proof 20260402080229` | exact non-WL `b2c_storefront` proof tenant reached through control-plane tenant context | long timestamped proof name, impersonation-dependent entry, and empty-inventory proof state make it unsuitable as recurring QA identity | `REMOVE_FROM_QA_SET` |
| separately verified backend-true WL-capable impersonation proof tenant | `wl_storefront` with real `wl_admin` overlay behavior | exact display name and tenant id are not preserved in the current repo artifact basis; current proof posture depends on impersonation rather than canonical direct login | `REPLACE_WITH_NEW_QA_IDENTITY` |
| `member@whitelabel.example.com` | not a confirmed seeded login identity; only audit-log residue exists in current repo seed history | implies a real member credential exists when current corpus only proves an invite-like audit row | `REPLACE_WITH_NEW_QA_IDENTITY` |

Operational interpretation of the mapping:

- current identities are sufficient to explain current truth
- current identities are not clean enough to remain the canonical recurring QA system
- canonical QA should move to one QA-prefixed tenant set and one QA-prefixed edge-case account set

## 4. Naming-system standardization

The naming standard should use one reserved QA prefix across every tenant-side recurring verification
surface:

- display name prefix: `QA` followed by a space
- slug prefix: `qa-`
- email standard: `qa.<family>@texqtic.com`

Canonical family codes:

- `B2B`
- `B2C`
- `WL`
- `AGG`
- `PEND`

Control-plane note:

- control-plane is not a tenant row, so the staff login remains `admin@texqtic.com`
- human QA notes should refer to that path as `QA CTRL`

Tenant naming standard:

| Verification family | Display name | Slug | Primary email | Optional edge-case email |
| --- | --- | --- | --- | --- |
| B2B | `QA B2B` | `qa-b2b` | `qa.b2b@texqtic.com` | none by default |
| B2C | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` | none by default |
| WL | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` | `qa.wl.member@texqtic.com` |
| AGG | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` | none by default |
| PEND | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` | none by default |

Naming rules:

1. Every canonical QA tenant row must begin with `QA` followed by a space in the tenant display name.
2. Every canonical QA tenant slug must begin with `qa-`.
3. Every canonical QA tenant-side login email must use the `qa.<family>@texqtic.com` convention.
4. No canonical QA tenant may use `enterprise`, `white-label`, brand names, timestamp suffixes, or
   billing-plan words in its display name, slug, or primary login email.
5. `WL` is allowed in the QA family code only as shorthand for the verified WL runtime family; it
   must not imply a separate base tenant category in backend truth.

## 5. Recommended canonical QA tenant set

The steady-state recurring QA set should be the following exact set.

| Required QA identity | Display name | Slug | Primary login email | Runtime family | Overlay expectations | Direct login required | Minimal product-bearing data required | Seed data that should exist |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA Control Plane | not applicable | not applicable | `admin@texqtic.com` | `control_plane` | none | yes | no | tenant registry must visibly contain the canonical `qa-` tenants and allow tenant-context entry |
| QA B2B | `QA B2B` | `qa-b2b` | `qa.b2b@texqtic.com` | `b2b_workspace` | none | yes | yes | at least 1 active catalog item, 1 RFQ list or detail path, 1 order row, and 1 audit-log row |
| QA B2C | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` | `b2c_storefront` | none | yes | yes | at least 3 visible active products, at least 1 browse category or featured grouping, and cart-entry continuity on rendered cards |
| QA WL | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` | `wl_storefront` | owner or admin must receive `wl_admin` overlay; storefront remains reachable from same identity | yes | yes | branding row, verified platform domain, optional custom-domain test row, at least 3 active products, at least 1 collection, at least 1 order row, and at least 1 staff row |
| QA WL Member | `QA WL` | `qa-wl` | `qa.wl.member@texqtic.com` | `wl_storefront` | must not receive `wl_admin` overlay | yes | yes, shared with `QA WL` | same tenant as `QA WL`; requires real member membership only |
| QA AGG | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` | `aggregator_workspace` | none | yes | no | non-empty curated discovery state, at least 2 visible company or discovery entries, and at least 1 audit row |
| QA PEND | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` | `blocked_pending_verification` | none | yes | no | explicit pending or blocked verification state, visible status explanation, and trade-capable surfaces still blocked |

Steady-state policy:

- only the identities above count as canonical recurring QA tenants
- legacy demo, proof, and historically named tenants may continue to exist temporarily, but they
  must not remain in the QA keep-set

## 6. Seed plan for missing tenants

`QA Control Plane` does not require new seeding.

`QA B2B` is not seed-new. It should be created by repurposing and renaming the existing Acme B2B
baseline.

The seed-new identities below should be prepared through one bounded seed plan.

| Recommended seed | Exact runtime purpose | Why current tenant set is insufficient | Exact display name | Exact slug | Exact login email | Exact recommended role(s) | Exact minimal seed data | Product-bearing data required | Can an existing tenant be repurposed instead |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA B2C | clean direct-login non-WL B2C storefront proof | `White Label Co` is misleading and the exact B2C proof tenant is impersonation-only and thin on inventory | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` | `OWNER` | at least 3 visible active products, 1 category or featured grouping, and working card-level cart entry | yes | possible, but not recommended; current B2C candidates are either misleading or thin-data proof tenants |
| QA WL | clean direct-login WL storefront plus WL admin overlay proof | current direct login is backend-non-WL and the known true-WL proof path is not a canonical direct-login QA identity | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` | `OWNER` or `ADMIN` | branding, verified platform domain, optional custom-domain test row, 3 active products, 1 collection, 1 order row, 1 staff row | yes | no clean existing tenant can be assumed reusable at planning time |
| QA WL Member account | verify member-visible WL storefront without admin overlay | current corpus does not prove a real member login for WL; only audit residue exists | `QA WL` | `qa-wl` | `qa.wl.member@texqtic.com` | `MEMBER` | same tenant data as `QA WL`; requires real membership and non-admin role | yes, shared with `QA WL` | no |
| QA AGG | clean direct-login aggregator workspace proof | there is no current clean aggregator verification tenant | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` | `OWNER` | at least 2 visible directory or discovery entries and 1 audit-log row | no | no |
| QA PEND | clean blocked or pending verification entry proof | current shared environment has no canonical blocked or pending verification QA tenant | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` | `OWNER` | visible pending-verification status, stable blocked-state message, and blocked trade or RFQ entry posture | no | no |

Recommended later operational order for the seed-new identities:

1. `QA B2C`
2. `QA WL`
3. `QA WL Member`
4. `QA AGG`
5. `QA PEND`

## 7. Immediate rename or repurpose recommendations

Recommended posture for the current named legacy tenants after the canonical QA set is approved:

- `Acme Corporation` should no longer be described as the generic "enterprise tenant". It should be
  repurposed and renamed into `QA B2B` so the non-WL B2B proof path is retained without preserving
  enterprise-style runtime shorthand.
- `White Label Co` should no longer be used as canonical human QA labeling for any purpose. It is
  backend-truth non-WL B2C and its current name creates exactly the runtime-family confusion this
  plan is intended to remove.
- current WL verification should be repointed to a direct-login `QA WL` tenant. Superadmin
  impersonation may remain a supplemental staff-path check only; it must not remain the canonical
  WL verification method.

Recommended immediate handling:

| Legacy tenant | Recommendation once QA naming is settled |
| --- | --- |
| `Acme Corporation` | repurpose and rename into `QA B2B`, including the tenant display name, slug, and primary QA credential reference |
| `White Label Co` | remove from the canonical QA set immediately; do not treat it as WL proof or clean B2C proof; classify later through the inventory bucket model after `QA B2C` and `QA WL` exist |

## 8. Taxonomy cleanup recommendations

Runtime-language cleanup should happen immediately in planning truth and in every later verification
record.

Required runtime-language decisions:

- retire `enterprise tenant` as runtime shorthand
- use `B2B workspace` as the runtime term
- use `B2C storefront` as the runtime term
- use `WL storefront` plus optional `WL admin overlay` as the WL runtime term
- keep `ENTERPRISE` only as billing-plan language

Term replacement table:

| Retire in runtime language | Replace with |
| --- | --- |
| `enterprise tenant` | `B2B workspace` |
| `enterprise runtime` | `B2B workspace runtime` |
| `white-label tenant` when used as a base family | `WL storefront` plus `WL admin overlay` where applicable |
| `white-label credential` for `owner@whitelabel.example.com` | `legacy misleading non-WL B2C credential`; do not use as canonical QA label |
| `ENTERPRISE` as runtime shorthand | billing plan only; never runtime family |

Where runtime-facing taxonomy should be cleaned first:

1. control-plane tenant-registry operating notes and QA runbooks
2. seed credential documentation and environment-facing setup notes
3. future runtime verification reports and governance follow-up artifacts
4. any later runtime-family labels carried into cleanup worksheets or inventory exports

What should be updated after runtime verification is rerun with the clean QA set:

- governance and ops documents that still describe `Acme` as the generic enterprise proof
- any artifact that still treats WL as a base tenant category rather than `wl_storefront` plus
  optional `wl_admin`
- any verification record that uses plan language to describe runtime family

## 9. Superadmin inventory cleanup plan

This section defines the operational classification model only. It does not execute cleanup.

### 9.1 Bucket model

| Bucket | Meaning | Decision rule | Recommended next action | Evidence needed before action |
| --- | --- | --- | --- | --- |
| `KEEP-PROD` | real retained tenant with customer-like, operational, or platform-owned production value | tenant has clear ownership, non-test provenance, and should not be touched by QA cleanup | preserve; add explicit provenance note in the triage worksheet | owner, purpose, domain posture, recent activity, and non-test provenance |
| `KEEP-QA` | one of the approved canonical QA tenants from this plan | tenant display name, slug, and login pattern match the canonical QA set exactly | preserve and mark as canonical QA | match to approved QA display, slug, email, role, and runtime purpose |
| `SEED-NEW` | approved canonical QA tenant or account not yet created | one of the required QA identities from Section 5 is missing | create later through a bounded seed pass only after approval | explicit approval of this plan and exact seed row from Section 6 |
| `ARCHIVE-TEST` | stale demo, proof, test, seed, or verification residue that is not part of `KEEP-PROD` or `KEEP-QA` | tenant has clear non-prod provenance and no remaining approved QA or production purpose | archive or retire through a separate approved cleanup execution pass | clear non-prod provenance, no active owner need, and no collision with approved QA use |
| `REVIEW-UNKNOWN` | tenant with incomplete, conflicting, or insufficient evidence | tenant cannot be safely classified as prod, QA, or disposable test residue from current evidence | hold, investigate, and classify later | owner lookup, provenance, last-use signal, domain posture, and reason for retention |

### 9.2 Triage method for the current 440-tenant inventory

Recommended triage order:

1. take one read-only inventory snapshot of the full current tenant list
2. add a worksheet column set for: display name, slug, tenant category, `is_white_label`, status,
   plan, owner email, primary domain, last activity if available, current verification use,
   proposed bucket, and evidence notes
3. reserve `KEEP-QA` only for the exact `QA`-prefixed and `qa-`-prefixed identities from this plan
4. mark obviously timestamped proof tenants, demo names, and temporary verification rows as
   `ARCHIVE-TEST` candidates only when provenance is clear
5. send every ambiguous tenant to `REVIEW-UNKNOWN`; do not guess and do not collapse it into test
   residue without evidence

### 9.3 How to identify canonical QA tenants clearly in the tenant list

Canonical QA tenants should be identifiable by three visible signals at once:

- display name begins with `QA` followed by a space
- slug begins with `qa-`
- associated login email follows the `qa.<family>@texqtic.com` convention

That triple-prefix rule is the core anti-sprawl control. If any of the three are missing, the
tenant should not be treated as canonical QA.

### 9.4 How to prevent future tenant sprawl

The later operational cleanup pass should adopt the following rules:

1. no new non-prod tenant may be created without a recorded owner, purpose, bucket, and review date
2. recurring QA tenants must use the reserved `QA`-plus-space display prefix, `qa-` slug prefix,
  and `qa.<family>@texqtic.com` email convention only
3. proof, demo, or experiment tenants must never be allowed to masquerade as recurring QA baselines
4. every cleanup decision must be evidence-backed and bucketed before any destructive action is
   approved

## 10. Execution order recommendation

Recommended later execution order:

1. approve the final short QA naming standard
2. repurpose and rename Acme into `QA B2B`
3. create `QA B2C`
4. create `QA WL`
5. create `QA WL Member`
6. create `QA AGG`
7. create `QA PEND`
8. update verification references, screenshots, and runbooks to the canonical QA identities
9. rerun production verification on the clean QA set
10. only after that rerun, begin the wider 440-tenant classification and cleanup pass

## 11. Final recommendation

Proceed to a bounded seed and rename execution pass next.

Reason:

- the superadmin cleanup model is now defined, but it cannot be executed safely until the canonical
  QA keep-set is first approved and created
- the current ambiguity is no longer about cleanup buckets; it is about replacing legacy verification
  identities with the clean QA-prefixed tenant set
- once the QA set exists, the 440-tenant inventory can be triaged deterministically without legacy
  Acme or White Label rows being mistaken for the long-term QA baseline

Non-blocking unresolved item:

- if TexQtic wants to preserve the separately verified backend-true WL impersonation proof tenant
  for any purpose other than historical traceability, its exact display name and tenant id must be
  captured during the later inventory triage; this does not block the canonical QA seed decision
  made here
