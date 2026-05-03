/**
 * Invoice Service — Frontend API Client (TTP Slice 4)
 *
 * Tenant seller endpoints:
 *   POST   /api/tenant/invoices                             — create invoice
 *   GET    /api/tenant/invoices                             — list invoices
 *   GET    /api/tenant/invoices/:invoiceId                  — get invoice detail
 *   POST   /api/tenant/invoices/:invoiceId/transition       — submit (DRAFT→SUBMITTED)
 *
 * Tenant buyer endpoints:
 *   GET    /api/tenant/trades/:tradeId/invoice-approval     — buyer invoice view
 *   POST   /api/tenant/invoices/:invoiceId/buyer-action     — acknowledge / dispute
 *
 * Control-plane admin endpoints:
 *   GET    /api/control/invoices                            — list (cross-tenant)
 *   GET    /api/control/invoices/:invoiceId                 — get detail
 *   PATCH  /api/control/invoices/:invoiceId/transition      — admin transition (SUPER_ADMIN)
 *
 * D-017-A: org_id is NEVER sent in any request body. Server derives it from JWT.
 *
 * Buyer visibility: buyer responses contain no credit/risk/admin internals.
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { tenantGet, tenantPost } from './tenantApiClient';
import { adminGet, adminPost, adminPatch } from './adminApiClient';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type InvoiceStateKey =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'INELIGIBLE'
  | 'DISPUTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'SUPERSEDED';

/** Seller-visible invoice record. */
export interface TenantInvoiceRecord {
  id: string;
  org_id: string;
  buyer_org_id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: InvoiceStateKey;
  document_url: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Buyer-visible invoice record.
 * Does NOT contain seller org_id, notes, credit/risk, or admin fields.
 */
export interface BuyerInvoiceRecord {
  id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: InvoiceStateKey;
  document_url: string | null;
  created_at: string;
}

/** Full admin-visible invoice record. */
export interface AdminInvoiceRecord {
  id: string;
  org_id: string;
  buyer_org_id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: InvoiceStateKey;
  document_url: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface CreateInvoiceInput {
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  currency: string;
  gross_amount: number;
  document_url?: string | null;
  notes?: string | null;
}

export interface AdminTransitionInput {
  to_state_key: InvoiceStateKey;
  reason: string;
  maker_user_id?: string | null;
  checker_user_id?: string | null;
}

export type BuyerAction = 'ACKNOWLEDGE' | 'DISPUTE';

// ─── Tenant seller API ────────────────────────────────────────────────────────

export async function createInvoice(input: CreateInvoiceInput): Promise<TenantInvoiceRecord> {
  return tenantPost<TenantInvoiceRecord>('/api/tenant/invoices', input);
}

export async function listInvoices(params?: {
  trade_id?: string;
  state_key?: string;
}): Promise<TenantInvoiceRecord[]> {
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString()
    : '';
  return tenantGet<TenantInvoiceRecord[]>(`/api/tenant/invoices${query}`);
}

export async function getInvoice(invoiceId: string): Promise<TenantInvoiceRecord> {
  return tenantGet<TenantInvoiceRecord>(`/api/tenant/invoices/${invoiceId}`);
}

export async function transitionInvoice(
  invoiceId: string,
  to_state_key: 'SUBMITTED',
  reason: string,
): Promise<TenantInvoiceRecord> {
  return tenantPost<TenantInvoiceRecord>(`/api/tenant/invoices/${invoiceId}/transition`, {
    to_state_key,
    reason,
  });
}

// ─── Tenant buyer API ─────────────────────────────────────────────────────────

export async function getBuyerInvoiceApproval(
  tradeId: string,
): Promise<BuyerInvoiceRecord[]> {
  return tenantGet<BuyerInvoiceRecord[]>(`/api/tenant/trades/${tradeId}/invoice-approval`);
}

export async function submitBuyerAction(
  invoiceId: string,
  action: BuyerAction,
  reason: string,
): Promise<{ acknowledged: boolean; new_state_key: InvoiceStateKey }> {
  return tenantPost<{ acknowledged: boolean; new_state_key: InvoiceStateKey }>(
    `/api/tenant/invoices/${invoiceId}/buyer-action`,
    { action, reason },
  );
}

// ─── Admin (control-plane) API ────────────────────────────────────────────────

export async function adminListInvoices(params?: {
  org_id?: string;
  trade_id?: string;
  state_key?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminInvoiceRecord[]> {
  const query = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  return adminGet<AdminInvoiceRecord[]>(`/api/control/invoices${query}`);
}

export async function adminGetInvoice(invoiceId: string): Promise<AdminInvoiceRecord> {
  return adminGet<AdminInvoiceRecord>(`/api/control/invoices/${invoiceId}`);
}

export async function adminTransitionInvoice(
  invoiceId: string,
  input: AdminTransitionInput,
): Promise<AdminInvoiceRecord> {
  return adminPatch<AdminInvoiceRecord>(`/api/control/invoices/${invoiceId}/transition`, input);
}
