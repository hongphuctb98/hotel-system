## Context

The hotel management system has no product catalog and no inventory tracking. The `ServiceItem` master-data table exists and is used to add chargeable services to bookings, but it has no concept of physical goods or stock levels. Staff currently manage supplies on paper or in separate spreadsheets with no integration into the PMS.

The existing codebase follows: thin pages → module components → React Query hooks → `common/services/` → API route handlers → Prisma. All master-data entities use `MasterDataTable<T>`. New work must fit this pattern.

## Goals / Non-Goals

**Goals:**
- `ProductCategory` + `Product` catalog CRUD (master-data pattern)
- `Inventory` 1:1 stock level record per Product, auto-created on Product create
- `StockMovement` immutable ledger; `Inventory.quantity` is a maintained cache
- Manual IN / OUT / ADJUST movements from the inventory management UI
- Low-stock badge when `quantity ≤ reorderLevel`; per-product movement history
- `ServiceItem.linkedProductId` — optional FK enabling automatic stock deduction on BookingService create/edit/delete
- Transactional integrity: movement insert + cache update always in the same `prisma.$transaction`

**Non-Goals:**
- Housekeeping auto-deduct (Housekeeping module not yet ready — deferred)
- Periodic stocktake / cycle-count workflow (separate future spec)
- Expense module integration (InventoryReceiptLine → auto stock IN) — separate future patch
- Multi-location / multi-warehouse stock
- Minimum-order-quantity, supplier management, or purchase-order workflow

## Decisions

### 1. StockMovement as an immutable append-only ledger; Inventory.quantity as a maintained cache

**Decision**: `StockMovement` rows are INSERT-only — never UPDATE or DELETE. `Inventory.quantity` holds the running total and is always updated atomically in the same `prisma.$transaction` as the new movement.

**Quantity is signed**: positive for IN and positive ADJUST, negative for OUT and negative ADJUST. This means `SUM(StockMovement.quantity)` for a given product always equals the current stock.

**Rationale**: An immutable ledger provides an unambiguous audit trail for every stock change. The cached `Inventory.quantity` avoids aggregating potentially thousands of movement rows on every list request. Recalculation from movements is always possible if the cache ever drifts (e.g. after a bug or migration).

**Alternative considered**: Storing only `Inventory.quantity` with no movement log. Rejected — no audit trail and no ability to investigate discrepancies.

**Prisma schema:**
```prisma
enum StockMovementType   { IN OUT ADJUST }
enum StockMovementReason { PURCHASE BOOKING_SERVICE HOUSEKEEPING MANUAL STOCKTAKE }

model ProductCategory {
  id        String    @id @default(cuid())
  name      String    @unique
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  products  Product[]
}

model Product {
  id                  String           @id @default(cuid())
  name                String
  sku                 String?          @unique   // null allowed; unique when set
  unit                String           // "piece", "bottle", "kg", "roll" — free text
  categoryId          String?
  linkedServiceItemId String?          @unique   // optional 1:1 with ServiceItem
  isActive            Boolean          @default(true)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  category            ProductCategory? @relation(fields: [categoryId], references: [id])
  linkedServiceItem   ServiceItem?     @relation(fields: [linkedServiceItemId], references: [id])
  inventory           Inventory?
  movements           StockMovement[]

  @@index([categoryId])
  @@index([isActive])
}

model Inventory {
  id              String    @id @default(cuid())
  productId       String    @unique           // enforces 1:1
  quantity        Int       @default(0)       // cache; always equals SUM(movements.quantity)
  reorderLevel    Int       @default(0)
  lastStocktakeAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  product         Product   @relation(fields: [productId], references: [id])

  @@index([quantity])  // supports low-stock filter: WHERE quantity <= reorderLevel
}

model StockMovement {
  id          String               @id @default(cuid())
  productId   String
  type        StockMovementType
  quantity    Int                  // signed: + for IN/positive ADJUST, - for OUT/negative ADJUST
  reason      StockMovementReason
  refType     String?              // e.g. "BOOKING_SERVICE"
  refId       String?              // e.g. bookingServiceId
  note        String?
  occurredAt  DateTime             @default(now())
  createdById String
  createdBy   User                 @relation(fields: [createdById], references: [id])
  product     Product              @relation(fields: [productId], references: [id])

  @@index([productId, occurredAt])
  @@index([refType, refId])       // fast lookup for reversing-entry queries
}
```

`ServiceItem` gains one new column:
```prisma
linkedProductId  String?  @unique  // optional 1:1; nullable
```

### 2. Race condition on concurrent stock updates

**Decision**: Use `prisma.$transaction` (default read-committed isolation) with Prisma's atomic `{ increment: N }` / `{ decrement: N }` operation for the cache update. For OUT movements, perform the check-then-update inside the same transaction using `SELECT ... FOR UPDATE` semantics via `findUnique` + manual validation before `update`.

**Concrete pattern for a stock OUT:**
```ts
await prisma.$transaction(async (tx) => {
  const inv = await tx.inventory.findUniqueOrThrow({
    where: { productId },
    // read-committed within transaction; row locked until tx commits in PG
  });
  const newQty = inv.quantity + signedQty; // signedQty is negative for OUT
  if (newQty < 0) throw new ApiError('INSUFFICIENT_STOCK', 409);
  await tx.stockMovement.create({ data: { ... } });
  await tx.inventory.update({
    where: { productId },
    data: { quantity: { increment: signedQty } },
  });
});
```

PostgreSQL's MVCC guarantees that within a transaction, the `findUniqueOrThrow` read followed by an `update` on the same row is serialised — no phantom write between the read and the update because the `UPDATE` statement acquires a row-level lock. Two concurrent OUT transactions will serialise: the second will see the updated quantity from the first.

**Rationale**: Prisma v7 with `@prisma/adapter-pg` runs in the Node.js pg driver; `prisma.$transaction` maps to a database transaction. PostgreSQL row-level locking on the `UPDATE` prevents lost updates without needing explicit `SELECT FOR UPDATE` syntax.

**Alternative considered**: Optimistic locking with a `version` field on `Inventory`. Rejected — adds schema complexity; PostgreSQL's implicit UPDATE locking is sufficient for this traffic pattern.

### 3. Auto-create Inventory row when Product is created

**Decision**: The `POST /api/master/products` handler creates both `Product` and `Inventory` in a single `prisma.$transaction`:
```ts
await prisma.$transaction(async (tx) => {
  const product = await tx.product.create({ data: { ...productData } });
  await tx.inventory.create({ data: { productId: product.id, quantity: 0, reorderLevel: 0 } });
  return product;
});
```

`Inventory` rows are never created, deleted, or directly exposed for manual management — they are managed exclusively by the system. The inventory management UI reads them but updates only via movements.

### 4. Reversing entries for BookingService edit/delete — never mutate existing movements

**Decision**: When a `BookingService` is created for a ServiceItem with `linkedProductId`, a `StockMovement(type=OUT, reason=BOOKING_SERVICE, quantity=-(service.quantity), refId=bookingServiceId)` is created. When the BookingService is later **deleted**, the system creates a new reversing `StockMovement(type=IN, reason=BOOKING_SERVICE, quantity=+service.quantity, note='Reversing: BookingService deleted', refId=bookingServiceId)`. When the BookingService **quantity is edited**, the system creates a delta movement for the difference only (e.g. if quantity changes from 3 to 5, create OUT qty=-2). Existing movements are NEVER updated or deleted.

**Rationale**: Preserving the original movement maintains a complete audit trail showing when goods were reserved for a booking and when/why adjustments were made. A reversing entry is standard accounting practice.

**Edge case — product deactivated after booking**: If the linked product is later soft-deleted, the reversal movement should still be created (it references `productId` directly, not the product's active status).

**Edge case — insufficient stock on BookingService create**: If the OUT movement would push `Inventory.quantity` below zero, the API returns HTTP 409 with code `INSUFFICIENT_STOCK`. The BookingService is not saved. The UI must surface this error clearly.

### 5. ServiceItem.linkedProductId is a 1:1 optional FK; managed from ServiceItem master-data form

**Decision**: `ServiceItem.linkedProductId` is `@unique` — one product can be linked to at most one ServiceItem. The link is optional. The ServiceItem edit form gains a "Linked Product" select field (optional). When a product is linked, the ServiceItem form shows an informational note: "Creating this service will deduct stock from [product name]."

**Rationale**: 1:1 enforced at DB level prevents accidental dual-linking. Managed from the ServiceItem form keeps the product catalog clean — products do not need to know which service they back.

### 6. ProductCategory as the 10th master-data entity

**Decision**: `ProductCategory` follows the standard `MasterDataTable<T>` pattern. Name-unique constraint with soft-delete conflict handling (`PRODUCT_CATEGORY_INACTIVE_EXISTS` / `PRODUCT_CATEGORY_NAME_TAKEN`). Block hard-delete if any `Product` references the category.

### 7. Inventory management page is separate from Product catalog page

**Decision**: `/master-data/products` is the ADMIN-gated catalog CRUD (create, edit, deactivate products and categories). `/inventory` is the MANAGER/RECEPTIONIST-accessible operations page — shows stock levels, IN/OUT/ADJUST modals, reorderLevel edit, movement history. Staff who cannot manage the product catalog can still record stock movements.

**Rationale**: Different audiences: master-data setup is admin work; daily stock operations are floor-staff work.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/master/product-categories` | List / create category |
| GET/PUT/DELETE | `/api/master/product-categories/[id]` | Update / soft-delete category |
| GET/POST | `/api/master/products` | List (with categoryId, isActive filters) / create (+ auto-create Inventory in tx) |
| GET/PUT/DELETE | `/api/master/products/[id]` | Get / update / soft-delete product |
| GET | `/api/inventory` | List Inventory join Product; filters: categoryId, lowStock (qty ≤ reorderLevel), search name/sku |
| PATCH | `/api/inventory/[productId]/reorder-level` | Update reorderLevel on Inventory row |
| GET | `/api/inventory/[productId]/movements` | Paginated movement history for a product |
| POST | `/api/inventory/[productId]/movements` | Create manual movement (IN / OUT / ADJUST) in transaction with cache update |

BookingService routes (existing, modified):
| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/bookings/[id]/services` | If linked product: create OUT movement + update cache in same tx; error 409 if insufficient stock |
| DELETE | `/api/bookings/[id]/services/[sid]` | If linked product: create reversing IN movement + update cache in same tx |
| PUT | `/api/bookings/[id]/services/[sid]` | If linked product and quantity changed: create delta movement + update cache in same tx |

## Transaction Boundaries

Every operation that changes `Inventory.quantity` MUST execute inside a `prisma.$transaction`:

1. **Product create**: create Product + create Inventory(qty=0)
2. **Manual movement (IN/OUT/ADJUST)**: check stock (for OUT), create StockMovement, `inventory.update({ quantity: { increment: signedQty } })`
3. **BookingService create**: create BookingService + create StockMovement(OUT) + update Inventory — or rollback entirely if insufficient stock
4. **BookingService delete**: create StockMovement(reversing IN) + update Inventory
5. **BookingService quantity edit**: compute delta, create StockMovement(delta) + update Inventory

## Risks / Trade-offs

- **Inventory cache drift** → The cache and the ledger can theoretically diverge only if a bug writes to one without the other. Mitigation: all writes are in `prisma.$transaction`; a repair script `SUM(movements.quantity)` can resync. A future Stocktake spec can provide a formal reconciliation flow.
- **Negative stock allowed for ADJUST reason** → Intentional: ADJUST movements (e.g. discovered discrepancy) may legitimately result in stock going to any value. Only `reason=OUT` (including BOOKING_SERVICE) enforces the `quantity ≥ 0` guard. This is by design for flexibility.
- **ServiceItem 1:1 product link blocks reuse** → A product can only be linked to one ServiceItem. If a hotel sells the same physical item under two service names, they need two Products. Accepted trade-off for simplicity.
- **Booking service insufficient-stock 409 surprises staff** → Mitigation: the BookingService form shows current stock count for the linked product in real-time (via a small indicator next to the quantity field). Staff know before submitting whether stock will be sufficient.
- **Soft-deleted products still have movements** → Movement rows reference `productId` directly; movements for deactivated products remain in the ledger. Summary queries should filter `product.isActive = true` by default but allow `isActive=false` for historical reporting.

## Migration Plan

1. Add `ProductCategory`, `Product`, `Inventory`, `StockMovement` models to `prisma/schema.prisma`
2. Add `ServiceItem.linkedProductId String? @unique` column to schema
3. Add back-relation `ServiceItem.linkedProduct Product?` and `Product.linkedServiceItem ServiceItem?`
4. Run `npm run db:generate` then `npm run db:migrate` — single additive migration
5. Seed default `ProductCategory` entries in `prisma/seed.ts`
6. Deploy API routes, then UI — fully additive; no existing data affected
7. Rollback: drop four new tables, remove the `linkedProductId` column from ServiceItem, remove migration record

## Open Questions

- Should `reorderLevel = 0` mean "never alert" or "alert when stock hits 0"? Proposed: `reorderLevel = 0` means no alert (badge appears only when `quantity < reorderLevel`, i.e. strictly negative). Staff set a meaningful reorder level (e.g. 10) to get alerts.
- Should the inventory list page show deactivated products' stock? Proposed: hide by default, with an "Include inactive" toggle.
