## Context

The app's `MainLayout` uses a fixed-position Ant Design `Sider` with hardcoded pixel margins (`marginLeft: 240` / `64`). There is no breakpoint logic — on small screens the sidebar obscures content and scrolls fail. `AppDrawer` has no width adaptation; `AppModal` has no mobile width override; `AppTable` already uses `x: "max-content"` scroll but has no column-hiding support.

Staff on mobile/tablet (housekeeping, front desk) cannot use the app effectively today.

## Goals / Non-Goals

**Goals:**
- Define three canonical breakpoints (mobile / tablet / desktop) used consistently everywhere
- Convert the sidebar to a drawer overlay on mobile; collapse to icon-only on tablet
- Make `AppDrawer` full-width on mobile
- Make `AppModal` near-full-width on mobile
- Support optional `responsive` column hiding in `AppTable`
- Apply responsive grid to Dashboard KPI cards and chart sections
- Apply responsive page container padding across all module pages

**Non-Goals:**
- Native mobile app or PWA behavior
- Custom Tailwind breakpoint config changes (use existing `sm`/`md`/`lg`)
- Per-page custom breakpoint logic — all responsiveness flows from the shared components
- Offline support or touch-gesture navigation

## Decisions

### D0 — Responsive ownership model

Tailwind and Ant Design have overlapping but distinct responsibilities:

| Layer | Owner | Examples |
|---|---|---|
| Page layout, section arrangement, content spacing | **Tailwind** | `grid`, `flex`, `gap-*`, `px-*`, `md:grid-cols-2`, `lg:hidden` |
| Component-level rendering, theme tokens | **Ant Design** | `Grid.useBreakpoint()`, `size`, `width`, `variant`, design tokens |
| Cross-system responsive behavior | **Shared wrappers only** | `AppTable`, `AppDrawer`, `AppModal`, `MainLayout` |

**Rule:** `Grid.useBreakpoint()` is used **only** inside shared wrapper components (`AppTable`, `AppDrawer`, `AppModal`, `MainLayout`, `AppSidebar`). Individual module pages and feature components use Tailwind utility classes for layout. No feature-level component imports `useBreakpoint` directly.

This keeps the JS-driven breakpoint logic centralized. Tailwind handles purely static layout shifts (e.g., column counts in a page grid); Ant Design handles component rendering decisions that require runtime JS (e.g., whether a drawer is full-width or whether the sidebar shows a Drawer vs a Sider).

---

### D1 — Canonical breakpoints aligned to Ant Design `useBreakpoint`

Ant Design's `Grid.useBreakpoint()` returns `{ xs, sm, md, lg, xl, xxl }` reflecting `min-width` conditions. We map to three tiers:

| Tier | Condition | Ant Design key | Tailwind prefix |
|---|---|---|---|
| Mobile | < 768 px | `!md` | (default, no prefix) |
| Tablet | 768–1023 px | `md && !lg` | `md:` |
| Desktop | ≥ 1024 px | `lg` | `lg:` |

**Rationale:** Ant Design's `md` threshold (768 px) is the natural mobile/tablet boundary; `lg` (1024 px) separates tablet from desktop. Using these avoids introducing a separate Tailwind config entry.

**Alternative considered:** Custom `useMediaQuery` hook — rejected because `Grid.useBreakpoint()` is SSR-safe, already in the bundle, and the rest of the project uses Ant Design.

### D2 — Mobile sidebar becomes a Drawer; tablet collapses to icons

- **Mobile (`!md`):** `MainLayout` renders an Ant Design `Drawer` containing `AppSidebar`, triggered by the hamburger button. The `Sider` is not rendered. `marginLeft` is `0`.
- **Tablet (`md && !lg`):** `Sider` renders but `collapsed={true}` always (icon-only, 64 px). `marginLeft: 64`.
- **Desktop (`lg`):** Current behavior — `collapsed` is controlled by user toggle. `marginLeft: 240 | 64`.

**Rationale:** A drawer overlay is standard mobile nav UX. Forcing collapse on tablet preserves content space without removing navigation. The hamburger button remains visible on all tiers.

**Alternative considered:** Always-collapsed sidebar on mobile with `collapsedWidth: 0` — rejected because it leaves a 0-width ghost element and `marginLeft` would be 0 anyway; a Drawer is cleaner and standard.

### D3 — `AppDrawer` adds responsive width via `useBreakpoint`

`AppDrawer` uses `Grid.useBreakpoint()` internally. If `screens.md` is false (mobile), width defaults to `"100%"`. Otherwise the caller-supplied `width` (or the Ant Design `size` default) applies. Callers do not need to change.

### D4 — `AppModal` adds responsive width via `useBreakpoint`

Same pattern: on mobile, `width` is forced to `"calc(100vw - 32px)"` (16 px margin each side). On tablet+, caller-supplied or default width applies.

### D5 — `AppTable` gains optional `responsiveHideColumns` prop

A new optional prop `responsiveHideColumns?: { below: "md" | "lg"; columns: string[] }` lets callers declare which column `dataIndex` values to hide below a breakpoint. `AppTable` uses `useBreakpoint` to filter `columns` before passing to `Table`. This avoids per-page breakpoint logic and keeps the API backward-compatible.

### D6 — Dashboard grid uses Ant Design `Row`/`Col` with responsive `span`

Dashboard KPI cards use `Col span={6}` (4 cards in a row). Update to responsive spans: `xs={24} sm={12} lg={6}`. Chart section similarly: full-width on mobile, side-by-side on desktop.

## Risks / Trade-offs

- **`useBreakpoint` causes hydration flash** — SSR renders with no breakpoint data; client hydrates and may re-render layout. Mitigation: default to desktop layout on SSR (same as current behavior); the flash is a brief sidebar swap on first load on mobile, acceptable for a staff-facing app.
- **Drawer overlay means no persistent nav on mobile** — staff must open the hamburger each time. Mitigation: this is standard mobile UX; the app is primarily desktop/tablet.
- **`responsiveHideColumns` hides by `dataIndex`** — if a column lacks a `dataIndex` (render-only columns), it cannot be targeted. Mitigation: those columns are typically action columns that should always show; document this constraint.
- **No end-to-end automated tests** — per project conventions, there is no test infrastructure. Responsive changes must be verified manually in browser DevTools at each breakpoint.
