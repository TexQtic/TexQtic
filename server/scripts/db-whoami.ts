/**
 * DB Identity Probe (Prompt #18)
 *
 * Prints the exact DB identity (server IP/port, database, user, timestamp)
 * to prove which database is being queried (remote Supabase vs local).
 *
 * Usage: npx tsx scripts/db-whoami.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DbIdentity {
  server_ip: string;
  server_port: number;
  db: string;
  user: string;
  now: Date;
}

async function main() {
  try {
    const result = await prisma.$queryRaw<DbIdentity[]>`
      select
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        current_database() as db,
        current_user as user,
        now() as now
    `;

    if (!result || result.length === 0) {
      throw new Error('No result from DB identity query');
    }

    const identity = result[0];

    // Output single JSON line with prefix (easy to grep)
    console.log(
      'DB_WHOAMI',
      JSON.stringify({
        server_ip: identity.server_ip,
        server_port: identity.server_port,
        db: identity.db,
        user: identity.user,
        now: identity.now,
      })
    );

    await prisma.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('DB_WHOAMI_ERROR', err.message || String(err));
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
