## Context

The dashboard at `app/[locale]/(main)/dashboard/page.tsx` currently renders four KPI cards (today's revenue, occupancy rate, current guests, rooms needing cleaning) and a tabbed upcoming check-in/check-out list. A Weekly Revenue Chart section exists as a static placeholder div with no data — the `GET /api/dashboard/stats` endpoint returns `weeklyRevenue: []` unconditionally. There is no room status breakdown, no housekeeping task summary, and no view of actual check-in/check-out times.

The overhaul adds four new sections, enhances the API, and introduces a chart library. All work is additive — no existing KPI card or API field is removed.

## Goals / Non-Goals

**Goals:**
- Implement a working Revenue Chart (weekly and monthly period toggle) backed by real aggregated data
- Add a Room Status Overview widget showing live room counts by operational status
- Replace the minimal UpcomingList with an Activity Panel that includes time of day for arrivals/departures
- Add a Housekeeping Summary with pending/in-progress/done counts linking to the housekeeping page
- Extend `/api/dashboard/stats` to return all new data fields in one request

**Non-Goals:**
- Real-time push (WebSocket/SSE) — polling at 5-minute intervals is sufficient
- Drill-down navigation from chart data points to booking lists
- Role-gated sections (all roles see the same dashboard)
- Custom date range picker for the revenue chart beyond 7-day / 30-day toggles

## Decisions

### Chart library: Recharts

**Decision:** Install `recharts` and use `<BarChart>` for the revenue chart.

**Rationale:** Recharts is the most widely adopted React chart library, tree-shakeable, SSR-safe with dynamic import if needed, and has no peer conflicts with Next.js or Ant Design. The placeholder comment in the existing code already names it as the intended choice. `@ant-design/plots` (AntV) is an alternative but adds a heavier bundle and requires a separate G2 dependency.

**Alternative considered:** `@ant-design/plots` — rejected due to bundle size (~400KB gzipped vs ~150KB for recharts) and the fact that no AntV tooling is already in the project.

### Single API endpoint, period query param

**Decision:** Extend `GET /api/dashboard/stats` with an optional `?period=7d|30d` query param for revenue data. All other fields (room status, housekeeping, activity) are always returned.

**Rationale:** One request on page load avoids waterfall fetches. The period only affects the revenue aggregation; other counts are always "current state". Keeping one endpoint simplifies `useDashboardStats` — no separate hooks for each widget.

**Alternative considered:** Separate endpoints per widget — rejected because it introduces 4 parallel fetches on every dashboard mount with no meaningful isolation benefit.

### Revenue aggregation in hotel timezone

**Decision:** Use `buildLocalDayBoundsUTC` (from `common/utils/hotelDate.ts`) to compute day boundaries for revenue grouping so that a "day" in the chart corresponds to a hotel-local calendar day, not UTC midnight.

**Rationale:** Consistent with the hotel-timezone change already merged. Revenue figures must match what staff see on invoices, which use hotel-local dates.

### Room status from `Room.roomStatus` relation

**Decision:** Group active rooms (`isActive: true`) by their `roomStatus.code` using `prisma.room.groupBy`. The four operational status codes are AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE.

**Rationale:** `Room.roomStatus` is the authoritative operational state (distinct from booking-derived state). GroupBy on the foreign key with a join on `RoomStatus.code` is a single query. No in-memory grouping needed.

### Activity Panel replaces UpcomingList

**Decision:** Delete `modules/dashboard/components/UpcomingList.tsx` and replace it with `ActivityPanel.tsx`. The Activity Panel shows the same check-in / check-out tabs but adds the scheduled time displayed using `formatInTimezone` from `common/utils/clientTimezone.ts`.

**Rationale:** The existing component already uses `useLocaleCurrency().formatDate` which does not apply hotel timezone. Replacing it is cleaner than adding a timezone-aware time column to the existing implementation.

## Risks / Trade-offs

- **Recharts bundle size (~150KB gzipped)** → Use dynamic import (`next/dynamic` with `ssr: false`) on the chart component to keep the dashboard page's initial server payload unchanged. The chart renders only after client hydration.
- **Revenue aggregation performance on large datasets** → The 30-day query groups payments by day; for a typical hotel (hundreds of payments/month) this is fast. If the DB grows large, add a DB index on `Payment.paidAt` — the migration is non-destructive.
- **`weeklyRevenue` field rename** → The existing `DashboardStats` type exports `weeklyRevenue: []` which clients already depend on. We rename it to `revenueByDay` in the API response and update the type. Since no component currently consumes the field (it was always empty), this is a safe rename.
