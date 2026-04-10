## ADDED Requirements

### Requirement: Room-map modal pre-fills pricing fields from room type defaults on new booking
When the room-map modal is opened for a **vacant** room (no existing booking), the stay form SHALL pre-fill `baseRate`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, and `hourlyExtraPrice` from the room's `roomType.pricing` record. If no pricing record exists, `baseRate` falls back to `room.basePrice`; all other fields default to `0`.

#### Scenario: Vacant room with pricing record — all fields pre-filled
- **WHEN** a vacant room's room type has a `RoomTypePricing` record with all five fields set
- **THEN** the modal form opens with `baseRate = nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, and `hourlyExtraPrice` pre-filled from the record

#### Scenario: Vacant room with no pricing record — nightly falls back to basePrice
- **WHEN** a vacant room's room type has no `RoomTypePricing` record and the room has `basePrice = 400000`
- **THEN** `baseRate = 400000` and all hourly/daily fields default to `0`

#### Scenario: Vacant room with no pricing record and no basePrice — all fields default to 0
- **WHEN** a vacant room's room type has no pricing record and `room.basePrice` is null
- **THEN** all pricing fields in the form default to `0`

#### Scenario: Pre-fill does not affect reserved or checked-in rooms
- **WHEN** the modal is opened for a room with an existing booking (`bookingState !== "none"`)
- **THEN** pricing fields are NOT pre-filled from `roomType.pricing`; instead they come from the booking snapshot (see `booking-pricing-snapshot` spec)

### Requirement: Room API response includes room type pricing record
`GET /api/rooms` (and `/api/rooms/[id]`) SHALL include the `RoomTypePricing` record nested under `roomType.pricing` in the response. If no pricing record exists, `roomType.pricing` SHALL be `null`.

#### Scenario: Room with pricing record returns nested pricing
- **WHEN** `GET /api/rooms` is called and a room's type has a `RoomTypePricing` record
- **THEN** the response includes `room.roomType.pricing.nightlyPrice` (and all other fields)

#### Scenario: Room with no pricing record returns null pricing
- **WHEN** `GET /api/rooms` is called and a room's type has no `RoomTypePricing` record
- **THEN** `room.roomType.pricing` is `null`

### Requirement: Pre-filled values are editable before saving
All pre-filled pricing fields in the room-map modal SHALL remain fully editable. Staff MAY change any pre-filled value before saving the booking. The edited values — not the defaults — SHALL be what is submitted.

#### Scenario: Staff overrides pre-filled nightly rate
- **WHEN** the modal pre-fills `baseRate = 500000` and staff changes it to `450000` before saving
- **THEN** the booking is created with `baseRate = 450000`

#### Scenario: Staff overrides hourly block price
- **WHEN** the modal pre-fills `hourlyBlockPrice = 200000` and staff changes it to `150000`
- **THEN** the booking is saved with `hourlyBlockPrice = 150000`
