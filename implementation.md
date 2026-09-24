# NWIS Visual Redesign — Implementation Plan

**Project:** NWIS — Nearby Wells Intelligence System (SIH Problem Statement 26121, Oil India Limited)
**Source of truth:** `design.md` (must be in the repo root or provided alongside this plan)
**Goal:** Re-skin the existing application with the NWIS navy + cream visual system. **Do not change functionality, routes, data, or architecture.**

---

## 0. Read This First — Non-Negotiable Rules

This is a **visual-layer-only** change. Before every edit, ask:

> "Can I make this existing component look better without changing what it does?"

If yes → restyle it. If the change would touch a page, route, workflow, data structure, API call, or behavior → **do not make it.**

### You MUST NOT

- Add, remove, rename, or reorder pages or routes
- Change navigation structure, labels, or destinations
- Modify API calls, request/response shapes, or data models
- Change state management, business logic, auth, or AI/LLM integration
- Change form fields, validation, or submit behavior
- Change what any button, link, or control does
- Replace real data/components with mock data or placeholder components
- Change chart or map _data_, only their _appearance_
- Introduce new dependencies unless unavoidable (fonts and a chart/map theme config are acceptable; ask/flag before adding anything else)
- Invent new risk categories, features, or UI sections

### You MAY

- Change CSS, Tailwind classes, theme tokens, styled-components/CSS-in-JS styles
- Add a global theme/tokens file and a font import
- Adjust markup **only** when strictly required for styling (e.g., wrapper `div`, `className`), without altering behavior, props, handlers, or IDs used by tests/logic
- Improve spacing, alignment, typography, responsiveness, and consistency

---

## 1. Phase 0 — Audit & Baseline (no visual changes yet)

**Objective:** Understand the codebase and lock in a baseline so we can prove nothing functional changed.

1. **Identify the stack:** framework (React/Next/Vue/etc.), styling approach (Tailwind / CSS modules / styled-components / MUI / plain CSS), chart library, map library (Leaflet / Mapbox / Google Maps / OpenLayers / deck.gl), and component library.
2. **Produce an inventory file** `docs/nwis-ui-inventory.md` listing:
   - Every route/page and its purpose
   - Shared layout components (navbar, sidebar, header, footer)
   - Shared UI primitives (Button, Input, Select, Card, Table, Modal, Tabs, Badge, Toast, Tooltip, Dropdown)
   - Chart components and the library used
   - Map components and the library/tile source used
   - AI/insight/chat components
   - Any existing hard-coded colors, fonts, or inline styles
3. **Capture a baseline:**
   - Run the app and confirm it builds and all routes load
   - Run existing tests (record pass/fail count)
   - Screenshot every route (desktop + mobile) into `docs/baseline-screenshots/`
4. **Create a git branch:** `redesign/nwis-visual-system`. Commit after every phase.

**Exit criteria:** Inventory written, baseline screenshots saved, tests/build status recorded.

---

## 2. Phase 1 — Design Tokens & Theme Foundation

**Objective:** Centralize the NWIS visual system so every later phase consumes tokens instead of hard-coded values.

### 2.1 Core palette

| Token                           | Hex       | Role                                                             |
| ------------------------------- | --------- | ---------------------------------------------------------------- |
| `--nwis-navy-950` (Deep Navy)   | `#010736` | App background, nav, hero, major headers                         |
| `--nwis-navy-900` (Navy)        | `#0D1C42` | Cards, panels, secondary surfaces, AI panels                     |
| `--nwis-blue-700` (Slate Blue)  | `#22396F` | Interactive/active states, tabs, charts, secondary buttons       |
| `--nwis-cream-100` (Warm Cream) | `#FCF1D0` | Attention color: key stats, primary CTA, recommendations, badges |

### 2.2 Derived tokens (create these; keep the palette controlled)

```css
:root {
  /* Core palette */
  --nwis-deep-navy: #010736;
  --nwis-navy: #0d1c42;
  --nwis-slate-blue: #22396f;
  --nwis-cream: #fcf1d0;

  /* Surfaces */
  --bg-app: var(--nwis-deep-navy);
  --bg-surface: var(--nwis-navy);
  --bg-surface-raised: #132550; /* subtle step above navy for hover/nested */
  --bg-interactive: var(--nwis-slate-blue);
  --bg-accent: var(--nwis-cream);

  /* Text */
  --text-primary: #f4f6fb; /* near-white */
  --text-secondary: #b8c2db; /* muted blue-grey */
  --text-muted: #7f8cad;
  --text-on-accent: var(--nwis-deep-navy);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: var(--nwis-slate-blue);
  --border-accent: var(--nwis-cream);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Elevation (subtle) */
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(1, 7, 54, 0.35);

  /* Focus */
  --focus-ring: 0 0 0 2px var(--nwis-deep-navy), 0 0 0 4px var(--nwis-cream);

  /* Spacing scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Typography */
  --font-sans:
    "Inter", "Geist", "IBM Plex Sans", system-ui, -apple-system, "Segoe UI",
    sans-serif;
  --font-mono:
    "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
```

### 2.3 Semantic status colors (restrained)

The brief says to stay within the palette and use extra colors **only where necessary for usability and safety**. Implement severity primarily through palette + iconography + labels, with **muted** semantic colors reserved for Warning/Critical:

| Level          | Treatment                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| Information    | Slate Blue `#22396F` background/border, light text, info icon             |
| Recommendation | Cream `#FCF1D0` accent (left border or badge), navy text on cream badges  |
| Warning        | Muted amber `#E0A93B` used only for icon/left border, on navy surface     |
| Critical       | Muted red `#D9534F` used only for icon/left border/label, on navy surface |

Rules: never fill large areas with amber/red; always pair color with an icon and text label (do not rely on color alone); use them only where the app **already** shows warnings/critical states.

### 2.4 Implementation by stack

- **Tailwind:** extend `theme.colors` / `theme.borderRadius` / `theme.fontFamily` in `tailwind.config` with the tokens above; set base `body` styles in the global CSS.
- **CSS modules / plain CSS:** create `styles/tokens.css` (as above) and import once at the app root.
- **styled-components / Emotion / MUI / Chakra:** create a theme object mirroring tokens and wrap the app in the existing theme provider (extend it; don't replace providers that other logic relies on).
- **Fonts:** load Inter (preferred) via existing font mechanism (`next/font`, `@fontsource`, or Google Fonts `<link>`). Weights: 400, 500, 600, 700. Use tabular numerals for data (`font-variant-numeric: tabular-nums`).

### 2.5 Global base styles

- `html, body`: `background: var(--bg-app); color: var(--text-primary); font-family: var(--font-sans);`
- Set `color-scheme: dark`
- Style scrollbars (thin, `--nwis-slate-blue` thumb on transparent track)
- Selection color: cream background, deep navy text
- Consistent `:focus-visible` using `--focus-ring`

**Exit criteria:** Tokens exist in one place; app still builds and behaves identically; only global background/font have shifted.

---

## 3. Phase 2 — Shared UI Primitives

Restyle the shared components first so pages inherit the look automatically. **Keep component APIs (props, events) untouched.**

### 3.1 Buttons

| Variant                        | Style                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Primary (important CTAs only)  | bg `#FCF1D0`, text `#010736`, weight 600, hover: slightly darker cream (`#F5E6B8`) |
| Secondary                      | transparent bg, 1px border `#22396F`, white text, hover: bg `rgba(34,57,111,.35)`  |
| Important dark action          | bg `#22396F`, white text, hover: lighten ~8%                                       |
| Ghost / tertiary               | transparent, `--text-secondary`, hover: subtle surface tint                        |
| Destructive (only if existing) | outlined muted red, not filled                                                     |

Compact sizing (height ~36–40px, radius 8–12px). **Do not make every button cream** — map existing buttons: the single main action per view → Primary; everything else → Secondary/Dark/Ghost. Disabled state: reduced opacity + `not-allowed` cursor.

### 3.2 Inputs, selects, textareas, checkboxes, radios, toggles

- Background `#0D1C42` on `#010736` pages (or `#010736` inside `#0D1C42` cards for contrast)
- 1px border `--border-subtle`; hover: `#22396F`; focus: cream focus ring
- Placeholder: `--text-muted`; label: `--text-secondary`, 12–13px, weight 500
- Error state: muted red border + message text (keep existing validation logic/messages)
- Date pickers, dropdown menus, comboboxes: restyle popovers with `#0D1C42` surface, `#22396F` hover/selected rows

### 3.3 Cards & panels

- Background `#0D1C42`, border `1px solid var(--border-subtle)`, radius 12–16px, `--shadow-card`
- Card header: 14–16px, weight 600; optional small uppercase label (11–12px, letter-spacing .06em, `--text-secondary`)
- Nested/raised sections use `--bg-surface-raised`
- No glow effects, no heavy gradients

### 3.4 Tables

- Header row: `--text-secondary`, 12px uppercase, sticky where already sticky
- Rows: transparent on `#0D1C42`; hover `rgba(34,57,111,.35)`; selected row: `#22396F` with cream left border
- Dividers: `--border-subtle` only (no zebra clutter)
- Numeric columns right-aligned with tabular numerals
- Preserve all existing columns, sorting, filtering, pagination

### 3.5 Tabs, badges, chips, tooltips, modals, toasts, dropdowns

- **Tabs:** active = `#22396F` bg or bottom border (cream for emphasis), inactive = `--text-secondary`
- **Badges:** small (11–12px); default `#22396F`; "important" = cream bg + navy text
- **Modals/drawers:** `#0D1C42` surface, overlay `rgba(1,7,54,.7)`, radius 16–20px
- **Toasts:** navy surface with left border by severity (see 2.3)
- **Tooltips:** `#010736` bg, 1px `#22396F` border, 12px text

### 3.6 Loading / empty / skeleton states

- Skeletons: shimmer between `#0D1C42` and `#132550` (very subtle; respect `prefers-reduced-motion`)
- Empty states: keep existing text/logic; restyle only

**Exit criteria:** Every shared primitive matches the spec; Storybook/preview (if any) or a temporary local test page shows all variants (delete any temp page before commit).

---

## 4. Phase 3 — App Shell & Navigation

**Keep the exact existing nav items, order, labels, and routes.**

- **Sidebar / top nav:** bg `#010736`; text `--text-primary` / `--text-secondary`
- **Active item:** bg `#22396F`, white text; optional 3px cream left indicator for the currently selected item
- **Hover:** `rgba(34,57,111,.45)`
- **Icons:** consistent set (keep existing icon library; unify size 18–20px, stroke 1.5–2px)
- **Spacing:** generous (12–14px vertical item padding); minimal borders (only a single subtle divider between shell and content)
- **Logo / brand:** display "NWIS" wordmark in the nav using existing logo asset if present; otherwise text styled (weight 700, letter-spacing .04em) with the full name "Nearby Wells Intelligence System" as a small secondary line where the existing layout already shows a title
- **Top header/page header:** deep navy, page title 24–28px weight 600, breadcrumb/subtitle in `--text-secondary`
- **User menu / auth controls:** restyle only; do not change auth flow
- **Responsive:** sidebar collapse/drawer behavior must remain as it is; only restyle the collapsed/mobile states

**Exit criteria:** Navigation looks like an enterprise engineering app; all links still route to the same destinations.

---

## 5. Phase 4 — Dashboard Pages

Layouts stay as they are. Apply:

- Page background `#010736`; cards `#0D1C42`
- Consistent grid gaps (16–24px) and page padding (24–32px on desktop)
- **KPI / stat cards:** label small (`--text-secondary`), value large (28–36px, weight 600, tabular numerals). Use **cream** for the key/most important value(s) only; other values in white
- Section titles with consistent size/weight/spacing
- Align card heights within a row; unify header patterns
- Keep chart placement, filters, date ranges, and export/download controls exactly as they are

**Exit criteria:** Every dashboard route matches token spacing and hierarchy; no widgets added/removed.

---

## 6. Phase 5 — Maps & Well Intelligence Surfaces

Treat the map area as a flagship surface. **Do not change map data, layers, controls' behavior, clustering logic, popups' content, or interactions.**

1. **Container:** `#0D1C42` frame, 12–16px radius, 1px subtle border; map controls (zoom, layer toggles, search) restyled as navy surfaces with `#22396F` hover.
2. **Basemap:** if the map library supports a style/tile URL swap that is a _pure visual change_, use a dark, low-saturation basemap that harmonizes with navy (e.g., a dark-matter-style tile) — **only if the current tile provider allows it without new keys/dependencies**; otherwise leave tiles as-is and apply a CSS filter or overlay tint conservatively (verify labels stay readable). Flag this decision in the PR description.
3. **Markers / well points:**
   - Default well: light/white or `#22396F`-outlined marker
   - **Selected well:** cream `#FCF1D0` fill with navy outline + subtle ring
   - Nearby/related wells: `#22396F` fill with light outline
   - Risk indicator wells: use existing risk categories with severity styling from §2.3 (icon + shape/outline difference, not only color)
   - Relationship lines (well↔well): thin `#22396F`/light-blue lines; highlighted relations in cream
4. **Popups / info panels / side panels:** `#0D1C42` surface, cream for the key value, structured label/value rows, radius 12px
5. **Legend:** navy card, consistent with palette; ensure contrast ≥ 4.5:1 for text
6. **Selected-well detail panel** (geology, drilling info, reservoir data): card layout with clear sections, small uppercase labels, tabular numerals for depth/pressure/etc.

**Exit criteria:** Map works exactly as before (pan, zoom, select, popup, layers); visuals align with palette; geographic labels remain readable.

---

## 7. Phase 6 — AI Insight Interface

Restyle existing AI components into an **engineering-intelligence** presentation: **Evidence → Insight → Recommendation**. Do not change prompts, API calls, streaming, or response handling. Where the response is free text, keep the text as-is and improve only presentation (typography, containers, emphasis). Only re-structure display where the existing data already contains the pieces (e.g., confidence, count of wells, recommendation text). **Do not fabricate fields.**

### Visual pattern

```
┌──────────────────────────────────────────┐
│ AI DRILLING INSIGHT            [badge]   │  ← small uppercase label
│ Potential Mud Loss Risk                  │  ← title (white, 18–20px, 600)
│ ───────────────────────────────────────  │  ← subtle divider
│ Evidence   (text-secondary, body)        │
│ Insight    (white, body)                 │
│ ┌──────────────────────────────────────┐ │
│ │ RECOMMENDATION  (cream left border)  │ │  ← cream accent block
│ └──────────────────────────────────────┘ │
│ Confidence 82%   Nearby Wells 14         │  ← metric chips, cream values
└──────────────────────────────────────────┘
```

- Panel bg `#0D1C42`, radius 16px, 1px subtle border
- Small uppercase label with letter-spacing, `--text-secondary`
- Recommendation block: `rgba(252,241,208,.08)` bg + 3px cream left border + cream label
- Metrics: label muted, value cream, tabular numerals
- Source/evidence references (if already present): small chips in `#22396F`
- **Chat/conversation UI (if the app has one):** user messages on `#22396F`, AI responses on `#0D1C42` with the panel style above; input bar styled like §3.2; avoid rounded "consumer chatbot" bubbles (max radius 12px, no avatar gimmicks)
- Loading state: subtle progress bar/skeleton in `#22396F`; no bouncing dots or sparkle animations

**Exit criteria:** AI features work identically; output looks like an instrument panel, not a generic chatbot.

---

## 8. Phase 7 — Data Visualization

Restyle via chart-library config (theme/options), **never changing data, series, or interactions.**

- **Palette:** primary series `#22396F` (on dark, lighten to `#4A6BB5` if needed for contrast — derive from slate blue, don't introduce hues), highlight/selected series `#FCF1D0`, neutrals white/`#B8C2DB`
- For >3 series: use tints/shades of slate blue plus cream for the emphasized series and dash/pattern/markers for differentiation
- **Grid lines:** `rgba(255,255,255,.08)`; axes/labels: `#B8C2DB`, 11–12px
- **Tooltips:** navy surface, 1px `#22396F` border, cream value
- **No** 3D, heavy gradients, drop shadows, or decorative animation; keep entry animation ≤ 300ms or disabled with `prefers-reduced-motion`
- Legends: compact, top or bottom, consistent across charts
- Ensure risk thresholds/reference lines (if present) use cream or the severity treatment from §2.3

Build a single shared chart theme module (e.g., `chartTheme.ts`) and apply it to every chart to guarantee consistency.

**Exit criteria:** All charts share one theme, remain accurate, and read clearly on navy.

---

## 9. Phase 8 — Page-by-Page Sweep

For **each route in the inventory** (Phase 0):

1. Apply shared components/tokens; remove leftover hard-coded colors, inline styles, and legacy font declarations
2. Fix spacing/alignment inconsistencies
3. Verify every interactive element still works
4. Screenshot and compare against baseline (layout should match; only visual language changes)

Track progress in a checklist:

```
[ ] Login / Auth pages
[ ] Dashboard
[ ] Nearby Wells / Map view
[ ] Well detail view
[ ] Documents / knowledge views
[ ] AI insights / assistant
[ ] Reports / analytics
[ ] Settings / profile
[ ] (all other routes from inventory)
```

---

## 10. Phase 9 — Responsive, Accessibility & Polish

- **Breakpoints:** verify 360, 768, 1024, 1440+; tables scroll horizontally in a contained wrapper; cards stack cleanly; nav collapse works
- **Contrast (WCAG AA):** text ≥ 4.5:1, large text/UI ≥ 3:1. Cream on deep navy passes; verify muted text (`--text-muted`) on `#0D1C42` — lighten if it fails
- **Focus visibility** on all interactive elements (cream ring)
- **Not color-only:** severity always has icon + label
- **Reduced motion:** honor `prefers-reduced-motion`
- **Motion:** only subtle 120–200ms transitions on hover/focus; no glow/pulse effects
- **Print/PDF/export views** (if they exist): keep readable; don't break them
- **Cleanup:** remove unused legacy CSS, old theme files, dead color constants

---

## 11. Phase 10 — Verification (Prove Nothing Functional Changed)

1. `git diff --stat` review: changes should be overwhelmingly in styles/theme/class names. Flag any change in:
   - route definitions, API/service files, store/state, reducers, hooks with logic, backend code, DB schemas, env config
     → Revert unless strictly required and justified
2. Build passes with **no new errors/warnings**
3. Existing tests pass with the same count as baseline (update only snapshot/selectors _if_ class names changed, and note it)
4. Manual smoke test of every route: navigation, forms, filters, map interactions, AI queries, exports, auth login/logout
5. Screenshot comparison vs. baseline: layouts and content match
6. Lighthouse/axe pass on key pages (no accessibility regressions)

### Final Acceptance Checklist

- [ ] Same pages, same routes, same nav structure
- [ ] Same data, APIs, auth, AI functionality
- [ ] All buttons/forms/interactions behave as before
- [ ] Palette limited to `#010736`, `#0D1C42`, `#22396F`, `#FCF1D0` + neutrals (+ muted amber/red only for warning/critical)
- [ ] Cream used sparingly (key values, primary CTA, recommendations, selected states)
- [ ] Maps, charts, and tables restyled with consistent theme
- [ ] AI panels follow Evidence → Insight → Recommendation presentation
- [ ] No neon, gaming, crypto, or consumer-chatbot look
- [ ] Responsive and accessible
- [ ] Reads as the _same NWIS app_, rebuilt with a premium, consistent visual system

---

## 12. Suggested Commit Sequence

1. `chore: audit and baseline`
2. `style: add NWIS design tokens and global theme`
3. `style: restyle shared UI primitives`
4. `style: restyle app shell and navigation`
5. `style: restyle dashboards`
6. `style: restyle map and well intelligence surfaces`
7. `style: restyle AI insight components`
8. `style: unify chart theme`
9. `style: page-by-page consistency sweep`
10. `a11y/responsive: polish and fixes`
11. `chore: remove legacy styles`

---

## 13. Prompt to Paste Into Your AI Coding Tool

> You are redesigning the **visual layer only** of an existing app called **NWIS (Nearby Wells Intelligence System)**, SIH Problem Statement 26121, for Oil India Limited. I've provided `design.md` and `NWIS_IMPLEMENTATION_PLAN.md`. Follow the plan phase by phase.
>
> **Hard rules:** Do not add, remove, or rename pages, routes, or navigation items. Do not change functionality, data, APIs, auth, AI logic, forms, workflows, or what any button does. Do not use mock data or invent features. Only change styling, theme tokens, fonts, spacing, and (when unavoidable) presentational markup/classNames.
>
> **Start with Phase 0 only:** inspect the codebase, tell me the stack (framework, styling approach, chart lib, map lib), produce the UI inventory, and record the baseline. Then stop and summarize before moving to Phase 1. After each phase, list the files changed and confirm that no logic, routes, or data handling were modified.
>
> Palette: `#010736` (deep navy, backgrounds/nav), `#0D1C42` (navy, cards/panels), `#22396F` (slate blue, interactive/charts), `#FCF1D0` (cream, sparing accent for key values, primary CTAs, recommendations). Font: Inter. Aesthetic: professional oil-and-gas engineering command center — not neon, not a crypto/gaming/consumer chatbot look.
>
> If any requested visual change would require altering functionality, stop and ask me instead of making it.
