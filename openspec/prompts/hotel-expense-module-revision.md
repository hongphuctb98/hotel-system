# Prompt Update Design: hotel-expense-module

Use this prompt with Claude to **update in place** the files in `openspec/changes/hotel-expense-module/` — `proposal.md`, `design.md`, `specs/`, and `tasks.md` — according to the fixes below. Do not create a new change folder.

Reason for updating in place: this spec has not been implemented yet (`0/60` tasks, untracked), so editing it directly is cleaner than creating a separate patch change.

---

Update the spec in `openspec/changes/hotel-expense-module/` according to the requirements below. Keep the current format (`proposal.md`, `design.md`, `specs/`, `tasks.md`) and preserve the existing English writing style of the files.

## 1. [CRITICAL] Link INVENTORY lines to Product (from product-inventory-module), not ExpenseItem

The `product-inventory-module` change (see `openspec/changes/product-inventory-module/`) already defines the `Product` entity (real SKUs such as "Heineken 330ml", "Khăn 70x140", etc.) and `Inventory` (stock level). The expense module must integrate with it.

**Schema change:**

```prisma
model InventoryReceiptLine {
  id          String   @id @default(cuid())
  documentId  String
  productId   String              // changed from expenseItemId to productId
  quantity    Decimal  @db.Decimal(10, 3)
  unitPrice   Int
  lineTotal   Int

  document    ExpenseDocument @relation(fields: [documentId], references: [id])
  product     Product         @relation(fields: [productId], references: [id])

  @@index([documentId])
  @@index([productId])
}
```

Remove `InventoryReceiptLine.expenseItemId`. Add the back-relation `Product.inventoryReceiptLines InventoryReceiptLine[]`.

Keep `ServiceExpenseLine.expenseItemId` unchanged — the SERVICE type still uses ExpenseItem for classification.

## 2. [CRITICAL] Auto-emit StockMovement when creating/updating/deleting ExpenseDocument of type INVENTORY

**Add a new enum value** to separate adjustment entries from normal receipts:

```prisma
enum ExpenseDocumentType {
  SERVICE
  INVENTORY              // normal stock receipt (quantity > 0, unitPrice > 0)
  INVENTORY_ADJUSTMENT   // correction / shrinkage / stock reconciliation (quantity may be negative)
}
```

**Validation rules for InventoryReceiptLine** (update the corresponding scenarios in the spec):
- `type=INVENTORY` -> `quantity > 0` AND `unitPrice > 0` (keep the existing behavior)
- `type=INVENTORY_ADJUSTMENT` -> `quantity != 0` (negative values allowed), `unitPrice >= 0`, and `lineTotal` must follow the same sign as `quantity` (`ROUND(quantity * unitPrice)`, may be negative)

**Create document**:
- `type=INVENTORY` -> for each line, emit `StockMovement(type=IN, reason=PURCHASE, productId=line.productId, quantity=+line.quantity, refType='EXPENSE_DOCUMENT', refId=document.id, createdById=user.id)` and update `Inventory.quantity` atomically.
- `type=INVENTORY_ADJUSTMENT` -> for each line, emit `StockMovement(type=ADJUST, reason=STOCKTAKE, productId=line.productId, quantity=line.quantity /* signed */, refType='EXPENSE_DOCUMENT', refId=document.id, createdById=user.id)` and update `Inventory.quantity` atomically using the signed delta. If a negative delta would make stock fall below zero, return 409 `INSUFFICIENT_STOCK`.

**Update document (PUT full-replace)** — applies only to `type=INVENTORY`:
- Read existing movements where `refType='EXPENSE_DOCUMENT' AND refId=document.id`, and emit one reversing movement for each old movement (IN -> OUT with the same quantity).
- Then emit new IN movements for the new lines.
- Everything must happen in a single transaction. Existing movements must never be modified, only appended with reversing entries.
- `type=INVENTORY_ADJUSTMENT` is immutable: PUT must return 409 `ADJUSTMENT_IMMUTABLE`. If it was entered incorrectly, the user must create a new adjustment with the opposite quantity.

**Soft-delete document**:
- `type=INVENTORY` -> apply the simulation check (see Rule #3 below). If it passes, emit reversing OUT movements for all previous IN movements and decrement `Inventory.quantity` accordingly.
- `type=INVENTORY_ADJUSTMENT` -> always block soft-delete with 409 `ADJUSTMENT_IMMUTABLE`. Deletion is not allowed; only an opposite-signed adjustment may be created.

Document this flow clearly in `design.md` as a new decision (Decision 10 — StockMovement integration + adjustment entry) and add matching BDD scenarios in `specs/expense-management/spec.md` (including new scenarios such as "Create INVENTORY_ADJUSTMENT with negative quantity" and "Attempt to PUT INVENTORY_ADJUSTMENT returns 409").

## 3. [CRITICAL] Use a simulation-based conflict check instead of a timeline lock

**Remove the old rule "if any OUT movement exists on the product then the document is permanently locked"** — that rule would lock documents immediately because products naturally have ongoing stock movement history.

**New rule (simulation on reversal)**: when the user sends PUT or soft-deletes a document of `type=INVENTORY`, the backend must, inside a single `prisma.$transaction`:

1. Compute the signed delta for each affected product: PUT = `-(old qty) + (new qty)`, DELETE = `-(old qty)`.
2. Simulate applying the delta using a conditional update: `UPDATE inventory SET quantity = quantity + delta WHERE productId = X`, then read back `Inventory.quantity`.
3. If any product would have `quantity < 0` after simulation, roll back the transaction and return 409 `STOCK_ALREADY_CONSUMED` with payload `{ productId, productName, currentQty, wouldBecome, shortfall }` for every failing product (as an array).
4. If all checks pass, commit the transaction (emit reversing movements and new IN movements as described in Rule #2).

**Implication**: edit/delete remains allowed when current stock is still sufficient to give back the previously received goods; it is blocked only when those goods have actually been consumed.

**UI behavior on 409 `STOCK_ALREADY_CONSUMED`**:
- Show an error modal listing each insufficient product, for example: `"Khăn 70x140: current stock 5, need to reverse 10, short by 5."`
- Primary action: `"Create adjustment document"` -> open the create drawer with `type=INVENTORY_ADJUSTMENT`, pre-filling the affected products with quantity = shortfall.
- Secondary action: `"Close"` (cancel edit/delete).

Remove the old `DOCUMENT_LOCKED` concept and the lock icon behavior. Document this simulation rule in `design.md` as Decision 11 (Stock-integrity guard via simulation) and add the matching BDD scenarios.

## 4. [NEW] Master data "Recurring Expense" — fixed monthly bills (electricity, water, internet, etc.)

Add flags and default values to `ExpenseItem` (simpler than introducing a separate entity):

```prisma
model ExpenseItem {
  ...existing fields...
  isRecurring             Boolean @default(false)
  defaultVendor           String?
  defaultAmount           Int?              // VND; null = variable amount
  defaultPaymentMethodId  String?

  defaultPaymentMethod    PaymentMethod? @relation("ExpenseItemDefaultPayment", fields: [defaultPaymentMethodId], references: [id])
}

model PaymentMethod {
  ...existing fields...
  expenseDocuments         ExpenseDocument[]
  defaultForExpenseItems   ExpenseItem[]     @relation("ExpenseItemDefaultPayment")  // required back-relation for the named relation above
}
```

This applies only to the SERVICE type. Inventory continues to use the Product master data from `product-inventory-module`.

**Task/migration note**: update section 1 of `tasks.md` (Prisma schema) to include the `defaultForExpenseItems` back-relation on `PaymentMethod`. Without that back-relation, `prisma generate` will fail.

**New UX:** add a section "Recurring Bills This Month" at the top of the `/expenses` page:

- Show all `ExpenseItem` records with `isRecurring=true`
- Each row shows: item name, default vendor, default amount (if present), and status `"Recorded this month / Not recorded yet"`
- Action `"Quick record"` -> opens the drawer pre-filled with: `type=SERVICE`, vendor, payment method, one line (category/item/amount from defaults), and `accountingMonth = current month` so the user only needs to confirm or adjust the amount before saving
- `"Recorded status"` means there is an ExpenseDocument in the current month with at least one line referencing that item

Seed sample data: mark `Electricity`, `Water`, and `Internet` with `isRecurring=true` and provide default vendor/amount values (the amount may be null for Electricity because it varies).

Add a "Recurring Bills This Month" section to `design.md` (as a new decision) and corresponding scenarios in `specs/expense-management/spec.md`.

## 5. [UX] Replace the Category -> Item cascade with a single grouped Select

With roughly 15 ExpenseItems, a two-step cascade is unnecessary.

SERVICE lines editor: use a single Ant Design `Select` with options grouped by category (`optGroup`) or with `options` shaped like `[{ label: 'Utilities', options: [...] }]`. Support search.

Remove the separate Category step. Remove `useExpenseCategories` and the cascade behavior from `ServiceLinesEditor`. Keep `ExpenseCategory` master data because it is still needed for report breakdowns.

INVENTORY lines editor: replace the Category + Item selects with a single Product select (grouped by `Product.category`), because the FK has been changed to `productId` in task #1.

## 6. [UX] Add "Duplicate from previous" action on the list page

On the expense list page, add a `"Duplicate"` action (Copy icon) to each row. Clicking it opens a new create drawer pre-filled from the selected document, BUT with `accountingMonth = current month` and `documentDate = today`. The user should only need to confirm or edit the amounts.

This is especially useful for recurring bills that do not have the `isRecurring` flag.

## 7. [UX] Show a confirm dialog when switching type if lines already exist

Instead of silently clearing lines, when the user switches type and `lines.length > 0`, show an Ant Design `modal.confirm` with text like `"Changing the type will remove all entered lines. Continue?"` and two options: `Continue / Cancel`.

Update the scenario "Switching type clears existing lines" in the specs so it explicitly includes this confirmation step.

## 8. [UX] Keyboard flow for multi-row input

Specify this clearly in task 11.4 (`InventoryLinesEditor`) and 11.3 (`ServiceLinesEditor`):

- Tab order: Product (or Category+Item) -> Quantity -> UnitPrice -> (Product of the next row)
- Pressing Enter in the last field of the last row should auto-add a new row and focus the first field
- Pressing Backspace in an empty row should remove the row and focus the previous row

Paste-from-Excel is not required in MVP, but add it to "Open Questions" for future consideration.

## 9. [UX] Auto-carry category / auto-suggest from the previous row

If the user is entering 10 products from the same category (for example, all are F&B supplies):

- For INVENTORY (after fix #1 — using Product), if the Product select supports category scoping, keep the previous row’s category filter as the default
- For SERVICE (using a single grouped select), auto-carry is not needed

## 10. [UX] Use AutoComplete for the Vendor field based on distinct vendors in the DB

Replace the `vendorName` TextField with Ant Design `AutoComplete`. Source: a new API endpoint `GET /api/expense-documents/vendors` that returns distinct non-null `vendorName` values from all active documents, limited to 50 and sorted alphabetically. Show suggestions while typing, but still allow free-text entry.

## 11. [UX minor] Add clearer hint text for accountingMonth on INVENTORY

In the `DocumentHeaderFields` component, when `type=INVENTORY`, add helper text below the Accounting Month picker: `"Expense recognition month (usually the month goods were received)".`

When `type=SERVICE` with a recurring item, use helper text like: `"Usually the month of consumption (for example: an October electricity bill received in November should use October)".`

## 12. [UX minor] Show the rounding formula for lineTotal

In `InventoryLinesEditor`, the Line Total cell should display:
`100.333 × 5,000 = 501,665 VND` (when the quantity is fractional)
or just `501,665 VND` if the quantity is an integer.

This helps users trust the result when the paper invoice differs by a few đồng due to rounding.

---

## Change Scope

**Files to update in `openspec/changes/hotel-expense-module/`:**

- `proposal.md` — update "What Changes" and "Capabilities" so they reflect integration with Product/Inventory, recurring bills master data, and the UX improvements
- `design.md` — add Decision 10 (StockMovement integration + `INVENTORY_ADJUSTMENT` enum), Decision 11 (Stock-integrity guard via simulation), and Decision 12 (Recurring bills quick entry); update Decision 1 schema details (`InventoryReceiptLine.productId` + the new enum value); update Risks/Trade-offs (remove the old risk about lock rules because simulation replaces it)
- `specs/expense-management/spec.md` — add new requirements for: inventory-stock integration, `INVENTORY_ADJUSTMENT` line validation, stock-integrity guard on PUT/delete, recurring bills section, and confirm-on-type-switch; update scenarios so inventory lines reference `productId`
- `specs/expense-category-master/spec.md` — add `isRecurring`, `defaultVendor`, `defaultAmount`, and `defaultPaymentMethodId` to ExpenseItem requirements and scenarios
- `tasks.md` — add/update tasks:
  - 1.6 change `expenseItemId` -> `productId` in `InventoryReceiptLine`
  - 1.x add enum value `INVENTORY_ADJUSTMENT` to `ExpenseDocumentType`
  - 1.x add `isRecurring/defaultVendor/defaultAmount/defaultPaymentMethodId` fields to `ExpenseItem`
  - 1.7 (or the closest PaymentMethod task): add back-relation `defaultForExpenseItems ExpenseItem[] @relation("ExpenseItemDefaultPayment")`
  - New section `"StockMovement Integration"` (dependency: `product-inventory-module`) — covering both INVENTORY (reversing IN/OUT) and INVENTORY_ADJUSTMENT (emit ADJUST with signed quantity)
  - New section `"Stock-integrity Guard"` — simulation check on PUT / soft-delete, returning 409 `STOCK_ALREADY_CONSUMED` with per-product payload
  - 7.x add endpoint `/api/expense-documents/vendors` for autocomplete
  - 11.x update editor components (single grouped select, auto-add row on Enter, adjustment-type UI for signed quantity input)
  - 11.x add `STOCK_ALREADY_CONSUMED` error modal with action `"Create adjustment document"`
  - 12.x add `RecurringBillsPanel` component + section on the expenses page
  - New section `"Recurring Bills Quick Entry"`
- `specs/finance-summary/spec.md` — must also be updated:
  - Inventory breakdown data source changes from `ExpenseCategory -> ExpenseItem` to `ProductCategory -> Product` (because inventory lines now FK to `productId`)
  - Summary response shape changes from `inventory.categories[].items[]` to `inventory.categories[].products[]`; each `product` should also include `unit` (for example `"chai"` or `"cái"`) from Product master data
  - SERVICE breakdown remains unchanged (`service.categories[].items[]` still comes from `ExpenseCategory -> ExpenseItem`)
  - Update inventory scenarios to use `products` instead of `items`, and note that they are grouped by `ProductCategory`
  - The P&L formula and `netProfit = revenue - totalService - totalInventory` remain unchanged — only the shape of the inventory detail changes
  - Update Decision 8 in `design.md` (Summary API) so it reflects the new shape: inventory breakdown from Product, service breakdown from ExpenseItem
  - `INVENTORY_ADJUSTMENT` documents must also be included in `totalInventory` (using signed `document.totalAmount`); documents with negative totals reduce that period’s inventory cost (document this in Decision 8)

## Dependency Note

Add to `proposal.md`:
> **Depends on:** `product-inventory-module` — it must be implemented first because INVENTORY documents integrate with Product and StockMovement.

## Constraints

- Follow the project’s `AGENTS.md` / `CLAUDE.md` constraints (Next.js 16, Prisma v7, AntD v6, master-data pattern, permissions, i18n, soft-delete, `prisma.$transaction` atomicity)
- Update the spec only. **Do not write implementation code.**
- Keep the existing English writing style used by the spec files
- Preserve the current BDD scenario format: `Scenario / WHEN / THEN`
