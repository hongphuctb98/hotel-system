## ADDED Requirements

### Requirement: Dashboard displays a live breakdown of rooms by operational status
The dashboard SHALL include a Room Status Overview section showing the count of active rooms (`isActive: true`) in each operational status. The statuses displayed SHALL be AVAILABLE, OCCUPIED, CLEANING, and MAINTENANCE. Each status SHALL be shown with its name, count, and a color indicator matching the status color stored in the database. A total active room count SHALL be shown alongside the breakdown.

#### Scenario: Overview shows count for each status
- **WHEN** the dashboard loads and the API returns room status counts
- **THEN** four status items are shown — AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE — each displaying its name and the count of rooms currently in that status

#### Scenario: Status with zero rooms is still displayed
- **WHEN** no rooms are currently in MAINTENANCE status
- **THEN** the MAINTENANCE item is still shown with a count of 0 (not hidden)

#### Scenario: Total room count is displayed
- **WHEN** the Room Status Overview renders
- **THEN** a total count equal to the sum of all status counts is visible in the section header or summary row

### Requirement: Dashboard stats API returns room status breakdown
The `GET /api/dashboard/stats` response SHALL include a `roomStatusCounts` array. Each element SHALL have `code` (RoomStatus.code), `name` (RoomStatus.name), `color` (RoomStatus.color), and `count` (number of active rooms with that status). All four operational status codes SHALL be present in the array even if their count is 0.

#### Scenario: API returns all four status codes
- **WHEN** `GET /api/dashboard/stats` is called
- **THEN** `roomStatusCounts` contains exactly four entries with codes AVAILABLE, OCCUPIED, CLEANING, and MAINTENANCE

#### Scenario: Count reflects only active rooms
- **WHEN** a room has `isActive: false`
- **THEN** it is excluded from all status counts in `roomStatusCounts`
