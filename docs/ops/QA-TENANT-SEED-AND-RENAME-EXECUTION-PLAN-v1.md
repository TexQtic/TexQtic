# QA-TENANT-SEED-AND-RENAME-EXECUTION-PLAN-v1

Status: planning only
Date: 2026-04-08

This artifact defines the bounded operational execution plan that should precede any later tenant
seeding, tenant renaming, credential repointing, or superadmin inventory cleanup related to the
canonical TexQtic QA tenant system.

This artifact does not authorize or execute:

- tenant seeding
- tenant renaming
- tenant deletion
- tenant archiving
- runtime or backend changes
- control-plane inventory cleanup
- verification rerun execution

Authority and basis used:

- `docs/ops/QA-TENANT-CLASSIFICATION-SEED-NAMING-AND-SUPERADMIN-CLEANUP-PLAN-v1.md`
- `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
- `governance/analysis/TEXQTIC-TENANT-MODE-TAXONOMY-AND-COMMERCIAL-CONTINUITY-VALIDATION-v1.md`
- `governance/analysis/TEXQTIC-CONTROL-PLANE-TENANT-LIST-LATENCY-REMEDIATION-001.md`
- `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
- `docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md`
- `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
- `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
- `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
- `docs/ops/ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001.md`
- `server/prisma/seed.ts`

## 1. Executive judgment

Yes. TexQtic now has enough information to proceed to a bounded seed-and-rename execution pass.

That execution pass should be narrow and should follow these already-settled operational decisions:

- `QA CTRL` remains the staff-side anchor and continues to use `admin@texqtic.com`
- `QA B2B` should be created by repurposing and renaming the current Acme B2B tenant rather than
  by seeding a second long-term B2B baseline
- `QA B2C` should be created as a fresh seed rather than by repurposing `White Label Co`
- `QA WL`, `QA WL Member`, `QA AGG`, and `QA PEND` should all be created as new QA identities

Why this is the cleanest operational split:

- Acme already carries the correct non-WL B2B runtime family and does not depend on WL-normalizing
  residue
- `White Label Co` carries exactly the misleading WL naming, slug, email, and domain residue that
  this transition is supposed to retire, so using it as `QA B2C` would preserve confusion even if
  the row were renamed later
- a fresh `QA B2C` seed plus a fresh `QA WL` seed creates a clean post-transition proof system with
  no mixed runtime meaning

Non-blocking carry-forward gap:

- the exact display name and tenant id of the separately verified backend-true WL impersonation
  proof tenant are still not preserved in the immediate repo corpus

That gap does not block this execution plan, because the plan intentionally replaces that posture
with direct-login `QA WL` plus `QA WL Member` identities.

## 2. Final canonical QA naming standard

The final short naming standard is:

| QA identity | Exact display name | Exact slug | Exact primary email |
| --- | --- | --- | --- |
| QA CTRL | not applicable | not applicable | `admin@texqtic.com` |
| QA B2B | `QA B2B` | `qa-b2b` | `qa.b2b@texqtic.com` |
| QA B2C | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` |
| QA WL | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` |
| QA WL Member | `QA WL` | `qa-wl` | `qa.wl.member@texqtic.com` |
| QA AGG | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` |
| QA PEND | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` |

Final naming rules:

1. Every canonical QA tenant display name must begin with `QA` followed by a space.
2. Every canonical QA tenant slug must begin with `qa-`.
3. Every canonical QA tenant-side credential must use the `qa.<family>@texqtic.com` convention.
4. `QA CTRL` remains `admin@texqtic.com` and does not become a tenant-scoped QA email.
5. No canonical QA identity may use brand names, `enterprise`, `white-label`, timestamp suffixes,
   or billing-plan words in its display name, slug, or tenant-side login email.

## 3. Final canonical QA tenant and account set

| Final QA identity | Display name | Slug | Primary email | Runtime family | Role | Overlay expectations | Direct login required | Minimum seed data requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA CTRL | not applicable | not applicable | `admin@texqtic.com` | `control_plane` | `SUPER_ADMIN` | none | yes | tenant registry must show the QA-prefixed tenant rows and support tenant-context entry |
| QA B2B | `QA B2B` | `qa-b2b` | `qa.b2b@texqtic.com` | `b2b_workspace` | `OWNER` | none | yes | 1 active catalog item, 1 RFQ path, 1 order row, 1 audit-log row |
| QA B2C | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` | `b2c_storefront` | `OWNER` | none | yes | at least 3 visible active products and card-level cart-entry continuity |
| QA WL | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` | `wl_storefront` | `OWNER` | owner must receive `wl_admin` overlay and storefront access from the same identity | yes | branding row, platform domain, optional custom-domain row, 3 active products, 1 collection, 1 order row, 1 staff row |
| QA WL Member | `QA WL` | `qa-wl` | `qa.wl.member@texqtic.com` | `wl_storefront` | `MEMBER` | must not receive `wl_admin` overlay | yes | shared `QA WL` tenant data plus one real member membership |
| QA AGG | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` | `aggregator_workspace` | `OWNER` | none | yes | at least 2 visible discovery rows and 1 audit-log row |
| QA PEND | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` | `blocked_pending_verification` | `OWNER` | none | yes | visible pending or blocked verification state, stable status explanation, blocked trade-capable posture |

## 4. Repurpose vs replace matrix

| Current identity or posture | Current runtime truth | Decision | Target QA identity | Reason |
| --- | --- | --- | --- | --- |
| `admin@texqtic.com` | control-plane staff login | `KEEP_AS_IS` | `QA CTRL` | already the correct staff-side proof credential; no tenant rename needed |
| `owner@acme.example.com` | direct-login non-WL B2B | `REPURPOSE_AND_RENAME` | `QA B2B` | runtime family is already correct and the problem is naming drift, not tenant identity drift |
| `Acme Corporation` / `acme-corp` | non-WL B2B tenant row | `REPURPOSE_AND_RENAME` | `QA B2B` / `qa-b2b` | lowest-friction path to remove enterprise shorthand without creating a second long-term B2B baseline |
| `owner@whitelabel.example.com` | backend-truth non-WL B2C but currently WL-normalized by frontend residue | `REMOVE_FROM_QA_SET` | none | misleading credential and should not survive as canonical B2C or WL proof |
| `White Label Co` / `white-label-co` | backend-truth non-WL B2C tenant row carrying WL-like name and domain residue | `REMOVE_FROM_QA_SET` | none | renaming would still inherit the exact WL residue this plan is meant to retire |
| `B2C Browse Proof 20260402080229` | impersonation-only non-WL B2C proof tenant with thin inventory | `REMOVE_FROM_QA_SET` | none | useful as historical proof residue only, not as recurring QA baseline |
| backend-true WL impersonation proof posture | real WL runtime reached through impersonation, not canonical direct login | `REPLACE_WITH_NEW_QA_IDENTITY` | `QA WL` | canonical WL verification must move to direct login |
| `member@whitelabel.example.com` | audit-log residue only, not a clean login identity | `REPLACE_WITH_NEW_QA_IDENTITY` | `qa.wl.member@texqtic.com` | current corpus does not prove a reusable member credential |

Operational consequence of this matrix:

- `QA B2B` is the only canonical QA tenant created by repurpose-and-rename
- every other tenant-side QA identity is either fresh-seeded or removed from the QA baseline

## 5. Exact seed-new tenant matrix

`QA B2B` is not seed-new; it is created by repurposing and renaming Acme.

The exact seed-new identities are:

| Seed-new identity | Exact display name | Exact slug | Exact email | Exact role | Exact runtime purpose | Exact minimal seed data | Product-bearing data required | Defer or must happen before next verification rerun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA B2C | `QA B2C` | `qa-b2c` | `qa.b2c@texqtic.com` | `OWNER` | clean direct-login non-WL B2C storefront proof | at least 3 visible active products, 1 category or featured grouping, and working card-level cart entry | yes | must happen before the next full verification rerun |
| QA WL | `QA WL` | `qa-wl` | `qa.wl@texqtic.com` | `OWNER` | clean direct-login WL storefront and WL admin overlay proof | branding row, platform domain, optional custom-domain row, 3 active products, 1 collection, 1 order row, 1 staff row | yes | must happen before the next full verification rerun |
| QA WL Member | `QA WL` | `qa-wl` | `qa.wl.member@texqtic.com` | `MEMBER` | verify branded storefront continuity without admin overlay | real non-admin membership on `QA WL` and shared WL storefront data | yes, shared with `QA WL` | must happen before the WL edge-case rerun and should remain in the same bounded seed pass |
| QA AGG | `QA AGG` | `qa-agg` | `qa.agg@texqtic.com` | `OWNER` | clean direct-login aggregator workspace proof | at least 2 visible discovery rows and 1 audit-log row | no | must happen before the next full verification rerun |
| QA PEND | `QA PEND` | `qa-pend` | `qa.pending@texqtic.com` | `OWNER` | clean blocked or pending verification proof | visible pending or blocked verification state, stable status explanation, blocked trade-capable posture | no | must happen before the next full verification rerun |

## 6. Exact rename and repoint recommendations

### 6.1 Acme

`Acme Corporation` must stop serving as the generic runtime proof label.

Exact later action:

- repurpose the current Acme tenant into `QA B2B`
- rename the tenant display name to `QA B2B`
- rename the slug to `qa-b2b`
- repoint the primary login to `qa.b2b@texqtic.com`
- update verification notes to refer to `QA B2B`, not `Acme` and not `enterprise tenant`

### 6.2 White Label Co

`White Label Co` must stop serving as the WL proof label and must also stop serving as the implied
non-WL B2C proof label.

Exact later action:

- remove it from the canonical QA baseline
- do not repurpose it into `QA B2C`
- do not use it for WL proof after `QA WL` exists
- treat it as a legacy row to be triaged later under the superadmin bucket model after the clean QA
  set is live

### 6.3 Verification references and credentials

After the later seed-and-rename execution pass completes, verification references must be updated as
follows:

- B2B verification -> `QA B2B` / `qa.b2b@texqtic.com`
- B2C verification -> `QA B2C` / `qa.b2c@texqtic.com`
- WL verification -> `QA WL` / `qa.wl@texqtic.com`
- WL member edge-case verification -> `QA WL` member / `qa.wl.member@texqtic.com`
- Aggregator verification -> `QA AGG` / `qa.agg@texqtic.com`
- pending or blocked verification -> `QA PEND` / `qa.pending@texqtic.com`

## 7. Execution order and dependency plan

The exact later operational order should be:

1. approve the final short QA naming standard in this artifact
2. repurpose and rename Acme into `QA B2B`
3. create `QA B2C` as a fresh seed
4. create `QA WL` as a fresh seed
5. create `QA WL Member` on the `QA WL` tenant
6. create `QA AGG`
7. create `QA PEND`
8. update verification credential references, screenshots, runbooks, and note templates to the new
   QA identities
9. rerun production verification against the clean QA set only
10. only after the rerun is complete, begin the wider 440-tenant classification and cleanup pass

Dependency rules inside that order:

- `QA B2B` goes first because it removes enterprise-shorthand drift with the lowest runtime risk
- `QA B2C` must be created before `QA WL` is adopted as the canonical WL proof, so B2C and WL stop
  competing for the old `White Label Co` row
- superadmin cleanup must not start while legacy verification references still point to Acme,
  White Label Co, or the timestamped B2C proof tenant

## 8. Safety rules before superadmin cleanup

Before any 440-tenant cleanup begins, all of the following must already be true:

1. the canonical QA set exists in runtime and is visibly identifiable by the final `QA` and `qa-`
   naming standard
2. `admin@texqtic.com` remains the only `QA CTRL` credential reference
3. `qa.b2b@texqtic.com`, `qa.b2c@texqtic.com`, `qa.wl@texqtic.com`, `qa.agg@texqtic.com`,
   `qa.pending@texqtic.com`, and `qa.wl.member@texqtic.com` are the only tenant-side canonical QA
   credential references
4. legacy Acme and White Label labels are no longer treated as the verification baseline
5. production verification has been rerun successfully against the clean QA set
6. cleanup remains classification-first and evidence-backed under the approved bucket model
7. no tenant is moved into an archive or delete decision path only because it looks old or because
   its name resembles a test row; each cleanup decision still requires provenance evidence

## 9. Immediate taxonomy-change recommendations

The following runtime-language changes should be prepared immediately alongside the later seed and
rename execution pass:

- retire `enterprise tenant` as runtime shorthand
- use `B2B workspace` as the runtime term
- use `B2C storefront` as the runtime term
- use `WL storefront` plus optional `WL admin overlay` as the runtime term
- keep `ENTERPRISE` only as billing-plan language

Immediate replacement table:

| Old wording | New wording |
| --- | --- |
| `enterprise tenant` | `B2B workspace` |
| `enterprise runtime` | `B2B workspace runtime` |
| `white-label tenant` as a base family label | `WL storefront` plus optional `WL admin overlay` |
| `white-label credential` for the current legacy login | `legacy misleading non-WL B2C credential` |
| `ENTERPRISE` used as runtime shorthand | billing plan only |

## 10. Final recommendation

Proceed to a bounded seed and rename execution pass next.

No narrower operational prep step is still required.

The unresolved WL impersonation-proof row identity is not execution-blocking, because the approved
next move is to replace that posture with direct-login `QA WL` rather than to preserve the old row
as a canonical QA baseline.
