# Doctrine v1.4 — Execution Plan Naming Convention

**Effective Date:** 2026-02-11  
**Status:** LOCKED

---

## Wave File Naming Format

All execution plan files must follow this exact format:

```
W#_<PRIMARY_DOMAIN>_<SHORT_DESCRIPTOR>.md
```

**Rules:**

- `W#`: Wave number (0-9, then 10, 11, etc.)
- `<PRIMARY_DOMAIN>`: UPPERCASE, single word or acronym (CONTRACT, RLS, EVENT, AUTH, etc.)
- `<SHORT_DESCRIPTOR>`: UPPERCASE_SNAKE_CASE, max 4 words
- File extension: `.md`
- Location: `docs/doctrine/v1.4/execution/`

**Examples (Valid):**

- `W0_REALM_ISOLATION_AND_ADMIN_POLL_GUARD.md`
- `W1_CONTRACT_SCHEMA_PACK.md`
- `W2_RLS_BASELINE_ENFORCEMENT.md`
- `W3_EVENT_LEDGER_APPEND_ONLY.md`
- `W4_PROJECTION_HEALTH_CHECKS.md`

**Examples (Invalid):**

- `wave_1_contract.md` (wrong format)
- `W1-contract-pack.md` (hyphens not allowed)
- `execution_plan_contracts.md` (no wave number)

---

## Required Header Block

Every execution plan file must begin with this header:

```markdown
# Wave <N> — <Human Readable Title>

**Doctrine Version:** v1.4  
**Wave:** W<N>  
**Track(s):** <TRACK_1>, <TRACK_2>, ...  
**Status:** <STATUS>  
**PR(s):** <PR_LINKS or TBD>  
**Owner:** <GITHUB_USERNAME or TBD>
```

**Status Values:**

- `APPROVED (Pre-Implementation)` — Plan approved, not yet implemented
- `IN_PROGRESS` — Implementation ongoing
- `BLOCKED` — Waiting on dependency or approval
- `COMPLETE` — All acceptance criteria met, PRs merged
- `DEPRECATED` — Superseded by later wave

**Track Values (Common):**

- `AUTH_REALM` — Authentication and realm isolation
- `CONTRACT_SCHEMA` — API contracts and schema governance
- `RLS_POLICY` — Row-level security and tenant isolation
- `EVENT_LEDGER` — Event sourcing and audit trails
- `AI_GOVERNANCE` — AI budget, usage, and explainability
- `PROJECTION` — Event projections and read models
- `COMPLIANCE` — Maker-checker, kill-switch, policy flags

---

## Required Sections

Each execution plan must include these sections (order matters):

1. **Executive Summary** (3-5 sentences max)
2. **Evidence-Backed Repo Map** (table format)
3. **Root Cause Analysis** (if fixing a defect)
4. **Implementation Plan** (Phases A, B, C... if >6 steps)
5. **Risks & Rollback**
6. **Acceptance Checklist**
7. **Future Work** (optional)
8. **References** (governance files, doctrine sections, tickets)

---

## Commit Message Format

When committing an execution plan:

```
docs(doctrine): add v1.4 W<N> <short-description>

- Bullet point summary (optional)
- Tracks: <TRACK_1>, <TRACK_2>

Governance review: PASS
```

**Example:**

```
docs(doctrine): add v1.4 W1 contract schema pack

- Unified response envelope
- Schema build pipeline
- Contract smoke tests
- Tracks: CONTRACT_SCHEMA

Governance review: PASS
```

---

## Wave Sequencing Rules

1. **Wave 0** is always foundational (auth, env, basic safety)
2. **Waves 1-5** establish core primitives (contracts, RLS, events, projections)
3. **Waves 6+** build domain features (marketplace, custody, trade, AI)
4. **Dependencies:** Each wave declares prerequisite waves in header
5. **Parallel Tracks:** Waves on different tracks can run in parallel

---

## Enforcement

- **Pre-commit hook:** TBD (validate file name pattern)
- **PR Review:** All execution plans require governance review
- **Status Updates:** Update header status when implementation changes

---

## Change History

- 2026-02-11: Initial version locked
