# reservation-detail-modal Specification

## Purpose
TBD - created by archiving change reservations-page. Update Purpose after archive.
## Requirements
### Requirement: Clicking a reservation row opens a detail modal
The reservations page SHALL open a `ReservationDetailModal` when staff clicks a table row or the eye icon. The modal SHALL display the full booking summary and offer two management actions: **Edit** and **Cancel Reservation**. It SHALL also include a "View full details" link to the existing `/reservations/[id]` page for operational actions (check-in, check-out, services). All categorized display values (booking status, room type, floor) SHALL use their master-data `name` field, not hard-coded strings.

#### Scenario: Modal opens on row click
- **WHEN** staff clicks anywhere on a booking row (or the eye icon)
- **THEN** the `ReservationDetailModal` opens showing that booking's data

#### Scenario: Modal displays booking summary fields
- **WHEN** the modal is open
- **THEN** it displays: booking number, booking status (name + color from `bookingStatus` master record), guest name, room number, room type name (from `room.roomType.name`), floor name (from `room.floor.name`), check-in date, check-out date, number of nights, adults, children, charge type, base rate, total amount, payment status, source, and note

#### Scenario: "View full details" link navigates to detail page
- **WHEN** staff clicks "View full details" in the modal footer
- **THEN** the browser navigates to `/[locale]/reservations/[id]` and the modal closes

### Requirement: Cancel is only available for reservations that have not yet started check-in
Cancellation means removing a reservation before the stay begins. The `ReservationDetailModal` SHALL show the "Cancel Reservation" button only when the booking is in a pre-check-in state: **PENDING** or **CONFIRMED**. Once a booking has reached CHECKED_IN (stay in progress), CHECKED_OUT (stay completed), or CANCELLED (already cancelled), the Cancel button SHALL NOT be shown. This rule is enforced in the UI; the button is simply absent for ineligible statuses.

On confirmation the booking status SHALL be updated to CANCELLED via `PUT /api/bookings/[id]`, the modal SHALL close, the list cache SHALL be invalidated, and a success toast SHALL appear.

#### Scenario: Cancel button visible for pre-check-in statuses only
- **WHEN** the modal is open for a booking with status PENDING or CONFIRMED
- **THEN** the "Cancel Reservation" button is visible and enabled

- **WHEN** the modal is open for a booking with status CHECKED_IN, CHECKED_OUT, or CANCELLED
- **THEN** the "Cancel Reservation" button is not rendered

#### Scenario: Cancellation requires confirmation
- **WHEN** staff clicks "Cancel Reservation"
- **THEN** a confirmation dialog appears before the API call is made

#### Scenario: Successful cancellation
- **WHEN** staff confirms the cancellation
- **THEN** `PUT /api/bookings/[id]` is called with the CANCELLED `bookingStatusId` (looked up from master data), the modal closes, the `["bookings"]` cache is invalidated, and `message.success` fires with `booking.cancelSuccess`

#### Scenario: Loading state during cancel
- **WHEN** the cancel API call is in flight
- **THEN** the "Cancel Reservation" button shows a loading spinner and is disabled

### Requirement: Staff can open the edit modal from the detail modal
The `ReservationDetailModal` SHALL include an "Edit" button that opens the `BookingEditModal` for the same booking. After a successful edit the detail modal SHALL remain open and display the refreshed booking data.

#### Scenario: Edit button opens BookingEditModal
- **WHEN** staff clicks "Edit" in the `ReservationDetailModal`
- **THEN** the `BookingEditModal` opens for the same booking

#### Scenario: Detail modal reflects updated data after edit
- **WHEN** staff completes an edit in `BookingEditModal` and it closes
- **THEN** the `ReservationDetailModal` displays the updated booking values without requiring a page reload

