# TexQtic — CRM Taxonomy Handoff White Paper

**Document type:** Team handoff — CRM audience  
**Version:** v1  
**Date:** 2026-04-22  
**Authority basis:** April 13 / 14 / 18 structure-taxonomy-authority chain  
**Status:** Ready for team handoff

---

## 1. Purpose

This paper equips the TexQtic CRM team with the platform's canonical family model, its B2B
taxonomy structure, and the exact rules that govern how CRM may normalize, record, and hand off
prospect data to provisioning.

CRM operates at a critical boundary: it receives raw interest signals from Marketing intake and
must normalize them into structured recommendations that provisioning can act on. Getting this
wrong — by treating CRM-normalized data as canonical classification, or by collapsing family,
capability, and plan into one undifferentiated "tenant type" — causes downstream provisioning
errors and breaks tenant identity at the moment it becomes canonical.

Reading this paper will help the CRM team:

- understand the canonical platform structure well enough to normalize prospect data correctly
- use the right vocabulary when recording family, capability, and segment intent
- separate recommendation language from canonical classification language
- prepare clean handoff records that provisioning can receive and act on without correction
- avoid CRM-side classification errors that propagate into the platform's live tenant identity

---

## 2. Audience

**Primary audience:** CRM team, sales operations, onboarding coordinators, and anyone who
normalizes, records, or routes TexQtic prospect data before provisioning.

**Not the audience for this paper:** Marketing, Engineering, or active-tenant support teams.
Marketing has its own separate handoff paper.

---

## 3. Why This Paper Exists Now

TexQtic's platform structure has been formally locked through a governance chain completed between
April 13 and April 18, 2026. That chain resolved how the platform's commercial families, White
Label capability, Aggregator mode, and B2B taxonomy are defined — and exactly where CRM authority
begins and ends.

CRM sits between two stages that have different authority over tenant identity:

- **Marketing intake** — non-canonical interest signals, no classification authority
- **Provisioning** — the first stage that may create canonical persisted tenant identity

CRM's role is to normalize the signal from Marketing and hand off a structured recommendation to
provisioning. CRM **recommends** family fit and segment posture. CRM does **not** persist canonical
classification truth.

Without this handoff paper, CRM teams may inadvertently:

1. treat their normalized values as canonical tenant identity (they are not)
2. classify White Label or Aggregator as separate base families (they are not)
3. collapse package/plan into family identity in CRM records (they must be kept separate)
4. expose full internal B2B taxonomy fields that belong to provisioning and runtime (they must not)
5. treat provisioning as a rubber-stamp step that just confirms what CRM decided (it is not)

This paper removes that ambiguity.

---

## 4. Canonical Platform Truth — What CRM Must Know

### 4.1 The Family Model

TexQtic has **two commercial families**:

| Family | What it means for CRM |
|---|---|
| **B2B** | Full authenticated business-to-business exchange for textile-industry participants. CRM should route B2B-likely prospects here. B2B carries the full textile-industry taxonomy — segment + role-position classification. |
| **B2C** | Branded consumer-commerce platform. CRM should route B2C-likely prospects here. B2C does not carry the B2B textile taxonomy. |

There is also one **non-commercial category**:

| Category | What it means for CRM |
|---|---|
| **INTERNAL** | Non-commercial internal platform posture. If a prospect signals internal-platform intent, CRM should flag this as a potential INTERNAL signal — not route them into B2B or B2C commercial workflows by default. |

### 4.2 White Label — Capability Signal, Not a Family Branch

White Label (**WL**) is a **capability/overlay** that sits on top of a lawful parent family.
When CRM encounters a prospect with White Label intent, the correct record structure is:

- **Family:** B2B or B2C (whichever applies)
- **Capability intent:** White Label overlay candidate

White Label does **not** replace the family field. A WL prospect still needs a family assignment.
Do not create a CRM record type called "White Label tenant" as a substitute for family identity.

### 4.3 Aggregator — Bounded Capability Signal, Not a Family Branch

Aggregator is a **bounded discovery and handoff mode** for B2B participants. When CRM encounters
a prospect with Aggregator intent, the correct record structure is:

- **Family:** B2B (Aggregator operates inside B2B context)
- **Capability intent:** Aggregator mode candidate

Aggregator does **not** replace the family field. Do not create a CRM record type called
"Aggregator tenant" as a family classification. CRM's Aggregator record is a capability flag, not
a separate family assignment.

### 4.4 Package / Plan — Separate Entitlement Signal, Not Family Identity

TexQtic's commercial packages (Free, Starter, Professional, Enterprise) are **entitlement and
feature-access labels** — not family or capability identity. CRM may record a provisional package
recommendation, but that recommendation:

- must be stored as a separate field from family, category, and capability
- must not override family or capability identity if they conflict
- is advisory until provisioning confirms it

### 4.5 The 6-Stage Provisioning Chain and Where CRM Sits

| Stage | Role | What may become canonical here |
|---|---|---|
| **Marketing intake** | Non-canonical interest capture | Nothing — all outputs are advisory signals |
| **CRM normalization and handoff** ← CRM is here | Pre-provisioning recommendation and routing | Nothing — all outputs remain recommendations until provisioning receives them |
| **Approved onboarding** | Eligibility confirmation | Eligibility state only |
| **Provisioning assignment** | First canonical persisted assignment boundary | Family, category, capability, package, and runtime identity become canonical here |
| **First-owner activation** | Activation consumer of provisioning truth | Activation continuity status only; no reclassification |
| **Active runtime** | Canonical persisted operating state | Live persisted truth; wins over all earlier language |

**The critical rule:** CRM operates at stage 2. Canonical truth is created at stage 4.
CRM's normalized values inform provisioning but do not substitute for it.
Provisioning will perform its own canonical assignment step. It does not inherit CRM records as-is.

---

## 5. B2B Taxonomy — What CRM Needs to Know

### 5.1 The Two Classification Axes

The B2B taxonomy has two axes:

**Axis 1 — Segment taxonomy**  
Each B2B participant holds one primary segment and may hold multiple secondary segments. Segments
classify the participant's position in the textile-industry production and service chain.

**Axis 2 — Role-position axis**  
Canonical values: **Manufacturer**, **Trader**, **Service Provider**  
This axis classifies how the participant commercially participates — not what they produce.

### 5.2 Canonical Segment Vocabulary

CRM records that capture segment intent must use the canonical segment names below. Do not
invent aliases or shorthand names for segments in CRM.

**Production and materials segments:**

| Segment name | Notes |
|---|---|
| Yarn | Spinning, yarn manufacturing, yarn trading |
| Weaving | Woven fabric production |
| Cotton | Cotton fiber and ginning |
| Man-made / Synthetic | Synthetic fiber, polyester, nylon, viscose, etc. |
| Technical / Industrial / Specialty | Performance textiles, geo-textiles, industrial fabric |
| Knitting | Knitted fabric and garment production |
| Fabric Processing | Bleaching, finishing, processing |
| Dyeing | Yarn and fabric dyeing |
| Printing | Conventional printing |
| Digital Printing | Digital/inkjet textile printing |
| Value Addition | Embroidery, embellishment, finishing value addition |
| Garment Manufacturing | Cut-and-sew, apparel manufacturing |
| Packaging | Textile-adjacent packaging production |
| Textile Chemicals and Auxiliaries | Chemical inputs, auxiliaries, dye intermediates |
| Machine Spare Parts / Mill-Gin Stores | Machinery parts, mill stores, ginning equipment |
| Textile Machine Suppliers | Machine manufacturers and equipment suppliers |

**Service-specialist segments:**

| Segment name | Notes |
|---|---|
| Manufacturing Services | Contract manufacturing, outsourced production services |
| Fashion Design | Apparel and fashion design services |
| Fabric Design | Textile surface and construction design |
| Technical Consulting | Textile engineering, process consulting |
| Business Consulting | Trade, operations, and supply-chain consulting |
| Testing Laboratories | Fiber, fabric, and product testing |
| Certification Agencies | Quality certification, compliance certification |
| Textile Software Providers | Technology platforms, ERP, PLM, industry software |

### 5.3 What CRM May Record About B2B Taxonomy

CRM may capture and record:

- **Likely primary segment** — based on the prospect's described area of business
- **Likely secondary segments** — if the prospect describes multi-segment activity
- **Likely role-position** — manufacturer, trader, or service provider
- **Aggregator discovery-mode relevance** — whether the prospect appears to be a candidate for
  the B2B discovery workspace (flag only; do not assign)

CRM must **not** record or expose:

- Internal administrative classification fields beyond segment and role-position
- Enterprise-depth organizational classification (that belongs to provisioning)
- Canonical runtime identity labels
- RFQ, order, trade, settlement, or compliance workflow ownership classification

### 5.4 Discovery-Safe Subset

When a prospect appears to be an Aggregator-mode candidate, CRM may capture:

- primary segment
- secondary segments
- role-position axis value (manufacturer, trader, or service provider)
- high-level service or production vocabulary matching the canonical segment list

CRM must not attempt to pre-classify the prospect's full B2B internal execution taxonomy, trade
workflow posture, or compliance posture on behalf of Aggregator mode. That determination is made
after provisioning, at runtime.

---

## 6. What CRM May Do

| Allowed CRM action | Guidance |
|---|---|
| Recommend likely family: B2B or B2C | Based on prospect's described commercial context |
| Flag potential INTERNAL signal | If prospect describes non-commercial internal-platform intent |
| Record White Label capability intent | As a separate capability field alongside the family recommendation — not as a family replacement |
| Record Aggregator mode relevance | As a capability flag — not as a family classification |
| Capture likely primary segment | Using canonical segment vocabulary (§5.2) |
| Capture likely secondary segments | Using canonical segment vocabulary |
| Capture likely role-position | Manufacturer, trader, or service provider — drawn from the canonical axis |
| Record provisional package recommendation | As a separate recommendation field; not as family or capability identity |
| Hand off normalized recommendations to provisioning | As structured recommendation inputs — explicitly labeled as recommendations, not canonical assignments |
| Route by canonical family posture | B2B prospects → B2B provisioning path; B2C prospects → B2C provisioning path; mixed signals → flag for review |

---

## 7. What CRM Must Not Do

### 7.1 Do Not Treat CRM-Normalized Values as Canonical Persisted Truth

CRM records are **recommendations**, not canonical classification events. A CRM record saying
"B2B Yarn Manufacturer" does not mean the tenant has been assigned a canonical segment or family.
That assignment happens at provisioning. CRM outputs must be labeled as recommendations when
handed to provisioning.

**Rule:** Never describe CRM classification outputs as "the tenant's segment" or "the tenant's
type." Use language like "recommended family," "likely segment," "provisional classification," or
"handoff posture."

---

### 7.2 Do Not Classify White Label or Aggregator as Separate Family Branches

**Incorrect CRM record pattern:**
> Family/Type: White Label  
> Sub-type: B2B

**Why it is wrong:** White Label is a capability overlay — not a base family. Storing WL as the
family value breaks the data model that provisioning will inherit. The correct structure keeps
family and capability as separate fields.

**Correct CRM record pattern:**
> Likely Family: B2B  
> Capability intent: White Label overlay candidate

---

### 7.3 Do Not Collapse Package/Plan Into Family Identity

**Incorrect CRM record pattern:**
> Tenant type: Enterprise  
> Notes: Large B2B manufacturer, assign to Enterprise track

**Why it is wrong:** "Enterprise" is a package/plan value — not a family or a routing track. Using
it as if it is a family-level classification collapses the two axes and causes downstream
provisioning confusion.

**Correct CRM record pattern:**
> Likely Family: B2B  
> Provisional package recommendation: Enterprise  
> Notes: Large manufacturer, multi-segment; recommend Enterprise plan at provisioning

---

### 7.4 Do Not Expose Full B2B Internal Execution Taxonomy in CRM

CRM may capture segment and role-position intent (§6). CRM must not attempt to pre-populate
internal B2B admin fields such as:

- detailed compliance posture
- RFQ workflow classification
- trade workflow type or settlement mode
- organizational hierarchy depth (enterprise-depth fields)

These fields belong to the provisioning and runtime layers. CRM cannot know them accurately in
advance, and attempting to pre-populate them introduces classification errors that provisioning
must then override.

---

### 7.5 Do Not Treat Provisioning as a Rubber-Stamp Step

**Incorrect workflow assumption:**
> "We've classified this prospect as a B2B Yarn Manufacturer on a Professional plan. Provisioning
> just needs to confirm and activate."

**Why it is wrong:** Provisioning is the **first canonical persisted assignment boundary**. It will
perform its own classification step using the CRM handoff as input — not as a completed
classification. Provisioning may confirm, revise, or augment the CRM recommendation before
creating canonical truth.

**Correct workflow assumption:**
> "We've prepared a normalized recommendation for this prospect: likely B2B, primary segment Yarn,
> role-position Manufacturer, provisional plan Professional. Handoff ready for provisioning review
> and canonical assignment."

---

### 7.6 Do Not Merge INTERNAL Into Commercial Family Records

If a prospect signals INTERNAL intent (non-commercial, platform-internal posture), do not default
them into the B2B or B2C flow. Flag the record as a potential INTERNAL candidate and route for
separate review. INTERNAL is not a commercial product family and should not enter the commercial
provisioning pipeline without explicit review.

---

## 8. Operational Examples — Correct vs. Incorrect CRM Record Patterns

| Scenario | Incorrect pattern | Correct pattern |
|---|---|---|
| B2B yarn manufacturer with WL interest | Type: White Label / Sub-type: B2B | Likely Family: B2B; Capability intent: White Label overlay; Likely segment: Yarn; Role: Manufacturer |
| B2B aggregator-mode candidate | Type: Aggregator | Likely Family: B2B; Capability intent: Aggregator mode; Likely segment(s): per discovery profile |
| Large B2B manufacturer, multiple segments | Type: Enterprise; Segments: multiple | Likely Family: B2B; Provisional plan: Enterprise; Primary segment: Garment Manufacturing; Secondary: Cotton, Dyeing |
| Service provider in testing and consulting | Type: Service Provider Platform | Likely Family: B2B; Role: Service Provider; Primary segment: Testing Laboratories; Secondary: Technical Consulting |
| Prospect signals consumer-commerce interest | Type: B2C WL | Likely Family: B2C; Capability intent: White Label overlay (if applicable) |
| Prospect signals internal tools interest | Type: Internal / Admin | Flag as potential INTERNAL; do not enter commercial provisioning pipeline without review |
| Provisional plan captured | Tenant type: Professional | Likely Family: B2B or B2C (whichever applies); Provisional package recommendation: Professional |

---

## 9. Boundary and Ownership Rules

| Boundary | Rule |
|---|---|
| CRM owns | Normalization, recommendation, routing, and handoff preparation |
| CRM does not own | Canonical family assignment, canonical package assignment, canonical segment assignment, canonical runtime identity |
| CRM handoff output | Must be explicitly labeled as "recommendation" or "provisional" — not as canonical truth |
| White Label in CRM | Must be stored as a capability intent field, separate from the family field |
| Aggregator in CRM | Must be stored as a capability flag, separate from the family field |
| Package/plan in CRM | Must be stored as a separate provisional recommendation — not as family or capability identity |
| Segment and role-position | May be captured as likely values using canonical vocabulary; must not be treated as canonical classification |
| Where CRM stops | At the handoff to provisioning. Canonical assignment is provisioning's responsibility. CRM does not follow the tenant into provisioning's classification step. |
| After provisioning assigns canonical truth | CRM's provisional values are superseded by provisioning's canonical record. CRM must not override or re-assert its earlier values once provisioning has assigned canonical truth. |

---

## 10. Practical Implementation Guidance

### CRM record structure

Structure CRM records so that each classification axis is a **separate field**:

| CRM field | What it captures | Allowed values |
|---|---|---|
| Likely Family | Probable commercial family | B2B, B2C |
| Non-commercial flag | INTERNAL signal | Yes / No |
| Capability intent | WL or Aggregator relevance | White Label, Aggregator, None, Both |
| Primary segment (B2B only) | Most likely primary segment | Canonical vocabulary (§5.2) |
| Secondary segments (B2B only) | Additional segments described by prospect | Canonical vocabulary |
| Role-position (B2B only) | Commercial participation mode | Manufacturer, Trader, Service Provider |
| Provisional plan | Package recommendation | Free, Starter, Professional, Enterprise |
| Handoff status | Where in provisioning chain | Draft, Ready for handoff, Provisioning received |

Never merge these fields into a single "tenant type" or "classification" field. The separation
is required for provisioning to receive the recommendation correctly.

### Normalization workflow

1. Receive Marketing intake signal
2. Normalize against canonical family model (B2B vs B2C vs INTERNAL flag)
3. Identify capability intent, if any (WL, Aggregator, neither, or both)
4. If B2B: capture likely segment(s) and role-position using canonical vocabulary
5. Capture provisional plan recommendation, if assessable
6. Verify that all axes are recorded separately
7. Label the record as a recommendation — not a canonical assignment
8. Prepare handoff package for provisioning

### Handoff to provisioning

When handing off a CRM record to provisioning, the handoff package should include:

- recommended family and any INTERNAL flag
- capability intent flags (WL, Aggregator)
- B2B segment and role-position recommendation (if applicable)
- provisional plan recommendation
- any signals that may affect eligibility review (e.g., organizational scale, described use case)
- explicit statement that all values are recommendations pending provisioning's canonical assignment

Do not include: speculative runtime identity labels, internal admin fields, or any language that
implies provisioning is inheriting CRM's classification as already-canonical.

### Language discipline

In CRM and in handoff communications, use this vocabulary:

| Use this | Not this |
|---|---|
| "Recommended family" | "Assigned family" / "Tenant type" |
| "Likely segment" | "Segment classification" / "Segment assignment" |
| "Provisional plan" | "Plan assigned" / "Plan determined" |
| "Capability intent" | "WL type" / "Aggregator family" |
| "Handoff recommendation" | "Final classification" / "Confirmed account type" |

---

## 11. Final Handoff Checklist

Before passing a CRM record to provisioning, apply this checklist:

- [ ] **Family field populated:** Is a likely family recorded (B2B or B2C)? Or is an INTERNAL flag
      noted if applicable?
- [ ] **Family separate from capability:** Is White Label or Aggregator intent stored in a
      capability field — not in the family field?
- [ ] **Package separate:** Is provisional plan recorded in its own field — not merged into family
      or capability?
- [ ] **Segment vocabulary correct:** If B2B, does the primary segment value match a name from
      the canonical list (§5.2)?
- [ ] **Role-position captured:** If B2B, is the role-position value one of: Manufacturer, Trader,
      or Service Provider?
- [ ] **No over-population of internal fields:** Are enterprise-depth, compliance posture, and
      workflow-type fields absent from this CRM record (those belong to provisioning/runtime)?
- [ ] **Recommendation language used:** Is the record explicitly labeled as recommendations —
      not as canonical assignments?
- [ ] **No rubber-stamp assumption:** Does the handoff package make clear that provisioning will
      perform its own canonical assignment step?
- [ ] **INTERNAL correctly flagged:** If the prospect signaled non-commercial intent, is the record
      flagged and not routed into the commercial provisioning pipeline?
- [ ] **Axes kept separate:** Are family, capability, package, segment, and role-position recorded
      as separate fields in the CRM record?

If all boxes are checked, the CRM record is correctly normalized and ready for provisioning handoff.

---

*Authority: April 13 / 14 / 18 TexQtic governance chain, readiness investigation dated 2026-04-20.*  
*Drafting slice: TAXONOMY_HANDOFF_WHITE_PAPER_SEPARATE_DRAFTING_SLICE*
