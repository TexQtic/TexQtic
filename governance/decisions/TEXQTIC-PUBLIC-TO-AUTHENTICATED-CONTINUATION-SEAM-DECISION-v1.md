# TEXQTIC - Public To Authenticated Continuation Seam Decision v1

Decision ID: TEXQTIC-PUBLIC-TO-AUTHENTICATED-CONTINUATION-SEAM-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / public-to-authenticated continuation seam
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only continuation-seam decision

## 1. Seam Principle

TexQtic's neutral homepage secondary continuation lane is not a generic catch-all path for every user who has started some earlier business process.

The canonical rule is:

- the neutral homepage may launch only three lawful secondary continuation classes:
  - issued activation or issued access continuity for a specifically invited or issued user
  - authenticated tenant workspace entry for already-active tenant-side users
  - authenticated staff or control-plane entry for staff operators
- CRM intake, qualification, approval-before-provisioning, and provisioning-before-issuance remain outside the neutral homepage continuation lane
- the homepage must not imply that TexQtic exposes a public self-service status checker, generic onboarding resume form, or pre-issuance continuation console
- the public shell still stops at launch and transition; it does not absorb CRM continuity, provisioning workflow ownership, or post-authenticated owner-ready runtime continuity

Current-truth guardrail:

This artifact is planning authority only. It does not modify `App.tsx`, auth runtime behavior, CRM behavior, marketing behavior, provisioning behavior, or the already-accepted homepage branding and auth-relocation slice.

## 2. Canonical Continuation State Matrix

The lawful state classes behind the homepage's secondary continuation area are:

| State Class | Meaning | Primary Owner | Lawful Homepage Destination | Continuation-Lane Status |
| --- | --- | --- | --- | --- |
| `NEW_EXTERNAL_APPLICANT` | A visitor has not yet entered CRM intake and wants access, listing, or business participation | marketing + CRM intake | `https://texqtic.com/request-access` | `NOT_ELIGIBLE_FOR_CONTINUATION` |
| `CRM_INTAKE_OR_QUALIFICATION_IN_PROGRESS` | A request-access submission exists and CRM is still reviewing, qualifying, or advancing the case | CRM | CRM-managed communication and follow-up only; not a platform homepage continuation target | `NOT_ELIGIBLE_FOR_CONTINUATION` |
| `APPROVED_PENDING_PROVISIONING` | CRM approval exists but the platform tenant or organization is not yet materially ready | CRM + platform provisioning handoff | internal provisioning continuity only; not a public homepage continuation target | `NOT_ELIGIBLE_FOR_CONTINUATION` |
| `PROVISIONED_PENDING_ISSUED_ACCESS` | Provisioning truth exists, but the designated first owner has not yet been issued the access or activation path | platform + CRM issuance handoff | issued access preparation and CRM issuance only; not generic homepage continuation | `NOT_ELIGIBLE_FOR_CONTINUATION` |
| `ISSUED_ACCESS_CONTINUATION` | The designated first owner or issued user has received an activation or access path and must continue through that issued path | issued activation/access path | the issued activation or access link, token, or invite path only | `ELIGIBLE_FOR_NARROW_CONTINUATION` |
| `ACTIVE_TENANT_WORKSPACE_USER` | The user already has lawful tenant-side workspace access, including B2B, B2C, and authenticated-only qualified workspace families | authenticated tenant entry | `Tenant Access` -> dedicated authenticated tenant entry | `ELIGIBLE_FOR_AUTHENTICATED_ENTRY` |
| `STAFF_CONTROL_OPERATOR` | The user is a staff, control-plane, or superadmin operator | authenticated control-plane entry | `Staff Control` -> dedicated control-plane entry | `ELIGIBLE_FOR_AUTHENTICATED_ENTRY` |

State-class rules:

1. Only `ISSUED_ACCESS_CONTINUATION` belongs behind the homepage's continuation-specific affordance.
2. `NEW_EXTERNAL_APPLICANT`, `CRM_INTAKE_OR_QUALIFICATION_IN_PROGRESS`, `APPROVED_PENDING_PROVISIONING`, and `PROVISIONED_PENDING_ISSUED_ACCESS` do not lawfully map to a generic public homepage continuation affordance.
3. `ACTIVE_TENANT_WORKSPACE_USER` and `STAFF_CONTROL_OPERATOR` are not continuation-lane states; they are authenticated-entry states and must remain separate from issued activation/access continuity.
4. Aggregator or other authenticated-only qualified workspace users inherit the `ACTIVE_TENANT_WORKSPACE_USER` entry class once their lawful authenticated workspace entry exists. They do not belong to the continuation affordance.

## 3. Secondary Link Classification

The homepage secondary links must be classified as follows:

| Homepage Link Class | Canonical User Class | Canonical Destination | Must Not Mean |
| --- | --- | --- | --- |
| issuance-specific continuation link | `ISSUED_ACCESS_CONTINUATION` only | issued activation/access path only | generic onboarding resume, CRM-case resume, approval-status lookup, or tenant sign-in fallback |
| `Tenant Access` | `ACTIVE_TENANT_WORKSPACE_USER` | dedicated tenant authenticated entry | new applicant entry, CRM continuity, pre-issuance owner handoff, or staff entry |
| `Staff Control` | `STAFF_CONTROL_OPERATOR` | dedicated control-plane authenticated entry | tenant user sign-in, CRM onboarding continuity, or public discovery entry |

Classification rules:

1. `Tenant Access` remains lawful because it already points to dedicated authenticated tenant entry and does not need to absorb onboarding continuity.
2. `Staff Control` remains lawful because it already points to dedicated control-plane entry and is outside the onboarding seam.
3. The continuation-specific link is the only ambiguous secondary link in the current homepage model.

## 4. Continuation Label Decision

`Continue onboarding` is not the canonical label for the homepage continuation-specific link.

Why it is not canonical:

- it compresses CRM intake, qualification, approval, provisioning, issuance, and first-owner activation into one phrase even though those states have different owners and different lawful destinations
- it implies TexQtic exposes a generic public onboarding continuation surface, which current product truth does not support
- it makes it too easy to route pre-issued users into the wrong destination, especially generic tenant auth

The canonical label rule is:

- the continuation-specific homepage affordance must be issuance-specific rather than onboarding-generic
- the product-truth meaning of that affordance is `ISSUED_ACCESS_CONTINUATION`
- future implementation copy should explicitly reference an issued activation or access path rather than generic onboarding

Canonical copy direction for later implementation:

- preferred semantic label class: `Use issued access link`
- acceptable equivalent if copy needs to reference activation more directly: `Use activation link`
- disallowed semantic class: `Continue onboarding` as the enduring canonical product-truth label

Current-truth bridge allowance:

The currently implemented bridge page may temporarily preserve the broader phrase in runtime copy, but it must be understood as a temporary bridge and not as the canonical long-term label authority.

## 5. Phase Ownership Split

The public-to-authenticated continuation seam is owned in phases:

| Phase | Lawful Owner | What This Phase Owns | What This Phase Must Not Own |
| --- | --- | --- | --- |
| neutral public homepage | shared public-entry shell | public-safe framing plus launch of lawful secondary links | CRM case continuity, provisioning progress, or authenticated runtime continuity |
| request-access and pre-runtime case progression | marketing + CRM | applicant intake, qualification, onboarding case continuity, and approval progression | tenant auth entry, public status console inside the platform homepage, or staff entry |
| approved-to-provisioned handoff | CRM + platform provisioning | approved onboarding handoff into tenant and organization preparation | generic public continuation or tenant sign-in fallback |
| provisioned-to-issued access handoff | platform + CRM issuance | first-owner access preparation and issuance continuity | generic public continuation or active workspace sign-in |
| issued activation/access continuation | issued path surface | token, invite, activation, or issued-access continuity for the designated issued user | CRM case ownership, public status lookup, or staff control |
| authenticated tenant entry | auth/session layer plus tenant runtime entry | tenant-side sign-in, restore, and workspace entry for already-active users | CRM onboarding continuity or issued activation-path ownership |
| authenticated staff entry | auth/session layer plus control-plane runtime entry | control-plane or staff sign-in and restore | tenant onboarding continuity or public discovery entry |
| post-auth owner-ready check | downstream post-auth eligibility layer | membership, activation, and owner-ready validation where still required after auth | public-entry resolution or generic homepage continuation |

Ownership rules:

1. Public entry ends at launch and bounded transition, not at CRM continuity completion.
2. Issued activation/access continuity is downstream from the homepage and narrower than CRM onboarding as a whole.
3. Authenticated tenant entry and issued activation/access continuation must remain separate even when both eventually lead into the same tenant runtime.
4. Post-auth owner-ready checks remain downstream-owned and must not be collapsed into public-homepage semantics.

## 6. Explicit Exclusions

This seam decision excludes all of the following from the homepage continuation-specific affordance:

- a generic public onboarding status checker
- CRM-case resume or CRM inbox continuity inside the platform homepage
- self-service continuation for approved-but-not-provisioned or provisioned-but-not-issued users
- using tenant sign-in as the fallback for users who have not yet been issued access
- using the continuation link as a help desk, support hub, or marketing request form
- reopening the homepage branding slice, route tree, or auth relocation work in this unit
- control-plane, white-label admin, tenant-admin, or other downstream authenticated workflow depth

## 7. Later Implementation Implication

Any future bounded implementation slice that touches this seam must follow all of the following rules:

1. It may narrow homepage copy and bridge behavior only to enforce issuance-specific continuation semantics.
2. It must keep new applicants on `https://texqtic.com/request-access` rather than redirecting them into tenant auth or a generic platform continuation form.
3. It must keep issued activation/access continuation separate from `Tenant Access` even if both ultimately feed the same tenant runtime family.
4. It must not treat `Continue onboarding` as canonical authority for future runtime behavior.
5. If later runtime work consumes `PublicEntryResolutionDescriptor` or adjacent handoff metadata, it should preserve the existing separation between authenticated entry and `OWNER_READY_ACTIVATION_CHECK` rather than inventing a generic onboarding continuation fallback.

## 8. Downstream Planning Dependencies

This decision is intended to constrain the following later bounded work:

| Later Unit / Area | What This Decision Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded homepage continuation follow-up | the exact state classes and stop line for the continuation-specific link | copy implementation, interaction design, and runtime proof |
| bounded issued-link activation follow-up | the fact that only issued activation/access continuity belongs behind the continuation-specific affordance | token handling, invite mechanics, and activation UX detail |
| bounded owner-ready entry follow-up | the ownership split between issued continuity, authenticated tenant entry, and downstream owner-ready checks | exact eligibility evaluation and runtime restore behavior |
| future CRM/platform handoff clarification | the exclusion of CRM pre-issuance continuity from the platform homepage | CRM/operator surfaces, issuance evidence, and service communications |

## 9. Decision Result

`PUBLIC_TO_AUTHENTICATED_CONTINUATION_SEAM_DECIDED`

TexQtic now has one bounded decision artifact that defines:

- the lawful state classes behind the homepage's secondary continuation area
- the exact separation between issued activation/access continuation, tenant sign-in, and staff sign-in
- the exclusion of CRM and provisioning pre-issuance states from homepage continuation
- the canonical ruling that `Continue onboarding` is too broad to remain the enduring product-truth label

This result is planning-only and does not reopen implementation in this slice.
