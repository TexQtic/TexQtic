import type { PrismaClient } from '@prisma/client';
import {
  getOrganizationIdentity,
  type OrganizationIdentity,
  withAdminContext,
  withOrgAdminContext,
} from '../lib/database-context.js';

const TRACEABILITY_SUMMARY_LIMIT = 12;

type TrustCertificationSummary = {
  certificationType: string;
  lifecycleState: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
};

type EvidenceSummary = {
  hasTraceabilityEvidence: boolean;
  nodeTypePresence: string[];
  visibilityIndicators: string[];
};
const DISCOVERY_ELIGIBLE_ORG_TYPES = ['B2B'] as const;
const DISCOVERY_ELIGIBLE_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED'] as const;

export type CounterpartyProfileAggregation = {
  orgId: string;
  identity: {
    orgId: string;
    slug: string;
    legalName: string;
    orgType: string;
    jurisdiction: string;
    registrationNumber: string | null;
    status: string;
  };
  trustSummary: {
    certifications: TrustCertificationSummary[];
  };
  evidenceSummary: EvidenceSummary;
};
export type CounterpartyDiscoveryEntry = {
  orgId: string;
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  visibilityIndicators: string[];
};

type DiscoveryOrganizationRow = {
  id: string;
  slug: string;
  legal_name: string;
  org_type: string;
  jurisdiction: string;
  registration_no: string | null;
  status: string;
};

function toIdentitySummary(
  identity: OrganizationIdentity,
): CounterpartyProfileAggregation['identity'] {
  return {
    orgId: identity.id,
    slug: identity.slug,
    legalName: identity.legal_name,
    orgType: identity.org_type,
    jurisdiction: identity.jurisdiction,
    registrationNumber: identity.registration_no,
    status: identity.status,
  };
}

export async function getCounterpartyProfileAggregation(
  orgId: string,
  prismaClient: PrismaClient,
): Promise<CounterpartyProfileAggregation> {
  const [identity, trustSummary, evidenceSummary] = await Promise.all([
    getOrganizationIdentity(orgId, prismaClient),
    readTrustSummary(orgId, prismaClient),
    readEvidenceSummary(orgId, prismaClient),
  ]);

  return {
    orgId,
    identity: toIdentitySummary(identity),
    trustSummary,
    evidenceSummary,
  };
}
function toDiscoveryEntry(
  profile: CounterpartyProfileAggregation,
): CounterpartyDiscoveryEntry {
  return {
    orgId: profile.orgId,
    slug: profile.identity.slug,
    legalName: profile.identity.legalName,
    orgType: profile.identity.orgType,
    jurisdiction: profile.identity.jurisdiction,
    certificationCount: profile.trustSummary.certifications.length,
    certificationTypes: Array.from(
      new Set(profile.trustSummary.certifications.map(certification => certification.certificationType)),
    ).slice(0, TRACEABILITY_SUMMARY_LIMIT),
    hasTraceabilityEvidence: profile.evidenceSummary.hasTraceabilityEvidence,
    visibilityIndicators: profile.evidenceSummary.visibilityIndicators,
  };
}

export async function listCounterpartyDiscoveryEntries(
  currentOrgId: string,
  prismaClient: PrismaClient,
  limit: number,
): Promise<CounterpartyDiscoveryEntry[]> {
  const organizations: DiscoveryOrganizationRow[] = await withOrgAdminContext(prismaClient, async tx => {
    return tx.organizations.findMany({
      where: {
        id: { not: currentOrgId },
        is_white_label: false,
        org_type: { in: [...DISCOVERY_ELIGIBLE_ORG_TYPES] },
        status: { in: [...DISCOVERY_ELIGIBLE_STATUSES] },
      },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        org_type: true,
        jurisdiction: true,
        registration_no: true,
        status: true,
      },
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
      take: limit,
    });
  });

  if (organizations.length === 0) {
    return [];
  }

  const orgIds = organizations.map((organization: DiscoveryOrganizationRow) => organization.id);

  const certificationRows = await withAdminContext(prismaClient, async tx => {
    return tx.certification.findMany({
      where: { orgId: { in: orgIds } },
      select: {
        orgId: true,
        certificationType: true,
        issuedAt: true,
        expiresAt: true,
        lifecycleState: {
          select: {
            stateKey: true,
          },
        },
      },
      orderBy: [{ orgId: 'asc' }, { issuedAt: 'desc' }, { createdAt: 'desc' }],
    });
  });

  const evidenceRows = await withAdminContext(prismaClient, async tx => {
    return tx.traceabilityNode.findMany({
      where: { orgId: { in: orgIds } },
      select: {
        orgId: true,
        nodeType: true,
        visibility: true,
      },
      orderBy: [{ orgId: 'asc' }, { visibility: 'asc' }, { nodeType: 'asc' }],
    });
  });

  const certificationsByOrgId = new Map<string, TrustCertificationSummary[]>();

  for (const row of certificationRows) {
    const certifications = certificationsByOrgId.get(row.orgId) ?? [];
    certifications.push({
      certificationType: row.certificationType,
      lifecycleState: row.lifecycleState.stateKey,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
    });
    certificationsByOrgId.set(row.orgId, certifications);
  }

  const evidenceByOrgId = new Map<string, EvidenceSummary>();

  for (const row of evidenceRows) {
    const evidence = evidenceByOrgId.get(row.orgId) ?? {
      hasTraceabilityEvidence: false,
      nodeTypePresence: [],
      visibilityIndicators: [],
    };

    evidence.hasTraceabilityEvidence = true;

    if (
      evidence.nodeTypePresence.length < TRACEABILITY_SUMMARY_LIMIT &&
      !evidence.nodeTypePresence.includes(row.nodeType)
    ) {
      evidence.nodeTypePresence.push(row.nodeType);
    }

    if (
      evidence.visibilityIndicators.length < TRACEABILITY_SUMMARY_LIMIT &&
      !evidence.visibilityIndicators.includes(row.visibility)
    ) {
      evidence.visibilityIndicators.push(row.visibility);
    }

    evidenceByOrgId.set(row.orgId, evidence);
  }

  const profiles: CounterpartyProfileAggregation[] = organizations.map((organization: DiscoveryOrganizationRow) => ({
    orgId: organization.id,
    identity: {
      orgId: organization.id,
      slug: organization.slug,
      legalName: organization.legal_name,
      orgType: organization.org_type,
      jurisdiction: organization.jurisdiction,
      registrationNumber: organization.registration_no,
      status: organization.status,
    },
    trustSummary: {
      certifications: certificationsByOrgId.get(organization.id) ?? [],
    },
    evidenceSummary: evidenceByOrgId.get(organization.id) ?? {
      hasTraceabilityEvidence: false,
      nodeTypePresence: [],
      visibilityIndicators: [],
    },
  }));

  return profiles.map(toDiscoveryEntry);
}

async function readTrustSummary(
  orgId: string,
  prismaClient: PrismaClient,
): Promise<CounterpartyProfileAggregation['trustSummary']> {
  const certifications = await withAdminContext(prismaClient, async tx => {
    const rows = await tx.certification.findMany({
      where: { orgId },
      select: {
        certificationType: true,
        issuedAt: true,
        expiresAt: true,
        lifecycleState: {
          select: {
            stateKey: true,
          },
        },
      },
      orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row: {
      certificationType: string;
      issuedAt: Date | null;
      expiresAt: Date | null;
      lifecycleState: { stateKey: string };
    }) => ({
      certificationType: row.certificationType,
      lifecycleState: row.lifecycleState.stateKey,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
    }));
  });

  return { certifications };
}

async function readEvidenceSummary(
  orgId: string,
  prismaClient: PrismaClient,
): Promise<EvidenceSummary> {
  return withAdminContext(prismaClient, async tx => {
    const traceabilityEvidence = await tx.traceabilityNode.findFirst({
      where: { orgId },
      select: { id: true },
    });

    if (!traceabilityEvidence) {
      return {
        hasTraceabilityEvidence: false,
        nodeTypePresence: [],
        visibilityIndicators: [],
      };
    }

    const nodeTypeRows = await tx.traceabilityNode.findMany({
      where: { orgId },
      select: { nodeType: true },
      distinct: ['nodeType'],
      orderBy: { nodeType: 'asc' },
      take: TRACEABILITY_SUMMARY_LIMIT,
    });

    const visibilityRows = await tx.traceabilityNode.findMany({
      where: { orgId },
      select: { visibility: true },
      distinct: ['visibility'],
      orderBy: { visibility: 'asc' },
      take: TRACEABILITY_SUMMARY_LIMIT,
    });

    return {
      hasTraceabilityEvidence: true,
      nodeTypePresence: nodeTypeRows.map((row: { nodeType: string }) => row.nodeType),
      visibilityIndicators: visibilityRows.map((row: { visibility: string }) => row.visibility),
    };
  });
}
