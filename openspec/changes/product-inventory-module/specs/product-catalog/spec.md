## ADDED Requirements

### Requirement: ProductCategory is a master-data entity managed via MasterDataTable
The system SHALL provide CRUD for `ProductCategory` following the existing master-data pattern: list, create, edit (name), soft-delete (isActive), and reactivation on name collision. Categories group products (e.g. Amenities, F&B, Linen, Cleaning).

#### Scenario: Create product category
- **WHEN** an admin submits a new category name that does not already exist (active or inactive)
- **THEN** the system SHALL persist it and return HTTP 201

#### Scenario: Create category with duplicate active name
- **WHEN** an admin submits a category name matching an existing active category
- **THEN** the system SHALL return HTTP 409 with code `PRODUCT_CATEGORY_NAME_TAKEN` and the UI SHALL set a form field error

#### Scenario: Create category with duplicate inactive name
- **WHEN** an admin submits a category name matching a soft-deleted category
- **THEN** the system SHALL return HTTP 409 with code `PRODUCT_CATEGORY_INACTIVE_EXISTS` and payload `{ id }`
- **THEN** the UI SHALL show a confirm modal offering to reactivate the existing record

#### Scenario: Attempt to hard-delete category with linked products
- **WHEN** an admin attempts to delete a category that has at least one Product referencing it
- **THEN** the system SHALL return HTTP 409 indicating the category is in use and the UI SHALL show an error toast

#### Scenario: Soft-deactivate category with linked products
- **WHEN** an admin deactivates a category
- **THEN** the system SHALL set `isActive = false` and return HTTP 200 regardless of linked products

### Requirement: Product catalog supports CRUD with optional category and SKU
The system SHALL provide CRUD for `Product` following the master-data pattern: list (with categoryId and isActive filters), create, edit, soft-delete, and reactivation on name+category collision. Each product has: name (required), SKU (optional, unique when set), unit (required free-text, e.g. "bottle", "piece", "kg"), optional categoryId, optional `linkedServiceItemId`.

#### Scenario: Create product with required fields only
- **WHEN** an admin submits a product with name and unit, no SKU or category
- **THEN** the system SHALL persist the product, auto-create an Inventory row with `quantity = 0` and `reorderLevel = 0` in the same transaction, and return HTTP 201

#### Scenario: Create product — Inventory row auto-created atomically
- **WHEN** a product is created successfully
- **THEN** an `Inventory` record for that product SHALL exist immediately with `quantity = 0` and `reorderLevel = 0`

#### Scenario: Create product with duplicate SKU
- **WHEN** an admin submits a product with a SKU that already exists on an active product
- **THEN** the system SHALL return HTTP 409 with code `PRODUCT_SKU_TAKEN` and the UI SHALL set a form field error on the SKU field

#### Scenario: Create product with SKU matching a soft-deleted product
- **WHEN** an admin submits a product with a SKU matching a soft-deleted product's SKU
- **THEN** the system SHALL return HTTP 409 with code `PRODUCT_SKU_INACTIVE_EXISTS` and payload `{ id }`
- **THEN** the UI SHALL show a confirm modal offering to reactivate the existing record

#### Scenario: Create product with no SKU alongside another product with no SKU
- **WHEN** multiple products have no SKU set (null)
- **THEN** the system SHALL allow all of them — the uniqueness constraint applies only when SKU is non-null

#### Scenario: Soft-delete product with existing inventory
- **WHEN** an admin deactivates a product
- **THEN** the system SHALL set `product.isActive = false` and return HTTP 200; the Inventory row and all StockMovement records SHALL be preserved unchanged

#### Scenario: Product list page shows category, SKU, and unit columns
- **WHEN** an admin views the product catalog page
- **THEN** the table SHALL show columns: name, SKU (or "—" if none), category (or "—"), unit, isActive status, and actions (Edit, Deactivate)

### Requirement: Product can be linked to a ServiceItem for automatic stock deduction
A Product may optionally link to exactly one `ServiceItem` via `linkedServiceItemId`. This link is set on the Product form. Only active ServiceItems may be selected. At most one Product may link to any given ServiceItem (enforced by `@unique` on `Product.linkedServiceItemId`).

#### Scenario: Create product with a linked ServiceItem
- **WHEN** an admin selects a valid active ServiceItem in the "Linked Service" field and saves
- **THEN** the system SHALL persist `linkedServiceItemId` on the Product

#### Scenario: Attempt to link a ServiceItem already linked to another product
- **WHEN** an admin selects a ServiceItem that is already linked to a different active product
- **THEN** the system SHALL return HTTP 409 with code `SERVICE_ITEM_ALREADY_LINKED` and the UI SHALL set a form field error

#### Scenario: Product without a linked ServiceItem
- **WHEN** a product has no `linkedServiceItemId`
- **THEN** creating BookingServices for any ServiceItem SHALL have no effect on this product's stock

### Requirement: Default product categories are seeded on first run
The system SHALL seed a default set of `ProductCategory` entries: Amenities, F&B, Linen, Cleaning Supplies, Maintenance.

#### Scenario: Seed script on fresh database
- **WHEN** `npm run db:seed` executes on a database with no product categories
- **THEN** the five default categories SHALL be created

#### Scenario: Seed script on already-seeded database
- **WHEN** `npm run db:seed` executes and default categories already exist
- **THEN** the script SHALL upsert by name (no duplicates, custom categories preserved)
