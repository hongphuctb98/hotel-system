# Spec: Rate Plans (formerly Utility Rates)

> **Phase 1** implemented `UtilityRate` (hardcoded electricity/water/internet). **Phase 2** replaces this with `LongTermRatePlan` + `LongTermRatePlanItem` + `LongTermFeeItem`. See `specs/long-term-fee-master/spec.md` for the full replacement design.

---

## Phase 1 Requirements (implemented)

### Requirement: Admin can manage utility rate master data
The system SHALL allow staff with `LONG_TERM_EDIT` permission to create and deactivate `UtilityRate` records that define per-unit pricing for electricity, water, and a fixed monthly internet fee.

**Acceptance criteria:**
- `POST /api/utility-rates` creates a new rate with label, electricityPerUnit, waterPerUnit, internetFee (default 0), effectiveFrom
- `PUT /api/utility-rates/[id]` updates any field; returns updated record
- `DELETE /api/utility-rates/[id]` soft-deletes (sets `isActive = false`)
- Bill generation uses rate with highest `effectiveFrom ≤ billing period start` where `isActive = true`
- If no rate exists → lease fails with `MISSING_UTILITY_RATE`

---

## Phase 2 Replacement

`UtilityRate` is superseded by the generic `LongTermRatePlan` model.

**API routes replaced:**
- `GET/POST /api/utility-rates` → `GET/POST /api/long-term/rate-plans`
- `PUT/DELETE /api/utility-rates/[id]` → `PUT/DELETE /api/long-term/rate-plans/[id]`

**Screen renamed:** `/long-term/utility-rates` → `/long-term/rate-plans`

### Requirement: Admin can manage versioned rate plans with per-fee-item pricing
The system SHALL allow staff with `LONG_TERM_EDIT` permission to create `LongTermRatePlan` records with a label and effective date, and set unit prices for each active `LongTermFeeItem`.

**Acceptance criteria:**
- Rate plan form shows all active fee items; admin sets a unit price per item (optional — leave blank to exclude from plan)
- `POST /api/long-term/rate-plans` creates plan + `LongTermRatePlanItem` rows in one transaction
- `PUT /api/long-term/rate-plans/[id]` replaces all items in same transaction
- `DELETE` blocked if plan is referenced by any `TenantBill` → 409 `RATE_PLAN_IN_USE`
- Bill generation: picks plan with highest `effectiveFrom ≤ period start`; fails with `MISSING_RATE_PLAN` if none found
- Migration: existing `UtilityRate` rows are converted to `LongTermRatePlan` records by migration script
