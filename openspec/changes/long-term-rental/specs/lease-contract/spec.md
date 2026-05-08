## ADDED Requirements

### Requirement: Staff can create a long-term lease contract
The system SHALL allow staff with `LONG_TERM_CREATE` permission to create a `LeaseContract` linking an existing Room and Guest with a start date, optional end date, monthly rent, and deposit amount.

Fields:
- `roomId` (required) — must reference an active Room
- `guestId` (required) — must reference an active Guest (the primary tenant)
- `startDate` (required) — ISO date; the date the tenant takes possession
- `endDate` (optional) — ISO date; null means open-ended / indefinite
- `monthlyRent` (required) — VND integer > 0
- `depositAmount` (required) — VND integer ≥ 0
- `depositPaid` (boolean, default false) — whether deposit has been collected
- `paymentDueDay` (integer 1–28, default 10) — day of month bills are due
- `notes` (optional free text)

#### Scenario: Create a valid lease contract
- **WHEN** staff submits a valid lease form for a room with no active or upcoming lease
- **THEN** a `LeaseContract` is created with `status = PENDING` and `isActive = true`
- **AND** `writeAudit` is called with `action: CREATE, entityType: LEASE_CONTRACT`

#### Scenario: Room already has an active lease
- **WHEN** staff attempts to create a lease for a room that already has a `LeaseContract` with `status IN (PENDING, ACTIVE)`
- **THEN** the API returns HTTP 409 with error code `ROOM_HAS_ACTIVE_LEASE`
- **AND** no contract is created

#### Scenario: Room has a soft-deleted lease with the same unique key
- **WHEN** a previously terminated lease exists for the same room and the room is now available
- **THEN** a new contract MAY be created; the old terminated contract is unaffected

---

### Requirement: Staff can activate a lease contract
The system SHALL allow staff with `LONG_TERM_EDIT` permission to activate a `PENDING` lease by transitioning it to `ACTIVE`.

On activation:
1. Lease `status` becomes `ACTIVE`
2. Room `RoomStatus` is updated to the `RENTED_LONG_TERM` status record
3. Both changes are made inside a single Prisma transaction

#### Scenario: Activate a pending lease
- **WHEN** staff activates a `PENDING` lease
- **THEN** lease status becomes `ACTIVE`
- **AND** the room's `roomStatusId` is updated to the `RENTED_LONG_TERM` status
- **AND** `writeAudit` is called for both the lease and room updates

#### Scenario: Attempt to activate an already active lease
- **WHEN** staff attempts to activate a lease that is already `ACTIVE`
- **THEN** the API returns HTTP 409 with error code `LEASE_ALREADY_ACTIVE`

---

### Requirement: Staff can terminate a lease contract
The system SHALL allow staff with `LONG_TERM_EDIT` permission to terminate an `ACTIVE` or `PENDING` lease.

Required fields:
- `terminationDate` (ISO date, required)
- `terminationReason` (free text, optional)

On termination:
1. Lease `status` becomes `TERMINATED`, `endDate` is set to `terminationDate`
2. Room `RoomStatus` is reverted to `AVAILABLE` **only if** the room's current status is `RENTED_LONG_TERM` (prevents overwriting a maintenance status)

#### Scenario: Terminate an active lease
- **WHEN** staff terminates an active lease with a valid termination date
- **THEN** lease `status` becomes `TERMINATED`
- **AND** room status is reverted to `AVAILABLE` if it was `RENTED_LONG_TERM`
- **AND** `writeAudit` is called with `action: UPDATE`

#### Scenario: Termination date in the future
- **WHEN** `terminationDate` is in the future
- **THEN** the lease is scheduled for termination but remains `ACTIVE` until a subsequent request or end-of-day process updates the status (v1: status is updated immediately to TERMINATED regardless of date; date is stored for billing purposes)

---

### Requirement: Lease list is searchable and filterable
The system SHALL provide a paginated list of `LeaseContract` records filtered by status, room, and guest.

#### Scenario: List active leases
- **WHEN** staff requests lease list with `status=ACTIVE`
- **THEN** only `ACTIVE` leases are returned, paginated

#### Scenario: Search by tenant name
- **WHEN** staff enters a partial guest name in the search field
- **THEN** only leases whose linked `Guest.fullName` matches the search string are returned

---

### Requirement: Lease detail view shows contract summary and linked bills
The system SHALL show a lease detail page with: contract fields, tenant info, room info, linked `TenantBill` list, and payment status summary.

#### Scenario: View lease detail
- **WHEN** staff opens a lease detail page
- **THEN** the page displays contract dates, rent, deposit status, and a list of all `TenantBill` records for that lease sorted by billing period descending

---

## CHANGED Requirements

### Requirement: Lease contract form includes occupant count and file attachments

The create/edit `LeaseContract` form SHALL include:
- `occupants` (integer ≥ 1, default 1) — total number of people living in the room
- File attachment upload — staff can attach contract documents, ID scans, handover photos, etc.

**Occupants field:**
- Stored as `Int @default(1)` on `LeaseContract`
- Editable in both create and update flows
- Displayed in lease list and detail

**File attachments:**
- Files are stored using the shared `Attachment` model (`entityType = "LEASE_CONTRACT"`, `entityId = leaseId`)
- Attachment table is generic/polymorphic — no FK constraint, indexed by `(entityType, entityId)`
- Upload API: `POST /api/leases/[id]/documents` — accepts `multipart/form-data`, uploads via `lib/storage`, inserts an `Attachment` row
- Delete API: `DELETE /api/leases/[id]/documents/[docId]` — deletes the storage file and the `Attachment` row
- `GET /api/leases/[id]` response includes `documents: Attachment[]` (queried separately, not via Prisma relation)
- UI: Ant Design `Upload` component inside `LeaseFormDrawer`; files are staged locally on select (`beforeUpload` returns `false`), then uploaded sequentially after the lease is created/updated
- In edit mode: existing attachments are listed with individual delete buttons
- Supported file types: images (jpg, png, webp), PDF; max file size enforced client-side (10 MB)

#### Scenario: Create lease with occupants and documents
- **WHEN** staff fills in the form with `occupants = 3` and attaches 2 files, then submits
- **THEN** a `LeaseContract` is created with `occupants = 3`
- **AND** each file is uploaded to storage and an `Attachment` row is inserted with `entityType = "LEASE_CONTRACT"` and `entityId = <new lease id>`

#### Scenario: Delete an attachment
- **WHEN** staff clicks the delete icon on an existing attachment
- **THEN** `DELETE /api/leases/[id]/documents/[docId]` is called
- **AND** the file is removed from storage and the `Attachment` row is deleted
- **AND** the attachment list refreshes without the deleted item

#### Scenario: Edit lease updates occupants
- **WHEN** staff edits a lease and changes `occupants` from 2 to 4
- **THEN** `PUT /api/leases/[id]` is called with `occupants = 4`
- **AND** the lease record is updated accordingly
