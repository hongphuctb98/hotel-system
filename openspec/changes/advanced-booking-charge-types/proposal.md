## Why

The system stores a `chargeType` field on bookings but treats all stays identically — pricing is always calculated as a flat nightly rate regardless of whether a guest is staying hourly, a full day, or multiple nights. This blocks front-desk staff from accurately billing short-stay, hourly, or day-use guests.

## What Changes

- Introduce runtime pricing logic for three charge types: **nightly**, **hourly**, and **daily**
- **Nightly**: price = `ratePerNight × numberOfNights` (current behavior, now formalised)
- **Hourly**: price = block fee for the first N hours, then per-hour rate for overages; automatically capped at the nightly rate
- **Daily**: single-day stay (check-in and check-out on the same date); price = flat daily rate (no overnight component)
- Surface computed `stayPrice` in the room-map modal's pricing summary so staff see the correct charge before saving
- Persist `chargeType`, `ratePerNight`, `depositAmount`, `discountAmount`, `surchargeAmount` through the existing booking update path (already in schema and API; no **BREAKING** changes)
- Add hourly-specific fields to `Booking`: `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour` (new nullable columns — additive, non-breaking migration)

## Capabilities

### New Capabilities



- `charge-type-pricing`: Pricing calculation rules for nightly / hourly / daily charge types, including the hourly block+overage model and the nightly cap
- `stay-price-display`: Room-map modal shows a live computed stay price that updates as chargeType, dates, and hourly fields change

### Modified Capabilities

- `room-map-modal`: Charge-type selector now drives visible form fields (hourly block config appears only when chargeType = hourly; checkout date required for nightly, hidden for daily same-day stays)

## Impact

- **Schema**: `Booking` table — 3 new nullable columns (`hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour`)
- **Migration**: one additive migration, no data changes to existing rows
- **API** `PUT /api/bookings/[id]`: already accepts arbitrary booking fields; new columns accepted transparently
- **API** `POST /api/bookings` (check-in flow): payload extended with new optional fields
- **UI** `ServiceItemsSection` / `PaymentSummarySection`: stay price row added; hourly fields section conditionally rendered
- **Types**: `CurrentBooking`, `CreateBookingPayload`, `Booking` extended with new fields
- **Utility**: new `common/utils/stayPricing.ts` pure function — no external dependencies
