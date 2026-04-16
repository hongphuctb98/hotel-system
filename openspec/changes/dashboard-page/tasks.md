## 1. Dependencies & Types

- [x] 1.1 Install `recharts` — run `npm install recharts` and verify it appears in `package.json` dependencies
- [x] 1.2 Update `DashboardStats` type in `modules/dashboard/hooks/useDashboardStats.ts` — replace `weeklyRevenue` with `revenueByDay: { date: string; revenue: number }[]`, add `roomStatusCounts: { code: string; name: string; color: string; count: number }[]`, replace `upcomingCheckIns`/`upcomingCheckOuts` with `todayArrivals`/`todayDepartures: { id: string; guestName: string; roomNumber: string; scheduledTime: string }[]`, and add `housekeepingCounts: { pending: number; inProgress: number; completedToday: number }`
- [x] 1.3 Add `period` param to `useDashboardStats` hook — accept an optional `period: '7d' | '30d'` argument (default `'7d'`) and pass it as a query param to `GET /api/dashboard/stats?period=<value>`. Include `period` in the `queryKey` so switching periods triggers a fresh fetch.

## 2. API Enhancement

- [x] 2.1 Add `revenueByDay` aggregation to `app/api/dashboard/stats/route.ts` — read the `period` query param (`7d` | `30d`, default `7d`), compute start date using `buildLocalDayBoundsUTC` (hotel timezone), query `prisma.payment.findMany` for payments within the range, group by hotel-local calendar day, fill in zero-revenue days, and return as `revenueByDay`
- [x] 2.2 Add `roomStatusCounts` query — use `prisma.roomStatus.findMany` to get all statuses, then for each status count active rooms (`isActive: true`) with that status. Return all four codes (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE) with count 0 if no rooms match.
- [x] 2.3 Replace `upcomingCheckIns`/`upcomingCheckOuts` with `todayArrivals`/`todayDepartures` — use `buildLocalDayBoundsUTC` for today's hotel-local day boundaries; `todayArrivals` queries bookings with checkInDate in today's range and status CONFIRMED or PENDING (up to 10, ordered by checkInDate asc); `todayDepartures` queries checkOutDate in today's range and status CHECKED_IN (up to 10, ordered by checkOutDate asc). Each item returns `{ id, guestName, roomNumber, scheduledTime }` where `scheduledTime` is the ISO string.
- [x] 2.4 Add `housekeepingCounts` query — count tasks with status PENDING (`pending`), status IN_PROGRESS (`inProgress`), and status COMPLETED with `updatedAt` in today's hotel-local day range (`completedToday`). All task types included.
- [x] 2.5 Remove the old `weeklyRevenue` field from the API response and clean up its unused DB query

## 3. Revenue Chart Component

- [x] 3.1 Create `modules/dashboard/components/RevenueChart.tsx` as a `"use client"` component — use `next/dynamic` with `ssr: false` to import `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` from `recharts` so the chart only renders client-side
- [x] 3.2 Add period toggle (Ant Design `Segmented` or `Radio.Group`) with options "7 days" / "30 days" — local state drives the `period` passed to `useDashboardStats`
- [x] 3.3 Wire `revenueByDay` data to `<BarChart>` — `XAxis` shows the date (short format e.g. "Apr 14"), `YAxis` auto-scales, `Tooltip` shows the formatted revenue amount using `useLocaleCurrency().format()`
- [x] 3.4 Show a loading skeleton (`<Skeleton active />`) while `isLoading` is true
- [x] 3.5 Add i18n keys `dashboard.revenueChart`, `dashboard.period7d`, `dashboard.period30d` to `messages/en.json` and `messages/vi.json`

## 4. Room Status Overview Component

- [x] 4.1 Create `modules/dashboard/components/RoomStatusOverview.tsx` as a `"use client"` component — render a `Card` (variant="borderless") with title from `dashboard.roomStatus` i18n key
- [x] 4.2 Map `roomStatusCounts` to a list of rows: each row shows a colored dot (using the status `color` field), status name, and count. Show total active rooms as a summary at the top.
- [x] 4.3 Add i18n keys `dashboard.roomStatus`, `dashboard.totalRooms` to `messages/en.json` and `messages/vi.json`

## 5. Activity Panel Component

- [x] 5.1 Create `modules/dashboard/components/ActivityPanel.tsx` as a `"use client"` component — render a `Card` with two `Tabs` items: "Arrivals" and "Departures"
- [x] 5.2 Each tab row shows guest name, room number, and `scheduledTime` formatted with `formatInTimezone(scheduledTime, hotelTz, 'HH:mm')` using `useHotelTimezone()` hook (from `providers/HotelTimezoneProvider.tsx`)
- [x] 5.3 Show `<Empty>` when a tab has no items
- [x] 5.4 Delete `modules/dashboard/components/UpcomingList.tsx` — it is fully replaced by `ActivityPanel`
- [x] 5.5 Add i18n keys `dashboard.arrivals`, `dashboard.departures` to `messages/en.json` and `messages/vi.json`

## 6. Housekeeping Summary Component

- [x] 6.1 Create `modules/dashboard/components/HousekeepingSummary.tsx` as a `"use client"` component — render a `Card` with three stat items: Pending, In Progress, Completed Today — using `housekeepingCounts` from `useDashboardStats`
- [x] 6.2 Add a "View All" link that navigates to the housekeeping route (use `ROUTES.HOUSEKEEPING` from `common/constants/routes.ts`, or the appropriate constant)
- [x] 6.3 Add i18n keys `dashboard.housekeeping`, `dashboard.pending`, `dashboard.inProgress`, `dashboard.completedToday`, `dashboard.viewAll` to `messages/en.json` and `messages/vi.json`

## 7. Dashboard Page Layout

- [x] 7.1 Update `app/[locale]/(main)/dashboard/page.tsx` — replace the static chart placeholder `div` with `<RevenueChart />`, add `<RoomStatusOverview />` in the sidebar column alongside `<ActivityPanel />`, and add `<HousekeepingSummary />` as a full-width or sidebar section. Remove the `UpcomingList` import.
- [x] 7.2 Verify the page layout is responsive: KPI cards in 2-col (mobile) / 4-col (desktop) grid; revenue chart spans 2/3 width on desktop with room status + activity panel in the remaining 1/3; housekeeping summary below.
