## ADDED Requirements

### Requirement: Finance summary page shows revenue, service expenses, goods purchased, and net profit
The finance page SHALL display four KPI cards: Gross Revenue (sum of paid invoice subtotals after discount), Service Expenses (sum of SERVICE document totals), Goods Purchased (sum of INVENTORY and INVENTORY_ADJUSTMENT document totals, using signed amounts), and Net Profit (revenue − service expenses − goods purchased). All amounts SHALL be displayed using `<PriceDisplay>`. The page uses `accountingMonth` for expense attribution — not document date.

#### Scenario: View finance summary for current month (default)
- **WHEN** a user navigates to the finance page with no query params
- **THEN** the system SHALL display KPI cards for the current calendar month with correct aggregated values for revenue and both expense types

#### Scenario: Net profit is positive
- **WHEN** revenue exceeds total expenses for the selected period
- **THEN** Net Profit SHALL display in the default text color

#### Scenario: Net profit is negative (loss)
- **WHEN** total expenses exceed revenue for the selected period
- **THEN** Net Profit SHALL display in a red/error color to signal a loss

#### Scenario: Period with service expenses but no inventory
- **WHEN** the selected period has service expenses but zero inventory receipts
- **THEN** the Goods Purchased card SHALL display 0 VND; Service Expenses and Net Profit SHALL be correct

#### Scenario: INVENTORY_ADJUSTMENT reduces Goods Purchased total
- **WHEN** a period contains an INVENTORY document for 1,000,000 VND and an INVENTORY_ADJUSTMENT document for -200,000 VND (shrinkage)
- **THEN** Goods Purchased SHALL equal 800,000 VND and Net Profit SHALL reflect the reduced inventory cost

### Requirement: Finance summary supports period filtering by accounting month
The finance page SHALL provide a period selector with a "This Month" preset and a month-range picker (not a date picker — granularity is one calendar month). Changing the period SHALL re-fetch both revenue and expense data using `accountingMonth` as the attribution field.

#### Scenario: User selects "This Month" preset
- **WHEN** a user clicks the "This Month" button
- **THEN** all KPI cards and breakdowns SHALL update to reflect data attributed to the current calendar month

#### Scenario: User selects a custom month range
- **WHEN** a user picks start month and end month (e.g. August to October)
- **THEN** all KPI cards and breakdowns SHALL update to reflect the three-month aggregated totals

#### Scenario: User selects a range with no data
- **WHEN** the selected period has no invoices and no expense documents
- **THEN** all four KPI cards SHALL display 0 VND and the breakdown sections SHALL show empty states

### Requirement: Expense summary API returns hierarchical totals — service by ExpenseCategory→ExpenseItem, inventory by ProductCategory→Product
`GET /api/expense-documents/summary?startMonth=YYYY-MM&endMonth=YYYY-MM` SHALL return aggregated totals filtered on `document.accountingMonth` within the stated range (inclusive) and `document.isActive = true`. The response splits SERVICE and INVENTORY totals and provides distinct breakdown hierarchies for each type. `totalInventory` includes both `INVENTORY` and `INVENTORY_ADJUSTMENT` documents using their signed `totalAmount` values.

Response shape:
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

- SERVICE breakdown: grouped by `ExpenseCategory` → `ExpenseItem` via `ServiceExpenseLine.expenseItemId`
- INVENTORY breakdown: grouped by `ProductCategory` → `Product` via `InventoryReceiptLine.productId` → `Product.categoryId`; each product entry includes `unit` from the `Product` master record and `totalQuantity` (signed sum of line quantities for the period)

#### Scenario: Summary with mixed service and inventory documents
- **WHEN** the client calls the summary endpoint for a period containing both types
- **THEN** the response SHALL include `totalService`, `totalInventory`, `total` (their sum), `service.categories[].items[]`, and `inventory.categories[].products[]`
- **THEN** within each type, the sum of category totals SHALL equal the type total
- **THEN** within each category, the sum of item/product totals SHALL equal the category total

#### Scenario: Inventory product summary includes unit and quantity
- **WHEN** the summary contains inventory lines for "Heineken 330ml" (300 chai × 10,000 VND)
- **THEN** the product entry SHALL include `total: 3000000`, `totalQuantity: "300.000"`, and `unit: "chai"`

#### Scenario: INVENTORY_ADJUSTMENT affects inventory totals and breakdown
- **WHEN** an INVENTORY_ADJUSTMENT document with a negative-quantity line for "Khăn 70x140" (-10 cái × 20,000 VND = -200,000 VND) exists in the period alongside a receipt for the same product (100 cái = 2,000,000 VND)
- **THEN** the product entry SHALL show `total: 1800000` and `totalQuantity: "90.000"` reflecting the signed aggregate

#### Scenario: Summary with no expenses in period
- **WHEN** no active expense documents exist for the stated accountingMonth range
- **THEN** the response SHALL return `{ totalService: 0, totalInventory: 0, total: 0, service: { categories: [] }, inventory: { categories: [] } }`

#### Scenario: Soft-deleted documents excluded from summary
- **WHEN** a document has been soft-deleted
- **THEN** its lines SHALL NOT contribute to any totals in the summary response

### Requirement: Finance summary includes two-level expense breakdown tables, one per type
Below the KPI cards, the page SHALL display two collapsible breakdown tables: "Service Expenses" and "Goods Purchased". Service breakdown lists ExpenseCategory as top-level rows (expandable) with ExpenseItem rows nested inside. Inventory breakdown lists ProductCategory as top-level rows (expandable) with Product rows nested inside.

Service item rows show: item name, total amount, % of category total.
Inventory product rows show: product name, unit, total quantity purchased, total amount, % of category total.

#### Scenario: Expand service category row
- **WHEN** a user expands a service category in the breakdown table
- **THEN** child rows SHALL show each service item with total amount and percentage of the category total

#### Scenario: Expand inventory category row
- **WHEN** a user expands an inventory category in the breakdown table
- **THEN** child rows SHALL show each product with unit, total quantity purchased (signed), total amount (signed), and percentage of the category total

#### Scenario: Category with no data hidden
- **WHEN** a category has no expenses of a given type in the selected period
- **THEN** that category SHALL NOT appear in the corresponding breakdown table

#### Scenario: Empty breakdown state
- **WHEN** no expenses of a given type exist for the selected period
- **THEN** the corresponding breakdown table SHALL display an empty state message

### Requirement: Finance summary page is accessible only to MANAGER and ADMIN roles
Navigation to the finance page SHALL be gated by MANAGER or ADMIN role. RECEPTIONIST and HOUSEKEEPING users SHALL not see the menu item or be able to access the route.

#### Scenario: ADMIN accesses finance page
- **WHEN** an ADMIN user navigates to the finance page
- **THEN** the page SHALL render normally with all four KPI cards and both breakdown tables

#### Scenario: RECEPTIONIST attempts to access finance page
- **WHEN** a RECEPTIONIST navigates directly to the finance URL
- **THEN** the system SHALL redirect to the dashboard or show a 403 forbidden state

### Requirement: Dashboard displays a Net Profit summary widget
The existing dashboard SHALL gain an additive `NetProfitCard` showing net profit for the current calendar month (revenue minus all expense types combined). It SHALL not replace or alter any existing card.

#### Scenario: Net Profit card on dashboard
- **WHEN** a MANAGER or ADMIN views the dashboard
- **THEN** a Net Profit card SHALL be visible showing the current month's net profit value using `<PriceDisplay>`

#### Scenario: Net Profit card not visible to RECEPTIONIST
- **WHEN** a RECEPTIONIST views the dashboard
- **THEN** the Net Profit card SHALL not be rendered
