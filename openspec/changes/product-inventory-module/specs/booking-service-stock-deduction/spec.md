## ADDED Requirements

### Requirement: ServiceItem may optionally link to a Product
A `ServiceItem` SHALL have an optional `linkedProductId` field (FK → Product, unique). When set, creating a BookingService for that ServiceItem will automatically trigger a stock deduction. The link is managed from the ServiceItem edit form in master data. Removing the link from a ServiceItem does NOT create any reversal movement — it only stops future deductions.

#### Scenario: Link a product to a ServiceItem
- **WHEN** an admin sets `linkedProductId` on a ServiceItem and saves
- **THEN** the system SHALL persist the link; subsequent BookingService creations for this item will trigger stock deductions

#### Scenario: ServiceItem with no linked product
- **WHEN** a ServiceItem has no `linkedProductId`
- **THEN** creating BookingServices for it SHALL have no effect on any inventory record

#### Scenario: Attempt to link a product already linked to another ServiceItem
- **WHEN** an admin selects a product that is already linked to a different ServiceItem
- **THEN** the system SHALL return HTTP 409 with code `PRODUCT_ALREADY_LINKED` and the UI SHALL set a form field error

### Requirement: Creating a BookingService auto-deducts stock when the ServiceItem has a linked product
When `POST /api/bookings/[id]/services` is called and the ServiceItem has a `linkedProductId`, the system SHALL create a `StockMovement(type=OUT, reason=BOOKING_SERVICE, quantity=-(bookingService.quantity), refType='BOOKING_SERVICE', refId=bookingServiceId, createdById=requestingUserId)` and decrement `Inventory.quantity` in the same `prisma.$transaction` as the BookingService record creation. If stock would go below zero, the entire transaction SHALL be rolled back and HTTP 409 returned.

#### Scenario: Create BookingService — sufficient stock
- **WHEN** a user adds a service with quantity=2 to a booking, and the linked product has quantity=10
- **THEN** the system SHALL create the BookingService, create a StockMovement(OUT, qty=-2, reason=BOOKING_SERVICE), and set Inventory.quantity=8, all in one transaction

#### Scenario: Create BookingService — insufficient stock
- **WHEN** a user adds a service with quantity=5 to a booking, and the linked product has quantity=3
- **THEN** the system SHALL return HTTP 409 with code `INSUFFICIENT_STOCK` and not persist the BookingService or any movement

#### Scenario: Create BookingService — ServiceItem has no linked product
- **WHEN** a user adds a service whose ServiceItem has no linkedProductId
- **THEN** the system SHALL create the BookingService normally with no stock movement created

#### Scenario: BookingService form shows current stock count for linked products
- **WHEN** a user selects a ServiceItem that has a linked product in the booking service form
- **THEN** the UI SHALL display the current stock count of the linked product near the quantity input so the user can see available stock before submitting

### Requirement: Deleting a BookingService creates a reversing stock movement
When `DELETE /api/bookings/[id]/services/[sid]` is called and the BookingService's ServiceItem has a `linkedProductId`, the system SHALL create a reversing `StockMovement(type=IN, reason=BOOKING_SERVICE, quantity=+bookingService.quantity, refType='BOOKING_SERVICE', refId=bookingServiceId, note='Reversing: BookingService deleted', createdById=requestingUserId)` and increment `Inventory.quantity` in the same `prisma.$transaction` as the BookingService deletion. The original OUT movement SHALL remain untouched in the ledger.

#### Scenario: Delete BookingService with linked product
- **WHEN** a user removes a service (quantity=2) from a booking, and Inventory.quantity is currently 8
- **THEN** the system SHALL soft-delete (or delete) the BookingService, create a reversing StockMovement(IN, qty=+2, reason=BOOKING_SERVICE), and set Inventory.quantity=10 in one transaction

#### Scenario: Delete BookingService — ServiceItem no longer has a linked product
- **WHEN** the ServiceItem's linkedProductId was removed after the BookingService was created
- **THEN** the system SHALL delete the BookingService with no stock movement (there is no current link to reverse against)

### Requirement: Editing a BookingService quantity creates a delta stock movement
When `PUT /api/bookings/[id]/services/[sid]` changes the `quantity` field and the ServiceItem has a `linkedProductId`, the system SHALL compute the delta (`newQty - oldQty`), create a `StockMovement` with `quantity = -delta` (negative if quantity increased, positive if decreased) and apply the delta to `Inventory.quantity` in the same transaction. If the delta would push stock below zero, return HTTP 409 and rollback. Existing movements are NOT modified.

#### Scenario: Increase BookingService quantity — sufficient stock
- **WHEN** a user changes a service quantity from 2 to 5, and current Inventory.quantity = 8
- **THEN** the system SHALL create a StockMovement(OUT, qty=-3, reason=BOOKING_SERVICE) and set Inventory.quantity=5

#### Scenario: Increase BookingService quantity — insufficient stock
- **WHEN** a user changes a service quantity from 2 to 20, and current Inventory.quantity = 8
- **THEN** the system SHALL return HTTP 409 with code `INSUFFICIENT_STOCK` and not update the BookingService or any inventory record

#### Scenario: Decrease BookingService quantity
- **WHEN** a user changes a service quantity from 5 to 2, and current Inventory.quantity = 3
- **THEN** the system SHALL create a StockMovement(IN, qty=+3, reason=BOOKING_SERVICE, note='Quantity reduced') and set Inventory.quantity=6

#### Scenario: Edit BookingService non-quantity fields only
- **WHEN** a user updates a BookingService but does not change the quantity
- **THEN** no StockMovement SHALL be created and Inventory.quantity SHALL remain unchanged

### Requirement: Stock deduction failures are surfaced clearly in the booking UI
When a booking service action (create or edit) is rejected due to insufficient stock, the UI SHALL display the `INSUFFICIENT_STOCK` error as a visible error message near the quantity input, not just a generic toast. The user SHALL see the current available stock count so they know by how much to reduce the quantity.

#### Scenario: Insufficient stock error in booking service form
- **WHEN** a user submits a quantity that would push stock below zero and the server returns 409 INSUFFICIENT_STOCK
- **THEN** the form SHALL display an inline error on the quantity field showing the available stock count (e.g. "Only 3 in stock")
- **THEN** the form SHALL remain open so the user can adjust the quantity

#### Scenario: Stock count shown in real-time during entry
- **WHEN** a user selects a ServiceItem with a linked product in the booking form
- **THEN** the UI SHALL display the current stock quantity adjacent to the quantity input as a hint (e.g. "Available: 12 bottles")
