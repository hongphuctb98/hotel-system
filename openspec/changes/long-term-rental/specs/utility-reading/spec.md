# Spec: Meter Readings (formerly Utility Readings)

> **Phase 1** implemented `UtilityReading` with hardcoded electricity and water fields. **Phase 2** replaces this with `LongTermMeterReading` (generic, per fee item). See `specs/long-term-fee-master/spec.md` for the fee item model.

---

## Phase 1 Requirements (implemented)

### Requirement: Admin can enter monthly utility meter readings per lease
The system SHALL allow staff with `LONG_TERM_EDIT` permission to create or update a `UtilityReading` record for a given `LeaseContract` and billing month.

**Acceptance criteria:**
- `POST /api/utility-readings` creates a reading with electricityPrev, electricityCurrent, waterPrev, waterCurrent
- Validates `electricityCurrent >= electricityPrev` and `waterCurrent >= waterPrev` → 400 `READING_CURRENT_LESS_THAN_PREV`
- Computes `electricityConsumption` and `waterConsumption` fields automatically
- Unique per `(leaseId, readingMonth)` — duplicate rejected
- On create: if a DRAFT or PENDING bill exists for the same lease+month, update ELECTRICITY and WATER bill lines with consumption amounts and set `isPending = false`
- `PUT /api/utility-readings/[id]` updates reading; recalculates bill lines; blocked if bill is PARTIAL/PAID → 409 `BILL_ALREADY_APPROVED`

---

## Phase 2 Replacement

`UtilityReading` (hardcoded electricity/water) is superseded by `LongTermMeterReading` (generic).

**API routes replaced:**
- `GET/POST /api/utility-readings` → `GET/POST /api/long-term/meter-readings`
- `PUT /api/utility-readings/[id]` → `PUT /api/long-term/meter-readings/[id]`

**Screen updated:** `/long-term/utility-readings` → `/long-term/meter-readings`

### Requirement: Admin can enter monthly meter readings for any metered fee item per lease
The system SHALL allow staff to create/update `LongTermMeterReading` records for any `LongTermFeeItem` with `type = METERED`.

**Acceptance criteria:**
- `POST /api/long-term/meter-readings` accepts: leaseId, feeItemId, readingMonth, previousReading, currentReading
- Validates `feeItem.type === METERED` → 400 `FEE_ITEM_NOT_METERED` if wrong type
- Validates `currentReading >= previousReading` → 400 `READING_CURRENT_LESS_THAN_PREV`
- Computes `consumption = currentReading - previousReading`
- Unique per `(leaseId, feeItemId, readingMonth)` — duplicate rejected
- On create/update: if a DRAFT or PENDING bill exists for the same lease+month, update the matching `METERED_FEE` bill line (linked via `feeItemId`) with actual consumption + amount; set `isPending = false`
- `PUT /api/long-term/meter-readings/[id]` updates; blocked if bill is PARTIAL/PAID

### Requirement: Meter reading form shows all active metered fee items dynamically
The system SHALL render one input row per active `LongTermFeeItem` with `type = METERED` in the meter reading form. No hardcoded electricity/water field names in the UI.

**Acceptance criteria:**
- Form loads fee items via `useFeeItems({ type: "METERED" })`
- Each row shows: fee item name, unit label, previousReading (InputNumber), currentReading (InputNumber)
- On submit: creates/updates one `LongTermMeterReading` per row with data entered
- Adding a new METERED fee item (e.g., gas) automatically appears in the form without code changes
