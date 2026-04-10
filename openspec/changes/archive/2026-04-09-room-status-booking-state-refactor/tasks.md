## 1. Seed — Vietnamese names and idempotent upsert

- [x] 1.1 Update `roomStatuses` array in `prisma/seed.ts` to use Vietnamese `name` values: `AVAILABLE` → `Trống`, `CLEANING` → `Đang dọn phòng`, `MAINTENANCE` → `Bảo trì`, `OCCUPIED` → `Đang có khách`, `OUT_OF_SERVICE` → `Ngưng khai thác`, `RESERVED` → `Đã đặt`. Keep `code` and `color` values unchanged.
- [x] 1.2 Change the `roomStatus` upsert `update` clause from `update: {}` to `update: { name: rs.name, color: rs.color }` so reseed updates names in place.

## 2. Seed — Correct room operational statuses

- [x] 2.1 In the `roomDefs` array, change rooms 201, 202, 203, 301, 401 from `roomStatusId: rsOCCUPIED!.id` to `roomStatusId: rsAVAIL!.id`. Their occupancy is now derived from Booking records.
- [x] 2.2 Change rooms 102, 302, 403 from `roomStatusId: rsRESERVED!.id` to `roomStatusId: rsAVAIL!.id`. Reservation state comes from `currentBooking.bookingState`.
- [x] 2.3 Remove `rsRESERVED` and `rsOCCUPIED` from the destructured `Promise.all` lookup in the seed (lines ~149-155) since they are no longer used in `roomDefs`. Keep `rsAVAIL`, `rsCLEANING`, `rsMOINT`. Also remove `rsOCCUPIED` and `rsRESERVED` variables entirely to avoid unused variable TypeScript warnings.

## 3. RoomCard — Booking-state badge and border color

- [x] 3.1 In `modules/room-map/components/RoomCard.tsx`, add a helper (inline or local const) that resolves the effective display state from `room.currentBooking?.bookingState`:
  - `"checked_in"` → `{ label: "Có khách", color: "#52c41a" }`
  - `"reserved"` → `{ label: "Đã đặt", color: "#722ed1" }`
  - `"checked_out"` → `{ label: "Đã trả phòng", color: "#8c8c8c" }`
  - `"none"` or absent → `{ label: room.roomStatus.name, color: room.roomStatus.color }`
- [x] 3.2 Replace the `StatusBadge` props to use the resolved `label` and `color` from the helper above (instead of directly using `room.roomStatus.color` and `room.roomStatus.name`).
- [x] 3.3 Replace the `borderTop` inline style color from `room.roomStatus.color` to the resolved effective `color`.

## 4. Verification

- [x] 4.1 Run `npm run db:seed`. Confirm the seed completes without errors. Verify in Prisma Studio (or logs) that room statuses have Vietnamese names and that rooms 201, 202, 203, 301, 401, 102, 302, 403 have `roomStatus.code === "AVAILABLE"`.
- [x] 4.2 Open the Room Map in the browser. Confirm:
  - Room 102 (`bookingState: "reserved"`) → purple "Đã đặt" badge and purple border
  - Room 201 (`bookingState: "checked_in"`) → green "Có khách" badge and green border
  - Room 204 (`bookingState: "checked_out"`) → grey "Đã trả phòng" badge and grey border
  - Room 103 (no booking, `roomStatus: CLEANING`) → shows "Đang dọn phòng" badge in orange
  - Room 104 (no booking, `roomStatus: MAINTENANCE`) → shows "Bảo trì" badge in red
  - Room 101 (no booking, `roomStatus: AVAILABLE`) → shows "Trống" badge in green
