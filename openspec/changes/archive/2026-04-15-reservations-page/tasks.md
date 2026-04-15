## 1. Dependencies and i18n

- [x] 1.1 Install `xlsx` package: `npm install xlsx`
- [x] 1.2 Add new i18n keys to `messages/en.json` under `booking`: `editTitle`, `updateAction`, `updateSuccess`, `cancelAction`, `cancelConfirm`, `cancelSuccess`, `chargeType`, `nightly`, `hourly`, `blockHours`, `hourlyRate`, `discount`, `surcharge`, `nights`, `paymentStatus`, `paid`, `unpaid`, `noInvoice`, `bookingInfo`, `summaryByStatus`, `summaryByRoomType`, `scopeDay`, `scopeWeek`, `scopeMonth`, `scopeYear`, `exportFilename`, `viewFullDetails`
- [x] 1.3 Add the same keys to `messages/vi.json` with Vietnamese translations

## 2. API — List Filter Fixes

- [x] 2.1 In `app/api/bookings/route.ts` GET handler: add `checkInFrom` filter — `if (filters.checkInFrom) where.checkInDate = { ...where.checkInDate, gte: new Date(filters.checkInFrom) }`
- [x] 2.2 Add `checkInTo` filter — `if (filters.checkInTo) where.checkInDate = { ...where.checkInDate, lte: new Date(filters.checkInTo) }`
- [x] 2.3 Add `roomTypeId` filter — `if (filters.roomTypeId) where.room = { roomTypeId: filters.roomTypeId }`
- [x] 2.4 Extend the `search` clause to also match `bookingNumber`: add `{ bookingNumber: { contains: search, mode: "insensitive" } }` to the OR array

## 3. API — Stats Endpoint and Export Mode

- [x] 3.1 Create `app/api/bookings/stats/route.ts` with a `GET` handler that accepts `?scope=day|week|month|year`
- [x] 3.2 Compute the `checkInDate` range server-side from `scope` and the current date: `day` = today, `week` = current Mon–Sun, `month` = current month, `year` = current year; default to `month` if `scope` is absent or invalid
- [x] 3.3 Query all bookings (no status exclusion — include CANCELLED and CHECKED_OUT) where `checkInDate` is within the computed range; `include: { bookingStatus: true, room: { include: { roomType: true } } }`
- [x] 3.4 Aggregate: group by `bookingStatusId` for `byStatus` (include `id`, `name`, `color`, `count`) and by `room.roomTypeId` for `byRoomType` (include `id`, `name`, `count`)
- [x] 3.5 Return `ok({ scope, byStatus: [...], byRoomType: [...] })`
- [x] 3.6 In `app/api/bookings/route.ts` GET handler: when `searchParams.get("export") === "1"`, skip the `skip`/`take` pagination and return all matching records (apply the same `where` filters as the normal list query)

## 4. Hooks

- [x] 4.1 Create `modules/reservations/hooks/useUpdateBooking.ts` — wraps `bookingService.update(id, data)`, invalidates `["bookings"]` and `["bookings", id]` on success; no toast inside the hook
- [x] 4.2 Create `modules/reservations/hooks/useCancelBooking.ts` — calls `bookingService.update(id, { bookingStatusId })` where `bookingStatusId` is the CANCELLED status looked up from `useMasterData().bookingStatuses`; invalidates `["bookings"]` and `["bookings", id]` on success
- [x] 4.3 Create `modules/reservations/hooks/useBookingStats.ts` — `useQuery` against `GET /api/bookings/stats?scope=<scope>` with `queryKey: ["bookings", "stats", scope]` and `staleTime: 30_000`; accepts a `scope: "day" | "week" | "month" | "year"` parameter

## 5. Reservation Summary

- [x] 5.1 Create `modules/reservations/components/ReservationSummary.tsx` — holds `scope` state (default `"month"`); renders a Segmented control (`t("booking.scopeDay")` / `t("booking.scopeWeek")` / `t("booking.scopeMonth")` / `t("booking.scopeYear")`) that updates `scope` and triggers `useBookingStats(scope)` refetch
- [x] 5.2 Render two card groups: booking-status counts (each card uses `status.name` as label and `status.color` as accent, sourced from `byStatus`) and room-type counts (`roomType.name` from `byRoomType`); omit cards with `count === 0`
- [x] 5.3 Show a skeleton loader while stats are loading

## 6. Reservation List — Filters, Columns, and Export

- [x] 6.1 Lift filter state to `app/[locale]/(main)/reservations/page.tsx` as a `BookingFilters` `useState`; pass filters as props to `ReservationTable` and the export handler
- [x] 6.2 Add filter bar at the top of `ReservationTable` (received as props): `Input.Search` for guest / booking number, `Select` (mode="multiple") for status from `useMasterData().bookingStatuses`, `DatePicker.RangePicker` for check-in range, `Select` for room type from `useMasterData().roomTypes`; any change resets page to 1
- [x] 6.3 Add **Payment Status** column to `ReservationTable`: derive from `booking.invoices[0]` — no invoice → `—`, `isPaid: true` → green Tag `t("booking.paid")`, `isPaid: false` → orange Tag `t("booking.unpaid")`
- [x] 6.4 Add **Note** column: display `booking.note` truncated with `Tooltip` showing full text; render `—` when null
- [x] 6.5 Add export button to the page header extra slot: on click, call `GET /api/bookings` with current `BookingFilters` plus `export=1` (bypasses pagination), generate xlsx client-side from the full response using the `xlsx` package, use `bookingStatus.name` (not `code`) for the status column, and trigger browser download as `reservations-YYYY-MM-DD.xlsx`; show button loading state during the fetch + generation

## 7. Booking Edit Modal

- [x] 7.1 Create `modules/reservations/components/BookingEditModal.tsx` with props `open`, `onClose`, `booking: Booking`
- [x] 7.2 Display room number and stay dates as read-only `Descriptions` labels at the top (not form inputs)
- [x] 7.3 Add form fields: adults `InputNumber` (required, min 1), children `InputNumber` (default 0), charge type `Select` (`nightly` / `hourly`), base rate `InputNumber` (required), discount `InputNumber` (optional), surcharge `InputNumber` (optional), source `Input` (optional), note `Input.TextArea` (optional)
- [x] 7.4 Conditionally render `hourlyBlockHours` and `hourlyRatePerHour` fields when charge type is `hourly`
- [x] 7.5 Wire `useEffect` on `open` to `form.setFieldsValue` with the booking's current values
- [x] 7.6 Wire submit: validate fields → call `useUpdateBooking` → on success show `message.success(t("booking.updateSuccess"))` and call `onClose`; set button `loading` to `mutation.isPending`

## 8. Reservation Detail Modal

- [x] 8.1 Create `modules/reservations/components/ReservationDetailModal.tsx` with props `open`, `onClose`, `bookingId: string`
- [x] 8.2 Fetch booking inside the modal via `useReservation(bookingId)` (existing hook); show a `Spin` while loading
- [x] 8.3 Render booking info using `Descriptions`: booking number, status `StatusBadge`, guest name, room number + type, floor, check-in, check-out, nights (computed), adults, children, charge type, base rate (`PriceDisplay`), total amount (`PriceDisplay`), payment status tag, source, note
- [x] 8.4 Add "Edit" button in modal footer that opens `BookingEditModal` for the same booking; after edit closes, the modal data auto-refreshes via cache invalidation
- [x] 8.5 Add "Cancel Reservation" button (danger): render it only when `booking.bookingStatus.code` is `"PENDING"` or `"CONFIRMED"` (pre-check-in states); clicking shows `modal.confirm`; on confirmation calls `useCancelBooking` with the CANCELLED status ID from `useMasterData().bookingStatuses`; on success closes the detail modal and shows `message.success(t("booking.cancelSuccess"))`; wire loading state to `useCancelBooking.isPending`
- [x] 8.6 Add "View full details" link in the footer that navigates to `/[locale]/reservations/[bookingId]` and closes the modal

## 9. Wire to Page

- [x] 9.1 In `app/[locale]/(main)/reservations/page.tsx`: add `selectedBookingId` state and `detailModal` disclosure; remove the non-functional "New Booking" button from the header
- [x] 9.2 Pass `onRowClick={(booking) => { setSelectedBookingId(booking.id); detailModal.open() }}` into `ReservationTable`; wire the eye icon to the same handler
- [x] 9.3 Render `<ReservationSummary />` above the filter bar
- [x] 9.4 Render `<ReservationDetailModal open={detailModal.isOpen} onClose={detailModal.close} bookingId={selectedBookingId} />` in the page

## 10. Fix Reservation Detail Page

- [x] 10.1 In `app/[locale]/(main)/reservations/[id]/page.tsx` add `const { message, modal } = App.useApp()` and replace all static `message.success` / `message.error` calls with call-site `onSuccess` / `onError` callbacks
- [x] 10.2 Replace all `format(v)` monetary value calls with `<PriceDisplay amount={Number(v)} isFallback={false} />`
- [x] 10.3 Replace hard-coded English section headers ("Booking Info", "Services", "Charges", "Base Rate", "Services Total", "Est. Total (incl. 10% tax)") with `t()` calls using the new i18n keys
