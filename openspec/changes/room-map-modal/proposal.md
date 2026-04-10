## Why

The current Room Map uses a right-side drawer (`RoomActionDrawer`) that shows minimal room info and only basic check-in/check-out buttons — receptionists cannot see guest details, pricing, or add services without navigating away. Replacing it with a full-featured centered modal gives staff everything they need to complete a check-in or check-out in one place.

## What Changes

- Replace `RoomActionDrawer` with a centered `RoomDetailModal` (800–950 px, dark overlay, close button top-right)
- Modal header: Room Number, Floor, Room Type, Status badge (Available=green, Occupied=blue, Reserved=purple, Cleaning=orange, Maintenance=red)
- Modal body split into five collapsible sections: Room Information, Guest / Check-in Information, Pricing & Services, Payment, Note
- Guest search: typeahead by Name, Phone, or CCCD/ID Number; auto-fills fields on selection
- Guest deduplication on Check In: match first by CCCD, then by Name + CCCD combo; create new guest if no match
- Dynamic service rows: select service item, enter quantity; unit price and line total derived from master data
- Calculated totals: Service Total, Total Payable (= Room Price + Services + Surcharge − Discount), Remaining Amount (= Total Payable − Prepaid)
- Payment section reads PaymentMethod master data
- Footer actions change by room status: Available → Check In + Close; Occupied → Check Out + Edit + Close; Reserved → View + Check In + Close; Cleaning/Maintenance → Close (view-only)
- On successful Check In: room status → Occupied, booking record created, Room Map refreshed
- Delete `RoomActionDrawer.tsx`; Room Map grid and filter layout unchanged

## Capabilities

### New Capabilities
- `room-detail-modal`: Centered modal replacing the drawer; all five sections, header badges, and responsive width
- `check-in-quick-flow`: Inline check-in from the modal — guest search/dedup, booking creation, room status update, map refresh

### Modified Capabilities
- (none — existing specs are unaffected; this change introduces new behavior only)

## Impact

- **Deleted**: `modules/room-map/components/RoomActionDrawer.tsx`
- **New components**: `RoomDetailModal`, `GuestSearchSection`, `ServiceItemsSection`, `PaymentSummarySection` (all under `modules/room-map/components/`)
- **New hook**: `useCheckInFlow` (or extended `useRoomMap`) inside `modules/room-map/hooks/`
- **API reads**: `GET /api/guests?search=` (existing), `GET /api/master/service-items` (existing), `GET /api/master/payment-methods` (existing)
- **API writes**: `POST /api/bookings` (create booking on check-in — existing route needs `chargeType`, `surcharge` fields; may require a minor extension), `PATCH /api/rooms/[id]` to update room status
- **Types**: `CurrentBooking` on `Room` type may need more fields; new `CheckInFormValues` type
- **i18n**: New keys under `roomMap.*` in `en.json` / `vi.json`
- **No changes** to Room Map grid, filter bar, navigation, or any other module
