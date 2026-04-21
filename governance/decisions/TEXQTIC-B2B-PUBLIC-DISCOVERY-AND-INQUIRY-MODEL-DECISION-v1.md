# TEXQTIC — B2B Public Discovery and Inquiry Model Decision v1

Decision ID: TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / B2B public discovery and inquiry model
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only B2B public-surface decision

## 1. B2B Discovery Principle

TexQtic B2B public discovery exists to let business participants inspect governed supplier-fit context and start non-binding inquiry or structured RFQ-intent entry without turning TexQtic into an anonymous public marketplace or exposing authenticated exchange workflow publicly.

The controlling rule is:

- B2B public discovery is projection-only, trust-governed, and entry-oriented
- B2B public discovery may expose supplier-fit and offering-preview context, but not pricing, negotiation, or workflow continuity
- public inquiry and RFQ-intent are public-triggered intake and handoff mechanisms, not public workflow ownership
- authenticated B2B exchange remains the owner of RFQ workflow, pricing, negotiation, messaging, orders, and trade execution

Current-truth guardrail:

This artifact is planning authority only. It does not claim that anonymous B2B marketplace depth is already live in runtime, and it does not reopen current approved exclusions around public pricing, public negotiation, or public RFQ workflow continuity.

## 2. Public Discovery Object Model

The canonical B2B public discovery object classes are:

| Discovery Object Class | Purpose | Boundary Rule |
| --- | --- | --- |
| `SUPPLIER_DISCOVERY_PROFILE` | Public-safe supplier identity and qualification-facing discovery summary | Lawful only as projected supplier discovery identity, not as a full public supplier workspace |
| `SUPPLIER_CAPABILITY_PROFILE` | Public-safe capability, capacity, process, and category-fit preview | Must remain capability preview rather than authenticated commercial depth |
| `CATEGORY_CAPABILITY_DISCOVERY_VIEW` | Public-safe category or segment entry surface showing governed supplier-fit context | Must not become an undifferentiated anonymous marketplace browse layer |
| `BOUNDED_OFFERING_PREVIEW` | Public-safe non-pricing product or offering preview attached to supplier discovery | May preview offering truth, but not full commerce continuity |
| `TRUST_QUALIFICATION_PREVIEW` | Public-safe trust, certification, verification, MOQ, geography, and qualification cues | Must remain preview evidence, not governance-case or workflow state |

Object model rules:

1. These object classes are lawful only when rendered from governed public-safe projections of B2B-eligible tenants and B2B-public objects.
2. The classes may be composed on one page or surface, but their canonical roles remain distinct.
3. Inquiry and RFQ-intent entry may attach to these discovery objects, but those entry actions do not convert the objects themselves into workflow-owned public records.
4. No object class in this unit authorizes a public supplier inbox, public RFQ detail, public quote object, public negotiation thread, or public trade object.

## 3. Public-Safe Discovery Payload Model

### 3.1 Allowed B2B Public-Safe Payload Categories

The canonical allowed B2B public-safe payload categories are:

| Payload Category | Meaning In This Unit |
| --- | --- |
| supplier identity | Supplier name, lawful brand identity, business summary, and discovery-safe profile context |
| trust / verification posture | Public-safe trust signals, certification summary, qualification cues, and verified-business posture |
| capability metadata | Capability, process, material, service, and production-fit descriptors suitable for discovery |
| category / segment coverage | Segment, category, and discovery classification context showing where the supplier fits |
| geography / MOQ / qualification context | Discovery-safe trade qualifiers such as geography, service region, MOQ range, or qualification-fit cues |
| bounded offering preview | Non-pricing offering or product-summary preview that supports discovery without becoming full marketplace depth |
| inquiry entry context | Public-safe context that explains whether and why generic inquiry may be started from this discovery object |
| RFQ-intent entry context | Public-safe context that explains whether and why structured RFQ-intent entry may be started from this discovery object |
| publication / availability posture | Whether the object is lawfully public and whether it is inquiry-ready or RFQ-intent-ready under the approved posture |

### 3.2 Prohibited B2B Public Categories

The following categories are prohibited from B2B public discovery payloads:

| Prohibited Category | Why It Is Prohibited |
| --- | --- |
| transactional pricing | B2B public pricing exposure is not authorized |
| negotiation state | Negotiation is authenticated workflow continuity only |
| messaging continuity | Public discovery does not own a public thread or participant continuity |
| RFQ workflow continuity | RFQ records, supplier responses, and RFQ status belong after authentication |
| order / trade execution state | Execution continuity remains authenticated downstream ownership only |
| admin / governance-only state | Moderation, review, internal notes, governance flags, and control-plane posture are not public-safe |
| raw internal operational records | Public rendering must not read raw internal records directly |
| buyer-specific or supplier-specific authenticated continuity | Participant-specific continuity begins only after authentication |

Payload discipline rule:

Public-safe B2B discovery payloads must be projected from governed public-safe categories only and must not be assembled by leaking operational joins that reveal prohibited workflow, commercial, or governance state.

## 4. Inquiry Model

The canonical public inquiry initiation model is:

- public inquiry is a public-triggered, non-binding, governed intake event
- it is broader and less structured than RFQ-intent
- it may start from supplier-scoped, capability-scoped, or bounded-offering-scoped discovery objects
- category-scoped inquiry is lawful only as TexQtic-owned routed intake context and not as a public multi-supplier thread

Minimum lawful pre-auth inquiry context is limited to categories such as:

- contactability and organization-identification context
- selected supplier, capability, offering, or category context
- high-level need summary or use-case context
- broad qualification cues such as geography, volume band, or urgency band when voluntarily provided

Inquiry ownership rule:

1. The public surface owns only the entry prompt and minimal intake capture.
2. TexQtic may own the resulting public-triggered intake normalization and routing context.
3. The resulting inquiry does not create a public messaging thread, supplier-owned public continuity, or buyer-owned authenticated workflow by itself.
4. Supplier-facing continuity begins only when the inquiry is routed into an authenticated supplier-side or governed follow-up context.
5. Buyer-facing continuity begins only when the buyer enters an authenticated downstream workspace or follow-up path.

## 5. RFQ-Intent Model

The canonical public RFQ-intent initiation model is:

- RFQ-intent is a separate public-triggered entry class from generic inquiry
- RFQ-intent captures a more structured sourcing-intent preview than generic inquiry
- RFQ-intent is still not a full RFQ workflow object
- RFQ-intent may begin from supplier-scoped, capability-scoped, bounded-offering-scoped, or tightly bounded category-scoped discovery context

Minimum lawful pre-auth RFQ-intent context is limited to categories such as:

- requirement category or capability need
- quantity band or MOQ-relation context
- geography or fulfillment-region context
- timing or urgency context
- qualification or compliance need context
- buyer organization and contact posture

RFQ-intent boundary rule:

1. RFQ-intent may create a TexQtic-owned structured intake or qualification bridge.
2. RFQ-intent does not by itself create the canonical RFQ workflow record.
3. RFQ workflow ownership begins only when the user enters authenticated RFQ creation or another authenticated downstream continuity surface.
4. Supplier response continuity does not begin on the public surface and does not begin from RFQ-intent alone.
5. If authentication or governed continuation never occurs, the RFQ-intent remains intake context only, not a completed RFQ object.

Inquiry versus RFQ-intent distinction:

- inquiry is the lighter-weight governed contact or fit-intake bridge
- RFQ-intent is the more structured sourcing-intent bridge that prepares authenticated RFQ creation
- neither one authorizes public pricing, supplier quote continuity, negotiation, or workflow ownership

## 6. Handoff / Ownership Model

The precise ownership stop line is:

| Surface / Responsibility | Lawful Owner In This Unit |
| --- | --- |
| public discovery object rendering | public-safe projection surface |
| public inquiry entry prompt | public-triggered entry surface |
| public RFQ-intent entry prompt | public-triggered entry surface |
| intake normalization, qualification, and routing bridge | TexQtic governed entry ownership |
| authenticated RFQ creation | downstream-authenticated B2B workflow ownership |
| supplier response continuity | downstream-authenticated supplier-side ownership |
| pricing, quote, negotiation, messaging, order, and trade continuity | downstream-authenticated B2B workflow ownership |

Handoff rules:

1. The public B2B surface may own discovery, preview, trust context, and public-triggered intake entry only.
2. TexQtic may own the intake normalization, qualification, and handoff bridge created by public inquiry or RFQ-intent.
3. Supplier-facing continuity begins only when a supplier receives or acts on the request inside an authenticated supplier-side or governed follow-up context.
4. Buyer-facing authenticated continuity begins only when the buyer enters authenticated RFQ or downstream exchange workflow.
5. The public surface is excluded from owning pricing authority, quote continuity, negotiation, messaging, order execution, trade execution, or participant-specific workflow state.

## 7. Expansion-Ready Guardrail

Future fuller self-serve B2B public-entry expansion is lawful only if later bounded authority explicitly extends structured intake and authenticated handoff depth without collapsing the current stop line between public-triggered entry and authenticated RFQ, pricing, negotiation, or trade workflow ownership.

## 8. Non-Goals / Exclusions

This unit does not authorize:

- full RFQ workflow design
- pricing model design or pricing ownership redesign
- messaging or negotiation workflow design
- order or trade execution design
- public quote objects or public supplier response continuity
- B2B ranking or search algorithm design in full
- shell UX or public route design in full
- implementation, runtime mutation, schema mutation, or control-plane mutation
- anonymous B2B marketplace depth, public negotiation, or public transactional pricing

## 9. Downstream Dependencies

This decision is intended to be consumed by later bounded units that still must decide separately:

| Later Unit / Decision Area | What This Decision Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded B2B RFQ workflow design | the exact stop line between public RFQ-intent and authenticated RFQ ownership | canonical RFQ record shape, supplier response stages, RFQ status continuity, and workflow transitions |
| bounded B2B pricing / negotiation continuity design | public exclusion of pricing and negotiation from public discovery and entry | quote continuity, counter-offer model, pricing authority, and negotiation-thread behavior |
| bounded B2B order / trade execution continuity design | public exclusion of execution continuity from discovery and intake | downstream order, trade, escrow, and settlement workflow behavior |
| `PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE` | the B2B public-entry surface stop line and authenticated handoff requirement | exact shell, route, and public-to-authenticated transition behavior |

## 10. Decision Result

`B2B_PUBLIC_DISCOVERY_AND_INQUIRY_MODEL_DRAFTED`

TexQtic now has one bounded decision artifact that defines the lawful B2B public discovery object model, public-safe discovery payload categories, public inquiry model, RFQ-intent model, and the ownership handoff boundary without widening into full authenticated B2B workflow design.
