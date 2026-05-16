import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OPENAPI_PATH = resolve(__dirname, '../../../shared/contracts/openapi.control-plane.json');

describe('OpenAPI WEBHOOK-007 contract', () => {
  it('WEBHOOK-OA-001: endpoint is documented', () => {
    const spec = JSON.parse(readFileSync(OPENAPI_PATH, 'utf8')) as Record<string, unknown>;
    const paths = spec.paths as Record<string, unknown>;

    expect(paths).toHaveProperty('/api/internal/acquisition/provision-supplier');
  });

  it('WEBHOOK-OA-002: HMAC headers are documented', () => {
    const spec = JSON.parse(readFileSync(OPENAPI_PATH, 'utf8')) as {
      paths: Record<string, { post?: { parameters?: Array<{ name: string }> } }>;
    };

    const post = spec.paths['/api/internal/acquisition/provision-supplier']?.post;
    const names = (post?.parameters ?? []).map(param => param.name);

    expect(names).toContain('x-texqtic-provisioning-hmac');
    expect(names).toContain('x-texqtic-provisioning-ts');
  });

  it('WEBHOOK-OA-003: response cases are documented', () => {
    const spec = JSON.parse(readFileSync(OPENAPI_PATH, 'utf8')) as {
      paths: Record<string, { post?: { responses?: Record<string, unknown> } }>;
    };

    const responses =
      spec.paths['/api/internal/acquisition/provision-supplier']?.post?.responses ?? {};

    expect(responses).toHaveProperty('200');
    expect(responses).toHaveProperty('201');
    expect(responses).toHaveProperty('202');
    expect(responses).toHaveProperty('400');
    expect(responses).toHaveProperty('401');
    expect(responses).toHaveProperty('409');
    expect(responses).toHaveProperty('500');
  });
});
