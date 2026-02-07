# OmniPlatform Server

Multi-tenant platform backend with strict isolation, audit logging, and feature flags.

## Architecture

- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM + RLS policies
- **Auth**: JWT (dual realm: tenant + admin)
- **Validation**: Zod
- **Multi-tenancy**: RLS policies + middleware enforcement

## Setup

### Prerequisites
- Node.js v20+
- PostgreSQL 14+ (or Docker)

### Installation

```bash
cd server
npm install
```

### Environment

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example .env
# Edit .env with your configuration
```

### Database Setup

#### Option 1: Docker (Recommended)
```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Check status
docker-compose ps
```

#### Option 2: Local PostgreSQL
Ensure PostgreSQL is running and update DATABASE_URL in `.env`

### Prisma Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate

# Apply RLS policies
npm run db:rls

# Seed database with sample data
npx prisma db seed
```

## Development

```bash
npm run dev
```

Server runs at http://localhost:3001

## Database Management

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name
```

## Scripts

- `npm run dev` - Start dev server with watch mode
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:rls` - Apply RLS policies
- `npm run db:studio` - Open Prisma Studio
- `npx prisma db seed` - Seed database

## API Structure

### Tenant Realm (Requires tenant auth)
- `GET /api/me` - Current user info
- `GET /api/tenant/audit-logs` - Tenant audit logs (RLS enforced)
- `GET /api/tenant/memberships` - Tenant memberships (RLS enforced)

### Admin Realm (Requires admin auth)
- `GET /api/control/tenants` - List all tenants
- `GET /api/control/tenants/:id` - Get tenant details
- `GET /api/control/audit-logs` - List all audit logs
- `GET /api/control/feature-flags` - List feature flags

### Public
- `GET /health` - Health check
- `GET /` - API info

## Testing RLS Policies

### 1. Get Admin Token (for testing)
Create a temporary test route or use Prisma Studio to get admin IDs, then generate tokens manually.

### 2. Test Admin Access
```bash
# List all tenants (admin only)
curl -X GET http://localhost:3001/api/control/tenants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# List all audit logs (admin only)
curl -X GET http://localhost:3001/api/control/audit-logs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Test Tenant Isolation
```bash
# Get tenant A memberships (with tenant A token)
curl -X GET http://localhost:3001/api/tenant/memberships \
  -H "Authorization: Bearer TENANT_A_TOKEN"

# Try to access tenant B memberships (with tenant A token) - should fail or return empty
curl -X GET http://localhost:3001/api/tenant/memberships \
  -H "Authorization: Bearer TENANT_A_TOKEN" \
  -H "X-Tenant-Id: TENANT_B_ID"
```

### 4. Test Audit Log Immutability
```sql
-- In psql or Prisma Studio, try to update/delete audit log
-- Should fail due to RLS policies
UPDATE audit_logs SET action = 'MODIFIED' WHERE id = 'some-id';
-- ERROR: permission denied
```

## Seeded Data

After running `npx prisma db seed`:

### Tenants
- **acme-corp** (B2B, Professional plan)
  - Owner: owner@acme.example.com
  - Password: Password123!
  
- **white-label-co** (B2C, Enterprise plan)
  - Owner: owner@whitelabel.example.com
  - Password: Password123!

### Admin Users
- **admin@texqtic.com** (SUPER_ADMIN)
  - Password: Password123!
  
- **support@texqtic.com** (SUPPORT)
  - Password: Password123!
  - Note: DEV SEED ONLY

### Feature Flags
- `KILL_SWITCH_ALL` - Global kill switch (disabled)
- `AI_INSIGHTS_ENABLED` - AI insights (enabled)
- `ADVANCED_ANALYTICS` - Advanced analytics (enabled)
- `MULTI_CURRENCY` - Multi-currency support (disabled globally, enabled for acme-corp)

## Security

- All tenant routes enforce isolation via RLS
- Admin routes require admin JWT
- Audit logs are append-only (UPDATE/DELETE denied)
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with separate secrets for tenant/admin realms
- Feature flags with global kill switch

## Multi-Tenancy

Every request to tenant endpoints must include valid JWT with tenant context.
Backend validates tenant access and sets DB session variables for RLS policies.

### RLS Session Variables
- `app.tenant_id` - Current tenant UUID
- `app.is_admin` - Admin bypass flag

## Troubleshooting

### "Table does not exist" error
```bash
npm run db:migrate
```

### "RLS policies not working"
```bash
npm run db:rls
```

### "Cannot connect to database"
Check DATABASE_URL in `.env` and ensure PostgreSQL is running

### "Seed fails"
Reset and reseed:
```bash
npx prisma migrate reset
npx prisma db seed
```
