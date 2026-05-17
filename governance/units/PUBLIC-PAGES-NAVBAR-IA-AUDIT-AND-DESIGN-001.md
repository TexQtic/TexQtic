# PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001

## 1) Status Summary

### Why a unified public navigation IA is needed now
- Public attraction surfaces are now broad enough (Industry, B2B, B2C, Trust, Aggregator, Collections, dynamic detail surfaces) that repeated per-page header patterns create consistency risk.
- Current public pages largely use local Back + Sign in headers, plus page-body action clusters. This works functionally but does not yet provide a single, predictable IA across desktop/tablet/mobile.
- A unified IA is needed before implementing responsive navbar/hamburger behavior to avoid linking unimplemented pages (Page 11, Page 12) or overexposing dynamic detail routes as static top-level nav.

### Scope and mode
- This unit is design-only and governance-only.
- No runtime implementation, no routes, no component updates, no App.tsx edits, and no API/schema/OpenAPI changes are included.

### Sequencing relationship
- Public Attraction Layer: this document defines IA and responsive nav strategy only.
- Industry/B2C/D2C/Trust/Aggregator: this document aligns navigation treatment across existing public surfaces.
- Inquiry (Page 11) and Authenticated Handoff Patterns (Page 12): remain proposed and not implemented; this unit defines safe nav treatment without activating runtime links.

---

## 2) Current Public Route / State Inventory

Route and state evidence from App.tsx and public components:

### Primary public state model in App.tsx
- PUBLIC_ENTRY
- PUBLIC_B2B_DISCOVERY
- PUBLIC_B2C_BROWSE
- PUBLIC_AGGREGATOR
- PUBLIC_COLLECTIONS
- PUBLIC_COLLECTION_DETAIL_UNAVAILABLE
- PUBLIC_PRODUCT_DETAIL
- PUBLIC_PASSPORT
- PUBLIC_TRUST_LANDING
- PUBLIC_INDUSTRY_CLUSTER_LANDING
- PUBLIC_SUPPLIER_PROFILE
- PUBLIC_REFERRAL_LANDING

### Path resolution evidence
- /passport/:id -> PUBLIC_PASSPORT
- /trust -> PUBLIC_TRUST_LANDING
- /industries -> PUBLIC_INDUSTRY_CLUSTER_LANDING
- /aggregator -> PUBLIC_AGGREGATOR
- /supplier/:slug -> PUBLIC_SUPPLIER_PROFILE
- /product/:slug -> PUBLIC_PRODUCT_DETAIL
- /collections -> PUBLIC_COLLECTIONS
- /collections/:slug -> PUBLIC_COLLECTION_DETAIL_UNAVAILABLE
- /join/:referral_code -> PUBLIC_REFERRAL_LANDING
- / (or neutral entry when unauthenticated) -> PUBLIC_ENTRY

### Public component surfaces currently present
- B2BDiscoveryPage
- B2CBrowsePage
- PublicProductDetail
- PublicCollectionsStub
- PublicCollectionUnavailable
- PublicTrustLandingStub
- PublicPassport
- PublicIndustryClusterLanding
- PublicAggregatorPreview
- PublicSupplierProfile
- PublicReferralLanding

### Sign-in/request-access handoff patterns currently present
- Sign in CTAs are present across public pages.
- request-access/list-business/list-your-products links are present across multiple public surfaces.
- These are handoff actions, not private workflow exposure.

### Inquiry route check
- No PUBLIC_INQUIRY app state found.
- No /inquiry public route mapping found in App.tsx.
- Conclusion: Page 11 remains proposed/not implemented under current route/state truth.

---

## 3) The 12-Public-Page IA Model

The conceptual 12-page model below is recommended for navigation IA and sequencing.

1. Home / Public Entry
- Status: IMPLEMENTED (PUBLIC_ENTRY)
- Route/state: / (unauthenticated neutral entry)

2. B2B Network / Supplier Discovery
- Status: IMPLEMENTED (PUBLIC_B2B_DISCOVERY)
- Route/state: state-backed public discovery surface

3. Public Supplier Profile
- Status: IMPLEMENTED (PUBLIC_SUPPLIER_PROFILE)
- Route/state: /supplier/:slug

4. B2C Browse / Products
- Status: IMPLEMENTED (PUBLIC_B2C_BROWSE)
- Route/state: state-backed public product browse

5. Public Product Detail
- Status: IMPLEMENTED (PUBLIC_PRODUCT_DETAIL)
- Route/state: /product/:slug

6. Verified Textile Collections / D2C Collections Stub
- Status: IMPLEMENTED_STUB (PUBLIC_COLLECTIONS)
- Route/state: /collections

7. Collection Detail / Safe Unavailable Placeholder
- Status: IMPLEMENTED_SAFE_PLACEHOLDER (PUBLIC_COLLECTION_DETAIL_UNAVAILABLE)
- Route/state: /collections/:slug

8. Trust & Origin Passport Landing
- Status: IMPLEMENTED (PUBLIC_TRUST_LANDING)
- Route/state: /trust

9. Public Passport Detail
- Status: IMPLEMENTED (PUBLIC_PASSPORT)
- Route/state: /passport/:id

10. Aggregator Public Preview
- Status: IMPLEMENTED_STATIC_PREVIEW (PUBLIC_AGGREGATOR)
- Route/state: /aggregator

11. Public Inquiry / Intent Capture
- Status: PROPOSED_NOT_IMPLEMENTED
- Route/state: no public route/state mapping found

12. Authenticated Handoff Patterns
- Status: CONCEPT_IMPLEMENTED_AS_CTAS_BUT_NOT_STANDALONE_PAGE
- Route/state: no standalone public route/state; handoff behavior exists as page-level actions/sign-in/request-access pathways

### Repo-truth delta note
- Additional implemented public state exists: PUBLIC_REFERRAL_LANDING (/join/:referral_code).
- Recommendation: treat referral landing as a contextual campaign/entry route, not a primary global navbar destination.

---

## 4) Navbar Inclusion Rules

### Primary navbar links (top-level)
- Home
- B2B Network
- Products
- Collections (stub-safe)
- Trust & Origin
- Aggregator Preview

### Grouped/dropdown links
- Explore (optional grouping pattern on desktop/tablet):
  - B2B Network
  - Products
  - Collections
  - Industry & Clusters
- Trust (optional grouping):
  - Trust & Origin (landing)
  - Passport (contextual explanation only; not a directory link)

### Contextual-only links (not static top-level)
- Supplier Profile (/supplier/:slug) -> contextual from B2B cards/results
- Product Detail (/product/:slug) -> contextual from product cards/search
- Collection Detail unavailable (/collections/:slug) -> contextual fallback only
- Passport Detail (/passport/:id) -> direct-link/QR/contextual only
- Referral Landing (/join/:referral_code) -> campaign/contextual only

### Proposed/future links
- Inquiry (Page 11) -> disabled/coming-soon or omitted
- Handoff Patterns (Page 12) -> not shown as a standalone public page link

### Auth-only and handoff actions
- Keep Sign in as prominent nav action.
- Keep Request Access/List Your Business as secondary CTA.
- Do not surface private workflow links (orders, RFQ workspace, negotiations, intelligence dashboards) in public nav.

---

## 5) Recommended Desktop Navbar Design

### Layout
- Left: TexQtic brand/logo (home/public entry).
- Center: primary links (or grouped menus).
- Right: CTA cluster (Sign in primary, Request Access secondary).

### Suggested desktop IA
- Home
- Explore (dropdown): B2B Network, Products, Collections, Industry & Clusters
- Trust & Origin
- Aggregator Preview
- Sign in (primary action)
- Request Access / List Your Business (secondary)

### Active state behavior
- Highlight active top-level route/group.
- Dynamic detail pages should map active state to their parent section:
  - /product/:slug -> Products
  - /supplier/:slug -> B2B Network
  - /passport/:id -> Trust & Origin
  - /collections/:slug -> Collections
  - /join/:code -> Home (or no global highlight)

### Back/continuity behavior
- Preserve existing in-page Back actions on detail pages during initial navbar rollout.
- Avoid replacing contextual back paths with brittle static nav assumptions.

---

## 6) Recommended Tablet Navbar Design

### Breakpoint assumptions
- Tablet range: approximately 768px-1024px viewport width.

### Behavior
- Keep logo + condensed nav + Sign in visible.
- Collapse secondary links into overflow/menu:
  - Keep 3-4 highest-priority discovery links visible.
  - Move lower-priority links (Industry/Collections/Aggregator) into an overflow menu if needed.

### CTA treatment
- Sign in remains visible in header.
- Request Access can move into overflow menu if space-constrained.

### UX constraints
- Maintain touch targets >= 44px height.
- Prevent wrapping multi-row nav headers.
- Keep one predictable interaction model (do not mix hidden links with inaccessible hover-only dropdowns).

---

## 7) Recommended Mobile Hamburger Design

### Trigger and container
- Use single hamburger trigger in top-right header.
- Prefer slide-over drawer from right for clarity and focus control.

### Menu grouping
- Group 1: Discover
  - Home
  - B2B Network
  - Products
  - Collections
  - Industry & Clusters
- Group 2: Trust
  - Trust & Origin
  - Aggregator Preview
- Group 3: Continue
  - Sign in (primary)
  - Request Access / List Your Business

### Interaction behavior
- Drawer closes on:
  - explicit close button
  - backdrop click
  - Escape key
  - selecting a nav destination
- Body scroll lock while drawer open.

### Accessibility requirements
- Hamburger button: aria-expanded, aria-controls
- Drawer: keyboard navigable, clear heading/landmark
- Focus trap while drawer is open
- Focus return to hamburger trigger on close
- Visible focus states for all controls
- Minimum touch targets >= 44px

### Page 11/Page 12 in mobile menu
- Page 11 Inquiry: optional disabled row with “Coming soon” label, or omit entirely.
- Page 12 Handoff patterns: do not expose as a standalone row; keep as behavior through Sign in and contextual CTAs.

---

## 8) Public / Private Boundary

### Allowed public nav/content
- Public discovery links (Home, B2B, Products, Collections stub, Industry, Trust, Aggregator preview)
- Public-safe trust/origin links
- Sign-in and request-access handoff actions
- Optional proposed labels for Page 11/Page 12 only if clearly disabled/non-routed

### Forbidden public nav/content
- Private tenant/org/user/internal identifiers
- Private supplier records or documents
- Buyer intent/RFQ private payloads
- Private contacts
- Rankings/scores/recommendations
- AI/vector outputs
- Aggregator intelligence internals
- Checkout/cart/wishlist/order workflow links
- Active links to unimplemented private workflows
- Universal DPP/passport/trust coverage claims

---

## 9) Page 11 and Page 12 Treatment

## Page 11: Public Inquiry / Intent Capture
- Current repo truth:
  - No public inquiry route/state found in App.tsx.
- Should it appear in nav now:
  - No active link.
- Recommended treatment now:
  - Omit from primary nav.
  - Optional disabled “Inquiry (coming soon)” in informational/footer/hamburger section only.
- Prerequisite unit before activation:
  - Dedicated inquiry route/UX governance + schema-bound context design unit.
- Risk if linked early:
  - Broken link or premature intent-capture surface.
  - Potential boundary violations if inquiry payload scope is undefined.

## Page 12: Authenticated Handoff Patterns
- Current repo truth:
  - Handoff exists as action pattern (Sign in, request access), not a standalone public page.
- Should it appear in nav now:
  - No standalone nav link.
- Recommended treatment now:
  - Keep as CTA/action semantics in right-side nav and drawer CTA area.
- Prerequisite unit before activation (if a page is desired):
  - Dedicated handoff page/state design and route decision unit.
- Risk if linked early:
  - Navigation confusion and possible leakage of private workflow expectations in public IA.

---

## 10) Cross-Family Dependencies

### Industry / Cluster tracker + taxonomy
- Nav wording and grouping must reuse approved taxonomy terms.
- Industry link should stay discovery-oriented, not directory/ranking-oriented.

### B2C tracker
- Products as primary nav entry.
- Product detail remains contextual child route.

### D2C tracker
- Collections remains stub-safe in nav until D2C semantic/runtime decisions mature.
- Collection detail remains safe unavailable/contextual.

### DPP / trust conditionality
- Trust and passport labels must remain conditional and evidence-safe.
- No passport directory implication from global nav.

### Future inquiry and handoff design
- Page 11 and Page 12 cannot be promoted to active nav routes until their own units are approved and implemented.

### SEO/canonical strategy
- Final nav IA should later align with canonical route/SEO decisions for stable indexing and breadcrumb consistency.

---

## 11) Recommended Implementation Plan

### Proposed implementation unit ID
- PUBLIC-PAGES-NAVBAR-RESPONSIVE-IMPLEMENTATION-001

### Proposed implementation scope (not executed here)
- Build shared public navbar component(s) and wire to public pages/states.
- Implement desktop/tablet/mobile responsive behavior.
- Maintain existing boundary-safe CTA/handoff semantics.

### Likely file allowlist for follow-up implementation unit
- App.tsx
- components/Public/B2BDiscovery.tsx
- components/Public/B2CBrowse.tsx
- components/Public/PublicProductDetail.tsx
- components/Public/PublicCollectionsStub.tsx
- components/Public/PublicCollectionUnavailable.tsx
- components/Public/PublicTrustLandingStub.tsx
- components/Public/PublicPassport.tsx
- components/Public/PublicIndustryClusterLanding.tsx
- components/Public/PublicAggregatorPreview.tsx
- components/Public/PublicSupplierProfile.tsx
- components/Public/PublicReferralLanding.tsx
- components/shared/* (if new shared navbar component is created)

### Component extraction strategy
- Extract shared public header/nav shell to avoid repeating Back + Sign in patterns.
- Keep page-level hero/content/CTA logic local.
- Provide props for active section + contextual back behavior.

### Accessibility checklist for implementation unit
- Keyboard-operable menu and dropdown/drawer controls
- aria-expanded, aria-controls on hamburger
- focus trap and focus return for mobile drawer
- visible focus states
- touch target sizing >= 44px

### Verification checklist for implementation unit
- Desktop nav consistency across all implemented public pages
- Tablet collapse behavior consistency
- Mobile drawer/hamburger behavior and accessibility
- Active-section mapping for dynamic detail routes
- No active link to Page 11/Page 12 unless explicitly implemented
- No boundary leakage into private workflows

### Production verification checklist for implementation unit
- /, /industries, /trust, /aggregator, /collections
- /product/:slug valid + invalid
- /supplier/:slug valid + invalid
- /passport/:id valid + invalid
- /join/:referral_code
- Mobile and tablet rendering checks
- Public/private boundary checks

### Suggested commit message for follow-up unit
- [TEXQTIC] public: implement responsive public navbar IA

---

## 12) Risks and Non-Goals

### Risks
- Nav overload from adding too many top-level links.
- Activating links for unimplemented pages (Page 11, Page 12).
- Accidentally treating dynamic detail routes as static global destinations.
- Inconsistent active-state mapping across route-backed and state-backed pages.
- Scope creep into inquiry/handoff implementation.

### Non-goals for this unit
- No runtime navbar code.
- No route creation.
- No Page 11 implementation.
- No Page 12 implementation.
- No SEO implementation.
- No inquiry implementation.
- No authenticated private workflow exposure.

---

## 13) Acceptance Criteria

This design is complete only if all are true:
- Current public route/state inventory is recorded.
- 12-page IA model is defined.
- Each page is classified (primary/dropdown/contextual/future/hidden).
- Desktop navbar design is specified.
- Tablet behavior is specified.
- Mobile hamburger behavior is specified.
- Page 11 and Page 12 treatment is explicit.
- Public/private boundary is explicit.
- Follow-up implementation unit is proposed.
- No runtime implementation is included.

Status for this unit:
- Complete as design artifact.

---

## 14) Next Recommended Unit

### Recommendation
- Proceed next with PUBLIC-PAGES-NAVBAR-RESPONSIVE-IMPLEMENTATION-001.

### Why
- The IA and responsive strategy are now defined and implementation-ready.
- This enables consistent navigation continuity across existing implemented public surfaces.
- D2C-COLLECTIONS-STUB-BASELINE-SYNC-001 remains valid, but navbar consistency is a cross-family UX foundation that improves all public routes immediately once implemented.

### Sequencing note
- If product strategy prioritizes D2C messaging before nav consistency, D2C-COLLECTIONS-STUB-BASELINE-SYNC-001 can run first.
- From UX system perspective, responsive navbar implementation is now unblocked and recommended as immediate next execution.
