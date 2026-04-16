## Why

The current dashboard is minimal — it shows four static KPI cards and a list of today's upcoming arrivals/departures, but the Weekly Revenue Chart is a placeholder that returns no data, and there is no visibility into room status distribution or housekeeping workload. Staff opening the dashboard get an incomplete operational picture and must navigate to separate pages to answer basic questions about room availability, cleaning queue, and revenue trends.

## What Changes

- Implement the Weekly Revenue Chart using Recharts (currently a hardcoded placeholder returning `[]`)
- Add a Room Status Overview widget showing the live count of rooms in each status (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE)
- Expand the Activity Panel to show today's arrivals and departures with guest name, room number, and scheduled time — replacing the basic tab list
- Add a Housekeeping Summary section showing task counts by status (PENDING, IN_PROGRESS, COMPLETED) with a link to the housekeeping page
- Enhance the `/api/dashboard/stats` endpoint to supply weekly revenue data, room status breakdown, and housekeeping counts
- Install `recharts` as the chart library (no chart library currently exists in the project)

## Capabilities

### New Capabilities
- `dashboard-revenue-chart`: Weekly/monthly revenue bar chart fed by real API data, with a period toggle (7 days / 30 days)
- `dashboard-room-status-overview`: Donut or progress-bar breakdown of active rooms by operational status
- `dashboard-activity-panel`: Tabbed today's arrivals and departures panel with guest name, room number, and time, replacing the current minimal list
- `dashboard-housekeeping-summary`: Task count cards (Pending, In Progress, Done) with a shortcut link to the housekeeping page

### Modified Capabilities
<!-- No existing specs require requirement-level changes; all dashboard specs are new -->

## Impact

- `app/api/dashboard/stats/route.ts` — add weekly/monthly revenue aggregation, room status group-by counts, and housekeeping status counts to the response
- `modules/dashboard/hooks/useDashboardStats.ts` — extend `DashboardStats` type with new fields
- `modules/dashboard/components/` — add `RevenueChart.tsx`, `RoomStatusOverview.tsx`, `ActivityPanel.tsx`, `HousekeepingSummary.tsx`; replace `UpcomingList.tsx` with `ActivityPanel.tsx`
- `app/[locale]/(main)/dashboard/page.tsx` — update layout to include all four sections
- `messages/en.json` + `messages/vi.json` — new i18n keys for chart labels, period toggle, and new section titles
- New dependency: `recharts` (no existing chart library in project)
