TECS v2.0.2 — TexQtic Execution \& Compliance System

CONFIDENTIAL — TexQtic Ventures Pvt Ltd

Unified Execution OS · Supersedes TECS v2.0 where amended

Purpose

Make every TexQtic change verifiable, reversible, governance-traceable, launch-focused, and cost-controlled.

Core Principle

No “it seems fine.”

Every gap must end with objective proof, but no unit should consume full implementation/governance effort unless it has first passed the correct design, acceptance, cost, and launch-impact gates.

Technical correctness alone is not launch readiness.

Launch readiness requires:

repo truth,

runtime truth,

product acceptance truth.

v2.0.1 Update Summary

TECS v2.0.1 keeps TECS v2.0 intact and adds missing enforcement refinements:

Lane D — Verification Only

Lane E — Governance / Drift Sync

expanded Feature Intake Gate

expanded Copilot Cost Gate fields

additional readiness enums

formal Repo / Runtime / Product Truth definitions

Manual QA role as launch definition-of-done

TECS-GR-008 stale-design / repo-truth revalidation guardrail

stricter shared-shell verification rule

governance artifact creation / non-creation rules

Launch Board as formal governance surface

Appendix A — mandatory design-intake prompt template

Appendix B — mandatory final report template

explicit FTR-SL-017 pre-opening gate



§0 Operating Mode

0.1 Safe-Write Mode

Safe-Write Mode remains the default.

Allowed:

edit only files explicitly allowlisted for the current task

make only scoped changes

commit implementation and governance separately when both exist

validate using appropriate static, runtime, and production checks

Forbidden:

drive-by refactors

touching files outside allowlist

optimistic readiness claims

schema / SQL / RLS changes unless explicitly scoped

production DB mutation without approved DB-apply governance

broad “investigate and fix anything” prompts

starting implementation when design ambiguity remains

0.2 Hard Stop Conditions

Stop immediately if:

unexpected routes, policies, schemas, auth flows, or shared surfaces are discovered outside scope

product / UX intent is ambiguous

the finding is larger than the approved cost class

a launch-facing unit lacks product acceptance criteria

runtime behavior differs from repo assumptions

tenant/admin login regresses

public/private boundary is unclear

public exposure risk appears

DB/schema/RLS work is required but not authorized

Copilot would need broad exploration beyond the declared cost gate

governance files become dirty due to formatting/tooling without semantic intent

0.3 Prompt Discipline

Every execution prompt must include:

Unit ID

execution lane

cost class

evidence tier

product intent

repo-truth scope

file modify allowlist

forbidden actions

stop conditions

validation checklist

runtime QA script

commit instructions

hub impact assessment

final enum options

0.4 Copilot Cost Gate

Before triggering Copilot on any task, the prompt must declare:

cost class: LOW / MEDIUM / HIGH

max scope: investigation / source fix / verification / governance

expected files touched

expected runtime checks

governance evidence tier

stop condition

do not continue if: explicit boundary

Cost Class Rules

Cost Class

Rule

LOW

Read-only inspection, runtime verification, triage, or governance update. No source code changes.

MEDIUM

1–3 source files, one bounded fix, no DB/schema/RLS, clear root cause.

HIGH

Architecture, design implementation, public surface, auth/security, DB/schema/RLS, or launch-facing product change. Must be approved by Paresh before Copilot is triggered.



Enforcement Rule

If a task grows beyond its declared cost class, Copilot must stop and ask. It must not auto-expand scope.



§1 Feature Intake Gate

No launch-facing implementation prompt may be opened until the Feature Intake Gate is complete.

Skipping this gate is a governance violation.

1.1 Required Intake Fields

Intake Field

Required Definition

Feature name

Name / unit ID of the feature or slice.

User role

Supplier, buyer, admin, superadmin, public visitor, service provider, etc.

Tenant/session

Target tenant/session for runtime QA, if applicable.

Route / page

Exact route or UI location.

Product intent

Settings page, profile page, workflow, dashboard, public surface, admin tool, etc.

UX pattern

Form-only, view-first, split layout, wizard, table/action drawer, dashboard panel, public page, etc.

Data model touched

Tables/models/entities likely affected, or NONE.

Public/private boundary

What must never leak to public surfaces.

Expected user-visible behavior

What the user should see and do.

Acceptance criteria

What Paresh/manual QA must see to call it launch-ready.

Runtime QA script

Exact manual/browser checks before closure.

Launch-blocking conditions

What blocks launch or current feature completion.

Non-blocking follow-ups

What can safely defer.

Expected file surface

Likely source/governance files before coding.

Cost class

LOW / MEDIUM / HIGH.

Evidence tier

Tier 1 / Tier 2 / Tier 3.

Stop conditions

What forces a design decision or blocks coding.



1.2 UX Pattern Must Be Explicit

A launch-facing UI cannot be implemented while the UX pattern is undecided.

Allowed UX pattern examples:

settings form

view-first profile

split preview + manage details

wizard

table + action drawer

dashboard panel

public page

admin console

modal flow

onboarding flow

read-only status page

custom pattern, explicitly described

1.3 Product Acceptance Criteria

Acceptance criteria must be written in plain user-visible language.

Example:

“Paresh can open Shraddha Company Profile and see a polished profile preview first.”

“Owner can edit details in Manage Details.”

“Save visibly processes, succeeds, updates preview, and persists after refresh.”

“Public /b2b does not expose private profile fields.”

A feature cannot be marked READY unless acceptance criteria are checked.



§2 Execution Lane Model

Every finding, fix, or feature must be classified into exactly one lane before work begins.

No default “full cycle” for everything.

Lane A — Launch Feature

Use when:

new launch-facing product capability

public surface

buyer/supplier/admin workflow

UX/product-shaping change

multi-surface feature

feature affects launch acceptance

Requires:

Feature Intake Gate

bounded design

repo-truth validation

implementation plan

source implementation

runtime verification

product acceptance check

governance artifact

hub sync

Prompt size: full TECS prompt.

Governance: Tier 3 artifact unless explicitly downgraded by Paresh.

Lane B — Bounded Fix

Use when:

known defect

localized bug

clear source area

low product ambiguity

root cause likely inside 1–3 files

Requires:

short diagnosis

small allowlist

source fix

targeted validation

runtime proof if runtime-visible

compact governance or FUTURE-TODO update

Prompt size: medium.

Governance: Tier 1 or Tier 2.

Lane C — QA Triage / Design Decision

Use when:

ambiguous UX issue

product expectation mismatch

unclear launch impact

uncertain defect classification

user/manual QA finding may not be a code bug

Requires:

no source code by default

repo-truth inspection

runtime observation if safe

classification

design decision or next unit recommendation

Prompt size: small to medium.

Governance: decision note or compact artifact.

Lane D — Verification Only

Use when:

deployed runtime confirmation

production smoke

regression verification

public non-exposure check

close-readiness proof

Requires:

no source changes

exact verification script

evidence summary

light post-unit truth sync

Prompt size: small.

Governance: compact verification note, existing artifact update, or TODO row.

Lane E — Governance / Drift Sync

Use when:

hub correction

stale row update

planning-register update

TECS process update

decision recording

no source implementation

Requires:

no source code

allowlisted governance files only

evidence-level classification

no runtime mutation

Prompt size: small.

Governance: direct.

2.1 Current Launch Queue Lane Reference

Item

Lane

FTR-SL-017 Catalogue Visibility

Lane C design intake first, then Lane A implementation

Public Rich Profile Projection

Lane A — public surface/security

Forgot Password / Login Recovery

Lane B or Lane A depending auth scope

Mobile Navigation Parity

Lane B

Public Media URL Hardening

Lane C then Lane B if needed

Certificate UX Enhancements

P3 defer / FUTURE-TODO unless reprioritized

Supplier Onboarding / Directory Readiness

Lane A



2.2 FTR-SL-017 Explicit Pre-Opening Gate

FTR-SL-017 must not begin as implementation.

It must first open as:

FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01

Required decisions before implementation:

where the visibility control appears

who can change it

default visibility for existing catalogues/products

product/card/listing impact

public/private boundary

save behavior

audit/trace requirement, if any

runtime QA script

product acceptance criteria

cost class and evidence tier

No FTR-SL-017 source implementation may begin until this design intake is complete.



§3 Gap Lifecycle

3.1 Required Sequence

A gap may only move forward in this order:

next-unit confirmation / opening

lane selection

cost gate

Feature Intake Gate if Lane A

bounded design / plan

repo-truth validation against current repo

implementation planning

slice-by-slice implementation

static validation

runtime / production verification as applicable

product acceptance where launch-facing

post-unit truth sync

close with readiness enum

next-unit recommendation

3.2 Governance Law

A gap cannot be marked validated or ready unless:

static gates pass, and

runtime validation passes, and

required production smoke passes, if applicable, and

product acceptance passes, if launch-facing, and

governance/truth-sync entries include the evidence, and

hub-sync is complete or explicitly marked not required.



§4 Required Static Gates

Run and record before closure.

Default backend gates:

pnpm -C server run typecheck

pnpm -C server run lint



Pass criteria:

typecheck exit 0

lint baseline warnings unchanged or explicitly approved

0 lint errors

If gates fail: stop, fix, re-run.

Frontend/package-specific checks may replace backend checks only when the unit does not touch backend surfaces. The exact command must be reported.



§5 Required Runtime Validation

5.1 Local Runtime Validation

When auth, RLS, middleware, tenancy, or backend route behavior is touched:

T1 admin login → 200 + token present

T2 control route → 200

T3 tenant login → 200 + token present

T4 tenant route → 200 or expected domain error, not 401/500

Record endpoint, status, and note.

5.2 Production Smoke

Production smoke is mandatory when the change affects:

auth/login

RLS policies

DB context helpers

control plane / tenant provisioning

public/private exposure

frontend runtime behavior that can differ from local

Vercel-only behavior

Record:

redacted payload

response status

PASS / FAIL / STUB / OUT-OF-SCOPE

5.3 Verification Discipline

Unit Type

Required Verification

Backend units

Tests mandatory.

Frontend/auth units

Vercel/deployed runtime verification mandatory when runtime-visible.

Shared shell changes

Neighbor-path smoke checks mandatory.

Shared shell + frontend/runtime-visible changes

Both neighbor-path smoke checks and production/deployed runtime verification mandatory.

Production-dependent units

implement → commit → deploy → verify → post-unit truth sync.



Hard rule: no unit closes without required verification.

Local compile/type/test success is necessary but not sufficient when runtime truth is the closure basis.



§6 Evidence Tiers

Not every cycle warrants a long markdown artifact.

Tier

When Used

Output

Tier 1

Minor bug, non-launch-blocking, contained fix, P3 watch item.

FUTURE-TODO row only or existing register update.

Tier 2

Bounded P1/P2 fix with clear root cause, runtime blocker, small source change.

One compact artifact.

Tier 3

Launch-critical feature, cross-domain, DB/security-sensitive, public-facing, or product-shaping work.

Full TECS artifact mandatory.



Rule: no Tier 3 artifact unless the unit is launch-critical, cross-domain, DB/security-sensitive, public-facing, or product-shaping.

6.1 Governance Artifact Rules

Create a new artifact only when:

Tier 2 or Tier 3 evidence requires it

launch-critical feature is implemented

DB/security/public projection is touched

Paresh decision must be preserved

a blocker is resolved or formally classified

Do not create a new artifact for:

small P3 watch item

simple UI string

expected behavior clarification

non-blocking observation

repeated restatement of prior proof

Use FUTURE-TODO row or update an existing artifact instead.

6.2 Artifact Length Control

Default:

Tier 1: no new artifact

Tier 2: compact artifact

Tier 3: full artifact

Artifacts should be as short as evidence allows.



§7 Launch Readiness Enums

Every unit must close with an explicit readiness enum.

“Technically works” is not the same as “launch-ready.”

7.1 Required Enums

Enum

Meaning

TECHNICALLY\_FUNCTIONAL\_PRODUCT\_ACCEPTANCE\_PENDING

Code works; Paresh/manual product review not yet done.

READY\_FOR\_LAUNCH

Repo truth + runtime truth + product truth passed.

READY\_WITH\_ACCEPTED\_LIMITATION

Launch-ready with known limitation accepted by Paresh.

BLOCKED\_BY\_PRODUCT\_DESIGN\_GAP

UX/product pattern decision required before implementation.

BLOCKED\_BY\_RUNTIME\_DEFECT

Defect confirmed in runtime.

BLOCKED\_BY\_PUBLIC\_EXPOSURE\_RISK

Public/private boundary or leakage risk blocks readiness.

BLOCKED\_BY\_AUTH\_OR\_SECURITY\_RISK

Auth/security risk blocks readiness.

DEFERRED\_WITH\_PARESH\_APPROVAL

Explicitly deferred by Paresh.

NOT\_A\_DEFECT\_EXPECTED\_BEHAVIOR

Behavior is expected and documented.



7.2 Three Truth Gates

A unit cannot be marked READY\_FOR\_LAUNCH unless all three gates pass.

Repo Truth

Confirms:

code/routes/schema/components match intent

service/API contract matches implementation

allowlisted files only changed

source reflects intended product design

no stale design assumptions remain

Runtime Truth

Confirms:

deployed app works in the correct tenant/session

expected network/API result observed

refresh/reload behavior checked

no console/runtime regression

public non-exposure checked where relevant

Product Truth

Confirms:

Paresh/manual QA expectations are met

UX pattern feels launch-grade

user can complete intended workflow

visual state is clear

success/failure states are understandable

no “technically works but feels unfinished” issue remains

Do not use READY\_FOR\_LAUNCH if product truth is missing.



§8 QA Defect Triage and Adjacent Finding Rule

Every QA finding must be classified before source work starts.

8.1 QA Defect Classes

Class

Meaning

Action

P0\_LAUNCH\_BLOCKER

Blocks launch or breaks critical runtime/security.

Immediate bounded unit.

P1\_PRE\_LAUNCH\_FIX

Should be fixed before launch.

Scheduled bounded unit.

P2\_POST\_LAUNCH\_FOLLOWUP

Important but not required for launch.

Register and defer.

P3\_WATCH\_ITEM

Low launch risk.

Track only.

DESIGN\_DECISION\_REQUIRED

Product/UX decision needed before coding.

Lane C.

NOT\_A\_DEFECT\_EXPECTED\_BEHAVIOR

Expected behavior.

Document and close.



8.2 Required Finding Fields

Each finding must include:

finding ID

evidence

affected route/page

affected tenant/session

severity

launch impact

blocker status

owner/status

next action

implementation readiness

minimum likely file surface

whether Paresh decision is required

8.3 Adjacent Finding Rule

If verification surfaces a confirmed issue outside the active unit boundary:

keep it out of scope

record it separately

classify it

propose a unit title

provide likely file surface

mark implementation-ready, design-gated, or decision-gated

do not merge it into the active unit unless repo truth proves inseparability

Priority classification must declare:

Priority: P0 / P1 / P2 / P3

Launch impact: blocker / non-blocker

Owner: future unit / current unit

Disposition: fix now / register / defer / not defect



§9 Post-Unit Truth Sync

“Close” is not heavy GOV-OS closeout.

Close is a minimal post-unit truth sync.

Purpose:

prevent stale consumed-slice truth

prevent stale blocked state

prevent drift between repo reality and control surfaces

avoid unnecessary documentation burden

9.1 What Gets Synced

Unit Type

Sync Action

Verified unit

Light update only where truth changed.

Production-dependent unit

Same, plus production smoke evidence.

Hub-impacted unit

Answer Hub-Sync Checklist if launch-readiness truth changed.

No hub impact

Record NO\_HUB\_UPDATE\_REQUIRED with reason.



9.2 What Is Not Required

no comprehensive GOV-OS synthesis per unit

no long closeout narrative for bounded fixes

no cross-domain snapshot unless explicitly scoped

Working rule:

No unit is finished until it is verified and changed truth is minimally synced.



§10 Repo Hygiene

To prevent phantom diffs in governance:

disable markdown format-on-save in VS Code

keep line endings and prose wrapping stable

governance files may only change when semantic content changes

If formatter changes governance files unintentionally: revert and fix tooling.



§11 DB Apply Governance

SQL, schema, Prisma, RLS, grants, and production DB changes require explicit DB-governed approval.

A DB unit must include:

exact SQL

apply method

rollback plan

post-apply proof query

tenant-boundary proof

production smoke

separate implementation and governance commits

Standalone tracked SQL files are not automatically applied.

No “assumed applied.”



§12 Permanent Guardrails

TECS-GR-007 — Tenant Context Integrity Proof

Mandatory whenever any of the following change:

server/prisma/supabase\_hardening.sql

server/prisma/rls.sql

SQL functions: set\_tenant\_context, set\_admin\_context, clear\_context

middleware/context code: withDbContext, databaseContextMiddleware, DB context helpers

policies touching users, memberships, tenants

auth/login handler

Required proof:

function definition proof

RLS visibility proof under app\_user

production login smoke

If any proof fails:

stop immediately

mark gap as blocked

open hotfix sub-gap

do not mark validated

TECS-GR-008 — Stale Design / Repo Truth Revalidation Guardrail

Family-design artifacts are planning authority, not automatic implementation authority.

Trigger

Mandatory before any family-design artifact moves into implementation opening.

Required Proof

Before implementation opens, record:

current branch

current HEAD

current repo status

files inspected

changed surfaces since the design artifact was created

confirmation that current repo truth still matches the design assumptions

updated file allowlist

implementation stop conditions

Hard Stop

If current repo truth conflicts with the design assumptions:

do not implement

reopen design/intake

classify the drift

update the next unit recommendation

Purpose:

Prevent stale-design drift in long-running launch families.



§13 Commit \& Reporting Protocol

13.1 Two Commits Required

Implementation commit:

only allowlisted runtime code/SQL changes

message includes unit ID and summary

excludes governance files unless explicitly source+governance-only unit

Governance commit:

only governance files

must reference implementation commit hash where applicable

13.2 Implementation Report Must Include

what changed

static gates output

runtime validation summary

production smoke steps if applicable

known stubs/out-of-scope items

adjacent finding candidates

post-unit truth sync confirmation or NO\_HUB\_UPDATE\_REQUIRED



§14 Manual Production Validation and Manual QA Role

14.1 Manual Production Validation Checklist

Include in every UI implementation report:

tenant login success

control plane login success if relevant

one tenant API call requiring DB context if relevant

one control plane API call if relevant

UI page loads

tenant branding correct

console errors checked

affected buttons/flows noted as stub/unimplemented/regression/pass

14.2 Manual QA Role

Manual QA by Paresh is part of definition of done for launch-facing UX.

A launch-facing UI cannot be marked READY\_FOR\_LAUNCH if:

Paresh/manual QA has not accepted the product behavior

acceptance criteria do not include product/UX result

manual QA raised unresolved product mismatch

the feature is only technically functional

Manual QA may downgrade a unit to:

TECHNICALLY\_FUNCTIONAL\_PRODUCT\_ACCEPTANCE\_PENDING

BLOCKED\_BY\_PRODUCT\_DESIGN\_GAP

READY\_WITH\_ACCEPTED\_LIMITATION



§15 Launch Readiness Hub Drift-Control

The Launch Readiness Hub Drift-Control system remains active and consolidated.

15.1 Authority Model

Layer

Role

Layer 0

Sequencing authority. Hub reads from Layer 0, never writes to it.

TECS OS

Execution authority.

Repo + unit evidence

Fact authority.

Hub

Planning and tracking layer. Not fact authority.



Golden rule:

Repo truth and verified unit evidence win over hub claims.

15.2 Mandatory Evidence Fields

Every status-bearing hub row must carry:

status

readiness

priority

evidence\_level

evidence\_source

last\_verified\_by\_unit

last\_verified\_date

next\_review\_trigger

If required fields are missing, row is treated as GOVERNANCE\_CLAIM\_ONLY.

15.3 Evidence Levels

Level

Description

PRODUCTION\_CONFIRMED

Production smoke or prod data evidence.

TEST\_CONFIRMED

Automated tests against real DB or CI.

REPO\_CONFIRMED

Committed route/service/schema/component confirmed.

GOVERNANCE\_CLAIM\_ONLY

Governance claim without repo inspection.

USER\_PLANNED\_ONLY

Communicated by Paresh, not yet in repo.



15.4 Binding Evidence Rules

Status Claim

Minimum Evidence

PRODUCTION\_VERIFIED

PRODUCTION\_CONFIRMED

VERIFIED\_COMPLETE

TEST\_CONFIRMED or PRODUCTION\_CONFIRMED

REPO\_IMPLEMENTED

REPO\_CONFIRMED

LAUNCH\_BLOCKER / MVP\_CRITICAL

REPO\_CONFIRMED + Paresh confirmation

POST\_MVP deferral

Paresh-confirmed deferral



15.5 Hub-Sync Checklist

Every verify-close or truth-sync must answer:

Did this unit change launch readiness truth?

Which family or requirement changed?

Which hub documents need updating?

What evidence supports the update?

Are CRM/CAE details at risk of duplication?

Are planned items at risk of improper promotion?

Are stale hub rows superseded?

If no hub update is needed, why?

Were hub files allowlisted?

15.6 Drift Response

Known drift must be either:

corrected now if allowlisted, or

recorded as pending hub update

No silent drift.

15.7 No-Duplication Rule

Hub rows reference authoritative evidence; they do not copy full findings.

Do not duplicate long findings from:

Layer 0

TECS unit artifacts

CRM/CAE audit reports

family trackers

public SEO registers

Use:

unit ID

commit hash

evidence source

brief summary

If a hub row repeats long prose from another governance file, reduce it to a reference plus concise summary.

15.8 Planned Requirements Rule

Planned items must enter through planned-requirements intake before becoming launch-readiness rows.

A planned item cannot become:

MVP critical

launch blocker

implementation-ready

unless Paresh confirms it and it passes the appropriate family classification/intake.

15.9 CRM/CAE Rule

Main repo hub records CRM and CAE only as XDEP references.

No inlining of CRM/CAE implementation details unless cited from the correct CRM/CAE repo audit unit.

15.10 Public SEO/Page Rule

SEO/public page hub rows must not claim sitemap, canonical, robots, or index status unless confirmed by repo artifact or production verification.

Use SEO\_DECISION\_PENDING where not decided.

15.11 Stale-Row Handling

Rows are never deleted without Paresh instruction.

Use:

SUPERSEDED

DEFERRED

WITHDRAWN

NEEDS\_REPO\_INSPECTION



§16 Pre-Existing Modified Files Rule

Never stage files outside the unit’s explicit allowlist.

If accidental staging occurs:

git reset HEAD <file>



Verify final staged files before commit.



§17 Launch Board

Maintain one compact launch board for active launch work.

Recommended file:

governance/launch-readiness/LAUNCH-BOARD.md

If the repo already has an equivalent active launch board, use that file instead of creating a duplicate.

17.1 Owner and Cadence

Owner: Paresh.

Update cadence:

weekly, or

after any P0/P1 launch-readiness change, or

after any unit changes FTR-SL launch gate status.

17.2 Required Columns

Each row must include:

item ID

title

lane

priority

launch impact

readiness enum

current status

evidence level

last verified unit

next action

owner/status

blocker yes/no

17.3 Status Rule

The Launch Board status must use §7 readiness enums.

No free-text “almost done” or “looks okay” statuses.

17.4 Purpose

The Launch Board is the single executive surface for weekly launch decisions.

It prevents confusion between:

launch blocker

pre-launch fix

post-launch follow-up

watch item

design decision

ready with accepted limitation



§18 Quick Reference

Working System

next-unit confirmation / opening

lane selection

cost gate

bounded design / plan

Feature Intake Gate for Lane A

repo-truth validation against current repo

implementation planning

slice-by-slice implementation

static gates

runtime / production verification

product acceptance where launch-facing

post-unit truth sync

close with readiness enum

next-unit recommendation

Anti-Drift / Anti-Cost Rules

Do not allow:

opening without next-unit confirmation

implementation without lane selection

implementation without cost class

implementation without repo-truth validation

launch-facing UI without UX pattern

READY enum without product acceptance

production-dependent close on local proof

repeated artifact creation for minor issues

adjacent findings auto-merged into active unit

broad Copilot exploration without cost gate

hub row promotion without evidence

planned item promotion without Paresh confirmation

family design moving to implementation without fresh repo validation

Full TECS Discipline Remains Mandatory For

DB/schema/RLS changes

auth/security changes

public projection surfaces

payment/legal/accounting

launch-critical UX

multi-surface features

Small UI fixes and bounded defects use Lane B with Tier 1–2 evidence.

Full TECS is not required for everything. This is intentional.



Appendix A — Mandatory Design-Intake Prompt Template

Use this before implementation for every Lane A launch-facing feature.

\# TECS v2.0.1 DESIGN INTAKE



Unit ID:



Execution lane:

Cost class:

Evidence tier:



Feature name:

User role:

Tenant/session:

Route/page:



Product intent:

UX pattern:

Expected user-visible behavior:



Data model touched:

Public/private boundary:

What must never be exposed:



Acceptance criteria:

1\.

2\.

3\.



Runtime QA script:

1\.

2\.

3\.



Launch-blocking conditions:

Non-blocking follow-ups:



Expected file surface:

Source allowlist:

Governance allowlist:

Forbidden files/actions:



Repo-truth validation required:

Stop condition:

Do not continue if:



Hub impact:

Manual QA required:



Decision needed from Paresh:



If any field is unknown, the prompt is not implementation-ready.



Appendix B — Mandatory Final Report Template

Every final report must include:

Final enum:



Execution lane:

Cost class:

Evidence tier:



What changed:

Files changed:



Validation commands/results:

Runtime verification result:

Production smoke result, if applicable:

Product acceptance result, if launch-facing:

Public non-exposure result, if relevant:



Source commit hash:

Governance/truth-sync commit hash:

Push status:

Final git status:



Hub impact:

Hub-sync checklist result or NO\_HUB\_UPDATE\_REQUIRED:



Adjacent findings:

\- ID:

\- priority:

\- launch impact:

\- disposition:

\- next action:



Readiness decision:

Next recommended unit:



For verification-to-close prompts, also include:

exact verification steps run

exact in-scope result

close-readiness decision

separate adjacent-finding candidates

explicit note if cleanup remains separate



Appendix C — FTR-SL-017 Design-Intake Minimum Questions

Before FTR-SL-017 implementation, answer:

Where does the catalogue visibility control appear?

Is it tenant-wide, catalogue-level, product-level, or both?

Who can change it?

What is default state for existing catalogue/products?

What public states exist?

What private/internal states exist?

What public pages should change?

What public pages must not change?

What should never be exposed?

What happens after save?

Is audit/trace required?

What runtime tenant/session will verify it?

What exact manual QA acceptance criteria apply?

What is the cost class?

What is the evidence tier?

What are the stop conditions?

FTR-SL-017 must begin as Lane C design intake, then move to Lane A implementation only after intake approval.



Adoption Rule

TECS v2.0.1 is effective for all future TexQtic launch-readiness work after Paresh approval.

The first governance unit governed by TECS v2.0.1 should be:

GOV-TECS-V2-0-1-ADOPTION-AND-LAUNCH-GATE-SYNC-01

The first product unit governed by TECS v2.0.1 should be:

FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01

Do not start FTR-SL-017 implementation until its TECS v2.0.1 design intake is complete.







TECS v2.0.2 — TexQtic Execution \& Compliance System

CONFIDENTIAL — TexQtic Ventures Pvt Ltd

Precision Patch to TECS v2.0.1

Purpose

TECS v2.0.2 preserves TECS v2.0.1 and applies five targeted corrections discovered during structural review.

This is not a replacement of the TECS v2.0.1 operating model. It is a corrective amendment that removes ambiguity and strengthens enforceability.

v2.0.2 Correction Summary

ID

Area

Correction

F1

§0.4 Copilot Cost Gate

Add missing expected runtime checks and governance evidence tier to the opening required-field list.

F2

§3 Lifecycle

Add lane-specific lifecycle rules for Lane D and Lane E so verification/governance units are not forced through source implementation steps.

F3

Lane E / §15

Clarify that Lane E governance units may update hub status only when §15 evidence-level rules are satisfied.

F4

TECS-GR-008

Define “implementation opening” and add a concrete proof format for stale-design/repo-truth revalidation.

F5

Launch Board

Simplify Launch Board columns by merging readiness enum/current status and making evidence detail a reference field, not a weekly burden.





Amendment 1 — §0.4 Copilot Cost Gate

Replace §0.4 opening field list with this text

Before triggering Copilot on any task, the prompt must declare:

cost class: LOW / MEDIUM / HIGH

max scope: investigation / source fix / verification / governance

expected files touched

expected runtime checks

governance evidence tier

stop condition

do not continue if: explicit boundary

Clarification

The Cost Gate is incomplete if it omits expected runtime checks or governance evidence tier.

A Copilot prompt that lacks either of these fields is not TECS-compliant unless the task is explicitly marked as non-runtime and non-governance-impacting.

Required Cost Gate Block

Every future prompt must include:

Cost class:

Max scope:

Expected files touched:

Expected runtime checks:

Governance evidence tier:

Stop condition:

Do not continue if:



If any field is unknown, the prompt must either:

switch to Lane C triage/design, or

stop and request the missing information.



Amendment 2 — §3 Lifecycle: Lane-Specific Sequences

Add new §3.3 after §3.2

3.3 Lane-Specific Lifecycle Rules

The standard lifecycle in §3.1 applies fully to Lane A and Lane B units.

Lane D and Lane E units have abbreviated lifecycle paths because they do not produce source implementation changes by definition.

3.3.1 Lane A — Launch Feature Lifecycle

Lane A must follow the full sequence:

next-unit confirmation / opening

lane selection

cost gate

Feature Intake Gate

bounded design / plan

repo-truth validation against current repo

implementation planning

slice-by-slice implementation

static validation

runtime / production verification

product acceptance where launch-facing

post-unit truth sync

close with readiness enum

next-unit recommendation

3.3.2 Lane B — Bounded Fix Lifecycle

Lane B follows a shortened but source-capable sequence:

next-unit confirmation / opening

lane selection

cost gate

bounded diagnosis / plan

repo-truth validation against current repo

source fix within allowlist

targeted static validation

runtime / production verification if runtime-visible

post-unit truth sync

close with readiness enum

next-unit recommendation

Lane B does not require a full Feature Intake Gate unless the fix changes launch-facing UX/product behavior.

3.3.3 Lane C — QA Triage / Design Decision Lifecycle

Lane C follows a non-implementation sequence:

next-unit confirmation / opening

lane selection

cost gate

repo-truth inspection

runtime observation if safe

finding classification

design decision or next-lane recommendation

light governance/truth sync if needed

close with triage/design enum

Lane C must not perform source implementation unless explicitly converted to Lane A or Lane B after Paresh approval.

3.3.4 Lane D — Verification Only Lifecycle

Lane D follows a verification-only sequence:

next-unit confirmation / opening

lane selection

cost gate

exact verification script

runtime / production verification

evidence summary

public non-exposure check if relevant

post-unit truth sync if verification changes readiness truth

close with readiness enum

Lane D skips:

implementation planning

slice-by-slice implementation

source static validation

If a Lane D unit discovers a source defect, it must stop and register or open a Lane B or Lane A unit. It must not patch inside Lane D unless explicitly re-scoped.

3.3.5 Lane E — Governance / Drift Sync Lifecycle

Lane E follows a governance-only sequence:

next-unit confirmation / opening

lane selection

cost gate

governance/repo-truth evidence review

allowed governance update

hub-sync checklist if launch-readiness truth changes

validation of governance diffs

governance commit

close with governance enum

Lane E skips:

source implementation

source static validation

runtime validation

Lane E may run git diff --check and other non-source validation commands.

If a Lane E unit discovers source work is needed, it must stop and recommend Lane A or Lane B. It must not implement source changes.

3.3.6 Governance Law for Lane D/E

For Lane D and Lane E, the §3.2 “static gates” requirement is satisfied by the lane-appropriate validation:

Lane D: verification script results + runtime/prod evidence

Lane E: governance diff validation + evidence-level compliance

Do not force source typecheck/lint on Lane D or Lane E unless source files were changed, which should normally not happen.



Amendment 3 — Lane E Evidence-Level Clarification

Add this paragraph to Lane E in §2

Lane E governance units may update governance and hub rows only within the limits of the evidence already available.

A Lane E unit does not lower the evidence requirement for a status change.

Any hub status advancement made in a Lane E unit must satisfy §15.4 Binding Evidence Rules.

Examples:

A row may move to REPO\_IMPLEMENTED only with REPO\_CONFIRMED evidence.

A row may move to PRODUCTION\_VERIFIED only with PRODUCTION\_CONFIRMED evidence.

A row may be marked LAUNCH\_BLOCKER or MVP\_CRITICAL only with REPO\_CONFIRMED evidence plus Paresh confirmation.

A row may be marked SUPERSEDED, NEEDS\_REPO\_INSPECTION, or PENDING\_HUB\_UPDATE when the Lane E unit has governance evidence of drift but not enough evidence to advance readiness.

Lane E is not a shortcut around evidence rules. It is only the lane used to apply or correct governance truth.

Add this sentence to §15.4 Binding Evidence Rules

These evidence requirements apply regardless of execution lane, including Lane E governance/drift-sync units.



Amendment 4 — TECS-GR-008 Precision Upgrade

Replace TECS-GR-008 with this version

TECS-GR-008 — Stale Design / Repo Truth Revalidation Guardrail

Family-design artifacts are planning authority, not automatic implementation authority.

A design artifact, family anchor, roadmap item, or prior governance finding may guide implementation, but it cannot authorize implementation by itself.

Current repo truth must be revalidated at implementation opening.

Trigger

GR-008 is mandatory at implementation opening for every Lane A unit where any of the following exists:

prior family-design artifact

product design artifact

launch-readiness checklist

roadmap/family anchor

stale or long-lived implementation plan

prior governance finding being converted into implementation

Paresh-approved product direction older than the current repo state

Definition: Implementation Opening

Implementation opening means the moment a unit moves from planning/design authority into a source-changing implementation prompt.

In the TECS lifecycle, this occurs at Step 1 when the next unit is confirmed/opened as a Lane A implementation unit, or when a Lane C design decision is promoted into Lane A implementation.

Required GR-008 Proof Format

Every affected Lane A opening must include this proof block:

TECS-GR-008 Repo-Truth Revalidation Proof



Prior design / family artifact used:

Artifact date / commit, if known:

Current branch:

Current HEAD:

Worktree status:

Files inspected:

Routes/components/services/schema/config inspected:

Changed surfaces since design:

Conflicts found:

Disposition:

Updated implementation allowlist:

Stop condition:



Pass Criteria

GR-008 passes only if:

current HEAD is recorded,

worktree status is known,

relevant current files were inspected,

changed surfaces since the design artifact were considered,

no conflict exists between current repo truth and design assumptions, or conflicts are explicitly resolved before implementation,

the implementation allowlist reflects current repo truth.

Hard Stop

If current repo truth conflicts with design assumptions:

do not implement,

do not patch speculatively,

reopen design/intake,

classify the drift,

update next-unit recommendation.

Examples of GR-008 Conflict

a component was refactored after the design artifact was written,

a route path changed,

an API contract changed,

public/private projection behavior changed,

auth/role gating changed,

schema or RLS behavior changed,

a prior blocker was resolved or superseded,

a new blocker makes the design unsafe.

Purpose

GR-008 prevents stale-design drift in long-running launch families.

It exists because TexQtic has many family anchors, launch-readiness artifacts, and deferred design decisions that may become stale before implementation.



Amendment 5 — §17 Launch Board Usability Refinement

Replace §17.2 and §17.3 with this version

17.2 Required Columns

The Launch Board is an executive launch-control surface, not a duplicate of the hub.

Each row must include:

item ID

title

lane

priority

launch impact

readiness enum / status

blocker yes/no

next action

owner/status

evidence reference

last verified unit

17.3 Status Rule

The readiness enum / status column must use §7 readiness enums.

Do not use free-text statuses such as:

almost done

looks okay

mostly ready

should be fine

pending-ish

If a human-readable note is needed, put it in next action, not in status.

17.4 Evidence Reference Rule

The Launch Board does not need to repeat detailed evidence fields from the hub.

Use evidence reference to point to:

TECS unit ID,

commit hash,

hub row,

artifact path,

or PARESH\_DIRECT.

Detailed evidence level remains governed by the hub and TECS unit artifact.

17.5 Launch Board Purpose

The Launch Board must remain scannable in weekly review.

It should answer quickly:

What is blocked?

What can start next?

What requires Paresh decision?

What is deferred?

What is launch-ready?

It must not become another long-form governance register.



Amendment 6 — Appendix A Cost Gate Alignment

Update Appendix A control block

Replace the Cost/TECS control section with this:

Execution lane:

Cost class:

Evidence tier:



Max scope:

Expected files touched:

Expected runtime checks:

Governance evidence tier:



Launch impact:

Product intent:

UX pattern:

Public/private boundary:

Acceptance criteria:

Runtime QA script:



Stop condition:

Do not continue if:



Hub impact:

Manual QA required:



If any required field is unknown, the prompt is not implementation-ready.



Amendment 7 — Final Adoption Note

TECS v2.0.2 supersedes TECS v2.0.1 where amended.

All TECS v2.0.1 rules remain active unless explicitly replaced by this v2.0.2 patch.

First Governance Unit Under v2.0.2

If the TECS v2.0.1 adoption prompt is already running, the next governance unit should be:

GOV-TECS-V2-0-2-PRECISION-PATCH-ADOPTION-01

Execution lane:

Lane E — Governance / Drift Sync

Cost class:

LOW

Evidence tier:

Tier 2

Purpose:

Apply the v2.0.2 precision patch to the TECS authority document and Copilot instruction references, without modifying application source code.

First Product Unit Still Remains

FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01

FTR-SL-017 implementation must still not start until the design intake passes.







