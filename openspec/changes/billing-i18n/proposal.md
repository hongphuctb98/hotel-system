## Why

The billing module was built incrementally and contains numerous hardcoded English strings scattered across four files. These strings are invisible to next-intl and will never switch languages, breaking the app's Vietnamese locale support for all billing screens.

## What Changes

- Add 16 missing i18n keys to `messages/en.json` and `messages/vi.json` under the `billing` namespace
- Replace every hardcoded string literal in the billing module with the corresponding `t()` call
- Reuse existing keys from other namespaces (`common`, `booking`) where the meaning is identical — no duplication

## Capabilities

### New Capabilities

*(none — this is a pure refactor with no new user-visible behaviour)*

### Modified Capabilities

- `billing-i18n`: All visible text in the billing list page, invoice detail page, payment modal, and invoice print template is now driven by `messages/*.json`

## Impact

**Files with hardcoded strings to fix:**

| File | Hardcoded strings |
|------|-------------------|
| `app/[locale]/(main)/billing/page.tsx` | "Issued" (column title) |
| `app/[locale]/(main)/billing/[id]/page.tsx` | Payment column titles (Date, Method, Reference, Amount); service column titles (Description, Date, Qty, Total); AppCard titles (Invoice Details, Services, Payment History, Summary); Descriptions.Item labels (Invoice #, Status, Issued, Booking #, Guest, Room, Stay); "Back" button; "No payments recorded yet."; "Outstanding", "Paid" |
| `modules/billing/components/PaymentModal.tsx` | `message.success("Payment recorded")`; form field labels "Amount", "Reference / Note" |
| `modules/billing/components/InvoicePrintTemplate.tsx` | Table column headers (Description, Date, Qty, Unit Price, Total, Method, Reference, Amount); fallback "Hotel Name" |

**New keys added (all under `billing` namespace):** `issuedAt`, `back`, `invoiceDetails`, `paymentHistory`, `summary`, `outstanding`, `noPayments`, `paymentRecorded`, `amount`, `reference`, `referenceNote`, `description`, `qty`, `methodLabel`, `stay`, `hotelNameFallback`

**Keys reused from other namespaces** (no new key needed): `billing.invoiceNumber`, `billing.unitPrice`, `billing.total`, `billing.paid`, `common.status`, `booking.bookingNumber`, `booking.guest`, `booking.room`, `booking.servicesSection`

**No API, schema, or routing changes.**
