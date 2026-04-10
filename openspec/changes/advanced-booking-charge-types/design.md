## Context

The `Booking` model already stores `chargeType` (String, default `"nightly"`) and `ratePerNight`. Today the room-map modal collects `chargeType` from the form but the pricing summary always displays `ratePerNight` as the stay price with no multiplier applied — a flat number that staff must mentally convert. Hourly bookings cannot be configured at all (no block-hour or per-hour rate fields exist).

Three charge types need distinct calculation rules:
- **nightly**: existing behavior; price = `ratePerNight × nights`
- **daily**: same-day stay; price = flat `ratePerNight` (i.e., ×1, no overnight)
- **hourly**: block fee for the first N hours, then an overage rate per additional hour; total capped at the nightly equivalent

New schema columns are required only for the hourly model. Nightly and daily reuse `ratePerNight`.

## Goals / Non-Goals

**Goals:**
- Pure pricing utility (`stayPricing.ts`) that computes stay price from charge type + inputs
- Schema migration adding 3 nullable columns for hourly configuration
- UI that conditionally shows hourly config fields and a live-computed stay price line
- `ratePerNight` continues to store the base rate for nightly and daily; hourly columns are additive

**Non-Goals:**
- Invoice regeneration or recalculation of historical bookings
- Automatic overage capture during an active stay (tracked post check-in, not in scope)
- Fractional-hour billing precision — integer hours only
- Any change to the checkout flow; checkout continues to snapshot `totalAmount`

## Decisions

### D1: Three new nullable Decimal columns for hourly config

**Decision:** Add `hourlyBlockHours Int?`, `hourlyBlockPrice Decimal?`, `hourlyRatePerHour Decimal?` to the `Booking` model.

**Rationale:** Reusing `ratePerNight` for all three charge types would require contextual interpretation of one field (confusing). Separate columns are self-documenting and nullable so nightly/daily bookings carry no dead weight. A single additive migration with no default means existing rows remain unchanged.

**Alternatives considered:**
- Store hourly config in a JSON column (`pricingConfig: Json?`) — rejected: harder to query, type-unsafe in Prisma
- Separate `HourlyConfig` relation table — rejected: overkill for three scalar fields

### D2: Pure utility function `calculateStayPrice` in `common/utils/stayPricing.ts`

**Decision:** All pricing math lives in one pure function with no side effects, imported wherever a price is needed (form hook, checkout route).

```ts
type StayPriceInput =
  | { chargeType: "nightly"; ratePerNight: number; nights: number }
  | { chargeType: "daily";   ratePerNight: number }
  | { chargeType: "hourly";  blockHours: number; blockPrice: number; ratePerHour: number; hoursStayed: number; nightlyCap: number }

calculateStayPrice(input: StayPriceInput): number
```

**Rationale:** Keeps business logic testable and separate from React state. Can be called in both the UI hook (live preview) and server-side (checkout total snapshot).

**Hourly cap rule:** `min(blockPrice + max(0, hoursStayed - blockHours) × ratePerHour, nightlyCap)`.

**Alternatives considered:**
- Inline the math in the hook — rejected: duplicated when needed server-side later
- Server-side only — rejected: staff need a live preview before saving

### D3: `ratePerNight` continues as the primary rate field for nightly and daily

**Decision:** For nightly, `ratePerNight` is the per-night rate. For daily, `ratePerNight` is the flat daily rate. Hourly uses only the three new columns plus `ratePerNight` as the nightly cap.

**Rationale:** No rename needed; all existing API paths and UI fields remain valid. Staff already understand "rate" in this context.

### D4: Hourly-only fields rendered conditionally in the form

**Decision:** When `chargeType === "hourly"`, an "Hourly Configuration" sub-section appears with `blockHours`, `blockPrice`, and `ratePerHour` inputs. It is hidden for nightly and daily. `checkOutDate` stays visible for all types but is optional for daily (staff may set same day).

**Rationale:** Keeps the form clean for the 90% case (nightly). Ant Design `Form.useWatch("chargeType")` drives visibility.

### D5: Stay price replaces the static `ratePerNight` display in the pricing summary

**Decision:** The "Room Price" line in `ServiceItemsSection` is replaced by a "Stay Price" line showing `calculateStayPrice(...)`. This computed value feeds into `totalPayable`.

**Rationale:** `ratePerNight × 1` was misleading for multi-night stays. Staff need the actual stay charge, not the nightly unit rate.

## Risks / Trade-offs

- **Hourly hours input vs. actual time**: `hoursStayed` for the live preview must come from the form (a manual number input). It is not computed from check-in/out timestamps during the stay. → Staff enter hours manually; tooltip clarifies this is an estimate until checkout.
- **Migration on production**: The migration adds nullable columns with no default — zero risk of locking for typical hotel table sizes. → Standard additive migration; no down-migration needed.
- **`totalAmount` staleness**: `Booking.totalAmount` is a snapshot set at check-in and not recalculated when surcharge/discount change mid-stay via Save. → `totalAmount` is a legacy snapshot; the invoice is the source of truth. Out of scope for this change.
- **Daily checkout date**: For daily stays check-in and check-out are the same date. `buildBookingInclude` filters by `checkInDate ≤ date ≤ checkOutDate` — a same-day booking satisfies this (both equal date). No API change needed.

## Migration Plan

1. Add three nullable columns to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_hourly_booking_fields`
3. Run `npm run db:generate` and restart dev server
4. No data backfill required (columns nullable, existing rows unaffected)
5. Rollback: the migration can be reverted by dropping the three columns (additive only, no FK constraints)
