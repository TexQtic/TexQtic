import type {
  CatalogRfqPrefillResult,
  PriceDisclosureMetadata,
} from '../../types/index.js';

export interface BuildCatalogRfqPrefillContextInput {
  buyerOrgId?: string | null;
  authenticatedBuyerOrgId?: string | null;
  isAuthenticated: boolean;
  item: {
    itemId?: string | null;
    productName?: string | null;
    supplierOrgId?: string | null;
    supplierIsPublished?: boolean | null;
    supplierIsActive?: boolean | null;
    isPublished?: boolean | null;
    isActive?: boolean | null;
    category?: string | null;
    material?: string | null;
    specSummary?: string | null;
    moq?: number | null;
    leadTimeDays?: number | null;
    complianceRefs?: string[] | null;
    publishedDppRef?: string | null;
    isPublishedDppRefSafe?: boolean | null;
  };
  priceDisclosure: PriceDisclosureMetadata;
  draftInput?: {
    selectedQuantity?: number | null;
    buyerNotes?: string | null;
  } | null;
}

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOrgId(value: string | null | undefined): string | null {
  return sanitizeText(value);
}

function sanitizeNotes(value: string | null | undefined): string | null {
  const normalized = sanitizeText(value);
  if (normalized == null) {
    return null;
  }

  return normalized.slice(0, 2000);
}

function sanitizeQuantity(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const integerQuantity = Math.trunc(value);
  return integerQuantity > 0 ? integerQuantity : null;
}

function sanitizeComplianceRefs(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map(item => sanitizeText(item))
    .filter((item): item is string => item != null)
    .slice(0, 20);
}

function toSafeUnavailable(reason: 'ITEM_NOT_AVAILABLE' | 'SUPPLIER_NOT_AVAILABLE'): CatalogRfqPrefillResult {
  return {
    ok: false,
    reason,
  };
}

function validatePriceDisclosureForPrefill(
  disclosure: PriceDisclosureMetadata,
  isAuthenticated: boolean,
): CatalogRfqPrefillResult | null {
  switch (disclosure.price_visibility_state) {
    case 'LOGIN_REQUIRED':
      return {
        ok: false,
        reason: 'AUTH_REQUIRED',
      };

    case 'ELIGIBILITY_REQUIRED':
      return {
        ok: false,
        reason: 'ELIGIBILITY_REQUIRED',
      };

    case 'HIDDEN':
      return {
        ok: false,
        reason: 'RFQ_PREFILL_NOT_AVAILABLE',
      };

    case 'RFQ_ONLY':
    case 'PRICE_ON_REQUEST':
    case 'PUBLIC_VISIBLE':
    case 'AUTH_VISIBLE':
    case 'ELIGIBLE_VISIBLE':
      if (!isAuthenticated) {
        return {
          ok: false,
          reason: 'AUTH_REQUIRED',
        };
      }
      return null;
  }
}

function deriveRfqEntryReason(
  state: PriceDisclosureMetadata['price_visibility_state'],
): 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | 'VISIBLE_PRICE_NEGOTIATION' | null {
  switch (state) {
    case 'RFQ_ONLY':
      return 'RFQ_ONLY';
    case 'PRICE_ON_REQUEST':
      return 'PRICE_ON_REQUEST';
    case 'PUBLIC_VISIBLE':
    case 'AUTH_VISIBLE':
    case 'ELIGIBLE_VISIBLE':
      return 'VISIBLE_PRICE_NEGOTIATION';
    default:
      return null;
  }
}

export function buildCatalogRfqPrefillContext(
  input: BuildCatalogRfqPrefillContextInput,
): CatalogRfqPrefillResult {
  const buyerOrgId = normalizeOrgId(input.buyerOrgId);
  if (buyerOrgId == null) {
    return {
      ok: false,
      reason: 'BUYER_ORG_REQUIRED',
    };
  }

  const authenticatedBuyerOrgId = normalizeOrgId(input.authenticatedBuyerOrgId);
  if (authenticatedBuyerOrgId != null && authenticatedBuyerOrgId !== buyerOrgId) {
    return {
      ok: false,
      reason: 'TENANT_SCOPE_DENIED',
    };
  }

  const disclosureGate = validatePriceDisclosureForPrefill(input.priceDisclosure, input.isAuthenticated);
  if (disclosureGate != null) {
    return disclosureGate;
  }

  const itemId = sanitizeText(input.item.itemId);
  const productName = sanitizeText(input.item.productName);
  if (itemId == null || productName == null) {
    return toSafeUnavailable('ITEM_NOT_AVAILABLE');
  }

  if (input.item.isPublished === false || input.item.isActive === false) {
    return toSafeUnavailable('ITEM_NOT_AVAILABLE');
  }

  const supplierOrgId = normalizeOrgId(input.item.supplierOrgId);
  if (supplierOrgId == null) {
    return toSafeUnavailable('SUPPLIER_NOT_AVAILABLE');
  }

  if (input.item.supplierIsPublished === false || input.item.supplierIsActive === false) {
    return toSafeUnavailable('SUPPLIER_NOT_AVAILABLE');
  }

  const result = {
    ok: true,
    data: {
      itemId,
      productName,
      supplierOrgId,
      buyerOrgId,
      category: sanitizeText(input.item.category),
      material: sanitizeText(input.item.material),
      specSummary: sanitizeText(input.item.specSummary),
      moq: sanitizeQuantity(input.item.moq),
      leadTimeDays: sanitizeQuantity(input.item.leadTimeDays),
      selectedQuantity: sanitizeQuantity(input.draftInput?.selectedQuantity),
      buyerNotes: sanitizeNotes(input.draftInput?.buyerNotes),
      complianceRefs: sanitizeComplianceRefs(input.item.complianceRefs),
      publishedDppRef: input.item.isPublishedDppRefSafe === true
        ? sanitizeText(input.item.publishedDppRef)
        : null,
      priceVisible: input.priceDisclosure.price_value_visible,
      priceVisibilityState: input.priceDisclosure.price_visibility_state,
      rfqEntryReason: deriveRfqEntryReason(input.priceDisclosure.price_visibility_state),
    },
  } satisfies CatalogRfqPrefillResult;

  return result;
}
