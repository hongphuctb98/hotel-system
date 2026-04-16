## ADDED Requirements

### Requirement: Revenue chart displays daily revenue for a selectable period
The dashboard SHALL include a bar chart showing total payment revenue aggregated by hotel-local calendar day. The chart SHALL support two periods selectable by the user: last 7 days and last 30 days. The default period SHALL be 7 days. The period toggle SHALL update the chart data without a full page reload.

#### Scenario: Chart renders with 7-day data on load
- **WHEN** the dashboard page loads
- **THEN** the revenue chart displays a bar for each of the last 7 hotel-local calendar days, with bar height proportional to total payments collected on that day

#### Scenario: User switches to 30-day period
- **WHEN** the user clicks the "30 days" toggle option
- **THEN** the chart re-fetches and renders 30 bars (one per hotel-local calendar day) without reloading the page

#### Scenario: Day with no revenue shows zero bar
- **WHEN** no payments were collected on a calendar day within the selected period
- **THEN** the chart shows a bar of zero height for that day (the day is not omitted from the x-axis)

#### Scenario: Revenue values are displayed in the configured locale currency
- **WHEN** the chart tooltip is shown for a bar
- **THEN** the revenue amount is formatted using the hotel's locale currency (VND or USD depending on user setting) via `useLocaleCurrency`

### Requirement: Revenue chart API returns aggregated daily data
The `GET /api/dashboard/stats` endpoint SHALL accept an optional `?period=7d|30d` query parameter (default `7d`). The response SHALL include a `revenueByDay` array where each element has `date` (YYYY-MM-DD in hotel timezone) and `revenue` (total payment amount in VND for that day). Days with no payments SHALL be included with `revenue: 0`.

#### Scenario: API returns 7 entries for default period
- **WHEN** `GET /api/dashboard/stats` is called without a `period` param
- **THEN** `revenueByDay` contains exactly 7 entries covering the last 7 hotel-local calendar days (inclusive of today)

#### Scenario: API returns 30 entries for monthly period
- **WHEN** `GET /api/dashboard/stats?period=30d` is called
- **THEN** `revenueByDay` contains exactly 30 entries covering the last 30 hotel-local calendar days (inclusive of today)

#### Scenario: Revenue aggregation respects hotel timezone day boundaries
- **WHEN** the hotel timezone is `Asia/Ho_Chi_Minh` and a payment's `paidAt` is `2026-04-13T17:30:00Z` (00:30 on 2026-04-14 in Ho Chi Minh)
- **THEN** that payment's revenue is counted in the `2026-04-14` bucket, not `2026-04-13`
