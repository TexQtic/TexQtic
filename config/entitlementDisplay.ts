/**
 * entitlementDisplay.ts — Static display-only feature availability data.
 *
 * GOVERNANCE:
 *   - This file is display-only. It does NOT enforce any runtime gate or backend logic.
 *   - TTP (Trade Transaction Platform) is explicitly ABSENT from this matrix.
 *     Reason: HOLD_FOR_COUNSEL_FEEDBACK — FTR-LEGAL-003 is open MVP_CRITICAL.
 *   - NC Pool / RFQ rows are included: operational in NC Phase 1.
 *   - No exact pricing amounts (₹ or otherwise). See DL-04 in FAM-11B2.
 *   - Paid-tier copy must use only the locked labels below: 'Coming soon' / 'Contact us' / tier availability.
 */

export type AvailabilityLabel =
  | 'Included'
  | 'Coming soon'
  | 'Contact us'
  | 'Available in STARTER'
  | 'Available in PROFESSIONAL'
  | 'Available in ENTERPRISE';

export interface EntitlementRow {
  feature: string;
  category: string;
  FREE: AvailabilityLabel;
  STARTER: AvailabilityLabel;
  PROFESSIONAL: AvailabilityLabel;
  ENTERPRISE: AvailabilityLabel;
  note?: string;
}

/**
 * Static feature entitlement matrix — display only.
 * Source of truth for the FAM-11C tier awareness surface.
 */
export const ENTITLEMENT_DISPLAY_ROWS: readonly EntitlementRow[] = [
  // ─── B2B Workspace ─────────────────────────────────────────────────────────
  {
    feature: 'B2B workspace',
    category: 'Core workspace',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Supplier profile',
    category: 'Core workspace',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Product & catalog management',
    category: 'Core workspace',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Team management',
    category: 'Core workspace',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  // ─── Network Commerce ──────────────────────────────────────────────────────
  {
    feature: 'RFQ (request for quote)',
    category: 'Network Commerce',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
    note: 'Operational in NC Phase 1',
  },
  {
    feature: 'Procurement Pools',
    category: 'Network Commerce',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
    note: 'Operational in NC Phase 1',
  },
  {
    feature: 'Aggregator workspace',
    category: 'Network Commerce',
    FREE: 'Coming soon',
    STARTER: 'Coming soon',
    PROFESSIONAL: 'Available in PROFESSIONAL',
    ENTERPRISE: 'Included',
  },
  // ─── AI ────────────────────────────────────────────────────────────────────
  {
    feature: 'AI Document Intelligence',
    category: 'AI',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
    note: 'FREE plan: 50,000 token/month limit',
  },
  {
    feature: 'Extended AI budget',
    category: 'AI',
    FREE: 'Coming soon',
    STARTER: 'Available in STARTER',
    PROFESSIONAL: 'Available in PROFESSIONAL',
    ENTERPRISE: 'Included',
  },
  // ─── Compliance & Trust ────────────────────────────────────────────────────
  {
    feature: 'Certifications & compliance',
    category: 'Compliance',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Audit logs',
    category: 'Compliance',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  // ─── Platform & Integrations ───────────────────────────────────────────────
  {
    feature: 'White-label overlay',
    category: 'Platform',
    FREE: 'Coming soon',
    STARTER: 'Coming soon',
    PROFESSIONAL: 'Available in PROFESSIONAL',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'API access',
    category: 'Platform',
    FREE: 'Coming soon',
    STARTER: 'Available in STARTER',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Custom integrations',
    category: 'Platform',
    FREE: 'Coming soon',
    STARTER: 'Coming soon',
    PROFESSIONAL: 'Contact us',
    ENTERPRISE: 'Contact us',
  },
  // ─── Support ───────────────────────────────────────────────────────────────
  {
    feature: 'Community support',
    category: 'Support',
    FREE: 'Included',
    STARTER: 'Included',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Priority support',
    category: 'Support',
    FREE: 'Coming soon',
    STARTER: 'Available in STARTER',
    PROFESSIONAL: 'Included',
    ENTERPRISE: 'Included',
  },
  {
    feature: 'Dedicated onboarding assistance',
    category: 'Support',
    FREE: 'Coming soon',
    STARTER: 'Coming soon',
    PROFESSIONAL: 'Available in PROFESSIONAL',
    ENTERPRISE: 'Included',
  },
] as const;

/**
 * Upgrade CTA mailto href — locked in FAM-11B2 DL-03.
 * Body is URL-encoded: Company/Org name, current plan, interested tier, use case, contact person.
 * Do NOT change this value without a governance decision update.
 */
export const UPGRADE_CTA_MAILTO =
  'mailto:hello@texqtic.com?subject=TexQtic%20upgrade%20interest&body=Company%2FOrg%20name%3A%20%0ACurrent%20plan%3A%20FREE%20%E2%80%94%20Early%20Access%0AInterested%20tier%3A%20%0AUse%20case%3A%20%0AContact%20person%3A%20%0A';

/**
 * Locked upgrade copy labels per tier — DL-04 in FAM-11B2.
 * No ₹ amounts, no commitments, no checkout.
 */
export const TIER_UPGRADE_COPY: Record<string, string> = {
  FREE: 'Free during early access',
  STARTER: 'Early adopter pricing opening soon \u2014 join the waitlist',
  PROFESSIONAL: 'Contact us for pricing',
  ENTERPRISE: 'Contact sales',
};
