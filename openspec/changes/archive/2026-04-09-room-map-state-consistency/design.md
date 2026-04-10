## Context

The previous `room-map-booking-state` and `room-status-booking-state-refactor` changes established the separation of operational room status and booking-derived occupancy state. The booking overlap query, `bookingState` derivation, and seed data are all correct. This change closes the remaining surface-area gaps: duplicate code, an inconsistent API detail route, a contradictory modal header, and a missing UI filter.

## Goals / Non-Goals

**Goals:**
- Single source of `toRoomDTO` / `deriveBookingState` / `buildBookingInclude` — no drift between routes
- `/api/rooms/[id]` returns the booking overlapping `?date=`, not just the most-recent non-cancelled one
- Room Detail modal header shows both operational status and booking occupancy simultaneously
- Room Map can be filtered by booking occupancy state (none / reserved / checked_in / checked_out)

**Non-Goals:**
- No schema changes
- No server-side booking-state filtering (client-side is sufficient given limit: 200)
- No changes to check-in/check-out flow (already correct)
- No changes to Room Management CRUD beyond benefiting from the fixed `[id]` route

## Decisions

### D1: Extract shared utils to `app/api/rooms/_utils.ts`

Next.js co-locates route files. A `_utils.ts` file in the same directory (prefixed with `_`) is not treated as a route by Next.js and is safe to use as a shared module. Both `route.ts` and `[id]/route.ts` import from `../_utils.ts` (relative path from `[id]/`).

**Alternative considered**: `lib/roomUtils.ts` (global lib). Rejected — these utils are specific to the rooms API boundary, not globally reusable. Keeping them close to the routes is cleaner.

### D2: `[id]` route accepts `?date=` and defaults to today

The list route always has a date (defaults to today). The detail route should match. When called without `?date=`, it defaults to today's date — same default as the list route. Room Management CRUD callers (no date param) get today's booking, which is correct for an "is this room currently occupied?" check.

### D3: Modal header shows both tags when booking exists

| State | Header shows |
|---|---|
| `none` | `[Operational badge]` only |
| `reserved` | `[Operational badge]` `[Đã đặt · BK-xxxx]` |
| `checked_in` | `[Operational badge]` `[Có khách · BK-xxxx · Guest Name]` |
| `checked_out` | `[Operational badge]` `[Đã trả phòng · BK-xxxx]` |

The `BookingStateTag` component (already existing) is reused in the header. The info bar's right-side duplicate is removed.

**Rationale**: Staff need both signals simultaneously — housekeeping state (is the room being cleaned?) and booking state (is there a guest?). A room can be CLEANING with a CHECKED_OUT guest — both should be visible.

### D4: Booking-state filter is client-side only

The API returns up to 200 rooms per fetch. Client-side filtering on `currentBooking?.bookingState` is instant. A server-side filter would require a JOIN or subquery, adding complexity with negligible benefit at this scale.

The filter value `"all"` is the default (no filter). The `useRoomMap` hook strips `bookingState` from the API params so it never reaches the server.

## Risks / Trade-offs

- [Risk] If a hotel has >200 rooms, client-side booking state filter is incomplete. **Mitigation**: Limit is intentionally set at 200; at that scale a server-side filter may be needed. Leave a comment in `useRoomMap`.
- [Trade-off] The operational status filter (`statusId`) is still server-side. A combination of both filters (CLEANING + reserved) is conjunctive only if the server filter is applied first, then client filter. This works correctly.
- [Risk] `_utils.ts` naming could collide with convention in future Next.js versions. **Mitigation**: `_` prefix is a documented Next.js private segment convention for colocation.

## Migration Plan

No data migration needed. Run `npm run db:seed` to confirm seed still works. TypeScript check confirms no type errors.
