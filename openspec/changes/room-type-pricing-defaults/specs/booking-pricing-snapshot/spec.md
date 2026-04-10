## MODIFIED Requirements

### Requirement: Booking pricing state is frozen in existing `baseRate`, `chargeType`, and hourly fields — no new snapshot columns
The system SHALL treat the following existing `Booking` fields as the complete, immutable pricing state once a booking is created:
- `baseRate` — the agreed unit price (per-night rate / day rate / block price depending on `chargeType`)
- `chargeType` — the billing mode (`"nightly"` | `"daily"` | `"hourly"`)
- `hourlyBlockHours` — number of hours in the block (hourly only)
- `hourlyRatePerHour` — extra rate per hour beyond the block (hourly only)

These fields SHALL NOT be overwritten after first save by any master data (`RoomTypePricing`) change. No new snapshot columns are added to `Booking`.

#### Scenario: Admin changes room type pricing after booking exists — booking unaffected
- **WHEN** an admin updates `RoomTypePricing.nightlyPrice` for a room type
- **AND** a booking already exists with `baseRate = 450000`
- **THEN** the booking's `baseRate` remains `450000`; the new default is only used for future new bookings

#### Scenario: Booking fields written at first save are stable across subsequent saves
- **WHEN** staff re-opens a booking and saves again via Save Stay (editing only a note)
- **THEN** `baseRate`, `chargeType`, and hourly fields remain unchanged

### Requirement: System MUST NOT re-query master data pricing for an existing booking
When the room-map modal is opened for a room with an existing booking (`currentBooking` non-null), the form SHALL source all pricing fields exclusively from `booking.*` columns. It SHALL NOT read `room.roomType.pricing`. This is enforced in `useRoomModalForm`.

#### Scenario: Form pre-fills from booking fields, not master data, on reopen
- **WHEN** the modal is opened for a room with `bookingState !== "none"`
- **THEN** `baseRate`, `chargeType`, `hourlyBlockHours`, `hourlyRatePerHour` come from the `currentBooking` record
- **AND** `room.roomType.pricing` is not consulted

#### Scenario: Pre-fill from master data only on new booking
- **WHEN** the modal is opened for a vacant room (no `currentBooking`)
- **THEN** `baseRate` is sourced from `room.roomType.pricing` (falling back to `room.basePrice`)

### Requirement: Manual override of a pre-filled field becomes the saved value
If staff edits any pre-filled pricing field before saving, the edited value is what is written to the booking. The booking stores what was actually agreed — not the original master default.

#### Scenario: Staff overrides pre-filled rate before saving reservation
- **WHEN** the form pre-fills `baseRate = 500000` from room type pricing
- **AND** staff changes it to `450000` and clicks Save Reservation
- **THEN** `booking.baseRate = 450000` is persisted

#### Scenario: Override on Save Stay does NOT update baseRate
- **WHEN** a booking already has `baseRate = 450000`
- **AND** the form shows `450000` and staff does not change it before clicking Save Stay
- **THEN** `baseRate` remains `450000` (no change written for unchanged field)

### Requirement: `buildStayPriceInput` helper constructs calculation input from a booking record
The `common/utils/stayPricing.ts` utility SHALL export a `buildStayPriceInput` function that takes a booking's frozen pricing fields and returns the correct `StayPriceInput` discriminated union for `calculateStayPrice`. This is the canonical bridge between the data model and the calculation layer.

For `chargeType = "hourly"`, `baseRate` is mapped to `blockPrice` in the input (D5 — `baseRate` is the block price for hourly).

#### Scenario: nightly booking input built correctly
- **WHEN** `buildStayPriceInput({ chargeType: "nightly", baseRate: 500000, checkInDate: "2026-04-10", checkOutDate: "2026-04-13" })` is called
- **THEN** it returns `{ chargeType: "nightly", baseRate: 500000, nights: 3 }`

#### Scenario: hourly booking input maps baseRate to blockPrice
- **WHEN** `buildStayPriceInput({ chargeType: "hourly", baseRate: 200000, hourlyBlockHours: 4, hourlyRatePerHour: 50000 }, 6)` is called
- **THEN** it returns `{ chargeType: "hourly", blockPrice: 200000, blockHours: 4, ratePerHour: 50000, hoursStayed: 6 }`

#### Scenario: daily booking input built correctly
- **WHEN** `buildStayPriceInput({ chargeType: "daily", baseRate: 300000, checkInDate: "2026-04-10", checkOutDate: "2026-04-10" })` is called
- **THEN** it returns `{ chargeType: "daily", baseRate: 300000 }`
