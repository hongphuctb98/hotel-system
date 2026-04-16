## 1. Schema & Migration

- [x] 1.1 Add `hotelName String?`, `address String?`, `phone String?`, `email String?` to the `HotelSettings` model in `prisma/schema.prisma`
- [x] 1.2 Run `npm run db:migrate` to create the migration, then `npm run db:generate` to regenerate the Prisma client

## 2. Settings API

- [x] 2.1 Update `GET /api/settings` in `app/api/settings/route.ts` to read and return `hotelName`, `address`, `phone`, and `email` from the `HotelSettings` row (return `null` for unset fields, not omit them)

## 3. Hotel Settings Hook

- [x] 3.1 Create `common/hooks/useHotelSettings.ts` — `useQuery` with key `["hotel-settings"]`, `staleTime: Infinity`, fetching `GET /api/settings`; export a `HotelSettings` type with `timezone`, `hotelName`, `address`, `phone`, `email` (all nullable except timezone)

## 4. Print CSS — Hide App Chrome

- [x] 4.1 Add `className="print:hidden"` to the Ant Design `<Sider>` element in `common/components/layout/MainLayout.tsx`
- [x] 4.2 Add `className="print:hidden"` to the Ant Design `<Header>` element in `common/components/layout/MainLayout.tsx`
- [x] 4.3 Add a belt-and-suspenders `@media print` rule in `app/globals.css` (or equivalent global stylesheet) hiding `.ant-layout-sider` and `.ant-layout-header` in case Ant Design stops forwarding `className`

## 5. Invoice Print Template Component

- [x] 5.1 Create `modules/billing/components/InvoicePrintTemplate.tsx` as a `"use client"` component — accepts props: `invoice` (full invoice with booking, guest, room, services, payments), `hotelSettings` (from `useHotelSettings`); wrapper div has `hidden print:block` and `aria-hidden="true"`
- [x] 5.2 Implement the template header section: hotel name (fallback "Hotel Name"), address, phone, email — left-aligned; invoice title "INVOICE", invoice number, issued date, and paid/unpaid status badge — right-aligned
- [x] 5.3 Implement the guest & booking section: two-column row showing guest name, booking number, room number + type, check-in → check-out dates
- [x] 5.4 Implement the services table section (rendered only when `booking.services.length > 0`): columns Description, Date, Qty, Unit Price, Total — using plain `<table>` with print-safe styling (no Ant Design Table)
- [x] 5.5 Implement the charges summary section: rows for Subtotal, Tax, Discount (only when > 0), a separator line, Total (bold), Paid, Outstanding (only when > 0)
- [x] 5.6 Implement the payment history section (rendered only when `invoice.payments.length > 0`): columns Date, Method, Reference, Amount — using plain `<table>`
- [x] 5.7 All monetary values in the template MUST use `useLocaleCurrency().format()` for consistent formatting

## 6. Wire Template into Invoice Detail Page

- [x] 6.1 In `app/[locale]/(main)/billing/[id]/page.tsx`, call `useHotelSettings()` and pass the result alongside `invoice` to `<InvoicePrintTemplate>`
- [x] 6.2 Mount `<InvoicePrintTemplate invoice={invoice} hotelSettings={hotelSettings?.data} />` as a sibling of the main content grid (inside the page's root `<div>`)
- [x] 6.3 Wrap the page's `<AppPageHeader>` and the action-button row in a `<div className="print:hidden">` so they disappear when printing

## 7. i18n

- [x] 7.1 Add the following keys to `messages/en.json` under `"billing"`: `"printInvoice": "INVOICE"`, `"printIssuedAt": "Issued"`, `"printGuest": "Guest"`, `"printBooking": "Booking"`, `"printRoom": "Room"`, `"printStay": "Stay"`, `"printServices": "Services"`, `"printPaymentHistory": "Payment History"`, `"printThankYou": "Thank you for staying with us"`
- [x] 7.2 Add matching Vietnamese translations for all new keys to `messages/vi.json`
