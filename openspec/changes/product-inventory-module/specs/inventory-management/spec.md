## ADDED Requirements

### Requirement: Inventory list displays current stock with low-stock badge
The inventory management page SHALL display one row per active Product joined with its Inventory record. Columns: product name, SKU, category, unit, current quantity, reorder level, last stocktake date (or "—"), and action buttons. A red badge SHALL appear on rows where `quantity < reorderLevel`. Rows with `reorderLevel = 0` SHALL never show the badge (0 means "no alert").

#### Scenario: Display stock levels
- **WHEN** an authorised user navigates to the inventory page
- **THEN** the system SHALL display all active products with their current quantity and reorder level

#### Scenario: Low-stock badge appears
- **WHEN** a product has `quantity < reorderLevel` and `reorderLevel > 0`
- **THEN** the row SHALL display a red "Low Stock" badge next to the quantity

#### Scenario: No badge when reorderLevel is zero
- **WHEN** a product has `reorderLevel = 0`
- **THEN** no low-stock badge SHALL appear regardless of current quantity

#### Scenario: Filter by low-stock
- **WHEN** a user enables the "Low Stock Only" filter
- **THEN** the list SHALL show only products where `quantity < reorderLevel` and `reorderLevel > 0`

#### Scenario: Filter by category
- **WHEN** a user selects a category from the filter dropdown
- **THEN** the list SHALL update to show only products in that category

#### Scenario: Search by name or SKU
- **WHEN** a user types in the search field
- **THEN** the list SHALL filter to products whose name or SKU contains the search string (case-insensitive)

### Requirement: Staff can update a product's reorder level from the inventory page
Each inventory row SHALL have an inline edit action for the reorder level. Saving the new value updates `Inventory.reorderLevel` via a PATCH request.

#### Scenario: Edit reorder level
- **WHEN** a user clicks the reorder level value, enters a new non-negative integer, and saves
- **THEN** the system SHALL update `Inventory.reorderLevel` and return HTTP 200; the row SHALL reflect the new value immediately

#### Scenario: Set reorder level to zero
- **WHEN** a user sets reorderLevel to 0
- **THEN** the system SHALL persist it; no low-stock badge SHALL appear for that product

#### Scenario: Submit negative reorder level
- **WHEN** a user submits a reorderLevel < 0
- **THEN** the system SHALL return HTTP 400 and the UI SHALL show a validation error

### Requirement: Staff can record manual stock IN, OUT, and ADJUST movements
Each inventory row SHALL have an action button that opens a movement modal. The modal SHALL let the user choose movement type (IN / OUT / ADJUST), enter a quantity, select a reason (PURCHASE for IN; MANUAL for OUT; MANUAL for ADJUST), and optionally add a note. Submitting creates an immutable `StockMovement` row and atomically updates `Inventory.quantity` in the same transaction.

#### Scenario: Record a stock IN (e.g. goods received)
- **WHEN** a user submits a movement with type=IN, quantity=50, reason=PURCHASE
- **THEN** the system SHALL create a StockMovement with quantity=+50 and increment `Inventory.quantity` by 50 in the same transaction

#### Scenario: Record a stock OUT within available quantity
- **WHEN** a user submits a movement with type=OUT, quantity=10, and current stock is 25
- **THEN** the system SHALL create a StockMovement with quantity=-10 and decrement `Inventory.quantity` by 10 in the same transaction; resulting quantity = 15

#### Scenario: Record a stock OUT exceeding available quantity
- **WHEN** a user submits a movement with type=OUT, quantity=30, and current stock is 25
- **THEN** the system SHALL return HTTP 409 with code `INSUFFICIENT_STOCK` and the UI SHALL display an error message; no movement is created

#### Scenario: Record a stock ADJUST to a negative quantity
- **WHEN** a user submits a movement with type=ADJUST, signed quantity=-30, and current stock is 10 (result would be -20)
- **THEN** the system SHALL accept the ADJUST movement, create StockMovement with quantity=-30, and update Inventory.quantity to -20 (ADJUST reason bypasses the non-negative guard)

#### Scenario: Record a movement with quantity zero
- **WHEN** a user submits a movement with quantity=0
- **THEN** the system SHALL return HTTP 400 indicating quantity must be non-zero

#### Scenario: Movement modal shows current stock
- **WHEN** the movement modal opens for a product
- **THEN** it SHALL display the product name and current quantity so the user can make an informed decision

### Requirement: Movement history drawer shows the full ledger for a product
Each inventory row SHALL have a "View History" action that opens a drawer listing all `StockMovement` records for that product, ordered by `occurredAt` descending. Each row shows: date/time, type badge (IN/OUT/ADJUST), quantity (signed, green for positive, red for negative), reason, reference (refType + refId if present), note, and created-by user name.

#### Scenario: View movement history
- **WHEN** a user opens the history drawer for a product
- **THEN** the system SHALL display all movements for that product, newest first, with pagination

#### Scenario: History shows booking-service references
- **WHEN** a movement has `reason=BOOKING_SERVICE` and `refId` set
- **THEN** the row SHALL display the reason label and the refId so staff can trace it back to the booking

#### Scenario: Empty history
- **WHEN** a product has no StockMovement records yet
- **THEN** the drawer SHALL display an empty state message

### Requirement: Inventory quantity is always maintained atomically with movement creation
The system SHALL enforce that every change to `Inventory.quantity` occurs inside a `prisma.$transaction` alongside the corresponding `StockMovement` insert. No code path SHALL update `Inventory.quantity` without also creating a movement, or create a movement without also updating the cache.

#### Scenario: Movement creation and cache update are atomic
- **WHEN** a movement is submitted and the database transaction succeeds
- **THEN** both the StockMovement row and the updated Inventory.quantity SHALL be visible to subsequent reads; neither can exist without the other

#### Scenario: Transaction failure rolls back both writes
- **WHEN** a database error occurs mid-transaction
- **THEN** neither the StockMovement row nor the Inventory quantity change SHALL be persisted
