import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const DB_CONTEXT_PATH = path.join(SERVER_ROOT, 'src/lib/database-context.ts');

describe('FAM-07E5O - safe handoff consent persistence transaction remediation', () => {
  let tenantSource: string;
  let dbContextSource: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH)).toBe(true);
    expect(fs.existsSync(DB_CONTEXT_PATH)).toBe(true);

    tenantSource = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    dbContextSource = fs.readFileSync(DB_CONTEXT_PATH, 'utf-8');
  });

  it('withDbContext supports bounded transaction options', () => {
    expect(dbContextSource).toContain('export interface DbContextTransactionOptions');
    expect(dbContextSource).toContain('txOptions?: DbContextTransactionOptions');
    expect(dbContextSource).toContain('maxWait: txOptions?.maxWaitMs');
    expect(dbContextSource).toContain('timeout: txOptions?.timeoutMs');
  });

  it('safe handoff defines bounded tx options and passes them into withDbContext', () => {
    const fnStart = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {');
    expect(fnStart).toBeGreaterThan(-1);

    const fnEnd = tenantSource.indexOf('function makeTxBoundPrisma', fnStart);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const handoffBlock = tenantSource.slice(fnStart, fnEnd);

    expect(tenantSource).toContain('const SAFE_HANDOFF_TX_OPTIONS: DbContextTransactionOptions = {');
    expect(tenantSource).toContain('timeoutMs: 20_000');
    expect(tenantSource).toContain('maxWaitMs: 5_000');
    expect(handoffBlock).toContain('SAFE_HANDOFF_TX_OPTIONS');
    expect(handoffBlock).toContain('}, SAFE_HANDOFF_TX_OPTIONS);');
  });

  it('safe handoff computes bootstrap password hash outside transaction callback', () => {
    const fnStart = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {');
    const fnEnd = tenantSource.indexOf('function makeTxBoundPrisma', fnStart);
    const handoffBlock = tenantSource.slice(fnStart, fnEnd);

    const idxHash = handoffBlock.indexOf('const bootstrapPasswordHash = await bcrypt.hash(randomUUID(), 10);');
    const idxWithDb = handoffBlock.indexOf('const processed = await withDbContext(prisma, dbContext, async tx => {');
    const idxCreateUsesHash = handoffBlock.indexOf('passwordHash: bootstrapPasswordHash');

    expect(idxHash).toBeGreaterThan(-1);
    expect(idxWithDb).toBeGreaterThan(-1);
    expect(idxCreateUsesHash).toBeGreaterThan(-1);
    expect(idxHash).toBeLessThan(idxWithDb);
    expect(idxCreateUsesHash).toBeGreaterThan(idxWithDb);

    // Ensure we did not leave hashing inside the transaction body.
    const txBodyStart = idxWithDb;
    const txBodyEnd = handoffBlock.indexOf('}, SAFE_HANDOFF_TX_OPTIONS);', txBodyStart);
    expect(txBodyEnd).toBeGreaterThan(txBodyStart);

    const txBody = handoffBlock.slice(txBodyStart, txBodyEnd);
    expect(txBody).not.toContain('await bcrypt.hash(randomUUID(), 10)');
  });

  it('consent snapshot and event writes remain on the transaction client', () => {
    const helperStart = tenantSource.indexOf('async function recordLegalPendingConsentScaffold(input: {');
    const helperEnd = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {', helperStart);
    const helperBlock = tenantSource.slice(helperStart, helperEnd);

    expect(helperBlock).toContain('input.tx.legalConsentSnapshot.upsert');
    expect(helperBlock).toContain('input.tx.legalConsentEvent.create');
    expect(helperBlock).not.toContain('prisma.legalConsentEvent.create');
  });
});
