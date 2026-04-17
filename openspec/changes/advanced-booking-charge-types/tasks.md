## 1. Schema & Migration

- [x] 1.1 Add `hourlyBlockHours Int?`, `hourlyBlockPrice Decimal? @db.Decimal(12,2)`, `hourlyRatePerHour Decimal? @db.Decimal(12,2)` to the `Booking` model in `prisma/schema.prisma`
- [x] 1.2 Run `npm run db:migrate` to generate and apply the migration (`add_hourly_booking_fields`)
- [x] 1.3 Run `npm run db:generate` to regenerate the Prisma client

## 2. Types

- [x] 2.1 Add `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour` (all `number | null`) to `CurrentBooking` in `types/room.types.ts`
- [x] 2.2 Add the same three fields (all optional) to `CreateBookingPayload` in `types/booking.types.ts`
- [x] 2.3 Add `hoursStayed?: number` to the form `FormValues` type in `modules/room-map/utils/roomModalMode.ts`

## 3. Pricing Utility

- [x] 3.1 Create `common/utils/stayPricing.ts` with the `calculateStayPrice` pure function implementing nightly (×nights), daily (×1), and hourly (block + overage capped at nightlyCap) logic per the `charge-type-pricing` spec

## 4. API — Booking Update Route

- [x] 4.1 In `app/api/bookings/[id]/route.ts` `PUT` handler, add conditional spreads for `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour` alongside existing fields
- [x] 4.2 In `app/api/rooms/_utils.ts` `buildBookingInclude`, add the three new hourly columns to the booking select (or confirm they are included by default since the booking uses no `select` clause — verify and document)
- [x] 4.3 In `app/api/rooms/_utils.ts` `toRoomDTO`, destructure and Number-convert the three new fields from the raw booking object and add them to `currentBooking`

## 5. Form Hook — `useRoomModalForm`

- [x] 5.1 Add `hoursStayed` to `Form.useWatch` calls for live pricing
- [x] 5.2 Replace the static `ratePerNight` used in `totalPayable` with `calculateStayPrice(...)` driven by `chargeType`, `checkInDate`, `checkOutDate`, `hoursStayed`, and hourly config fields watched from the form
- [x] 5.3 Prefill `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour`, and `hoursStayed` from `booking` in the `form.setFieldsValue(...)` call inside the prefill `useEffect`
- [x] 5.4 Export `stayPrice` and `nightCount`/`hoursStayed` from the hook so the UI can build the label suffix

## 6. UI — ServiceItemsSection (Pricing Summary)

- [x] 6.1 Replace the "Room Price" static `PriceDisplay` line with a "Stay Price (N nights / day use / N hrs)" label backed by the computed `stayPrice` prop
- [x] 6.2 Add a conditional "Hourly Configuration" sub-section (visible only when `chargeType === "hourly"`) containing `Form.Item` fields for `blockHours`, `blockPrice`, `ratePerHour`, and `hoursStayed` — each wrapping `InputNumber` directly (not through `Space.Compact`)

## 7. UI — GuestSearchSection (Charge Type & Dates)

- [x] 7.1 Lock the `chargeType` Select when `guestFieldsDisabled` (checked-in or checked-out state)
- [x] 7.2 Add a `Form.useWatch("chargeType")` effect (or `onValuesChange`) that resets `checkOutDate` to match `checkInDate` when `chargeType` switches to `"daily"` and `checkOutDate` is after `checkInDate`

## 8. UI — Modal Actions (Save handlers)

- [x] 8.1 In `handleSaveStay` (`useRoomModalActions`), include `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour` in the `updates` payload sent to `bookingService.update`
- [x] 8.2 In `handleSaveReservation`, same inclusion as 8.1
- [x] 8.3 In `handleSubmitCheckIn`, pass the three hourly fields through to the check-in flow payload

## 9. i18n Strings

- [x] 9.1 Add keys to `messages/en.json` and `messages/vi.json` for: `blockHours`, `blockPrice`, `ratePerHour`, `hoursStayed`, `hourlyConfig`, `stayPrice`, `nightsSuffix`, `dayUseSuffix`, `hrsSuffix`
