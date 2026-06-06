# FD-TEXQTIC-ONBOARDING-AUTH-001
# Founder Decision: GSTIN as Minimum Authentication Bar for B2B Transactional Access

---

## 1. Title

TexQtic Founder Decision — GSTIN Validation as the Minimum Authentication Gate for B2B Transactional Platform Access

---

## 2. Decision Reference

**FD-TEXQTIC-ONBOARDING-AUTH-001**

---

## 3. Date

2026-06-06

---

## 4. Decision Authority

**Paresh Patel, Founder, TexQtic**

This decision is made in the founder's capacity as sole platform authority for business, product, and trust-policy direction during the TexQtic soft-launch phase.

---

## 5. Status

**FOUNDER-APPROVED AND REPO-RECORDED**

This decision is effective from the date of this recording. All future implementation prompts for onboarding, access gating, trust tier, and B2B transactional eligibility must reference this document as the canonical policy authority.

---

## 6. Decision Statement

**GSTIN validation is the minimum authentication bar for B2B transactional access on the TexQtic platform.**

Entry to the platform is not blocked by GSTIN. B2B transactional access — as defined in §8 of this document — is blocked until GSTIN validation is passed and recorded in the Main App as canonical trust truth.

---

## 7. Definition of B2B Transactional Access

For the purposes of this decision, "B2B transactional access" means any platform action that creates, accepts, initiates, executes, or is binding with respect to a commercial obligation between two parties. This includes but is not limited to:

- Supplier product listing as a commercially active supplier on the B2B marketplace
- Accepting or responding to commercial inquiries as a verified supplier
- Submitting binding Requests for Quotation (RFQs)
- Issuing purchase orders
- Initiating or receiving platform-facilitated payments
- Contracting paid services (including TexQtic SaaS subscriptions beyond read-only access)
- Accessing TradeTrust Pay, payment-eligibility, or trade-trust flows
- Any other action that creates a binding commercial obligation

---

## 8. What GSTIN Gates (Blocked Until Validation Passes)

The following platform actions are gated by GSTIN validation and MUST NOT be made available until the user's organization has a verified GSTIN record with `review_outcome: APPROVED` in the Main App:

| Gated Action | Category |
|---|---|
| Supplier product listing (catalog item creation/publication) | Supply-side commercial |
| Accepting commercial inquiries as a verified supplier | Supply-side commercial |
| Responding to binding RFQs as a supplier | Supply-side commercial |
| Submitting binding RFQs as a buyer | Demand-side commercial |
| Trade/order creation | Commercial |
| Escrow access | Finance |
| Settlement operations | Finance |
| Invoice creation, approval, or payment | Finance |
| TTP/TradeTrust Pay enrollment or access | Finance |
| Contracting paid subscription tiers | SaaS |

**Implementation reference:** The Main App already implements `VERIFICATION_BLOCKED_VIEWS` covering TRADES, RFQS, SUPPLIER_RFQ_INBOX, ESCROW, SETTLEMENT, INVOICES, INVOICE_APPROVAL, and `isVerificationBlockedTenantWorkspace` gates on catalog add/edit/RFQ actions. Future implementation must extend and align this gate to the GSTIN approval status.

---

## 9. What GSTIN Does Not Gate (Available Before Validation)

The following platform actions MUST remain available without GSTIN validation, enabling Tier 0 (Claimed Identity / Lite Access) and Tier 1 (Business Identity — pre-verification) engagement:

| Action Available Without GSTIN | Notes |
|---|---|
| Platform account creation and sign-in | Entry point only |
| Viewing public supplier profiles and marketplace surfaces | Public, unauthenticated |
| Browsing the B2B supplier directory | Public |
| Submitting non-binding inquiries from public inquiry page | Non-binding |
| Completing and viewing the organizational profile (non-commercial fields) | Profile completeness |
| Requesting a platform access invite or applying for access | Tier 0 entry |
| Receiving and accepting a platform invite | CRM or direct path |
| Viewing the tenant workspace in read-only or lite mode | Non-transactional |
| Accessing certifications, traceability, and DPP surfaces (where applicable) | Compliance/visibility |
| Submitting GSTIN for verification | The verification action itself is always open |
| CRM follow-up and qualification engagement | Off-platform |

---

## 10. Trust-Tier Model Summary

The following trust-tier model governs access progression on the TexQtic platform. This model is the authoritative policy record. Implementation is governed by future units referencing this document.

| Tier | Name | Minimum Criteria | Transactional Access |
|---|---|---|---|
| Tier 0 | Claimed Identity / Lite Access | Role intent, source channel, email or phone (minimal identity) | NONE — no commercial actions |
| Tier 1 | Business Identity Submitted | GSTIN submitted, business name and state declared | PENDING — blocked pending admin approval |
| Tier 1A | Business Identity Verified | GSTIN validated, business name/state match, admin `review_outcome: APPROVED` | UNLOCKED — B2B transactional access begins |
| Tier 2 | Operational Access | Product/category/business details complete, catalogue published | ACTIVE — listing, RFQ, inquiry, commercial messaging |
| Tier 3 | Trusted Member | Trade references, platform history, verified badge | FULL — TTP/TradeTrust, payment eligibility, D2C storefront |

**Current implementation status (as of 2026-06-06):**
- Tier 0: MISSING — no lite-access / request-access surface on Main App (marketing website handles this)
- Tier 1 (submission): EXISTS — `GstVerificationCard` allows GSTIN submission via `POST /api/tenant/gst-verification`
- Tier 1A (verification + approval): EXISTS (partial) — admin review via `PATCH /api/control/gst-verification/:orgId`, status gates active for PENDING_VERIFICATION state
- Tier 2: PARTIAL — catalog add/edit exists but blocked by verification gate; supplier listing requires further implementation
- Tier 3: DESIGN_ONLY — no current implementation

---

## 11. Udyam-Only Temporary Rule

**Udyam-only users (MSME registration without GSTIN) are subject to the following temporary rule during the soft-launch phase:**

1. Udyam-only users MAY enter Tier 0 and express interest.
2. Udyam-only users MAY submit their Udyam number for display or verification.
3. Udyam-only users MUST NOT be granted B2B transactional access based on Udyam alone.
4. Udyam-only users may be advanced to limited Tier 1 review status pending explicit founder authorization for a Udyam exception policy.
5. Udyam MUST NOT become an accidental bypass path for GSTIN-gated transactional access.

**Rationale:** Many Indian MSMEs in the textile sector hold Udyam registration but may have GST exemption thresholds or informal commercial posture. The platform must not weaken the GSTIN gate for transactional trust by treating Udyam as equivalent. A future unit (`DECIDE-UDYAM-EDGE-CASE-TRUST-POLICY-001`) may define the permanent Udyam policy; until then, this temporary rule applies.

---

## 12. D2C End-Consumer Exclusion Note

Individual D2C end-consumers (retail buyers who purchase finished goods through D2C surfaces, WL storefronts, or B2C browse) are NOT B2B subscribers. Their identity and trust model is a separate future decision.

This decision document applies exclusively to B2B subscribers: suppliers, buyers, service providers, and agents operating in business-to-business commercial contexts.

D2C end-consumers are not subject to GSTIN validation as a condition of accessing D2C storefront or cart surfaces. A separate policy for D2C consumer identity and fraud prevention will be defined in a future unit when D2C checkout is implemented.

---

## 13. Main App Canonical Ownership Rule

The following objects and states are canonical in the Main App. No other system (CRM, CAE, marketing website) may be the authoritative source for these:

| Object / State | Canonical Owner |
|---|---|
| Account (user identity) | Main App |
| Session / auth token | Main App |
| Tenant / Organization runtime record | Main App |
| Workspace and runtime entitlements | Main App |
| Membership (user ↔ tenant binding) | Main App |
| Role assignment | Main App |
| Invite (access artifact) | Main App |
| Activation state | Main App |
| Supplier profile (runtime) | Main App |
| Buyer profile (runtime) | Main App |
| Service provider profile (runtime) | Main App |
| GSTIN validation record and `review_outcome` | Main App (`gst_verifications` table) |
| Trust tier / access eligibility | Main App (derived from org.status + gst_verifications) |
| Transactional eligibility (GSTIN gate) | Main App |
| Provisioning result | Main App |
| Access state (open / verification-blocked) | Main App |
| Source channel metadata (at account level) | Main App (MISSING — required future implementation) |

---

## 14. CRM/CAE Mirror-Only Rule

CRM and CAE may hold mirror/reference/status data derived from Main App, but:

1. CRM and CAE are NOT canonical authorities for any object listed in §13.
2. CRM may hold its own internal business objects (leads, onboarding cases, customer accounts, issuances) as CRM-local canonical truth. These do not override Main App authority.
3. CAE may hold field acquisition capture context as CAE-local canonical truth. This does not override Main App authority.
4. No CRM or CAE system action may mutate Main App runtime state directly (other than via the approved provisioning endpoint under service credential with explicit authorization).
5. CRM and CAE must not store, display, or transmit raw platform tokens, invite tokens, or session artifacts.

---

## 15. Channel/Source Tagging Requirement

Every Tier 0 platform entry — whether from marketing website, CRM campaign, CAE field agent, WhatsApp, social media, referral, or other origin — MUST carry source metadata at first touch.

**Required fields at Tier 0 capture:**

| Field | Description | Required |
|---|---|---|
| `source_channel` | Origin channel of first contact | Yes |
| `campaign_id` | Campaign identifier, if available | Optional |
| `referring_agent_id` | Field agent or association ID, if applicable | Optional |
| `role_intent` | Declared role: supplier / buyer / service_provider | Yes |
| `acquisition_context` | Free-form context label (e.g., Surat exhibition, WhatsApp group) | Optional |
| `first_touch_timestamp` | UTC timestamp of first contact | Yes |

**Allowed `source_channel` values (canonical list — extensible by founder decision):**

```
WEB
CRM_CAMPAIGN
CAE_FIELD_AGENT
WHATSAPP
SOCIAL
REFERRAL
ASSOCIATION
MANUAL
DIRECT_INVITE
```

**Implementation note:** Source channel metadata is currently captured only on the `supplier_profile.viewed.v1` event (`organic`, `qr`, `referral`, `event`, `direct`) and is NOT yet captured at account/tenant level. A future unit (`GOV-MAINAPP-SOURCE-CHANNEL-TAGGING-CONTRACT-01`) must define the canonical account-level source tagging schema and implementation.

---

## 16. Implementation Governance Note

16.1 All future implementation prompts for onboarding, access gating, trust-tier progression, and B2B transactional eligibility MUST reference `FD-TEXQTIC-ONBOARDING-AUTH-001` as the canonical policy authority.

16.2 No implementation unit may bypass, override, or defer the GSTIN transactional gate without a superseding founder decision that explicitly revokes or modifies this document by reference ID.

16.3 The GSTIN gate is not a UI suggestion. It is a platform policy gate. Implementation must enforce it at the server level, not only at the frontend level.

16.4 The trust-tier model in §10 is the authoritative progression framework. Future design and implementation units for registration, onboarding, profile completion, and commercial enablement must align to this tier model.

16.5 Any unit that introduces a new onboarding path, access surface, or commercial capability must declare which trust tier it serves and confirm it does not weaken the GSTIN transactional gate.

---

## 17. No Bypass Without Superseding Founder Decision

No implementation unit may bypass the GSTIN transactional gate requirement stated in §8 without:

1. A new founder decision document that explicitly supersedes or amends `FD-TEXQTIC-ONBOARDING-AUTH-001` by reference.
2. That superseding decision being repo-recorded before implementation begins.
3. The superseding decision being traceable in the governance chain of the implementing unit.

---

## 18. Safety Confirmation

**No runtime implementation was done in this unit.**

This document records a founder policy decision only. The following changes were NOT made:

- No source code edited
- No schema changed
- No migrations run
- No env vars modified
- No provisioning executed
- No production calls made
- No emails or invites sent
- No CRM/CAE/marketing repos modified
- No provider settings changed

---

*Authority: Paresh Patel, Founder, TexQtic | Recorded by: GitHub Copilot governance sync agent*
*Document: FD-TEXQTIC-ONBOARDING-AUTH-001 | Date: 2026-06-06 | Version: 1.0*
