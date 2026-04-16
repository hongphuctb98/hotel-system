## Context

The billing module spans four files with hardcoded English strings that were added during iterative feature development. next-intl's `useTranslations` hook is already imported in all affected components but is simply not called for these strings. The `messages/en.json` and `messages/vi.json` files already have a well-populated `billing` namespace; this change extends it with the missing keys.

## Goals / Non-Goals

**Goals:**
- Every user-visible string in the billing module resolves through `t()` for both `en` and `vi` locales
- Reuse existing keys from `common` and `booking` namespaces where meaning is identical

**Non-Goals:**
- Changing any visual layout or component structure
- Translating error messages that originate from server responses (those are API-side concerns)
- Translating placeholder text in form inputs (placeholders are UX hints, not UI labels; they are out of scope)

## Decisions

### 1. Namespace strategy: extend `billing`, reuse `common`/`booking` where exact-match

New keys go under `billing` unless an identical-meaning key already exists in another namespace. Specifically:
- `billing.invoiceNumber` ("Invoice #") is reused for the Descriptions.Item label
- `billing.unitPrice` and `billing.total` are reused for service table column headers
- `billing.paid` is reused for the summary "Paid" row
- `common.status` is reused for the Status Descriptions.Item label
- `booking.bookingNumber`, `booking.guest`, `booking.room`, `booking.servicesSection` are reused in the detail page

**Rejected:** creating duplicate keys like `billing.guestLabel` when `booking.guest` already exists with the same value.

### 2. `message.success` / `message.error` in PaymentModal

`message.success("Payment recorded")` is the only hardcoded feedback string in a hook call site. It is replaced with `t("billing.paymentRecorded")`. The `t` function is already available in `PaymentModal` via `useTranslations`.

### 3. Print template column headers

The print template (`InvoicePrintTemplate`) hardcodes table headers as JSX string literals inside helper components (`<Th>`). These are replaced with `t()` calls using the same shared `billing` keys (e.g., `billing.description`, `billing.qty`, `billing.methodLabel`). Since the component already calls `useTranslations("billing")`, no structural change is needed.

### 4. `"Hotel Name"` fallback in print template

This fallback is shown when `hotelSettings.hotelName` is null. It becomes `t("billing.hotelNameFallback")` so it can be translated.

## Risks / Trade-offs

- **Key reuse across namespaces** — using `booking.guest` inside a billing component is a minor cross-namespace dependency. Risk is low: these are stable, semantic keys unlikely to change meaning.
- **`t()` call count** — adding ~16 `t()` calls to components that already call `useTranslations` has zero performance impact; next-intl resolves keys synchronously from a pre-loaded message object.

## Migration Plan

1. Add all new keys to both message files
2. Update each file — changes are isolated substitutions with no logic impact
3. No server restart required (next-intl hot-reloads message files)

## Open Questions

None.
