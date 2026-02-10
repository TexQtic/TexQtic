import { TenantType, TenantConfig, TenantStatus } from './types';

export const EXAMPLE_PRODUCTS = [
  {
    id: 'p1',
    name: 'Industrial Drill Press',
    category: 'Machinery',
    price: 1250,
    moq: 5,
    image: 'https://picsum.photos/seed/drill/400/300',
  },
  {
    id: 'p2',
    name: 'Solar Panel Array',
    category: 'Energy',
    price: 450,
    moq: 20,
    image: 'https://picsum.photos/seed/solar/400/300',
  },
  {
    id: 'p3',
    name: 'Bulk Organic Cotton',
    category: 'Textiles',
    price: 15,
    moq: 100,
    image: 'https://picsum.photos/seed/cotton/400/300',
  },
  {
    id: 'p4',
    name: 'Steel Girders (Structural)',
    category: 'Construction',
    price: 80,
    moq: 50,
    image: 'https://picsum.photos/seed/steel/400/300',
  },
];

export const AUDIT_LOGS: any[] = [
  {
    id: 'a1',
    timestamp: '2024-05-20 14:22:01',
    adminUser: 'sjones@texqtic.com',
    action: 'TENANT_SUSPENDED',
    tenantId: 't4',
    details: 'Manual suspension due to billing delinquency.',
  },
  {
    id: 'a2',
    timestamp: '2024-05-20 15:10:44',
    adminUser: 'akhan@texqtic.com',
    action: 'FEATURE_FLAG_UPDATED',
    tenantId: 't2',
    details: 'Enabled advanced_negotiations_v2 for ProSupply.',
  },
  {
    id: 'a3',
    timestamp: '2024-05-20 16:05:12',
    adminUser: 'sjones@texqtic.com',
    action: 'AI_LIMIT_INCREASED',
    tenantId: 't1',
    details: 'Added 500k token quota per Enterprise SLA.',
  },
];

export const FEATURE_FLAGS = [
  {
    id: 'ff1',
    key: 'ai_negotiation_v2',
    description: 'Enable advanced LLM-driven negotiation strategy.',
    global: false,
    status: 'BETA',
  },
  {
    id: 'ff2',
    key: 'crypto_settlement',
    description: 'Allow tenants to settle payouts via USDC.',
    global: false,
    status: 'ALPHA',
  },
  {
    id: 'ff3',
    key: 'global_search_overhaul',
    description: 'Use vector database for across-tenant search.',
    global: true,
    status: 'PRODUCTION',
  },
  {
    id: 'ff4',
    key: 'white_label_custom_domains',
    description: 'Allow CNAME mapping for white-label tenants.',
    global: true,
    status: 'PRODUCTION',
  },
];

export const ADMIN_USERS = [
  {
    id: 'u1',
    email: 'sjones@texqtic.com',
    role: 'SuperAdmin',
    department: 'Executive',
    lastLogin: '2h ago',
  },
  {
    id: 'u2',
    email: 'akhan@texqtic.com',
    role: 'OpsAdmin',
    department: 'Trust & Safety',
    lastLogin: '10m ago',
  },
  {
    id: 'u3',
    email: 'vlee@texqtic.com',
    role: 'FinanceAdmin',
    department: 'Treasury',
    lastLogin: '1d ago',
  },
];
