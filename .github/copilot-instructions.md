# GitHub Copilot Governance Instructions

## CRITICAL: Pre-Implementation Review Protocol

**BEFORE implementing ANY change, GitHub Copilot MUST:**

1. ✅ Review this instruction file
2. ✅ Check applicable governance files
3. ✅ Validate against guardrails
4. ✅ Report violations immediately
5. ✅ Seek clarification if rules are violated
6. ✅ Only proceed after confirmation

---

## Governance Files (MANDATORY REVIEW)

All governance files are located in `/shared/contracts/` and MUST be reviewed for relevant changes:

### 1. Database & Schema Changes

**Files to review:**

- [`/shared/contracts/db-naming-rules.md`](../shared/contracts/db-naming-rules.md)
- [`/shared/contracts/schema-budget.md`](../shared/contracts/schema-budget.md)
- [`/shared/contracts/rls-policy.md`](../shared/contracts/rls-policy.md)

**When to review:** Any change involving:

- Prisma schema modifications
- Database migrations
- Table/column naming
- Enum definitions
- JSONB fields

**Violation detection checklist:**

- [ ] Are table names snake_case and plural?
- [ ] Are column names snake_case?
- [ ] Do Prisma models use PascalCase with `@@map()`?
- [ ] Do Prisma fields use camelCase with `@map()`?
- [ ] Is schema budget within limits? (Max 15 tables in Phase 2)
- [ ] Is RLS properly applied for tenant-scoped tables?
- [ ] Are JSONB fields named with `*_json` suffix?

**If violation detected:**

```
🚨 GOVERNANCE VIOLATION DETECTED

Violation: [Specific rule violated]
Location: [File/line]
Rule: [Reference to governance file]

❌ Implementation STOPPED

Required action:
1. Review [governance file]
2. Adjust approach to comply with: [specific rule]
3. Confirm adjusted approach before proceeding

Suggested fix: [Your recommendation]
```

---

### 2. API & Route Changes

**Files to review:**

- [`/shared/contracts/openapi.control-plane.json`](../shared/contracts/openapi.control-plane.json)
- [`/shared/contracts/openapi.tenant.json`](../shared/contracts/openapi.tenant.json)

**When to review:** Any change involving:

- New API endpoints
- Route modifications
- Request/response schemas
- Authentication/authorization

**Violation detection checklist:**

- [ ] Does endpoint belong to correct plane (control/tenant)?
- [ ] Is endpoint documented in OpenAPI spec?
- [ ] Does tenant plane properly isolate tenants?
- [ ] Are admin endpoints properly secured?

**If violation detected:**

```
🚨 API GOVERNANCE VIOLATION

Violation: [Endpoint/route issue]
Expected plane: [control/tenant]
Rule: [Reference to governance file]

❌ Implementation STOPPED

Required action:
1. Clarify which plane this endpoint belongs to
2. Ensure proper tenant isolation
3. Update OpenAPI spec if new endpoint
```

---

### 3. Event System Changes

**Files to review:**

- [`/shared/contracts/event-names.md`](../shared/contracts/event-names.md)

**When to review:** Any change involving:

- Event emission
- Event handlers
- Event naming
- Pub/sub systems

**Violation detection checklist:**

- [ ] Are events domain-prefixed? (tenant._, admin._, audit._, ai._)
- [ ] Are event names snake_case?
- [ ] Is event naming approved by Team A?
- [ ] No UI-invented event names?

**If violation detected:**

```
🚨 EVENT NAMING VIOLATION

Violation: Event name doesn't follow convention
Event: [Event name]
Expected format: domain.action (snake_case)

❌ Implementation STOPPED

Required action:
1. Use approved event names from /shared/contracts/event-names.md
2. If new event needed, prefix with domain (tenant.*, admin.*, etc.)
3. Get Team A approval for new event names
```

---

### 4. Architecture & Domain Changes

**Files to review:**

- [`/shared/contracts/ARCHITECTURE-GOVERNANCE.md`](../shared/contracts/ARCHITECTURE-GOVERNANCE.md)

**When to review:** Any change involving:

- New tables
- New routes
- Domain logic changes
- Plane boundaries

**Violation detection checklist:**

- [ ] Is domain owner declared? (control/tenant/domain-name)
- [ ] Is plane declared? (control-plane/tenant-plane)
- [ ] Is lifecycle declared? (create/update/archive)
- [ ] No business-domain tables in Phase 2?
- [ ] Proper plane separation maintained?

**If violation detected:**

```
🚨 ARCHITECTURE GOVERNANCE VIOLATION

Violation: [Architecture rule violated]
Component: [Table/route/module]
Missing: [Domain owner/plane/lifecycle]

❌ Implementation STOPPED

Required action:
1. Declare domain owner
2. Declare plane (control/tenant)
3. Declare lifecycle
4. Verify no business-domain tables in Phase 2
```

---

## Phase 2 Constraints (ENFORCED)

### Absolute Prohibitions

❌ **STOP implementation if any of these are detected:**

1. **Business-domain tables** (no invoices, contracts, negotiations in Phase 2)
2. **Workflow-history tables** (state machines, process logs)
3. **More than 15 total tables**
4. **Multiple Prisma schema files**
5. **Direct `@google/genai` calls from frontend** (must use server proxy)
6. **Tenant ID from client input** (must use session/auth)
7. **CamelCase table/column names in database**
8. **Secrets in code** (.env files, API keys)

### Required Declarations

✅ **Every new component must declare:**

- Domain owner
- Plane (control/tenant)
- Lifecycle stage
- RLS requirement (if applicable)

---

## Implementation Workflow

### Step 1: Pre-Flight Check

```
Before implementing [change description]:

1. Identify affected systems:
   - [ ] Database/Prisma: Review db-naming-rules.md, schema-budget.md, rls-policy.md
   - [ ] API endpoints: Review openapi.control-plane.json, openapi.tenant.json
   - [ ] Events: Review event-names.md
   - [ ] Architecture: Review ARCHITECTURE-GOVERNANCE.md

2. Check Phase 2 constraints:
   - [ ] No business-domain tables
   - [ ] Schema budget within limits (≤15 tables)
   - [ ] Proper plane separation

3. Validate naming conventions:
   - [ ] snake_case for DB
   - [ ] camelCase for code
   - [ ] Proper Prisma mapping
```

### Step 2: Violation Detection

```
If ANY rule is violated:

1. STOP implementation immediately
2. Report violation using template above
3. Suggest compliant alternative
4. Wait for user confirmation
5. Only proceed after explicit approval
```

### Step 3: Implementation

```
After governance approval:

1. Implement changes following approved approach
2. Include governance checklist in commit message
3. Reference governance files in PR description
```

---

## Commit Message Format

All commits MUST include governance checklist:

```
<type>: <description>

Governance Review:
- [x] DB naming rules: PASS/FAIL/N/A
- [x] Schema budget: PASS/FAIL/N/A (X/15 tables)
- [x] RLS policy: PASS/FAIL/N/A
- [x] API contracts: PASS/FAIL/N/A
- [x] Event naming: PASS/FAIL/N/A
- [x] Architecture governance: PASS/FAIL/N/A
- [x] Phase 2 constraints: PASS

Domain: [control/tenant/domain-name]
Plane: [control-plane/tenant-plane/N/A]
```

---

## Example: Governance Check in Action

### Scenario: User asks to add a `contracts` table

**Copilot Response:**

```
🚨 GOVERNANCE VIOLATION DETECTED

Violation: Business-domain table in Phase 2
Request: Add 'contracts' table
Rule: ARCHITECTURE-GOVERNANCE.md - "No business-domain tables allowed in Phase 2"

❌ Implementation STOPPED

Analysis:
- 'contracts' is a business-domain table
- Phase 2 is limited to control plane and tenant plane foundations
- Business domain tables are planned for Phase 3+

Required action:
Please confirm: Should this be deferred to Phase 3, or is there a different
approach that fits within Phase 2 constraints?

Alternative suggestions:
1. Use JSONB field in existing table if extremely necessary
2. Defer to Phase 3 roadmap
3. Clarify if this is actually a control/tenant plane component
```

---

## Example: Compliant Implementation

### Scenario: User asks to add `tenant_domains` table

**Copilot Response:**

```
✅ GOVERNANCE PRE-FLIGHT CHECK

Request: Add 'tenant_domains' table
Governance files reviewed:
- db-naming-rules.md: ✅ PASS (snake_case, plural)
- schema-budget.md: ✅ PASS (13/15 tables)
- rls-policy.md: ✅ PASS (tenant-scoped, RLS required)
- ARCHITECTURE-GOVERNANCE.md: ✅ PASS (tenant plane, clear ownership)

Domain: tenant
Plane: tenant-plane
RLS: Required (tenant isolation)

Proceeding with implementation...
```

---

## Special Cases

### Frontend Changes

- ✅ UI components: No backend governance needed
- ⚠️ API calls: Must use server proxy (no direct Google AI calls)
- ⚠️ State management: Check event naming if emitting events

### Backend Changes

- ⚠️ Always requires full governance review
- ⚠️ Database changes: db-naming-rules.md + schema-budget.md + rls-policy.md
- ⚠️ API changes: OpenAPI specs + plane separation

### Migration Changes

- ⚠️ Always requires governance review
- ⚠️ Immutable once merged
- ⚠️ Breaking changes require backward compatibility

---

## Escalation Rules

**When to escalate to Team A:**

1. Governance rules conflict with requirements
2. Unclear which plane a component belongs to
3. New event names needed
4. Schema budget exceeded (>15 tables)
5. Business domain table needed in Phase 2

**Escalation format:**

```
🔺 ESCALATION REQUIRED

Issue: [Description]
Affected governance: [File(s)]
Conflict: [Specific conflict]

Recommendation: [Your suggestion]

Awaiting Team A decision before proceeding.
```

---

## Governance Update Process

If governance files need updates:

1. ⚠️ Changes to `/shared/contracts/` require Team A approval
2. ⚠️ Document reason for change
3. ⚠️ Update this instruction file if workflow changes
4. ⚠️ Notify all developers of governance changes

---

## Final Reminder

**🚨 EVERY IMPLEMENTATION MUST:**

1. Review applicable governance files FIRST
2. Validate against Phase 2 constraints
3. Report violations IMMEDIATELY
4. Seek clarification BEFORE proceeding
5. Document governance compliance in commits

**No exceptions. No shortcuts. Governance is non-negotiable.**
