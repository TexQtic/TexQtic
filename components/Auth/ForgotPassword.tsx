
import React, { useState } from 'react';

export const ForgotPassword: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="h-2 bg-indigo-600"></div>
      <div className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tighter">🔑 Recovery</div>
          <p className="text-slate-500 text-sm">
            {submitted ? "Check your email for reset instructions." : "Enter your email to reset your platform password."}
          </p>
        </div>

        {!submitted ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email Address</label>
              <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="name@company.com" required />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition">
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="p-4 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 text-center">
            Verification link expires in 15 minutes.
          </div>
        )}

        <button onClick={onBack} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
          Return to Login
        </button>
      </div>
    </div>
  );
};
