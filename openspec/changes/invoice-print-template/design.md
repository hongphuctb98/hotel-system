## Context

The invoice detail page (`app/[locale]/(main)/billing/[id]/page.tsx`) renders the full app shell — Ant Design `Layout` with a fixed `Sider` and sticky `Header` — then calls `window.print()` on button click. The browser captures the entire rendered DOM, so the printed output contains the sidebar, navigation header, breadcrumbs, and action buttons alongside the invoice data.

The `HotelSettings` model currently only stores `timezone`. There is no hotel name, address, or contact info available at runtime for use in documents.

## Goals / Non-Goals

**Goals:**
- Produce a clean, professional invoice document when the user clicks Print — no app chrome visible
- Include hotel identity (name, address, phone, email) in the printed header
- Keep the print button and workflow identical from the user's perspective (`window.print()`)
- Hotel info fields are optional; the template degrades gracefully if not configured

**Non-Goals:**
- PDF export / server-side PDF generation (out of scope; browser print-to-PDF is sufficient)
- A separate settings UI for hotel info (the DB fields are added but the settings page is not built in this change)
- Internationalised invoice language (template renders in the app's current locale)
- Logo image upload

## Decisions

### 1. Print isolation via Tailwind `print:` variants, not a popup window

**Chosen:** Mount `InvoicePrintTemplate` as a hidden sibling inside the page (`hidden print:block`). Add `print:hidden` to `Sider`, `Header`, and the page's own action buttons. `window.print()` fires unchanged.

**Alternative rejected — new window:** `window.open()` a minimal HTML page, serialize invoice data into it, call `print()`. Works in theory but is fragile: popup blockers, serialisation edge cases, no access to React/Tailwind inside the new window, hard to maintain layout parity.

**Why chosen:** Zero new dependencies. Template is a normal React component with full access to hooks and Tailwind. The `print:` Tailwind variant is well supported. Ant Design Layout components accept `className`, so `print:hidden` is trivially applied.

### 2. Ant Design Layout `print:hidden` placement

Apply `className="print:hidden"` directly to Ant Design's `<Sider>` and `<Header>` in `MainLayout`. Ant Design passes unknown props to the underlying DOM element, so the class reaches the `<aside>` and `<header>` tags that the browser sees. The `<Content>` wrapper is left printable so the template inside it renders.

The invoice detail page adds `print:hidden` to its own `<AppPageHeader>` wrapper and the action-button row.

### 3. Hotel info: new nullable columns on `HotelSettings`, exposed via existing `GET /api/settings`

**Chosen:** Add `hotelName String?`, `address String?`, `phone String?`, `email String?` to `HotelSettings`. `GET /api/settings` returns them alongside `timezone`. The template falls back to empty strings / placeholder text when null.

**Alternative rejected — env vars:** Would require redeployment to update hotel name; not operable by hotel staff.

**Alternative rejected — separate `HotelProfile` table:** Unnecessary complexity for four scalar fields on a singleton row.

### 4. Data flow: template receives props, no internal fetching

`InvoicePrintTemplate` is a pure presentational component. The invoice detail page already fetches all invoice data. It also calls a lightweight `useHotelSettings` hook (new, wraps `GET /api/settings`). Both results are passed as props to the template. No extra network calls inside the template.

### 5. `useHotelSettings` as a shared hook

Add `common/hooks/useHotelSettings.ts` — `useQuery` with key `["hotel-settings"]` and `staleTime: Infinity` (settings change rarely). This mirrors the `useMasterData` pattern for stable reference data.

## Risks / Trade-offs

- **Ant Design `className` forwarding** — If a future Ant Design upgrade stops forwarding `className` to the DOM element on `Sider`/`Header`, the sidebar/header will reappear in print. Mitigation: add a targeted `@media print` CSS rule in `globals.css` as a belt-and-suspenders fallback for `.ant-layout-sider` and `.ant-layout-header`.
- **Template renders off-screen but is in DOM** — Screen readers will encounter the hidden template. Mitigation: add `aria-hidden="true"` to the template wrapper.
- **Hotel info not configured on first use** — Template shows empty name/address until an admin saves settings. Mitigation: fallback placeholder text ("Hotel Name") ensures the document doesn't look broken.

## Migration Plan

1. Add nullable fields to `prisma/schema.prisma` → run `npm run db:migrate` → run `npm run db:generate`
2. Deploy API + frontend changes together (additive only — no breaking API changes)
3. Rollback: revert schema fields (nullable, so no data loss); old `window.print()` still works without the template

## Open Questions

- None blocking implementation.
