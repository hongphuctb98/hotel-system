## ADDED Requirements

### Requirement: Dashboard displays housekeeping task counts by status
The dashboard SHALL include a Housekeeping Summary section showing the count of active housekeeping tasks grouped by status: PENDING, IN_PROGRESS, and COMPLETED (today only). Each status SHALL be displayed as a labeled count. A "View All" link SHALL navigate to the housekeeping page. The section SHALL reflect real-time data refreshed on the same 5-minute polling interval as the rest of the dashboard.

#### Scenario: Summary shows pending, in-progress, and completed counts
- **WHEN** the dashboard loads
- **THEN** the Housekeeping Summary shows three counts: Pending, In Progress, and Completed (today) — each with its label and numeric value

#### Scenario: Completed count is scoped to today
- **WHEN** a housekeeping task was completed yesterday
- **THEN** it is NOT included in the "Completed" count shown on the dashboard (only today's hotel-local calendar day completions are counted)

#### Scenario: "View All" link navigates to housekeeping page
- **WHEN** the user clicks "View All" in the Housekeeping Summary
- **THEN** the browser navigates to the housekeeping management page

#### Scenario: Zero counts are shown, not hidden
- **WHEN** no tasks are currently in IN_PROGRESS status
- **THEN** the In Progress count shows 0 rather than hiding the status row

### Requirement: Dashboard stats API includes housekeeping task counts
The `GET /api/dashboard/stats` response SHALL include a `housekeepingCounts` object with fields `pending` (count of tasks with status PENDING), `inProgress` (count of tasks with status IN_PROGRESS), and `completedToday` (count of tasks with status COMPLETED whose `updatedAt` falls within today's hotel-local calendar day). Task type is not filtered — all task types are included.

#### Scenario: API returns correct pending count
- **WHEN** there are 3 PENDING housekeeping tasks
- **THEN** `housekeepingCounts.pending` equals 3

#### Scenario: completedToday excludes yesterday's completions
- **WHEN** a task was set to COMPLETED at 23:59 hotel-local time yesterday
- **THEN** `housekeepingCounts.completedToday` does not include that task
