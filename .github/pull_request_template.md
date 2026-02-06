## What changed?

## Governance Checklist (required)

- [ ] No changes to /server, /prisma, /shared/contracts unless Team A approved
- [ ] DB naming rules followed (snake_case DB, camelCase code, Prisma maps)
- [ ] Schema budget checked (Phase 2 max 15 tables)
- [ ] RLS reviewed (if tenant-scoped)
- [ ] No secrets committed (.env\*, keys)

## UI Changes (if applicable)

- [ ] UI only in /frontend
- [ ] No direct @google/genai calls in /frontend (server-proxy only)
