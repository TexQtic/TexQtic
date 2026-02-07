# TexQtic Documentation

> ⚠️ **BINDING AUTHORITY**: This directory contains the authoritative source of truth for all TexQtic platform implementation decisions. Deviation from executable doctrine requires explicit approval from the Doctrine Council.

---

## 1. Purpose of This Directory

This directory contains the **complete governance, architectural, and operational doctrine** for the TexQtic platform.

All engineering decisions—schema design, API contracts, event naming, RLS policies, feature flags, AI guardrails, and operational procedures—must trace back to an executable doctrine document in this directory.

**This is not aspirational documentation.** This is **implementation law**.

---

## 2. Mandatory Reading (All Engineers)

Every engineer (human or AI) working on TexQtic **MUST** read the following documents **before** writing any code:

### Required Foundation Documents

1. **[/north-star/TEXQTIC_PRODUCT_NORTH_STAR.md](./north-star/TEXQTIC_PRODUCT_NORTH_STAR.md)**
   - **Status**: LOCKED — Implementation-Binding
   - **Purpose**: Defines product vision, growth strategy, and strategic guardrails
   - **Why mandatory**: Understanding the "compliance-first OS" model prevents misaligned implementation

2. **[/doctrine/doctrine_v1_1_history.md](./doctrine/doctrine_v1_1_history.md)**
   - **Status**: HISTORICAL DOCTRINE — Read-Only Context
   - **Purpose**: Foundational platform principles (event-first, supply-side constituency, AI doctrine)
   - **Why mandatory**: Provides philosophical foundation for all subsequent decisions

3. **[/doctrine/doctrine_v1_2_history.md](./doctrine/doctrine_v1_2_history.md)**
   - **Status**: HISTORICAL DOCTRINE — Read-Only Context
   - **Purpose**: Governance bodies, failure modes, kill-switch doctrine
   - **Why mandatory**: Defines who has authority and what happens when things fail

4. **[/doctrine/doctrine_v1_3_history.md](./doctrine/doctrine_v1_3_history.md)**
   - **Status**: HISTORICAL DOCTRINE — Read-Only Context
   - **Purpose**: Enforcement primitives (feature flags, roles, RLS, events, Maker-Checker)
   - **Why mandatory**: Translates governance into technical enforcement mechanisms

### Executable Doctrine (Engineering Law)

**These documents are BINDING on implementation:**

- **[/doctrine/doctrine_v1_4_part_1_EXECUTABLE.md](./doctrine/doctrine_v1_4_part_1_EXECUTABLE.md)**
  - **Status**: EXECUTABLE DOCTRINE — Implementation-Binding
  - **Scope**: Structural truth, canonical data principles, core tables (organizations, traceability, trades, certifications)

- **[/doctrine/doctrine_v1_4_part_2_EXECUTABLE.md](./doctrine/doctrine_v1_4_part_2_EXECUTABLE.md)**
  - **Status**: EXECUTABLE DOCTRINE — Implementation-Binding
  - **Scope**: [To be determined based on content]

- **[/doctrine/doctrine_v1_4_part_3_EXECUTABLE.md](./doctrine/doctrine_v1_4_part_3_EXECUTABLE.md)**
  - **Status**: EXECUTABLE DOCTRINE — Implementation-Binding
  - **Scope**: [To be determined based on content]

- **[/doctrine/doctrine_v1_4_part_4_EXECUTABLE.md](./doctrine/doctrine_v1_4_part_4_EXECUTABLE.md)**
  - **Status**: EXECUTABLE DOCTRINE — Implementation-Binding
  - **Scope**: [To be determined based on content]

### Operational Manuals

- **[/execution/TEXQTIC_OPERATING_MANUAL.md](./execution/TEXQTIC_OPERATING_MANUAL.md)**
  - **Purpose**: Operational procedures and platform guidelines
  - **Audience**: DevOps, SRE, Support, Platform Engineers

- **[/execution/DEVELOPER_CONTRACT_HANDBOOK.md](./execution/DEVELOPER_CONTRACT_HANDBOOK.md)**
  - **Purpose**: Developer guidelines, contracts, and coding standards
  - **Audience**: All engineers contributing to TexQtic codebase

---

## 3. Doctrine Hierarchy: Historical vs. Executable

### HISTORICAL DOCTRINE (Read-Only Context)

Files marked with:
> ℹ️ HISTORICAL DOCTRINE — READ-ONLY CONTEXT, NOT EXECUTABLE

**Purpose**: Provide philosophical foundation and decision-making context.

**Engineering Rules**:
- ✅ Use to understand *why* decisions were made
- ✅ Reference in design discussions and architecture reviews
- ❌ **DO NOT** use as direct implementation specification
- ❌ **DO NOT** quote as if they are binding requirements

**These documents explain the thinking—they are not implementation checklists.**

---

### EXECUTABLE DOCTRINE (Implementation Law)

Files marked with:
> ⚠️ EXECUTABLE DOCTRINE — ENGINEERING MUST IMPLEMENT EXACTLY AS WRITTEN

**Purpose**: Define exact technical specifications that must be implemented.

**Engineering Rules**:
- ✅ **MUST** be implemented exactly as written
- ✅ Reference in tickets, PRs, and code comments
- ✅ Use as acceptance criteria for features
- ❌ **DO NOT** "interpret" or "adapt" without Doctrine Council approval
- ❌ **DO NOT** implement partial specifications

**If an executable doctrine defines a table schema, event type, RLS policy, or feature flag, it must be implemented verbatim.**

---

## 4. Rules for Referencing Doctrine in Tickets and Code

### In Jira/GitHub Issues

When creating tickets, use this format:

```
**Doctrine Reference**: /docs/doctrine/doctrine_v1_4_part_1_EXECUTABLE.md, Section 4.1
**Requirement**: Implement `traceability_nodes` table with org_id scoping and RLS policy.
**Acceptance Criteria**:
- [ ] Table schema matches doctrine exactly
- [ ] RLS policy `traceability_nodes_tenant_isolation` is applied
- [ ] All columns specified in doctrine are present
```

### In Code Comments

```typescript
// DOCTRINE: /docs/doctrine/doctrine_v1_4_part_1_EXECUTABLE.md, Section 6.2
// Event schema: certification events must include certification_file_id
// Invariant: Certification events are immutable after creation
```

### In Pull Requests

Every PR that implements doctrine requirements **MUST** include:

```markdown
## Doctrine Compliance Checklist

- [ ] Reviewed applicable executable doctrine: [doctrine file reference]
- [ ] Implementation matches specification exactly
- [ ] No "interpretations" or deviations made
- [ ] Tests validate doctrine-specified invariants
- [ ] RLS policies applied if doctrine specifies tenant scoping
```

---

## 5. Escalation Rule: Ambiguity or Conflict

If you encounter any of the following, **STOP IMPLEMENTATION IMMEDIATELY** and escalate:

### Escalation Triggers

1. **Ambiguity in executable doctrine**: Specification is unclear or incomplete
2. **Conflict between doctrine files**: Two executable doctrines contradict each other
3. **Missing specification**: Feature request has no corresponding executable doctrine
4. **Doctrine precedence question**: Unsure whether historical or executable doctrine applies

### Escalation Process

1. **DO NOT GUESS**. Do not "interpret" or "infer" what the doctrine "probably means."
2. **DO NOT PROCEED** with implementation if specification is unclear.
3. **FILE ESCALATION TICKET** with label `doctrine-clarification-required`:
   ```
   **Issue**: [Describe ambiguity or conflict]
   **Doctrine Reference**: [File and section]
   **Proposed Options**: [Your interpretation options]
   **Blocking**: [What work is blocked]
   ```
4. **TAG DOCTRINE COUNCIL**: Escalate to @doctrine-council or designated authority.
5. **WAIT FOR CLARIFICATION** before proceeding.

### Why This Matters

**Incorrect interpretation of doctrine can lead to:**
- Regulatory non-compliance (legal liability)
- Security vulnerabilities (RLS bypass, data leakage)
- Architectural debt (schema misalignment)
- Wasted engineering effort (rework after clarification)

**It is always cheaper to wait for clarification than to implement incorrectly.**

---

## 6. Non-Negotiable Implementation Rules

### Rule 1: Executable Doctrine Is Law

If executable doctrine specifies a requirement, it **MUST** be implemented exactly as written.

**No exceptions. No "close enough." No "I think this is better."**

### Rule 2: Historical Doctrine Is Not Binding

Historical doctrine (v1.1, v1.2, v1.3) provides context but does not override executable doctrine.

If historical doctrine conflicts with executable doctrine, **executable doctrine wins**.

### Rule 3: Doctrine Traceability Is Mandatory

Every feature, schema change, API endpoint, and event type **MUST** trace back to an executable doctrine reference.

**If you cannot cite the doctrine source, you cannot implement the feature.**

### Rule 4: No Invention Without Approval

Engineers (human or AI) **MUST NOT** invent platform behavior, schema, or APIs without executable doctrine approval.

**If it is not defined in executable doctrine, it must not be implemented.**

### Rule 5: Doctrine Changes Require Council Approval

Only the **Doctrine Council** can modify executable doctrine files.

Engineers can propose changes via `doctrine-change-request` tickets, but implementation waits for council approval and doctrine update.

---

## 7. Accountability

- **Team A (Platform/Backend)**: Responsible for implementing control plane and tenant plane doctrine
- **Team B (Frontend/UI)**: Responsible for implementing UI doctrine and user-facing governance controls
- **Doctrine Council**: Responsible for maintaining, clarifying, and evolving executable doctrine
- **All Engineers**: Responsible for reading, understanding, and adhering to doctrine

**Violations of executable doctrine are treated as critical defects and must be remediated immediately.**

---

## Final Rule

**If it is not defined in executable doctrine, it must not be implemented.**
