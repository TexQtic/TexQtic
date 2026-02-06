import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableMissingRls() {
  console.log('Enabling RLS on missing tables...\n');

  try {
    // Enable RLS on _prisma_migrations
    console.log('Enabling RLS on _prisma_migrations...');
    await prisma.$executeRawUnsafe('ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY');
    console.log('✅ _prisma_migrations: RLS enabled');

    // Enable RLS on tenants
    console.log('Enabling RLS on tenants...');
    await prisma.$executeRawUnsafe('ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY');
    console.log('✅ tenants: RLS enabled');

    console.log('\n✅ All tables now have RLS enabled!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

enableMissingRls().catch(console.error);
