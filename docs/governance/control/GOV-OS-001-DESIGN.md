# GOV-OS-001 — Governance OS Control-Plane Partition Design

**Unit ID:** GOV-OS-001  
**Unit Type:** DOCTRINE / DESIGN / GOVERNANCE ARCHITECTURE  
**Status:** CLOSED  
**Date:** 2026-03-17  
**Authored by:** TexQtic Governance Design Session  
**Doctrine Version:** v1.4 (preserved; this design extends, does not replace)  

---

## 1. Result

GOV-OS-001 is CLOSED as DESIGN-ONLY.

A Governance Operating Model for TexQtic has been designed that:
- Partitions governance into four structurally separated layers
- Defines a small operational control plane (≤5 small files)
- Defines one canonical unit record per governed unit
- Defines a finite controlled status vocabulary (7 statuses)
- Defines legal state transitions and explicitly forbidden transitions
- Defines an Enforcement Model that applies equally to human operator (Paresh), GPT planner (TexQtic CTO), and VS Code Copilot executor
- Defines a phased migration path that preserves all history
- Does not execute migration in this unit

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
- Layer 0 determines governance control-plane truth; product-truth documents determine general
  product execution sequencing
- Layer 1 is the single source of truth for individual unit status
- Layer 2 decisions are referenced by Layer 1 unit records — never duplicated
- Layer 3 receives entries; never loses them; never becomes operational
- Layer 4 is read-only after migration; no new entries

### 3.2 Control-Plane Files (Layer 0)

The control plane consists of exactly **five files**, all in `governance/control/`. Each file has a hard-enforced maximum size.

Layer 0 is not the origin of general product delivery order. Product-truth documents hold that
role. Layer 0 carries governed-unit state, governance exceptions, and audit/control posture.

| File | Max Size | Owns |
|---|---|---|
| `OPEN-SET.md` | ≤ 50 lines | Exact list of currently open governed units and current governance posture |
| `NEXT-ACTION.md` | ≤ 20 lines | Derived Layer 0 next-action pointer or explicit active governance exception |
| `BLOCKED.md` | ≤ 80 lines | All currently blocked or deferred units with explicit blocker reason |
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
mode: DERIVED_PRODUCT_TRUTH_POINTER | GOVERNANCE_EXCEPTION
governance_exception_active: true | false
product_delivery_priority: <delivery-unit-id> | none
product_truth_sources: <comma-separated doc paths> | omit when exception-only
layer_0_action: <governance-facing pointer or exception statement>
notes: <≤3 lines if needed, else omit>
```

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
| Next-unit selection | `OPEN-SET.md` + `NEXT-ACTION.md` + `BLOCKED.md` |
| Implementation prompt drafting | `OPEN-SET.md` + `NEXT-ACTION.md` + target unit file (`units/<ID>.md`) |
| Verification prompt drafting | `OPEN-SET.md` + target unit file |
| Governance close | Target unit file + `OPEN-SET.md` + `NEXT-ACTION.md` |
| Any session restoration | `SNAPSHOT.md` + `OPEN-SET.md` + `NEXT-ACTION.md` |

**Prohibition:** Archive files, historical tracker files, and the execution log MUST NOT be used as operational truth for sequencing decisions. If a unit's status is not in Layer 0 or Layer 1, it is assumed UNKNOWN and must be resolved before acting.

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
| Session open / context restoration | `SNAPSHOT.md`, `OPEN-SET.md`, `NEXT-ACTION.md` |
| Drafting implementation prompt | Add: `units/<UNIT-ID>.md` |
| Drafting verification prompt | Add: `units/<UNIT-ID>.md` |
| Governance closure | `units/<UNIT-ID>.md` + Layer 0 files |
| Product/design decision | `DESIGN-DECISIONS.md` or `PRODUCT-DECISIONS.md` |
| Audit query | `EXECUTION-LOG.md` (read-only) |

**Prohibited:**
- Reading the full `gap-register.md` (or archive) for sequencing decisions
- Reading the full `IMPLEMENTATION-TRACKER-*.md` for next-unit selection
- Scanning all governance files to determine "what's open"

If the control-plane files do not contain enough context, a governance unit must be run to update them — not a broad scan.

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

At the end of every governance unit, `governance/control/SNAPSHOT.md` is updated with the following structure:

```yaml
---
snapshot_date: YYYY-MM-DD
last_unit_closed: <UNIT-ID>
last_commit: <SHA>
---

## Current Open Set Summary
<3-5 bullet points: unit ID + status + one-line description>
## Current Next Action
<unit_id>, <type>, <one-line title>
## Active Blockers
<unit ID + blocker type — or "None">
## Active Design Gates
<unit ID + decision needed — or "None">
## Session Notes
<≤3 lines of context that would be lost between sessions>
```

**Rule:** Any session that begins work without reading `SNAPSHOT.md` is operating without authorized context. If `SNAPSHOT.md` is missing or more than 30 days old, a governance maintenance unit must be run before implementation work resumes.

### 4.10 Operational Fallback Rules

These rules apply when documents are missing, oversized, or inconsistent.

| Condition | Required Action |
|---|---|
| `OPEN-SET.md` is missing | STOP. Run a governance maintenance unit to reconstruct it before any other work |
| `NEXT-ACTION.md` is missing | STOP. Do not infer the next action from historical files. Run a governance sequencing unit |
| `SNAPSHOT.md` is missing or stale (>30 days) | Run a governance snapshot unit before implementation |
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
│   ├── OPEN-SET.md                  ← Exact current open set (≤50 lines)
│   ├── NEXT-ACTION.md               ← Derived Layer 0 pointer or governance exception (≤20 lines)
│   ├── BLOCKED.md                   ← Blocked + deferred register (≤80 lines)
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
