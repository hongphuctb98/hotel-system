## MODIFIED Requirements

### Requirement: Reservations table exposes a filter bar with four controls
The reservations page SHALL render a filter bar above the table with four controls: a free-text search input (matches guest first/last name or booking number), a booking-status multi-select, a check-in date range picker, and a room-type select. Filter state SHALL be owned by the page component and passed as props to `ReservationTable` and to the export function. Changing any filter SHALL reset the page to 1.

The API (`GET /api/bookings`) SHALL support all four filter parameters: `search`, `bookingStatusId` (already implemented), `checkInFrom` / `checkInTo` (date range on `checkInDate`), and `roomTypeId` (filter on `room.roomTypeId`).

The check-in date range picker SHALL operate in the hotel timezone: the selected calendar dates SHALL be converted to UTC day-boundary values using `buildLocalDayBoundsUTC` (server-side) so that a filter for `2026-04-14` captures all bookings whose check-in timestamp falls within that hotel-local calendar day, regardless of the client's browser timezone.

#### Scenario: Default state shows all bookings unfiltered
- **WHEN** the reservations page loads
- **THEN** no filters are applied and the table shows all bookings paginated by the default page size

#### Scenario: Search by guest name
- **WHEN** staff types a name in the search field
- **THEN** only bookings whose guest first or last name contains the text (case-insensitive) are returned

#### Scenario: Search by booking number
- **WHEN** staff types a booking number in the search field
- **THEN** only the booking with that booking number is returned

#### Scenario: Filter by booking status
- **WHEN** staff selects one or more statuses from the multi-select
- **THEN** only bookings with those statuses are shown; options are loaded from `useMasterData().bookingStatuses`

#### Scenario: Filter by check-in date range uses hotel timezone boundaries
- **WHEN** staff picks a start date of `2026-04-14` and end date of `2026-04-15` in the range picker
- **THEN** the API receives `checkInFrom=2026-04-14` and `checkInTo=2026-04-15`, the server converts these to UTC day-boundary timestamps in the configured hotel timezone, and only bookings whose check-in falls within those hotel-local days are returned

#### Scenario: Filter by room type
- **WHEN** staff selects a room type from the room-type select
- **THEN** only bookings for rooms of that type are shown; options are loaded from `useMasterData().roomTypes`

#### Scenario: Combining multiple filters
- **WHEN** staff applies any combination of filters simultaneously
- **THEN** only bookings matching ALL active filters are shown

#### Scenario: Clearing filters restores full list
- **WHEN** staff clears all filter controls
- **THEN** the table returns to showing all bookings with no filtering applied
