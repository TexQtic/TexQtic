/**
 * Buyer Price Disclosure Resolver (Slice A)
 *
 * Deterministic, pure resolver that maps buyer context + supplier policy
 * into disclosure metadata only. This module must never return price amounts.
 */

export type PriceVisibilityState =
  | 'PUBLIC_VISIBLE'
  | 'AUTH_VISIBLE'
  | 'ELIGIBLE_VISIBLE'
  | 'HIDDEN'
  | 'RFQ_ONLY'
  | 'PRICE_ON_REQUEST'
  | 'LOGIN_REQUIRED'
  | 'ELIGIBILITY_REQUIRED';

export type PriceDisplayPolicy = 'SHOW_VALUE' | 'SUPPRESS_VALUE';

export type PriceDisclosureCtaType =
  | 'VIEW_PRICE'
  | 'REQUEST_QUOTE'
  | 'CONTACT_SUPPLIER'
  | 'LOGIN_TO_VIEW'
  | 'CHECK_ELIGIBILITY';

export type SupplierPricePolicyMode =
  | 'ALWAYS_VISIBLE'
  | 'AUTH_ONLY'
  | 'ELIGIBLE_ONLY'
  | 'HIDDEN_ALL'
  | 'RFQ_ONLY'
  | 'RELATIONSHIP_ONLY';

export type SupplierPolicySource =
  | 'SUPPLIER_DEFAULT'
  | 'PRODUCT_OVERRIDE'
  | 'SYSTEM_SAFE_DEFAULT';

export interface BuyerPriceDisclosureView {
  price_visibility_state: PriceVisibilityState;
  price_display_policy: PriceDisplayPolicy;
  price_value_visible: boolean;
  price_label:
    | 'Price available on request'
    | 'Contact supplier'
    | 'Login to view price'
    | 'Eligibility required'
    | 'Request quote';
  cta_type: PriceDisclosureCtaType;
  eligibility_reason: string | null;
  supplier_policy_source: SupplierPolicySource;
  rfq_required: boolean;
}

export interface BuyerDisclosureContext {
  isAuthenticated: boolean;
  isEligible?: boolean | null;
  buyerOrgId?: string | null;
  supplierOrgId?: string | null;
}

export interface SupplierDisclosurePolicy {
  mode?: SupplierPricePolicyMode | string | null;
  source?: SupplierPolicySource | string | null;
}

export interface BuyerPriceDisclosureInput {
  buyer: BuyerDisclosureContext;
  supplierPolicy?: SupplierDisclosurePolicy | null;
  productPolicy?: SupplierDisclosurePolicy | null;
  eligibilityReason?: string | null;
  // Accepted but intentionally ignored to prevent output leakage.
  priceValue?: unknown;
}

const SAFE_DEFAULT: BuyerPriceDisclosureView = {
  price_visibility_state: 'PRICE_ON_REQUEST',
  price_display_policy: 'SUPPRESS_VALUE',
  price_value_visible: false,
  price_label: 'Price available on request',
  cta_type: 'REQUEST_QUOTE',
  eligibility_reason: null,
  supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
  rfq_required: true,
};

function normalizePolicyMode(mode: unknown): SupplierPricePolicyMode | null {
  if (typeof mode !== 'string') {
    return null;
  }

  const normalized = mode.trim().toUpperCase();
  switch (normalized) {
    case 'ALWAYS_VISIBLE':
    case 'AUTH_ONLY':
    case 'ELIGIBLE_ONLY':
    case 'HIDDEN_ALL':
    case 'RFQ_ONLY':
    case 'RELATIONSHIP_ONLY':
      return normalized;
    default:
      return null;
  }
}

function normalizePolicySource(source: unknown): SupplierPolicySource {
  if (source === 'SUPPLIER_DEFAULT' || source === 'PRODUCT_OVERRIDE') {
    return source;
  }
  return 'SYSTEM_SAFE_DEFAULT';
}

function buildVisibleState(
  state: Extract<PriceVisibilityState, 'PUBLIC_VISIBLE' | 'AUTH_VISIBLE' | 'ELIGIBLE_VISIBLE'>,
  source: SupplierPolicySource,
): BuyerPriceDisclosureView {
  return {
    price_visibility_state: state,
    price_display_policy: 'SHOW_VALUE',
    price_value_visible: true,
    price_label: 'Request quote',
    cta_type: 'VIEW_PRICE',
    eligibility_reason: null,
    supplier_policy_source: source,
    rfq_required: false,
  };
}

/**
 * Resolve disclosure metadata from buyer context and supplier policy.
 *
 * Important: this resolver never returns price or commercial numeric fields.
 */
export function resolvePriceDisclosureState(
  input: BuyerPriceDisclosureInput,
): BuyerPriceDisclosureView {
  const policy = input.productPolicy ?? input.supplierPolicy ?? null;
  const policyMode = normalizePolicyMode(policy?.mode);
  const policySource = normalizePolicySource(policy?.source);

  // Deterministic same-context guard without DB lookup.
  if (
    input.buyer.buyerOrgId != null &&
    input.buyer.supplierOrgId != null &&
    input.buyer.buyerOrgId !== input.buyer.supplierOrgId &&
    policyMode === 'ALWAYS_VISIBLE'
  ) {
    return {
      ...SAFE_DEFAULT,
      supplier_policy_source: policySource,
      eligibility_reason: 'Cross-context disclosure is not enabled',
      rfq_required: true,
    };
  }

  if (policyMode == null) {
    return {
      ...SAFE_DEFAULT,
      supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
    };
  }

  switch (policyMode) {
    case 'ALWAYS_VISIBLE':
      return buildVisibleState('PUBLIC_VISIBLE', policySource);

    case 'AUTH_ONLY':
      if (input.buyer.isAuthenticated) {
        return buildVisibleState('AUTH_VISIBLE', policySource);
      }
      return {
        price_visibility_state: 'LOGIN_REQUIRED',
        price_display_policy: 'SUPPRESS_VALUE',
        price_value_visible: false,
        price_label: 'Login to view price',
        cta_type: 'LOGIN_TO_VIEW',
        eligibility_reason: null,
        supplier_policy_source: policySource,
        rfq_required: false,
      };

    case 'ELIGIBLE_ONLY':
      if (!input.buyer.isAuthenticated) {
        return {
          price_visibility_state: 'LOGIN_REQUIRED',
          price_display_policy: 'SUPPRESS_VALUE',
          price_value_visible: false,
          price_label: 'Login to view price',
          cta_type: 'LOGIN_TO_VIEW',
          eligibility_reason: null,
          supplier_policy_source: policySource,
          rfq_required: false,
        };
      }

      if (input.buyer.isEligible === true) {
        return buildVisibleState('ELIGIBLE_VISIBLE', policySource);
      }

      return {
        price_visibility_state: 'ELIGIBILITY_REQUIRED',
        price_display_policy: 'SUPPRESS_VALUE',
        price_value_visible: false,
        price_label: 'Eligibility required',
        cta_type: 'CHECK_ELIGIBILITY',
        eligibility_reason: input.eligibilityReason ?? 'Buyer is not eligible for this supplier policy',
        supplier_policy_source: policySource,
        rfq_required: false,
      };

    case 'HIDDEN_ALL':
      return {
        price_visibility_state: 'HIDDEN',
        price_display_policy: 'SUPPRESS_VALUE',
        price_value_visible: false,
        price_label: 'Contact supplier',
        cta_type: 'CONTACT_SUPPLIER',
        eligibility_reason: null,
        supplier_policy_source: policySource,
        rfq_required: false,
      };

    case 'RFQ_ONLY':
      return {
        price_visibility_state: 'RFQ_ONLY',
        price_display_policy: 'SUPPRESS_VALUE',
        price_value_visible: false,
        price_label: 'Request quote',
        cta_type: 'REQUEST_QUOTE',
        eligibility_reason: null,
        supplier_policy_source: policySource,
        rfq_required: true,
      };

    case 'RELATIONSHIP_ONLY':
      return {
        price_visibility_state: 'ELIGIBILITY_REQUIRED',
        price_display_policy: 'SUPPRESS_VALUE',
        price_value_visible: false,
        price_label: 'Eligibility required',
        cta_type: 'CHECK_ELIGIBILITY',
        eligibility_reason:
          input.eligibilityReason ??
          'Relationship-gated pricing is not available in this slice',
        supplier_policy_source: policySource,
        rfq_required: false,
      };
  }
}
