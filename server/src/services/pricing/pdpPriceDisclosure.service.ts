import type {
  BuyerCatalogPdpView,
  PriceDisclosureMetadata,
} from '../../types/index.js';
import {
  resolvePriceDisclosureState,
  type BuyerPriceDisclosureInput,
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
