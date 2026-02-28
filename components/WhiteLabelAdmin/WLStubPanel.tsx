/**
 * WLStubPanel — Coming-soon placeholder panel for WL Store Admin surfaces.
 * Wave 4 P1: Products, Collections, Orders, Domains are stub-rendered until
 * their full panel implementations land in subsequent Wave 4 iterations.
 */

import React from 'react';

interface WLStubPanelProps {
  title: string;
  description: string;
  icon?: string;
}

export const WLStubPanel: React.FC<WLStubPanelProps> = ({ title, description, icon = '🔜' }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-in fade-in duration-500">
    <div className="text-5xl mb-6">{icon}</div>
    <h2 className="text-2xl font-bold text-slate-800 mb-3">{title}</h2>
    <p className="text-slate-500 max-w-sm leading-relaxed">{description}</p>
    <div className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-300 border border-slate-200 px-5 py-2 rounded-full">
      Coming Soon — Wave 4
    </div>
  </div>
);
