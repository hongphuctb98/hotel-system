# Spec: Tenant Billing

## Phase 1 Requirements (implemented, some updated for Phase 2)

---

### Requirement: Admin can manually trigger monthly bill generation for ACTIVE leases only

The system SHALL allow staff with `LONG_TERM_BILL_APPROVE` permission to call `POST /api/tenant-bills/generate` with an optional `{ month, year }` body (defaults to current month).

**Eligibility rule:** Only leases with `status = ACTIVE` are processed.

**Processing order per lease:**
1. If `status != ACTIVE`: skip with specific reason (`LEASE_TERMINATED`, `LEASE_EXPIRED`, or `LEASE_NOT_ACTIVE` for PENDING)
2. If billing period outside lease dates: skip with `LEASE_NOT_IN_BILLING_PERIOD`
3. If existing bill is `PARTIAL` or `PAID`: skip with `BILL_ALREADY_PAID_OR_PARTIAL`
4. *(Phase 2)* Look up applicable `LongTermRatePlan`; if none → fail with `MISSING_RATE_PLAN`
5. Create or regenerate bill

**Skip/fail reason codes:**
- `LEASE_NOT_ACTIVE` — lease is PENDING (not yet activated)
- `LEASE_TERMINATED` — lease has been terminated
- `LEASE_EXPIRED` — lease has expired
- `BILL_ALREADY_PAID_OR_PARTIAL` — bill for this period already exists in PARTIAL or PAID status
- `LEASE_NOT_IN_BILLING_PERIOD` — billing month falls before `startDate` or after `endDate`
- `MISSING_RATE_PLAN` — *(Phase 2)* no `LongTermRatePlan` with `effectiveFrom ≤ period start`
- `MISSING_RATE_PLAN_ITEM` — *(Phase 2)* a required fee item has no price in the selected plan
- `MISSING_REQUIRED_DATA` — guest or room data missing

**Response format:**
```json
{
  "created": 3,
  "regenerated": 2,
  "skipped": [{ "leaseId": "...", "guestName": "...", "roomNumber": "...", "reason": "LEASE_TERMINATED" }],
  "failed":  [{ "leaseId": "...", "guestName": "...", "roomNumber": "...", "reason": "MISSING_RATE_PLAN" }]
}
```

The UI generation result modal MUST display the full `skipped` and `failed` arrays with translated reason labels — not just aggregate counts.

#### Scenario: Non-ACTIVE leases are excluded with specific reasons
- **WHEN** generation triggers for month=5, year=2026
- **AND** leases: 1 ACTIVE, 1 PENDING, 1 TERMINATED, 1 EXPIRED
- **THEN** bill is created only for the ACTIVE lease
- **AND** skipped array contains PENDING (LEASE_NOT_ACTIVE), TERMINATED (LEASE_TERMINATED), EXPIRED (LEASE_EXPIRED)

#### Scenario: PARTIAL/PAID bills are skipped before rate plan lookup
- **WHEN** generation triggers for a lease whose bill is already PAID
- **THEN** the lease is skipped with `BILL_ALREADY_PAID_OR_PARTIAL` even if no rate plan exists

---

### Requirement: Regeneration of existing editable bills

*(Unchanged from Phase 1.)*

When generate is called for a period where a `DRAFT` or `PENDING` bill exists:
1. Delete all existing `TenantBillLine` rows for that bill
2. Recalculate lines using latest meter readings and applicable rate plan
3. Update `TenantBill.totalAmount`
4. Preserve: `status`, `approvedAt`, `approvedById`, `emailSentAt`, `notes`, `dueDate`, `totalPaid`
5. Never modify `TenantBillPayment` records

**Immutability:** `PARTIAL` or `PAID` bills are never regenerated → skipped with `BILL_ALREADY_PAID_OR_PARTIAL`.

---

### Requirement: Bill amounts are pro-rated for mid-month move-in/move-out

*(Unchanged from Phase 1.)* Only the RENT component is pro-rated. All fixed fees (FIXED_FEE category) are always charged at the full monthly amount.

---

### Requirement: Bill line items use category + fee item model (Phase 2)

Each `TenantBill` SHALL contain one or more `TenantBillLine` records with `category` and optional `feeItemId`:

| category    | feeItemId  | Notes |
|---|---|---|
| RENT        | null       | Pro-rated monthly rent; `label = "RENT"` |
| METERED_FEE | → feeItem  | Consumption-based; `label = feeItem.name`; `isPending = true` if no reading |
| FIXED_FEE   | → feeItem  | Monthly fixed charge; `label = feeItem.name`; never pending |
| OTHER       | null       | Free-text fee; manually added by staff on DRAFT bills |

The old `type` enum (RENT/ELECTRICITY/WATER/INTERNET/OTHER) is deprecated and removed after migration.

#### Scenario: Bill includes dynamic fee item lines
- **WHEN** a rate plan has items for ELECTRICITY, WATER, INTERNET, PARKING
- **THEN** the bill contains METERED_FEE lines for ELECTRICITY and WATER, FIXED_FEE lines for INTERNET and PARKING
- **AND** line labels come from `feeItem.name`, not hardcoded translations

#### Scenario: Missing meter reading creates pending line
- **WHEN** no `LongTermMeterReading` exists for a METERED fee item in the billing period
- **THEN** a `METERED_FEE` line is created with `isPending = true`, `quantity = 0`, `amount = 0`
- **AND** admin is warned to enter the reading before approving

---

### Requirement: Admin must approve a DRAFT bill before it activates

*(Unchanged from Phase 1.)*

`PATCH /api/tenant-bills/[id]/approve` validates no `isPending` lines → transitions `DRAFT → PENDING` → sends email → sets `emailSentAt` on success.

---

### Requirement: Staff can resend bill email without re-approving

*(Unchanged from Phase 1.)*

`PATCH /api/tenant-bills/[id]/send-email` — valid for PENDING, PARTIAL, OVERDUE bills. Updates `emailSentAt`. No status change.

---

### Requirement: Bill detail drawer places all primary actions in the footer

*(Unchanged from Phase 1.)*

Footer button order: Close → Save line edits (DRAFT + dirty) → Approve Bill (DRAFT) → Send Email (PENDING/PARTIAL/OVERDUE) → Record Payment (PENDING/PARTIAL/OVERDUE).

Bill line display in Phase 2: use `feeItem.name` as the label for METERED_FEE and FIXED_FEE lines. Remove `getLineTypeLabel()` helper and hardcoded `lineTypeXXX` i18n keys.

---

### Requirement: Admin can record payments against a TenantBill

*(Unchanged from Phase 1.)* Payment modal: amount, date, method, notes. No receipt image upload.

---

### Requirement: All UI text uses i18n keys

*(Unchanged from Phase 1 — extended for Phase 2 fee item/rate plan labels.)*
