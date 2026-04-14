## Tasks

- [x] Checkout API (`checkout/route.ts`): load room status in initial query; resolve OCCUPIED room status in parallel with CHECKED_OUT booking status; auto-set room to OCCUPIED after checkout (guarded: only if current roomStatus.isSellable) — OCCUPIED is non-sellable so the room appears in operational mode awaiting the explicit "Clean Room" step
- [x] `RoomDetailModalFooter.tsx`: in operational mode, show "Clean Room" button (→ CLEANING) for OCCUPIED status; keep existing "Cleaning Done"/"Mark Available" button for CLEANING/MAINTENANCE/OUT_OF_SERVICE
- [x] `roomModalMode.ts`: import ROOM_STATUS_CODES; add AVAILABLE guard in `resolveStayMode` so AVAILABLE rooms with stale checked_out booking return "vacant"
- [x] `RoomCard.tsx`: import ROOM_STATUS_CODES; insert AVAILABLE check in `resolveDisplayState` before checked_out branch so cleaned-and-available rooms show the AVAILABLE badge
