## 1. Database Schema

- [x] 1.1 Add `ProductCategory` model to `prisma/schema.prisma` (id, name @unique, isActive, createdAt, updatedAt; one-to-many Product)
- [x] 1.2 Add `StockMovementType` enum (IN, OUT, ADJUST) to `prisma/schema.prisma`
- [x] 1.3 Add `StockMovementReason` enum (PURCHASE, BOOKING_SERVICE, HOUSEKEEPING, MANUAL, STOCKTAKE) to `prisma/schema.prisma`
- [x] 1.4 Add `Product` model (id, name, sku String? @unique, unit, categoryId FK? → ProductCategory, linkedServiceItemId String? @unique, isActive, createdAt, updatedAt; @@index on categoryId, isActive)
- [x] 1.5 Add `Inventory` model (id, productId String @unique FK → Product, quantity Int @default(0), reorderLevel Int @default(0), lastStocktakeAt DateTime?, createdAt, updatedAt; @@index on quantity)
- [x] 1.6 Add `StockMovement` model (id, productId FK → Product, type StockMovementType, quantity Int, reason StockMovementReason, refType String?, refId String?, note String?, occurredAt DateTime @default(now()), createdById FK → User; @@index on [productId, occurredAt]; @@index on [refType, refId])
- [x] 1.7 Add `linkedProductId String? @unique` column and `linkedProduct Product? @relation(...)` back-relation to existing `ServiceItem` model in schema
- [x] 1.8 Add back-relations to `Product` (`inventory Inventory?`, `movements StockMovement[]`, `linkedServiceItem ServiceItem?`)
- [x] 1.9 Add back-relation to `User` (`stockMovements StockMovement[]`)
- [ ] 1.10 Run `npm run db:generate` to regenerate Prisma client
- [ ] 1.11 Run `npm run db:migrate` to create the migration

## 2. Seed Data

- [x] 2.1 Add `ProductCategory` upserts to `prisma/seed.ts` (Amenities, F&B, Linen, Cleaning Supplies, Maintenance) — upsert by name, no duplicates

## 3. Permissions & Navigation

- [x] 3.1 Add `PRODUCTS_VIEW`, `PRODUCTS_MANAGE` to `common/constants/permissions.ts`; grant both to ADMIN and MANAGER in `ROLE_PERMISSIONS`
- [x] 3.2 Add `INVENTORY_VIEW` to `common/constants/permissions.ts`; grant to ADMIN, MANAGER, and RECEPTIONIST
- [x] 3.3 Add `INVENTORY_MANAGE` to `common/constants/permissions.ts`; grant to ADMIN and MANAGER
- [x] 3.4 Add `/master-data/products` navigation entry in `configs/navigation.config.ts` (ADMIN only, under master-data group)
- [x] 3.5 Add `/inventory` navigation entry in `configs/navigation.config.ts` (MANAGER/ADMIN/RECEPTIONIST, main nav)
- [x] 3.6 Add route constants for `/master-data/products`, `/master-data/product-categories`, and `/inventory` to `common/constants/routes.ts`

## 4. i18n Strings

- [x] 4.1 Add product and inventory keys to `messages/en.json`: page titles, form labels (name, sku, unit, category, linked service, reorder level), column headers (quantity, reorder level, last stocktake), movement type labels (IN/OUT/ADJUST), reason labels, badge labels ("Low Stock"), modal titles ("Record Stock IN/OUT/ADJUST"), toast messages, empty states, booking-service stock hint ("Available: {n} {unit}"), insufficient-stock inline error ("Only {n} {unit} available")
- [x] 4.2 Mirror all keys to `messages/vi.json` with Vietnamese translations

## 5. ProductCategory API

- [x] 5.1 Create `app/api/master/product-categories/route.ts` — GET (list, optional `isActive` filter) and POST (create; conflict codes `PRODUCT_CATEGORY_INACTIVE_EXISTS` / `PRODUCT_CATEGORY_NAME_TAKEN`)
- [x] 5.2 Create `app/api/master/product-categories/[id]/route.ts` — PUT (update / reactivate) and DELETE (soft-delete; block hard-delete if any Product references this category → 409)
- [x] 5.3 Add `productCategories` to `common/services/masterDataService.ts`

## 6. Product API

- [x] 6.1 Create `app/api/master/products/route.ts` — GET (list; filters: `categoryId`, `isActive`) and POST (create Product + auto-create Inventory in `prisma.$transaction`; validate unique SKU → `PRODUCT_SKU_TAKEN` / `PRODUCT_SKU_INACTIVE_EXISTS`; validate `linkedServiceItemId` uniqueness → `SERVICE_ITEM_ALREADY_LINKED`)
- [x] 6.2 Create `app/api/master/products/[id]/route.ts` — GET (with Inventory join) and PUT (update; revalidate SKU + linkedServiceItemId uniqueness) and DELETE (soft-delete product; preserve Inventory and movements)
- [x] 6.3 Add `products` to `common/services/masterDataService.ts` or create `common/services/productService.ts`

## 7. Inventory API

- [x] 7.1 Create `app/api/inventory/route.ts` — GET (list: JOIN Product + Inventory; filters: `categoryId`, `lowStock` boolean, `search` name/sku partial; include `product.name`, `product.sku`, `product.unit`, `product.category.name`, `inventory.quantity`, `inventory.reorderLevel`)
- [x] 7.2 Create `app/api/inventory/[productId]/reorder-level/route.ts` — PATCH (`{ reorderLevel: number }`; validate ≥ 0; update Inventory row)
- [x] 7.3 Create `app/api/inventory/[productId]/movements/route.ts` — GET (paginated movement history for product, ordered `occurredAt DESC`; include `createdBy.name`; filters: `type`, `reason`) and POST (create manual movement; validate `quantity ≠ 0`; for OUT check stock ≥ abs(quantity) unless reason=ADJUST; execute `prisma.$transaction([createMovement, updateInventory])`; return created movement)
- [x] 7.4 Create `common/services/inventoryService.ts` with `getInventoryList`, `getProductMovements`, `createMovement`, `updateReorderLevel`

## 8. ServiceItem API Update

- [x] 8.1 Update `app/api/master/service-items/route.ts` POST handler to accept optional `linkedProductId`; validate uniqueness → `PRODUCT_ALREADY_LINKED`
- [x] 8.2 Update `app/api/master/service-items/[id]/route.ts` PUT handler to accept `linkedProductId` changes; revalidate uniqueness
- [x] 8.3 Update `masterDataService.ts` ServiceItem service methods to include `linkedProductId` and `linkedProduct { id, name, inventory { quantity, reorderLevel } }` in responses

## 9. BookingService API Update (stock deduction)

- [x] 9.1 Update `app/api/bookings/[id]/services/route.ts` POST handler: after resolving the ServiceItem, if `serviceItem.linkedProductId` is set — wrap BookingService creation + StockMovement(OUT) + Inventory decrement in `prisma.$transaction`; if quantity check fails throw 409 `INSUFFICIENT_STOCK`
- [x] 9.2 Update `app/api/bookings/[id]/services/[sid]/route.ts` DELETE handler: if ServiceItem still has `linkedProductId` — wrap deletion + reversing StockMovement(IN) + Inventory increment in `prisma.$transaction`
- [x] 9.3 Update `app/api/bookings/[id]/services/[sid]/route.ts` PUT handler: if ServiceItem has `linkedProductId` and quantity changed — compute delta, check stock if delta < 0, create delta StockMovement + update Inventory in `prisma.$transaction`
- [x] 9.4 Update `common/services/bookingService.ts` (or equivalent) to handle `INSUFFICIENT_STOCK` ApiError code at the call site

## 10. ProductCategory Master Data UI

- [x] 10.1 Create `MasterDataConfig<ProductCategory>` config with columns (name, isActive) and `ProductCategoryForm` component (name TextField only)
- [x] 10.2 Create `app/[locale]/(main)/master-data/product-categories/page.tsx` — "use client"; passes config to `MasterDataTable`
- [x] 10.3 Add product-categories entry to master-data navigation (ADMIN only)

## 11. Product Master Data UI

- [x] 11.1 Create `MasterDataConfig<Product>` config with columns (name, SKU, unit, category, linked service, isActive)
- [x] 11.2 Create `ProductForm` component — name TextField, SKU TextField (optional), unit TextField, category SelectField (from `useProductCategories`), Linked Service SelectField (optional; loads active ServiceItems; shows current stock if link already set)
- [x] 11.3 Create `app/[locale]/(main)/master-data/products/page.tsx` — "use client"; passes config to `MasterDataTable`

## 12. ServiceItem Form Update

- [x] 12.1 Add "Linked Product" optional SelectField to existing `ServiceItemForm` component (loads active Products; shows unit; clears on deselect)
- [x] 12.2 Handle `PRODUCT_ALREADY_LINKED` conflict code in the ServiceItem create/edit mutation — set form field error on the linkedProduct field

## 13. Inventory Module — Hooks

- [x] 13.1 Create `modules/inventory/hooks/useInventoryList.ts` — `useQuery(["inventory", filters])` for the inventory list; accepts `{ categoryId, lowStock, search }` filter params
- [x] 13.2 Create `modules/inventory/hooks/useProductMovements.ts` — `useQuery(["movements", productId, page])` paginated movement history per product
- [x] 13.3 Create `modules/inventory/hooks/useStockMovementMutation.ts` — `useMutation` for creating a movement; invalidates `["inventory"]` and `["movements", productId]` on success; exposes `INSUFFICIENT_STOCK` error code to caller
- [x] 13.4 Create `modules/inventory/hooks/useReorderLevelMutation.ts` — `useMutation` for PATCH reorderLevel; invalidates `["inventory"]` on success

## 14. Inventory Module — UI Components

- [x] 14.1 Create `modules/inventory/components/InventoryFilters.tsx` — Category Select, Low-Stock-Only Toggle, Name/SKU search input, clear button; controlled by parent page state
- [x] 14.2 Create `modules/inventory/components/LowStockBadge.tsx` — red Ant Design Tag "Low Stock"; rendered only when `quantity < reorderLevel && reorderLevel > 0`
- [x] 14.3 Create `modules/inventory/components/ReorderLevelCell.tsx` — inline editable cell; click to edit, confirm/cancel; calls `useReorderLevelMutation`; shows loading on save; validation: non-negative integer
- [x] 14.4 Create `modules/inventory/components/StockMovementModal.tsx` — Ant Design Modal (not drawer, simpler) for recording a movement; fields: type Segmented (IN / OUT / ADJUST), quantity InputNumber (> 0; labeled "Quantity to add/remove"), reason Select (options filtered by type: PURCHASE for IN; MANUAL for OUT/ADJUST), note TextField (optional); shows product name + current stock; on submit calls `useStockMovementMutation`; shows `INSUFFICIENT_STOCK` inline error; mode-aware title ("Record Stock IN / OUT / Adjust")
- [x] 14.5 Create `modules/inventory/components/MovementHistoryDrawer.tsx` — AppDrawer showing paginated `StockMovement` list for a product; columns: date/time, type badge (green IN / red OUT / orange ADJUST), signed quantity, reason, reference (refType:refId if set), note, created-by; empty state; paginated via `useProductMovements`
- [x] 14.6 Create `modules/inventory/components/InventoryTable.tsx` — AppTable; columns: name, SKU, category, unit, quantity (with `LowStockBadge`), `ReorderLevelCell`, last stocktake; action column: "Record Movement" button (opens `StockMovementModal`), "History" button (opens `MovementHistoryDrawer`); wires filters to `useInventoryList`

## 15. Inventory Page

- [x] 15.1 Create `app/[locale]/(main)/inventory/page.tsx` — "use client"; composes AppPageHeader + InventoryFilters + InventoryTable; manages modal/drawer open state; guards with `usePermission(INVENTORY_VIEW)`; movement recording actions gated additionally by `INVENTORY_MANAGE`

## 16. Booking Service Form Update

- [x] 16.1 Update `BookingServiceForm` (or equivalent component in `modules/billing/` or `modules/reservations/`) to fetch and display current stock count when the selected ServiceItem has a `linkedProductId` — show hint text "Available: {quantity} {unit}" near the quantity input
- [x] 16.2 Handle `INSUFFICIENT_STOCK` ApiError in the BookingService create/update mutation call site — show inline error on the quantity field ("Only {n} {unit} available") rather than a generic toast; keep the form open
