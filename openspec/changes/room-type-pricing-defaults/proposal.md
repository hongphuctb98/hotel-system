## Why

Staff currently set pricing manually every time a booking is created — there is no defaults layer, so rates must be remembered or looked up per room type, leading to inconsistent charges and slower front-desk flow. This change introduces a per-room-type pricing configuration table and wires it into the booking form so defaults are pre-filled automatically while remaining fully overridable.

## What Changes

- Add a `RoomTypePricing` table storing five pricing defaults keyed to a `RoomType`: `nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyExtraPrice`
- Remove `RoomType.defaultPrice` (currently only used as a nightly fallback) — replaced by `RoomTypePricing.nightlyPrice` **BREAKING**: `defaultPrice` column dropped from `room_types`
- **Data migration**: existing `RoomType.defaultPrice` values are automatically copied into `RoomTypePricing.nightlyPrice` records before the column is dropped — no data loss, no manual intervention
- Add a **Room Type Pricing** settings page under `/master-data/room-type-pricing` where ADMIN / MANAGER can view and edit pricing defaults per room type
- Pre-fill the room-map modal stay form from `RoomTypePricing` when a new booking is initiated — **new bookings only**
- **No new columns on `Booking`**: the existing `baseRate` and `chargeType` fields (plus the `hourlyBlock*` columns already added by `advanced-booking-charge-types`) serve as the complete frozen pricing state. No separate snapshot columns are needed.
- **Frozen source of truth**: once a booking is saved, `baseRate`, `chargeType`, and the hourly config columns on the `Booking` record become the immutable pricing state. Future changes to `RoomTypePricing` never affect existing bookings.
- **Logic-based total**: the room charge is always derived at display time from `chargeType` + duration (check-in/out dates or `hoursStayed`) + `baseRate` (as agreed unit price) using `calculateStayPrice`. It is never stored as a separate column.
- **One-time prefill from master data**: `RoomTypePricing` is consulted only when a new booking form is opened. Reopening an existing booking reads from `booking.*` fields exclusively.
- **Manual override**: staff may edit any pre-filled field before saving; the edited values — not the defaults — are what get written to the booking.
- Charging logic per type (all using `booking.baseRate` as the agreed unit price):
  - **Nightly**: `baseRate × nights` (strictly overnight; check-out > check-in)
  - **Daily**: `baseRate × 1` (strictly same-day; check-out = check-in). `baseRate` stores the daily rate in this context.
  - **Hourly**: `baseRate + max(0, hours − blockHours) × extraRate`. `baseRate` is the block price (no nightly cap).
- **Validation**: daily requires check-out = check-in; nightly requires check-out > check-in; enforced at form level with user-facing errors

## Capabilities

### New Capabilities

- `room-type-pricing-config`: Admin/manager UI to create and edit per-room-type pricing defaults (CRUD on `RoomTypePricing`)
- `booking-pricing-prefill`: Room-map modal pre-fills stay form fields from room type pricing defaults when a new booking is initiated; fields remain editable before save

### Modified Capabilities

- `booking-pricing-snapshot`: Redefined — the frozen pricing state is `booking.baseRate` + `booking.chargeType` + existing hourly columns; no new snapshot columns; `stayPricing.ts` extended with a `buildStayPriceInput` helper to construct calculation inputs from a booking record
- `room-map-modal`: Stay form fields pre-populated on new booking creation from `RoomTypePricing`; date × charge type validation enforced on submit

## Impact

- **Schema**: New `RoomTypePricing` table only. No new `Booking` columns (hourly config already added by `advanced-booking-charge-types`). `RoomType.defaultPrice` dropped.
- **Migration**: Create `room_type_pricing`, copy `defaultPrice` → `nightlyPrice` via raw SQL, drop `defaultPrice`
- **API**: New `/api/master/room-type-pricing` routes; `GET /api/rooms` enriched with `roomType.pricing`; booking create/update routes unchanged (no new snapshot fields to handle)
- **Types**: `RoomType` gains optional `pricing` relation; `RoomType.defaultPrice` removed
- **UI**: New settings page; `useRoomModalForm` prefill updated; `stayPricing.ts` gets `buildStayPriceInput` helper
- **Seed**: `RoomType.defaultPrice` replaced with `RoomTypePricing` seed records
