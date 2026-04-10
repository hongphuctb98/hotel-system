## ADDED Requirements

### Requirement: Room Type Pricing settings page lists all active room types with editable pricing fields
The settings page at `/master-data/room-type-pricing` SHALL display a row for every active `RoomType`. Each row SHALL show the room type name and editable inputs for `nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, and `hourlyExtraPrice`. Rows without a saved pricing record SHALL display empty/zero inputs.

#### Scenario: Page loads with all active room types
- **WHEN** an ADMIN or MANAGER navigates to the room type pricing settings page
- **THEN** every active room type appears as a row, regardless of whether a `RoomTypePricing` record exists

#### Scenario: Row with no pricing record shows zero defaults
- **WHEN** a room type has no `RoomTypePricing` record
- **THEN** all five pricing fields show `0` as a placeholder, and saving creates the record

#### Scenario: Inactive room types are not shown
- **WHEN** a room type has `isActive = false`
- **THEN** it does not appear in the pricing settings table

### Requirement: Staff can save pricing defaults per room type
Clicking Save (or equivalent inline save) on a row SHALL upsert the `RoomTypePricing` record for that room type via `PUT /api/master/room-type-pricing/[roomTypeId]`. On success, a toast confirms the save. On failure, a toast shows the error.

#### Scenario: Save creates a new pricing record
- **WHEN** a room type has no pricing record and staff enters values and saves
- **THEN** a new `RoomTypePricing` row is created and the form retains the saved values

#### Scenario: Save updates an existing pricing record
- **WHEN** a room type already has a pricing record and staff changes `nightlyPrice` and saves
- **THEN** the `RoomTypePricing` row is updated with the new value; other fields are unchanged

#### Scenario: Save failure shows error toast
- **WHEN** the API returns an error during save
- **THEN** an error toast is shown and the form retains the user's unsaved input

### Requirement: Page is accessible only to ADMIN and MANAGER roles
The room type pricing page SHALL be guarded by `PERMISSIONS.MASTER_DATA_MANAGE`. Users without this permission SHALL not see the nav item and SHALL be redirected if they access the URL directly.

#### Scenario: RECEPTIONIST cannot access pricing settings
- **WHEN** a user with RECEPTIONIST role navigates to the pricing settings URL
- **THEN** they are redirected (permission denied)

#### Scenario: ADMIN can access and edit pricing
- **WHEN** an ADMIN user opens the pricing settings page
- **THEN** all rows are editable and save buttons are active

### Requirement: `GET /api/master/room-type-pricing` returns pricing records indexed by roomTypeId
The API endpoint SHALL return all `RoomTypePricing` records as an array (or map). Each record SHALL include `roomTypeId`, `nightlyPrice`, `dailyPrice`, `hourlyBlockHours`, `hourlyBlockPrice`, `hourlyExtraPrice`.

#### Scenario: Returns empty array when no pricing records exist
- **WHEN** no `RoomTypePricing` rows exist in the DB
- **THEN** `GET /api/master/room-type-pricing` returns `{ data: [] }`

#### Scenario: Returns all configured records
- **WHEN** 3 of 5 room types have pricing records
- **THEN** the response contains exactly 3 records

### Requirement: `PUT /api/master/room-type-pricing/[roomTypeId]` upserts the pricing record
The endpoint SHALL accept all five pricing fields (all optional; omitted fields are left unchanged for updates or default to null for creates). It SHALL return the full upserted record.

#### Scenario: Upsert creates record for room type with no pricing
- **WHEN** `PUT /api/master/room-type-pricing/[roomTypeId]` is called with `{ nightlyPrice: 500000 }` and no record exists
- **THEN** a new record is created with `nightlyPrice = 500000` and other fields null

#### Scenario: Upsert updates only provided fields
- **WHEN** `PUT /api/master/room-type-pricing/[roomTypeId]` is called with `{ dailyPrice: 300000 }` and a record already exists with `nightlyPrice = 500000`
- **THEN** `nightlyPrice` remains `500000` and `dailyPrice` is updated to `300000`
