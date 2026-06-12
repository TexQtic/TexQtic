import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { config } from '../../config/index.js';

export const MAX_CATALOG_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_TO_EXTENSION: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FILE_TYPE_EXTENSION_TO_MIME: Record<string, keyof typeof MIME_TO_EXTENSION> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export type CatalogImageUploadErrorCode =
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'STORAGE_NOT_CONFIGURED'
  | 'UPLOAD_FAILED';

export class CatalogImageUploadError extends Error {
  readonly code: CatalogImageUploadErrorCode;
  readonly statusCode: number;

  constructor(code: CatalogImageUploadErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'CatalogImageUploadError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface UploadCatalogImageInput {
  orgId: string;
  fileBuffer: Buffer;
}

function sanitizeOrgPathSegment(orgId: string): string {
  // Defensive normalization even though orgId comes from authenticated tenant context.
  return orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resolveExtensionForMime(mimeType: keyof typeof MIME_TO_EXTENSION): string {
  return MIME_TO_EXTENSION[mimeType];
}

function ensureStorageConfigured(): {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
} {
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = config.CATALOG_IMAGE_BUCKET;

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new CatalogImageUploadError(
      'STORAGE_NOT_CONFIGURED',
      'Catalog image storage is not configured.',
      500,
    );
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

function sanitizeUploadFailureReason(err: unknown): string {
  if (err instanceof CatalogImageUploadError) {
    return err.message;
  }
  return 'Catalog image upload failed.';
}

export async function validateCatalogImageBuffer(
  fileBuffer: Buffer,
  declaredMimeType?: string,
): Promise<keyof typeof MIME_TO_EXTENSION> {
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new CatalogImageUploadError('FILE_REQUIRED', 'A file is required.', 400);
  }

  if (fileBuffer.byteLength > MAX_CATALOG_IMAGE_BYTES) {
    throw new CatalogImageUploadError(
      'FILE_TOO_LARGE',
      'File exceeds 5 MB upload limit.',
      400,
    );
  }

  const detectedType = await fileTypeFromBuffer(fileBuffer);
  if (!detectedType) {
    throw new CatalogImageUploadError('INVALID_FILE_TYPE', 'Only JPG, PNG, and WEBP files are allowed.', 400);
  }

  const normalizedDetectedMime = FILE_TYPE_EXTENSION_TO_MIME[detectedType.ext];
  if (!normalizedDetectedMime || !ALLOWED_IMAGE_MIME_TYPES.has(normalizedDetectedMime)) {
    throw new CatalogImageUploadError('INVALID_FILE_TYPE', 'Only JPG, PNG, and WEBP files are allowed.', 400);
  }

  if (declaredMimeType && declaredMimeType !== normalizedDetectedMime) {
    throw new CatalogImageUploadError('INVALID_FILE_TYPE', 'Image type does not match file content.', 400);
  }

  return normalizedDetectedMime;
}

export async function uploadCatalogImageToStorage(
  input: UploadCatalogImageInput,
): Promise<{ imageUrl: string }> {
  const { supabaseUrl, serviceRoleKey, bucket } = ensureStorageConfigured();

  const validatedMimeType = await validateCatalogImageBuffer(input.fileBuffer);
  const extension = resolveExtensionForMime(validatedMimeType);
  const orgSegment = sanitizeOrgPathSegment(input.orgId);
  const filePath = `${orgSegment}/${randomUUID()}.${extension}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.storage.from(bucket).upload(filePath, input.fileBuffer, {
    upsert: false,
    contentType: validatedMimeType,
    cacheControl: '3600',
  });

  if (error) {
    throw new CatalogImageUploadError('UPLOAD_FAILED', sanitizeUploadFailureReason(error), 500);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new CatalogImageUploadError('UPLOAD_FAILED', 'Catalog image upload failed.', 500);
  }

  return { imageUrl: data.publicUrl };
}
