## ADDED Requirements

### Requirement: Print button produces a clean invoice document
When the user clicks Print on the invoice detail page, the browser print dialog SHALL capture only the invoice template — no sidebar, header, breadcrumb, action buttons, or other app chrome SHALL appear in the printed output.

#### Scenario: Sidebar hidden during print
- **WHEN** the user triggers the browser print dialog from the invoice detail page
- **THEN** the application sidebar SHALL NOT be visible in the printed output

#### Scenario: Header hidden during print
- **WHEN** the user triggers the browser print dialog from the invoice detail page
- **THEN** the application header SHALL NOT be visible in the printed output

#### Scenario: Action buttons hidden during print
- **WHEN** the user triggers the browser print dialog from the invoice detail page
- **THEN** the Back, Print, and Pay Now buttons SHALL NOT be visible in the printed output

#### Scenario: Invoice template visible during print
- **WHEN** the user triggers the browser print dialog from the invoice detail page
- **THEN** the dedicated `InvoicePrintTemplate` component SHALL be the only content visible

---

### Requirement: Invoice template contains hotel identity
The printed invoice template SHALL display the hotel's name, address, phone, and email in a header section at the top of the document. When hotel info fields are not configured in settings, the template SHALL fall back to placeholder text so the document structure remains intact.

#### Scenario: Hotel info configured
- **WHEN** `hotelName`, `address`, `phone`, and `email` are saved in hotel settings
- **THEN** all four values SHALL appear in the template header

#### Scenario: Hotel info not configured
- **WHEN** one or more hotel info fields are null in hotel settings
- **THEN** the template SHALL render a placeholder (e.g., "Hotel Name") for missing fields rather than leaving a blank gap

---

### Requirement: Invoice template contains guest and booking information
The printed invoice template SHALL display the guest's full name and the booking details — room number, room type, check-in date, check-out date, and booking number.

#### Scenario: Full booking details rendered
- **WHEN** the invoice has an associated booking with guest and room data
- **THEN** guest name, room number, room type, check-in date, check-out date, and booking number SHALL all appear in the template

---

### Requirement: Invoice template contains service line items
If the booking has services, the printed template SHALL display a table of service line items showing description, date, quantity, unit price, and line total. If there are no services, the section SHALL be omitted.

#### Scenario: Services present
- **WHEN** the booking has one or more services
- **THEN** a services table SHALL appear with columns: Description, Date, Qty, Unit Price, Total

#### Scenario: No services
- **WHEN** the booking has no services
- **THEN** the services section SHALL be omitted from the printed template

---

### Requirement: Invoice template contains charges summary
The printed template SHALL display a summary section showing subtotal, tax amount, discount amount (only if non-zero), total amount, amount paid, and outstanding balance (only if greater than zero).

#### Scenario: Full summary rendered
- **WHEN** the invoice has subtotal, tax, and total values
- **THEN** all three SHALL appear in the summary section

#### Scenario: Discount shown only when non-zero
- **WHEN** `discountAmount` is zero
- **THEN** the discount row SHALL be omitted from the summary

#### Scenario: Outstanding shown only when unpaid
- **WHEN** `outstanding` is greater than zero
- **THEN** the outstanding balance row SHALL appear in the summary

#### Scenario: Outstanding hidden when fully paid
- **WHEN** the invoice is fully paid (`outstanding` equals zero)
- **THEN** the outstanding balance row SHALL NOT appear

---

### Requirement: Invoice template contains payment history
The printed template SHALL display a table of recorded payments showing date, payment method, reference, and amount. If no payments have been recorded, this section SHALL be omitted.

#### Scenario: Payments present
- **WHEN** the invoice has one or more payments
- **THEN** a payment history table SHALL appear with columns: Date, Method, Reference, Amount

#### Scenario: No payments
- **WHEN** no payments have been recorded
- **THEN** the payment history section SHALL be omitted from the printed template
