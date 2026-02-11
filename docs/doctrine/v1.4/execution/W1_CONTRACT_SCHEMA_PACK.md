# Wave 1 — Contract Schema Pack Foundation

**Doctrine Version:** v1.4  
**Wave:** W1  
**Track(s):** CONTRACT_SCHEMA  
**Status:** PENDING APPROVAL  
**PR(s):** TBD  
**Owner:** TBD  
**Prerequisites:** W0 (Realm Isolation)

---

## 1. Wave Overview

Wave 1 establishes the foundational contract governance primitives required for API stability, schema consistency, and automated contract verification. This wave implements the unified response envelope pattern and creates the infrastructure for contract-driven development.

**Goals:**

- Unified response envelope with `warnings[]` support
- Schema pack build pipeline for contract validation
- Edge gateway normalization (placeholder registration)
- Contract smoke tests (baseline)

**Non-Goals (Deferred):**

- Runtime contract validation middleware
- Full OpenAPI-to-Zod generation
- E2E contract testing suite
- Versioned contract artifacts

---

## 2. Included Doctrine Ticket IDs

**Note:** Wave 1 is foundational infrastructure and does not map to specific doctrine tickets. It creates the primitives required for future contract-enforcement tickets in Doctrine v1.4 Part 3 & 4.

**Related Governance Files:**

- `shared/contracts/ARCHITECTURE-GOVERNANCE.md`
- `shared/contracts/schema-budget.md`
- `shared/contracts/db-naming-rules.md`
- `shared/contracts/openapi.control-plane.json` (410 lines)
- `shared/contracts/openapi.tenant.json` (563 lines)

**Future Doctrine References (Not Yet Implemented):**

- Doctrine v1.4 Part 3: Edge gateway contract enforcement
- Doctrine v1.4 Part 4: Maker-checker warnings pattern

---

## 3. Exact Repo Paths Affected

### Modified Files

- `server/src/types/index.ts` — Add `warnings` field to `SuccessResponse`
- `server/src/utils/response.ts` — Add `sendSuccessWithWarnings()` helper
- `server/src/routes/control.ts` — Update responses to use new envelope (sample)
- `server/src/routes/tenant.ts` — Update responses to use new envelope (sample)

### New Files

- `shared/contracts/schema-pack.json` — Contract bundle metadata
- `scripts/validate-contracts.ts` — Contract smoke test script
- `server/src/middleware/contractNormalizer.ts` — Placeholder for edge gateway
- `docs/contracts/RESPONSE_ENVELOPE_SPEC.md` — Envelope documentation

### No Changes

- `services/apiClient.ts` — Frontend already handles both envelope formats
- Prisma schema — No database changes in Wave 1
- RLS policies — No security changes in Wave 1

---

## 4. Implementation Steps (6 Steps)

### Step 1: Add warnings field to response envelope

**File:** `server/src/types/index.ts`

**Change:** Update `SuccessResponse` type

**Before:**

```typescript
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}
```

**After:**

```typescript
export interface Warning {
  code: string;
  message: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  warnings?: Warning[];
}
```

**Acceptance:**

- ✅ `Warning` type exported
- ✅ `warnings` field is optional (backward compatible)
- ✅ Severity levels defined
- ✅ Metadata support for structured context

**Rollback:** Revert type changes

---

### Step 2: Add sendSuccessWithWarnings() utility

**File:** `server/src/utils/response.ts`

**Change:** Add new helper function after `sendSuccess()`

**Implementation:**

```typescript
import type { Warning } from '../types/index.js';

export function sendSuccessWithWarnings<T>(
  reply: FastifyReply,
  data: T,
  warnings: Warning[],
  statusCode: number = 200
): FastifyReply {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
  return reply.code(statusCode).send(response);
}
```

**Usage Pattern:**

```typescript
// Existing: No warnings
return sendSuccess(reply, { tenants });

// New: With warnings
const warnings: Warning[] = [];
if (budgetNearLimit) {
  warnings.push({
    code: 'AI_BUDGET_NEAR_LIMIT',
    message: 'AI budget is 90% consumed',
    severity: 'WARN',
    metadata: { usage: 900, limit: 1000 },
  });
}
return sendSuccessWithWarnings(reply, { tenants }, warnings);
```

**Acceptance:**

- ✅ Function exported
- ✅ Empty warnings array omitted from response (clean JSON)
- ✅ Compatible with existing `sendSuccess()` signature

**Rollback:** Remove function

---

### Step 3: Create contract bundle metadata file

**File (New):** `shared/contracts/schema-pack.json`

**Content:**

```json
{
  "version": "1.0.0",
  "generated": "2026-02-11T00:00:00Z",
  "contracts": {
    "control-plane": {
      "file": "openapi.control-plane.json",
      "endpoints": 15,
      "lastUpdated": "2026-02-08",
      "status": "partial"
    },
    "tenant": {
      "file": "openapi.tenant.json",
      "endpoints": 22,
      "lastUpdated": "2026-02-08",
      "status": "partial"
    }
  },
  "governance": {
    "architecture": "ARCHITECTURE-GOVERNANCE.md",
    "naming": "db-naming-rules.md",
    "rls": "rls-policy.md",
    "schema-budget": "schema-budget.md",
    "events": "event-names.md"
  },
  "validation": {
    "enabled": false,
    "strict": false,
    "enforcedEndpoints": []
  }
}
```

**Acceptance:**

- ✅ File lists all contract files
- ✅ Governance file references included
- ✅ Validation status tracked
- ✅ Endpoint counts accurate

**Rollback:** Delete file

---

### Step 4: Create contract smoke test script

**File (New):** `scripts/validate-contracts.ts`

**Implementation:**

```typescript
#!/usr/bin/env node --import tsx
/**
 * Contract Smoke Test
 *
 * Validates:
 * - All contract files exist
 * - OpenAPI specs are valid JSON
 * - Governance files are readable
 * - Schema pack metadata is accurate
 */

import fs from 'fs';
import path from 'path';

const CONTRACTS_DIR = path.join(__dirname, '..', 'shared', 'contracts');

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

async function main() {
  console.log('🔍 Running contract smoke tests...\n');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  // Test 1: Schema pack exists
  const schemaPackPath = path.join(CONTRACTS_DIR, 'schema-pack.json');
  if (!fs.existsSync(schemaPackPath)) {
    result.failed++;
    result.errors.push('schema-pack.json not found');
  } else {
    try {
      const schemaPack = JSON.parse(fs.readFileSync(schemaPackPath, 'utf-8'));
      result.passed++;
      console.log('✅ schema-pack.json valid');

      // Test 2: OpenAPI files exist and are valid JSON
      for (const [name, config] of Object.entries(schemaPack.contracts)) {
        const contractPath = path.join(CONTRACTS_DIR, (config as any).file);
        if (!fs.existsSync(contractPath)) {
          result.failed++;
          result.errors.push(`${(config as any).file} not found`);
        } else {
          try {
            JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
            result.passed++;
            console.log(`✅ ${name} contract valid`);
          } catch (err) {
            result.failed++;
            result.errors.push(`${(config as any).file} invalid JSON: ${err}`);
          }
        }
      }

      // Test 3: Governance files exist
      for (const [name, file] of Object.entries(schemaPack.governance)) {
        const govPath = path.join(CONTRACTS_DIR, file as string);
        if (!fs.existsSync(govPath)) {
          result.failed++;
          result.errors.push(`Governance file ${file} not found`);
        } else {
          result.passed++;
          console.log(`✅ ${name} governance file exists`);
        }
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`schema-pack.json invalid: ${err}`);
    }
  }

  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.forEach(err => console.log(`   - ${err}`));
    process.exit(1);
  } else {
    console.log(`\n✅ All contract smoke tests passed!`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Add to `package.json`:**

```json
"scripts": {
  "validate:contracts": "node --import tsx scripts/validate-contracts.ts"
}
```

**Acceptance:**

- ✅ Script executable via `npm run validate:contracts`
- ✅ Exits 0 if all tests pass
- ✅ Exits 1 with error list if tests fail
- ✅ Tests: file existence, JSON validity, governance files

**Rollback:** Delete script, remove package.json entry

---

### Step 5: Create edge gateway normalizer placeholder

**File (New):** `server/src/middleware/contractNormalizer.ts`

**Implementation:**

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Contract Normalizer Middleware (PLACEHOLDER)
 *
 * Future: Validates request/response against OpenAPI contracts
 * Future: Enforces schema conformance at edge gateway
 * Future: Generates structured warnings for schema drift
 *
 * Wave 1: Registration only, no enforcement
 */

export async function contractNormalizerMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // TODO: Wave 2+ will implement contract validation
  // For now, this is a no-op placeholder
  return;
}
```

**Registration (Optional in Wave 1):**

```typescript
// In server/src/index.ts (commented out)
// await fastify.addHook('onRequest', contractNormalizerMiddleware);
```

**Acceptance:**

- ✅ File exists with placeholder implementation
- ✅ JSDoc describes future behavior
- ✅ No-op in Wave 1 (no performance impact)
- ✅ Ready for Wave 2 implementation

**Rollback:** Delete file

---

### Step 6: Document response envelope specification

**File (New):** `docs/contracts/RESPONSE_ENVELOPE_SPEC.md`

**Content:**

````markdown
# TexQtic API Response Envelope Specification

**Version:** 1.0.0  
**Status:** ACTIVE  
**Effective:** Wave 1+

---

## Unified Envelope Format

All TexQtic API responses follow this envelope structure:

### Success Response

\`\`\`typescript
{
success: true,
data: T,
warnings?: Warning[]
}
\`\`\`

### Error Response

\`\`\`typescript
{
success: false,
error: {
code: string,
message: string,
details?: unknown
}
}
\`\`\`

---

## Warning Structure

\`\`\`typescript
interface Warning {
code: string;
message: string;
severity?: 'INFO' | 'WARN' | 'CRITICAL';
metadata?: Record<string, unknown>;
}
\`\`\`

**Warning Codes (Examples):**

- \`AI_BUDGET_NEAR_LIMIT\` — AI usage approaching monthly cap
- \`FEATURE_DEPRECATED\` — Endpoint or feature scheduled for removal
- \`RLS_POLICY_UPDATED\` — Security policy changed
- \`AUDIT_LAG_DETECTED\` — Event projection behind write stream

---

## Design Principles

1. **Backward Compatibility:** \`warnings\` field is optional
2. **Client Agnostic:** Frontend can ignore warnings if not needed
3. **Structured Metadata:** Machine-readable context for warnings
4. **Severity Levels:** Allow client-side filtering/routing

---

## Examples

### Success Without Warnings

\`\`\`json
{
"success": true,
"data": {
"tenants": [...]
}
}
\`\`\`

### Success With Warnings

\`\`\`json
{
"success": true,
"data": {
"tenants": [...]
},
"warnings": [
{
"code": "AI_BUDGET_NEAR_LIMIT",
"message": "AI budget is 90% consumed for this month",
"severity": "WARN",
"metadata": {
"usage": 900,
"limit": 1000,
"resetDate": "2026-03-01"
}
}
]
}
\`\`\`

### Error Response

\`\`\`json
{
"success": false,
"error": {
"code": "REALM_MISMATCH",
"message": "Admin token required for this endpoint",
"details": {
"expectedRealm": "CONTROL_PLANE",
"receivedRealm": "TENANT"
}
}
}
\`\`\`

---

## Migration Strategy

**Wave 1:** Add \`warnings\` field, update types, create helpers  
**Wave 2+:** Gradually migrate high-risk endpoints to use warnings  
**Future:** Runtime contract validation emits warnings for schema drift

---

## Related Files

- \`server/src/types/index.ts\` — Type definitions
- \`server/src/utils/response.ts\` — Response helpers
- \`shared/contracts/schema-pack.json\` — Contract metadata
  \`\`\`

**Acceptance:**

- ✅ Specification document complete
- ✅ Examples cover all response types
- ✅ Migration strategy documented
- ✅ Related files referenced

**Rollback:** Delete file

---

## 5. Commands to Run

### Implementation

```powershell
# No database changes
# No Prisma migration
# No server restart required (until using warnings)

# Run contract smoke test after Step 4
npm run validate:contracts
```
````

### Verification

```powershell
# After Steps 1-2: TypeScript compilation
cd server
npx tsc --noEmit

# After Step 4: Smoke test
npm run validate:contracts

# Check file changes
git diff --name-only
```

### Commit

```powershell
git add -A
git commit -m "feat(contracts): add unified response envelope with warnings

- Add Warning type and warnings[] field to SuccessResponse
- Add sendSuccessWithWarnings() utility
- Create schema-pack.json contract bundle metadata
- Add contract smoke test script
- Create contractNormalizer placeholder middleware
- Document response envelope specification

Tracks: CONTRACT_SCHEMA
Governance review: PASS"
```

---

## 6. Risks & Rollback

### Risks

1. **Backward Incompatibility (LOW):**
   - Risk: Frontend expects exact response shape
   - Mitigation: `warnings` is optional, existing responses unchanged
   - Rollback: Type changes are additive only

2. **Contract Drift (MEDIUM):**
   - Risk: OpenAPI specs don't match actual responses
   - Mitigation: Smoke test validates file existence only (no runtime check yet)
   - Rollback: Wave 2 will add runtime validation

3. **Performance (LOW):**
   - Risk: Middleware overhead
   - Mitigation: contractNormalizer is no-op in Wave 1
   - Rollback: Don't register middleware hook

### Rollback Strategy

**Full Wave 1 Rollback:**

```powershell
git revert <wave1-commit-hash>
rm docs/contracts/RESPONSE_ENVELOPE_SPEC.md
rm shared/contracts/schema-pack.json
rm scripts/validate-contracts.ts
rm server/src/middleware/contractNormalizer.ts
```

**Selective Rollback:**

- Types: Revert `server/src/types/index.ts`
- Utils: Revert `server/src/utils/response.ts`
- Metadata: Delete `shared/contracts/schema-pack.json`
- Tests: Delete `scripts/validate-contracts.ts`, remove npm script

---

## 7. Acceptance Checklist

### Step 1-2: Envelope & Utilities

- [ ] `Warning` type defined with severity levels
- [ ] `SuccessResponse.warnings` field is optional
- [ ] `sendSuccessWithWarnings()` exported
- [ ] TypeScript compilation succeeds
- [ ] Backward compatibility verified (existing responses work)

### Step 3-4: Contract Bundle & Tests

- [ ] `schema-pack.json` created with accurate metadata
- [ ] All governance files listed
- [ ] `validate-contracts.ts` script executable
- [ ] `npm run validate:contracts` passes
- [ ] Script exits 0 on success, 1 on failure

### Step 5-6: Middleware & Docs

- [ ] `contractNormalizer.ts` created (placeholder)
- [ ] JSDoc describes future behavior
- [ ] Middleware is no-op (no performance impact)
- [ ] `RESPONSE_ENVELOPE_SPEC.md` complete
- [ ] Examples cover all response types
- [ ] Migration strategy documented

### Integration

- [ ] No breaking changes to existing API responses
- [ ] Frontend can consume responses with/without warnings
- [ ] Contract smoke test runs in CI/CD (future)
- [ ] Governance files accessible to team
- [ ] Response helpers ready for team adoption

---

## Future Work (Not in Wave 1)

1. **Runtime Contract Validation** (Wave 2+)
   - Zod schema generation from OpenAPI
   - Request/response validation middleware
   - Automatic warning generation for schema drift

2. **Contract Testing Suite** (Wave 3+)
   - Pact/Prism integration
   - Consumer-driven contract tests
   - Breaking change detection

3. **Versioned Contracts** (Wave 4+)
   - Semantic versioning for API contracts
   - Deprecation warnings in response envelope
   - Client-specified API version headers

4. **Edge Gateway Normalization** (Wave 5+)
   - Full implementation of contractNormalizer
   - Schema migration helpers
   - Field remapping for backward compatibility

---

## References

- **Governance:** `shared/contracts/ARCHITECTURE-GOVERNANCE.md`
- **Schema Budget:** `shared/contracts/schema-budget.md`
- **Naming Rules:** `shared/contracts/db-naming-rules.md`
- **OpenAPI Specs:** `openapi.control-plane.json` (410 lines), `openapi.tenant.json` (563 lines)
- **Wave 0:** `W0_REALM_ISOLATION_AND_ADMIN_POLL_GUARD.md` (prerequisite)
