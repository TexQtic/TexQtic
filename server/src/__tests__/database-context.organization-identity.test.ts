import { describe, expect, it, vi } from 'vitest';

import {
  buildOrganizationTaxonomyCarrier,
  buildTenantSessionTransportIdentity,
  getOrganizationIdentity,
  mapOrganizationIdentityRow,
  OrganizationNotFoundError,
} from '../lib/database-context.js';

function createPrismaMock(orgRow: Record<string, unknown> | null) {
  const tx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    organizations: {
      findUnique: vi.fn().mockResolvedValue(orgRow),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  return { prisma, tx };
}

describe('getOrganizationIdentity', () => {
  it('returns empty taxonomy carrier fields when no taxonomy has been assigned', async () => {
    const createdAt = new Date('2026-04-20T00:00:00.000Z');
    const { prisma, tx } = createPrismaMock({
      id: 'org-1',
      slug: 'acme-textiles',
      legal_name: 'Acme Textiles',
      status: 'ACTIVE',
      org_type: 'B2B',
      primary_segment_key: null,
      is_white_label: false,
      jurisdiction: 'AE',
      registration_no: null,
      risk_score: 0,
      plan: 'PROFESSIONAL',
      secondary_segments: [],
      role_positions: [],
      created_at: createdAt,
      updated_at: createdAt,
    });

    const result = await getOrganizationIdentity('org-1', prisma as never);

    expect(result).toMatchObject({
      id: 'org-1',
      primary_segment_key: null,
      secondary_segment_keys: [],
      role_position_keys: [],
      base_family: 'B2B',
      aggregator_capability: false,
      white_label_capability: false,
      commercial_plan: 'PROFESSIONAL',
    });
    expect(tx.organizations.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          primary_segment_key: true,
          secondary_segments: expect.objectContaining({
            select: { segment_key: true },
          }),
          role_positions: expect.objectContaining({
            select: { role_position_key: true },
          }),
        }),
      }),
    );
  });

  it('flattens persisted taxonomy relations into internal org identity keys', async () => {
    const createdAt = new Date('2026-04-20T00:00:00.000Z');
    const { prisma } = createPrismaMock({
      id: 'org-2',
      slug: 'woven-hub',
      legal_name: 'Woven Hub',
      status: 'VERIFICATION_APPROVED',
      org_type: 'B2B',
      primary_segment_key: 'Yarn',
      is_white_label: true,
      jurisdiction: 'DE',
      registration_no: 'DE-123',
      risk_score: 3,
      plan: 'ENTERPRISE',
      secondary_segments: [{ segment_key: 'Knitting' }, { segment_key: 'Weaving' }],
      role_positions: [{ role_position_key: 'manufacturer' }, { role_position_key: 'trader' }],
      created_at: createdAt,
      updated_at: createdAt,
    });

    const result = await getOrganizationIdentity('org-2', prisma as never);

    expect(result.primary_segment_key).toBe('Yarn');
    expect(result.secondary_segment_keys).toEqual(['Knitting', 'Weaving']);
    expect(result.role_position_keys).toEqual(['manufacturer', 'trader']);
    expect(result.white_label_capability).toBe(true);
    expect(result.commercial_plan).toBe('ENTERPRISE');
  });

  it('builds internal tenant session transport with canonical taxonomy while preserving public aliases', async () => {
    const createdAt = new Date('2026-04-20T00:00:00.000Z');
    const identity = mapOrganizationIdentityRow({
      id: 'org-3',
      slug: 'loom-labs',
      legal_name: 'Loom Labs',
      status: 'ACTIVE',
      org_type: 'B2B',
      primary_segment_key: 'Yarn',
      is_white_label: false,
      jurisdiction: 'IN',
      registration_no: 'IN-99',
      risk_score: 1,
      plan: 'STARTER',
      secondary_segments: [{ segment_key: 'Knitting' }],
      role_positions: [{ role_position_key: 'manufacturer' }],
      created_at: createdAt,
      updated_at: createdAt,
    });

    const result = buildTenantSessionTransportIdentity(identity);

    expect(result).toMatchObject({
      id: 'org-3',
      slug: 'loom-labs',
      name: 'Loom Labs',
      type: 'B2B',
      tenant_category: 'B2B',
      primary_segment_key: 'Yarn',
      secondary_segment_keys: ['Knitting'],
      role_position_keys: ['manufacturer'],
      base_family: 'B2B',
      aggregator_capability: false,
      white_label_capability: false,
      commercial_plan: 'STARTER',
    });
  });

  it('clones taxonomy arrays when building internal taxonomy carriers', () => {
    const identity = {
      primary_segment_key: 'Yarn',
      secondary_segment_keys: ['Knitting'],
      role_position_keys: ['manufacturer'],
    };

    const result = buildOrganizationTaxonomyCarrier(identity);

    expect(result).toEqual(identity);
    expect(result.secondary_segment_keys).not.toBe(identity.secondary_segment_keys);
    expect(result.role_position_keys).not.toBe(identity.role_position_keys);
  });

  it('throws OrganizationNotFoundError when the organization row is absent', async () => {
    const { prisma } = createPrismaMock(null);

    await expect(getOrganizationIdentity('missing-org', prisma as never)).rejects.toBeInstanceOf(
      OrganizationNotFoundError,
    );
  });
});