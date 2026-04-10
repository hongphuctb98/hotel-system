## ADDED Requirements

### Requirement: Modal derives state from bookingState DTO field
`RoomDetailModal` SHALL use `room.currentBooking.bookingState` (from the DTO) as the primary source of truth for determining footer actions, info bar content, and form editability. The legacy `getStatusType()` keyword-match function SHALL be removed.

#### Scenario: bookingState none — empty editable form, Check In footer
- **WHEN** `room.currentBooking` is null (bookingState is "none")
- **THEN** the form SHALL be empty and fully editable, and the footer SHALL show Check In + Close buttons

#### Scenario: bookingState reserved — prefilled editable form, Check In + View footer
- **WHEN** `bookingState === "reserved"`
- **THEN** the form SHALL be prefilled with booking data but remain editable, and the footer SHALL show View + Check In + Close buttons

#### Scenario: bookingState checked_in — disabled form, Check Out + Edit + Close footer
- **WHEN** `bookingState === "checked_in"`
- **THEN** all form inputs SHALL be disabled, and the footer SHALL show Check Out + Edit + Close buttons

#### Scenario: bookingState checked_out — disabled form, Close-only footer
- **WHEN** `bookingState === "checked_out"`
- **THEN** all form inputs SHALL be disabled, and the footer SHALL show only the Close button

### Requirement: Modal fetches full booking on open and prefills form
When `room.currentBooking` is present, `RoomDetailModal` SHALL call `bookingService.findById(currentBooking.id)` via `useQuery` on mount. A `Spin` overlay SHALL be shown while loading. Once the full booking record is loaded, the form SHALL be prefilled with: `customerName` (firstName + lastName), `phone`, `idNumber`, `source`, `chargeType` (parsed from `[META] chargeType=X` in note), `checkInDate` (as Dayjs), `checkOutDate` (as Dayjs), `prepaid` (depositAmount), and `note` (with META line stripped or preserved — consistent with existing META approach).

#### Scenario: Spin shown while booking loads
- **WHEN** the modal opens and a booking fetch is in progress
- **THEN** a Spin overlay SHALL cover the modal body

#### Scenario: Form fields prefilled after booking loads
- **WHEN** `bookingService.findById` resolves successfully
- **THEN** `form.setFieldsValue` SHALL be called with all available booking fields

#### Scenario: chargeType extracted from META note
- **WHEN** `note` contains `[META] chargeType=hourly`
- **THEN** the `chargeType` form field SHALL be set to `"hourly"`

#### Scenario: chargeType defaults to nightly when META absent
- **WHEN** `note` does not contain a `[META] chargeType=` token
- **THEN** the `chargeType` form field SHALL default to `"nightly"`

#### Scenario: Walk-in flow unaffected when no currentBooking
- **WHEN** `room.currentBooking` is null
- **THEN** no booking fetch SHALL be triggered and the form SHALL remain empty for walk-in entry

### Requirement: Info bar shows booking reference and guest from DTO
The Room Map info bar SHALL display booking state information sourced from `currentBooking` DTO fields (not room status text). It SHALL show the booking number and guest name when available.

#### Scenario: Info bar shows no-booking tag for state none
- **WHEN** `bookingState === "none"`
- **THEN** the info bar SHALL show a neutral "No Booking" tag

#### Scenario: Info bar shows booking number for reserved state
- **WHEN** `bookingState === "reserved"`
- **THEN** the info bar SHALL show a blue tag with "Reserved · {bookingNumber}"

#### Scenario: Info bar shows guest name for checked-in state
- **WHEN** `bookingState === "checked_in"`
- **THEN** the info bar SHALL show a green tag with "Checked In · {bookingNumber} · {guest.firstName} {guest.lastName}"

#### Scenario: Info bar shows checked-out label
- **WHEN** `bookingState === "checked_out"`
- **THEN** the info bar SHALL show a gray tag with "Checked Out · {bookingNumber}"
