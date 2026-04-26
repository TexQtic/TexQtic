import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import type { TenantPlan } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { StateMachineService } from '../services/stateMachine.service.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import tenantEscalationRoutes from './tenant/escalation.g022.js';
import tenantTradesRoutes from './tenant/trades.g017.js';
import tenantEscrowRoutes from './tenant/escrow.g018.js';
import tenantSettlementRoutes from './tenant/settlement.js';
import tenantCertificationRoutes from './tenant/certifications.g019.js';
import tenantTraceabilityRoutes from './tenant/traceability.g016.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
} from '../utils/response.js';
import {
  canonicalizeTenantPlan,
  withDbContext,
  withOrgAdminContext,
  type DatabaseContext,
  getOrganizationIdentity,
  OrganizationNotFoundError,
} from '../lib/database-context.js';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { computeTotals, TotalsInputError } from '../services/pricing/totals.service.js';
import { sendInviteMemberEmail, type EmailDispatchOutcome } from '../services/email/email.service.js';
import bcrypt from 'bcryptjs';
import { emitCacheInvalidate } from '../lib/cacheInvalidateEmitter.js';
import { enqueueSourceIngestion, enqueueSourceDeletion } from '../services/vectorIngestion.js';
import {
  getCounterpartyProfileAggregation,
  listCounterpartyDiscoveryEntries,
  type CounterpartyDiscoveryEntry,
  type CounterpartyProfileAggregation,
} from '../services/counterpartyProfileAggregation.service.js';
import { buildRfqAssistantContext } from '../services/ai/rfqAssistContextBuilder.js';
import { runRfqAssistInference } from '../services/ai/rfqAssistService.js';
import { BudgetExceededError, getMonthKey } from '../lib/aiBudget.js';
import { AiRateLimitExceededError } from '../services/ai/inferenceService.js';

type InviteEmailDeliveryStatus = EmailDispatchOutcome['status'] | 'FAILED_NON_FATAL';

interface InviteEmailDeliveryOutcome {
  status: InviteEmailDeliveryStatus;
}

function failedInviteEmailDeliveryOutcome(): InviteEmailDeliveryOutcome {
  return { status: 'FAILED_NON_FATAL' };
}
/**
 * Wraps a Prisma TransactionClient as PrismaClient for services that require
 * the full client type. Redirects $transaction() to execute the callback
 * immediately in the current tx (Prisma does not support nested transactions).
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

type RfqCatalogItemTarget = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  active: boolean;
  supplierOrgId: string;
  catalogStage: string | null;
};

type TenantSessionIdentity = {
  id: string;
  slug: string;
  name: string;
  type: string;
  tenant_category: string;
  primary_segment_key: string | null;
  secondary_segment_keys: string[];
  role_position_keys: string[];
  is_white_label: boolean;
  status: string;
  plan: TenantPlan;
  base_family: 'B2B' | 'B2C' | 'INTERNAL';
  aggregator_capability: boolean;
  white_label_capability: boolean;
  commercial_plan: TenantPlan;
};

function resolveTenantSessionProvisioningIdentity(input: {
  tenantCategory: string;
  whiteLabelCapability: boolean;
  commercialPlan: TenantPlan;
}) {
  switch (input.tenantCategory) {
    case 'AGGREGATOR':
      return {
        base_family: 'INTERNAL' as const,
        aggregator_capability: true,
        white_label_capability: input.whiteLabelCapability,
        commercial_plan: input.commercialPlan,
      };
    case 'B2B':
    case 'B2C':
    case 'INTERNAL':
      return {
        base_family: input.tenantCategory,
        aggregator_capability: false,
        white_label_capability: input.whiteLabelCapability,
        commercial_plan: input.commercialPlan,
      };
    default:
      throw new Error(`Invalid tenant category: ${input.tenantCategory}`);
  }
}

async function resolveTenantSessionIdentity(input: {
  tenantId: string;
  actorId: string;
  userRole?: string | null;
}): Promise<TenantSessionIdentity> {
  const dbContext: DatabaseContext = {
    orgId: input.tenantId,
    actorId: input.actorId,
    realm: 'tenant',
    requestId: randomUUID(),
  };

  return withDbContext(prisma, dbContext, async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);

    const org = await tx.organizations.findUnique({
      where: { id: input.tenantId },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        status: true,
        org_type: true,
        primary_segment_key: true,
        is_white_label: true,
        jurisdiction: true,
        registration_no: true,
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
    });

    if (!org) {
      throw new OrganizationNotFoundError(input.tenantId);
    }

    const plan = canonicalizeTenantPlan(org.plan);
    const provisioningIdentity = resolveTenantSessionProvisioningIdentity({
      tenantCategory: org.org_type,
      whiteLabelCapability: org.is_white_label,
      commercialPlan: plan,
    });

    return {
      id: org.id,
      slug: org.slug,
      name: org.legal_name,
      type: org.org_type,
      tenant_category: org.org_type,
      primary_segment_key: org.primary_segment_key,
      secondary_segment_keys: org.secondary_segments.map((entry: { segment_key: string }) => entry.segment_key),
      role_position_keys: org.role_positions.map((entry: { role_position_key: string }) => entry.role_position_key),
      is_white_label: org.is_white_label,
      status: org.status,
      plan,
      ...provisioningIdentity,
    };
  });
}

const rfqReadStatusSchema = z.enum(['INITIATED', 'OPEN', 'RESPONDED', 'CLOSED']);

const rfqListQuerySchema = z.object({
  status: rfqReadStatusSchema.optional(),
  sort: z.enum(['updated_at_desc', 'created_at_desc']).optional().default('updated_at_desc'),
  q: z.string().trim().min(1).max(200).optional(),
}).strict();

type BuyerRfqResponseRow = {
  id: string;
  supplierOrgId: string;
  message: string;
  submittedAt: Date;
  createdAt: Date;
};

type BuyerRfqListRow = {
  id: string;
  status: 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';
  orgId: string;
  catalogItemId: string;
  quantity: number;
  supplierOrgId: string;
  createdAt: Date;
  updatedAt: Date;
  catalogItem: {
    name: string;
    sku: string | null;
    price?: number;
  };
  requirementTitle: string | null;
  quantityUnit: string | null;
  urgency: string | null;
  sampleRequired: boolean | null;
  targetDeliveryDate: Date | null;
  deliveryLocation: string | null;
  deliveryCountry: string | null;
  stageRequirementAttributes: Record<string, unknown> | null;
  fieldSourceMeta: Record<string, unknown> | null;
  requirementConfirmedAt: Date | null;
};

type BuyerRfqDetailRow = BuyerRfqListRow & {
  buyerMessage: string | null;
  createdByUserId: string | null;
  supplierResponse: BuyerRfqResponseRow | null;
  tradeContinuity: {
    id: string;
    tradeReference: string;
  } | null;
  supplierCounterpartySummary: CounterpartyProfileAggregation | null;
};

type SupplierRfqListRow = {
  id: string;
  status: 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';
  catalogItemId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  catalogItem: {
    name: string;
    sku: string | null;
  };
  requirementTitle: string | null;
  quantityUnit: string | null;
  urgency: string | null;
  sampleRequired: boolean | null;
  deliveryCountry: string | null;
  stageRequirementAttributes: Record<string, unknown> | null;
};

type SupplierRfqDetailRow = SupplierRfqListRow & {
  buyerMessage: string | null;
  buyerCounterpartySummary: CounterpartyProfileAggregation | null;
};

type SupplierRfqResponseRow = {
  id: string;
  rfqId: string;
  supplierOrgId: string;
  message: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
};

function normalizeCatalogItemPrice<T extends { catalogItem: { price: unknown } }>(item: T) {
  return {
    ...item,
    catalogItem: {
      ...item.catalogItem,
      price: Number(item.catalogItem.price),
    },
  };
}

function serializeCartResponse<T extends { items: Array<{ catalogItem: { price: unknown } }> } | null>(cart: T) {
  if (!cart) {
    return cart;
  }

  return {
    ...cart,
    items: cart.items.map(normalizeCatalogItemPrice),
  };
}

function mapBuyerRfqListItem(rfq: BuyerRfqListRow) {
  return {
    id: rfq.id,
    status: rfq.status,
    org_id: rfq.orgId,
    catalog_item_id: rfq.catalogItemId,
    item_name: rfq.catalogItem.name,
    item_sku: rfq.catalogItem.sku,
    quantity: rfq.quantity,
    supplier_org_id: rfq.supplierOrgId,
    created_at: rfq.createdAt,
    updated_at: rfq.updatedAt,
    requirement_title: rfq.requirementTitle ?? null,
    quantity_unit: rfq.quantityUnit ?? null,
    urgency: rfq.urgency ?? null,
    sample_required: rfq.sampleRequired ?? null,
    target_delivery_date: rfq.targetDeliveryDate ?? null,
    delivery_location: rfq.deliveryLocation ?? null,
    delivery_country: rfq.deliveryCountry ?? null,
    stage_requirement_attributes: rfq.stageRequirementAttributes ?? null,
    field_source_meta: rfq.fieldSourceMeta ?? null,
    requirement_confirmed_at: rfq.requirementConfirmedAt ?? null,
  };
}

function mapBuyerRfqResponse(response: BuyerRfqResponseRow) {
  return {
    id: response.id,
    supplier_org_id: response.supplierOrgId,
    message: response.message,
    submitted_at: response.submittedAt,
    created_at: response.createdAt,
  };
}

function mapBuyerRfqDetail(rfq: BuyerRfqDetailRow) {
  return {
    ...mapBuyerRfqListItem(rfq),
    item_unit_price: Number(rfq.catalogItem.price ?? 0),
    buyer_message: rfq.buyerMessage,
    created_by_user_id: rfq.createdByUserId,
    supplier_response: rfq.supplierResponse ? mapBuyerRfqResponse(rfq.supplierResponse) : null,
    supplier_counterparty_summary: rfq.supplierCounterpartySummary,
    trade_continuity: rfq.tradeContinuity
      ? {
          trade_id: rfq.tradeContinuity.id,
          trade_reference: rfq.tradeContinuity.tradeReference,
        }
      : null,
  };
}

function mapSupplierRfqListItem(rfq: SupplierRfqListRow) {
  return {
    id: rfq.id,
    status: rfq.status,
    catalog_item_id: rfq.catalogItemId,
    item_name: rfq.catalogItem.name,
    item_sku: rfq.catalogItem.sku,
    quantity: rfq.quantity,
    created_at: rfq.createdAt,
    updated_at: rfq.updatedAt,
    requirement_title: rfq.requirementTitle,
    quantity_unit: rfq.quantityUnit,
    urgency: rfq.urgency,
    sample_required: rfq.sampleRequired,
    delivery_country: rfq.deliveryCountry,
    stage_requirement_attributes: rfq.stageRequirementAttributes,
  };
}

function mapSupplierRfqDetail(rfq: SupplierRfqDetailRow) {
  return {
    ...mapSupplierRfqListItem(rfq),
    buyer_message: rfq.buyerMessage,
    buyer_counterparty_summary: rfq.buyerCounterpartySummary,
  };
}

function mapSupplierRfqResponse(response: SupplierRfqResponseRow) {
  return {
    id: response.id,
    rfq_id: response.rfqId,
    supplier_org_id: response.supplierOrgId,
    message: response.message,
    submitted_at: response.submittedAt,
    created_at: response.createdAt,
    updated_at: response.updatedAt,
    created_by_user_id: response.createdByUserId,
  };
}

async function resolveRfqCatalogItemTarget(catalogItemId: string): Promise<RfqCatalogItemTarget | null> {
  return prisma.$transaction(async tx => {
    // Resolve only the referenced catalog item's owner under a tx-local RFQ helper role.
    // This bypass is intentionally bounded to RFQ helper reads and keeps the resolver role narrow.
    await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;

    const catalogItem = await tx.catalogItem.findUnique({
      where: { id: catalogItemId },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        active: true,
        tenantId: true,
        catalogStage: true,
      },
    });

    if (!catalogItem) {
      return null;
    }

    return {
      id: catalogItem.id,
      name: catalogItem.name,
      sku: catalogItem.sku,
      price: Number(catalogItem.price),
      active: catalogItem.active,
      supplierOrgId: catalogItem.tenantId,
      catalogStage: catalogItem.catalogStage ?? null,
    };
  });
}

async function resolveBuyerRfqSupplierResponse(rfqId: string): Promise<BuyerRfqResponseRow | null> {
  return prisma.$transaction(async tx => {
    // Buyer detail reads are authorized by the parent RFQ ownership check first.
    // This bounded lookup avoids leaking supplier-only rows into broader tenant queries.
    await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;

    return tx.rfqSupplierResponse.findUnique({
      where: { rfqId },
      select: {
        id: true,
        supplierOrgId: true,
        message: true,
        submittedAt: true,
        createdAt: true,
      },
    });
  });
}

async function resolveBuyerRfqTradeContinuity(
  dbContext: DatabaseContext,
  rfqId: string,
): Promise<{ id: string; tradeReference: string } | null> {
  return withDbContext(prisma, dbContext, async tx => {
    const sourceRfqLinkageCapability = await tx.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'trades'
          AND column_name = 'source_rfq_id'
      ) AS "exists"
    `;

    const hasSourceRfqLinkage = sourceRfqLinkageCapability[0]?.exists === true;

    const rows = hasSourceRfqLinkage
      ? await tx.$queryRaw<Array<{ id: string; trade_reference: string }>>`
          SELECT id, trade_reference
          FROM public.trades
          WHERE tenant_id = CAST(${dbContext.orgId} AS uuid)
            AND source_rfq_id = CAST(${rfqId} AS uuid)
          LIMIT 1
        `
      : await tx.$queryRaw<Array<{ id: string; trade_reference: string }>>`
          SELECT t.id, t.trade_reference
          FROM public.trade_events te
          INNER JOIN public.trades t ON t.id = te.trade_id
          WHERE t.tenant_id = CAST(${dbContext.orgId} AS uuid)
            AND te.event_type = 'TRADE_CREATED_FROM_RFQ'
            AND te.metadata ->> 'rfqId' = CAST(${rfqId} AS text)
          ORDER BY te.created_at DESC
          LIMIT 1
        `;

    const trade = rows[0];
    if (!trade) {
      return null;
    }

    return {
      id: trade.id,
      tradeReference: trade.trade_reference,
    };
  });
}

// =============================================================================
// TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
// Textile attribute controlled-vocabulary constants (shared by create/update/filter routes)
// =============================================================================

const PRODUCT_CATEGORY_VALUES = [
  'APPAREL_FABRIC', 'HOME_TEXTILE', 'TECHNICAL_FABRIC', 'INDUSTRIAL_FABRIC',
  'LINING', 'INTERLINING', 'TRIMMING', 'ACCESSORY', 'OTHER',
] as const;

const FABRIC_TYPE_VALUES = [
  'WOVEN', 'KNIT', 'NON_WOVEN', 'LACE', 'EMBROIDERED',
  'TECHNICAL_COMPOSITE', 'FLEECE', 'OTHER',
] as const;

const MATERIAL_VALUES = [
  'COTTON', 'POLYESTER', 'SILK', 'WOOL', 'LINEN', 'VISCOSE', 'MODAL',
  'TENCEL_LYOCELL', 'NYLON', 'ACRYLIC', 'HEMP', 'BAMBOO',
  'RECYCLED_POLYESTER', 'RECYCLED_COTTON', 'BLENDED', 'OTHER',
] as const;

const CONSTRUCTION_VALUES = [
  'PLAIN_WEAVE', 'TWILL', 'SATIN', 'DOBBY', 'JACQUARD', 'TERRY', 'VELVET',
  'JERSEY', 'RIB', 'INTERLOCK', 'FLEECE_KNIT', 'MESH', 'OTHER',
] as const;

const CERT_STANDARD_VALUES = [
  'OEKO_TEX_STANDARD_100', 'OEKO_TEX_LEATHER_STANDARD', 'GOTS', 'BCI', 'FAIR_TRADE',
  'BLUESIGN', 'HIGG_INDEX', 'RECYCLED_CLAIM_STANDARD', 'GLOBAL_RECYCLE_STANDARD',
  'ISO_9001', 'SEDEX_SMETA', 'OTHER',
] as const;

/** Zod schema for a single certification entry stored in the certifications JSONB column. */
const certificationEntrySchema = z.object({
  standard: z.enum(CERT_STANDARD_VALUES),
  certNumber: z.string().max(100).optional(),
  issuedBy: z.string().max(200).optional(),
  validUntil: z.string().max(50).optional(),
});

/** Zod schema for the certifications JSONB array (create path — no null). */
const certificationsCreateSchema = z.array(certificationEntrySchema).optional();

/** Zod schema for the certifications JSONB array (update path — nullable to clear). */
const certificationsUpdateSchema = z.array(certificationEntrySchema).nullable().optional();

// Catalog stage taxonomy (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
const CATALOG_STAGE_VALUES = [
  'YARN', 'FIBER', 'FABRIC_WOVEN', 'FABRIC_KNIT', 'FABRIC_PROCESSED',
  'GARMENT', 'ACCESSORY_TRIM', 'CHEMICAL_AUXILIARY', 'MACHINE', 'MACHINE_SPARE',
  'PACKAGING', 'SERVICE', 'SOFTWARE_SAAS', 'OTHER',
] as const;

const SERVICE_TYPE_VALUES = [
  'FASHION_DESIGN', 'FABRIC_DESIGN_DOBBY', 'FABRIC_DESIGN_JACQUARD', 'FABRIC_DESIGN_PRINT',
  'TECHNICAL_CONSULTING', 'BUSINESS_CONSULTING', 'TESTING_LAB', 'LOGISTICS_PROVIDER',
  'CERTIFICATION_PROVIDER', 'MANUFACTURING_SERVICE', 'TEXTILE_SOFTWARE_SAAS', 'OTHER_SERVICE',
] as const;

// Stage-specific stageAttributes Zod schemas.
// Use .passthrough() so extra JSONB keys beyond defined fields are preserved.
const stageAttributesSchemas: Partial<Record<typeof CATALOG_STAGE_VALUES[number], z.ZodTypeAny>> = {
  YARN: z.object({
    yarnType: z.enum(['SPUN', 'FILAMENT', 'TEXTURED', 'CORE_SPUN', 'FANCY', 'OTHER']).optional(),
    yarnCount: z.string().max(50).optional(),
    countSystem: z.enum(['NE', 'NM', 'TEX', 'DENIER']).optional(),
    ply: z.number().int().min(1).max(12).optional(),
    twist: z.number().optional(),
    twistDirection: z.enum(['S', 'Z']).optional(),
    fiber: z.string().max(100).optional(),
    composition: z.string().max(500).optional(),
    denier: z.number().optional(),
    filamentType: z.string().max(100).optional(),
    spinningType: z.enum(['RING', 'OPEN_END', 'AIR_JET', 'COMPACT', 'VORTEX', 'OTHER']).optional(),
    coneWeight: z.number().optional(),
    endUse: z.enum(['WEAVING', 'KNITTING', 'EMBROIDERY', 'SEWING_THREAD', 'OTHER']).optional(),
    certifications: z.array(z.string().max(100)).optional(),
  }).passthrough(),
  FIBER: z.object({
    fiberType: z.string().max(50).optional(),
    fiberGrade: z.string().max(50).optional(),
    stapleLength: z.number().optional(),
    micronaire: z.number().optional(),
    strength: z.number().optional(),
    origin: z.string().max(100).optional(),
    organicStatus: z.enum(['ORGANIC', 'CONVENTIONAL', 'TRANSITIONAL']).optional(),
    moistureContent: z.number().optional(),
    trashContent: z.number().optional(),
    certifications: z.array(z.string().max(100)).optional(),
  }).passthrough(),
  FABRIC_WOVEN: z.object({
    weaveType: z.string().max(50).optional(),
    finish: z.string().max(100).optional(),
    endUse: z.enum(['APPAREL', 'HOME_TEXTILE', 'INDUSTRIAL', 'TECHNICAL']).optional(),
  }).passthrough(),
  FABRIC_KNIT: z.object({
    knitType: z.string().max(50).optional(),
    gauge: z.number().optional(),
    loopLength: z.number().optional(),
    stretch: z.enum(['TWO_WAY', 'FOUR_WAY', 'NONE']).optional(),
    finish: z.string().max(100).optional(),
    endUse: z.enum(['APPAREL', 'HOME_TEXTILE', 'INDUSTRIAL', 'TECHNICAL']).optional(),
  }).passthrough(),
  FABRIC_PROCESSED: z.object({
    processType: z.string().max(100).optional(),
    dyeingMethod: z.string().max(100).optional(),
    printingMethod: z.string().max(100).optional(),
    baseConstruction: z.string().max(100).optional(),
    finish: z.string().max(100).optional(),
  }).passthrough(),
  GARMENT: z.object({
    garmentType: z.string().max(100).optional(),
    sizeRange: z.string().max(100).optional(),
    fit: z.string().max(50).optional(),
    gender: z.string().max(50).optional(),
    ageGroup: z.string().max(50).optional(),
    fabricComposition: z.string().max(500).optional(),
    trims: z.string().max(500).optional(),
    stitchingType: z.string().max(100).optional(),
    washCare: z.string().max(200).optional(),
    monthlyCapacity: z.number().int().optional(),
    complianceCertifications: z.array(z.string().max(100)).optional(),
  }).passthrough(),
  ACCESSORY_TRIM: z.object({
    trimType: z.string().max(100).optional(),
    material: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    color: z.string().max(100).optional(),
    finish: z.string().max(100).optional(),
    usage: z.string().max(200).optional(),
    certifications: z.array(z.string().max(100)).optional(),
  }).passthrough(),
  CHEMICAL_AUXILIARY: z.object({
    chemicalType: z.string().max(100).optional(),
    applicationStage: z.string().max(100).optional(),
    form: z.string().max(50).optional(),
    concentration: z.string().max(50).optional(),
    compatibility: z.string().max(200).optional(),
    hazardClass: z.string().max(50).optional(),
    packSize: z.string().max(100).optional(),
    compliance: z.string().max(200).optional(),
    sdsAvailable: z.boolean().optional(),
  }).passthrough(),
  MACHINE: z.object({
    machineType: z.string().max(100).optional(),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    capacity: z.string().max(100).optional(),
    automationLevel: z.string().max(50).optional(),
    powerRequirement: z.string().max(100).optional(),
    condition: z.string().max(50).optional(),
    warranty: z.string().max(100).optional(),
    serviceSupport: z.boolean().optional(),
  }).passthrough(),
  MACHINE_SPARE: z.object({
    spareType: z.string().max(100).optional(),
    compatibleMachine: z.string().max(100).optional(),
    partNumber: z.string().max(100).optional(),
    material: z.string().max(100).optional(),
    dimension: z.string().max(100).optional(),
    brand: z.string().max(100).optional(),
    condition: z.string().max(50).optional(),
    stockAvailability: z.string().max(50).optional(),
    leadTimeDays: z.number().int().optional(),
  }).passthrough(),
  PACKAGING: z.object({
    packagingType: z.string().max(100).optional(),
    material: z.string().max(100).optional(),
    size: z.string().max(100).optional(),
    gsmOrThickness: z.string().max(50).optional(),
    printCompatibility: z.string().max(100).optional(),
    foodGrade: z.boolean().optional(),
    recyclable: z.boolean().optional(),
    compliance: z.string().max(200).optional(),
  }).passthrough(),
  SERVICE: z.object({
    serviceType: z.enum(SERVICE_TYPE_VALUES).optional(),
    specialization: z.string().max(200).optional(),
    industryFocus: z.array(z.string().max(100)).optional(),
    softwareTools: z.string().max(200).optional(),
    locationCoverage: z.string().max(200).optional(),
    turnaroundTimeDays: z.number().int().optional(),
    portfolioAvailable: z.boolean().optional(),
    certifications: z.array(z.string().max(100)).optional(),
    pricingModel: z.enum(['PER_PROJECT', 'HOURLY', 'RETAINER', 'SUBSCRIPTION']).optional(),
  }).passthrough(),
  SOFTWARE_SAAS: z.object({
    softwareCategory: z.string().max(100).optional(),
    deploymentModel: z.string().max(100).optional(),
    modules: z.array(z.string().max(100)).optional(),
    integrations: z.string().max(500).optional(),
    userSeats: z.string().max(100).optional(),
    supportLevel: z.string().max(100).optional(),
    securityCertifications: z.array(z.string().max(100)).optional(),
    trialAvailable: z.boolean().optional(),
  }).passthrough(),
  OTHER: z.record(z.unknown()),
};

// =============================================================================
// Pure helpers: vector text and attribute completeness
// =============================================================================

interface CatalogItemForVectorText {
  name: string;
  sku?: string | null;
  description?: string | null;
  productCategory?: string | null;
  fabricType?: string | null;
  material?: string | null;
  composition?: string | null;
  construction?: string | null;
  color?: string | null;
  gsm?: unknown;
  widthCm?: unknown;
  certifications?: Array<{ standard: string }> | null;
  // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
  catalogStage?: string | null;
  stageAttributes?: Record<string, unknown> | null;
}

/**
 * Build a rich plain-text document for vector ingestion from a catalog item.
 * Stage-aware dispatch: uses catalogStage to select the relevant field set.
 * DOES NOT include price or publicationPosture (intentional).
 */
export function buildCatalogItemVectorText(item: CatalogItemForVectorText): string {
  const attrs = (item.stageAttributes ?? {}) as Record<string, unknown>;

  function strOf(key: string): string | null {
    const v = attrs[key];
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
  function numOf(key: string): number | null {
    const v = attrs[key];
    return v != null && !isNaN(Number(v)) ? Number(v) : null;
  }
  function arrOf(key: string): string[] {
    const v = attrs[key];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  }

  const certStr =
    item.certifications && item.certifications.length > 0
      ? `Certifications: ${item.certifications.map(c => c.standard).join(', ')}`
      : null;

  const parts: string[] = [item.name];
  if (item.sku) parts.push(`SKU: ${item.sku}`);
  if (item.description) parts.push(item.description);

  switch (item.catalogStage) {
    case 'YARN': {
      if (strOf('yarnType')) parts.push(`Yarn type: ${strOf('yarnType')}`);
      if (strOf('yarnCount')) parts.push(`Yarn count: ${strOf('yarnCount')}`);
      if (strOf('countSystem')) parts.push(`Count system: ${strOf('countSystem')}`);
      if (strOf('fiber')) parts.push(`Fiber: ${strOf('fiber')}`);
      if (item.composition) parts.push(`Composition: ${item.composition}`);
      if (strOf('spinningType')) parts.push(`Spinning type: ${strOf('spinningType')}`);
      if (certStr) parts.push(certStr);
      break;
    }
    case 'FIBER': {
      if (strOf('fiberType')) parts.push(`Fiber type: ${strOf('fiberType')}`);
      if (strOf('fiberGrade')) parts.push(`Grade: ${strOf('fiberGrade')}`);
      if (strOf('origin')) parts.push(`Origin: ${strOf('origin')}`);
      if (strOf('organicStatus')) parts.push(`Organic status: ${strOf('organicStatus')}`);
      if (certStr) parts.push(certStr);
      break;
    }
    case 'FABRIC_KNIT': {
      if (strOf('knitType')) parts.push(`Knit type: ${strOf('knitType')}`);
      const gauge = numOf('gauge');
      if (gauge != null) parts.push(`Gauge: ${gauge}`);
      if (strOf('stretch')) parts.push(`Stretch: ${strOf('stretch')}`);
      if (item.material) parts.push(`Material: ${item.material}`);
      if (item.composition) parts.push(`Composition: ${item.composition}`);
      if (certStr) parts.push(certStr);
      break;
    }
    case 'GARMENT': {
      if (strOf('garmentType')) parts.push(`Garment type: ${strOf('garmentType')}`);
      if (strOf('gender')) parts.push(`Gender: ${strOf('gender')}`);
      if (strOf('fabricComposition')) parts.push(`Fabric composition: ${strOf('fabricComposition')}`);
      if (strOf('stitchingType')) parts.push(`Stitching: ${strOf('stitchingType')}`);
      const cap = numOf('monthlyCapacity');
      if (cap != null) parts.push(`Monthly capacity: ${cap}`);
      if (certStr) parts.push(certStr);
      break;
    }
    case 'MACHINE': {
      if (strOf('machineType')) parts.push(`Machine type: ${strOf('machineType')}`);
      if (strOf('brand')) parts.push(`Brand: ${strOf('brand')}`);
      if (strOf('model')) parts.push(`Model: ${strOf('model')}`);
      const year = numOf('year');
      if (year != null) parts.push(`Year: ${year}`);
      if (strOf('condition')) parts.push(`Condition: ${strOf('condition')}`);
      const svc = attrs['serviceSupport'];
      if (svc != null) parts.push(`Service support: ${svc}`);
      break;
    }
    case 'SERVICE': {
      if (strOf('serviceType')) parts.push(`Service type: ${strOf('serviceType')}`);
      if (strOf('specialization')) parts.push(`Specialization: ${strOf('specialization')}`);
      const industries = arrOf('industryFocus');
      if (industries.length > 0) parts.push(`Industry focus: ${industries.join(', ')}`);
      if (strOf('locationCoverage')) parts.push(`Location coverage: ${strOf('locationCoverage')}`);
      if (certStr) parts.push(certStr);
      break;
    }
    case 'SOFTWARE_SAAS': {
      if (strOf('softwareCategory')) parts.push(`Software category: ${strOf('softwareCategory')}`);
      if (strOf('deploymentModel')) parts.push(`Deployment: ${strOf('deploymentModel')}`);
      const mods = arrOf('modules');
      if (mods.length > 0) parts.push(`Modules: ${mods.join(', ')}`);
      const secCerts = arrOf('securityCertifications');
      if (secCerts.length > 0) parts.push(`Security certifications: ${secCerts.join(', ')}`);
      break;
    }
    default: {
      // FABRIC_WOVEN, FABRIC_PROCESSED, ACCESSORY_TRIM, CHEMICAL_AUXILIARY,
      // MACHINE_SPARE, PACKAGING, OTHER, or null — use existing fabric field path.
      if (item.productCategory) parts.push(`Category: ${item.productCategory}`);
      if (item.fabricType) parts.push(`Fabric type: ${item.fabricType}`);
      if (item.material) parts.push(`Material: ${item.material}`);
      if (item.composition) parts.push(`Composition: ${item.composition}`);
      if (item.construction) parts.push(`Construction: ${item.construction}`);
      if (item.color) parts.push(`Color: ${item.color}`);
      if (item.gsm != null) parts.push(`GSM: ${Number(item.gsm)}`);
      if (item.widthCm != null) parts.push(`Width: ${Number(item.widthCm)}cm`);
      if (certStr) parts.push(certStr);
      break;
    }
  }

  return parts.join('\n');
}

/**
 * Compute what fraction of the relevant attribute fields are non-null/non-empty.
 * Stage-aware: uses catalogStage to determine the expected field set.
 * Returns a value in [0, 1]. Intended for AI context metadata only — not stored.
 */
export function catalogItemAttributeCompleteness(item: Partial<CatalogItemForVectorText>): number {
  const attrs = (item.stageAttributes ?? {}) as Record<string, unknown>;

  function hasAttr(key: string): boolean {
    const v = attrs[key];
    if (v == null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }
  function hasField(key: keyof CatalogItemForVectorText): boolean {
    const v = item[key];
    if (v == null || v === '') return false;
    if (Array.isArray(v) && (v as unknown[]).length === 0) return false;
    return true;
  }

  switch (item.catalogStage) {
    case 'YARN': {
      // 11 fields
      const count = [
        hasField('name'), hasAttr('yarnType'), hasAttr('yarnCount'), hasAttr('countSystem'),
        hasAttr('ply'), hasAttr('fiber'), hasField('composition'), hasAttr('spinningType'),
        hasAttr('coneWeight'), hasAttr('endUse'), hasField('certifications'),
      ].filter(Boolean).length;
      return count / 11;
    }
    case 'FABRIC_KNIT': {
      // 9 fields
      const count = [
        hasField('name'), hasAttr('knitType'), hasAttr('gauge'), hasAttr('loopLength'),
        hasAttr('stretch'), hasField('material'), hasField('composition'), hasAttr('finish'),
        hasField('certifications'),
      ].filter(Boolean).length;
      return count / 9;
    }
    case 'GARMENT': {
      // 10 fields
      const count = [
        hasField('name'), hasAttr('garmentType'), hasAttr('gender'), hasAttr('ageGroup'),
        hasAttr('fabricComposition'), hasAttr('trims'), hasAttr('stitchingType'),
        hasAttr('washCare'), hasAttr('monthlyCapacity'), hasAttr('complianceCertifications'),
      ].filter(Boolean).length;
      return count / 10;
    }
    case 'MACHINE': {
      // 8 fields
      const count = [
        hasField('name'), hasAttr('machineType'), hasAttr('brand'), hasAttr('model'),
        hasAttr('year'), hasAttr('condition'), hasAttr('capacity'), hasAttr('serviceSupport'),
      ].filter(Boolean).length;
      return count / 8;
    }
    case 'SERVICE': {
      // 7 fields
      const count = [
        hasField('name'), hasAttr('serviceType'), hasAttr('specialization'),
        hasAttr('industryFocus'), hasAttr('locationCoverage'), hasAttr('turnaroundTimeDays'),
        hasField('certifications'),
      ].filter(Boolean).length;
      return count / 7;
    }
    default: {
      // FABRIC_WOVEN, null, or any other stage: 9 textile fields (legacy/unchanged)
      const fields = [
        'productCategory', 'fabricType', 'gsm', 'material', 'composition',
        'color', 'widthCm', 'construction', 'certifications',
      ] as const;
      const filled = fields.filter(f => {
        const v = (item as Record<string, unknown>)[f];
        if (v == null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      }).length;
      return filled / 9;
    }
  }
}

/**
 * Assemble a plain-text summary of structured RFQ requirements for AI context.
 *
 * AI BOUNDARY — EXCLUSION LIST (enforced by function signature):
 *   EXCLUDED: deliveryLocation (PII risk)
 *   EXCLUDED: targetDeliveryDate (scheduling sensitivity)
 *   EXCLUDED: requirementConfirmedAt (internal audit field)
 *   EXCLUDED: price / item_unit_price (financial data — AI must not price-match)
 *   EXCLUDED: publicationPosture, escrow, grossAmount (financial governance)
 */
export function assembleStructuredRfqRequirementSummaryText(rfq: {
  buyerMessage?: string | null;
  requirementTitle?: string | null;
  quantityUnit?: string | null;
  urgency?: string | null;
  sampleRequired?: boolean | null;
  deliveryCountry?: string | null;
  stageRequirementAttributes?: Record<string, unknown> | null;
}): string {
  const parts: string[] = [];

  if (rfq.requirementTitle) parts.push(`Requirement: ${rfq.requirementTitle}`);
  if (rfq.quantityUnit) parts.push(`Quantity unit: ${rfq.quantityUnit}`);
  if (rfq.urgency) parts.push(`Urgency: ${rfq.urgency}`);
  if (rfq.sampleRequired != null) parts.push(`Sample required: ${rfq.sampleRequired ? 'yes' : 'no'}`);
  if (rfq.deliveryCountry) parts.push(`Delivery country: ${rfq.deliveryCountry}`);

  if (rfq.stageRequirementAttributes && typeof rfq.stageRequirementAttributes === 'object') {
    const attrEntries = Object.entries(rfq.stageRequirementAttributes)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${String(v)}`);
    if (attrEntries.length > 0) parts.push(`Stage requirements: ${attrEntries.join(', ')}`);
  }

  if (rfq.buyerMessage) parts.push(`Buyer message: ${rfq.buyerMessage}`);

  return parts.join('\n');
}

const tenantRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/me
   * Get current authenticated user (tenant realm)
   */
  fastify.get('/me', { onRequest: tenantAuthMiddleware }, async (request, reply) => {
    const { userId, tenantId, userRole } = request;

    if (!userId) {
      return sendError(reply, 'UNAUTHORIZED', 'User context missing from token', 401);
    }

    // Guard: tenantId must be present (set by tenantAuthMiddleware from JWT).
    // Missing tenantId means the token is malformed or for wrong realm.
    if (!tenantId) {
      return sendError(reply, 'UNAUTHORIZED', 'Tenant context missing from token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // G-015 Phase C: read org identity via admin-context (organizations table, RESTRICTIVE guard).
    // Cannot read organizations in tenant-realm without admin elevation.
    // Preserve response shape: legal_name → name, org_type → type.
    // MUST return a non-null tenant object — returning null causes the frontend
    // workspace spinner to hang indefinitely (tenants[] stays empty).
    let tenant: TenantSessionIdentity;
    try {
      tenant = await resolveTenantSessionIdentity({
        tenantId,
        actorId: userId,
        userRole,
      });
    } catch (err) {
      if (err instanceof OrganizationNotFoundError) {
        // Org row not yet provisioned. Return explicit 404 so the UI can show
        // a "provisioning in progress" state rather than spinning indefinitely.
        return sendError(reply, 'NOT_FOUND', 'Organisation not yet provisioned for this tenant', 404);
      }
      throw err;
    }

    return sendSuccess(reply, {
      user,
      tenant,
      role: userRole,
    });
  });

  /**
   * GET /api/tenant/audit-logs
   * Get audit logs for current tenant only (Gate D.3: RLS-enforced)
   * Manual tenant filter removed; RLS policies handle tenant boundary
   */
  fastify.get('/tenant/audit-logs', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const logs = await withDbContext(prisma, dbContext, async tx => {
      return await tx.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    return sendSuccess(reply, { logs, count: logs.length });
  });

  /**
   * GET /api/tenant/memberships
   * Get memberships for current tenant (Gate D.1: RLS-enforced)
   * Authorization: OWNER, ADMIN, MEMBER only. VIEWER is explicitly denied.
   * Tenant boundary additionally enforced by RLS via app.org_id.
   * Manual tenant filter removed; RLS policies handle tenant boundary.
   */
  fastify.get(
    '/tenant/memberships',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userRole } = request;

      // Enforce read-role policy: OWNER, ADMIN, MEMBER allowed; VIEWER denied.
      if (userRole !== 'OWNER' && userRole !== 'ADMIN' && userRole !== 'MEMBER') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const now = new Date();

      const { memberships, pendingInvites } = await withDbContext(prisma, dbContext, async tx => {
        const [memberships, pendingInvites] = await Promise.all([
          tx.membership.findMany({
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  emailVerified: true,
                },
              },
            },
          }),
          tx.invite.findMany({
            where: {
              acceptedAt: null,
              expiresAt: { gt: now },
            },
            select: {
              id: true,
              email: true,
              role: true,
              expiresAt: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          }),
        ]);

        return { memberships, pendingInvites };
      });

      return sendSuccess(reply, { memberships, pendingInvites, count: memberships.length });
    }
  );

  /**
   * POST /api/tenant/memberships/invites/:id/resend
   * Resend a still-pending invite for the current tenant.
   * Requires OWNER or ADMIN role.
   */
  fastify.post(
    '/tenant/memberships/invites/:id/resend',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const { id: inviteId } = paramsResult.data;
      const now = new Date();
      const crypto = await import('node:crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = await withDbContext(prisma, dbContext, async tx => {
        const existingInvite = await tx.invite.findFirst({
          where: {
            id: inviteId,
            tenantId: dbContext.orgId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            acceptedAt: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        if (!existingInvite) {
          return { error: 'INVITE_NOT_FOUND' as const };
        }

        if (existingInvite.acceptedAt !== null || existingInvite.expiresAt <= now) {
          return { error: 'INVITE_NOT_PENDING' as const };
        }

        const resentInvite = await tx.invite.update({
          where: { id: existingInvite.id },
          data: {
            tokenHash,
            expiresAt,
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'member.invite.resent',
          entity: 'invite',
          entityId: existingInvite.id,
          metadataJson: {
            email: existingInvite.email,
            role: existingInvite.role,
          },
        });

        return { invite: resentInvite };
      });

      if ('error' in result) {
        if (result.error === 'INVITE_NOT_FOUND') {
          return sendNotFound(reply, 'Invite not found');
        }

        if (result.error === 'INVITE_NOT_PENDING') {
          return sendError(reply, 'INVITE_NOT_PENDING', 'Only pending invites can be resent', 409);
        }
      }

      let emailDelivery: InviteEmailDeliveryOutcome;
      try {
        const org = await getOrganizationIdentity(dbContext.orgId, prisma);
        const orgDisplayName = org.legal_name;

        emailDelivery = await sendInviteMemberEmail(
          result.invite.email,
          token,
          orgDisplayName,
          {
            tenantId: dbContext.orgId,
            triggeredBy: 'user',
            actorId: userId ?? null,
          }
        );
      } catch (emailErr) {
        fastify.log.error({ err: emailErr }, '[Invite Resend] Email send failed (non-fatal)');
        emailDelivery = failedInviteEmailDeliveryOutcome();
      }

      return sendSuccess(reply, { invite: result.invite, emailDelivery });
    }
  );

  /**
   * PATCH /api/tenant/memberships/invites/:id
   * Edit the role of a still-pending invite for the current tenant.
   * Requires OWNER or ADMIN role.
   */
  fastify.patch(
    '/tenant/memberships/invites/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const bodySchema = z.object({
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
      });
      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { id: inviteId } = paramsResult.data;
      const { role } = bodyResult.data;
      const now = new Date();

      if (role === 'VIEWER') {
        return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
      }

      const result = await withDbContext(prisma, dbContext, async tx => {
        const existingInvite = await tx.invite.findFirst({
          where: {
            id: inviteId,
            tenantId: dbContext.orgId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            acceptedAt: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        if (!existingInvite) {
          return { error: 'INVITE_NOT_FOUND' as const };
        }

        if (existingInvite.acceptedAt !== null || existingInvite.expiresAt <= now) {
          return { error: 'INVITE_NOT_PENDING' as const };
        }

        if (existingInvite.role === role) {
          return { error: 'NO_OP_ROLE_CHANGE' as const };
        }

        const updatedInvite = await tx.invite.update({
          where: { id: existingInvite.id },
          data: { role },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'member.invite.updated',
          entity: 'invite',
          entityId: existingInvite.id,
          metadataJson: {
            email: existingInvite.email,
            fromRole: existingInvite.role,
            toRole: role,
          },
        });

        return { invite: updatedInvite };
      });

      if ('error' in result) {
        if (result.error === 'INVITE_NOT_FOUND') {
          return sendNotFound(reply, 'Invite not found');
        }

        if (result.error === 'INVITE_NOT_PENDING') {
          return sendError(reply, 'INVITE_NOT_PENDING', 'Only pending invites can be edited', 409);
        }

        if (result.error === 'NO_OP_ROLE_CHANGE') {
          return sendError(reply, 'NO_OP_ROLE_CHANGE', 'Invite already has the requested role', 409);
        }
      }

      return sendSuccess(reply, { invite: result.invite });
    }
  );

  /**
   * DELETE /api/tenant/memberships/invites/:id
   * Revoke/cancel a still-pending invite for the current tenant.
   * Requires OWNER or ADMIN role.
   */
  fastify.delete(
    '/tenant/memberships/invites/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const { id: inviteId } = paramsResult.data;
      const now = new Date();

      const result = await withDbContext(prisma, dbContext, async tx => {
        const existingInvite = await tx.invite.findFirst({
          where: {
            id: inviteId,
            tenantId: dbContext.orgId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            acceptedAt: true,
            expiresAt: true,
          },
        });

        if (!existingInvite) {
          return { error: 'INVITE_NOT_FOUND' as const };
        }

        if (existingInvite.acceptedAt !== null || existingInvite.expiresAt <= now) {
          return { error: 'INVITE_NOT_PENDING' as const };
        }

        await tx.invite.delete({
          where: { id: existingInvite.id },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'member.invite.revoked',
          entity: 'invite',
          entityId: existingInvite.id,
          metadataJson: {
            email: existingInvite.email,
            role: existingInvite.role,
          },
        });

        return { deleted: existingInvite.id };
      });

      if ('error' in result) {
        if (result.error === 'INVITE_NOT_FOUND') {
          return sendNotFound(reply, 'Invite not found');
        }

        if (result.error === 'INVITE_NOT_PENDING') {
          return sendError(reply, 'INVITE_NOT_PENDING', 'Only pending invites can be revoked', 409);
        }
      }

      return sendSuccess(reply, { deleted: result.deleted });
    }
  );

  /**
   * PATCH /api/tenant/memberships/:id
   * Update the role of an existing tenant membership (TECS-FBW-012)
   *
   * Actor rule:   Only OWNER may perform role changes.
   * Target rule:  Same-org membership only (RLS + explicit tenantId filter).
   *               Invite records are not handled here.
   *
   * Allowed transitions:
   *   MEMBER  → ADMIN | OWNER
   *   ADMIN   → MEMBER | OWNER
   *   OWNER   → ADMIN | MEMBER  (self only, OWNER invariant enforced)
   *
   * Disallowed:
   *   any  → VIEWER              (VIEWER_TRANSITION_OUT_OF_SCOPE)
   *   VIEWER → any               (VIEWER_TRANSITION_OUT_OF_SCOPE)
   *   same  → same               (NO_OP_ROLE_CHANGE)
   *   OWNER → ADMIN/MEMBER for a different OWNER  (PEER_OWNER_DEMOTION_FORBIDDEN)
   *   sole OWNER self-downgrade  (SOLE_OWNER_CANNOT_DOWNGRADE)
   *
   * OWNER invariant: at least one OWNER must remain in the org after any mutation.
   * Audit:  Every successful change writes membership.role.updated (realm TENANT).
   */
  fastify.patch(
    '/tenant/memberships/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Actor guard: only OWNER may perform membership role changes
      if (userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER can update membership roles', 403);
      }

      // Validate path param
      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }
      const { id: membershipId } = paramsResult.data;

      // Validate body — accept full MembershipRole enum so VIEWER gets a specific error code
      const bodySchema = z.object({
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
      });
      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const { role: requestedRole } = bodyResult.data;

      // Explicitly reject VIEWER as a target (product decision: VIEWER transitions out of scope)
      if (requestedRole === 'VIEWER') {
        return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
      }

      // At this point requestedRole is 'OWNER' | 'ADMIN' | 'MEMBER'
      const safeRole = requestedRole as 'OWNER' | 'ADMIN' | 'MEMBER';

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Load target membership — org-scoped (RLS enforces boundary; explicit tenantId is defense-in-depth)
        const target = await tx.membership.findFirst({
          where: { id: membershipId, tenantId: dbContext.orgId },
          select: { id: true, userId: true, role: true },
        });

        if (!target) {
          return { error: 'MEMBERSHIP_NOT_FOUND' as const };
        }

        const fromRole = target.role;

        // Reject VIEWER as a source role (VIEWER → any is out of scope)
        if (fromRole === 'VIEWER') {
          return { error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' as const };
        }

        // Reject no-op: same-role transitions carry no semantic meaning
        if ((fromRole as string) === safeRole) {
          return { error: 'NO_OP_ROLE_CHANGE' as const };
        }

        const isSelfTarget = target.userId === userId;

        // Peer-OWNER demotion is unconditionally forbidden (product decision)
        // An OWNER targeting another OWNER's record for downgrade is not permitted.
        if (fromRole === 'OWNER' && !isSelfTarget) {
          return { error: 'PEER_OWNER_DEMOTION_FORBIDDEN' as const };
        }

        // OWNER invariant: for self-downgrade, at least one other OWNER must remain.
        if (fromRole === 'OWNER' && isSelfTarget) {
          const ownerCount = await tx.membership.count({
            where: { tenantId: dbContext.orgId, role: 'OWNER' },
          });
          if (ownerCount <= 1) {
            return { error: 'SOLE_OWNER_CANNOT_DOWNGRADE' as const };
          }
        }

        // Apply the role update
        const updated = await tx.membership.update({
          where: { id: membershipId },
          data: { role: safeRole },
          select: { id: true, userId: true, tenantId: true, role: true, updatedAt: true },
        });

        // Audit log — written atomically within the same transaction
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'membership.role.updated',
          entity: 'membership',
          entityId: membershipId,
          metadataJson: {
            targetMembershipId: membershipId,
            targetUserId: target.userId,
            fromRole,
            toRole: safeRole,
          },
        });

        return { membership: updated };
      });

      if ('error' in result) {
        if (result.error === 'MEMBERSHIP_NOT_FOUND') {
          return sendNotFound(reply, 'Membership not found');
        }
        if (result.error === 'VIEWER_TRANSITION_OUT_OF_SCOPE') {
          return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
        }
        if (result.error === 'NO_OP_ROLE_CHANGE') {
          return sendError(reply, 'NO_OP_ROLE_CHANGE', 'Membership already has the requested role', 409);
        }
        if (result.error === 'PEER_OWNER_DEMOTION_FORBIDDEN') {
          return sendError(reply, 'PEER_OWNER_DEMOTION_FORBIDDEN', 'Cannot change the role of another OWNER', 403);
        }
        if (result.error === 'SOLE_OWNER_CANNOT_DOWNGRADE') {
          return sendError(reply, 'SOLE_OWNER_CANNOT_DOWNGRADE', 'Cannot downgrade the sole OWNER of this organisation', 409);
        }
      }

      return sendSuccess(reply, { membership: result.membership });
    }
  );

  /**
   * GET /api/tenant/aggregator/discovery
   * Read bounded Aggregator discovery entries with list-level trust signals.
   */
  fastify.get(
    '/tenant/aggregator/discovery',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      if (!request.dbContext) {
        return sendUnauthorized(reply, 'Missing database context');
      }

      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(12).default(6),
      });

      const parseResult = querySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { limit } = parseResult.data;

      let tenantIdentity: Awaited<ReturnType<typeof getOrganizationIdentity>>;

      try {
        tenantIdentity = await getOrganizationIdentity(request.dbContext.orgId, prisma);
      } catch (error) {
        if (error instanceof OrganizationNotFoundError) {
          return sendNotFound(reply, 'Tenant not found');
        }

        throw error;
      }

      if (!['AGGREGATOR', 'INTERNAL'].includes(tenantIdentity.org_type)) {
        return sendError(reply, 'FORBIDDEN', 'Aggregator discovery is available only to Aggregator tenants', 403);
      }

      const items: CounterpartyDiscoveryEntry[] = await listCounterpartyDiscoveryEntries(
        request.dbContext.orgId,
        prisma,
        limit,
      );

      return sendSuccess(reply, {
        items,
        count: items.length,
      });
    }
  );

  /**
   * GET /api/tenant/catalog/items
   * Read tenant-visible catalog items with cursor pagination
   *
   * Gate B.2: RLS-enforced tenant isolation via app.org_id context
   * Manual tenant filters removed; RLS policies handle tenant boundary
   */
  fastify.get(
    '/tenant/catalog/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      // Fail-closed: require database context (from databaseContextMiddleware)
      if (!request.dbContext) {
        return sendUnauthorized(reply, 'Missing database context');
      }

      // Validate query params
      const querySchema = z.object({
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
      });

      const parseResult = querySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { q, limit, cursor } = parseResult.data;

      // Gate B.2: RLS-enforced query (no manual tenantId filter)
      // Tenant isolation enforced by: catalog_items tenant_id = app.current_org_id()
      const items = await withDbContext(prisma, request.dbContext, async tx => {
        return await tx.catalogItem.findMany({
          where: {
            // Manual tenant filter REMOVED (RLS enforces tenant boundary)
            active: true,
            ...(q && {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }),
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
        });
      });

      const hasMore = items.length > limit;
      const resultItems = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.id : null;

      return sendSuccess(reply, {
        items: resultItems,
        count: resultItems.length,
        nextCursor,
      });
    }
  );

  /**
   * POST /api/tenant/catalog/items
   * Create a catalog item (OWNER or ADMIN only)
   *
   * RU-003: Revenue-unblock — catalog item creation
   * Writes audit entry: catalog.item.created
   */
  fastify.post(
    '/tenant/catalog/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may create catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can create catalog items', 403);
      }

      const bodySchema = z.object({
        name: z.string().min(1).max(255),
        sku: z.string().min(1).max(100).optional(),
        imageUrl: z.string().url().max(2048).optional(),
        description: z.string().optional(),
        price: z.number().positive(),
        moq: z.number().int().min(1).default(1),
        // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        productCategory: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
        fabricType: z.enum(FABRIC_TYPE_VALUES).optional(),
        gsm: z.number().min(10).max(2000).optional(),
        material: z.enum(MATERIAL_VALUES).optional(),
        composition: z.string().max(500).optional(),
        color: z.string().max(100).optional(),
        widthCm: z.number().min(1).max(999.99).optional(),
        construction: z.enum(CONSTRUCTION_VALUES).optional(),
        certifications: certificationsCreateSchema,
        // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        catalogStage: z.enum(CATALOG_STAGE_VALUES).optional(),
        stageAttributes: z.record(z.unknown()).optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const {
        name, sku, imageUrl, description, price, moq,
        productCategory, fabricType, gsm, material, composition,
        color, widthCm, construction, certifications,
        catalogStage, stageAttributes,
      } = parseResult.data;

      // Validate stage-specific stageAttributes if present.
      let validatedStageAttributes: Record<string, unknown> | null = null;
      if (catalogStage && stageAttributes) {
        const stageSchema = stageAttributesSchemas[catalogStage];
        if (stageSchema) {
          const attrResult = stageSchema.safeParse(stageAttributes);
          if (!attrResult.success) {
            return sendValidationError(reply, attrResult.error.errors);
          }
          validatedStageAttributes = attrResult.data as Record<string, unknown>;
        } else {
          validatedStageAttributes = stageAttributes;
        }
      }

      const item = await withDbContext(prisma, dbContext, async tx => {
        const created = await tx.catalogItem.create({
          data: {
            tenantId: dbContext.orgId,
            name,
            sku: sku ?? null,
            imageUrl: imageUrl ?? null,
            description: description ?? null,
            price,
            moq,
            active: true,
            // Textile attributes
            productCategory: productCategory ?? null,
            fabricType: fabricType ?? null,
            gsm: gsm ?? null,
            material: material ?? null,
            composition: composition ?? null,
            color: color ?? null,
            widthCm: widthCm ?? null,
            construction: construction ?? null,
            certifications: certifications ? (certifications as unknown as Prisma.InputJsonValue) : null,
            // Stage attributes
            catalogStage: catalogStage ?? null,
            stageAttributes: validatedStageAttributes !== null ? (validatedStageAttributes as unknown as Prisma.InputJsonValue) : null,
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.created',
          entity: 'catalog_item',
          entityId: created.id,
          metadataJson: {
            name, sku: sku ?? null, imageUrl: imageUrl ?? null, price, moq,
            productCategory: productCategory ?? null,
            fabricType: fabricType ?? null,
            gsm: gsm ?? null,
            material: material ?? null,
            construction: construction ?? null,
          },
        });

        return created;
      });

      // G-028 B1: Enqueue async vector indexing after successful DB commit.
      // Must run after withDbContext resolves so the transaction is committed.
      // Failure is best-effort: a full queue does not fail the HTTP response.
      const vectorText = buildCatalogItemVectorText(item);
      const enqueueResult = enqueueSourceIngestion(
        dbContext.orgId,
        'CATALOG_ITEM',
        item.id,
        vectorText,
        {
          name: item.name,
          productCategory: (item as Record<string, unknown>).productCategory as string | undefined ?? undefined,
          fabricType: (item as Record<string, unknown>).fabricType as string | undefined ?? undefined,
          material: (item as Record<string, unknown>).material as string | undefined ?? undefined,
          gsm: (item as Record<string, unknown>).gsm != null ? Number((item as Record<string, unknown>).gsm) : undefined,
          hasCertifications: Array.isArray((item as Record<string, unknown>).certifications) && ((item as Record<string, unknown>).certifications as unknown[]).length > 0,
        },
      );
      if (!enqueueResult.accepted) {
        console.warn('[G028-B1][catalog_item_enqueue_rejected]', {
          stage:      'vector_async_index',
          sourceType: 'CATALOG_ITEM',
          sourceId:   item.id,
          reason:     enqueueResult.reason,
        });
      }

      return sendSuccess(reply, { item }, 201);
    }
  );

  /**
   * PATCH /api/tenant/catalog/items/:id
   * Update an existing catalog item (OWNER or ADMIN only)
   *
   * G-028 B2: Post-commit vector reindex enqueue (best-effort, outside tx).
   * Writes audit entry: catalog.item.updated
   */
  fastify.patch(
    '/tenant/catalog/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may update catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can update catalog items', 403);
      }

      const { id } = request.params as { id: string };

      const bodySchema = z.object({
        name: z.string().min(1).max(255).optional(),
        sku: z.string().min(1).max(100).nullable().optional(),
        imageUrl: z.string().url().max(2048).nullable().optional(),
        description: z.string().nullable().optional(),
        price: z.number().positive().optional(),
        moq: z.number().int().min(1).optional(),
        active: z.boolean().optional(),
        // Textile attributes (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        productCategory: z.enum(PRODUCT_CATEGORY_VALUES).nullable().optional(),
        fabricType: z.enum(FABRIC_TYPE_VALUES).nullable().optional(),
        gsm: z.number().min(10).max(2000).nullable().optional(),
        material: z.enum(MATERIAL_VALUES).nullable().optional(),
        composition: z.string().max(500).nullable().optional(),
        color: z.string().max(100).nullable().optional(),
        widthCm: z.number().min(1).max(999.99).nullable().optional(),
        construction: z.enum(CONSTRUCTION_VALUES).nullable().optional(),
        certifications: certificationsUpdateSchema,
        // Stage attributes (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        catalogStage: z.enum(CATALOG_STAGE_VALUES).nullable().optional(),
        stageAttributes: z.record(z.unknown()).nullable().optional(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      if (Object.keys(parseResult.data).length === 0) {
        return sendError(reply, 'VALIDATION_ERROR', 'At least one field must be provided for update', 400);
      }

      const data = parseResult.data;

      const updated = await withDbContext(prisma, dbContext, async tx => {
        // Org-scoped lookup: confirms item belongs to this tenant before update.
        // Defense in depth — RLS also enforces boundary, but explicit filter is required.
        const existing = await tx.catalogItem.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true },
        });
        if (!existing) {
          return null;
        }

        const result = await tx.catalogItem.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.sku !== undefined ? { sku: data.sku } : {}),
            ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.price !== undefined ? { price: data.price } : {}),
            ...(data.moq !== undefined ? { moq: data.moq } : {}),
            ...(data.active !== undefined ? { active: data.active } : {}),
            // Textile attributes
            ...(data.productCategory !== undefined ? { productCategory: data.productCategory } : {}),
            ...(data.fabricType !== undefined ? { fabricType: data.fabricType } : {}),
            ...(data.gsm !== undefined ? { gsm: data.gsm } : {}),
            ...(data.material !== undefined ? { material: data.material } : {}),
            ...(data.composition !== undefined ? { composition: data.composition } : {}),
            ...(data.color !== undefined ? { color: data.color } : {}),
            ...(data.widthCm !== undefined ? { widthCm: data.widthCm } : {}),
            ...(data.construction !== undefined ? { construction: data.construction } : {}),
            ...(data.certifications !== undefined
              ? { certifications: data.certifications !== null ? (data.certifications as unknown as Prisma.InputJsonValue) : null }
              : {}),
            // Stage attributes
            ...(data.catalogStage !== undefined ? { catalogStage: data.catalogStage } : {}),
            ...(data.stageAttributes !== undefined
              ? { stageAttributes: data.stageAttributes !== null ? (data.stageAttributes as unknown as Prisma.InputJsonValue) : null }
              : {}),
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.updated',
          entity: 'catalog_item',
          entityId: result.id,
          metadataJson: { ...data, certifications: undefined } as unknown as Prisma.JsonValue,
        });

        return result;
      });

      if (!updated) {
        return sendNotFound(reply, 'Catalog item not found');
      }

      // G-028 B2: Enqueue async vector reindex after successful DB commit.
      // Must run after withDbContext resolves so the transaction is committed.
      // Failure is best-effort: a full queue does not fail the HTTP response.
      const vectorText = buildCatalogItemVectorText(updated);
      const enqueueResult = enqueueSourceIngestion(
        dbContext.orgId,
        'CATALOG_ITEM',
        updated.id,
        vectorText,
        { name: updated.name },
      );
      if (!enqueueResult.accepted) {
        console.warn('[G028-B2][catalog_item_update_enqueue_rejected]', {
          stage:      'vector_async_reindex',
          sourceType: 'CATALOG_ITEM',
          sourceId:   updated.id,
          reason:     enqueueResult.reason,
        });
      }

      return sendSuccess(reply, { item: updated });
    }
  );

  /**
   * DELETE /api/tenant/catalog/items/:id
   * Delete a catalog item (OWNER or ADMIN only)
   *
   * G-028-B2-DELETE-ENQUEUE-BLOCKER: post-commit best-effort enqueue via
   * enqueueSourceDeletion() removes stale vector chunks for the deleted item.
   * Enqueue failure is non-blocking — audit write and HTTP 200 are unaffected.
   * Writes audit entry: catalog.item.deleted
   */
  fastify.delete(
    '/tenant/catalog/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: only OWNER or ADMIN may delete catalog items
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can delete catalog items', 403);
      }

      const { id } = request.params as { id: string };

      const deleted = await withDbContext(prisma, dbContext, async tx => {
        // Org-scoped lookup: confirms item belongs to this tenant before delete.
        // Defense in depth — RLS also enforces boundary, but explicit filter is required.
        const existing = await tx.catalogItem.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true, name: true },
        });
        if (!existing) {
          return null;
        }

        await tx.catalogItem.delete({
          where: { id },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'catalog.item.deleted',
          entity: 'catalog_item',
          entityId: id,
          metadataJson: { name: existing.name },
        });

        return existing;
      });

      if (!deleted) {
        return sendNotFound(reply, 'Catalog item not found');
      }

      // G-028-B2-DELETE-ENQUEUE-BLOCKER: Enqueue async vector chunk deletion post-commit.
      // Runs after withDbContext() resolves (transaction committed). Failure is best-effort:
      // a full queue does not affect the HTTP 200 response or audit correctness.
      const deleteEnqueueResult = enqueueSourceDeletion(
        dbContext.orgId,
        'CATALOG_ITEM',
        id,
      );
      if (!deleteEnqueueResult.accepted) {
        console.warn('[G028-DELETE][catalog_item_delete_enqueue_rejected]', {
          stage:      'vector_async_delete',
          sourceType: 'CATALOG_ITEM',
          sourceId:   id,
          reason:     deleteEnqueueResult.reason,
        });
      }

      return sendSuccess(reply, { id, deleted: true });
    }
  );

  /**
   * GET /api/tenant/catalog/supplier/:supplierOrgId/items
   * Browse a supplier's public-eligible catalog items (authenticated B2B buyer, Phase 1)
   *
   * TECS-B2B-BUYER-CATALOG-BROWSE-001 — Authorized by PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001
   * TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001 — textile attr filters added
   *
   * Gate 1 — Org eligibility (consistent 404 for any non-eligible case; no gate detail exposed):
   *   organizations.publication_posture IN ('B2B_PUBLIC', 'BOTH')
   *   tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'
   * Gate 2 — Item visibility (Phase 1): active = true, tenantId = supplierOrgId
   *
   * Cross-tenant read uses prisma.$transaction with SET LOCAL ROLE texqtic_rfq_read.
   * Org eligibility check uses withOrgAdminContext (admin realm required for organizations RLS).
   *
   * Response fields: id, name, sku, description, moq, imageUrl + 9 textile attrs — NO price, NO publicationPosture.
   */
  fastify.get(
    '/tenant/catalog/supplier/:supplierOrgId/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      if (!request.dbContext) {
        return sendUnauthorized(reply, 'Missing database context');
      }

      const { supplierOrgId } = request.params as { supplierOrgId: string };

      const paramsSchema = z.object({
        supplierOrgId: z.string().uuid(),
      });
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
        q: z.string().max(100).optional(),
        // Textile attribute filters (TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001)
        productCategory: z.string().max(50).optional(),
        fabricType: z.string().max(50).optional(),
        material: z.union([
          z.array(z.string().max(50)),
          z.string().max(50).transform(v => [v]),
        ]).optional(),
        construction: z.string().max(50).optional(),
        color: z.string().max(100).optional(),
        gsmMin: z.coerce.number().min(10).max(2000).optional(),
        gsmMax: z.coerce.number().min(10).max(2000).optional(),
        widthMin: z.coerce.number().min(1).max(999.99).optional(),
        widthMax: z.coerce.number().min(1).max(999.99).optional(),
        moqMax: z.coerce.number().int().min(1).optional(),
        certification: z.string().max(50).optional(),
        // Stage filter (TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001)
        catalogStage: z.enum(CATALOG_STAGE_VALUES).optional(),
      });

      const paramsResult = paramsSchema.safeParse({ supplierOrgId });
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const queryResult = querySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }

      const {
        limit, cursor, q,
        productCategory, fabricType, material, construction, color,
        gsmMin, gsmMax, widthMin, widthMax, moqMax, certification,
        catalogStage,
      } = queryResult.data;

      // Gate 1: Org eligibility (admin context required — organizations RLS requires admin realm).
      // Checks both organizations.publication_posture and tenant.publicEligibilityPosture.
      // Returns false (→ 404) if the supplier org is absent or fails either eligibility condition.
      const isEligible = await withOrgAdminContext(prisma, async tx => {
        const [org, tenant] = await Promise.all([
          tx.organizations.findUnique({
            where: { id: supplierOrgId },
            select: { id: true, publication_posture: true },
          }),
          tx.tenant.findUnique({
            where: { id: supplierOrgId },
            select: { id: true, publicEligibilityPosture: true },
          }),
        ]);

        if (!org || !tenant) {
          return false;
        }

        const postureEligible =
          org.publication_posture === 'B2B_PUBLIC' || org.publication_posture === 'BOTH';
        const tenantEligible = (tenant.publicEligibilityPosture as string) === 'PUBLICATION_ELIGIBLE';
        return postureEligible && tenantEligible;
      });

      if (!isEligible) {
        return sendNotFound(reply, 'Supplier catalog not found');
      }

      // Build non-certification AND-composed filters
      const filterClauses: Prisma.CatalogItemWhereInput[] = [
        { tenantId: supplierOrgId, active: true },
      ];

      if (q && q.trim().length > 0) {
        filterClauses.push({
          OR: [
            { name: { contains: q.trim(), mode: 'insensitive' } },
            { sku: { contains: q.trim(), mode: 'insensitive' } },
          ],
        });
      }
      if (productCategory) {
        filterClauses.push({ productCategory: { equals: productCategory, mode: 'insensitive' } });
      }
      if (fabricType) {
        filterClauses.push({ fabricType: { equals: fabricType, mode: 'insensitive' } });
      }
      if (material && material.length > 0) {
        filterClauses.push({ material: { in: material, mode: 'insensitive' } });
      }
      if (construction) {
        filterClauses.push({ construction: { equals: construction, mode: 'insensitive' } });
      }
      if (color) {
        filterClauses.push({ color: { contains: color, mode: 'insensitive' } });
      }
      if (gsmMin !== undefined) {
        filterClauses.push({ gsm: { gte: gsmMin } });
      }
      if (gsmMax !== undefined) {
        filterClauses.push({ gsm: { lte: gsmMax } });
      }
      if (widthMin !== undefined) {
        filterClauses.push({ widthCm: { gte: widthMin } });
      }
      if (widthMax !== undefined) {
        filterClauses.push({ widthCm: { lte: widthMax } });
      }
      if (moqMax !== undefined) {
        filterClauses.push({ moq: { lte: moqMax } });
      }
      if (catalogStage) {
        filterClauses.push({ catalogStage: { equals: catalogStage } });
      }

      const baseWhere: Prisma.CatalogItemWhereInput = { AND: filterClauses };

      // Gate 2: Read catalog items cross-tenant (texqtic_rfq_read role — proven cross-tenant read pattern).
      // Certification filter uses two-pass approach:
      //   Pass 1: findMany with all non-cert filters to obtain candidate IDs
      //   Pass 2: $queryRaw with safe parameterized JSONB @> containment to apply cert filter
      // This avoids unsafe string interpolation for JSONB user input.

      type RawCatalogRow = {
        id: string; name: string; sku: string | null;
        description: string | null; moq: number; imageUrl: string | null;
        product_category: string | null; fabric_type: string | null;
        gsm: unknown; material: string | null; composition: string | null;
        color: string | null; width_cm: unknown; construction: string | null;
        certifications: unknown;
        catalog_stage: string | null; stage_attributes: unknown;
      };

      let rawItems: RawCatalogRow[];

      if (certification) {
        // Two-pass: get IDs from Prisma (includes cursor/limit handling), then cert filter via raw SQL.
        const candidateIds = await prisma.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;
          const rows = await tx.catalogItem.findMany({
            where: baseWhere,
            select: { id: true },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 1000, // broad fetch — cert filter applied below
          });
          return rows.map(r => r.id);
        });

        if (candidateIds.length === 0) {
          return sendSuccess(reply, { items: [], count: 0, nextCursor: null });
        }

        // Safe parameterized JSONB containment — no string interpolation of user input.
        const certFilter = JSON.stringify([{ standard: certification }]);
        rawItems = await prisma.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;
          return tx.$queryRaw<RawCatalogRow[]>`
            SELECT id, name, sku, description, moq, image_url AS "imageUrl",
                   product_category, fabric_type, gsm, material, composition,
                   color, width_cm, construction, certifications,
                   catalog_stage, stage_attributes
            FROM catalog_items
            WHERE id = ANY(${candidateIds}::uuid[])
              AND certifications IS NOT NULL
              AND certifications @> ${certFilter}::jsonb
            ORDER BY updated_at DESC, id DESC
          `;
        });

        // Apply cursor-based pagination manually to raw results
        let startIdx = 0;
        if (cursor) {
          const cursorIdx = rawItems.findIndex(r => r.id === cursor);
          if (cursorIdx !== -1) startIdx = cursorIdx + 1;
        }
        rawItems = rawItems.slice(startIdx, startIdx + limit + 1);
      } else {
        // No cert filter — standard Prisma findMany with cursor pagination.
        const items = await prisma.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL ROLE texqtic_rfq_read`;
          return tx.catalogItem.findMany({
            where: baseWhere,
            select: {
              id: true, name: true, sku: true, description: true, moq: true, imageUrl: true,
              productCategory: true, fabricType: true, gsm: true, material: true,
              composition: true, color: true, widthCm: true, construction: true,
              certifications: true,
              catalogStage: true, stageAttributes: true,
            },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          });
        });

        const hasMore = items.length > limit;
        const resultItems = hasMore ? items.slice(0, limit) : items;
        const nextCursor = hasMore ? (resultItems[resultItems.length - 1]?.id ?? null) : null;

        return sendSuccess(reply, {
          items: resultItems.map(item => ({
            ...item,
            gsm: item.gsm != null ? Number(item.gsm) : null,
            widthCm: item.widthCm != null ? Number(item.widthCm) : null,
            stageAttributes: item.stageAttributes as Record<string, unknown> | null,
          })),
          count: resultItems.length,
          nextCursor,
        });
      }

      // Arrive here only in the cert two-pass path
      const hasMore = rawItems.length > limit;
      const resultRaw = hasMore ? rawItems.slice(0, limit) : rawItems;
      const nextCursor = hasMore ? (resultRaw[resultRaw.length - 1]?.id ?? null) : null;

      return sendSuccess(reply, {
        items: resultRaw.map(r => ({
          id: r.id,
          name: r.name,
          sku: r.sku,
          description: r.description,
          moq: Number(r.moq),
          imageUrl: r.imageUrl,
          productCategory: r.product_category,
          fabricType: r.fabric_type,
          gsm: r.gsm != null ? Number(r.gsm) : null,
          material: r.material,
          composition: r.composition,
          color: r.color,
          widthCm: r.width_cm != null ? Number(r.width_cm) : null,
          construction: r.construction,
          certifications: r.certifications as Array<{ standard: string }> | null,
          catalogStage: r.catalog_stage,
          stageAttributes: r.stage_attributes as Record<string, unknown> | null,
        })),
        count: resultRaw.length,
        nextCursor,
      });
    }
  );

  /**
   * GET /api/tenant/b2b/eligible-suppliers
   * List B2B-eligible suppliers for authenticated buyer supplier picker (Phase 2)
   *
   * TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 — Authorized by PRODUCT-DEC-BUYER-CATALOG-DISCOVERY-001
   *
   * Applies the same two eligibility gates as GET /api/tenant/catalog/supplier/:id/items:
   *   Gate A: organizations.publication_posture IN ('B2B_PUBLIC', 'BOTH')
   *           AND org_type = 'B2B' AND status IN ('ACTIVE', 'VERIFICATION_APPROVED')
   *   Gate B: tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'
   *
   * Unlike the public projection, exposes org id (UUID) because caller is authenticated.
   * Response contains no price, no item details, no negotiation state.
   */
  fastify.get(
    '/tenant/b2b/eligible-suppliers',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      if (!request.dbContext) {
        return sendUnauthorized(reply, 'Missing database context');
      }

      type SupplierPickerOrgRow = {
        id: string;
        slug: string;
        legal_name: string;
        primary_segment_key: string | null;
      };

      const eligibleOrgs: SupplierPickerOrgRow[] = await withOrgAdminContext(prisma, async tx => {
        const orgs: SupplierPickerOrgRow[] = await tx.organizations.findMany({
          where: {
            org_type: 'B2B',
            status: { in: ['ACTIVE', 'VERIFICATION_APPROVED'] },
            publication_posture: { in: ['B2B_PUBLIC', 'BOTH'] },
          },
          select: {
            id: true,
            slug: true,
            legal_name: true,
            primary_segment_key: true,
          },
          orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
        });

        if (orgs.length === 0) return [];

        const orgIds: string[] = orgs.map((o: SupplierPickerOrgRow) => o.id);
        const eligibleTenants: { id: string }[] = await tx.tenant.findMany({
          where: {
            id: { in: orgIds },
            publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
          },
          select: { id: true },
        });

        const eligibleIds = new Set(eligibleTenants.map((t: { id: string }) => t.id));
        return orgs.filter((o: SupplierPickerOrgRow) => eligibleIds.has(o.id));
      });

      return sendSuccess(reply, {
        items: eligibleOrgs.map((o: SupplierPickerOrgRow) => ({
          id: o.id,
          slug: o.slug,
          legalName: o.legal_name,
          primarySegment: o.primary_segment_key,
        })),
        total: eligibleOrgs.length,
      });
    }
  );

  /**
   * POST /api/tenant/cart
   * Create or return active cart for authenticated tenant user (idempotent)
   * Gate D.2: RLS-enforced, manual tenant filters removed
   */
  fastify.post('/tenant/cart', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;

    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const result = await withDbContext(prisma, dbContext, async tx => {
      // Find existing active cart (RLS enforces tenant boundary)
      let cart = await tx.cart.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          },
        },
      });

      // Create if not exists
      if (!cart) {
        cart = await tx.cart.create({
          data: {
            tenantId: dbContext.orgId,
            userId: userId,
            status: 'ACTIVE',
          },
          include: {
            items: {
              include: {
                catalogItem: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                    active: true,
                  },
                },
              },
            },
          },
        });

        // Audit: cart created
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'cart.CART_CREATED',
          entity: 'cart',
          entityId: cart.id,
          metadataJson: {
            cartId: cart.id,
            tenantId: dbContext.orgId,
            userId,
          },
        });
      }

      return cart;
    });

    return sendSuccess(reply, { cart: serializeCartResponse(result) }, 201);
  });

  /**
   * GET /api/tenant/cart
   * Get active cart with items for current tenant user
   * Gate D.2: RLS-enforced, manual tenant filter removed
   */
  fastify.get('/tenant/cart', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const cartOwnerUserId = dbContext.actorId;

    const cart = await withDbContext(prisma, dbContext, async tx => {
      return await tx.cart.findFirst({
        where: {
          userId: cartOwnerUserId,
          status: 'ACTIVE',
        },
        include: {
          items: {
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          },
        },
      });
    });

    if (!cart) {
      return sendSuccess(reply, { cart: null });
    }

    return sendSuccess(reply, { cart: serializeCartResponse(cart) });
  });

  /**
   * POST /api/tenant/cart/items
   * Add item to cart or increment quantity if already present
   * Gate D.2: RLS-enforced, manual tenant validation removed
   */
  fastify.post(
    '/tenant/cart/items',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      // Validate body
      const bodySchema = z.object({
        catalogItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { catalogItemId, quantity } = parseResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const cartOwnerUserId = dbContext.actorId;

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Validate catalog item exists and is active (RLS enforces tenant boundary)
        const catalogItem = await tx.catalogItem.findUnique({
          where: { id: catalogItemId },
        });

        if (!catalogItem) {
          return { error: 'CATALOG_ITEM_NOT_FOUND' };
        }

        // RLS removed: catalogItem.tenantId check (RLS policies enforce tenant boundary)

        if (!catalogItem.active) {
          return { error: 'CATALOG_ITEM_INACTIVE' };
        }

        // Ensure active cart exists (create if missing, RLS enforces tenant boundary)
        let cart = await tx.cart.findFirst({
          where: {
            userId: cartOwnerUserId,
            status: 'ACTIVE',
          },
        });

        let cartWasCreated = false;

        if (!cart) {
          cart = await tx.cart.create({
            data: {
              tenantId: dbContext.orgId,
              userId: cartOwnerUserId,
              status: 'ACTIVE',
            },
          });
          cartWasCreated = true;
        }

        // Upsert cart item
        const existingCartItem = await tx.cartItem.findUnique({
          where: {
            cartId_catalogItemId: {
              cartId: cart.id,
              catalogItemId,
            },
          },
        });

        // MOQ enforcement: finalQty = existing + incoming must meet moq
        const currentQty = existingCartItem?.quantity ?? 0;
        const finalQty = currentQty + quantity;
        if (finalQty < catalogItem.moq) {
          return {
            error: 'MOQ_NOT_MET' as const,
            requiredMoq: catalogItem.moq,
            finalQty,
          };
        }

        let cartItem;
        let resultingQuantity;

        if (existingCartItem) {
          resultingQuantity = existingCartItem.quantity + quantity;
          cartItem = await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: resultingQuantity },
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          });
        } else {
          resultingQuantity = quantity;
          cartItem = await tx.cartItem.create({
            data: {
              cartId: cart.id,
              catalogItemId,
              quantity,
            },
            include: {
              catalogItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  active: true,
                },
              },
            },
          });
        }

        // Audit: item added
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: cartOwnerUserId,
          action: 'cart.CART_ITEM_ADDED',
          entity: 'cart_item',
          entityId: cartItem.id,
          metadataJson: {
            cartId: cart.id,
            catalogItemId,
            quantityAdded: quantity,
            resultingQuantity,
          },
        });

        return {
          cartItem: normalizeCatalogItemPrice(cartItem),
          cartWasCreated,
          cartId: cart.id,
        };
      });

      if ('error' in result) {
        if (result.error === 'CATALOG_ITEM_NOT_FOUND') {
          return sendNotFound(reply, 'Catalog item not found');
        }
        // RLS removed: FORBIDDEN error (RLS policies enforce tenant boundary at DB level)
        if (result.error === 'CATALOG_ITEM_INACTIVE') {
          return sendError(reply, 'BAD_REQUEST', 'Catalog item is not active', 400);
        }
        if (result.error === 'MOQ_NOT_MET') {
          return reply.status(422).send({
            success: false,
            error: {
              code: 'MOQ_NOT_MET',
              message: 'Quantity below minimum order quantity',
              requiredMoq: result.requiredMoq,
              finalQty: result.finalQty,
            },
          });
        }
      }

      if (result.cartWasCreated) {
        try {
          await withDbContext(prisma, dbContext, async tx => {
            await writeAuditLog(tx, {
              realm: 'TENANT',
              tenantId: dbContext.orgId,
              actorType: 'USER',
              actorId: cartOwnerUserId,
              action: 'cart.CART_CREATED',
              entity: 'cart',
              entityId: result.cartId,
              metadataJson: {
                cartId: result.cartId,
                tenantId: dbContext.orgId,
                userId: cartOwnerUserId,
              },
            });
          });
        } catch (error) {
          console.warn('[cart][post_commit_cart_created_audit_failed]', {
            cartId: result.cartId,
            tenantId: dbContext.orgId,
            error,
          });
        }
      }

      return sendSuccess(reply, { cartItem: result.cartItem }, 201);
    }
  );

  /**
   * GET /api/tenant/rfqs
   * List buyer-owned RFQs for the authenticated tenant with minimal read projection.
   */
  fastify.get('/tenant/rfqs', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const queryResult = rfqListQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error.errors);
    }

    const { q, sort, status } = queryResult.data;
    const searchTerm = q?.trim();
    const idSearchResult = searchTerm ? z.string().uuid().safeParse(searchTerm) : null;

    try {
      const rfqs = await withDbContext(prisma, dbContext, async tx => {
        return tx.rfq.findMany({
          where: {
            orgId: dbContext.orgId,
            catalogItem: { name: { not: '' } }, // guard: skip orphaned RFQs whose catalog_items row was deleted
            ...(status ? { status } : {}),
            ...(searchTerm
              ? {
                  OR: [
                    ...(idSearchResult?.success ? [{ id: searchTerm }] : []),
                    { catalogItem: { name: { contains: searchTerm, mode: 'insensitive' } } },
                    { catalogItem: { sku: { contains: searchTerm, mode: 'insensitive' } } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            status: true,
            orgId: true,
            catalogItemId: true,
            quantity: true,
            supplierOrgId: true,
            createdAt: true,
            updatedAt: true,
            requirementTitle: true,
            quantityUnit: true,
            urgency: true,
            sampleRequired: true,
            targetDeliveryDate: true,
            deliveryLocation: true,
            deliveryCountry: true,
            stageRequirementAttributes: true,
            fieldSourceMeta: true,
            requirementConfirmedAt: true,
            catalogItem: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
          orderBy: sort === 'created_at_desc'
            ? [{ createdAt: 'desc' }, { id: 'desc' }]
            : [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
        });
      });

      return sendSuccess(reply, {
        rfqs: rfqs.map((r: BuyerRfqListRow) => mapBuyerRfqListItem({
          ...r,
          stageRequirementAttributes: r.stageRequirementAttributes as Record<string, unknown> | null,
          fieldSourceMeta: r.fieldSourceMeta as Record<string, unknown> | null,
        })),
        count: rfqs.length,
      });
    } catch (e) {
      console.error('[rfq][list][error]', e);
      return sendError(reply, 'INTERNAL_SERVER_ERROR', 'Failed to load RFQ list', 500);
    }
  });

  /**
   * GET /api/tenant/rfqs/inbox
   * List supplier-addressed RFQs for the authenticated tenant with minimal inbox projection.
   */
  fastify.get('/tenant/rfqs/inbox', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const queryResult = rfqListQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return sendValidationError(reply, queryResult.error.errors);
    }

    const { q, sort, status } = queryResult.data;
    const searchTerm = q?.trim();
    const idSearchResult = searchTerm ? z.string().uuid().safeParse(searchTerm) : null;

    const rfqs = await withDbContext(prisma, dbContext, async tx => {
      return tx.rfq.findMany({
        where: {
          supplierOrgId: dbContext.orgId,
          catalogItem: { name: { not: '' } }, // guard: skip orphaned RFQs whose catalog_items row was deleted
          ...(status ? { status } : {}),
          ...(searchTerm
            ? {
                OR: [
                  ...(idSearchResult?.success ? [{ id: searchTerm }] : []),
                  { catalogItem: { name: { contains: searchTerm, mode: 'insensitive' } } },
                  { catalogItem: { sku: { contains: searchTerm, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          status: true,
          catalogItemId: true,
          quantity: true,
          createdAt: true,
          updatedAt: true,
          requirementTitle: true,
          quantityUnit: true,
          urgency: true,
          sampleRequired: true,
          deliveryCountry: true,
          stageRequirementAttributes: true,
          catalogItem: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        orderBy: sort === 'created_at_desc'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
      });
    });

    return sendSuccess(reply, {
      rfqs: rfqs.map((r: SupplierRfqListRow) => mapSupplierRfqListItem({
        ...r,
        stageRequirementAttributes: r.stageRequirementAttributes as Record<string, unknown> | null,
      })),
      count: rfqs.length,
    });
  });

  /**
   * GET /api/tenant/rfqs/inbox/:id
   * Read a single supplier-addressed RFQ for the authenticated tenant with minimal detail projection.
   */
  fastify.get('/tenant/rfqs/inbox/:id', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const rfq = await withDbContext(prisma, dbContext, async tx => {
      return tx.rfq.findFirst({
        where: {
          id: paramsResult.data.id,
          supplierOrgId: dbContext.orgId,
          catalogItem: { name: { not: '' } }, // guard: orphaned RFQ → null → existing 404 path
        },
        select: {
          id: true,
          status: true,
          catalogItemId: true,
          quantity: true,
          buyerMessage: true,
          createdAt: true,
          updatedAt: true,
          orgId: true,
          requirementTitle: true,
          quantityUnit: true,
          urgency: true,
          sampleRequired: true,
          deliveryCountry: true,
          stageRequirementAttributes: true,
          catalogItem: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      });
    });

    if (!rfq) {
      return sendNotFound(reply, 'RFQ not found');
    }

    const buyerCounterpartySummary = await getCounterpartyProfileAggregation(rfq.orgId, prisma).catch((error: unknown) => {
      if (error instanceof OrganizationNotFoundError) {
        return null;
      }

      throw error;
    });

    return sendSuccess(reply, {
      rfq: mapSupplierRfqDetail({
        ...rfq,
        stageRequirementAttributes: rfq.stageRequirementAttributes as Record<string, unknown> | null,
        buyerCounterpartySummary,
      }),
    });
  });

  /**
   * POST /api/tenant/rfqs/inbox/:id/respond
   * Record the first supplier-side non-binding RFQ response for a supplier-addressed RFQ.
   */
  fastify.post('/tenant/rfqs/inbox/:id/respond', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;
    if (!userId) {
      return sendError(reply, 'UNAUTHORIZED', 'User context missing', 401);
    }

    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const bodySchema = z.object({
      message: z.string().trim().min(1).max(1000),
    }).strict();
    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return sendValidationError(reply, bodyResult.error.errors);
    }

    const rfqId = paramsResult.data.id;
    const message = bodyResult.data.message;

    try {
      const result = await withDbContext(prisma, dbContext, async tx => {
        const rfq = await tx.rfq.findFirst({
          where: {
            id: rfqId,
            supplierOrgId: dbContext.orgId,
          },
          select: {
            id: true,
            supplierOrgId: true,
            status: true,
          },
        });

        if (!rfq) {
          return { error: 'RFQ_NOT_FOUND' as const };
        }

        if (rfq.status === 'CLOSED') {
          return { error: 'RFQ_CLOSED' as const };
        }

        if (rfq.status === 'RESPONDED') {
          return { error: 'RFQ_ALREADY_RESPONDED' as const };
        }

        const existingResponse = await tx.rfqSupplierResponse.findUnique({
          where: { rfqId },
          select: { id: true },
        });

        if (existingResponse) {
          return { error: 'RFQ_RESPONSE_ALREADY_EXISTS' as const };
        }

        const response = await tx.rfqSupplierResponse.create({
          data: {
            rfqId,
            supplierOrgId: dbContext.orgId,
            message,
            createdByUserId: userId,
          },
          select: {
            id: true,
            rfqId: true,
            supplierOrgId: true,
            message: true,
            submittedAt: true,
            createdAt: true,
            updatedAt: true,
            createdByUserId: true,
          },
        });

        await tx.rfq.update({
          where: { id: rfqId },
          data: { status: 'RESPONDED' },
          select: { id: true, status: true },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId,
          action: 'rfq.RFQ_RESPONDED',
          entity: 'rfq_supplier_response',
          entityId: response.id,
          afterJson: {
            id: response.id,
            rfqId: response.rfqId,
            supplierOrgId: response.supplierOrgId,
            message: response.message,
            submittedAt: response.submittedAt.toISOString(),
            createdAt: response.createdAt.toISOString(),
            updatedAt: response.updatedAt.toISOString(),
            createdByUserId: response.createdByUserId,
            nonBinding: true,
          },
          metadataJson: {
            rfqId: response.rfqId,
            supplierOrgId: response.supplierOrgId,
            respondedAt: response.submittedAt.toISOString(),
            parentRfqStatus: 'RESPONDED',
            nonBinding: true,
          },
        });

        return { response };
      });

      if ('error' in result) {
        if (result.error === 'RFQ_NOT_FOUND') {
          return sendNotFound(reply, 'RFQ not found');
        }
        if (result.error === 'RFQ_CLOSED') {
          return sendError(reply, 'RFQ_CLOSED', 'RFQ is closed', 409);
        }
        if (result.error === 'RFQ_ALREADY_RESPONDED') {
          return sendError(reply, 'RFQ_ALREADY_RESPONDED', 'RFQ already has a supplier response', 409);
        }
        if (result.error === 'RFQ_RESPONSE_ALREADY_EXISTS') {
          return sendError(reply, 'RFQ_RESPONSE_ALREADY_EXISTS', 'RFQ already has a supplier response', 409);
        }

        return sendError(reply, 'CONFLICT', 'Unable to create RFQ response', 409);
      }

      return sendSuccess(reply, {
        response: mapSupplierRfqResponse(result.response),
        rfq: {
          id: result.response.rfqId,
          status: 'RESPONDED',
        },
        non_binding: true,
      }, 201);
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        return sendError(reply, 'RFQ_RESPONSE_ALREADY_EXISTS', 'RFQ already has a supplier response', 409);
      }
      throw error;
    }
  });

  /**
   * GET /api/tenant/rfqs/:id
   * Read a single buyer-owned RFQ for the authenticated tenant with minimal detail projection.
   */
  fastify.get('/tenant/rfqs/:id', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const rfq = await withDbContext(prisma, dbContext, async tx => {
      return tx.rfq.findFirst({
        where: {
          id: paramsResult.data.id,
          orgId: dbContext.orgId,
        },
        select: {
          id: true,
          status: true,
          catalogItemId: true,
          quantity: true,
          buyerMessage: true,
          supplierOrgId: true,
          createdByUserId: true,
          createdAt: true,
          updatedAt: true,
          requirementTitle: true,
          quantityUnit: true,
          urgency: true,
          sampleRequired: true,
          targetDeliveryDate: true,
          deliveryLocation: true,
          deliveryCountry: true,
          stageRequirementAttributes: true,
          fieldSourceMeta: true,
          requirementConfirmedAt: true,
        },
      });
    });

    if (!rfq) {
      return sendNotFound(reply, 'RFQ not found');
    }

    const catalogItem = await resolveRfqCatalogItemTarget(rfq.catalogItemId);
    if (!catalogItem) {
      return sendNotFound(reply, 'RFQ not found');
    }

    const [supplierResponse, tradeContinuity, supplierCounterpartySummary] = await Promise.all([
      resolveBuyerRfqSupplierResponse(rfq.id),
      resolveBuyerRfqTradeContinuity(dbContext, rfq.id),
      getCounterpartyProfileAggregation(rfq.supplierOrgId, prisma).catch((error: unknown) => {
        if (error instanceof OrganizationNotFoundError) {
          return null;
        }

        throw error;
      }),
    ]);

    return sendSuccess(reply, {
      rfq: mapBuyerRfqDetail({
        ...rfq,
        stageRequirementAttributes: rfq.stageRequirementAttributes as Record<string, unknown> | null,
        fieldSourceMeta: rfq.fieldSourceMeta as Record<string, unknown> | null,
        catalogItem: {
          name: catalogItem.name,
          sku: catalogItem.sku,
          price: catalogItem.price,
        },
        supplierResponse,
        supplierCounterpartySummary,
        tradeContinuity,
      }),
    });
  });

  /**
   * POST /api/tenant/rfqs/:id/ai-assist
   * AI-assisted RFQ field suggestion (read-only — does NOT mutate the rfqs table).
   * Implements TECS-AI-RFQ-ASSISTANT-MVP-001.
   *
   * Returns suggested values for incomplete RFQ fields based on the catalog item
   * and RFQ state. Buyer must confirm suggestions before applying via existing PATCH route.
   */
  fastify.post('/tenant/rfqs/:id/ai-assist', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;
    const dbContext = request.dbContext as DatabaseContext;

    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return sendValidationError(reply, paramsResult.error.issues);
    }
    const rfqId = paramsResult.data.id;

    // Optional idempotency key from HTTP header
    const idempotencyKey = (request.headers['x-idempotency-key'] as string | undefined)?.trim() || undefined;

    const requestId = randomUUID();
    const monthKey = getMonthKey();

    try {
      const result = await withDbContext(prisma, dbContext, async (tx) => {
        // 1. Load RFQ — must include buyerMessage for context assembly
        const rfq = await tx.rfq.findFirst({
          where: { id: rfqId },
          select: {
            id: true,
            orgId: true,
            supplierOrgId: true,
            catalogItemId: true,
            status: true,
            requirementTitle: true,
            quantityUnit: true,
            urgency: true,
            sampleRequired: true,
            deliveryCountry: true,
            stageRequirementAttributes: true,
            buyerMessage: true,
          },
        });

        if (!rfq || rfq.orgId !== dbContext.orgId) {
          return { notFound: true as const };
        }

        // 2. Only allow AI assist on open or responded RFQs
        if (rfq.status !== 'OPEN' && rfq.status !== 'RESPONDED') {
          return { invalidStatus: true as const, status: rfq.status };
        }

        // 3. Load catalog item for vector text assembly
        const catalogItem = await tx.catalogItem.findFirst({
          where: { id: rfq.catalogItemId, tenantId: rfq.supplierOrgId },
          select: {
            id: true,
            name: true,
            sku: true,
            active: true,
            catalogStage: true,
            stageAttributes: true,
            moq: true,
            material: true,
            composition: true,
            fabricType: true,
            gsm: true,
            color: true,
            widthCm: true,
            construction: true,
            description: true,
            productCategory: true,
            certifications: true,
          },
        });

        if (!catalogItem) {
          return { catalogNotFound: true as const };
        }

        // 4. Assemble pre-computed text strings (helpers in this file — circular-safe by design)
        const structuredRequirementText = assembleStructuredRfqRequirementSummaryText({
          buyerMessage: rfq.buyerMessage ?? undefined,
          requirementTitle: rfq.requirementTitle ?? undefined,
          quantityUnit: rfq.quantityUnit ?? undefined,
          urgency: rfq.urgency ?? undefined,
          sampleRequired: rfq.sampleRequired ?? undefined,
          deliveryCountry: rfq.deliveryCountry ?? undefined,
          stageRequirementAttributes: rfq.stageRequirementAttributes as Record<string, unknown> | null ?? undefined,
        });

        const catalogItemForText = {
          id: catalogItem.id,
          name: catalogItem.name,
          sku: catalogItem.sku,
          active: catalogItem.active,
          catalogStage: catalogItem.catalogStage,
          stageAttributes: catalogItem.stageAttributes as Record<string, unknown> | null,
          moq: catalogItem.moq,
          material: catalogItem.material,
          composition: catalogItem.composition,
          fabricType: catalogItem.fabricType,
          gsm: catalogItem.gsm,
          color: catalogItem.color,
          widthCm: catalogItem.widthCm,
          construction: catalogItem.construction,
          description: catalogItem.description,
          productCategory: catalogItem.productCategory,
          certifications: catalogItem.certifications,
        };
        const catalogItemText = buildCatalogItemVectorText(catalogItemForText);
        const catalogCompletenessScore = catalogItemAttributeCompleteness(catalogItemForText);

        // 5. Build RFQAssistantContext (PII redaction + forbidden field assertion done inside)
        const context = buildRfqAssistantContext({
          buyerOrgId: dbContext.orgId,
          rfqId: rfq.id,
          rfqStatus: rfq.status,
          structuredRequirementText,
          catalogItemId: catalogItem.id,
          catalogItemStage: catalogItem.catalogStage,
          catalogItemText,
          catalogCompletenessScore,
          supplierOrgId: rfq.supplierOrgId,
          retrievedChunks: [],
        });

        return { context };
      });

      if ('notFound' in result) {
        return sendNotFound(reply, 'RFQ not found');
      }
      if ('catalogNotFound' in result) {
        return sendNotFound(reply, 'Catalog item not found');
      }
      if ('invalidStatus' in result) {
        return sendError(reply, 422, 'AI assist is only available for OPEN or RESPONDED RFQs');
      }

      // 6. Run AI inference (outside the DB tx — inferenceService manages its own tx)
      const serviceResult = await runRfqAssistInference({
        context: result.context,
        monthKey,
        requestId,
        idempotencyKey,
        userId: userId ?? null,
        prisma,
        dbContext,
      });

      if (!serviceResult.ok) {
        return sendError(reply, 422, 'AI response could not be parsed as structured suggestions', {
          suggestionsParseError: true,
          humanConfirmationRequired: true,
          auditLogId: serviceResult.auditLogId,
        });
      }

      return reply.status(200).send({
        suggestions: serviceResult.suggestions,
        humanConfirmationRequired: true,
        reasoningLogId: serviceResult.reasoningLogId,
        auditLogId: serviceResult.auditLogId,
        hadInferenceError: serviceResult.hadInferenceError,
        fieldSourceMeta: { method: 'ai-rfq-assist', rfqId },
      });
    } catch (err) {
      if (err instanceof BudgetExceededError || err instanceof AiRateLimitExceededError) {
        return sendError(reply, 429, 'AI inference rate limit or budget exceeded');
      }
      throw err;
    }
  });

  /**
   * POST /api/tenant/rfqs
   * Record a non-binding buyer-initiated RFQ submission for a tenant-scoped catalog item.
   * This route is the backend prerequisite for future Request Quote CTA activation only.
   */
  fastify.post('/tenant/rfqs', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId } = request;

    const bodySchema = z.object({
      catalogItemId: z.string().uuid(),
      quantity: z.number().int().min(1).optional().default(1),
      buyerMessage: z.string().trim().min(1).max(1000).optional(),
      requirementTitle: z.string().trim().max(200).optional(),
      quantityUnit: z.string().trim().max(50).optional(),
      urgency: z.enum(['STANDARD', 'URGENT', 'FLEXIBLE']).optional(),
      sampleRequired: z.boolean().optional(),
      targetDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      deliveryLocation: z.string().trim().max(200).optional(),
      deliveryCountry: z.string().length(3).optional(),
      stageRequirementAttributes: z.record(z.unknown()).optional(),
      requirementConfirmedAt: z.string().datetime().optional(),
      fieldSourceMeta: z.record(z.unknown()).optional(),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const {
      catalogItemId,
      quantity,
      buyerMessage,
      requirementTitle,
      quantityUnit,
      urgency,
      sampleRequired,
      targetDeliveryDate,
      deliveryLocation,
      deliveryCountry,
      stageRequirementAttributes,
      requirementConfirmedAt,
      fieldSourceMeta,
    } = parseResult.data;

    const catalogItemTarget = await resolveRfqCatalogItemTarget(catalogItemId);

    if (!catalogItemTarget) {
      return sendNotFound(reply, 'Catalog item not found');
    }

    if (!catalogItemTarget.active) {
      return sendError(reply, 'BAD_REQUEST', 'Catalog item is not active', 400);
    }

    if (stageRequirementAttributes && catalogItemTarget.catalogStage) {
      const stageSchema = stageAttributesSchemas[catalogItemTarget.catalogStage as typeof CATALOG_STAGE_VALUES[number]];
      if (stageSchema) {
        const stageParseResult = stageSchema.safeParse(stageRequirementAttributes);
        if (!stageParseResult.success) {
          return sendValidationError(reply, stageParseResult.error.errors);
        }
      }
    }

    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const result = await withDbContext(prisma, dbContext, async tx => {
      const rfq = await tx.rfq.create({
        data: {
          orgId: dbContext.orgId,
          supplierOrgId: catalogItemTarget.supplierOrgId,
          catalogItemId: catalogItemTarget.id,
          quantity,
          buyerMessage: buyerMessage ?? null,
          status: 'OPEN',
          createdByUserId: userId ?? null,
          requirementTitle: requirementTitle ?? null,
          quantityUnit: quantityUnit ?? null,
          urgency: urgency ?? null,
          sampleRequired: sampleRequired ?? null,
          targetDeliveryDate: targetDeliveryDate ? new Date(targetDeliveryDate) : null,
          deliveryLocation: deliveryLocation ?? null,
          deliveryCountry: deliveryCountry ?? null,
          stageRequirementAttributes: stageRequirementAttributes ?? null,
          requirementConfirmedAt: (requirementTitle ?? quantityUnit ?? urgency ?? sampleRequired ?? targetDeliveryDate ?? deliveryLocation ?? deliveryCountry ?? stageRequirementAttributes) !== undefined
            ? (requirementConfirmedAt ? new Date(requirementConfirmedAt) : new Date())
            : null,
          fieldSourceMeta: fieldSourceMeta ?? null,
        },
        select: {
          id: true,
          status: true,
          orgId: true,
          catalogItemId: true,
          quantity: true,
          supplierOrgId: true,
          buyerMessage: true,
          createdByUserId: true,
          createdAt: true,
          updatedAt: true,
          requirementTitle: true,
          quantityUnit: true,
          urgency: true,
          sampleRequired: true,
          targetDeliveryDate: true,
          deliveryLocation: true,
          deliveryCountry: true,
          stageRequirementAttributes: true,
          fieldSourceMeta: true,
          requirementConfirmedAt: true,
        },
      });

      await writeAuditLog(tx, {
        realm: 'TENANT',
        tenantId: dbContext.orgId,
        actorType: 'USER',
        actorId: userId ?? null,
        action: 'rfq.RFQ_CREATED',
        entity: 'rfq',
        entityId: rfq.id,
        afterJson: {
          id: rfq.id,
          orgId: rfq.orgId,
          catalogItemId: catalogItemTarget.id,
          catalogItemName: catalogItemTarget.name,
          catalogItemSku: catalogItemTarget.sku,
          quantity,
          buyerMessage: rfq.buyerMessage,
          status: rfq.status,
          supplierOrgId: rfq.supplierOrgId,
          nonBinding: true,
          createdAt: rfq.createdAt.toISOString(),
        },
        metadataJson: {
          rfqId: rfq.id,
          catalogItemId: catalogItemTarget.id,
          quantity,
          createdAt: rfq.createdAt.toISOString(),
          createdBy: 'BUYER',
          supplierOrgId: rfq.supplierOrgId,
          nonBinding: true,
        },
      });

      return {
        rfq: mapBuyerRfqDetail({
          ...rfq,
          stageRequirementAttributes: rfq.stageRequirementAttributes as Record<string, unknown> | null,
          fieldSourceMeta: rfq.fieldSourceMeta as Record<string, unknown> | null,
          catalogItem: {
            name: catalogItemTarget.name,
            sku: catalogItemTarget.sku,
          },
          supplierResponse: null,
          tradeContinuity: null,
          supplierCounterpartySummary: null,
        }),
      };
    });

    return sendSuccess(reply, result, 201);
  });

  /**
   * PATCH /api/tenant/cart/items/:id
   * Update cart item quantity or remove if quantity is 0
   * Gate D.2: RLS-enforced, manual tenant/cart ownership checks removed
   */
  fastify.patch(
    '/tenant/cart/items/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId } = request;

      // Validate params
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const { id: cartItemId } = paramsResult.data;

      // Validate body
      const bodySchema = z.object({
        quantity: z.number().int().min(0),
      });

      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }

      const { quantity } = bodyResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Find cart item (RLS enforces tenant boundary via cart FK)
        const cartItem = await tx.cartItem.findUnique({
          where: { id: cartItemId },
          include: {
            cart: true,
            catalogItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                active: true,
              },
            },
          },
        });

        if (!cartItem) {
          return { error: 'CART_ITEM_NOT_FOUND' };
        }

        // Verify user ownership and cart status (user-level check, not tenant-level)
        // RLS removed: cartItem.cart.tenantId check (RLS policies enforce tenant boundary)
        if (cartItem.cart.userId !== userId || cartItem.cart.status !== 'ACTIVE') {
          return { error: 'FORBIDDEN' };
        }

        // If quantity is 0, remove the item
        if (quantity === 0) {
          await tx.cartItem.delete({
            where: { id: cartItemId },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'cart.CART_ITEM_REMOVED',
            entity: 'cart_item',
            entityId: cartItemId,
            metadataJson: {
              cartId: cartItem.cartId,
              catalogItemId: cartItem.catalogItemId,
              previousQuantity: cartItem.quantity,
            },
          });

          return { removed: true };
        }

        // Otherwise update quantity
        const updatedCartItem = await tx.cartItem.update({
          where: { id: cartItemId },
          data: { quantity },
          include: {
            catalogItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                active: true,
              },
            },
          },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'cart.CART_ITEM_UPDATED',
          entity: 'cart_item',
          entityId: cartItemId,
          metadataJson: {
            cartId: cartItem.cartId,
            catalogItemId: cartItem.catalogItemId,
            previousQuantity: cartItem.quantity,
            newQuantity: quantity,
          },
        });

        return { cartItem: normalizeCatalogItemPrice(updatedCartItem) };
      });

      if ('error' in result) {
        if (result.error === 'CART_ITEM_NOT_FOUND') {
          return sendNotFound(reply, 'Cart item not found');
        }
        if (result.error === 'FORBIDDEN') {
          return sendError(
            reply,
            'FORBIDDEN',
            'Cart item does not belong to your active cart',
            403
          );
        }
      }

      if ('removed' in result) {
        return sendSuccess(reply, { removed: true });
      }

      return sendSuccess(reply, { cartItem: result.cartItem });
    }
  );

  // ---------------------------------------------------------------------------
  // PR-A: Orders + Checkout
  // ---------------------------------------------------------------------------

  /**
   * POST /api/tenant/checkout
   * Convert active cart → order (stub payment, PAYMENT_PENDING status)
   * Gate PR-A: RLS-enforced via withDbContext
   */
  fastify.post('/tenant/checkout', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const checkoutUserId = dbContext.actorId;
    const t0 = Date.now();

    const result = await withDbContext(prisma, dbContext, async tx => {
      // Load active cart with items + catalog metadata
      const cart = await tx.cart.findFirst({
        where: { userId: checkoutUserId, status: 'ACTIVE' },
        include: {
          items: {
            include: {
              catalogItem: {
                select: { id: true, name: true, sku: true, price: true },
              },
            },
          },
        },
      });

      if (!cart) return { error: 'CART_NOT_FOUND' };
      if (cart.items.length === 0) return { error: 'CART_EMPTY' };

      // Compute totals via canonical Phase-1 function (G-010)
      // Stop-loss: TotalsInputError thrown if unitPrice/quantity invalid (never silent)
      const cartItems = cart.items;
      let totals;
      try {
        totals = computeTotals(
          cartItems.map((item: typeof cartItems[number]) => ({
            unitPrice: Number(item.catalogItem.price),
            quantity: item.quantity,
          })),
          'USD'
        );
      } catch (err) {
        if (err instanceof TotalsInputError) {
          return { error: 'INVALID_LINE_ITEM', code: err.code, message: err.message };
        }
        throw err;
      }
      const { subtotal, grandTotal: total, discountTotal, taxTotal, feeTotal, breakdown } = totals;

      // Create order + items + mark cart checked-out in single transaction
      const order = await tx.order.create({
        data: {
          tenantId: dbContext.orgId,
          userId: checkoutUserId,
          cartId: cart.id,
          status: 'PAYMENT_PENDING',
          currency: totals.currency,
          subtotal,
          total,
          items: {
            create: cartItems.map((item: typeof cartItems[number]) => ({
              tenantId: dbContext.orgId,
              catalogItemId: item.catalogItemId,
              sku: item.catalogItem.sku ?? '',
              name: item.catalogItem.name,
              quantity: item.quantity,
              unitPrice: Number(item.catalogItem.price),
              lineTotal: Number(item.catalogItem.price) * item.quantity,
            })),
          },
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKED_OUT' },
      });

      await writeAuditLog(tx, {
        realm: 'TENANT',
        tenantId: dbContext.orgId,
        actorType: 'USER',
        actorId: checkoutUserId,
        action: 'order.CHECKOUT_COMPLETED',
        entity: 'order',
        entityId: order.id,
        metadataJson: {
          cartId: cart.id,
          itemCount: cart.items.length,
          totals: { subtotal, discountTotal, taxTotal, feeTotal, grandTotal: total, currency: totals.currency, breakdown } as unknown as Prisma.JsonValue,
          orderId: order.id,
          durationMs: Date.now() - t0,
        },
      });

      // GAP-ORDER-LC-001: Record initial lifecycle transition in order_lifecycle_logs (SM canonical table).
      await tx.order_lifecycle_logs.create({
        data: {
          order_id: order.id,
          tenant_id: dbContext.orgId,
          from_state: null,
          to_state: 'PAYMENT_PENDING',
          actor_id: checkoutUserId,
          realm: 'tenant',
          request_id: dbContext.requestId,
        },
      });

      return {
        orderId: order.id,
        status: order.status,
        currency: totals.currency,
        itemCount: cart.items.length,
        totals: {
          subtotal,
          discountTotal,
          taxableAmount: totals.taxableAmount,
          taxTotal,
          feeTotal,
          grandTotal: total,
          breakdown,
        },
      };
    });

    if ('error' in result) {
      if (result.error === 'CART_NOT_FOUND') return sendNotFound(reply, 'No active cart found');
      if (result.error === 'CART_EMPTY') return sendError(reply, 'BAD_REQUEST', 'Cart is empty', 400);
      if (result.error === 'INVALID_LINE_ITEM') {
        return sendError(reply, 'BAD_REQUEST', `Checkout aborted: ${result.message}`, 400);
      }
    }

    return sendSuccess(reply, result, 201);
  });

  // B6a: explicit select shape for order_lifecycle_logs rows.
  // withDbContext types its callback tx as 'any' (RLS proxy; see database-context.ts).
  // The Prisma select is deterministic — these are the only 4 fields requested.
  type OLLSelectRow = { from_state: string | null; to_state: string; realm: string; created_at: Date };

  function serializeTenantOrder(
    rawOrder: Record<string, unknown> & { order_lifecycle_logs: OLLSelectRow[] }
  ) {
    const { order_lifecycle_logs, ...order } = rawOrder;
    const total = order.total;

    return {
      ...order,
      grandTotal: typeof total === 'number' ? total : total ?? null,
      lifecycleState: order_lifecycle_logs[0]?.to_state ?? null,
      lifecycleLogs: order_lifecycle_logs.map(l => ({
        fromState: l.from_state,
        toState: l.to_state,
        realm: l.realm,
        createdAt: l.created_at.toISOString(),
      })),
    };
  }

  /**
   * GET /api/tenant/orders
   * List orders for current tenant user (RLS-enforced)
   */
  fastify.get('/tenant/orders', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { userId, userRole } = request;
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const canReadTenantWideOrders = userRole === 'OWNER' || userRole === 'ADMIN';

    const rawOrders = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findMany({
        where: canReadTenantWideOrders ? undefined : { userId },
        include: {
          items: true,
          // GAP-ORDER-LC-001 B6a: expose canonical lifecycle state + recent log history.
          // RLS SELECT policy on order_lifecycle_logs allows tenant to read own rows.
          // take: 5 bounds payload; select minimises data transfer (no actor_id / request_id).
          order_lifecycle_logs: {
            orderBy: { created_at: 'desc' },
            take: 5,
            select: { from_state: true, to_state: true, realm: true, created_at: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }) as Array<Record<string, unknown> & { order_lifecycle_logs: OLLSelectRow[] }>;
    });

    const orders = rawOrders.map(serializeTenantOrder);

    return sendSuccess(reply, { orders, count: orders.length });
  });

  /**
   * GET /api/tenant/orders/:id
   * Get single order with items (RLS-enforced)
   */
  fastify.get('/tenant/orders/:id', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

    const { id: orderId } = paramsResult.data;
    // Database context injected by databaseContextMiddleware (G-005)
    const dbContext = request.dbContext;
    if (!dbContext) {
      return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const { userId, userRole } = request;
    const canReadTenantWideOrders = userRole === 'OWNER' || userRole === 'ADMIN';

    const rawOrder = await withDbContext(prisma, dbContext, async tx => {
      return tx.order.findFirst({
        where: canReadTenantWideOrders ? { id: orderId } : { id: orderId, userId },
        include: {
          items: true,
          // GAP-ORDER-LC-001 B6a: expose canonical lifecycle state + recent log history.
          order_lifecycle_logs: {
            orderBy: { created_at: 'desc' },
            take: 5,
            select: { from_state: true, to_state: true, realm: true, created_at: true },
          },
        },
      }) as (Record<string, unknown> & { order_lifecycle_logs: OLLSelectRow[] }) | null;
    });

    if (!rawOrder) return sendNotFound(reply, 'Order not found');

    const order = serializeTenantOrder(rawOrder);

    return sendSuccess(reply, { order });
  });

  /**
   * PATCH /api/tenant/orders/:id/status
   * SM-driven order status transitions (GAP-ORDER-LC-001-BACKEND-INTEGRATION-001)
   *
   * Transition rules (enforced by StateMachineService via allowed_transitions table):
   *   PAYMENT_PENDING → CONFIRMED  → stored as DB PLACED
   *   PLACED          → FULFILLED  → stored as DB PLACED (order_lifecycle_logs is semantic source of truth)
   *   PAYMENT_PENDING → CANCELLED  → stored as DB CANCELLED
   *   PLACED          → CANCELLED  → stored as DB CANCELLED
   *   CANCELLED       → *          → REJECTED (terminal state)
   *
   * Schema note: orders.status enum only has PAYMENT_PENDING | PLACED | CANCELLED.
   * CONFIRMED and FULFILLED map to PLACED at the DB level; order_lifecycle_logs holds
   * the canonical semantic state. This mapping will be removed when the enum is extended.
   *
   * Role gate: OWNER / ADMIN only (app-layer; D-5 / B1 preserved — app.roles GUC remains dormant).
   * Lifecycle log: written atomically by StateMachineService into order_lifecycle_logs.
   */
  fastify.patch(
    '/tenant/orders/:id/status',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // B1 role gate: OWNER / ADMIN only (D-5 preserved — app-layer enforcement, no DB GUC role check)
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can update order status', 403);
      }

      // Validate path param
      const paramsSchema = z.object({ id: z.string().uuid() });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

      // Validate request body
      const bodySchema = z.object({
        status: z.enum(['CONFIRMED', 'FULFILLED', 'CANCELLED']),
        reason: z.string().min(1).max(2000).trim().optional(),
      });
      const bodyResult = bodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const { id: orderId } = paramsResult.data;
      const { status: requestedStatus, reason } = bodyResult.data;

      const result = await withDbContext(prisma, dbContext, async tx => {
        // Load order in tenant scope — RLS-enforced by withDbContext (org_id scoped)
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) return { error: 'NOT_FOUND' as const };

        const currentDbStatus = order.status; // PAYMENT_PENDING | PLACED | CANCELLED

        // Derive canonical from-state from order_lifecycle_logs (semantic source of truth).
        // The DB status PLACED is ambiguous (CONFIRMED or FULFILLED), so the latest log
        // record is the authoritative SM state. Fall back to DB status if no log exists.
        const latestLog = await tx.order_lifecycle_logs.findFirst({
          where: { order_id: orderId },
          orderBy: { created_at: 'desc' },
        });
        const canonicalFromState: string = latestLog?.to_state ?? currentDbStatus;

        // SM-driven transition (GAP-ORDER-LC-001): validates permitted path + writes order_lifecycle_logs atomically.
        const txBound = makeTxBoundPrisma(tx);
        const smSvc = new StateMachineService(txBound);
        const smResult = await smSvc.transition({
          entityType: 'ORDER',
          entityId: orderId,
          orgId: dbContext.orgId,
          fromStateKey: canonicalFromState,
          toStateKey: requestedStatus,
          actorType: 'TENANT_ADMIN',
          actorUserId: userId ?? null,
          actorRole: userRole ?? 'ADMIN',
          reason: reason ?? `Tenant transition: ${requestedStatus}`,
          requestId: null,
        }, { db: txBound });

        if (smResult.status !== 'APPLIED') {
          const smStatus = smResult.status;
          if (smStatus === 'DENIED') {
            const code = smResult.code;
            if (code === 'TRANSITION_NOT_PERMITTED' || code === 'TRANSITION_FROM_TERMINAL' || code === 'TRANSITION_FROM_IRREVERSIBLE') {
              return { error: 'INVALID_TRANSITION' as const, canonicalFromState, requestedStatus, smStatus: code };
            }
            if (code === 'ACTOR_ROLE_NOT_PERMITTED') {
              return { error: 'FORBIDDEN' as const };
            }
            return { error: 'SM_ERROR' as const, smStatus: code };
          }
          // PENDING_APPROVAL / ESCALATION_REQUIRED — not configured for ORDER in current seed
          return { error: 'SM_ERROR' as const, smStatus };
        }

        // Map semantic requested status → DB OrderStatus enum value.
        // Schema limitation: orders.status enum only has PAYMENT_PENDING | PLACED | CANCELLED.
        // CONFIRMED and FULFILLED map to PLACED; order_lifecycle_logs holds the canonical state.
        const dbStatusUpdate: 'PLACED' | 'CANCELLED' =
          requestedStatus === 'CANCELLED' ? 'CANCELLED' : 'PLACED';

        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status: dbStatusUpdate },
        });

        return { order: updated };
      });

      if (result.error === 'NOT_FOUND') return sendNotFound(reply, 'Order not found');
      if (result.error === 'INVALID_TRANSITION') {
        return sendError(
          reply,
          'ORDER_STATUS_INVALID_TRANSITION',
          `Transition not permitted: ${result.canonicalFromState} → ${result.requestedStatus} (SM: ${result.smStatus})`,
          409
        );
      }
      if (result.error === 'FORBIDDEN') {
        return sendError(reply, 'FORBIDDEN', 'Actor role not permitted for this transition', 403);
      }
      if (result.error === 'SM_ERROR') {
        return sendError(reply, 'INTERNAL_SERVER_ERROR', `State machine error: ${result.smStatus}`, 500);
      }

      return sendSuccess(reply, { order: result.order });
    }
  );

  /**
   * POST /api/tenant/activate
   * User-assisted activation flow
   * Allows a user with an invite to activate their pre-provisioned tenant
   */
  fastify.post('/tenant/activate', async (request, reply) => {
    try {
      const bodySchema = z.object({
        inviteToken: z.string().min(1, 'Invite token is required'),
        userData: z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }),
        tenantData: z
          .object({
            name: z.string().optional(),
            industry: z.string().optional(),
          })
          .optional(),
        verificationData: z.object({
          registrationNumber: z.string().trim().min(1, 'Registration number is required'),
          jurisdiction: z.string().trim().min(1, 'Jurisdiction is required'),
        }),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { inviteToken, userData, tenantData, verificationData } = parseResult.data;

      // Hash the invite token to look it up
      const crypto = await import('node:crypto');
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');

      // Look up invite
      const invite = await prisma.invite.findFirst({
        where: {
          tokenHash,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          tenant: {
            include: {
              memberships: true,
            },
          },
        },
      });

      if (!invite) {
        return sendError(reply, 'INVALID_INVITE', 'Invite not found or expired', 404);
      }

      const normalizedInviteEmail = invite.email.trim().toLowerCase();
      const normalizedUserEmail = userData.email.trim().toLowerCase();

      // Check if email matches
      if (normalizedInviteEmail !== normalizedUserEmail) {
        return sendError(reply, 'EMAIL_MISMATCH', 'Email does not match invite', 403);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Gate D.1: Build db context for invite tenant
      const dbContext: DatabaseContext = {
        orgId: invite.tenantId,
        actorId: invite.tenantId, // System actor for activation
        realm: 'tenant',
        requestId: crypto.randomUUID(),
      };

      // G-014: Single atomic transaction — nested $transaction removed.
      // All activation writes + audit log execute in one connection, one context lifecycle.
      const result = await withDbContext(prisma, dbContext, async tx => {
        // Stop-loss: assert app.org_id context is set to expected tenantId before any writes
        const [ctxRow] = await tx.$queryRaw<[{ org_id: string }]>`
          SELECT current_setting('app.org_id', true) AS org_id
        `;
        if (ctxRow?.org_id !== invite.tenantId) {
          throw new Error(
            `[G-014] Activation stop-loss: app.org_id mismatch. ` +
              `Expected ${invite.tenantId}, got ${ctxRow?.org_id}`
          );
        }

        // Create or find user
        let user = await tx.user.findUnique({
          where: { email: normalizedUserEmail },
        });

        user ??= await tx.user.create({
          data: {
            email: normalizedUserEmail,
            passwordHash,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);

        const updatedOrg = await tx.organizations.update({
          where: { id: invite.tenantId },
          data: {
            ...(tenantData?.name?.trim() ? { legal_name: tenantData.name.trim() } : {}),
            registration_no: verificationData.registrationNumber.trim(),
            jurisdiction: verificationData.jurisdiction.trim(),
            status: 'PENDING_VERIFICATION',
          },
          select: {
            legal_name: true,
            status: true,
            org_type: true,
            is_white_label: true,
            plan: true,
          },
        });

        const updatedTenant = tenantData?.name?.trim()
          ? await tx.tenant.update({
              where: { id: invite.tenantId },
              data: { name: tenantData.name.trim() },
              select: { name: true },
            })
          : null;

        await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'tenant', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'false', true)`);

        const ownerExists = invite.tenant.memberships.some(membership => membership.role === 'OWNER');
        const resolvedRole = ownerExists ? invite.role : 'OWNER';

        // Create membership (RLS will enforce tenant_id = org_id)
        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            tenantId: invite.tenantId,
            role: resolvedRole,
          },
        });

        // Mark invite as accepted (RLS-enforced update)
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        // Write audit log inside the same transaction — atomic with activation writes (G-014)
        await writeAuditLog(tx, {
          tenantId: invite.tenantId,
          realm: 'TENANT',
          actorType: 'USER',
          actorId: user.id,
          action: 'user.activated',
          entity: 'user',
          entityId: user.id,
          metadataJson: {
            inviteId: invite.id,
            role: resolvedRole,
            firstOwnerActivated: !ownerExists,
            verificationStatus: updatedOrg.status,
          },
        });

        return { user, membership, updatedOrg, updatedTenant };
      });

      const tenant = await resolveTenantSessionIdentity({
        tenantId: invite.tenantId,
        actorId: result.user.id,
        userRole: result.membership.role,
      });

      // Issue tenant JWT — same claims as POST /api/auth/login tenant path
      const token = await reply.tenantJwtSign({
        userId: result.user.id,
        tenantId: invite.tenantId,
        role: result.membership.role,
      });

      return sendSuccess(reply, {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          tenant_category: tenant.tenant_category,
          primary_segment_key: tenant.primary_segment_key,
          secondary_segment_keys: tenant.secondary_segment_keys,
          role_position_keys: tenant.role_position_keys,
          is_white_label: tenant.is_white_label,
          status: tenant.status,
          plan: tenant.plan,
        },
        membership: {
          role: result.membership.role,
        },
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Tenant Activation] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Activation failed', 500);
    }
  });

  /**
   * POST /api/tenant/memberships
   * Create/invite a new member to the tenant
   * Requires OWNER or ADMIN role
   */
  fastify.post(
    '/tenant/memberships',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { tenantId, userRole } = request;

      // Early guard for tenant context (guaranteed by middleware)
      if (!tenantId) {
        return sendError(reply, 'UNAUTHORIZED', 'Tenant context missing', 401);
      }

      // Check permission
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
      }

      try {
        const bodySchema = z.object({
          email: z.string().email('Invalid email'),
          role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
        });

        const parseResult = bodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return sendValidationError(reply, parseResult.error.errors);
        }

        const { email, role } = parseResult.data;

        if (role === 'VIEWER') {
          return sendError(reply, 'VIEWER_TRANSITION_OUT_OF_SCOPE', 'VIEWER role transitions are not supported', 422);
        }

        // Create invite token
        const crypto = await import('node:crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Gate D.1: RLS-enforced invite creation (manual tenantId removed)
        const dbContext = request.dbContext;
        if (!dbContext) {
          return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
        }

        const invite = await withDbContext(prisma, dbContext, async tx => {
          const createdInvite = await tx.invite.create({
            data: {
              tenantId,
              email,
              role,
              tokenHash,
              expiresAt,
            },
          });

          await writeAuditLog(tx, {
            tenantId: tenantId ?? null,
            realm: 'TENANT',
            actorType: 'USER',
            actorId: request.userId ?? null,
            action: 'member.invited',
            entity: 'invite',
            entityId: createdInvite.id,
            metadataJson: {
              email,
              role,
            },
          });

          return createdInvite;
        });

        // G-012: Fire-and-forget invite email — errors logged, never block invite creation
        // G-015 Phase C: org display name read via admin-context (organizations.legal_name)
        let emailDelivery: InviteEmailDeliveryOutcome;
        try {
          let orgDisplayName = 'your organization';
          if (tenantId) {
            const org = await getOrganizationIdentity(tenantId, prisma);
            orgDisplayName = org.legal_name;
          }
          emailDelivery = await sendInviteMemberEmail(
            email,
            token,
            orgDisplayName,
            {
              tenantId: tenantId ?? null,
              triggeredBy: 'user',
              actorId: request.userId ?? null,
            }
          );
        } catch (emailErr) {
          fastify.log.error({ err: emailErr }, '[Invite] Email send failed (non-fatal)');
          emailDelivery = failedInviteEmailDeliveryOutcome();
        }

        return sendSuccess(reply, {
          invite: {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt,
          },
          inviteToken: token, // Return token for email delivery
          emailDelivery,
        });
      } catch (error: unknown) {
        fastify.log.error({ err: error }, '[Create Membership] Error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to invite member', 500);
      }
    }
  );

  /**
   * PUT /api/tenant/branding
   * Update tenant branding settings
   * Requires OWNER or ADMIN role
   */
  fastify.put('/tenant/branding', { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] }, async (request, reply) => {
    const { tenantId, userRole } = request;

    // Check permission
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return sendError(reply, 'FORBIDDEN', 'Insufficient permissions', 403);
    }

    try {
      const bodySchema = z.object({
        logoUrl: z.string().url().optional().nullable(),
        themeJson: z
          .object({
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
          })
          .optional()
          .nullable(),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { logoUrl, themeJson } = parseResult.data;

      // Database context injected by databaseContextMiddleware (G-005)
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Update or create branding (RLS handles tenant boundary)
      const branding = await withDbContext(prisma, dbContext, async tx => {
        // For upsert, WHERE clause without tenant_id (RLS filters reads)
        // For CREATE, use orgId from context
        return await tx.tenantBranding.upsert({
          where: { tenantId: dbContext.orgId },
          create: {
            tenantId: dbContext.orgId,
            logoUrl: logoUrl ?? undefined,
            themeJson: themeJson ?? undefined,
          },
          update: {
            logoUrl: logoUrl ?? undefined,
            themeJson: themeJson ?? undefined,
          },
        });
      });

      // Write audit log
      await writeAuditLog(prisma, {
        tenantId: tenantId ?? null,
        realm: 'TENANT',
        actorType: 'USER',
        actorId: request.userId ?? null,
        action: 'branding.updated',
        entity: 'branding',
        entityId: branding.id,
        metadataJson: {
          logoUrl,
          themeJson,
        },
      });

      return sendSuccess(reply, { branding });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, '[Update Branding] Error');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to update branding', 500);
    }
  });

  // ─── G-025: DPP Snapshot API ─────────────────────────────────────────────────
  // GET /api/tenant/dpp/:nodeId
  // Read-only. Queries 3 SQL views created in TECS 4B (G-025-DPP-SNAPSHOT-VIEWS-IMPLEMENT-001).
  // RLS inheritance: views are SECURITY INVOKER; tenant context set by withDbContext; no SECURITY DEFINER allowed.
  // G-025-ORGS-RLS-001 ✅ VALIDATED (commit afcf47e) — manufacturer fields restored (TECS 5C1/5C2).

  // --- Row type interfaces for $queryRaw ---
  interface DppProductRow {
    node_id: string;
    org_id: string;
    batch_id: string | null;
    node_type: string | null;
    meta: unknown;
    geo_hash: string | null;
    visibility: string | null;
    created_at: Date;
    updated_at: Date;
    manufacturer_name: string | null;
    manufacturer_jurisdiction: string | null;
    manufacturer_registration_no: string | null;
  }

  interface DppLineageRow {
    root_node_id: string;
    node_id: string;
    parent_node_id: string | null;
    depth: number;
    edge_type: string | null;
    org_id: string;
    created_at: Date;
  }

  interface DppCertRow {
    node_id: string | null;
    certification_id: string | null;
    certification_type: string | null;
    lifecycle_state_id: string | null;
    expiry_date: Date | null;
    org_id: string;
  }

  /**
   * GET /api/tenant/dpp/:nodeId
   *
   * Returns a Digital Product Passport snapshot for a given traceability node.
   * Data comes from three SECURITY INVOKER views created in TECS 4B:
   *   - dpp_snapshot_products_v1       (node identity + manufacturer fields via organizations LEFT JOIN)
   *   - dpp_snapshot_lineage_v1        (supply-chain lineage graph via recursive CTE)
   *   - dpp_snapshot_certifications_v1 (org → node cert linkages via node_certifications)
   *
   * G-025-ORGS-RLS-001 ✅ VALIDATED — manufacturer_* fields now returned from view (TECS 5C1).
   * organizations JOIN is in the view only; this route queries the view, not organizations directly.
   */
  fastify.get(
    '/tenant/dpp/:nodeId',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const paramsSchema = z.object({ nodeId: z.string().uuid('nodeId must be a valid UUID') });
      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);

      const { nodeId } = paramsResult.data;

      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // ── 1. Query all three views inside a single tenant-scoped $transaction ──
      const [productRows, lineageRows, certRows] = await withDbContext(
        prisma,
        dbContext,
        async tx => {
          // RLS inheritance: views are SECURITY INVOKER; tenant context set by withDbContext; no SECURITY DEFINER allowed.
          // All queries are parameterized — no string interpolation.
          const products = await tx.$queryRaw<DppProductRow[]>`
            SELECT
              node_id, org_id, batch_id, node_type, meta,
              geo_hash, visibility, created_at, updated_at,
              manufacturer_name, manufacturer_jurisdiction, manufacturer_registration_no
            FROM dpp_snapshot_products_v1
            WHERE node_id = ${nodeId}::uuid
          `;

          const lineage = await tx.$queryRaw<DppLineageRow[]>`
            SELECT
              root_node_id, node_id, parent_node_id,
              depth, edge_type, org_id, created_at
            FROM dpp_snapshot_lineage_v1
            WHERE root_node_id = ${nodeId}::uuid
          `;

          const certs = await tx.$queryRaw<DppCertRow[]>`
            SELECT
              node_id, certification_id, certification_type,
              lifecycle_state_id, expiry_date, org_id
            FROM dpp_snapshot_certifications_v1
            WHERE node_id = ${nodeId}::uuid
               OR (node_id IS NULL AND org_id = (
                 SELECT org_id FROM dpp_snapshot_products_v1 WHERE node_id = ${nodeId}::uuid LIMIT 1
               ))
          `;

          return [products, lineage, certs] as [DppProductRow[], DppLineageRow[], DppCertRow[]];
        },
      );

      // ── 2. 404 if no product row — RLS may hide the node from this tenant ──
      if (productRows.length === 0) {
        return sendNotFound(reply, 'DPP snapshot not found or access denied');
      }

      const product = productRows[0];

      // ── 3. Write read-audit entry ──────────────────────────────────────────
      await writeAuditLog(prisma, {
        tenantId: request.tenantId ?? null,
        realm: 'TENANT',
        actorType: 'USER',
        actorId: request.userId ?? null,
        action: 'tenant.dpp.read',
        entity: 'traceability_node',
        entityId: nodeId,
        metadataJson: { nodeId, orgId: dbContext.orgId },
      });

      // ── 4. Shape response ──────────────────────────────────────────────────
      return sendSuccess(reply, {
        nodeId,
        product: {
          nodeId: product.node_id,
          orgId: product.org_id,
          batchId: product.batch_id,
          nodeType: product.node_type,
          meta: product.meta,
          geoHash: product.geo_hash,
          visibility: product.visibility,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          manufacturerName: product.manufacturer_name,
          manufacturerJurisdiction: product.manufacturer_jurisdiction,
          manufacturerRegistrationNo: product.manufacturer_registration_no,
        },
        lineage: lineageRows.map(row => ({
          rootNodeId: row.root_node_id,
          nodeId: row.node_id,
          parentNodeId: row.parent_node_id,
          depth: row.depth,
          edgeType: row.edge_type,
          createdAt: row.created_at,
        })),
        certifications: certRows.map(row => ({
          nodeId: row.node_id,
          certificationId: row.certification_id,
          certificationType: row.certification_type,
          lifecycleStateId: row.lifecycle_state_id,
          expiryDate: row.expiry_date,
          orgId: row.org_id,
        })),
        meta: {},
      });
    },
  );

  // ─── G-022: Tenant escalation routes ────────────────────────────────────────
  // GET  /api/tenant/escalations
  // POST /api/tenant/escalations
  await fastify.register(tenantEscalationRoutes, { prefix: '/tenant/escalations' });

  // ─── G-017: Tenant trade routes ──────────────────────────────────────────────
  // POST /api/tenant/trades
  // POST /api/tenant/trades/:id/transition
  await fastify.register(tenantTradesRoutes, { prefix: '/tenant/trades' });

  // ─── G-018: Escrow Governance Routes ───────────────────────────────────────
  // POST /api/tenant/escrows
  // POST /api/tenant/escrows/:escrowId/transactions
  // POST /api/tenant/escrows/:escrowId/transition
  // GET  /api/tenant/escrows
  // GET  /api/tenant/escrows/:escrowId
  await fastify.register(tenantEscrowRoutes, { prefix: '/tenant/escrows' });

  // ─── G-019: Settlement Routes ─────────────────────────────────────────────
  // POST /api/tenant/settlements/preview
  // POST /api/tenant/settlements
  await fastify.register(tenantSettlementRoutes, { prefix: '/tenant/settlements' });

  // ─── G-019: Certification Routes ─────────────────────────────────────────
  // POST  /api/tenant/certifications
  // GET   /api/tenant/certifications
  // GET   /api/tenant/certifications/:id
  // PATCH /api/tenant/certifications/:id
  // POST  /api/tenant/certifications/:id/transition
  await fastify.register(tenantCertificationRoutes, { prefix: '/tenant/certifications' });

  // ─── G-016: Traceability Graph Routes (Phase A) ──────────────────────────────
  // POST  /api/tenant/traceability/nodes
  // GET   /api/tenant/traceability/nodes
  // GET   /api/tenant/traceability/nodes/:id/neighbors
  // POST  /api/tenant/traceability/edges
  // GET   /api/tenant/traceability/edges
  await fastify.register(tenantTraceabilityRoutes, { prefix: '/tenant/traceability' });

  // ─── G-026 TECS 6D: Domain CRUD (OPS-WLADMIN-DOMAINS-001) ────────────────
  // GET    /api/tenant/domains        — list custom domains for current tenant
  // POST   /api/tenant/domains        — add a custom domain (OWNER/ADMIN)
  // DELETE /api/tenant/domains/:id    — remove a custom domain (OWNER/ADMIN)
  // Governance: GOVERNANCE-SYNC-093

  /**
   * GET /api/tenant/domains
   * List custom domains registered for the current tenant.
   */
  fastify.get(
    '/tenant/domains',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const domains = await withDbContext(prisma, dbContext, async tx => {
        return tx.tenantDomain.findMany({
          where: { tenantId: dbContext.orgId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            domain: true,
            verified: true,
            primary: true,
            createdAt: true,
          },
        });
      });

      return sendSuccess(reply, { domains });
    },
  );

  /**
   * POST /api/tenant/domains
   * Add a custom domain for the current tenant (OWNER or ADMIN only).
   * Emits cache invalidation after commit.
   */
  fastify.post(
    '/tenant/domains',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: OWNER or ADMIN only
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can add domains', 403);
      }

      const bodySchema = z.object({
        domain: z
          .string()
          .min(1)
          .max(255)
          .regex(
            /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/,
            'Invalid domain format — must be lowercase, no scheme, no path, no port',
          ),
      });

      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, parseResult.error.errors);
      }

      const { domain } = parseResult.data;

      let created: { id: string; domain: string; verified: boolean; primary: boolean; createdAt: Date };
      try {
        created = await withDbContext(prisma, dbContext, async tx => {
          const row = await tx.tenantDomain.create({
            data: {
              tenantId: dbContext.orgId,
              domain,
              verified: false,
              primary: false,
            },
            select: {
              id: true,
              domain: true,
              verified: true,
              primary: true,
              createdAt: true,
            },
          });

          await writeAuditLog(tx, {
            realm: 'TENANT',
            tenantId: dbContext.orgId,
            actorType: 'USER',
            actorId: userId ?? null,
            action: 'domain.added',
            entity: 'tenant_domain',
            entityId: row.id,
            metadataJson: { domain },
          });

          return row;
        });
      } catch (err: unknown) {
        // Unique constraint violation — domain already claimed (possibly by another tenant).
        // Return generic 409 to avoid information leakage.
        const e = err as { code?: string };
        if (e?.code === 'P2002') {
          return sendError(reply, 'CONFLICT', 'Domain is already registered', 409);
        }
        throw err;
      }

      // Emit cache invalidation — best-effort, direct function call (no HTTP).
      emitCacheInvalidate([domain], 'domain_crud', request.log);

      return sendSuccess(reply, { domain: created }, 201);
    },
  );

  /**
   * DELETE /api/tenant/domains/:id
   * Remove a custom domain (OWNER or ADMIN only, tenantId-scoped).
   * Emits cache invalidation after commit.
   */
  fastify.delete(
    '/tenant/domains/:id',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const { userId, userRole } = request;
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      // Role guard: OWNER or ADMIN only
      if (!['OWNER', 'ADMIN'].includes(userRole ?? '')) {
        return sendError(reply, 'FORBIDDEN', 'Only OWNER or ADMIN can remove domains', 403);
      }

      const { id } = request.params as { id: string };

      // Find domain — must belong to this tenant (RLS + explicit tenantId guard).
      const existing = await withDbContext(prisma, dbContext, async tx => {
        return tx.tenantDomain.findFirst({
          where: { id, tenantId: dbContext.orgId },
          select: { id: true, domain: true },
        });
      });

      if (!existing) {
        return sendNotFound(reply, 'Domain not found');
      }

      await withDbContext(prisma, dbContext, async tx => {
        await tx.tenantDomain.delete({ where: { id: existing.id } });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: dbContext.orgId,
          actorType: 'USER',
          actorId: userId ?? null,
          action: 'domain.removed',
          entity: 'tenant_domain',
          entityId: existing.id,
          metadataJson: { domain: existing.domain },
        });
      });

      // Emit cache invalidation — best-effort, direct function call (no HTTP).
      emitCacheInvalidate([existing.domain], 'domain_crud', request.log);

      return sendSuccess(reply, { deleted: existing.id });
    },
  );
};

export default tenantRoutes;
