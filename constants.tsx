
import React from 'react';
import { TenantType, TenantConfig, TenantStatus, ComplianceRequest, PayoutRequest } from './types';

export const PLATFORM_TENANTS: Record<string, TenantConfig> = {
  'global-aggregator': {
    id: 't1',
    slug: 'aggregator',
    name: 'IndustryConnect Global',
    type: TenantType.AGGREGATOR,
    status: TenantStatus.ACTIVE,
    plan: 'ENTERPRISE',
    theme: { primaryColor: '#0f172a', secondaryColor: '#3b82f6', logo: '🌐' },
    features: ['directory', 'leads', 'analytics'],
    aiBudget: 1000000,
    aiUsage: 250000,
    billingStatus: 'CURRENT',
    riskScore: 12,
  },
  'pro-wholesale': {
    id: 't2',
    slug: 'b2b-market',
    name: 'ProSupply B2B',
    type: TenantType.B2B,
    status: TenantStatus.ACTIVE,
    plan: 'PAID',
    theme: { primaryColor: '#1e293b', secondaryColor: '#10b981', logo: '🏗️' },
    features: ['bulk-catalog', 'negotiation', 'rfqs'],
    aiBudget: 500000,
    aiUsage: 480000,
    billingStatus: 'CURRENT',
    riskScore: 24,
  },
  'consumer-shop': {
    id: 't3',
    slug: 'retail',
    name: 'DailyEssentials Store',
    type: TenantType.B2C,
    status: TenantStatus.TRIAL,
    plan: 'TRIAL',
    theme: { primaryColor: '#4f46e5', secondaryColor: '#f43f5e', logo: '🛍️' },
    features: ['cart', 'reviews', 'returns'],
    aiBudget: 100000,
    aiUsage: 12000,
    billingStatus: 'CURRENT',
    riskScore: 5,
  },
  'boutique-brand': {
    id: 't4',
    slug: 'boutique',
    name: 'LuxeLiving (White-Label)',
    type: TenantType.WHITE_LABEL,
    status: TenantStatus.SUSPENDED,
    plan: 'PAID',
    theme: { primaryColor: '#78350f', secondaryColor: '#d97706', logo: '✨' },
    features: ['custom-branding', 'independent-checkout'],
    aiBudget: 250000,
    aiUsage: 250000,
    billingStatus: 'DELINQUENT',
    riskScore: 88,
  },
};

export const EXAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Industrial Drill Press', category: 'Machinery', price: 1250, moq: 5, image: 'https://picsum.photos/seed/drill/400/300' },
  { id: 'p2', name: 'Solar Panel Array', category: 'Energy', price: 450, moq: 20, image: 'https://picsum.photos/seed/solar/400/300' },
  { id: 'p3', name: 'Bulk Organic Cotton', category: 'Textiles', price: 15, moq: 100, image: 'https://picsum.photos/seed/cotton/400/300' },
  { id: 'p4', name: 'Steel Girders (Structural)', category: 'Construction', price: 80, moq: 50, image: 'https://picsum.photos/seed/steel/400/300' },
];

export const AUDIT_LOGS: any[] = [
  { id: 'a1', timestamp: '2024-05-20 14:22:01', adminUser: 'sjones@omni.com', action: 'TENANT_SUSPENDED', tenantId: 't4', details: 'Manual suspension due to billing delinquency.' },
  { id: 'a2', timestamp: '2024-05-20 15:10:44', adminUser: 'akhan@omni.com', action: 'FEATURE_FLAG_UPDATED', tenantId: 't2', details: 'Enabled advanced_negotiations_v2 for ProSupply.' },
  { id: 'a3', timestamp: '2024-05-20 16:05:12', adminUser: 'sjones@omni.com', action: 'AI_LIMIT_INCREASED', tenantId: 't1', details: 'Added 500k token quota per Enterprise SLA.' },
];

export const COMPLIANCE_QUEUE: ComplianceRequest[] = [
  { id: 'c1', tenantName: 'Industrial Group A', type: 'ISO9001', status: 'PENDING', submittedAt: '2024-05-21 09:00' },
  { id: 'c2', tenantName: 'SupplyCo Ltd', type: 'BUSINESS_LICENSE', status: 'PENDING', submittedAt: '2024-05-21 10:30' },
  { id: 'c3', tenantName: 'Global Fabrics', type: 'TAX_ID', status: 'APPROVED', submittedAt: '2024-05-20 11:15' },
];

export const PAYOUT_QUEUE: PayoutRequest[] = [
  { id: 'p1', tenantName: 'ProSupply B2B', amount: 14200.50, currency: 'USD', status: 'PENDING' },
  { id: 'p2', tenantName: 'DailyEssentials', amount: 3100.20, currency: 'USD', status: 'PROCESSING' },
];

export const SYSTEM_HEALTH = [
  { service: 'Identity API', status: 'UP', latency: '42ms' },
  { service: 'Catalog Engine', status: 'UP', latency: '115ms' },
  { service: 'Commerce Bus', status: 'UP', latency: '88ms' },
  { service: 'AI Gateway', status: 'DEGRADED', latency: '1400ms' },
];

export const FEATURE_FLAGS = [
  { id: 'ff1', key: 'ai_negotiation_v2', description: 'Enable advanced LLM-driven negotiation strategy.', global: false, status: 'BETA' },
  { id: 'ff2', key: 'crypto_settlement', description: 'Allow tenants to settle payouts via USDC.', global: false, status: 'ALPHA' },
  { id: 'ff3', key: 'global_search_overhaul', description: 'Use vector database for across-tenant search.', global: true, status: 'PRODUCTION' },
  { id: 'ff4', key: 'white_label_custom_domains', description: 'Allow CNAME mapping for white-label tenants.', global: true, status: 'PRODUCTION' },
];

export const DISPUTE_CASES = [
  { id: 'd1', tenantName: 'LuxeLiving', counterparty: 'Supplier A', reason: 'Non-delivery of high-value goods.', priority: 'HIGH', status: 'OPEN' },
  { id: 'd2', tenantName: 'ProSupply B2B', counterparty: 'Logistics X', reason: 'Damaged shipment (Freight).', priority: 'MEDIUM', status: 'UNDER_REVIEW' },
];

export const ADMIN_USERS = [
  { id: 'u1', email: 'sjones@omni.com', role: 'SuperAdmin', department: 'Executive', lastLogin: '2h ago' },
  { id: 'u2', email: 'akhan@omni.com', role: 'OpsAdmin', department: 'Trust & Safety', lastLogin: '10m ago' },
  { id: 'u3', email: 'vlee@omni.com', role: 'FinanceAdmin', department: 'Treasury', lastLogin: '1d ago' },
];
