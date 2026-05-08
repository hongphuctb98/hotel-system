## MODIFIED Requirements

### Requirement: Booking creation is handled by room-map, not the reservations page
The reservations page SHALL NOT include a "New Booking" button or create-booking flow. Booking creation remains in the room-map module.

#### Scenario: Reservations page has no create-booking entry point
- **GIVEN** staff is on the reservations page
- **THEN** no "New Booking" button or create-booking flow is present on the page

## ADDED Requirements

### Requirement: Room availability check excludes rooms committed to long-term leases
The system SHALL reject a short-term booking (create **or** update) for any room that is blocked by a `LeaseContract`. The same check applies when staff changes a booking's room or dates via `PUT /api/bookings/[id]`.

A room is considered **blocked** when **either** condition holds:

**Condition A — active lease overlap:** Room has a `LeaseContract` with `status = ACTIVE` where `lease.startDate < requestedCheckOut` AND (`lease.endDate IS NULL` OR `lease.endDate > requestedCheckIn`).

**Condition B — 14-day pre-move-in buffer:** Room has a `LeaseContract` with `status IN (PENDING, ACTIVE)` where `requestedCheckOut > lease.startDate − 14 days` AND `lease.startDate > requestedCheckIn` (i.e. the booking checkout falls inside the tenant's move-in window for a lease that hasn't started yet).

**Error code returned:** `ROOM_HAS_LEASE` (HTTP 409) on booking create/update. The room-map displays lease-blocked rooms using the `RENTED_LONG_TERM` room status (set on lease activation) — it does **not** use this error code for display.

#### Scenario: Attempt to book a room with an active lease
- **WHEN** staff attempts to create a short-term booking for a room whose `ACTIVE` lease occupancy overlaps the requested window
- **THEN** the API returns HTTP 409 with error code `ROOM_HAS_LEASE`
- **AND** no booking is created

#### Scenario: Checkout falls inside 14-day pre-move-in buffer
- **WHEN** a room has a `LeaseContract` with `status = PENDING` and `startDate = 2026-06-01`
- **AND** staff attempts a booking with `checkIn = 2026-05-01`, `checkOut = 2026-05-20`
- **THEN** `requestedCheckOut (May 20) > lease.startDate − 14 days (May 18)` → blocked
- **AND** the API returns HTTP 409 with error code `ROOM_HAS_LEASE`

#### Scenario: Booking ends before the 14-day buffer begins — allowed
- **WHEN** a room has a `LeaseContract` with `startDate = 2026-06-01`
- **AND** staff books a stay checking out on `2026-05-15`
- **THEN** `requestedCheckOut (May 15) ≤ lease.startDate − 14 days (May 18)` → not blocked
- **AND** the booking is allowed

#### Scenario: Booking update that creates a lease conflict is also rejected
- **WHEN** staff edits an existing booking to extend the checkout date into a lease conflict window
- **THEN** the `PUT /api/bookings/[id]` route performs the same availability check
- **AND** returns HTTP 409 with error code `ROOM_HAS_LEASE` if a conflict is detected

#### Scenario: Room-map shows lease-blocked rooms via room status
- **WHEN** a lease is ACTIVE, the room's `RoomStatus` is `RENTED_LONG_TERM`
- **THEN** the room-map renders the room with the `RENTED_LONG_TERM` badge/color — no API error code is needed for display
