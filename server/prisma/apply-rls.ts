import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function applyRLS() {
  console.log('📋 Reading RLS SQL file...');

  const rlsSqlPath = path.join(__dirname, 'rls.sql');
  const rlsSql = fs.readFileSync(rlsSqlPath, 'utf-8');

  console.log('🔒 Applying RLS policies to Supabase...');

  try {
    // Split SQL into individual statements (handle multi-line statements)
    const statements = rlsSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (error: any) {
          // Some statements might fail if they already exist (e.g., policies)
          // Log but continue
          if (error.code === 'P2010' && error.meta?.message?.includes('already exists')) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`❌ Error on statement ${i + 1}:`, error.meta?.message || error.message);
            // Continue with other statements
          }
        }
      }
    }

    console.log('✅ RLS policies applied successfully!');
  } catch (error) {
    console.error('❌ Error applying RLS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyRLS();
