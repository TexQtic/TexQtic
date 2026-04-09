> CLEANUP NOTE — RECONCILED LAUNCH-SCOPE OVERLAY RECORD
>
> This artifact is preserved as the 2026-03-30 launch-scope decision baseline inside the launch
> overlay. It is not the sole current scope or sequencing authority after the post-reset authority
> realignment.
>
> For current onboarding-family consumer reading specifically, use:
>
> - the live opening-layer canon in `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md` and `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`
> - `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-PLANNING-RECONCILIATION-2026-04-09.md`
> - `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md`
> - `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-CONSUMER-GUIDANCE-RECONCILIATION-2026-04-09.md`
> - `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md` as bounded onboarding-family reading note only
> - `docs/product-truth/TEXQTIC-LAUNCH-FAMILY-CHAIN-BASELINE-AND-SEQUENCING-FRICTION-v1.md` as preserved context and sequencing-friction input only
>
> The old `-v2` chain remains historical evidence and must not be read as current onboarding-family authority.
>
> This historical scope record does not imply whole-family completion, deferred remainder closure, or broader current onboarding-family authority.
>
> This banner narrows onboarding-family reading only. The historical scope record below is preserved.

# TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1

## Status

- Mode: `PRODUCT-TRUTH / SCOPE-LOCK ONLY`
- Authority posture: `REPO-REALITY-FIRST`
- Creation date: `2026-03-30`
- File purpose: preserved launch-scope decision record for the then-current retained launch families

## 1. Purpose

This document records the launch-owner scope decision that followed from then-current repo truth and
from the launch-readiness requirements register.

It answers one bounded question:

- which product families are explicitly retained in TexQtic launch scope, and what truthful
  readiness posture applies to each family

This is a scope-lock artifact, not an implementation authorization.

It does not open governed units, does not overrule Layer 0, and does not convert design-gated or
partial families into implementation-complete posture by declaration alone.

## 2. Authority Order

This decision record is derived in the following authority order:

1. Layer 0 governance posture in `governance/control/OPEN-SET.md`
2. Active product-truth planning stack in:
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
3. The read-only planning input:
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
4. Current runtime truth already inspected in frontend, backend, service, contract, and schema
   surfaces during the preceding launch-readiness pass

Important constraint:

- the existing launch-readiness file is approved context for this task and remains read-only here

## 3. Explicit Launch-Owner Decisions

The launch owner has explicitly decided that the following families are `IN_SCOPE` for launch and
must not be silently deferred out of day-1 planning:

1. `B2B`
2. `B2C`
3. `Aggregator`
4. `Super admin / platform admin control centers`
5. `Subscription / commercial packaging`

This record therefore does not ask whether those families should be removed from launch scope.

It classifies them instead into truthful readiness postures:

- `DAY_1_ANCHOR`: materially credible now and suitable as a launch anchor in bounded form
- `PRE_LAUNCH_REQUIRED`: kept in scope and must be normalized or completed before launch can be
  claimed truthfully
- `PRE_LAUNCH_DESIGN_GATE`: kept in scope, but still requires bounded target-state definition before
  implementation readiness can be claimed
- `BOUNDED_DAY_1_ONLY`: kept in scope, but only on the materially evidenced subset of the promise

## 4. Decision Summary

The governing launch-scope decision is:

- TexQtic launch is not a B2B-only launch anymore at the scope-decision level.
- TexQtic launch scope now explicitly retains B2B, B2C, Aggregator, Super admin/platform admin,
  and Subscription/commercial packaging.
- Retained in scope does not mean equally ready now.
- The truthful launch posture is mixed:
  - B2B is the current day-1 anchor.
  - B2C is retained in scope but requires pre-launch continuity normalization.
  - Aggregator is retained in scope but remains pre-launch design-gated.
  - Super admin/platform admin is retained in scope in bounded form, with tenant deep-dive and
    broader admin authority still requiring explicit bounding.
  - Subscription/commercial packaging is retained in scope but requires pre-launch normalization of
    plan vocabulary, selection posture, and commercial truth.

## 5. Launch-Scope Decision Table

| Family | Launch Scope Decision | Truthful Current Posture | Required Launch Posture | Decision Class | Launch Statement Allowed Now | Launch Statement Not Allowed Now |
| --- | --- | --- | --- | --- | --- | --- |
| `B2B core` | `IN_SCOPE` | Strongest materially evidenced operating loop in current repo truth | Preserve as the primary day-1 anchor | `DAY_1_ANCHOR` | TexQtic supports a bounded B2B tenant commerce and exchange loop now | TexQtic has uniform completeness across all modes |
| `B2C storefront` | `IN_SCOPE` | Routed and visible, but browse-entry continuity is still partly decorative | Repair primary browse-entry continuity before launch claim | `PRE_LAUNCH_REQUIRED` | TexQtic has a real B2C surface in scope that must be normalized before launch | TexQtic already has a fully truthful public retail launch path |
| `Aggregator mode` | `IN_SCOPE` | Named and routable, but still under-defined and largely promotional/discovery-oriented | Define exact bounded operating model before implementation-ready posture | `PRE_LAUNCH_DESIGN_GATE` | Aggregator is retained as a launch family and must be deliberately defined | Aggregator is already launch-ready because a shell exists |
| `Super admin / platform admin control centers` | `IN_SCOPE` | Platform casework and oversight are materially real; tenant deep-dive and broader admin authority remain mixed | Launch only on the materially evidenced operator subset, with thin/fake-complete areas bounded explicitly | `BOUNDED_DAY_1_ONLY` | TexQtic has materially real platform supervision and control-center capability in bounded form | TexQtic already has uniformly deep tenant-ops and admin-authority completeness |
| `Subscription / commercial packaging` | `IN_SCOPE` | Plan fields and AI budgets exist, but commercial vocabulary and entitlement truth are mixed | Normalize commercial truth before launch claims rely on packaging | `PRE_LAUNCH_REQUIRED` | TexQtic has commercial/package surfaces in scope that must be reconciled before launch | TexQtic already has one canonical launch-grade subscription and entitlement model |

## 6. Family-by-Family Decision Record

## 6.1 B2B

### B2B Decision

`B2B` is locked `IN_SCOPE` as the primary launch anchor.

### B2B Basis

- Current repo truth materially evidences tenant discovery, tenant login/bootstrap, catalog, cart,
  checkout, orders, RFQ entry, supplier response, trades, escrow, and settlement continuity.
- The launch-readiness register already identified B2B as the strongest current launchable loop.
- The active product-facing delivery unit still sits inside the exchange family rather than inside a
  missing B2B foundation.

### B2B Posture

- `DAY_1_ANCHOR`

### B2B Scope Boundary

- This decision anchors launch on bounded B2B tenant-commerce and exchange continuity.
- It does not imply a broad public B2B marketplace promise.
- It does not imply that every adjacent workflow outside the bounded B2B core is equally complete.

## 6.2 B2C

### B2C Decision

`B2C` is locked `IN_SCOPE` and may not be silently deferred.

### B2C Basis

- Repo truth shows a real B2C shell and a visible browse/catalog posture.
- The active planning stack still records `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` as a valid
  later-ready continuity family rather than as noise.
- The launch-readiness register confirmed that key browse-entry affordances remain decorative in the
  reviewed path.

### B2C Posture

- `PRE_LAUNCH_REQUIRED`

### B2C Required Pre-Launch Outcome

- The primary B2C browse-entry path must become materially truthful.
- Launch cannot rely on decorative `Shop Now` / `See All` behavior while keeping B2C in scope.

### B2C Scope Boundary

- This is not a decision to widen into broad B2C strategy, merchandising redesign, or generalized
  public-marketplace ambitions.
- It is a decision that the bounded B2C surface must become truthful enough to support inclusion in
  the launch claim.

## 6.3 Aggregator

### Aggregator Decision

`Aggregator` is locked `IN_SCOPE` and may not be silently deferred, but it remains a design-gated
launch family.

### Aggregator Basis

- The active planning stack preserves `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` as a design-gate
  family.
- Repo truth still shows a named/routable mode whose operating model is materially thinner than its
  declared mode presence.
- The launch-readiness register confirmed that current runtime is still largely promotional,
  discovery-oriented, or under-defined.

### Aggregator Posture

- `PRE_LAUNCH_DESIGN_GATE`

### Aggregator Required Pre-Launch Outcome

- TexQtic must define the exact bounded aggregator operating model that is actually being launched.
- That definition must then be reconciled against current runtime truth before any launch claim is
  made.

### Aggregator Scope Boundary

- Keeping Aggregator in scope is not authorization to treat it as implementation-ready now.
- It remains design-gated until its bounded target state is explicit.

## 6.4 Super Admin / Platform Admin Control Centers

### Platform Admin Decision

`Super admin / platform admin control centers` are locked `IN_SCOPE` for launch, but only on the
materially evidenced subset of the operator promise.

### Platform Admin Basis

- Repo truth materially evidences platform supervision surfaces such as compliance, disputes,
  finance oversight, audit/event visibility, maker-checker, traceability, settlement, escrow, and
  system health.
- The launch-readiness register also identified a real weakness: `TenantDetails` still overstates
  tenant deep-dive depth in places and broader admin authority remains partly design-gated through
  `TECS-FBW-ADMINRBAC`.

### Platform Admin Posture

- `BOUNDED_DAY_1_ONLY`

### Platform Admin Required Pre-Launch Outcome

- Launch materials and internal operating assumptions must be bounded to the materially evidenced
  casework/oversight/control-center subset.
- Thin or fake-complete tenant deep-dive areas must either be repaired or clearly excluded from the
  launch promise.
- Broader admin-authority claims must not outrun current bounded runtime truth.

### Platform Admin Scope Boundary

- This is not a broad admin redesign decision.
- It is a bounded decision to keep platform operations in launch scope on truthful operator terms.

## 6.5 Subscription / Commercial Packaging

### Subscription Decision

`Subscription / commercial packaging` is locked `IN_SCOPE` and may not be treated as an optional
later-only family.

### Subscription Basis

- Repo truth evidences plan persistence, plan display, plan normalization logic, and materially real
  AI budget controls.
- Repo truth does not yet evidence one canonical plan vocabulary or broad entitlement enforcement.
- The launch-readiness register identified this as a launch-truth normalization problem rather than
  only a billing implementation gap.

### Subscription Posture

- `PRE_LAUNCH_REQUIRED`

### Subscription Required Pre-Launch Outcome

- TexQtic must reconcile canonical plan naming across DB, backend, and frontend runtime.
- TexQtic must decide and document the real launch posture for plan selection, commercial packaging,
  and any claimed entitlement gating.
- Launch claims must not rely on package completeness that current runtime does not actually enforce.

### Subscription Scope Boundary

- This decision does not require fully automated billing or a fully mature monetization platform.
- It does require one truthful commercial model for launch.

## 7. Cross-Family Implications

Locking these families in scope changes the launch posture in five important ways.

1. Launch messaging must become multi-family and differentiated.
   One global “launch-ready” label is no longer precise enough. TexQtic now needs a launch claim
   that distinguishes the B2B anchor from B2C normalization, Aggregator design-gate work,
   bounded platform operations, and subscription normalization.

2. Aggregator cannot be omitted from planning anymore.
   It remains design-gated, but it is now a required pre-launch scope-truth decision rather than a
   deferrable later-mode.

3. B2C cannot remain cosmetically present.
   Because B2C is kept in launch scope, decorative browse-entry continuity is now a real pre-launch
   obligation rather than a later improvement.

4. Platform-ops truth must be bounded explicitly.
   Launch can rely on the materially real control-center stack, but not on fake-complete tenant
   deep-dive depth or broad admin-authority claims that current Layer 0 still treats carefully.

5. Commercial truth must be normalized before launch language uses it.
   Plan/package presence in the repo is not enough. Launch now needs one coherent commercial story.

## 8. Explicit Non-Decisions

This record does not make the following claims:

- it does not declare all retained families equally implementation-ready now
- it does not reopen or replace the current active delivery unit
- it does not collapse Aggregator or broader RFQ family boundaries out of design-gate posture
- it does not convert thin tenant deep-dive admin surfaces into completed reality by declaration
- it does not authorize broad admin redesign, B2C strategy redesign, or aggregator implementation
  work without separate bounded planning/opening moves

## 9. Required Follow-On Planning Artifacts

Because the families above are now explicitly retained in launch scope, the following planning
artifacts become required rather than optional.

1. `B2C launch continuity note`
   Bound the minimum truthful browse-entry and public-facing B2C continuity required for launch.

2. `Aggregator operating model design-gate artifact`
   Define the exact bounded operating model that launch is actually retaining.

3. `Subscription / entitlement normalization note`
   Reconcile plan vocabulary, selection posture, commercial packaging truth, and any claimed
   entitlements.

4. `Platform-ops launch boundary note`
   State exactly which super-admin/platform-admin surfaces are part of the launch promise and which
   tenant deep-dive or broader admin-authority areas remain out of that promise.

These are planning requirements, not implementation authorization.

## 10. Final Decision Statement

The final launch-scope decision for this record is:

- `B2B` stays in launch scope as the primary day-1 anchor.
- `B2C` stays in launch scope and must be normalized before launch.
- `Aggregator` stays in launch scope and must pass a bounded design gate before launch.
- `Super admin / platform admin control centers` stay in launch scope in bounded form.
- `Subscription / commercial packaging` stays in launch scope and must be normalized before launch.

TexQtic launch is therefore a mixed-posture launch program, not a single-readiness launch claim.

## 11. Completion Checklist

- [x] Layer 0 posture rechecked
- [x] Active `-v2` product-truth stack rechecked
- [x] Existing launch-readiness register treated as read-only input
- [x] Explicit launch-owner inclusions recorded
- [x] No retained family silently deferred
- [x] Each retained family classified by truthful current posture
- [x] Scope lock separated from implementation authorization
- [x] No runtime/schema/governance files modified beyond allowlist
