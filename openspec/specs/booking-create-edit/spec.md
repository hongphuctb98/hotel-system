# booking-create-edit Specification

## Purpose
TBD - created by archiving change reservations-page. Update Purpose after archive.
## Requirements
### Requirement: Booking creation is handled by room-map, not the reservations page
The reservations page SHALL NOT include a "New Booking" button or create-booking flow. Booking creation remains in the room-map module.

#### Scenario: Reservations page has no create-booking entry point
- **GIVEN** staff is on the reservations page
- **THEN** no "New Booking" button or create-booking flow is present on the page

