import type {
  BuyerCatalogPdpView,
  PriceDisclosureMetadata,
} from '../../types/index.js';
import {
  resolvePriceDisclosureState,
  type BuyerPriceDisclosureInput,
  type SupplierDisclosurePolicy,
  type SupplierPricePolicyMode,
} from './priceDisclosureResolver.service.js';

const FORBIDDEN_PRICE_LIKE_TOP_LEVEL_FIELDS = [
  'price',
  'amount',
  'unitPrice',
  'basePrice',
  'listPrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'internalMargin',
] as const;

export type BuyerCatalogPdpViewBase = Omit<BuyerCatalogPdpView, 'priceDisclosure'>;

type PublicationPosture = 'PRIVATE_OR_AUTH_ONLY' | 'B2B_PUBLIC' | 'B2C_PUBLIC' | 'BOTH';

const KNOWN_PUBLICATION_POSTURES = new Set<PublicationPosture>([
  'PRIVATE_OR_AUTH_ONLY',
  'B2B_PUBLIC',
  'B2C_PUBLIC',
  'BOTH',
]);

const KNOWN_DISCLOSURE_POLICY_MODES = new Set<SupplierPricePolicyMode>([
  'ALWAYS_VISIBLE',
  'AUTH_ONLY',
  'ELIGIBLE_ONLY',
  'HIDDEN_ALL',
  'RFQ_ONLY',
  'RELATIONSHIP_ONLY',
]);

export interface PdpSupplierDisclosurePolicySourceInput {
  buyerOrgId?: string | null;
  supplierOrgId?: string | null;
  productPolicyMode?: unknown;
  supplierPolicyMode?: unknown;
  productPublicationPosture?: unknown;
  supplierPublicationPosture?: unknown;
}

function normalizeDisclosurePolicyMode(mode: unknown): SupplierPricePolicyMode | null {
  if (typeof mode !== 'string') {
    return null;
  }

  const normalized = mode.trim().toUpperCase() as SupplierPricePolicyMode;
  return KNOWN_DISCLOSURE_POLICY_MODES.has(normalized) ? normalized : null;
}

function normalizePublicationPosture(posture: unknown): PublicationPosture | null {
  if (typeof posture !== 'string') {
    return null;
  }

  const normalized = posture.trim().toUpperCase() as PublicationPosture;
  return KNOWN_PUBLICATION_POSTURES.has(normalized) ? normalized : null;
}

/**
 * Slice D policy source adapter.
 *
 * Resolution rules:
 * - product policy mode (if already available in trusted server context)
 * - supplier policy mode (if already available in trusted server context)
 * - otherwise safe default (null) so resolver suppresses disclosure value
 *
 * Existing publication posture is intentionally treated as catalog visibility,
 * not as an explicit commercial price-disclosure policy.
 */
export function resolveSupplierDisclosurePolicyForPdp(
  input: PdpSupplierDisclosurePolicySourceInput,
): SupplierDisclosurePolicy | null {
  const buyerOrgId = input.buyerOrgId?.trim();
  const supplierOrgId = input.supplierOrgId?.trim();

  // Tenant safety guard: missing or cross-tenant context defaults to suppression.
  if (!buyerOrgId || !supplierOrgId || buyerOrgId !== supplierOrgId) {
    return null;
  }

  const productPolicyMode = normalizeDisclosurePolicyMode(input.productPolicyMode);
  if (productPolicyMode != null) {
    return {
      mode: productPolicyMode,
      source: 'PRODUCT_OVERRIDE',
    };
  }

  const supplierPolicyMode = normalizeDisclosurePolicyMode(input.supplierPolicyMode);
  if (supplierPolicyMode != null) {
    return {
      mode: supplierPolicyMode,
      source: 'SUPPLIER_DEFAULT',
    };
  }

  const hasAmbiguousPublicationSignal =
    normalizePublicationPosture(input.productPublicationPosture) != null
    || normalizePublicationPosture(input.supplierPublicationPosture) != null;

  if (hasAmbiguousPublicationSignal) {
    return null;
  }

  return null;
}

function stripForbiddenTopLevelFields(input: BuyerCatalogPdpViewBase): BuyerCatalogPdpViewBase {
  const copy = { ...(input as Record<string, unknown>) };
  for (const key of FORBIDDEN_PRICE_LIKE_TOP_LEVEL_FIELDS) {
    delete copy[key];
  }
  return copy as BuyerCatalogPdpViewBase;
}

export function buildPdpDisclosureMetadata(
  input: BuyerPriceDisclosureInput,
): PriceDisclosureMetadata {
  return resolvePriceDisclosureState(input);
}

export function attachPriceDisclosureToPdpView(
  baseView: BuyerCatalogPdpViewBase,
  disclosureInput: BuyerPriceDisclosureInput,
): BuyerCatalogPdpView {
  const sanitizedView = stripForbiddenTopLevelFields(baseView);
  const priceDisclosure = buildPdpDisclosureMetadata(disclosureInput);

  return {
    ...sanitizedView,
    priceDisclosure,
  };
}
