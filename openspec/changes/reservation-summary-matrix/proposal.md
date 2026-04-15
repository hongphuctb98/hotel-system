## Why

The current reservation summary uses an independent time-scope control (Day / Week / Month / Year) that is disconnected from the filter bar, so staff see summary counts for a different date range than the table they are looking at. Replacing the stat cards with a status × room-type matrix tied to the filter bar's active date range gives an immediate, contextually relevant breakdown without requiring a second set of date controls.

## What Changes

- Remove the standalone Segmented time-scope control (Today / This Week / This Month / This Year) from `ReservationSummary`
- Replace the two separate card groups (by-status and by-room-type) with a single matrix table: rows = booking statuses, columns = room types, cells = reservation count
- The matrix is driven by the filter bar's `checkInFrom` / `checkInTo` date range (already owned by the page) — not by an independent scope state
- When no date range is selected the matrix shows counts for all time (no date restriction)
- Remove the `GET /api/bookings/stats` endpoint (no longer needed); the matrix data is derived by extending `GET /api/bookings` with `export=1` or a new lightweight count endpoint
- Remove `useBookingStats` hook and replace with a new hook that queries counts by status × room type using the current filter date range

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `reservation-summary`: Replace time-scope cards approach with a status × room-type matrix table driven by the filter bar date range; remove independent scope control and `GET /api/bookings/stats` endpoint dependency

## Impact

- `modules/reservations/components/ReservationSummary.tsx` — full rewrite: remove Segmented scope control, render Ant Design `Table` as a matrix
- `modules/reservations/hooks/useBookingStats.ts` — remove; replace with `useReservationMatrix` hook
- `app/api/bookings/stats/route.ts` — remove (no longer needed)
- `app/[locale]/(main)/reservations/page.tsx` — pass `checkInFrom`/`checkInTo` from filter state down to `ReservationSummary`
- No new i18n keys required (status/room-type names come from master data)
