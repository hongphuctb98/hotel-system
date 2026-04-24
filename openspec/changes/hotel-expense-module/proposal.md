## Why

The hotel currently tracks revenue through bookings and invoices but has no way to record operational outflows, making it impossible to calculate net profit. Two fundamentally different kinds of outflow exist — service costs (utilities, repairs, fees) and goods purchases (supplies, amenities, linen) — and collapsing them into a single flat expense record loses the information needed for meaningful P&L reporting and meaningful inventory management.

The `product-inventory-module` already introduces `Product` and `Inventory` to track stock levels. Goods receipts (purchasing stock) must be linked to that layer so that receiving goods automatically increases on-hand stock and reversing or editing a receipt automatically adjusts it. Without this integration the two modules would operate in isolation and stock levels would be unreliable.

## What Changes

- New **ExpenseDocument** header entity: one record per vendor invoice or receipt, with document date, accounting month, vendor, payment method, and reference
- New `ExpenseDocumentType` enum with three values: `SERVICE` (direct cost), `INVENTORY` (goods receipt — increases stock), `INVENTORY_ADJUSTMENT` (signed correction — may increase or decrease stock; immutable after creation)
- New **ServiceExpenseLine** table: one or more lines per service document (ExpenseItem FK, amount)
- New **InventoryReceiptLine** table: one or more lines per INVENTORY/INVENTORY_ADJUSTMENT document (Product FK from `product-inventory-module`, quantity, unit price, line total)
- **StockMovement auto-emit**: creating an INVENTORY document emits `StockMovement(IN, PURCHASE)` per line and increments `Inventory.quantity` atomically; creating an INVENTORY_ADJUSTMENT document emits `StockMovement(ADJUST, STOCKTAKE)` with a signed delta
- **Stock-integrity guard on edit/delete**: before reversing prior INVENTORY receipts, the API simulates the stock delta; if any product would go below zero it returns 409 `STOCK_ALREADY_CONSUMED` instead of committing
- New **ExpenseCategory** + **ExpenseItem** two-level master-data hierarchy: used for SERVICE line classification; ExpenseItem gains `isRecurring`, `defaultVendor`, `defaultAmount`, `defaultPaymentMethodId` fields for quick recurring-bill entry
- New API routes under `/api/expense-documents` (CRUD + summary + `/vendors` autocomplete)
- New master-data API routes under `/api/master/expense-categories` and `/api/master/expense-items`
- `modules/expenses/` UI module: document list with filters, smart create/edit drawer with type-switching form, duplicate action, soft-delete; recurring bills panel at the top of the page
- `modules/finance/` summary page: revenue vs. expenses (service + inventory split) with hierarchical breakdown — service by ExpenseCategory→ExpenseItem, inventory by ProductCategory→Product — net profit, period filter
- Dashboard `NetProfitCard` additive widget (MANAGER/ADMIN only)
- Navigation entries for Expenses and Finance (MANAGER/ADMIN gated)
- i18n keys added to `messages/en.json` and `messages/vi.json`

**Depends on:** `product-inventory-module` — it must be implemented first because INVENTORY documents integrate with `Product` and `StockMovement`.

## Capabilities

### New Capabilities

- `expense-management`: Full CRUD for expense documents. A document has a type (`SERVICE`, `INVENTORY`, or `INVENTORY_ADJUSTMENT`), shared header fields (document date, accounting month, vendor, payment method, reference, note), and one or more typed lines. Accounting month is set explicitly — not derived from entry date — so late entry for prior periods is supported. Creating or updating an INVENTORY document automatically emits StockMovement entries and updates on-hand inventory atomically. INVENTORY_ADJUSTMENT documents allow signed-quantity stock corrections and are immutable after creation. A "Recurring Bills" panel on the list page surfaces items marked `isRecurring=true` with a quick-record action.
- `expense-category-master`: Two-level master-data CRUD — `ExpenseCategory` (parent group) and `ExpenseItem` (child line item) — following the existing `MasterDataTable` pattern. Items are used as line-level classification for SERVICE documents. Items support optional recurring-bill defaults (`isRecurring`, `defaultVendor`, `defaultAmount`, `defaultPaymentMethodId`) to speed up monthly entry for fixed bills like electricity, water, and internet.
- `finance-summary`: Finance overview page aggregating revenue (from paid invoices) and expenses (from expense documents) for a selected accounting period. Shows gross revenue, total service expenses, total goods purchased, total expenses, and net profit. Service breakdown is hierarchical (ExpenseCategory → ExpenseItem); inventory breakdown is hierarchical (ProductCategory → Product, with unit and total quantity). INVENTORY_ADJUSTMENT totals are included in the inventory total with their signed amounts.

### Modified Capabilities

- `inventory-management` (from `product-inventory-module`): `Inventory.quantity` is now also updated by expense document operations in addition to direct stock movements. The `StockMovement` ledger records all changes from both sources with consistent `refType`/`refId` traceability.
- `reservation-summary`: No spec-level behavior change — revenue figures remain read-only inputs for the finance-summary page.

## Impact

- **Database**: Five new Prisma models (`ExpenseDocument`, `ServiceExpenseLine`, `InventoryReceiptLine`, `ExpenseCategory`, `ExpenseItem`); `ExpenseItem` gains four recurring-bill columns; back-relation `inventoryReceiptLines` added to existing `Product` model; back-relation `defaultForExpenseItems` added to existing `PaymentMethod` model; additive migration, no changes to other existing tables
- **API**: New route group `app/api/expense-documents/` (index + `[id]` + `summary` + `vendors`); new master routes `app/api/master/expense-categories/` and `app/api/master/expense-items/`
- **Modules**: New `modules/expenses/` and `modules/finance/` directories
- **Dashboard**: Additive `NetProfitCard` — no changes to existing cards
- **Navigation**: Two new entries in `configs/navigation.config.ts` (MANAGER/ADMIN)
- **Permissions**: New `EXPENSES_*` and `FINANCE_VIEW` constants in `common/constants/permissions.ts`
- **i18n**: New keys in `messages/en.json` and `messages/vi.json`
- **Dependencies**: No new npm packages required
