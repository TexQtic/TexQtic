/**
 * SupplierQuoteSurface.tsx — FE-8 supplier quote view/submit surface
 *
 * Renders one of:
 * - loading state (fetching existing quote)
 * - feature-disabled state (503 FEATURE_DISABLED from quote gate)
 * - submit form (invite ACCEPTED, no quote yet — 404 SUPPLIER_QUOTE_NOT_FOUND)
 * - submitted quote read-only view (existing quote)
 * - error states (409 QUOTE_ALREADY_SUBMITTED, 422 INVITE_NOT_ACCEPTED, generic)
 *
 * Security: never renders metadata_internal_json, owner_org_id, rfq_id, pool_id,
 * supplier_org_id, or any member/award/order/settlement fields (QD-5).
 */
import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { APIError } from '../../../services/apiClient';
import {
  getSupplierQuoteForInvite,
  submitSupplierQuoteForInvite,
  type SupplierQuote,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';

export type SupplierQuoteSurfaceProps = Readonly<{
  inviteId: string;
  onBack: () => void;
}>;

type QuoteUiState =
  | 'loading'
  | 'feature-disabled'
  | 'no-quote'
  | 'submitted'
  | 'already-submitted'
  | 'invite-not-accepted'
  | 'error';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function classifyGetError(error: unknown): { state: QuoteUiState; message: string } {
  if (error instanceof APIError) {
    if (error.code === 'FEATURE_DISABLED' || error.status === 503) {
      return { state: 'feature-disabled', message: 'Supplier quote submission is not yet available.' };
    }
    if (error.code === 'SUPPLIER_QUOTE_NOT_FOUND' || error.status === 404) {
      return { state: 'no-quote', message: '' };
    }
    return { state: 'error', message: error.message || 'Unable to load quote.' };
  }
  if (error instanceof Error) return { state: 'error', message: error.message };
  return { state: 'error', message: 'Unable to load quote.' };
}

function classifySubmitError(error: unknown): { state: QuoteUiState; message: string } {
  if (error instanceof APIError) {
    if (error.code === 'FEATURE_DISABLED' || error.status === 503) {
      return { state: 'feature-disabled', message: 'Supplier quote submission is not yet available.' };
    }
    if (error.code === 'QUOTE_ALREADY_SUBMITTED' || error.status === 409) {
      return { state: 'already-submitted', message: 'A quote has already been submitted for this invite.' };
    }
    if (error.code === 'INVITE_NOT_ACCEPTED' || error.code === 'INVALID_TRANSITION' || error.status === 422) {
      return { state: 'invite-not-accepted', message: error.message || 'This invite must be accepted before submitting a quote.' };
    }
    return { state: 'error', message: error.message || 'Failed to submit quote.' };
  }
  if (error instanceof Error) return { state: 'error', message: error.message };
  return { state: 'error', message: 'Failed to submit quote.' };
}

function validateForm(
  quoteAmount: string,
  currency: string,
): string | null {
  const trimmedAmount = quoteAmount.trim();
  if (!trimmedAmount) return 'Quote amount is required.';
  if (!/^\d+(\.\d+)?$/.test(trimmedAmount)) return 'Quote amount must be a positive number (e.g. 1250.50).';
  if (parseFloat(trimmedAmount) <= 0) return 'Quote amount must be greater than zero.';

  const trimmedCurrency = currency.trim();
  if (!trimmedCurrency) return 'Currency is required.';
  if (trimmedCurrency.length < 3) return 'Currency must be at least 3 characters (e.g. USD, EUR, INR).';
  if (trimmedCurrency.length > 10) return 'Currency must be at most 10 characters.';

  return null;
}

export function SupplierQuoteSurface({ inviteId, onBack }: SupplierQuoteSurfaceProps): ReactElement {
  const [uiState, setUiState] = useState<QuoteUiState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<SupplierQuote | null>(null);

  // Form fields
  const [quoteAmount, setQuoteAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [validityUntil, setValidityUntil] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQuote = useCallback(async () => {
    setUiState('loading');
    setErrorMessage(null);
    try {
      const data = await getSupplierQuoteForInvite(inviteId);
      setQuote(data);
      setUiState('submitted');
    } catch (error) {
      const resolution = classifyGetError(error);
      setQuote(null);
      setUiState(resolution.state);
      setErrorMessage(resolution.message || null);
    }
  }, [inviteId]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const validationError = validateForm(quoteAmount, currency);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitSupplierQuoteForInvite(inviteId, {
        quote_amount: quoteAmount.trim(),
        currency: currency.trim().toUpperCase(),
        validity_until: validityUntil.trim() ? new Date(validityUntil.trim()).toISOString() : null,
        supplier_note: supplierNote.trim() ? supplierNote.trim() : null,
      });
      setQuote(data);
      setUiState('submitted');
    } catch (error) {
      const resolution = classifySubmitError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    } finally {
      setSubmitting(false);
    }
  }, [inviteId, quoteAmount, currency, validityUntil, supplierNote]);

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading quote..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">

        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Supplier Quote</h1>
              <p className="mt-1 text-xs text-slate-500 break-all">Invite: {inviteId}</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              ← Back to Inbox
            </button>
          </div>
        </header>

        {/* Feature-disabled state */}
        {uiState === 'feature-disabled' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <h2 className="text-lg font-bold">Supplier Quote Submission Disabled</h2>
            <p className="mt-2 text-sm">
              {errorMessage || 'Supplier quote submission is not yet available for this tenant.'}
            </p>
            <p className="mt-3 text-xs text-amber-700">
              This feature will be enabled when the platform is ready. Return to the inbox to manage other invites.
            </p>
          </div>
        )}

        {/* Invite not accepted state */}
        {uiState === 'invite-not-accepted' && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
            <h2 className="text-lg font-bold">Invite Not in Accepted State</h2>
            <p className="mt-2 text-sm">
              {errorMessage || 'This invite must be accepted before a quote can be submitted.'}
            </p>
          </div>
        )}

        {/* Already submitted state (409) */}
        {uiState === 'already-submitted' && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900">
            <h2 className="text-lg font-bold">Quote Already Submitted</h2>
            <p className="mt-2 text-sm">
              {errorMessage || 'A quote has already been submitted for this invite.'}
            </p>
            <p className="mt-3 text-xs text-sky-700">
              Only one quote is allowed per invite. Use the back button to return to the inbox.
            </p>
          </div>
        )}

        {/* Generic error state */}
        {uiState === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900">
            <h2 className="text-lg font-bold">Unable to Load Quote</h2>
            <p className="mt-2 text-sm">
              {errorMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => { void loadQuote(); }}
              className="mt-3 inline-flex items-center justify-center rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* No quote yet — show submit form */}
        {uiState === 'no-quote' && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Submit Your Quote</h2>
            <p className="mt-1 text-sm text-slate-600">
              No quote has been submitted yet for this invite. Fill in the form below to submit.
            </p>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="mt-5 flex flex-col gap-4" noValidate>
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {formError}
                </div>
              )}

              {/* Quote Amount */}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Quote Amount <span className="text-rose-500">*</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={quoteAmount}
                  onChange={(e) => { setQuoteAmount(e.target.value); setFormError(null); }}
                  placeholder="e.g. 12500.00"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
                <span className="text-[11px] text-slate-400">Positive number. E.g. 1250.50</span>
              </label>

              {/* Currency */}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Currency <span className="text-rose-500">*</span>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); setFormError(null); }}
                  placeholder="e.g. USD, EUR, INR"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
                <span className="text-[11px] text-slate-400">3–10 character currency code (e.g. USD, EUR, INR)</span>
              </label>

              {/* Validity Until (optional) */}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Quote Valid Until <span className="text-slate-400 font-normal">(optional)</span>
                <input
                  type="datetime-local"
                  value={validityUntil}
                  onChange={(e) => setValidityUntil(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
              </label>

              {/* Supplier Note (optional) */}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Supplier Note <span className="text-slate-400 font-normal">(optional)</span>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={supplierNote}
                  onChange={(e) => setSupplierNote(e.target.value)}
                  placeholder="Additional notes or conditions for the buyer pool owner"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
                <span className="text-[11px] text-slate-400">Max 5000 characters. {supplierNote.length}/5000</span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl border border-sky-400 bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Quote'}
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Submitted quote read-only view */}
        {uiState === 'submitted' && quote && (
          <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">Quote Submitted</h2>
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                {quote.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Your quote has been submitted. No further changes can be made in this release.
            </p>

            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Quote Ref</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 break-all">{quote.quote_ref}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</dt>
                <dd className="mt-1">
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    {quote.status}
                  </span>
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Quote Amount</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {quote.quote_amount} {quote.currency}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Submitted At</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatTimestamp(quote.submitted_at)}</dd>
              </div>
              {quote.validity_until && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Valid Until</dt>
                  <dd className="mt-1 text-sm font-semibold text-amber-900">{formatTimestamp(quote.validity_until)}</dd>
                </div>
              )}
              {quote.supplier_note && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Supplier Note</dt>
                  <dd className="mt-1 text-sm text-slate-700 italic">&ldquo;{quote.supplier_note}&rdquo;</dd>
                </div>
              )}
              {quote.withdrawn_at && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-rose-600">Withdrawn At</dt>
                  <dd className="mt-1 text-sm text-rose-800">{formatTimestamp(quote.withdrawn_at)}</dd>
                  {quote.withdraw_reason && (
                    <dd className="mt-1 text-xs text-rose-700 italic">{quote.withdraw_reason}</dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
