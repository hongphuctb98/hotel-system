## ADDED Requirements

### Requirement: Admin can edit an existing linked account
An authenticated `ADMIN` SHALL be able to update a staff member's linked login account — changing `role` and/or toggling `isActive` — via an Edit Account modal on the Accounts page.

#### Scenario: Open edit modal pre-populated with current values
- **WHEN** admin clicks the edit action for an account row
- **THEN** the `EditAccountModal` opens with the current `role` pre-selected and the `isActive` switch reflecting `accountIsActive`

#### Scenario: Successfully change role
- **WHEN** admin selects a new role and submits
- **THEN** `PATCH /api/staff/[id]/account` is called with `{ role: "<new-role>" }`
- **THEN** the accounts list refreshes and the row shows the updated role tag
- **THEN** a success toast is displayed

#### Scenario: Successfully toggle account active status to inactive
- **WHEN** admin toggles the active switch off and submits
- **THEN** `PATCH /api/staff/[id]/account` is called with `{ isActive: false }`
- **THEN** the accounts list refreshes and the row shows an inactive status badge

#### Scenario: Admin attempts to deactivate their own account
- **WHEN** the currently logged-in admin submits `isActive: false` for the row whose `userId` matches their own id
- **THEN** the API returns `403 Forbidden`
- **THEN** the modal shows an error message and the account remains active

#### Scenario: Non-admin attempts to set role to ADMIN
- **WHEN** a non-ADMIN caller sends `PATCH /api/staff/[id]/account` with `{ role: "ADMIN" }`
- **THEN** the API returns `403 Forbidden`

#### Scenario: PATCH called on staff with no linked account
- **WHEN** `PATCH /api/staff/[id]/account` is called for a staff record where `userId` is null
- **THEN** the API returns `400 Bad Request`

#### Scenario: Staff record not found
- **WHEN** `PATCH /api/staff/[id]/account` is called with a non-existent staff id
- **THEN** the API returns `404 Not Found`
