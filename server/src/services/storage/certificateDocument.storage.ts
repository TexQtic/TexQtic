import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { config } from '../../config/index.js';

export const MAX_CERTIFICATE_DOCUMENT_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, 'pdf' | 'jpg' | 'png' | 'webp'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FILE_TYPE_EXTENSION_TO_MIME: Record<string, keyof typeof MIME_TO_EXTENSION> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function normalizeDeclaredMimeType(mimeType?: string): string | null {
  if (!mimeType) return null;
  const normalized = mimeType.split(';', 1)[0]?.trim().toLowerCase();
  return normalized || null;
}

export type CertificateDocumentErrorCode =
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'STORAGE_NOT_CONFIGURED'
  | 'UPLOAD_FAILED'
  | 'SIGNED_URL_FAILED'
  | 'DELETE_FAILED';

export class CertificateDocumentStorageError extends Error {
  readonly code: CertificateDocumentErrorCode;
  readonly statusCode: number;

  constructor(code: CertificateDocumentErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'CertificateDocumentStorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface UploadCertificateDocumentInput {
  orgId: string;
  certificationId: string;
  fileBuffer: Buffer;
  declaredMimeType?: string;
  originalFilename?: string;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeOriginalFilename(filename?: string): string | null {
  if (!filename) return null;
  const baseName = filename.split(/[\\/]/).pop()?.trim();
  if (!baseName) return null;
  return baseName.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 255);
}

function ensureStorageConfigured(): {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
} {
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = config.CERTIFICATE_DOCUMENT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new CertificateDocumentStorageError(
      'STORAGE_NOT_CONFIGURED',
      'Certificate document storage is not configured.',
      500,
    );
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

function createStorageClient() {
  const { supabaseUrl, serviceRoleKey, bucket } = ensureStorageConfigured();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { supabase, bucket };
}

export async function validateCertificateDocumentBuffer(
  fileBuffer: Buffer,
  declaredMimeType?: string,
): Promise<keyof typeof MIME_TO_EXTENSION> {
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new CertificateDocumentStorageError('FILE_REQUIRED', 'A certificate document file is required.', 400);
  }

  if (fileBuffer.byteLength > MAX_CERTIFICATE_DOCUMENT_BYTES) {
    throw new CertificateDocumentStorageError(
      'FILE_TOO_LARGE',
      'File exceeds 5 MB upload limit.',
      400,
    );
  }

  const detectedType = await fileTypeFromBuffer(fileBuffer);
  if (!detectedType) {
    throw new CertificateDocumentStorageError(
      'INVALID_FILE_TYPE',
      'Only PDF, JPG, PNG, and WEBP certificate documents are allowed.',
      400,
    );
  }

  const normalizedDetectedMime = FILE_TYPE_EXTENSION_TO_MIME[detectedType.ext];
  if (!normalizedDetectedMime || !(normalizedDetectedMime in MIME_TO_EXTENSION)) {
    throw new CertificateDocumentStorageError(
      'INVALID_FILE_TYPE',
      'Only PDF, JPG, PNG, and WEBP certificate documents are allowed.',
      400,
    );
  }

  const normalizedDeclaredMimeType = normalizeDeclaredMimeType(declaredMimeType);
  if (normalizedDeclaredMimeType && normalizedDeclaredMimeType !== normalizedDetectedMime) {
    throw new CertificateDocumentStorageError('INVALID_FILE_TYPE', 'Document type does not match file content.', 400);
  }

  return normalizedDetectedMime;
}

export async function uploadCertificateDocumentToStorage(
  input: UploadCertificateDocumentInput,
): Promise<{
  storagePath: string;
  originalName: string | null;
  mimeType: keyof typeof MIME_TO_EXTENSION;
  sizeBytes: number;
}> {
  const { supabase, bucket } = createStorageClient();
  const validatedMimeType = await validateCertificateDocumentBuffer(input.fileBuffer, input.declaredMimeType);
  const extension = MIME_TO_EXTENSION[validatedMimeType];
  const orgSegment = sanitizePathSegment(input.orgId);
  const certSegment = sanitizePathSegment(input.certificationId);
  const storagePath = `${orgSegment}/certificates/${certSegment}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(storagePath, input.fileBuffer, {
    upsert: false,
    contentType: validatedMimeType,
    cacheControl: '0',
  });

  if (error) {
    throw new CertificateDocumentStorageError('UPLOAD_FAILED', 'Certificate document upload failed.', 500);
  }

  return {
    storagePath,
    originalName: sanitizeOriginalFilename(input.originalFilename),
    mimeType: validatedMimeType,
    sizeBytes: input.fileBuffer.byteLength,
  };
}

export async function createCertificateDocumentSignedUrl(
  storagePath: string,
): Promise<{ signedUrl: string }> {
  const { supabase, bucket } = createStorageClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 300);

  if (error || !data?.signedUrl) {
    throw new CertificateDocumentStorageError('SIGNED_URL_FAILED', 'Certificate document access failed.', 500);
  }

  return { signedUrl: data.signedUrl };
}

function isStorageObjectMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { statusCode?: number | string; status?: number | string; message?: string };
  const status = String(maybeError.statusCode ?? maybeError.status ?? '');
  return status === '404' || maybeError.message?.toLowerCase().includes('not found') === true;
}

export async function deleteCertificateDocumentFromStorage(storagePath: string): Promise<void> {
  const { supabase, bucket } = createStorageClient();
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error && !isStorageObjectMissingError(error)) {
    throw new CertificateDocumentStorageError('DELETE_FAILED', 'Certificate document delete failed.', 500);
  }
}
