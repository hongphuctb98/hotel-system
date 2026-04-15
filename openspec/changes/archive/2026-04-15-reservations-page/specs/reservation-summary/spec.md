## ADDED Requirements

### Requirement: A summary section shows reservation counts scoped to a selected time window
The reservations page SHALL render a `ReservationSummary` component above the filter bar. It SHALL display reservation counts in two groups:
1. **By booking status** — one stat card per status, using the status `name` and `color` from the `BookingStatus` master record
2. **By room type** — one stat card per room type, using the room type `name` from the `RoomType` master record

Counts cover **all bookings** (including CANCELLED and CHECKED_OUT) whose `checkInDate` falls within the selected time scope. This is reporting/statistical data; historical and terminal statuses must remain visible to give an accurate picture of reservation volume.

Data is sourced from `GET /api/bookings/stats?scope=<scope>` and is independent of the filter bar state.

#### Scenario: Summary section renders above the filter bar on the reservations page
- **GIVEN** the reservations page loads
- **THEN** the `ReservationSummary` component is displayed above the filter bar with stat cards grouped by booking status and by room type

### Requirement: Staff can switch the statistics time scope
The `ReservationSummary` SHALL include a Segmented control with four options: **Day**, **Week**, **Month**, **Year**. The selected scope determines the time window applied to the stats query. The default scope on page load is **Month**.

- `day` — bookings with `checkInDate` equal to today's date
- `week` — bookings with `checkInDate` within the current Monday–Sunday week
- `month` — bookings with `checkInDate` within the current calendar month
- `year` — bookings with `checkInDate` within the current calendar year

Changing the scope triggers a refetch of the stats. The filter bar state does not affect the stats.

#### Scenario: Summary renders on page load with monthly scope
- **WHEN** the reservations page is loaded
- **THEN** the summary section renders with counts for the current month and the Month option is active in the Segmented control

#### Scenario: Switching scope updates counts
- **WHEN** staff clicks "Week" in the Segmented control
- **THEN** the stats refetch and counts update to reflect only bookings whose check-in date falls in the current week

#### Scenario: Status cards use master-data names and colors
- **WHEN** the summary renders
- **THEN** each booking-status card uses `bookingStatus.name` as the label and `bookingStatus.color` as the accent color — not hard-coded strings

#### Scenario: CANCELLED and CHECKED_OUT bookings are included in counts
- **WHEN** there are cancelled or checked-out bookings with check-in dates in the selected time window
- **THEN** those bookings are counted in the CANCELLED and CHECKED_OUT status cards respectively

#### Scenario: Room types with zero bookings in the selected scope are omitted
- **WHEN** no bookings for a room type have check-in dates in the selected time scope
- **THEN** no stat card for that room type is rendered

#### Scenario: Summary does not change when list filters are applied
- **WHEN** staff applies filters to the reservation list table
- **THEN** the summary counts remain unchanged (stats are scoped to the time window, not the list filter)

#### Scenario: Stats endpoint accepts scope parameter
- **WHEN** `GET /api/bookings/stats?scope=month` is called
- **THEN** the response contains `{ scope: "month", byStatus: [{ id, name, color, count }], byRoomType: [{ id, name, count }] }` where counts include all statuses within the time window
