# NWIS UI Inventory (Phase 0)

## 1. Technology Stack
- **Framework:** Next.js (App Router) / React 19
- **Styling Approach:** Tailwind CSS v4
- **Component Library:** Shadcn UI + Base UI (`@base-ui/react`), with Lucide React for icons.
- **Chart Library:** Recharts
- **Map Library:** Mapbox GL (`mapbox-gl`) via React Map GL (`react-map-gl`)
- **Animation/Motion:** GSAP (`gsap`, `@gsap/react`), Framer Motion (`framer-motion`)
- **State Management:** Zustand
- **Database/Backend (from `start.md`):** Node.js/Express, Drizzle ORM, MySQL, Qdrant (Vector DB), Python FastAPI (ML Service).

## 2. Routes (Pages)
- `/` (Landing/Home)
- `/login` (Authentication)
- `/signup` (Authentication)
- `/admin` (Administration/Settings)
- `/compare` (Well Comparison)
- `/dashboard` (Main Analytics Dashboard)
- `/map` (Geospatial View)
- `/risk` (Risk Indicators/Analysis)
- `/upload` (Document/Data Ingestion)
- `/wells` (Well List/Detail View)
- `/api` (Next.js API routes)

## 3. Shared Layout Components
- `Navbar.tsx` (Top navigation/Sidebar)
- `Footer.tsx` (Footer)

## 4. Shared UI Primitives (Shadcn/Custom)
- `accordion.tsx`
- `alert.tsx`
- `avatar.tsx`
- `badge.tsx`
- `button.tsx`
- `card.tsx`
- `command.tsx`
- `dialog.tsx` (Modal)
- `dropdown-menu.tsx`
- `input-group.tsx`
- `input.tsx`
- `label.tsx`
- `popover.tsx`
- `progress.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx` (Drawer/Side Panel)
- `skeleton.tsx` (Loading state)
- `slider.tsx`
- `table.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `tooltip.tsx`

## 5. Domain-Specific Components
- **Map:** `WellMap.tsx`
- **Wells:** `DrillingParamsGrid.tsx`
- **Motion (GSAP wrappers):** `AnimatedStat.tsx`, `DecodeText.tsx`, `HeadlineReveal.tsx`

## 6. Baseline Status
- **Build:** Next.js dev server is running on port 3000.
- **Backend:** Node server running on port 5000, Python ML server running on port 8100.
- **Design Tokens:** Currently scattered/un-unified (to be addressed in Phase 1).
