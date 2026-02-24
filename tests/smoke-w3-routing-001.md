# G-W3-ROUTING-001 — Wave 3 Production Smoke Certification

**Scope:** Covers 6 flows committed as commits `161178b`–`4548b38`.  
**Certification requires:** ALL steps marked ✅ on BOTH LOCAL and VERCEL targets.  
**Date of run:** ________________  **Run by:** ________________

---

## Setup

```bash
# Set once — all curl commands below reference these variables
ADMIN_PASS="<redact before sharing>"
TENANT_PASS="<redact before sharing>"
LOCAL="http://localhost:3001"
VERCEL="https://<your-deployment>.vercel.app"    # paste your Vercel preview/prod URL

ACME_TENANT_ID="faf2e4a7-5d79-4b00-811b-8d0dce4f4d80"
SMOKE_REASON="Wave3 smoke certification run $(date +%Y-%m-%d)"
```

Alternatively, run the automated script:
```bash
ADMIN_PASS="..." TENANT_PASS="..." VERCEL_URL="https://..." \
  bash tests/smoke-w3-routing-001.sh both
```

> **Dependency:** `jq` required for token extraction. Install via: `choco install jq` (Windows) / `brew install jq` (Mac)

---

## Phase 1 — Admin Login → Tenant List

### Step 1.1 — Admin login

```bash
curl -s -X POST "${LOCAL}/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@texqtic.com\",\"password\":\"${ADMIN_PASS}\"}" | jq .
```

**Expected HTTP:** `200`  
**Expected body:** `{ "success": true, "data": { "token": "eyJ...", "admin": { "id": "...", "email": "admin@texqtic.com" } } }`

```bash
# Capture token for subsequent steps
ADMIN_TOKEN=$(curl -s -X POST "${LOCAL}/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@texqtic.com\",\"password\":\"${ADMIN_PASS}\"}" \
  | jq -r '.data.token')
echo "ADMIN_TOKEN captured: ${ADMIN_TOKEN:0:20}…"
```

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.token` present (non-null) | ☐ | ☐ |
| `.data.admin.email` = `admin@texqtic.com` | ☐ | ☐ |

---

### Step 1.2 — Tenant list (control plane realm)

```bash
curl -s -X GET "${LOCAL}/api/control/tenants" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" | jq '.data.tenants | length'
```

**Expected HTTP:** `200`  
**Expected body:** `.data.tenants` array with ≥ 1 tenant; each entry includes `id`, `slug`, `name`, `status`.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.tenants` length ≥ 1 | ☐ | ☐ |
| `acme-corp` or `white-label-co` slug present | ☐ | ☐ |

---

## Phase 2 — Start Impersonation → Tenant Experience

### Step 2.1 — Fetch Acme Corp membership for userId

```bash
curl -s -X GET "${LOCAL}/api/control/tenants/${ACME_TENANT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" | jq '.data.tenant.memberships[0].user'

TARGET_USER_ID=$(curl -s -X GET "${LOCAL}/api/control/tenants/${ACME_TENANT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" \
  | jq -r '.data.tenant.memberships[0].user.id')
echo "TARGET_USER_ID: $TARGET_USER_ID"
```

**Expected HTTP:** `200`  
**Expected:** `.data.tenant.memberships[0].user.id` is a UUID.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `memberships[0].user.id` is UUID | ☐ | ☐ |

---

### Step 2.2 — Start impersonation session  
*(P0 fix — commit `ec69620`)*

```bash
curl -s -X POST "${LOCAL}/api/control/impersonation/start" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgId\": \"${ACME_TENANT_ID}\",
    \"userId\": \"${TARGET_USER_ID}\",
    \"reason\": \"${SMOKE_REASON}\"
  }" | jq .
```

**Expected HTTP:** `201`  
**Expected body:**
```json
{
  "impersonationId": "<uuid>",
  "token": "eyJ...",
  "expiresAt": "2026-02-24T..."
}
```

> **Previously:** This would return `404` in Vercel prod (route not registered).  
> **After commit `161178b`:** Returns `201` everywhere.

```bash
IMP_TOKEN=$(curl -s -X POST "${LOCAL}/api/control/impersonation/start" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" \
  -H "Content-Type: application/json" \
  -d "{\"orgId\":\"${ACME_TENANT_ID}\",\"userId\":\"${TARGET_USER_ID}\",\"reason\":\"${SMOKE_REASON}\"}" \
  | jq -r '.data.token // .token')

IMP_SESSION_ID=$(curl -s -X POST "${LOCAL}/api/control/impersonation/start" \
  ... | jq -r '.data.impersonationId // .impersonationId')
# Note: run once and parse both fields together in practice
```

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 201 (not 404) | ☐ | ☐ |
| `.token` present (tenant-shaped JWT, separate from admin JWT) | ☐ | ☐ |
| `.impersonationId` present (UUID) | ☐ | ☐ |
| `.expiresAt` ~30 min from now | ☐ | ☐ |
| Audit log entry created (verify via Step 1.2 audit logs endpoint) | ☐ | ☐ |

---

### Step 2.3 — Tenant catalog accessible via impersonation token

```bash
curl -s -X GET "${LOCAL}/api/tenant/catalog/items?limit=3" \
  -H "Authorization: Bearer ${IMP_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" | jq '.data.items[0] | {id, name, price}'

CATALOG_ITEM_ID=$(curl -s -X GET "${LOCAL}/api/tenant/catalog/items" \
  -H "Authorization: Bearer ${IMP_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" | jq -r '.data.items[0].id')
```

**Expected HTTP:** `200`  
**Expected:** `.data.items` array with at least one item. Realm = tenant (impersonation token contains tenantId + isImpersonation flag).

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 (not 401/403) | ☐ | ☐ |
| `.data.items` length ≥ 1 | ☐ | ☐ |
| Response comes from Acme Corp tenant (not admin realm) | ☐ | ☐ |

---

## Phase 3 — Add to Cart → Checkout → Order Created

*(P1 fix — commit `3fff171`)*

### Step 3.1 — Create/get cart

```bash
curl -s -X POST "${LOCAL}/api/tenant/cart" \
  -H "Authorization: Bearer ${IMP_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" \
  -H "Content-Type: application/json" | jq '.data.cart.id'
```

**Expected HTTP:** `200`  
**Expected:** `.data.cart.id` UUID.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.cart.id` is UUID | ☐ | ☐ |

---

### Step 3.2 — Add item to cart

```bash
curl -s -X POST "${LOCAL}/api/tenant/cart/items" \
  -H "Authorization: Bearer ${IMP_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" \
  -H "Content-Type: application/json" \
  -d "{\"catalogItemId\": \"${CATALOG_ITEM_ID}\", \"quantity\": 1}" | jq .
```

**Expected HTTP:** `200`  
**Expected:** `.data.cartItem.id` present.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.cartItem.quantity` = 1 | ☐ | ☐ |

---

### Step 3.3 — Checkout  
*(Previously: `console.log` stub — now real API call)*

```bash
curl -s -X POST "${LOCAL}/api/tenant/checkout" \
  -H "Authorization: Bearer ${IMP_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" \
  -H "Content-Type: application/json" | jq '{orderId:.data.orderId, status:.data.status, total:.data.totals.grandTotal}'
```

**Expected HTTP:** `200`  
**Expected body:**
```json
{
  "orderId": "<uuid>",
  "status": "CONFIRMED",
  "currency": "USD",
  "itemCount": 1,
  "totals": { "grandTotal": <number>, ... }
}
```

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.orderId` present (UUID) | ☐ | ☐ |
| `.data.status` = `CONFIRMED` (or `PENDING`) | ☐ | ☐ |
| `.data.totals.grandTotal` > 0 | ☐ | ☐ |
| Cart cleared after checkout (re-GET `/api/tenant/cart` → items = []) | ☐ | ☐ |

---

## Phase 4 — Invite Member → Membership List

*(P1 fix — commit `7d8f8b8`)*

### Step 4.1 — Tenant owner login (real JWT, not impersonation)

```bash
curl -s -X POST "${LOCAL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-realm-hint: tenant" \
  -d "{
    \"email\": \"owner@acme.example.com\",
    \"password\": \"${TENANT_PASS}\",
    \"tenantId\": \"${ACME_TENANT_ID}\"
  }" | jq '.data.token' | cut -c1-40

TENANT_TOKEN=$(curl -s -X POST "${LOCAL}/api/auth/login" \
  -H "Content-Type: application/json" -H "x-realm-hint: tenant" \
  -d "{\"email\":\"owner@acme.example.com\",\"password\":\"${TENANT_PASS}\",\"tenantId\":\"${ACME_TENANT_ID}\"}" \
  | jq -r '.data.token')
```

**Expected HTTP:** `200`

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.token` present | ☐ | ☐ |

---

### Step 4.2 — Invite member  
*(Previously: form called `onBack()` directly, never hit the API)*

```bash
INVITE_EMAIL="smoke-$(date +%s)@texqtic-test.com"

curl -s -X POST "${LOCAL}/api/tenant/memberships" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${INVITE_EMAIL}\", \"role\": \"MEMBER\"}" | jq .
```

**Expected HTTP:** `200`  
**Expected:** `.data.invite.id` present, `.data.inviteToken` non-null.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 (not call-bypassed) | ☐ | ☐ |
| `.data.invite.email` = invited address | ☐ | ☐ |
| `.data.inviteToken` present | ☐ | ☐ |

---

### Step 4.3 — Membership list shows ≥ 1 member  
*(Previously: hardcoded mock data — now live API)*

```bash
curl -s -X GET "${LOCAL}/api/tenant/memberships" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" | jq '{count:.data.count, first:.data.memberships[0].user.email}'
```

**Expected HTTP:** `200`  
**Expected:** `.data.count` ≥ 1.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.count` ≥ 1 (live DB, not mock) | ☐ | ☐ |

---

## Phase 5 — Branding Save → Persisted

*(P1 fix — commit `d835a5e`)*

### Step 5.1 — Save branding  
*(Previously: button had no `onClick`)*

```bash
curl -s -X PUT "${LOCAL}/api/tenant/branding" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H "X-Texqtic-Realm: tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "themeJson": {
      "primaryColor": "#1a2b3c",
      "secondaryColor": "#4d5e6f"
    }
  }' | jq '{id:.data.branding.id, primary:.data.branding.themeJson.primaryColor}'
```

**Expected HTTP:** `200`  
**Expected:** `.data.branding.id` non-null, `.data.branding.themeJson.primaryColor` = `"#1a2b3c"`.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.branding.id` present | ☐ | ☐ |
| `primaryColor` reflects sent value | ☐ | ☐ |

---

## Phase 6 — Exit Impersonation → Admin Restored

*(P0 fix — commit `ec69620`)*

### Step 6.1 — Stop impersonation session

```bash
curl -s -X POST "${LOCAL}/api/control/impersonation/stop" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" \
  -H "Content-Type: application/json" \
  -d "{
    \"impersonationId\": \"${IMP_SESSION_ID}\",
    \"reason\": \"${SMOKE_REASON}\"
  }" | jq .
```

**Expected HTTP:** `200`  
**Expected body:** `{ "ended": true }` (or wrapped as `{ "data": { "ended": true } }`).

> **Previously:** Exit was a local state toggle only. No audit event; token kept living until expiry.  
> **After `ec69620`:** `endedAt` is set in DB; IMPERSONATION_STOP audit event written.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 (not 404) | ☐ | ☐ |
| `.ended` = `true` (or `.data.ended` = `true`) | ☐ | ☐ |
| Audit log now has IMPERSONATION_START + IMPERSONATION_STOP events | ☐ | ☐ |

---

### Step 6.2 — Admin JWT still valid after impersonation exit

```bash
curl -s -X GET "${LOCAL}/api/control/system/health" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Texqtic-Realm: control" | jq '{overall:.data.overall}'
```

**Expected HTTP:** `200`  
**Expected:** Admin JWT functions normally; session not contaminated by impersonation.

| Check | LOCAL | VERCEL |
|-------|-------|--------|
| HTTP 200 | ☐ | ☐ |
| `.data.overall` present | ☐ | ☐ |
| Admin can still list tenants after stop | ☐ | ☐ |

---

## Certification Checklist

| Flow | LOCAL | VERCEL |
|------|-------|--------|
| 1. Admin login → tenant list | ☐ | ☐ |
| 2. Impersonation start → tenant experience (HTTP 201, not 404) | ☐ | ☐ |
| 3. Cart → checkout → orderId returned | ☐ | ☐ |
| 4. Invite member → membership count ≥ 1 | ☐ | ☐ |
| 5. Branding PUT → record ID returned | ☐ | ☐ |
| 6. Impersonation stop → ended: true | ☐ | ☐ |

**CERTIFIED:** ☐ YES — all 12 flow×target checks pass  
**Signed off by:** ________________  **Date:** ________________  
**Commit range certified:** `161178b` → `4548b38`

---

## Known Non-Blocking Items (out of scope for G-W3-ROUTING-001)

These were audited in G-W3-AUDIT-001 but deferred:

| Issue | Severity | Ticket |
|-------|----------|--------|
| B2B "Request Quote" / Negotiations buttons have no handler | P2 | future wave |
| B2C cart badge hardcoded `3` (not wired to CartContext) | P2 | future wave |
| `AdminRBAC` uses hardcoded `ADMIN_USERS` constant | P2 | future wave |
| Tenant login uses hardcoded `SEEDED_TENANTS` (dynamic resolver not yet built) | P2 | future wave |
| TenantDetails lifecycle buttons (Reinstate / Suspend / Delete) have no server endpoints | P2 | future wave |
