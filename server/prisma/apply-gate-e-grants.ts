import { prisma } from '../src/db/prisma.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyGrants() {
  const sqlPath = join(__dirname, 'gate-e-table-grants.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Applying Gate E table grants...\n');

  try {
    // Strip comments and split into statements
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove comment lines
      .join('\n')
      .trim();

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('select')) {
        // Verification query - show results
        const result = await prisma.$queryRawUnsafe(statement + ';');
        console.log('\nVerification results:');
        console.table(result);
      } else {
        // Grant statement - execute
        await prisma.$executeRawUnsafe(statement + ';');
        const preview = statement.substring(0, 70).replace(/\s+/g, ' ');
        console.log('✅', preview + '...');
      }
    }

    console.log('\n✅ Gate E table grants applied successfully');
  } catch (error) {
    console.error('\n❌ Error applying grants:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyGrants();
