## 1. Schema & Migration

- [x] 1.1 Add `RoomTypePricing` model to `prisma/schema.prisma`: `id`, `roomTypeId` (unique FK → `RoomType`), `nightlyPrice Decimal?`, `dailyPrice Decimal?`, `hourlyBlockHours Int?`, `hourlyBlockPrice Decimal?`, `hourlyExtraPrice Decimal?`, `createdAt`, `updatedAt`; add `pricing RoomTypePricing?` relation back on `RoomType`
- [x] 1.2 Remove `defaultPrice` field from the `RoomType` model in `prisma/schema.prisma`
- [x] 1.3 Run `npm run db:migrate` to generate the migration file; manually insert a raw SQL step **before** the `defaultPrice` drop: `INSERT INTO room_type_pricing (id, room_type_id, nightly_price, created_at, updated_at) SELECT gen_random_uuid(), id, default_price, now(), now() FROM room_types ON CONFLICT DO NOTHING`
- [ ] 1.4 Apply the migration: `npm run db:migrate`
- [ ] 1.5 Run `npm run db:generate` to regenerate the Prisma client

## 2. Seed

- [x] 2.1 In `prisma/seed.ts`, remove `defaultPrice` from all `RoomType` upsert calls
- [x] 2.2 Add `RoomTypePricing` upsert records for each seeded room type with representative `nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyExtraPrice` values

## 3. Types

- [x] 3.1 In `types/master.types.ts`, remove `defaultPrice` from `RoomType`; add `pricing?: RoomTypePricing | null` where `RoomTypePricing = { id: string; roomTypeId: string; nightlyPrice: number | null; dailyPrice: number | null; hourlyBlockHours: number | null; hourlyBlockPrice: number | null; hourlyExtraPrice: number | null }`

## 4. API — Room Type Pricing Routes

- [x] 4.1 Create `app/api/master/room-type-pricing/route.ts` with `GET` handler returning all `RoomTypePricing` records
- [x] 4.2 Create `app/api/master/room-type-pricing/[roomTypeId]/route.ts` with `PUT` handler upserting the pricing record; accept all five fields as optional body fields

## 5. API — Room Routes (enrich with pricing)

- [x] 5.1 In `app/api/rooms/_utils.ts` `roomBaseInclude`, change `roomType: true` to `roomType: { include: { pricing: true } }` so `roomType.pricing` is returned on every room response
- [x] 5.2 Verify `toRoomDTO` does not strip `roomType.pricing` (no change needed if `roomType` passes through as-is)

## 6. Common Services

- [x] 6.1 Create `common/services/roomTypePricingService.ts` with `findAll(): Promise<ApiResponse<RoomTypePricing[]>>` and `upsert(roomTypeId, data): Promise<ApiResponse<RoomTypePricing>>`

## 7. `stayPricing.ts` — Add `buildStayPriceInput` helper

- [x] 7.1 In `common/utils/stayPricing.ts`, update the `HourlyInput` type: remove `nightlyCap`; rename `blockPrice` parameter documentation to clarify it maps from `booking.ratePerNight` for hourly bookings
- [x] 7.2 Update `calculateStayPrice` hourly branch to remove the `nightlyCap` cap (formula: `blockPrice + max(0, hoursStayed − blockHours) × ratePerHour` — no upper bound)
- [x] 7.3 Export `buildStayPriceInput(booking, hoursStayed?)` — constructs the `StayPriceInput` union from booking fields; for hourly: maps `ratePerNight → blockPrice`, `hourlyBlockHours → blockHours`, `hourlyRatePerHour → ratePerHour`; for nightly: derives `nights` via `countNights`; for daily: passes `ratePerNight` directly

## 8. Form Hook — `useRoomModalForm` (prefill logic)

- [x] 8.1 For a **new booking** (no `currentBooking`): set initial `baseRate` from `room.roomType.pricing?.nightlyPrice ?? room.basePrice ?? 0`
- [x] 8.2 Add a `Form.useWatch("chargeType")` handler that updates `baseRate` when the user switches charge types on a new booking: `"nightly"` → `pricing?.nightlyPrice`; `"daily"` → `pricing?.dailyPrice`; `"hourly"` → `pricing?.hourlyBlockPrice` (block price becomes the agreed rate); also update `hourlyBlockHours` and `hourlyRatePerHour` from pricing defaults on switch to hourly
- [x] 8.3 For an **existing booking** (reopen): prefill `baseRate`, `chargeType`, `hourlyBlockHours`, `hourlyRatePerHour` from `booking.*` — add comment: "source of truth for existing bookings is always booking.* — never read roomType.pricing here"
- [x] 8.4 Replace the static `baseRate` in `totalPayable` calculation with `calculateStayPrice(buildStayPriceInput(...))` driven by live form values (`chargeType`, `checkInDate`, `checkOutDate`, `baseRate`, hourly fields, `hoursStayed`)

## 9. Form Validation — Date × Charge Type Rules

- [x] 9.1 Add an Ant Design `Form.Item` validator on `checkOutDate` keyed on `chargeType`: daily → error if `checkOutDate !== checkInDate`; nightly → error if `checkOutDate <= checkInDate`; hourly → no constraint
- [x] 9.2 In the `chargeType` watch handler (task 8.2), auto-set `checkOutDate = checkInDate` when switching to `"daily"` if `checkOutDate` is currently after `checkInDate`

## 10. Modal Actions (charge type on save)

- [x] 10.1 In `handleSaveReservation` (`useRoomModalActions`), ensure `baseRate` and `chargeType` from the form are included in the `bookingService.update` payload (they already are via `chargeType` spread; verify `baseRate` is also included)
- [x] 10.2 In `handleSubmitCheckIn`, confirm `baseRate` and `chargeType` are passed through to the booking create payload
- [x] 10.3 In `handleSaveStay`, confirm `baseRate` and `chargeType` are sent in the update payload; these are the user's agreed rate for the stay

## 11. Settings UI — Room Type Pricing Page

- [x] 11.1 Create `modules/room-type-pricing/components/RoomTypePricingTable.tsx` — lists all active room types with inline editable `InputNumber` cells for each of the five pricing fields and a per-row Save button
- [x] 11.2 Create `modules/room-type-pricing/hooks/useRoomTypePricing.ts` — React Query hook; fetches room types with `pricing` relation; exposes `upsert(roomTypeId, data)` mutation
- [x] 11.3 Create `app/[locale]/(main)/master-data/room-type-pricing/page.tsx` as a `"use client"` page composing `RoomTypePricingTable`

## 12. Navigation & Routes

- [x] 12.1 Add `ROOM_TYPE_PRICING: "/master-data/room-type-pricing"` to the `MASTER` section of `common/constants/routes.ts`
- [x] 12.2 Add a nav entry for Room Type Pricing under the Master Data group in `configs/navigation.config.ts` with `permission: PERMISSIONS.MASTER_DATA_MANAGE`

## 13. Cleanup — Remove `defaultPrice` References

- [x] 13.1 In `modules/room-map/hooks/useRoomModalForm.ts`, confirm `room.roomType.defaultPrice` fallback is removed (already done as part of `baseRate` rename — `room.roomType.pricing?.nightlyPrice` is the new source)
- [x] 13.2 In the room management module, remove `defaultPrice` from room type form fields and table columns
- [x] 13.3 Search codebase for remaining `defaultPrice` references and remove or replace them

## 14. i18n Strings

- [x] 14.1 Add keys to `messages/en.json` and `messages/vi.json`: `nav.masterData.roomTypePricing`, `roomTypePricing.title`, `roomTypePricing.nightlyPrice`, `roomTypePricing.dailyPrice`, `roomTypePricing.hourlyBlockHours`, `roomTypePricing.hourlyBlockPrice`, `roomTypePricing.hourlyExtraPrice`, `roomTypePricing.saveSuccess`, `roomTypePricing.saveError`, `validation.dailySameDayRequired`, `validation.nightlyOvernightRequired`
