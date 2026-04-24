## Context

The hotel management system tracks revenue via `Invoice` (paid flag, subtotal, tax, discount) and `Payment` records linked to bookings. There is no mechanism to record operational outflows. Two structurally different outflow types exist: **service expenses** (direct cost recognised immediately — utilities, repairs, fees) and **inventory/goods receipts** (quantity-based purchases where goods enter stock — supplies, amenities, linen). A single flat `Expense` model collapses these into one shape, losing the quantity data needed for inventory management and the type separation needed for meaningful P&L reporting.

The `product-inventory-module` already introduces `Product`, `Inventory`, and `StockMovement`. Goods receipt documents must integrate with that layer: creating a receipt increments on-hand stock; editing or deleting one must reverse those movements. This module depends on `product-inventory-module` being implemented first.

The existing codebase follows a strict layered architecture: thin pages → module components → React Query hooks → `common/services/` → API route handlers → Prisma. All master-data entities use the generic `MasterDataTable<T>` component. New work must fit this pattern.

## Goals / Non-Goals

**Goals:**
- Document-based expense model: one `ExpenseDocument` per vendor invoice, with typed line items
- `SERVICE` documents: one or more lines, each with ExpenseItem + direct amount
- `INVENTORY` documents: one or more lines, each with Product + quantity + unit price; auto-emit StockMovement(IN) per line
- `INVENTORY_ADJUSTMENT` documents: signed-quantity corrections; auto-emit StockMovement(ADJUST) per line; immutable after creation
- Explicit `accountingMonth` field separate from `documentDate` to support late entry for prior periods
- Reuse existing `PaymentMethod` master data for document payment method
- Full CRUD API with atomic line replacement on update for SERVICE and INVENTORY types
- Stock-integrity guard on INVENTORY edit/delete: reject if reversal would drive stock below zero
- Smart drawer UI with type-switching between service and inventory forms
- Recurring bills master-data flags on `ExpenseItem` with quick-record panel on the expenses page
- Finance summary split: service expenses (by ExpenseCategory→ExpenseItem) vs. goods purchased (by ProductCategory→Product), net profit, period filter
- Dashboard `NetProfitCard`, MANAGER/ADMIN gated

**Non-Goals:**
- Full GAAP accrual accounting (goods receipt is recognised in the stated `accountingMonth` — no amortisation)
- Expense approval workflows or draft/submitted status
- Multi-currency entry
- Payroll integration

## Decisions

### 1. Document-header + typed line tables (not a flat Expense row)

**Decision**: `ExpenseDocument` is the root entity (one per invoice). Lines live in two separate child tables keyed by `documentId`: `ServiceExpenseLine` and `InventoryReceiptLine`.

**Rationale**: A flat `Expense` row cannot represent a multi-line goods receipt with quantities. Separate line tables give strict typing — `ServiceExpenseLine` has no null quantity columns; `InventoryReceiptLine` has no null amount-only column. The document header captures fields shared by all lines (vendor, date, accounting period, reference).

**Alternative considered**: One `ExpenseDocumentLine` table with nullable `quantity`/`unitPrice`/`amount` columns gated by `type`. Rejected — null columns create ambiguity and allow invalid states (service line with a quantity, inventory line without one).

**Prisma schema:**
```prisma
enum ExpenseDocumentType {
  SERVICE
  INVENTORY             // goods receipt: quantity > 0, unitPrice > 0; emits StockMovement(IN)
  INVENTORY_ADJUSTMENT  // signed correction: quantity != 0 (may be negative); emits StockMovement(ADJUST); immutable after creation
}

model ExpenseDocument {
  id              String               @id @default(cuid())
  type            ExpenseDocumentType
  documentDate    DateTime             // date on the vendor invoice/receipt
  accountingMonth DateTime             // stored as YYYY-MM-01T00:00:00.000Z; controls P&L period
  vendorName      String?
  paymentMethodId String?
  referenceNumber String?
  note            String?
  totalAmount     Int                  // denormalised sum; recomputed on every create/update; signed for INVENTORY_ADJUSTMENT
  isActive        Boolean              @default(true)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  paymentMethod   PaymentMethod?       @relation(fields: [paymentMethodId], references: [id])
  serviceLines    ServiceExpenseLine[]
  inventoryLines  InventoryReceiptLine[]

  @@index([accountingMonth])
  @@index([type])
  @@index([isActive])
}

model ServiceExpenseLine {
  id            String          @id @default(cuid())
  documentId    String
  expenseItemId String
  amount        Int             // VND, direct entry; must be > 0

  document      ExpenseDocument @relation(fields: [documentId], references: [id])
  expenseItem   ExpenseItem     @relation(fields: [expenseItemId], references: [id])

  @@index([documentId])
  @@index([expenseItemId])
}

model InventoryReceiptLine {
  id          String          @id @default(cuid())
  documentId  String
  productId   String          // FK to Product from product-inventory-module
  quantity    Decimal         @db.Decimal(10, 3)  // positive for INVENTORY; non-zero signed for INVENTORY_ADJUSTMENT
  unitPrice   Int             // VND per unit; >= 0 (may be 0 for shrinkage adjustments)
  lineTotal   Int             // stored: ROUND(quantity * unitPrice); may be negative for INVENTORY_ADJUSTMENT

  document    ExpenseDocument @relation(fields: [documentId], references: [id])
  product     Product         @relation(fields: [productId], references: [id])

  @@index([documentId])
  @@index([productId])
}

model ExpenseCategory {
  id          String        @id @default(cuid())
  name        String        @unique
  description String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  items       ExpenseItem[]
}

model ExpenseItem {
  id                     String          @id @default(cuid())
  categoryId             String
  name                   String
  description            String?
  isActive               Boolean         @default(true)
  isRecurring            Boolean         @default(false)  // surfaces in "Recurring Bills" panel
  defaultVendor          String?
  defaultAmount          Int?            // VND; null = variable (e.g. electricity varies monthly)
  defaultPaymentMethodId String?
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  category               ExpenseCategory @relation(fields: [categoryId], references: [id])
  defaultPaymentMethod   PaymentMethod?  @relation("ExpenseItemDefaultPayment", fields: [defaultPaymentMethodId], references: [id])
  serviceLines           ServiceExpenseLine[]
}
```

Back-relations to add on existing models:
- `Product` gains `inventoryReceiptLines InventoryReceiptLine[]`
- `PaymentMethod` gains `expenseDocuments ExpenseDocument[]` and `defaultForExpenseItems ExpenseItem[] @relation("ExpenseItemDefaultPayment")`

### 2. SERVICE lines use ExpenseItem; INVENTORY lines use Product

**Decision**: `ServiceExpenseLine.expenseItemId` FK → `ExpenseItem`. `InventoryReceiptLine.productId` FK → `Product` (from `product-inventory-module`).

**Rationale**: Service expenses are abstract cost classifications — "Electricity", "Plumbing Repair" — which do not correspond to physical SKUs with quantities. Inventory receipts are purchases of real goods — "Heineken 330ml", "Khăn 70x140" — which have SKUs, unit measures, and on-hand stock. Using the correct master-data entity in each line table avoids encoding stock-level data in a classification-only entity (`ExpenseItem`) and keeps the inventory layer's `Product` as the single source of truth for physical goods.

`ExpenseCategory` and `ExpenseItem` are retained: they are still needed for service line classification and for the service breakdown in P&L reports.

### 3. accountingMonth is stored as month-start DateTime, separate from documentDate

**Decision**: `accountingMonth DateTime` stores the first-of-month timestamp (e.g. `2024-10-01T00:00:00.000Z`). The API accepts a `YYYY-MM` string and converts server-side. `documentDate` is the date printed on the vendor invoice.

**Rationale**: Hotel finance managers need to post expenses to the correct accounting period regardless of when the invoice was received or entered. A utility bill received on November 3 for October consumption must be posted to October. Storing `accountingMonth` explicitly — rather than deriving it from `documentDate` or `createdAt` — makes this unambiguous.

**Filtering for P&L**: Summary queries filter on `document.accountingMonth` (not `documentDate`). List views can filter by either.

### 4. INVENTORY receipts recognised in accountingMonth; INVENTORY_ADJUSTMENT totals are signed

**Decision**: The total value of an INVENTORY receipt (`document.totalAmount`) is recognised as "Goods Purchased" in the stated `accountingMonth`. INVENTORY_ADJUSTMENT documents may have a negative `totalAmount` (when shrinkage or write-down is recorded) — this reduces the period's inventory cost. Both document sub-types contribute to `totalInventory` in the summary API, using signed totals.

**Rationale**: An adjustment to correct an over-receipt should flow back to the same P&L line where the original receipt was recorded. Signed totals allow the correction to be reflected without requiring manual offsetting entries.

### 5. totalAmount is denormalised on ExpenseDocument

**Decision**: `ExpenseDocument.totalAmount` stores the sum of its lines. For SERVICE: `SUM(serviceLines.amount)`. For INVENTORY/INVENTORY_ADJUSTMENT: `SUM(inventoryLines.lineTotal)`. It is always recomputed server-side on create and update. For INVENTORY_ADJUSTMENT, `totalAmount` may be negative.

**Rationale**: The document list query must show totals without joining to line tables for every row. With potentially hundreds of documents per month, aggregating lines on every list fetch would be slow.

**Invariant**: `totalAmount` is never set by the client — the route handler always recomputes it from lines before saving.

### 6. Lines are replaced atomically on PUT (SERVICE and INVENTORY only)

**Decision**: Updating a SERVICE or INVENTORY document deletes all existing lines for that `documentId` and inserts the new set in a single `prisma.$transaction`. The document header is updated in the same transaction. Inventory stock is also adjusted in the same transaction (see Decision 10). INVENTORY_ADJUSTMENT documents return 409 `ADJUSTMENT_IMMUTABLE` on any PUT attempt.

**Rationale**: Line-level PATCH (add/remove/edit individual lines) requires a diff algorithm and more complex client state. Full replacement is simpler, keeps the API surface small, and is safe inside a transaction. Documents typically have 1–10 lines.

### 7. Reuse existing PaymentMethod master data

**Decision**: `ExpenseDocument.paymentMethodId` is an optional FK to the existing `PaymentMethod` master-data table.

**Rationale**: Zero new abstraction. The hotel already manages payment methods for guest invoices; staff recognise the same list for vendor payments.

### 8. Summary API returns hierarchical totals — service by ExpenseCategory→ExpenseItem, inventory by ProductCategory→Product

**Decision**: `GET /api/expense-documents/summary` returns:
```json
{
  "totalService": 5000000,
  "totalInventory": 2500000,
  "total": 7500000,
  "service": {
    "categories": [
      { "id": "...", "name": "Utilities", "total": 3000000,
        "items": [{ "id": "...", "name": "Electricity", "total": 2000000 }] }
    ]
  },
  "inventory": {
    "categories": [
      { "id": "...", "name": "F&B", "total": 2500000,
        "products": [{ "id": "...", "name": "Heineken 330ml", "unit": "chai", "total": 2500000, "totalQuantity": "300.000" }] }
    ]
  }
}
```

- SERVICE breakdown is grouped by `ExpenseCategory` → `ExpenseItem` (via `ServiceExpenseLine.expenseItemId`).
- INVENTORY breakdown is grouped by `ProductCategory` → `Product` (via `InventoryReceiptLine.productId` → `Product.categoryId` → `ProductCategory`). Each product entry includes `unit` from the `Product` master record.
- `totalInventory` includes both `INVENTORY` and `INVENTORY_ADJUSTMENT` document totals with their signed values. A negative-total adjustment document reduces `totalInventory` for the period.
- The query filters by `accountingMonth` range and `document.isActive = true`.

**Rationale**: Keeping the two breakdown hierarchies consistent with their data sources makes the UI truthful — "Goods Purchased" is broken down by the same `Product` entities shown in the inventory module, not by an arbitrary expense classification.

### 9. Finance page composes two queries client-side

**Decision**: The finance page calls `/api/invoices?paid=true&startDate=X&endDate=Y` (existing) and `/api/expense-documents/summary?startMonth=X&endMonth=Y` (new). A `useFinanceSummary` hook in `modules/finance/hooks/` composes both and derives `netProfit`.

**Rationale**: Keeps each domain's API self-contained. The expense summary endpoint does not need to know about invoices.

### 10. StockMovement auto-emit on INVENTORY and INVENTORY_ADJUSTMENT documents

**Decision**: When an INVENTORY or INVENTORY_ADJUSTMENT document is created, the API emits one `StockMovement` per line inside a `prisma.$transaction` that also updates `Inventory.quantity` atomically. Existing movements are never modified — reversals are new entries.

**Behaviour by document type:**

| Type | StockMovement | quantity | Inventory.quantity |
|---|---|---|---|
| `INVENTORY` create | `IN`, `PURCHASE` | `+line.quantity` | incremented by `+line.quantity` |
| `INVENTORY_ADJUSTMENT` create | `ADJUST`, `STOCKTAKE` | `line.quantity` (signed) | incremented by signed delta |
| `INVENTORY` PUT (full-replace) | reverse old IN → new `OUT`; then new IN per new line | per line | net delta applied atomically |
| `INVENTORY` DELETE | reverse all IN → `OUT` per original line | `+original.quantity` (signed OUT) | decremented |
| `INVENTORY_ADJUSTMENT` PUT | 409 `ADJUSTMENT_IMMUTABLE` | — | — |
| `INVENTORY_ADJUSTMENT` DELETE | 409 `ADJUSTMENT_IMMUTABLE` | — | — |

All movements use `refType='EXPENSE_DOCUMENT'` and `refId=document.id` for traceability.

**Rationale**: The inventory module treats `StockMovement` as an immutable ledger. Expense documents are simply another source of movements — the same append-only pattern applies here. INVENTORY_ADJUSTMENT immutability prevents retroactive falsification of stock correction records; an opposite-signed new document is the correct way to reverse an error.

**Validation rules for InventoryReceiptLine:**
- `type=INVENTORY`: `quantity > 0` AND `unitPrice > 0`
- `type=INVENTORY_ADJUSTMENT`: `quantity != 0`; `unitPrice >= 0`; `lineTotal = ROUND(quantity * unitPrice)`, sign follows `quantity`
- `type=INVENTORY_ADJUSTMENT` with negative delta: if `Inventory.quantity + delta < 0` → return 409 `INSUFFICIENT_STOCK`

### 11. Stock-integrity guard via simulation on INVENTORY edit/delete

**Decision**: When the user edits (PUT) or soft-deletes an INVENTORY document, the backend runs a simulation inside a single `prisma.$transaction` before committing any changes:

1. Compute the signed delta for each affected product: PUT = `-(old qty) + (new qty)`, DELETE = `-(old qty)`.
2. Apply each delta using `UPDATE inventory SET quantity = quantity + delta WHERE productId = X`.
3. Read back the resulting `Inventory.quantity` for each product.
4. If any product would end up with `quantity < 0`, **roll back the entire transaction** and return 409 `STOCK_ALREADY_CONSUMED` with payload:
   ```json
   { "products": [{ "productId": "...", "productName": "Khăn 70x140", "currentQty": 5, "wouldBecome": -5, "shortfall": 10 }] }
   ```
5. If all checks pass, commit (emit reversing movements, emit new IN movements for PUT, decrement inventory).

**Rationale**: A naive "allow edit only if no OUT movements exist" rule would lock documents immediately because products naturally have ongoing stock activity. Simulation checks whether the stock that was received has actually been consumed. If 100 bottles were received but 90 have since been used in bookings, only 10 remain — reversing the receipt of 100 would require the system to create phantom negative stock, which is wrong. The user must create an `INVENTORY_ADJUSTMENT` document with `quantity = -shortfall` to correct the discrepancy instead.

**UI behaviour on 409 `STOCK_ALREADY_CONSUMED`**:
- Show an error modal listing each insufficient product (name, current qty, shortfall).
- Primary action: "Create adjustment document" → open the create drawer with `type=INVENTORY_ADJUSTMENT`, pre-filling the affected products with `quantity = shortfall` (the quantity that needs to be removed).
- Secondary action: "Close" (cancel the edit/delete).

The old `DOCUMENT_LOCKED` concept is removed entirely.

### 12. Recurring bills quick entry

**Decision**: `ExpenseItem` gains four optional recurring-bill fields: `isRecurring Boolean @default(false)`, `defaultVendor String?`, `defaultAmount Int?`, `defaultPaymentMethodId String?`. The `/expenses` page shows a "Recurring Bills This Month" panel above the document list, visible only to users with `EXPENSES_CREATE` permission.

**Panel behaviour:**
- Queries all `ExpenseItem` records with `isRecurring=true` and `isActive=true`.
- Each row shows: item name, default vendor, default amount (if present, else "—"), and a status badge ("Recorded" / "Not yet").
- "Recorded" means at least one active `ServiceExpenseLine` referencing this item exists for the current accounting month.
- "Quick record" action opens the create drawer pre-filled with `type=SERVICE`, `accountingMonth=currentMonth`, `documentDate=today`, `vendorName=defaultVendor`, `paymentMethodId=defaultPaymentMethodId`, one service line with `expenseItemId` and `amount=defaultAmount` (null amount means the amount field is empty and the user must fill it in).

**Rationale**: Fixed monthly bills (electricity, water, internet) must be entered each month. The panel surfaces them proactively and removes repetitive data entry. Using fields on `ExpenseItem` rather than a separate `RecurringTemplate` entity avoids a new join and keeps the master-data surface area minimal.

## Risks / Trade-offs

- **Denormalised `totalAmount` can drift** → Mitigation: server always recomputes from lines on every write; never trusts the client-supplied value. A one-time data-repair script can recompute if drift is ever discovered.
- **Atomic line replacement is wasteful for large line sets** → Mitigation: documents typically have 1–10 lines; this is not a concern at hotel scale.
- **Accounting month backdating bypasses checks** → Intentional: hotel managers must be trusted to set the correct period. The finance page makes `accountingMonth` the displayed date so any errors are visible in the P&L.
- **Simulation-based stock guard adds latency on edit/delete** → Mitigation: the transaction acquires row-level locks only for the affected product rows; contention is minimal at hotel scale. The guard fires only for INVENTORY type; SERVICE and INVENTORY_ADJUSTMENT are unaffected.
- **INVENTORY_ADJUSTMENT immutability may frustrate users who made a typo** → Mitigation: a typo creates an opposite adjustment to cancel it. The immutability is intentional — it preserves audit-trail integrity. Document this clearly in the UI.
- **PaymentMethod FK is optional on ExpenseDocument** → Some vendor invoices are paid by methods not yet in the system (bank transfer, petty cash). The field is nullable; managers can add missing methods to master data.

## Migration Plan

1. Add `ExpenseDocument`, `ServiceExpenseLine`, `InventoryReceiptLine` models; add `ExpenseCategory` and `ExpenseItem` models with recurring-bill fields; add back-relations to `Product` and `PaymentMethod` in `prisma/schema.prisma`
2. Run `npm run db:generate` then `npm run db:migrate` — single additive migration
3. Seed categories first, then items (with FK and recurring flags), in `prisma/seed.ts`
4. Deploy API routes, then UI — fully additive
5. Rollback: drop five new tables, drop new columns from `Product` and `PaymentMethod`, remove migration record — zero impact on existing data

## Open Questions

- Should expense documents support file attachments (receipt scans)? The `file-storage` spec exists — additive, no redesign needed.
- Should the finance summary page live at `/finance` (standalone) or as a tab in an existing reports page? Current proposal: standalone route gated by MANAGER permission, widget on dashboard.
- Paste-from-Excel for line bulk entry: not required for MVP; flagged for future consideration in `InventoryLinesEditor` and `ServiceLinesEditor`.
