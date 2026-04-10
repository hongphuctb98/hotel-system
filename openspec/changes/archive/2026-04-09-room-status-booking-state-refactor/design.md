## Context

The hotel Room Map currently uses `room.roomStatus` as both an operational signal (CLEANING, MAINTENANCE) and an occupancy signal (OCCUPIED, RESERVED). The `room-map-booking-state` change introduced `bookingState` derived from Booking records, but the seed data still seeds rooms with `roomStatusId = OCCUPIED / RESERVED` even though those rooms' real occupancy is now driven by bookings. This creates visual noise and logical confusion:

- Room Map renders a "OCCUPIED" status badge even for a room whose `bookingState = "none"` (no overlapping booking)
- The Room Map already has `currentBooking?.bookingState` as the authoritative occupancy signal — the card's status badge still blindly shows the static operational status color/label

Three isolated fixes are needed:
1. **Seed data** — Vietnamese names + upsert update clauses + correct `roomStatusId` values for rooms that now derive occupancy from bookings
2. **RoomCard display** — show booking-state badge as primary occupancy indicator; keep operational status for non-occupancy states

## Goals / Non-Goals

**Goals:**
- Room Map `RoomCard` correctly reflects booking-derived occupancy when a booking exists
- Room operational states (CLEANING, MAINTENANCE, OUT_OF_SERVICE) remain always visible
- Seed `upsert` updates `name` and `color` on reseed (idempotent)
- Vietnamese display names for all 6 room statuses
- Rooms without bookings that are seeded as OCCUPIED/RESERVED are corrected to AVAILABLE

**Non-Goals:**
- No schema changes — `RoomStatus` table stays as-is, all 6 codes preserved
- No API changes — `/api/rooms` already returns `currentBooking.bookingState`
- No auto-sync mechanism between bookings and `roomStatus` at check-in/out time (future work)
- No changes to booking flow or check-in/check-out handlers

## Decisions

### D1: RoomCard badge priority order

| Priority | Condition | Badge shown |
|----------|-----------|-------------|
| 1 | `bookingState === "checked_in"` | "Có khách" (blue/green) |
| 2 | `bookingState === "reserved"` | "Đã đặt" (purple) |
| 3 | `bookingState === "checked_out"` | "Đã trả phòng" (grey) |
| 4 | `roomStatus.code === "CLEANING"` | operational badge |
| 5 | `roomStatus.code === "MAINTENANCE"` | operational badge |
| 6 | `roomStatus.code === "OUT_OF_SERVICE"` | operational badge |
| 7 | fallback | operational status badge (AVAILABLE etc.) |

**Rationale**: Booking state is always the ground truth for occupancy. Housekeeping/maintenance statuses must remain visible even on rooms with no booking. The fallback to operational status handles free rooms (AVAILABLE) cleanly.

**Alternative considered**: Keep status badge as-is and add a second booking-state badge beside it. Rejected — doubles up information and confuses staff who see both "OCCUPIED" (stale static) and "Có khách" (live booking).

### D2: Border color follows effective badge

The card's top border (`borderTop: 4px solid`) currently uses `room.roomStatus.color`. Change it to use the effective badge color — the same color resolved in D1's priority table. Hardcode the booking-state colors to match the colors already used in the system:
- `checked_in` → `#52c41a` (green, same as AVAILABLE but meaning occupied)
- `reserved` → `#722ed1` (purple, same as RESERVED room status color)
- `checked_out` → `#8c8c8c` (grey)

**Rationale**: The border is the primary visual at-a-glance signal in the grid. It must be consistent with the badge.

### D3: Seed upsert must update `name` and `color`

Current seed uses `update: {}` for `roomStatus` upsert — names are never updated on reseed. Change to `update: { name: rs.name, color: rs.color }`.

### D4: Seed rooms — reset OCCUPIED/RESERVED to AVAILABLE

Rooms 201, 202, 203, 301 (seeded as OCCUPIED) and 102, 302, 403 (seeded as RESERVED) now correctly derive their occupancy from Booking records. Their static `roomStatus` should be `AVAILABLE` to avoid the dual-signal problem. Room 401 (suite, checked-in booking exists) can also be corrected. Room 103 stays CLEANING, room 104 stays MAINTENANCE — those are intentional operational states.

## Risks / Trade-offs

- [Risk] Staff may be manually setting `roomStatus = OCCUPIED` via the Room Management CRUD to track occupancy. **Mitigation**: This change does not touch the Room Management UI; staff can still set any status. The Room Map card will just show the booking badge above the static status. Document this behavior.
- [Risk] Hardcoded booking-state colors in `RoomCard` may drift from the room status palette. **Mitigation**: Use the same hex values already in seed; document the mapping in a comment.
- [Trade-off] No auto-sync of `roomStatus` at check-in/check-out — staff must manually set CLEANING after checkout. Accepted as out-of-scope for this change.

## Migration Plan

1. Run `npm run db:seed` after the seed changes — upsert will update names in-place.
2. No migration script needed (no schema changes).
3. Rollback: revert `seed.ts` and `RoomCard.tsx`, reseed.
