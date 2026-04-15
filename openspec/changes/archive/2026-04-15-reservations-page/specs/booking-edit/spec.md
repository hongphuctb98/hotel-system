## ADDED Requirements

### Requirement: Staff can edit booking metadata via an edit modal
The system SHALL provide a `BookingEditModal` that opens when staff clicks "Edit" inside the `ReservationDetailModal`. The modal SHALL pre-populate all editable fields from the selected booking and submit changes via `PUT /api/bookings/[id]`. On success the modal SHALL close, both the list cache (`["bookings"]`) and the detail cache (`["bookings", id]`) SHALL be invalidated, and a success toast SHALL appear.

Editable fields: adults, children, source, note, discountAmount, surchargeAmount, baseRate, chargeType (`nightly` / `hourly`), hourlyBlockHours (visible when chargeType is `hourly`), hourlyRatePerHour (visible when chargeType is `hourly`).

Room number, check-in date, and check-out date are displayed as read-only labels inside the modal. They cannot be edited until `PUT /api/bookings/[id]` gains room-overlap re-validation.

#### Scenario: Modal opens pre-populated via detail modal
- **WHEN** staff clicks "Edit" inside the `ReservationDetailModal`
- **THEN** the `BookingEditModal` opens with all editable fields filled from the booking's current values and room / dates shown as read-only labels

#### Scenario: Successful metadata update
- **WHEN** staff modifies one or more editable fields and clicks "Update Booking"
- **THEN** `PUT /api/bookings/[id]` is called, the modal closes, `["bookings"]` and `["bookings", id]` caches are invalidated, and `message.success` fires with `booking.updateSuccess`

#### Scenario: Loading state during submit
- **WHEN** the form is submitted and the API call is in flight
- **THEN** the "Update Booking" button shows a loading spinner and is disabled to prevent double-submission

#### Scenario: Charge type switch reveals hourly fields
- **WHEN** staff changes charge type to "hourly"
- **THEN** the `hourlyBlockHours` and `hourlyRatePerHour` fields become visible

- **WHEN** staff changes charge type to "nightly"
- **THEN** the `hourlyBlockHours` and `hourlyRatePerHour` fields are hidden

### Requirement: Room and date editing is explicitly deferred
The `BookingEditModal` SHALL NOT expose controls to change room assignment or stay dates. This constraint is intentional and SHALL remain until `PUT /api/bookings/[id]` is updated to re-validate room overlap.

#### Scenario: No room or date inputs in the edit form
- **WHEN** staff opens the edit modal for any booking
- **THEN** the modal contains no room selector, no check-in date picker, and no check-out date picker
