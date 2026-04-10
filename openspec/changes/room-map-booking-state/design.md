## Context

The current Room Map reads `currentBooking` from a thin Prisma include (only `firstName`/`lastName` + booking status). `RoomDetailModal` then keyword-matches the **room status badge name** (e.g. "Occupied") to decide footer buttons — not the booking record. The form is always empty when the modal opens because no booking fields flow through the DTO.

Additionally, `useCheckInFlow` always creates a new `Booking` before checking in. When a room already has a `CONFIRMED` (reserved) booking, this silently creates a duplicate booking for the same room and dates.

Current broken data flow:
```
DB Booking (full data)
  → Prisma include (thin: firstName/lastName + status only)
    → CurrentBooking DTO (minimal)
      → Modal (keyword-matches room status badge → decides state)
               (form empty despite active booking)
```

Target data flow:
```
DB Booking (full data)
  → Prisma include (expanded: all prefill fields + bookingState)
    → CurrentBooking DTO (summary: everything modal needs)
      → Modal (bookingState drives footer/info/form mode)
               (form prefilled from DTO when booking exists)
```

## Goals / Non-Goals

**Goals:**
- Expand `currentBooking` DTO to include guest identity, pricing, dates, and a server-derived `bookingState`
- Add `?date=` support to `GET /api/rooms` for date-based overlap query (always date-based; date defaults to today)
- Surface a `DatePicker` in `RoomFilterBar` defaulting to today
- Render the modal in a mode determined by `bookingState` — not by room status name
- Fix the reserved→check-in flow so it checks in the existing booking (no duplicate creation)
- Keep the walk-in check-in flow (guest dedup, manual entry) fully intact for `bookingState === "none"`

**Non-Goals:**
- Schema changes (no new DB columns)
- A dedicated `/api/rooms/map` endpoint
- Editing a reserved booking from the room map modal (use View Reservation → Reservations edit page)
- Real-time availability blocking
- A "live now / no date" mode — the date filter always has a value

## Decisions

---

### 1. `bookingState` derivation — server-side in `toRoomDTO()`

**Decision:** Compute `bookingState` in `toRoomDTO()` on the API side, from the booking record found by the overlap query.

Priority (highest wins):
```
booking.actualCheckOut != null
  OR booking.bookingStatus.code === "CHECKED_OUT"   →  "checked_out"

booking.actualCheckIn != null
  OR booking.bookingStatus.code === "CHECKED_IN"    →  "checked_in"

booking.bookingStatus.code in ["CONFIRMED","PENDING"] →  "reserved"

no booking matched                                  →  "none"
```

**Rationale:** Centralising this logic in the API means the frontend receives a stable enum and never re-implements booking-status branching. The frontend renders by `bookingState`; changes to status codes only require updating `toRoomDTO`.

**Alternative rejected:** Derive on the frontend from `bookingStatus.code`. Rejected — scatters logic and leaks server-domain status code semantics into UI code.

---

### 2. Date-overlap query — always date-based

**Decision:** Remove the current status-only booking filter. The rooms API always uses a date-overlap query:

```prisma
bookings: {
  where: {
    checkInDate:   { lte: endOfDay(date) },
    checkOutDate:  { gte: startOfDay(date) },
    bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
  },
  take: 1,
  orderBy: { createdAt: "desc" },
  include: { /* expanded fields */ },
}
```

The `date` param is always required. The client always sends `?date=YYYY-MM-DD` defaulting to today. There is no "no-date / live now" fallback path.

Using `notIn: ["CANCELLED","NO_SHOW"]` (instead of `in: [...]`) is intentional: it includes `CHECKED_OUT` bookings so the API can return a `"checked_out"` booking state for rooms that turned over on the selected date.

**What "date" means:** "Does this room have a booking whose date range overlaps this date?" A booking for 2026-04-08→2026-04-10 appears on April 8, 9, and 10.

**Rationale:** Status-only filter cannot answer "what is the state of this room on date X?" Date-overlap query can. Defaulting to today makes the default view operationally equivalent to the old "right now" status filter, but it is now semantically correct.

---

### 3. `currentBooking` DTO — expanded summary, no fetch on modal open

**Decision:** Expand the Prisma include to return all fields the room-map modal needs directly in the `currentBooking` summary. Do not fetch the full booking record separately when the modal opens.

Fields added to `currentBookingInclude`:
```
guest: { select: { firstName, lastName, phone, idNumber } }
booking: ratePerNight, depositAmount, source, note, actualCheckIn, actualCheckOut
```

**What the expanded DTO provides:**
- Guest display (name, phone, idNumber) — enough to show who is checked in / reserved
- Pricing prefill (ratePerNight, depositAmount)
- Dates (checkInDate, checkOutDate, actualCheckIn, actualCheckOut)
- `source`, `note` (for info display)
- `bookingState` (drives modal mode)
- `bookingStatus` (id, code, name, color — for navigation and display)

**What the expanded DTO does NOT include:** services, invoices, payments. These are managed in the Reservations module, not in the room-map modal.

**Rationale:** Embedding scalar booking fields in the list DTO is affordable (all rooms × a few scalar fields). Embedding relations (services, invoices) would not be. The expanded DTO makes the room-map modal self-sufficient without a secondary API call. A room list of 200 rooms with this expanded booking summary is reasonable.

**Alternative rejected:** Keep thin DTO and fetch full booking on modal open. Rejected because it requires a secondary query, delays modal render, and is unnecessary since the room-map modal only needs scalar fields (not services/invoices).

**`types/room.types.ts` note:** The `CurrentBooking` type and `BookingState` union are already written and match this decision. The API implementation is what needs updating.

---

### 4. `chargeType` extraction from note META

**Decision:** `useCheckInFlow` already serialises `chargeType` (and other interim fields) into the booking `note` as `[META] chargeType=nightly|...`. The modal reads this back on prefill:

```ts
// parse [META] chargeType=X from note; default "nightly" if absent
```

**Rationale:** Consistent with the existing interim approach (documented in room-map-modal design) until a schema migration adds a dedicated `chargeType` column. Parsing failure falls back silently to "nightly".

---

### 5. Modal mode per booking state — four explicit states

**Decision:**

| `bookingState` | Form | Inputs | Footer actions |
|---|---|---|---|
| `"none"` | Full walk-in check-in form | All editable | Check In · Close |
| `"reserved"` | Read-only booking/guest summary | All disabled | Check In · View Reservation · Close |
| `"checked_in"` | Read-only booking/guest summary | All disabled | Check Out · View Reservation · Close |
| `"checked_out"` | Read-only booking/guest summary | All disabled | View Reservation · Close |

**For `"reserved"` state:**
- Info bar shows: `Reserved · {bookingNumber}` tag
- Guest name, phone, idNumber, dates, rate displayed (read-only, from DTO)
- No form inputs are active
- **Check In** immediately calls `checkIn(currentBooking.id)` — no booking creation step
- **View Reservation** navigates to `/{locale}/reservations/{currentBooking.id}` for editing before check-in

**For `"checked_in"` state:**
- Info bar shows: `Checked In · {bookingNumber} · {firstName} {lastName}` tag
- **Check Out** calls `checkOut(currentBooking.id)`
- **View Reservation** navigates to the reservations detail page

**For `"checked_out"` state:**
- Info bar shows: `Checked Out · {bookingNumber}` tag (neutral/muted)
- No operational actions — room is free for the rest of the selected date
- **View Reservation** navigates to the reservations detail page (read-only)

**Rationale for reserved → read-only:** The room map is an operational tool for fast check-in/check-out, not a booking editor. Editing a reserved booking (changing rate, guest details, dates) belongs in the Reservations module where the full context is available. Making reserved fields editable in the modal would require expanding `PUT /api/bookings/[id]` and raises scope without commensurate value for the room map workflow.

**Alternative rejected:** Allow editing of checkInDate/checkOutDate/note before check-in. Rejected — the scope savings from removing this outweigh the convenience, and "View Reservation" provides a clear escape hatch.

---

### 6. Reserved → check-in: check in the existing booking

**Decision:** When `bookingState === "reserved"`, the Check In button must call `bookingService.checkIn(currentBooking.id)`. It must NOT create a new booking.

Current `useCheckInFlow` always creates a new booking (step 3 before check-in). This is correct for the `"none"` (walk-in) path only.

`useCheckInFlow` is updated to accept an optional `existingBookingId`. When provided:
1. Skip steps 1–4 (guest resolution, booking creation, service creation)
2. Directly call `bookingService.checkIn(existingBookingId)`
3. Invalidate `["room-map"]` and call `onSuccess()`

The walk-in path (`existingBookingId` absent) remains unchanged.

**Why this was broken:** The old design never distinguished between "walk-in" and "reserved" check-in paths. The modal always rendered the walk-in form regardless of booking state, so `useCheckInFlow` never knew a booking already existed.

---

### 7. `"checked_out"` in room map — shown as distinct state

**Decision:** Rooms with a checked-out booking on the selected date are shown in the room map with `bookingState === "checked_out"`. They appear with a neutral/muted badge.

**What "checked_out on date X" means:** The booking's date range overlaps date X AND the booking status is CHECKED_OUT or `actualCheckOut` is set. This means the room turned over on date X.

**Rationale:** Operationally useful — front desk staff can see which rooms turned over today, indicating they may need cleaning before re-sell. A room with state `"checked_out"` is available for new bookings; the modal communicates this clearly (no check-in button, info shows prior stay ended).

---

### 8. DatePicker default and format

**Decision:** Default to `dayjs()` (today). Format `DD/MM/YYYY`. The selected date is stored as `YYYY-MM-DD` in filter state and always sent as `?date=YYYY-MM-DD` to the API. Clearing the picker resets to today (not to "no date").

**Rationale:** Staff always need a date context. "No date" is ambiguous — today is the sensible default that matches what the old status-filter showed.

### 9. Test seed data — required while Reservations UI is incomplete

**Context:** The Reservations module is not finished. There is no UI for creating or managing bookings through the normal flow. Room Map booking-state behavior — the four modal modes, the date-overlap query, the reserved check-in path — cannot be verified manually without pre-existing booking records in the database.

**Decision:** `prisma/seed.ts` must include a dedicated block of room-map test data covering all four `bookingState` values, plus a future-booking scenario for testing date picker forward navigation. This seed data is classified as test/validation data, not sample product data.

**Booking date rule:** All seed booking dates must be computed relative to `new Date()` at seed execution time using day offsets (e.g. `today - 2 days`, `today + 5 days`). Hardcoded calendar dates become stale and stop exercising the overlap query.

**Required scenarios and which rooms to use** (from the existing seeded room set):

| Room | Scenario | Status | Date range (relative to seed date) | actualCheckIn/Out |
|---|---|---|---|---|
| 101 | No booking | — | — | — |
| 102 | Reserved overlapping today | CONFIRMED | checkIn = today−1, checkOut = today+3 | none |
| 201 | Checked-in overlapping today | CHECKED_IN | checkIn = today−2, checkOut = today+2 | actualCheckIn = today−2 |
| 204 | Checked-out overlapping today | CHECKED_OUT | checkIn = today−3, checkOut = today | actualCheckOut = today |
| 303 | Future booking (no overlap today) | CONFIRMED | checkIn = today+7, checkOut = today+10 | none |

**Guest data:** Every booking must reference a guest with `phone` and `idNumber` populated. Existing seed guests already satisfy this; assign them to these rooms.

**META chargeType note:** The booking for room 102 (reserved scenario) must include `[META] chargeType=nightly` in its `note` field. This is the primary path for testing the modal's chargeType prefill parsing. Adding it to room 201 (checked_in) as well is recommended.

**Rationale:** Without this data, it is impossible to confirm that: the date-overlap query returns the correct booking; `bookingState` is derived correctly server-side; the modal renders the correct mode for each state; the reserved check-in path calls `checkIn` on the existing booking rather than creating a new one.

---

## Risks / Trade-offs

- **`take: 1` booking selection** — if a room has two overlapping active bookings (data integrity issue), only the most recent is shown. Correct handling requires a DB constraint. Out of scope; if multiple are found, the most recently created booking takes precedence.
- **`checked_out` display lag** — if a room is checked out on another terminal between page load and modal open, the room card may still show `"checked_in"`. The 30-second refetch interval in `useRoomMap` limits the lag.
- **META note parsing** — `chargeType` stored as `[META] chargeType=X` in note. Silent fallback to "nightly" if note is manually edited. Acceptable until `chargeType` schema migration lands.

## Migration Plan

1. `app/api/rooms/route.ts` — expand include; replace status-only filter with date-overlap query; add `bookingState` to `toRoomDTO()`; map new DTO fields
2. `app/api/rooms/[id]/route.ts` — same include expansion for consistency
3. `common/services/roomService.ts` — add `date?: string` to params
4. `modules/room-map/hooks/useRoomMap.ts` — add `date` to filter state (default today); pass to service
5. `modules/room-map/components/RoomFilterBar.tsx` — add `DatePicker`; update props
6. `app/[locale]/(main)/room-map/page.tsx` — wire updated filters shape
7. `modules/room-map/hooks/useCheckInFlow.ts` — add `existingBookingId` param; skip create+service steps when provided
8. `modules/room-map/components/RoomDetailModal.tsx` — remove `getStatusType()`; four-mode rendering per `bookingState`; pass `currentBooking.id` to `useCheckInFlow` when reserved
9. `prisma/seed.ts` — add room-map test scenarios with relative dates (see Decision 9)
10. `npm run build` + `npm run db:seed` — verify all four booking states appear in Room Map

No DB schema changes. No new routes.
