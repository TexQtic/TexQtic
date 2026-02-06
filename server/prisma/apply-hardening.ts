import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyHardeningPatch() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║         APPLYING SUPABASE SECURITY HARDENING PATCH                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'supabase_hardening.sql');
    console.log(`📄 Reading SQL patch from: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split into individual statements
    // We need to handle multi-line statements carefully
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => 
        s.length > 0 && 
        !s.startsWith('--') && 
        s !== 'BEGIN' && 
        s !== 'COMMIT' &&
        !s.match(/^━+$/)  // Skip separator lines
      );

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty or comment-only statements
      if (!statement || statement.trim().length === 0) {
        continue;
      }

      // Extract a short description for logging
      const firstLine = statement.split('\n')[0].substring(0, 80);
      const statementNum = i + 1;

      try {
        console.log(`[${statementNum}/${statements.length}] Executing: ${firstLine}...`);
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(`   ✅ Success`);
      } catch (error: any) {
        // Some errors are expected (e.g., "already exists", "does not exist")
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('no privileges could be revoked')
        ) {
          skipCount++;
          console.log(`   ⏭️  Skipped (already applied): ${error.message?.split('\n')[0]}`);
        } else {
          errorCount++;
          console.log(`   ❌ Error: ${error.message?.split('\n')[0]}`);
          // Continue with other statements - don't fail immediately
        }
      }
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      EXECUTION SUMMARY                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    console.log(`Total statements:  ${statements.length}`);
    console.log(`✅ Success:         ${successCount}`);
    console.log(`⏭️  Skipped:         ${skipCount}`);
    console.log(`❌ Errors:          ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Review errors above.');
      console.log('    Most errors are expected for idempotent scripts.');
      process.exit(1);
    } else {
      console.log('\n✅ Hardening patch applied successfully!\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Fatal error applying hardening patch:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyHardeningPatch().catch(console.error);
