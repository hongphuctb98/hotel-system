## 1. Types — already complete

- [x] 1.1 `BookingState` union type (`"none" | "reserved" | "checked_in" | "checked_out"`) exists in `types/room.types.ts`
- [x] 1.2 `CurrentBooking` type in `types/room.types.ts` includes `guestId`, `guest.phone`, `guest.idNumber`, `source`, `note`, `ratePerNight`, `depositAmount`, `actualCheckIn`, `actualCheckOut`, `bookingState`, and full `bookingStatus`

No changes needed. The API implementation is what lags behind the types.

---

## 2. API — Rooms list route (`app/api/rooms/route.ts`)

- [x] 2.1 Replace the current thin `currentBookingInclude` with an expanded include that selects `guest: { select: { firstName, lastName, phone, idNumber } }` and booking scalar fields `ratePerNight`, `depositAmount`, `source`, `note`, `actualCheckIn`, `actualCheckOut`; keep `bookingStatus: { select: { id, code, name, color } }`

- [x] 2.2 Replace the status-only booking `where` clause (`code: { in: ["PENDING","CONFIRMED","CHECKED_IN"] }`) with a date-overlap query:
  ```
  checkInDate:   { lte: endOfDay(date) }
  checkOutDate:  { gte: startOfDay(date) }
  bookingStatus: { code: { notIn: ["CANCELLED","NO_SHOW"] } }
  ```
  Parse `?date=` from `req.nextUrl.searchParams`. The date param is always present (client always sends it). Use `date-fns` `startOfDay`/`endOfDay` or equivalent `dayjs` UTC boundaries.

- [x] 2.3 Add `bookingState` derivation in `toRoomDTO()` using the priority rules from the design (checked_out → checked_in → reserved → none). Derive from `bookingStatus.code` and `actualCheckIn`/`actualCheckOut`.

- [x] 2.4 Map the new fields into the `currentBooking` object returned by `toRoomDTO()` so the response shape matches `CurrentBooking` in `types/room.types.ts`.

---

## 3. API — Room detail route (`app/api/rooms/[id]/route.ts`)

- [x] 3.1 Apply the identical `currentBookingInclude` expansion from task 2.1 to `app/api/rooms/[id]/route.ts`.

- [x] 3.2 Apply the identical `bookingState` derivation from task 2.3 to the `toRoomDTO()` function in this file (or extract `toRoomDTO` to a shared helper).

Note: `GET /api/rooms/[id]` does not have a date param — it derives booking state from the current snapshot. Use the `notIn: ["CANCELLED","NO_SHOW"]` filter without date bounds here.

---

## 4. Service layer (`common/services/roomService.ts`)

- [x] 4.1 Add `date?: string` to the params type and forward it as `?date=` in the query string when present.

---

## 5. Room Map filter state (`modules/room-map/hooks/useRoomMap.ts`)

- [x] 5.1 Add `date: string` to `RoomMapFilters` type; initialise to `dayjs().format("YYYY-MM-DD")` (today).

- [x] 5.2 Pass `date` from filter state into the `roomService.findAll` call. The date is always present in the query — do not omit it.

---

## 6. Room Map filter bar UI (`modules/room-map/components/RoomFilterBar.tsx`)

- [x] 6.1 Add `DatePicker` to `RoomFilterBar` with `format="DD/MM/YYYY"`, default value of today, and an `onChange` that calls the date change handler with `YYYY-MM-DD` format (or resets to today if cleared).

- [x] 6.2 Update the `Filters` type and `RoomFilterBarProps` to include `date: string` and `onDateChange: (date: string) => void`.

- [x] 6.3 Wire the new `date` and `onDateChange` props from `useRoomMap` into `RoomFilterBar` in `app/[locale]/(main)/room-map/page.tsx`.

---

## 7. `useCheckInFlow` — add reserved mode (`modules/room-map/hooks/useCheckInFlow.ts`)

- [x] 7.1 Add an optional `existingBookingId?: string` parameter to `handleCheckIn` (or to the hook itself via the `room` prop using `room.currentBooking?.id` when `bookingState === "reserved"`).

- [x] 7.2 When `existingBookingId` is present:
  - Skip step 1 (guest resolution)
  - Skip step 2 (confirm status lookup)
  - Skip step 3 (booking creation)
  - Skip step 4 (service creation)
  - Go directly to step 5: `await bookingService.checkIn(existingBookingId)`
  - Then invalidate `["room-map"]` and call `onSuccess()`

- [x] 7.3 The walk-in path (when `existingBookingId` is absent) remains unchanged.

---

## 8. `RoomDetailModal` — booking-state-driven rendering (`modules/room-map/components/RoomDetailModal.tsx`)

- [x] 8.1 Remove `getStatusType()`, `STATUS_COLOR_MAP`, and `getStatusColor()` keyword-match functions. Remove the local `bookingState` variable computed from `booking.bookingStatus.code` (which uses `"checked-in"` — note the dash, not underscore — inconsistently).

- [x] 8.2 Derive state exclusively from `room.currentBooking?.bookingState ?? "none"`. This is the single source of truth for all modal rendering decisions.

- [x] 8.3 Implement the four-mode info bar:
  - `"none"`: plain `No Booking` tag
  - `"reserved"`: `Reserved · {bookingNumber}` tag (purple/violet)
  - `"checked_in"`: `Checked In · {bookingNumber} · {firstName} {lastName}` tag (green)
  - `"checked_out"`: `Checked Out · {bookingNumber}` tag (neutral/muted)

- [x] 8.4 Implement the four-mode footer:
  - `"none"`: Check In · Close
  - `"reserved"`: Check In · View Reservation · Close
  - `"checked_in"`: Check Out · View Reservation · Close
  - `"checked_out"`: View Reservation · Close

- [x] 8.5 For `"reserved"`, `"checked_in"`, and `"checked_out"`: disable all form inputs (`disabled` prop on each section). Display guest name, phone, idNumber, dates, and rate from `room.currentBooking` in a read-only summary above or in place of the form. The walk-in form sections (GuestSearchSection, ServiceItemsSection, PaymentSummarySection) should not be rendered for non-`"none"` states.

- [x] 8.6 Update the Check In handler:
  - For `"none"`: call `handleCheckIn(formValues)` as today — this runs the full walk-in flow
  - For `"reserved"`: call `handleCheckIn` with `existingBookingId = room.currentBooking.id` — this skips booking creation and calls `checkIn` on the existing booking directly (per task 7)

- [x] 8.7 For `"reserved"`, prefill the booking summary display from `room.currentBooking` (no additional API call needed — the expanded DTO has all fields required for display). Parse `chargeType` from `room.currentBooking.note` using the `[META] chargeType=X` pattern for display only.

- [x] 8.8 The room status badge color in the modal title header may continue to use `room.roomStatus.color` (the DB color field) — this is unrelated to booking state and is correct to keep.

---

## 9. Build verification

- [x] 9.1 Run `npm run build` and confirm zero TypeScript errors. Pay particular attention to the `RoomDetailModal` → `useCheckInFlow` interface change and the `CurrentBooking` DTO shape being fully populated by the API.

---

## 10. Seed data for room-map testing

> **Why this section exists:** The Reservations module is not complete. Room Map behavior cannot be verified through the normal booking creation flow. These seed records are the only way to exercise all four `bookingState` paths, the date-overlap query, and the modal's chargeType prefill parsing. This is required test data, not optional sample content.

- [x] 10.1 In `prisma/seed.ts`, compute `today` as `new Date()` at the top of the room-map seed block. Define all booking dates as day offsets from `today` (e.g. `subDays(today, 2)`) so the data remains valid when the seed is re-run at any time. Use `dayjs` (already in the project) or plain `Date` arithmetic — no new dependencies.

- [x] 10.2 Add a booking for **room 102** with status `CONFIRMED`, no `actualCheckIn`, `checkInDate = today − 1 day`, `checkOutDate = today + 3 days`. Assign an existing seeded guest that has both `phone` and `idNumber` set. Set `note` to include `[META] chargeType=nightly` so that modal chargeType parsing is exercised when this room is opened. Set `source = "Direct"` and `depositAmount > 0`.

- [x] 10.3 Add a booking for **room 201** with status `CHECKED_IN`, `actualCheckIn = today − 2 days`, `checkInDate = today − 2 days`, `checkOutDate = today + 2 days`. Assign an existing seeded guest with `phone` and `idNumber`. Set `note` to include `[META] chargeType=nightly`. This exercises the checked-in modal path and the Check Out button.

- [x] 10.4 Add a booking for **room 204** with status `CHECKED_OUT`, `checkInDate = today − 3 days`, `checkOutDate = today`, `actualCheckIn = today − 3 days`, `actualCheckOut = today` (set to the current moment at seed time). Assign any seeded guest. This exercises the checked-out modal path, the `"checked_out"` tag, and confirms that the date-overlap query returns this booking when `?date=today`.

- [x] 10.5 Add a booking for **room 303** with status `CONFIRMED`, `checkInDate = today + 7 days`, `checkOutDate = today + 10 days`, no `actualCheckIn`. This booking must **not** overlap today, so room 303 shows `bookingState: "none"` when the date picker is set to today. Advance the date picker to `today + 7` to verify the room then shows `"reserved"`. This exercises the date-picker navigation and the non-overlap scenario.

- [x] 10.6 Verify that **room 101** has no booking in the seed and continues to show `bookingState: "none"` — this is the baseline "empty room" case and requires no additional code, just confirmation that existing seed data does not add a booking to room 101.

- [x] 10.7 Run `npm run db:reset && npm run db:seed` and open the Room Map. Confirm visually that rooms 101, 102, 201, 204, and 303 each show the expected state tag in the Room Map grid on today's date. Open each room's modal and confirm the correct footer buttons, info bar tag, and (for 102 and 201) the read-only booking summary with guest name, phone, idNumber, and chargeType parsed from the META note.
