## Why

The system currently only supports short-term hotel stays. Property managers who also rent rooms on a monthly basis (boarding-house / serviced apartment model) have no way to manage lease contracts, generate recurring utility-inclusive bills, or prevent front-desk staff from double-booking a room that is already committed to a long-term tenant. Adding this module unlocks a second revenue stream without disrupting the existing hotel workflow.

**Phase 2 motivation:** The original `UtilityRate` model hardcodes electricity, water, and internet. Properties charge different recurring fees (parking, cleaning, management fee, etc.) and the hardcoded approach requires schema changes every time a new fee type is added. A generic fee-item master with typed rate plans removes that rigidity.

## What Changes

### Phase 1 (implemented)
- **New**: Lease contract management — create, edit, terminate contracts linking an existing Room and Guest with a monthly rent and deposit
- **New**: Monthly bill generation — auto-create `TenantBill` records at the start of each month with pro-rated amounts for mid-month move-in/move-out; **only ACTIVE leases** are eligible
- **New**: Bill regeneration — bills in `DRAFT` or `PENDING` status can be refreshed; `PARTIAL` and `PAID` bills are immutable
- **New**: Bill approval workflow — bills start as `DRAFT`; approval transitions to `PENDING` and triggers tenant email
- **New**: Bill email resend — dedicated "Send Email" button; `emailSentAt` records latest send timestamp
- **New**: Utility meter readings — monthly electricity and water readings per lease feeding bill lines
- **New**: Other-fee line items — free-text + amount lines per bill
- **New**: Internet fee — fixed monthly charge via `UtilityRate.internetFee`
- **New**: Payment tracking — partial/full payments against each `TenantBill`
- **New**: `UtilityRate` master data — per-unit pricing for electricity, water, and internet with effective dates
- **BREAKING**: Room availability check — short-term booking blocked if room has active/upcoming lease within 14-day buffer

### Phase 2 (this change)
- **Replace**: `UtilityRate` (hardcoded electricity/water/internet) → `LongTermRatePlan` + `LongTermRatePlanItem` + `LongTermFeeItem` (generic, extensible)
- **New**: `LongTermFeeItem` master data screen (`/long-term/fee-items`) — manage billable fee items (electricity, water, internet, parking, cleaning, etc.) with type (`METERED` or `FIXED`) and optional unit
- **New**: `LongTermRatePlan` / rate plan screen (`/long-term/rate-plans`) — versioned pricing table with effective dates; each plan holds prices per fee item
- **Replace**: `UtilityReading` (hardcoded electricity/water fields) → `LongTermMeterReading` (generic, per fee item)
- **Replace**: `/long-term/utility-readings` screen — no hardcoded fields; loads metered fee items dynamically
- **Replace**: `TenantBillLine.type` enum → `category` (`RENT | METERED_FEE | FIXED_FEE | OTHER`) + nullable `feeItemId` FK
- **Update**: Bill generation — uses rate plans and fee items instead of UtilityRate; dynamic lines per active fee items in plan

## Capabilities

### New / Updated Capabilities

- `lease-contract`: unchanged from Phase 1
- `tenant-billing`: bill generation now uses `LongTermRatePlan`; dynamic bill lines per fee item in selected plan; pending lines for missing metered readings; fixed-fee lines auto-generated
- `meter-reading`: generic per-lease monthly readings for any `METERED` fee item; recalculates bill lines on create/update
- `fee-item-master`: CRUD for `LongTermFeeItem` — define billable item types, METERED vs FIXED, units
- `rate-plan-master`: CRUD for `LongTermRatePlan` and its `LongTermRatePlanItem` child rows — price each fee item per plan period

### Modified Capabilities

- `booking-create-edit`: unchanged from Phase 1 (lease conflict check)

## Impact

- **Prisma schema**: Add `LongTermFeeItem`, `LongTermRatePlan`, `LongTermRatePlanItem`, `LongTermMeterReading`; drop or deprecate `UtilityRate`, `UtilityReading`; replace `TenantBillLineType` enum with `TenantBillLineCategory` enum (`RENT | METERED_FEE | FIXED_FEE | OTHER`); add `feeItemId` nullable FK on `TenantBillLine`
- **API routes**: New `/api/long-term/fee-items`, `/api/long-term/rate-plans`; replace `/api/utility-rates` and `/api/utility-readings` with `/api/long-term/meter-readings`
- **Modules**: `modules/long-term/` — update hooks, services, components for new models
- **Navigation**: Replace "Utility Readings" and "Utility Rates" items with "Meter Readings", "Fee Items", "Rate Plans"
- **i18n**: Add keys for fee items, rate plans, meter readings; deprecate hardcoded electricity/water keys in bill line labels
