export type ZohoBooksActivationSnapshot = {
  organization: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    jurisdiction: string;
    status: string;
  };
  tenant: {
    id: string;
    name: string;
    plan: string;
  };
  activatedAt: string;
  source?: string;
};

export type ZohoBooksContactPayload = {
  contact_name: string;
  company_name: string;
  contact_type: 'customer';
  customer_sub_type: 'business';
  is_taxable: true;
  notes: string;
  custom_fields: Array<{ api_name: string; value: string }>;
};

export function buildZohoBooksContactPayload(snapshot: ZohoBooksActivationSnapshot): ZohoBooksContactPayload {
  const contactName = snapshot.organization.tradeName?.trim() || snapshot.organization.legalName.trim();
  const companyName = snapshot.organization.legalName.trim();
  const source = snapshot.source?.trim() || 'TexQtic Main App';

  return {
    contact_name: contactName,
    company_name: companyName,
    contact_type: 'customer',
    customer_sub_type: 'business',
    is_taxable: true,
    notes: source,
    custom_fields: [
      { api_name: 'cf_texqtic_org_id', value: snapshot.organization.id },
      { api_name: 'cf_texqtic_tenant_id', value: snapshot.tenant.id },
      { api_name: 'cf_texqtic_plan_tier', value: snapshot.tenant.plan },
      { api_name: 'cf_texqtic_activated_at', value: snapshot.activatedAt },
      { api_name: 'cf_texqtic_source', value: source },
    ],
  };
}

export function buildZohoBooksIdempotencyHeaders(orgId: string): Record<string, string> {
  return {
    'X-Unique-Identifier-Key': 'cf_texqtic_org_id',
    'X-Unique-Identifier-Value': orgId,
    'X-Upsert': 'true',
  };
}