## Context

The hotel management system is a Next.js 16 / Prisma / PostgreSQL monolith. All business logic lives in route handlers under `app/api/`. The existing short-term booking model is `Booking → Invoice → Payment`. Long-term rental requires a parallel lifecycle: `LeaseContract → TenantBill → TenantBillPayment` with a distinct approval step and recurring bill generation.

Key constraints inherited from the project:
- Soft delete everywhere (`isActive`); unique keys that conflict with inactive records trigger `ENTITY_INACTIVE_EXISTS` responses
- `AuditLog` via `writeAudit` is required on every write route
- All amounts stored in VND integers
- `App.useApp()` for toasts/modals; no static Ant Design message/modal calls
- `AppTable` for all tables; `usePagination` for server-side pagination

## Goals / Non-Goals

**Goals:**
- Model long-term lease contracts with full lifecycle (PENDING → ACTIVE → TERMINATED / EXPIRED)
- Generate monthly `TenantBill` records — manually triggered — with pro-rated rent for mid-month start/end; **only ACTIVE leases** are eligible
- Regenerate (refresh) bills in `DRAFT` or `PENDING` status; `PARTIAL` and `PAID` bills are immutable
- Admin approval workflow: DRAFT → PENDING, email sent on approval
- Dedicated email resend endpoint; `emailSentAt` tracks latest send
- **Generic** meter reading input per fee item (not hardcoded electricity/water)
- **Generic** fee-item master: electricity, water, internet, parking, cleaning, etc. with METERED or FIXED behavior
- **Versioned rate plans** with effective dates — bill generation picks the applicable plan
- Flexible "other fees" line items (free-text + VND amount) per bill
- Partial/full payment tracking per bill
- Block short-term bookings on rooms with active/upcoming lease (14-day window)
- All UI text uses i18n keys

**Non-Goals:**
- Automated cron scheduling
- Tenant portal / self-service payment
- SMS notifications
- Multi-currency billing
- Late-payment penalty automation
- Pro-rating fixed fees (always full monthly amount in v1)

---

## Decisions

### D1 — Separate data model, shared Room + Guest

**Decision:** Introduce `LeaseContract`, `TenantBill`, `TenantBillLine`, `LongTermMeterReading`, `LongTermFeeItem`, `LongTermRatePlan`, `LongTermRatePlanItem` as new Prisma models. Reuse existing `Room` and `Guest`. Do **not** repurpose `Booking` or `Invoice`.

**Rationale:** The billing cycle (monthly, recurring, utility-inclusive) is fundamentally different from the nightly-stay model. Separate models keep each domain clean.

---

### D2 — Pro-rated rent calculation

**Decision:** Pro-rate only the **rent** component. Metered charges (electricity, water, etc.) always reflect actual consumption regardless of partial month. Fixed fees (internet, parking, etc.) are always charged at the full monthly amount — never pro-rated in v1.

**Formula:**
```
First bill rent  = monthlyRent × (daysRemainingInStartMonth / daysInStartMonth)
Last bill rent   = monthlyRent × (leaveDay / daysInLeaveMonth)
Full month rent  = monthlyRent (no proration)
Fixed fee        = unitPrice from rate plan item (always full, never prorated)
```

**Where calculated:** Server-side in the bill-generation route handler using `dayjs`. Never client-side.

---

### D3 — Bill generation endpoint (manual trigger, idempotent with regeneration)

**Decision:** `POST /api/tenant-bills/generate` accepts optional `{ month, year }`.

Processing order per lease:
1. Skip non-ACTIVE leases (with specific reason: `LEASE_NOT_ACTIVE` / `LEASE_TERMINATED` / `LEASE_EXPIRED`)
2. Skip if billing period is outside lease dates (`LEASE_NOT_IN_BILLING_PERIOD`)
3. Check if bill already exists:
   - `PARTIAL` or `PAID` → skip with `BILL_ALREADY_PAID_OR_PARTIAL`
4. Look up applicable `LongTermRatePlan` (highest `effectiveFrom ≤ period start`); if none → fail with `MISSING_RATE_PLAN`
5. Validate all required fee items have prices in plan; if missing → fail with `MISSING_RATE_PLAN_ITEM`
6. No bill → create new `DRAFT`; bill in `DRAFT`/`PENDING` → regenerate (replace lines, preserve payments/status)

**Response format:**
```json
{
  "created": 3,
  "regenerated": 2,
  "skipped": [{ "leaseId": "...", "guestName": "...", "roomNumber": "...", "reason": "LEASE_TERMINATED" }],
  "failed":  [{ "leaseId": "...", "guestName": "...", "roomNumber": "...", "reason": "MISSING_RATE_PLAN" }]
}
```

---

### D4 — Bill approval workflow + email

**Decision:**
1. Generated bills start as `DRAFT`.
2. `PATCH /api/tenant-bills/[id]/approve` transitions `DRAFT → PENDING`; sets `approvedAt` and `approvedById`; sends email.
3. No intermediate `APPROVED` status. `OVERDUE` is computed on-read.

---

### D5 — Room availability blocking (14-day window)

*(Unchanged from Phase 1 — see original decision.)*

**Condition A:** active lease overlap. **Condition B:** 14-day pre-move-in buffer. Both applied in shared availability helper.

---

### D6 — Room status sync

*(Unchanged from Phase 1.)* Lease ACTIVE → `RENTED_LONG_TERM`. Lease TERMINATED → revert to `AVAILABLE` only if still `RENTED_LONG_TERM`.

---

### D7 — TenantBillLine: category + feeItemId replaces type enum

**Decision:** Replace `TenantBillLineType` enum (`RENT|ELECTRICITY|WATER|INTERNET|OTHER`) with:
- `category TenantBillLineCategory` enum: `RENT | METERED_FEE | FIXED_FEE | OTHER`
- `feeItemId String?` — nullable FK to `LongTermFeeItem`

| Old type     | New category  | feeItemId           |
|---|---|---|
| RENT         | RENT          | null                |
| ELECTRICITY  | METERED_FEE   | → electricity item  |
| WATER        | METERED_FEE   | → water item        |
| INTERNET     | FIXED_FEE     | → internet item     |
| OTHER        | OTHER         | null                |

**Rationale:** Enum-per-fee-type required a schema migration every time a new fee item (parking, cleaning) was added. The category + FK model allows unlimited fee items with zero schema changes.

**Display:** Bill line labels come from `LongTermFeeItem.name` (for METERED_FEE / FIXED_FEE lines) or free-text `label` column (for RENT and OTHER lines). The `label` column is kept on `TenantBillLine` for all types.

---

### D8 — LongTermFeeItem: dedicated long-term master data

**Decision:** Introduce `LongTermFeeItem` as a **module-local** master data entity, separate from the global hotel master-data module.

**Why separate from global master data?**
The global master-data module (`/api/master/*`) serves hotel-wide concepts (room types, booking statuses, payment methods) used across front desk, housekeeping, and billing. Long-term fee items are exclusively consumed by the long-term rental module. Mixing them into the global master would pollute the shared namespace, add unnecessary UI clutter for front-desk staff, and couple the modules unnecessarily.

**Schema:**
```prisma
model LongTermFeeItem {
  id         String              @id @default(cuid())
  code       String              @unique
  name       String
  type       LongTermFeeItemType // METERED | FIXED
  unit       String?             // "kWh", "m3", "month" — display only
  isActive   Boolean             @default(true)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  ratePlanItems LongTermRatePlanItem[]
  meterReadings LongTermMeterReading[]
  billLines     TenantBillLine[]

  @@map("long_term_fee_items")
}

enum LongTermFeeItemType {
  METERED
  FIXED
}
```

**Built-in seed items** (created by `db:seed`):
| code          | name          | type    | unit  |
|---|---|---|---|
| ELECTRICITY   | Electricity   | METERED | kWh   |
| WATER         | Water         | METERED | m³    |
| INTERNET      | Internet      | FIXED   | month |

Additional items (parking, cleaning, etc.) can be added via the fee items screen without code changes.

---

### D9 — LongTermRatePlan: versioned pricing

**Decision:**

```prisma
model LongTermRatePlan {
  id            String   @id @default(cuid())
  label         String
  effectiveFrom DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  items         LongTermRatePlanItem[]

  @@map("long_term_rate_plans")
}

model LongTermRatePlanItem {
  id         String           @id @default(cuid())
  ratePlanId String
  feeItemId  String
  unitPrice  Int              // VND
  ratePlan   LongTermRatePlan @relation(fields: [ratePlanId], references: [id])
  feeItem    LongTermFeeItem  @relation(fields: [feeItemId], references: [id])

  @@unique([ratePlanId, feeItemId])
  @@map("long_term_rate_plan_items")
}
```

**Rate lookup rule:** Bill generation picks the active `LongTermRatePlan` with the highest `effectiveFrom ≤ billing period start`. If none exists, fail with `MISSING_RATE_PLAN`. If a required fee item (any active `LongTermFeeItem`) has no `LongTermRatePlanItem` in the selected plan, fail with `MISSING_RATE_PLAN_ITEM`.

**UI:** The rate plan form shows all active `LongTermFeeItem` rows and lets admin set a `unitPrice` per item. Items without a price in the form are excluded from the plan (i.e., no `LongTermRatePlanItem` row created).

---

### D10 — LongTermMeterReading: generic meter readings

**Decision:** Replace `UtilityReading` (hardcoded electricity/water) with `LongTermMeterReading` (generic, per fee item):

```prisma
model LongTermMeterReading {
  id              String          @id @default(cuid())
  leaseId         String
  feeItemId       String
  readingMonth    String          // YYYY-MM
  previousReading Decimal         @db.Decimal(10, 3)
  currentReading  Decimal         @db.Decimal(10, 3)
  consumption     Decimal         @db.Decimal(10, 3)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  lease           LeaseContract   @relation(...)
  feeItem         LongTermFeeItem @relation(...)

  @@unique([leaseId, feeItemId, readingMonth])
  @@map("long_term_meter_readings")
}
```

**Rules:**
- Only `LongTermFeeItem` with `type = METERED` can have readings (validate in API).
- `currentReading >= previousReading` enforced in route handler.
- On create/update: recalculate matching `METERED_FEE` bill line if a `DRAFT` or `PENDING` bill exists for the same lease + period.

---

### D11 — Money type: Int for all long-term amounts

*(Unchanged from Phase 1.)* All monetary fields in VND use `Int`. Meter readings use `Decimal @db.Decimal(10,3)` for precision.

---

### D12 — Navigation and permissions

**Decision:** Long-term rental sidebar section includes five items:

| Label (VI) | Route | Permission |
|---|---|---|
| Hợp đồng | `/long-term/leases` | LONG_TERM_VIEW |
| Hóa đơn | `/long-term/bills` | LONG_TERM_VIEW |
| Chỉ số | `/long-term/meter-readings` | LONG_TERM_VIEW |
| Khoản phí | `/long-term/fee-items` | LONG_TERM_VIEW |
| Bảng giá | `/long-term/rate-plans` | LONG_TERM_VIEW |

Permissions unchanged: ADMIN/MANAGER all; RECEPTIONIST VIEW + lease CREATE + BILL_PAY; HOUSEKEEPING none.

---

### D13 — Shared Attachment table (polymorphic)

*(Unchanged from Phase 1.)* `Attachment` model with `entityType + entityId`. Lease files use `entityType = "LEASE_CONTRACT"`.

---

### D14 — Bill regeneration behavior

*(Unchanged from Phase 1.)* Regeneration deletes and replaces all `TenantBillLine` rows. Never touches `TenantBillPayment`. `PARTIAL`/`PAID` bills are protected. Manual `OTHER` lines are also replaced (staff must re-add if needed; warning shown in UI).

---

### D15 — Bill detail drawer button placement

*(Unchanged from Phase 1.)* All primary actions in footer: Close → Save edits → Approve → Send Email → Record Payment.

---

### D16 — Payment modal: no receipt image upload

*(Unchanged from Phase 1.)* Fields: amount, date, payment method, notes only.

---

### D17 — i18n for all long-term module UI text

*(Unchanged from Phase 1 — extended for new entities.)* All strings under `longTerm` namespace. New keys added for `feeItem`, `ratePlan`, `meterReading` sub-namespaces.

---

### D18 — Backward compatibility during Phase 2 migration

**Decision:** Phase 2 introduces new models and deprecates `UtilityRate` and `UtilityReading`. Migration plan:

1. Add new models (`LongTermFeeItem`, `LongTermRatePlan`, etc.) alongside old ones.
2. Seed default fee items (ELECTRICITY, WATER, INTERNET).
3. Migrate existing `UtilityRate` records to `LongTermRatePlan` + `LongTermRatePlanItem` via seed/migration script.
4. Switch bill generation to use new models.
5. Drop old API routes (`/api/utility-rates`, `/api/utility-readings`).
6. Remove old Prisma models after data is migrated.

**Why not a flag-day replacement:** The existing deployed data in `utility_rates` and `utility_readings` tables must be preserved and migrated. A gradual cutover allows testing without data loss.

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Email delivery failure on bill approval | Catch, log, return `{ approved: true, emailSent: false }`. |
| Rate plan with no items for a required fee | Fail with `MISSING_RATE_PLAN_ITEM` per lease — clearly surfaced in generation result. |
| Migration of old UtilityRate data to new model | Handled by seed/migration script in Phase 2 task 16. |
| Bill regeneration deletes manual OTHER lines | By design. Warning shown in Generate Bills dialog. |
| Room status desync | On termination, only revert if current status is still `RENTED_LONG_TERM`. |
| Missing `guest.email` | Approval proceeds; email skipped; warning returned. |
