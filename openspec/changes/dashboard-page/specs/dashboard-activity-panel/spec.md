## ADDED Requirements

### Requirement: Activity Panel shows today's arrivals and departures with scheduled times
The dashboard SHALL include an Activity Panel displaying two tabs: "Today's Arrivals" (bookings with `checkInDate` within today's hotel-local calendar day and status CONFIRMED or PENDING) and "Today's Departures" (bookings with `checkOutDate` within today's hotel-local calendar day and status CHECKED_IN). Each row SHALL show the guest's full name, room number, and the scheduled check-in or check-out time formatted in the hotel timezone. Up to 10 bookings SHALL be shown per tab (ordered by time ascending).

#### Scenario: Arrivals tab shows today's expected check-ins
- **WHEN** the dashboard loads and there are bookings with checkInDate today (hotel timezone) and status CONFIRMED or PENDING
- **THEN** the Arrivals tab lists those bookings with guest name, room number, and check-in time in hotel timezone

#### Scenario: Departures tab shows today's expected check-outs
- **WHEN** the dashboard loads and there are bookings with checkOutDate today (hotel timezone) and status CHECKED_IN
- **THEN** the Departures tab lists those bookings with guest name, room number, and check-out time in hotel timezone

#### Scenario: Empty state shown when no arrivals today
- **WHEN** no bookings are scheduled to check in today
- **THEN** the Arrivals tab shows an empty state message instead of an empty list

#### Scenario: Times are displayed in hotel timezone, not browser timezone
- **WHEN** a booking's checkInDate UTC timestamp corresponds to a different calendar day in the browser's local timezone than in the hotel timezone
- **THEN** the Activity Panel uses hotel-timezone formatting (via `formatInTimezone` from `common/utils/clientTimezone.ts`) and shows the hotel-local time

#### Scenario: Activity Panel replaces UpcomingList
- **WHEN** the dashboard renders
- **THEN** the `UpcomingList` component is no longer rendered; its functionality is fully replaced by `ActivityPanel`

### Requirement: Dashboard stats API returns today's activity data in hotel timezone
The `GET /api/dashboard/stats` response SHALL include `todayArrivals` and `todayDepartures` arrays (replacing the former `upcomingCheckIns` / `upcomingCheckOuts` fields). Each element SHALL have `id`, `guestName`, `roomNumber`, and `scheduledTime` (ISO 8601 UTC string). The day boundary for "today" SHALL be computed using `buildLocalDayBoundsUTC` with the hotel timezone. Each array SHALL be limited to 10 records ordered by scheduled time ascending.

#### Scenario: API uses hotel timezone for "today" boundary
- **WHEN** the hotel timezone is `Asia/Ho_Chi_Minh` and the current UTC time is `2026-04-14T00:30:00Z` (00:30 UTC = 07:30 local on 2026-04-14)
- **THEN** `todayArrivals` contains bookings whose checkInDate falls within 2026-04-14 in `Asia/Ho_Chi_Minh` (not 2026-04-13)
