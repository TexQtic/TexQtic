import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicies() {
  const policies = await prisma.$queryRaw<Array<{ policyname: string; cmd: string }>>`
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'catalog_items'
    ORDER BY policyname
  `;

  console.log('Policies on catalog_items:');
  console.log(JSON.stringify(policies, null, 2));

  await prisma.$disconnect();
}

checkPolicies();
