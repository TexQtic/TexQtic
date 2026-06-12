import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedConfig,
  mockFileTypeFromBuffer,
  mockUpload,
  mockGetPublicUrl,
} = vi.hoisted(() => ({
  mockedConfig: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    CATALOG_IMAGE_BUCKET: 'catalog-images',
  },
  mockFileTypeFromBuffer: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}));

vi.mock('../config/index.js', () => ({
  config: mockedConfig,
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));

import {
  MAX_TENANT_LOGO_BYTES,
  uploadTenantLogoToStorage,
  validateTenantLogoBuffer,
} from '../services/storage/tenantLogo.storage.js';

describe('tenantLogo.storage', () => {
  beforeEach(() => {
    mockFileTypeFromBuffer.mockReset();
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();

    mockedConfig.SUPABASE_URL = 'https://example.supabase.co';
    mockedConfig.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockedConfig.CATALOG_IMAGE_BUCKET = 'catalog-images';
  });

  it('accepts valid WEBP logo by magic bytes detection', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'webp', mime: 'image/webp' });

    const mime = await validateTenantLogoBuffer(Buffer.from('webp-data'));

    expect(mime).toBe('image/webp');
  });

  it('rejects file larger than 2MB', async () => {
    const oversized = Buffer.alloc(MAX_TENANT_LOGO_BYTES + 1, 1);

    await expect(validateTenantLogoBuffer(oversized)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
      statusCode: 400,
    });
  });

  it('rejects invalid file type', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'gif', mime: 'image/gif' });

    await expect(validateTenantLogoBuffer(Buffer.from('gif-data'))).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      statusCode: 400,
    });
  });

  it('uploads logo and returns public URL with /logo/ path segment', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'jpg', mime: 'image/jpeg' });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/catalog-images/org/logo/file.jpg' },
    });

    const result = await uploadTenantLogoToStorage({
      orgId: 'org-123',
      fileBuffer: Buffer.from('jpg-data'),
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(result.logoUrl).toContain('/logo/');
  });

  it('throws STORAGE_NOT_CONFIGURED when env is missing', async () => {
    mockedConfig.CATALOG_IMAGE_BUCKET = '';

    await expect(
      uploadTenantLogoToStorage({
        orgId: 'org-123',
        fileBuffer: Buffer.from('jpg-data'),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'STORAGE_NOT_CONFIGURED',
        statusCode: 500,
      }),
    );
  });
});
