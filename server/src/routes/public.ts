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
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { prisma } from '../db/prisma.js';
import { withDbContext } from '../lib/database-context.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { normalizeHost, parsePlatformHost } from '../lib/hostNormalize.js';
import { resolveHostToTenant } from './internal/resolveDomain.js';
import { listPublicB2BSuppliers } from '../services/publicB2BProjection.service.js';
import { listPublicB2CProducts } from '../services/publicB2CProjection.service.js';

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
  // Rate limiting: not available (no @fastify/rate-limit in repo). Non-blocking.
  // aiExtractedClaimsCount: 0 — dpp_evidence_claims RLS uses incorrect GUC key
  //   (current_setting('app.current_org_id') vs app.org_id set by withDbContext).
  //   Skipping evidence claims query for public view pending D-3/D-4 RLS migration fix.
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

  // Pure maturity computation — mirrors computeDppMaturity in tenant.ts (D-3 rules).
  function computeDppMaturityPublic(input: {
    approvedCertCount: number;
    lineageDepth: number;
  }): D6MaturityLevel {
    if (input.approvedCertCount >= 1 && input.lineageDepth >= 1) {
      return 'TRADE_READY';
    }
    return 'LOCAL_TRUST';
  }

  const dppPublicParamSchema = z.object({
    publicPassportId: z.string().uuid('publicPassportId must be a valid UUID'),
  });

  const APP_PUBLIC_URL = (process.env['APP_PUBLIC_URL'] ?? 'https://app.texqtic.com') as string;

  // Shared handler for both routes.
  async function handlePublicDppRead(
    publicPassportId: string,
    _request: FastifyRequest,
    reply: FastifyReply,
    jsonRoute: boolean,
  ): Promise<unknown> {
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
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to resolve DPP passport', 500);
    }

    if (stateRows.length === 0) {
      // Safe 404 — do not distinguish "not found" from "not PUBLISHED"
      return sendError(reply, 'DPP_NOT_FOUND', 'DPP passport not found', 404);
    }

    const stateRow = stateRows[0];
    const orgId = stateRow.org_id;
    const nodeId = stateRow.node_id;

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
              routeType: jsonRoute ? 'json' : 'html',
            },
          });

          return [products, lineage, certs] as [D6ProductRow[], D6LineageRow[], D6CertRow[]];
        },
      );
    } catch (err) {
      fastify.log.error({ err }, '[D6] Phase 2 DPP snapshot query failed');
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to load DPP passport data', 500);
    }

    if (productRows.length === 0) {
      // Product row missing — RLS or data issue; safe 404
      return sendError(reply, 'DPP_NOT_FOUND', 'DPP passport not found', 404);
    }

    const product = productRows[0];

    // ── Compute passport maturity ──────────────────────────────────────────────
    const approvedCertCount = certRows.filter(c => c.lifecycle_state_name === 'APPROVED').length;
    const lineageDepth = lineageRows.length > 0 ? Math.max(...lineageRows.map(r => r.depth)) : 0;
    const passportMaturity = computeDppMaturityPublic({ approvedCertCount, lineageDepth });

    // ── Shape restricted DppPublicPassportView ─────────────────────────────────
    // EXCLUDED: orgId, nodeId (raw), meta, geoHash, visibility,
    //           manufacturerRegistrationNo, certificationId, lifecycleStateId,
    //           extractionId, claim_value, approved_by, approved_at,
    //           AI confidence scores, storage URLs, admin notes.
    const payload = {
      publicPassportId,
      passportStatus: 'PUBLISHED' as const,
      passportMaturity,
      product: {
        nodeType: product.node_type,
        batchId: product.batch_id,
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
        // aiExtractedClaimsCount fixed at 0 — dpp_evidence_claims RLS uses incorrect
        // GUC key (current_setting('app.current_org_id') vs app.org_id). Skipping
        // evidence claims query pending D-3/D-4 RLS migration fix.
        aiExtractedClaimsCount: 0,
      },
      qr: {
        payloadUrl: `${APP_PUBLIC_URL}/dpp/${publicPassportId}`,
        format: 'url' as const,
      },
      exportedAt: new Date().toISOString(),
    };

    if (jsonRoute) {
      void reply.header('Content-Type', 'application/json');
    }

    return sendSuccess(reply, payload);
  }

  // GET /api/public/dpp/:publicPassportId
  fastify.get('/dpp/:publicPassportId', async (request, reply) => {
    const paramsResult = dppPublicParamSchema.safeParse(request.params);
    if (!paramsResult.success) return sendValidationError(reply, paramsResult.error.errors);
    return handlePublicDppRead(paramsResult.data.publicPassportId, request, reply, false);
  });

};

export default publicRoutes;
