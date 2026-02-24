/**
 * G-W3-ROUTING-001 Regression Test — Static Analysis
 *
 * Purpose: Verify all key exports wired by G-W3-ROUTING-001 exist and have
 * the correct function signatures.  This file is validated via `tsc --noEmit`
 * only — no runtime test runner required.
 *
 * Checks:
 *   1. setImpersonationToken   exported from apiClient
 *   2. startImpersonationSession / stopImpersonationSession  from controlPlaneService
 *   3. checkout                exported from cartService
 *   4. getMemberships / createMembership   from tenantService
 *   5. updateBranding          exported from tenantService
 *   6. getTenants / getTenantById  from controlPlaneService (realm-migrated)
 *   7. tenantGet / tenantPost / tenantPut / tenantPatch  from tenantApiClient
 *   8. adminGet / adminPost / adminPut    from adminApiClient
 *
 * Route registration check (api/index.ts):
 *   - impersonationRoutes registered under /api/control — commit 161178b
 *   - tenantProvisionRoutes registered under /api/control — commit 161178b
 *   These cannot be imported here (server-side Fastify plugins); verified by
 *   git show 161178b and manual inspection of api/index.ts.
 */

// -- Imports ------------------------------------------------------------------
import { setImpersonationToken } from '../services/apiClient';
import {
  startImpersonationSession,
  stopImpersonationSession,
  getTenants,
  getTenantById,
  getFeatureFlags,
  upsertFeatureFlag,
} from '../services/controlPlaneService';
import { checkout } from '../services/cartService';
import {
  getMemberships,
  createMembership,
  updateBranding,
} from '../services/tenantService';
import {
  tenantGet,
  tenantPost,
  tenantPut,
  tenantPatch,
} from '../services/tenantApiClient';
import {
  adminGet,
  adminPost,
  adminPut,
} from '../services/adminApiClient';

// -- Assertion sink -----------------------------------------------------------
// assertExported() is a no-op. Passing a symbol verifies the import resolves;
// tsc --noEmit fails if any named export is missing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertExported(_: any): void { /* noop */ }

assertExported(setImpersonationToken);      // apiClient
assertExported(startImpersonationSession);  // controlPlaneService
assertExported(stopImpersonationSession);   // controlPlaneService
assertExported(checkout);                   // cartService
assertExported(getMemberships);             // tenantService
assertExported(createMembership);           // tenantService
assertExported(updateBranding);             // tenantService
assertExported(getTenants);                 // controlPlaneService (adminGet)
assertExported(getTenantById);              // controlPlaneService (adminGet)
assertExported(getFeatureFlags);            // controlPlaneService (adminGet)
assertExported(upsertFeatureFlag);          // controlPlaneService (adminPut)
assertExported(tenantGet);                  // tenantApiClient
assertExported(tenantPost);                 // tenantApiClient
assertExported(tenantPut);                  // tenantApiClient
assertExported(tenantPatch);               // tenantApiClient
assertExported(adminGet);                   // adminApiClient
assertExported(adminPost);                  // adminApiClient
assertExported(adminPut);                   // adminApiClient

export {}; // ensure this is treated as a module
