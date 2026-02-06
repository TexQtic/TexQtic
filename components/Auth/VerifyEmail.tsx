
import React from 'react';

export const VerifyEmail: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="text-5xl">✉️</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Verify your Email</h2>
        <p className="text-sm text-slate-500">We've sent a 6-digit code to your email address. Please enter it below to activate your account.</p>
      </div>
      
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <input key={i} type="text" maxLength={1} className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
        ))}
      </div>

      <button onClick={onVerified} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition">
        Verify Account
      </button>

      <div className="text-[10px] text-slate-400 font-medium">
        Didn't receive a code? <button className="text-indigo-600 hover:underline">Resend</button>
      </div>
    </div>
  );
};
