import React, { useState, useEffect, useMemo } from 'react';
import { PLATFORM_TENANTS, EXAMPLE_PRODUCTS } from './constants';
import { TenantType, TenantConfig, ImpersonationState } from './types';
import { AggregatorShell, B2BShell, B2CShell, WhiteLabelShell } from './layouts/Shells';
import { SuperAdminShell, AdminView } from './layouts/SuperAdminShell';
import { AuthForm } from './components/Auth/AuthFlows';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { VerifyEmail } from './components/Auth/VerifyEmail';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { TeamManagement } from './components/Tenant/TeamManagement';
import { InviteMemberForm } from './components/Tenant/InviteMemberForm';
import { WhiteLabelSettings } from './components/Tenant/WhiteLabelSettings';
import { TenantRegistry } from './components/ControlPlane/TenantRegistry';
import { TenantDetails } from './components/ControlPlane/TenantDetails';
import { AuditLogs } from './components/ControlPlane/AuditLogs';
import { FinanceOps } from './components/ControlPlane/FinanceOps';
import { AiGovernance } from './components/ControlPlane/AiGovernance';
import { SystemHealth } from './components/ControlPlane/SystemHealth';
import { FeatureFlags } from './components/ControlPlane/FeatureFlags';
import { ComplianceQueue } from './components/ControlPlane/ComplianceQueue';
import { DisputeCases } from './components/ControlPlane/DisputeCases';
import { AdminRBAC } from './components/ControlPlane/AdminRBAC';
import { ApiDocs } from './components/ControlPlane/ApiDocs';
import { DataModel } from './components/ControlPlane/DataModel';
import { ArchitectureBlueprints } from './components/ControlPlane/ArchitectureBlueprints';
import { EventStream } from './components/ControlPlane/EventStream';
import { BackendSkeleton } from './components/ControlPlane/BackendSkeleton';
import { MiddlewareScaffold } from './components/ControlPlane/MiddlewareScaffold';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import { getPlatformInsights } from './services/aiService';

const App: React.FC = () => {
  // Production-grade State Machine
  const [appState, setAppState] = useState<'AUTH' | 'FORGOT_PASSWORD' | 'VERIFY_EMAIL' | 'ONBOARDING' | 'EXPERIENCE' | 'TEAM_MGMT' | 'INVITE_MEMBER' | 'SETTINGS' | 'CONTROL_PLANE'>('AUTH');
  const [authRealm, setAuthRealm] = useState<'TENANT' | 'CONTROL_PLANE'>('TENANT');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  const [currentTenantKey, setCurrentTenantKey] = useState<string>('global-aggregator');
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isAdmin: false,
    targetTenantId: null,
    startTime: null,
  });
  
  const [aiInsight, setAiInsight] = useState<string>('Loading AI insights...');
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [adminView, setAdminView] = useState<AdminView>('TENANTS');

  const currentTenant = useMemo(() => PLATFORM_TENANTS[currentTenantKey], [currentTenantKey]);

  useEffect(() => {
    if (appState === 'EXPERIENCE' || appState === 'SETTINGS') {
      const fetchInsight = async () => {
        setAiInsight('Thinking...');
        const insight = await getPlatformInsights(`Provide a brief market trend analysis for a ${currentTenant.type} platform named ${currentTenant.name}.`);
        setAiInsight(insight || 'No insights available.');
      };
      fetchInsight();
    }
  }, [currentTenant, appState]);

  const handleAuthSuccess = () => {
    if (authRealm === 'CONTROL_PLANE') {
      setAppState('CONTROL_PLANE');
    } else if (authMode === 'SIGNUP') {
      setAppState('VERIFY_EMAIL');
    } else {
      setAppState('EXPERIENCE');
    }
  };

  const handleImpersonate = (tenant: TenantConfig) => {
    const key = Object.keys(PLATFORM_TENANTS).find(k => PLATFORM_TENANTS[k].id === tenant.id);
    if (key) {
      setCurrentTenantKey(key);
      setImpersonation({
        isAdmin: true,
        targetTenantId: tenant.id,
        startTime: new Date().toISOString(),
      });
      setAppState('EXPERIENCE');
    }
  };

  const handleExitImpersonation = () => {
    setImpersonation({ isAdmin: false, targetTenantId: null, startTime: null });
    setAppState('CONTROL_PLANE');
  };

  const renderExperienceContent = () => {
    if (appState === 'TEAM_MGMT') return <TeamManagement />;
    if (appState === 'INVITE_MEMBER') return <InviteMemberForm onBack={() => setAppState('TEAM_MGMT')} />;
    if (appState === 'SETTINGS') return <WhiteLabelSettings tenant={currentTenant} />;

    switch (currentTenant.type) {
      case TenantType.AGGREGATOR:
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h1 className="text-4xl font-bold mb-4">Discover Verified Global Suppliers</h1>
              <p className="text-slate-600 max-w-2xl text-lg mb-8">Access over 50,000 manufacturers and wholesalers across 120 countries with deep capability profiles and trust indicators.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Manufacturers', count: '12,400+', color: 'blue' },
                  { label: 'Wholesalers', count: '38,200+', color: 'emerald' },
                  { label: 'Trading Houses', count: '4,100+', color: 'amber' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <div className={`text-2xl font-bold text-slate-900`}>{stat.count}</div>
                    <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Trending Industries</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['Industrial Chemicals', 'Solar Infrastructure', 'Agricultural Tech', 'Bio-Plastics'].map((cat, i) => (
                    <div key={i} className="group cursor-pointer bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 transition-all">
                      <div className="font-semibold group-hover:text-blue-600">{cat}</div>
                      <div className="text-xs text-slate-400">120+ Active Leads</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-900 text-white p-6 rounded-2xl">
                 <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                   <span>🤖</span> AI Market Analysis
                 </h3>
                 <div className="text-sm leading-relaxed text-blue-100 font-serif italic">
                   "{aiInsight}"
                 </div>
              </div>
            </section>
          </div>
        );
      case TenantType.B2B:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold">Wholesale Catalog</h1>
                <p className="text-slate-500">Tiered pricing and MOQ enforcement active.</p>
              </div>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-emerald-700 transition">Create RFQ</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {EXAMPLE_PRODUCTS.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm">
                  <img src={p.image} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />
                  <div className="p-4 space-y-2">
                    <div className="text-xs text-slate-400 font-bold uppercase">{p.category}</div>
                    <h3 className="font-bold">{p.name}</h3>
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-emerald-600 font-bold">${p.price}/unit</div>
                      <div className="text-xs text-slate-400">MOQ: {p.moq || 1}</div>
                    </div>
                    <button className="w-full mt-4 border border-slate-200 py-2 rounded text-sm font-semibold hover:bg-slate-50 transition">Request Quote</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case TenantType.B2C:
        return (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section className="relative h-[400px] rounded-3xl overflow-hidden flex items-center px-12">
               <img src="https://picsum.photos/seed/retail/1200/600" className="absolute inset-0 w-full h-full object-cover brightness-50" alt="Spring 2024 retail collections hero banner" />
               <div className="relative z-10 text-white max-w-lg space-y-4">
                 <h1 className="text-5xl font-black leading-tight">Spring 2024 Collections.</h1>
                 <p className="text-lg opacity-90">Sustainably sourced, ethically manufactured. Delivered to your door.</p>
                 <button className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-50 transition">Shop Now</button>
               </div>
            </section>
            
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">New Arrivals</h2>
                <button type="button" className="text-indigo-600 font-semibold underline underline-offset-4">See All</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {EXAMPLE_PRODUCTS.slice(2).map(p => (
                   <div key={p.id} className="space-y-3">
                     <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
                        <img src={p.image} className="w-full h-full object-cover hover:scale-110 transition duration-700" alt={p.name} />
                     </div>
                     <div>
                        <h4 className="font-medium text-slate-800">{p.name}</h4>
                        <div className="text-slate-500 font-bold">${p.price}.00</div>
                     </div>
                   </div>
                ))}
              </div>
            </section>
          </div>
        );
      case TenantType.WHITE_LABEL:
        return (
          <div className="space-y-16 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <div className="space-y-6">
                 <h2 className="text-4xl font-serif">A Vision of Elegance</h2>
                 <p className="text-slate-600 leading-relaxed font-light text-lg">
                   Every piece in our collection is selected for its architectural integrity and timeless aesthetic. 
                   Born from a commitment to craftsmanship, we bridge the gap between manufacturer and home.
                 </p>
                 <button 
                  className="px-12 py-4 text-white text-sm font-bold uppercase tracking-widest hover:opacity-90 transition"
                  style={{ backgroundColor: currentTenant.theme.primaryColor }}
                 >
                   Explore the Collection
                 </button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <img src="https://picsum.photos/seed/wl1/400/500" className="rounded shadow-sm" alt="" aria-hidden="true" />
                  <img src="https://picsum.photos/seed/wl2/400/500" className="rounded shadow-sm translate-y-8" alt="" aria-hidden="true" />
               </div>
            </div>
          </div>
        );
      default:
        return <div>Invalid Tenant Configuration</div>;
    }
  };

  const renderAdminView = () => {
    if (selectedTenant) {
      return (
        <TenantDetails 
          tenant={selectedTenant} 
          onBack={() => setSelectedTenant(null)} 
          onImpersonate={handleImpersonate}
        />
      );
    }

    switch (adminView) {
      case 'TENANTS': return <TenantRegistry onSelectTenant={setSelectedTenant} onImpersonate={handleImpersonate} />;
      case 'LOGS': return <AuditLogs />;
      case 'FINANCE': return <FinanceOps />;
      case 'AI': return <AiGovernance />;
      case 'HEALTH': return <SystemHealth />;
      case 'FLAGS': return <FeatureFlags />;
      case 'COMPLIANCE': return <ComplianceQueue />;
      case 'CASES': return <DisputeCases />;
      case 'RBAC': return <AdminRBAC />;
      case 'API_DOCS': return <ApiDocs />;
      case 'DATA_MODEL': return <DataModel />;
      case 'BLUEPRINTS': return <ArchitectureBlueprints />;
      case 'EVENTS': return <EventStream />;
      case 'BACKEND_SKELETON': return <BackendSkeleton />;
      default: return <MiddlewareScaffold />;
    }
  }

  const renderCurrentState = () => {
    switch(appState) {
      case 'AUTH':
        return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
             <div className="absolute top-6 flex gap-4">
               <button onClick={() => setAuthRealm('TENANT')} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'TENANT' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>Tenant Access</button>
               <button onClick={() => setAuthRealm('CONTROL_PLANE')} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${authRealm === 'CONTROL_PLANE' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>Staff Control Plane</button>
             </div>
             <AuthForm realm={authRealm} mode={authMode} onSwitchMode={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} onSuccess={handleAuthSuccess} />
             {authMode === 'LOGIN' && <button onClick={() => setAppState('FORGOT_PASSWORD')} className="mt-4 text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-600 tracking-widest">Forgot Password?</button>}
          </div>
        );
      case 'FORGOT_PASSWORD':
        return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><ForgotPassword onBack={() => setAppState('AUTH')} /></div>;
      case 'VERIFY_EMAIL':
        return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><VerifyEmail onVerified={() => setAppState('ONBOARDING')} /></div>;
      case 'ONBOARDING':
        return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><OnboardingFlow onComplete={() => setAppState('EXPERIENCE')} /></div>;
      case 'CONTROL_PLANE':
        return <SuperAdminShell activeView={adminView} onViewChange={setAdminView}>{renderAdminView()}</SuperAdminShell>;
      case 'TEAM_MGMT':
      case 'INVITE_MEMBER':
      case 'SETTINGS':
      case 'EXPERIENCE': {
        const props = { 
          tenant: currentTenant, 
          children: renderExperienceContent(),
          onNavigateTeam: () => setAppState('TEAM_MGMT'),
          onNavigateHome: () => setAppState('EXPERIENCE')
        };
        let ExperienceShell;
        switch (currentTenant.type) {
          case TenantType.AGGREGATOR: ExperienceShell = AggregatorShell; break;
          case TenantType.B2B: ExperienceShell = B2BShell; break;
          case TenantType.B2C: ExperienceShell = B2CShell; break;
          case TenantType.WHITE_LABEL: ExperienceShell = WhiteLabelShell; break;
          default: ExperienceShell = AggregatorShell;
        }
        return (
          <ExperienceShell {...props}>
             <div className="absolute top-4 right-4 z-[60] flex gap-2">
                <button onClick={() => setAppState('SETTINGS')} className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-sm hover:text-indigo-600 transition" title="Storefront Settings">⚙️</button>
             </div>
             {renderExperienceContent()}
          </ExperienceShell>
        );
      }
      default:
        return <div>Invalid System State</div>;
    }
  };

  return (
    <div className="relative font-sans">
      {impersonation.isAdmin && (appState === 'EXPERIENCE' || appState === 'TEAM_MGMT' || appState === 'SETTINGS') && (
        <div className="bg-rose-600 text-white px-6 py-2 sticky top-0 z-[100] flex justify-between items-center shadow-lg border-b border-rose-700 animate-in slide-in-from-top duration-300">
           <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
             Staff Active: {currentTenant.name} ({currentTenant.id})
           </div>
           <button onClick={handleExitImpersonation} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-[10px] font-black uppercase transition">Exit Impersonation</button>
        </div>
      )}

      {renderCurrentState()}

      {appState !== 'AUTH' && appState !== 'FORGOT_PASSWORD' && appState !== 'VERIFY_EMAIL' && appState !== 'ONBOARDING' && (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3">
          {showArchitecture && <div className="mb-4 w-[600px] animate-in slide-in-from-bottom-4 duration-300"><ArchitectureDiagram /></div>}
          <div className="glass shadow-2xl rounded-2xl border border-slate-200 p-2 flex gap-2">
            {!impersonation.isAdmin && (
              <button onClick={() => { setAppState(appState === 'CONTROL_PLANE' ? 'EXPERIENCE' : 'CONTROL_PLANE'); setSelectedTenant(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase tracking-tighter ${appState === 'CONTROL_PLANE' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {appState === 'CONTROL_PLANE' ? 'App Shells' : 'Control Plane'}
              </button>
            )}
            <button onClick={() => setAppState('AUTH')} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition">Logout</button>
            {appState !== 'CONTROL_PLANE' && (
              <>
                <div className="h-8 w-px bg-slate-200 my-auto mx-1"></div>
                <button onClick={() => setShowArchitecture(!showArchitecture)} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition">Blueprint</button>
                {!impersonation.isAdmin && (
                  <select title="tenant-picker" value={currentTenantKey} onChange={(e) => { setCurrentTenantKey(e.target.value); setAppState('EXPERIENCE'); }} className="bg-transparent text-[10px] font-bold border-none focus:ring-0 cursor-pointer px-4 uppercase tracking-wider">
                    {Object.keys(PLATFORM_TENANTS).map(key => (<option key={key} value={key}>{PLATFORM_TENANTS[key].name}</option>))}
                  </select>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
