export type RfqNotificationTrigger = 'EXPLICIT_SUBMIT_ONLY';

export type SupplierRfqSubmittedNotificationLineItem = {
  rfq_id: string;
  catalog_item_id: string;
  item_id: string;
  product_name: string;
  quantity: number;
  price_visibility_state: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | 'LOGIN_REQUIRED' | 'ELIGIBILITY_REQUIRED' | 'HIDDEN';
  rfq_entry_reason: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | null;
};

export type SupplierRfqSubmittedNotificationGroup = {
  supplier_org_id: string;
  buyer_org_id: string;
  submitted_at: string;
  submit_group_id?: string;
  trigger: RfqNotificationTrigger;
  line_items: SupplierRfqSubmittedNotificationLineItem[];
};

export type SupplierRfqNotificationBoundaryLogger = {
  info: (payload: unknown, message: string) => void;
  warn: (payload: unknown, message: string) => void;
};

export type SupplierRfqNotificationBoundaryInput = {
  groups: SupplierRfqSubmittedNotificationGroup[];
  logger?: SupplierRfqNotificationBoundaryLogger;
};

export type SupplierRfqNotificationBoundaryResult = {
  dispatched_count: number;
};

const FORBIDDEN_KEYS = [
  'price',
  'amount',
  'unitPrice',
  'basePrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'internalMargin',
  'commercialTerms',
  'price_disclosure_policy_mode',
  'supplierPolicy',
  'supplierDisclosurePolicy',
  'policyId',
  'policyAudit',
  'approvedBy',
  'risk_score',
  'publicationPosture',
  'buyerScore',
  'supplierScore',
  'ranking',
  'unpublishedEvidence',
  'aiExtractionDraft',
] as const;

function hasForbiddenKeys(payload: unknown): string[] {
  const serialized = JSON.stringify(payload);
  return FORBIDDEN_KEYS.filter(key => serialized.includes(`"${key}"`) || serialized.includes(key));
}

/**
 * Slice F notification boundary:
 * - Submit-only invocation from RFQ submit routes
 * - Supplier-group scoped safe payload only
 * - Best-effort and non-throwing by design
 * - No external provider dependency in this slice
 */
export async function notifySupplierRfqSubmittedGroups(
  input: SupplierRfqNotificationBoundaryInput,
): Promise<SupplierRfqNotificationBoundaryResult> {
  const groups = input.groups.filter(group => group.line_items.length > 0);
  if (groups.length === 0) {
    return { dispatched_count: 0 };
  }

  const logger = input.logger;
  let dispatchedCount = 0;

  for (const group of groups) {
    const safePayload = {
      supplier_org_id: group.supplier_org_id,
      buyer_org_id: group.buyer_org_id,
      submitted_at: group.submitted_at,
      submit_group_id: group.submit_group_id ?? null,
      trigger: group.trigger,
      item_count: group.line_items.length,
      rfq_ids: group.line_items.map(item => item.rfq_id),
      line_items: group.line_items,
    };

    const forbidden = hasForbiddenKeys(safePayload);
    if (forbidden.length > 0) {
      logger?.warn({ forbidden_keys: forbidden, supplier_org_id: group.supplier_org_id }, 'rfq.supplier_notification_boundary_blocked');
      continue;
    }

    logger?.info(
      {
        event: 'rfq.supplier_notification_boundary',
        channel: 'INTERNAL_BOUNDARY',
        payload: safePayload,
      },
      'rfq.supplier_notification_boundary_emitted',
    );

    dispatchedCount += 1;
  }

  return { dispatched_count: dispatchedCount };
}
