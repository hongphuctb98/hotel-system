## Context

`RoomType` currently carries one pricing field: `defaultPrice` (nightly rate). It is used in three places: the room form default, a fallback in `useRoomModalForm` (`room.roomType.defaultPrice`), and the seed. There is no concept of daily or hourly defaults, and no record of what rate was in effect when a booking was created — meaning a retroactive pricing change silently corrupts the display of historical bookings.

The `advanced-booking-charge-types` change (in progress) adds `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyRatePerHour` columns to `Booking` and the `calculateStayPrice` utility. This change builds directly on top of those: it provides the source of truth for what values go into those columns when a booking is created.

## Goals / Non-Goals

**Goals:**
- One `RoomTypePricing` record per room type stores five pricing defaults
- Settings page (ADMIN / MANAGER only) to create/edit these records per room type
- Room-map modal pre-fills from the pricing record when opening a **new** booking
- Existing booking fields (`baseRate`, `chargeType`, `hourly*`) serve as the frozen state — no new Booking columns
- `RoomType.defaultPrice` removed; `RoomTypePricing.nightlyPrice` becomes canonical

**Non-Goals:**
- Separate snapshot columns on `Booking` (explicitly rejected — see D2)
- Storing a computed `totalRoomCharge` column (calculated at display time, never persisted)
- Per-room overrides (room-level `basePrice` stays; this change is type-level defaults)
- Retroactive recalculation of existing bookings
- Pricing history / audit log
- Multi-currency or seasonal pricing

## Decisions

### D1: Separate `RoomTypePricing` table, one-to-one with `RoomType`

**Decision:** New model `RoomTypePricing` with fields `nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyExtraPrice` — all nullable Decimals except `hourlyBlockHours` (Int?). One optional record per `RoomType`.

**Rationale:** Keeps `RoomType` as a lean master-data lookup (code, name, capacity). Pricing is operationally separate. Optional relation means room types without configured pricing degrade gracefully to `Room.basePrice` fallback.

**Alternatives considered:**
- Add columns directly to `RoomType` — rejected: bloats a master-data table; harder to extend
- JSON pricing blob on `RoomType` — rejected: type-unsafe, harder to validate in API

### D2: No new snapshot columns — existing `Booking` fields are the frozen pricing state

**Decision:** Do not add `snapshotNightlyPrice`, `snapshotDailyPrice`, or any other snapshot columns to `Booking`. The existing fields are sufficient:

| Charge type | Agreed unit price | Config fields |
|---|---|---|
| nightly | `baseRate` (per-night rate) | — |
| daily | `baseRate` (daily rate stored here) | — |
| hourly | `baseRate` (block price) | `hourlyBlockHours`, `hourlyRatePerHour` |

`baseRate` and `chargeType` are already written at booking creation and are not updated by master data changes — they are naturally frozen. The hourly columns from `advanced-booking-charge-types` provide the remaining hourly config. No schema change to `Booking` is needed.

**Rationale:** Avoids schema bloat. The "frozen snapshot" requirement is already satisfied by the existing model — as long as the prefill layer for existing bookings reads from `booking.*` fields and never re-queries `RoomTypePricing`. The convention is enforced in `useRoomModalForm`, not in the database.

**Alternative considered:** Five dedicated snapshot columns — rejected: unnecessary column sprawl; `baseRate` already serves this role for nightly/daily; hourly columns are already on `Booking`; storing the same data twice creates a consistency risk.

### D3: Prefill priority chain in `useRoomModalForm`

**Decision:**

**New booking** (no `currentBooking`):
1. `chargeType` defaults to `"nightly"`
2. `baseRate` ← `room.roomType.pricing?.nightlyPrice ?? room.basePrice ?? 0`
3. When staff switches `chargeType` to `"daily"`: update `baseRate` ← `room.roomType.pricing?.dailyPrice ?? 0`
4. When staff switches `chargeType` to `"hourly"`: `baseRate` ← `room.roomType.pricing?.hourlyBlockPrice ?? 0`; hourly fields ← `room.roomType.pricing?.hourlyBlock* ?? 0`

**Existing booking** (reopened — `currentBooking` non-null):
- `baseRate` ← `booking.baseRate`
- `chargeType` ← `booking.chargeType`
- hourly fields ← `booking.hourlyBlockHours`, `booking.hourlyRatePerHour`
- `RoomTypePricing` is **never consulted** for existing bookings

**Rationale:** Single source of truth per context. The `chargeType` switch handler in the form updates `baseRate` from the appropriate pricing default when the user changes types on a new booking — this is the "one-time prefill on type change" rule.

### D4: `calculateStayPrice` extended with `buildStayPriceInput` helper

**Decision:** Add `buildStayPriceInput(booking, hoursStayed?)` to `common/utils/stayPricing.ts`. This function reads `booking.chargeType`, `booking.ratePerNight`, `booking.hourly*`, and `checkIn`/`checkOut` to construct the correct discriminated union input for `calculateStayPrice`. Used in both the form hook (live preview) and anywhere a booking's room charge needs to be displayed.

```ts
buildStayPriceInput(
  booking: { chargeType: string; baseRate: number; checkInDate: string; checkOutDate: string;
             hourlyBlockHours?: number | null; hourlyRatePerHour?: number | null },
  hoursStayed?: number
): StayPriceInput
```

**Rationale:** Keeps `calculateStayPrice` pure and data-source-agnostic. The helper bridges the data model to the calculation. One place to update if the mapping changes.

### D5: `baseRate` is a unified "Agreed Rate" field — semantic depends on `chargeType`

**Decision:** The Prisma field is renamed from `ratePerNight` to `baseRate` (DB column stays `rate_per_night` via `@map` — no migration required). It serves as the generic "agreed unit price" for any charge type:

| chargeType | `baseRate` meaning | Total formula |
|---|---|---|
| nightly | Price per night | `baseRate × nights` |
| daily | Flat day rate | `baseRate × 1` |
| hourly | Block price (first N hours) | `baseRate + max(0, hours − hourlyBlockHours) × hourlyRatePerHour` |

For hourly, `baseRate` replaces what `advanced-booking-charge-types` called `hourlyBlockPrice`. The `hourlyBlockPrice` column from that change is therefore not used in the UI or calculation — `baseRate` serves that role. `hourlyBlockHours` and `hourlyRatePerHour` remain.

**Rationale:** Single agreed-rate field per booking — no need for a separate `hourlyBlockPrice` column alongside `baseRate`. The rename clarifies that the field is not literally "per night" for daily/hourly bookings. DB column name is preserved via `@map("rate_per_night")` so no migration is needed.

### D6: Pricing settings UI lives under Master Data nav group


**Decision:** Add "Room Type Pricing" as a child entry under the existing **Master Data** nav group, guarded by `PERMISSIONS.MASTER_DATA_MANAGE`. Page at `app/[locale]/(main)/master-data/room-type-pricing/`. Does **not** use the generic `MasterDataTable<T>` component — inline editable row table instead.

**Rationale:** Pricing defaults are operational configuration. Inline editing (one row per room type, always all visible) is a better UX than the create/edit drawer pattern used for other master data.

### D7: Charging formula uses `baseRate` as the unified agreed rate

All charge calculations read from `booking.*` fields only:

| Type | Formula | Duration source |
|---|---|---|
| nightly | `baseRate × max(1, nights)` | `countNights(checkInDate, checkOutDate)` |
| daily | `baseRate × 1` | date equality enforced by validation |
| hourly | `baseRate + max(0, hoursStayed − hourlyBlockHours) × hourlyRatePerHour` | form `hoursStayed` input |

Note: the hourly formula has **no nightly cap** — `baseRate` is the block price itself, not the cap. If a cap is needed in future it can be added as a separate field. `hourlyBlockPrice` from `advanced-booking-charge-types` is superseded by `baseRate` in this model.

`buildStayPriceInput` maps `booking.baseRate` to the appropriate field in the `StayPriceInput` discriminated union (`ratePerNight` for nightly/daily, `blockPrice` for hourly).

### D8: Date validation rules enforced at form level

- **Daily**: `checkOutDate` MUST equal `checkInDate`. Error: "Daily stays must check out on the same day."
- **Nightly**: `checkOutDate` MUST be strictly after `checkInDate`. Error: "Nightly stays require at least one overnight."
- **Hourly**: no date constraint.
- Switching to `"daily"` auto-sets `checkOutDate = checkInDate` if it would otherwise fail validation.

### D9: Data migration — copy `defaultPrice` → `RoomTypePricing.nightlyPrice`

**Decision:** Single Prisma migration:
1. Create `room_type_pricing` table
2. Raw SQL: `INSERT INTO room_type_pricing (...) SELECT gen_random_uuid(), id, default_price, now(), now() FROM room_types ON CONFLICT DO NOTHING`
3. Drop `default_price` from `room_types`

**Rationale:** Zero data loss. Idempotent. Existing nightly pricing is preserved as the default for each room type.

## Risks / Trade-offs

- **`baseRate` vs. DB column `rate_per_night`**: TypeScript field renamed to `baseRate` for clarity; DB column stays `rate_per_night` via `@map` — no migration, full backwards compatibility at the DB level.
- **Breaking migration**: dropping `defaultPrice` will break any code referencing `roomType.defaultPrice`. → All references tracked as explicit cleanup tasks.
- **Rooms with no pricing record**: nightly falls back to `room.basePrice`; daily/hourly default to `0`. → Acceptable; settings page makes configuration easy.
- **Old bookings with no hourly config**: `hourlyBlock*` null → `buildStayPriceInput` handles null gracefully (defaults to 0). → Calculation still runs; displayed total may be 0 for unconfigured hourly bookings.
- **`advanced-booking-charge-types` dependency**: `hourlyBlock*` columns on `Booking` must exist before this change is applied. → Dependency noted; apply `advanced-booking-charge-types` first.

## Migration Plan

1. Ensure `advanced-booking-charge-types` migration has run
2. Prisma migration: create `room_type_pricing`; raw SQL copy of `defaultPrice`; drop `defaultPrice`; no changes to `Booking`
3. Update seed: remove `defaultPrice` from `RoomType` upserts; add `RoomTypePricing` upserts
4. `npm run db:generate` + dev server restart
5. Rollback: re-add `defaultPrice` as nullable; data is preserved in `room_type_pricing.nightly_price`
