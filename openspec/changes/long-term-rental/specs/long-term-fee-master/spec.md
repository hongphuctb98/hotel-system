# Spec: Long-Term Fee Master

## Overview

The long-term rental module needs a flexible, extensible way to define billable fee items and their prices. The current `UtilityRate` model hardcodes electricity, water, and internet, requiring a schema migration whenever a new fee type is added. This spec describes the replacement: `LongTermFeeItem` + `LongTermRatePlan` + `LongTermRatePlanItem`.

## Why Separate from Global Master Data

The global master-data module (`/api/master/*`, `/master-data/*`) serves hotel-wide concepts consumed across front-desk, housekeeping, and billing modules — room types, booking statuses, payment methods, amenities. These are shared concerns with shared permission requirements.

Long-term fee items are exclusively consumed by the long-term rental module:
- Only the bill generation endpoint reads them
- Only the meter-reading and rate-plan screens write them
- Front-desk and housekeeping staff have no use for them
- Their lifecycle (add/retire fee items, version pricing) is independent of hotel-wide master data

Mixing them into the global master would add clutter to the shared UI, pollute the `/api/master/` namespace, and couple the long-term billing lifecycle to unrelated hotel operations.

---

## Models

### LongTermFeeItem

Represents one billable item type for long-term rental.

| Field     | Type                 | Notes |
|---|---|---|
| id        | String (cuid)        | PK |
| code      | String (unique)      | Short identifier, e.g. `ELECTRICITY`, `PARKING` |
| name      | String               | Display name, e.g. "Electricity", "Parking fee" |
| type      | LongTermFeeItemType  | `METERED` or `FIXED` |
| unit      | String?              | Display unit, e.g. `kWh`, `m³`, `month` (display only) |
| isActive  | Boolean              | Soft delete |
| createdAt | DateTime             | |
| updatedAt | DateTime             | |

**Seeded defaults:**

| code        | name        | type    | unit  |
|---|---|---|---|
| ELECTRICITY | Electricity | METERED | kWh   |
| WATER       | Water       | METERED | m³    |
| INTERNET    | Internet    | FIXED   | month |

Additional items (PARKING, CLEANING, MANAGEMENT_FEE, etc.) are created by admin via the Fee Items screen.

### LongTermRatePlan

A versioned group of prices, effective from a date.

| Field         | Type    | Notes |
|---|---|---|
| id            | String  | PK |
| label         | String  | e.g. "Q1 2026 Rates" |
| effectiveFrom | DateTime | Bill generation uses plan with highest `effectiveFrom ≤ period start` |
| isActive      | Boolean | Soft delete |
| createdAt     | DateTime | |
| updatedAt     | DateTime | |

### LongTermRatePlanItem

Price of one fee item within one rate plan.

| Field      | Type    | Notes |
|---|---|---|
| id         | String  | PK |
| ratePlanId | String  | FK → LongTermRatePlan |
| feeItemId  | String  | FK → LongTermFeeItem |
| unitPrice  | Int     | VND; for METERED = price per unit; for FIXED = fixed monthly amount |

Unique constraint: `(ratePlanId, feeItemId)` — each fee item appears at most once per plan.

A fee item without a `LongTermRatePlanItem` in the selected plan is simply absent from the bill (no line created). This allows plans to opt-in to specific fee items.

---

## Fee Item Behavior

### METERED items
- Require monthly `LongTermMeterReading` records.
- Bill amount = `consumption × unitPrice`.
- If reading is missing when bill is generated: create a `METERED_FEE` bill line with `isPending = true`, `quantity = 0`, `amount = 0`.
- Staff enters the reading later; the bill line is updated automatically.
- Examples: electricity, water.

### FIXED items
- Do not require readings.
- Bill amount = `unitPrice` from the rate plan item.
- Line is created automatically if the rate plan contains a price for this item.
- Not pro-rated in v1 (always full monthly amount).
- Examples: internet, parking, cleaning.

---

## API Design

### Fee Items

```
GET    /api/long-term/fee-items          List (paginated, showInactive filter)
POST   /api/long-term/fee-items          Create
PUT    /api/long-term/fee-items/[id]     Update (name, unit, isActive)
DELETE /api/long-term/fee-items/[id]     Soft delete
```

**Validations:**
- `code` must be unique (case-insensitive normalised to SCREAMING_SNAKE_CASE)
- DELETE blocked if fee item is referenced by any `LongTermRatePlanItem` in an active plan → 409 `FEE_ITEM_IN_USE`

### Rate Plans

```
GET    /api/long-term/rate-plans         List with items included (paginated)
GET    /api/long-term/rate-plans/[id]    Detail with all items and fee item names
POST   /api/long-term/rate-plans         Create plan + items in transaction
PUT    /api/long-term/rate-plans/[id]    Update plan + replace items in transaction
DELETE /api/long-term/rate-plans/[id]    Soft delete; blocked if used by any TenantBill
```

**POST/PUT body:**
```json
{
  "label": "Q1 2026 Rates",
  "effectiveFrom": "2026-01-01T00:00:00.000Z",
  "items": [
    { "feeItemId": "...", "unitPrice": 3500 },
    { "feeItemId": "...", "unitPrice": 15000 },
    { "feeItemId": "...", "unitPrice": 200000 }
  ]
}
```

Items not included in the `items` array are removed from the plan.

---

## UI Design

### Fee Items Screen (`/long-term/fee-items`)

AppTable columns: Code, Name, Type (badge: METERED blue / FIXED green), Unit, Status.

Form (AppDrawer): code (Input, disabled on edit), name (Input), type (Select, disabled on edit), unit (Input optional), isActive (Checkbox, edit only).

### Rate Plans Screen (`/long-term/rate-plans`)

AppTable columns: Label, Effective From, Status, number of fee items in plan, actions.

Form (AppDrawer):
- Label (Input), Effective From (DatePicker)
- Dynamic price table: one row per active `LongTermFeeItem`; columns: fee item name, type badge, unit, unitPrice (CurrencyField optional — leave blank to exclude from plan)
- Items with blank unitPrice are not saved as `LongTermRatePlanItem` rows

---

## Bill Generation Integration

When generating bills:

1. Find applicable rate plan: `isActive = true AND effectiveFrom ≤ billingPeriodStart`, ordered by `effectiveFrom DESC`, take first.
2. If none found → fail lease with `MISSING_RATE_PLAN`.
3. For each active `LongTermFeeItem`:
   - Look up `LongTermRatePlanItem` for this fee item in the plan.
   - If no item → skip (no bill line created for this fee type).
   - If `METERED`: look up `LongTermMeterReading`; create bill line (pending if no reading).
   - If `FIXED`: create bill line with `unitPrice`, `amount = unitPrice`, `isPending = false`.
4. Always create RENT line from lease `monthlyRent` (pro-rated if needed).
5. Preserve any manual `OTHER` lines during regeneration.
