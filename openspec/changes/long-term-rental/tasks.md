## Phase 1 — Core Long-Term Rental (completed)

### 1. Database Schema
- [x] 1.1 Add `UtilityRate` model — id, label, electricityPerUnit, waterPerUnit, internetFee, effectiveFrom, isActive
- [x] 1.2 Add `LeaseContract` model — id, roomId, guestId, status, startDate, endDate, monthlyRent, depositAmount, depositPaid, paymentDueDay, occupants, terminationDate, terminationReason, notes, isActive
- [x] 1.3 Add `UtilityReading` model — id, leaseId, readingMonth, electricityPrev/Current/Consumption (Int), waterPrev/Current/Consumption (Decimal), unique(leaseId, readingMonth)
- [x] 1.4 Add `TenantBill` model — id, leaseId, billingMonth, status, totalAmount, totalPaid, dueDate, approvedAt, approvedById, emailSentAt, emailSent, notes
- [x] 1.5 Add `TenantBillLine` model — id, billId, type (RENT|ELECTRICITY|WATER|INTERNET|OTHER), label, quantity, unitPrice, amount, isPending, sortOrder
- [x] 1.6 Add `TenantBillPayment` model — id, billId, amount, paymentDate, paymentMethodId, receiptImageUrl, notes
- [x] 1.7 Add `Attachment` model — id, entityType, entityId, url, name, mimeType, order
- [x] 1.8 Enums: LeaseContractStatus, TenantBillStatus, TenantBillLineType (incl. INTERNET)
- [x] 1.9 db:generate, db:migrate/push; seed RENTED_LONG_TERM room status

### 2–14 (all implemented)
- [x] Utility Rate API + UI
- [x] Lease Contract API + UI (create, activate, terminate + unpaid bill check)
- [x] Utility Reading API + UI
- [x] Tenant Bill API + UI (generate, approve, send-email, payments)
- [x] Email infrastructure (nodemailer, template)
- [x] Booking availability patch (14-day buffer)
- [x] Permissions + navigation
- [x] Attachment/documents for leases and bills
- [x] i18n full coverage
- [x] Generic API error message utility (`common/utils/apiErrorMessage.ts`)

---

## Phase 2 — Fee Master Redesign

### 16. Database Schema — New Models

- [x] 16.1 Add `LongTermFeeItemType` enum to `prisma/schema.prisma`: `METERED | FIXED`
- [x] 16.2 Add `LongTermFeeItem` model — id, code (unique), name, type (LongTermFeeItemType), unit (String?), isActive, timestamps; `@@map("long_term_fee_items")`
- [x] 16.3 Add `LongTermRatePlan` model — id, label, effectiveFrom (DateTime), isActive, timestamps; `@@map("long_term_rate_plans")`
- [x] 16.4 Add `LongTermRatePlanItem` model — id, ratePlanId (FK), feeItemId (FK), unitPrice (Int); `@@unique([ratePlanId, feeItemId])`; `@@map("long_term_rate_plan_items")`
- [x] 16.5 Add `LongTermMeterReading` model — id, leaseId (FK), feeItemId (FK), readingMonth (String YYYY-MM), previousReading (Decimal 10,3), currentReading (Decimal 10,3), consumption (Decimal 10,3), timestamps; `@@unique([leaseId, feeItemId, readingMonth])`; `@@map("long_term_meter_readings")`
- [x] 16.6 Add `TenantBillLineCategory` enum: `RENT | METERED_FEE | FIXED_FEE | OTHER`
- [x] 16.7 Add `category TenantBillLineCategory` and `feeItemId String?` (FK to LongTermFeeItem) to `TenantBillLine`; keep existing `type` column until data migration complete
- [x] 16.8 Run `npm run db:generate` and `npm run db:push`
- [x] 16.9 Seed default `LongTermFeeItem` rows in `prisma/seed.ts`: ELECTRICITY (METERED, kWh), WATER (METERED, m³), INTERNET (FIXED, month)
- [x] 16.10 Migration script: convert existing `UtilityRate` rows to `LongTermRatePlan` + `LongTermRatePlanItem` using seeded fee items

### 17. Fee Item API

- [x] 17.1 Create `app/api/long-term/fee-items/route.ts` — `GET` (list, paginated, `showInactive` filter) and `POST` (create; validate code unique → 409 `FEE_ITEM_CODE_TAKEN`; require code, name, type); `writeAudit`
- [x] 17.2 Create `app/api/long-term/fee-items/[id]/route.ts` — `PUT` (edit name, unit, isActive); `DELETE` (soft delete `isActive = false`; block if referenced by any `LongTermRatePlanItem` in active plan → 409 `FEE_ITEM_IN_USE`); `writeAudit`

### 18. Rate Plan API

- [x] 18.1 Create `app/api/long-term/rate-plans/route.ts` — `GET` (list with items included; paginated; `showInactive` filter) and `POST` (create plan + items in transaction; validate `effectiveFrom` required; upsert `LongTermRatePlanItem` rows); `writeAudit`
- [x] 18.2 Create `app/api/long-term/rate-plans/[id]/route.ts` — `GET` (detail with all items + fee item names); `PUT` (update plan label/effectiveFrom/isActive + replace items in transaction); `DELETE` (soft delete; block if referenced by any `TenantBill` → 409 `RATE_PLAN_IN_USE`); `writeAudit`

### 19. Meter Reading API (replaces Utility Reading API)

- [x] 19.1 Create `app/api/long-term/meter-readings/route.ts` — `GET` (list; filters: leaseId, feeItemId, readingMonth; paginated) and `POST` (create; validate feeItem exists + type=METERED → 400 `FEE_ITEM_NOT_METERED`; validate currentReading ≥ previousReading → 400 `READING_CURRENT_LESS_THAN_PREV`; compute consumption; upsert matching `METERED_FEE` bill line if DRAFT/PENDING bill exists); `writeAudit`
- [x] 19.2 Create `app/api/long-term/meter-readings/[id]/route.ts` — `PUT` (update readings; same validations; recalculate bill line; block if bill is PARTIAL/PAID → 409 `BILL_ALREADY_APPROVED`); `writeAudit`

### 20. Bill Generation — Use Rate Plans

- [x] 20.1 Update `app/api/tenant-bills/generate/route.ts` — replace `UtilityRate` lookup with `LongTermRatePlan` lookup (highest `effectiveFrom ≤ period start`; active only); fail with `MISSING_RATE_PLAN` if none found
- [x] 20.2 Update bill line generation — for each active `LongTermFeeItem`:
  - If `type = METERED`: look up `LongTermMeterReading` for lease+period; if found → `METERED_FEE` line with consumption × unitPrice; if missing → `METERED_FEE` line with `isPending = true`, amount = 0
  - If `type = FIXED`: look up `LongTermRatePlanItem` for this fee item in plan; if price exists → `FIXED_FEE` line with unitPrice; if no price in plan → skip (no line created)
- [x] 20.3 Update rent line to use `category = RENT`; `feeItemId = null`
- [x] 20.4 Update `LongTermMeterReading` create/update to recalculate `METERED_FEE` bill lines (replaces old electricity/water line recalc in UtilityReading route)
- [x] 20.5 Add new skip/fail reason codes: `MISSING_RATE_PLAN`, `MISSING_RATE_PLAN_ITEM` — add to `longTermApiErrorMessage.ts` KNOWN_CODES and i18n files

### 21. Fee Item UI

- [x] 21.1 Create `common/services/feeItemService.ts` — API calls for fee items (list, create, update, delete)
- [x] 21.2 Create `modules/long-term/hooks/useFeeItems.ts` — `useFeeItems(filters)`, `useCreateFeeItem()`, `useUpdateFeeItem()`, `useDeleteFeeItem()`
- [x] 21.3 Create `modules/long-term/components/FeeItemTable.tsx` — AppTable with columns: code, name, type badge (METERED/FIXED), unit, status; add/edit in AppDrawer; soft-delete with confirm
- [x] 21.4 Create page `app/[locale]/(main)/long-term/fee-items/page.tsx`

### 22. Rate Plan UI

- [x] 22.1 Create `common/services/ratePlanService.ts` — API calls for rate plans (list, get, create, update, delete)
- [x] 22.2 Create `modules/long-term/hooks/useRatePlans.ts` — `useRatePlans(filters)`, `useRatePlan(id)`, `useCreateRatePlan()`, `useUpdateRatePlan()`, `useDeleteRatePlan()`
- [x] 22.3 Create `modules/long-term/components/RatePlanTable.tsx` — AppTable with columns: label, effectiveFrom, status, fee item prices summary; click to expand/edit items
- [x] 22.4 Create `modules/long-term/components/RatePlanFormDrawer.tsx` — AppDrawer; inputs: label, effectiveFrom (DatePicker); dynamic rows for each active `LongTermFeeItem` with unitPrice (CurrencyField, optional — leave empty to exclude from plan)
- [x] 22.5 Create page `app/[locale]/(main)/long-term/rate-plans/page.tsx`

### 23. Meter Reading UI (replaces Utility Reading UI)

- [x] 23.1 Create `common/services/meterReadingService.ts` and `modules/long-term/hooks/useMeterReadings.ts`
- [x] 23.2 Update `modules/long-term/components/UtilityReadingFormDrawer.tsx` → `MeterReadingFormDrawer.tsx`:
  - Select lease; select reading month
  - Load all active METERED fee items from `useFeeItems({ type: "METERED" })`
  - Render one row per fee item: item name + unit, previousReading, currentReading InputNumbers
  - No hardcoded electricity/water fields
  - Submit creates/updates one `LongTermMeterReading` per fee item row that has data
- [x] 23.3 Update `modules/long-term/components/UtilityReadingTable.tsx` → `MeterReadingTable.tsx`:
  - Columns: lease (room + tenant), fee item name, unit, month, previous, current, consumption
  - Group by lease+month or show flat list with filters
- [x] 23.4 Update page `app/[locale]/(main)/long-term/meter-readings/page.tsx` (rename from utility-readings)

### 24. Bill Detail Drawer — Update Line Display

- [x] 24.1 Update `TenantBillDetailDrawer` — bill line table uses `feeItemName` (from `feeItem.name` on line, or `label` for RENT/OTHER) instead of translating `type` enum
- [x] 24.2 Update bill line edit — only `OTHER` category lines are editable inline; `METERED_FEE` lines with `isPending = true` show warning to enter meter reading
- [x] 24.3 Remove `getLineTypeLabel()` function and `lineTypeXXX` i18n keys for ELECTRICITY/WATER/INTERNET (replaced by fee item names from DB)

### 25. Navigation + Permissions Update

- [x] 25.1 Update `configs/navigation.config.ts` — replace "utility-readings" and "utility-rates" items with "meter-readings", "fee-items", "rate-plans"
- [x] 25.2 Update `common/components/layout/AppSidebar.tsx` — add icon mappings for new nav keys
- [x] 25.3 Update route constants in `common/constants/routes.ts`

### 26. i18n — Phase 2 Keys

- [x] 26.1 Add `longTerm.feeItem.*` keys (en + vi): title, createTitle, editTitle, createAction, updateAction, createSuccess, updateSuccess, deleteSuccess, code, name, type, typeMETERED, typeFIXED, unit
- [x] 26.2 Add `longTerm.ratePlan.*` keys (en + vi): title, createTitle, editTitle, createAction, updateAction, createSuccess, updateSuccess, deleteSuccess, label, effectiveFrom, unitPrice, items
- [x] 26.3 Add `longTerm.meterReading.*` keys (en + vi): title, createTitle, editTitle, createAction, updateAction, createSuccess, updateSuccess, previousReading, currentReading, consumption, readingMonth
- [x] 26.4 Add new skip/fail reason keys: `longTerm.bill.skipReasonMISSING_RATE_PLAN`, `longTerm.bill.skipReasonMISSING_RATE_PLAN_ITEM`
- [x] 26.5 Add error keys: `longTerm.errors.MISSING_RATE_PLAN`, `longTerm.errors.MISSING_RATE_PLAN_ITEM`, `longTerm.errors.FEE_ITEM_NOT_METERED`, `longTerm.errors.FEE_ITEM_IN_USE`, `longTerm.errors.RATE_PLAN_IN_USE`
- [x] 26.6 Update nav label keys for meter-readings, fee-items, rate-plans sections

### 27. Cleanup — Remove Old Models (after migration verified)

- [x] 27.1 Remove `/api/utility-rates` and `/api/utility-readings` route files
- [x] 27.2 Remove `UtilityRate` and `UtilityReading` from `prisma/schema.prisma`
- [x] 27.3 Remove old services: `utilityRateService.ts`, `utilityReadingService.ts`
- [x] 27.4 Remove old hooks: `useUtilityRates.ts`, `useUtilityReadings.ts`
- [x] 27.5 Remove old components: `UtilityRateTable.tsx`, `UtilityReadingTable.tsx`, `UtilityReadingFormDrawer.tsx`
- [x] 27.6 Remove old pages: `/long-term/utility-rates`, `/long-term/utility-readings`
- [x] 27.7 Remove old `TenantBillLineType` enum after all bill lines have been migrated to `category`
- [x] 27.8 Run `npm run db:generate` and `npm run db:push` after schema cleanup
