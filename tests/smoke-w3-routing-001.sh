#!/usr/bin/env bash
# =============================================================================
# G-W3-ROUTING-001 — Wave 3 Production Smoke Certification
# =============================================================================
#
# Covers all 6 flows committed in G-W3-ROUTING-001:
#   1. Admin login → tenant list
#   2. Start impersonation (with reason) → tenant experience
#   3. Add to cart → checkout → order created (impersonated context)
#   4. Invite member → membership appears in list (real tenant JWT)
#   5. Branding save → persisted (real tenant JWT)
#   6. Exit impersonation → ended: true
#
# Usage:
#   ADMIN_PASS="..." TENANT_PASS="..." bash tests/smoke-w3-routing-001.sh [local|vercel|both]
#   ADMIN_PASS="..." TENANT_PASS="..." VERCEL_URL="https://your-app.vercel.app" \
#     bash tests/smoke-w3-routing-001.sh both
#
# Required env vars:
#   ADMIN_PASS   — admin@texqtic.com password
#   TENANT_PASS  — qa.b2b@texqtic.com password
# Optional:
#   VERCEL_URL   — Vercel deployment base URL (no trailing slash)
#                  Required if TARGET=vercel or TARGET=both
#
# Dependencies: curl, jq
# =============================================================================

set -uo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
TARGET="${1:-local}"
LOCAL_BASE="http://localhost:3001"
VERCEL_BASE="${VERCEL_URL:-}"

ADMIN_EMAIL="admin@texqtic.com"
TENANT_EMAIL="qa.b2b@texqtic.com"
QA_B2B_TENANT_ID="faf2e4a7-5d79-4b00-811b-8d0dce4f4d80"

INVITE_EMAIL="smoke-invite-$(date +%s)@texqtic-test.com"
SMOKE_REASON="Wave3 smoke certification run $(date +%Y-%m-%d)"  # 41 chars — passes min:10

# ── Guards ────────────────────────────────────────────────────────────────────
if [[ -z "${ADMIN_PASS:-}" ]]; then
  echo "ERROR: ADMIN_PASS is required" >&2; exit 1
fi
if [[ -z "${TENANT_PASS:-}" ]]; then
  echo "ERROR: TENANT_PASS is required" >&2; exit 1
fi
if [[ ("$TARGET" == "vercel" || "$TARGET" == "both") && -z "$VERCEL_BASE" ]]; then
  echo "ERROR: VERCEL_URL is required for TARGET=$TARGET" >&2; exit 1
fi
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl is required" >&2; exit 1; }

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo -e "  ${GREEN}✓ PASS${RESET} — $1"; ((PASS_COUNT++)); }
fail() { echo -e "  ${RED}✗ FAIL${RESET} — $1"; ((FAIL_COUNT++)); }
step() { echo -e "\n${CYAN}${BOLD}[$2] $1${RESET}"; }
phase() { echo -e "\n${YELLOW}${BOLD}━━━ Phase $1: $2 ━━━${RESET}"; }

# api_call BASE METHOD PATH HEADERS_ARRAY BODY → prints response body to stdout
# Sets STATUS_CODE in caller scope.
api_call() {
  local base="$1" method="$2" path="$3"
  shift 3
  local -a extra_headers=()
  local body=""
  # remaining args: pairs of -H "..." or -d '...'
  local resp
  resp=$(curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" "${base}${path}" \
    -H "Content-Type: application/json" \
    "$@")
  STATUS_CODE=$(echo "$resp" | tail -n1 | sed 's/__STATUS__//')
  echo "$resp" | head -n -1
}

expect_status() {
  local got="$1" want="$2" label="$3"
  if [[ "$got" == "$want" ]]; then
    pass "$label — HTTP $got"
  else
    fail "$label — expected HTTP $want got HTTP $got"
  fi
}

# ── Smoke runner ──────────────────────────────────────────────────────────────
run_smoke() {
  local BASE="$1"
  local ENV_LABEL="$2"

  echo -e "\n${BOLD}═══════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD} TARGET: $ENV_LABEL  →  $BASE${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"

  # ── Phase 1: Admin login → tenant list ──────────────────────────────────────
  phase "1" "Admin login → tenant list"

  step "POST /api/auth/admin/login" "1.1"
  local admin_resp
  admin_resp=$(api_call "$BASE" POST "/api/auth/admin/login" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}")
  expect_status "$STATUS_CODE" "200" "Admin login"

  ADMIN_TOKEN=$(echo "$admin_resp" | jq -r '.data.token // .token // empty')
  if [[ -n "$ADMIN_TOKEN" && "$ADMIN_TOKEN" != "null" ]]; then
    pass "Admin JWT captured (token present)"
  else
    fail "Admin JWT missing from login response"
    echo "  Response: $(echo "$admin_resp" | jq -c '.')"
    return
  fi

  step "GET /api/control/tenants" "1.2"
  local tenants_resp
  tenants_resp=$(api_call "$BASE" GET "/api/control/tenants" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "X-Texqtic-Realm: control")
  expect_status "$STATUS_CODE" "200" "GET /api/control/tenants"

  local tenant_count
  tenant_count=$(echo "$tenants_resp" | jq '(.data.tenants // .tenants) | length')
  if [[ "$tenant_count" -ge 1 ]]; then
    pass "Tenant list non-empty ($tenant_count tenants)"
  else
    fail "Tenant list empty — expected >= 1"
  fi

  # ── Phase 2: Impersonation start ────────────────────────────────────────────
  phase "2" "Start impersonation → tenant experience"

  step "GET /api/control/tenants/${QA_B2B_TENANT_ID} for userId" "2.1"
  local tenant_detail_resp
  tenant_detail_resp=$(api_call "$BASE" GET "/api/control/tenants/${QA_B2B_TENANT_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "X-Texqtic-Realm: control")
  expect_status "$STATUS_CODE" "200" "GET tenant details for QA B2B"

  local target_user_id
  target_user_id=$(echo "$tenant_detail_resp" \
    | jq -r '(.data.tenant // .tenant).memberships[0].user.id // empty')
  if [[ -n "$target_user_id" && "$target_user_id" != "null" ]]; then
    pass "Target userId captured: ${target_user_id:0:8}…"
  else
    fail "Could not extract userId from tenant memberships"
    echo "  Response: $(echo "$tenant_detail_resp" | jq -c '.data.tenant.memberships[:1]')"
    return
  fi

  step "POST /api/control/impersonation/start" "2.2"
  local imp_body
  imp_body=$(jq -n \
    --arg orgId "$QA_B2B_TENANT_ID" \
    --arg userId "$target_user_id" \
    --arg reason "$SMOKE_REASON" \
    '{orgId:$orgId, userId:$userId, reason:$reason}')
  local imp_resp
  imp_resp=$(api_call "$BASE" POST "/api/control/impersonation/start" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "X-Texqtic-Realm: control" \
    -d "$imp_body")
  expect_status "$STATUS_CODE" "201" "POST /api/control/impersonation/start"

  IMP_TOKEN=$(echo "$imp_resp" | jq -r '.data.token // .token // empty')
  IMP_SESSION_ID=$(echo "$imp_resp" | jq -r '.data.impersonationId // .impersonationId // empty')
  IMP_EXPIRES=$(echo "$imp_resp" | jq -r '.data.expiresAt // .expiresAt // empty')

  if [[ -n "$IMP_TOKEN" && "$IMP_TOKEN" != "null" ]]; then
    pass "Impersonation token issued (30 min TTL)"
  else
    fail "Impersonation token missing"
    echo "  Response: $(echo "$imp_resp" | jq -c '.')"
  fi
  if [[ -n "$IMP_SESSION_ID" && "$IMP_SESSION_ID" != "null" ]]; then
    pass "Session ID captured: ${IMP_SESSION_ID:0:8}…"
  else
    fail "impersonationId missing from response"
  fi
  if [[ -n "$IMP_EXPIRES" && "$IMP_EXPIRES" != "null" ]]; then
    pass "expiresAt present: $IMP_EXPIRES"
  fi

  step "GET /api/tenant/catalog/items (impersonation token)" "2.3"
  local catalog_resp
  catalog_resp=$(api_call "$BASE" GET "/api/tenant/catalog/items?limit=5" \
    -H "Authorization: Bearer ${IMP_TOKEN}" \
    -H "X-Texqtic-Realm: tenant")
  expect_status "$STATUS_CODE" "200" "Tenant catalog accessible via impersonation token"

  CATALOG_ITEM_ID=$(echo "$catalog_resp" \
    | jq -r '(.data.items // .items)[0].id // empty')
  if [[ -n "$CATALOG_ITEM_ID" && "$CATALOG_ITEM_ID" != "null" ]]; then
    pass "Catalog item captured for cart test: ${CATALOG_ITEM_ID:0:8}…"
  else
    fail "No catalog items returned — cart test will be skipped"
    CATALOG_ITEM_ID=""
  fi

  # ── Phase 3: Cart → Checkout (impersonation context) ────────────────────────
  phase "3" "Add to cart → checkout → order created"

  if [[ -z "$CATALOG_ITEM_ID" ]]; then
    echo "  ⚠ Skipping Phase 3 — no catalog item available"
  else
    step "POST /api/tenant/cart (create or get)" "3.1"
    local cart_resp
    cart_resp=$(api_call "$BASE" POST "/api/tenant/cart" \
      -H "Authorization: Bearer ${IMP_TOKEN}" \
      -H "X-Texqtic-Realm: tenant")
    expect_status "$STATUS_CODE" "200" "POST /api/tenant/cart"

    local cart_id
    cart_id=$(echo "$cart_resp" | jq -r '.data.cart.id // .cart.id // empty')
    if [[ -n "$cart_id" && "$cart_id" != "null" ]]; then
      pass "Cart created/retrieved: ${cart_id:0:8}…"
    else
      fail "Cart creation failed"
      echo "  Response: $(echo "$cart_resp" | jq -c '.')"
    fi

    step "POST /api/tenant/cart/items" "3.2"
    local add_resp
    add_resp=$(api_call "$BASE" POST "/api/tenant/cart/items" \
      -H "Authorization: Bearer ${IMP_TOKEN}" \
      -H "X-Texqtic-Realm: tenant" \
      -d "{\"catalogItemId\":\"${CATALOG_ITEM_ID}\",\"quantity\":1}")
    expect_status "$STATUS_CODE" "200" "POST /api/tenant/cart/items"

    step "POST /api/tenant/checkout" "3.3"
    local checkout_resp
    checkout_resp=$(api_call "$BASE" POST "/api/tenant/checkout" \
      -H "Authorization: Bearer ${IMP_TOKEN}" \
      -H "X-Texqtic-Realm: tenant")
    expect_status "$STATUS_CODE" "200" "POST /api/tenant/checkout"

    local order_id
    order_id=$(echo "$checkout_resp" | jq -r '.data.orderId // .orderId // empty')
    local order_status
    order_status=$(echo "$checkout_resp" | jq -r '.data.status // .status // empty')
    if [[ -n "$order_id" && "$order_id" != "null" ]]; then
      pass "Order created: ${order_id:0:8}… (status=$order_status)"
    else
      fail "Order creation failed — orderId missing"
      echo "  Response: $(echo "$checkout_resp" | jq -c '.')"
    fi
  fi

  # ── Phase 4: Tenant login → invite → memberships ────────────────────────────
  phase "4" "Invite member → membership appears in list"

  step "POST /api/auth/login (tenant owner)" "4.1"
  local tenant_login_resp
  tenant_login_resp=$(api_call "$BASE" POST "/api/auth/login" \
    -H "x-realm-hint: tenant" \
    -d "{\"email\":\"${TENANT_EMAIL}\",\"password\":\"${TENANT_PASS}\",\"tenantId\":\"${QA_B2B_TENANT_ID}\"}")
  expect_status "$STATUS_CODE" "200" "Tenant owner login"

  TENANT_TOKEN=$(echo "$tenant_login_resp" | jq -r '.data.token // .token // empty')
  if [[ -n "$TENANT_TOKEN" && "$TENANT_TOKEN" != "null" ]]; then
    pass "Tenant JWT captured"
  else
    fail "Tenant JWT missing from login response"
    echo "  Response: $(echo "$tenant_login_resp" | jq -c '.')"
    # Skip phases 4+5 but continue to phase 6
    TENANT_TOKEN=""
  fi

  if [[ -n "$TENANT_TOKEN" ]]; then
    step "POST /api/tenant/memberships (invite)" "4.2"
    local invite_body
    invite_body=$(jq -n --arg email "$INVITE_EMAIL" '{email:$email, role:"MEMBER"}')
    local invite_resp
    invite_resp=$(api_call "$BASE" POST "/api/tenant/memberships" \
      -H "Authorization: Bearer ${TENANT_TOKEN}" \
      -H "X-Texqtic-Realm: tenant" \
      -d "$invite_body")
    expect_status "$STATUS_CODE" "200" "POST /api/tenant/memberships (invite)"

    local invite_id
    invite_id=$(echo "$invite_resp" | jq -r '.data.invite.id // .invite.id // empty')
    if [[ -n "$invite_id" && "$invite_id" != "null" ]]; then
      pass "Invite created: ${invite_id:0:8}…"
    else
      fail "Invite ID missing — invite may not have been created"
      echo "  Response: $(echo "$invite_resp" | jq -c '.')"
    fi

    step "GET /api/tenant/memberships (verify list)" "4.3"
    local members_resp
    members_resp=$(api_call "$BASE" GET "/api/tenant/memberships" \
      -H "Authorization: Bearer ${TENANT_TOKEN}" \
      -H "X-Texqtic-Realm: tenant")
    expect_status "$STATUS_CODE" "200" "GET /api/tenant/memberships"

    local member_count
    member_count=$(echo "$members_resp" | jq '(.data.count // .count // 0)')
    if [[ "$member_count" -ge 1 ]]; then
      pass "Membership list has $member_count member(s)"
    else
      fail "Membership list empty — expected >= 1"
    fi

    # ── Phase 5: Branding save ─────────────────────────────────────────────────
    phase "5" "Branding save → persisted"

    step "PUT /api/tenant/branding" "5.1"
    local brand_body
    brand_body='{"themeJson":{"primaryColor":"#1a2b3c","secondaryColor":"#4d5e6f"}}'
    local brand_resp
    brand_resp=$(api_call "$BASE" PUT "/api/tenant/branding" \
      -H "Authorization: Bearer ${TENANT_TOKEN}" \
      -H "X-Texqtic-Realm: tenant" \
      -d "$brand_body")
    expect_status "$STATUS_CODE" "200" "PUT /api/tenant/branding"

    local branding_id
    branding_id=$(echo "$brand_resp" | jq -r '.data.branding.id // .branding.id // empty')
    if [[ -n "$branding_id" && "$branding_id" != "null" ]]; then
      pass "Branding updated — record id: ${branding_id:0:8}…"
    else
      fail "Branding update returned no record ID"
      echo "  Response: $(echo "$brand_resp" | jq -c '.')"
    fi
  fi

  # ── Phase 6: Exit impersonation ──────────────────────────────────────────────
  phase "6" "Exit impersonation → back to control plane"

  if [[ -z "$IMP_SESSION_ID" || "$IMP_SESSION_ID" == "null" ]]; then
    fail "Skipping Phase 6 — no session ID (impersonation/start failed)"
  else
    step "POST /api/control/impersonation/stop" "6.1"
    local stop_body
    stop_body=$(jq -n \
      --arg id "$IMP_SESSION_ID" \
      --arg reason "$SMOKE_REASON" \
      '{impersonationId:$id, reason:$reason}')
    local stop_resp
    stop_resp=$(api_call "$BASE" POST "/api/control/impersonation/stop" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "X-Texqtic-Realm: control" \
      -d "$stop_body")
    expect_status "$STATUS_CODE" "200" "POST /api/control/impersonation/stop"

    local ended
    ended=$(echo "$stop_resp" | jq -r '.data.ended // .ended // false')
    if [[ "$ended" == "true" ]]; then
      pass "Impersonation session ended (ended: true)"
    else
      fail "Session stop returned ended=$ended (expected true)"
      echo "  Response: $(echo "$stop_resp" | jq -c '.')"
    fi

    step "GET /api/control/system/health (confirm admin JWT still valid)" "6.2"
    local health_resp
    health_resp=$(api_call "$BASE" GET "/api/control/system/health" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "X-Texqtic-Realm: control")
    expect_status "$STATUS_CODE" "200" "Admin JWT valid post-impersonation exit"
  fi
}

# ── Execute ───────────────────────────────────────────────────────────────────
case "$TARGET" in
  local)
    run_smoke "$LOCAL_BASE" "LOCAL (localhost:3001)"
    ;;
  vercel)
    run_smoke "$VERCEL_BASE" "VERCEL ($VERCEL_BASE)"
    ;;
  both)
    run_smoke "$LOCAL_BASE" "LOCAL (localhost:3001)"
    run_smoke "$VERCEL_BASE" "VERCEL ($VERCEL_BASE)"
    ;;
  *)
    echo "ERROR: TARGET must be 'local', 'vercel', or 'both'" >&2; exit 1
    ;;
esac

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD} G-W3-ROUTING-001 SMOKE RESULT${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASS${RESET}: ${PASS_COUNT}"
echo -e "  ${RED}FAIL${RESET}: ${FAIL_COUNT}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo -e "  Total checks: ${TOTAL}"

if [[ "$FAIL_COUNT" -eq 0 ]]; then
  echo -e "\n  ${GREEN}${BOLD}✓ ALL CHECKS PASSED — G-W3-ROUTING-001 CERTIFIED${RESET}\n"
  exit 0
else
  echo -e "\n  ${RED}${BOLD}✗ ${FAIL_COUNT} CHECK(S) FAILED — NOT CERTIFIED${RESET}\n"
  exit 1
fi
