
import React from 'react';
import { TenantConfig } from '../types';

interface ShellProps {
  tenant: TenantConfig;
  children: React.ReactNode;
  onNavigateTeam?: () => void;
  onNavigateHome?: () => void;
}

export const AggregatorShell: React.FC<ShellProps> = ({ tenant, children, onNavigateTeam, onNavigateHome }) => (
  <div className="min-h-screen flex flex-col font-sans">
    <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <button type="button" className="flex items-center gap-2 text-xl font-bold cursor-pointer" onClick={onNavigateHome}>
          <span>{tenant.theme.logo}</span>
          <span>{tenant.name}</span>
        </button>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <button onClick={onNavigateHome} className="text-blue-400">Companies</button>
          <button type="button" className="hover:text-blue-400 transition">Certifications</button>
          <button onClick={onNavigateTeam} className="hover:text-blue-400 transition text-slate-300">Team</button>
        </nav>
        <button className="bg-blue-600 px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition">Post RFQ</button>
      </div>
    </header>
    <main className="flex-1 bg-slate-50 relative">{children}</main>
  </div>
);

export const B2BShell: React.FC<ShellProps> = ({ tenant, children, onNavigateTeam, onNavigateHome }) => (
  <div className="min-h-screen flex bg-slate-100 font-sans">
    <aside className="w-64 bg-slate-800 text-slate-300 hidden lg:flex flex-col p-6 sticky top-0 h-screen">
      <button type="button" className="flex items-center gap-2 text-white font-bold text-lg mb-8 cursor-pointer" onClick={onNavigateHome}>
        <span>{tenant.theme.logo}</span> {tenant.name}
      </button>
      <nav className="flex-1 space-y-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dashboard</div>
        <button onClick={onNavigateHome} className="w-full flex items-center gap-3 text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📦 Catalog</button>
        <button className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🤝 Negotiations</button>
        <button className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📄 Invoices</button>
        <button onClick={onNavigateTeam} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">👥 Members</button>
      </nav>
      <div className="mt-auto pt-6 border-t border-slate-700 text-[10px] text-slate-500 font-mono">
        v2.4.0 • Enterprise
      </div>
    </aside>
    <div className="flex-1 flex flex-col relative">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-10">
        <h2 className="font-semibold text-slate-600">Enterprise Management</h2>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">Alex Rivera</div>
            <div className="text-[10px] text-slate-500 uppercase">Administrator</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300"></div>
        </div>
      </header>
      <main className="p-8 flex-1">{children}</main>
    </div>
  </div>
);

export const B2CShell: React.FC<ShellProps> = ({ tenant, children, onNavigateTeam, onNavigateHome }) => (
  <div className="min-h-screen bg-white font-sans">
    <div className="bg-indigo-600 text-white text-center py-2 text-[10px] font-bold uppercase tracking-widest">
      Free worldwide shipping on orders over $500
    </div>
    <header className="border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
        <button type="button" className="text-2xl font-black text-indigo-600 tracking-tight flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
           {tenant.theme.logo} {tenant.name}
        </button>
        <div className="flex-1 max-w-md mx-8">
          <input title="search" type="text" placeholder="Search our collection..." className="w-full bg-slate-100 border-none rounded-full px-6 py-2.5 focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <div className="flex gap-6 items-center">
          <button onClick={onNavigateTeam} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Team</button>
          <div className="relative cursor-pointer">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">3</span>
          </div>
        </div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto p-6 relative">{children}</main>
  </div>
);

export const WhiteLabelShell: React.FC<ShellProps> = ({ tenant, children, onNavigateTeam, onNavigateHome }) => (
  <div className="min-h-screen font-sans" style={{ backgroundColor: '#ffffff' }}>
     <header className="p-12 text-center" style={{ borderBottom: `1px solid #eee` }}>
       <button type="button" className="text-5xl font-serif italic mb-2 cursor-pointer transition-opacity hover:opacity-80" style={{ color: tenant.theme.primaryColor }} onClick={onNavigateHome}>
         {tenant.name}
       </button>
       <div className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">Maison de Commerce</div>
     </header>
     <nav className="flex justify-center gap-12 py-6 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <button onClick={onNavigateHome} className="hover:opacity-40 transition-opacity">Portfolio</button>
        <button onClick={onNavigateTeam} className="hover:opacity-40 transition-opacity">Access Control</button>
        <button className="hover:opacity-40 transition-opacity underline decoration-rose-500 underline-offset-4">Collections</button>
        <button className="hover:opacity-40 transition-opacity">The Journal</button>
     </nav>
     <main className="max-w-screen-xl mx-auto py-12 px-6 relative">
       {children}
     </main>
  </div>
);
