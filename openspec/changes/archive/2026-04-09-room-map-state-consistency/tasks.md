## 1. Extract shared room API utilities

- [x] 1.1 Create `app/api/rooms/_utils.ts` with `buildDateBounds`, `buildBookingInclude`, `roomBaseInclude`, `deriveBookingState`, `toRoomDTO` — extracted from both route files.
- [x] 1.2 Refactor `app/api/rooms/route.ts` to import from `_utils.ts` and remove inline duplicates.
- [x] 1.3 Refactor `app/api/rooms/[id]/route.ts` to import from `_utils.ts`, accept `?date=` query param, and use date-overlap booking query.

## 2. Fix modal header contradiction

- [x] 2.1 In `RoomDetailModal.tsx` title, always show operational status badge (`room.roomStatus.name`).
- [x] 2.2 In `RoomDetailModal.tsx` title, additionally render `BookingStateTag` when `bookingState !== "none"`.
- [x] 2.3 Remove the duplicate `BookingStateTag` from the info bar (it was at `marginLeft: "auto"` on the right side).

## 3. Add booking-state filter

- [x] 3.1 Add `bookingState?: BookingState | "all"` to `RoomMapFilters` type in `useRoomMap.ts`. Initialize to `"all"`.
- [x] 3.2 Strip `bookingState` from the API params (server does not filter by it). Apply filter client-side using `useMemo` on the fetched `data.data`.
- [x] 3.3 Add occupancy state `Select` to `RoomFilterBar.tsx` with options: All, none, reserved, checked_in, checked_out.
- [x] 3.4 Add i18n keys `bookingStateAll` and `bookingStateNone` to `messages/en.json` and `messages/vi.json`. (Other booking state labels reuse existing `reserved`, `checkedIn`, `checkedOut` keys.)

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` — zero TypeScript errors.
- [x] 4.2 Run `npm run db:seed` — seed completes without errors.
- [ ] 4.3 Open Room Map in browser. Verify:
  - Occupancy state filter renders and works for each option
  - Room 201 (checked_in) modal: header shows `[Trống] [Đã nhận phòng · BK-RMAP-0201 · Le Hoang Minh]`
  - Room 102 (reserved) modal: header shows `[Trống] [Đã đặt · BK-RMAP-0102]`
  - Room 103 (no booking, CLEANING) modal: header shows `[Đang dọn phòng]` only (no booking tag)
  - Selecting "Checked In" filter shows rooms 201, 202 (and any other checked-in rooms)
  - Selecting "No booking" filter shows rooms 101, 103, 104, 303, etc.
