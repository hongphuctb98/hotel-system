## ADDED Requirements

### Requirement: Modal replaces drawer
The Room Map SHALL open a centered `Modal` component (not a side drawer) when a room card is clicked.

#### Scenario: Modal opens centered
- **WHEN** a user clicks any room card on the Room Map
- **THEN** a centered modal opens with a dark overlay, width `min(950px, 95vw)`, and a close button at the top-right corner

#### Scenario: Drawer no longer opens
- **WHEN** a user clicks any room card on the Room Map
- **THEN** the right-side drawer does NOT appear

#### Scenario: Modal closes
- **WHEN** the user clicks the close button, the X icon, or presses Escape
- **THEN** the modal closes and the Room Map is visible without a dark overlay

---

### Requirement: Modal header shows room identity and status badge
The modal header SHALL display the room number, floor name, room type name, and a colored status badge.

#### Scenario: Header content
- **WHEN** the modal is open for a given room
- **THEN** the header shows the room number prominently, followed by floor name and room type name, and a Tag/Badge with a status-specific color

#### Scenario: Status badge colors
- **WHEN** the room status name contains "Available" (case-insensitive)
- **THEN** the badge color is green (`#52c41a`)

#### Scenario: Occupied badge
- **WHEN** the room status name contains "Occupied"
- **THEN** the badge color is blue (`#1677ff`)

#### Scenario: Reserved badge
- **WHEN** the room status name contains "Reserved"
- **THEN** the badge color is purple (`#722ed1`)

#### Scenario: Cleaning badge
- **WHEN** the room status name contains "Cleaning"
- **THEN** the badge color is orange (`#fa8c16`)

#### Scenario: Maintenance badge
- **WHEN** the room status name contains "Maintenance"
- **THEN** the badge color is red (`#f5222d`)

---

### Requirement: Modal body sections
The modal body SHALL contain five sections: Room Information, Guest / Check-in Information, Pricing & Services, Payment, Note.

#### Scenario: All five sections visible
- **WHEN** the modal is open
- **THEN** all five sections are rendered in order within the modal body

#### Scenario: View-only mode for non-actionable rooms
- **WHEN** the room status name contains "Cleaning" or "Maintenance"
- **THEN** all form inputs in all sections are disabled and the footer shows only a Close button

---

### Requirement: Room Information section
The Room Information section SHALL display room number, floor, room type, status, and the current booking state as read-only fields. Receptionists must be able to see at a glance whether the room has no booking, has a booking that has not yet been checked in, or is already checked in and occupied.

#### Scenario: Read-only display
- **WHEN** the modal is open
- **THEN** Room Number, Floor, Room Type, and Status are shown as labelled, non-editable fields

#### Scenario: No booking
- **WHEN** the room has no current booking (`currentBooking` is null)
- **THEN** the section shows a "No booking" indicator (e.g., a muted tag or text)

#### Scenario: Booked but not yet checked in
- **WHEN** the room has a current booking AND the booking status does NOT indicate the guest is checked in (e.g., status is Confirmed or Reserved)
- **THEN** the section shows the booking reference number and a badge or label indicating "Booked – not checked in"

#### Scenario: Already checked in / occupied
- **WHEN** the room has a current booking AND the booking status indicates the guest is already checked in (e.g., status is Checked-In or Occupied)
- **THEN** the section shows the booking reference number, guest name, and a badge or label indicating "Checked In"

---

### Requirement: Guest / Check-in Information section
The section SHALL contain fields: Customer Name, Phone Number, CCCD/ID Number, Booking Source, Rental/Charge Type (select: Nightly / Hourly / Daily), Check-in Time, Check-out Time, Note. Customer Name, Phone Number, and CCCD/ID Number are the core guest identity fields — they are used for guest search, auto-fill, deduplication, and new guest creation.

#### Scenario: Required fields validation
- **WHEN** the user clicks Check In without filling Customer Name, Check-in Time, or Check-out Time
- **THEN** inline validation errors appear on those fields and the form does NOT submit

#### Scenario: Guest search auto-fill
- **WHEN** the user types at least 2 characters in the Customer Name, Phone, or CCCD field
- **THEN** a dropdown of matching guests from the guest master appears
- **WHEN** the user selects a guest from the dropdown
- **THEN** Customer Name, Phone, and CCCD are auto-filled with the selected guest's data and those fields become read-only until the user explicitly clears the selection

#### Scenario: Manual input when no guest selected
- **WHEN** no guest is selected from the dropdown
- **THEN** Customer Name, Phone, and CCCD are free-text editable fields

---

### Requirement: Pricing & Services section
The section SHALL show a dynamic list of service rows and a calculated payment summary. Each service row's unit price is taken from the selected service item in master data (read-only, not manually editable). Quantity is entered by the user. Line Total = Unit Price × Quantity, calculated automatically.

#### Scenario: Add service row
- **WHEN** the user clicks the Add Row button
- **THEN** a new row with a Service select, Quantity input, Unit Price display (read-only, from master data), and Line Total display (read-only, computed) is appended to the list

#### Scenario: Remove service row
- **WHEN** the user clicks the Delete button on a service row
- **THEN** that row is removed and totals recalculate

#### Scenario: Unit price populated from master data
- **WHEN** the user selects a service item in a row
- **THEN** the Unit Price field is automatically set to `ServiceItem.price` from master data and is not editable by the user

#### Scenario: Line total calculation
- **WHEN** the user selects a service item or changes the quantity for a row
- **THEN** Line Total = Unit Price (from master data) × Quantity (entered by user) is shown in that row and updates immediately

#### Scenario: Summary totals
- **WHEN** any service row is changed
- **THEN** Service Total = sum of all line totals; Total Payable = Room Price + Service Total + Surcharge − Discount; Remaining Amount = Total Payable − Prepaid Amount are updated immediately

#### Scenario: Currency formatting
- **WHEN** any monetary value is displayed
- **THEN** it is formatted using the project's `PriceDisplay` component or equivalent locale-aware formatting

---

### Requirement: Payment section
The section SHALL contain fields: Payment Status, Payment Method, Total Payable (read-only), Prepaid Amount (input), Remaining Amount (read-only). Payment Method options are loaded from master data. Payment Status and all calculated payment values (Total Payable, Remaining Amount) are derived from the current check-in form state — they are not fetched from an existing record.

#### Scenario: Payment method options
- **WHEN** the Payment Method select is focused
- **THEN** the options match the PaymentMethod master data records

#### Scenario: Total Payable and Remaining Amount are computed
- **WHEN** the user changes Prepaid Amount
- **THEN** Remaining Amount = Total Payable − Prepaid Amount updates immediately

---

### Requirement: Note section
The section SHALL contain a free-text textarea for receptionist remarks.

#### Scenario: Note is optional
- **WHEN** the user submits without entering a note
- **THEN** the form submits successfully (note is not required)

---

### Requirement: Footer actions by room status
The footer SHALL show only the action buttons that are valid for the room's current status. Actions that are not valid for the current status MUST NOT be rendered — they must not appear as disabled buttons.

#### Scenario: Available room footer
- **WHEN** the modal is open for an Available room
- **THEN** the footer shows exactly: a primary "Check In" button and a "Close" button — no other action buttons appear

#### Scenario: Occupied room footer
- **WHEN** the modal is open for an Occupied room
- **THEN** the footer shows exactly: a "Check Out" button, an "Edit" button (navigates to Reservations detail page), and a "Close" button — no "Check In" button appears

#### Scenario: Reserved room footer
- **WHEN** the modal is open for a Reserved room
- **THEN** the footer shows exactly: a "View" button, a "Check In" button, and a "Close" button — no "Check Out" button appears

#### Scenario: Cleaning or Maintenance room footer
- **WHEN** the modal is open for a Cleaning or Maintenance room
- **THEN** the footer shows only a "Close" button — no other action buttons appear — and all form inputs in the modal body are disabled
