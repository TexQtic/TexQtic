# Schema Budget (Guardrail)

## Phase 2 Budget (Control Plane Foundation)

- Max tables: **15**
- Max Prisma schema files: **1**
- Business-domain tables: **0**
- Workflow-history tables: **0**

## Rule: Every new table requires this header

- Domain owner: (control / tenant / domain-name)
- Plane: (control-plane | tenant-plane)
- Lifecycle: (create/update/archive)
- Reason: (query-critical / constraints / joins)
- Indexes: (list)
- RLS: (yes/no + why)

## PR Checklist Requirement

Every PR that changes Prisma or SQL must include:

- ✅ "Schema budget checked"
- ✅ "Naming rules followed"
- ✅ "RLS reviewed (if tenant-scoped)"
