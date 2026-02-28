/**
 * G-022 — Certification Route: Escalation Freeze Enforcement Tests
 * Task ID: G-022-GAP-G022-01 (GOVERNANCE-SYNC-023)
 * Doctrine: v1.4 + G-022 Design v1.1 + D-022-B
 *
 * Tests:
 *   T-G022-CERT-ORG-FROZEN
 *     Proves that with EscalationService injected into StateMachineService,
 *     an org-level freeze (entity_type='ORG', severity >= 3, OPEN) blocks
 *     CERTIFICATION transitions with TRANSITION_NOT_PERMITTED containing a
 *     G-022 Freeze message. This validates GAP-G022-01 injection fix.
 *
 *   T-G022-CERT-NOT-FROZEN
 *     Proves that without any freeze, SM proceeds through freeze checks into
 *     the CERTIFICATION deferral path (CERTIFICATION_LOG_DEFERRED), confirming
 *     freeze check runs BEFORE the CERTIFICATION deferral guard — i.e., freeze
 *     blocks even before the deferral signal.
 *
 * Stop-loss notice (GAP-G022-02):
 *   entity_type='CERTIFICATION' is NOT in EscalationEntityType enum and NOT in the
 *   DB escalation_events CHECK constraint. Entity-level freeze for individual
 *   CERTIFICATION rows is therefore NOT enforceable in the current schema.
 *   This is a separate gap (GAP-G022-02) requiring:
 *     - Add 'CERTIFICATION' to EscalationEntityType union
 *     - Add 'CERTIFICATION' to DB CHECK constraint (new G-022 patch migration)
 *   T-G022-CERT-ENTITY-FROZEN is NOT added here — per stop-loss protocol when
 *   CERTIFICATION is absent from the enum.
 *
 * Run from repo root:
 *   pnpm -C server exec vitest run src/services/certification.g022.freeze.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { StateMachineService } from './stateMachine.service.js';
import type { EscalationService } from './escalation.service.js';
import { GovError } from './escalation.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID      = 'aaaaaaaa-0022-0000-0000-000000000001';
const CERT_ID     = 'bbbbbbbb-0022-0000-0000-000000000002';
const ACTOR_USER  = 'cccccccc-0022-0000-0000-000000000003';
const ESC_ID      = 'dddddddd-0022-0000-0000-000000000004';

// ─── Mocked EscalationService factory ────────────────────────────────────────

/**
 * Creates a mock EscalationService where both freeze checks pass by default.
 * Override individual methods per test.
 */
function makeEscalationService() {
  return {
    checkOrgFreeze:    vi.fn().mockResolvedValue(undefined),
    checkEntityFreeze: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Mocked DB factory ────────────────────────────────────────────────────────

/**
 * The SM only queries the DB after freeze checks pass.
 * For freeze tests the DB is never reached — but the mock is needed for
 * StateMachineService construction (it receives db as first arg).
 */
function makeDb() {
  return {
    lifecycleState:      { findUnique: vi.fn(), findFirst: vi.fn() },
    allowedTransition:   { findFirst: vi.fn() },
    tradeLifecycleLog:   { create: vi.fn() },
    escrowLifecycleLog:  { create: vi.fn() },
    $transaction:        vi.fn(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal valid TransitionRequest for a CERTIFICATION entity. */
function makeCertTransitionReq(): Parameters<StateMachineService['transition']>[0] {
  return {
    orgId:        ORG_ID,
    entityType:   'CERTIFICATION',
    entityId:     CERT_ID,
    fromStateKey: 'SUBMITTED',
    toStateKey:   'UNDER_REVIEW',
    actorType:    'TENANT_USER',
    actorUserId:  ACTOR_USER,
    actorAdminId: null,
    actorRole:    'certification_agent',
    reason:       'Advancing certification for review.',
    aiTriggered:  false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G-022 Certification Freeze Enforcement (GAP-G022-01)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // T-G022-CERT-ORG-FROZEN
  // ═══════════════════════════════════════════════════════════════════════════
  it('T-G022-CERT-ORG-FROZEN: org-level freeze blocks CERTIFICATION transition via SM', async () => {
    /**
     * Arrange:
     *   - EscalationService.checkOrgFreeze throws GovError('ORG_FROZEN')
     *     (simulates an ORG escalation_events row: entity_type='ORG',
     *      entity_id=orgId, severity=3, status='OPEN', no resolution child)
     *   - SM is constructed WITH escalation injected (the fix in GAP-G022-01)
     *   - DB is never reached (freeze blocks at Step 3.5 before any DB call)
     */
    const db  = makeDb();
    const esc = makeEscalationService();

    // Simulate active org-level freeze (D-022-B)
    (esc.checkOrgFreeze as Mock).mockRejectedValueOnce(
      new GovError(
        'ORG_FROZEN',
        `Org ${ORG_ID} is frozen — open org-level escalation [${ESC_ID}] ` +
        'at severity LEVEL_3. No transitions are permitted for this org. ' +
        'Resolve or override the org freeze escalation to resume. [E-022-ORG-FREEZE]',
        ESC_ID,
      ),
    );

    const sm = new StateMachineService(
      db as unknown as PrismaClient,
      esc as unknown as EscalationService,
    );

    // Act: transition attempt on a CERTIFICATION entity
    const result = await sm.transition(makeCertTransitionReq());

    // Assert: SM returns DENIED with TRANSITION_NOT_PERMITTED code + G-022 freeze message
    expect(result.status).toBe('DENIED');
    expect((result as { code?: string }).code).toBe('TRANSITION_NOT_PERMITTED');
    expect((result as { message?: string }).message).toMatch(/G-022 Freeze/);
    expect((result as { message?: string }).message).toMatch(/is frozen/i);

    // Assert: checkOrgFreeze was called once with correct orgId
    expect(esc.checkOrgFreeze).toHaveBeenCalledOnce();
    expect(esc.checkOrgFreeze).toHaveBeenCalledWith(ORG_ID);

    // Assert: DB was NOT reached (freeze blocked before any DB query)
    expect(db.lifecycleState.findUnique).not.toHaveBeenCalled();
    expect(db.lifecycleState.findFirst).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // T-G022-CERT-NOT-FROZEN
  // ═══════════════════════════════════════════════════════════════════════════
  it('T-G022-CERT-NOT-FROZEN: when no freeze, SM proceeds into CERTIFICATION_LOG_DEFERRED path', async () => {
    /**
     * Arrange:
     *   - Both escalation checks return void (no freeze active)
     *   - SM is constructed WITH escalation injected
     *   - CERTIFICATION entity type triggers CERTIFICATION_LOG_DEFERRED deferral
     *     at Step 5 (before any DB read for lifecycle state — SM bails early)
     *
     * This test proves two things simultaneously:
     *   1. Freeze checks run cleanly (no GovError thrown)
     *   2. CERTIFICATION proceeds to Step 5 deferral — not blocked by freeze guard
     *      (i.e., freeze check runs BEFORE deferral, and when not frozen, flow continues)
     *
     * Constitutional note: SM intentionally defers CERTIFICATION log writes to G-023.
     * The CERTIFICATION_LOG_DEFERRED result is the correct non-frozen outcome for certs.
     */
    const db  = makeDb();
    const esc = makeEscalationService();
    // Both checks return void (default mock)

    const sm = new StateMachineService(
      db as unknown as PrismaClient,
      esc as unknown as EscalationService,
    );

    // Act
    const result = await sm.transition(makeCertTransitionReq());

    // Assert: SM returns DENIED with CERTIFICATION_LOG_DEFERRED code
    // (not a freeze — this is the SM's intentional deferral of CERTIFICATION writes)
    expect(result.status).toBe('DENIED');
    expect((result as { code?: string }).code).toBe('CERTIFICATION_LOG_DEFERRED');
    expect((result as { message?: string }).message).toMatch(/CERTIFICATION/i);

    // Assert: freeze checks were called (proving injection is active)
    expect(esc.checkOrgFreeze).toHaveBeenCalledOnce();
    expect(esc.checkOrgFreeze).toHaveBeenCalledWith(ORG_ID);
    expect(esc.checkEntityFreeze).toHaveBeenCalledOnce();
    expect(esc.checkEntityFreeze).toHaveBeenCalledWith('CERTIFICATION', CERT_ID);

    // Assert: DB not queried (CERTIFICATION deferral occurs before lifecycle_states lookup)
    expect(db.lifecycleState.findUnique).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STOP-LOSS: GAP-G022-02 (documented, not implemented here)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * T-G022-CERT-ENTITY-FROZEN is intentionally absent.
   *
   * STOP-LOSS TRIGGERED: 'CERTIFICATION' is NOT in EscalationEntityType union and
   * NOT in the DB escalation_events CHECK constraint (which allows only:
   * TRADE, ESCROW, APPROVAL, LIFECYCLE_LOG, ORG, GLOBAL).
   *
   * Entity-level freeze for individual CERTIFICATION rows cannot be created in the
   * current DB schema. Testing a mocked entity-level freeze for CERTIFICATION would
   * not represent a production-reachable scenario.
   *
   * GAP-G022-02 is registered for a follow-up TECS prompt to:
   *   - Add 'CERTIFICATION' to EscalationEntityType in escalation.types.ts
   *   - Add 'CERTIFICATION' to the DB escalation_events.entity_type CHECK constraint
   *   - Wire checkEntityFreeze('CERTIFICATION', certId) in CertificationService.transitionCertification()
   *   - Add T-G022-CERT-ENTITY-FROZEN test
   */
});
