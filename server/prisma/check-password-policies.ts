import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPasswordResetPolicies() {
  try {
    const policies = await prisma.$queryRaw`
      SELECT 
        pol.polname as policy_name,
        pol.polcmd as command
      FROM pg_policy pol
      JOIN pg_class c ON pol.polrelid = c.oid
      WHERE c.relname = 'password_reset_tokens'
      ORDER BY pol.polname
    `;
    
    console.log('Policies on password_reset_tokens:');
    console.log(policies);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswordResetPolicies().catch(console.error);
