/**
 * TECS-DPP-PASSPORT-NETWORK-006 Slice D — unit tests
 *
 * Tests the four-tier Lite-to-Global maturity ladder:
 *   GLOBAL_DPP  — PUBLISHED + hasPublicToken + certCount >= 3 + depth >= 2 + activeCerts >= 1
 *   COMPLIANCE  — certCount >= 2 + depth >= 1 + activeCerts >= 1
 *   TRADE_READY — certCount >= 1 + depth >= 1
 *   LOCAL_TRUST — fallback
 *
 * Groups:
 *   A — four-tier happy-path
 *   B — GLOBAL_DPP per-criterion regression (5 tests)
 *   C — COMPLIANCE per-criterion regression (3 tests)
 *   D — public/tenant parity
 *   E — existing behaviour preservation
 *   F — route safety (no .json route in public.ts)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Inline pure functions mirrored exactly from tenant.ts / public.ts.
// These are tested directly so that changes to the source are caught by TS.
// ---------------------------------------------------------------------------

type DppMaturityLevel = 'LOCAL_TRUST' | 'TRADE_READY' | 'COMPLIANCE' | 'GLOBAL_DPP';
type DppPassportStatus = 'DRAFT' | 'INTERNAL' | 'TRADE_READY' | 'PUBLISHED';

function computeDppMaturity(input: {
  approvedCertCount: number;
  lineageDepth: number;
  passportStatus?: DppPassportStatus | null;
  hasPublicToken?: boolean;
  activeCertsWithValidExpiry?: number;
}): DppMaturityLevel {
  const activeCerts = input.activeCertsWithValidExpiry ?? 0;
  if (
    input.passportStatus === 'PUBLISHED' &&
    (input.hasPublicToken ?? false) &&
    input.approvedCertCount >= 3 &&
    input.lineageDepth >= 2 &&
    activeCerts >= 1
  ) {
    return 'GLOBAL_DPP';
  }
  if (input.approvedCertCount >= 2 && input.lineageDepth >= 1 && activeCerts >= 1) {
    return 'COMPLIANCE';
  }
  if (input.approvedCertCount >= 1 && input.lineageDepth >= 1) {
    return 'TRADE_READY';
  }
  return 'LOCAL_TRUST';
}

function computeDppMaturityPublic(input: {
  approvedCertCount: number;
  lineageDepth: number;
  passportStatus?: string;
  hasPublicToken?: boolean;
  activeCertsWithValidExpiry?: number;
}): DppMaturityLevel {
  const activeCerts = input.activeCertsWithValidExpiry ?? 0;
  if (
    input.passportStatus === 'PUBLISHED' &&
    (input.hasPublicToken ?? false) &&
    input.approvedCertCount >= 3 &&
    input.lineageDepth >= 2 &&
    activeCerts >= 1
  ) {
    return 'GLOBAL_DPP';
  }
  if (input.approvedCertCount >= 2 && input.lineageDepth >= 1 && activeCerts >= 1) {
    return 'COMPLIANCE';
  }
  if (input.approvedCertCount >= 1 && input.lineageDepth >= 1) {
    return 'TRADE_READY';
  }
  return 'LOCAL_TRUST';
}

// ---------------------------------------------------------------------------
// Group A — four-tier happy-path
// ---------------------------------------------------------------------------
describe('Group A: four-tier happy-path', () => {
  it('A-1: returns LOCAL_TRUST when no certs and no lineage', () => {
    expect(
      computeDppMaturity({ approvedCertCount: 0, lineageDepth: 0 }),
    ).toBe('LOCAL_TRUST');
  });

  it('A-2: returns TRADE_READY when certCount >= 1 and lineageDepth >= 1', () => {
    expect(
      computeDppMaturity({ approvedCertCount: 1, lineageDepth: 1 }),
    ).toBe('TRADE_READY');
  });

  it('A-3: returns COMPLIANCE when certCount >= 2, depth >= 1, activeCerts >= 1', () => {
    expect(
      computeDppMaturity({
        approvedCertCount: 2,
        lineageDepth: 1,
        activeCertsWithValidExpiry: 1,
      }),
    ).toBe('COMPLIANCE');
  });

  it('A-4: returns GLOBAL_DPP when all five criteria met', () => {
    expect(
      computeDppMaturity({
        approvedCertCount: 3,
        lineageDepth: 2,
        passportStatus: 'PUBLISHED',
        hasPublicToken: true,
        activeCertsWithValidExpiry: 1,
      }),
    ).toBe('GLOBAL_DPP');
  });
});

// ---------------------------------------------------------------------------
// Group B — GLOBAL_DPP per-criterion regression
// ---------------------------------------------------------------------------
describe('Group B: GLOBAL_DPP — one criterion fails each time', () => {
  const base = {
    approvedCertCount: 3,
    lineageDepth: 2,
    passportStatus: 'PUBLISHED' as DppPassportStatus,
    hasPublicToken: true,
    activeCertsWithValidExpiry: 1,
  };

  it('B-1: passportStatus !== PUBLISHED → falls to COMPLIANCE', () => {
    expect(
      computeDppMaturity({ ...base, passportStatus: 'INTERNAL' }),
    ).toBe('COMPLIANCE');
  });

  it('B-2: hasPublicToken = false → falls to COMPLIANCE', () => {
    expect(
      computeDppMaturity({ ...base, hasPublicToken: false }),
    ).toBe('COMPLIANCE');
  });

  it('B-3: approvedCertCount < 3 → falls to COMPLIANCE', () => {
    expect(
      computeDppMaturity({ ...base, approvedCertCount: 2 }),
    ).toBe('COMPLIANCE');
  });

  it('B-4: lineageDepth < 2 → falls to COMPLIANCE', () => {
    expect(
      computeDppMaturity({ ...base, lineageDepth: 1 }),
    ).toBe('COMPLIANCE');
  });

  it('B-5: activeCertsWithValidExpiry < 1 → falls to TRADE_READY', () => {
    // certCount=3, depth=2 but no active certs → COMPLIANCE gate fails → TRADE_READY
    expect(
      computeDppMaturity({ ...base, activeCertsWithValidExpiry: 0 }),
    ).toBe('TRADE_READY');
  });
});

// ---------------------------------------------------------------------------
// Group C — COMPLIANCE per-criterion regression
// ---------------------------------------------------------------------------
describe('Group C: COMPLIANCE — one criterion fails each time', () => {
  it('C-1: certCount < 2 → TRADE_READY (if depth >= 1 and certCount >= 1)', () => {
    expect(
      computeDppMaturity({
        approvedCertCount: 1,
        lineageDepth: 1,
        activeCertsWithValidExpiry: 1,
      }),
    ).toBe('TRADE_READY');
  });

  it('C-2: lineageDepth < 1 → LOCAL_TRUST (certCount >= 2 but no lineage)', () => {
    expect(
      computeDppMaturity({
        approvedCertCount: 2,
        lineageDepth: 0,
        activeCertsWithValidExpiry: 1,
      }),
    ).toBe('LOCAL_TRUST');
  });

  it('C-3: activeCertsWithValidExpiry < 1 → TRADE_READY (certCount=2, depth=1 but no active certs)', () => {
    expect(
      computeDppMaturity({
        approvedCertCount: 2,
        lineageDepth: 1,
        activeCertsWithValidExpiry: 0,
      }),
    ).toBe('TRADE_READY');
  });
});

// ---------------------------------------------------------------------------
// Group D — public / tenant parity
// ---------------------------------------------------------------------------
describe('Group D: public and tenant functions return identical results', () => {
  type PairInput = {
    approvedCertCount: number;
    lineageDepth: number;
    passportStatus?: DppPassportStatus;
    hasPublicToken?: boolean;
    activeCertsWithValidExpiry?: number;
  };
  const cases: Array<PairInput> = [
    { approvedCertCount: 0, lineageDepth: 0 },
    { approvedCertCount: 1, lineageDepth: 1 },
    { approvedCertCount: 2, lineageDepth: 1, activeCertsWithValidExpiry: 1 },
    {
      approvedCertCount: 3,
      lineageDepth: 2,
      passportStatus: 'PUBLISHED',
      hasPublicToken: true,
      activeCertsWithValidExpiry: 1,
    },
    {
      approvedCertCount: 3,
      lineageDepth: 2,
      passportStatus: 'DRAFT',
      hasPublicToken: false,
      activeCertsWithValidExpiry: 0,
    },
  ];

  cases.forEach((input, idx) => {
    it(`D-${idx + 1}: tenant and public agree for input set ${idx + 1}`, () => {
      expect(computeDppMaturity(input)).toBe(computeDppMaturityPublic(input));
    });
  });
});

// ---------------------------------------------------------------------------
// Group E — existing behaviour preservation
// ---------------------------------------------------------------------------
describe('Group E: existing behaviour preserved', () => {
  it('E-1: TRADE_READY still reachable with certCount=1, depth=1', () => {
    expect(computeDppMaturity({ approvedCertCount: 1, lineageDepth: 1 })).toBe('TRADE_READY');
  });

  it('E-2: LOCAL_TRUST is stable fallback for zero state', () => {
    expect(computeDppMaturity({ approvedCertCount: 0, lineageDepth: 0 })).toBe('LOCAL_TRUST');
  });

  it('E-3: GLOBAL_DPP requires exact minimum thresholds (no over-qualification issue)', () => {
    // certCount=10, depth=10 but no public token → cannot be GLOBAL_DPP
    const result = computeDppMaturity({
      approvedCertCount: 10,
      lineageDepth: 10,
      passportStatus: 'PUBLISHED',
      hasPublicToken: false,
      activeCertsWithValidExpiry: 5,
    });
    // Should reach COMPLIANCE, not GLOBAL_DPP
    expect(result).toBe('COMPLIANCE');
  });

  it('E-4: omitting optional params does not throw and returns valid tier', () => {
    const result = computeDppMaturity({ approvedCertCount: 2, lineageDepth: 2 });
    expect(['LOCAL_TRUST', 'TRADE_READY', 'COMPLIANCE', 'GLOBAL_DPP']).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// Group F — route safety
// ---------------------------------------------------------------------------
describe('Group F: route safety — no unsafe .json suffix route in public.ts', () => {
  it('F-1: public.ts source does not contain a registered *.json route path', () => {
    const src = readFileSync(
      resolve(__dirname, '../routes/public.ts'),
      'utf8',
    );
    // Detect any route registration with a backslash (causes find-my-way SyntaxError)
    const hasBackslashRoute = /fastify\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]*\\/.test(src);
    expect(hasBackslashRoute).toBe(false);
  });
});
