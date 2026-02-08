# Doctrine v1.4 — Event Contracts Starter

**Status:** ✅ STORAGE ACTIVE (EventLog table, best-effort persistence)  
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

## Prompt #16 — First-Class Event Storage

**Status:** ✅ IMPLEMENTED  
**Date:** February 8, 2026

Events are now persisted to a dedicated EventLog table for first-class storage.

### Why EventLog Exists

**Doctrine principles require events to be:**

1. **First-class entities** — Not nested in audit metadata, but stored as independent, queryable records
2. **Immutable** — Append-only, never UPDATE or DELETE
3. **Regulator-ready** — Structured, indexed, and traceable for compliance queries
4. **Replay-safe** — Deterministic IDs enable idempotent replay

**Separation from Audit Logs:**

- **Audit logs** = Internal operational record (mutable concerns like RLS enforcement)
- **Event logs** = External regulator/AI-facing record (strict immutability, versioned contracts)

### EventLog Schema

**Table:** `event_logs`

**Fields:**

| Field          | Type        | Description                                   |
| -------------- | ----------- | --------------------------------------------- |
| `id`           | UUID (PK)   | Event ID (deterministic, = audit.id)          |
| `version`      | String      | Event envelope version ('v1')                 |
| `name`         | String      | Event name (domain.ACTION)                    |
| `occurredAt`   | Timestamptz | When event occurred                           |
| `tenantId`     | UUID?       | Tenant isolation (null for admin/global)      |
| `realm`        | String      | ADMIN or TENANT                               |
| `actorType`    | String      | ADMIN, USER, or SYSTEM                        |
| `actorId`      | UUID?       | Actor UUID (null for SYSTEM)                  |
| `entityType`   | String      | Entity type (tenant, user, invite, etc.)      |
| `entityId`     | UUID        | Entity UUID                                   |
| `payloadJson`  | JSON?       | Event-specific data (no secrets)              |
| `metadataJson` | JSON?       | origin, correlationId, causationId            |
| `auditLogId`   | UUID UNIQUE | Traceability link back to audit log           |
| `createdAt`    | Timestamptz | DB insertion time (immutable, auto-generated) |

**Indexes:**

- `(tenantId, occurredAt)` — Tenant-scoped queries
- `(name, occurredAt)` — Event type queries
- `(entityType, entityId)` — Entity-centric queries

### Deterministic Linkage

**Invariants (maintained throughout P0):**

```
event.id === audit.id === EventLog.id
EventLog.auditLogId === audit.id
event.occurredAt === audit.createdAt
```

**Why reuse audit.id:**

- ✅ **Deterministic** — Replay produces identical event IDs
- ✅ **Traceable** — Direct 1:1 mapping between audit and event
- ✅ **Simple** — No external ID generator service needed
- ✅ **Idempotent** — Duplicate storage attempts safely ignored (unique violation)

### Storage Architecture

**Hook Location:** `writeAuditLog()` in `server/src/lib/auditLog.ts`

**Flow:**

1. **Create audit log row** (source of truth)
2. **Build event envelope** (from audit row, deterministic)
3. **Validate event** (Zod + secret guards)
4. **Emit to sink** (EVENT_EMIT console log)
5. **Store to EventLog** (best-effort, non-blocking) ← **NEW in Prompt #16**

**Best-Effort Persistence:**

Event storage failures are **non-blocking**:

- ✅ Unique violations (P2002) → Safely ignored (event already stored)
- ✅ Other errors → Warning logged, request continues
- ❌ Storage failures do NOT break application flow

**Why best-effort:**

- Audit logs remain source of truth
- Event storage is secondary concern in P0
- Future prompts will harden (e.g., retry, dead-letter queue)

### Storage Implementation

**Function:** `storeEventBestEffort()` in `server/src/lib/events.ts`

**Signature:**

```typescript
export async function storeEventBestEffort(
  prisma: PrismaClient,
  event: KnownEventEnvelope,
  auditLogId: string
): Promise<void>;
```

**Mapping (event → EventLog):**

```typescript
{
  id: event.id,                    // Deterministic
  version: event.version,           // 'v1'
  name: event.name,                 // domain.ACTION
  occurredAt: new Date(event.occurredAt),
  tenantId: event.tenantId,
  realm: event.realm,
  actorType: event.actor.type,
  actorId: event.actor.id,
  entityType: event.entity.type,
  entityId: event.entity.id,
  payloadJson: event.payload,
  metadataJson: event.metadata,
  auditLogId,                       // Traceability
}
```

---

## Prompt #17 — Compatibility Mappings (Legacy Audit Actions)

**Status:** ✅ IMPLEMENTED  
**Date:** February 8, 2026

Events are now emitted and stored for legacy/production audit action names.

### Why Compatibility Mappings Exist

In production, some routes use **legacy audit action names** that predate Doctrine v1.4 naming conventions:

- Legacy: `CREATE_TENANT` (production code)
- Doctrine: `TENANT_CREATED_ORIGIN` (Prompt #15 standard)

Rather than changing all routes immediately (risky, requires testing), Prompt #17 adds **compatibility mappings** in the event emission layer.

**Result:** Legacy audit actions now emit Doctrine-compliant events without touching route code.

### Compatibility Mappings Added

Two legacy action names now emit P0 events:

| Legacy Audit Action | Doctrine Event Name            | Origin? |
| ------------------- | ------------------------------ | ------- |
| `CREATE_TENANT`     | `tenant.TENANT_CREATED_ORIGIN` | Yes ✅  |
| `INVITE_MEMBER`     | `team.TEAM_INVITE_CREATED`     | No      |

**Implementation:** Updated `AUDIT_ACTION_TO_EVENT_NAME` mapping in `server/src/lib/events.ts`.

### Origin Semantics Preserved

For `CREATE_TENANT`, the emitted event correctly has:

- `name = 'tenant.TENANT_CREATED_ORIGIN'` (origin event)
- `metadata.origin = true` (genesis marker)

**Implementation:** Added explicit origin detection for `CREATE_TENANT` action in event builder:

```typescript
const isOriginByLegacyAction = auditLogRow.action === 'CREATE_TENANT';
if (isOriginByName || isOriginByMetadata || isOriginByLegacyAction) {
  metadata.origin = true;
}
```

### Verification Queries

After triggering a tenant creation or team invite action, use these SQL queries to verify event storage:

**1. Check audit log entry:**

```sql
SELECT created_at, action, entity, tenant_id, entity_id
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Recent row with `action = 'CREATE_TENANT'` or `action = 'INVITE_MEMBER'`

**2. Check corresponding event:**

```sql
SELECT name, occurred_at, tenant_id, entity_type, entity_id, audit_log_id
FROM event_logs
ORDER BY occurred_at DESC
LIMIT 10;
```

**Expected outcomes:**

- `audit_logs.action = 'CREATE_TENANT'` → `event_logs.name = 'tenant.TENANT_CREATED_ORIGIN'`
- `audit_logs.action = 'INVITE_MEMBER'` → `event_logs.name = 'team.TEAM_INVITE_CREATED'`

**3. Verify origin semantics:**

```sql
SELECT name, metadata_json->>'origin' AS is_origin
FROM event_logs
WHERE name = 'tenant.TENANT_CREATED_ORIGIN'
ORDER BY occurred_at DESC
LIMIT 5;
```

**Expected:** `is_origin = 'true'` for all `TENANT_CREATED_ORIGIN` events (regardless of source action name)

---

## Remote-First Verification (Prompt #18)

### Source of Truth Principle

**Remote Supabase is the source of truth** for all event pipeline verification.

These scripts prove DB identity before making any claims about pipeline health. This eliminates guesswork about whether you're testing against local vs. remote databases.

### Verification Scripts

**Location:** `server/scripts/`

#### 1. DB Identity Probe (`db-whoami.ts`)

Prints the exact database identity (server IP/port, database name, user, timestamp) to prove which database is being queried.

**Usage:**

```bash
cd server
npx tsx scripts/db-whoami.ts
```

**Expected Output:**

```
DB_WHOAMI {"server_ip":"13.210.xxx.xxx","server_port":5432,"db":"postgres","user":"postgres.xxxxx","now":"2026-02-08T..."}
```

**On Error:**

```
DB_WHOAMI_ERROR <error message>
```

Exit code: 1

#### 2. Event Pipeline Verifier (`verify-event-pipeline.ts`)

Runs a comprehensive health check of the audit → event_logs pipeline:

1. **DB Identity** — Confirms which database is being queried
2. **Table Existence** — Verifies `audit_logs` and `event_logs` tables exist
3. **Row Counts** — Shows total audit/event counts
4. **Latest Audit** — Displays most recent audit log entry
5. **Latest Event** — Displays most recent event log entry
6. **Mapping Check** — Validates that mapped audit actions have corresponding events

**Usage:**

```bash
cd server
npx tsx scripts/verify-event-pipeline.ts
```

**Expected Output (Happy Path):**

```
=== DB Identity Check ===
VERIFY_DB {"server_ip":"...","server_port":5432,"db":"postgres","user":"..."}

=== Table Existence Check ===
✓ audit_logs exists
✓ event_logs exists

=== Table Counts ===
VERIFY_COUNTS {"audit_count":25,"event_count":4}

=== Latest Audit Log ===
VERIFY_LATEST_AUDIT {"id":"...","created_at":"...","action":"CREATE_TENANT","realm":"ADMIN",...}

=== Latest Event Log ===
VERIFY_LATEST_EVENT {"id":"...","name":"tenant.TENANT_CREATED_ORIGIN","occurred_at":"...",...}

=== Mapping Check ===
✓ Latest action "CREATE_TENANT" is mapped, checking for event...
✓ Event found: tenant.TENANT_CREATED_ORIGIN (id: ...)
VERIFY_PASS Event stored for mapped audit action
```

**Exit code:** 0

### Understanding Verification Results

#### `VERIFY_NOTE` — Not a Failure

```
VERIFY_NOTE Latest audit action "AI_BUDGET_VERIFY" is not mapped; no event emission expected
```

**Meaning:** The latest audit action is not one of the P0 mapped actions. This is **not an error** — event emission is only enabled for specific actions.

**Mapped Actions (Prompt #17):**

- `CREATE_TENANT` → `tenant.TENANT_CREATED_ORIGIN`
- `INVITE_MEMBER` → `team.TEAM_INVITE_CREATED`
- `TENANT_CREATED_ORIGIN` → `tenant.TENANT_CREATED_ORIGIN`
- `TENANT_OWNER_CREATED` → `tenant.TENANT_OWNER_CREATED`
- `TENANT_OWNER_MEMBERSHIP_CREATED` → `tenant.TENANT_OWNER_MEMBERSHIP_CREATED`
- `TEAM_INVITE_CREATED` → `team.TEAM_INVITE_CREATED`

**Action Required:** None. Trigger a P0 action (tenant creation or team invite) to test the pipeline.

#### `VERIFY_FAIL` — Pipeline Issue Detected

```
VERIFY_FAIL Mapped audit action detected but no EventLog row found for audit_log_id "..."
```

**Meaning:** A mapped audit action was found, but no corresponding event was stored. This indicates one of:

1. **Backend not running Prompt #15-17 code** — Server needs restart with latest commits
2. **Event storage failing** — Check server logs for errors in `storeEventBestEffort()`
3. **Emission disabled** — Verify event emission code is active

**Troubleshooting Steps:**

1. Restart backend server: `cd server && npm run dev`
2. Check server logs for `EVENT_EMIT` console output
3. Check for errors mentioning `storeEventBestEffort` or `maybeEmitEventFromAuditEntry`
4. Verify `server/.env` DATABASE_URL points to remote Supabase
5. Confirm migration `20260208054130_add_event_log` is applied: `npx prisma migrate status`

#### `VERIFY_PASS` — Pipeline Healthy

```
VERIFY_PASS Event stored for mapped audit action
```

**Meaning:** ✅ The event pipeline is working correctly. Audit logs are triggering event emission, and events are being stored in `event_logs`.

### When to Use These Scripts

**Use `db-whoami.ts` when:**

- Verifying .env configuration (local vs remote DB)
- Debugging "wrong database" issues
- Confirming migration target before `prisma migrate dev`
- Sharing DB connection details in bug reports

**Use `verify-event-pipeline.ts` when:**

- Testing end-to-end event emission after code changes
- Verifying Prompt #15-17 implementation
- Diagnosing "events not appearing" issues
- Confirming pipeline health after backend restart

### Temporary Nature

**This is an interim compatibility layer.**

Future work will standardize route-level audit action names to match Doctrine conventions, at which point these mappings can be deprecated. Until then, both legacy and Doctrine-aligned action names emit the same events.

---

### Out of Scope (Prompt #17)

The following are **NOT included** in Prompt #17:

- ❌ **Route Changes:** No modifications to existing routes (legacy action names preserved)
- ❌ **Additional Mappings:** Only the two P0 actions mapped (CREATE_TENANT, INVITE_MEMBER)
- ❌ **Schema Changes:** No Prisma schema modifications
- ❌ **Endpoint Changes:** No API contract changes

**Status:** Compatibility layer complete. Legacy production routes now emit Doctrine v1.4 events.

---

### Out of Scope (Prompt #16)

The following are **NOT included** in Prompt #16:

- ❌ **Read Endpoints:** No API routes for querying EventLog (Prompt #17+)
- ❌ **Event Consumers:** No listeners or reactive workflows
- ❌ **Replay UI:** No admin interface for event replay
- ❌ **Pub/Sub:** No message queue integration
- ❌ **Critical-Path Emission:** Still best-effort (not blocking requests)
- ❌ **Route Changes:** No modifications to existing routes
- ❌ **RLS Policies:** EventLog has no RLS yet (admin-accessible for now)

**Status:** Storage foundation complete. Ready for Prompt #17 (Admin Query Endpoint).

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
