import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageRemoveMock = vi.hoisted(() => vi.fn());
const storageFromMock = vi.hoisted(() => vi.fn(() => ({ remove: storageRemoveMock })));
const createClientMock = vi.hoisted(() => vi.fn(() => ({ storage: { from: storageFromMock } })));
const mockConfig = vi.hoisted(() => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-redacted',
  CERTIFICATE_DOCUMENT_BUCKET: 'certificate-documents',
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('../config/index.js', () => ({
  config: mockConfig,
}));

import {
  CertificateDocumentStorageError,
  MAX_CERTIFICATE_DOCUMENT_BYTES,
  deleteCertificateDocumentFromStorage,
  validateCertificateDocumentBuffer,
} from '../services/storage/certificateDocument.storage.js';

const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde,
]);

beforeEach(() => {
  storageRemoveMock.mockReset();
  storageFromMock.mockClear();
  createClientMock.mockClear();
  mockConfig.SUPABASE_URL = 'https://example.supabase.co';
  mockConfig.SUPABASE_SERVICE_ROLE_KEY = 'service-role-redacted';
  mockConfig.CERTIFICATE_DOCUMENT_BUCKET = 'certificate-documents';
});

describe('certificate document storage validation', () => {
  it('accepts PDF certificate documents', async () => {
    await expect(validateCertificateDocumentBuffer(MINIMAL_PDF, 'application/pdf'))
      .resolves.toBe('application/pdf');
  });

  it('accepts PNG certificate images', async () => {
    await expect(validateCertificateDocumentBuffer(MINIMAL_PNG, 'image/png'))
      .resolves.toBe('image/png');
  });

  it('accepts multipart MIME values with parameters', async () => {
    await expect(validateCertificateDocumentBuffer(MINIMAL_PDF, 'application/pdf; charset=binary'))
      .resolves.toBe('application/pdf');
  });

  it('rejects unsupported document bytes', async () => {
    await expect(validateCertificateDocumentBuffer(Buffer.from('not a certificate'), 'text/plain'))
      .rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
        statusCode: 400,
      } satisfies Partial<CertificateDocumentStorageError>);
  });

  it('rejects files over the configured max size', async () => {
    const oversized = Buffer.alloc(MAX_CERTIFICATE_DOCUMENT_BYTES + 1, 0);

    await expect(validateCertificateDocumentBuffer(oversized, 'application/pdf'))
      .rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
        statusCode: 400,
      } satisfies Partial<CertificateDocumentStorageError>);
  });

  it('deletes certificate documents from the configured private bucket', async () => {
    storageRemoveMock.mockResolvedValueOnce({ data: [{ name: 'document.pdf' }], error: null });

    await expect(deleteCertificateDocumentFromStorage('org/certificates/cert/document.pdf'))
      .resolves.toBeUndefined();

    expect(storageFromMock).toHaveBeenCalledWith('certificate-documents');
    expect(storageRemoveMock).toHaveBeenCalledWith(['org/certificates/cert/document.pdf']);
  });

  it('treats a missing storage object as already removed', async () => {
    storageRemoveMock.mockResolvedValueOnce({ data: null, error: { statusCode: 404, message: 'not found' } });

    await expect(deleteCertificateDocumentFromStorage('org/certificates/cert/missing.pdf'))
      .resolves.toBeUndefined();
  });

  it('fails safely when document storage is not configured', async () => {
    mockConfig.CERTIFICATE_DOCUMENT_BUCKET = undefined as unknown as string;

    await expect(deleteCertificateDocumentFromStorage('org/certificates/cert/document.pdf'))
      .rejects.toMatchObject({
        code: 'STORAGE_NOT_CONFIGURED',
        statusCode: 500,
      } satisfies Partial<CertificateDocumentStorageError>);
  });
});