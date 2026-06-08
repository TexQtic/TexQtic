# DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01

---

## 1. Unit ID

**DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01**

---

## 2. Date

2026-06-08

---

## 3. Operator

Paresh Patel, Founder, TexQtic (decision authority)  
GitHub Copilot governance inspection and artifact authoring

---

## 4. Repos Inspected

| Repo | Branch | HEAD at Start | HEAD at End |
|---|---|---|---|
| Main App (`C:\Users\PARESH\TexQtic`) | main | `5d717c7a` | `5d717c7a` |
| CRM (`C:\Users\PARESH\TexQtic-CRM`) | main | `06adaf5e` | `06adaf5e` |

---

## 5. Worktree Status

Both repos were **CLEAN** at start and end. No source code was modified by this unit.

---

## 6. Prior Units This Decision Depends On

| Unit | Final Enum | Summary |
|---|---|---|
| `IMPLEMENT-MAINAPP-CRM-TIER0-NOTIFICATION-SEAM-01` | `IMPLEMENT_MAINAPP_CRM_TIER0_NOTIFICATION_SEAM_ALREADY_COMPLETE_VERIFIED` | Main App Tier 0 API seam to CRM implemented in commit `a060febb`. No changes required. |
| `VERIFY-MAINAPP-CRM-TIER0-NOTIFICATION-SEAM-RUNTIME-01` | `VERIFY_MAINAPP_CRM_TIER0_NOTIFICATION_SEAM_RUNTIME_COMPLETE` | Production HTTP 201 confirmed. CRM receipt `bf96e552`, Main App request ID `8aecb337`. Row in `marketing.lead_submissions`. |
| `VERIFY-CRM-TIER0-LEAD-TO-QUALIFICATION-FLOW-01` | `VERIFY_CRM_TIER0_LEAD_TO_QUALIFICATION_FLOW_COMPLETE` | CRM qualification infrastructure fully available. `qualify_lead` RPC has no `form_name` restriction. `crm.leads → crm.onboarding_cases` path confirmed. FTR-ACQ-003 dependency satisfied. |

---

## 7. Authority Chain References

| Document | Location | Type |
|---|---|---|
| `FD-TEXQTIC-ONBOARDING-AUTH-001.md` | Main App root | Founder Policy — GSTIN gate, trust tiers, canonical ownership |
| `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md` | Main App root | Main App authority — verdict, friction comparison, recommendation |
| `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01.md` | CRM root | CRM authority — CRM-first vs Main App-first model comparison |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Main App root (canonical) + CRM root (mirror) | Source taxonomy lock; first-touch field contract |
| `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md` | Main App root | Provisioning envelope acceptance matrix |

---

## 8. Files Inspected in This Unit

**Main App:**
- `server/src/routes/admin/tenantProvision.ts` — `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode)
- `server/src/types/tenantProvision.types.ts` — provisioning request/response type contract
- `server/src/services/tenantProvision.service.ts` — provisioning service logic
- `server/src/routes/internal/acquisitionProvisioning.ts` — CAE/acquisition provisioning webhook
- `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md`
- `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md`
- `MAINAPP-CRM-APPROVED-ONBOARDING-ENVELOPE-EVIDENCE-AUDIT-001.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/control/NEXT-ACTION.md`

**CRM:**
- `server/lib/approvedOnboardingProvisioning.ts` — CRM approved provisioning service (outbound push to Main App)
- `api/admin-bridge/leads/qualify.ts` — qualification RPC caller
- `api/admin-bridge/onboarding-cases/promote.ts` — onboarding case promotion
- `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01.md`
- `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01.md`

---

## 9. Decision Questions — Answers from Repo Truth

### Q1: After CRM qualifies a Tier 0 lead, which system is the source of truth for the approved onboarding candidate?

**CRM is canonical for qualification status and the onboarding case lifecycle.**  
The approved onboarding candidate artifact lives in `crm.onboarding_cases` with status `admin_approved`.  
**Main App is canonical for all platform access artifacts** created after approval (tenant, org, membership, invite, activation state, trust tier).

---

### Q2: Does CRM directly create Main App tenants/users/invites?

**No.**  
CRM calls Main App `POST /api/admin/tenant-provision` (authenticated by service bearer token against `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH`). Main App creates all platform entities (tenant, organization, invite, first-owner record) in response.  
CRM stores returned `orgId`, `inviteId`, and invite artifacts in `crm.onboarding_cases.metadata_json`.

---

### Q3: What is the canonical identifier that must be carried across systems?

| Identifier | Owner | Purpose | Stage |
|---|---|---|---|
| `mainAppTier0RequestId` | Main App (generated at Tier 0 form submit) | Primary idempotency key for Tier 0 → CRM notification | Capture only |
| `crmReceiptId` (`marketing.lead_submissions.id`) | CRM | CRM receipt for the Tier 0 capture; stored by Main App after notify ACK | Capture + CRM review |
| `orchestrationReference` | CRM (set at onboarding case creation) | Primary cross-system anchor for provisioning and status lookups | Approved handoff → provisioning → activation |
| `orgId` | Main App (returned by provisioning endpoint) | Durable Main App platform identity after provisioning | Post-provisioning |
| `inviteId` | Main App (returned by provisioning endpoint) | Access issuance artifact; stored by CRM for relay | Post-provisioning |

**`orchestrationReference` is the primary join key** between CRM `crm.onboarding_cases` and Main App `tenants.externalOrchestrationRef`.

---

### Q4: What is the minimum approved-lead payload needed by Main App?

From `ApprovedOnboardingProvisioningPayload` (confirmed in `server/lib/approvedOnboardingProvisioning.ts`):

```
{
  provisioningMode: "APPROVED_ONBOARDING",          // required literal
  orchestrationReference: string,                    // CRM onboarding case anchor
  tenantName: string,                                // org display name
  tenantSlug: string,                                // URL slug
  organization: {
    legalName: string,                               // legal business name
    jurisdiction: string,                            // e.g. "IN-GJ"
    registrationNumber?: string                      // optional
  },
  firstOwner: {
    email: string,                                   // first-owner email
    role: "OWNER"                                    // always OWNER
  }
}
```

Currently NOT accepted in provisioning envelope (runtime-unconfirmed):
- `partyType` (buyer/supplier discriminator) — design-only; requires separate contract unit
- `crmLeadId`, `crmOnboardingCaseId` — not in runtime contract; may be passed in `approvedOnboardingMetadata` (optional object)
- `sourceChannel` — not in runtime contract; should be added to `approvedOnboardingMetadata`

---

### Q5: What statuses represent the approved handoff?

| System | Object | Status at Handoff |
|---|---|---|
| CRM | `crm.onboarding_cases.status` | `admin_approved` |
| CRM → Main App | Provisioning trigger | After `admin_approved` + issuance trigger |
| Main App | Tenant/org created | Post-provisioning (org `status = PENDING_VERIFICATION`) |
| Main App | Invite issued | Post-provisioning (`inviteId` returned) |
| Main App | Activation | After first-owner accepts invite (`VERIFICATION_APPROVED` path) |

---

### Q6: Does Main App need an inbound CRM-approved lead receiver?

**No new inbound receiver is required for the provisioning path.**  
`POST /api/admin/tenant-provision` already exists and accepts `APPROVED_ONBOARDING` mode. CRM calls it from `approvedOnboardingProvisioning.ts`. The receiver is live and proven.

The `mainAppTier0RequestId` → `crmReceiptId` Tier 0 capture seam is separately live (implemented in commit `a060febb`).

---

### Q7: Does CRM need an outbound webhook/callback to Main App?

**Not a new one for the provisioning path.**  
CRM already has `approvedOnboardingProvisioning.ts` which pushes the provisioning payload. The service:
- calls `PLATFORM_APPROVED_ONBOARDING_PROVISION_URL` (configurable)
- handles idempotent conflict recovery via `orchestrationReference`
- captures `orgId`, `inviteId`, `inviteUrl`, `inviteExpiresAt` into `metadata_json`
- has bounded error handling and retry semantics

---

### Q8: Is the handoff manual for soft launch or automated?

| Stage | Mode |
|---|---|
| CRM lead review and qualification | **Manual** (operator reviews and approves) |
| CRM `admin_approved` → issuance trigger → Main App provisioning call | **Automated** (code-driven after approval trigger) |
| Invite dispatch to first owner | **CRM-mediated** (CRM issuance workflow exposes `actionLink`) |
| First-owner invite acceptance and activation | **User-driven** (supplier/buyer opens invite link) |

---

### Q9: How is QA/test data separated from real commercial leads?

- `productionQaRecordVisibility.ts` in CRM filters rows where `full_name` matches `/\btest[-_\s]*user\b/i` or similar QA patterns — hidden in production admin inbox.
- `form_name = 'Main App Tier 0'` distinguishes Main App Tier 0 records from marketing-website-origin records (`form_name = 'Request Access'`) in the CRM inbox.
- `form_source=all` shows all records including Main App Tier 0 in the inbox.

---

### Q10: How should account-level source attribution be preserved?

- `mainAppTier0RequestId` carries the first-touch request ID from capture to CRM.
- `marketing.lead_submissions.source_channel` stores `'Website Form'` (CRM default) for web submissions; canonical value is `WEB` per `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md`.
- At provisioning time, `sourceChannel` should be carried in `approvedOnboardingMetadata.sourceChannel` — **currently missing from provisioning envelope** (adjacent finding; see §16).
- Main App `tenants.externalOrchestrationRef` provides the permanent cross-system anchor after provisioning.

---

### Q11: Does GSTIN/Udyam/legal/payment remain outside Tier 0?

**Yes. Unconditionally.**  
Per `FD-TEXQTIC-ONBOARDING-AUTH-001.md`:
- GSTIN is a **transactional gate**, not an entry gate.
- Tier 0 capture is ungated: no GSTIN, no Udyam, no payment, no legal acceptance required at Tier 0.
- `VERIFICATION_BLOCKED_VIEWS` and `isVerificationBlockedTenantWorkspace` enforce the GSTIN gate after account creation — this is unchanged.

---

### Q12: What implementation unit should come after this decision?

**`VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01`** — see §15.

---

## 10. Chosen Model

### **Model 2 — Main App-first, CRM post-capture / post-qualification orchestration**

**Confirmed by both repos and the prior decision chain:**

| Property | Status |
|---|---|
| Main App owns canonical platform access creation | CONFIRMED (provisioning route, invite, membership, activation) |
| CRM owns qualification and operational review | CONFIRMED (qualify_lead RPC, onboarding_cases lifecycle) |
| Tier 0 capture starts in Main App and persists in CRM | CONFIRMED (POST /api/public/tier0/request-access → marketing.lead_submissions) |
| CRM-approved leads become onboarding candidates | CONFIRMED (admin_approved → issuance trigger → provisioning push) |
| CRM does not directly create Main App tenants | CONFIRMED (CRM calls provisioning API; Main App executes creation) |
| GSTIN gate enforced before transactional access | CONFIRMED (unchanged; post-provisioning gate) |
| CAE is not required before Tier 0 or provisioning | CONFIRMED (deferred; CAE role requires separate unit) |

---

## 11. Lifecycle Source-of-Truth Table

| Lifecycle Stage | Canonical System | Canonical Object | Status |
|---|---|---|---|
| Anonymous Tier 0 capture (form submit) | **Main App** | `POST /api/public/tier0/request-access` response (client-side: `mainAppTier0RequestId`) | LIVE |
| CRM receipt of Tier 0 capture | **CRM** | `marketing.lead_submissions` (`form_name='Main App Tier 0'`, `status=new`) | LIVE |
| CRM lead review | **CRM** | `marketing.lead_submissions.status` → `under_review` | LIVE (manual operator action) |
| CRM lead qualification | **CRM** | `crm.leads` (via `qualify_lead` RPC) | LIVE |
| CRM onboarding case creation | **CRM** | `crm.onboarding_cases` (via promote) | LIVE |
| CRM onboarding case review/docs | **CRM** | `crm.onboarding_cases.status` lifecycle | LIVE |
| **Approved onboarding candidate** | **CRM** | `crm.onboarding_cases.status = admin_approved` | LIVE |
| **CRM → Main App provisioning push** | **Shared** | CRM calls `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode) | LIVE (seam exists; E2E not yet runtime-verified with real lead) |
| **Main App tenant/org creation** | **Main App** | `tenants`, `organizations` tables | LIVE |
| **Main App invite issuance** | **Main App** | `invites` table; `inviteId` returned | LIVE |
| CRM invite relay | **CRM** | Issuance `actionLink` (assembled from Main App provisioning response) | LIVE |
| First-owner invite acceptance | **Main App** | `?token=xxx&action=invite` → `acceptAuthenticatedInvite` → `activateTenant` | LIVE |
| GSTIN submission | **Main App** | `gst_verifications` table; `POST /api/tenant/gst-verification` | LIVE |
| GSTIN review outcome | **Main App** | `gst_verifications.review_outcome` + `org.status` | LIVE |
| Transactional access unlock | **Main App** | `isVerificationBlockedTenantWorkspace` gate cleared | LIVE |
| CRM customer account record | **CRM** | Post-activation CRM follow-up (not a platform gate) | CRM-internal |

---

## 12. Canonical IDs / Cross-System References

| Identifier | Owner | Generated At | Stored Where | Purpose |
|---|---|---|---|---|
| `mainAppTier0RequestId` | Main App | Tier 0 form submit | Main App (response), `marketing.lead_submissions.raw_payload.mainAppTier0RequestId` | Idempotency for Tier 0 notify; traceability of web origin |
| `crmReceiptId` | CRM | On `marketing.lead_submissions` insert | Main App (stores after notify ACK), `marketing.lead_submissions.id` | CRM-side receipt anchor |
| `orchestrationReference` | CRM | At onboarding case creation | `crm.onboarding_cases`, `tenants.externalOrchestrationRef`, `main app provisioning response` | **Primary cross-system join key** — CRM case ↔ Main App tenant |
| `orgId` | Main App | At provisioning (returned by `POST /api/admin/tenant-provision`) | `tenants.id`, `crm.onboarding_cases.metadata_json` | Durable Main App tenant identity |
| `inviteId` | Main App | At provisioning | `invites.id`, `crm.onboarding_cases.metadata_json` | Access issuance anchor |

---

## 13. Current Provisioning Envelope (Confirmed Runtime Contract)

**Accepted by Main App `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode):**

| Field | Status | Notes |
|---|---|---|
| `provisioningMode` (`"APPROVED_ONBOARDING"`) | PROVEN_ACCEPTS | Required for service-caller path |
| `orchestrationReference` | PROVEN_ACCEPTS | Primary join key; unique constraint; idempotency via 409 conflict recovery |
| `organization.legalName` | PROVEN_ACCEPTS | Required |
| `organization.jurisdiction` | PROVEN_ACCEPTS | Required |
| `organization.registrationNumber` | PROVEN_ACCEPTS | Optional |
| `firstOwner.email` | PROVEN_ACCEPTS | Required |
| `firstOwner.role` | PROVEN_ACCEPTS | Must be `"OWNER"` |
| `tenantName` | PROVEN_ACCEPTS | Display name |
| `tenantSlug` | PROVEN_ACCEPTS | URL slug |
| `approvedOnboardingMetadata` | PROVEN_ACCEPTS (optional object) | Carry supplementary cross-system metadata here |
| `partyType` | NOT_ACCEPTED | Design-only; buyer/supplier discriminator not yet in runtime contract |
| `crmLeadId` | NOT_ACCEPTED (directly) | Use `approvedOnboardingMetadata.crmLeadId` until contract expanded |
| `crmOnboardingCaseId` | NOT_ACCEPTED (directly) | Use `approvedOnboardingMetadata.crmOnboardingCaseId` |
| `sourceChannel` | NOT_ACCEPTED (directly) | Should be in `approvedOnboardingMetadata.sourceChannel` |

---

## 14. Manual vs Automated Handoff — Soft Launch Decision

**Soft launch uses manual CRM review + automated provisioning push.**

This is the correct model for TexQtic Phase 2 / soft launch:

1. Operator reviews Tier 0 lead submissions in CRM admin inbox.
2. Operator qualifies → promotes → reviews docs → recommends → approves (`admin_approved`).
3. CRM issuance trigger fires automatically → calls Main App provisioning API.
4. Main App creates tenant + invite automatically.
5. Operator uses CRM issuance workflow to relay invite link to supplier.
6. Supplier accepts invite → activates account.

**No automation of step 1–2 is required before soft launch.**  
The manual qualification gate IS the fraud/authenticity control.

---

## 15. Recommended Next Unit

### **`VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01`**

**Rationale:**
- The CRM → Main App provisioning seam (`approvedOnboardingProvisioning.ts` → `POST /api/admin/tenant-provision`) exists and is code-complete.
- The seam has NEVER been end-to-end verified with a real or controlled test lead going through the full qualification → `admin_approved` → issuance → provisioning → invite path.
- Before relying on this path for any real commercial lead, the round-trip must be verified.
- The QA test row in `marketing.lead_submissions` (from `VERIFY-MAINAPP-CRM-TIER0-NOTIFICATION-SEAM-RUNTIME-01`) MUST NOT be used — it is a production QA record and must not be qualified.
- Paresh will need to authorize the creation of a controlled test provisioning scenario (either: manually simulate an existing CRM case, or submit a declared test lead specifically for E2E seam verification).

**Prerequisites for `VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01`:**
1. Paresh authorizes a controlled test provisioning run.
2. Either an existing CRM test case reaches `admin_approved`, or a new test case is created for the purpose.
3. `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` and `PLATFORM_APPROVED_ONBOARDING_PROVISION_URL` are confirmed set in CRM production environment.
4. Expected outcome: Main App returns 201 with `orgId` + `inviteId`; CRM stores provisioning metadata; invite link is valid.

---

## 16. Adjacent Findings and Firewalls

### Adjacent Findings — Do Not Fix in This Unit

| Finding | Unit | Priority | Status |
|---|---|---|---|
| CRM inbox has no dedicated `mainapp_tier0` filter | `FIX-CRM-TIER0-INBOX-FILTER-01` | P3 | OPEN |
| `sourceChannel` not carried in approved provisioning envelope | `IMPLEMENT-MAINAPP-CRM-PROVISIONING-ENVELOPE-SOURCE-CHANNEL-01` | P3 | OPEN |
| `crmLeadId` + `crmOnboardingCaseId` not persisted in Main App after provisioning | `IMPLEMENT-MAINAPP-CRM-PROVISIONING-CROSS-REF-STORAGE-01` | P3 | OPEN |
| `partyType` (buyer/supplier discriminator) not in runtime provisioning contract | `DECIDE-MAINAPP-PARTYTYPE-PROVISIONING-CONTRACT-01` | P2 | OPEN |
| `ROTATE-CRM-POSTGRES-NON-POOLING-CREDENTIAL-01` | Security remediation | P1 | PENDING — separate unit |

### Firewalls (Permanent — Do Not Open Without Explicit Authorization)

| Item | Status |
|---|---|
| `FTR-B2C-005B` — live supplier inquiry test | `HOLD_FOR_PARESH_AUTHORIZATION` (3 authorizations required) |
| `FTR-LEGAL-003` / `FAM-07` | `HOLD_FOR_LEGAL_OR_PAYMENT` |
| `FTU-COMM-002D` (Razorpay) | `HOLD_FOR_LEGAL_OR_PAYMENT` |
| `FTR-OPS-001` (Sentry) | Do not touch |
| `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01` | `DEFERRED` — not blocking soft launch |
| `GSTIN/Udyam/legal/payment as entry gate` | `PERMANENTLY_DEFERRED` — only allowed as transactional gate per `FD-TEXQTIC-ONBOARDING-AUTH-001.md` |

---

## 17. FTR-ACQ-005 Closure

`FTR-ACQ-005` (CRM-approved onboarding seam lock decision) is **CLOSED** by this unit.

- **Dependency met:** `FTR-ACQ-003` satisfied by `VERIFY-CRM-TIER0-LEAD-TO-QUALIFICATION-FLOW-01` (Final enum: `VERIFY_CRM_TIER0_LEAD_TO_QUALIFICATION_FLOW_COMPLETE`).
- **Decision made:** Model 2 confirmed. Seam contract locked.
- **`FUTURE-TODO-REGISTER.md` updated:** FTR-ACQ-005 row status → `CLOSED`.

---

## 18. Safety Confirmations

| Rule | Status |
|---|---|
| No source code edited — Main App | CONFIRMED |
| No source code edited — CRM | CONFIRMED |
| No schema changed | CONFIRMED |
| No migrations run | CONFIRMED |
| No env vars modified | CONFIRMED |
| No production API calls made | CONFIRMED |
| No emails or invites sent | CONFIRMED |
| No provisioning executed | CONFIRMED |
| No QA row qualified or promoted | CONFIRMED |
| No supplier inquiry submitted | CONFIRMED |
| No secrets printed | CONFIRMED |
| `FTR-B2C-005B` not opened | CONFIRMED |
| Legal/payment/Razorpay/Sentry untouched | CONFIRMED |
| Marketing Website untouched | CONFIRMED |
| CAE untouched | CONFIRMED |
| Both repos clean at end | CONFIRMED |

---

## 19. Final Enum

**`DECIDE_MAINAPP_CRM_APPROVED_ONBOARDING_SEAM_LOCK_COMPLETE`**

Model 2 (Main App-first, CRM post-capture / post-qualification orchestration) is locked as the canonical cross-system onboarding model.  
The CRM → Main App provisioning seam contract is confirmed, documented, and locked.  
The next unit is `VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01`.
