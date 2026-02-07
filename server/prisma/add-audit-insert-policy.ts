#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating audit_logs INSERT policy...');
  await prisma.$executeRawUnsafe('DROP POLICY IF EXISTS audit_logs_insert ON audit_logs');
  await prisma.$executeRawUnsafe(
    'CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true)'
  );
  console.log('✅ audit_logs_insert policy created');
}

main()
  .then(() => prisma.$disconnect())
  .catch(error => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
