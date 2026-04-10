## ADDED Requirements

### Requirement: RoomCard shows booking-state as primary occupancy badge
When a room has a `currentBooking` with a non-`"none"` `bookingState`, the RoomCard SHALL display a booking-state badge as the primary indicator instead of the static room operational status badge.

#### Scenario: Room with checked_in booking shows occupancy badge
- **WHEN** `room.currentBooking?.bookingState === "checked_in"`
- **THEN** RoomCard displays a green "Có khách" badge and uses green (`#52c41a`) as the border color

#### Scenario: Room with reserved booking shows reserved badge
- **WHEN** `room.currentBooking?.bookingState === "reserved"`
- **THEN** RoomCard displays a purple "Đã đặt" badge and uses purple (`#722ed1`) as the border color

#### Scenario: Room with checked_out booking shows checked-out badge
- **WHEN** `room.currentBooking?.bookingState === "checked_out"`
- **THEN** RoomCard displays a grey "Đã trả phòng" badge and uses grey (`#8c8c8c`) as the border color

#### Scenario: Room with no relevant booking falls back to operational status
- **WHEN** `room.currentBooking` is null or `bookingState === "none"`
- **THEN** RoomCard displays the `room.roomStatus.name` badge with `room.roomStatus.color` as border color

### Requirement: Operational housekeeping statuses always remain visible
When a room has no booking-derived occupancy state, its operational status (CLEANING, MAINTENANCE, OUT_OF_SERVICE) SHALL be visible in the RoomCard badge.

#### Scenario: Cleaning room with no booking shows cleaning badge
- **WHEN** `room.currentBooking` is null AND `room.roomStatus.code === "CLEANING"`
- **THEN** RoomCard displays the CLEANING operational status badge with its configured color

#### Scenario: Maintenance room shows maintenance badge regardless of bookings
- **WHEN** `room.roomStatus.code === "MAINTENANCE"` AND `bookingState === "none"`
- **THEN** RoomCard displays the MAINTENANCE operational status badge

### Requirement: Vietnamese room status names in seed
The seed SHALL insert Vietnamese display names for all 6 `RoomStatus` records, and the upsert `update` clause SHALL update `name` and `color` on reseed so names stay current.

#### Scenario: Reseed updates existing Vietnamese names
- **WHEN** `npm run db:seed` is run on a database that already has room status records
- **THEN** the `name` values for all 6 statuses are updated to the configured Vietnamese strings

#### Scenario: Status codes are unchanged after reseed
- **WHEN** `npm run db:seed` is run
- **THEN** all 6 `code` values (`AVAILABLE`, `CLEANING`, `MAINTENANCE`, `OCCUPIED`, `OUT_OF_SERVICE`, `RESERVED`) remain unchanged

### Requirement: Seed rooms use AVAILABLE as default operational status
Rooms whose occupancy is derived from Booking records SHALL be seeded with `roomStatus = AVAILABLE`. Only rooms intentionally representing a non-occupancy operational state (CLEANING, MAINTENANCE) SHALL use those specific codes.

#### Scenario: Occupied rooms correctly seeded as AVAILABLE
- **WHEN** seed runs and rooms 201, 202, 203, 301, 401 have active bookings
- **THEN** those rooms have `roomStatus.code === "AVAILABLE"` in the DB, and their occupancy display comes from `currentBooking.bookingState`

#### Scenario: Rooms with future reservations are AVAILABLE at operational level
- **WHEN** seed runs and rooms 102, 302, 403 have future `CONFIRMED` bookings
- **THEN** those rooms have `roomStatus.code === "AVAILABLE"` in the DB
