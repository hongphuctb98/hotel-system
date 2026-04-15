## 1. API — New Matrix Endpoint

- [x] 1.1 Create `app/api/bookings/matrix/route.ts` with a `GET` handler that accepts `checkInFrom` and `checkInTo` query params
- [x] 1.2 Build a `where` clause: if `checkInFrom` is present set `checkInDate.gte`; if `checkInTo` is present set `checkInDate.lte`; no status exclusion (include all statuses)
- [x] 1.3 Fetch all matching bookings with `select: { bookingStatusId: true, room: { select: { roomTypeId: true } } }` (no nested guest/services payloads)
- [x] 1.4 Aggregate into a `Map<statusId+roomTypeId, count>` and return `ok({ cells: [{ bookingStatusId, roomTypeId, count }] })`

## 2. API — Remove Stats Endpoint

- [x] 2.1 Delete `app/api/bookings/stats/route.ts`

## 3. Hook — Replace useBookingStats with useReservationMatrix

- [x] 3.1 Delete `modules/reservations/hooks/useBookingStats.ts`
- [x] 3.2 Create `modules/reservations/hooks/useReservationMatrix.ts` — `useQuery` against `GET /api/bookings/matrix?checkInFrom=<v>&checkInTo=<v>` with `queryKey: ["bookings", "matrix", checkInFrom ?? "", checkInTo ?? ""]`, `staleTime: 30_000`; accepts `{ checkInFrom?: string; checkInTo?: string }` props

## 4. Component — Rewrite ReservationSummary

- [x] 4.1 Rewrite `modules/reservations/components/ReservationSummary.tsx` to accept props `{ checkInFrom?: string; checkInTo?: string }` and remove all internal scope state and Segmented control imports
- [x] 4.2 Call `useReservationMatrix({ checkInFrom, checkInTo })` and `useMasterData()` inside the component; show a `Skeleton.Button` grid while loading
- [x] 4.3 Build the column definitions: first column is the status label (header = "Status"); one column per room type that appears in the matrix cells (use `roomType.name` from master data); last column is "Total"
- [x] 4.4 Build the row data: one row per booking status from `useMasterData().bookingStatuses`; each cell value is the count from the matrix for that `bookingStatusId` + `roomTypeId` pair; zero cells render as `—`; status label cell uses the status color as a left border accent
- [x] 4.5 Add a "Total" summary row at the bottom with column sums
- [x] 4.6 Render as an Ant Design `Table` with `pagination={false}` and `size="small"`; omit room-type columns where every row value is 0

## 5. Page — Pass Date Range to Summary

- [x] 5.1 In `app/[locale]/(main)/reservations/page.tsx`, update the `<ReservationSummary />` render to pass `checkInFrom={filters.checkInFrom}` and `checkInTo={filters.checkInTo}`

## 6. Cleanup — Remove Unused i18n Keys

- [x] 6.1 Remove keys `booking.scopeDay`, `booking.scopeWeek`, `booking.scopeMonth`, `booking.scopeYear` from `messages/en.json` and `messages/vi.json` (replaced by filter bar date range; no longer rendered)
