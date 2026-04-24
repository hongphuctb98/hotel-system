## Why

The hotel has no product catalog and no stock tracking: staff cannot see what supplies are available, cannot record when goods are received or consumed, and cannot be alerted when items run low. Adding a product + inventory module closes this gap by establishing a definitive catalog of items, a real-time stock count, and an immutable movement ledger — and by automatically decrementing stock when booking services that consume products are created.

## What Changes

- New **ProductCategory** master-data entity (catalog grouping: Amenities, F&B, Linen, etc.)
- New **Product** entity — item catalog (name, SKU, unit, optional category, optional link to an existing ServiceItem)
- New **Inventory** entity — 1:1 with Product; holds current quantity, reorder level, last stocktake timestamp. Auto-created with `quantity = 0` whenever a Product is created.
- New **StockMovement** immutable ledger — every stock change (IN / OUT / ADJUST) is recorded as an append-only row with type, reason, quantity, reference, and the user who created it. `Inventory.quantity` is a cached sum maintained atomically alongside each movement insert.
- New optional column `ServiceItem.linkedProductId FK → Product` — when set, creating a `BookingService` for that ServiceItem triggers an automatic stock OUT movement
- New API routes under `/api/master/product-categories`, `/api/master/products`, `/api/inventory`, `/api/inventory/[id]/movements`
- `/master-data/products` page — catalog CRUD via `MasterDataTable`
- `/inventory` page — stock management: list with low-stock badge, manual IN/OUT/ADJUST actions, reorder-level edit, per-product movement history drawer
- Booking service create/edit/delete gains transactional stock deduction and reversing-entry logic
- Permissions: `PRODUCTS_VIEW`, `PRODUCTS_MANAGE`, `INVENTORY_VIEW`, `INVENTORY_MANAGE`
- Navigation entries for Products (master-data) and Inventory (operational)
- i18n keys in `messages/en.json` and `messages/vi.json`

## Capabilities

### New Capabilities

- `product-catalog`: Product catalog CRUD and ProductCategory master-data CRUD. Creating a Product auto-creates its Inventory row. Products link optionally to an existing `ServiceItem` to enable automatic stock deduction during booking.
- `inventory-management`: Stock level tracking. Displays current quantity per product with a low-stock badge when `quantity ≤ reorderLevel`. Supports manual IN, OUT, and ADJUST movements with selectable reason codes. Staff can view the full movement history per product. Each movement atomically updates the cached `Inventory.quantity`.
- `booking-service-stock-deduction`: When a `BookingService` is created for a ServiceItem that has a `linkedProductId`, the system automatically inserts a `StockMovement(type=OUT, reason=BOOKING_SERVICE)` in the same transaction. Editing quantity or deleting the BookingService creates a correcting movement (reversing entry) — existing movements are never modified or deleted.

### Modified Capabilities

_(none — existing spec requirements are unchanged; booking-service integration is additive behaviour defined in the new `booking-service-stock-deduction` spec)_

## Impact

- **Database**: Four new models (`ProductCategory`, `Product`, `Inventory`, `StockMovement`); one new column on existing `ServiceItem` (`linkedProductId`); additive migration, no destructive changes to existing tables
- **API**: New route groups `/api/master/product-categories/`, `/api/master/products/`, `/api/inventory/`, `/api/inventory/[productId]/movements/`; existing `/api/master/service-items/` updated to expose `linkedProductId` field
- **Existing booking flow**: `POST /api/bookings/[id]/services` and `DELETE /api/bookings/[id]/services/[sid]` gain transactional stock movement logic — behaviour is additive when no product is linked, no change when ServiceItem has no `linkedProductId`
- **Modules**: New `modules/inventory/` directory; `modules/master-data/` gains product-catalog config; `modules/billing/` (BookingService form) gains linkedProduct stock feedback
- **Navigation**: Two new entries in `configs/navigation.config.ts`
- **Permissions**: Four new constants in `common/constants/permissions.ts`
- **i18n**: New keys in `messages/en.json` and `messages/vi.json`
- **Dependencies**: No new npm packages required
