import { prisma } from '../src/db/prisma.js';

const policy = await prisma.$queryRaw<Array<{ polname: string; using_clause: string }>>`
  SELECT 
    polname, 
    pg_get_expr(polqual, polrelid) as using_clause
  FROM pg_policy p 
  JOIN pg_class c ON p.polrelid = c.oid 
  WHERE c.relname = 'catalog_items' 
    AND polname = 'catalog_items_guard'
`;

console.log('\ncatalog_items_guard USING clause:');
console.log(JSON.stringify(policy, null, 2));

process.exit(0);
