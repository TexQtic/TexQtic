import { prisma } from '../src/db/prisma.js';

const policies = await prisma.$queryRaw<
  Array<{ polname: string; polcmd: string; polpermissive: string }>
>`
  SELECT polname, polcmd, polpermissive::text
  FROM pg_policy p 
  JOIN pg_class c ON p.polrelid = c.oid 
  WHERE c.relname = 'catalog_items' 
    AND polcmd = 'r'
  ORDER BY polname
`;

console.log('\nSELECT Policies on catalog_items:');
console.log(JSON.stringify(policies, null, 2));

const counts = await prisma.$queryRaw<Array<{ permissive: number; restrictive: number }>>`
  SELECT 
    COUNT(*) FILTER (WHERE polpermissive) as permissive,
    COUNT(*) FILTER (WHERE NOT polpermissive) as restrictive
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  WHERE c.relname = 'catalog_items' AND polcmd = 'r'
`;

console.log('\nPolicy counts:');
console.log(JSON.stringify(counts, null, 2));

process.exit(0);
