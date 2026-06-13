import { describe, expect, it } from 'vitest';
import {
  CertificateDocumentStorageError,
  MAX_CERTIFICATE_DOCUMENT_BYTES,
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
});