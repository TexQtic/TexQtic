# Phase 2 Setup Commands

## 1. Start PostgreSQL

```powershell
cd server
docker-compose up -d
```

## 2. Install dependencies

```powershell
npm install
```

## 3. Setup environment

```powershell
# Copy example env
Copy-Item ..\.env.example .env

# Edit .env and add your configuration
# Minimum required: DATABASE_URL, JWT secrets, GEMINI_API_KEY
```

## 4. Run Database Migrations

```powershell
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate

# Apply RLS policies
npm run db:rls
```

## 5. Seed Database

```powershell
npx prisma db seed
```

## 6. Start Server

```powershell
npm run dev
```

## 7. Verify

```powershell
# In another terminal
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

## Quick Reset (if needed)

```powershell
# Stop server (Ctrl+C)
# Reset database
npx prisma migrate reset
# Reseed
npx prisma db seed
# Restart
npm run dev
```
