# OmniPlatform to TexQtic Migration Remediation Plan

**Created:** February 7, 2026  
**Purpose:** Systematic removal of legacy OmniPlatform branding before Doctrine v1.4 implementation  
**Source:** OMNIPLATFORM_USAGE_REPORT.md (47 occurrences across 22 files)

---

## 🔒 CANONICAL IDENTITY (LOCKED)

**These values are FINAL and must not be changed:**

| Identifier Type                  | Canonical Value         |
| -------------------------------- | ----------------------- |
| **Product Name**                 | TexQtic                 |
| **Public Domain**                | texqtic.com             |
| **Database Name**                | texqtic_core_db         |
| **Admin Email Domain**           | admin@texqtic.com       |
| **Support Email Domain**         | support@texqtic.com     |
| **Package Namespace (Frontend)** | texqtic-platform-ui     |
| **Package Namespace (Backend)**  | texqtic-platform-server |
| **Docker Container**             | texqtic-platform-db     |

---

## ⚠️ HARD GATE: Must Be Completed Before Doctrine v1.4 Implementation

**Why this matters:**

Doctrine v1.4 introduces irreversible artifacts:

- Event streams with immutable event names
- Audit logs with permanent metadata
- DPP exports with compliance fingerprints
- Policy hashes that reference domain identifiers

**Once Doctrine v1.4 executes, any legacy identifiers will be permanently embedded in:**

- Blockchain-anchored compliance records
- Cryptographic policy hashes
- Immutable audit trails
- Regulatory exports

**Gate Status:** 🔴 BLOCKED until all phases complete and verification checklist passes

---

## PHASED REMEDIATION PLAN

### Phase 1: User-Facing Branding & UI (P0 — Critical)

**Risk Level:** 🔴 HIGH  
**Impact:** Direct user visibility, SEO, branding  
**Estimated Effort:** 2-3 hours  
**Testing Required:** Manual UI review, browser testing

#### Files to Modify

##### 1.1 Page Title & Metadata

**File:** `index.html`  
**Line:** 7  
**Change:**

```html
<!-- OLD -->
<title>OmniPlatform Architect</title>

<!-- NEW -->
<title>TexQtic Platform</title>
```

**Validation:** Open app in browser, verify tab title

---

**File:** `metadata.json`  
**Line:** 2  
**Change:**

```json
// OLD
"name": "OmniPlatform Architect & Control Plane",

// NEW
"name": "TexQtic Platform & Control Plane",
```

**Validation:** Check PWA manifest, app launcher name

---

##### 1.2 Authentication UI

**File:** `components/Auth/AuthFlows.tsx`  
**Line:** 21  
**Change:**

```tsx
// OLD
{
  isAdminRealm ? '🛡️ OmniAdmin' : '🚀 OmniPlatform';
}

// NEW
{
  isAdminRealm ? '🛡️ TexQtic Admin' : '🚀 TexQtic';
}
```

**Validation:** Test login/signup flows in both admin and tenant modes

---

**File:** `vendor/texqtic-ui-studio/components/Auth/AuthFlows.tsx`  
**Line:** 21  
**Change:** Same as above  
**Note:** Vendor mirror - must stay in sync

---

##### 1.3 Admin Shell Branding

**File:** `layouts/SuperAdminShell.tsx`  
**Line:** 34  
**Change:**

```tsx
// OLD
<span>🛡️</span> OmniPlatform

// NEW
<span>🛡️</span> TexQtic
```

**Validation:** Load admin shell, verify header branding

---

**File:** `layouts/SuperAdminShell.tsx`  
**Line:** 43  
**Change:**

```tsx
// OLD
sjones@omni.com <span className="text-rose-500 ml-2">(SuperAdmin)</span>

// NEW
sjones@texqtic.com <span className="text-rose-500 ml-2">(SuperAdmin)</span>
```

**Validation:** Verify mock user email display in admin UI

---

##### 1.4 Domain Display (Tenant Registry)

**File:** `components/ControlPlane/TenantRegistry.tsx`  
**Line:** 66  
**Change:**

```tsx
// OLD
<div className="text-[10px] text-slate-500 font-mono">{tenant.slug}.omniplatform.com</div>

// NEW
<div className="text-[10px] text-slate-500 font-mono">{tenant.slug}.texqtic.com</div>
```

**Validation:** Load tenant registry, verify domain pattern display

---

##### 1.5 White-Label Settings

**File:** `components/Tenant/WhiteLabelSettings.tsx`  
**Line:** 26  
**Change:**

```tsx
// OLD
<span>Value: proxy.omniplatform.com</span>

// NEW
<span>Value: proxy.texqtic.com</span>
```

**Validation:** Open white-label settings, verify example domain

---

**File:** `vendor/texqtic-ui-studio/components/Tenant/WhiteLabelSettings.tsx`  
**Line:** 26  
**Change:** Same as above  
**Note:** Vendor mirror

---

##### 1.6 Onboarding Flow

**File:** `components/Onboarding/OnboardingFlow.tsx`  
**Line:** 76  
**Change:**

```tsx
// OLD
.omniplatform.com

// NEW
.texqtic.com
```

**Validation:** Run onboarding flow, verify domain suffix

---

**File:** `vendor/texqtic-ui-studio/components/Onboarding/OnboardingFlow.tsx`  
**Line:** 76  
**Change:** Same as above  
**Note:** Vendor mirror

---

#### Phase 1 Validation Checklist

- [ ] Browser tab title shows "TexQtic Platform"
- [ ] Login screen shows "TexQtic" branding
- [ ] Admin shell header shows "TexQtic"
- [ ] Tenant registry displays `.texqtic.com` domains
- [ ] White-label settings show `proxy.texqtic.com`
- [ ] Onboarding flow shows `.texqtic.com` suffix
- [ ] No "OmniPlatform" visible in UI at any route
- [ ] Both light/dark themes tested
- [ ] Mobile responsive view tested

#### Phase 1 Rollback

If issues detected:

1. Revert commits in reverse order (vendor files last)
2. Clear browser cache and localStorage
3. Restart dev server
4. Re-test affected routes

---

### Phase 2: Package Names & Infrastructure Namespaces (P1 — High Priority)

**Risk Level:** 🔴 HIGH  
**Impact:** NPM publishing, CI/CD, imports, Docker infrastructure  
**Estimated Effort:** 1-2 hours  
**Testing Required:** `npm install` (repo uses npm, not pnpm), Docker rebuild, import statement checks  
**Note:** This repo uses npm + package-lock.json (verified)

#### Files to Modify

##### 2.1 Frontend Package

**File:** `package.json`  
**Line:** 2  
**Change:**

```json
// OLD
"name": "omni-platform-scaffold",

// NEW
"name": "texqtic-platform-ui",
```

**Post-change:** Run `npm install` to regenerate lock file

---

**File:** `package-lock.json`  
**Lines:** 2, 8  
**Action:** Auto-regenerated by `npm install` after package.json change  
**Validation:** Verify package name updated throughout lock file

---

##### 2.2 Backend Package

**File:** `server/package.json`  
**Line:** 2  
**Change:**

```json
// OLD
"name": "omni-platform-server",

// NEW
"name": "texqtic-platform-server",
```

**Post-change:** Run `npm install` in server directory

---

**File:** `server/package-lock.json`  
**Lines:** 2, 8  
**Action:** Auto-regenerated by `npm install`

---

##### 2.3 Vendor Package

**File:** `vendor/texqtic-ui-studio/package.json`  
**Line:** 3  
**Change:**

```json
// OLD
"name": "omni-platform-scaffold",

// NEW
"name": "texqtic-ui-studio",
```

**Note:** Vendor package - coordinate with vendor if external

---

##### 2.4 Database Configuration

**File:** `.env.example`  
**Line:** 2  
**Change:**

```bash
# OLD
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/omni_platform?schema=public"

# NEW
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/texqtic_core_db?schema=public"
```

**Critical:** Update actual `.env` file (not tracked in git)  
**Strategy:** For local/dev Docker: recreate container with new DB name (preferred over ALTER DATABASE)  
**Validation:** Test database connection with new name

---

##### 2.5 Docker Infrastructure

**File:** `server/docker-compose.yml`  
**Line:** 6  
**Change:**

```yaml
# OLD
container_name: omni-platform-db

# NEW
container_name: texqtic-platform-db
```

---

**File:** `server/docker-compose.yml`  
**Line:** 11  
**Change:**

```yaml
# OLD
POSTGRES_DB: omni_platform

# NEW
POSTGRES_DB: texqtic_core_db
```

**Post-change:** Recreate Docker containers with new database name  
**Command:** `docker-compose down -v && docker-compose up -d` (drops old DB, creates new)

---

##### 2.6 API Metadata

**File:** `server/src/index.ts`  
**Line:** 65  
**Change:**

```typescript
// OLD
name: 'OmniPlatform API',

// NEW
name: 'TexQtic API',
```

**Validation:** Check API logs, error messages

---

#### Phase 2 Validation Checklist

- [ ] `npm install` completes without errors (frontend)
- [ ] `npm install` completes without errors (backend)
- [ ] No import errors referencing old package names
- [ ] Docker containers rebuild successfully
- [ ] Database connection works with new name
- [ ] API server starts with "TexQtic API" name
- [ ] No references to `omni-platform-*` in node_modules
- [ ] CI/CD pipelines updated (if applicable)

#### Phase 2 Rollback

**Critical:** Database name change requires migration

If rollback needed:

1. Stop all services
2. Revert package.json files
3. Run `npm install` in both directories
4. If database renamed: restore from backup or rename back
5. Rebuild Docker containers
6. Restart services

**Database rollback:**

```bash
# For local/dev: recreate container with old name
# 1. Stop containers
docker-compose down -v

# 2. Revert docker-compose.yml and .env
# 3. Recreate with old DB name
docker-compose up -d

# Note: SQL ALTER DATABASE only if production/shared DB (not recommended in early stage)
```

---

### Phase 3: Database Seed Data & Admin Accounts (P1 — High Priority)

**Risk Level:** 🔴 HIGH  
**Impact:** Initial admin user emails, authentication  
**Estimated Effort:** 30 minutes  
**Testing Required:** Re-run seed, test admin login

#### Files to Modify

##### 3.1 Admin Seed Emails

**File:** `server/prisma/seed.ts`  
**Lines:** 18, 21, 28, 31  
**Changes:**

```typescript
// OLD
where: { email: 'admin@omniplatform.io' },
  email: 'admin@omniplatform.io',

// NEW
where: { email: 'admin@texqtic.com' },
  email: 'admin@texqtic.com',

// OLD
where: { email: 'support@omniplatform.io' },
  email: 'support@omniplatform.io',

// NEW
where: { email: 'support@texqtic.com' },
  email: 'support@texqtic.com',
```

**Post-change Actions:**

1. Update existing admin users in database (if already seeded)
2. Or: Drop and recreate database, re-run seed
3. Update any stored credentials/password managers

**Note:** Add comment in seed.ts: `// DEV SEED ONLY - Not for production use`

---

##### 3.2 Documentation of Seed Emails

**File:** `server/README.md`  
**Lines:** 164, 167  
**Changes:**

```markdown
<!-- OLD -->

- **admin@omniplatform.io** (SUPER_ADMIN)
- **support@omniplatform.io** (SUPPORT)

<!-- NEW -->

- **admin@texqtic.com** (SUPER_ADMIN)
- **support@texqtic.com** (SUPPORT)
```

---

#### Phase 3 Validation Checklist

- [ ] Seed script runs without errors
- [ ] Admin login works with `admin@texqtic.com`
- [ ] Support login works with `support@texqtic.com`
- [ ] Old emails (`@omniplatform.io`) no longer exist in database
- [ ] Password reset flows tested
- [ ] Email verification flows tested (if implemented)

#### Phase 3 Rollback

```sql
-- Revert admin emails in database
UPDATE admin_users
SET email = 'admin@omniplatform.io'
WHERE email = 'admin@texqtic.com';

UPDATE admin_users
SET email = 'support@omniplatform.io'
WHERE email = 'support@texqtic.com';
```

---

### Phase 4: Mock Data, Docs, Comments (P2 — Medium Priority)

**Risk Level:** 🟡 MEDIUM  
**Impact:** Development/demo data, documentation accuracy  
**Estimated Effort:** 1 hour  
**Testing Required:** Review docs, verify mock data in UI

#### Files to Modify

##### 4.1 Mock Admin Users

**File:** `constants.tsx`  
**Lines:** 108-110  
**Change:**

```typescript
// OLD
{ id: 'u1', email: 'sjones@omni.com', role: 'SuperAdmin', department: 'Executive', lastLogin: '2h ago' },
{ id: 'u2', email: 'akhan@omni.com', role: 'OpsAdmin', department: 'Trust & Safety', lastLogin: '10m ago' },
{ id: 'u3', email: 'vlee@omni.com', role: 'FinanceAdmin', department: 'Treasury', lastLogin: '1d ago' },

// NEW
{ id: 'u1', email: 'sjones@texqtic.com', role: 'SuperAdmin', department: 'Executive', lastLogin: '2h ago' },
{ id: 'u2', email: 'akhan@texqtic.com', role: 'OpsAdmin', department: 'Trust & Safety', lastLogin: '10m ago' },
{ id: 'u3', email: 'vlee@texqtic.com', role: 'FinanceAdmin', department: 'Treasury', lastLogin: '1d ago' },
```

---

##### 4.2 Mock Audit Logs

**File:** `constants.tsx`  
**Lines:** 72-74  
**Change:**

```typescript
// OLD
{ id: 'a1', timestamp: '2024-05-20 14:22:01', adminUser: 'sjones@omni.com', action: 'TENANT_SUSPENDED', tenantId: 't4', details: 'Manual suspension due to billing delinquency.' },
{ id: 'a2', timestamp: '2024-05-20 15:10:44', adminUser: 'akhan@omni.com', action: 'FEATURE_FLAG_UPDATED', tenantId: 't2', details: 'Enabled advanced_negotiations_v2 for ProSupply.' },
{ id: 'a3', timestamp: '2024-05-20 16:05:12', adminUser: 'sjones@omni.com', action: 'AI_LIMIT_INCREASED', tenantId: 't1', details: 'Added 500k token quota per Enterprise SLA.' },

// NEW
{ id: 'a1', timestamp: '2024-05-20 14:22:01', adminUser: 'sjones@texqtic.com', action: 'TENANT_SUSPENDED', tenantId: 't4', details: 'Manual suspension due to billing delinquency.' },
{ id: 'a2', timestamp: '2024-05-20 15:10:44', adminUser: 'akhan@texqtic.com', action: 'FEATURE_FLAG_UPDATED', tenantId: 't2', details: 'Enabled advanced_negotiations_v2 for ProSupply.' },
{ id: 'a3', timestamp: '2024-05-20 16:05:12', adminUser: 'sjones@texqtic.com', action: 'AI_LIMIT_INCREASED', tenantId: 't1', details: 'Added 500k token quota per Enterprise SLA.' },
```

---

##### 4.3 Code Comments

**File:** `index.css`  
**Line:** 1  
**Change:**

```css
/* OLD */
/* Global styles for OmniPlatform */

/* NEW */
/* Global styles for TexQtic Platform */
```

---

**File:** `components/ControlPlane/MiddlewareScaffold.tsx`  
**Line:** 12  
**Change:**

```typescript
// OLD
// Example: 'boutique.omni.com' -> 't4'

// NEW
// Example: 'boutique.texqtic.com' -> 't4'
```

---

##### 4.4 Documentation Files

**File:** `README.md`  
**Line:** 2  
**Change:**

```markdown
<!-- OLD -->

# OmniPlatform: Multi-Tenant Architecture Scaffold

<!-- NEW -->

# TexQtic: Multi-Tenant Architecture Scaffold
```

---

**File:** `server/README.md`  
**Line:** 1  
**Change:**

```markdown
<!-- OLD -->

# OmniPlatform Server

<!-- NEW -->

# TexQtic Platform Server
```

---

**File:** `VSCODE_SETUP.md`  
**Line:** 1  
**Change:**

```markdown
<!-- OLD -->

# VS Code Setup Guide for OmniPlatform

<!-- NEW -->

# VS Code Setup Guide for TexQtic Platform
```

---

**File:** `VSCODE_SETUP.md`  
**Line:** 457  
**Change:**

```
<!-- OLD -->
omni-platform/

<!-- NEW -->
texqtic-platform/
```

---

##### 4.5 Verification Documentation

**File:** `PHASE2_VERIFICATION.md`  
**Line:** 9  
**Change:**

```bash
# OLD
docker ps | findstr omni-platform-db

# NEW
docker ps | findstr texqtic-platform-db
```

---

**File:** `PHASE2_VERIFICATION.md`  
**Line:** 75  
**Change:**

```bash
# OLD
psql postgresql://postgres:postgres@localhost:5432/omni_platform

# NEW
psql postgresql://postgres:postgres@localhost:5432/texqtic_core_db
```

---

#### Phase 4 Validation Checklist

- [ ] Mock data displays correctly in UI
- [ ] Admin users in constants show @texqtic.com
- [ ] Audit logs show @texqtic.com emails
- [ ] README files display "TexQtic" branding
- [ ] Setup docs reference correct names
- [ ] Verification commands work with new names
- [ ] Code comments accurate

#### Phase 4 Rollback

Low risk - can revert individual files as needed

---

### Phase 5: Sanitizer + CI Enforcement (P2 — Medium Priority)

**Risk Level:** 🟡 MEDIUM  
**Impact:** Vendor directory consistency, CI gate enforcement  
**Estimated Effort:** 30 minutes  
**Testing Required:** Sanitizer run, CI grep gate

#### Vendor Directory Strategy (CORRECTED)

**Rule:** DO NOT manually edit `vendor/texqtic-ui-studio/` files

**Reason:** Vendor directory is an intake source. Manual edits create confusion.

**Correct workflow:**

1. Make all changes to canonical repository files (Phases 1-4)
2. Run intake sanitizer to update vendor output
3. Vendor changes are handled by sanitizer, not manual edits

**Vendor files affected by sanitizer:**

- components/Auth/AuthFlows.tsx
- components/Onboarding/OnboardingFlow.tsx
- components/Tenant/WhiteLabelSettings.tsx
- package.json

**Action:** Let sanitizer handle vendor alignment after canonical changes complete

#### Phase 5 Validation Checklist

- [ ] Sanitizer runs successfully
- [ ] Vendor files updated by sanitizer (not manual edits)
- [ ] CI grep gate passes (see below)
- [ ] No import errors from vendor directory

#### Phase 5 CI Enforcement Gate

**Add to CI/CD pipeline:**

```bash
# Enforce: "omni" strings allowed ONLY in:
# - /docs/**/OMNIPLATFORM_*
# - /_ai_intake/**/incoming/** (raw drops)
# - /vendor/** (if truly raw source)

grep -ri "omni" . \
  --exclude-dir={node_modules,.git,dist,build,_ai_intake,vendor} \
  --exclude="OMNIPLATFORM_*" \
  --exclude="*.lock"

# Exit code 0 (matches found) = FAIL
# Exit code 1 (no matches) = PASS
```

**Local verification script:** Add to `package.json`:

```json
"scripts": {
  "verify:identity": "grep -ri 'omni' . --exclude-dir={node_modules,.git,dist,build,_ai_intake,vendor} --exclude='OMNIPLATFORM_*' --exclude='*.lock' || echo 'Identity hygiene: PASS'"
}
```

#### Phase 5 Rollback

Revert sanitizer configuration if vendor output breaks

---

## IDENTITY HYGIENE VERIFICATION CHECKLIST

**Run this checklist AFTER all phases complete and BEFORE Doctrine v1.4:**

### Automated Verification

```bash
# Search for any remaining "omni" references (case-insensitive)
# Exclude: node_modules, .git, dist, build
grep -ri "omni" . --exclude-dir={node_modules,.git,dist,build,vendor} --exclude="*.lock" --exclude="OMNIPLATFORM_*"

# Expected result: 0 matches (except in audit/remediation docs)
```

### Manual Verification (P0 Items)

- [ ] **Browser Tab Title:** Shows "TexQtic Platform"
- [ ] **Login Screen:** Shows "TexQtic" branding
- [ ] **Admin Shell:** Header shows "TexQtic"
- [ ] **Tenant Registry:** All domains end in `.texqtic.com`
- [ ] **White-Label UI:** Example shows `proxy.texqtic.com`
- [ ] **Onboarding:** Domain suffix is `.texqtic.com`
- [ ] **Package Names:** `package.json` shows `texqtic-*`
- [ ] **Database Name:** Connection string uses `texqtic_core_db`
- [ ] **Docker Container:** Named `texqtic-platform-db`
- [ ] **Admin Emails:** Seed uses `@texqtic.com` domain

### Infrastructure Verification (P1 Items)

- [ ] `npm install` runs without errors (frontend)
- [ ] `npm install` runs without errors (backend)
- [ ] Database connection works
- [ ] Docker containers start successfully
- [ ] API server starts with correct name
- [ ] No import errors in console
- [ ] Dev server starts without warnings

### Data Verification (P1 Items)

- [ ] Admin login works with `admin@texqtic.com`
- [ ] Support login works with `support@texqtic.com`
- [ ] No `@omniplatform.io` emails exist in database
- [ ] Mock data shows `@texqtic.com` emails
- [ ] Audit logs (if any) contain no "omni" references

### Documentation Verification (P2 Items)

- [ ] README shows "TexQtic" branding
- [ ] Server README updated
- [ ] Setup docs reference correct names
- [ ] Verification commands use new names
- [ ] Comments and examples updated

### Final Gate Check

- [ ] All 47 audit findings addressed
- [ ] All 22 affected files modified
- [ ] All lock files regenerated (npm)
- [ ] All validation checklists passed
- [ ] Database recreated with new name (local/dev)
- [ ] Rollback plan documented and tested
- [ ] Team notified of upcoming changes
- [ ] CI grep gate script added
- [ ] `npm run verify:identity` passes
- [ ] Vendor updated by sanitizer (not manual edits)

---

## EXECUTION SEQUENCE

**Recommended order:**

1. **Pre-flight:** Create database backup, document current state
2. **Execute Phase 1:** User-facing changes (highest visibility)
3. **Test Phase 1:** Full UI regression test
4. **Execute Phase 2:** Infrastructure changes
5. **Test Phase 2:** Build, deploy, and connection tests
6. **Execute Phase 3:** Database seed data
7. **Test Phase 3:** Auth and admin flows
8. **Execute Phase 4:** Docs and mock data
9. **Execute Phase 5:** Vendor alignment
10. **Final Verification:** Run complete hygiene checklist
11. **Gate Decision:** PASS/FAIL for Doctrine v1.4

**Total Estimated Time:** 5-7 hours (including testing)

**Corrections Applied (Feb 7, 2026):**

- ✅ Package manager confirmed: npm (not pnpm)
- ✅ Database strategy: recreate containers (not ALTER DATABASE)
- ✅ Vendor strategy: sanitizer handles updates (not manual edits)
- ✅ Seed emails: marked as DEV SEED ONLY
- ✅ CI enforcement: grep gate added to pipeline

---

## RISK MITIGATION

### High-Risk Operations

1. **Database name change** (Phase 2.4)
   - Backup required
   - Downtime expected
   - Migration script needed

2. **Package name changes** (Phase 2.1-2.3)
   - Lock file regeneration
   - Import statement validation
   - CI/CD pipeline updates

3. **Admin email changes** (Phase 3.1)
   - Credential updates required
   - Auth flows must be retested
   - Password managers need updates

### Safety Measures

- **Git branch:** Create `migration/omni-to-texqtic` branch
- **Commits:** One phase per commit for easy rollback
- **Testing:** Full regression after each phase
- **Backups:** Database snapshot before Phase 3
- **Documentation:** Log all changes in commit messages

---

## POST-REMEDIATION

### What Happens Next

1. **Merge to main:** After all validation passes
2. **Deploy to staging:** Test in staging environment
3. **Production deployment:** Coordinate with downtime window
4. **Doctrine v1.4 Unblocked:** Safe to proceed with implementation
5. **Archive audit:** Move audit report to `/docs/archive/`

### Long-Term Monitoring

- [ ] Monitor logs for any "omni" references
- [ ] Check analytics for broken links (old domains)
- [ ] Verify email deliverability (@texqtic.com)
- [ ] Update external documentation (if any)
- [ ] Notify stakeholders of branding change

---

## APPENDIX: FILE CHANGE SUMMARY

### Files Modified by Phase

**Phase 1 (10 files):**

- index.html
- metadata.json
- components/Auth/AuthFlows.tsx
- vendor/.../Auth/AuthFlows.tsx
- layouts/SuperAdminShell.tsx (2 changes)
- components/ControlPlane/TenantRegistry.tsx
- components/Tenant/WhiteLabelSettings.tsx
- vendor/.../Tenant/WhiteLabelSettings.tsx
- components/Onboarding/OnboardingFlow.tsx
- vendor/.../Onboarding/OnboardingFlow.tsx

**Phase 2 (9 files):**

- package.json
- package-lock.json
- server/package.json
- server/package-lock.json
- vendor/texqtic-ui-studio/package.json
- .env.example
- server/docker-compose.yml (2 changes)
- server/src/index.ts

**Phase 3 (2 files):**

- server/prisma/seed.ts (4 changes)
- server/README.md (2 changes)

**Phase 4 (6 files):**

- constants.tsx (2 sections)
- index.css
- components/ControlPlane/MiddlewareScaffold.tsx
- README.md
- server/README.md
- VSCODE_SETUP.md (2 changes)
- PHASE2_VERIFICATION.md (2 changes)

**Phase 5 (4 files):**

- vendor directory files (already covered in other phases)

**Total:** 22 unique files, 47 individual changes

---

## GOVERNANCE COMPLIANCE

**Governance Review:**

- [x] DB naming rules: COMPLIANT (texqtic_core_db follows snake_case)
- [x] Schema budget: N/A (no schema changes)
- [x] RLS policy: N/A (no RLS changes)
- [x] API contracts: COMPLIANT (branding only, no API breaks)
- [x] Event naming: COMPLIANT (no event changes)
- [x] Architecture governance: COMPLIANT (identity change only)
- [x] Phase 2 constraints: COMPLIANT (no new tables/features)

**Domain:** control + tenant (identity affects both)  
**Plane:** control-plane + tenant-plane (branding affects both)  
**Lifecycle:** N/A (remediation, not feature work)

---

**Status:** ✅ READY FOR EXECUTION PENDING REVIEW

**Next Steps:**

1. Review this plan with Team A (Platform)
2. Create migration branch
3. Execute phases sequentially
4. Run verification checklist
5. Deploy to staging
6. Production deployment
7. Unblock Doctrine v1.4

**Document Version:** 1.0  
**Last Updated:** February 7, 2026  
**Prepared By:** GitHub Copilot Repository Auditor
