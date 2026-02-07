# TEXQTIC_OPERATING_MANUAL

## PURPOSE

Operational procedures and guidelines for running the TexQtic platform.

TEXQTIC OPERATING MANUAL
Status: 🔒 LOCKED (Doctrine → Product → Architecture → Execution)
Audience: Founders, Team A (Platform), Team B (Domains & UX), Auditors, Enterprise Stakeholders (internal)
Purpose:
This document is the single internal source of truth for how TexQtic is designed, governed, built, and operated. It stitches together doctrine, product intent, domain modeling, AI governance, architecture, and execution strategy into one operational manual.
Nothing in this document is speculative. Anything not included here is non-binding.

1. What TexQtic Is (Non-Negotiable)
   TexQtic is a compliance-first, trade-chain-native operating system for the global textiles industry.
   It exists to make regulated, multi-party textile trade possible at scale by enforcing trust, compliance, and accountability across the entire value chain:
   Yarn → Fabric → Processing → Garment → Buyer
   TexQtic does not optimize for speed, impulse purchasing, or engagement. It optimizes for:
   regulatory defensibility
   risk containment
   financial certainty
   auditability
   If a feature improves convenience but weakens compliance or traceability, it is out of scope.

2. Core Doctrine (LOCKED)
   These principles apply everywhere, always:
   Event-First Truth — Events are immutable; state is derived.
   Tighten-Only Governance — Policies may only become stricter downstream.
   Control Plane ≠ Tenant Plane — Governance is isolated from commerce.
   Append-Only Audit — No UPDATE or DELETE on events or irreversible actions.
   RLS via JWT Claims — org_id enforced everywhere.
   Maker–Checker for Irreversible Actions.
   Graduated Kill-Switches — OPEN → WARN → ENFORCE → FREEZE → SHUTDOWN.
   Fresh Compliance Context Required before irreversible actions.
   Doctrine is executable law, not philosophy.

3. Product North Star
   What TexQtic Is Not
   Not a Shopify-style storefront
   Not a generic B2B directory
   Not an ad-driven marketplace
   Not a bolt-on compliance plugin
   Singular Differentiator
   TexQtic is trade-chain-native and compliance-first.
   Compliance is state, not metadata
   Certifications are enforcement gates, not uploads
   Settlements are terminal obligations, not payments
   Growth Strategy — Network of Necessity
   Top-Down Regulatory Pull
   Brands use TexQtic as their Digital Product Passport (DPP) compliance interface
   Brands mandate supplier participation
   Adoption driven by legal right-to-sell
   Bottom-Up Supplier Workflow Push
   Suppliers reduce administrative debt
   Certificate management and batch traceability automated
   Engagement driven by time and risk reduction
   Cold-Start Resolution
   Manual matchmaking for first ~500 trades
   Human-verified early transactions
   No-fee core discovery
   Monetization Philosophy
   TexQtic monetizes safety and financial velocity, not attention.
   Primary revenue surfaces:
   Verification-as-a-Service
   Trade assurance (escrow)
   B2B financing (net terms)
   Dispute & arbitration workflows
   Premium insights
   Guardrails:
   If ad/marketing revenue exceeds verification/assurance revenue → doctrine drift
   Transparency is rewarded; secrecy is not monetized

4. Domain & Lifecycle Model (Summary)
   Anchor Domains
   Supplier
   DISCOVERED → ONBOARDING → VERIFIED (PARTIAL/FULL) → SUSPENDED → REVOKED
   Verified Certification Event (VCE)
   DECLARED → UNDER_VERIFICATION → VERIFIED → EXPIRED / REVOKED
   Certifications are immutable events with scope and validity windows.
   Trade Lifecycle
   RFQ — Intent declaration
   Negotiation — Conditional agreement
   Order — Conditional contract
   Shipment — Execution
   Settlement — Terminal financial lock
   Dispute — Designed-for interruption
   No shipment without confirmed order.
   No settlement without valid certifications.
   No irreversible action without policy hash.

5. Effective Policy Hash & Staleness Control
   Every irreversible action is governed by a Policy Hash, a deterministic fingerprint of:
   governance state
   enforcement rules
   compliance context
   workflow constraints
   contract schemas
   Rules:
   If policy changes, in-flight actions are blocked or explicitly re-acknowledged
   No silent drift
   Every decision is replayable
   Compatibility outcomes:
   MATCH
   TIGHTEN_ONLY_COMPATIBLE (warn + re-ack)
   INCOMPATIBLE (block)

6. AI Governance Blueprint
   AI roles:
   Advisory — suggest, predict, rank (default)
   Assistive — prepare actions, human must confirm
   Restricted — platform-only safety detection
   AI may never:
   approve settlements
   verify certifications
   override compliance
   mutate irreversible state autonomously
   Every AI output is logged with:
   reasoning hash
   confidence
   policy hash
   AI increases velocity without weakening trust.

7. Architecture Blueprint
   Structural Choice
   TexQtic is a modular monolith with hard domain boundaries, designed for future service extraction.
   Planes
   Control Plane (Team A)
   Governance & policy
   Compliance context
   Certification verification
   Kill-switches
   Audit & billing primitives
   Tenant Plane (Team B)
   Supplier workflows
   RFQs & negotiation
   Orders & shipments
   Disputes
   Settlement initiation
   Domains communicate via events and contracts only.

8. Team Execution Model
   Team A — Platform / Control Plane
   Mission: Guarantee correctness, enforcement, auditability.
   Owns:
   policy systems
   compliance engines
   certification authority
   audit & billing primitives
   Has veto power on enforcement integrity.
   Team B — Domains & UX
   Mission: Make regulated trade usable without hiding truth.
   Owns:
   supplier UX
   trade workflows
   negotiation & dispute UX
   advisory AI surfaces
   May not bypass enforcement.

9. 30 / 60 / 90 Day Execution Summary
   Team A
   0–30: platform spine & drift prevention
   31–60: compliance infrastructure
   61–90: monetization primitives
   Team B
   0–30: supplier onboarding & compliance clarity
   31–60: RFQ & negotiation UX
   61–90: shipment, dispute, settlement UX

10. Founder Weekly Review Checklist
    Run weekly:
    Did anything weaken enforcement?
    Did revenue skew toward ads or visibility?
    Did AI mutate state?
    Did UX hide a hard truth?
    If audit story worsens, velocity is irrelevant.

11. Regulator & Enterprise Posture
    TexQtic is presented as:
    a compliance interface
    an audit-ready system
    a risk containment layer
    Demonstrate:
    event replay
    policy hash
    blocked actions
    Systems that can say no earn trust.

12. Final Rule
    If a shortcut improves the demo but worsens the audit, it is not allowed.

END OF OPERATING MANUAL
