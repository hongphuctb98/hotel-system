## Why

After separating `RoomStatus` (operational) from booking-derived `bookingState`, three concrete inconsistencies remained: (1) the Room Detail modal title showed the operational status badge ("Trống") while the body showed the booking occupancy state ("Có khách"), giving staff contradictory signals; (2) the `/api/rooms/[id]` route used a non-date-aware booking query inconsistent with the list route; (3) `toRoomDTO` / `deriveBookingState` were duplicated across two route files with no shared contract; (4) the Room Map filter bar had no way to filter rooms by booking occupancy state — the operational status filter became less useful after rooms were reset to AVAILABLE.

## What Changes

- **Shared API utils** — Extract `buildBookingInclude`, `buildDateBounds`, `roomBaseInclude`, `deriveBookingState`, `toRoomDTO` to `app/api/rooms/_utils.ts`. Both route files import from here.
- **Date-aware `[id]` route** — `/api/rooms/[id]` now accepts `?date=` and uses the same date-overlap booking query as the list route. Room Management module callers get consistent `currentBooking` data.
- **Modal header** — `RoomDetailModal` title now shows BOTH operational status badge AND booking-state tag when a booking exists. Info bar no longer duplicates the booking state tag.
- **Booking-state filter** — `useRoomMap` adds a `bookingState` filter applied client-side after fetching. `RoomFilterBar` adds a "occupancy state" Select. New i18n keys added.

## Capabilities

### New Capabilities
- `room-map-occupancy-filter`: Room Map filter bar includes a booking-state occupancy filter, applied client-side, separate from the operational status filter.

### Modified Capabilities
- `room-card-booking-state-display`: Room Detail modal header now shows both operational and booking-state signals simultaneously (previously only operational status was in the header).

## Impact

- `app/api/rooms/_utils.ts` — new shared module (no breaking change to API contract)
- `app/api/rooms/route.ts` — simplified, imports from `_utils.ts`
- `app/api/rooms/[id]/route.ts` — now date-aware, imports from `_utils.ts`
- `modules/room-map/components/RoomDetailModal.tsx` — header shows both status types
- `modules/room-map/hooks/useRoomMap.ts` — adds `bookingState` filter, client-side
- `modules/room-map/components/RoomFilterBar.tsx` — adds occupancy state Select
- `messages/en.json`, `messages/vi.json` — two new keys per locale
