import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { withAdminContext } from '../../lib/database-context.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { config } from '../../config/index.js';
import { getPublicB2BSupplierBySlug } from '../../services/publicB2BProjection.service.js';
import { sendError, sendValidationError } from '../../utils/response.js';

const REPLAY_WINDOW_MS = 60_000;
const HMAC_HEADER = 'x-texqtic-provisioning-hmac';
const TS_HEADER = 'x-texqtic-provisioning-ts';

const prohibitedFields = new Set([
  'phone',
  'supplier_phone_comparable',
  'email',
  'contact_email',
  'contact_phone',
  'field_agent_uid_raw',
  'field_agent_id',
  'acquisition_submission_id',
  'referral_id',
  'referral_code',
  'cae_draft_id',
  'cae_draft_payload',
  'photo_attachment_urls',
  'commission_data',
  'commission_rate',
  'payment_data',
  'payment_terms',
  'private_crm_notes',
  'internal_notes',
  'buyer_data',
  'order_state',
  'trade_state',
  'negotiation_state',
  'ttp_enabled',
  'escrow_account_id',
]);

const payloadSchema = z
  .object({
    eventName: z.literal('public_supplier_profile.provision_requested.v1'),
    eventId: z.string().trim().min(1).max(255),
    requestedAt: z.string().datetime(),
    external_orchestration_ref: z.string().trim().min(1).max(255),
    crmSupplierId: z.string().trim().min(1).max(255),
    supplierName: z.string().trim().min(2).max(200),
    publication_posture_target: z.literal('B2B_PUBLIC'),
    cluster: z.string().trim().min(1).max(100).nullable().optional(),
    category: z.string().trim().min(1).max(100).nullable().optional(),
    likelyPrimarySegment: z.string().trim().min(1).max(100).nullable().optional(),
    provisionalPlan: z.string().trim().min(1).max(50).nullable().optional(),
    jurisdiction: z.string().trim().min(2).max(100).nullable().optional(),
  })
  .strict();

type ProvisionPayload = z.infer<typeof payloadSchema>;

type ProvisionLookup = {
  conflict: boolean;
  orgId: string;
  slug: string;
  isNew: boolean;
  publicationPosture: string;
  status: string;
};

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 90);

  return slug || 'supplier';
}

function normalizeIdentityName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function canonicalBody(payload: ProvisionPayload): string {
  const obj: Record<string, unknown> = {
    eventName: payload.eventName,
    eventId: payload.eventId,
    requestedAt: payload.requestedAt,
    external_orchestration_ref: payload.external_orchestration_ref,
    crmSupplierId: payload.crmSupplierId,
    supplierName: payload.supplierName,
    publication_posture_target: payload.publication_posture_target,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'cluster')) {
    obj.cluster = payload.cluster;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
    obj.category = payload.category;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'likelyPrimarySegment')) {
    obj.likelyPrimarySegment = payload.likelyPrimarySegment;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'provisionalPlan')) {
    obj.provisionalPlan = payload.provisionalPlan;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'jurisdiction')) {
    obj.jurisdiction = payload.jurisdiction;
  }

  return JSON.stringify(obj);
}

function verifyProvisioningHmac(
  payload: ProvisionPayload,
  hmacHeader: string | undefined,
  tsHeader: string | undefined,
  secret: string,
): boolean {
  if (!hmacHeader || !tsHeader) {
    return false;
  }

  const tsMs = Number.parseInt(tsHeader, 10);
  if (!Number.isFinite(tsMs)) {
    return false;
  }

  if (Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) {
    return false;
  }

  const bodyHash = createHash('sha256').update(canonicalBody(payload), 'utf8').digest('hex');
  const canonical = `provision:${tsMs}:${bodyHash}`;
  const expectedHex = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(hmacHeader, 'hex');
    if (expected.length !== actual.length) {
      return false;
    }
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function emitProvisionAudit(
  action: string,
  orgId: string,
  afterJson: Record<string, unknown>,
): Promise<void> {
  await prisma.$transaction(async tx => {
    await writeAuditLog(tx, {
      realm: 'TENANT',
      tenantId: orgId,
      actorType: 'SYSTEM',
      actorId: null,
      action,
      entity: 'organization',
      entityId: orgId,
      afterJson: afterJson as Prisma.JsonValue,
    });
  });
}

async function generateUniqueSlug(tx: {
  organizations: { findMany: (args: unknown) => Promise<Array<{ slug: string }>> };
  tenant: { findMany: (args: unknown) => Promise<Array<{ slug: string }>> };
}, supplierName: string): Promise<string> {
  const base = slugify(supplierName);

  const [orgSlugs, tenantSlugs] = await Promise.all([
    tx.organizations.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
      take: 200,
    }),
    tx.tenant.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
      take: 200,
    }),
  ]);

  const taken = new Set([...orgSlugs.map(row => row.slug), ...tenantSlugs.map(row => row.slug)]);
  if (!taken.has(base)) {
    return base;
  }

  for (let i = 2; i <= 1000; i += 1) {
    const suffix = `-${i}`;
    const candidate = `${base.substring(0, Math.max(1, 100 - suffix.length))}${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${base.substring(0, 84)}-${randomUUID().substring(0, 8)}`;
}

async function provisionOrLookupOrganization(payload: ProvisionPayload): Promise<ProvisionLookup> {
  const jurisdiction = payload.jurisdiction?.trim() || 'IN';

  return withAdminContext(prisma, async tx => {
    const existing = await tx.organizations.findUnique({
      where: { external_orchestration_ref: payload.external_orchestration_ref },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        publication_posture: true,
        status: true,
      },
    });

    if (existing) {
      const sameName = normalizeIdentityName(existing.legal_name) === normalizeIdentityName(payload.supplierName);
      if (!sameName) {
        return {
          conflict: true,
          orgId: existing.id,
          slug: existing.slug,
          isNew: false,
          publicationPosture: existing.publication_posture,
          status: existing.status,
        };
      }

      return {
        conflict: false,
        orgId: existing.id,
        slug: existing.slug,
        isNew: false,
        publicationPosture: existing.publication_posture,
        status: existing.status,
      };
    }

    const orgId = randomUUID();
    const slug = await generateUniqueSlug(tx, payload.supplierName);

    await tx.tenant.create({
      data: {
        id: orgId,
        name: payload.supplierName,
        slug,
        externalOrchestrationRef: payload.external_orchestration_ref,
        isWhiteLabel: false,
        publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
      },
      select: { id: true },
    });

    await tx.organizations.create({
      data: {
        id: orgId,
        slug,
        legal_name: payload.supplierName,
        jurisdiction,
        org_type: 'B2B',
        publication_posture: 'B2B_PUBLIC',
        external_orchestration_ref: payload.external_orchestration_ref,
        primary_segment_key: payload.likelyPrimarySegment ?? undefined,
      },
      select: { id: true },
    });

    return {
      conflict: false,
      orgId,
      slug,
      isNew: true,
      publicationPosture: 'B2B_PUBLIC',
      status: 'ACTIVE',
    };
  });
}

function resolveGateFailureReason(result: Pick<ProvisionLookup, 'publicationPosture' | 'status'>): string {
  if (!['B2B_PUBLIC', 'BOTH'].includes(result.publicationPosture)) {
    return 'PUBLICATION_POSTURE_INELIGIBLE';
  }

  if (!['ACTIVE', 'VERIFICATION_APPROVED'].includes(result.status)) {
    return 'MISSING_REQUIRED_PROJECTION_FIELDS';
  }

  return 'MISSING_REQUIRED_PROJECTION_FIELDS';
}

async function handleProvisionSupplier(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const requestBody =
    request.body && typeof request.body === 'object' && !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : null;

  if (requestBody) {
    for (const key of Object.keys(requestBody)) {
      if (prohibitedFields.has(key)) {
        return void sendError(reply, 'VALIDATION_ERROR', `Field "${key}" is not allowed`, 400);
      }
    }
  }

  const parsed = payloadSchema.safeParse(request.body);
  if (!parsed.success) {
    return void sendValidationError(reply, parsed.error.issues);
  }

  const payload = parsed.data;
  
  // WEBHOOK-007 — Require secret for webhook authentication
  if (!config.ACQUISITION_PROVISIONING_WEBHOOK_SECRET) {
    request.log.error('ACQUISITION_PROVISIONING_WEBHOOK_SECRET not configured');
    return void sendError(
      reply,
      'PROVISIONING_CONFIG_ERROR',
      'Acquisition provisioning webhook is not properly configured.',
      503,
    );
  }
  
  const hmacHeader = request.headers[HMAC_HEADER] as string | undefined;
  const tsHeader = request.headers[TS_HEADER] as string | undefined;
  const authorized = verifyProvisioningHmac(
    payload,
    hmacHeader,
    tsHeader,
    config.ACQUISITION_PROVISIONING_WEBHOOK_SECRET,
  );

  if (!authorized) {
    return void reply.status(401).send();
  }

  const platformRequestId = randomUUID();

  try {
    const provisioningResult = await provisionOrLookupOrganization(payload);

    if (provisioningResult.conflict) {
      return void sendError(
        reply,
        'ORCHESTRATION_REF_CONFLICT',
        'A supplier with this external_orchestration_ref already exists with incompatible identity data.',
        409,
      );
    }

    await emitProvisionAudit('internal.public_supplier_profile.provision_requested', provisioningResult.orgId, {
      external_orchestration_ref: payload.external_orchestration_ref,
      org_type: 'B2B',
      ...(payload.cluster !== undefined ? { cluster: payload.cluster } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.likelyPrimarySegment !== undefined
        ? { likelyPrimarySegment: payload.likelyPrimarySegment }
        : {}),
      timestamp: new Date().toISOString(),
    });

    const projection = await getPublicB2BSupplierBySlug(provisioningResult.slug, prisma);
    if (!projection) {
      const reasonCode = resolveGateFailureReason(provisioningResult);

      await emitProvisionAudit('internal.public_supplier_profile.gate_failed', provisioningResult.orgId, {
        external_orchestration_ref: payload.external_orchestration_ref,
        failed_gate: 'PUBLIC_PROJECTION',
        reason_code: reasonCode,
        timestamp: new Date().toISOString(),
      });

      return void reply.status(202).send({
        accepted: true,
        idempotent: false,
        status: 'gate_failed',
        slug: null,
        publicUrl: null,
        platformRequestId,
        reasonCode,
      });
    }

    const publicUrl = `${config.FRONTEND_URL.replace(/\/$/, '')}/supplier/${provisioningResult.slug}`;

    await emitProvisionAudit('internal.public_supplier_profile.provisioned', provisioningResult.orgId, {
      slug: provisioningResult.slug,
      external_orchestration_ref: payload.external_orchestration_ref,
      publication_posture: projection.profile.publicationPosture,
      timestamp: new Date().toISOString(),
    });

    if (provisioningResult.isNew) {
      return void reply.status(201).send({
        accepted: true,
        idempotent: false,
        status: 'provisioned',
        slug: provisioningResult.slug,
        publicUrl,
        platformRequestId,
        reasonCode: null,
      });
    }

    return void reply.status(200).send({
      accepted: true,
      idempotent: true,
      status: 'already_exists',
      slug: provisioningResult.slug,
      publicUrl,
      platformRequestId,
      reasonCode: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'acquisition provisioning failed');
    return void sendError(
      reply,
      'PROVISIONING_ERROR',
      'An unexpected error occurred during provisioning. Please retry.',
      500,
    );
  }
}

const acquisitionProvisioningRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/acquisition/provision-supplier', handleProvisionSupplier);
};

export default acquisitionProvisioningRoutes;
