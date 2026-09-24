# NWIS — Text Animation Spec (SmoothUI + GSAP)

**Companion to:** `design.md` and 'implementation.md'
**Goal:** Add a small, disciplined set of text animations that raise the premium feel of NWIS (Nearby Wells Intelligence System) without touching functionality, routes, data, or workflows.
**Run this as an extra phase after Phase 8 (page sweep) of the implementation plan.** Do not start it before the visual system is in place.

---

## 0. Rules That Override Everything Below

1. **Animation is decoration on top of the existing app.** Do not add pages, routes, sections, copy, or components that did not exist. Do not change what any element does.
2. **Real data is never delayed.** Content must be in the DOM and readable immediately or within the animation's short duration. Never hide data behind an animation, and never animate on every data refresh or poll, only on first mount or on a genuine change of selection.
3. **Engineers come first.** No animation on tables, chart labels, map labels, form fields, validation/error messages, warning or critical alerts, or navigation labels. Critical information appears instantly.
4. **One effect per job, one signature look.** Do not mix five different text effects. The set in Section 3 is the whole allowed list.
5. **Reduced motion is mandatory.** With `prefers-reduced-motion: reduce`, render the final state immediately with no movement, blur, or scramble.
6. **Style fit:** restrained, precise, industrial. No bounce, elastic, or spring overshoot. No Matrix-style or gaming effects. No neon glows.
7. **If an animation would require changing behavior, data, or structure, skip it and tell me.**

---

## 1. Step 1 — Audit Before Installing Anything

Inspect `package.json` and the codebase, then report:

- Framework (React / Next / Vite / other) and router
- Whether `motion` or `framer-motion` is already installed
- Whether GSAP is already installed
- Existing animation/transition code (CSS or JS)

**Decision rule (avoid shipping two animation engines for no reason):**

| Situation                                              | Approach                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App is React and already uses `motion`/`framer-motion` | Use SmoothUI components for simple reveals and number changes. Add GSAP only for the three GSAP-only effects in Section 3 (SplitText mask reveal, ScrollTrigger word highlight, ScrambleText decode). |
| App is React with no animation library                 | Install GSAP only (`gsap`, `@gsap/react`). Recreate the simple SmoothUI-style reveals with GSAP so there is one engine.                                                                               |
| App is not React                                       | GSAP only. SmoothUI components are React-specific, so use them only as visual references.                                                                                                             |

**GSAP note:** As of GSAP 3.13, the entire library, including SplitText, ScrambleText, and ScrollTrigger, is free for everyone including commercial use. Install with `npm install gsap @gsap/react`. Register plugins once in a single module:

```ts
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
gsap.registerPlugin(SplitText, ScrollTrigger, ScrambleTextPlugin);
```

**SmoothUI note:** Components install with the SmoothUI CLI, for example `npx smoothui-cli add reveal-text` (each component page shows its exact install command and props). **Before using any SmoothUI component, open its docs page and read its props and accessibility notes.** They are React + Tailwind + Motion, and the docs pages are at `https://smoothui.dev/docs/components/<slug>`.

---

## 2. Motion Tokens (create once, reuse everywhere)

Create a single module, for example `src/motion/tokens.ts`:

| Token           | Value                                 | Use                                         |
| --------------- | ------------------------------------- | ------------------------------------------- |
| `dur.micro`     | 0.15–0.2s                             | Hover, small swaps                          |
| `dur.base`      | 0.3–0.4s                              | Titles, panels, text swaps                  |
| `dur.hero`      | 0.8–1.0s                              | Landing hero headline only                  |
| `ease.enter`    | `power3.out` (or `expo.out` for hero) | All entrances                               |
| `stagger.lines` | 0.08s                                 | Line/word reveals                           |
| `stagger.chars` | 0.02–0.03s                            | Only for very short text (≤ 3 words)        |
| `blur.max`      | 8px                                   | Only if a blur-in is used at all, hero only |
| `distance`      | 8–14px vertical travel                | Fades and slides                            |

Rules:

- Animate **transform and opacity only** (blur only on the hero, if used). Never animate layout properties like width, height, top, or margin.
- No layout shift: reserve space so text does not jump when animation ends.
- Hero animation plays **once per session** (use a `sessionStorage` flag), not on every visit to the page.
- Provide a `useReducedMotion()` helper (or use `gsap.matchMedia()`) and use it in every animated component.
- After a SplitText animation finishes, call `split.revert()` to restore plain DOM text (better for accessibility, selection, and copy/paste).
- Clean up on unmount (use `useGSAP` from `@gsap/react` with a `scope`; kill ScrollTriggers on route change).

---

## 3. The Approved Animation Set

Map each effect to the **existing** page or component with the equivalent role. Look up the real routes and components from the Phase 0 inventory. If a listed surface does not exist in NWIS (for example there is no landing page), **skip that entry**. Do not create it.

### A. Landing / login hero headline (only if such a page already exists)

- **Effect:** Masked line reveal. Each line of the headline slides up from behind a clipping mask.
- **Tool:** GSAP `SplitText` with `type: "lines"`, `mask: "lines"`, `autoSplit: true`.
- **Timing:** `dur.hero`, `expo.out`, `stagger.lines`.
- **Sub-headline / supporting copy:** simple fade-up (8–12px), `dur.base`, 0.3s delay after the headline. SmoothUI equivalents: _Short Slide Down_ or _Micro Scale Fade_.
- **Why:** A mask reveal feels engineered and clean, which suits an industrial enterprise product better than a blur or per-letter effect.
- **Alternative (choose one, never both):** SmoothUI _Focus Blur Resolve_ on the hero headline only, with blur reduced to about 8px and a total duration under 600ms.

```ts
useGSAP(
  () => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      SplitText.create(headingRef.current, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.08,
          });
        },
      });
    });
  },
  { scope: containerRef },
);
```

### B. Landing page section titles and one statement paragraph (only if a marketing/landing page exists)

- **Section titles:** SmoothUI _Reveal Text_ (direction `up`, view-triggered) or a GSAP fade-up with ScrollTrigger (`once: true`). `dur.base`.
- **One "mission / problem statement" paragraph only:** scroll-scrubbed word highlight.
  - **Tool:** GSAP `SplitText` (words) + `ScrollTrigger` with `scrub`. Words start dim (`#7F8CAD`, ~30% opacity) and resolve to near-white (`#F4F6FB`) as the user scrolls. Key phrases may resolve to cream (`#FCF1D0`).
  - SmoothUI equivalent for a simpler version: _Scroll Reveal Paragraph_.
  - Use on **one** paragraph. Do not apply to every paragraph.

```ts
const split = SplitText.create(paraRef.current, { type: "words" });
gsap.fromTo(
  split.words,
  { opacity: 0.25 },
  {
    opacity: 1,
    ease: "none",
    stagger: 0.1,
    scrollTrigger: {
      trigger: paraRef.current,
      start: "top 80%",
      end: "bottom 50%",
      scrub: true,
    },
  },
);
```

### C. Page titles inside the app (dashboards, well list, reports, settings)

- **Effect:** Very light fade-up of the page `<h1>` on route mount only.
- **Timing:** `y: 8 → 0`, opacity 0 → 1, `dur.base` (~0.3s), `power3.out`.
- **SmoothUI equivalents:** _Short Slide Down_ or _Micro Scale Fade_.
- Play on mount only. Never replay on data refresh, filter change, or tab switch.
- Do **not** stagger the rest of the page's text. Cards and tables render normally.

### D. KPI and stat values (dashboard cards, well summary metrics, "Confidence", "Nearby Wells" counts)

- **Effect:** Numeric roll or count-up on first appearance, and a smooth roll when the value changes.
- **Tool:** SmoothUI _Number Flow_ (read its docs first), or a GSAP tween with `snap` if GSAP-only.
- **Rules:** tabular numerals; `dur.base` to 0.6s max; the final displayed value must equal the real value exactly (respect formatting, units, and decimals); no animation on values that update continuously or by polling.
- Key values remain cream, non-key values white, per `design.md`.

### E. Selected well identity (well name / ID / coordinates in the detail panel or map popup)

- **Effect 1 (text swap):** When the selected well changes, crossfade the old name/ID out and the new one in, ~150–200ms. SmoothUI _Fade Through_ is the intended fit (verify on its docs page), or a simple GSAP opacity/y swap.
- **Effect 2 (decode, optional and restrained):** A short "decode" of the **well ID and coordinates only** using GSAP `ScrambleTextPlugin`. Numeric characters only, ≤ 0.5s, resolves to the exact real value. This gives a subtle "data resolving" feel tied to the product's intelligence identity.
- **Do not** use scramble on names, labels, depths, pressures, or any value an engineer must read quickly. Do not scramble on hover, on navigation items, or on buttons (that reads as Matrix-style and clashes with the design brief).
- For screen readers, expose only the final value (for example an `aria-label` on the wrapper with the real text, and mark the animated text `aria-hidden`).

```ts
gsap.to(idRef.current, {
  duration: 0.5,
  scrambleText: { text: wellId, chars: "0123456789", speed: 0.6 },
});
```

### F. AI insight panel (Evidence → Insight → Recommendation)

- **Effect 1 (arrival of a completed insight card):** Sequential fade-up of the three blocks (Evidence, then Insight, then Recommendation), `stagger` ~0.12s, `dur.base`. The Recommendation block finishes last, with its cream left border drawn or faded in. SmoothUI _Line-by-Line Slide_ or _Short Slide Down_ fits (verify on the docs page), or GSAP stagger.
- **Effect 2 (loading label):** Apply a subtle shimmer to the **existing** loading text (for example "Analyzing…"). SmoothUI _Shimmer Sweep_ or _Shine Text_. Restyle only the existing label. Do not add new copy.
- **Streaming responses:** if the AI answer streams in, **do not** add a typewriter or per-character animation on top of it. The streaming is already the motion. Animate the panel container only.
- **Never** animate re-renders of an already-shown insight.

### G. Optional, only if it already exists in the app

- **AI prompt input:** if the app already shows suggested/example queries, SmoothUI _Typewriter Text_ can cycle them as a placeholder. It pauses on focus and stops when the user types. **Do not invent new example queries.** If none exist, skip.

---

## 4. Explicit "Do Not Animate" List

- Tables, well lists, and search results
- Chart axis labels, legends, tooltips (chart data drawing in is a separate concern and stays minimal)
- Map labels and basemap text
- Form labels, inputs, validation and error messages
- **Warning and critical alerts** (they must appear instantly)
- Navigation labels and buttons (color/background transitions only, 150ms)
- Toasts and status text
- Any text that updates on a timer or polling interval
- AI streaming text (container only)
- Route transitions using shader/blob/aperture-style effects (out of scope and off-brand)

Also do **not** adopt from SmoothUI: Gravity Letters, Wave Text, Perspective Text 3D, Kinetic Type, Scramble Hover on nav/buttons, Siri Orb, Aurora, Liquid Metal, ASCII Render, or any shader transition. They conflict with "not futuristic, not gaming, not consumer-AI."

---

## 5. Implementation Steps

1. **Audit** (Section 1) and report the chosen approach before installing anything.
2. **Create the motion module:** tokens, `useReducedMotion`/`matchMedia` helper, plugin registration.
3. **Build three small reusable wrappers** (these are presentational only and take existing content as children/props):
   - `<HeadlineReveal>`: SplitText mask lines (A)
   - `<ScrollWords>`: scrubbed word highlight (B)
   - `<DecodeText value="...">`: restrained numeric scramble that resolves to the exact value (E)
   - Use existing SmoothUI components or plain GSAP for the fades and Number Flow.
4. **Apply per Section 3**, one surface at a time, using only routes/components that already exist.
5. **Verify** with the checklist below.

---

## 6. Verification Checklist

- [ ] No route, page, copy, data, or behavior changed (`git diff` shows only presentation and motion code)
- [ ] With OS "Reduce motion" on, all text appears instantly in its final state
- [ ] Text is fully readable within ~1s everywhere and within ~0.4s in the app's working screens
- [ ] Hero animation plays once per session
- [ ] No animation replays on data refresh, filter change, polling, or tab switch
- [ ] Warning and critical alerts appear instantly
- [ ] Animated numbers land on exact real values (format, units, decimals)
- [ ] No layout shift when animations finish (check CLS)
- [ ] ScrollTriggers and timelines are killed on unmount and on route change
- [ ] Headline text is selectable and copyable after animation (SplitText reverted)
- [ ] Screen readers announce each animated string once, with the final value
- [ ] Smooth at 4x CPU throttling in DevTools (simulates older office hardware)
- [ ] Bundle size increase reported (GSAP core + only the plugins actually used)

---
