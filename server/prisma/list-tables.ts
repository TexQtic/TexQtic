import { prisma } from '../src/db/prisma.js';

const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY tablename
`;

console.log('\nTables in public schema:');
console.log(JSON.stringify(tables, null, 2));

process.exit(0);
