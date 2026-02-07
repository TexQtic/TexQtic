
import React, { useState } from 'react';
import { TenantConfig } from '../../types';

export const WhiteLabelSettings: React.FC<{ tenant: TenantConfig }> = ({ tenant }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold">Storefront Configuration</h1>
        <p className="text-slate-500 text-sm">Manage your custom domain, brand identity, and theme settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900">Custom Domain</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="shop.yourbrand.com" />
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Connect</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Required DNS Records</div>
                <div className="font-mono text-[11px] text-slate-600 flex justify-between">
                  <span>Type: CNAME</span>
                  <span>Value: proxy.texqtic.com</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-900">Visual Identity</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" defaultValue={tenant.theme.primaryColor} className="w-10 h-10 rounded cursor-pointer" />
                  <span className="text-sm font-mono text-slate-600 uppercase">{tenant.theme.primaryColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Secondary Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" defaultValue={tenant.theme.secondaryColor} className="w-10 h-10 rounded cursor-pointer" />
                  <span className="text-sm font-mono text-slate-600 uppercase">{tenant.theme.secondaryColor}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Logo URL</label>
              <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="https://cdn.yourbrand.com/logo.png" />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
            <h4 className="font-bold text-sm">Theme Preview</h4>
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="h-4 w-24 rounded" style={{ backgroundColor: tenant.theme.primaryColor }}></div>
              <div className="h-2 w-full bg-slate-100 rounded"></div>
              <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
              <div className="h-8 w-full rounded" style={{ backgroundColor: tenant.theme.secondaryColor }}></div>
            </div>
            <p className="text-[10px] opacity-70 italic text-center">Changes reflect instantly via CSS variable injection.</p>
          </div>
          
          <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
