# Doctrine v1.4 — Event Contracts Starter

**Status:** ✅ EMISSION ACTIVE (P0 subset, console sink)  
**Phase:** Phase 2 - Doctrine v1.4 Preparation  
**Date:** February 8, 2026

---

## Purpose

This document defines the **Event Contracts** layer for TexQtic, implementing Doctrine v1.4 principles for event-driven architecture.

### Why Events Exist

Events serve three critical purposes:

1. **Replay Safety** — Events enable state reconstruction by replaying historical actions. Origin events (`_ORIGIN` suffix) mark genesis points for safe replay without duplication.

2. **Regulator Visibility** — Immutable event streams provide auditable, tamper-proof records for compliance and regulatory requirements.

3. **AI Backbone** — Events feed AI models with structured, timestamped actions for training, predictions, and workflow optimization.

---

## Version Sovereignty

### Current Version: v1

The event envelope structure is versioned to ensure forward compatibility and safe evolution.

**Version:** `v1` (initial event contract)

**Envelope Fields (v1):**

- `id`: UUID (unique event identifier)
- `version`: `'v1'` (envelope structure version)
- `name`: Event name (domain.ACTION format)
- `occurredAt`: ISO8601 timestamp
- `tenantId`: UUID or null (tenant isolation)
- `realm`: `'ADMIN'` | `'TENANT'`
- `actor`: `{ type, id }` (who performed the action)
- `entity`: `{ type, id }` (what was affected)
- `payload`: Event-specific data (flexible, no secrets)
- `metadata`: `{ origin?, correlationId?, causationId? }`

---

### Version Bumping Rules

**When to create a new version (e.g., v2):**

- ✅ Breaking changes to envelope fields (rename, remove, change type)
- ✅ Changing required/optional semantics of core fields

**When NOT to bump version:**

- ❌ Adding optional fields to envelope (patch within v1)
- ❌ Additive payload changes (backward-compatible additions allowed in v1; breaking payload changes require new version)
- ❌ Adding new event names (extend registry, no version change)

**Example:** If we add a new optional field `emittedAt` to the envelope, this is a patch within v1. If we rename `occurredAt` to `timestamp`, this requires v2.

---

## Immutable Event Envelope

### Field Definitions

| Field                    | Type                            | Required | Description                          |
| ------------------------ | ------------------------------- | -------- | ------------------------------------ |
| `id`                     | `string (UUID)`                 | Yes      | Unique event identifier              |
| `version`                | `'v1'`                          | Yes      | Envelope structure version           |
| `name`                   | `string`                        | Yes      | Event name (domain.ACTION)           |
| `occurredAt`             | `string (ISO8601)`              | Yes      | Timestamp when event occurred        |
| `tenantId`               | `string (UUID) \| null`         | Yes      | Tenant UUID (null for admin/global)  |
| `realm`                  | `'ADMIN' \| 'TENANT'`           | Yes      | Realm where event originated         |
| `actor.type`             | `'ADMIN' \| 'USER' \| 'SYSTEM'` | Yes      | Actor type                           |
| `actor.id`               | `string (UUID) \| null`         | Yes      | Actor UUID (null for SYSTEM)         |
| `entity.type`            | `string`                        | Yes      | Entity type (e.g., 'tenant', 'user') |
| `entity.id`              | `string (UUID)`                 | Yes      | Entity UUID                          |
| `payload`                | `Record<string, any>`           | Yes      | Event-specific data (no secrets!)    |
| `metadata.origin`        | `boolean`                       | No       | True for genesis/origin events       |
| `metadata.correlationId` | `string (UUID)`                 | No       | Groups related events                |
| `metadata.causationId`   | `string (UUID)`                 | No       | ID of event that caused this event   |

---

### Immutability Statement

**Events are append-only and immutable.**

Once an event is emitted:

- ✅ Events can be read/replayed indefinitely
- ❌ Events MUST NOT be modified (no UPDATE)
- ❌ Events MUST NOT be deleted (no DELETE)

**Rationale:** Immutability guarantees audit integrity, enables safe replay, and ensures AI training data consistency.

---

## Naming Convention

### Format: `domain.ACTION`

**Structure:**

- **domain:** Lowercase namespace (e.g., `tenant`, `team`, `admin`)
- **ACTION:** SCREAMING_SNAKE_CASE verb phrase (e.g., `TENANT_CREATED_ORIGIN`)

**Examples:**

- `tenant.TENANT_CREATED_ORIGIN` — Tenant provisioning (origin event)
- `team.TEAM_INVITE_CREATED` — Team invitation created

---

### Domains Used Initially

| Domain   | Scope                                      | Examples                                        |
| -------- | ------------------------------------------ | ----------------------------------------------- |
| `tenant` | Tenant lifecycle, provisioning, onboarding | `TENANT_CREATED_ORIGIN`, `TENANT_OWNER_CREATED` |
| `team`   | Team management, invitations, memberships  | `TEAM_INVITE_CREATED`, `TEAM_MEMBER_ADDED`      |
| `admin`  | Admin actions, system-level operations     | (Future: `ADMIN_USER_CREATED`)                  |

---

### Origin Semantics

**Origin events** mark the genesis of an aggregate or entity lifecycle. They use:

- **Naming:** `_ORIGIN` suffix (e.g., `TENANT_CREATED_ORIGIN`)
- **Metadata:** `metadata.origin = true`

**Purpose:** Origin events signal replay boundaries. When reconstructing state from events, origin events indicate "start here" points, preventing duplicate replays of pre-existing state.

**Example:**

- `tenant.TENANT_CREATED_ORIGIN` is the origin event for a tenant's lifecycle
- Any events before this point are irrelevant to this tenant's state

---

## P0 Event Registry

### Registered Events (P0 Spine)

The following events correspond to audit log actions already implemented in prompts #10-#13:

---

#### 1. **tenant.TENANT_CREATED_ORIGIN**

**Source:** Prompt #10 (Tenant Provisioning)

**Trigger:** POST /api/control/tenants (admin creates tenant)

**Payload (Minimum):**

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "type": "B2B | B2C | INTERNAL",
  "status": "ACTIVE | SUSPENDED | CLOSED",
  "plan": "FREE | STARTER | PROFESSIONAL | ENTERPRISE"
}
```

**Example Envelope:**

```json
{
  "id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "version": "v1",
  "name": "tenant.TENANT_CREATED_ORIGIN",
  "occurredAt": "2026-02-08T12:00:00.000Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "realm": "ADMIN",
  "actor": {
    "type": "ADMIN",
    "id": "admin_550e8400-e29b-41d4-a716-446655440001"
  },
  "entity": {
    "type": "tenant",
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "payload": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "slug": "acme-corp",
    "name": "Acme Corporation",
    "type": "B2B",
    "status": "ACTIVE",
    "plan": "FREE"
  },
  "metadata": {
    "origin": true
  }
}
```

---

#### 2. **tenant.TENANT_OWNER_CREATED**

**Source:** Prompt #11 (Tenant Onboarding)

**Trigger:** POST /api/tenants/onboard (admin creates owner user)

**Payload (Minimum):**

```json
{
  "id": "uuid",
  "email": "string"
}
```

**Security:** Email only, no password or passwordHash.

**Example Envelope:**

```json
{
  "id": "evt_660e8400-e29b-41d4-a716-446655440002",
  "version": "v1",
  "name": "tenant.TENANT_OWNER_CREATED",
  "occurredAt": "2026-02-08T12:05:00.000Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "realm": "ADMIN",
  "actor": {
    "type": "ADMIN",
    "id": "admin_550e8400-e29b-41d4-a716-446655440001"
  },
  "entity": {
    "type": "user",
    "id": "987fcdeb-51a2-43d7-b789-123456789abc"
  },
  "payload": {
    "id": "987fcdeb-51a2-43d7-b789-123456789abc",
    "email": "owner@acme.com"
  },
  "metadata": {
    "onboarding": true
  }
}
```

---

#### 3. **tenant.TENANT_OWNER_MEMBERSHIP_CREATED**

**Source:** Prompt #11 (Tenant Onboarding)

**Trigger:** POST /api/tenants/onboard (admin creates owner membership)

**Payload (Minimum):**

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "role": "OWNER | ADMIN | MEMBER | VIEWER"
}
```

**Example Envelope:**

```json
{
  "id": "evt_770e8400-e29b-41d4-a716-446655440003",
  "version": "v1",
  "name": "tenant.TENANT_OWNER_MEMBERSHIP_CREATED",
  "occurredAt": "2026-02-08T12:05:00.000Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "realm": "ADMIN",
  "actor": {
    "type": "ADMIN",
    "id": "admin_550e8400-e29b-41d4-a716-446655440001"
  },
  "entity": {
    "type": "membership",
    "id": "456e7890-a12b-34c5-d678-901234567def"
  },
  "payload": {
    "id": "456e7890-a12b-34c5-d678-901234567def",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "987fcdeb-51a2-43d7-b789-123456789abc",
    "role": "OWNER"
  },
  "metadata": {
    "onboarding": true
  }
}
```

---

#### 4. **team.TEAM_INVITE_CREATED**

**Source:** Prompt #13 (Team Invitations)

**Trigger:** POST /api/tenant/invites (tenant user creates invite)

**Payload (Minimum):**

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "email": "string",
  "role": "OWNER | ADMIN | MEMBER | VIEWER",
  "expiresAt": "ISO8601 timestamp"
}
```

**Security:** No `token` or `tokenHash` included.

**Example Envelope:**

```json
{
  "id": "evt_880e8400-e29b-41d4-a716-446655440004",
  "version": "v1",
  "name": "team.TEAM_INVITE_CREATED",
  "occurredAt": "2026-02-08T14:00:00.000Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "realm": "TENANT",
  "actor": {
    "type": "USER",
    "id": "987fcdeb-51a2-43d7-b789-123456789abc"
  },
  "entity": {
    "type": "invite",
    "id": "789e0123-a45b-67c8-d901-234567890abc"
  },
  "payload": {
    "id": "789e0123-a45b-67c8-d901-234567890abc",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "newmember@example.com",
    "role": "MEMBER",
    "expiresAt": "2026-02-15T14:00:00.000Z"
  },
  "metadata": {
    "inviter": "987fcdeb-51a2-43d7-b789-123456789abc"
  }
}
```

---

## Security Rules

### ❌ Never Include Secrets in Payload

Event payloads **MUST NOT** contain:

- `password` or `passwordHash`
- `token` or `tokenHash`
- `jwt` or `authorization` headers
- `secret` or `apiKey`

**Enforcement:** Use `assertNoSecretsInPayload()` before emitting events. This function recursively scans payloads and throws an error if secret keys are detected.

**Example (WRONG):**

```json
{
  "id": "...",
  "email": "user@example.com",
  "passwordHash": "..." // ❌ SECURITY VIOLATION
}
```

**Example (CORRECT):**

```json
{
  "id": "...",
  "email": "user@example.com" // ✅ OK
}
```

---

### Tenant Scoping Requirement

All tenant-scoped events **MUST** include `tenantId` in the envelope. This ensures:

- Events can be filtered by tenant for isolation
- RLS policies can enforce tenant boundaries
- AI models can train per-tenant without data leakage

**Admin/Global Events:** Use `tenantId: null` for system-level events (e.g., admin user creation).

---

### Redaction Guidance

**When constructing event payloads:**

1. **Minimal Payload:** Include only essential fields needed for replay/audit
2. **No Secrets:** Never include credentials, tokens, or sensitive auth data
3. **Redact Sensitive Data:** Use placeholders for PII when not required
4. **Document Payload Schema:** Each event type should document its expected payload structure

**Example — User Created Event:**

```json
{
  "id": "uuid",
  "email": "user@example.com", // ✅ OK (needed for user identification)
  "emailVerified": false, // ✅ OK (audit trail)
  "passwordHash": "..." // ❌ NEVER INCLUDE
}
```

---

## Implementation Details

### File: `server/src/lib/events.ts`

**Exports:**

- **Types:**
  - `EventVersion` — `'v1'`
  - `EventRealm` — `'ADMIN' | 'TENANT'`
  - `ActorType` — `'ADMIN' | 'USER' | 'SYSTEM'`
  - `EventActor`, `EventEntity`, `EventMetadata`
  - `EventEnvelope` — Full envelope structure
  - `KnownEventName` — Union of P0 event names
  - `KnownEventEnvelope` — Envelope with known name

- **Functions:**
  - `makeEventName(domain, action)` — Construct event name with validation
  - `validateKnownEvent(e)` — Validate and parse event envelope
  - `assertNoSecretsInPayload(payload)` — Security guard (throws on secrets)

- **Schemas:**
  - `eventEnvelopeSchema` — Zod schema for envelope
  - `knownEventEnvelopeSchema` — Zod schema for known events

**Usage Example (Future Prompt #15+):**

```typescript
import { makeEventName, assertNoSecretsInPayload, KnownEventEnvelope } from './lib/events.js';

const payload = {
  id: tenant.id,
  slug: tenant.slug,
  name: tenant.name,
  // ... (no secrets)
};

// Guard against secrets
assertNoSecretsInPayload(payload);

// Construct event
const event: KnownEventEnvelope = {
  id: crypto.randomUUID(),
  version: 'v1',
  name: makeEventName('tenant', 'TENANT_CREATED_ORIGIN'),
  occurredAt: new Date().toISOString(),
  tenantId: tenant.id,
  realm: 'ADMIN',
  actor: { type: 'ADMIN', id: request.adminId },
  entity: { type: 'tenant', id: tenant.id },
  payload,
  metadata: { origin: true },
};

// Emit event (Prompt #15+)
// await emitEvent(event);
```

---

## Prompt #15 — Emission Strategy (P0)

**Status:** ✅ IMPLEMENTED  
**Date:** February 8, 2026

Events are now emitted automatically for P0 registry actions after successful audit log writes.

### Emission Architecture

**Source of Truth:** Audit logs remain the authoritative record. Events are derived sidecars.

**Hook Location:** `writeAuditLog()` in `server/src/lib/auditLog.ts`

After a successful audit log write, `maybeEmitEventFromAuditEntry()` is called to attempt event emission.

### Deterministic Event ID Strategy

**Event ID = Audit Log ID**

The event ID is deterministically derived by reusing the audit log row's UUID:

```typescript
event.id = createdAuditLogRow.id;
```

**Rationale:**

- ✅ **Deterministic:** Replay of audit logs produces identical event IDs
- ✅ **Stable:** No randomness, no external dependencies
- ✅ **Simple:** Zero additional infrastructure (no ID generator service)
- ✅ **Traceable:** Direct 1:1 mapping between audit log and event

### Best-Effort Non-Blocking Emission

Event emission is **best-effort** and **non-blocking**:

- ✅ If emission fails (validation error, secret detected), a warning is logged
- ✅ The original request continues successfully (audit log write succeeded)
- ❌ Emission failures do NOT break application flow

**Why:** In P0, event emission is a secondary concern. Audit logs are the source of truth. Once event storage is added (Prompt #16+), emission will become critical-path.

### Event Sink (P0: Console Logging)

**Current Sink:** `console.info()` with prefix `EVENT_EMIT`

Events are logged as single-line JSON:

```
EVENT_EMIT {"id":"123e4567-e89b-12d3-a456-426614174000","version":"v1","name":"tenant.TENANT_CREATED_ORIGIN",...}
```

**Why console logging:**

- ✅ Simple (no storage infrastructure needed in P0)
- ✅ Observable (logs visible in server output)
- ✅ Testable (verify emission by inspecting logs)

**Future:** Prompt #16+ will add event storage table, pub/sub, and consumers.

### P0 Event Emission Mapping

Only these audit actions emit events:

| Audit Action                      | Event Name                               | Origin? |
| --------------------------------- | ---------------------------------------- | ------- |
| `TENANT_CREATED_ORIGIN`           | `tenant.TENANT_CREATED_ORIGIN`           | Yes     |
| `TENANT_OWNER_CREATED`            | `tenant.TENANT_OWNER_CREATED`            | No      |
| `TENANT_OWNER_MEMBERSHIP_CREATED` | `tenant.TENANT_OWNER_MEMBERSHIP_CREATED` | No      |
| `TEAM_INVITE_CREATED`             | `team.TEAM_INVITE_CREATED`               | No      |

All other audit actions are silently ignored (no event emission).

### Event Building Process

For P0 actions, events are built deterministically from audit log rows:

1. **Event ID:** `event.id = auditLogRow.id` (deterministic, stable)
2. **Occurred At:** `event.occurredAt = auditLogRow.createdAt.toISOString()`
3. **Tenant ID / Realm:** `event.tenantId = auditLogRow.tenantId`, `event.realm = auditLogRow.realm`
4. **Actor:** Mapped from `auditLogRow.actorType` and `auditLogRow.actorId`
5. **Entity:** `event.entity = { type: auditLogRow.entity, id: auditLogRow.entityId }`
6. **Payload:** Extracted from `auditLogRow.afterJson` (or `{}` if null)
7. **Secret Guard:** `assertNoSecretsInPayload(payload)` throws if secrets detected
8. **Metadata:** `origin=true` if action ends with `_ORIGIN` or `metadataJson.origin === true`; copy `correlationId` and `causationId` if present
9. **Validation:** `validateKnownEvent(event)` ensures Zod schema compliance
10. **Emission:** `emitEventToSink(event)` writes to console

### Next Steps (Prompt #16+)

- ✅ Add event storage table (`audit_events`) for persistence
- ✅ Add event consumers and listeners
- ✅ Add event replay capabilities
- ✅ Add pub/sub for real-time event streaming
- ✅ Transition from "best-effort" to "critical-path" emission

---

## Out of Scope (Prompt #15)

The following are **NOT included** in Prompt #15:

- ❌ **Event Storage:** No database table for events (console logging only)
- ❌ **Event Consumers:** No consumers or listeners
- ❌ **Pub/Sub:** No message queue or event bus
- ❌ **Route Changes:** No modifications to existing routes
- ❌ **Schema Changes:** No Prisma schema modifications
- ❌ **Breaking Changes:** No changes to API response contracts

**Status:** Emission foundation complete. Ready for Prompt #16 (Event Storage & Consumers).

---

## Validation

### Type Safety

All event envelopes are validated at:

1. **Type Level:** TypeScript types enforce structure
2. **Runtime Level:** Zod schemas validate at runtime
3. **Security Level:** `assertNoSecretsInPayload()` prevents credential leaks

### Testing Checklist (Future)

- [ ] Event envelope validates with known event names
- [ ] Envelope validation rejects unknown event names
- [ ] Secret payload keys are detected and rejected
- [ ] Naming convention enforced (domain lowercase, action uppercase)
- [ ] ISO8601 timestamps validated
- [ ] UUID fields validated
- [ ] Metadata fields optional but validated when present

---

## Related Documentation

- [Audit Log Library](../src/lib/auditLog.ts) — Canonical audit writer (Prompt #15 will bridge audit → event)
- [P0_TENANT_PROVISIONING.md](./P0_TENANT_PROVISIONING.md) — Source of `TENANT_CREATED_ORIGIN`
- [P0_TENANT_ONBOARDING.md](./P0_TENANT_ONBOARDING.md) — Source of owner/membership events
- [P0_TEAM_INVITES.md](./P0_TEAM_INVITES.md) — Source of `TEAM_INVITE_CREATED`

---

## Future Roadmap

### Prompt #15: Event Emission from Audit Logs

- Bridge existing `writeAuditLog()` calls to emit events
- Add event storage table (audit_events)
- Maintain backward compatibility with audit_logs

### Prompt #16: Event Consumers

- Implement event listeners for AI pipelines
- Add event replay capabilities
- Build event projection for read models

### Prompt #17+: Advanced Event Features

- Event versioning (v2+ if needed)
- Event correlation chains
- Event-driven workflows

---

**Last Updated:** 2026-02-08  
**Phase:** P0 Doctrine v1.4 Foundation  
**Status:** ✅ Contract-Only Complete (No Emission Yet)
