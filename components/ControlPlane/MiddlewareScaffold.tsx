
import React from 'react';

export const MiddlewareScaffold: React.FC = () => {
  const codeSnippet = `
// Middleware: Tenant Resolution & Realm Security
export async function middleware(req: Request) {
  const hostname = req.headers.get('host');
  const path = new URL(req.url).pathname;

  // 1. Resolve Tenant from Hostname or Path
  // Example: 'boutique.texqtic.com' -> 't4'
  const tenant = await resolveTenant(hostname, path);
  
  // 2. Security Realm Check
  if (path.startsWith('/admin')) {
    // Platform Staff Realm
    const user = await getPlatformUser(req);
    if (!user?.isPlatformStaff) {
      return new Response('Unauthorized Platform Access', { status: 403 });
    }
  } else {
    // Tenant Realm
    const user = await getTenantUser(req, tenant.id);
    if (!user) {
      return new Response('Unauthorized Tenant Access', { status: 401 });
    }
    
    // 3. Inject Tenant Context for RLS
    req.headers.set('x-tenant-id', tenant.id);
  }

  return NextResponse.next();
}
  `.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Middleware & Routing</h1>
        <p className="text-slate-400 text-sm">Edge-side tenant resolution and security realm logic.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono">
        <div className="bg-slate-800/50 p-4 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          src/middleware.ts
        </div>
        <pre className="p-6 text-[11px] text-blue-400 leading-relaxed overflow-x-auto whitespace-pre">
          {codeSnippet}
        </pre>
      </div>
    </div>
  );
};
