## ADDED Requirements

### Requirement: Room Map filter bar includes booking occupancy state selector
The Room Map filter bar SHALL include a Select control for filtering rooms by booking-derived occupancy state (`none`, `reserved`, `checked_in`, `checked_out`). The filter SHALL default to "all" (no filter). Filtering SHALL be applied client-side on the already-fetched room list.

#### Scenario: Default state shows all rooms
- **WHEN** the Room Map is first loaded
- **THEN** the occupancy state filter shows "All occupancy states" and all rooms are displayed

#### Scenario: Filtering to checked_in shows only occupied rooms
- **WHEN** user selects "Checked In" from the occupancy state filter
- **THEN** only rooms where `currentBooking.bookingState === "checked_in"` are shown in the grid

#### Scenario: Filtering to none shows empty rooms
- **WHEN** user selects "No booking" from the occupancy state filter
- **THEN** only rooms with no overlapping booking for the selected date are shown

#### Scenario: Operational status and booking state filters combine
- **WHEN** user selects both an operational status (e.g., CLEANING) AND a booking state (e.g., none)
- **THEN** only rooms matching BOTH criteria are shown (operational filter applied server-side, booking state filter client-side)

## MODIFIED Requirements

### Requirement: Room Detail modal header shows both status signals
The Room Detail modal header SHALL always show the room operational status badge. When a booking exists (`bookingState !== "none"`), it SHALL also show the booking-state tag alongside the operational badge — not instead of it.

#### Scenario: Room with checked_in booking shows both badges in header
- **WHEN** modal opens for a room with `bookingState === "checked_in"`
- **THEN** the modal header shows `[operational-status-badge] [Đã nhận phòng · BK-xxxx · Guest Name]`

#### Scenario: Room with no booking shows only operational badge
- **WHEN** modal opens for a room with `bookingState === "none"`
- **THEN** the modal header shows only the operational status badge (e.g., `[Trống]`)

#### Scenario: Booking state tag not duplicated in info bar
- **WHEN** modal opens for a room with any booking state
- **THEN** the booking state tag appears ONLY in the header, not also in the info bar below
