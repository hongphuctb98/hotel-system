# reservation-list-filters Specification

## Purpose
TBD - created by archiving change reservations-page. Update Purpose after archive.
## Requirements
### Requirement: Reservations table exposes a filter bar with four controls
The reservations page SHALL render a filter bar above the table with four controls: a free-text search input (matches guest first/last name or booking number), a booking-status multi-select, a check-in date range picker, and a room-type select. Filter state SHALL be owned by the page component and passed as props to `ReservationTable` and to the export function. Changing any filter SHALL reset the page to 1.

The API (`GET /api/bookings`) SHALL support all four filter parameters: `search`, `bookingStatusId` (already implemented), `checkInFrom` / `checkInTo` (date range on `checkInDate`), and `roomTypeId` (filter on `room.roomTypeId`).

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

#### Scenario: Filter by check-in date range
- **WHEN** staff picks a start and end date in the range picker
- **THEN** only bookings whose check-in date falls on or after the start date AND on or before the end date are shown

#### Scenario: Filter by room type
- **WHEN** staff selects a room type from the room-type select
- **THEN** only bookings for rooms of that type are shown; options are loaded from `useMasterData().roomTypes`

#### Scenario: Combining multiple filters
- **WHEN** staff applies any combination of filters simultaneously
- **THEN** only bookings matching ALL active filters are shown

#### Scenario: Clearing filters restores full list
- **WHEN** staff clears all filter controls
- **THEN** the table returns to showing all bookings with no filtering applied

### Requirement: Reservations table includes payment status and note columns
The `ReservationTable` SHALL include two additional columns alongside the existing ones:
- **Payment status** — derived client-side from the booking's `invoices` array: no invoice renders `—`, `isPaid: true` renders a green "Paid" tag, `isPaid: false` renders an orange "Unpaid" tag.
- **Note** — displays the booking's `note` field truncated to one line with an ellipsis tooltip showing the full text on hover. If note is null or empty, renders `—`.

#### Scenario: Booking with paid invoice shows Paid tag
- **WHEN** a booking row has at least one invoice with `isPaid: true`
- **THEN** the payment status cell shows a green "Paid" tag

#### Scenario: Booking with unpaid invoice shows Unpaid tag
- **WHEN** a booking row has an invoice with `isPaid: false`
- **THEN** the payment status cell shows an orange "Unpaid" tag

#### Scenario: Booking with no invoice shows dash
- **WHEN** a booking row has no invoices
- **THEN** the payment status cell shows `—`

#### Scenario: Long note is truncated with tooltip
- **WHEN** a booking has a note longer than the column width
- **THEN** the note is truncated with ellipsis and the full text is visible in a tooltip on hover

