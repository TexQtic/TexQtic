# TEXQTIC-AUTH-ENTRY-BRANDING-ALIGNMENT-PLAN-v1

**Unit ID:** AUTH-ENTRY-BRANDING-ALIGNMENT-PLAN-001  
**Type:** INVESTIGATION + PLANNING — UI branding alignment  
**Mode:** PLANNING ONLY — no implementation in this artifact  
**Authored:** 2026-04-23  
**Status:** PLANNING COMPLETE — ready for bounded implementation slice  
**Slice name:** `AUTH_ENTRY_BRANDING_ALIGNMENT_IMPLEMENTATION_SLICE`

---

## 1. Purpose

Document the current visual/branding gap between the public-facing entry pages and the
`AUTH` case (Tenant Access / Staff Control Plane login surface), and produce a bounded
implementation plan to align them so TexQtic presents one coherent brand experience at
all entry surfaces.

This artifact covers investigation findings and implementation plan only.
No runtime, schema, Layer 0, or logo asset files were changed.

---

## 2. Repo-Truth Basis

Layer 0 files read:
- `governance/control/OPEN-SET.md` — ZERO_OPEN_DECISION_CONTROL; no active product unit
- `governance/control/NEXT-ACTION.md` — last closed unit: `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE` VERIFIED_COMPLETE
- `governance/control/BLOCKED.md` — no live product blocker; White Label Co REVIEW-UNKNOWN (see §7)
- `governance/control/DOCTRINE.md` — v1.13; D-016 decision control active
- `docs/governance/control/GOV-OS-001-DESIGN.md` — CLOSED design; live routing governed by opening-layer canon

Public-page surfaces audited:
- `App.tsx` — `case 'PUBLIC_ENTRY'` (lines 4560+)
- `App.tsx` — `case 'AUTH'` (lines 5155+)
- `App.tsx` — `case 'CONTROL_PLANE'` (lines 5300+)
- `components/Public/B2BDiscovery.tsx`
- `components/Public/B2CBrowse.tsx`
- `components/Auth/AuthFlows.tsx`
- `layouts/SuperAdminShell.tsx`
- `index.css`

Logo assets confirmed in `/public/brand/`:
- `texqtic-logo.png` — full logo (currently in active use on public pages)
- `texqtic logo small.png.jpeg` — small logo (unusual extension; see §5)

Working tree pre-existing modifications (unrelated to this slice):
- `App.tsx` — pre-existing modification (NOT introduced by this planning pass)
- `services/catalogService.ts` — pre-existing modification
- `shared/contracts/openapi.tenant.json` — pre-existing modification

These three files are not staged in this commit. They predate this slice and are not
related to auth entry branding alignment.

---

## 3. UI Difference Audit — A. Current Gap

### 3.1 Public entry pages (PUBLIC_ENTRY / B2BDiscovery / B2CBrowse) — Brand baseline

| Dimension | Implementation |
|---|---|
| Page background | `#f3f8fb` — light aqua-tinted white; brand-distinctive |
| Hero section | `#071a2f` — deep navy dark block with teal accent text |
| Primary accent colors | `#7fd5de` (teal), `#2f8094` (muted teal/blue), `#0a2036` (deep navy) |
| Button shape | `rounded-full` pill — consistent across all CTAs |
| Primary CTA button | `bg-[#071a2f] text-white` — deep navy, pill |
| Card shape | `rounded-[28px]` to `rounded-[32px]` — large radius |
| Card border | `border-[#d9e5ea]` — muted aqua-tinted |
| Card shadow | `shadow-[0_8px_28px_rgba(7,26,47,0.07)]` — soft, brand-tuned |
| Typography labels | `text-[11px] font-bold uppercase tracking-[0.22em–0.34em]` |
| Logo | `/brand/texqtic-logo.png` — `h-10` to `h-14`; centered in nav bar |
| Font family | `font-sans` (Inter) body; `.public-entry-editorial-heading` (serif) for H1 |
| Top stripe | None — no color stripe on page |
| Identity treatment | Full logo image in header; no emoji |

### 3.2 AUTH case — current state (Tenant Access / Staff Control Plane entry)

| Dimension | Implementation | Gap? |
|---|---|---|
| Page background | `bg-slate-50` — generic plain light gray | **YES — no brand tone** |
| Logo presence | **None** — header uses emoji only: `🚀 TexQtic` / `🛡️ TexQtic Admin` | **YES — brand absent** |
| Button shape (submit) | `rounded-xl` — close to square | **YES — should be pill** |
| Button shape (realm switcher) | `rounded-full` pill — correct | No gap |
| Realm accent colors | `bg-indigo-600` (tenant) / `bg-rose-600` (admin) — generic Tailwind | **YES — not brand palette** |
| Input focus ring | `focus:ring-indigo-500` — generic Tailwind | **YES — not brand palette** |
| Card shape | `rounded-3xl` (`rounded-[24px]` equiv.) — slightly close | Minor gap vs `rounded-[32px]` |
| Card border | `border-slate-200` — generic | **YES — should be `border-[#d9e5ea]`** |
| Card shadow | `shadow-2xl` — aggressive, not brand-tuned | **YES — public cards use soft `shadow-[0_18px_50px_...]`** |
| Top stripe | `h-2 bg-indigo-600` (or rose) — functional role signal | **PARTIAL — colors not brand; stripe concept may be kept** |
| TENANT_RESOLVING state | `bg-slate-50` + spinner, no logo | **YES — no brand** |
| TENANT_BLOCKED state | `bg-slate-50` + amber border card, no logo | **YES — no brand** |
| Font family | `font-sans` | No gap |

### 3.3 CONTROL_PLANE case — SuperAdminShell active state (after authentication)

| Dimension | Implementation | Gap? |
|---|---|---|
| Shell background | `bg-slate-950` — intentional dark mode | **NO GAP — correct for governance surface** |
| Header | `bg-slate-900/50` + "Control Plane" rose badge + emoji `🛡️ TexQtic` | Cosmetic (no logo) |
| Sidebar | `bg-slate-900/30` | Appropriate dark treatment |
| Content area | `bg-[#020617]` — very dark | Appropriate |
| Logo in shell header | None — emoji only | Minor cosmetic; see §5 |

**Note:** The SuperAdminShell is the post-authentication active shell, not an entry surface.
Its dark treatment is intentional and appropriate for a governance/control surface.
It is **not the primary branding concern** for this planning slice, but the shell header
logo is noted as a minor follow-on item.

### 3.4 Material vs. Cosmetic Gap Classification

**Materially harmful to brand continuity (high priority):**
1. No TexQtic logo at auth entry → brand is completely absent at the sign-in moment
2. `bg-slate-50` generic gray background → entry surface has no visual connection to product
3. Submit button `rounded-xl` vs. `rounded-full` pill → inconsistent with brand CTA pattern
4. `indigo-600` tenant accent → generic color that does not reflect TexQtic brand palette

**Cosmetic / lower priority:**
5. `border-slate-200` on auth card vs. `border-[#d9e5ea]` on public cards
6. `shadow-2xl` vs. brand-tuned soft shadow
7. `h-2` top stripe color (functional role-signal; can remain in realm-distinct colors)
8. No logo in SuperAdminShell header (post-auth shell; not auth entry surface)

---

## 4. Boundary-Safe Alignment Analysis — B. Surface Classification

### 4.1 What can be safely aligned

The following dimensions of the AUTH case are **pure branding/presentation** — they can be
aligned to the public-page visual language without blurring platform-role boundaries,
because they do not change the functional semantics of login, realm selection, or
credential submission:

| Element | Proposed alignment | Safety rationale |
|---|---|---|
| Page background | `bg-[#f3f8fb]` (brand aqua-tinted white) | Pure visual tone; no functional meaning |
| Auth card border | `border-[#d9e5ea]` | Pure visual tone |
| Auth card shadow | `shadow-[0_18px_50px_rgba(7,26,47,0.06)]` | Pure visual tone |
| Auth form submit button shape | `rounded-full` pill | Shape has no auth semantics |
| Tenant realm accent | `#071a2f` + `#2f8094` (brand navy/teal) | Color only; tenant vs. admin distinction preserved by label text |
| Input focus ring | `focus:ring-[#2f8094]` or `focus:ring-[#071a2f]` | Color only; no functional change |
| AuthForm header identity | Replace emoji with `<img src="/brand/texqtic-logo.png" .../>` | Logo replaces emoji; does not change auth logic |
| TENANT_RESOLVING / TENANT_BLOCKED backgrounds | `bg-[#f3f8fb]` | Background only; state machine unchanged |

### 4.2 What the realm switcher must preserve

The **realm switcher** (Tenant Access vs. Staff Control Plane pill buttons) carries explicit
identity information. It must remain visually distinct between the two realms:

- Tenant Access → brand navy (`#071a2f`) or teal (`#2f8094`) active state
- Staff Control Plane → `rose-600` or equivalent high-signal color active state

**Rationale:** The rose/red signal for Staff Control Plane is a governance-level affordance.
It communicates "elevated authority / governance surface" to the user. Normalizing it to the
same navy/teal as Tenant Access would blur the role/realm distinction — which is a forbidden
outcome. Rose on Staff Control Plane should be preserved.

### 4.3 What must NOT be aligned (preserved for role/surface distinction)

| Element | Must-not-change reason |
|---|---|
| Staff Control Plane realm switcher accent color (rose) | Governance surface identity signal; must remain distinct from tenant |
| `h-2 bg-rose-600` top stripe on admin auth form | Control-plane seriousness signal |
| SuperAdminShell dark treatment (`bg-slate-950`) | Intentional governance-surface visual language |
| Auth routing logic, realm resolution, login flow | Out of scope — functional layer |
| "Admin MFA Required" badge in admin form footer | Security/governance signal; must remain |
| AuthForm field labels "Organisation", "Email", etc. | Functional labels; no change |

### 4.4 What is NOT public-page treatment that should carry over

The following public-page elements are **public-marketplace-specific** and must NOT be
carried into the auth surface, because doing so would create a false "same surface"
impression:

- The dark navy hero section (`bg-[#071a2f]` page-level hero banner) — auth is not a marketing surface
- The `.public-entry-editorial-heading` serif font — editorial branding for public copy, not auth forms
- Trust signal pill badges ("Verified textile commerce platform" etc.) — public marketing copy only
- B2B/B2C CTA panel rows — public discovery; not auth-surface content

---

## 5. Logo Asset Decision — C. Logo Strategy

### 5.1 Available assets

| Asset | Path | Status | Current use |
|---|---|---|---|
| Full logo | `/public/brand/texqtic-logo.png` | Confirmed present; in active use | PUBLIC_ENTRY nav, B2BDiscovery header, B2CBrowse header — `h-10` to `h-14` |
| Small logo | `/public/brand/texqtic logo small.png.jpeg` | Confirmed present; **unusual `.png.jpeg` extension** — verify MIME type serves correctly before use | Not currently in use |

### 5.2 Extension anomaly on small logo

The small logo filename `texqtic logo small.png.jpeg` contains spaces and a double extension
(`.png.jpeg`). Before using this asset:
- Verify it serves correctly from Vite dev server and production Vercel CDN
- If MIME type is incorrect, rename the file before referencing it (this rename would require
  a separate governance-approved file operation)
- If the rename is needed, include it explicitly in the implementation slice allowlist

### 5.3 Logo placement strategy

| Surface | Recommended asset | Placement | Size |
|---|---|---|---|
| AUTH case outer page (above form card) | **Full logo** (`texqtic-logo.png`) | Centered, above the realm switcher | `h-10` (matches B2BDiscovery nav bar usage) |
| AUTH form card header (replacing emoji) | **Full logo** (`texqtic-logo.png`) | Centered in card top area, replacing `🚀 TexQtic Admin` / `🚀 TexQtic` text | `h-8` or `h-9` — proportional to card width `max-w-md` |
| TENANT_RESOLVING / TENANT_BLOCKED states | **Full logo** (`texqtic-logo.png`) | Centered above spinner/message | `h-10` |
| SuperAdminShell header (optional follow-on) | **Small logo** (if extension verified) or full logo at small size | Left side, beside "Control Plane" badge | `h-7` or `h-8` — compact for shell header |

**Decision rule:** Use the **full logo** as the primary auth entry identity treatment.
The small logo may be used in the SuperAdminShell shell header as a compact variant,
but only after the extension/MIME issue is verified. If uncertain, use the full logo
at reduced size rather than the small logo with an unverified extension.

**Must NOT do:** Invent a new logo treatment, add a badge/overlay to the logo, or
rasterize/resize the logo in code. Use the repo asset as-is.

---

## 6. Color / UI Token Alignment — D. Token Decision

### 6.1 Brand token reference (from public pages — repo truth)

| Token role | Value | Source file |
|---|---|---|
| Page background | `#f3f8fb` | PUBLIC_ENTRY, B2BDiscovery, B2CBrowse |
| Deep navy (primary CTA / hero) | `#071a2f` | PUBLIC_ENTRY hero, CTA buttons |
| Deep navy hover | `#0d2743` | CTA buttons |
| Brand teal accent | `#7fd5de` | Eyebrow text, spinner ring, accent |
| Brand teal/blue (medium) | `#2f8094` | Label text, eyebrow labels |
| Card border | `#d9e5ea` | All public page cards |
| Card border (nav/aside) | `#d7e4e8` | PUBLIC_ENTRY right-side card |
| Card soft shadow | `0_8px_28px_rgba(7,26,47,0.07)` | Supplier/Storefront cards |
| Card hero shadow | `0_18px_50px_rgba(7,26,47,0.06)` | Sign-in CTA cards |
| Dark text | `#0a2036` | Card headings |
| Input background | `#f5fafb` / `#f8fbfc` | Form field backgrounds |

### 6.2 Which tokens should carry into Tenant Access

| Current value | Replace with | Applies to |
|---|---|---|
| `bg-slate-50` (page) | `bg-[#f3f8fb]` | AUTH case outer wrapper background |
| `border-slate-200` (card) | `border-[#d9e5ea]` | AuthForm card border |
| `shadow-2xl` (card) | `shadow-[0_18px_50px_rgba(7,26,47,0.06)]` | AuthForm card shadow |
| `bg-indigo-600` (tenant realm switcher active) | `bg-[#071a2f]` | Tenant Access pill active state |
| `hover:border-indigo-300 hover:text-indigo-700` (PUBLIC_ENTRY right card) | `hover:border-[#2f8094] hover:text-[#0a2036]` | Tenant Access list item hover in PUBLIC_ENTRY aside (already consistent enough; low priority) |
| `rounded-xl` (submit button in AuthForm) | `rounded-full` | AuthForm submit CTA |
| `bg-${accentColor}` for tenant form button (`indigo-600`) | `bg-[#071a2f] hover:bg-[#0d2743]` | Tenant AuthForm submit button |
| `focus:ring-indigo-500` (inputs) | `focus:ring-[#2f8094]` | All auth form input focus rings |
| `bg-slate-50` (input background) | `bg-[#f5fafb]` | Auth form input fields |
| emoji header `🚀 TexQtic` | `<img src="/brand/texqtic-logo.png" alt="TexQtic" className="h-8 w-auto mx-auto" />` | AuthForm identity header |
| `text-3xl font-black tracking-tighter` (emoji text) | Remove — replaced by logo | AuthForm card top identity |

### 6.3 Which tokens should NOT carry into Staff Control Plane auth

| Token | Must keep | Reason |
|---|---|---|
| `bg-rose-600` (admin realm switcher active) | KEEP `bg-rose-600` | Governance identity signal — control-plane seriousness |
| `bg-rose-600` top stripe on admin auth card | KEEP | Control-plane realm differentiation |
| `bg-rose-600` submit button on admin form | KEEP | Intentional: admin realm submit must be visually distinct |
| `🛡️` emoji in admin form | OPTIONAL — can keep alongside logo or remove | Not strictly a gap; could be retained for added signal |

### 6.4 Which tokens must NOT be changed

| Token | Location | Must-not-change reason |
|---|---|---|
| `bg-slate-950` / `bg-[#020617]` | SuperAdminShell | Post-auth control plane; dark treatment is correct |
| Rose `bg-rose-600` active state (admin switcher) | App.tsx AUTH case realm switcher | Governance identity signal |
| Functional form field labels, input types, placeholder text | AuthFlows.tsx | Auth functional layer |
| `animate-in fade-in slide-in-from-bottom-4` transition | AuthForm outer div | Animation; acceptable to keep |

---

## 7. WL Co Hold Reassessment

Per `governance/control/BLOCKED.md`, any future slice intersecting WL brand-surface,
domain/routing, identity/tenancy, admin overlay, or canon-expansion domains requires a
fresh WL Co reassessment.

**Determination for this slice:** WL Co reassessment is **NOT required**.

Rationale:
- The `AUTH` case is the platform-owned sign-in surface at `app.texqtic.com` — it is
  TexQtic's own brand surface, not a White Label tenant's brand surface
- No WL storefront theming, custom domain routing, WL admin overlay, or WL identity
  is touched by this alignment
- The alignment changes `bg-slate-50 → #f3f8fb`, adds a logo image, and adjusts button
  shape/colors — none of these touch WL canon, WL brand-surface governance, or WL tenancy
- The six WL Co risk domains from the B2C browse reassessment
  (`TEXQTIC-WL-CO-B2C-SLICE3-COMPATIBILITY-REASSESSMENT-v1.md`) are all NOT APPLICABLE here

**However:** If the implementation slice includes any change that touches WL storefront
rendering, WL domain routing, or WhiteLabelAdminShell theming, a WL Co reassessment
becomes mandatory before that slice may proceed. The implementation slice must be
scoped to exclude those surfaces.

---

## 8. Bounded Implementation Plan — E. Implementation Plan

### 8.1 Exact scope

Align the visual branding of the `AUTH` case entry surface to the TexQtic public-page
brand vocabulary. Specifically:

1. `App.tsx` — AUTH case outer render (lines ~5200–5237):
   - Change page background `bg-slate-50` → `bg-[#f3f8fb]`
   - Add TexQtic full logo centered above the realm switcher buttons
   - Logo: `<img src="/brand/texqtic-logo.png" alt="TexQtic" className="h-10 w-auto" loading="eager" />`

2. `App.tsx` — AUTH case TENANT_RESOLVING and TENANT_BLOCKED transitional renders (lines ~5165–5200):
   - Change outer background `bg-slate-50` → `bg-[#f3f8fb]`
   - Add TexQtic full logo centered above the card (optional; included for completeness if
     those states are user-visible for more than ~200ms)

3. `components/Auth/AuthFlows.tsx` — AuthForm component:
   - Replace emoji + text header (`text-3xl font-black tracking-tighter` with `🚀 TexQtic` / `🛡️ TexQtic Admin`) with centered full logo: `<img src="/brand/texqtic-logo.png" alt="TexQtic" className="h-8 w-auto mx-auto" loading="eager" />`
   - Keep sub-label text ("Sign in to your account / admin account") as-is
   - Change auth card border: `border-slate-200` → `border-[#d9e5ea]`
   - Change auth card shadow: `shadow-2xl` → `shadow-[0_18px_50px_rgba(7,26,47,0.06)]`
   - Change tenant-realm submit button: `bg-indigo-600` → `bg-[#071a2f]` with `hover:bg-[#0d2743]`
   - Change submit button shape: `rounded-xl` → `rounded-full`
   - Change input focus ring: `focus:ring-indigo-500` → `focus:ring-[#2f8094]`
   - Change input background: `bg-slate-50` → `bg-[#f5fafb]` (optional, low priority)
   - Keep admin realm rose colors (`bg-rose-600`, top stripe, etc.) unchanged

4. `App.tsx` — AUTH case realm switcher pill buttons (lines ~5204–5224):
   - Change tenant active state: `bg-indigo-600 border-indigo-600` → `bg-[#071a2f] border-[#071a2f]`
   - Keep admin active state: `bg-rose-600 border-rose-600` — unchanged (governance signal)
   - Inactive state: current `bg-white border-slate-200 text-slate-500` — can align border to `border-[#d9e5ea]` (low priority)

### 8.2 Exact files to modify

| File | Nature of change |
|---|---|
| `App.tsx` | Background color, logo addition, realm switcher tenant accent color |
| `components/Auth/AuthFlows.tsx` | Logo in card header, button shape, brand colors, card border/shadow |

### 8.3 Exact files that must remain untouched

| File | Reason |
|---|---|
| `layouts/SuperAdminShell.tsx` | Post-auth shell; out of scope for auth entry alignment |
| `server/**` | No backend changes |
| `server/prisma/**` | No schema changes |
| `shared/contracts/**` | No API contract changes |
| `governance/control/**` | Layer 0 files — always read-only |
| `index.css` | No new CSS classes needed; Tailwind inline only |
| `public/brand/**` | Logo assets — read-only; no new assets, no rename unless extension fix is required |
| `middleware.ts` | Auth/routing logic — out of scope |
| `runtime/**` | Session runtime — out of scope |
| Any WL / WhiteLabel components | WL brand surface — out of scope |

### 8.4 Non-goals (explicit exclusions from implementation)

- Auth flow redesign, realm routing, login logic changes
- Staff Control Plane information architecture
- SuperAdminShell layout or navigation redesign
- Adding brand colors to SuperAdminShell dark theme (separate follow-on if desired)
- Adding the TexQtic logo to the SuperAdminShell header (separate follow-on if desired)
- Creating a CSS theme system or token file
- Broad Tailwind config changes
- Any changes to WL storefront, WL admin, or White Label brand surfaces
- Renaming the small logo asset (separate task; only needed if small logo is actively used)
- Font imports or web font changes

### 8.5 Verification expectations

After implementation:
1. `pnpm run typecheck` — must pass with zero new errors
2. `pnpm run lint` — must pass with zero new errors
3. Visual inspection at `app.texqtic.com` or dev server:
   - Auth entry page shows `#f3f8fb` background and TexQtic logo centered above form
   - Tenant Access active state shows brand navy pill (not indigo)
   - Staff Control Plane active state shows rose pill (unchanged)
   - Auth form submit button is pill-shaped for tenant realm
   - Admin realm form remains rose-accented and visually distinct
4. `git diff --name-only` must show only `App.tsx` and `components/Auth/AuthFlows.tsx`
5. Pre-existing modifications (`services/catalogService.ts`, `shared/contracts/openapi.tenant.json`) must remain unstaged

### 8.6 Sequencing

1. Read App.tsx AUTH case render sections before editing (re-read at implementation time)
2. Implement App.tsx AUTH outer wrapper changes first (lowest risk)
3. Implement AuthFlows.tsx card header and color changes second
4. Run typecheck + lint
5. Stage only `App.tsx` + `components/Auth/AuthFlows.tsx`
6. Commit with: `[TEXQTIC] frontend: align auth entry branding to public page brand vocabulary`

---

## 9. Final Planning Result — F. Summary

### 9.1 Is this ready for a bounded implementation slice?

**YES — READY.**

The gap is clearly documented, the alignment scope is bounded and minimal, the logo
strategy is explicit, the two target files are identified, the exact changes are
specified, and the governance hold (WL Co) is confirmed as non-applicable.

D-016 decision control requires a human authorization decision before any product
delivery unit opens. This planning artifact is the prerequisite investigation.
The human operator must authorize opening the implementation slice.

### 9.2 Next lawful slice name

```
AUTH_ENTRY_BRANDING_ALIGNMENT_IMPLEMENTATION_SLICE
```

**Ready to open:** Yes — after human authorization per D-016.

**Exact deliverables for that slice:**
1. `App.tsx` AUTH case outer wrapper: `#f3f8fb` background + TexQtic logo centered
2. `App.tsx` AUTH case realm switcher: tenant pill → brand navy (`#071a2f`)
3. `components/Auth/AuthFlows.tsx`: logo replaces emoji header, brand colors, pill button, card border/shadow

**Pre-opening checklist:**
- Confirm small logo extension is not needed (full logo only for auth entry)
- Confirm no WL brand-surface files are in scope (they are not)
- Confirm pre-existing `App.tsx` + `catalogService.ts` + `openapi.tenant.json` modifications do not conflict with this slice's edits

---

## 10. Boundary Confirmation

The following surface and role boundaries remain intact after this plan:

| Boundary | Status after plan |
|---|---|
| Public surface vs. Tenant Access surface | PRESERVED — auth surface has brand alignment but distinct form function |
| Tenant Access vs. Staff Control Plane | PRESERVED — rose accent for admin realm is unchanged |
| Auth functional logic | PRESERVED — no login, realm resolution, or session logic touched |
| WL storefront vs. platform auth | PRESERVED — no WL brand surfaces touched |
| Control-plane dark shell treatment | PRESERVED — SuperAdminShell is out of scope |
| RLS / DB / tenancy layer | PRESERVED — no data layer touched |

---

## 11. Open Items

| ID | Item | Priority | Action |
|---|---|---|---|
| OI-001 | `texqtic logo small.png.jpeg` extension anomaly | Medium | Verify MIME type serves correctly before using in any surface; if broken, add file rename to implementation slice allowlist |
| OI-002 | SuperAdminShell header — no logo | Low | Separate cosmetic follow-on; not required for auth entry alignment |
| OI-003 | Pre-existing `App.tsx` modification | Must confirm | Verify the pre-existing diff does not create a merge conflict with AUTH case section edits before implementation proceeds |
| OI-004 | FORGOT_PASSWORD / VERIFY_EMAIL / TOKEN_HANDLER cases | Low | All three use `bg-slate-50`; same background alignment applies but is low priority (short-lived states) |

---

*Artifact created: 2026-04-23 — investigation and planning only; no runtime or schema files changed.*
