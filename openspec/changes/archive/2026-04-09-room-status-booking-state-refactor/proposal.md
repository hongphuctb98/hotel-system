## Why

The system currently conflates two distinct concepts — room operational status (`RoomStatus`) and booking-derived occupancy state (`BookingState`) — causing the Room Map to show stale or incorrect data: rooms seeded as `OCCUPIED` or `RESERVED` at the DB level have no backing Booking records, while rooms with active stays may still show `AVAILABLE`. The Room Map must reflect actual booking data, not static room status fields.

## What Changes

- **Phase 1 — Vietnamese display names in seed**: Update `roomStatus` `name` values to Vietnamese (`Trống`, `Đang dọn phòng`, `Bảo trì`, `Đang có khách`, `Ngưng khai thác`, `Đã đặt`). Fix upsert to update `name` on reseed (currently the `update: {}` skips this). Keep all `code` values and `color` values unchanged.
- **Phase 2 — Seed data correctness**: Remove the mismatch where rooms 201, 202, 301, 401 have `roomStatusId = OCCUPIED` but their occupancy is now correctly derived from Booking data. Reset those rooms to `AVAILABLE` so the operational status layer is not pre-assigned incorrectly. Similarly rooms 102, 302, 403 which have `RESERVED` status should be `AVAILABLE` since the booking state already carries the reservation signal.
- **Phase 3 — RoomCard display logic**: Update `RoomCard.tsx` to show a booking-state badge (derived from `room.currentBooking?.bookingState`) as the primary occupancy indicator, while keeping the operational status badge (`roomStatus`) as a secondary signal for housekeeping states (`CLEANING`, `MAINTENANCE`, `OUT_OF_SERVICE`). The card border color should reflect the effective display state, not blindly use `room.roomStatus.color`.

## Capabilities

### New Capabilities
- `room-card-booking-state-display`: RoomCard renders a booking-state tag as primary occupancy indicator and falls back to operational room status for housekeeping/maintenance states.

### Modified Capabilities
- None — no spec-level requirement changes to existing capabilities; API contract (`currentBooking`, `bookingState`) is unchanged.

## Impact

- `prisma/seed.ts` — update Vietnamese names; fix `upsert` update clauses; change 8 room `roomStatusId` values from `OCCUPIED`/`RESERVED` → `AVAILABLE`
- `modules/room-map/components/RoomCard.tsx` — display logic for state badge and border color
- No schema changes, no API changes, no route changes
