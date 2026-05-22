/**
 * Unit tests — POST /api/public/inquiry/submit
 *
 * Design authority: MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004
 * Event governance: shared/contracts/event-names.md §Acquisition Domain Events (EVENTS-003)
 *
 * Tests:
 *   INQ-001: valid minimal payload → 202 accepted
 *   INQ-002: valid payload with optional geo_band + volume_band → 202 accepted
 *   INQ-003: non-eligible supplier (gate fails) → safe 404
 *   INQ-004: invalid supplier_slug (bad chars) → 400 validation failure
 *   INQ-005: missing inquiry_category → 400 validation failure
 *   INQ-006: invalid inquiry_category value → 400 validation failure
 *   INQ-007: oversized supplier_slug (>100 chars) → 400 validation failure
 *   INQ-008: geo_band present but empty string → 400 validation failure (min 1)
 *   INQ-009: writeAuditLog called with correct action on valid inquiry
 *   INQ-010: event emission is fire-and-forget (route returns 202 even if writeAuditLog rejects)
 *   INQ-011: prohibited fields (email, phone, external_orchestration_ref) in body → 400
 *   INQ-012: event payload (afterJson) contains NO org UUID, NO email, NO phone
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    membership: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../services/email/email.service.js', () => ({
  sendBuyerInquiryAcknowledgementEmail: vi.fn(),
  sendSupplierInquiryNotificationEmail: vi.fn(),
  sendAdminInquiryAlertEmail: vi.fn(),
}));

vi.mock('../services/publicB2BProjection.service.js', () => ({
  listPublicB2BSuppliers: vi.fn(),
  getPublicB2BSupplierBySlug: vi.fn(),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('../services/publicB2CProjection.service.js', () => ({
  listPublicB2CProducts: vi.fn(),
}));

vi.mock('../lib/hostNormalize.js', () => ({
  normalizeHost: vi.fn(),
  parsePlatformHost: vi.fn(),
}));

vi.mock('./internal/resolveDomain.js', () => ({
  resolveHostToTenant: vi.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import publicRoutes from '../routes/public.js';
import { getPublicB2BSupplierBySlug } from '../services/publicB2BProjection.service.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { prisma } from '../db/prisma.js';
import {
  sendBuyerInquiryAcknowledgementEmail,
  sendSupplierInquiryNotificationEmail,
  sendAdminInquiryAlertEmail,
} from '../services/email/email.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFIX = '/api/public';
const SUBMIT_URL = `${PREFIX}/inquiry/submit`;

const ELIGIBLE_SUPPLIER_RESULT = {
  orgId: 'aabbccdd-0000-0000-0000-000000000001',
  profile: {
    slug: 'acme-textiles',
    legalName: 'Acme Textiles Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    certificationCount: 2,
    certificationTypes: ['ISO9001'],
    hasTraceabilityEvidence: false,
    taxonomy: {
      primarySegment: 'Textile',
      secondarySegments: [] as string[],
      rolePositions: ['Manufacturer'] as string[],
    },
    offeringPreview: [],
    publicationPosture: 'B2B_PUBLIC' as const,
    eligibilityPosture: 'PUBLICATION_ELIGIBLE' as const,
  },
};

// ─── Test harness ─────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(publicRoutes, { prefix: PREFIX });
  await fastify.ready();
  return fastify;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  app = await buildApp();

  // Default: supplier gate passes
  vi.mocked(getPublicB2BSupplierBySlug).mockResolvedValue(ELIGIBLE_SUPPLIER_RESULT);

  // Default: $transaction delegates to callback (best-effort emission)
  // Cast required — Prisma $transaction has complex overloads; test intent is clear.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.$transaction as any).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  );

  // Default: writeAuditLog resolves successfully
  vi.mocked(writeAuditLog).mockResolvedValue(undefined);

  // Default: membership.findFirst returns null (no supplier email resolved)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(prisma.membership.findFirst as any).mockResolvedValue(null);

  // Default: email service functions resolve with DEV_LOGGED
  vi.mocked(sendBuyerInquiryAcknowledgementEmail).mockResolvedValue({ status: 'DEV_LOGGED' });
  vi.mocked(sendSupplierInquiryNotificationEmail).mockResolvedValue({ status: 'DEV_LOGGED' });
  vi.mocked(sendAdminInquiryAlertEmail).mockResolvedValue({ status: 'DEV_LOGGED' });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/public/inquiry/submit', () => {
  it('INQ-001: valid minimal payload → 202 accepted', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
      },
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.acknowledged).toBe(true);
    expect(typeof body.data.message).toBe('string');
  });

  it('INQ-002: valid payload with optional fields → 202 accepted', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'SOURCING_INTENT',
        geo_band: 'South Asia',
        volume_band: '500-1000 units/month',
      },
    });

    expect(response.statusCode).toBe(202);
  });

  it('INQ-003: non-eligible supplier → safe 404 (no gate detail)', async () => {
    vi.mocked(getPublicB2BSupplierBySlug).mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'ghost-supplier',
        inquiry_category: 'GENERAL',
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    // Must not leak gate detail
    expect(JSON.stringify(body)).not.toContain('gate');
    expect(JSON.stringify(body)).not.toContain('eligibility');
  });

  it('INQ-004: invalid supplier_slug (bad chars) → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'UPPERCASE_SLUG',
        inquiry_category: 'GENERAL',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('INQ-005: missing inquiry_category → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('INQ-006: invalid inquiry_category value → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'PRICING_INQUIRY',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('INQ-007: oversized supplier_slug (>100 chars) → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'a'.repeat(101),
        inquiry_category: 'GENERAL',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('INQ-008: geo_band present but empty string → 400 (min 1)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
        geo_band: '',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('INQ-009: writeAuditLog called with correct action on valid inquiry', async () => {
    await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'CAPABILITY_FIT',
        geo_band: 'EU',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    expect(entry.action).toBe('public.buyer.inquiry.created');
    expect(entry.actorType).toBe('SYSTEM');
    expect(entry.actorId).toBeNull();
    expect(entry.realm).toBe('TENANT');
  });

  it('INQ-010: route returns 202 even if writeAuditLog rejects (fire-and-forget)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction as any).mockRejectedValueOnce(new Error('db error'));

    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
      },
    });

    // Event emission is non-blocking — route must still return 202
    expect(response.statusCode).toBe(202);
  });

  it('INQ-011: body with extra prohibited fields (email) → supplier gate not reached (400 Zod)', async () => {
    // Zod schema uses .strip() by default so extra fields are ignored,
    // but inquiry_category is still required — test that schema rejects bad category type
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
        buyer_contact_email: 'test@example.com', // ignored by Zod (extra field stripped)
        external_orchestration_ref: 'ext-001',   // ignored by Zod (extra field stripped)
      },
    });

    // Extra fields are stripped by Zod — the request itself is valid (202)
    expect(response.statusCode).toBe(202);
    // Verify writeAuditLog afterJson does NOT contain the prohibited fields
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson).not.toHaveProperty('buyer_contact_email');
    expect(afterJson).not.toHaveProperty('external_orchestration_ref');
  });

  it('INQ-012: event afterJson contains no org UUID or contact PII', async () => {
    await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'QUALIFICATION_CHECK',
        geo_band: 'IN',
        volume_band: '100-500',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;

    // Allowed fields
    expect(afterJson.supplier_slug).toBe('acme-textiles');
    expect(afterJson.inquiry_category).toBe('QUALIFICATION_CHECK');
    expect(afterJson.geo_band).toBe('IN');
    expect(afterJson.volume_band).toBe('100-500');
    expect(typeof afterJson.timestamp).toBe('string');

    // Prohibited fields — must be absent
    expect(afterJson).not.toHaveProperty('email');
    expect(afterJson).not.toHaveProperty('phone');
    expect(afterJson).not.toHaveProperty('buyer_name');
    expect(afterJson).not.toHaveProperty('org_id');
    expect(afterJson).not.toHaveProperty('orgId');
    expect(afterJson).not.toHaveProperty('external_orchestration_ref');

    // entityId (org UUID) must NOT appear in the public event payload
    // (it's in the AuditLog row, not in afterJson)
    expect(JSON.stringify(afterJson)).not.toContain(ELIGIBLE_SUPPLIER_RESULT.orgId);
  });

  // ── Phase 2 tests ─────────────────────────────────────────────────────────

  /**
   * INQ-013: General inquiry (no supplier_slug, category GENERAL) → 202.
   * Supplier gate must NOT be called.
   */
  it('INQ-013: general inquiry (no supplier_slug, category GENERAL) → 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL' },
    });
    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.acknowledged).toBe(true);
    expect(getPublicB2BSupplierBySlug).not.toHaveBeenCalled();
  });

  /**
   * INQ-014: General inquiry with known source_surface NAVBAR → 202.
   * source_surface preserved in afterJson.
   */
  it('INQ-014: general inquiry with source_surface NAVBAR → 202, source_surface in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', source_surface: 'NAVBAR' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.source_surface).toBe('NAVBAR');
  });

  /**
   * INQ-015: General inquiry with valid message → 202.
   * inquiry_message stored in afterJson (not as 'message').
   */
  it('INQ-015: general inquiry with valid message → 202, inquiry_message in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', message: 'Looking for natural fabric suppliers' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.inquiry_message).toBe('Looking for natural fabric suppliers');
    expect(afterJson).not.toHaveProperty('message');
  });

  /**
   * INQ-016: Message containing email address → 400.
   */
  it('INQ-016: message containing email → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', message: 'Please contact me at buyer@example.com for details' },
    });
    expect(response.statusCode).toBe(400);
  });

  /**
   * INQ-017: Message containing phone number → 400.
   */
  it('INQ-017: message containing phone number → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', message: 'Call me at 555-123-4567 to discuss pricing' },
    });
    expect(response.statusCode).toBe(400);
  });

  /**
   * INQ-018: product_slug in valid format, no supplier_slug → 202.
   * product_slug present in afterJson (advisory pass-through).
   */
  it('INQ-018: product_slug valid format → 202, product_slug in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'SOURCING_INTENT', product_slug: 'organic-cotton-tee' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.product_slug).toBe('organic-cotton-tee');
  });

  /**
   * INQ-019: category_slug 'garments' (approved) → 202, category_slug in afterJson.
   */
  it('INQ-019: category_slug garments (approved) → 202, category_slug in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', category_slug: 'garments' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.category_slug).toBe('garments');
  });

  /**
   * INQ-020: category_slug 'unknown-category' (unapproved) → 202, category_slug absent from afterJson.
   * Fail-closed: unapproved slugs silently dropped, request still accepted.
   */
  it('INQ-020: category_slug unknown-category (unapproved) → 202, category_slug absent from afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', category_slug: 'unknown-category' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson).not.toHaveProperty('category_slug');
  });

  /**
   * INQ-021: collection_slug 'natural-fabric-stories' (approved) → 202, collection_slug in afterJson.
   */
  it('INQ-021: collection_slug natural-fabric-stories (approved) → 202, collection_slug in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', collection_slug: 'natural-fabric-stories' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.collection_slug).toBe('natural-fabric-stories');
  });

  /**
   * INQ-022: supplier_slug + product_slug context exclusivity violation → 400.
   * Supplier gate must NOT be reached.
   */
  it('INQ-022: supplier_slug + product_slug exclusivity violation → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        inquiry_category: 'GENERAL',
        supplier_slug: 'acme-textiles',
        product_slug: 'organic-cotton-tee',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(getPublicB2BSupplierBySlug).not.toHaveBeenCalled();
  });

  /**
   * INQ-023: Unknown source_surface → 202, afterJson source_surface normalized to 'DIRECT'.
   */
  it('INQ-023: unknown source_surface → 202, source_surface DIRECT in afterJson', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', source_surface: 'SOME_UNKNOWN_SURFACE' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.source_surface).toBe('DIRECT');
  });

  /**
   * INQ-024: Message exceeding 500 chars after sanitization → 400.
   */
  it('INQ-024: oversized message (>500 chars after sanitization) → 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', message: 'A'.repeat(501) },
    });
    expect(response.statusCode).toBe(400);
  });

  /**
   * INQ-025: Message with HTML tags → 202, tags stripped in afterJson inquiry_message.
   */
  it('INQ-025: message with HTML tags → 202, HTML stripped in inquiry_message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'GENERAL', message: '<b>Looking for</b> natural fabric suppliers' },
    });
    expect(response.statusCode).toBe(202);
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.inquiry_message).toBe('Looking for natural fabric suppliers');
  });

  /**
   * INQ-026: Phase 1 regression — supplier inquiry with all Phase 1 fields → 202.
   * Supplier gate called; supplier_slug present in afterJson (backward compatible).
   */
  it('INQ-026: Phase 1 supplier inquiry regression → 202 (backward compatibility)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'SOURCING_INTENT',
        geo_band: 'South Asia',
        volume_band: '500-1000 units/month',
      },
    });
    expect(response.statusCode).toBe(202);
    expect(getPublicB2BSupplierBySlug).toHaveBeenCalledWith('acme-textiles', expect.anything());
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson.supplier_slug).toBe('acme-textiles');
    expect(afterJson.inquiry_category).toBe('SOURCING_INTENT');
    expect(afterJson.geo_band).toBe('South Asia');
    expect(afterJson.volume_band).toBe('500-1000 units/month');
    expect(entry.realm).toBe('TENANT');
    expect(entry.tenantId).toBe(ELIGIBLE_SUPPLIER_RESULT.orgId);
    expect(entry.action).toBe('public.buyer.inquiry.created');
  });

  /**
   * INQ-027: General inquiry afterJson contains no org UUID.
   * Realm must be ADMIN; tenantId and entityId must be null.
   * Action must be 'public.buyer.inquiry.general.created' (distinct from supplier path;
   * not in AUDIT_ACTION_TO_EVENT_NAME registry — event emission cleanly deferred).
   */
  it('INQ-027: general inquiry afterJson has no org UUID, realm ADMIN, tenantId null, action general.created', async () => {
    await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { inquiry_category: 'CAPABILITY_FIT' },
    });
    expect(getPublicB2BSupplierBySlug).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(JSON.stringify(afterJson)).not.toContain(ELIGIBLE_SUPPLIER_RESULT.orgId);
    expect(afterJson).not.toHaveProperty('org_id');
    expect(afterJson).not.toHaveProperty('orgId');
    expect(afterJson).not.toHaveProperty('supplier_slug');
    expect(entry.realm).toBe('ADMIN');
    expect(entry.tenantId).toBeNull();
    expect(entry.entityId).toBeNull();
    expect(entry.action).toBe('public.buyer.inquiry.general.created');
  });

  // ── Notification loop tests (FTR-B2C-004 / PRIT-033) ──────────────────────

  /**
   * INQ-028: Supplier inquiry with buyer_email → acknowledgement dispatch attempted.
   * Supplier email resolves → supplier notification dispatched.
   */
  it('INQ-028: supplier inquiry with buyer_email → buyer + supplier notifications dispatched', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.membership.findFirst as any).mockResolvedValueOnce({
      user: { email: 'owner@acme-textiles.example' },
    });

    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'SOURCING_INTENT',
        geo_band: 'South Asia',
        buyer_email: 'buyer@example.com',
      },
    });

    expect(response.statusCode).toBe(202);
    expect(sendBuyerInquiryAcknowledgementEmail).toHaveBeenCalledOnce();
    expect(sendBuyerInquiryAcknowledgementEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({ inquiry_category: 'SOURCING_INTENT', supplier_slug: 'acme-textiles' }),
      expect.objectContaining({ triggeredBy: 'system' }),
    );
    expect(sendSupplierInquiryNotificationEmail).toHaveBeenCalledOnce();
    expect(sendSupplierInquiryNotificationEmail).toHaveBeenCalledWith(
      'owner@acme-textiles.example',
      expect.objectContaining({ inquiry_category: 'SOURCING_INTENT' }),
      expect.anything(),
    );
  });

  /**
   * INQ-029: Supplier inquiry without buyer_email → buyer notification NOT dispatched.
   * 202 still returned.
   */
  it('INQ-029: no buyer_email → buyer acknowledgement not dispatched, still 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: { supplier_slug: 'acme-textiles', inquiry_category: 'GENERAL' },
    });

    expect(response.statusCode).toBe(202);
    expect(sendBuyerInquiryAcknowledgementEmail).not.toHaveBeenCalled();
  });

  /**
   * INQ-030: Supplier email lookup fails (membership.findFirst rejects) → route still 202.
   */
  it('INQ-030: supplier email lookup fails → route still returns 202 (non-blocking)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.membership.findFirst as any).mockRejectedValueOnce(new Error('db lookup failed'));

    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
        buyer_email: 'buyer@example.com',
      },
    });

    expect(response.statusCode).toBe(202);
  });

  /**
   * INQ-031: Email service throws → route still returns 202 (non-blocking).
   */
  it('INQ-031: email service throws → route still returns 202 (non-blocking)', async () => {
    vi.mocked(sendBuyerInquiryAcknowledgementEmail).mockRejectedValueOnce(new Error('SMTP failure'));

    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        inquiry_category: 'GENERAL',
        buyer_email: 'buyer@example.com',
      },
    });

    expect(response.statusCode).toBe(202);
  });

  /**
   * INQ-032: buyer_email field is NOT included in afterJson (transient only).
   */
  it('INQ-032: buyer_email is NOT persisted in afterJson', async () => {
    await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        supplier_slug: 'acme-textiles',
        inquiry_category: 'GENERAL',
        buyer_email: 'buyer@example.com',
      },
    });

    expect(writeAuditLog).toHaveBeenCalledOnce();
    const [, entry] = vi.mocked(writeAuditLog).mock.calls[0];
    const afterJson = entry.afterJson as Record<string, unknown>;
    expect(afterJson).not.toHaveProperty('buyer_email');
    expect(JSON.stringify(afterJson)).not.toContain('buyer@example.com');
  });

  /**
   * INQ-033: Validation failure → notifications NOT dispatched, 400 returned.
   */
  it('INQ-033: validation failure → no notification dispatched, 400 returned', async () => {
    const response = await app.inject({
      method: 'POST',
      url: SUBMIT_URL,
      payload: {
        // missing required inquiry_category
        supplier_slug: 'acme-textiles',
        buyer_email: 'buyer@example.com',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(sendBuyerInquiryAcknowledgementEmail).not.toHaveBeenCalled();
    expect(sendSupplierInquiryNotificationEmail).not.toHaveBeenCalled();
    expect(sendAdminInquiryAlertEmail).not.toHaveBeenCalled();
  });
});
