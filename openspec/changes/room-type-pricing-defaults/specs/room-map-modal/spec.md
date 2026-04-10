## MODIFIED Requirements

### Requirement: Charge type selector drives conditional form field visibility
The room-map modal form SHALL show or hide fields based on the selected `chargeType`. The `chargeType` Select control is always visible. Fields visible per type:

| Field | nightly | daily | hourly |
|---|---|---|---|
| Check-in Date | ✓ | ✓ | ✓ |
| Check-out Date | ✓ | ✓ (same day) | ✓ |
| Rate per Night | ✓ | ✗ | ✗ (used as cap only) |
| Daily Rate | ✗ | ✓ | ✗ |
| Block Hours | ✗ | ✗ | ✓ |
| Block Price | ✗ | ✗ | ✓ |
| Extra Rate per Hour | ✗ | ✗ | ✓ |
| Hours Stayed | ✗ | ✗ | ✓ |

Rate fields for the active charge type are pre-filled from `roomType.pricing` on new bookings or from the booking snapshot on existing bookings. All fields remain manually editable.

#### Scenario: Selecting nightly shows only nightly rate field
- **WHEN** user selects or defaults to `chargeType = "nightly"`
- **THEN** the Rate per Night input is visible; Daily Rate and Hourly Configuration section are hidden

#### Scenario: Selecting daily shows daily rate field
- **WHEN** user selects `chargeType = "daily"`
- **THEN** the Daily Rate input is visible and pre-filled from `roomType.pricing.dailyPrice`; nightly rate and hourly fields are hidden

#### Scenario: Selecting hourly shows hourly configuration section
- **WHEN** user changes `chargeType` to `"hourly"`
- **THEN** the Hourly Configuration section (blockHours, blockPrice, extraRatePerHour, hoursStayed) becomes visible; nightly and daily rate fields are hidden

#### Scenario: Switching from hourly to nightly hides hourly section
- **WHEN** user changes `chargeType` from `"hourly"` to `"nightly"`
- **THEN** the Hourly Configuration section is hidden and Rate per Night is visible

#### Scenario: Daily stays default check-out to same day as check-in
- **WHEN** user selects `chargeType = "daily"` and check-out date is after check-in
- **THEN** the form sets `checkOutDate` to match `checkInDate` automatically

### Requirement: Date fields are validated against charge type constraints
The form SHALL enforce charge-type-specific date rules at submission time using Ant Design `Form.Item` validation rules. These rules block form submission with a visible field error; they do not prevent the user from typing.

- **Daily**: `checkOutDate` MUST equal `checkInDate` (same calendar day). Error: "Daily stays must check out on the same day."
- **Nightly**: `checkOutDate` MUST be strictly after `checkInDate` (at least one calendar day difference). Error: "Nightly stays require at least one overnight."
- **Hourly**: no date-range constraint; any same-day or multi-day range is valid (duration is entered as `hoursStayed`).

#### Scenario: Daily booking with check-out after check-in date blocked on submit
- **WHEN** `chargeType = "daily"` and staff sets `checkOutDate` to the day after `checkInDate` and clicks Save
- **THEN** form submission is blocked and a field error appears on `checkOutDate`: "Daily stays must check out on the same day."

#### Scenario: Nightly booking with same check-in and check-out blocked on submit
- **WHEN** `chargeType = "nightly"` and `checkOutDate === checkInDate` and staff clicks Save
- **THEN** form submission is blocked and a field error appears on `checkOutDate`: "Nightly stays require at least one overnight."

#### Scenario: Valid daily booking submits without error
- **WHEN** `chargeType = "daily"` and `checkOutDate === checkInDate`
- **THEN** no date validation error; form submission proceeds normally

#### Scenario: chargeType switch to daily auto-corrects check-out date
- **WHEN** user switches `chargeType` to `"daily"` and `checkOutDate` is after `checkInDate`
- **THEN** the form automatically sets `checkOutDate = checkInDate` to prevent a validation error on the next save

### Requirement: Base rate is sourced from booking for existing bookings, pricing defaults for new bookings
`baseRate` displayed in the modal SHALL reflect `booking.baseRate` for existing bookings and `roomType.pricing.nightlyPrice ?? room.basePrice` for new bookings.

#### Scenario: New booking pre-fills from pricing defaults
- **WHEN** a vacant room is opened with a room type that has `nightlyPrice = 500000`
- **THEN** the Rate per Night field shows `500000`

#### Scenario: Existing booking shows snapshotted rate
- **WHEN** a booking with `snapshotNightlyPrice = 450000` is opened and current `nightlyPrice = 500000`
- **THEN** the Rate per Night field shows `450000`
