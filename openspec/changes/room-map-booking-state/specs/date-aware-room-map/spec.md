## ADDED Requirements

### Requirement: Rooms API accepts optional date parameter
`GET /api/rooms` SHALL accept an optional `?date=YYYY-MM-DD` query parameter. When present, the `currentBooking` derivation SHALL use a date-overlap query: `checkInDate <= endOfDay(date) AND checkOutDate >= startOfDay(date)` with `bookingStatus.code NOT IN ["CANCELLED", "NO_SHOW"]`. When absent, the existing status-only filter (`PENDING | CONFIRMED | CHECKED_IN`) SHALL be used.

#### Scenario: Date param present — room has overlapping booking
- **WHEN** `GET /api/rooms?date=2025-06-15` is called
- **THEN** rooms whose booking spans June 15 (checkInDate ≤ June 15 ≤ checkOutDate) SHALL have `currentBooking` populated with that booking's data

#### Scenario: Date param present — room has no overlapping booking
- **WHEN** `GET /api/rooms?date=2025-06-15` is called and a room has no booking on that date
- **THEN** that room's `currentBooking` SHALL be `null` and `bookingState` SHALL be `"none"`

#### Scenario: Date param absent — falls back to live status filter
- **WHEN** `GET /api/rooms` is called without a `?date=` param
- **THEN** the endpoint SHALL use status-only filter (`PENDING | CONFIRMED | CHECKED_IN`) as before

#### Scenario: Cancelled / no-show bookings excluded from date query
- **WHEN** `GET /api/rooms?date=2025-06-15` is called
- **THEN** bookings with status `CANCELLED` or `NO_SHOW` SHALL NOT appear as `currentBooking` even if their dates overlap

### Requirement: currentBooking DTO is expanded with all prefill fields
The `currentBooking` field in the Room DTO SHALL include: `id`, `bookingNumber`, `guestId`, `guest.firstName`, `guest.lastName`, `guest.phone`, `guest.idNumber`, `checkInDate`, `checkOutDate`, `ratePerNight`, `depositAmount`, `source`, `note`, `actualCheckIn`, `actualCheckOut`, `bookingStatus.id`, `bookingStatus.code`, `bookingStatus.name`, `bookingStatus.color`, and a server-derived `bookingState` field.

#### Scenario: Active booking includes all guest and pricing fields
- **WHEN** a room has a `CONFIRMED` booking and the DTO is returned
- **THEN** `currentBooking` SHALL contain non-null `guest.phone`, `guest.idNumber`, `ratePerNight`, `depositAmount`, `source`, `note`, `checkInDate`, `checkOutDate`

#### Scenario: No active booking returns null currentBooking
- **WHEN** a room has no active or overlapping booking
- **THEN** `currentBooking` SHALL be `null`

### Requirement: bookingState is derived server-side and included in DTO
The API SHALL compute a `bookingState` string for each room using the following rules in order:
1. `"checked_out"` — `actualCheckOut != null` OR `bookingStatus.code === "CHECKED_OUT"`
2. `"checked_in"` — `actualCheckIn != null` OR `bookingStatus.code === "CHECKED_IN"`
3. `"reserved"` — `bookingStatus.code IN ["CONFIRMED", "PENDING"]`
4. `"none"` — no `currentBooking`

#### Scenario: Booking with actualCheckIn populated yields checked_in state
- **WHEN** `currentBooking.actualCheckIn` is not null
- **THEN** `bookingState` SHALL be `"checked_in"`

#### Scenario: Confirmed booking with no actualCheckIn yields reserved state
- **WHEN** `bookingStatus.code === "CONFIRMED"` and `actualCheckIn` is null
- **THEN** `bookingState` SHALL be `"reserved"`

#### Scenario: No booking yields none state
- **WHEN** `currentBooking` is null
- **THEN** `bookingState` SHALL be `"none"`

### Requirement: Room Map filter bar includes a date picker
`RoomFilterBar` SHALL render an Ant Design `DatePicker` defaulting to today (`dayjs()`). The selected date SHALL be stored as an ISO date string (`YYYY-MM-DD`) in the filter state and passed as `?date=` to `GET /api/rooms`. A clear action SHALL reset the date to today (not remove the date param).

#### Scenario: Default date is today
- **WHEN** the Room Map page is loaded
- **THEN** the date picker SHALL display today's date and the API SHALL be called with `?date=<today>`

#### Scenario: Selecting a future date refreshes the room map
- **WHEN** the receptionist selects a different date in the date picker
- **THEN** `useRoomMap` SHALL re-fetch rooms with the new `?date=` param and the room map SHALL reflect booking states for that date

#### Scenario: Date flows through filter state to API call
- **WHEN** date is updated in `RoomFilterBar`
- **THEN** `useRoomMap` filters SHALL include `date`, `roomService.findAll` SHALL receive it, and the API request SHALL include `?date=YYYY-MM-DD`
