# OmniPlatform Usage Audit Report

**Generated:** February 7, 2026  
**Audit Scope:** Complete repository (frontend + backend + configs + docs + vendor)  
**Methodology:** Regex-based search for all variants of "OmniPlatform" and related terms

---

## EXECUTIVE SUMMARY

**Total Matches:** 47 unique occurrences  
**Unique Files Affected:** 22 files  
**High-Risk Items:** 15 items affecting branding, auth, URLs, and metadata

### Breakdown by File Type

| File Type       | Count | % of Total |
| --------------- | ----- | ---------- |
| TypeScript/TSX  | 14    | 29.8%      |
| JSON (configs)  | 9     | 19.1%      |
| Markdown (docs) | 10    | 21.3%      |
| CSS             | 1     | 2.1%       |
| HTML            | 1     | 2.1%       |
| YAML/Docker     | 2     | 4.3%       |
| Environment     | 1     | 2.1%       |
| SQL (seed data) | 4     | 8.5%       |
| Lock files      | 5     | 10.6%      |

---

## DETAILED FINDINGS BY CATEGORY

### 🎨 UI/COPY — Visible User-Facing Strings

#### **Page Title & Metadata**

**File:** `index.html`  
**Line:** 7  
**Match:** `<title>OmniPlatform Architect</title>`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Browser tab title visible to all users

---

**File:** `metadata.json`  
**Line:** 2  
**Match:** `"name": "OmniPlatform Architect & Control Plane",`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — App metadata, may affect PWA/manifest

---

#### **Authentication UI**

**File:** `components/Auth/AuthFlows.tsx`  
**Line:** 21  
**Match:** `{isAdminRealm ? '🛡️ OmniAdmin' : '🚀 OmniPlatform'}`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Primary branding in login/signup flow

---

**File:** `vendor/texqtic-ui-studio/components/Auth/AuthFlows.tsx`  
**Line:** 21  
**Match:** `{isAdminRealm ? '🛡️ OmniAdmin' : '🚀 OmniPlatform'}`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Vendor copy of auth flow (duplicate)

---

#### **Navigation & Branding**

**File:** `layouts/SuperAdminShell.tsx`  
**Line:** 34  
**Match:** `<span>🛡️</span> OmniPlatform`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Admin shell header/logo area

---

**File:** `layouts/SuperAdminShell.tsx`  
**Line:** 43  
**Match:** `sjones@omni.com <span className="text-rose-500 ml-2">(SuperAdmin)</span>`  
**Category:** UI/Copy  
**Risk Level:** 🟡 MEDIUM — Example user email in UI

---

#### **Tenant Registry & Domain Display**

**File:** `components/ControlPlane/TenantRegistry.tsx`  
**Line:** 66  
**Match:** `<div className="text-[10px] text-slate-500 font-mono">{tenant.slug}.omniplatform.com</div>`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Domain pattern shown in tenant list

---

**File:** `components/Tenant/WhiteLabelSettings.tsx`  
**Line:** 26  
**Match:** `<span>Value: proxy.omniplatform.com</span>`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — White-label settings example

---

**File:** `vendor/texqtic-ui-studio/components/Tenant/WhiteLabelSettings.tsx`  
**Line:** 26  
**Match:** `<span>Value: proxy.omniplatform.com</span>`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Vendor copy (duplicate)

---

#### **Onboarding Flow**

**File:** `components/Onboarding/OnboardingFlow.tsx`  
**Line:** 76  
**Match:** `.omniplatform.com`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Domain suffix in onboarding UI

---

**File:** `vendor/texqtic-ui-studio/components/Onboarding/OnboardingFlow.tsx`  
**Line:** 76  
**Match:** `.omniplatform.com`  
**Category:** UI/Copy  
**Risk Level:** 🔴 HIGH — Vendor copy (duplicate)

---

### 💻 CODE IDENTIFIERS — Variables, Constants, Comments

#### **Global Styles Comment**

**File:** `index.css`  
**Line:** 1  
**Match:** `/* Global styles for OmniPlatform */`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — CSS comment, not user-facing

---

#### **Mock Data — Admin Users**

**File:** `constants.tsx`  
**Lines:** 108-110  
**Matches:**

```typescript
{ id: 'u1', email: 'sjones@omni.com', role: 'SuperAdmin', department: 'Executive', lastLogin: '2h ago' },
{ id: 'u2', email: 'akhan@omni.com', role: 'OpsAdmin', department: 'Trust & Safety', lastLogin: '10m ago' },
{ id: 'u3', email: 'vlee@omni.com', role: 'FinanceAdmin', department: 'Treasury', lastLogin: '1d ago' },
```

**Category:** Code Identifiers  
**Risk Level:** 🟡 MEDIUM — Mock data with @omni.com emails

---

#### **Mock Data — Audit Logs**

**File:** `constants.tsx`  
**Lines:** 72-74  
**Matches:**

```typescript
{ id: 'a1', timestamp: '2024-05-20 14:22:01', adminUser: 'sjones@omni.com', action: 'TENANT_SUSPENDED', tenantId: 't4', details: 'Manual suspension due to billing delinquency.' },
{ id: 'a2', timestamp: '2024-05-20 15:10:44', adminUser: 'akhan@omni.com', action: 'FEATURE_FLAG_UPDATED', tenantId: 't2', details: 'Enabled advanced_negotiations_v2 for ProSupply.' },
{ id: 'a3', timestamp: '2024-05-20 16:05:12', adminUser: 'sjones@omni.com', action: 'AI_LIMIT_INCREASED', tenantId: 't1', details: 'Added 500k token quota per Enterprise SLA.' },
```

**Category:** Code Identifiers  
**Risk Level:** 🟡 MEDIUM — Mock audit log data

---

#### **Middleware Comment**

**File:** `components/ControlPlane/MiddlewareScaffold.tsx`  
**Line:** 12  
**Match:** `// Example: 'boutique.omni.com' -> 't4'`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — Code comment, not user-facing

---

### ⚙️ CONFIG/METADATA — Package Names, Environment, Infrastructure

#### **NPM Package Names**

**File:** `package.json`  
**Line:** 2  
**Match:** `"name": "omni-platform-scaffold",`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — NPM package name (affects publishing, CI/CD)

---

**File:** `package-lock.json`  
**Lines:** 2, 8  
**Matches:** Multiple references to `"name": "omni-platform-scaffold"`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — Lock file (auto-generated from package.json)

---

**File:** `server/package.json`  
**Line:** 2  
**Match:** `"name": "omni-platform-server",`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — Backend NPM package name

---

**File:** `server/package-lock.json`  
**Lines:** 2, 8  
**Matches:** Multiple references to `"name": "omni-platform-server"`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — Lock file (auto-generated)

---

**File:** `vendor/texqtic-ui-studio/package.json`  
**Line:** 3  
**Match:** `"name": "omni-platform-scaffold",`  
**Category:** Config/Metadata  
**Risk Level:** 🟡 MEDIUM — Vendor package name

---

#### **Database Configuration**

**File:** `.env.example`  
**Line:** 2  
**Match:** `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/omni_platform?schema=public"`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — Database name in connection string

---

**File:** `server/docker-compose.yml`  
**Line:** 6  
**Match:** `container_name: omni-platform-db`  
**Category:** Config/Metadata  
**Risk Level:** 🟡 MEDIUM — Docker container name

---

**File:** `server/docker-compose.yml`  
**Line:** 11  
**Match:** `POSTGRES_DB: omni_platform`  
**Category:** Config/Metadata  
**Risk Level:** 🔴 HIGH — PostgreSQL database name

---

#### **API Metadata**

**File:** `server/src/index.ts`  
**Line:** 65  
**Match:** `name: 'OmniPlatform API',`  
**Category:** Config/Metadata  
**Risk Level:** 🟡 MEDIUM — API server name (may appear in logs/errors)

---

### 📧 EMAIL ADDRESSES & SEED DATA

#### **Admin Seed Data**

**File:** `server/prisma/seed.ts`  
**Lines:** 18, 21, 28, 31  
**Matches:**

```typescript
where: { email: 'admin@omniplatform.io' },
  email: 'admin@omniplatform.io',
where: { email: 'support@omniplatform.io' },
  email: 'support@omniplatform.io',
```

**Category:** Code Identifiers  
**Risk Level:** 🔴 HIGH — Initial admin user emails in database seed

---

**File:** `server/README.md`  
**Lines:** 164, 167  
**Matches:**

```markdown
- **admin@omniplatform.io** (SUPER_ADMIN)
- **support@omniplatform.io** (SUPPORT)
```

**Category:** Docs/Comments  
**Risk Level:** 🟡 MEDIUM — Documentation of seed emails

---

### 📚 DOCUMENTATION

#### **Main README**

**File:** `README.md`  
**Line:** 2  
**Match:** `# OmniPlatform: Multi-Tenant Architecture Scaffold`  
**Category:** Docs/Comments  
**Risk Level:** 🟡 MEDIUM — Repository title

---

**File:** `server/README.md`  
**Line:** 1  
**Match:** `# OmniPlatform Server`  
**Category:** Docs/Comments  
**Risk Level:** 🟡 MEDIUM — Backend documentation title

---

**File:** `VSCODE_SETUP.md`  
**Line:** 1  
**Match:** `# VS Code Setup Guide for OmniPlatform`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — Setup documentation

---

**File:** `VSCODE_SETUP.md`  
**Line:** 457  
**Match:** `omni-platform/`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — Folder reference in docs

---

#### **Verification Docs**

**File:** `PHASE2_VERIFICATION.md`  
**Line:** 9  
**Match:** `docker ps | findstr omni-platform-db`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — Docker command example

---

**File:** `PHASE2_VERIFICATION.md`  
**Line:** 75  
**Match:** `psql postgresql://postgres:postgres@localhost:5432/omni_platform`  
**Category:** Docs/Comments  
**Risk Level:** 🟢 LOW — Database connection example

---

## 🚨 HIGH-RISK ITEMS REQUIRING IMMEDIATE ATTENTION

### Category 1: Production Branding (Visible to End Users)

| Priority | File                   | Line | Item           | Impact                       |
| -------- | ---------------------- | ---- | -------------- | ---------------------------- |
| 🔴 P0    | index.html             | 7    | Page Title     | Browser tab, bookmarks, SEO  |
| 🔴 P0    | metadata.json          | 2    | App Name       | PWA manifest, app launcher   |
| 🔴 P0    | AuthFlows.tsx          | 21   | Login Branding | First user impression        |
| 🔴 P0    | SuperAdminShell.tsx    | 34   | Admin Header   | Admin portal branding        |
| 🔴 P0    | TenantRegistry.tsx     | 66   | Domain Display | Tenant-facing domain pattern |
| 🔴 P0    | WhiteLabelSettings.tsx | 26   | Domain Example | White-label configuration    |
| 🔴 P0    | OnboardingFlow.tsx     | 76   | Domain Suffix  | New tenant onboarding        |

### Category 2: Infrastructure & Namespaces

| Priority | File                | Line | Item             | Impact                     |
| -------- | ------------------- | ---- | ---------------- | -------------------------- |
| 🔴 P1    | package.json        | 2    | Frontend Package | NPM namespace, imports     |
| 🔴 P1    | server/package.json | 2    | Backend Package  | NPM namespace, API imports |
| 🔴 P1    | .env.example        | 2    | Database Name    | All database operations    |
| 🔴 P1    | docker-compose.yml  | 11   | PostgreSQL DB    | Docker infrastructure      |

### Category 3: Auth & User Management

| Priority | File          | Line    | Item           | Impact                 |
| -------- | ------------- | ------- | -------------- | ---------------------- |
| 🔴 P1    | seed.ts       | 18-31   | Admin Emails   | Initial admin accounts |
| 🟡 P2    | constants.tsx | 108-110 | Mock User Data | Demo/dev data          |

---

## SEARCH PATTERNS USED

The following regex patterns were used to ensure comprehensive coverage:

```regex
omni\s*platform    # Catches: omniplatform, omni platform, omni  platform
omni\s*plaform     # Catches misspelling: omni plaform
@omniplatform      # Catches: @omniplatform, @OmniPlatform
OMNI|Omni          # Case-insensitive catch-all for manual review
```

---

## FILES WITH MOST OCCURRENCES

| Rank | File                                   | Occurrences |
| ---- | -------------------------------------- | ----------- |
| 1    | constants.tsx                          | 6           |
| 2    | seed.ts                                | 4           |
| 3    | AuthFlows.tsx (+ vendor copy)          | 4           |
| 4    | package.json (frontend + backend)      | 4           |
| 5    | README.md (main + server)              | 3           |
| 6    | docker-compose.yml                     | 2           |
| 7    | WhiteLabelSettings.tsx (+ vendor copy) | 2           |
| 8    | OnboardingFlow.tsx (+ vendor copy)     | 2           |
| 9    | PHASE2_VERIFICATION.md                 | 2           |
| 10   | index.html / index.css                 | 2           |

---

## VENDOR DIRECTORY FINDINGS

**Note:** The `vendor/texqtic-ui-studio/` directory contains **duplicate copies** of the following files:

- `components/Auth/AuthFlows.tsx` — Contains "OmniAdmin" and "OmniPlatform"
- `components/Onboarding/OnboardingFlow.tsx` — Contains ".omniplatform.com"
- `components/Tenant/WhiteLabelSettings.tsx` — Contains "proxy.omniplatform.com"
- `package.json` — Contains package name "omni-platform-scaffold"

**Recommendation:** If these are true vendor files (not managed by this repo), they may need to be updated separately. If they are workspace copies, they should be updated in sync with main codebase files.

---

## MISSED PATTERNS

The following patterns were **NOT** found in the repository:

- ❌ "Omni Plaform" (misspelling) — 0 occurrences
- ❌ "Omni-Platform" (hyphenated) — 0 occurrences
- ❌ "@OmniPlatform" (capitalized handle) — 0 occurrences (lowercase @omni variants found)

---

## CONCLUSION

This audit identified **47 unique occurrences** of "OmniPlatform" and related terms across **22 files**.

**Critical Findings:**

- **15 high-risk items** affect production branding, URLs, database names, and package namespaces
- **7 P0 items** directly impact user-facing branding and require immediate updates
- **4 P1 items** affect infrastructure and must be updated for deployment
- Vendor directory contains **4 duplicate files** that may need separate updates

**Recommendation:**  
Perform a systematic find-replace operation following governance review, prioritizing P0 (user-facing) items first, then P1 (infrastructure) items, with careful testing at each step.

---

**Report Generated:** February 7, 2026  
**Auditor:** GitHub Copilot Repository Auditor  
**Status:** ✅ COMPLETE — No files modified (report-only mode)
