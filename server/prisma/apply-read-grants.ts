import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

// Use MIGRATION_DATABASE_URL (postgres owner) for granting privileges
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function grantReadAccess() {
  console.log('Granting SELECT on control-plane tables to app_user...\n');

  try {
    const sql = readFileSync('prisma/grant-read-control-plane.sql', 'utf-8');
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await prisma.$executeRawUnsafe(trimmed);
      }
    }

    console.log('✅ Successfully granted SELECT on control-plane tables');
    console.log('   - public.tenants');
    console.log('   - public.users');
    console.log('   - public.admin_users\n');

    // Verify
    console.log('Verifying privileges...');
    const privileges = await prisma.$queryRaw<any[]>`
      SELECT 
        table_name,
        string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
      FROM information_schema.table_privileges
      WHERE grantee = 'app_user' 
        AND table_schema = 'public'
        AND table_name IN ('tenants', 'users', 'admin_users')
      GROUP BY table_name
      ORDER BY table_name
    `;

    console.log('\nApp_user privileges on control-plane tables:');
    privileges.forEach(row => {
      console.log(`  ${row.table_name}: ${row.privileges}`);
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to grant privileges:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

grantReadAccess();
