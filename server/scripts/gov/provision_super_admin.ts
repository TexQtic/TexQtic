/**
 * G-CP-ADMIN-001 — Super Admin Provisioning
 *
 * Creates or updates exactly one Super Admin row in public.admin_users.
 * Uses MIGRATION_DATABASE_URL (direct connection) so RLS bypass is not required.
 *
 * Usage (PowerShell):
 *   $env:MIGRATION_DATABASE_URL="postgres://..."
 *   $env:SUPERADMIN_EMAIL="admin@texqtic.com"  # optional, defaults to this value
 *   $env:SUPERADMIN_PASSWORD="..."             # required
 *   pnpm -C server exec tsx scripts/gov/provision_super_admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── 1. Read environment ──────────────────────────────────────────────────────

const MIGRATION_DATABASE_URL = process.env['MIGRATION_DATABASE_URL'];
const SUPERADMIN_EMAIL = (
  process.env['SUPERADMIN_EMAIL'] ?? 'admin@texqtic.com'
).toLowerCase();
const SUPERADMIN_PASSWORD = process.env['SUPERADMIN_PASSWORD'];

if (!MIGRATION_DATABASE_URL) {
  console.error('ERROR: MIGRATION_DATABASE_URL is required');
  process.exit(1);
}

if (!SUPERADMIN_PASSWORD) {
  console.error('ERROR: SUPERADMIN_PASSWORD is required');
  process.exit(1);
}

// ── 2. Hash password (bcryptjs, saltRounds=12 for admin realm) ───────────────

const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);

// ── 3. PrismaClient using MIGRATION_DATABASE_URL ─────────────────────────────

const prisma = new PrismaClient({
  datasources: {
    db: { url: MIGRATION_DATABASE_URL },
  },
});

// ── 4. Upsert the Super Admin row ─────────────────────────────────────────────

try {
  const admin = await prisma.adminUser.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      passwordHash,
      updatedAt: new Date(),
    },
    create: {
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log(
    `OK superadmin upserted: ${admin.email} role=${admin.role}`,
  );
} finally {
  await prisma.$disconnect();
}
