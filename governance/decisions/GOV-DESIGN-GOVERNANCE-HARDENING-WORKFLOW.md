# GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW

Decision ID: GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW
Title: Governance hardening must be operationalized through a minimal linter, checklist, and CI workflow
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state already records:

- `GOV-POLICY-CLOSURE-SEQUENCING-HARDENING`
- `GOV-POLICY-HISTORICAL-LAYER1-RECONCILIATION`

Those policies now require:

- closure integrity at write-time
- sequencing safety at write-time
- explicit verification taxonomy
- no archive-only closure truth
- truthful incompleteness over fabricated completeness

The repository also already contains two useful operational patterns that should be reused instead
of replaced:

1. narrow static guards implemented as TypeScript scripts under `scripts/`
2. dedicated GitHub Actions workflows that block only machine-provable structural violations while
   keeping non-mechanical judgment outside automation

Current examples include:

- `scripts/control-plane-guard.ts`
- `.github/workflows/control-plane-guard.yml`
- `scripts/validate-contracts.ts`
- `.github/pull_request_template.md`

TexQtic therefore does not need a large new governance subsystem. It needs a small workflow that
makes the hardening policy usable and enforceable without converting human judgment into false
automation.

## Problem Statement

The newly adopted hardening policy is correct, but policy text alone will not prevent drift.

Without an operational workflow:

- machine-checkable violations may still enter the repository because no write-time guard stops them
- human operators may have no consistent checklist for closure, governance sync, sequencing, or
  reconciliation work
- CI may fail to distinguish between structural governance violations and legitimate human-only
  judgment calls
- teams may bypass the policy because the process is too abstract to apply consistently

TexQtic needs the smallest practical workflow that creates early friction for structural drift,
while leaving ambiguity, materiality, and historical truthfulness under human control.

## Goals

1. enforce machine-checkable governance hardening rules at write-time
2. provide a reusable closure/checklist workflow that humans can follow consistently
3. define exact CI block versus warn boundaries
4. explicitly reserve ambiguous historical and sequencing judgment for human review
5. keep the workflow small enough to adopt immediately

## Non-Goals

This design does not:

- implement the governance linter in this unit
- create a new operational governance layer
- backfill historical Layer 1 gaps
- open any implementation unit
- change RFQ posture, G-026-A scope, AdminRBAC posture, application code, tests, schema, CI code,
  or database behavior
- auto-decide historical Cases A through E

## Analysis

### 1. Machine-Checkable Controls

The following parts of the hardening policy are structurally machine-checkable:

1. allowed status vocabulary in Layer 0, Layer 1, and Layer 3 records
2. presence of required fields in closure-grade governance records
3. presence of verification taxonomy labels where closure or verification is claimed
4. required co-updates across Layer 0, Layer 1, and Layer 3 when a governed unit status changes
5. prohibition on archive paths being the sole cited basis for closure-grade claims
6. single-next-action structure in `NEXT-ACTION.md`
7. single-open-unit invariants where machine-readable files prove a contradiction
8. governance-only commit scope for governance task types
9. internal consistency between `OPEN-SET.md`, `NEXT-ACTION.md`, `SNAPSHOT.md`, relevant unit
   files, and appended `EXECUTION-LOG.md` entries when the relationship is mechanical

### 2. Human-Only Controls

The following remain inherently human judgment:

1. historical Case A/B/C/D/E classification
2. whether evidence is exact enough for Layer 1 backfill
3. whether snapshot/log-only reconciliation is the minimum truthful correction
4. whether repo reality is materially present rather than merely suggestive
5. whether chronology is strong enough to avoid synthetic reconstruction
6. which valid product or operator sequencing option should be preferred

### 3. Existing Repo Patterns To Reuse

TexQtic should reuse the current pattern of:

1. a narrow static TypeScript guard script in `scripts/`
2. a dedicated GitHub Actions workflow for that guard
3. checklist language in pull requests and governance prompts
4. existing governance layers rather than a new operational storage system

### 4. Minimum Viable Workflow

The smallest viable workflow is:

1. a governance linter that checks only structural invariants
2. a reusable human checklist family for task types that affect closure or sequencing
3. CI hard-blocks only for structural violations
4. CI warnings plus mandatory human review for ambiguous historical or sequencing questions

### 5. Whether This Unit Should Only Record Design

Yes.

This task should record the operational design only. A later dedicated governance/process unit is
required to implement the linter script and CI workflow.

### 6. Closure Index Posture

A canonical closure index is not immediate.

It is deferred and optional as a later Phase 4 enhancement, only if the minimal workflow proves
insufficient. The current Governance OS remains the canonical traceability mechanism.

## Linter Scope

TexQtic should install one governance linter with narrow static scope.

The linter should check the following automatically:

1. **Status vocabulary**
   Only allowed unit, decision, and log-result vocabularies may appear in canonical governance
   records.

2. **Closure integrity gate structure**
   Any closure-grade governance record must include:
   - canonical identity
   - terminal status
   - bounded scope statement
   - evidence-class label from the verification taxonomy
   - canonical reference path for later audit

3. **Sequencing safety gate structure**
   Any sequencing-sensitive governance record must declare a historical evidence posture before
   making a sequencing claim.

4. **Verification taxonomy presence and usage**
   Closure, verification, reconciliation, and sequencing records must use only:
   - `STATIC_VERIFICATION`
   - `TEST_VERIFICATION`
   - `RUNTIME_VERIFICATION`
   - `PRODUCTION_VERIFICATION`
   - `GOVERNANCE_RECONCILIATION_CONFIRMATION`
   - `HISTORICAL_EVIDENCE_ONLY`

5. **No-archive-only-closure violations**
   The linter must fail if a closure-grade claim cites only `governance/archive/`, legacy tracker,
   or archive-style references without any canonical Layer 0, Layer 1, Layer 2, or Layer 3 anchor.

6. **Required co-updates where policy requires them**
   - if a non-terminal unit status changes, the diff must include the relevant Layer 1 unit file,
     `OPEN-SET.md`, `NEXT-ACTION.md` when the next action truly changes, `SNAPSHOT.md`, and an
     appended `EXECUTION-LOG.md` entry
   - if a decision-only record changes no non-terminal state, the linter must allow `OPEN-SET.md`
     and `NEXT-ACTION.md` to remain untouched

7. **Cross-layer mismatch checks where machine-verifiable**
   - `OPEN-SET.md` summary counts must match the actual non-terminal records represented there
   - `NEXT-ACTION.md` must contain exactly one authorized next action
   - `SNAPSHOT.md` must not claim an open posture contradicted by Layer 0
   - a unit marked terminal in its canonical record must not simultaneously appear as open in Layer 0

8. **Governance-only commit scope**
   If the task is a governance-only task, the diff must not touch application code, tests, schema,
   migrations, policies, or other forbidden non-governance paths.

9. **Single-unit / single-next-action structural invariants**
   The linter should fail if one change attempts to open multiple units or if `NEXT-ACTION.md`
   implies more than one authorized next action.

10. **Traceability-field presence**
    If a closure or sequencing record claims traceable status, it must include explicit references
    sufficient to audit the claim without using chat memory.

The linter must not attempt to decide materiality, chronology quality, or reconciliation case
classification.

## Checklist Workflow Design

TexQtic should adopt one reusable checklist family with mandatory task-type selection.

### Checklist A — Unit Closure

Mandatory for:

- governance closure of an implementation or verification unit

Required evidence:

1. canonical unit ID
2. terminal unit status
3. strongest proven evidence class
4. commit reference or explicit `N/A` for read-only verification units
5. Layer 0/1/3 references proving closure traceability

Cannot be claimed without canonical capture:

- terminal closure
- verification strength above the evidence actually proved
- reopening or cross-unit collapse

Verification taxonomy selection rule:

- choose the strongest single proven class; if only historical posture is known, use
  `HISTORICAL_EVIDENCE_ONLY` and do not claim closure

### Checklist B — Governance Sync

Mandatory for:

- sync units that reconcile Layer 0, Layer 1, and Layer 3 after a verified unit outcome

Required evidence:

1. source unit or decision ID
2. canonical current status
3. exact files whose truth changes
4. confirmation whether `NEXT-ACTION.md` changes or remains unchanged

Cannot be claimed without canonical capture:

- that Layer 0 changed when no operational truth changed
- that `OPEN-SET.md` stayed valid if counts or statuses now contradict it

### Checklist C — Sequencing Decision

Mandatory for:

- any governance decision that chooses whether work should or should not open

Required evidence:

1. current `OPEN-SET` and `NEXT-ACTION` posture
2. explicit historical evidence classification if history is involved
3. exact reason a unit may open, may not open, or remains deferred/design-gated
4. statement that no broader scope is implicitly authorized

Cannot be claimed without canonical capture:

- that historically present code is a clean implementation opening
- that a DESIGN_GATE or DEFERRED item is now open without its gating decision chain

### Checklist D — Historical Reconciliation

Mandatory for:

- any task handling historical Layer 1 or closure drift

Required evidence:

1. explicit Case A/B/C/D/E classification
2. evidence hierarchy used
3. minimum truthful mechanism selected
4. explicit statement whether Layer 1 changes, remains unchanged, or is forbidden to change

Cannot be claimed without canonical capture:

- exact backfill identity
- historical closure as fact from archive-only evidence
- synthetic single-unit reconstruction

### Checklist E — Audit Follow-Up

Mandatory for:

- governance tasks responding to audit findings without immediate implementation

Required evidence:

1. audit finding or cohort ID
2. classification of whether the issue is structural, historical, or sequencing-related
3. whether the outcome is block, warn, defer, or future process work

### Checklist F — Governance-Only Commit

Mandatory for:

- every governance-only commit

Required evidence:

1. `git diff --name-only`
2. `git status --short`
3. staged-file set contains governance-only files
4. statement that no implementation unit was opened

Cannot be claimed without canonical capture:

- clean scope
- atomicity
- unchanged control-plane posture

## CI Enforcement Boundaries

CI should be split into **BLOCK** and **WARN / HUMAN REVIEW** boundaries.

### CI BLOCK Conditions

CI should fail automatically for:

1. invalid status vocabulary in canonical governance files
2. missing required fields for closure-integrity or sequencing-safety structure
3. missing verification taxonomy labels where closure-grade claims are made
4. archive-only closure claims
5. machine-provable cross-layer inconsistency in Layer 0 or Layer 1
6. governance-only tasks modifying forbidden non-governance paths
7. diffs that structurally open multiple units at once
8. diffs that structurally force a `DESIGN_GATE` item open without its canonical gating decision
9. `NEXT-ACTION.md` containing more than one authorized next action or malformed structure
10. required governance co-updates missing for a real unit-status transition

### CI WARN / HUMAN REVIEW Conditions

CI should warn, summarize, or require human review for:

1. historical Case A/B/C/D/E classification
2. whether exact backfill is justified
3. whether multi-unit evidence is too ambiguous
4. whether repo reality is materially present
5. whether chronology is exact enough to avoid synthetic reconstruction
6. product/operator priority choice among valid options
7. whether snapshot/log-only reconciliation is the minimum truthful fix

Automation may surface that these questions exist, but it must not decide them.

## Human-Only Judgment Boundaries

The following must remain human-reviewed and never fully auto-decided by the linter or CI:

1. historical Layer 1 backfill classification under Cases A/B/C/D/E
2. whether evidence is sufficiently exact for backfill
3. whether snapshot/log-only reconciliation is the minimum truthful correction
4. whether code or repo evidence is strong enough to count as materially implemented
5. any ambiguity involving chronology, scope collapse, or synthetic reconstruction risk
6. sequencing or product choice among multiple governance-compatible options

## Failure Handling

### Hard-Stop Failures

If the linter hits a CI BLOCK condition:

1. the commit or PR fails
2. the author must correct the structural governance record before retry
3. no override is allowed for vocabulary, malformed structure, archive-only closure, forbidden
   file scope, or mechanically provable cross-layer contradiction

### Warning-Only Failures

If the workflow hits a WARN / HUMAN REVIEW condition:

1. CI may pass with warning output or review-required status
2. the human operator must record the judgment explicitly in the governance artifact before merge

### Manual Override Rule

Manual override is permitted only for temporary tooling limitations, never for policy violations.

An override requires:

1. explicit operator acknowledgement in the governance artifact
2. explanation of why the failure is tooling-related rather than truth-related
3. a follow-up process task if the tooling gap is recurring

### Whether Failed Attempts Belong In Layer 0 Or Layer 3

Failed linter or checklist attempts should not update `SNAPSHOT.md` or `EXECUTION-LOG.md` by
default.

They should be recorded in canonical governance files only if the failed attempt itself creates a
governance-relevant decision, blocker, or audit finding. Routine failed draft attempts are not log
events.

## Phased Adoption Plan

### Phase 1 — Immediate

Install the workflow socially first:

1. use the checklist family manually in governance prompts and reviews
2. require explicit evidence-class labelling in new governance closure or sequencing records
3. require explicit historical-evidence classification before reconciliation or sequencing edits

### Phase 2 — Minimal Linter Script

Create one repo script, following the current `control-plane-guard.ts` pattern, that checks only
structural governance invariants.

Suggested scope:

1. status vocabulary
2. required field presence
3. co-update expectations
4. archive-only closure detection
5. governance-only diff-scope validation

### Phase 3 — CI Hard-Block Workflow

Add one dedicated GitHub Actions workflow that runs the governance linter on pull requests and
pushes to main, blocking only the CI BLOCK conditions defined above.

### Phase 4 — Optional Traceability Automation

Only if still needed later:

1. add a closure-index or stronger traceability manifest
2. add richer warning summaries for audit/reconciliation review

This phase is optional and deferred.

## Consequences

- TexQtic gets a practical write-time governance workflow without over-automating judgment
- the existing Governance OS remains the canonical source of traceability
- CI blocks structural governance drift early
- ambiguous historical truth remains explicitly human-controlled
- current non-opening posture is preserved

## Relationship To Prior Policies

This design operationalizes:

- `GOV-POLICY-CLOSURE-SEQUENCING-HARDENING`
- `GOV-POLICY-HISTORICAL-LAYER1-RECONCILIATION`

It does not supersede them. It defines how those policies should be applied through tooling and
checklists.

## Later Implementation / Process Unit Required

Yes.

This decision requires a later dedicated governance/process implementation unit to:

1. add the governance linter script
2. add the dedicated CI workflow
3. optionally align PR or governance templates with the checklist family

No such implementation unit is opened by this decision.
