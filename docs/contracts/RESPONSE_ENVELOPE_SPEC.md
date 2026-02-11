# TexQtic API Response Envelope Specification

**Version:** 1.0.0  
**Status:** ACTIVE  
**Effective:** Wave 1+

---

## Unified Envelope Format

All TexQtic API responses follow this envelope structure:

### Success Response

```typescript
{
  success: true,
  data: T,
  warnings?: Warning[]
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

---

## Warning Structure

```typescript
interface Warning {
  code: string;
  message: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}
```

**Warning Codes (Examples):**

- `AI_BUDGET_NEAR_LIMIT` — AI usage approaching monthly cap
- `FEATURE_DEPRECATED` — Endpoint or feature scheduled for removal
- `RLS_POLICY_UPDATED` — Security policy changed
- `AUDIT_LAG_DETECTED` — Event projection behind write stream

---

## Design Principles

1. **Backward Compatibility:** `warnings` field is optional
2. **Client Agnostic:** Frontend can ignore warnings if not needed
3. **Structured Metadata:** Machine-readable context for warnings
4. **Severity Levels:** Allow client-side filtering/routing

---

## Examples

### Success Without Warnings

```json
{
  "success": true,
  "data": {
    "tenants": [...]
  }
}
```

### Success With Warnings

```json
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
```

### Error Response

```json
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
```

---

## Migration Strategy

**Wave 1:** Add `warnings` field, update types, create helpers  
**Wave 2+:** Gradually migrate high-risk endpoints to use warnings  
**Future:** Runtime contract validation emits warnings for schema drift

---

## Related Files

- `server/src/types/index.ts` — Type definitions
- `server/src/utils/response.ts` — Response helpers
- `shared/contracts/schema-pack.json` — Contract metadata
