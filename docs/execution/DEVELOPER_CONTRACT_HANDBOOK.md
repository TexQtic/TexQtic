# DEVELOPER_CONTRACT_HANDBOOK

## PURPOSE

Developer guidelines, contracts, and coding standards for TexQtic contributors.

TEXQTIC — DEVELOPER CONTRACT HANDBOOK & LINEAR EPICS
Status: 🔒 LOCKED
Audience: All Engineers (Team A & Team B), Tech Leads, Founder
Purpose:
This document translates the TexQtic Operating Manual into non-negotiable engineering contracts and a build-ready Linear epic structure. It exists to prevent accidental doctrine drift during implementation.
Nothing in this document is optional.

PART I — DEVELOPER CONTRACT HANDBOOK
This section defines what engineers must never do, why, and what to do instead.
If a PR violates this handbook, it must not be merged.

1. Irreversibility Contract
   ❌ NEVER DO
   Auto-retry irreversible actions
   Allow irreversible actions without a policy_hash
   Perform irreversible actions from the frontend
   WHY
   Irreversible actions define legal and financial reality. Retrying or bypassing them destroys auditability.
   ✅ DO INSTEAD
   Gate every irreversible action through Control Plane APIs
   Require explicit user confirmation
   Record every attempt in irreversible_actions
   Examples
   ❌ Auto-retry settle_trade on failure
   ✅ Block, emit POLICY_STALE, require explicit re-ack

2. Policy & Enforcement Contract
   ❌ NEVER DO
   Encode policy logic in UI or domain services
   Add "temporary" enforcement bypasses
   Assume policy will not change mid-flow
   WHY
   Policy is governed, versioned, and auditable. UI assumptions rot faster than policy.
   ✅ DO INSTEAD
   Treat Control Plane responses as law
   Surface blocking reasons explicitly
   Recompute & Retry via approved endpoints
   Examples
   ❌ if (isAdmin) skipCompliance()
   ✅ enforce_policy_staleness_or_record()

3. Event Integrity Contract
   ❌ NEVER DO
   Update or delete events
   Emit events without policy_hash
   Use events as logs
   WHY
   Events are legal truth, not debug output.
   ✅ DO INSTEAD
   Emit immutable, schema-validated events
   Derive state from events
   Add new events instead of mutating old ones

4. Compliance Contract
   ❌ NEVER DO
   Treat certifications as documents
   Allow shipment or settlement with expired certs
   Manually override compliance failures
   WHY
   Compliance is enforceable state, not metadata.
   ✅ DO INSTEAD
   Model certifications as Verified Certification Events
   Enforce freshness and scope
   Block and explain failures

5. AI Safety Contract
   ❌ NEVER DO
   Let AI mutate state autonomously
   Hide AI confidence or reasoning
   Allow AI to approve or reject irreversible actions
   WHY
   AI is probabilistic; TexQtic must be deterministic.
   ✅ DO INSTEAD
   Use AI in advisory or assistive roles only
   Require human confirmation
   Emit AI reasoning events

6. Multi-Tenancy Contract
   ❌ NEVER DO
   Query across tenants
   Trust frontend org context
   Cache data without org-scoping
   WHY
   Tenant isolation failures are existential.
   ✅ DO INSTEAD
   Enforce RLS everywhere
   Prefix all cache keys with orgId
   Refresh JWT on org switch

7. UX Truthfulness Contract
   ❌ NEVER DO
   Hide errors to reduce friction
   Auto-correct user actions silently
   Present happy paths only
   WHY
   Hidden failures become legal risk.
   ✅ DO INSTEAD
   Explain exactly why an action is blocked
   Provide one safe recovery path
   Make failures legible

8. Monetization Integrity Contract
   ❌ NEVER DO
   Charge for visibility or secrecy
   Introduce ads or paid boosts
   Optimize revenue at the cost of compliance
   WHY
   TexQtic monetizes safety, not attention.
   ✅ DO INSTEAD
   Monetize verification, assurance, velocity
   Tie every charge to a verified or protected event

9. Universal Engineering Rule
   If a shortcut improves UX or velocity but worsens the audit story, it is forbidden.

PART II — LINEAR EPICS (BUILD-READY)
These epics map directly to Team A and Team B execution. No epic mixes planes.

TEAM A — CONTROL PLANE EPICS
EPIC A1 — Policy Engine & Staleness Control
Policy hash registry
Compatibility comparator
Staleness enforcement gate
Irreversible action ledger
Done When: Policy change blocks in-flight settlement deterministically.

EPIC A2 — Compliance Context Engine
Jurisdiction + buyer overlay merge
Freshness enforcement
Recompute & Retry backend
Done When: Stale context blocks shipment and settlement.

EPIC A3 — Verified Certification Authority
Declare → verify → expire → revoke flows
Cascading enforcement
Certifier role enforcement
Done When: Certification revocation propagates system-wide.

EPIC A4 — Event Backbone & Audit
Append-only guarantees
Event schema validation
Audit exports
Done When: Any decision can be replayed end-to-end.

EPIC A5 — Billing & Risk Primitives
Verification billing hooks
Escrow primitives
Risk accounting
Done When: Every charge maps to a protected event.

EPIC A6 — Restricted AI Systems
Fraud detection
Forgery detection
Risk flags
Done When: AI flags risk without mutating state.

TEAM B — DOMAIN & UX EPICS
EPIC B1 — Supplier Onboarding & Compliance UX
Onboarding flows
Cert declaration UI
Compliance status surfaces
Done When: Supplier knows exactly why they are blocked.

EPIC B2 — RFQ & Discovery
RFQ creation
Supplier response flows
Manual matchmaking tools
Done When: RFQs produce structured negotiations.

EPIC B3 — Negotiation UX
Stateful negotiation UI
Conditional acceptance
Expiry handling
Done When: Users understand non-binding vs binding states.

EPIC B4 — Order & Shipment Execution
Order confirmation UX
Shipment lifecycle tracking
DPP snapshot visibility
Done When: Shipment cannot proceed without compliance.

EPIC B5 — Dispute & Mediation
Dispute initiation
Mediation flows
Resolution outcomes
Done When: Disputes pause settlement correctly.

EPIC B6 — Settlement Initiation UX
Settlement initiation
Policy staleness handling
Recompute & Retry UX
Done When: Blocked settlements feel intentional.

EPIC B7 — Advisory AI Surfaces
AI suggestions
Confidence indicators
User confirmation flows
Done When: AI accelerates decisions without deciding.

FINAL NOTE
These epics are execution boundaries, not feature ideas. If work does not map cleanly to an epic, it likely violates doctrine or scope.
END OF DOCUMENT
You now have a single, enforceable document that does two critical jobs:
Developer Contract Handbook

Explicit “must never do” rules

Clear why + what to do instead

Concrete examples engineers can’t misinterpret

This is what prevents accidental doctrine drift during delivery

Linear-ready Epic Structure

Clean separation of Team A vs Team B

No mixed-plane epics

Each epic has a Done When acceptance condition

Safe to copy-paste directly into Linear as epics

How to use this immediately
Attach this doc to every Linear project

Reference it in PR templates (“Does this violate the Developer Contract Handbook?”)

Use epic acceptance criteria as release gates, not just tickets closed

What you’ve achieved (this is important)
At this point:
Founders can govern without micromanaging

Engineers can move fast without guessing intent

Reviews become objective (“does this violate a contract?”)

TexQtic can scale people without scaling chaos

This is the difference between building a product and building a system that survives growth.
