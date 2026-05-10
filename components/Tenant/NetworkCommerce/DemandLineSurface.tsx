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

import { useState, useEffect, useCallback, type ReactElement } from 'react';
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

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        setDemandLines([...demandLines, newLine]);
        setFormState(DEFAULT_FORM_STATE);
        setShowCreateForm(false);
        setUiState(demandLines.length === 0 ? 'ready' : 'ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create demand line';
        setError(errorMessage);
        setUiState('ready');
      }
    },
    [poolId, demandLines, formState],
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
    async (e: React.FormEvent) => {
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
        setDemandLines(demandLines.map((l) => (l.id === editingLineId ? updated : l)));
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
    [poolId, editingLineId, demandLines, formState],
  );

  const handleCancel = useCallback(
    async (lineId: string) => {
      setUiState('cancelling');
      try {
        await cancelDemandLine(poolId, lineId);
        setDemandLines(demandLines.filter((l) => l.id !== lineId));
        setUiState(demandLines.length === 1 ? 'empty' : 'ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel demand line';
        setError(errorMessage);
        setUiState('ready');
      }
    },
    [poolId, demandLines],
  );

  const handleLockForRfq = useCallback(async () => {
    setIsLocking(true);
    try {
      const result = await lockDemandLinesForRfq(poolId);
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

  // Render states
  if (uiState === 'loading') {
    return (
      <div className="nc-demand-line-surface loading-state">
        <LoadingState message="Loading demand lines..." />
      </div>
    );
  }

  if (uiState === 'feature-disabled') {
    return (
      <div className="nc-demand-line-surface feature-disabled-state">
        <div className="message">
          <h3>Network Commerce - Demand Lines</h3>
          <p>This feature is currently disabled. Please contact your administrator.</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            Back to Pools
          </button>
        )}
      </div>
    );
  }

  if (uiState === 'error') {
    return (
      <div className="nc-demand-line-surface error-state">
        <div className="error-message">
          <h3>Error Loading Demand Lines</h3>
          <p>{error}</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            Back to Pools
          </button>
        )}
      </div>
    );
  }

  if (uiState === 'empty') {
    return (
      <div className="nc-demand-line-surface empty-state">
        <div className="message">
          <h3>Demand Lines</h3>
          <p>No demand lines yet. Create one to get started.</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
          Create Demand Line
        </button>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            Back to Pool Detail
          </button>
        )}
        {showCreateForm && (
          <DemandLineForm
            initialState={formState}
            onSubmit={handleCreateSubmit}
            onCancel={handleFormCancel}
            isSubmitting={false}
            mode="create"
          />
        )}
      </div>
    );
  }

  // Ready state with demand lines
  return (
    <div className="nc-demand-line-surface ready-state">
      <div className="header">
        <h3>Demand Lines ({demandLines.length})</h3>
        {onBack && (
          <button onClick={onBack} className="btn btn-tertiary">
            Back
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="actions">
        {!showCreateForm && (
          <>
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
              Create Demand Line
            </button>
            {demandLines.some((l) => l.status === 'ACTIVE') && (
              <button
                onClick={handleLockForRfq}
                disabled={isLocking || !canLockForRfq}
                className="btn btn-secondary"
                title={!canLockForRfq ? 'Not authorized to lock demand lines' : ''}
              >
                {isLocking ? 'Locking...' : 'Lock for RFQ'}
              </button>
            )}
          </>
        )}
      </div>

      {showCreateForm && (
        <DemandLineForm
          initialState={formState}
          onSubmit={editingLineId ? handleUpdateSubmit : handleCreateSubmit}
          onCancel={handleFormCancel}
          isSubmitting={uiState === 'creating' || uiState === 'updating'}
          mode={editingLineId ? 'edit' : 'create'}
        />
      )}

      <div className="demand-lines-list">
        {demandLines.map((line) => (
          <DemandLineItem
            key={line.id}
            line={line}
            isEditable={isEditable(line)}
            isCancellable={isCancellable(line)}
            onEdit={() => handleEditStart(line)}
            onCancel={() => handleCancel(line.id)}
            isProcessing={uiState === 'cancelling'}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * DemandLineItem — Single demand line display
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
    <div className={`demand-line-item status-${line.status.toLowerCase()}`}>
      <div className="line-header">
        <div className="line-ref-and-status">
          <h4>{line.line_ref}</h4>
          <span className={`status-badge status-${line.status.toLowerCase()}`}>{line.status}</span>
          {line.locked_at && <span className="locked-badge">Locked for RFQ</span>}
        </div>
      </div>

      <div className="line-content">
        <div className="field">
          <label>Commodity Category</label>
          <span>{line.commodity_category}</span>
        </div>
        <div className="field">
          <label>Quantity</label>
          <span>
            {line.qty} {line.qty_unit}
          </span>
        </div>
        {line.product_spec_summary && (
          <div className="field">
            <label>Product Spec</label>
            <span>{line.product_spec_summary}</span>
          </div>
        )}
        {line.delivery_location && (
          <div className="field">
            <label>Delivery Location</label>
            <span>{line.delivery_location}</span>
          </div>
        )}
        {line.delivery_window_start && (
          <div className="field">
            <label>Delivery Window</label>
            <span>
              {new Date(line.delivery_window_start).toLocaleDateString()} to{' '}
              {new Date(line.delivery_window_end || line.delivery_window_start).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="line-actions">
        {isEditable && (
          <button onClick={onEdit} className="btn btn-sm btn-secondary" disabled={isProcessing}>
            Edit
          </button>
        )}
        {isCancellable && (
          <button onClick={onCancel} className="btn btn-sm btn-danger" disabled={isProcessing}>
            {isProcessing ? 'Cancelling...' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * DemandLineForm — Create/Edit demand line form
 */
interface DemandLineFormProps {
  initialState: DemandLineFormState;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

function DemandLineForm({
  initialState,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: DemandLineFormProps): ReactElement {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <form className="demand-line-form" onSubmit={handleSubmit}>
      <h4>{mode === 'create' ? 'Create Demand Line' : 'Edit Demand Line'}</h4>

      <div className="form-group">
        <label htmlFor="lineRef">Line Reference*</label>
        <input
          id="lineRef"
          name="lineRef"
          type="text"
          value={formData.lineRef}
          onChange={handleChange}
          disabled={isSubmitting || mode === 'edit'}
          required
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="commodityCategory">Commodity Category*</label>
        <input
          id="commodityCategory"
          name="commodityCategory"
          type="text"
          value={formData.commodityCategory}
          onChange={handleChange}
          disabled={isSubmitting}
          required
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="productCategory">Product Category</label>
        <input
          id="productCategory"
          name="productCategory"
          type="text"
          value={formData.productCategory}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="qty">Quantity*</label>
        <input
          id="qty"
          name="qty"
          type="number"
          value={formData.qty}
          onChange={handleChange}
          disabled={isSubmitting}
          required
          min="0.01"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label htmlFor="qtyUnit">Quantity Unit*</label>
        <select
          id="qtyUnit"
          name="qtyUnit"
          value={formData.qtyUnit}
          onChange={handleChange}
          disabled={isSubmitting}
          required
        >
          <option value="KG">Kilograms (KG)</option>
          <option value="MT">Metric Tons (MT)</option>
          <option value="L">Liters (L)</option>
          <option value="M3">Cubic Meters (M3)</option>
          <option value="UNIT">Units</option>
          <option value="BOX">Boxes</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="productSpecSummary">Product Specification</label>
        <textarea
          id="productSpecSummary"
          name="productSpecSummary"
          value={formData.productSpecSummary}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={2000}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="deliveryLocation">Delivery Location</label>
        <input
          id="deliveryLocation"
          name="deliveryLocation"
          type="text"
          value={formData.deliveryLocation}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={500}
        />
      </div>

      <div className="form-group">
        <label htmlFor="deliveryWindowStart">Delivery Start Date</label>
        <input
          id="deliveryWindowStart"
          name="deliveryWindowStart"
          type="datetime-local"
          value={formData.deliveryWindowStart}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="deliveryWindowEnd">Delivery End Date</label>
        <input
          id="deliveryWindowEnd"
          name="deliveryWindowEnd"
          type="datetime-local"
          value={formData.deliveryWindowEnd}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default DemandLineSurface;
