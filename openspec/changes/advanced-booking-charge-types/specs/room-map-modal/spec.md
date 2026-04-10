## ADDED Requirements

### Requirement: Charge type selector drives conditional form field visibility
The room-map modal form SHALL show or hide fields based on the selected `chargeType`. The `chargeType` Select control is always visible. Fields visible per type:

| Field | nightly | daily | hourly |
|---|---|---|---|
| Check-in Date | ✓ | ✓ | ✓ |
| Check-out Date | ✓ | ✓ (same day) | ✓ |
| Block Hours | ✗ | ✗ | ✓ |
| Block Price | ✗ | ✗ | ✓ |
| Rate per Hour | ✗ | ✗ | ✓ |
| Hours Stayed | ✗ | ✗ | ✓ |

#### Scenario: Selecting hourly shows hourly configuration section
- **WHEN** user changes `chargeType` to `"hourly"`
- **THEN** the Hourly Configuration section (blockHours, blockPrice, ratePerHour, hoursStayed) becomes visible

#### Scenario: Switching from hourly to nightly hides hourly section
- **WHEN** user changes `chargeType` from `"hourly"` to `"nightly"`
- **THEN** the Hourly Configuration section is hidden; other pricing fields remain visible

#### Scenario: Daily stays default check-out to same day as check-in
- **WHEN** user selects `chargeType = "daily"` and the check-out date is after check-in
- **THEN** the form sets `checkOutDate` to match `checkInDate` automatically

### Requirement: Hourly booking fields are saved and prefilled correctly
When `chargeType = "hourly"`, the form SHALL save `hourlyBlockHours`, `hourlyBlockPrice`, and `hourlyRatePerHour` to the booking via the existing `PUT /api/bookings/[id]` route. On modal reopen, these values SHALL be prefilled from `currentBooking`.

#### Scenario: Hourly fields saved on Save Stay
- **WHEN** `chargeType = "hourly"` and staff fills in blockHours=4, blockPrice=200000, ratePerHour=50000 and clicks Save
- **THEN** the booking record has `hourlyBlockHours=4`, `hourlyBlockPrice=200000`, `hourlyRatePerHour=50000`

#### Scenario: Hourly fields prefilled on modal reopen
- **WHEN** a booking with `chargeType = "hourly"` and saved hourly config is reopened
- **THEN** the Hourly Configuration section shows the saved blockHours, blockPrice, and ratePerHour values

### Requirement: Charge type selector is locked after check-in
Once a booking has been checked in (`bookingState = "checked_in"`), the `chargeType` selector SHALL be disabled. Staff cannot change the charge type mid-stay.

#### Scenario: chargeType locked when checked in
- **WHEN** the modal is opened for a room with `bookingState = "checked_in"`
- **THEN** the `chargeType` Select control is disabled

#### Scenario: chargeType editable for reserved bookings
- **WHEN** the modal is opened for a room with `bookingState = "reserved"`
- **THEN** the `chargeType` Select control is enabled
