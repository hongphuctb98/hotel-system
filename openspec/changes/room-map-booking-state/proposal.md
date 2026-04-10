## Why

> **Testing constraint:** The Reservations module is not yet complete. Room Map booking-state behavior cannot be validated through the normal reservation management UI. Representative seed data in Prisma is therefore **required** — not optional — as part of this change. Without it, it is not possible to verify that the four booking states (`none`, `reserved`, `checked_in`, `checked_out`) render correctly or that the check-in flows work as designed.

The Room Map modal has two compounding failures:

1. **Booking state derived from room status name text** — `RoomDetailModal` uses `getStatusType()`, a keyword-match on the room status badge string (e.g. "Occupied", "Reserved"). This means footer actions and info bar reflect the room's static administrative status, not the live booking record. A room can show "Occupied" while the form renders completely empty.

2. **Reserved booking → duplicate booking on check-in** — `useCheckInFlow` always creates a new `Booking` record then checks it in. When a room already has a `CONFIRMED` (reserved) booking, this produces a second booking for the same room/period — a data integrity bug.

Secondary gaps:
- `currentBooking` DTO is too thin (guest only exposes firstName/lastName; no phone, idNumber, ratePerNight, depositAmount, source, note, actualCheckIn, actualCheckOut, bookingState)
- Room Map has no date picker — it always shows "right now" state; staff cannot check future availability

## What Changes

### 1. Expand `currentBooking` DTO (API + types)
Expand the Prisma include in `GET /api/rooms` and `GET /api/rooms/[id]` to select all fields required to drive the modal. Add server-side `bookingState` derivation in `toRoomDTO()`. The expanded summary is sufficient for all room-map modal display — no separate full-booking fetch is needed.

`types/room.types.ts` is already updated with the expanded `CurrentBooking` type and `BookingState` union. The API is not yet updated.

### 2. Date-aware rooms API
`GET /api/rooms` accepts a required `?date=YYYY-MM-DD` param (defaulting to today on the client). The booking overlap query always uses:
```
checkInDate ≤ date AND checkOutDate ≥ date AND bookingStatus.code NOT IN ["CANCELLED", "NO_SHOW"]
```
This replaces the current status-only filter (`IN ["PENDING","CONFIRMED","CHECKED_IN"]`) and naturally includes `CHECKED_OUT` bookings, allowing the API to return a `"checked_out"` booking state when relevant.

### 3. Date picker in filter bar
`RoomFilterBar` gains a `DatePicker` defaulting to today. The selected date flows through `useRoomMap` → `roomService.findAll` → API. There is no "no date / live now" mode — the picker always has a value and resets to today when cleared.

### 4. Booking-state-driven modal
`RoomDetailModal` removes `getStatusType()` keyword matching entirely. All footer actions, info bar tags, and form editability are driven by `room.currentBooking?.bookingState`.

### 5. Two distinct check-in flows
| Room state | User clicks Check In | Action |
|---|---|---|
| `none` (walk-in) | Check In | Create new booking → `checkIn(newId)` (existing flow) |
| `reserved` | Check In | `checkIn(currentBooking.id)` — check in the EXISTING booking |

The reserved flow must not create a new booking. `useCheckInFlow` is updated to accept the existing booking ID when present.

### 6. Modal mode per booking state
| `bookingState` | Form | Footer |
|---|---|---|
| `none` | Full walk-in form (editable) | Check In · Close |
| `reserved` | Read-only booking summary | Check In · View Reservation · Close |
| `checked_in` | Read-only booking summary | Check Out · View Reservation · Close |
| `checked_out` | Read-only booking summary | View Reservation · Close |

For `reserved`: the modal shows prefilled guest/booking info from `currentBooking`. Staff who need to edit the booking before check-in use **View Reservation** to navigate to the full reservations edit page. The room map modal is an operational tool, not a booking editor.

## Capabilities

### New Capabilities
- `date-aware-room-map`: DatePicker in filter bar; `GET /api/rooms?date=` returns booking overlap state for the selected date
- `booking-driven-modal-state`: All modal behavior (footer, info bar, form editability) driven by `currentBooking.bookingState` from the DTO

### Corrected Behavior (not new requirements)
- Reserved booking check-in no longer creates a duplicate booking
- Modal form prefills from `currentBooking` DTO when booking exists

## Impact

| File | Change |
|---|---|
| `app/api/rooms/route.ts` | Expand `currentBookingInclude`; add `?date=` date-overlap query; add `bookingState` derivation in `toRoomDTO()` |
| `app/api/rooms/[id]/route.ts` | Same `currentBookingInclude` expansion for consistency |
| `types/room.types.ts` | **Already done** — `BookingState` union + expanded `CurrentBooking` |
| `common/services/roomService.ts` | Add `date?: string` to params; forward as `?date=` |
| `modules/room-map/hooks/useRoomMap.ts` | Add `date` to filter state (default today); pass to service |
| `modules/room-map/components/RoomFilterBar.tsx` | Add `DatePicker` |
| `app/[locale]/(main)/room-map/page.tsx` | Wire updated filters shape |
| `modules/room-map/components/RoomDetailModal.tsx` | Remove `getStatusType()`; mode-based rendering per `bookingState` |
| `modules/room-map/hooks/useCheckInFlow.ts` | Add reserved mode: accept existing `bookingId`; skip booking creation when provided |
| `prisma/seed.ts` | Add room-map test scenarios (see below) — required because the Reservations UI is not yet available for manual data entry |

No DB schema changes. No new API routes.

### Required test seed data

The Reservations module is not yet complete, so room-map behavior cannot be validated through the normal reservation flow. Seed data covering the following scenarios is **required** for this change to be testable:

| Scenario | Expected `bookingState` on today | Notes |
|---|---|---|
| Room with no booking | `none` | No booking record exists for this room |
| Room with reserved booking overlapping today | `reserved` | CONFIRMED or PENDING; checkInDate ≤ today ≤ checkOutDate; no actualCheckIn |
| Room with checked-in booking overlapping today | `checked_in` | CHECKED_IN; actualCheckIn set; checkInDate ≤ today ≤ checkOutDate |
| Room with checked-out booking whose date range includes today | `checked_out` | CHECKED_OUT; actualCheckOut set; checkOutDate = today |
| Room with a future booking not overlapping today | `none` (today) / `reserved` (future date) | CONFIRMED; checkInDate > today; used to test date picker forward navigation |

All seeded guests must include `phone` and `idNumber`. At least the reserved booking must include `[META] chargeType=nightly` in its `note` field to exercise modal prefill parsing. All booking dates must be computed relative to the seed run date (e.g. `subDays(today, 2)`) so the data remains valid when `npm run db:seed` is re-run at any time.
