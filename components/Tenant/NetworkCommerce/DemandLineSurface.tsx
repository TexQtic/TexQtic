/**
 * DemandLineSurface.tsx — Network Commerce Pool Member Demand Line UI
 *
 * TEXQTIC-NC-FRONTEND-POOL-MEMBER-DEMAND-LINES-001 (FE-4)
 *
 * Displays demand lines for a selected pool and provides member/owner workflows:
 * - Member: Create, update, cancel own demand lines
 * - Owner/Admin: View aggregated demand lines, lock for RFQ
 *
 * Feature-gated: respects backend FEATURE_DISABLED response
 * Role-gated: lock-for-RFQ conditional on backend authorization (403 → hidden)
 */

import { useState, useEffect, useCallback, type ReactElement, type FormEvent } from 'react';
import {
  listDemandLines,
  createDemandLine,
  updateDemandLine,
  cancelDemandLine,
  lockDemandLinesForRfq,
  type NetworkPoolDemandLine,
  type NetworkPoolDemandLineListResponse,
  type CreateDemandLineInput,
  type UpdateDemandLineInput,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';

interface DemandLineSurfaceProps {
  poolId: string;
  onBack?: () => void;
}

type UiState = 'loading' | 'empty' | 'error' | 'feature-disabled' | 'ready' | 'creating' | 'updating' | 'cancelling';

interface DemandLineFormState {
  lineId?: string;
  lineRef: string;
  commodityCategory: string;
  productCategory: string;
  productSpecSummary: string;
  qty: number;
  qtyUnit: string;
  deliveryLocation: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

const DEFAULT_FORM_STATE: DemandLineFormState = {
  lineRef: '',
  commodityCategory: '',
  productCategory: '',
  productSpecSummary: '',
  qty: 1,
  qtyUnit: 'KG',
  deliveryLocation: '',
  deliveryWindowStart: '',
  deliveryWindowEnd: '',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
}

function demandLineStatusBadge(status: string): ReactElement {
  const upper = status.toUpperCase();
  if (upper === 'DRAFT') {
    return (
      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-amber-900">
        Draft
      </span>
    );
  }
  if (upper === 'ACTIVE') {
    return (
      <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-sky-800">
        Active
      </span>
    );
  }
  if (upper === 'LOCKED_FOR_RFQ') {
    return (
      <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-indigo-800">
        Locked for RFQ
      </span>
    );
  }
  if (upper === 'CANCELLED') {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Cancelled
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-600">
      {status}
    </span>
  );
}

/**
 * DemandLineSurface — Pool demand line management and display
 */
export function DemandLineSurface({ poolId, onBack }: DemandLineSurfaceProps): ReactElement {
  const [uiState, setUiState] = useState<UiState>('loading');
  const [demandLines, setDemandLines] = useState<NetworkPoolDemandLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<DemandLineFormState>(DEFAULT_FORM_STATE);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [canLockForRfq, setCanLockForRfq] = useState(true);
  const [isLocking, setIsLocking] = useState(false);

  // Fetch demand lines on mount or poolId change
  useEffect(() => {
    const loadDemandLines = async () => {
      setUiState('loading');
      setError(null);
      try {
        const response: NetworkPoolDemandLineListResponse = await listDemandLines(poolId, {
          limit: 50,
          offset: 0,
        });
        setDemandLines(response.items);
        setUiState(response.items.length === 0 ? 'empty' : 'ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load demand lines';

        // Check if it's a feature-disabled response
        if (errorMessage.includes('FEATURE_DISABLED') || errorMessage.includes('503')) {
          setUiState('feature-disabled');
          return;
        }

        setError(errorMessage);
        setUiState('error');
      }
    };

    loadDemandLines();
  }, [poolId]);

  const handleFormFieldChange = useCallback((field: keyof DemandLineFormState, value: string | number) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setUiState('creating');
      try {
        const input: CreateDemandLineInput = {
          line_ref: formState.lineRef,
          commodity_category: formState.commodityCategory,
          product_category: formState.productCategory || null,
          product_spec_summary: formState.productSpecSummary || null,
          qty: formState.qty,
          qty_unit: formState.qtyUnit,
          delivery_location: formState.deliveryLocation || null,
          delivery_window_start: formState.deliveryWindowStart || null,
          delivery_window_end: formState.deliveryWindowEnd || null,
        };

        const newLine = await createDemandLine(poolId, input);
        setDemandLines((prev) => [...prev, newLine]);
        setFormState(DEFAULT_FORM_STATE);
        setShowCreateForm(false);
        setUiState('ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create demand line';
        setError(errorMessage);
        setUiState('ready');
      }
    },
    [poolId, formState],
  );

  const handleEditStart = useCallback((line: NetworkPoolDemandLine) => {
    setEditingLineId(line.id);
    setFormState({
      lineId: line.id,
      lineRef: line.line_ref,
      commodityCategory: line.commodity_category,
      productCategory: line.product_category || '',
      productSpecSummary: line.product_spec_summary || '',
      qty: Number(line.qty),
      qtyUnit: line.qty_unit,
      deliveryLocation: line.delivery_location || '',
      deliveryWindowStart: line.delivery_window_start || '',
      deliveryWindowEnd: line.delivery_window_end || '',
    });
    setShowCreateForm(true);
  }, []);

  const handleUpdateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!editingLineId) return;

      setUiState('updating');
      try {
        const input: UpdateDemandLineInput = {
          commodity_category: formState.commodityCategory,
          product_category: formState.productCategory || null,
          product_spec_summary: formState.productSpecSummary || null,
          qty: formState.qty,
          qty_unit: formState.qtyUnit,
          delivery_location: formState.deliveryLocation || null,
          delivery_window_start: formState.deliveryWindowStart || null,
          delivery_window_end: formState.deliveryWindowEnd || null,
        };

        const updated = await updateDemandLine(poolId, editingLineId, input);
        setDemandLines((prev) => prev.map((l) => (l.id === editingLineId ? updated : l)));
        setFormState(DEFAULT_FORM_STATE);
        setShowCreateForm(false);
        setEditingLineId(null);
        setUiState('ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update demand line';
        setError(errorMessage);
        setUiState('ready');
      }
    },
    [poolId, editingLineId, formState],
  );

  const handleCancel = useCallback(
    async (lineId: string) => {
      setUiState('cancelling');
      try {
        await cancelDemandLine(poolId, lineId);
        setDemandLines((prev) => {
          const next = prev.filter((l) => l.id !== lineId);
          setUiState(next.length === 0 ? 'empty' : 'ready');
          return next;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel demand line';
        setError(errorMessage);
        setUiState('ready');
      }
    },
    [poolId],
  );

  const handleLockForRfq = useCallback(async () => {
    setIsLocking(true);
    try {
      await lockDemandLinesForRfq(poolId);
      // After locking, demand lines transition to locked state
      const updated = await listDemandLines(poolId, { limit: 50, offset: 0 });
      setDemandLines(updated.items);
      setCanLockForRfq(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lock demand lines for RFQ';
      // If 403, disable the lock button (authorization check failed)
      if (errorMessage.includes('403') || errorMessage.includes('FORBIDDEN')) {
        setCanLockForRfq(false);
      }
      setError(errorMessage);
    } finally {
      setIsLocking(false);
    }
  }, [poolId]);

  const handleFormCancel = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
    setShowCreateForm(false);
    setEditingLineId(null);
  }, []);

  const isEditable = (line: NetworkPoolDemandLine): boolean => {
    return line.status === 'DRAFT' || line.status === 'ACTIVE';
  };

  const isCancellable = (line: NetworkPoolDemandLine): boolean => {
    return line.status === 'DRAFT' || line.status === 'ACTIVE';
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading demand lines..." />
      </div>
    );
  }

  // ── Feature-disabled ───────────────────────────────────────────────────────

  if (uiState === 'feature-disabled') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Demand Lines</h1>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Back to Pool
                </button>
              )}
            </div>
          </header>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6 shadow-sm">
            <h2 className="text-lg font-bold text-amber-900">Demand Lines Disabled</h2>
            <p className="mt-3 text-sm text-amber-800">
              This feature is currently disabled. Please contact your administrator to enable demand
              line functionality for this pool.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (uiState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Demand Lines</h1>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Back to Pool
                </button>
              )}
            </div>
          </header>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 shadow-sm">
            <h2 className="text-base font-bold text-rose-900">Unable to Load Demand Lines</h2>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (uiState === 'empty' && !showCreateForm) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Demand Lines</h1>
                <p className="mt-1 text-sm text-slate-500">Pool: {poolId}</p>
              </div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Back to Pool
                </button>
              )}
            </div>
          </header>

          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">No demand lines yet</p>
            <p className="text-sm text-slate-400">
              Add a demand line to specify the commodity, quantity, and delivery requirements for
              this pool.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Add First Demand Line
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready / Creating / Updating / Cancelling ───────────────────────────────

  const isSubmitting = uiState === 'creating' || uiState === 'updating';
  const isProcessing = uiState === 'cancelling' || isSubmitting;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* ── Page header ── */}
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Demand Lines</h1>
              <p className="mt-1 text-sm text-slate-500">
                {demandLines.length === 0
                  ? 'No demand lines'
                  : `${demandLines.length} demand line${demandLines.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Back to Pool
              </button>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Pool: {poolId}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Lines: {demandLines.length}
            </span>
          </div>
        </header>

        {/* ── Inline error banner ── */}
        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 shadow-sm">
            <p className="text-sm text-rose-800">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Action bar ── */}
        {!showCreateForm && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              disabled={isProcessing}
            >
              Add Demand Line
            </button>
            {demandLines.some((l) => l.status === 'ACTIVE') && (
              <button
                type="button"
                onClick={handleLockForRfq}
                disabled={isLocking || !canLockForRfq || isProcessing}
                title={!canLockForRfq ? 'Not authorized to lock demand lines' : undefined}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {isLocking ? 'Locking…' : 'Lock for RFQ'}
              </button>
            )}
          </div>
        )}

        {/* ── Create / Edit form ── */}
        {showCreateForm && (
          <DemandLineForm
            formData={formState}
            onFieldChange={handleFormFieldChange}
            onSubmit={editingLineId ? handleUpdateSubmit : handleCreateSubmit}
            onCancel={handleFormCancel}
            isSubmitting={isSubmitting}
            mode={editingLineId ? 'edit' : 'create'}
          />
        )}

        {/* ── Demand lines list ── */}
        <div className="flex flex-col gap-4">
          {demandLines.map((line) => (
            <DemandLineItem
              key={line.id}
              line={line}
              isEditable={isEditable(line)}
              isCancellable={isCancellable(line)}
              onEdit={() => handleEditStart(line)}
              onCancel={() => handleCancel(line.id)}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * DemandLineItem — Single demand line card
 */
function DemandLineItem({
  line,
  isEditable,
  isCancellable,
  onEdit,
  onCancel,
  isProcessing,
}: {
  line: NetworkPoolDemandLine;
  isEditable: boolean;
  isCancellable: boolean;
  onEdit: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}): ReactElement {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-slate-900">{line.line_ref}</span>
          {demandLineStatusBadge(line.status)}
          {line.locked_at && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              Locked {formatDate(line.locked_at)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              type="button"
              onClick={onEdit}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Edit
            </button>
          )}
          {isCancellable && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {isProcessing ? 'Processing…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Field grid */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Commodity</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{line.commodity_category}</dd>
        </div>

        {line.product_category && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Product Category</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{line.product_category}</dd>
          </div>
        )}

        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quantity</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {line.qty} {line.qty_unit}
          </dd>
        </div>

        {line.delivery_location && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Location</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{line.delivery_location}</dd>
          </div>
        )}

        {line.delivery_window_start && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Window</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {formatDate(line.delivery_window_start)}
              {line.delivery_window_end && line.delivery_window_end !== line.delivery_window_start
                ? ` → ${formatDate(line.delivery_window_end)}`
                : ''}
            </dd>
          </div>
        )}
      </dl>

      {line.product_spec_summary && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Product Spec</p>
          <p className="mt-1 text-sm text-slate-700">{line.product_spec_summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * DemandLineForm — Controlled create/edit demand line form
 *
 * The parent owns formData and provides onFieldChange so the submit handlers
 * always read the current field values from parent state.
 */
interface DemandLineFormProps {
  formData: DemandLineFormState;
  onFieldChange: (field: keyof DemandLineFormState, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

function DemandLineForm({
  formData,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: DemandLineFormProps): ReactElement {
  const submitLabel = mode === 'create' ? 'Create Demand Line' : 'Save Changes';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        {mode === 'create' ? 'New Demand Line' : 'Edit Demand Line'}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {mode === 'create'
          ? 'Specify the commodity, quantity, and delivery requirements.'
          : 'Update the demand line details below.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
        {/* ── Identification ── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Identification</legend>

          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>
              Line Reference <span className="text-rose-500">*</span>
            </span>
            <input
              name="lineRef"
              type="text"
              value={formData.lineRef}
              onChange={(e) => onFieldChange('lineRef', e.target.value)}
              disabled={isSubmitting || mode === 'edit'}
              required
              maxLength={100}
              placeholder="e.g. LINE-001"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <span className="block text-xs text-slate-400">Unique reference for this demand line within the pool.</span>
          </label>
        </fieldset>

        {/* ── Commodity & Product ── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Commodity &amp; Product</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>
                Commodity Category <span className="text-rose-500">*</span>
              </span>
              <input
                name="commodityCategory"
                type="text"
                value={formData.commodityCategory}
                onChange={(e) => onFieldChange('commodityCategory', e.target.value)}
                disabled={isSubmitting}
                required
                maxLength={100}
                placeholder="e.g. Grains"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>Product Category</span>
              <input
                name="productCategory"
                type="text"
                value={formData.productCategory}
                onChange={(e) => onFieldChange('productCategory', e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
                placeholder="e.g. Wheat"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>Product Specification</span>
            <textarea
              name="productSpecSummary"
              value={formData.productSpecSummary}
              onChange={(e) => onFieldChange('productSpecSummary', e.target.value)}
              disabled={isSubmitting}
              maxLength={2000}
              rows={3}
              placeholder="Quality requirements, grade, certification notes…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
            />
          </label>
        </fieldset>

        {/* ── Quantity ── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Quantity</legend>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>
                Quantity <span className="text-rose-500">*</span>
              </span>
              <input
                name="qty"
                type="number"
                value={formData.qty}
                onChange={(e) => onFieldChange('qty', Number(e.target.value))}
                disabled={isSubmitting}
                required
                min="0.01"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>
                Unit <span className="text-rose-500">*</span>
              </span>
              <select
                name="qtyUnit"
                value={formData.qtyUnit}
                onChange={(e) => onFieldChange('qtyUnit', e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              >
                <option value="KG">Kilograms (KG)</option>
                <option value="MT">Metric Tons (MT)</option>
                <option value="L">Liters (L)</option>
                <option value="M3">Cubic Meters (M3)</option>
                <option value="UNIT">Units</option>
                <option value="BOX">Boxes</option>
              </select>
            </label>
          </div>
        </fieldset>

        {/* ── Delivery ── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Delivery</legend>

          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>Delivery Location</span>
            <input
              name="deliveryLocation"
              type="text"
              value={formData.deliveryLocation}
              onChange={(e) => onFieldChange('deliveryLocation', e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              placeholder="e.g. Port of Rotterdam, Netherlands"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>Delivery Window Start</span>
              <input
                name="deliveryWindowStart"
                type="datetime-local"
                value={formData.deliveryWindowStart}
                onChange={(e) => onFieldChange('deliveryWindowStart', e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>Delivery Window End</span>
              <input
                name="deliveryWindowEnd"
                type="datetime-local"
                value={formData.deliveryWindowEnd}
                onChange={(e) => onFieldChange('deliveryWindowEnd', e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>
          </div>
        </fieldset>

        {/* ── Form actions ── */}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-transparent bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default DemandLineSurface;
