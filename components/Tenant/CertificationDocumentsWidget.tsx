import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIError } from '../../services/apiClient';
import {
  deleteCertificationDocument,
  getCertificationDocumentAccess,
  listCertifications,
  uploadCertificationDocument,
  type CertificationListItem,
} from '../../services/certificationService';

interface CertificationDocumentsWidgetProps {
  canEdit: boolean;
  onManageCertifications?: () => void;
}

type RowPhase = 'IDLE' | 'UPLOADING' | 'OPENING' | 'REMOVING';

const STATE_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-sky-100 text-sky-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-slate-100 text-slate-500',
  PENDING_APPROVAL: 'bg-violet-100 text-violet-700',
};

function friendlyError(err: unknown): string {
  if (err instanceof APIError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Certification document action failed. Please try again.';
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Not set';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Not uploaded';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Size not recorded';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StateBadge({ stateKey }: { stateKey: string }) {
  const className = STATE_COLORS[stateKey] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {stateKey}
    </span>
  );
}

export function CertificationDocumentsWidget({
  canEdit,
  onManageCertifications,
}: CertificationDocumentsWidgetProps) {
  const [items, setItems] = useState<CertificationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowPhase, setRowPhase] = useState<Record<string, RowPhase>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});

  const loadCertifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listCertifications({ limit: 50 });
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertifications();
  }, [loadCertifications]);

  const summary = useMemo(() => {
    const issuedCount = items.filter(item => item.issuedAt !== null || item.stateKey === 'APPROVED').length;
    const documentCount = items.filter(item => item.documentUploadedAt !== null).length;
    const certificationTypes = Array.from(new Set(items.map(item => item.certificationType))).slice(0, 6);

    return { issuedCount, documentCount, certificationTypes };
  }, [items]);

  const setPhase = (id: string, phase: RowPhase) => {
    setRowPhase(current => ({ ...current, [id]: phase }));
  };

  const clearPhase = (id: string) => {
    setRowPhase(current => ({ ...current, [id]: 'IDLE' }));
  };

  const setRowMessage = (id: string, message: string | null) => {
    setRowError(current => ({ ...current, [id]: message }));
  };

  const handleUpload = async (certificationId: string, file: File | null) => {
    if (!file) return;

    setSuccess(null);
    setRowMessage(certificationId, null);
    setPhase(certificationId, 'UPLOADING');
    try {
      await uploadCertificationDocument(certificationId, file);
      setSuccess('Certificate document saved.');
      await loadCertifications();
    } catch (err) {
      setRowMessage(certificationId, friendlyError(err));
    } finally {
      clearPhase(certificationId);
    }
  };

  const handleOpen = async (certificationId: string) => {
    setSuccess(null);
    setRowMessage(certificationId, null);
    setPhase(certificationId, 'OPENING');
    try {
      const result = await getCertificationDocumentAccess(certificationId);
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setRowMessage(certificationId, friendlyError(err));
    } finally {
      clearPhase(certificationId);
    }
  };

  const handleRemove = async (certification: CertificationListItem) => {
    if (!certification.documentUploadedAt) return;

    const confirmed = window.confirm('Remove this certificate document? This clears the stored private document and its metadata.');
    if (!confirmed) return;

    setSuccess(null);
    setRowMessage(certification.id, null);
    setPhase(certification.id, 'REMOVING');
    try {
      await deleteCertificationDocument(certification.id);
      setSuccess('Certificate document removed.');
      await loadCertifications();
    } catch (err) {
      setRowMessage(certification.id, friendlyError(err));
    } finally {
      clearPhase(certification.id);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Certifications & Documents
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Certification document access</h2>
          <p className="text-sm leading-6 text-slate-600">
            Review tenant certifications and manage private certificate documents without leaving Company Profile. Full lifecycle changes stay in the Certifications workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageCertifications}
          disabled={!onManageCertifications}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          Manage all certifications
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Total certifications</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? '...' : total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Issued or approved</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? '...' : summary.issuedCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Documents uploaded</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? '...' : summary.documentCount}</div>
        </div>
      </div>

      {summary.certificationTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.certificationTypes.map(type => (
            <span key={type} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {type}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          Loading certification documents...
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No certifications have been created yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Use the full Certifications workspace to create certifications and manage lifecycle transitions.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map(certification => {
            const hasDocument = certification.documentUploadedAt !== null;
            const phase = rowPhase[certification.id] ?? 'IDLE';
            const busy = phase !== 'IDLE';

            return (
              <article key={certification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{certification.certificationType}</h3>
                      <StateBadge stateKey={certification.stateKey} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Issued {formatDate(certification.issuedAt)} | Expires {formatDate(certification.expiresAt)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasDocument ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {hasDocument ? 'Document uploaded' : 'No document uploaded'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {hasDocument ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Filename</div>
                        <div className="mt-1 break-words font-medium text-slate-800">{certification.documentOriginalName ?? 'Name not recorded'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Type</div>
                        <div className="mt-1 font-medium text-slate-800">{certification.documentMimeType ?? 'Type not recorded'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Size</div>
                        <div className="mt-1 font-medium text-slate-800">{formatBytes(certification.documentSizeBytes)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Uploaded</div>
                        <div className="mt-1 font-medium text-slate-800">{formatDateTime(certification.documentUploadedAt)}</div>
                      </div>
                    </div>
                  ) : (
                    <p>No certificate document has been uploaded for this certification.</p>
                  )}
                </div>

                {rowError[certification.id] && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {rowError[certification.id]}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {hasDocument && (
                    <button
                      type="button"
                      onClick={() => void handleOpen(certification.id)}
                      disabled={busy}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {phase === 'OPENING' ? 'Opening...' : 'Open document'}
                    </button>
                  )}

                  {canEdit ? (
                    <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900">
                      {phase === 'UPLOADING' ? 'Uploading...' : hasDocument ? 'Replace document' : 'Upload document'}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        disabled={busy}
                        className="sr-only"
                        onChange={event => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          void handleUpload(certification.id, selectedFile);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  ) : (
                    <span className="text-xs text-slate-500">OWNER or ADMIN role is required to upload or replace documents.</span>
                  )}

                  {canEdit && hasDocument && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(certification)}
                      disabled={busy}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {phase === 'REMOVING' ? 'Removing...' : 'Remove document'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
