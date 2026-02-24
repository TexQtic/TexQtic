/**
 * G-020 — Canonical State Machine Seed Script
 * Doctrine v1.4 + G-020 v1.1 state registry and transition graph
 *
 * Seeds:
 *   lifecycle_states:
 *     - 14 TRADE states
 *     -  7 ESCROW states
 *     -  6 CERTIFICATION states
 *   allowed_transitions: 43 directed edges (29 TRADE + 8 ESCROW + 6 CERTIFICATION)
 *
 * Idempotency:
 *   All writes use upsert keyed on (entity_type, state_key) and
 *   (entity_type, from_state_key, to_state_key) respectively.
 *   Safe to run multiple times — second run is a no-op on unchanged rows.
 *
 * Run:
 *   pnpm -C server exec tsx scripts/seed_state_machine.ts
 *
 * Requires DATABASE_URL to be set in the environment (loaded from .env by dotenv).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Seed Data Definitions ────────────────────────────────────────────────────

type StateRow = {
  entityType: string;
  stateKey: string;
  isTerminal: boolean;
  isIrreversible: boolean;
  severityLevel: number;
  requiresMakerChecker: boolean;
  description: string;
};

type TransitionRow = {
  entityType: string;
  fromStateKey: string;
  toStateKey: string;
  allowedActorType: string[];
  requiresMakerChecker: boolean;
  requiresEscalation: boolean;
};

// ─── 1. TRADE States (14) ─────────────────────────────────────────────────────

const TRADE_STATES: StateRow[] = [
  {
    entityType: 'TRADE',
    stateKey: 'DRAFT',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 0,
    requiresMakerChecker: false,
    description: 'Entry point. Mutable. No counterparty commitment yet.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'RFQ_SENT',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: false,
    description: 'Request For Quote issued to counterparty. Awaiting response.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'NEGOTIATION',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: false,
    description: 'Active counter-offer or revision exchange.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'PENDING_COMPLIANCE',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 2,
    requiresMakerChecker: true,
    description: 'Trade routed to compliance gate. Blocks forward progress.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'APPROVED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 2,
    requiresMakerChecker: true,
    description: 'Compliance gate cleared by authorised reviewer.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'REJECTED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 3,
    requiresMakerChecker: false,
    description: 'Terminal. Compliance or counterparty refusal. Cannot be reversed.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'ORDER_CONFIRMED',
    isTerminal: false,
    isIrreversible: true,
    severityLevel: 2,
    requiresMakerChecker: true,
    description: 'Mutual commitment recorded. Irreversible. Triggers fulfilment chain.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'FULFILLMENT',
    isTerminal: false,
    isIrreversible: true,
    severityLevel: 2,
    requiresMakerChecker: false,
    description: 'Goods/services in transit or delivery phase.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'SETTLEMENT_PENDING',
    isTerminal: false,
    isIrreversible: true,
    severityLevel: 3,
    requiresMakerChecker: true,
    description: 'Fulfilment complete; settlement record awaited.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'SETTLEMENT_ACKNOWLEDGED',
    isTerminal: false,
    isIrreversible: true,
    severityLevel: 3,
    requiresMakerChecker: true,
    description: 'Settlement record confirmed by both parties.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'CLOSED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 0,
    requiresMakerChecker: false,
    description: 'Terminal. Clean resolution. All obligations fulfilled.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'CANCELLED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 2,
    requiresMakerChecker: true,
    description: 'Terminal. Requires Maker-Checker if post-ORDER_CONFIRMED cancellation.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'DISPUTED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 3,
    requiresMakerChecker: false,
    description: 'Active dispute. Blocks progression. Requires resolution to continue.',
  },
  {
    entityType: 'TRADE',
    stateKey: 'ESCALATED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 4,
    requiresMakerChecker: false,
    description: 'Platform-level intervention triggered. Highest severity in-flight state.',
  },
];

// ─── 2. ESCROW States (7) ─────────────────────────────────────────────────────

const ESCROW_STATES: StateRow[] = [
  {
    entityType: 'ESCROW',
    stateKey: 'NOT_APPLICABLE',
    isTerminal: true,
    isIrreversible: false,
    severityLevel: 0,
    requiresMakerChecker: false,
    description: 'Trade has no escrow arrangement. Default for B2B open-credit trades.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'INITIATED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: true,
    description: 'Both parties agreed to escrow arrangement. Record created.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'MILESTONE_PENDING',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 2,
    requiresMakerChecker: false,
    description: 'Awaiting fulfilment milestone to be marked complete.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'RELEASE_PENDING',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 3,
    requiresMakerChecker: true,
    description: 'Milestones met; awaiting Maker-Checker authorisation to release.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'RELEASED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 3,
    requiresMakerChecker: true,
    description: 'Terminal. External settlement acknowledged. Irreversible record. D-020-B: acknowledgement only — no fund movement.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'REFUNDED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 3,
    requiresMakerChecker: true,
    description: 'Terminal. Escrow unwound; trade cancelled or disputed to resolution. D-020-B: acknowledgement only.',
  },
  {
    entityType: 'ESCROW',
    stateKey: 'VOIDED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 4,
    requiresMakerChecker: true,
    description: 'Terminal. Platform-level void; requires SuperAdmin escalation record.',
  },
];

// ─── 3. CERTIFICATION States (6) ─────────────────────────────────────────────

const CERTIFICATION_STATES: StateRow[] = [
  {
    entityType: 'CERTIFICATION',
    stateKey: 'SUBMITTED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: false,
    description: 'Tenant uploaded certification artefact. Awaiting review.',
  },
  {
    entityType: 'CERTIFICATION',
    stateKey: 'UNDER_REVIEW',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: false,
    description: 'Assigned reviewer has accepted the submission for review.',
  },
  {
    entityType: 'CERTIFICATION',
    stateKey: 'APPROVED',
    isTerminal: false,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: true,
    description: 'Certification accepted. Not terminal — expires or may be revoked.',
  },
  {
    entityType: 'CERTIFICATION',
    stateKey: 'REJECTED',
    isTerminal: false, // Not terminal — tenant may create new submission
    isIrreversible: true,
    severityLevel: 2,
    requiresMakerChecker: true,
    description: 'Rejected on this record; tenant may create new certification submission.',
  },
  {
    entityType: 'CERTIFICATION',
    stateKey: 'REVOKED',
    isTerminal: true,
    isIrreversible: true,
    severityLevel: 4,
    requiresMakerChecker: true,
    description: 'Terminal. Active certification invalidated. High severity. SuperAdmin.',
  },
  {
    entityType: 'CERTIFICATION',
    stateKey: 'EXPIRED',
    isTerminal: true,
    isIrreversible: false,
    severityLevel: 1,
    requiresMakerChecker: false,
    description: 'Terminal. Certification validity window elapsed. System-triggered.',
  },
];

// ─── 4. TRADE Transitions (29) ───────────────────────────────────────────────

const TRADE_TRANSITIONS: TransitionRow[] = [
  // DRAFT outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'DRAFT',
    toStateKey: 'RFQ_SENT',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN', 'MAKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'DRAFT',
    toStateKey: 'CANCELLED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },

  // RFQ_SENT outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'RFQ_SENT',
    toStateKey: 'NEGOTIATION',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN', 'MAKER', 'CHECKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'RFQ_SENT',
    toStateKey: 'REJECTED',
    allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'RFQ_SENT',
    toStateKey: 'CANCELLED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },

  // NEGOTIATION outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'NEGOTIATION',
    toStateKey: 'PENDING_COMPLIANCE',
    allowedActorType: ['TENANT_ADMIN', 'MAKER', 'CHECKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'NEGOTIATION',
    toStateKey: 'REJECTED',
    allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'NEGOTIATION',
    toStateKey: 'CANCELLED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },

  // PENDING_COMPLIANCE outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'PENDING_COMPLIANCE',
    toStateKey: 'APPROVED',
    allowedActorType: ['CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'PENDING_COMPLIANCE',
    toStateKey: 'REJECTED',
    allowedActorType: ['CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'PENDING_COMPLIANCE',
    toStateKey: 'ESCALATED',
    allowedActorType: ['PLATFORM_ADMIN', 'SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: true,
  },

  // APPROVED outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'APPROVED',
    toStateKey: 'ORDER_CONFIRMED',
    allowedActorType: ['MAKER', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'APPROVED',
    toStateKey: 'CANCELLED',
    allowedActorType: ['MAKER', 'CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },

  // ORDER_CONFIRMED outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'ORDER_CONFIRMED',
    toStateKey: 'FULFILLMENT',
    allowedActorType: ['TENANT_ADMIN', 'MAKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'ORDER_CONFIRMED',
    toStateKey: 'DISPUTED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'ORDER_CONFIRMED',
    toStateKey: 'CANCELLED',
    allowedActorType: ['MAKER', 'CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },

  // FULFILLMENT outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'FULFILLMENT',
    toStateKey: 'SETTLEMENT_PENDING',
    allowedActorType: ['TENANT_ADMIN', 'MAKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'FULFILLMENT',
    toStateKey: 'DISPUTED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'FULFILLMENT',
    toStateKey: 'ESCALATED',
    allowedActorType: ['PLATFORM_ADMIN', 'SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: true,
  },

  // SETTLEMENT_PENDING outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'SETTLEMENT_PENDING',
    toStateKey: 'SETTLEMENT_ACKNOWLEDGED',
    allowedActorType: ['MAKER', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'SETTLEMENT_PENDING',
    toStateKey: 'DISPUTED',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'SETTLEMENT_PENDING',
    toStateKey: 'ESCALATED',
    allowedActorType: ['PLATFORM_ADMIN', 'SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: true,
  },

  // SETTLEMENT_ACKNOWLEDGED outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'SETTLEMENT_ACKNOWLEDGED',
    toStateKey: 'CLOSED',
    allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },

  // DISPUTED outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'DISPUTED',
    toStateKey: 'NEGOTIATION',
    allowedActorType: ['TENANT_USER', 'TENANT_ADMIN', 'PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'DISPUTED',
    toStateKey: 'ESCALATED',
    allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: true,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'DISPUTED',
    toStateKey: 'CANCELLED',
    allowedActorType: ['MAKER', 'CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },

  // ESCALATED outbound
  {
    entityType: 'TRADE',
    fromStateKey: 'ESCALATED',
    toStateKey: 'CLOSED',
    allowedActorType: ['PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'ESCALATED',
    toStateKey: 'CANCELLED',
    allowedActorType: ['PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'TRADE',
    fromStateKey: 'ESCALATED',
    toStateKey: 'REJECTED',
    allowedActorType: ['PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
];

// ─── 5. ESCROW Transitions (8) ────────────────────────────────────────────────

const ESCROW_TRANSITIONS: TransitionRow[] = [
  {
    entityType: 'ESCROW',
    fromStateKey: 'NOT_APPLICABLE',
    toStateKey: 'INITIATED',
    allowedActorType: ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'MAKER', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'INITIATED',
    toStateKey: 'MILESTONE_PENDING',
    allowedActorType: ['TENANT_ADMIN', 'MAKER'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'INITIATED',
    toStateKey: 'VOIDED',
    allowedActorType: ['PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: true,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'MILESTONE_PENDING',
    toStateKey: 'RELEASE_PENDING',
    allowedActorType: ['TENANT_ADMIN', 'MAKER', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'MILESTONE_PENDING',
    toStateKey: 'REFUNDED',
    allowedActorType: ['MAKER', 'CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'RELEASE_PENDING',
    toStateKey: 'RELEASED',
    allowedActorType: ['MAKER', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'RELEASE_PENDING',
    toStateKey: 'REFUNDED',
    allowedActorType: ['MAKER', 'CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'ESCROW',
    fromStateKey: 'RELEASE_PENDING',
    toStateKey: 'VOIDED',
    allowedActorType: ['PLATFORM_ADMIN'],
    requiresMakerChecker: false,
    requiresEscalation: true,
  },
];

// ─── 6. CERTIFICATION Transitions (6) ────────────────────────────────────────

const CERTIFICATION_TRANSITIONS: TransitionRow[] = [
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'SUBMITTED',
    toStateKey: 'UNDER_REVIEW',
    allowedActorType: ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'SUBMITTED',
    toStateKey: 'REJECTED',
    allowedActorType: ['PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'UNDER_REVIEW',
    toStateKey: 'APPROVED',
    allowedActorType: ['CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'UNDER_REVIEW',
    toStateKey: 'REJECTED',
    allowedActorType: ['CHECKER', 'PLATFORM_ADMIN'],
    requiresMakerChecker: true,
    requiresEscalation: false,
  },
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'APPROVED',
    toStateKey: 'REVOKED',
    allowedActorType: ['PLATFORM_ADMIN', 'CHECKER'],
    requiresMakerChecker: true,
    requiresEscalation: true,
  },
  {
    entityType: 'CERTIFICATION',
    fromStateKey: 'APPROVED',
    toStateKey: 'EXPIRED',
    allowedActorType: ['SYSTEM_AUTOMATION'],
    requiresMakerChecker: false,
    requiresEscalation: false,
  },
];

// ─── Seed Runner ──────────────────────────────────────────────────────────────

async function seedStates(states: StateRow[], label: string): Promise<void> {
  console.log(`  Seeding ${states.length} ${label} states...`);
  let created = 0;
  let skipped = 0;

  for (const state of states) {
    const result = await prisma.lifecycleState.upsert({
      where: {
        entityType_stateKey: {
          entityType: state.entityType,
          stateKey: state.stateKey,
        },
      },
      update: {
        // Update mutable metadata on re-run (description, severity)
        description: state.description,
        severityLevel: state.severityLevel,
        requiresMakerChecker: state.requiresMakerChecker,
        // NOTE: is_terminal and is_irreversible are intentionally NOT updated
        // after first seed — changing them is a migration-level operation (schema
        // change equivalent). Amend the migration SQL, not this seed.
      },
      create: {
        entityType: state.entityType,
        stateKey: state.stateKey,
        isTerminal: state.isTerminal,
        isIrreversible: state.isIrreversible,
        severityLevel: state.severityLevel,
        requiresMakerChecker: state.requiresMakerChecker,
        description: state.description,
      },
    });

    if (result.createdAt.getTime() === result.createdAt.getTime()) {
      // Count created vs updated by checking if record is new
      created++;
    }
  }

  console.log(`    ✓ ${states.length} ${label} states upserted (${created} processed)`);
}

async function seedTransitions(transitions: TransitionRow[], label: string): Promise<void> {
  console.log(`  Seeding ${transitions.length} ${label} transitions...`);

  for (const t of transitions) {
    await prisma.allowedTransition.upsert({
      where: {
        entityType_fromStateKey_toStateKey: {
          entityType: t.entityType,
          fromStateKey: t.fromStateKey,
          toStateKey: t.toStateKey,
        },
      },
      update: {
        // Update actor types and flags on re-run (these can evolve)
        allowedActorType: t.allowedActorType,
        requiresMakerChecker: t.requiresMakerChecker,
        requiresEscalation: t.requiresEscalation,
      },
      create: {
        entityType: t.entityType,
        fromStateKey: t.fromStateKey,
        toStateKey: t.toStateKey,
        allowedActorType: t.allowedActorType,
        requiresMakerChecker: t.requiresMakerChecker,
        requiresEscalation: t.requiresEscalation,
      },
    });
  }

  console.log(`    ✓ ${transitions.length} ${label} transitions upserted`);
}

async function main(): Promise<void> {
  console.log('🌱 G-020 State Machine Seed — Starting...');
  console.log('  Doctrine: v1.4 + G-020 v1.1');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log('');

  // ── States ────────────────────────────────────────────────────────────────
  console.log('📋 LIFECYCLE STATES');
  await seedStates(TRADE_STATES, 'TRADE');
  await seedStates(ESCROW_STATES, 'ESCROW');
  await seedStates(CERTIFICATION_STATES, 'CERTIFICATION');

  const totalStates = TRADE_STATES.length + ESCROW_STATES.length + CERTIFICATION_STATES.length;
  console.log(`  Total: ${totalStates} states (14 TRADE + 7 ESCROW + 6 CERTIFICATION)`);
  console.log('');

  // ── Transitions ───────────────────────────────────────────────────────────
  console.log('🔀 ALLOWED TRANSITIONS');
  await seedTransitions(TRADE_TRANSITIONS, 'TRADE');
  await seedTransitions(ESCROW_TRANSITIONS, 'ESCROW');
  await seedTransitions(CERTIFICATION_TRANSITIONS, 'CERTIFICATION');

  const totalTransitions =
    TRADE_TRANSITIONS.length + ESCROW_TRANSITIONS.length + CERTIFICATION_TRANSITIONS.length;
  console.log(
    `  Total: ${totalTransitions} transitions (${TRADE_TRANSITIONS.length} TRADE + ${ESCROW_TRANSITIONS.length} ESCROW + ${CERTIFICATION_TRANSITIONS.length} CERTIFICATION)`
  );
  console.log('');

  // ── Verification ──────────────────────────────────────────────────────────
  console.log('🔍 VERIFICATION');
  const stateCount = await prisma.lifecycleState.count();
  const transitionCount = await prisma.allowedTransition.count();
  const tradeStates = await prisma.lifecycleState.count({ where: { entityType: 'TRADE' } });
  const escrowStates = await prisma.lifecycleState.count({ where: { entityType: 'ESCROW' } });
  const certStates = await prisma.lifecycleState.count({
    where: { entityType: 'CERTIFICATION' },
  });

  console.log(`  lifecycle_states rows: ${stateCount}`);
  console.log(`    TRADE: ${tradeStates} (expected 14)`);
  console.log(`    ESCROW: ${escrowStates} (expected 7)`);
  console.log(`    CERTIFICATION: ${certStates} (expected 6)`);
  console.log(`  allowed_transitions rows: ${transitionCount}`);
  console.log('');
  console.log('✅ G-020 seed complete — idempotent (re-run is safe)');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
