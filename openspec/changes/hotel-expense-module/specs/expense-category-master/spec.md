## ADDED Requirements

### Requirement: ExpenseCategory is a parent-group master-data entity
The system SHALL provide CRUD for `ExpenseCategory` following the existing master-data pattern: list, create, edit (name + description), soft-delete (isActive), and reactivation of soft-deleted records on name collision. A category is the top-level grouping (e.g. Utilities, Personnel). Categories are used to classify SERVICE expense lines and to group items in P&L reports. The `type` of an expense lives on the document, not on the category or item.

#### Scenario: Create expense category
- **WHEN** an admin submits a new category name that does not already exist (active or inactive)
- **THEN** the system SHALL persist it and return HTTP 201

#### Scenario: Create category with duplicate active name
- **WHEN** an admin submits a category name that matches an existing active category
- **THEN** the system SHALL return HTTP 409 with code `EXPENSE_CATEGORY_NAME_TAKEN` and the UI SHALL set a form field error

#### Scenario: Create category with duplicate inactive name
- **WHEN** an admin submits a category name matching a soft-deleted category
- **THEN** the system SHALL return HTTP 409 with code `EXPENSE_CATEGORY_INACTIVE_EXISTS` and payload `{ id }`
- **THEN** the UI SHALL show a confirm modal offering to reactivate the existing record

#### Scenario: Reactivate soft-deleted category
- **WHEN** the user confirms reactivation in the conflict modal
- **THEN** the UI SHALL call `PUT /api/master/expense-categories/[id]` with `{ isActive: true }` and show a success toast

### Requirement: ExpenseCategory cannot be hard-deleted if child items exist
The API SHALL block hard-delete of a category that has at least one `ExpenseItem` (active or inactive). Soft-deactivation SHALL always be permitted regardless of child items.

#### Scenario: Attempt to hard-delete category with child items
- **WHEN** an admin attempts to delete a category that has associated expense items
- **THEN** the system SHALL return HTTP 409 with a message indicating the category has child items and the UI SHALL display an error toast

#### Scenario: Soft-deactivate category with child items
- **WHEN** an admin deactivates a category via the active toggle
- **THEN** the system SHALL set `isActive = false` and return HTTP 200, regardless of child items

#### Scenario: Deactivating a category does not cascade to its items
- **WHEN** a category is soft-deactivated
- **THEN** its child `ExpenseItem` records SHALL retain their own `isActive` state unchanged

### Requirement: ExpenseItem is a child-level master-data entity used for SERVICE line classification
The system SHALL provide CRUD for `ExpenseItem` following the existing master-data pattern: list (optionally filtered by `categoryId`), create (requires parent `categoryId`), edit (name, description, parent category, recurring-bill fields), soft-delete, and reactivation on name + category collision. An item represents a specific cost classification used on SERVICE expense lines (e.g. Electricity, Plumbing Repair).

#### Scenario: Create expense item
- **WHEN** an admin submits a new item name with a valid active parent categoryId
- **THEN** the system SHALL persist it and return HTTP 201

#### Scenario: Create expense item with inactive parent category
- **WHEN** an admin submits an item with a categoryId that refers to a soft-deleted category
- **THEN** the system SHALL return HTTP 400 indicating the parent category is inactive

#### Scenario: Create item with duplicate name within same category
- **WHEN** an admin submits an item name that already exists (active) under the same category
- **THEN** the system SHALL return HTTP 409 with code `EXPENSE_ITEM_NAME_TAKEN` and the UI SHALL set a form field error

#### Scenario: Create item with duplicate name matching soft-deleted item in same category
- **WHEN** an admin submits an item name matching a soft-deleted item under the same category
- **THEN** the system SHALL return HTTP 409 with code `EXPENSE_ITEM_INACTIVE_EXISTS` and payload `{ id }`
- **THEN** the UI SHALL show a confirm modal offering to reactivate the existing record

#### Scenario: List items filtered by category
- **WHEN** the client requests expense items with a `categoryId` query param
- **THEN** the system SHALL return only items belonging to that category

#### Scenario: List items with no filter
- **WHEN** the client requests expense items with no query params
- **THEN** the system SHALL return all active items ordered by category name then item name

### Requirement: ExpenseItem supports recurring-bill metadata for quick monthly entry
`ExpenseItem` SHALL have four optional recurring-bill fields: `isRecurring Boolean @default(false)`, `defaultVendor String?`, `defaultAmount Int?` (VND; null means variable), and `defaultPaymentMethodId String?` (FK to `PaymentMethod`). These fields apply only to items used in SERVICE documents. Inventory goods are managed as `Product` records instead.

#### Scenario: Mark an expense item as recurring
- **WHEN** an admin sets `isRecurring = true` and optionally provides `defaultVendor`, `defaultAmount`, and `defaultPaymentMethodId`
- **THEN** the system SHALL persist all four fields and the item SHALL appear in the "Recurring Bills This Month" panel on the expenses page

#### Scenario: Mark an item recurring with no default amount (variable bill)
- **WHEN** an admin sets `isRecurring = true` and leaves `defaultAmount` null (e.g. Electricity whose amount varies)
- **THEN** the system SHALL persist the item as recurring; the recurring-bills panel SHALL show "—" for the default amount and the quick-record drawer SHALL leave the amount field empty for the user to fill in

#### Scenario: Recurring item with a default payment method
- **WHEN** `defaultPaymentMethodId` is set on a recurring item
- **THEN** the quick-record drawer SHALL pre-select that payment method in the Payment Method field

#### Scenario: Edit recurring-bill fields
- **WHEN** an admin updates `defaultAmount` on a recurring item
- **THEN** subsequent quick-record actions SHALL pre-fill the drawer with the new default amount

#### Scenario: Deactivate a recurring item
- **WHEN** an admin soft-deletes a recurring item
- **THEN** it SHALL no longer appear in the recurring-bills panel

### Requirement: ExpenseItem cannot be hard-deleted if referenced by any expense document line
The API SHALL block hard-delete of an item that is referenced by at least one `ServiceExpenseLine` (in any document, active or inactive). Soft-deactivation SHALL always be permitted.

#### Scenario: Attempt to hard-delete item referenced in service lines
- **WHEN** an admin attempts to delete an expense item that appears in any service document line
- **THEN** the system SHALL return HTTP 409 with a message indicating the item is in use and the UI SHALL display an error toast

#### Scenario: Soft-deactivate item with linked service lines
- **WHEN** an admin deactivates an item via the active toggle
- **THEN** the system SHALL set `isActive = false` and return HTTP 200

### Requirement: Default expense categories and items are seeded on first run
The system SHALL seed the following hierarchy with recurring-bill flags where applicable:

- **Utilities**: Electricity (`isRecurring=true`, `defaultAmount=null`), Water (`isRecurring=true`, `defaultAmount=500000`), Internet (`isRecurring=true`, `defaultAmount=700000`), Waste Collection
- **Personnel**: Monthly Salary, Bonus, Uniform, Staff Meal
- **Operations**: Amenities, F&B Supplies, Cleaning Chemicals
- **Maintenance**: AC Service, Elevator Maintenance, Plumbing Repair

Vendor and payment method defaults for recurring items are left null in the seed (to be configured by the hotel).

#### Scenario: Seed script runs on fresh database
- **WHEN** `npm run db:seed` executes on a database with no expense data
- **THEN** all four categories and their items SHALL be created; Electricity, Water, and Internet SHALL have `isRecurring = true`

#### Scenario: Seed script runs on already-seeded database
- **WHEN** `npm run db:seed` executes and default data already exists
- **THEN** the script SHALL upsert by name (no duplicates created) and existing custom entries SHALL be preserved

#### Scenario: Water and Internet show default amounts in recurring-bills panel
- **WHEN** a user opens the expenses page
- **THEN** Water SHALL display 500,000 VND and Internet SHALL display 700,000 VND as their default amounts; Electricity SHALL show "—"
