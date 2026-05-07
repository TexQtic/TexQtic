/**
 * NetworkPoolService — TEXQTIC-NC-PHASE1-POOL-SERVICE-FOUNDATION-001
 *
 * Service foundation for Network Commerce pools (POOL entity type).
 *
 * Covers:
 *   createNetworkPool       — create a DRAFT pool (no SM transition; DRAFT is insertion state)
 *   openNetworkPool         — transition DRAFT → OPEN via StateMachineService (atomic)
 *   joinNetworkPool         — create NetworkPoolMembership (pool state gate: OPEN | AGGREGATING)
 *   getNetworkPoolById      — load pool scoped to owner org
 *   getNetworkPoolMembership — load membership scoped to member org
 *
 * Design decisions:
 *   - createNetworkPool does NOT call StateMachineService. Pool creation inserts the row at
 *     DRAFT directly. No lifecycle log entry is produced for the DRAFT insertion.
 *   - openNetworkPool calls StateMachineService.transition(DRAFT→OPEN) AND updates
 *     network_pools.lifecycle_state_id in a single atomic $transaction (shared-tx pattern,
 *     opts.db passed to SM so log write and entity update share one transaction boundary).
 *   - joinNetworkPool does NOT trigger a pool-level lifecycle transition. Membership creation
 *     is a MEMBERSHIP concern; pool-level state tracking is deferred to a later packet.
 *   - TTP, certification, and sanctions checks are deferred (not in this packet scope).
 *   - Owner membership auto-create is NOT in scope for this packet.
 *   - qtyUnit on membership is caller-supplied. Unit coherence against pool.qtyUnit is a
 *     caller responsibility; DB-level enforcement is deferred.
 *
 * D-017-A: orgId is ALWAYS from JWT/dbContext — never from caller body.
 */

import { randomUUID } from 'crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class NetworkPoolNotFoundError extends Error {
  constructor() {
    super('Network pool not found');
    this.name = 'NetworkPoolNotFoundError';
  }
}

export class NetworkPoolInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolInvalidInputError';
  }
}

export class NetworkPoolInvalidStateError extends Error {
  constructor(currentState: string, requiredStates: string[]) {
    super(
      `Pool is in state '${currentState}' — required: [${requiredStates.join(', ')}]`,
    );
    this.name = 'NetworkPoolInvalidStateError';
  }
}

export class NetworkPoolDuplicateMembershipError extends Error {
  constructor() {
    super('A membership for this organization already exists in this pool');
    this.name = 'NetworkPoolDuplicateMembershipError';
  }
}

export class NetworkPoolTransitionDeniedError extends Error {
  constructor(code: string, message: string) {
    super(`Lifecycle transition denied [${code}]: ${message}`);
    this.name = 'NetworkPoolTransitionDeniedError';
  }
}

export class NetworkPoolLifecycleStateMissingError extends Error {
  constructor(stateKey: string) {
    super(
      `POOL lifecycle state '${stateKey}' not found in lifecycle_states. ` +
      `Ensure the POOL lifecycle seed migration has been applied ` +
      `(TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001).`,
    );
    this.name = 'NetworkPoolLifecycleStateMissingError';
  }
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateNetworkPoolInput {
  /** Stable external reference for this pool. Unique per org. */
  pool_ref: string;
  /** Commodity category (e.g. COTTON_YARN, GREY_FABRIC). */
  commodity_category: string;
  /** Target aggregate quantity for this pool. Must be > 0. */
  target_qty: number;
  /** Unit of measure (e.g. KG, MT, METERS). */
  qty_unit: string;
  /** Optional: when the pool opens for member declaration. Must be < close_at if both supplied. */
  open_at?: string | null;
  /** Optional: when the pool closes for new declarations. */
  close_at?: string | null;
  /** Optional structured metadata (JSONB). */
  metadata?: Record<string, unknown> | null;
}

export interface OpenNetworkPoolInput {
  /** UUID of the pool to open. */
  pool_id: string;
  /** Actor user UUID (from JWT). Mutually exclusive with actor_admin_id. */
  actor_user_id?: string | null;
  /** Actor admin UUID. Mutually exclusive with actor_user_id. */
  actor_admin_id?: string | null;
  /** Actor type classification (D-020-A). */
  actor_type: 'TENANT_USER' | 'TENANT_ADMIN' | 'PLATFORM_ADMIN' | 'SYSTEM_AUTOMATION' | 'MAKER' | 'CHECKER';
  /** Membership role snapshot at time of call. */
  actor_role: string;
  /** Mandatory transition justification (D-020-D). */
  reason: string;
  /** Fastify request ID for correlation. */
  request_id?: string | null;
}

export interface JoinNetworkPoolInput {
  /** UUID of the pool to join. */
  pool_id: string;
  /** Quantity the member is declaring for this pool. Must be > 0. */
  declared_qty: number;
  /** Unit of measure for the declared quantity. */
  qty_unit: string;
}

// ─── Record Types ─────────────────────────────────────────────────────────────

export interface NetworkPoolRecord {
  id: string;
  org_id: string;
  pool_ref: string;
  commodity_category: string;
  target_qty: string;
  qty_unit: string;
  lifecycle_state_id: string;
  /** Present when the pool was loaded with lifecycleState included; null otherwise. */
  lifecycle_state_key: string | null;
  open_at: string | null;
  close_at: string | null;
  allocated_at: string | null;
  settled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkPoolMembershipRecord {
  id: string;
  pool_id: string;
  org_id: string;
  declared_qty: string;
  qty_unit: string;
  allocated_qty: string | null;
  allocation_pct: string | null;
  status: string;
  joined_at: string;
  approved_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class NetworkPoolService {
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
  ) {}

  // ── Private helpers ───────────────────────────────────────────────────────

  private toPoolRecord(row: Record<string, unknown>): NetworkPoolRecord {
    return {
      id:                 String(row['id']),
      org_id:             String(row['orgId']),
      pool_ref:           String(row['poolRef']),
      commodity_category: String(row['commodityCategory']),
      target_qty:         String(row['targetQty']),
      qty_unit:           String(row['qtyUnit']),
      lifecycle_state_id: String(row['lifecycleStateId']),
      lifecycle_state_key:
        row['lifecycleState'] != null
          ? String((row['lifecycleState'] as Record<string, unknown>)['stateKey'])
          : null,
      open_at:            row['openAt'] ? (row['openAt'] as Date).toISOString() : null,
      close_at:           row['closeAt'] ? (row['closeAt'] as Date).toISOString() : null,
      allocated_at:       row['allocatedAt'] ? (row['allocatedAt'] as Date).toISOString() : null,
      settled_at:         row['settledAt'] ? (row['settledAt'] as Date).toISOString() : null,
      metadata:           row['metadata'] != null
                            ? (row['metadata'] as Record<string, unknown>)
                            : null,
      created_by_user_id: row['createdByUserId'] ? String(row['createdByUserId']) : null,
      created_at:         (row['createdAt'] as Date).toISOString(),
      updated_at:         (row['updatedAt'] as Date).toISOString(),
    };
  }

  private toMembershipRecord(row: Record<string, unknown>): NetworkPoolMembershipRecord {
    return {
      id:             String(row['id']),
      pool_id:        String(row['poolId']),
      org_id:         String(row['orgId']),
      declared_qty:   String(row['declaredQty']),
      qty_unit:       String(row['qtyUnit']),
      allocated_qty:  row['allocatedQty'] ? String(row['allocatedQty']) : null,
      allocation_pct: row['allocationPct'] ? String(row['allocationPct']) : null,
      status:         String(row['status']),
      joined_at:      (row['joinedAt'] as Date).toISOString(),
      approved_at:    row['approvedAt'] ? (row['approvedAt'] as Date).toISOString() : null,
      withdrawn_at:   row['withdrawnAt'] ? (row['withdrawnAt'] as Date).toISOString() : null,
      created_at:     (row['createdAt'] as Date).toISOString(),
      updated_at:     (row['updatedAt'] as Date).toISOString(),
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validateCreateInput(input: CreateNetworkPoolInput): void {
    if (!input.pool_ref || input.pool_ref.trim() === '') {
      throw new NetworkPoolInvalidInputError('pool_ref is required');
    }
    if (!input.commodity_category || input.commodity_category.trim() === '') {
      throw new NetworkPoolInvalidInputError('commodity_category is required');
    }
    if (!input.qty_unit || input.qty_unit.trim() === '') {
      throw new NetworkPoolInvalidInputError('qty_unit is required');
    }
    if (
      typeof input.target_qty !== 'number' ||
      !Number.isFinite(input.target_qty) ||
      input.target_qty <= 0
    ) {
      throw new NetworkPoolInvalidInputError(
        'target_qty must be a positive number greater than zero',
      );
    }
    if (input.open_at && input.close_at) {
      const openTs  = new Date(input.open_at).getTime();
      const closeTs = new Date(input.close_at).getTime();
      if (!Number.isFinite(openTs)) {
        throw new NetworkPoolInvalidInputError('open_at is not a valid date');
      }
      if (!Number.isFinite(closeTs)) {
        throw new NetworkPoolInvalidInputError('close_at is not a valid date');
      }
      if (openTs >= closeTs) {
        throw new NetworkPoolInvalidInputError('open_at must be before close_at');
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Create a new NetworkPool in DRAFT state.
   *
   * No StateMachine call — DRAFT is the initial creation state, not a lifecycle transition.
   * Owner membership creation is deferred to a later packet.
   *
   * @param orgId  - Owner org (from JWT/dbContext — D-017-A).
   * @param userId - Creator user ID (nullable for system-created pools).
   * @param input  - Pool creation data.
   * @returns      NetworkPoolRecord for the newly created pool.
   */
  async createNetworkPool(
    orgId: string,
    userId: string | null,
    input: CreateNetworkPoolInput,
  ): Promise<NetworkPoolRecord> {
    // 1. Validate input — throws on first failure
    this.validateCreateInput(input);

    // 2. Resolve POOL DRAFT lifecycle state ID from lifecycle_states seed
    const draftState = await this.db.lifecycleState.findUnique({
      where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'DRAFT' } },
      select: { id: true, stateKey: true },
    });
    if (!draftState) {
      throw new NetworkPoolLifecycleStateMissingError('DRAFT');
    }

    // 3. Insert DRAFT pool — no SM transition, no lifecycle log entry
    const row = await this.db.networkPool.create({
      data: {
        id:               randomUUID(),
        orgId,
        poolRef:           input.pool_ref.trim(),
        commodityCategory: input.commodity_category.trim(),
        targetQty:         input.target_qty,
        qtyUnit:           input.qty_unit.trim(),
        lifecycleStateId:  draftState.id,
        openAt:            input.open_at  ? new Date(input.open_at)  : null,
        closeAt:           input.close_at ? new Date(input.close_at) : null,
        metadata:          (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        createdByUserId:   userId ?? null,
      },
    });

    return this.toPoolRecord({ ...row, lifecycleState: { stateKey: draftState.stateKey } });
  }

  /**
   * Transition a NetworkPool from DRAFT → OPEN via StateMachineService.
   *
   * Atomic: StateMachine lifecycle log write and network_pools.lifecycle_state_id update
   * share a single $transaction (shared-tx pattern — opts.db passed to SM.transition).
   *
   * The POOL OPEN lifecycle state must exist in lifecycle_states (seeded by
   * TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001).
   *
   * @param orgId  - Owner org (from JWT/dbContext). Pool must belong to this org.
   * @param input  - Transition context: pool_id, actor, reason.
   * @returns      NetworkPoolRecord reflecting the OPEN state.
   */
  async openNetworkPool(
    orgId: string,
    input: OpenNetworkPoolInput,
  ): Promise<NetworkPoolRecord> {
    // 1. Load pool with current lifecycle state key (owner-scoped)
    const poolRow = await this.db.networkPool.findFirst({
      where:   { id: input.pool_id, orgId },
      include: { lifecycleState: { select: { stateKey: true } } },
    });

    if (!poolRow) throw new NetworkPoolNotFoundError();

    const currentStateKey: string = poolRow.lifecycleState?.stateKey ?? '';
    if (currentStateKey !== 'DRAFT') {
      throw new NetworkPoolInvalidStateError(currentStateKey, ['DRAFT']);
    }

    // 2. Resolve POOL OPEN state ID — fail fast outside tx if seed is absent
    const openState = await this.db.lifecycleState.findUnique({
      where: { entityType_stateKey: { entityType: 'POOL', stateKey: 'OPEN' } },
      select: { id: true, stateKey: true },
    });
    if (!openState) {
      throw new NetworkPoolLifecycleStateMissingError('OPEN');
    }

    // 3. Atomic: SM lifecycle log write + pool state update
    //    opts.db passes tx to SM so both writes share one transaction boundary.
    const updatedRow = await this.db.$transaction(async (tx) => {
      const smResult = await this.stateMachine.transition(
        {
          entityType:  'POOL',
          entityId:    input.pool_id,
          orgId,
          fromStateKey: 'DRAFT',
          toStateKey:   'OPEN',
          actorType:    input.actor_type,
          actorUserId:  input.actor_user_id ?? null,
          actorAdminId: input.actor_admin_id ?? null,
          actorRole:    input.actor_role,
          reason:       input.reason,
          requestId:    input.request_id ?? null,
        },
        { db: tx as unknown as PrismaClient },
      );

      if (smResult.status !== 'APPLIED') {
        const denied = smResult as { status: string; code?: string; message?: string };
        throw new NetworkPoolTransitionDeniedError(
          denied.code ?? smResult.status,
          denied.message ?? `SM returned status '${smResult.status}'`,
        );
      }

      const updated = await (tx as any).networkPool.update({
        where: { id: input.pool_id },
        data: {
          lifecycleStateId: openState.id,
          updatedAt:        new Date(),
        },
      });

      return updated;
    });

    return this.toPoolRecord({ ...updatedRow, lifecycleState: { stateKey: 'OPEN' } });
  }

  /**
   * Join a NetworkPool as a member organization.
   *
   * Pool must be in OPEN or AGGREGATING state.
   * Creates a NetworkPoolMembership in PENDING status.
   * No pool-level lifecycle transition — membership events are tracked in a later packet.
   * TTP, certification, and sanctions checks are deferred.
   *
   * @param memberOrgId - Joining organization (from JWT/dbContext — D-017-A).
   * @param userId      - User performing the join (nullable).
   * @param input       - Membership declaration data.
   * @returns           NetworkPoolMembershipRecord in PENDING status.
   */
  async joinNetworkPool(
    memberOrgId: string,
    _userId: string | null,
    input: JoinNetworkPoolInput,
  ): Promise<NetworkPoolMembershipRecord> {
    // 1. Validate inputs before any DB call
    if (
      typeof input.declared_qty !== 'number' ||
      !Number.isFinite(input.declared_qty) ||
      input.declared_qty <= 0
    ) {
      throw new NetworkPoolInvalidInputError(
        'declared_qty must be a positive number greater than zero',
      );
    }
    if (!input.qty_unit || input.qty_unit.trim() === '') {
      throw new NetworkPoolInvalidInputError('qty_unit is required');
    }

    // 2. Load pool (not owner-scoped — any authenticated org can read pool for joining)
    const poolRow = await this.db.networkPool.findFirst({
      where:   { id: input.pool_id },
      include: { lifecycleState: { select: { stateKey: true } } },
    });

    if (!poolRow) throw new NetworkPoolNotFoundError();

    const poolStateKey: string = poolRow.lifecycleState?.stateKey ?? '';
    const joinableStates = ['OPEN', 'AGGREGATING'];
    if (!joinableStates.includes(poolStateKey)) {
      throw new NetworkPoolInvalidStateError(poolStateKey, joinableStates);
    }

    // 3. Duplicate membership check
    const existing = await this.db.networkPoolMembership.findFirst({
      where:  { poolId: input.pool_id, orgId: memberOrgId },
      select: { id: true },
    });
    if (existing) throw new NetworkPoolDuplicateMembershipError();

    // 4. Create membership in PENDING status
    const membershipRow = await this.db.networkPoolMembership.create({
      data: {
        id:          randomUUID(),
        poolId:      input.pool_id,
        orgId:       memberOrgId,
        declaredQty: input.declared_qty,
        qtyUnit:     input.qty_unit.trim(),
        status:      'PENDING',
        joinedAt:    new Date(),
      },
    });

    return this.toMembershipRecord(membershipRow);
  }

  /**
   * Fetch a NetworkPool by ID, scoped to the owner org.
   *
   * @param orgId - Owner org (from JWT/dbContext).
   * @param id    - Pool UUID.
   * @returns     NetworkPoolRecord or null if not found within this org's scope.
   */
  async getNetworkPoolById(
    orgId: string,
    id: string,
  ): Promise<NetworkPoolRecord | null> {
    const row = await this.db.networkPool.findFirst({
      where:   { id, orgId },
      include: { lifecycleState: { select: { stateKey: true } } },
    });
    if (!row) return null;
    return this.toPoolRecord(row);
  }

  /**
   * Fetch a NetworkPoolMembership for a given member org in a pool.
   *
   * @param memberOrgId - Member org (from JWT/dbContext).
   * @param poolId      - Pool UUID.
   * @returns           NetworkPoolMembershipRecord or null if not found.
   */
  async getNetworkPoolMembership(
    memberOrgId: string,
    poolId: string,
  ): Promise<NetworkPoolMembershipRecord | null> {
    const row = await this.db.networkPoolMembership.findFirst({
      where: { poolId, orgId: memberOrgId },
    });
    if (!row) return null;
    return this.toMembershipRecord(row);
  }
}
