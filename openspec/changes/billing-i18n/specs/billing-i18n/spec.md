## ADDED Requirements

### Requirement: Billing list page renders no hardcoded strings
Every visible text string on the billing list page (`/billing`) SHALL be resolved through `useTranslations`. No string literal in JSX or column config SHALL be English-only.

#### Scenario: Issued column title in vi locale
- **WHEN** the app locale is `vi`
- **THEN** the "Issued" column header SHALL display `"Ngày xuất"` (from `billing.issuedAt`)

---

### Requirement: Invoice detail page renders no hardcoded strings
Every visible text string on the invoice detail page (`/billing/[id]`) SHALL be resolved through `useTranslations`. This includes column titles, card titles, description labels, button text, and inline messages.

#### Scenario: Payment history column titles in vi locale
- **WHEN** the app locale is `vi`
- **THEN** columns Date, Method, Reference, Amount SHALL display their Vietnamese translations

#### Scenario: Service column titles in vi locale
- **WHEN** the app locale is `vi`
- **THEN** columns Description, Date, Qty, Unit Price, Total SHALL display their Vietnamese translations

#### Scenario: AppCard titles in vi locale
- **WHEN** the app locale is `vi`
- **THEN** cards "Invoice Details", "Services", "Payment History", "Summary" SHALL display their Vietnamese translations

#### Scenario: Descriptions.Item labels in vi locale
- **WHEN** the app locale is `vi`
- **THEN** labels Invoice #, Status, Issued, Booking #, Guest, Room, Stay SHALL display their Vietnamese translations

#### Scenario: Back button in vi locale
- **WHEN** the app locale is `vi`
- **THEN** the Back button SHALL display `"Quay lại"` (from `billing.back`)

#### Scenario: Empty payment history message in vi locale
- **WHEN** no payments exist and the locale is `vi`
- **THEN** the empty-state text SHALL display the Vietnamese translation (from `billing.noPayments`)

#### Scenario: Outstanding label in vi locale
- **WHEN** the invoice has an outstanding balance and the locale is `vi`
- **THEN** the "Outstanding" label SHALL display its Vietnamese translation (from `billing.outstanding`)

---

### Requirement: Payment modal renders no hardcoded strings
Every label and feedback message in `PaymentModal` SHALL be resolved through `useTranslations`.

#### Scenario: Amount field label in vi locale
- **WHEN** the app locale is `vi` and the payment modal is open
- **THEN** the amount field label SHALL display `"Số tiền"` (from `billing.amount`)

#### Scenario: Reference/Note field label in vi locale
- **WHEN** the app locale is `vi` and the payment modal is open
- **THEN** the reference field label SHALL display its Vietnamese translation (from `billing.referenceNote`)

#### Scenario: Success toast in vi locale
- **WHEN** a payment is successfully recorded and the locale is `vi`
- **THEN** the success toast SHALL display the Vietnamese translation (from `billing.paymentRecorded`)

---

### Requirement: Invoice print template renders no hardcoded strings
Every user-visible text string in `InvoicePrintTemplate` SHALL be resolved through `useTranslations`. This includes table column headers and the hotel name fallback.

#### Scenario: Service table column headers in vi locale
- **WHEN** the app locale is `vi` and the print template renders
- **THEN** column headers Description, Date, Qty, Unit Price, Total SHALL display their Vietnamese translations

#### Scenario: Payment table column headers in vi locale
- **WHEN** the app locale is `vi` and the print template renders
- **THEN** column headers Date, Method, Reference, Amount SHALL display their Vietnamese translations

#### Scenario: Hotel name fallback in vi locale
- **WHEN** `hotelSettings.hotelName` is null and the locale is `vi`
- **THEN** the fallback SHALL display the Vietnamese translation of "Hotel Name" (from `billing.hotelNameFallback`)

---

### Requirement: All new billing i18n keys are present in both locale files
The `messages/en.json` and `messages/vi.json` files SHALL each contain all 16 new keys under the `billing` namespace: `issuedAt`, `back`, `invoiceDetails`, `paymentHistory`, `summary`, `outstanding`, `noPayments`, `paymentRecorded`, `amount`, `reference`, `referenceNote`, `description`, `qty`, `methodLabel`, `stay`, `hotelNameFallback`.

#### Scenario: No missing-message warning at runtime
- **WHEN** any billing page renders in either `en` or `vi` locale
- **THEN** next-intl SHALL NOT emit a `MISSING_MESSAGE` console warning for any `billing.*` key
