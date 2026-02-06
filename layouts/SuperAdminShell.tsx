
import React from 'react';

export type AdminView = 
  | 'TENANTS' 
  | 'FLAGS' 
  | 'FINANCE' 
  | 'COMPLIANCE' 
  | 'CASES' 
  | 'AI' 
  | 'LOGS' 
  | 'HEALTH' 
  | 'RBAC' 
  | 'API_DOCS' 
  | 'DATA_MODEL'
  | 'BLUEPRINTS'
  | 'EVENTS'
  | 'BACKEND_SKELETON'
  | 'MIDDLEWARE';

interface SuperAdminShellProps {
  children: React.ReactNode;
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
}

export const SuperAdminShell: React.FC<SuperAdminShellProps> = ({ children, activeView, onViewChange }) => (
  <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="bg-rose-600 text-white font-black px-2 py-0.5 rounded text-xs tracking-tighter uppercase">Control Plane</div>
        <div className="h-4 w-px bg-slate-700"></div>
        <div className="font-bold text-slate-100 flex items-center gap-2">
          <span>🛡️</span> OmniPlatform
        </div>
      </div>
      <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Platform: Operational
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded">
          sjones@omni.com <span className="text-rose-500 ml-2">(SuperAdmin)</span>
        </div>
      </div>
    </header>
    <div className="flex flex-1">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/30 hidden md:flex flex-col p-4 sticky top-14 h-[calc(100vh-3.5rem)]">
        <nav className="space-y-0.5 overflow-y-auto pr-2 custom-scrollbar">
          <SectionTitle>Governance</SectionTitle>
          <NavLink active={activeView === 'TENANTS'} onClick={() => onViewChange('TENANTS')} icon="🏢" label="Tenants" />
          <NavLink active={activeView === 'FLAGS'} onClick={() => onViewChange('FLAGS')} icon="🚩" label="Feature Flags" />
          <NavLink active={activeView === 'FINANCE'} onClick={() => onViewChange('FINANCE')} icon="💰" label="Finance & Fees" />
          
          <SectionTitle>Risk & Compliance</SectionTitle>
          <NavLink active={activeView === 'COMPLIANCE'} onClick={() => onViewChange('COMPLIANCE')} icon="✅" label="Certifications" />
          <NavLink active={activeView === 'CASES'} onClick={() => onViewChange('CASES')} icon="⚠️" label="Disputes" />
          <NavLink active={activeView === 'AI'} onClick={() => onViewChange('AI')} icon="🤖" label="AI Governance" />
          
          <SectionTitle>Architecture & Specs</SectionTitle>
          <NavLink active={activeView === 'BLUEPRINTS'} onClick={() => onViewChange('BLUEPRINTS')} icon="📐" label="Platform Blueprints" />
          <NavLink active={activeView === 'BACKEND_SKELETON'} onClick={() => onViewChange('BACKEND_SKELETON')} icon="🏗️" label="Domain Skeletons" />
          <NavLink active={activeView === 'MIDDLEWARE'} onClick={() => onViewChange('MIDDLEWARE')} icon="🧬" label="Middleware Logic" />
          <NavLink active={activeView === 'API_DOCS'} onClick={() => onViewChange('API_DOCS')} icon="🔌" label="API Contracts" />
          <NavLink active={activeView === 'DATA_MODEL'} onClick={() => onViewChange('DATA_MODEL')} icon="🗄️" label="Data Schema" />
          
          <SectionTitle>Infrastructure</SectionTitle>
          <NavLink active={activeView === 'EVENTS'} onClick={() => onViewChange('EVENTS')} icon="⚡" label="Live Event Stream" />
          <NavLink active={activeView === 'LOGS'} onClick={() => onViewChange('LOGS')} icon="📜" label="Audit Logs" />
          <NavLink active={activeView === 'RBAC'} onClick={() => onViewChange('RBAC')} icon="⚙️" label="Access Control" />
          <NavLink active={activeView === 'HEALTH'} onClick={() => onViewChange('HEALTH')} icon="❤️" label="Health Status" />
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-[#020617] overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest py-3 px-3">{children}</div>
);

const NavLink = ({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left ${active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
  >
    <span className="grayscale opacity-50">{icon}</span>
    <span>{label}</span>
  </button>
);
