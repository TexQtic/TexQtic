import React, { useState } from 'react';
import { TenantType } from '../../types';

interface ActivationFlowProps {
  onComplete: (_data: any) => void | Promise<void>;
  inviteToken?: string;
  prefilledData?: {
    orgName?: string;
    domain?: string;
  };
}

export const ActivationFlow: React.FC<ActivationFlowProps> = ({
  onComplete,
  inviteToken,
  prefilledData,
}) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    orgName: prefilledData?.orgName || '',
    type: TenantType.B2B,
    industry: '',
    domain: prefilledData?.domain || '',
    inviteToken: inviteToken || '',
    email: '',
    password: '',
  });

  const next = () => setStep(s => s + 1);

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onComplete(formData);
    } catch (err: any) {
      setSubmitError(err?.message || 'Activation failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-12 space-y-12 animate-in zoom-in-95 duration-500">
      {/* Stepper Header */}
      <div className="flex justify-between items-center px-4 max-w-2xl mx-auto">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step >= i ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-200 text-slate-400'}`}
            >
              {i}
            </div>
            {i < 4 && (
              <div
                className={`h-0.5 w-12 md:w-20 mx-2 rounded ${step > i ? 'bg-indigo-600' : 'bg-slate-200'}`}
              ></div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-bold">Confirm Your Business Details</h2>
            <p className="text-slate-500">
              Your organization has been pre-registered. Please confirm and update the details
              below.
            </p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="orgName"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Legal Entity Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={formData.orgName}
                  onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Global Inc."
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="industry"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Primary Industry
                </label>
                <input
                  id="industry"
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Manufacturing / Logistics / Consumer Goods"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-bold">Set Up Your Account</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Create Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="subdomain"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Subdomain (Reserved)
                </label>
                <div className="flex">
                  <input
                    id="subdomain"
                    type="text"
                    value={formData.domain}
                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="my-shop"
                  />
                  <div className="px-4 py-3 bg-slate-100 border border-slate-200 border-l-0 rounded-r-xl text-slate-500 font-mono text-sm">
                    .texqtic.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-bold">Select Platform Experience</h2>
            <p className="text-slate-500">
              Choose the interface architecture that matches your business model.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  type: TenantType.AGGREGATOR,
                  icon: '🌐',
                  label: 'Global Directory',
                  desc: 'Directory, lead generation, and certifications.',
                },
                {
                  type: TenantType.B2B,
                  icon: '🏗️',
                  label: 'B2B Marketplace',
                  desc: 'Wholesale, MOQ pricing, and negotiations.',
                },
                {
                  type: TenantType.B2C,
                  icon: '🛍️',
                  label: 'D2C Retail',
                  desc: 'Storefront, cart, checkout, and returns.',
                },
                {
                  type: TenantType.WHITE_LABEL,
                  icon: '✨',
                  label: 'Bespoke Brand',
                  desc: 'Custom branding and independent checkout.',
                },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setFormData({ ...formData, type: opt.type })}
                  className={`p-6 border-2 rounded-2xl text-left transition-all ${formData.type === opt.type ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="text-3xl mb-2">{opt.icon}</div>
                  <div className="font-bold text-slate-900">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-bold">Business Verification</h2>
            <p className="text-slate-500">
              To comply with global financial regulations, we require business documentation. This
              will be reviewed before trade and fund operations are enabled.
            </p>
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-4 text-center hover:border-indigo-500 transition cursor-pointer">
              <span className="text-4xl">📄</span>
              <div className="text-sm font-bold text-slate-600">
                Upload Certificate of Incorporation
              </div>
              <div className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Trade capabilities and fund operations will remain blocked
                until verification is completed and approved.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-8 py-4 font-bold text-slate-500 hover:text-slate-800 transition"
              disabled={submitting}
            >
              Back
            </button>
          )}
          <div className="ml-auto space-y-3">
            {submitError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg text-right">
                {submitError}
              </div>
            )}
            <button
              onClick={step === 4 ? handleComplete : next}
              disabled={submitting}
              className="px-12 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/10 hover:opacity-90 transition uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step < 4 && 'Continue'}
              {step === 4 && !submitting && 'Complete Activation'}
              {step === 4 && submitting && 'Activating...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export alias for compatibility
export const OnboardingFlow = ActivationFlow;
