# TexQtic — Control Center Taxonomy

> Supersession / authority note: This artifact remains the descriptive navigation and tower-taxonomy
> reference for control-center grouping and historical navigation language. It is descriptive only.
> It is not the canonical family-definition authority, launch-readiness authority, or current
> control-plane sequencing authority for platform control-plane under the adopted platform model.
> Current family-level control-plane classification and adjacent-family boundary authority now lives
> in `docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md` and
> `docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-RECONCILIATION-v1.md`.

| Field     | Value                                                            |
|-----------|------------------------------------------------------------------|
| **Date**  | 2026-02-24                                                       |
| **Status**| DRAFT — aligns with G-W3-AUDIT-001 baseline + Addendum          |
| **Realm** | control (SuperAdmin only)                                        |
| **Links** | `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`, `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` |

> The SuperAdmin control center is described here through **4 Control Towers** as a navigation and grouping lens. Each tower is a distinct governance concern. No tower bleeds into another's domain. This taxonomy does not by itself govern current family authority, launch posture, or implementation sequencing.

---

## Organization Principle

The SuperAdmin is **not** a power user of a tenant feature set. The SuperAdmin is the **platform operator** — a role that governs the infrastructure that tenants run on. Every control center view must serve platform-level governance, not tenant-level operations.

> If a view serves a single tenant's workflow → it belongs in the **tenant dashboard**, not the control center.

---

## Tower 1 — Platform Control Tower

**Purpose:** Manage who is on the platform, the platform's raw capabilities, and the release/feature surface.

**Actor:** SUPER_ADMIN, SUPPORT (read-only on most)

| Module                | Description                                            | Status (as of G-W3)       | Component                        |
|-----------------------|--------------------------------------------------------|---------------------------|----------------------------------|
| Tenant Registry       | List, search, filter all tenants; view tier + status   | ✅ Implemented            | `TenantRegistry.tsx`             |
| Tenant Details        | Deep-dive: domains, branding, memberships, budget, AI meters | ✅ Implemented       | `TenantDetails.tsx`              |
| Tenant Provisioning   | Create new org + primary owner atomically              | ✅ API done; UI stub       | via `POST /api/control/tenants/provision` |
| Feature Flags         | Global + per-tenant flag management (`OP_*` + product flags) | ✅ Implemented       | `FeatureFlags.tsx`               |
| Domain Management     | Verify/manage tenant custom domains                    | ⏳ Stub / partial          | —                                |
| Release / Kill-Switch | Platform-wide kill switches (`KILL_SWITCH_ALL`, `OP_PLATFORM_READ_ONLY`) | ✅ Flags exist; UI ✅ | `FeatureFlags.tsx` |
| Architecture Blueprints | Preserved placeholder panel retained on disk; removed from active nav and not current architecture authority | ⚠️ Preserved placeholder | `ArchitectureBlueprints.tsx`     |
| API Docs              | Preserved placeholder panel retained on disk; removed from active nav and not current API authority | ⚠️ Preserved placeholder | `ApiDocs.tsx`                    |

**Data authority:** `tenants`, `tenant_domains`, `feature_flags`, `tenant_feature_overrides`

**Audit events:** `TENANT_CREATED`, `TENANT_STATUS_CHANGED`, `FEATURE_FLAG_UPDATED`, `DOMAIN_VERIFIED`

---

## Tower 2 — Governance & Risk Tower

**Purpose:** Enforce platform-level compliance, dispute resolution, audit integrity, and access policy.

**Actor:** SUPER_ADMIN, SUPPORT (limited scope)

| Module                | Description                                            | Status (as of G-W3)       | Component                        |
|-----------------------|--------------------------------------------------------|---------------------------|----------------------------------|
| Compliance Queue      | Cross-tenant compliance tasks awaiting admin action    | ✅ Implemented            | `ComplianceQueue.tsx`            |
| Dispute Cases         | Inter-tenant disputes escalated to platform            | ✅ Implemented            | `DisputeCases.tsx`               |
| Audit Logs            | Immutable cross-tenant audit trail viewer              | ✅ Implemented            | `AuditLogs.tsx`                  |
| Admin RBAC            | Manage admin user roles and permissions                | ✅ Implemented            | `AdminRBAC.tsx`                  |
| AI Governance         | AI usage policy, budget caps, explainability artifacts | ✅ Implemented (surface)  | `AiGovernance.tsx`               |
| Impersonation Session | Start/stop/audit admin impersonation of tenant users   | ✅ API done; UI surface TBD | via impersonation routes       |
| Policy Registry       | Governance policies (future: RLS, data retention, export) | ⏳ Not started          | —                                |

**Data authority:** `audit_logs`, `dispute_cases`, `admin_users`, `impersonation_sessions`, `ai_budgets`, `ai_usage_meters`

**Audit events:** `ADMIN_LOGIN`, `IMPERSONATION_START`, `IMPERSONATION_STOP`, `DISPUTE_RESOLVED`, `COMPLIANCE_TASK_CLOSED`, `POLICY_UPDATED`

---

## Tower 3 — Finance Tower

**Purpose:** Platform-level fee visibility, tenant billing status, settlement event tracking, and reconciliation. **NOT** a payments processor — system-of-record only.

**Actor:** SUPER_ADMIN (full), SUPPORT (read-only)

| Module                  | Description                                              | Status (as of G-W3)   | Component              |
|-------------------------|----------------------------------------------------------|-----------------------|------------------------|
| Finance Ops             | Platform revenue overview, fee schedules, tier pricing  | ✅ Implemented (surface) | `FinanceOps.tsx`    |
| Tenant Billing Status   | Per-tenant subscription status, plan, billing alerts    | ⏳ Not started        | —                      |
| Transaction Fee Ledger  | Visibility into platform-earned transaction fees        | ⏳ Not started        | —                      |
| Settlement Events       | Settlement acknowledgement records (tenant-to-tenant)   | ⏳ Not started        | —                      |
| Reconciliation          | Fee reconciliation + audit export                       | ⏳ Not started        | —                      |
| PSP/Bank Hooks          | Status: **architecture hookpoints only — not activated** | 🔒 Phase 3 gate       | —                      |

**Data authority:** `tenants.plan`, billing records (future), `audit_logs` (finance-tagged events)

**Audit events:** `SUBSCRIPTION_CHANGED`, `TRANSACTION_FEE_RECORDED`, `SETTLEMENT_ACKNOWLEDGED`, `RECONCILIATION_EXPORTED`

**Constraint:** Finance Tower never moves money. It records and reports on financial events only. See `PLATFORM_DOCTRINE_ADDENDUM.md §5`.

---

## Tower 4 — Operations Tower

**Purpose:** Day-to-day platform health, support case management, escalation handling, and system-level observability.

**Actor:** SUPER_ADMIN, SUPPORT

| Module                | Description                                            | Status (as of G-W3)       | Component                        |
|-----------------------|--------------------------------------------------------|---------------------------|----------------------------------|
| System Health         | Live platform health indicators                        | ✅ Implemented            | `SystemHealth.tsx`               |
| Event Stream          | Real-time platform event log                           | ✅ Implemented            | `EventStream.tsx`                |
| Support Cases         | Tenant-reported escalations managed by support team    | ⏳ Stub (DisputeCases used) | `DisputeCases.tsx` (repurposed) |
| Kill-Switch Panel     | Emergency operational levers                           | ✅ Via feature flags       | `FeatureFlags.tsx`               |
| Data Model Viewer     | Internal schema documentation surface                  | ✅ Implemented            | `DataModel.tsx`                  |
| Middleware Scaffold   | Internal API/middleware documentation                  | ✅ Implemented            | `MiddlewareScaffold.tsx`         |
| Backend Skeleton      | Internal backend documentation surface                 | ✅ Implemented            | `BackendSkeleton.tsx`            |

**Data authority:** `event_logs`, platform health metrics (external), support tickets (future)

**Audit events:** `KILL_SWITCH_ACTIVATED`, `SUPPORT_CASE_RESOLVED`, `SYSTEM_HEALTH_ALERT`

---

## Tower Summary Matrix

| Tower                 | Primary Concern            | superAdmin | support | Wave 4 Priority |
|-----------------------|----------------------------|------------|---------|-----------------|
| Platform Control      | Who's on the platform + capabilities | ✅ Full | R/O | Medium |
| Governance & Risk     | Compliance + disputes + audit | ✅ Full | Limited | High |
| Finance               | Revenue + billing + settlement | ✅ Full | R/O | High |
| Operations            | Health + cases + escalations | ✅ Full | ✅ Full | Medium |

---

## Navigation Grouping (SuperAdminShell)

The existing `layouts/SuperAdminShell.tsx` sidebar should be organized around these 4 towers. Current groupings in the sidebar should map as follows:

```
SuperAdmin Control Center
├── 🏗️  Platform Control
│   ├── Tenant Registry
│   ├── Tenant Details
│   └── Feature Flags
│
├── ⚖️  Governance & Risk
│   ├── Compliance Queue
│   ├── Dispute Cases
│   ├── Audit Logs
│   ├── Admin RBAC
│   └── AI Governance
│
├── 💰  Finance
│   ├── Finance Ops
│   ├── Tenant Billing (⏳)
│   └── Transaction Ledger (⏳)
│
└── ⚙️  Operations
    ├── System Health
    ├── Event Stream
    └── Support Cases
```

---

## Anti-Drift Checklist (for new control-center views)

Before adding any view to the control center:

- [ ] Does it serve **platform operator** concerns (not a single tenant's workflow)?
- [ ] Is it assigned to exactly one Tower (no split-brain modules)?
- [ ] Are the actor roles (SUPER_ADMIN / SUPPORT) and their permissions defined?
- [ ] Is the data authority boundary declared (which tables, which RLS context)?
- [ ] Are the required audit events listed?
- [ ] Does Finance Tower content confirm it never moves money?

---

*Document last updated: 2026-02-24*
