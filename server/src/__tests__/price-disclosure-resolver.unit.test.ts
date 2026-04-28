import { describe, expect, it } from 'vitest';

import {
  resolvePriceDisclosureState,
  type BuyerPriceDisclosureView,
  type BuyerPriceDisclosureInput,
} from '../services/pricing/priceDisclosureResolver.service.js';

function baseInput(): BuyerPriceDisclosureInput {
  return {
    buyer: {
      isAuthenticated: false,
      isEligible: false,
    },
    supplierPolicy: null,
  };
}

function expectNoPriceLikeFields(result: BuyerPriceDisclosureView) {
  expect(Object.keys(result)).not.toContain('price');
  expect(Object.keys(result)).not.toContain('priceValue');
  expect(Object.keys(result)).not.toContain('hiddenPrice');
  expect(Object.keys(result)).not.toContain('costPrice');
  expect(Object.keys(result)).not.toContain('negotiatedPrice');
  expect(Object.keys(result)).not.toContain('margin');
}

describe('resolvePriceDisclosureState', () => {
  it('defaults to PRICE_ON_REQUEST when supplier policy is missing', () => {
    const input = baseInput();
    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'PRICE_ON_REQUEST',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Price available on request',
      cta_type: 'REQUEST_QUOTE',
      supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
      rfq_required: true,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns visible state for ALWAYS_VISIBLE', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'ALWAYS_VISIBLE', source: 'SUPPLIER_DEFAULT' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'PUBLIC_VISIBLE',
      price_display_policy: 'SHOW_VALUE',
      price_value_visible: true,
      cta_type: 'VIEW_PRICE',
      supplier_policy_source: 'SUPPLIER_DEFAULT',
      rfq_required: false,
    });
  });

  it('returns LOGIN_REQUIRED for AUTH_ONLY when unauthenticated', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'AUTH_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'LOGIN_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Login to view price',
      cta_type: 'LOGIN_TO_VIEW',
      rfq_required: false,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns AUTH_VISIBLE for AUTH_ONLY when authenticated', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: { mode: 'AUTH_ONLY', source: 'PRODUCT_OVERRIDE' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'AUTH_VISIBLE',
      price_display_policy: 'SHOW_VALUE',
      price_value_visible: true,
      cta_type: 'VIEW_PRICE',
      supplier_policy_source: 'PRODUCT_OVERRIDE',
      rfq_required: false,
    });
  });

  it('returns ELIGIBLE_VISIBLE for ELIGIBLE_ONLY when authenticated and eligible', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: true,
      },
      supplierPolicy: { mode: 'ELIGIBLE_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'ELIGIBLE_VISIBLE',
      price_display_policy: 'SHOW_VALUE',
      price_value_visible: true,
      cta_type: 'VIEW_PRICE',
      rfq_required: false,
    });
  });

  it('returns LOGIN_REQUIRED for ELIGIBLE_ONLY when unauthenticated', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: false,
        isEligible: true,
      },
      supplierPolicy: { mode: 'ELIGIBLE_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'LOGIN_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      cta_type: 'LOGIN_TO_VIEW',
    });
    expectNoPriceLikeFields(result);
  });

  it('returns ELIGIBILITY_REQUIRED for ELIGIBLE_ONLY when authenticated but ineligible', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: { mode: 'ELIGIBLE_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'ELIGIBILITY_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Eligibility required',
      cta_type: 'CHECK_ELIGIBILITY',
      rfq_required: false,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns HIDDEN for HIDDEN_ALL and suppresses value', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'HIDDEN_ALL' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'HIDDEN',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Contact supplier',
      cta_type: 'CONTACT_SUPPLIER',
      rfq_required: false,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns RFQ_ONLY and sets rfq_required true', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'RFQ_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'RFQ_ONLY',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Request quote',
      cta_type: 'REQUEST_QUOTE',
      rfq_required: true,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns ELIGIBLE_VISIBLE for RELATIONSHIP_ONLY when authenticated with approved eligibility', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: true,
      },
      supplierPolicy: { mode: 'RELATIONSHIP_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'ELIGIBLE_VISIBLE',
      price_display_policy: 'SHOW_VALUE',
      price_value_visible: true,
      rfq_required: false,
    });
    expectNoPriceLikeFields(result);
  });

  it('returns suppressed ELIGIBILITY_REQUIRED for RELATIONSHIP_ONLY when authenticated without eligibility', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: { mode: 'RELATIONSHIP_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'ELIGIBILITY_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Price available on request',
      cta_type: 'CHECK_ELIGIBILITY',
      rfq_required: false,
    });
    expect(typeof result.eligibility_reason).toBe('string');
    expectNoPriceLikeFields(result);
  });

  it('returns LOGIN_REQUIRED for RELATIONSHIP_ONLY when unauthenticated', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      buyer: {
        isAuthenticated: false,
        isEligible: false,
      },
      supplierPolicy: { mode: 'RELATIONSHIP_ONLY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'LOGIN_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      cta_type: 'LOGIN_TO_VIEW',
      rfq_required: false,
    });
    expectNoPriceLikeFields(result);
  });

  it('defaults safely when buyer context shape is incomplete', () => {
    const input = {
      supplierPolicy: { mode: 'AUTH_ONLY' },
      buyer: {},
    } as unknown as BuyerPriceDisclosureInput;

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'LOGIN_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      cta_type: 'LOGIN_TO_VIEW',
    });
    expectNoPriceLikeFields(result);
  });

  it('treats unknown eligibility value as ineligible and keeps suppression', () => {
    const input = {
      ...baseInput(),
      buyer: {
        isAuthenticated: true,
        isEligible: 'UNKNOWN',
      },
      supplierPolicy: { mode: 'ELIGIBLE_ONLY' },
    } as unknown as BuyerPriceDisclosureInput;

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'ELIGIBILITY_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      cta_type: 'CHECK_ELIGIBILITY',
    });
    expectNoPriceLikeFields(result);
  });

  it('falls back safely for unknown policy mode', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'SOME_UNKNOWN_POLICY' },
    };

    const result = resolvePriceDisclosureState(input);

    expect(result).toMatchObject({
      price_visibility_state: 'PRICE_ON_REQUEST',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Price available on request',
      cta_type: 'REQUEST_QUOTE',
      supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
      rfq_required: true,
    });
    expectNoPriceLikeFields(result);
  });

  it('does not leak input priceValue in suppressed states', () => {
    const input: BuyerPriceDisclosureInput = {
      ...baseInput(),
      supplierPolicy: { mode: 'RFQ_ONLY' },
      priceValue: 199.99,
    };

    const result = resolvePriceDisclosureState(input);

    expect(result.price_value_visible).toBe(false);
    expect(result).not.toHaveProperty('priceValue');
    expect(result).not.toHaveProperty('price');
    expectNoPriceLikeFields(result);
  });
});
