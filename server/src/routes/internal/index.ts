/**
 * G-021 Day 3 — Internal Routes Aggregator
 *
 * Combines the two internal Maker-Checker route groups into a single
 * Fastify plugin that can be registered from server/src/index.ts.
 *
 * Route layout after registration:
 *
 *   Tenant (tenant JWT, realmGuard: /api/internal/* → 'tenant' catch-all):
 *     GET  /api/internal/gov/approvals
 *     GET  /api/internal/gov/approvals/:id
 *     POST /api/internal/gov/approvals/:id/sign
 *     POST /api/internal/gov/approvals/:id/replay
 *
 *   Control plane (admin JWT, realmGuard: /api/control/* → 'admin'):
 *     GET  /api/control/internal/gov/approvals
 *     GET  /api/control/internal/gov/approvals/:id
 *     POST /api/control/internal/gov/approvals/:id/sign
 *     POST /api/control/internal/gov/approvals/:id/replay
 *
 * All endpoints require `X-Texqtic-Internal: true` header (enforced per-plugin,
 * before auth). See routes/internal/makerChecker.ts for implementation details.
 *
 * Usage in index.ts:
 *   import internalGovRoutes from './routes/internal/index.js';
 *   await fastify.register(internalGovRoutes);
 *   // No prefix argument — plugin registers at absolute /api/* paths internally.
 */

import type { FastifyPluginAsync } from 'fastify';
import { tenantApprovalRoutes, adminApprovalRoutes } from './makerChecker.js';

/**
 * Combined internal governance routes plugin.
 *
 * Registers:
 *   - Tenant approval routes at /api/internal/gov
 *   - Admin approval routes  at /api/control/internal/gov
 *
 * Both groups enforce X-Texqtic-Internal: true before auth fires.
 */
const internalGovRoutes: FastifyPluginAsync = async fastify => {
  // Tenant-scoped routes → /api/internal/gov/*
  // realmGuard maps /api/* (not /api/control) → 'tenant' by default catch-all.
  await fastify.register(tenantApprovalRoutes, { prefix: '/api/internal/gov' });

  // Admin-scoped routes → /api/control/internal/gov/*
  // realmGuard maps /api/control/* → 'admin' (explicit ENDPOINT_REALM_MAP entry).
  await fastify.register(adminApprovalRoutes, { prefix: '/api/control/internal/gov' });
};

export default internalGovRoutes;
export { tenantApprovalRoutes, adminApprovalRoutes };
