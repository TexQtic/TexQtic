# Event Names (Reserved)

Events are domain-prefixed and snake_case.

Examples:

- tenant.created
- tenant.domain_added
- admin.impersonation_started
- admin.impersonation_ended
- audit.log_written
- ai.budget_exceeded

Rule: UI does not invent event names. Team A owns event naming.

---

## Acquisition Domain Events (EVENTS-003)

Registered by EVENTS-003. Resolves GAP-ACQ-002 and GAP-ACQ-005.
Authorization: Paresh / Team A sign-off (MAIN-PLATFORM-SUPPLIER-PROFILE-EVENTS-003).

These events are **contract-registered only**. No runtime emission exists until ROUTE-001,
INQUIRY-004, WEBHOOK-007, and PROVISIONED-EVENTS-008 are authorized and implemented.

### supplier_profile.viewed.v1

| Field | Value |
| --- | --- |
| Domain | `supplier_profile` |
| Trigger | Future successful public profile view via `GET /api/public/supplier/:slug` |
| Producer | ROUTE-001 (future) |
| Consumer | Analytics / AI backbone (future) |

**Allowed payload:** `slug`, `source_channel`, `viewer_geo_band` (optional), `timestamp`

**Prohibited payload:** org UUID, `external_orchestration_ref`, buyer identity, phone/email/contact data, raw IP address (unless existing telemetry policy explicitly anonymizes or bands it)

---

### buyer_inquiry.created.v1

| Field | Value |
| --- | --- |
| Domain | `buyer_inquiry` |
| Trigger | Future `POST /api/public/inquiry/submit` |
| Producer | INQUIRY-004 (future) |
| Consumer | CRM / AI backbone (future) |

**Allowed payload:** `supplier_slug`, `inquiry_category`, `geo_band` (optional), `volume_band` (optional), `timestamp`

**Prohibited payload:** raw email, phone number, buyer full name, org UUID, `external_orchestration_ref`, pricing/negotiation/order/trade state

---

### public_supplier_profile.provision_requested.v1

| Field | Value |
| --- | --- |
| Domain | `public_supplier_profile` |
| Trigger | Future WEBHOOK-007 receives a CRM provisioning request |
| Producer | WEBHOOK-007 (future) |
| Consumer | Audit backbone (future) — internal/audit-scoped only |

**Allowed payload:** `external_orchestration_ref` (internal/audit-scoped only), `org_type`, segment/category metadata (optional), `timestamp`

**Prohibited payload:** public exposure, contact data, commission data, payment data, CAE draft raw payload, field-agent IDs, photo URLs, buyer data

---

### public_supplier_profile.provisioned.v1

| Field | Value |
| --- | --- |
| Domain | `public_supplier_profile` |
| Trigger | Future WEBHOOK-007 successfully provisions or confirms an acquisition-sourced public supplier profile |
| Producer | PROVISIONED-EVENTS-008 / WEBHOOK-007 (future) |
| Consumer | Analytics / AI backbone (future) — slug-scoped |

**Allowed payload:** `slug`, `external_orchestration_ref` (internal/audit-scoped only), `publication_posture`, `timestamp`

**Prohibited payload:** contact data, price, registration number, risk score, plan, payment or commission data, public leakage of internal IDs

---

### public_supplier_profile.gate_failed.v1

| Field | Value |
| --- | --- |
| Domain | `public_supplier_profile` |
| Trigger | Future WEBHOOK-007 cannot publish because one or more public projection/provisioning gates fail |
| Producer | WEBHOOK-007 (future) |
| Consumer | Audit backbone (future) — internal/audit-scoped only |

**Allowed payload:** `external_orchestration_ref` (internal/audit-scoped only), `failed_gate`, `reason_code`, `timestamp`

**Prohibited payload:** raw CRM payload, private notes, contact data, field-agent IDs, payment or commission data
