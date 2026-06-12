import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { config } from '../../config/index.js';

export const MAX_TENANT_LOGO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_TENANT_LOGO_MIME_TYPES = new Set([
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

export type TenantLogoUploadErrorCode =
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'STORAGE_NOT_CONFIGURED'
  | 'UPLOAD_FAILED';

export class TenantLogoUploadError extends Error {
  readonly code: TenantLogoUploadErrorCode;
  readonly statusCode: number;

  constructor(code: TenantLogoUploadErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'TenantLogoUploadError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface UploadTenantLogoInput {
  orgId: string;
  fileBuffer: Buffer;
}

function sanitizeOrgPathSegment(orgId: string): string {
  // Defensive normalization even though orgId comes from authenticated tenant context.
  return orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
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
    throw new TenantLogoUploadError(
      'STORAGE_NOT_CONFIGURED',
      'Tenant logo storage is not configured.',
      500,
    );
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

export async function validateTenantLogoBuffer(
  fileBuffer: Buffer,
  declaredMimeType?: string,
): Promise<keyof typeof MIME_TO_EXTENSION> {
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new TenantLogoUploadError('FILE_REQUIRED', 'A logo file is required.', 400);
  }

  if (fileBuffer.byteLength > MAX_TENANT_LOGO_BYTES) {
    throw new TenantLogoUploadError(
      'FILE_TOO_LARGE',
      'File exceeds 2 MB upload limit.',
      400,
    );
  }

  const detectedType = await fileTypeFromBuffer(fileBuffer);
  if (!detectedType) {
    throw new TenantLogoUploadError('INVALID_FILE_TYPE', 'Only JPG, PNG, and WEBP files are allowed.', 400);
  }

  const normalizedDetectedMime = FILE_TYPE_EXTENSION_TO_MIME[detectedType.ext];
  if (!normalizedDetectedMime || !ALLOWED_TENANT_LOGO_MIME_TYPES.has(normalizedDetectedMime)) {
    throw new TenantLogoUploadError('INVALID_FILE_TYPE', 'Only JPG, PNG, and WEBP files are allowed.', 400);
  }

  if (declaredMimeType && declaredMimeType !== normalizedDetectedMime) {
    throw new TenantLogoUploadError('INVALID_FILE_TYPE', 'Image type does not match file content.', 400);
  }

  return normalizedDetectedMime;
}

export async function uploadTenantLogoToStorage(
  input: UploadTenantLogoInput,
): Promise<{ logoUrl: string }> {
  const { supabaseUrl, serviceRoleKey, bucket } = ensureStorageConfigured();

  const validatedMimeType = await validateTenantLogoBuffer(input.fileBuffer);
  const extension = MIME_TO_EXTENSION[validatedMimeType];
  const orgSegment = sanitizeOrgPathSegment(input.orgId);
  const filePath = `${orgSegment}/logo/${randomUUID()}.${extension}`;

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
    throw new TenantLogoUploadError('UPLOAD_FAILED', 'Tenant logo upload failed.', 500);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new TenantLogoUploadError('UPLOAD_FAILED', 'Tenant logo upload failed.', 500);
  }

  return { logoUrl: data.publicUrl };
}
