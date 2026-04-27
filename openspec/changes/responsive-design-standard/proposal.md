## Why

The hotel management system currently has no consistent responsive design standard — pages are built for desktop only, breaking on tablets and mobile devices used by housekeeping and front-desk staff on the floor. Establishing a clear mobile / tablet / PC breakpoint system and applying it across all existing pages will ensure usable interfaces for all staff roles on any device.

## What Changes

- Define a project-wide responsive breakpoint standard (mobile ≤ 768 px, tablet 769–1024 px, desktop ≥ 1025 px) using Tailwind's `sm`/`md`/`lg` prefixes and Ant Design's `useBreakpoint` hook
- Refactor all primary page layouts (sidebar, header, page containers) to collapse and adapt at the defined breakpoints
- Update `AppTable` usage across all modules to enable horizontal scroll on small screens and hide low-priority columns below tablet width
- Update form drawers and modals to use full-screen or near-full-screen layouts on mobile
- Update the navigation sidebar to collapse into a drawer/hamburger on mobile and tablet
- Add responsive grid layouts to Dashboard KPI cards and chart sections
- Apply breakpoint-aware layouts to Rooms, Bookings, Guests, Billing, Inventory, and Master Data pages

## Capabilities

### New Capabilities

- `responsive-layout`: Project-wide responsive layout standard — breakpoints, sidebar collapse, page container constraints, and shared responsive utilities
- `responsive-tables`: Tables adapt to small screens with horizontal scroll, column priority hiding, and compact row density on mobile
- `responsive-forms`: Drawers and modals adopt full-screen layout on mobile; form field columns stack vertically below tablet

### Modified Capabilities

<!-- No existing specs change their behavioral requirements — this is a new cross-cutting layout capability -->

## Impact

- `common/components/layout/` — MainLayout, AppSidebar, AppHeader (responsive sidebar collapse)
- `common/components/ui/AppTable.tsx` — horizontal scroll defaults, breakpoint-aware column visibility
- `common/components/ui/AppModal.tsx`, `AppDrawer.tsx` — responsive width/height
- All module pages under `app/[locale]/(main)/` — layout containers updated
- `modules/dashboard/` — KPI cards and chart grid made responsive
- Tailwind config — ensure `sm`, `md`, `lg` breakpoints align with the standard
- No API changes, no schema changes, no new dependencies
