import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createTenantSessionRuntimeDescriptor } from '../../runtime/sessionRuntimeDescriptor.ts';

const prisma = new PrismaClient();

const QA_PASSWORD = ['Password123', '!'].join('');
const QA_CTRL_EMAIL = 'admin@texqtic.com';
const SUPPORT_EMAIL = 'support@texqtic.com';
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const QA_PLACEHOLDER_HOST = 'https://placehold.co';

type Tx = Prisma.TransactionClient;
type QaTenantType = 'AGGREGATOR' | 'B2B' | 'B2C';
type QaOrganizationStatus = 'ACTIVE' | 'PENDING_VERIFICATION';
type QaPrimarySegmentKey = 'Weaving' | 'Fabric Processing' | 'Yarn' | 'Knitting' | null;
type QaRolePositionKey = 'manufacturer' | 'trader' | 'service_provider';

type QaTenantTaxonomySpec = {
  primarySegmentKey: QaPrimarySegmentKey;
  secondarySegmentKeys: Array<Exclude<QaPrimarySegmentKey, null>>;
  rolePositionKeys: QaRolePositionKey[];
};

type QaTenantSpec = {
  key: 'QA_B2B' | 'QA_B2C' | 'QA_WL' | 'QA_AGG' | 'QA_PEND';
  displayName: string;
  slug: string;
  ownerEmail: string;
  tenantType: QaTenantType;
  tenantStatus: 'ACTIVE';
  organizationStatus: QaOrganizationStatus;
  plan: 'ENTERPRISE' | 'PROFESSIONAL' | 'STARTER';
  isWhiteLabel: boolean;
  jurisdiction: string;
  legacySlugs?: string[];
  legacyOwnerEmails?: string[];
  domains?: {
    primary: string;
    legacy?: string[];
    secondary?: string[];
  };
  branding?: {
    logoUrl: string;
    themeJson: Prisma.InputJsonValue;
  };
  taxonomy: QaTenantTaxonomySpec;
};

type CatalogSeedSpec = {
  name: string;
  sku: string;
  description: string;
  price: number;
  moq: number;
  imageUrl?: string;
};

type SeededTenantIdentity = {
  key: QaTenantSpec['key'];
  displayName: string;
  slug: string;
  tenantId: string;
  tenantType: QaTenantType;
  tenantStatus: 'ACTIVE';
  organizationStatus: QaOrganizationStatus;
  isWhiteLabel: boolean;
  plan: string;
  ownerEmail: string;
  ownerUserId: string;
};

function buildQaPlaceholderAsset(size: string, background: string, foreground: string, label: string) {
  const normalizedBackground = background.replace('#', '');
  const normalizedForeground = foreground.replace('#', '');

  return `${QA_PLACEHOLDER_HOST}/${size}/${normalizedBackground}/${normalizedForeground}/png?text=${encodeURIComponent(label)}`;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return typeof value === 'number' ? value : Number(value);
}

function hasLegacyPlaceholderHost(url: string | null | undefined) {
  return url?.includes('example.com') ?? false;
}

function normalizeDefinedStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort((left, right) => left.localeCompare(right));
}

const QA_B2B_SPEC: QaTenantSpec = {
  key: 'QA_B2B',
  displayName: 'QA B2B',
  slug: 'qa-b2b',
  ownerEmail: 'qa.b2b@texqtic.com',
  tenantType: 'B2B',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  plan: 'PROFESSIONAL',
  isWhiteLabel: false,
  jurisdiction: 'AE',
  legacySlugs: ['acme-corp'],
  legacyOwnerEmails: ['owner@acme.example.com'],
  domains: {
    primary: 'qa-b2b.texqtic.com',
    legacy: ['acme.example.com'],
  },
  branding: {
    logoUrl: buildQaPlaceholderAsset('256x256', '#0F766E', '#FFFFFF', 'QA B2B'),
    themeJson: {
      primaryColor: '#0F766E',
      secondaryColor: '#164E63',
      fontFamily: 'IBM Plex Sans',
    },
  },
  taxonomy: {
    primarySegmentKey: 'Weaving',
    secondarySegmentKeys: ['Fabric Processing'],
    rolePositionKeys: ['manufacturer'],
  },
};

const QA_B2C_SPEC: QaTenantSpec = {
  key: 'QA_B2C',
  displayName: 'QA B2C',
  slug: 'qa-b2c',
  ownerEmail: 'qa.b2c@texqtic.com',
  tenantType: 'B2C',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  plan: 'STARTER',
  isWhiteLabel: false,
  jurisdiction: 'US-CA',
  branding: {
    logoUrl: buildQaPlaceholderAsset('256x256', '#C2410C', '#FFFFFF', 'QA B2C'),
    themeJson: {
      primaryColor: '#C2410C',
      secondaryColor: '#F97316',
      fontFamily: 'Source Sans 3',
    },
  },
  taxonomy: {
    primarySegmentKey: null,
    secondarySegmentKeys: [],
    rolePositionKeys: [],
  },
};

const QA_WL_SPEC: QaTenantSpec = {
  key: 'QA_WL',
  displayName: 'QA WL',
  slug: 'qa-wl',
  ownerEmail: 'qa.wl@texqtic.com',
  tenantType: 'B2C',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  plan: 'ENTERPRISE',
  isWhiteLabel: true,
  jurisdiction: 'GB-LND',
  domains: {
    primary: 'qa-wl.platform.texqtic.com',
    secondary: ['qa-wl.shop.texqtic.com'],
  },
  branding: {
    logoUrl: buildQaPlaceholderAsset('256x256', '#7C2D12', '#F8FAFC', 'QA WL'),
    themeJson: {
      primaryColor: '#7C2D12',
      secondaryColor: '#EA580C',
      fontFamily: 'Cormorant Garamond',
    },
  },
  taxonomy: {
    primarySegmentKey: null,
    secondarySegmentKeys: [],
    rolePositionKeys: [],
  },
};

const QA_AGG_SPEC: QaTenantSpec = {
  key: 'QA_AGG',
  displayName: 'QA AGG',
  slug: 'qa-agg',
  ownerEmail: 'qa.agg@texqtic.com',
  tenantType: 'AGGREGATOR',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  plan: 'PROFESSIONAL',
  isWhiteLabel: false,
  jurisdiction: 'DE',
  taxonomy: {
    primarySegmentKey: null,
    secondarySegmentKeys: [],
    rolePositionKeys: [],
  },
};

const QA_PEND_SPEC: QaTenantSpec = {
  key: 'QA_PEND',
  displayName: 'QA PEND',
  slug: 'qa-pend',
  ownerEmail: 'qa.pending@texqtic.com',
  tenantType: 'B2B',
  tenantStatus: 'ACTIVE',
  organizationStatus: 'PENDING_VERIFICATION',
  plan: 'PROFESSIONAL',
  isWhiteLabel: false,
  jurisdiction: 'IN',
  taxonomy: {
    primarySegmentKey: null,
    secondarySegmentKeys: [],
    rolePositionKeys: [],
  },
};

function buildQaTaxonomyCreateData(spec: QaTenantSpec) {
  return {
    primary_segment_key: spec.taxonomy.primarySegmentKey,
    ...(spec.taxonomy.secondarySegmentKeys.length > 0
      ? {
          secondary_segments: {
            create: spec.taxonomy.secondarySegmentKeys.map(segment_key => ({ segment_key })),
          },
        }
      : {}),
    ...(spec.taxonomy.rolePositionKeys.length > 0
      ? {
          role_positions: {
            create: spec.taxonomy.rolePositionKeys.map(role_position_key => ({ role_position_key })),
          },
        }
      : {}),
  };
}

function buildQaTaxonomyUpdateData(spec: QaTenantSpec) {
  return {
    primary_segment_key: spec.taxonomy.primarySegmentKey,
    secondary_segments: {
      deleteMany: {},
      ...(spec.taxonomy.secondarySegmentKeys.length > 0
        ? {
            create: spec.taxonomy.secondarySegmentKeys.map(segment_key => ({ segment_key })),
          }
        : {}),
    },
    role_positions: {
      deleteMany: {},
      ...(spec.taxonomy.rolePositionKeys.length > 0
        ? {
            create: spec.taxonomy.rolePositionKeys.map(role_position_key => ({ role_position_key })),
          }
        : {}),
    },
  };
}

const QA_B2B_CATALOG: CatalogSeedSpec[] = [
  {
    name: 'Organic Cotton Poplin',
    sku: 'QA-B2B-FAB-001',
    description: 'Lightweight certified cotton poplin for premium shirting and resortwear programs.',
    price: 18,
    moq: 75,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#0F766E', '#FFFFFF', 'Organic Cotton Poplin'),
  },
  {
    name: 'Combed Cotton Twill',
    sku: 'QA-B2B-FAB-002',
    description: 'Durable combed cotton twill suited to uniforms, chinos, and utility apparel.',
    price: 22,
    moq: 100,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#115E59', '#FFFFFF', 'Combed Cotton Twill'),
  },
  {
    name: 'Stretch Cotton Sateen',
    sku: 'QA-B2B-FAB-003',
    description: 'Smooth stretch sateen with a refined hand for trousers, dresses, and soft tailoring.',
    price: 26,
    moq: 80,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#1D4ED8', '#FFFFFF', 'Stretch Cotton Sateen'),
  },
  {
    name: 'European Linen Plain Weave',
    sku: 'QA-B2B-FAB-004',
    description: 'Breathable midweight linen for relaxed suiting, separates, and warm-weather capsules.',
    price: 28,
    moq: 60,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#B45309', '#FFFFFF', 'European Linen Plain Weave'),
  },
  {
    name: 'Linen Cotton Herringbone',
    sku: 'QA-B2B-FAB-005',
    description: 'Textured linen-cotton blend with subtle herringbone character for jackets and overshirts.',
    price: 24,
    moq: 75,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#7C2D12', '#FFFFFF', 'Linen Cotton Herringbone'),
  },
  {
    name: 'Indigo Denim 11 oz',
    sku: 'QA-B2B-FAB-006',
    description: 'Rigid indigo denim built for jeans, chore jackets, and structured workwear lines.',
    price: 19,
    moq: 120,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#1E3A8A', '#FFFFFF', 'Indigo Denim 11 oz'),
  },
  {
    name: 'Comfort Stretch Denim 9.5 oz',
    sku: 'QA-B2B-FAB-007',
    description: 'Lighter stretch denim optimized for womenswear, childrenswear, and soft-bottom programs.',
    price: 21,
    moq: 100,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#334155', '#FFFFFF', 'Comfort Stretch Denim 9.5 oz'),
  },
  {
    name: 'Sandwashed Silk Blend Satin',
    sku: 'QA-B2B-FAB-008',
    description: 'Fluid silk-viscose satin with a muted sheen for occasionwear and elevated separates.',
    price: 36,
    moq: 40,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#9D174D', '#FFFFFF', 'Sandwashed Silk Blend Satin'),
  },
  {
    name: 'Viscose Crepe Drape',
    sku: 'QA-B2B-FAB-009',
    description: 'Soft draping viscose crepe for blouses, dresses, and layered contemporary silhouettes.',
    price: 17,
    moq: 90,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#7C3AED', '#FFFFFF', 'Viscose Crepe Drape'),
  },
  {
    name: 'Recycled Polyester Taffeta',
    sku: 'QA-B2B-FAB-010',
    description: 'Recycled taffeta for linings, packable outerwear shells, and lightweight accessories.',
    price: 14,
    moq: 150,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#047857', '#FFFFFF', 'Recycled Polyester Taffeta'),
  },
  {
    name: 'Technical Softshell 3-Layer',
    sku: 'QA-B2B-FAB-011',
    description: 'Bonded weather-resistant shell fabric for commuter outerwear and technical uniforms.',
    price: 32,
    moq: 60,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#0F172A', '#FFFFFF', 'Technical Softshell 3-Layer'),
  },
  {
    name: 'Warp Knit Performance Mesh',
    sku: 'QA-B2B-FAB-012',
    description: 'Breathable warp-knit mesh for activewear panels, lining inserts, and performance footwear.',
    price: 16,
    moq: 120,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#0369A1', '#FFFFFF', 'Warp Knit Performance Mesh'),
  },
  {
    name: 'Floral Viscose Challis Print',
    sku: 'QA-B2B-FAB-013',
    description: 'Printed viscose challis for seasonal dress collections and soft blouse assortments.',
    price: 18,
    moq: 70,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#BE185D', '#FFFFFF', 'Floral Viscose Challis Print'),
  },
  {
    name: 'Upholstery Chenille Weave',
    sku: 'QA-B2B-FAB-014',
    description: 'Heavy chenille upholstery fabric for hospitality seating, cushions, and soft interiors.',
    price: 34,
    moq: 50,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#6B21A8', '#FFFFFF', 'Upholstery Chenille Weave'),
  },
];

const QA_B2B_CATALOG_SKUS = QA_B2B_CATALOG.map(item => item.sku);
const QA_B2B_CATALOG_SORTED_SKUS = [...QA_B2B_CATALOG_SKUS].sort((left, right) => left.localeCompare(right));

const QA_B2C_CATALOG: CatalogSeedSpec[] = [
  {
    name: 'QA B2C Cotton Scarf',
    sku: 'QA-B2C-001',
    description: 'B2C browse proof item one.',
    price: 24,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#C2410C', '#FFFFFF', 'QA B2C Cotton Scarf'),
  },
  {
    name: 'QA B2C Linen Wrap',
    sku: 'QA-B2C-002',
    description: 'B2C browse proof item two.',
    price: 38,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#EA580C', '#FFFFFF', 'QA B2C Linen Wrap'),
  },
  {
    name: 'QA B2C Silk Pocket Square',
    sku: 'QA-B2C-003',
    description: 'B2C browse proof item three.',
    price: 18,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#9A3412', '#FFFFFF', 'QA B2C Silk Pocket Square'),
  },
];

const QA_WL_CATALOG: CatalogSeedSpec[] = [
  {
    name: 'QA WL Indigo Throw',
    sku: 'QA-WL-001',
    description: 'WL storefront proof product one.',
    price: 64,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#7C2D12', '#F8FAFC', 'QA WL Indigo Throw'),
  },
  {
    name: 'QA WL Canvas Apron',
    sku: 'QA-WL-002',
    description: 'WL storefront proof product two.',
    price: 42,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#EA580C', '#F8FAFC', 'QA WL Canvas Apron'),
  },
  {
    name: 'QA WL Utility Tote',
    sku: 'QA-WL-003',
    description: 'WL storefront proof product three.',
    price: 58,
    moq: 1,
    imageUrl: buildQaPlaceholderAsset('1200x900', '#9A3412', '#F8FAFC', 'QA WL Utility Tote'),
  },
];

function ensureSingleCandidate<T extends { id: string }>(records: T[], label: string): T | null {
  const uniqueIds = [...new Set(records.map(record => record.id))];

  if (uniqueIds.length > 1) {
    throw new Error(`[QA_BASELINE_COLLISION] ${label}`);
  }

  return records[0] ?? null;
}

async function assertAggregatorDiscoveryCapacity() {
  const discoveryEligibleCount = await prisma.organizations.count({
    where: {
      is_white_label: false,
      org_type: 'B2B',
      status: {
        in: ['ACTIVE', 'VERIFICATION_APPROVED'],
      },
    },
  });

  if (discoveryEligibleCount < 2) {
    throw new Error(
      `[QA_BASELINE_BLOCKER] Aggregator discovery requires at least 2 existing discovery-eligible B2B organizations; found ${discoveryEligibleCount}`
    );
  }

  return discoveryEligibleCount;
}

async function seedAdminUsers(tx: Tx, passwordHash: string) {
  const superAdmin = await tx.adminUser.upsert({
    where: { email: QA_CTRL_EMAIL },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: QA_CTRL_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const supportAdmin = await tx.adminUser.upsert({
    where: { email: SUPPORT_EMAIL },
    update: {
      passwordHash,
      role: 'SUPPORT',
    },
    create: {
      email: SUPPORT_EMAIL,
      passwordHash,
      role: 'SUPPORT',
    },
  });

  return { superAdmin, supportAdmin };
}

async function seedFeatureFlags(tx: Tx) {
  const flags = [
    {
      key: 'KILL_SWITCH_ALL',
      enabled: false,
      description: 'Global kill switch - disables entire platform',
    },
    {
      key: 'AI_INSIGHTS_ENABLED',
      enabled: true,
      description: 'Enable AI-powered insights feature',
    },
    {
      key: 'ADVANCED_ANALYTICS',
      enabled: true,
      description: 'Enable advanced analytics dashboard',
    },
    {
      key: 'MULTI_CURRENCY',
      enabled: false,
      description: 'Enable multi-currency support',
    },
    {
      key: 'OP_PLATFORM_READ_ONLY',
      enabled: false,
      description:
        'OP flag — activates global platform read-only mode; blocks all state-changing tenant operations when enabled',
    },
    {
      key: 'OP_AI_AUTOMATION_ENABLED',
      enabled: false,
      description:
        'OP flag — enables AI guardrails and automation pipelines; must be explicitly enabled by control plane before AI-driven workflows run',
    },
  ];

  for (const flag of flags) {
    await tx.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        enabled: flag.enabled,
        description: flag.description,
      },
      create: flag,
    });
  }
}

async function resolveTenantAnchor(tx: Tx, spec: QaTenantSpec) {
  const existing = await tx.tenant.findMany({
    where: {
      slug: {
        in: [spec.slug, ...(spec.legacySlugs ?? [])],
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  return ensureSingleCandidate(existing, `tenant slug collision for ${spec.slug}`);
}

async function resolveUserAnchor(tx: Tx, targetEmail: string, legacyEmails: string[] = []) {
  const existing = await tx.user.findMany({
    where: {
      email: {
        in: [targetEmail, ...legacyEmails],
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  return ensureSingleCandidate(existing, `user email collision for ${targetEmail}`);
}

async function ensureTenantIdentity(tx: Tx, spec: QaTenantSpec) {
  const anchor = await resolveTenantAnchor(tx, spec);

  const tenant = anchor
    ? await tx.tenant.update({
        where: { id: anchor.id },
        data: {
          slug: spec.slug,
          name: spec.displayName,
          type: spec.tenantType,
          status: spec.tenantStatus,
          plan: spec.plan,
          isWhiteLabel: spec.isWhiteLabel,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          status: true,
          plan: true,
          isWhiteLabel: true,
        },
      })
    : await tx.tenant.create({
        data: {
          slug: spec.slug,
          name: spec.displayName,
          type: spec.tenantType,
          status: spec.tenantStatus,
          plan: spec.plan,
          isWhiteLabel: spec.isWhiteLabel,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          status: true,
          plan: true,
          isWhiteLabel: true,
        },
      });

  const organization = await tx.organizations.upsert({
    where: { id: tenant.id },
    update: {
      slug: spec.slug,
      legal_name: spec.displayName,
      jurisdiction: spec.jurisdiction,
      org_type: spec.tenantType,
      status: spec.organizationStatus,
      plan: spec.plan,
      is_white_label: spec.isWhiteLabel,
      ...buildQaTaxonomyUpdateData(spec),
      updated_at: new Date(),
    },
    create: {
      id: tenant.id,
      slug: spec.slug,
      legal_name: spec.displayName,
      jurisdiction: spec.jurisdiction,
      org_type: spec.tenantType,
      status: spec.organizationStatus,
      plan: spec.plan,
      is_white_label: spec.isWhiteLabel,
      ...buildQaTaxonomyCreateData(spec),
    },
    select: {
      id: true,
      slug: true,
      legal_name: true,
      org_type: true,
      status: true,
      plan: true,
      is_white_label: true,
      primary_segment_key: true,
      secondary_segments: {
        select: {
          segment_key: true,
        },
        orderBy: {
          segment_key: 'asc',
        },
      },
      role_positions: {
        select: {
          role_position_key: true,
        },
        orderBy: {
          role_position_key: 'asc',
        },
      },
    },
  });

  if (spec.domains) {
    const domainLookups = [
      spec.domains.primary,
      ...(spec.domains.secondary ?? []),
      ...(spec.domains.legacy ?? []),
    ];

    const existingDomains = await tx.tenantDomain.findMany({
      where: {
        domain: {
          in: domainLookups,
        },
      },
      select: {
        id: true,
        tenantId: true,
        domain: true,
      },
    });

    const foreignDomain = existingDomains.find(domain => domain.tenantId !== tenant.id);
    if (foreignDomain) {
      throw new Error(`[QA_BASELINE_COLLISION] domain collision for ${foreignDomain.domain}`);
    }

    const primaryAnchor =
      existingDomains.find(domain => domain.domain === spec.domains?.primary) ??
      existingDomains.find(domain => spec.domains?.legacy?.includes(domain.domain));

    const primaryDomain = primaryAnchor
      ? await tx.tenantDomain.update({
          where: { id: primaryAnchor.id },
          data: {
            tenantId: tenant.id,
            domain: spec.domains.primary,
            verified: true,
            primary: true,
          },
        })
      : await tx.tenantDomain.create({
          data: {
            tenantId: tenant.id,
            domain: spec.domains.primary,
            verified: true,
            primary: true,
          },
        });

    await tx.tenantDomain.updateMany({
      where: {
        tenantId: tenant.id,
        id: {
          not: primaryDomain.id,
        },
      },
      data: {
        primary: false,
      },
    });

    for (const secondaryDomain of spec.domains.secondary ?? []) {
      const secondaryAnchor = existingDomains.find(domain => domain.domain === secondaryDomain);

      if (secondaryAnchor) {
        await tx.tenantDomain.update({
          where: { id: secondaryAnchor.id },
          data: {
            tenantId: tenant.id,
            domain: secondaryDomain,
            verified: true,
            primary: false,
          },
        });
      } else {
        await tx.tenantDomain.create({
          data: {
            tenantId: tenant.id,
            domain: secondaryDomain,
            verified: true,
            primary: false,
          },
        });
      }
    }
  }

  if (spec.branding) {
    await tx.tenantBranding.upsert({
      where: { tenantId: tenant.id },
      update: {
        logoUrl: spec.branding.logoUrl,
        themeJson: spec.branding.themeJson,
      },
      create: {
        tenantId: tenant.id,
        logoUrl: spec.branding.logoUrl,
        themeJson: spec.branding.themeJson,
      },
    });
  }

  return { tenant, organization };
}

async function ensureUserIdentity(tx: Tx, email: string, passwordHash: string, legacyEmails: string[] = []) {
  const anchor = await resolveUserAnchor(tx, email, legacyEmails);

  return anchor
    ? tx.user.update({
        where: { id: anchor.id },
        data: {
          email,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
        },
      })
    : tx.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
        },
      });
}

async function assertUserIsolatedToTenant(tx: Tx, userId: string, tenantId: string, email: string) {
  const memberships = await tx.membership.findMany({
    where: { userId },
    select: { tenantId: true },
  });

  const distinctTenantIds = [...new Set(memberships.map(membership => membership.tenantId))];

  if (distinctTenantIds.length > 1 || (distinctTenantIds.length === 1 && distinctTenantIds[0] !== tenantId)) {
    throw new Error(`[QA_BASELINE_COLLISION] ${email} is associated with multiple tenants`);
  }
}

async function ensureMembership(tx: Tx, tenantId: string, userId: string, role: 'OWNER' | 'MEMBER') {
  return tx.membership.upsert({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
    update: { role },
    create: {
      tenantId,
      userId,
      role,
    },
    select: {
      id: true,
      role: true,
      tenantId: true,
      userId: true,
    },
  });
}

async function ensureOwnerSeed(tx: Tx, spec: QaTenantSpec, passwordHash: string) {
  const { tenant, organization } = await ensureTenantIdentity(tx, spec);
  const user = await ensureUserIdentity(tx, spec.ownerEmail, passwordHash, spec.legacyOwnerEmails ?? []);
  await ensureMembership(tx, tenant.id, user.id, 'OWNER');
  await assertUserIsolatedToTenant(tx, user.id, tenant.id, spec.ownerEmail);

  return {
    key: spec.key,
    displayName: spec.displayName,
    slug: tenant.slug,
    tenantId: tenant.id,
    tenantType: spec.tenantType,
    tenantStatus: spec.tenantStatus,
    organizationStatus: spec.organizationStatus,
    isWhiteLabel: spec.isWhiteLabel,
    plan: organization.plan,
    ownerEmail: user.email,
    ownerUserId: user.id,
  } satisfies SeededTenantIdentity;
}

async function ensureCatalogItem(tx: Tx, tenantId: string, seed: CatalogSeedSpec) {
  const existing = await tx.catalogItem.findMany({
    where: {
      tenantId,
      sku: seed.sku,
    },
    select: {
      id: true,
    },
  });

  const anchor = ensureSingleCandidate(existing, `catalog item collision for ${seed.sku}`);

  return anchor
    ? tx.catalogItem.update({
        where: { id: anchor.id },
        data: {
          name: seed.name,
          sku: seed.sku,
          description: seed.description,
          price: toDecimal(seed.price),
          active: true,
          moq: seed.moq,
          imageUrl: seed.imageUrl,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          sku: true,
          price: true,
          active: true,
        },
      })
    : tx.catalogItem.create({
        data: {
          tenantId,
          name: seed.name,
          sku: seed.sku,
          description: seed.description,
          price: toDecimal(seed.price),
          active: true,
          moq: seed.moq,
          imageUrl: seed.imageUrl,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          sku: true,
          price: true,
          active: true,
        },
      });
}

async function ensureCatalogItems(tx: Tx, tenantId: string, seeds: CatalogSeedSpec[]) {
  const items = [];

  for (const seed of seeds) {
    items.push(await ensureCatalogItem(tx, tenantId, seed));
  }

  return items;
}

async function deactivateCatalogResidue(tx: Tx, tenantId: string, canonicalSkus: string[]) {
  const result = await tx.catalogItem.updateMany({
    where: {
      tenantId,
      active: true,
      OR: [
        { sku: null },
        { sku: { notIn: canonicalSkus } },
      ],
    },
    data: {
      active: false,
    },
  });

  return result.count;
}

async function ensureActiveCartWithItem(tx: Tx, tenantId: string, userId: string, catalogItemId: string, quantity: number) {
  const cart =
    (await tx.cart.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })) ??
    (await tx.cart.create({
      data: {
        tenantId,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    }));

  await tx.cartItem.upsert({
    where: {
      cartId_catalogItemId: {
        cartId: cart.id,
        catalogItemId,
      },
    },
    update: { quantity },
    create: {
      cartId: cart.id,
      catalogItemId,
      quantity,
    },
  });

  return cart.id;
}

async function ensureOrderWithItem(
  tx: Tx,
  tenantId: string,
  userId: string,
  item: { id: string; name: string; sku: string | null; price: Prisma.Decimal | number | null },
  quantity: number,
  requestId: string,
) {
  const existingOrder = await tx.order.findFirst({
    where: {
      tenantId,
      userId,
      items: {
        some: {
          sku: item.sku ?? undefined,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (existingOrder) {
    const existingLifecycle = await tx.order_lifecycle_logs.findFirst({
      where: {
        order_id: existingOrder.id,
        to_state: 'PAYMENT_PENDING',
      },
      select: { id: true },
    });

    if (!existingLifecycle) {
      await tx.order_lifecycle_logs.create({
        data: {
          order_id: existingOrder.id,
          tenant_id: tenantId,
          from_state: null,
          to_state: 'PAYMENT_PENDING',
          actor_id: userId,
          realm: 'tenant',
          request_id: requestId,
        },
      });
    }

    return existingOrder.id;
  }

  const cart = await tx.cart.create({
    data: {
      tenantId,
      userId,
      status: 'CHECKED_OUT',
    },
    select: { id: true },
  });

  await tx.cartItem.create({
    data: {
      cartId: cart.id,
      catalogItemId: item.id,
      quantity,
    },
  });

  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * quantity;

  const order = await tx.order.create({
    data: {
      tenantId,
      userId,
      cartId: cart.id,
      status: 'PAYMENT_PENDING',
      currency: 'USD',
      subtotal: toDecimal(lineTotal),
      total: toDecimal(lineTotal),
    },
    select: {
      id: true,
    },
  });

  await tx.orderItem.create({
    data: {
      tenantId,
      orderId: order.id,
      catalogItemId: item.id,
      sku: item.sku ?? '',
      name: item.name,
      quantity,
      unitPrice: toDecimal(unitPrice),
      lineTotal: toDecimal(lineTotal),
    },
  });

  await tx.order_lifecycle_logs.create({
    data: {
      order_id: order.id,
      tenant_id: tenantId,
      from_state: null,
      to_state: 'PAYMENT_PENDING',
      actor_id: userId,
      realm: 'tenant',
      request_id: requestId,
    },
  });

  return order.id;
}

async function ensureRfq(
  tx: Tx,
  buyerOrgId: string,
  buyerUserId: string,
  supplierOrgId: string,
  catalogItemId: string,
  quantity: number,
  buyerMessage: string,
) {
  const existing = await tx.rfq.findFirst({
    where: {
      orgId: buyerOrgId,
      supplierOrgId,
      catalogItemId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing.id;
  }

  const rfq = await tx.rfq.create({
    data: {
      orgId: buyerOrgId,
      supplierOrgId,
      catalogItemId,
      quantity,
      buyerMessage,
      status: 'OPEN',
      createdByUserId: buyerUserId,
    },
    select: {
      id: true,
    },
  });

  return rfq.id;
}

async function ensureAuditLog(
  tx: Tx,
  input: {
    realm: 'ADMIN' | 'TENANT';
    tenantId: string | null;
    actorId: string | null;
    actorType: 'ADMIN' | 'SYSTEM' | 'USER';
    action: string;
    entity: string;
    entityId: string;
    afterJson?: Prisma.InputJsonValue;
    metadataJson?: Prisma.InputJsonValue;
  },
) {
  const existing = await tx.auditLog.findFirst({
    where: {
      realm: input.realm,
      tenantId: input.tenantId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing.id;
  }

  const log = await tx.auditLog.create({
    data: {
      realm: input.realm,
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorType: input.actorType,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      afterJson: input.afterJson,
      metadataJson: input.metadataJson,
    },
    select: {
      id: true,
    },
  });

  return log.id;
}

async function seedOperationalOverrides(tx: Tx, qaB2b: SeededTenantIdentity, qaWl: SeededTenantIdentity) {
  await tx.tenantFeatureOverride.upsert({
    where: {
      tenantId_key: {
        tenantId: qaB2b.tenantId,
        key: 'MULTI_CURRENCY',
      },
    },
    update: { enabled: true },
    create: {
      tenantId: qaB2b.tenantId,
      key: 'MULTI_CURRENCY',
      enabled: true,
    },
  });

  await tx.aiBudget.upsert({
    where: { tenantId: qaB2b.tenantId },
    update: {
      monthlyLimit: 100000,
      hardStop: false,
    },
    create: {
      tenantId: qaB2b.tenantId,
      monthlyLimit: 100000,
      hardStop: false,
    },
  });

  await tx.aiBudget.upsert({
    where: { tenantId: qaWl.tenantId },
    update: {
      monthlyLimit: 500000,
      hardStop: true,
    },
    create: {
      tenantId: qaWl.tenantId,
      monthlyLimit: 500000,
      hardStop: true,
    },
  });

  await tx.aiUsageMeter.upsert({
    where: {
      tenantId_month: {
        tenantId: qaB2b.tenantId,
        month: CURRENT_MONTH,
      },
    },
    update: {
      tokens: 15000,
      costEstimate: toDecimal(0.75),
    },
    create: {
      tenantId: qaB2b.tenantId,
      month: CURRENT_MONTH,
      tokens: 15000,
      costEstimate: toDecimal(0.75),
    },
  });

  await tx.aiUsageMeter.upsert({
    where: {
      tenantId_month: {
        tenantId: qaWl.tenantId,
        month: CURRENT_MONTH,
      },
    },
    update: {
      tokens: 85000,
      costEstimate: toDecimal(4.25),
    },
    create: {
      tenantId: qaWl.tenantId,
      month: CURRENT_MONTH,
      tokens: 85000,
      costEstimate: toDecimal(4.25),
    },
  });
}

async function seedCanonicalQaBaseline(tx: Tx, passwordHash: string) {
  const { superAdmin, supportAdmin } = await seedAdminUsers(tx, passwordHash);
  await seedFeatureFlags(tx);

  const qaB2b = await ensureOwnerSeed(tx, QA_B2B_SPEC, passwordHash);
  const qaB2c = await ensureOwnerSeed(tx, QA_B2C_SPEC, passwordHash);
  const qaWl = await ensureOwnerSeed(tx, QA_WL_SPEC, passwordHash);
  const qaAgg = await ensureOwnerSeed(tx, QA_AGG_SPEC, passwordHash);
  const qaPend = await ensureOwnerSeed(tx, QA_PEND_SPEC, passwordHash);

  const qaWlMemberUser = await ensureUserIdentity(tx, 'qa.wl.member@texqtic.com', passwordHash);
  await ensureMembership(tx, qaWl.tenantId, qaWlMemberUser.id, 'MEMBER');
  await assertUserIsolatedToTenant(tx, qaWlMemberUser.id, qaWl.tenantId, 'qa.wl.member@texqtic.com');

  const qaB2bItems = await ensureCatalogItems(tx, qaB2b.tenantId, QA_B2B_CATALOG);
  const qaB2cItems = await ensureCatalogItems(tx, qaB2c.tenantId, QA_B2C_CATALOG);
  const qaWlItems = await ensureCatalogItems(tx, qaWl.tenantId, QA_WL_CATALOG);
  const qaB2bResidueDeactivated = await deactivateCatalogResidue(
    tx,
    qaB2b.tenantId,
    QA_B2B_CATALOG.map(item => item.sku),
  );

  await ensureActiveCartWithItem(tx, qaB2c.tenantId, qaB2c.ownerUserId, qaB2cItems[0].id, 1);
  await ensureOrderWithItem(
    tx,
    qaB2b.tenantId,
    qaB2b.ownerUserId,
    qaB2bItems[0],
    5,
    'seed:qa-b2b-order',
  );
  await ensureOrderWithItem(
    tx,
    qaWl.tenantId,
    qaWl.ownerUserId,
    qaWlItems[0],
    2,
    'seed:qa-wl-order',
  );
  await ensureRfq(
    tx,
    qaB2b.tenantId,
    qaB2b.ownerUserId,
    qaWl.tenantId,
    qaWlItems[0].id,
    6,
    'Bounded canonical QA baseline RFQ proof',
  );

  await seedOperationalOverrides(tx, qaB2b, qaWl);

  await ensureAuditLog(tx, {
    realm: 'ADMIN',
    tenantId: null,
    actorId: superAdmin.id,
    actorType: 'ADMIN',
    action: 'qa.seed.baseline_synced',
    entity: 'tenant',
    entityId: qaB2b.tenantId,
    afterJson: {
      slug: qaB2b.slug,
      name: qaB2b.displayName,
    },
  });

  await ensureAuditLog(tx, {
    realm: 'TENANT',
    tenantId: qaB2b.tenantId,
    actorId: qaB2b.ownerUserId,
    actorType: 'USER',
    action: 'qa.seed.b2b_ready',
    entity: 'tenant',
    entityId: qaB2b.tenantId,
    metadataJson: {
      slug: qaB2b.slug,
      proof: ['catalog', 'rfq', 'order', 'audit'],
      deactivatedCatalogResidue: qaB2bResidueDeactivated,
    },
  });

  await ensureAuditLog(tx, {
    realm: 'TENANT',
    tenantId: qaAgg.tenantId,
    actorId: qaAgg.ownerUserId,
    actorType: 'USER',
    action: 'qa.seed.agg_ready',
    entity: 'tenant',
    entityId: qaAgg.tenantId,
    metadataJson: {
      slug: qaAgg.slug,
      proof: ['discovery', 'audit'],
    },
  });

  await ensureAuditLog(tx, {
    realm: 'TENANT',
    tenantId: qaPend.tenantId,
    actorId: qaPend.ownerUserId,
    actorType: 'USER',
    action: 'qa.seed.pending_ready',
    entity: 'tenant',
    entityId: qaPend.tenantId,
    metadataJson: {
      slug: qaPend.slug,
      status: qaPend.organizationStatus,
    },
  });

  await ensureAuditLog(tx, {
    realm: 'ADMIN',
    tenantId: qaB2b.tenantId,
    actorId: supportAdmin.id,
    actorType: 'ADMIN',
    action: 'qa.seed.ai_budget_synced',
    entity: 'tenant',
    entityId: qaWl.tenantId,
    metadataJson: {
      month: CURRENT_MONTH,
      targets: [qaB2b.slug, qaWl.slug],
    },
  });

  return {
    superAdmin,
    qaB2b,
    qaB2c,
    qaWl,
    qaWlMember: {
      tenantId: qaWl.tenantId,
      email: 'qa.wl.member@texqtic.com',
      userId: qaWlMemberUser.id,
    },
    qaAgg,
    qaPend,
  };
}

async function loadTenantValidationState(slug: string, email: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      branding: true,
      domains: true,
      memberships: {
        include: {
          user: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      emailVerified: true,
    },
  });

  const membership = tenant?.memberships.find(candidate => candidate.user.email === email) ?? null;
  const organization = tenant
    ? await prisma.organizations.findUnique({
        where: { id: tenant.id },
        select: {
          slug: true,
          legal_name: true,
          status: true,
          org_type: true,
          primary_segment_key: true,
          is_white_label: true,
          plan: true,
          secondary_segments: {
            select: {
              segment_key: true,
            },
            orderBy: {
              segment_key: 'asc',
            },
          },
          role_positions: {
            select: {
              role_position_key: true,
            },
            orderBy: {
              role_position_key: 'asc',
            },
          },
        },
      })
    : null;

  const passwordApplied = user ? await bcrypt.compare(QA_PASSWORD, user.passwordHash) : false;
  const directLoginEligible = Boolean(
    user?.emailVerified &&
    passwordApplied &&
    membership &&
    tenant?.status === 'ACTIVE',
  );

  const descriptor = tenant && membership && organization
    ? createTenantSessionRuntimeDescriptor({
        tenantId: tenant.id,
        tenantSlug: organization.slug,
        tenantName: organization.legal_name,
        tenantCategory: organization.org_type,
        whiteLabelCapability: organization.is_white_label,
        commercialPlan: organization.plan,
        authenticatedRole: membership.role,
      })
    : null;

  return {
    tenant,
    user,
    membership,
    organization,
    descriptor,
    passwordApplied,
    directLoginEligible,
  };
}

type TenantValidationState = Awaited<ReturnType<typeof loadTenantValidationState>>;

function baseTenantValidation(state: TenantValidationState) {
  return {
    email: state.user?.email ?? null,
    slug: state.tenant?.slug ?? null,
    displayName: state.organization?.legal_name ?? null,
    runtimeFamily: state.descriptor?.routeManifestKey ?? null,
    overlays: state.descriptor?.runtimeOverlays ?? [],
    directLoginEligible: state.directLoginEligible,
  };
}

function validateQaB2bIdentity(
  state: TenantValidationState,
  proof: {
    activeCatalogItems: number;
    activeCatalogSkus: string[];
    activeCatalogSkuMatch: boolean;
    rfqs: number;
    orders: number;
    auditLogs: number;
    invalidActiveMediaUrlsPresent: number;
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  const hasIdentity =
    state.tenant?.name === 'QA B2B' &&
    state.organization?.legal_name === 'QA B2B' &&
    state.organization?.org_type === 'B2B' &&
    state.organization?.status === 'ACTIVE' &&
    state.organization?.is_white_label === false &&
    state.membership?.role === 'OWNER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime =
    state.descriptor?.operatingMode === 'B2B_WORKSPACE' &&
    state.descriptor.runtimeOverlays.length === 0;

  const hasProof =
    proof.activeCatalogItems === QA_B2B_CATALOG.length &&
    proof.activeCatalogSkuMatch &&
    proof.rfqs >= 1 &&
    proof.orders >= 1 &&
    proof.auditLogs >= 1 &&
    proof.invalidActiveMediaUrlsPresent === 0 &&
    proof.primarySegmentKey === QA_B2B_SPEC.taxonomy.primarySegmentKey &&
    JSON.stringify(proof.secondarySegmentKeys) === JSON.stringify([...QA_B2B_SPEC.taxonomy.secondarySegmentKeys].sort((left, right) => left.localeCompare(right))) &&
    JSON.stringify(proof.rolePositionKeys) === JSON.stringify([...QA_B2B_SPEC.taxonomy.rolePositionKeys].sort((left, right) => left.localeCompare(right)));

  return {
    ...baseTenantValidation(state),
    proof,
    pass: Boolean(hasIdentity && hasRuntime && hasProof),
  };
}

function validateQaNullTaxonomyControl(
  state: TenantValidationState,
  proof: {
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  return {
    ...baseTenantValidation(state),
    taxonomy: proof,
    pass:
      proof.primarySegmentKey === null &&
      proof.secondarySegmentKeys.length === 0 &&
      proof.rolePositionKeys.length === 0,
  };
}

function validateQaB2cIdentity(
  state: TenantValidationState,
  proof: {
    activeCatalogItems: number;
    activeCartItems: number;
    browseGroupingMode: string;
    legacySeedMediaUrlsPresent: number;
    brandingMediaValid: boolean;
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  const hasIdentity =
    state.tenant?.name === 'QA B2C' &&
    state.organization?.org_type === 'B2C' &&
    state.organization?.status === 'ACTIVE' &&
    state.organization?.is_white_label === false &&
    state.membership?.role === 'OWNER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime = state.descriptor?.operatingMode === 'B2C_STOREFRONT';
  const hasProof =
    proof.activeCatalogItems >= QA_B2C_CATALOG.length &&
    proof.activeCartItems >= 1 &&
    proof.legacySeedMediaUrlsPresent === 0 &&
    proof.brandingMediaValid &&
    proof.primarySegmentKey === null &&
    proof.secondarySegmentKeys.length === 0 &&
    proof.rolePositionKeys.length === 0;

  return {
    ...baseTenantValidation(state),
    proof,
    pass: Boolean(hasIdentity && hasRuntime && hasProof),
  };
}

function validateQaWlOwnerIdentity(
  state: TenantValidationState,
  proof: {
    brandingRow: boolean;
    primaryDomain: string | null;
    secondaryDomains: string[];
    activeCatalogItems: number;
    collectionGroups: number;
    collectionGroupingMode: string;
    orders: number;
    staffMemberships: number;
    legacySeedMediaUrlsPresent: number;
    brandingMediaValid: boolean;
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  const hasIdentity =
    state.tenant?.name === 'QA WL' &&
    state.organization?.org_type === 'B2C' &&
    state.organization?.status === 'ACTIVE' &&
    state.organization?.is_white_label === true &&
    state.membership?.role === 'OWNER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime =
    state.descriptor?.operatingMode === 'WL_STOREFRONT' &&
    state.descriptor.runtimeOverlays.includes('WL_ADMIN');

  const hasProof =
    proof.brandingRow &&
    proof.primaryDomain === 'qa-wl.platform.texqtic.com' &&
    proof.secondaryDomains.includes('qa-wl.shop.texqtic.com') &&
    proof.activeCatalogItems >= 3 &&
    proof.collectionGroups >= 1 &&
    proof.orders >= 1 &&
    proof.staffMemberships >= 2 &&
    proof.legacySeedMediaUrlsPresent === 0 &&
    proof.brandingMediaValid &&
    proof.primarySegmentKey === null &&
    proof.secondarySegmentKeys.length === 0 &&
    proof.rolePositionKeys.length === 0;

  return {
    ...baseTenantValidation(state),
    proof,
    pass: Boolean(hasIdentity && hasRuntime && hasProof),
  };
}

function validateQaWlMemberIdentity(state: TenantValidationState) {
  const hasIdentity =
    state.organization?.is_white_label === true &&
    state.membership?.role === 'MEMBER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime =
    state.descriptor?.operatingMode === 'WL_STOREFRONT' &&
    state.descriptor.runtimeOverlays.length === 0;

  return {
    ...baseTenantValidation(state),
    role: state.membership?.role ?? null,
    pass: Boolean(hasIdentity && hasRuntime),
  };
}

function validateQaAggIdentity(
  state: TenantValidationState,
  proof: {
    visibleDiscoveryRows: number;
    auditLogs: number;
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  const hasIdentity =
    state.organization?.org_type === 'AGGREGATOR' &&
    state.organization?.status === 'ACTIVE' &&
    state.organization?.is_white_label === false &&
    state.membership?.role === 'OWNER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime = state.descriptor?.operatingMode === 'AGGREGATOR_WORKSPACE';
  const hasProof =
    proof.visibleDiscoveryRows >= 2 &&
    proof.auditLogs >= 1 &&
    proof.primarySegmentKey === null &&
    proof.secondarySegmentKeys.length === 0 &&
    proof.rolePositionKeys.length === 0;

  return {
    ...baseTenantValidation(state),
    proof,
    pass: Boolean(hasIdentity && hasRuntime && hasProof),
  };
}

function validateQaPendIdentity(
  state: TenantValidationState,
  proof: {
    primarySegmentKey: string | null;
    secondarySegmentKeys: string[];
    rolePositionKeys: string[];
  },
) {
  const hasIdentity =
    state.tenant?.status === 'ACTIVE' &&
    state.organization?.org_type === 'B2B' &&
    state.organization?.status === 'PENDING_VERIFICATION' &&
    state.organization?.is_white_label === false &&
    state.membership?.role === 'OWNER' &&
    state.passwordApplied &&
    state.directLoginEligible;

  const hasRuntime =
    state.descriptor?.operatingMode === 'B2B_WORKSPACE' &&
    state.descriptor.runtimeOverlays.length === 0;

  const hasNullTaxonomy =
    proof.primarySegmentKey === null &&
    proof.secondarySegmentKeys.length === 0 &&
    proof.rolePositionKeys.length === 0;

  return {
    ...baseTenantValidation(state),
    taxonomy: proof,
    posture: state.organization?.status ?? null,
    tenantStatus: state.tenant?.status ?? null,
    pass: Boolean(hasIdentity && hasRuntime && hasNullTaxonomy),
  };
}

async function validateQaBaseline() {
  const [qaCtrl, qaB2b, qaB2c, qaWlOwner, qaWlMember, qaAgg, qaPend] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { email: QA_CTRL_EMAIL },
      select: {
        email: true,
        role: true,
        passwordHash: true,
      },
    }),
    loadTenantValidationState('qa-b2b', 'qa.b2b@texqtic.com'),
    loadTenantValidationState('qa-b2c', 'qa.b2c@texqtic.com'),
    loadTenantValidationState('qa-wl', 'qa.wl@texqtic.com'),
    loadTenantValidationState('qa-wl', 'qa.wl.member@texqtic.com'),
    loadTenantValidationState('qa-agg', 'qa.agg@texqtic.com'),
    loadTenantValidationState('qa-pend', 'qa.pending@texqtic.com'),
  ]);

  const [qaCtrlPasswordApplied, legacyAcmeTenant, legacyAcmeUser] = await Promise.all([
    qaCtrl ? bcrypt.compare(QA_PASSWORD, qaCtrl.passwordHash) : Promise.resolve(false),
    prisma.tenant.findUnique({ where: { slug: 'acme-corp' }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: 'owner@acme.example.com' }, select: { id: true } }),
  ]);

  const [qaB2bCatalogCount, qaB2bActiveCatalog, qaB2bRfqCount, qaB2bOrderCount, qaB2bAuditCount] = qaB2b.tenant
    ? await Promise.all([
        prisma.catalogItem.count({ where: { tenantId: qaB2b.tenant.id, active: true } }),
        prisma.catalogItem.findMany({
          where: { tenantId: qaB2b.tenant.id, active: true },
          select: {
            sku: true,
            imageUrl: true,
          },
        }),
        prisma.rfq.count({ where: { orgId: qaB2b.tenant.id } }),
        prisma.order.count({ where: { tenantId: qaB2b.tenant.id } }),
        prisma.auditLog.count({ where: { tenantId: qaB2b.tenant.id } }),
      ])
    : [0, [], 0, 0, 0];

  const qaB2bActiveCatalogSkus = normalizeDefinedStrings(qaB2bActiveCatalog.map(item => item.sku));
  const qaB2bActiveCatalogSkuMatch =
    JSON.stringify(qaB2bActiveCatalogSkus) === JSON.stringify(QA_B2B_CATALOG_SORTED_SKUS);
  const qaB2bInvalidActiveMediaCount = qaB2bActiveCatalog.filter(item => {
    if (!item.imageUrl) {
      return true;
    }

    return hasLegacyPlaceholderHost(item.imageUrl) || !item.imageUrl.includes(QA_PLACEHOLDER_HOST);
  }).length;

  const qaB2cActiveCart = qaB2c.tenant && qaB2c.user
    ? await prisma.cart.findFirst({
        where: {
          tenantId: qaB2c.tenant.id,
          userId: qaB2c.user.id,
          status: 'ACTIVE',
        },
        include: {
          items: true,
        },
      })
    : null;

  const [qaB2cCatalogCount, qaB2cLegacySeedMediaCount, qaWlCatalogCount, qaWlLegacySeedMediaCount, qaWlOrderCount, qaAggAuditCount] = await Promise.all([
    qaB2c.tenant ? prisma.catalogItem.count({ where: { tenantId: qaB2c.tenant.id, active: true } }) : Promise.resolve(0),
    qaB2c.tenant
      ? prisma.catalogItem.count({
          where: {
            tenantId: qaB2c.tenant.id,
            sku: { in: QA_B2C_CATALOG.map(item => item.sku) },
            imageUrl: { contains: 'example.com' },
          },
        })
      : Promise.resolve(0),
    qaWlOwner.tenant ? prisma.catalogItem.count({ where: { tenantId: qaWlOwner.tenant.id, active: true } }) : Promise.resolve(0),
    qaWlOwner.tenant
      ? prisma.catalogItem.count({
          where: {
            tenantId: qaWlOwner.tenant.id,
            sku: { in: QA_WL_CATALOG.map(item => item.sku) },
            imageUrl: { contains: 'example.com' },
          },
        })
      : Promise.resolve(0),
    qaWlOwner.tenant ? prisma.order.count({ where: { tenantId: qaWlOwner.tenant.id } }) : Promise.resolve(0),
    qaAgg.tenant ? prisma.auditLog.count({ where: { tenantId: qaAgg.tenant.id } }) : Promise.resolve(0),
  ]);

  const qaAggDiscoveryVisibleCount = qaAgg.tenant
    ? await prisma.organizations.count({
        where: {
          id: { not: qaAgg.tenant.id },
          is_white_label: false,
          org_type: 'B2B',
          status: {
            in: ['ACTIVE', 'VERIFICATION_APPROVED'],
          },
        },
      })
    : 0;

  const validation = {
    qaCtrl: {
      email: QA_CTRL_EMAIL,
      exists: Boolean(qaCtrl),
      role: qaCtrl?.role ?? null,
      passwordApplied: qaCtrlPasswordApplied,
      pass: Boolean(qaCtrl && qaCtrlPasswordApplied && qaCtrl.role === 'SUPER_ADMIN'),
    },
    qaB2B: validateQaB2bIdentity(qaB2b, {
      activeCatalogItems: qaB2bCatalogCount,
      activeCatalogSkus: qaB2bActiveCatalogSkus,
      activeCatalogSkuMatch: qaB2bActiveCatalogSkuMatch,
      rfqs: qaB2bRfqCount,
      orders: qaB2bOrderCount,
      auditLogs: qaB2bAuditCount,
      invalidActiveMediaUrlsPresent: qaB2bInvalidActiveMediaCount,
      primarySegmentKey: qaB2b.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaB2b.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaB2b.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    qaB2C: validateQaB2cIdentity(qaB2c, {
      activeCatalogItems: qaB2cCatalogCount,
      activeCartItems: qaB2cActiveCart?.items.length ?? 0,
      browseGroupingMode: 'catalog-grid',
      legacySeedMediaUrlsPresent: qaB2cLegacySeedMediaCount,
      brandingMediaValid: !hasLegacyPlaceholderHost(qaB2c.tenant?.branding?.logoUrl),
      primarySegmentKey: qaB2c.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaB2c.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaB2c.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    qaWL: validateQaWlOwnerIdentity(qaWlOwner, {
      brandingRow: Boolean(qaWlOwner.tenant?.branding),
      primaryDomain: qaWlOwner.tenant?.domains.find(domain => domain.primary)?.domain ?? null,
      secondaryDomains: qaWlOwner.tenant?.domains
        .filter(domain => !domain.primary)
        .map(domain => domain.domain) ?? [],
      activeCatalogItems: qaWlCatalogCount,
      collectionGroups: qaWlCatalogCount > 0 ? 1 : 0,
      collectionGroupingMode: 'uncategorised-fallback',
      orders: qaWlOrderCount,
      staffMemberships: qaWlOwner.tenant?.memberships.length ?? 0,
      legacySeedMediaUrlsPresent: qaWlLegacySeedMediaCount,
      brandingMediaValid: !hasLegacyPlaceholderHost(qaWlOwner.tenant?.branding?.logoUrl),
      primarySegmentKey: qaWlOwner.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaWlOwner.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaWlOwner.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    qaWLMember: validateQaWlMemberIdentity(qaWlMember),
    qaWLMemberTaxonomy: validateQaNullTaxonomyControl(qaWlMember, {
      primarySegmentKey: qaWlMember.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaWlMember.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaWlMember.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    qaAgg: validateQaAggIdentity(qaAgg, {
      visibleDiscoveryRows: qaAggDiscoveryVisibleCount,
      auditLogs: qaAggAuditCount,
      primarySegmentKey: qaAgg.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaAgg.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaAgg.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    qaPend: validateQaPendIdentity(qaPend, {
      primarySegmentKey: qaPend.organization?.primary_segment_key ?? null,
      secondarySegmentKeys: normalizeDefinedStrings(qaPend.organization?.secondary_segments?.map(segment => segment.segment_key) ?? []),
      rolePositionKeys: normalizeDefinedStrings(qaPend.organization?.role_positions?.map(position => position.role_position_key) ?? []),
    }),
    legacyChecks: {
      acmeSlugRetired: !legacyAcmeTenant,
      acmeOwnerEmailRetired: !legacyAcmeUser,
      whiteLabelCoNotCanonicalSlug: qaB2c.tenant?.slug === 'qa-b2c' && qaWlOwner.tenant?.slug === 'qa-wl',
    },
  };

  const overallPass =
    validation.qaCtrl.pass &&
    validation.qaB2B.pass &&
    validation.qaB2C.pass &&
    validation.qaWL.pass &&
    validation.qaWLMember.pass &&
    validation.qaWLMemberTaxonomy.pass &&
    validation.qaAgg.pass &&
    validation.qaPend.pass &&
    validation.legacyChecks.acmeSlugRetired &&
    validation.legacyChecks.acmeOwnerEmailRetired &&
    validation.legacyChecks.whiteLabelCoNotCanonicalSlug;

  return {
    overallPass,
    identities: validation,
  };
}

async function main() {
  console.log('Starting canonical QA baseline seed...');
  const discoveryEligibleCount = await assertAggregatorDiscoveryCapacity();
  console.log(`Discovery-eligible B2B organizations detected before seed: ${discoveryEligibleCount}`);

  const passwordHash = await bcrypt.hash(QA_PASSWORD, 10);

  await prisma.$transaction(
    async tx => {
      await seedCanonicalQaBaseline(tx, passwordHash);
    },
    {
      timeout: 30000,
    },
  );

  const validation = await validateQaBaseline();
  console.log(JSON.stringify(validation, null, 2));

  if (!validation.overallPass) {
    throw new Error('Canonical QA baseline validation failed');
  }

  console.log('Canonical QA baseline seed completed successfully.');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
