## Why

Clicking "Print" on the invoice detail page calls `window.print()` directly, which prints the full app shell — sidebar, header, navigation buttons, and page controls — alongside the invoice data. The result is unusable as a professional document to hand to a guest or file for accounting.

## What Changes

- Add hotel identity fields (`hotelName`, `address`, `phone`, `email`) to `HotelSettings` (DB migration required)
- Extend `GET /api/settings` to return the new hotel info fields
- Create a dedicated `InvoicePrintTemplate` component that renders a clean, print-only invoice document
- Use Tailwind `print:` variants to hide all app chrome (sidebar, header, breadcrumb, action buttons) and show only the template when the browser print dialog fires
- The Print button keeps calling `window.print()` — the DOM restructuring does the rest

## Capabilities

### New Capabilities

- `invoice-print-template`: A print-ready invoice document component that renders hotel info, guest/booking details, service line items, charges summary, and payment history in a professional layout — visible only during printing

### Modified Capabilities

- `hotel-settings`: `HotelSettings` gains optional identity fields (`hotelName`, `address`, `phone`, `email`); the settings API exposes them; no breaking change — all fields are nullable with sensible fallbacks

## Impact

- **Schema**: `prisma/schema.prisma` — add nullable fields to `HotelSettings`; new migration required
- **API**: `app/api/settings/route.ts` — return new fields in GET response
- **New component**: `modules/billing/components/InvoicePrintTemplate.tsx`
- **Modified page**: `app/[locale]/(main)/billing/[id]/page.tsx` — mount template, add `print:hidden` guards to app-chrome elements
- **Layout**: `common/components/layout/MainLayout.tsx` (or equivalent) — add `print:hidden` to sidebar and header so they disappear when printing
- **i18n**: new keys for template labels in `messages/en.json` and `messages/vi.json`
- **No new dependencies** — uses Tailwind print variants and existing data fetching patterns
