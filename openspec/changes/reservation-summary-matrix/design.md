## Context

The current `ReservationSummary` renders two card groups (by booking status, by room type) driven by an independent `scope` state (day / week / month / year) via a Segmented control. The `GET /api/bookings/stats` endpoint computes fixed calendar windows server-side from the scope parameter. The summary has no relationship to the filter bar, so a staff member filtering for last week's bookings still sees the current-month totals in the summary — a confusing context mismatch.

The filter bar already owns `checkInFrom` / `checkInTo` as part of `BookingFilters` state in the page. The matrix redesign wires the summary directly to that state.

## Goals / Non-Goals

**Goals:**
- Replace the time-scope Segmented control with a passive summary driven by the filter bar date range
- Render a status × room-type count matrix so staff can see the breakdown at a glance in one compact table
- Reuse canonical master-data values (status names/colors from `useMasterData().bookingStatuses`, room type names from `useMasterData().roomTypes`) for all row/column labels
- Remove the `GET /api/bookings/stats` route and `useBookingStats` hook (dead code once replaced)

**Non-Goals:**
- Adding any new API endpoints (the matrix is computed from counts fetched via the existing `GET /api/bookings` list with `export=1`)
- Supporting per-cell drill-down or click-to-filter behaviour
- Showing totals when no date range is set is acceptable (all-time counts)

## Decisions

### D1: Data source — dedicated count endpoint vs. reuse export=1 list

**Option A — New lightweight `GET /api/bookings/matrix`** endpoint that returns a pre-aggregated `{ statusId, roomTypeId, count }[]` array.  
**Option B — Reuse `GET /api/bookings?export=1`** (existing) to fetch the full filtered list client-side, then aggregate the matrix locally.  
**Option C — New `GET /api/bookings/stats` variant** that accepts `checkInFrom`/`checkInTo` instead of `scope`.

**Decision: Option A** — a dedicated `/api/bookings/matrix` endpoint that accepts the same filter params (`checkInFrom`, `checkInTo`, `search`, `bookingStatusId`, `roomTypeId`) and returns pre-aggregated counts. This avoids pulling full booking objects (with nested guest/room/services) purely for counting, which is wasteful when the list may contain thousands of rows. The endpoint returns `{ cells: [{ bookingStatusId, roomTypeId, count }] }` and the component joins against master data to build the matrix.

The existing `/api/bookings/stats` route is **removed** — it is fully replaced by `/api/bookings/matrix`.

### D2: Matrix table rendering

Use Ant Design `Table` with:
- **Columns**: one column per room type that has at least one booking in the result set (plus a "Total" column). Column key = `roomTypeId`.
- **Rows**: one row per booking status (using master-data order). Row key = `bookingStatusId`. Include a "Total" row at the bottom.
- **Cell value**: count from the aggregated matrix; `0` renders as `—` to reduce noise.
- Status name in the first column uses the status color as a left-border accent (same visual language as the old status cards).

Skeleton loader shown while the matrix query is in-flight.

### D3: Props interface for ReservationSummary

```ts
type ReservationSummaryProps = {
  checkInFrom?: string;  // ISO date string, from BookingFilters
  checkInTo?: string;
};
```

The page passes these down from the lifted `filters` state. `ReservationSummary` never touches the filter bar state directly.

### D4: Query key and staleTime

`queryKey: ["bookings", "matrix", checkInFrom, checkInTo]` — changes whenever the date range changes, triggering a refetch. `staleTime: 30_000` (same as the old stats hook).

### D5: Empty / no-date state

When `checkInFrom` and `checkInTo` are both undefined (no date filter active), the API is called with no date restriction and returns counts for all bookings. This is acceptable and communicates "no date filter = all-time summary". The matrix header shows "All dates" in this case.

## Risks / Trade-offs

- [**Performance**] No-date-filter call returns counts for the entire booking history. Mitigation: the matrix endpoint only fetches IDs + two foreign-key columns for counting — no guest/room/service payloads — so even large tables are fast.
- [**Column sprawl**] A hotel with many room types will produce a wide table. Mitigation: only room types with at least one booking in the result set appear as columns; zero-count types are omitted.
- [**Stale master data**] Status/room-type names come from `useMasterData()` (staleTime: Infinity). Mitigation: this is the existing project convention and is acceptable.
