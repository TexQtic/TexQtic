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
  MAX_CATALOG_IMAGE_BYTES,
  uploadCatalogImageToStorage,
  validateCatalogImageBuffer,
} from '../services/storage/catalogImage.storage.js';

describe('catalogImage.storage', () => {
  beforeEach(() => {
    mockFileTypeFromBuffer.mockReset();
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();

    mockedConfig.SUPABASE_URL = 'https://example.supabase.co';
    mockedConfig.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockedConfig.CATALOG_IMAGE_BUCKET = 'catalog-images';
  });

  it('accepts valid PNG by magic bytes detection', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'png', mime: 'image/png' });

    const mime = await validateCatalogImageBuffer(Buffer.from('png-data'));

    expect(mime).toBe('image/png');
  });

  it('rejects file larger than 5MB', async () => {
    const oversized = Buffer.alloc(MAX_CATALOG_IMAGE_BYTES + 1, 1);

    await expect(validateCatalogImageBuffer(oversized)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
      statusCode: 400,
    });
  });

  it('rejects invalid file type', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'gif', mime: 'image/gif' });

    await expect(validateCatalogImageBuffer(Buffer.from('gif-data'))).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      statusCode: 400,
    });
  });

  it('rejects mismatch between declared mime and detected mime', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'jpg', mime: 'image/jpeg' });

    await expect(
      validateCatalogImageBuffer(Buffer.from('jpg-data'), 'image/png'),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      statusCode: 400,
    });
  });

  it('uploads image and returns public URL', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ ext: 'jpg', mime: 'image/jpeg' });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/catalog-images/org/file.jpg' },
    });

    const result = await uploadCatalogImageToStorage({
      orgId: 'org-123',
      fileBuffer: Buffer.from('jpg-data'),
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(result.imageUrl).toContain('/catalog-images/');
  });

  it('throws STORAGE_NOT_CONFIGURED when env is missing', async () => {
    mockedConfig.CATALOG_IMAGE_BUCKET = '';

    await expect(
      uploadCatalogImageToStorage({
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
