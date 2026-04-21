# TEXQTIC — Aggregator Intelligence and Handoff Ownership Decision v1

Decision ID: TEXQTIC-AGGREGATOR-INTELLIGENCE-AND-HANDOFF-OWNERSHIP-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / Aggregator intelligence and handoff ownership
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only Aggregator ownership decision

## 1. Aggregator Principle

TexQtic Aggregator is an authenticated discovery-intelligence, comparison, qualification, requirement-capture, and qualified-handoff workspace that helps an operator assess counterparty fit and move qualified intent into the correct downstream-authenticated path without turning Aggregator into a public directory, transaction owner, pricing owner, negotiation owner, fulfillment owner, or separate full back office.

The controlling rule is:

- Aggregator is authenticated-only discovery intelligence and handoff, not a public marketplace surface
- Aggregator may own comparison, qualification, structured need capture, route selection, and handoff confirmation context
- Aggregator may hold bounded pre-downstream intelligence and handoff records, but not downstream workflow execution ownership
- downstream-authenticated surfaces own inquiry/RFQ workflow, supplier follow-up continuity, pricing authority, quote continuity, negotiation, order/trade execution, fulfillment, and post-handoff operational state

Current-truth guardrail:

This artifact is planning authority only. It preserves current repo truth that Aggregator is routed and normalized as a curated directory and intent-handoff workspace, while also preserving that current runtime remains thinner than a full orchestrator claim. It does not claim that every canonical object class or handoff surface defined here is already fully live in runtime.

## 2. Aggregator-Owned Object Model

The canonical lawful Aggregator-owned object classes are:

| Aggregator Object Class | Purpose | Boundary Rule |
| --- | --- | --- |
| `DISCOVERY_INTELLIGENCE_OBJECT` | Authenticated discovery view that presents bounded counterparty, category, capability, and market-intelligence context | Lawful only as authenticated discovery and inspection context, not as public directory or downstream workflow object |
| `CATEGORY_COMPARISON_OBJECT` | Authenticated category-level comparison surface for comparing grouped supplier-fit or capability-fit context | Must remain comparison assistance, not sourcing execution or ranking-commercialization ownership |
| `SUPPLIER_COMPARISON_OBJECT` | Authenticated supplier-to-supplier or counterparty-to-counterparty comparison surface | Must remain fit and comparison context rather than quote, negotiation, or transaction state |
| `QUALIFICATION_CONTEXT_OBJECT` | Authenticated trust, compliance, verification, and fit-assessment context used to evaluate whether a downstream handoff is appropriate | Must remain qualification support, not governance-case ownership or downstream commercial commitment |
| `REQUIREMENT_CAPTURE_OBJECT` | Authenticated structured need/intake object capturing bounded commercial requirement context before downstream workflow ownership begins | Must remain pre-workflow intake/qualification context and must not itself become the canonical downstream RFQ, order, or trade record |
| `HANDOFF_ROUTING_OBJECT` | Authenticated route-selection and target-resolution object that determines the correct downstream destination for a qualified need | Must remain route and destination context, not execution ownership or automated marketplace intermediation |
| `HANDOFF_CONFIRMATION_OBJECT` | Authenticated confirmation object recording that a handoff occurred, where it was sent, and what bounded context crossed the stop line | Must remain handoff evidence and reference context, not a mirrored downstream workflow record |

Object model rules:

1. Every lawful Aggregator object in this unit exists only inside authenticated Aggregator workspace continuity.
2. Aggregator-owned objects may compose into one workspace flow, but their canonical roles remain distinct.
3. No object class in this unit authorizes a public Aggregator directory object, a public transaction-entry object, a quote object, a pricing object, a negotiation object, a fulfillment object, or a full back-office operations object.
4. Aggregator-owned objects may carry bounded references to downstream targets, but they must not mirror or absorb downstream workflow continuity after handoff occurs.

## 3. Intelligence / Comparison / Qualification Model

In lawful TexQtic terms, Aggregator intelligence means authenticated operator-assistance for understanding market-fit, counterparty-fit, qualification posture, and next-route suitability before downstream workflow ownership begins.

The canonical Aggregator intelligence responsibilities are:

| Intelligence Responsibility | What Aggregator May Lawfully Own | What Aggregator Does Not Own |
| --- | --- | --- |
| category comparison | Compare categories, segments, or capability groupings to help narrow where a need should go | Full ranking algorithm design, paid placement logic, or public marketplace categorization |
| supplier comparison | Compare counterparties using discovery-safe and qualification-safe context | Quote comparison, negotiation handling, or commercial commitment ownership |
| qualification context | Evaluate verification, trust, compliance, geography, MOQ, readiness, and similar fit cues | Governance-case adjudication, final commercial approval, or downstream transactional authority |
| requirement-to-supplier fit context | Assess whether one or more counterparties plausibly fit a captured need | Binding supplier assignment, automated brokering, or execution ownership |
| routing context | Determine which downstream path is the right next step for the captured need | Full workflow engine ownership or automated end-to-end routing authority |
| recommendation / selection assistance | Assist an operator in choosing a likely next route or likely candidate set | Sponsorship/commercial placement design, black-box ranking governance, or autonomous transaction orchestration |

Intelligence model rules:

1. Aggregator intelligence is authenticated and operator-assistive, not public-safe and not fully autonomous.
2. Comparison and qualification context may be persisted in Aggregator-owned records only when needed to support later requirement capture, route selection, or handoff evidence.
3. Recommendation or selection assistance in this unit is limited to ownership of assistance context and operator-facing support. It does not authorize full scoring-model design, sponsorship mechanics, or automatic execution.
4. Shared platform surfaces accessible from Aggregator must still be treated as inherited downstream capability, not as proof that Aggregator owns those deeper workflows.

## 4. Requirement Capture Model

The canonical Aggregator requirement-capture model is:

- requirement capture is an authenticated Aggregator-owned intake and qualification context
- it may be generic, category-scoped, capability-scoped, or supplier-targeted
- it may hold structured need context sufficient to support comparison, qualification, and route selection
- it does not itself become the canonical downstream workflow object

Minimum lawful requirement-capture context may include categories such as:

- requesting operator or organization posture
- category, segment, material, or capability need
- supplier-targeted or multi-candidate-targeted context when already narrowed
- quantity band, MOQ relation, geography, and urgency context
- compliance, trust, or qualification needs
- high-level commercial intent needed to choose the right downstream route

Requirement-capture rules:

1. Aggregator may own the intake object while the need is still being clarified, compared, qualified, and routed.
2. Requirement capture may remain generic before any supplier is selected, or it may narrow to capability-scoped or supplier-targeted context when comparison has already occurred.
3. Requirement capture may persist inside Aggregator as an intake/qualification object and later as handoff evidence, but it must not be treated as the canonical downstream RFQ, quote, order, or trade record.
4. Once a downstream-authenticated workflow record is created, that downstream record becomes the system of record for further execution continuity.
5. Requirement capture in this unit does not authorize automated matching, full RFQ workflow design, or downstream transaction ownership.

## 5. Handoff Routing / Confirmation Model

The canonical Aggregator handoff model is:

- handoff routing means selecting and preparing the correct downstream-authenticated destination for a qualified need
- handoff confirmation means recording that the route was chosen, the destination was launched or assigned, and the minimum bounded context crossed the stop line
- handoff remains a bounded ownership bridge, not downstream workflow execution ownership

Aggregator may lawfully own all of the following before downstream ownership begins:

| Handoff Responsibility | Lawful Aggregator Ownership |
| --- | --- |
| handoff suggestion | Recommend one or more lawful downstream destinations based on comparison, qualification, and requirement context |
| handoff selection | Record which destination the operator chose |
| handoff routing | Prepare the bounded route context needed for the chosen destination |
| handoff confirmation | Record that the handoff occurred, with time, target, reference, and bounded carried context |
| handoff evidence | Persist a summary of the originating need, selected candidates or route basis, and downstream reference handle |

Lawful downstream handoff targets in this unit are:

- authenticated B2B inquiry or RFQ flow
- authenticated supplier follow-up or governed supplier-side continuation
- authenticated B2C tenant commerce flow where the need is actually consumer-commerce-directed
- human follow-up or assisted path where the right next step is human-operated rather than immediate workflow creation

Handoff-routing rules:

1. Aggregator may own the suggestion, selection, route preparation, and confirmation stages of handoff.
2. Aggregator may persist bounded handoff evidence after handoff occurs, including originating requirement summary, route basis, target type, target reference, and handoff timestamp.
3. Aggregator may not own the downstream workflow state that follows the handoff, even if it can still display summary references to that downstream state.
4. Handoff routing in this unit does not authorize automatic supplier assignment, automatic quote generation, automatic negotiation launch, or automated execution orchestration.
5. Handoff to a human-assisted path is lawful when automated downstream workflow creation is not yet appropriate, but that still does not convert Aggregator into a separate operating back office.

## 6. Ownership Stop Line

The precise Aggregator ownership stop line is:

| Surface / Responsibility | Lawful Owner In This Unit |
| --- | --- |
| authenticated discovery intelligence | Aggregator-owned |
| authenticated category comparison | Aggregator-owned |
| authenticated supplier comparison | Aggregator-owned |
| authenticated qualification context | Aggregator-owned |
| authenticated requirement capture | Aggregator-owned |
| authenticated route suggestion / selection | Aggregator-owned |
| authenticated handoff confirmation and evidence | Aggregator-owned |
| authenticated B2B inquiry / RFQ workflow continuity | downstream-authenticated B2B ownership |
| authenticated supplier-side follow-up continuity | downstream-authenticated supplier or governed follow-up ownership |
| authenticated B2C commerce continuity | downstream-authenticated B2C ownership |
| pricing authority and quote continuity | downstream-authenticated commercial ownership |
| negotiation continuity | downstream-authenticated workflow ownership |
| order / trade execution continuity | downstream-authenticated execution ownership |
| fulfillment continuity | downstream-authenticated fulfillment ownership |

Stop-line rules:

1. Aggregator owns discovery, comparison, qualification, requirement capture, routing, and handoff confirmation only.
2. Aggregator ownership ends when the next meaningful workflow record is created or continued inside a downstream-authenticated surface.
3. Pricing ownership begins only in downstream-authenticated commercial workflow, never inside Aggregator-owned intelligence or handoff records.
4. Negotiation ownership begins only in downstream-authenticated workflow, never inside Aggregator-owned comparison or route-selection context.
5. RFQ, quote, order, trade, and fulfillment ownership are excluded from Aggregator ownership entirely, even when Aggregator originated the handoff.
6. Aggregator may retain bounded handoff evidence after the stop line, but that evidence must remain summary/reference context rather than downstream workflow continuity.

## 7. Expansion-Ready Guardrail

Future richer Aggregator intelligence is lawful only if later bounded authority extends authenticated comparison, qualification, or recommendation depth without converting Aggregator into a public directory owner, pricing owner, negotiation owner, fulfillment owner, automated marketplace intermediary, or separate full back office.

## 8. Non-Goals / Exclusions

This unit does not authorize:

- full ranking algorithm design
- sponsorship or commercial placement design
- public Aggregator directory design
- public Aggregator transaction entry
- full RFQ workflow design
- full quote, pricing, or negotiation system design
- full order, trade, or fulfillment system design
- shell UX or route-transition design in full
- implementation, runtime mutation, schema mutation, or control-plane mutation
- platform-orchestrator, mini-platform, or brokered-exchange overclaims

## 9. Downstream Dependencies

This decision is intended to be consumed by later bounded units that still must decide separately:

| Later Unit / Decision Area | What This Decision Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded Aggregator ranking / recommendation design | ownership boundary for recommendation assistance inside authenticated Aggregator intelligence | exact scoring logic, ranking inputs, explainability, sponsorship exclusion mechanics, and operator controls |
| bounded Aggregator requirement-capture design | canonical intake/qualification ownership line and lawful requirement context classes | exact form shape, persistence fields, validation thresholds, and lifecycle detail |
| bounded Aggregator handoff workflow design | canonical routing/confirmation ownership line and lawful downstream target set | exact route types, target references, confirmation UX, and downstream creation mechanics |
| bounded B2B inquiry / RFQ workflow design | Aggregator stop line before downstream-authenticated B2B workflow begins | exact RFQ record creation, supplier response continuity, and commercial workflow depth |
| bounded B2C commerce handoff design | lawful possibility of B2C-targeted handoff without Aggregator commerce ownership | exact commerce-entry semantics and authenticated transition mechanics |
| `PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE` | confirmation that Aggregator remains authenticated-only and not a public directory | exact shell, route, and transition behavior for public-entry versus authenticated Aggregator contexts |

## 10. Decision Result

`AGGREGATOR_INTELLIGENCE_AND_HANDOFF_OWNERSHIP_DRAFTED`

TexQtic now has one bounded decision artifact that defines the canonical Aggregator-owned intelligence object model, lawful comparison and qualification ownership, lawful requirement-capture ownership, lawful handoff routing and confirmation ownership, and the exact stop line between Aggregator-owned intelligence/handoff and downstream-authenticated workflow ownership.
