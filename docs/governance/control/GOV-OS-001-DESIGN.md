# GOV-OS-001 — Governance OS Control-Plane Partition Design

**Unit ID:** GOV-OS-001  
**Unit Type:** DOCTRINE / DESIGN / GOVERNANCE ARCHITECTURE  
**Status:** CLOSED  
**Date:** 2026-03-17  
**Authored by:** TexQtic Governance Design Session  
**Doctrine Version:** v1.12 (opening-layer canon alignment; original layer model preserved)  
**Reset Ratification:** `governance/decisions/GOV-DEC-GOVERNANCE-OS-RESET-WRITEBACK-001.md`  
**Live Authority Alignment:** preserved downstream governance design descendant; live opening-layer routing is governed by the opening-layer canon rather than by this file alone.  

---

## 1. Result

GOV-OS-001 is CLOSED as DESIGN-ONLY.

A Governance Operating Model for TexQtic has been designed that:
- Partitions governance into five structurally separated layers
- Defines a small operational control plane (≤5 small files)
- Defines one canonical unit record per governed unit
- Defines a finite controlled status vocabulary (8 statuses)
- Defines legal state transitions and explicitly forbidden transitions
- Defines an Enforcement Model that applies equally to human operator (Paresh), GPT planner (TexQtic CTO), and VS Code Copilot executor
- Defines a phased migration path that preserves all history
- Does not execute migration in this unit

Reset amendment ratified on 2026-04-04 preserves this design as downstream governance lineage and narrows its live operating burden:
- Layer 0 owns present operational posture only
- Layer 0 confirms governed-unit state, blocker/hold posture, audit posture, and governance exceptions only
- the live opening-layer canon now governs top-level opening-layer routing after Layer 0
- ordinary product execution sequencing is read from the product-truth authority stack (`docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` -> `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md` -> `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`) when no governance exception is active
- the control-plane read order is `OPEN-SET.md` -> `NEXT-ACTION.md` -> `BLOCKED.md` -> `SNAPSHOT.md`
- `NEXT-ACTION.md` is a governance-facing pointer and must not be treated as a universal delivery-order source when no governance exception is active
- relevant preserved downstream family/design authorities remain topic-specific descendant truth only
- the old `-v2` chain is historical evidence and reconciliation input only, not live authority
- candidate normalization is exception-only rather than a standing prerequisite
- Sentinel gating is control-critical only
- separate post-close audit artifacts are reserved for strict-path or broader queue-shaping closes
- product-facing closes that change active-delivery or next-candidate posture require post-close authority reconciliation against the live opening-layer sequencing authority and live opening-layer authority map before any fresh opening decision
- zero-open product-delivery post-close posture returns to explicit next-opening decision control; closed units preserve lineage only
- structurally broad but coherent chosen family remainders must route to one further same-family bounded reduction or narrow design-clarification step only
- coherent narrowed same-family remainders with explicit residual lanes must route to one same-remainder lane-separation clarification step only
- when a truthful preserved unresolved hold remains and bounded contradiction and descendant-selection checks prove no hold-outranking contradiction and no exact current downstream governance descendant, Governance OS must first re-query any still-active launch-readiness acceleration attachment for one exact bounded next work item or one lawfully identified deferred bounded next-work candidate preserved in that lane; only when that lane is explicitly exhausted, superseded by later authority, or blocked by a narrower live governance exception may Governance OS route to one governance-only same-hold design-clarification successor limited to the minimum exact future hold-resolution path or evidence condition for that same hold

No application code, schema, migration, API, or test files were modified.  
No product unit status was changed as part of this governance design.

---

## 2. Findings

### 2.1 Root Cause of Governance Drift

The following structural problems were observed in the current governance system:

| Problem | Mechanism | Drift Impact |
|---|---|---|
| **Oversized files** | `gap-register.md` and `IMPLEMENTATION-TRACKER-2026-03.md` grow without bound as GOVERNANCE-SYNC entries prepend | AI context windows see only a partial view; humans skip-read; operational truth becomes invisible |
| **Free-form status vocabulary** | "✅ CLOSED", "VERIFIED_COMPLETE", "TECS VALIDATED", "IMPLEMENTED", "CONDITIONAL PASS", "PARTIALLY IMPLEMENTED" all coexist | Cannot programmatically distinguish open from closed; AI planner infers status from prose |
| **Multi-file truth fragmentation** | One unit's status appears in the gap-register, the implementation tracker, the audit matrix, and historical Q2 files simultaneously | Updates to one file do not propagate; files drift out of sync (confirmed: tracker Wave 2 row was ⏳ while gap-register was ✅ for same unit) |
| **No canonical open-set file** | To know what is open today, you must parse all three large files | Any large-file partial read produces an incorrect picture of "what's open" |
| **No canonical next-action file** | The next authorized action is buried in wave tables, gap-register prose, and tracker footers | Context-loss between sessions requires lengthy summary reconstruction |
| **Undefined state transitions** | No formal list of legal vs. illegal state jumps | Units can jump from OPEN → VERIFIED_COMPLETE silently, or be "closed" without verification evidence |
| **Mixed-mode documents** | Implementation evidence, governance history, and current operational status all live in the same file | Implementation units inadvertently modify governance files; governance edits bleed into implementation commits |
| **No carry-forward protocol** | New chat sessions start with enormous freeform summaries | Context-window pressure causes hallucination, out-of-date assumptions, and unauthorized actions |
| **No enforcement structural gate** | All rules are advisory in `.md` files | Any operator, GPT instance, or Copilot session can skip them without structural consequence |

### 2.2 Current Governance Scale

- Approximate gap-register size: ~1,200 lines of dense prose, all prepended entries
- Implementation Tracker (March 2026): ~500+ lines, growing with each unit
- Status vocabulary: at least 12 distinct status expressions in active use
- Unit records: mixed between tracker rows, gap-register entries, and audit matrix cells with no canonical home

### 2.3 What Must Be Preserved

The following are doctrine invariants that the Governance OS must preserve without alteration:

1. DB-level RLS is mandatory; app code never trusts client-supplied tenant/org identifiers
2. Admin bypass is explicit and audited
3. Repo-governed DB changes only (`prisma db pull` + `prisma generate` after manual SQL)
4. One logical unit at a time; one atomic commit per unit
5. No governance edits inside implementation units
6. No implementation inside verification or governance units
7. Closed units stay closed unless governance explicitly reopens them via a new governance unit
8. Design-gated items must not be forced into implementation
9. Product-deferred items must not be treated as bugs
10. `org_id` is the canonical tenancy boundary; no weakening permitted at any layer

---

## 3. Governance OS Design

### 3.1 Layer Model

The Governance OS partitions governance truth into five structurally separated layers. Each layer has exactly one job. No layer should own truth that belongs to another layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 0 — CONTROL PLANE                                           │
│  Small files only (≤100 lines each). Read-first for all prompts.   │
│  Owns: current open set, next action, blocked register.            │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 1 — UNIT RECORDS                                            │
│  One file per governed unit. Rigid schema.                         │
│  Owns: per-unit canonical status, evidence refs, constraints.      │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2 — DECISION LEDGER                                         │
│  Separate files for product, design, and security decisions.       │
│  Owns: all authorized decisions that gate or ungate units.         │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 3 — EXECUTION LOG                                           │
│  Append-only chronological record of all governance events.        │
│  Owns: history for audit. NOT operational truth.                   │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 4 — ARCHIVE                                                 │
│  Legacy/historical documents. Frozen. Never operational.           │
│  Owns: pre-migration governance docs as immutable record.          │
└─────────────────────────────────────────────────────────────────────┘
```

**Layer rules:**
- Layer 0 owns current governed posture only: open set, governance-facing next-action pointer, blockers/holds, audit posture, governance exceptions, and restore-grade snapshot state
- the live opening-layer canon governs opening-layer routing after Layer 0
- ordinary product execution sequencing is derived from the product-truth authority stack when no governance exception is active
- when a truthful preserved unresolved hold remains and bounded contradiction and descendant-selection checks prove no hold-outranking contradiction and no exact current downstream governance descendant, Governance OS must first re-query any still-active launch-readiness acceleration attachment for one exact bounded next work item or one lawfully identified deferred bounded next-work candidate preserved in that lane; only when that lane is explicitly exhausted, superseded by later authority, or blocked by a narrower live governance exception may Governance OS route to one governance-only same-hold design-clarification successor before any broader downstream governance or product-family movement
- relevant preserved downstream family/design authorities provide topic-specific descendant truth
- the old `-v2` chain remains historical evidence and reconciliation input only and must not compete as live authority
- Layer 1 is the single source of truth for individual unit status
- Layer 2 decisions are referenced by Layer 1 unit records — never duplicated
- Layer 3 receives entries; never loses them; never becomes operational
- Layer 4 is read-only after migration; no new entries

### 3.1A Architectural Governance Statement

The preserved downstream architectural governance statement for TexQtic is:

- base commercial families are `B2B` and `B2C`
- `INTERNAL` is the non-commercial platform category
- white-label remains overlay/capability logic on top of a lawful base family and is not a peer family
- Aggregator remains a cross-family discovery, matching, and intent-handoff capability and is not a peer base family
- package/plan remains a separate commercial and entitlement axis and is not family identity
- marketing is non-canonical interest capture only; CRM is the normalized pre-provisioning recommendation and handoff layer only; platform provisioning and runtime identity are the canonical persisted family/package truth
- tenant admin remains one common core with bounded family-specific and capability-specific overlays only; no full separate admin office exists per family, and Aggregator may have only a lightweight capability-specific control surface inside the common core
- B2B contains a canonical internal textile-industry taxonomy with one primary segment, multiple secondary segments, and a separate role-positioning axis (`manufacturer`, `trader`, `service_provider`); `service_provider` is not a separate top-level B2B class and enterprise remains subordinate depth within B2B
- Aggregator may consume only the discovery-safe subset of the B2B taxonomy and does not inherit full B2B administrative or execution ownership
- schema shape, taxonomy codes and aliases, ranking/filter/search logic, onboarding-form capture design, CRM field implementation, workflow mappings, package redesign specifics, and implementation sequencing remain outside this governance statement

### 3.2 Control-Plane Files (Layer 0)

The control plane consists of exactly **five files**, all in `governance/control/`. Each file has a hard-enforced maximum size.

Layer 0 is not the origin of root opening-layer or downstream design authority, and it is not the origin of ordinary product delivery sequencing. Layer 0 owns current governed posture only. After Layer 0, ordinary product sequencing reads from `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` -> `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md` -> `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`, while live governance routing follows the opening-layer canon and the relevant preserved downstream family/design authorities by topic. The control-plane read order is `OPEN-SET.md` -> `NEXT-ACTION.md` -> `BLOCKED.md` -> `SNAPSHOT.md`. `SNAPSHOT.md` is restore-grade context only. The old `-v2` chain remains historical evidence and reconciliation input only.

| File | Max Size | Owns |
|---|---|---|
| `OPEN-SET.md` | ≤ 50 lines | Exact list of currently open governed units and current governance posture |
| `NEXT-ACTION.md` | ≤ 20 lines | Governance-facing Layer 0 pointer or explicit active governance exception |
| `BLOCKED.md` | ≤ 80 lines | All currently blocked or deferred units with explicit blocker or hold reason |
| `DOCTRINE.md` | ≤ 150 lines | Active doctrine invariants. Points to canonical doctrine sources. |
| `SNAPSHOT.md` | ≤ 100 lines | Restore-grade carry-forward context for session restoration. Refreshed at end of each governance unit. |

**Size limits are structural gates, not suggestions.** If a file exceeds its limit, a maintenance governance unit must be run to compact or archive entries before further updates are made to that file.

#### OPEN-SET.md schema (per entry)

```
| UNIT-ID | Title (≤60 chars) | Status | Wave | Last Updated |
```

Example:
```
| TECS-FBW-ADMINRBAC | Admin RBAC invite + revoke | DESIGN_GATE | W5 | 2026-03-17 |
| TECS-FBW-013       | B2B Request Quote          | DEFERRED    | W5 | 2026-03-17 |
```

#### NEXT-ACTION.md schema

```yaml
mode: OPENING_LAYER_CANON_POINTER | GOVERNANCE_EXCEPTION
governance_exception_active: true | false
product_delivery_priority: <delivery-unit-id> | NONE_OPEN
live_opening_layer_baseline: <doc path> | omit when exception-only
live_taxonomy_authority: <doc path> | omit when exception-only
live_governance_authority: <doc path> | omit when exception-only
live_sequencing_authority: <doc path> | omit when exception-only
product_truth_authority_stack: <doc path list> | include when no governance exception is active
historical_reconciliation_inputs: <doc path list> | omit when exception-only
layer_0_action: <governance-facing pointer or exception statement>
notes: <≤3 lines if needed, else omit>
```

**Rule:** ordinary bounded next-opening decisions must use the product-truth authority stack when no governance exception is active and must not require multi-document sequencing triangulation inside Layer 0.

**Rule:** when a truthful preserved unresolved hold remains and bounded contradiction and descendant-selection checks prove no hold-outranking contradiction and no exact current downstream governance descendant, `NEXT-ACTION.md` must first re-query any still-active launch-readiness acceleration attachment for one exact bounded next work item or one lawfully identified deferred bounded next-work candidate preserved in that lane. Only when that lane is explicitly exhausted, superseded by later authority, or blocked by a narrower live governance exception may `NEXT-ACTION.md` surface exactly one governance-only same-hold design-clarification successor limited to the minimum exact future hold-resolution path or evidence condition for that same hold. This bridge re-queries bounded acceleration-lane work only and does not elevate launch-readiness acceleration into blanket downstream family-opening authority.

#### BLOCKED.md schema (per entry)

```
| UNIT-ID | Blocker Type | Blocker Description (≤80 chars) | Date Registered |
```

### 3.3 Per-Unit File Model (Layer 1)

Each governed unit has a single canonical unit record at:

```
governance/units/<UNIT-ID>.md
```

The file uses a rigid YAML frontmatter section followed by a structured body.

#### Unit file schema

```yaml
---
unit_id: <UNIT-ID>              # e.g. TECS-FBW-012, G-028-C6, GOV-OS-001
title: <short title>
type: IMPLEMENTATION | VERIFICATION | GOVERNANCE | DESIGN | POLICY
status: <see allowed vocabulary>
wave: <wave number or label>
plane: TENANT | CONTROL | BOTH | GOVERNANCE
opened: YYYY-MM-DD
closed: YYYY-MM-DD | null
verified: YYYY-MM-DD | null
commit: <git SHA> | null
evidence: <short evidence ref> | null
doctrine_constraints:          # list only constraints that apply to this unit
  - <constraint-id>: <one-line>
decisions_required:            # decision IDs that gate this unit
  - <DECISION-ID> | none
blockers:                      # active blockers; empty list if none
  - id: <BLOCKER-ID>
    description: <≤80 chars>
    registered: YYYY-MM-DD
---

## Unit Summary
<2-3 sentences: what this unit does and why>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Files Allowlisted (Modify)
- <file path>

## Files Read-Only
- <file path>

## Evidence Record
<commit SHA, typecheck result, lint result, runtime verification>

## Governance Closure
<closure statement when status reaches VERIFIED_COMPLETE or CLOSED>
```

**Rules for unit files:**
- One file per unit. Never combine two units in one file.
- Status field uses only the controlled vocabulary (Section 5 below).
- Closure date must not be set before `status: VERIFIED_COMPLETE`.
- For governance/design units: `status: CLOSED` is the terminal state (no verification required).
- A unit file is read-only once it reaches a terminal status.

### 3.4 Decision Ledger Model (Layer 2)

Product, design, and security decisions are separated from unit implementation history.

| File | Owns |
|---|---|
| `governance/decisions/PRODUCT-DECISIONS.md` | Authorized product scope decisions, feature gates, deferred items |
| `governance/decisions/DESIGN-DECISIONS.md` | Architecture and schema design decisions that gate implementation |
| `governance/decisions/SECURITY-DECISIONS.md` | Security posture decisions (RLS, admin boundaries, auth policy) |

#### Decision record schema (per entry)

```
### <DECISION-ID>
Date: YYYY-MM-DD
Authorized by: <name>
Summary: <≤2 sentences>
Impact: <units gated or ungated by this decision>
Status: OPEN | DECIDED | SUPERSEDED
```

**Rules:**
- Decisions are referenced from unit files by ID.
- Decisions are never embedded in execution log entries.
- Only governance or design units may create new decision records.
- Implementation units may reference decisions; they may not modify decision records.

### 3.5 Append-Only Execution Log (Layer 3)

The execution log at `governance/log/EXECUTION-LOG.md` receives one entry per completed governed unit.

**Entry format:**

```
### <UNIT-ID> — <YYYY-MM-DD>
Type: <unit type>
Status: <final status>
Commit: <SHA or N/A>
Summary: <≤3 sentences: what was done, what was verified, what was closed>
Refs: <unit file path>
```

**Rules:**
- Entries are appended, never prepended or modified.
- The log does not determine operational state — only the unit file does.
- The log may grow without bound — it is audit history, not operational truth.
- No AI or operator workflow reads the log for next-action decisions.

### 3.6 Archive Model (Layer 4)

Legacy governance documents are migrated to `governance/archive/`. After migration:
- Files are renamed with a `ARCHIVED-` prefix
- A one-line header is prepended: `> ARCHIVED: This document was superseded by GOV-OS-001 on <date>. Read-only after this date.`
- No further entries are added
- Contents are preserved completely (no deletion)

Files to archive (proposed, not executed in this unit):
- `governance/gap-register.md` → `governance/archive/ARCHIVED-gap-register-2026-03.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` → `governance/archive/ARCHIVED-tracker-2026-03.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md` → `governance/archive/ARCHIVED-tracker-2026-Q2.md`
- `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` → `governance/archive/ARCHIVED-audit-matrix-2026-03.md`

All other `docs/governance/*.md` design documents remain in place as design references.

---

## 4. Enforcement Model

> This is the most critical section. The Governance OS only reduces drift if its constraints are structural — not advisory.

### 4.1 Canonical-Control-File Model

**Rule:** Every prompt (implementation, verification, governance, design) **must** begin by reading Layer 0 control-plane files before taking any action.

**Required read scope by prompt type:**

| Prompt Type | Required reads (before any action) |
|---|---|
| Next-unit selection | `OPEN-SET.md` + `NEXT-ACTION.md` + `BLOCKED.md`; add the live opening-layer sequencing authority and the live opening-layer authority map when the selection is product-facing |
| Implementation prompt drafting | `OPEN-SET.md` + `NEXT-ACTION.md` + target unit file (`units/<ID>.md`); add the live opening-layer sequencing authority and the relevant preserved downstream family/design authority when product-facing |
| Verification prompt drafting | `OPEN-SET.md` + target unit file |
| Governance close | Target unit file + `OPEN-SET.md` + `NEXT-ACTION.md` + `BLOCKED.md`; add the live opening-layer sequencing authority + the live opening-layer authority map when a product-facing close changes active-delivery or next-candidate posture |
| Any session restoration | `OPEN-SET.md` + `NEXT-ACTION.md`; add `SNAPSHOT.md` only when current context is missing, stale, or historically ambiguous |

**Prohibition:** Archive files, historical tracker files, and the execution log MUST NOT be used as operational truth for sequencing decisions. If a unit's status is not in Layer 0 or Layer 1, it is assumed UNKNOWN and must be resolved before acting.

**Operating-path rule:** ordinary bounded work uses the minimum read set above. Strict-path work (DB, RLS, auth/session, sequencing-authority changes, control-plane rebases, cross-family authority shifts, or production-critical entry truth) must additionally read `SNAPSHOT.md` and the specific Layer 1 / Layer 2 / Layer 3 sources needed to verify historical and authority context.

### 4.2 Rigid Schema Model

**Unit files use YAML frontmatter.** The frontmatter must be syntactically valid YAML and must include all required fields. Missing fields fail the pre-commit validation gate.

**Control-plane files have fixed-format tables.** No prose entries in `OPEN-SET.md` or `BLOCKED.md`. Prose belongs in the execution log or in unit files.

**`NEXT-ACTION.md` is not free-form.** It must be a single YAML document with exactly the fields defined in Section 3.2. Multiple authorized actions are not permitted — if more than one action is authorized simultaneously, a governance unit must be run to sequence them.

### 4.3 Controlled Vocabulary

The following is the **complete** allowed status vocabulary. No other status expression is permitted.

| Status | Terminal? | Description |
|---|---|---|
| `OPEN` | No | Authorized; queued; not yet started |
| `IN_PROGRESS` | No | Active — one prompt in current session |
| `BLOCKED` | No | Work cannot continue; explicit blocker required in `BLOCKED.md` |
| `DEFERRED` | No | Held by product/design decision; not a defect |
| `DESIGN_GATE` | No | Cannot implement until a DESIGN-DECISIONS entry is approved |
| `VERIFICATION_REQUIRED` | No | Implementation claimed complete; formal verification not yet run |
| `VERIFIED_COMPLETE` | Yes | Implementation + verification both passed with evidence |
| `CLOSED` | Yes | Governance/design/policy units only; no verification required |

**Prohibited status expressions (these MUST NOT appear in unit files or OPEN-SET.md):**

- ✅ (emoji as status)
- TECS VALIDATED
- IMPLEMENTED
- PARTIALLY IMPLEMENTED
- CONDITIONAL PASS
- COMPLETE
- WIRED
- SHIP BLOCKER OVERRIDE
- Any free-form prose status

If a status not in the allowed vocabulary is found in a unit file, the file fails validation and must be corrected before any sequencing decision is made.

### 4.4 State-Machine Enforcement

#### Legal Transitions

```
OPEN              → IN_PROGRESS          (authorized by operator/planner)
IN_PROGRESS       → VERIFICATION_REQUIRED (implementation unit: complete)
IN_PROGRESS       → BLOCKED              (blocker discovered during work)
IN_PROGRESS       → OPEN                 (session interrupted; unit not complete)
BLOCKED           → IN_PROGRESS          (blocker resolved with evidence)
BLOCKED           → DEFERRED             (blocker becomes product decision)
DESIGN_GATE       → OPEN                 (design decision approved in DESIGN-DECISIONS.md)
DEFERRED          → OPEN                 (product decision reopens unit)
VERIFICATION_REQUIRED → VERIFIED_COMPLETE (verification prompt: all evidence passed)
VERIFICATION_REQUIRED → IN_PROGRESS      (verification prompt: failure found; return to impl)
For GOVERNANCE/DESIGN units only:
IN_PROGRESS       → CLOSED               (governance unit: design complete, no verification needed)
```

#### Illegal Transitions (Explicitly Forbidden)

| Forbidden Transition | Reason |
|---|---|
| `OPEN → VERIFIED_COMPLETE` | Verification step was skipped |
| `OPEN → CLOSED` | No work was done |
| `DEFERRED → VERIFIED_COMPLETE` | Implementation was skipped |
| `DESIGN_GATE → IN_PROGRESS` | Design decision not yet approved |
| `VERIFIED_COMPLETE → any` | Terminal state — permanently closed |
| `CLOSED → any` (without a new governance reopen unit) | Terminal state unless a new governance unit is explicitly authorized |
| `IN_PROGRESS → CLOSED` (for non-governance units) | Cannot close implementation without verification |
| `BLOCKED → VERIFIED_COMPLETE` | Cannot close without resolving blocker and verifying |

Any prompt that would produce a forbidden transition must STOP and emit a Blocker Report.

### 4.5 Read-Scope Enforcement

**Rule:** Normal operations must NOT perform a full-governance-repo scan.

| Operation | Authorized read scope |
|---|---|
| Session open / context restoration | `OPEN-SET.md`, `NEXT-ACTION.md`, `BLOCKED.md`; add `SNAPSHOT.md` only when restore context or historical ambiguity matters |
| Drafting implementation prompt | Add: `units/<UNIT-ID>.md`; add the product-truth authority stack and the relevant preserved downstream family/design authority when product-facing; add the live opening-layer authority map when a governance exception or authority conflict is active |
| Drafting verification prompt | Add: `units/<UNIT-ID>.md` |
| Governance closure | `units/<UNIT-ID>.md` + Layer 0 files; add the product-truth authority stack when a product-facing close changes active-delivery or next-candidate posture; add the live opening-layer authority map when a governance exception or authority conflict is active |
| Product/design decision | Relevant decision file + the product-truth authority stack + the relevant preserved downstream family/design authority when product-facing |
| Implementation-opening readiness investigation | Layer 0 files + the product-truth authority stack + the live opening-layer authority map + the target opening authority + the minimum material dependency/support-family authorities + any relevant design-gate or reconciliation artifacts |
| Strict-path / authority-shaping work | Layer 0 files + `SNAPSHOT.md` + the minimum Layer 1 / Layer 2 / Layer 3 sources required for that authority check |
| Candidate-normalization exception | Relevant analysis artifact + `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` |
| Audit query | `EXECUTION-LOG.md` (read-only) |

**Prohibited:**
- Reading the full `gap-register.md` (or archive) for sequencing decisions
- Reading the full `IMPLEMENTATION-TRACKER-*.md` for next-unit selection
- Scanning all governance files to determine "what's open"
- Treating `NEXT-ACTION.md` as a universal delivery-order source when no governance exception is active
- Using `TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` as a competing live sequencing authority
- Using normalization ledgers as standing operating truth for ordinary bounded work

If the control-plane files do not contain enough context, a governance unit must be run to update them — not a broad scan.

### 4.5A Implementation Opening Root-Cause Dependency Readiness Rule

#### 1. Rule Purpose

This rule prevents implementation openings from being approved merely because the target family or
unit looks mature in isolation. It requires Governance OS to evaluate target-opening maturity
together with the dependency and support-family maturity that the opening materially relies on,
and to return an exact non-drift next move when readiness fails.

#### 2. Rule Statement

The formal Governance OS rule is:

- no implementation opening is lawful on target-family maturity alone
- a proposed implementation opening is lawful only if the target unit is sufficiently mature for
  the intended opening and all material dependency or support families are at the readiness level
  required for that opening
- this rule applies to family implementation openings, cross-family openings, supporting-family
  openings, control-plane openings, and any other opening where dependency or support-family
  maturity materially affects lawful execution
- not every dependency must already be fully implemented, but every dependency or support family
  must meet the readiness threshold appropriate to that opening, including thresholds such as
  `implemented`, `implementation-ready`, `opening-ready`, `normalized and bounded`, or
  `design-planned with stable interfaces/boundaries`

#### 3. Opening-Evaluation Logic

When a future implementation opening is proposed, Governance OS must:

1. identify the opening target
2. identify the material dependency families the opening relies on
3. identify the material support families the opening relies on
4. define the required readiness threshold for each target, dependency, and support family
5. determine the current readiness state for each family
6. record a pass/fail result for each family against its required threshold
7. approve the opening only if the target unit and all material dependency/support families pass

#### 4. Required Investigation / Audit Pattern

Before any implementation opening is approved, Copilot must perform a bounded dependency-readiness
investigation or audit.

That investigation must return:

1. opening target
2. dependency/support-family map
3. required readiness threshold per family
4. current readiness per family
5. pass/fail result per family

Copilot must not lawfully recommend or open a future implementation unit without first performing
this investigation.

#### 5. Root-Cause Readiness Trace Logic

If the proposed opening fails readiness, Governance OS must not stop at `not ready`, `blocked`,
or `needs more planning`.

It must:

1. identify the first failing dependency or support family
2. identify the missing chain element(s) causing that failure
3. determine whether those missing elements themselves depend on intermediate blocked or
   insufficient families
4. continue tracing until the deepest root readiness blocker is found
5. return the minimum bounded next move required to resolve that blocker without widening into
   exploratory follow-on work

#### 6. Required Governance OS Outputs

Every implementation-opening readiness investigation must return all of the following:

1. `Opening target`
2. `Dependency/support-family map`
3. `Required readiness threshold per family`
4. `Current readiness per family`
5. `Pass/fail result per family`
6. `Root-cause readiness trace`
7. `Minimum bounded next move`
8. `Why that next move is the lawful non-drift step`

If the opening passes, Governance OS may produce a valid bounded opening basis.

If the opening fails, Governance OS must return the exact pre-opening work required first rather
than a surface-level non-ready outcome.

#### 7. Anti-Drift Rationale

This rule exists to prevent:

- premature openings
- dependency-blind sequencing
- rework caused by moving targets
- false starts
- drift into broad exploratory follow-up work
- `most mature family wins` opening errors

#### 8. Adoption Consequence

Once this rule is adopted:

- future implementation openings must pass the dependency-readiness investigation before approval
- Governance OS may not approve a future implementation opening on target-family maturity alone
- a failed opening investigation must still return the minimum bounded next move needed to make a
  later opening lawful
- the default operational behavior for future opening decisions becomes dependency-aware,
  root-cause-traced, and drift-resistant

### 4.5B Post-Close Authority Reconciliation And Zero-Open Re-Entry

#### 1. Rule Purpose

This rule prevents a just-closed product-facing unit from remaining the implied current-next
authority after Layer 0 has already moved to a different posture.

#### 2. Post-Close Authority Reconciliation Rule

After any product-facing close, Governance OS must reconcile the resulting Layer 0 posture against
the live opening-layer sequencing authority and live opening-layer authority map when the close:

- removes the only active product-delivery unit
- changes the current next-candidate posture
- invalidates carry-forward wording that named or implied the closed unit as the next move

The minimum reconciliation read set is:

- `OPEN-SET.md`
- `NEXT-ACTION.md`
- `BLOCKED.md`
- the closing unit file
- `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md`
- `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`

The old `-v2` product-truth chain may be read only as historical reconciliation input. It is not
live opening-layer authority.

#### 3. Zero-Open Product-Delivery Re-Entry Rule

If the close leaves zero active product-delivery units, Governance OS must return to explicit
next-opening decision control.

No successor may be inferred from:

- the just-closed unit
- broader family adjacency alone
- prior carry-forward wording
- historical tracker posture

#### 4. Closed-Unit Carry-Forward Prohibition

A closed unit preserves lineage and closure evidence only. It does not remain a current-next
candidate or proxy for broader family completion unless a new authority artifact explicitly selects
a new bounded successor.

#### 5. Compact Transition Chain

For the product-facing close case, the normal chain is:

1. close the bounded unit
2. update Layer 0 posture
3. run post-close reconciliation when the rule is triggered
4. if zero active product-delivery units remain, return to explicit next-opening decision control
5. open nothing further until a new lawful bounded decision is recorded

### 4.5C Structural-Breadth Family-Reduction Rule

#### 1. Rule Purpose

This rule prevents Governance OS from misreading a coherent but still-broad chosen family remainder
as either a repo-conflict blocker or permission to widen into whole-family completion work.

#### 2. Trigger Condition

After one preserved family remainder has already been chosen for reduction, Governance OS enters a
structural-breadth condition when:

- current repo truth remains coherent
- the chosen family still contains multiple unreduced subareas
- no one exact bounded child unit yet emerges from that family

This is not a stale-authority or repo-conflict blocker by itself.

#### 3. Required Response

When this condition is present, Governance OS must route to exactly one of the following inside the
same chosen family only:

- one further bounded child-reduction decision
- one narrowly scoped design-clarification step

The sole purpose of that next step is to establish:

- exact child-unit hierarchy
- exact candidate boundary
- whether one exact bounded child can now be named

#### 4. Explicit Anti-Drift Prohibitions

This condition must not be used to justify:

- whole-family design completion
- cross-family documentation completion
- roadmap or planning-stack expansion
- lawful opening
- implementation start

#### 5. Structural-Breadth Vs Repo-Conflict Distinction

- Structural breadth: repo truth is coherent, but the chosen family still does not reduce to one
  exact bounded child. Resolve by same-family bounded reduction or narrow design clarification.
- Repo-conflict blocker: current authority surfaces materially disagree or cannot support one
  coherent reading. Resolve by authority reconciliation or repo-truth correction before further
  reduction.

#### 6. Decision-Control Compatibility

This rule preserves zero-open decision control, exact-target discipline, one logical unit at a
time, and closed-seam lineage-only treatment. Closed seams may inform the reduction map, but they
do not become successor authority by implication.

### 4.5D Residual-Lane Same-Family Decomposition Rule

#### 1. Rule Purpose

This rule prevents Governance OS from widening a coherent but still lane-mixed narrowed same-family
remainder into broad family completion work or from overreading conditional lineage notes as if
they were already current live authority.

#### 2. Trigger Condition

After one preserved family remainder has already been chosen and narrowed at least once,
Governance OS enters a residual-lane decomposition condition when:

- current repo truth remains coherent
- the narrowed same-family remainder still contains a small number of explicit residual lanes
- no one exact bounded child unit yet emerges from that narrowed remainder

This is not a repo-conflict blocker and does not re-widen the task back to whole-family reduction.

#### 3. Required Response

When this condition is present, Governance OS must route to one bounded lane-separation
design-clarification step inside that same narrowed remainder only.

The sole purpose of that step is to:

- separate the residual lanes cleanly
- test whether one lane qualifies as an exact bounded child
- determine whether one lane can be elevated into candidate form

#### 4. Explicit Anti-Drift Prohibitions

This condition must not be used to justify:

- whole-family design completion
- cross-family documentation completion
- roadmap or planning-stack expansion
- lawful opening
- implementation start
- treating conditional lineage notes as if they were already current live authority

#### 5. Residual-Lane Decomposition Vs Structural-Breadth Vs Repo-Conflict

- Structural breadth: the chosen family remainder is still too broad to yield one exact bounded
  child. Resolve by same-family bounded child reduction or narrow same-family design clarification.
- Residual-lane decomposition: a chosen family remainder has already been narrowed, repo truth is
  coherent, but the narrowed remainder still contains a small number of explicit residual lanes.
  Resolve by one same-remainder lane-separation clarification step.
- Repo-conflict blocker: current authority surfaces materially disagree or cannot support one
  coherent reading. Resolve by authority reconciliation or repo-truth correction before further
  reduction.

#### 6. Decision-Control Compatibility

This rule preserves zero-open decision control, exact-target discipline, one logical unit at a
time, closed-seam lineage-only treatment, and D-018 structural-breadth routing. Conditional
lineage notes may help identify possible lanes, but they cannot by themselves elevate a lane into a
current candidate.

### 4.5E Successor-Chain Preservation And Non-Opening Carry-Forward Authority

#### 1. Rule Purpose

This rule allows Governance OS to preserve one lawful near-term carry-forward starting point after
a determination, reduction, or close without creating implicit opening authority.

#### 2. What A Successor-Chain Artifact Is

A successor-chain artifact is one bounded governance artifact that preserves:

- the current family remainder or narrowed same-family remainder
- the next likely `1` to `3` exact slices only
- the truths that remain stable enough to reuse
- the truths that must be rechecked
- the conditions that invalidate the carry-forward

It is non-opening carry-forward authority only.

#### 3. What It Must Never Be Read As

A successor-chain artifact must not be read as:

- an opening decision
- a current-next opening authorization
- a substitute for Layer 0
- a substitute for live sequencing authority
- a bypass of dependency-readiness investigation
- a bypass of repo-truth validation at opening time

#### 4. Mandatory Contents

A valid artifact must contain all of the following:

- preservation date
- preservation basis and exact authority set used
- current family remainder or narrowed same-family remainder
- next likely `1` to `3` exact slices only
- stable truths relied on
- transitional truths relied on
- volatile truths that must be rechecked
- explicit adjacent findings excluded from the next slice
- dependency or support-family readiness assumptions
- invalidation triggers
- explicit statement: `NO_OPENING_AUTHORITY`

Anything beyond the next `1` to `3` exact slices is advisory only and is not valid carry-forward
authority.

#### 5. Allowed Creation Points

The artifact may be created or updated only after:

- lawful next-unit determination
- lawful same-family bounded reduction
- lawful residual-lane decomposition
- product-facing close that leaves one coherent preserved next-path

#### 6. Zero-Open Compatibility

If zero-open posture follows a close, Layer 0 still returns to explicit decision control.

The preserved artifact changes only what that decision control may begin from.

It does not create any opening by implication.

### 4.5F Revalidate-Not-Rediscover Rule

#### 1. Rule Purpose

This rule allows Governance OS to avoid repeating broad family rediscovery when one valid
non-opening successor-chain artifact already exists and current truth has not invalidated it.

#### 2. Allowed Trigger Condition

Governance OS may begin from narrow successor revalidation only when:

- a valid successor-chain artifact exists
- the artifact is complete
- current Layer 0 posture is compatible
- no invalidation trigger has fired
- no contradiction exists between current repo truth and the preserved chain
- the proposed next slice remains inside the same preserved family or narrowed same-family
  remainder

#### 3. Minimum Revalidation Read Set

The minimum revalidation read set is:

- `OPEN-SET.md`
- `NEXT-ACTION.md`
- `BLOCKED.md`
- the preserved successor-chain artifact
- the live opening-layer sequencing authority
- the live opening-layer authority map
- the relevant preserved downstream family/design authorities
- each volatile truth named in the artifact
- each dependency-readiness surface named in the artifact

#### 4. Pass Result

If revalidation passes, Governance OS may treat the preserved next likely exact slice as the
bounded starting candidate for ordinary next-opening investigation only.

No opening is authorized by the pass itself.

#### 5. Fail Result

If revalidation fails, Governance OS must:

- record the failure reason
- record whether the failure is volatility-only or structure-changing
- return to the smallest lawful broader rediscovery level required by the failure

#### 6. Explicit Anti-Drift Prohibitions

This rule must not be used to justify:

- skipping repo-truth validation
- skipping dependency-readiness investigation
- skipping adjacent-finding separation
- skipping verification-before-close
- broad family opening by carry-forward convenience
- treating a preserved chain as live opening authority

### 4.5G Truth Volatility Tiers And Invalidation Triggers

#### 1. Stable Truth

Stable truth is truth expected to survive across multiple cycles unless materially superseded.

Examples:

- family placement normalization
- family-design anchors
- preserved repo-truth evidence records
- stable family or subfamily exclusions and boundary definitions

#### 2. Transitional Truth

Transitional truth is reusable but not self-authorizing.

Examples:

- family remainder notes
- same-family reduction outputs
- residual-lane outputs
- successor-chain artifacts
- shortlist or critical-path visibility artifacts

Transitional truth must be revalidated before reuse.

#### 3. Volatile Truth

Volatile truth must always be freshly rechecked.

Examples:

- Layer 0 posture
- active blockers
- current runtime verification state
- adjacent findings
- support-family readiness
- current design-gates
- any new close or opening that changes sequencing posture

#### 4. Invalidation Triggers

A preserved successor-chain artifact becomes invalid if:

- planning authority changed materially
- family placement or family-design authority changed materially
- support-family readiness failed
- an adjacent finding now intersects the proposed next slice
- runtime proof invalidates a chain assumption
- the same-family remainder changed materially
- the artifact is stale or incomplete
- Layer 0 posture contradicts the preserved chain assumption
- the live opening-layer sequencing authority or the relevant preserved downstream family/design authority supersedes the preserved chain
- blocker or design-gate posture materially changes the proposed next slice

#### 5. Required Result When Triggered

If any invalidation trigger fires, Governance OS must stop narrow revalidation and return to the
smallest lawful broader rediscovery level required by the trigger.

#### 6. Decision-Control Compatibility

This rule preserves zero-open decision control, exact bounded openings, same-family bounded
reduction, and closed-unit non-authority.

It changes only the lawful starting scope for decision control after current truth is checked.

### 4.6 Edit-Scope Enforcement

| Prompt Type | May Edit | May NOT Edit |
|---|---|---|
| Implementation unit | Allowlisted app/server files + own unit file (status update) | Other unit files, OPEN-SET.md, NEXT-ACTION.md, BLOCKED.md, decision files, execution log |
| Verification unit | Own unit file (status update) | Any app/server file; any other governance file |
| Governance unit | Layer 0 files, unit files, decision files, execution log | App/server/schema/migration/test/CI files |
| Design unit | Layer 0 files, unit files, decision files | Same as governance unit |

**Key rule:** `OPEN-SET.md` and `NEXT-ACTION.md` may only be edited by governance/design units or by the governance-closure step at the end of any unit. Implementation units must not touch control-plane files as part of their main work.

**Commit-discipline implication:** Every commit is tagged by unit type. A commit tagged `implementation` that touches `OPEN-SET.md` is a violation.

### 4.7 Validation Gates

These gates should be checked before every commit. They are designed to be automatable.

| Gate ID | Check | Failure Action |
|---|---|---|
| GATE-001 | Unit file has valid YAML frontmatter with all required fields | Block commit; report missing fields |
| GATE-002 | `status` field is in the allowed vocabulary | Block commit; report forbidden value |
| GATE-003 | State transition from previous status is legal | Block commit; report illegal transition |
| GATE-004 | `OPEN-SET.md` size ≤ 50 lines | Block commit; require compaction governance unit |
| GATE-005 | `NEXT-ACTION.md` size ≤ 20 lines and is valid YAML | Block commit; report malformed file |
| GATE-006 | Implementation commit does not touch Layer 0 files | Block commit; report violation |
| GATE-007 | Implementation commit does not touch Layer 2 decision files | Block commit; report violation |
| GATE-008 | Verification commit does not touch app/server/schema/test files | Block commit; report violation |
| GATE-009 | `VERIFIED_COMPLETE` status has non-null `commit` and `verified` fields | Block commit; report missing evidence |
| GATE-010 | `CLOSED` status has non-null `closed` field | Block commit; report missing date |
| GATE-011 | Archive files have `ARCHIVED-` prefix header | Alert; do not block (additive check) |

**CI enforcement recommendation:** A lightweight script at `scripts/validate-governance.ts` should run on every commit. It should check GATE-001 through GATE-010. This script itself must be in the governance allowlist and may only be modified by governance units.

**Pre-commit hook recommendation:** Git pre-commit hook runs `validate-governance.ts`. Bypassing with `--no-verify` is a governance violation and must be recorded in the execution log with rationale.

### 4.8 Human/AI Parity

**The same rules apply to all three actors:**

| Rule | Paresh (human) | GPT (TexQtic CTO) | Copilot (executor) |
|---|---|---|---|
| Must read Layer 0 before acting | Yes | Yes | Yes |
| Must use controlled status vocabulary | Yes | Yes | Yes |
| Must not skip state-machine transitions | Yes | Yes | Yes |
| Must not touch forbidden files | Yes | Yes | Yes |
| Must emit blocker report on illegal action | Yes | Yes | Yes |
| Must not commit without evidence | Yes | Yes | Yes |

**No informal shortcuts.** "I know the system well enough to skip reading OPEN-SET.md" is not a valid justification for any actor. The control plane is small enough that reading it is always faster than reconstructing context from memory.

**GPT-specific constraint:** The GPT CTO planner must not propose "the next unit" from memory or from a partial scan of large historical files. The next unit must be derived from `NEXT-ACTION.md` and `OPEN-SET.md` only.

**Copilot-specific constraint:** Copilot must not improvise governance updates during implementation units. If a governance update is needed during an implementation unit, it must be flagged and deferred to a governance unit — not performed inline.

### 4.9 Carry-Forward Protection

`governance/control/SNAPSHOT.md` is a restore-grade surface, not a mandatory narrative sink for every ordinary bounded close.

Refresh `SNAPSHOT.md` when:
- a strict-path or authority-shaping unit closes
- restore context would otherwise be lost between sessions
- Layer 0 ownership, queue posture, or sequencing authority materially changes

Normal bounded units may complete with compact closure writeback alone when restore-grade context does not materially change.

Representative structure:

```yaml
snapshot_date: YYYY-MM-DD
snapshot_unit: <UNIT-ID>
governance_model_version: <version>
reset_ratification: <decision path>
present_posture_owner: governance/control/
live_opening_layer_baseline: <doc path>
live_taxonomy_authority: <doc path>
live_governance_authority: <doc path>
live_sequencing_authority: <doc path>
historical_reconciliation_inputs:
  - <doc path>
current_open_counts:
  open: <n>
  decision_queue: <n>
  design_gate: <n>
normal_path_reset_active: true | false
session_restore_notes: <≤3 short lines>
```

**Rule:** ordinary bounded work is authorized when Layer 0 current-state files are sufficient. If restore or strict-path work depends on context not captured in current Layer 0 state, refresh `SNAPSHOT.md` first.

### 4.10 Operational Fallback Rules

These rules apply when documents are missing, oversized, or inconsistent.

| Condition | Required Action |
|---|---|
| `OPEN-SET.md` is missing | STOP. Run a governance maintenance unit to reconstruct it before any other work |
| `NEXT-ACTION.md` is missing | STOP. Do not infer the next action from historical files. Run a governance sequencing unit |
| `SNAPSHOT.md` is missing or stale | If current Layer 0 files are sufficient for ordinary bounded work, continue. If restore or strict-path work needs it, run a governance snapshot refresh first |
| A unit file does not exist for a known unit | Create the unit file as a governance unit before allowing implementation |
| `OPEN-SET.md` exceeds 50 lines | Run a compaction governance unit; move completed entries to EXECUTION-LOG.md |
| Two files disagree on a unit's status | Layer 1 unit file is authoritative; Layer 0 is updated to match it in a governance unit |
| A file is partially migrated | Treat the old file as archive-only; do not read it for operational truth |
| Control-plane schema is violated | Block all sequencing until a governance unit corrects the schema |

---

## 5. Canonical File Map

```
governance/
├── control/                         ← LAYER 0 — Control Plane (≤5 small files)
│   ├── OPEN-SET.md                  ← Exact current governed posture + read-order entry (≤50 lines)
│   ├── NEXT-ACTION.md               ← Governance-facing Layer 0 pointer or exception (≤20 lines)
│   ├── BLOCKED.md                   ← Blocked + hold register (≤80 lines)
│   ├── DOCTRINE.md                  ← Active doctrine invariants (≤150 lines)
│   └── SNAPSHOT.md                  ← Carry-forward context (≤100 lines)
│
├── units/                           ← LAYER 1 — Per-unit canonical records
│   ├── TECS-FBW-ADMINRBAC.md
│   ├── TECS-FBW-013.md
│   ├── G-028-C6.md
│   ├── GOV-OS-001.md
│   └── <UNIT-ID>.md for each unit
│
├── decisions/                       ← LAYER 2 — Decision Ledger
│   ├── PRODUCT-DECISIONS.md         ← Product scope + feature gates
│   ├── DESIGN-DECISIONS.md          ← Architecture + schema design decisions
│   └── SECURITY-DECISIONS.md        ← Security posture decisions
│
├── log/                             ← LAYER 3 — Append-only execution log
│   └── EXECUTION-LOG.md             ← Chronological history (append only)
│
└── archive/                         ← LAYER 4 — Frozen legacy documents
    ├── ARCHIVED-gap-register-2026-03.md
    ├── ARCHIVED-tracker-2026-03.md
    ├── ARCHIVED-tracker-2026-Q2.md
    └── ARCHIVED-audit-matrix-2026-03.md

docs/governance/                     ← Design reference documents (preserved, not archived)
├── control/
│   └── GOV-OS-001-DESIGN.md         ← This document
├── G-017_DAY1_DESIGN.md             ← Design references (read-only operational refs)
├── G-020_STATE_MACHINE_DESIGN.md
└── ...

shared/contracts/                    ← Governed API contracts (separate domain, not governance OS)
```

**Authoritative read sources by question:**

| Question | Answer lives in |
|---|---|
| "What is open right now?" | `governance/control/OPEN-SET.md` |
| "What should I do next?" | `governance/control/NEXT-ACTION.md` |
| "What is blocked?" | `governance/control/BLOCKED.md` |
| "What is the status of unit X?" | `governance/units/X.md` (frontmatter `status` field) |
| "What product decisions have been made?" | `governance/decisions/PRODUCT-DECISIONS.md` |
| "What design decisions gate unit X?" | `governance/units/X.md` → `decisions_required` → `governance/decisions/DESIGN-DECISIONS.md` |
| "What happened historically?" | `governance/log/EXECUTION-LOG.md` |
| "What was the state of governance before the Governance OS?" | `governance/archive/ARCHIVED-*.md` |

---

## 6. Allowed Status Vocabulary

This is the **complete and exhaustive** list of allowed status values for any governed unit. All values are lowercase with underscores. No other value is permitted.

| Status | Applies To | Terminal? | Requires Evidence? |
|---|---|---|---|
| `OPEN` | All unit types | No | No |
| `IN_PROGRESS` | All unit types | No | No |
| `BLOCKED` | All unit types | No | Blocker entry in `BLOCKED.md` |
| `DEFERRED` | All unit types | No | Decision entry in decision ledger |
| `DESIGN_GATE` | Implementation units | No | Entry in `DESIGN-DECISIONS.md` |
| `VERIFICATION_REQUIRED` | Implementation units | No | No (verification not yet run) |
| `VERIFIED_COMPLETE` | Implementation units | Yes | commit SHA + verification date |
| `CLOSED` | Governance/Design/Policy units | Yes | closed date |

### Mapping from legacy status expressions

During migration, legacy status expressions must be mapped to canonical values as follows:

| Legacy Expression | Canonical Status |
|---|---|
| ✅ CLOSED | `VERIFIED_COMPLETE` (if evidence exists) or `CLOSED` (if governance unit) |
| TECS VALIDATED | `VERIFIED_COMPLETE` |
| IMPLEMENTED | `VERIFICATION_REQUIRED` (if no verification recorded) or `VERIFIED_COMPLETE` |
| PARTIALLY IMPLEMENTED | Split into sub-units; closed sub-units get `VERIFIED_COMPLETE`, open get `OPEN` |
| CONDITIONAL PASS | `VERIFIED_COMPLETE` (if remediation recorded) or `VERIFICATION_REQUIRED` |
| REQUIRES_BACKEND_DESIGN | `DESIGN_GATE` |
| 🔵 FUTURE SCOPE | `DEFERRED` |
| 🚫 BLOCKED | `BLOCKED` |
| DEFERRED | `DEFERRED` |

---

## 7. Legal State Transitions

### State Diagram

```
                    ┌───────────────────────────────────────────────────────┐
                    │                  FINITE STATE MACHINE                 │
                    └───────────────────────────────────────────────────────┘

  ╔══════════╗   authorize    ╔═════════════╗   impl complete   ╔═══════════════════════╗
  ║  OPEN    ║ ─────────────► ║ IN_PROGRESS ║ ───────────────► ║ VERIFICATION_REQUIRED ║
  ╚══════════╝                ╚═════════════╝                   ╚═══════════════════════╝
       ▲                           │  │  │                               │        │
       │                           │  │  │ blocker discovered            │ pass   │ fail
       │ reopen          interrupt │  │  └──────────────────────────────►├──────────────►
       │                 (→ OPEN)  │  │                                  │        │
  ╔══════════════╗                 │  └──────────────► ╔═══════════╗     │        │
  ║  DEFERRED    ║ ◄───────────────┘ defer blocker     ║  BLOCKED  ║ ◄───┘        │
  ╚══════════════╝ ◄────────────────────────────────── ╚═══════════╝              │
       │                                                    │                      │
       │ product decision                                   │ resolved              │
       └─── reopens ──► OPEN                               └──► IN_PROGRESS        │
                                                                                   │
  ╔═══════════════╗ design                                                         │
  ║ DESIGN_GATE   ║ decision ──────────────────────────────────────────────────────►
  ╚═══════════════╝ approved

  Terminal states (no exit):
  ╔════════════════════╗    ╔════════╗
  ║ VERIFIED_COMPLETE  ║    ║ CLOSED ║ (governance/design units only)
  ╚════════════════════╝    ╚════════╝
```

### Transition Table

| From | To | Allowed | Trigger |
|---|---|---|---|
| OPEN | IN_PROGRESS | ✅ | Authorized by operator/planner; unit file updated |
| IN_PROGRESS | VERIFICATION_REQUIRED | ✅ | Implementation complete; commit recorded |
| IN_PROGRESS | BLOCKED | ✅ | Blocker discovered; entry added to BLOCKED.md |
| IN_PROGRESS | OPEN | ✅ | Session interrupted before completion |
| BLOCKED | IN_PROGRESS | ✅ | Blocker resolved with evidence |
| BLOCKED | DEFERRED | ✅ | Governance promotes blocker to product decision |
| DESIGN_GATE | OPEN | ✅ | Design decision approved in DESIGN-DECISIONS.md |
| DEFERRED | OPEN | ✅ | Product decision reopens unit |
| VERIFICATION_REQUIRED | VERIFIED_COMPLETE | ✅ | Verification prompt: all evidence passed |
| VERIFICATION_REQUIRED | IN_PROGRESS | ✅ | Verification prompt: failure; return to implementation |
| IN_PROGRESS | CLOSED | ✅ | Governance/design/policy units only |
| OPEN → | VERIFIED_COMPLETE | ❌ | Skips implementation and verification |
| OPEN → | CLOSED | ❌ | No work performed |
| DEFERRED → | VERIFIED_COMPLETE | ❌ | Skips implementation |
| DESIGN_GATE → | IN_PROGRESS | ❌ | Design decision not approved |
| VERIFIED_COMPLETE → | any | ❌ | Terminal state |
| CLOSED → | any | ❌ | Terminal state (requires new governance reopen unit) |
| IN_PROGRESS → | CLOSED | ❌ | For non-governance units |
| BLOCKED → | VERIFIED_COMPLETE | ❌ | Cannot close without resolving blocker |
| BLOCKED → | CLOSED | ❌ | Cannot close without resolving blocker |

---

## 8. Migration Strategy

Migration is **not executed in this unit**. The following phased plan defines how migration should proceed in future governance units.

### Phase 0 — Governance OS Adoption (GOV-OS-001, this unit)
- Design document created ✅
- Layer model defined ✅
- Schemas defined ✅
- State machine defined ✅
- Enforcement model defined ✅
- No files archived in this unit ✅

### Phase 1 — Control Plane Bootstrap (1 governance unit)
**Scope:**
1. Create `governance/control/` directory
2. Create `governance/control/OPEN-SET.md` — populate with currently open units derived from Layer 1 migration (see Phase 2)
3. Create `governance/control/NEXT-ACTION.md` — fill from current sequencing state
4. Create `governance/control/BLOCKED.md` — fill from current known blockers
5. Create `governance/control/DOCTRINE.md` — extract active invariants from `AGENTS.md` and `copilot-instructions.md`
6. Create `governance/control/SNAPSHOT.md` — fill from current session context

**Prerequisite:** Phase 2 must be done first (or in parallel) so OPEN-SET.md can be populated from canonical unit records.

### Phase 2 — Unit Record Migration (1 governance unit per wave or batch)
**Scope:**
For each currently open or recently closed unit, create `governance/units/<UNIT-ID>.md` using the rigid schema defined in Section 3.3.

**Priority order:**
1. Currently OPEN units (needed for OPEN-SET.md)
2. Currently BLOCKED or DEFERRED units (needed for BLOCKED.md)
3. Recently closed units (last 30 days) for completeness
4. Historical closed units (can be deferred or batch-created)

**Data sources:**
- Current status: read from gap-register.md or tracker (one-time migration read only)
- Evidence: commit SHAs recorded in gap-register entries
- Constraints: preserved from existing documentation

**Rule:** After a unit record is created in `governance/units/`, the corresponding entry in the legacy files is considered archived — it is not the operational truth any further.

### Phase 3 — Decision Ledger Population (1 governance unit)
**Scope:**
1. Create `governance/decisions/PRODUCT-DECISIONS.md` — extract from gap-register entries tagged as product decisions
2. Create `governance/decisions/DESIGN-DECISIONS.md` — extract from design decision records
3. Create `governance/decisions/SECURITY-DECISIONS.md` — extract from RLS posture and security decisions

### Phase 4 — Execution Log Population (1 governance unit)
**Scope:**
1. Create `governance/log/EXECUTION-LOG.md`
2. Populate with summary entries for all completed units (in chronological order)
3. Each entry is a compressed summary — not a full copy of the gap-register prose

### Phase 5 — Legacy Archive (1 governance unit)
**Scope:**
1. Move `governance/gap-register.md` → `governance/archive/ARCHIVED-gap-register-2026-03.md`; add archive header
2. Move `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` → `governance/archive/ARCHIVED-tracker-2026-03.md`; add archive header
3. Move `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md` → `governance/archive/ARCHIVED-tracker-2026-Q2.md`; add archive header
4. Move `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` → `governance/archive/ARCHIVED-audit-matrix-2026-03.md`; add archive header
5. Update all internal cross-references in remaining docs to point to archive paths

### Phase 6 — Validation Script (1 governance unit)
**Scope:**
Create `scripts/validate-governance.ts` — implements GATE-001 through GATE-010.

**Authorized files for this phase only:**
- `scripts/validate-governance.ts` (NEW)

**Note:** This is the only governance unit type that may create a script file.

### Phase 7 — Steady-State Operation
After Phase 6 is complete:
- All new units use the unit file schema
- OPEN-SET.md, NEXT-ACTION.md, BLOCKED.md are the sole operational truth sources
- Legacy files are archive-only
- Validation script runs on every commit
- SNAPSHOT.md is refreshed at the end of every governance unit

**Migration safety constraints:**
- Phases must execute in order 1 → 7
- Each phase is a separate governance unit with an atomic commit
- No phase may modify application code, schema, or tests
- Historical records must not be deleted — only archived/moved
- If a conflict is found between legacy sources during migration, the more recent entry wins; both are preserved in archive

---

## 9. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Migration phases not completed | High — multi-unit work | Control plane partially implemented, increasing drift | Design declares partial adoption illegal; OPEN-SET.md cannot be the sole truth until all open units have unit files |
| Large unit file accumulation in `units/` | Medium | Layer 1 directory becomes unwieldy | Terminal-status unit files may be moved to `units/archive/` after 90 days |
| `NEXT-ACTION.md` not updated between units | High — easy to forget | Next session starts without authorized context | `SNAPSHOT.md` update is mandatory at end of every governance unit; NEXT-ACTION.md is refreshed at same time |
| Legacy file still used as operational truth | High — habit | Drift resumes with old patterns | Enforcement: validation gate GATE-006 blocks commits that modify archived files |
| Free-form prose creeps into OPEN-SET.md | Medium | Status becomes unreadable | GATE-004 (size limit) and GATE-002 (vocabulary) block non-conforming entries |
| AI uses archive for next-unit selection | High without structural enforcement | Stale units "reopened" from archive | The explicit prohibition in Section 4.1 and the read-scope enforcement table in Section 4.5 address this directly |
| Validation script not implemented | Medium | Gates are advisory only | Phase 6 is explicitly scoped as a governance unit; blocking dependency for steady-state |
| Unit files created without YAML frontmatter | Medium before Phase 6 | Schema drift | Template should be provided as part of Phase 1 bootstrap |

---

## 10. Validation

### Validation Gate Results for GOV-OS-001 (DESIGN UNIT)

| Gate | Condition | Result |
|---|---|---|
| 1 | Only governance files were touched | ✅ PASS — only `docs/governance/control/GOV-OS-001-DESIGN.md` created |
| 2 | No implementation files were touched | ✅ PASS |
| 3 | No verification activity was performed | ✅ PASS |
| 4 | No product unit status was changed improperly | ✅ PASS |
| 5 | Design preserves existing TECS doctrine | ✅ PASS — all 10 doctrine invariants explicitly preserved in Section 2.3 |
| 6 | Design defines a small operational control plane | ✅ PASS — 5 files, each ≤150 lines (Section 3.2) |
| 7 | Design defines one canonical unit record per governed unit | ✅ PASS — `governance/units/<UNIT-ID>.md` (Section 3.3) |
| 8 | Design defines finite allowed statuses | ✅ PASS — exactly 8 statuses, no others permitted (Section 5, 6) |
| 9 | Design defines legal state transitions | ✅ PASS — state machine with legal and illegal transitions (Section 7) |
| 10 | Design defines anti-drift enforcement for human + GPT + Copilot | ✅ PASS — Section 4 Enforcement Model with 10 sub-sections, parity rules in 4.8 |
| 11 | Design preserves history instead of deleting it | ✅ PASS — archive model in 3.6; migration preserves all content |
| 12 | Design does not silently authorize migration or implementation beyond this unit | ✅ PASS — Section 8 declares migration phased; Phase 0 is this unit only |

All 12 validation gates: **PASS**

### Acceptance Criteria Verification

| Criterion | Met? |
|---|---|
| A clear Governance OS architecture is documented | ✅ |
| Canonical control-plane files are defined | ✅ |
| Canonical per-unit records are defined | ✅ |
| Status vocabulary is fixed | ✅ |
| State transitions are fixed | ✅ |
| Enforcement model is explicit | ✅ |
| Drift-reduction strategy is concrete | ✅ |
| Migration path is phased and safe | ✅ |
| History preservation is explicit | ✅ |
| Human + AI + Copilot parity rules are documented | ✅ |
| No forbidden files were edited | ✅ |
| Work remains design-only and atomic | ✅ |

All acceptance criteria: **MET**

---

## 11. Recommended Next Step

**GOV-OS-001 is design-only and is now CLOSED.**

The next authorized step is a **governance sequencing decision** by the TexQtic CTO workflow:

1. Review this design and confirm adoption (or modify before adoption)
2. Authorize Phase 1 implementation as the next governance unit: `GOV-OS-002 — Control Plane Bootstrap`
3. Authorize Phase 2 implementation as following governance units: `GOV-OS-003 — Unit Record Migration (Batch 1: Open units)`

**Do not begin any new implementation or product work before Phase 1 is complete**, as the control plane (OPEN-SET.md, NEXT-ACTION.md, BLOCKED.md) will not yet reflect the GOV-OS-001 design.

If product implementation must continue before Phase 1:
- Continue using `governance/gap-register.md` and `IMPLEMENTATION-TRACKER-2026-03.md` as the current operational truth
- Do not create unit files in `governance/units/` until Phase 1 is authorized
- Do not reference `OPEN-SET.md` for sequencing until it is created

**The design is available. Adoption is a separate sequencing decision.**

---

*GOV-OS-001 — CLOSED — 2026-03-17*  
*No application code modified. No product unit status changed. Design-only.*
