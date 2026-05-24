import { describe, expect, it } from 'vitest';
import {
  getPublicReferenceB2BSupplierBySlug,
  getPublicReferenceB2BSuppliers,
} from '../../config/publicReferenceB2B';
import {
  getPublicReferenceB2CProductDetailBySlug,
  getPublicReferenceB2CProductPreviews,
  getPublicReferenceB2CProductsByCategory,
} from '../../config/publicReferenceB2C';

describe('public reference preview config', () => {
  it('provides a bounded B2B reference supplier set', () => {
    const suppliers = getPublicReferenceB2BSuppliers();
    expect(suppliers).toHaveLength(3);
    expect(getPublicReferenceB2BSupplierBySlug('reference-weaving-unit')?.isReferencePreview).toBe(
      true,
    );
  });

  it('provides bounded B2C reference previews by category', () => {
    const previews = getPublicReferenceB2CProductPreviews();
    expect(previews).toHaveLength(4);
    expect(getPublicReferenceB2CProductsByCategory('Home Textiles')).toHaveLength(1);
    expect(getPublicReferenceB2CProductsByCategory('Technical Textiles')).toHaveLength(1);
  });

  it('builds reference product detail without price or passport claims', () => {
    const detail = getPublicReferenceB2CProductDetailBySlug('reference-cotton-percale-set');
    expect(detail).toBeDefined();
    expect(detail?.isReferencePreview).toBe(true);
    expect(detail?.publicPriceLabel).toBeNull();
    expect(detail?.publicMoqLabel).toBeNull();
    expect(detail?.hasPassport).toBe(false);
  });
});