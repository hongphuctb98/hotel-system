## ADDED Requirements

> **Note:** This capability (create-booking) is out of scope for the reservations-page change. Booking creation remains in room-map. See `../booking-edit/spec.md` for the booking-edit capability.

### Requirement: Booking creation is handled by room-map, not the reservations page
The reservations page SHALL NOT include a "New Booking" button or create-booking flow. Booking creation remains in the room-map module.

#### Scenario: Reservations page has no create-booking entry point
- **GIVEN** staff is on the reservations page
- **THEN** no "New Booking" button or create-booking flow is present on the page
