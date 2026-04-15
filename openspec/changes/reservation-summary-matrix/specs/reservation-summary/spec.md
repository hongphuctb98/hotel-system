## MODIFIED Requirements

### Requirement: A summary section shows reservation counts as a status × room-type matrix
The reservations page SHALL render a `ReservationSummary` component above the filter bar. It SHALL display reservation counts in a matrix table where:
- **Rows** represent booking statuses, using `bookingStatus.name` and `bookingStatus.color` from master data
- **Columns** represent room types, using `roomType.name` from master data; only room types with at least one matching booking appear as columns
- **Cells** contain the count of bookings matching that status and room type within the active filter date range; a count of `0` renders as `—`
- A **Total** column shows the row sum per status; a **Total** row shows the column sum per room type

The summary is driven by the filter bar's `checkInFrom` / `checkInTo` date range. When no date range is selected, counts cover all bookings with no date restriction. The summary is NOT driven by an independent time-scope control.

Data is sourced from `GET /api/bookings/matrix` which accepts the same `checkInFrom` / `checkInTo` filter parameters and returns pre-aggregated `{ cells: [{ bookingStatusId, roomTypeId, count }] }`.

The `GET /api/bookings/stats` endpoint and the Segmented scope control are removed.

#### Scenario: Matrix renders on page load with no date filter
- **WHEN** the reservations page is loaded with no date range selected
- **THEN** the summary matrix shows counts for all bookings across all dates

#### Scenario: Matrix updates when check-in date range is applied
- **WHEN** staff selects a check-in date range in the filter bar
- **THEN** the matrix refetches and cells update to reflect only bookings whose check-in date falls within that range

#### Scenario: Matrix updates when date range is cleared
- **WHEN** staff clears the date range picker
- **THEN** the matrix refetches and shows all-time counts again

#### Scenario: Status rows use master-data names and colors
- **WHEN** the matrix renders
- **THEN** each status row label uses `bookingStatus.name` and the row is accented with `bookingStatus.color` — not hard-coded strings

#### Scenario: Room types with zero bookings in the date range are omitted
- **WHEN** no bookings for a room type fall within the active date range
- **THEN** no column for that room type appears in the matrix

#### Scenario: CANCELLED and CHECKED_OUT bookings are included in counts
- **WHEN** there are cancelled or checked-out bookings with check-in dates in the selected range
- **THEN** those bookings are counted in the corresponding CANCELLED and CHECKED_OUT status rows

#### Scenario: Matrix is independent of status and room-type list filters
- **WHEN** staff applies a status or room-type filter in the filter bar
- **THEN** the matrix still shows all statuses and room types (the matrix reflects only the date range, not the status/room-type dropdown selections)

#### Scenario: Skeleton loader shows while matrix is fetching
- **WHEN** the matrix query is in-flight
- **THEN** a skeleton placeholder is shown in place of the table

#### Scenario: Matrix endpoint returns pre-aggregated counts
- **WHEN** `GET /api/bookings/matrix?checkInFrom=2025-01-01&checkInTo=2025-01-31` is called
- **THEN** the response contains `{ cells: [{ bookingStatusId, roomTypeId, count }] }` with one entry per non-zero status+roomType combination within the date range

## REMOVED Requirements

### Requirement: Staff can switch the statistics time scope
**Reason**: The Segmented time-scope control (Day / Week / Month / Year) is replaced by the filter bar's date range, which is already available on the page. An independent scope control creates a context mismatch where the summary reflects a different date window than the table.
**Migration**: Remove the Segmented control from `ReservationSummary`. Remove `useBookingStats` hook. Remove `GET /api/bookings/stats` route. Pass `checkInFrom`/`checkInTo` from page filter state to `ReservationSummary` instead.
