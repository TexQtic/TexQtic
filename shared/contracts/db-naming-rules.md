# DB & Prisma Naming Governance (NON-NEGOTIABLE)

## Golden Rule

**Database speaks snake_case. Code speaks camelCase. Prisma maps between them.**

- DB: snake_case
- Prisma models: PascalCase (singular)
- Prisma fields: camelCase mapped to snake_case via `@map()`
- Tables mapped via `@@map()`

This mapping layer is mandatory and prevents naming drift.

---

## Table Naming (DB)

- plural
- snake_case
- domain-prefixed when ambiguous

Examples:

- tenants
- tenant_domains
- tenant_branding
- admin_users
- audit_logs
- feature_flags
- tenant_feature_overrides
- ai_budgets
- ai_usage_meters
- impersonation_sessions

Forbidden:

- CamelCase tables
- MixedCase
- abbreviations (tnnt, usr)
- UI-inspired names

---

## Column Naming (DB)

- snake_case
- predictable suffixes

Required conventions:

- id (uuid pk)
- tenant_id (uuid fk when tenant-scoped)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, only if justified)

Foreign keys:

- user_id
- admin_user_id
- tenant_id

Forbidden:

- createdAt in DB
- tenantID
- isActive (use is_active)
- polymorphic magic without explicit naming

---

## Prisma Model Naming

- singular
- PascalCase
- semantic match to table

Example:

```prisma
model Tenant {
  id        String   @id @db.Uuid
  slug      String
  createdAt DateTime @map("created_at")
  updatedAt DateTime @map("updated_at")

  @@map("tenants")
}
```

Mandatory:

- Every model has `@@map("snake_case_plural")`
- Every camelCase field that differs from DB has `@map("snake_case")`

---

## Enum Governance

DB enums:

- snake_case
- domain-prefixed
- used sparingly

Example: `tenant_type_enum`, `admin_role_enum`

Values:

- b2b
- b2c
- aggregator
- white_label

Code enums:

- PascalCase enum type
- values match DB enum values EXACTLY
- no translation layers

---

## JSONB Governance

Allowed JSONB use:

- settings, onboarding payloads, UI config, AI prompt configs, capabilities metadata

Not allowed in JSONB:

- identifiers, foreign keys
- money amounts
- workflow state
- frequently filtered/joined fields

All JSONB columns must:

- be named `*_json`
- have a Zod schema in code
