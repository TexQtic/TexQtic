/**
 * Apply Gate E Infrastructure Grants
 * 
 * Purpose: Apply SQL grants from gate-e-table-grants.sql to fix
 *          "permission denied for schema public" errors in E.3/E.4 tests.
 * 
 * Usage: pnpm tsx scripts/apply-gate-e-grants.ts
 * 
 * Safe: Idempotent grants (can be run multiple times)
 * No credentials embedded: Uses DATABASE_URL from env
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Applying Gate E infrastructure grants...');

  // Read SQL file
  const sqlPath = join(__dirname, '../prisma/gate-e-table-grants.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Split by semicolon and filter out comments/empty
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`   Found ${statements.length} SQL statements`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`   [${i + 1}/${statements.length}] Executing...`);
    
    try {
      const result = await prisma.$executeRawUnsafe(stmt);
      console.log(`   ✅ Success`);
    } catch (error: any) {
      // Ignore duplicate grant errors (idempotent)
      if (error.code === '42710') {
        console.log(`   ⏭️  Already exists (skipping)`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ Gate E grants applied successfully');
  console.log('   texqtic_app now has:');
  console.log('   - USAGE on schema public');
  console.log('   - SELECT/INSERT/UPDATE/DELETE on rate_limit_attempts');
  console.log('   - SELECT/INSERT/UPDATE/DELETE on refresh_tokens');
  console.log('   - USAGE/SELECT on all sequences');
}

main()
  .catch(e => {
    console.error('\n❌ Error applying grants:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
