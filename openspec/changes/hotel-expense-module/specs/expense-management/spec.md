## ADDED Requirements

### Requirement: Expense document has a type that controls its line structure and stock behaviour
Every expense document SHALL have a `type` of `SERVICE`, `INVENTORY`, or `INVENTORY_ADJUSTMENT`. The type is set at creation and cannot be changed after saving. A `SERVICE` document uses `ServiceExpenseLine` records; `INVENTORY` and `INVENTORY_ADJUSTMENT` documents use `InventoryReceiptLine` records linked to `Product`. Mixing line types on one document SHALL NOT be permitted.

#### Scenario: Create SERVICE document
- **WHEN** a user submits a new document with type `SERVICE` and one or more service lines
- **THEN** the system SHALL persist the document and its service lines atomically and return HTTP 201

#### Scenario: Create INVENTORY document
- **WHEN** a user submits a new document with type `INVENTORY` and one or more inventory lines
- **THEN** the system SHALL persist the document and its inventory lines atomically, emit `StockMovement(IN, PURCHASE)` per line, and increment `Inventory.quantity` for each product — all in one transaction — and return HTTP 201

#### Scenario: Create INVENTORY_ADJUSTMENT document
- **WHEN** a user submits a new document with type `INVENTORY_ADJUSTMENT` and signed-quantity inventory lines
- **THEN** the system SHALL persist the document and its lines atomically, emit `StockMovement(ADJUST, STOCKTAKE)` per line with the signed delta, and update `Inventory.quantity` for each product atomically — all in one transaction — and return HTTP 201

#### Scenario: Create INVENTORY_ADJUSTMENT with negative quantity (shrinkage)
- **WHEN** a user submits an INVENTORY_ADJUSTMENT line with `quantity = -5` for a product that has `Inventory.quantity >= 5`
- **THEN** the system SHALL persist the document and decrement stock by 5

#### Scenario: Create INVENTORY_ADJUSTMENT with negative quantity that would make stock negative
- **WHEN** a user submits an INVENTORY_ADJUSTMENT line with `quantity = -5` for a product with `Inventory.quantity = 3`
- **THEN** the system SHALL return HTTP 409 with code `INSUFFICIENT_STOCK`

#### Scenario: Create document with no lines
- **WHEN** a user submits a document with an empty lines array
- **THEN** the system SHALL return HTTP 400 indicating at least one line is required

#### Scenario: Attempt to change type on update
- **WHEN** a user submits a PUT request for an existing document with a different `type` value
- **THEN** the system SHALL return HTTP 400 indicating document type cannot be changed after creation

### Requirement: Expense document header captures shared fields including explicit accounting month
Every document SHALL contain: `type`, `documentDate` (date on the vendor invoice), and `accountingMonth` (the P&L period, stored as the first day of the stated month). Optional header fields: `vendorName`, `paymentMethodId` (FK to existing `PaymentMethod` master data), `referenceNumber`, `note`. The `accountingMonth` SHALL be set explicitly by the user and SHALL NOT default to the current month automatically; the UI MAY pre-fill it with the current month as a convenience default.

#### Scenario: Create document with accountingMonth in a prior month
- **WHEN** a user sets `accountingMonth` to a past month (e.g. October when current month is November)
- **THEN** the system SHALL accept it, persist it, and attribute the document's cost to October in all summary queries

#### Scenario: accountingMonth differs from documentDate month
- **WHEN** a document has `documentDate` of 2024-11-03 and `accountingMonth` of 2024-10
- **THEN** the system SHALL store both values independently, with summary queries using `accountingMonth` for period attribution

#### Scenario: Create document without optional fields
- **WHEN** a user submits a document without vendorName, paymentMethodId, referenceNumber, or note
- **THEN** the system SHALL persist the document with those fields null and return HTTP 201

### Requirement: SERVICE document lines contain an ExpenseItem and direct amount
Each `ServiceExpenseLine` SHALL reference an active `ExpenseItem` (FK) and contain a positive integer amount in VND. A document MAY have multiple service lines (e.g. one invoice covering electricity and water). The `expenseItem`'s parent `ExpenseCategory` provides the category — it is not stored on the line.

#### Scenario: Create service line with valid active item and positive amount
- **WHEN** a service document is submitted with a line referencing an active ExpenseItem and amount > 0
- **THEN** the system SHALL persist the line and include it in `document.totalAmount`

#### Scenario: Create service line with inactive item
- **WHEN** a service document is submitted with a line referencing a soft-deleted ExpenseItem
- **THEN** the system SHALL return HTTP 400 indicating the item is inactive

#### Scenario: Create service line with zero or negative amount
- **WHEN** a service document line has amount ≤ 0
- **THEN** the system SHALL return HTTP 400 with a field-level error on that line

#### Scenario: Service document with multiple lines
- **WHEN** a user submits a service document with two lines (e.g. Electricity 500,000 VND and Water 200,000 VND)
- **THEN** the system SHALL persist both lines and set `document.totalAmount` = 700,000

### Requirement: INVENTORY document lines reference a Product with quantity, unit price, and stored line total
Each `InventoryReceiptLine` for `type=INVENTORY` SHALL reference an active `Product` (FK) and contain: `quantity` (positive Decimal, up to 3 decimal places), `unitPrice` (positive integer VND per unit), and a server-computed `lineTotal` = ROUND(quantity × unitPrice). The client SHALL send `quantity` and `unitPrice`; the server SHALL compute and store `lineTotal`. `document.totalAmount` SHALL equal the sum of all `lineTotal` values.

#### Scenario: Create inventory line with valid product, quantity, and unit price
- **WHEN** an INVENTORY document is submitted with a line having quantity = 100, unitPrice = 5000 for an active product
- **THEN** the system SHALL store `lineTotal` = 500,000, increment the product's `Inventory.quantity` by 100, emit `StockMovement(IN, PURCHASE)`, and set `document.totalAmount` accordingly

#### Scenario: Create inventory line with inactive product
- **WHEN** an INVENTORY document is submitted with a line referencing a soft-deleted Product
- **THEN** the system SHALL return HTTP 400 indicating the product is inactive

#### Scenario: Create inventory line with zero quantity
- **WHEN** an INVENTORY document line has quantity ≤ 0
- **THEN** the system SHALL return HTTP 400 with a field-level error on that line

#### Scenario: Create inventory line with zero unit price
- **WHEN** an INVENTORY document line has unitPrice ≤ 0
- **THEN** the system SHALL return HTTP 400 with a field-level error on that line

#### Scenario: Inventory document total derived from lines
- **WHEN** a user submits an INVENTORY document with three lines totalling 3,000,000 VND
- **THEN** `document.totalAmount` SHALL equal 3,000,000 regardless of any client-supplied total

### Requirement: INVENTORY_ADJUSTMENT lines allow signed quantities and may have zero unit price
Each `InventoryReceiptLine` for `type=INVENTORY_ADJUSTMENT` SHALL reference an active `Product`, contain a non-zero `quantity` (positive or negative), a non-negative `unitPrice` (may be 0 for shrinkage), and a computed `lineTotal = ROUND(quantity * unitPrice)` (sign follows quantity). Negative delta checks apply (see above).

#### Scenario: Create adjustment line with fractional negative quantity
- **WHEN** an INVENTORY_ADJUSTMENT document is submitted with `quantity = -2.5`, `unitPrice = 10000`
- **THEN** the system SHALL store `lineTotal = -25000`, decrement `Inventory.quantity` by 2.5, and emit `StockMovement(ADJUST, STOCKTAKE)` with quantity = -2.5

#### Scenario: Create adjustment line with zero unit price
- **WHEN** an INVENTORY_ADJUSTMENT line has `unitPrice = 0` and `quantity = -3`
- **THEN** the system SHALL store `lineTotal = 0` and decrement stock by 3 (shrinkage with no cost impact)

### Requirement: Updating an INVENTORY document atomically reverses old stock movements and applies new ones
Submitting a PUT request for an INVENTORY document SHALL: within a single transaction (1) run the stock-integrity simulation, (2) emit reversing OUT movements for each existing IN movement, (3) delete old lines, (4) insert new lines, (5) emit new IN movements, (6) recompute `totalAmount`, (7) update the document header. INVENTORY_ADJUSTMENT documents are immutable — PUT SHALL return 409 `ADJUSTMENT_IMMUTABLE`.

#### Scenario: Update INVENTORY document header only (same lines)
- **WHEN** a user updates only `vendorName` while resubmitting the same lines
- **THEN** the system SHALL reverse old IN movements and immediately emit equivalent new IN movements (net zero stock change), and update the header

#### Scenario: Update INVENTORY document — change quantity on a line
- **WHEN** a user changes a line from quantity = 100 to quantity = 80 for the same product
- **THEN** the system SHALL emit `StockMovement(OUT)` reversing the original 100, emit `StockMovement(IN)` for the new 80, and set `Inventory.quantity` to reflect the net -20 change

#### Scenario: Update would make stock go negative
- **WHEN** a user reduces a line quantity such that reversing the old receipt would drive stock below zero (because some of the stock has been consumed)
- **THEN** the system SHALL return HTTP 409 with code `STOCK_ALREADY_CONSUMED` and a per-product shortfall payload

#### Scenario: Attempt to PUT INVENTORY_ADJUSTMENT
- **WHEN** a user submits a PUT request for a document with `type=INVENTORY_ADJUSTMENT`
- **THEN** the system SHALL return HTTP 409 with code `ADJUSTMENT_IMMUTABLE`

#### Scenario: Update non-existent document
- **WHEN** a user submits a PUT request for a document ID that does not exist
- **THEN** the system SHALL return HTTP 404

### Requirement: Expense document supports soft-delete with stock-integrity guard for INVENTORY type
Deleting a document SHALL set `isActive = false`. For `type=INVENTORY`, the delete handler SHALL simulate reversing all prior IN movements before committing — returning 409 `STOCK_ALREADY_CONSUMED` if reversal would drive any product below zero. For `type=INVENTORY_ADJUSTMENT`, soft-delete SHALL return 409 `ADJUSTMENT_IMMUTABLE`. For `type=SERVICE`, soft-delete is unconditional.

#### Scenario: Soft-delete active SERVICE document
- **WHEN** a user sends DELETE for an existing active SERVICE document
- **THEN** the system SHALL set `isActive = false` and return HTTP 200

#### Scenario: Soft-delete INVENTORY document when stock is sufficient
- **WHEN** a user deletes an INVENTORY document and all received products still have sufficient stock to reverse the receipt
- **THEN** the system SHALL emit reversing OUT movements, decrement `Inventory.quantity`, set `isActive = false`, and return HTTP 200

#### Scenario: Soft-delete INVENTORY document when stock already consumed
- **WHEN** a user deletes an INVENTORY document but one or more products no longer have enough stock to reverse the receipt
- **THEN** the system SHALL return HTTP 409 with code `STOCK_ALREADY_CONSUMED` and a payload listing each insufficient product (productId, productName, currentQty, wouldBecome, shortfall)

#### Scenario: Attempt to soft-delete INVENTORY_ADJUSTMENT document
- **WHEN** a user sends DELETE for a document with `type=INVENTORY_ADJUSTMENT`
- **THEN** the system SHALL return HTTP 409 with code `ADJUSTMENT_IMMUTABLE`

#### Scenario: Soft-deleted document excluded from list and summary
- **WHEN** the client requests the document list or summary after a soft-delete
- **THEN** the deleted document SHALL NOT appear and its amounts SHALL NOT be included in totals

### Requirement: Expense document list supports pagination and filtering
The list API SHALL support offset pagination and filtering by: `type`, `accountingMonth` (YYYY-MM, maps to month-start/end DateTime range), `startDate`/`endDate` (on `documentDate`), `categoryId` (via service line → item → category join), `vendorName` (partial match). Each returned record SHALL include `type`, `documentDate`, `accountingMonth`, `vendorName`, `totalAmount`, and a `lineCount`.

#### Scenario: Filter by type
- **WHEN** the client requests documents with `type=SERVICE`
- **THEN** the system SHALL return only SERVICE documents with correct pagination metadata

#### Scenario: Filter by accountingMonth
- **WHEN** the client requests documents with `accountingMonth=2024-10`
- **THEN** the system SHALL return all active documents whose `accountingMonth` falls in October 2024

#### Scenario: Filter by categoryId
- **WHEN** the client requests documents with a valid `categoryId`
- **THEN** the system SHALL return SERVICE documents that have at least one line whose item belongs to that category

### Requirement: Vendor name field uses AutoComplete with suggestions from existing documents
The `vendorName` field in the create/edit drawer SHALL use Ant Design `AutoComplete`. The API SHALL provide `GET /api/expense-documents/vendors` returning up to 50 distinct non-null `vendorName` values from active documents, sorted alphabetically. Free-text entry (not in the suggestion list) SHALL always be accepted.

#### Scenario: Vendor autocomplete shows suggestions while typing
- **WHEN** a user types a partial vendor name in the drawer
- **THEN** the autocomplete SHALL filter and display matching suggestions from the vendor list endpoint

#### Scenario: User enters a vendor name not in the suggestion list
- **WHEN** a user types and submits a vendor name that has no matching suggestion
- **THEN** the system SHALL accept the free-text value and persist it

### Requirement: Expense UI provides a smart drawer that switches form layout by type
The create/edit form SHALL be an AppDrawer with a type selector at the top (Segmented control: "Service Expense" / "Inventory Receipt" / "Inventory Adjustment"). Switching type when lines already exist SHALL show an Ant Design `modal.confirm` asking the user to confirm before clearing lines. Shared header fields (Document Date, Accounting Month month-picker with hint text, Vendor AutoComplete, Payment Method select, Reference Number, Note) are always visible. The drawer width SHALL be wider for INVENTORY and INVENTORY_ADJUSTMENT types. The submit button SHALL be mode-aware ("Create Expense" / "Update Expense") and show `isPending` loading state.

#### Scenario: Type selector defaults to SERVICE on new document
- **WHEN** a user opens the create drawer
- **THEN** the type selector SHALL default to "Service Expense" and show the service lines UI

#### Scenario: Switching type with existing lines shows confirm dialog
- **WHEN** a user has entered service lines and then switches to "Inventory Receipt"
- **THEN** a modal.confirm SHALL appear with text indicating lines will be cleared; clicking "Continue" clears the lines and switches the form; clicking "Cancel" keeps the current type and lines intact

#### Scenario: Switching type with no existing lines
- **WHEN** a user switches type and no lines have been entered yet
- **THEN** the form SHALL switch immediately without showing a confirm dialog

#### Scenario: Type selector locked when editing
- **WHEN** a user opens the edit drawer for an existing document
- **THEN** the type selector SHALL be disabled and show the document's type

#### Scenario: Service lines UI — single grouped item select
- **WHEN** a user is in SERVICE mode and clicks a line's item field
- **THEN** the item SHALL use a single Ant Design Select with options grouped by ExpenseCategory (optGroups), searchable; there is no separate category step

#### Scenario: Inventory lines UI — single grouped product select
- **WHEN** a user is in INVENTORY or INVENTORY_ADJUSTMENT mode and clicks a line's product field
- **THEN** the product SHALL use a single Ant Design Select with options grouped by ProductCategory (optGroups), searchable

#### Scenario: INVENTORY_ADJUSTMENT UI — allows negative quantities
- **WHEN** a user is in INVENTORY_ADJUSTMENT mode
- **THEN** the quantity InputNumber SHALL allow negative values; signed line totals SHALL display with their sign

#### Scenario: Keyboard flow in multi-row editor
- **WHEN** a user is entering lines in SERVICE or INVENTORY mode
- **THEN** Tab order SHALL be: Item (or Product) → Quantity → Unit Price → Item of the next row; pressing Enter in the last field of the last row SHALL add a new row and focus the first field; pressing Backspace in an empty quantity field of a non-final row SHALL remove that row and focus the previous row

#### Scenario: Inventory line total shows rounding formula when quantity is fractional
- **WHEN** an INVENTORY line has a fractional quantity (e.g. 100.333 × 5,000)
- **THEN** the Line Total cell SHALL display the formula `100.333 × 5,000 = 501,665 VND` alongside the computed total

#### Scenario: Document total displayed in drawer footer
- **WHEN** line amounts or quantities/unit prices change in the drawer
- **THEN** a footer total SHALL update reactively to show the sum of all lines

#### Scenario: Edit existing document — form pre-fills correctly
- **WHEN** a user opens the edit drawer for an existing document
- **THEN** all header fields SHALL be pre-filled, the type selector SHALL be locked, and all existing lines SHALL be pre-populated

#### Scenario: accountingMonth hint text changes by type
- **WHEN** the drawer is in SERVICE mode with a recurring item selected
- **THEN** helper text SHALL read "Usually the month of consumption (e.g. an October electricity bill received in November should use October)"
- **WHEN** the drawer is in INVENTORY or INVENTORY_ADJUSTMENT mode
- **THEN** helper text SHALL read "Expense recognition month (usually the month goods were received)"

#### Scenario: accountingMonth differs from current month — UI warning
- **WHEN** the user sets an `accountingMonth` that is not the current calendar month
- **THEN** the drawer SHALL display an inline informational note indicating the document will be attributed to the stated period

### Requirement: Expense document list page with type badge, filters, and actions
The list page SHALL display expense documents in a table with columns: Document Date, Accounting Month, Type badge (SERVICE / INVENTORY / INVENTORY_ADJUSTMENT), Vendor, Lines, Total (PriceDisplay), Actions (Edit, Duplicate, Delete with confirm). Filters: type (All / Service / Inventory / Inventory Adjustment), Accounting Month range, Category. Default sort: documentDate descending.

#### Scenario: User opens expense list page
- **WHEN** an authorised user navigates to the expenses page
- **THEN** the system SHALL display a paginated table of active documents with a "New Expense" button and a "Recurring Bills" panel

#### Scenario: User filters by Accounting Month
- **WHEN** a user selects an accounting month range
- **THEN** the table SHALL show only documents attributed to those months

#### Scenario: User duplicates a document
- **WHEN** a user clicks the Duplicate icon on a row
- **THEN** the create drawer SHALL open pre-filled from the selected document with `accountingMonth = current month` and `documentDate = today`

#### Scenario: User deletes an INVENTORY document — stock insufficient
- **WHEN** a user clicks Delete on an INVENTORY document row and confirms, but the stock-integrity check fails
- **THEN** the system SHALL show an error modal listing each insufficient product with current qty and shortfall, and a "Create adjustment document" primary action that opens the drawer pre-filled with INVENTORY_ADJUSTMENT lines for the shortfall

#### Scenario: User deletes a SERVICE document
- **WHEN** a user clicks Delete on a SERVICE document row and confirms
- **THEN** the system SHALL soft-delete the document, show a success toast, and remove the row from the table

#### Scenario: User deletes an INVENTORY_ADJUSTMENT document
- **WHEN** a user clicks Delete on an INVENTORY_ADJUSTMENT document row
- **THEN** the system SHALL return 409 ADJUSTMENT_IMMUTABLE and the UI SHALL show an error explaining that adjustments cannot be deleted — a new opposite adjustment must be created

### Requirement: Recurring Bills panel surfaces monthly fixed bills
The expenses page SHALL display a "Recurring Bills This Month" section (above the document list, visible only to users with `EXPENSES_CREATE` permission) listing all active `ExpenseItem` records with `isRecurring=true`. Each row shows: item name, default vendor (if set), default amount (if set, formatted with PriceDisplay; otherwise "—"), and a status badge.

#### Scenario: Recurring bill not yet recorded this month
- **WHEN** no active SERVICE document with a line for the item exists for the current accounting month
- **THEN** the item's status SHALL be "Not recorded yet" and the "Quick record" action SHALL be available

#### Scenario: Recurring bill already recorded this month
- **WHEN** at least one active SERVICE document with a line referencing the item exists for the current accounting month
- **THEN** the item's status SHALL be "Recorded" and the "Quick record" action SHALL be disabled or hidden

#### Scenario: Quick record action pre-fills the drawer
- **WHEN** a user clicks "Quick record" for a recurring item
- **THEN** the create drawer SHALL open pre-filled with: `type=SERVICE`, `accountingMonth=current month`, `documentDate=today`, `vendorName=item.defaultVendor` (if set), `paymentMethodId=item.defaultPaymentMethodId` (if set), one service line with `expenseItemId` and `amount=item.defaultAmount` (empty if null)
