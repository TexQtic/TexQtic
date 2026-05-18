/**
 * Public Routes — unauthenticated, no realm guard required.
 *
 * TECS-FBW-AUTH-001 (2026-03-13):
 *   Added GET /api/public/tenants/resolve?slug=<slug>
 *   Resolves a tenant slug to its canonical identity for login flow use only.
 *   No auth required. Returns only public-safe fields (id, slug, name).
 *   Registered in index.ts at prefix /api/public.
 *   /api/public added to ENDPOINT_REALM_MAP as 'public' in realmGuard.ts.
 *
 * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14):
 *   Added GET /api/public/tenants/by-email?email=<email>
 *   Returns all active tenant memberships for an email address.
 *   Used by tenant login UI to replace the manual slug entry field.
 *   No auth required. Returns only public-safe tenant fields (id, slug, name).
 *   Empty array is a valid response — handled by frontend as "no account found".
 *
 * PW5-AUTH-BY-EMAIL-RLS-REMEDIATION (2026-03-14):
 *   Fixed /tenants/by-email to run under a tx-local BYPASSRLS role so the
 *   membership lookup is not denied by FORCE RLS (memberships policies scope
 *   exclusively to texqtic_app; bare postgres gets 0 rows under deny-by-default).
 *   Migration 20260319000001_pw5_by_email_service_role_grants adds minimum
 *   SELECT grants on public.memberships and public.users for the lookup role.
 *   Deployed via pnpm -C server migrate:deploy:prod (OPS-ENV-001).
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { prisma } from '../db/prisma.js';
import { withDbContext } from '../lib/database-context.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { normalizeHost, parsePlatformHost } from '../lib/hostNormalize.js';
import { resolveHostToTenant } from './internal/resolveDomain.js';
import { listPublicB2BSuppliers, getPublicB2BSupplierBySlug } from '../services/publicB2BProjection.service.js';
import { listPublicB2CProducts, getPublicB2CProductBySlug } from '../services/publicB2CProjection.service.js';
import { APPROVED_CATEGORY_SLUGS } from '../config/publicB2CCategoryPageSlugs.js';
import { APPROVED_COLLECTION_SLUGS } from '../config/publicCollectionSlugs.js';

type PublicEntryKind = 'PLATFORM' | 'TENANT_SUBDOMAIN' | 'TENANT_CUSTOM_DOMAIN';
type ResolutionSourceType =
  | 'HOST_DOMAIN'
  | 'SLUG_PATH'
  | 'EMAIL_MEMBERSHIP_DISCOVERY'
  | 'DIRECT_PUBLIC_IDENTIFIER'
  | 'NEUTRAL_ENTRY';
type ResolutionDisposition =
  | 'RESOLVED'
  | 'CANDIDATE_SELECTION_REQUIRED'
  | 'NEUTRAL_NO_TENANT'
  | 'UNRESOLVED_REJECTED';
type ResolvedRealmClass =
  | 'NEUTRAL_PUBLIC_ENTRY'
  | 'B2B_PUBLIC_DISCOVERY_ENTRY'
  | 'B2C_PUBLIC_BROWSE_ENTRY'
  | 'TENANT_AUTHENTICATED_ENTRY_ONLY'
  | 'AGGREGATOR_AUTHENTICATED_ENTRY_ONLY';
type AllowedTargetSurfaceClass =
  | 'NEUTRAL_PUBLIC_ENTRY_SURFACE'
  | 'TENANT_BRANDED_PUBLIC_SURFACE'
  | 'AUTHENTICATED_TENANT_ENTRY_SURFACE'
  | 'QUALIFIED_AUTHENTICATED_WORKSPACE_ENTRY_SURFACE';
type RequiredTransitionClass =
  | 'NONE_STAY_IN_PUBLIC_ENTRY'
  | 'ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE'
  | 'LAUNCH_AUTHENTICATED_TENANT_ENTRY'
  | 'LAUNCH_QUALIFIED_AUTHENTICATED_WORKSPACE';
type DownstreamHandoffTargetClass =
  | 'NONE'
  | 'B2B_AUTHENTICATED_CONTINUITY'
  | 'B2C_AUTHENTICATED_CONTINUITY'
  | 'AGGREGATOR_AUTHENTICATED_WORKSPACE'
  | 'OWNER_READY_ACTIVATION_CHECK';

interface PublicEntryTenantContext {
  tenantId: string;
  slug: string;
  name: string;
}

interface BrandSurfaceFramingContext {
  tenantSlug: string;
  tenantName: string;
}

interface PublicEntryResolutionDescriptor {
  publicEntryKind: PublicEntryKind;
  normalizedHost: string | null;
  resolutionSourceType: ResolutionSourceType;
  resolutionDisposition: ResolutionDisposition;
  resolvedRealmClass: ResolvedRealmClass;
  resolvedTenantContext: PublicEntryTenantContext | null;
  brandSurfaceFramingContext: BrandSurfaceFramingContext | null;
  allowedTargetSurfaceClass: AllowedTargetSurfaceClass;
  requiredTransitionClass: RequiredTransitionClass;
  authenticationRequired: boolean;
  postAuthEligibilityCheckRequired: boolean;
  downstreamHandoffTargetClass: DownstreamHandoffTargetClass;
  candidateTenantContexts?: PublicEntryTenantContext[];
}

interface PublicTenantRecord extends PublicEntryTenantContext {
  type: 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL' | 'WHITE_LABEL';
  isWhiteLabel: boolean;
}

const DEFAULT_PLATFORM_HOSTS = [
  'texqtic.app',
  'texqtic.com',
  'app.texqtic.com',
  'www.texqtic.app',
  'www.texqtic.com',
  'api.texqtic.app',
] as const;

function buildPlatformHostSet(): Set<string> {
  const customHosts = process.env.TEXQTIC_PLATFORM_DOMAINS
    ? process.env.TEXQTIC_PLATFORM_DOMAINS.split(',').map(host => host.trim()).filter(Boolean)
    : [];

  return new Set([...DEFAULT_PLATFORM_HOSTS, ...customHosts]);
}

const PLATFORM_HOSTS = buildPlatformHostSet();

function isDevHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  );
}

function isNeutralPlatformHost(host: string): boolean {
  return isDevHost(host) || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app');
}

function resolveNormalizedHost(request: FastifyRequest): string | null {
  const rawHost = typeof request.headers.host === 'string' ? request.headers.host : '';
  const normalizedHost = normalizeHost(rawHost);
  return normalizedHost.ok ? normalizedHost.host : null;
}

function resolvePublicEntryKind(
  normalizedHost: string | null,
  hostResolved: boolean,
): PublicEntryKind {
  if (!normalizedHost || isNeutralPlatformHost(normalizedHost)) {
    return 'PLATFORM';
  }

  if (hostResolved) {
    return parsePlatformHost(normalizedHost).isPlatform ? 'TENANT_SUBDOMAIN' : 'TENANT_CUSTOM_DOMAIN';
  }

  return parsePlatformHost(normalizedHost).isPlatform ? 'TENANT_SUBDOMAIN' : 'TENANT_CUSTOM_DOMAIN';
}

function toPublicTenantContext(tenant: PublicTenantRecord): PublicEntryTenantContext {
  return {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    name: tenant.name,
  };
}

function toBrandSurfaceFramingContext(tenant: PublicTenantRecord): BrandSurfaceFramingContext {
  return {
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
  };
}

function buildNeutralDescriptor(input: {
  publicEntryKind: PublicEntryKind;
  normalizedHost: string | null;
  resolutionSourceType: ResolutionSourceType;
}): PublicEntryResolutionDescriptor {
  return {
    publicEntryKind: input.publicEntryKind,
    normalizedHost: input.normalizedHost,
    resolutionSourceType: input.resolutionSourceType,
    resolutionDisposition: 'NEUTRAL_NO_TENANT',
    resolvedRealmClass: 'NEUTRAL_PUBLIC_ENTRY',
    resolvedTenantContext: null,
    brandSurfaceFramingContext: null,
    allowedTargetSurfaceClass: 'NEUTRAL_PUBLIC_ENTRY_SURFACE',
    requiredTransitionClass: 'NONE_STAY_IN_PUBLIC_ENTRY',
    authenticationRequired: false,
    postAuthEligibilityCheckRequired: false,
    downstreamHandoffTargetClass: 'NONE',
  };
}

function buildRejectedDescriptor(input: {
  publicEntryKind: PublicEntryKind;
  normalizedHost: string | null;
  resolutionSourceType: ResolutionSourceType;
}): PublicEntryResolutionDescriptor {
  return {
    publicEntryKind: input.publicEntryKind,
    normalizedHost: input.normalizedHost,
    resolutionSourceType: input.resolutionSourceType,
    resolutionDisposition: 'UNRESOLVED_REJECTED',
    resolvedRealmClass: 'NEUTRAL_PUBLIC_ENTRY',
    resolvedTenantContext: null,
    brandSurfaceFramingContext: null,
    allowedTargetSurfaceClass: 'NEUTRAL_PUBLIC_ENTRY_SURFACE',
    requiredTransitionClass: 'NONE_STAY_IN_PUBLIC_ENTRY',
    authenticationRequired: false,
    postAuthEligibilityCheckRequired: false,
    downstreamHandoffTargetClass: 'NONE',
  };
}

function buildCandidateDescriptor(input: {
  publicEntryKind: PublicEntryKind;
  normalizedHost: string | null;
  resolutionSourceType: ResolutionSourceType;
  candidateTenantContexts: PublicEntryTenantContext[];
}): PublicEntryResolutionDescriptor {
  return {
    publicEntryKind: input.publicEntryKind,
    normalizedHost: input.normalizedHost,
    resolutionSourceType: input.resolutionSourceType,
    resolutionDisposition: 'CANDIDATE_SELECTION_REQUIRED',
    resolvedRealmClass: 'NEUTRAL_PUBLIC_ENTRY',
    resolvedTenantContext: null,
    brandSurfaceFramingContext: null,
    allowedTargetSurfaceClass: 'NEUTRAL_PUBLIC_ENTRY_SURFACE',
    requiredTransitionClass: 'NONE_STAY_IN_PUBLIC_ENTRY',
    authenticationRequired: false,
    postAuthEligibilityCheckRequired: false,
    downstreamHandoffTargetClass: 'NONE',
    candidateTenantContexts: input.candidateTenantContexts,
  };
}

function buildResolvedDescriptor(input: {
  publicEntryKind: PublicEntryKind;
  normalizedHost: string | null;
  resolutionSourceType: ResolutionSourceType;
  tenant: PublicTenantRecord;
}): PublicEntryResolutionDescriptor {
  const isAggregatorWorkspace = input.tenant.type === 'AGGREGATOR' || input.tenant.type === 'INTERNAL';

  if (isAggregatorWorkspace) {
    return {
      publicEntryKind: input.publicEntryKind,
      normalizedHost: input.normalizedHost,
      resolutionSourceType: input.resolutionSourceType,
      resolutionDisposition: 'RESOLVED',
      resolvedRealmClass: 'AGGREGATOR_AUTHENTICATED_ENTRY_ONLY',
      resolvedTenantContext: toPublicTenantContext(input.tenant),
      brandSurfaceFramingContext: toBrandSurfaceFramingContext(input.tenant),
      allowedTargetSurfaceClass: 'QUALIFIED_AUTHENTICATED_WORKSPACE_ENTRY_SURFACE',
      requiredTransitionClass: 'LAUNCH_QUALIFIED_AUTHENTICATED_WORKSPACE',
      authenticationRequired: true,
      postAuthEligibilityCheckRequired: true,
      downstreamHandoffTargetClass: 'AGGREGATOR_AUTHENTICATED_WORKSPACE',
    };
  }

  if (input.tenant.type === 'B2C') {
    return {
      publicEntryKind: input.publicEntryKind,
      normalizedHost: input.normalizedHost,
      resolutionSourceType: input.resolutionSourceType,
      resolutionDisposition: 'RESOLVED',
      resolvedRealmClass: 'B2C_PUBLIC_BROWSE_ENTRY',
      resolvedTenantContext: toPublicTenantContext(input.tenant),
      brandSurfaceFramingContext: toBrandSurfaceFramingContext(input.tenant),
      allowedTargetSurfaceClass: 'TENANT_BRANDED_PUBLIC_SURFACE',
      requiredTransitionClass: 'ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE',
      authenticationRequired: false,
      postAuthEligibilityCheckRequired: false,
      downstreamHandoffTargetClass: 'B2C_AUTHENTICATED_CONTINUITY',
    };
  }

  return {
    publicEntryKind: input.publicEntryKind,
    normalizedHost: input.normalizedHost,
    resolutionSourceType: input.resolutionSourceType,
    resolutionDisposition: 'RESOLVED',
    resolvedRealmClass: 'B2B_PUBLIC_DISCOVERY_ENTRY',
    resolvedTenantContext: toPublicTenantContext(input.tenant),
    brandSurfaceFramingContext: toBrandSurfaceFramingContext(input.tenant),
    allowedTargetSurfaceClass: 'TENANT_BRANDED_PUBLIC_SURFACE',
    requiredTransitionClass: 'ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE',
    authenticationRequired: false,
    postAuthEligibilityCheckRequired: false,
    downstreamHandoffTargetClass: 'B2B_AUTHENTICATED_CONTINUITY',
  };
}

async function findActiveTenantBySlug(slug: string): Promise<PublicTenantRecord | null> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      slug,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      isWhiteLabel: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: tenant.type,
    isWhiteLabel: tenant.isWhiteLabel,
  };
}

async function findResolvedHostTenant(normalizedHost: string): Promise<PublicTenantRecord | null> {
  const resolvedHostTenant = await resolveHostToTenant(normalizedHost);
  if (!resolvedHostTenant) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: resolvedHostTenant.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      isWhiteLabel: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: tenant.type,
    isWhiteLabel: tenant.isWhiteLabel,
  };
}

async function findActiveTenantsByEmail(emailNormalized: string): Promise<PublicTenantRecord[]> {
  const memberships = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL ROLE texqtic_public_lookup`;

    return tx.membership.findMany({
      where: {
        user: { email: emailNormalized },
        tenant: { status: 'ACTIVE' },
      },
      select: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            isWhiteLabel: true,
          },
        },
      },
    });
  });

  const uniqueTenants = new Map<string, PublicTenantRecord>();

  for (const membership of memberships) {
    const tenant = membership.tenant;

    uniqueTenants.set(tenant.id, {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      type: tenant.type,
      isWhiteLabel: tenant.isWhiteLabel,
    });
  }

  return Array.from(uniqueTenants.values()).sort((left, right) => left.name.localeCompare(right.name));
}

const publicEntryQuerySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Tenant slug is required')
    .max(100, 'Tenant slug must be 100 characters or fewer')
    .regex(
      /^[a-z0-9-]+$/,
      'Tenant slug must contain only lowercase letters, digits, and hyphens'
    )
    .optional(),
  email: z
    .string()
    .trim()
    .email('A valid email address is required')
    .max(255, 'Email must be 255 characters or fewer')
    .optional(),
}).superRefine((value, ctx) => {
  const providedInputs = [value.slug, value.email].filter(Boolean).length;

  if (providedInputs > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide at most one public entry resolution input per request.',
      path: ['slug'],
    });
  }
});

async function resolvePublicEntryDescriptor(
  request: FastifyRequest,
  input: { slug?: string; email?: string },
): Promise<PublicEntryResolutionDescriptor> {
  const normalizedHost = resolveNormalizedHost(request);
  const hostTenant = normalizedHost && !isNeutralPlatformHost(normalizedHost)
    ? await findResolvedHostTenant(normalizedHost)
    : null;
  const publicEntryKind = resolvePublicEntryKind(normalizedHost, !!hostTenant);

  if (input.slug) {
    const tenant = await findActiveTenantBySlug(input.slug);

    if (!tenant) {
      return buildRejectedDescriptor({
        publicEntryKind,
        normalizedHost,
        resolutionSourceType: 'SLUG_PATH',
      });
    }

    return buildResolvedDescriptor({
      publicEntryKind,
      normalizedHost,
      resolutionSourceType: 'SLUG_PATH',
      tenant,
    });
  }

  if (input.email) {
    const tenants = await findActiveTenantsByEmail(input.email.trim().toLowerCase());

    if (tenants.length === 0) {
      return buildRejectedDescriptor({
        publicEntryKind,
        normalizedHost,
        resolutionSourceType: 'EMAIL_MEMBERSHIP_DISCOVERY',
      });
    }

    if (tenants.length === 1) {
      return buildResolvedDescriptor({
        publicEntryKind,
        normalizedHost,
        resolutionSourceType: 'EMAIL_MEMBERSHIP_DISCOVERY',
        tenant: tenants[0],
      });
    }

    return buildCandidateDescriptor({
      publicEntryKind,
      normalizedHost,
      resolutionSourceType: 'EMAIL_MEMBERSHIP_DISCOVERY',
      candidateTenantContexts: tenants.map(toPublicTenantContext),
    });
  }

  if (hostTenant) {
    return buildResolvedDescriptor({
      publicEntryKind,
      normalizedHost,
      resolutionSourceType: 'HOST_DOMAIN',
      tenant: hostTenant,
    });
  }

  if (normalizedHost && isNeutralPlatformHost(normalizedHost)) {
    return buildNeutralDescriptor({
      publicEntryKind: 'PLATFORM',
      normalizedHost,
      resolutionSourceType: 'NEUTRAL_ENTRY',
    });
  }

  return buildRejectedDescriptor({
    publicEntryKind,
    normalizedHost,
    resolutionSourceType: normalizedHost ? 'HOST_DOMAIN' : 'NEUTRAL_ENTRY',
  });
}

const publicRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/entry/resolve', async (request, reply) => {
    const parseResult = publicEntryQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const descriptor = await resolvePublicEntryDescriptor(request, parseResult.data);

    return sendSuccess(reply, descriptor);
  });

  /**
   * GET /api/public/tenants/resolve?slug=<slug>
   *
   * Resolves a tenant slug to canonical identity required by tenant login flow.
   *
   * Response: { success: true, data: { tenantId, slug, name } }
   * Errors:
   *   400 VALIDATION_ERROR   — malformed slug parameter
   *   404 TENANT_NOT_FOUND   — no tenant matching the slug
   *
   * Public endpoint — no authentication required.
   * Returns only non-sensitive public-safe tenant fields.
   * Used by AuthFlows.tsx to replace the seeded tenant picker (TECS-FBW-AUTH-001).
   */
  fastify.get('/tenants/resolve', async (request, reply) => {
    const parseResult = publicEntryQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const descriptor = await resolvePublicEntryDescriptor(request, {
      slug: parseResult.data.slug,
    });

    if (
      descriptor.resolutionDisposition !== 'RESOLVED' ||
      !descriptor.resolvedTenantContext
    ) {
      return sendError(
        reply,
        'TENANT_NOT_FOUND',
        `No active tenant found for slug '${parseResult.data.slug ?? ''}'. Check the slug and try again.`,
        404
      );
    }

    return sendSuccess(reply, {
      tenantId: descriptor.resolvedTenantContext.tenantId,
      slug: descriptor.resolvedTenantContext.slug,
      name: descriptor.resolvedTenantContext.name,
    });
  });

  /**
   * GET /api/public/tenants/by-email?email=<email>
   *
   * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14)
   *
   * Returns all ACTIVE tenant memberships that exist for the given email address.
   * Used by the tenant login flow to present a server-driven tenant selection
   * instead of requiring the user to manually enter an organisation slug.
   *
   * Response: { success: true, data: { tenants: Array<{ tenantId, slug, name }> } }
   *   tenants is [] when no memberships exist — frontend handles this as "no account found".
   *
   * Public endpoint — no authentication required.
   * Returns only non-sensitive public-safe fields.
   * Email is normalised to lowercase before lookup.
   *
   * Security note: this endpoint reveals which tenant(s) an email is associated with
   * before authentication. This is comparable to the prior slug-lookup flow and is
   * an accepted B2B SaaS pattern. No passwords, roles, or internal IDs beyond
   * tenantId are returned.
   */
  fastify.get('/tenants/by-email', async (request, reply) => {
    const parseResult = publicEntryQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const descriptor = await resolvePublicEntryDescriptor(request, {
      email: parseResult.data.email,
    });

    let tenants = descriptor.candidateTenantContexts ?? [];

    if (descriptor.resolutionDisposition === 'RESOLVED') {
      tenants = descriptor.resolvedTenantContext ? [descriptor.resolvedTenantContext] : [];
    }

    return sendSuccess(reply, { tenants });
  });

  // ── GET /api/public/b2b/suppliers ─────────────────────────────────────────────
  //
  // B2B public supplier discovery endpoint.
  // No auth required. Applies five projection safety gates in PublicB2BProjectionService.
  // Empty result = 200 { items: [], total: 0, page: 1, limit: 20 } — NOT 404.
  //
  // Design authority: governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md §D
  // Slice: PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE

  const b2bSuppliersQuerySchema = z.object({
    segment: z.string().min(1).max(100).optional(),
    geo: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });

  fastify.get('/b2b/suppliers', async (request, reply) => {
    const parseResult = b2bSuppliersQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { segment, geo, page, limit } = parseResult.data;
    const result = await listPublicB2BSuppliers({ segment, geo, page, limit }, prisma);
    return sendSuccess(reply, result);
  });

  // ── GET /api/public/b2c/products ──────────────────────────────────────────────
  //
  // B2C public storefront browse endpoint.
  // No auth required. Applies five projection safety gates in PublicB2CProjectionService.
  // Empty result = 200 { items: [], total: 0, page: 1, limit: 20 } — NOT 404.
  //
  // Design authority: governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md §3
  // Slice: PUBLIC_B2C_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE

  const b2cProductsQuerySchema = z.object({
    geo: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });

  fastify.get('/b2c/products', async (request, reply) => {
    const parseResult = b2cProductsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { geo, page, limit } = parseResult.data;
    const result = await listPublicB2CProducts({ geo, page, limit }, prisma);
    return sendSuccess(reply, result);
  });

  const b2cProductDetailParamsSchema = z.object({
    slug: z.string().min(1).max(180).regex(/^[a-z0-9-]+(?:--[a-z0-9-]+)?$/),
  });

  fastify.get('/b2c/products/:slug', async (request, reply) => {
    const parseResult = b2cProductDetailParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return sendError(reply, 'INVALID_SLUG', 'Invalid product slug', 400);
    }

    const result = await getPublicB2CProductBySlug(parseResult.data.slug, prisma);
    if (!result) {
      return sendError(reply, 'NOT_FOUND', 'Product not found', 404);
    }

    return sendSuccess(reply, result);
  });

  // ── GET /api/public/supplier/:slug ─────────────────────────────────────────────
  //
  // Public B2B supplier profile by slug.
  // No auth required. Applies five projection safety gates (A–E).
  // Any gate failure → safe 404 (no gate-detail leak, no 403).
  // After 200: emits supplier_profile.viewed.v1 (best-effort, non-blocking).
  //
  // Design authority: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001
  // Event governance: shared/contracts/event-names.md §Acquisition Domain Events (EVENTS-003)
  //
  // QR-SOURCE-002: Optional ?source= query param for QR/referral/event attribution.
  // Allowed input values: qr | referral | event | direct (else normalised to 'organic').
  // Raw param value is NEVER stored or returned in HTTP response — only safe normalised
  // enum value is included in supplier_profile.viewed.v1 event payload.

  const supplierSlugParamsSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  });

  const supplierSourceQuerySchema = z.object({
    source: z.string().optional(),
  });

  // QR-SOURCE-002: Normalise raw ?source= to a bounded allowlist.
  // Unknown / absent / non-string values → 'organic'.
  // Exported for unit-testability.
  const ALLOWED_SOURCE_CHANNELS = ['organic', 'qr', 'referral', 'event', 'direct'] as const;

  function normalizeSourceChannel(raw: unknown): typeof ALLOWED_SOURCE_CHANNELS[number] {
    if (typeof raw === 'string' && (ALLOWED_SOURCE_CHANNELS as readonly string[]).includes(raw)) {
      return raw as typeof ALLOWED_SOURCE_CHANNELS[number];
    }
    return 'organic';
  }

  fastify.get('/supplier/:slug', async (request, reply) => {
    const parseResult = supplierSlugParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return sendError(reply, 'INVALID_SLUG', 'Invalid supplier slug', 400);
    }

    const { slug } = parseResult.data;

    // QR-SOURCE-002: parse and normalise the optional source attribution param.
    const queryResult = supplierSourceQuerySchema.safeParse(request.query);
    const sourceChannel = normalizeSourceChannel(
      queryResult.success ? queryResult.data.source : undefined,
    );

    const result = await getPublicB2BSupplierBySlug(slug, prisma);

    if (!result) {
      return sendError(reply, 'NOT_FOUND', 'Supplier not found', 404);
    }

    // Emit supplier_profile.viewed.v1 (best-effort, fire-and-forget).
    // writeAuditLog → maybeEmitEventFromAuditEntry → 'supplier_profile.viewed.v1'
    // Event payload: { slug, source_channel, timestamp } — org UUID NOT in payload.
    void prisma.$transaction(async (tx) => {
      await writeAuditLog(tx, {
        realm: 'TENANT',
        tenantId: result.orgId,
        actorType: 'SYSTEM',
        actorId: null,
        action: 'public.supplier.profile.viewed',
        entity: 'organization',
        entityId: result.orgId,
        afterJson: {
          slug,
          source_channel: sourceChannel,
          timestamp: new Date().toISOString(),
        },
      });
    }).catch((err: unknown) => {
      fastify.log.warn({ err, slug }, '[supplier-profile] Event emission failed (non-blocking)');
    });

    return sendSuccess(reply, result.profile);
  });

  // ─── TECS-DPP-PUBLIC-QR-001 D-6: Public Published DPP Access ────────────────
  // GET /api/public/dpp/:publicPassportId  — JSON view of a PUBLISHED DPP
  //                                         (canonical machine-readable JSON surface)
  //
  // NOTE: GET /api/public/dpp/:publicPassportId.json was added in commit 5ba6db9 and
  //       removed by hotfix 59f2dcd. The backslash-escaped route string caused a
  //       find-my-way SyntaxError at Fastify init, crashing ALL routes. The .json
  //       suffix route is intentionally not restored. This base route returns
  //       application/json via Fastify defaults. See GOVERNANCE-CHANGELOG.md 2026-04-28.
  //
  // Access model:
  //   Phase 1: texqtic_public_lookup role — lookup dpp_passport_states by public_token
  //            where status = 'PUBLISHED'. Returns org_id + node_id.
  //            Safe 404 for any non-PUBLISHED or missing token.
  //   Phase 2: withDbContext({ orgId }) — query DPP snapshot views scoped to the
  //            passport owner's tenant. SECURITY INVOKER views; app.org_id enforces RLS.
  //
  // Public identifier: public_token UUID (Option B). No nodeId or orgId in response.
  // QR: payload URL descriptor only. No image generation (no qrcode package in repo).
  // Rate limiting: @fastify/rate-limit@^10.x; global: false; DPP route: max 100/15 min per IP.
  // No JSON-LD. No passportStatus mutation. No auth required.
  // ─────────────────────────────────────────────────────────────────────────────

  // --- D-6 local types ---
  interface D6PassportStateRow {
    id: string;
    org_id: string;
    node_id: string;
    status: string;
    public_token: string | null;
  }
  type D6MaturityLevel = 'LOCAL_TRUST' | 'TRADE_READY' | 'COMPLIANCE' | 'GLOBAL_DPP';
  interface D6ProductRow {
    node_id: string;
    org_id: string;
    batch_id: string | null;
    node_type: string | null;
    manufacturer_name: string | null;
    manufacturer_jurisdiction: string | null;
  }
  interface D6LineageRow {
    root_node_id: string;
    node_id: string;
    depth: number;
  }
  interface D6CertRow {
    certification_type: string | null;
    lifecycle_state_name: string | null;
    issued_at: Date | null;
    expiry_date: Date | null;
  }

  // Pure maturity computation — mirrors computeDppMaturity in tenant.ts (Slice D four-tier rules).
  function computeDppMaturityPublic(input: {
    approvedCertCount: number;
    lineageDepth: number;
    passportStatus?: string;
    hasPublicToken?: boolean;
    activeCertsWithValidExpiry?: number;
  }): D6MaturityLevel {
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

  const dppPublicParamSchema = z.object({
    publicPassportId: z.string().uuid('publicPassportId must be a valid UUID'),
  });

  const APP_PUBLIC_URL = (process.env['APP_PUBLIC_URL'] ?? 'https://app.texqtic.com') as string;

  // ── D-6 shared payload data type ──────────────────────────────────────────────
  interface D6PublicDppData {
    publicPassportId: string;
    passportStatus: 'PUBLISHED';
    passportMaturity: D6MaturityLevel;
    product: {
      batchId: string | null;
      nodeType: string | null;
      manufacturerName: string | null;
      manufacturerJurisdiction: string | null;
    };
    lineageSummary: { lineageDepth: number; nodeCount: number };
    certifications: Array<{
      certificationType: string | null;
      lifecycleStateName: string | null;
      expiryDate: string | null;
      issuedAt: string | null;
    }>;
    evidenceSummary: { approvedCertCount: number };
    labelConfig: {
      publicTitle: string | null;
      buyerFacingLabel: string;
      subtitle: string | null;
      showTexqticBrand: boolean;
    };
  }
  type D6FetchResult =
    | { kind: 'OK'; data: D6PublicDppData }
    | { kind: 'NOT_FOUND' }
    | { kind: 'ERROR'; phase: 1 | 2 };

  // Shared two-phase DPP data lookup. Does NOT touch reply headers or send response.
  async function fetchPublicDppData(
    publicPassportId: string,
    routeType: string,
  ): Promise<D6FetchResult> {
    // ── Phase 1: public_token lookup as texqtic_public_lookup ──────────────────
    let stateRows: D6PassportStateRow[];
    try {
      stateRows = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL ROLE texqtic_public_lookup`;
        return tx.$queryRaw<D6PassportStateRow[]>`
          SELECT id, org_id, node_id, status, public_token
          FROM dpp_passport_states
          WHERE public_token = ${publicPassportId}::uuid
            AND status = 'PUBLISHED'
          LIMIT 1
        `;
      });
    } catch (err) {
      fastify.log.error({ err }, '[D6] Phase 1 passport state lookup failed');
      return { kind: 'ERROR', phase: 1 };
    }

    if (stateRows.length === 0) {
      return { kind: 'NOT_FOUND' };
    }

    const stateRow = stateRows[0];
    const orgId = stateRow.org_id;
    const nodeId = stateRow.node_id;

    // ── Phase 1.5: label config lookup (texqtic_public_lookup — SELECT granted) ──
    interface D6LabelConfigRow {
      public_title: string | null;
      buyer_facing_label: string;
      subtitle: string | null;
      show_texqtic_brand: boolean;
    }
    let labelConfigRows: D6LabelConfigRow[] = [];
    try {
      labelConfigRows = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL ROLE texqtic_public_lookup`;
        return tx.$queryRaw<D6LabelConfigRow[]>`
          SELECT public_title, buyer_facing_label, subtitle, show_texqtic_brand
          FROM dpp_passport_label_config
          WHERE org_id = ${orgId}::uuid
          LIMIT 1
        `;
      });
    } catch {
      // Non-fatal: fall back to defaults below
      labelConfigRows = [];
    }
    const labelConfig = labelConfigRows[0]
      ? {
          publicTitle: labelConfigRows[0].public_title,
          buyerFacingLabel: labelConfigRows[0].buyer_facing_label,
          subtitle: labelConfigRows[0].subtitle,
          showTexqticBrand: labelConfigRows[0].show_texqtic_brand,
        }
      : {
          publicTitle: null,
          buyerFacingLabel: 'Verified Supply Chain Passport',
          subtitle: null,
          showTexqticBrand: true,
        };

    // ── Phase 2: tenant-scoped DPP snapshot queries ─────────────────────────────
    let productRows: D6ProductRow[];
    let lineageRows: D6LineageRow[];
    let certRows: D6CertRow[];

    try {
      [productRows, lineageRows, certRows] = await withDbContext(
        prisma,
        {
          orgId,
          actorId: 'SYSTEM_PUBLIC_DPP', // sentinel — unauthenticated public read
          realm: 'tenant',
          requestId: randomUUID(),
        },
        async tx => {
          const products = await tx.$queryRaw<D6ProductRow[]>`
            SELECT node_id, org_id, batch_id, node_type,
                   manufacturer_name, manufacturer_jurisdiction
            FROM dpp_snapshot_products_v1
            WHERE node_id = ${nodeId}::uuid
          `;

          const lineage = await tx.$queryRaw<D6LineageRow[]>`
            SELECT root_node_id, node_id, depth
            FROM dpp_snapshot_lineage_v1
            WHERE root_node_id = ${nodeId}::uuid
          `;

          const certs = await tx.$queryRaw<D6CertRow[]>`
            SELECT certification_type, lifecycle_state_name, issued_at, expiry_date
            FROM dpp_snapshot_certifications_v1
            WHERE node_id = ${nodeId}::uuid
               OR (node_id IS NULL AND org_id = (
                 SELECT org_id FROM dpp_snapshot_products_v1
                 WHERE node_id = ${nodeId}::uuid LIMIT 1
               ))
          `;

          // Best-effort audit — writeAuditLog catches errors non-fatally
          await writeAuditLog(tx, {
            tenantId: orgId,
            realm: 'TENANT',
            actorType: 'SYSTEM',
            actorId: null,
            action: 'public.dpp.read',
            entity: 'traceability_node',
            entityId: nodeId,
            metadataJson: {
              publicPassportId,
              passportStatus: 'PUBLISHED',
              routeType,
            },
          });

          return [products, lineage, certs] as [D6ProductRow[], D6LineageRow[], D6CertRow[]];
        },
      );
    } catch (err) {
      fastify.log.error({ err }, '[D6] Phase 2 DPP snapshot query failed');
      return { kind: 'ERROR', phase: 2 };
    }

    if (productRows.length === 0) {
      // Product row missing — RLS or data issue; safe 404
      return { kind: 'NOT_FOUND' };
    }

    const product = productRows[0];

    // ── Compute passport maturity ──────────────────────────────────────────────
    const approvedCertCount = certRows.filter(c => c.lifecycle_state_name === 'APPROVED').length;
    const lineageDepth = lineageRows.length > 0 ? Math.max(...lineageRows.map(r => r.depth)) : 0;
    const todayPublic = new Date();
    todayPublic.setHours(0, 0, 0, 0);
    const activeCertsWithValidExpiry = certRows.filter(
      c =>
        c.lifecycle_state_name === 'APPROVED' &&
        c.expiry_date !== null &&
        c.expiry_date >= todayPublic,
    ).length;
    const passportMaturity = computeDppMaturityPublic({
      approvedCertCount,
      lineageDepth,
      passportStatus: stateRow.status,
      hasPublicToken: stateRow.public_token !== null,
      activeCertsWithValidExpiry,
    });

    return {
      kind: 'OK',
      data: {
        publicPassportId,
        passportStatus: 'PUBLISHED' as const,
        passportMaturity,
        product: {
          batchId: product.batch_id,
          nodeType: product.node_type,
          manufacturerName: product.manufacturer_name,
          manufacturerJurisdiction: product.manufacturer_jurisdiction,
        },
        lineageSummary: {
          lineageDepth,
          nodeCount: lineageRows.length,
        },
        certifications: certRows.map(row => ({
          certificationType: row.certification_type,
          lifecycleStateName: row.lifecycle_state_name,
          expiryDate: row.expiry_date ? row.expiry_date.toISOString() : null,
          issuedAt: row.issued_at ? row.issued_at.toISOString() : null,
        })),
        evidenceSummary: {
          approvedCertCount,
        },
        labelConfig,
      },
    };
  }

  // Sends the public DPP JSON response. Calls fetchPublicDppData and maps to
  // application/json. jsonRoute is reserved for future format negotiation.
  async function handlePublicDppRead(
    publicPassportId: string,
    _request: FastifyRequest,
    reply: FastifyReply,
    jsonRoute: boolean,
  ): Promise<unknown> {
    // Security headers — set for all response paths on this public API endpoint
    void reply.header('X-Robots-Tag', 'noindex');

    const result = await fetchPublicDppData(
      publicPassportId,
      jsonRoute ? 'json' : 'html',
    );

    if (result.kind === 'ERROR') {
      void reply.header('Cache-Control', 'no-store');
      const msg =
        result.phase === 1
          ? 'Failed to resolve DPP passport'
          : 'Failed to load DPP passport data';
      return sendError(reply, 'INTERNAL_ERROR', msg, 500);
    }

    if (result.kind === 'NOT_FOUND') {
      // Safe 404 — do not distinguish "not found" from "not PUBLISHED"
      void reply.header('Cache-Control', 'no-store');
      return sendError(reply, 'DPP_NOT_FOUND', 'DPP passport not found', 404);
    }

    // ── Shape restricted DppPublicPassportView ─────────────────────────────────
    // EXCLUDED: orgId, nodeId (raw), meta, geoHash, visibility,
    //           manufacturerRegistrationNo, certificationId, lifecycleStateId,
    //           extractionId, claim_value, approved_by, approved_at,
    //           AI confidence scores, storage URLs, admin notes.
    const { data } = result;
    const payload = {
      publicPassportId: data.publicPassportId,
      passportStatus: 'PUBLISHED' as const, // guaranteed by fetchPublicDppData result shape
      passportMaturity: data.passportMaturity,
      product: {
        nodeType: data.product.nodeType,
        batchId: data.product.batchId,
        manufacturerName: data.product.manufacturerName,
        manufacturerJurisdiction: data.product.manufacturerJurisdiction,
      },
      lineageSummary: data.lineageSummary,
      certifications: data.certifications,
      evidenceSummary: data.evidenceSummary,
      qr: {
        payloadUrl: `${APP_PUBLIC_URL}/passport/${publicPassportId}`,
        format: 'url' as const,
      },
      exportedAt: new Date().toISOString(),
      labelConfig: data.labelConfig,
    };

    if (jsonRoute) {
      void reply.header('Content-Type', 'application/json');
    }

    // Cache headers for successful PUBLISHED response
    void reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    void reply.header('Vary', 'Accept');

    return sendSuccess(reply, payload);
  }

  // GET /api/public/dpp/:publicPassportId — rate-limited (max 100 req/15 min per IP)
  await fastify.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (_req, context) => ({
      error: 'rate_limited',
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  fastify.get('/dpp/:publicPassportId', {
    config: {
      rateLimit: { max: 100, timeWindow: '15 minutes' },
    },
  }, async (request, reply) => {
    const paramsResult = dppPublicParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      void reply.header('X-Robots-Tag', 'noindex');
      void reply.header('Cache-Control', 'no-store');
      return sendValidationError(reply, paramsResult.error.errors);
    }
    return handlePublicDppRead(paramsResult.data.publicPassportId, request, reply, false);
  });

  // ─── TECS-DPP-STRUCTURED-DATA-018: JSON-LD Machine-Readable Public DPP ───────
  // GET /api/public/dpp/:publicPassportId/structured-data
  //
  // Returns a privacy-filtered JSON-LD view of a PUBLISHED DPP passport.
  // Uses the TexQtic-native DPP v1 schema context with partial schema.org mapping.
  //
  // Design constraints:
  //   - Same two-phase auth model as D-6 base route (texqtic_public_lookup + withDbContext)
  //   - Only PUBLIC_SUMMARY visibility fields: no orgId, nodeId, public_token, sourceId,
  //     documentUrl, claimValue, extractionId, confidence, approvedBy, pricing, or any
  //     internal IDs or storage URLs
  //   - Content-Type: application/ld+json; charset=utf-8
  //   - Cache: public, max-age=300, stale-while-revalidate=60 (same as base route)
  //   - 404 is generic; must not reveal whether a token exists but is unpublished
  //   - Rate-limited via the same fastifyRateLimit instance (max 100/15 min per IP)
  //   - No .json suffix in route path (D-6 hotfix: find-my-way SyntaxError constraint)
  //
  fastify.get('/dpp/:publicPassportId/structured-data', {
    config: {
      rateLimit: { max: 100, timeWindow: '15 minutes' },
    },
  }, async (request, reply) => {
    const paramsResult = dppPublicParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      void reply.header('X-Robots-Tag', 'noindex');
      void reply.header('Cache-Control', 'no-store');
      return sendValidationError(reply, paramsResult.error.errors);
    }

    const { publicPassportId } = paramsResult.data;
    void reply.header('X-Robots-Tag', 'noindex');

    const result = await fetchPublicDppData(publicPassportId, 'structured-data');

    if (result.kind !== 'OK') {
      // Safe response — do not distinguish ERROR from NOT_FOUND for public callers
      void reply.header('Cache-Control', 'no-store');
      return sendError(reply, 'DPP_NOT_FOUND', 'DPP passport not found', 404);
    }

    const { data } = result;

    // ── Build JSON-LD payload ────────────────────────────────────────────────
    // Privacy guarantee: only PUBLIC_SUMMARY fields; no internal IDs, no storage URLs,
    // no buyer data, no pricing, no audit metadata.
    const MATURITY_LABEL: Record<string, string> = {
      LOCAL_TRUST: 'Bronze — Verified Local',
      TRADE_READY: 'Silver — Trade Ready',
      COMPLIANCE:  'Gold — Certified',
      GLOBAL_DPP:  'Platinum — Export Ready',
    };
    const structuredData = {
      '@context': {
        '@vocab': 'https://texqtic.com/dpp/v1#',
        'schema': 'https://schema.org/',
        'ProductPassport': 'https://texqtic.com/dpp/v1#ProductPassport',
        'Certification': 'https://texqtic.com/dpp/v1#Certification',
      },
      '@type': 'ProductPassport',
      '@id': `${APP_PUBLIC_URL}/passport/${publicPassportId}`,
      'passportUrl': `${APP_PUBLIC_URL}/passport/${publicPassportId}`,
      'publicPassportId': publicPassportId,
      'passportStatus': data.passportStatus,
      'passportMaturity': data.passportMaturity,
      'passportMaturityLabel': MATURITY_LABEL[data.passportMaturity] ?? data.passportMaturity,
      'product': {
        '@type': 'schema:Product',
        'name': data.product.batchId ?? null,
        'category': data.product.nodeType ?? null,
        'manufacturerName': data.product.manufacturerName ?? null,
        'manufacturerJurisdiction': data.product.manufacturerJurisdiction ?? null,
      },
      'certifications': data.certifications.map(cert => ({
        '@type': 'Certification',
        'certificationType': cert.certificationType ?? null,
        'lifecycleStateName': cert.lifecycleStateName ?? null,
        'issuedAt': cert.issuedAt ?? null,
        'expiryDate': cert.expiryDate ?? null,
      })),
      'lineageSummary': data.lineageSummary,
      'evidenceSummary': data.evidenceSummary,
      'generatedAt': new Date().toISOString(),
    };

    void reply.header('Content-Type', 'application/ld+json; charset=utf-8');
    void reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    void reply.header('Vary', 'Accept');

    return reply.send(structuredData);
  });

  // ─── INQUIRY-004: Pre-auth buyer inquiry intake (Phase 2) ───────────────────
  // POST /api/public/inquiry/submit
  //
  // Phase 2 extends Phase 1 to support multi-context inquiry:
  //   • General mode: supplier_slug is now OPTIONAL
  //   • New context fields: source_surface, product_slug, category_slug, collection_slug, message
  //   • Context exclusivity: supplier_slug cannot coexist with product/category/collection context
  //   • message: PII-blocked (email/phone), HTML stripped, max 500 chars after sanitization
  //   • category_slug / collection_slug: fail-closed approval gate; unapproved slugs silently dropped
  //   • source_surface: unknown values normalized to 'DIRECT'
  //   • Phase 1 payloads (supplier_slug required) remain fully backward-compatible
  //
  // No DB schema change: afterJson JSONB absorbs new context fields.
  // Rate limit: max 20 req/15 min per IP (unchanged).
  //
  // Design authority: PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001
  // Implementation:   PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001
  // Event governance: shared/contracts/event-names.md §buyer_inquiry.created.v1
  // ─────────────────────────────────────────────────────────────────────────────

  // Module-level: approved source surface values for normalization
  const KNOWN_SOURCE_SURFACES = new Set<string>([
    'GENERAL_PUBLIC',
    'SUPPLIER_PROFILE',
    'PRODUCT_DETAIL',
    'PRODUCT_BROWSE',
    'CATEGORY_STORY',
    'COLLECTION_DETAIL',
    'COLLECTION_LIST',
    'TRUST_LANDING',
    'INDUSTRY_LANDING',
    'NAVBAR',
    'DIRECT',
    'UNKNOWN',
  ]);

  // Message sanitization patterns
  const INQUIRY_HTML_TAG_PATTERN = /<[^>]*>/g;
  const INQUIRY_EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const INQUIRY_PHONE_PATTERN = /(?:\+?\d{1,3}[.\-]?)?\(?\d{3}\)?[.\-]\d{3}[.\-]\d{4}|\b\d{10,11}\b/;
  const INQUIRY_URL_PATTERN = /https?:\/\/[^\s]+/g;

  const inquirySubmitBodySchema = z.object({
    inquiry_category: z.enum([
      'GENERAL',
      'CAPABILITY_FIT',
      'OFFERING_PREVIEW',
      'SOURCING_INTENT',
      'QUALIFICATION_CHECK',
    ]),
    supplier_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    source_surface: z.string().max(64).optional(),
    product_slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
    category_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    collection_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    geo_band: z.string().min(1).max(100).optional(),
    volume_band: z.string().min(1).max(100).optional(),
    message: z.string().max(2000).optional(),
  });

  fastify.post('/inquiry/submit', {
    config: {
      rateLimit: { max: 20, timeWindow: '15 minutes' },
    },
  }, async (request, reply) => {
    const parseResult = inquirySubmitBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const {
      inquiry_category,
      supplier_slug,
      source_surface: rawSurface,
      product_slug,
      category_slug,
      collection_slug,
      geo_band,
      volume_band,
      message: rawMessage,
    } = parseResult.data;

    // Context exclusivity: supplier_slug cannot coexist with product/category/collection context
    if (
      supplier_slug !== undefined &&
      (product_slug !== undefined || category_slug !== undefined || collection_slug !== undefined)
    ) {
      return sendValidationError(reply, [{ message: 'Invalid request: conflicting context fields' }]);
    }

    // Message sanitization: PII check on raw input, then strip HTML and URLs
    let inquiry_message: string | undefined;
    if (rawMessage !== undefined) {
      if (INQUIRY_EMAIL_PATTERN.test(rawMessage)) {
        return sendValidationError(reply, [{ message: 'Invalid message content' }]);
      }
      if (INQUIRY_PHONE_PATTERN.test(rawMessage)) {
        return sendValidationError(reply, [{ message: 'Invalid message content' }]);
      }
      const sanitized = rawMessage.replace(INQUIRY_HTML_TAG_PATTERN, '').replace(INQUIRY_URL_PATTERN, '').trim();
      if (sanitized.length === 0) {
        inquiry_message = undefined;
      } else if (sanitized.length > 500) {
        return sendValidationError(reply, [{ message: 'Message too long' }]);
      } else {
        inquiry_message = sanitized;
      }
    }

    // Normalize source_surface; unknown values → 'DIRECT'
    const source_surface = (rawSurface !== undefined && KNOWN_SOURCE_SURFACES.has(rawSurface))
      ? rawSurface
      : 'DIRECT';

    // Category / collection approval gate — fail-closed: unapproved slugs silently dropped
    const approvedCategorySlug = (category_slug !== undefined && APPROVED_CATEGORY_SLUGS.has(category_slug))
      ? category_slug
      : undefined;
    const approvedCollectionSlug = (collection_slug !== undefined && APPROVED_COLLECTION_SLUGS.has(collection_slug))
      ? collection_slug
      : undefined;

    if (supplier_slug !== undefined) {
      // ── Supplier context path (Phase 1 behavior preserved) ─────────────────
      // Visibility gate: supplier must pass all five projection gates.
      const supplierResult = await getPublicB2BSupplierBySlug(supplier_slug, prisma);
      if (!supplierResult) {
        return sendError(reply, 'NOT_FOUND', 'Supplier not found', 404);
      }

      // Emit buyer_inquiry.created.v1 (best-effort, fire-and-forget).
      // Payload: supplier_slug, inquiry_category, source_surface, context fields, timestamp.
      // NO raw email, phone, buyer name, org UUID, external_orchestration_ref.
      void prisma.$transaction(async (tx) => {
        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: supplierResult.orgId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.created',
          entity: 'organization',
          entityId: supplierResult.orgId,
          afterJson: {
            supplier_slug,
            inquiry_category,
            source_surface,
            ...(product_slug !== undefined ? { product_slug } : {}),
            ...(approvedCategorySlug !== undefined ? { category_slug: approvedCategorySlug } : {}),
            ...(approvedCollectionSlug !== undefined ? { collection_slug: approvedCollectionSlug } : {}),
            ...(geo_band !== undefined ? { geo_band } : {}),
            ...(volume_band !== undefined ? { volume_band } : {}),
            ...(inquiry_message !== undefined ? { inquiry_message } : {}),
            timestamp: new Date().toISOString(),
          },
        });
      }).catch((err: unknown) => {
        fastify.log.warn({ err, supplier_slug }, '[buyer-inquiry] Event emission failed (non-blocking)');
      });
    } else {
      // ── General inquiry path (no supplier gate) ─────────────────────────────
      // realm: ADMIN, tenantId: null, entityId: null — audit trail preserved.
      // Uses a distinct action ('public.buyer.inquiry.general.created') NOT registered in
      // AUDIT_ACTION_TO_EVENT_NAME, so maybeEmitEventFromAuditEntry returns early silently.
      // buyer_inquiry.created.v1 event emission for general inquiries is deferred to
      // PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001 (requires entity UUID strategy).
      void prisma.$transaction(async (tx) => {
        await writeAuditLog(tx, {
          realm: 'ADMIN',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.general.created',
          entity: 'platform_inquiry',
          entityId: null,
          afterJson: {
            inquiry_category,
            source_surface,
            ...(product_slug !== undefined ? { product_slug } : {}),
            ...(approvedCategorySlug !== undefined ? { category_slug: approvedCategorySlug } : {}),
            ...(approvedCollectionSlug !== undefined ? { collection_slug: approvedCollectionSlug } : {}),
            ...(geo_band !== undefined ? { geo_band } : {}),
            ...(volume_band !== undefined ? { volume_band } : {}),
            ...(inquiry_message !== undefined ? { inquiry_message } : {}),
            timestamp: new Date().toISOString(),
          },
        });
      }).catch((err: unknown) => {
        fastify.log.warn({ err }, '[buyer-inquiry] General inquiry event emission failed (non-blocking)');
      });
    }

    return reply.status(202).send({
      success: true,
      data: {
        acknowledged: true,
        message: 'Your inquiry has been received.',
      },
    });
  });

};

export default publicRoutes;
