import type { PrismaClient } from '@prisma/client';
import {
  getOrganizationIdentity,
  type OrganizationIdentity,
  withAdminContext,
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
