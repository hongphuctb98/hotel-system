## UPDATED Requirements

> **Domain clarification:**
> `Staff` is the HR/personnel entity. `User` is the authentication/account entity.
> A Staff member may exist without a linked User account. Account provisioning is a separate admin action.

---

### Requirement: List staff members
The system SHALL display a paginated table of `Staff` records. Users with `STAFF_VIEW` permission may access this page.

Each row SHALL show:
- name (with avatar)
- contact email
- phone
- position
- system role (null if no account)
- account status: "Active", "Inactive", or "No account"
- context-aware actions

#### Scenario: View staff list
- **WHEN** a user with `STAFF_VIEW` visits `/staff`
- **THEN** a table renders with all staff members, including those without accounts

#### Scenario: Filter by role
- **WHEN** the user selects a role in the filter bar
- **THEN** only staff members whose linked account has that role are shown (staff without accounts are excluded from role filters)

#### Scenario: Show inactive staff
- **WHEN** the user enables "Show inactive"
- **THEN** deactivated staff records appear in the table and are visually dimmed

#### Scenario: Account status shown
- **WHEN** a staff member has no linked account
- **THEN** the account status column shows a "No account" badge and a "Create Account" action is visible

#### Scenario: Access denied
- **WHEN** a user without `STAFF_VIEW` attempts to access `/staff`
- **THEN** the page is not accessible

---

### Requirement: Create staff profile (no account required)
The system SHALL allow users with `STAFF_MANAGE` permission to create a new Staff HR profile without provisioning a login account.

The create form is at `/staff/new` (full page, not a drawer).

Required fields:
- `name`

Optional fields:
- `contactEmail`
- `phone`
- `address`
- `position`
- `department`
- `joinedAt`
- `resignedAt`
- `note`
- `isActive`

No password, accountEmail, or role field is present on this form.

#### Scenario: Successful creation
- **WHEN** ADMIN submits a valid staff profile at `/staff/new`
- **THEN** a new `Staff` record is created with `userId = null`, the admin is redirected to `/staff`, and a success toast is shown

#### Scenario: Redirect on success
- **WHEN** the staff profile is saved successfully
- **THEN** the admin is taken back to the staff list page

---

### Requirement: Edit staff profile
The system SHALL allow users with `STAFF_MANAGE` permission to update a staff member's HR profile fields via a dedicated full page at `/staff/[id]/edit`.

Editable fields:
- `name`
- `contactEmail`
- `phone`
- `address`
- `position`
- `department`
- `joinedAt`
- `resignedAt`
- `note`
- `isActive`
- avatar and documents (upload / delete)

Account fields (`accountEmail`, `role`, `password`) are NOT editable on this page. Account management uses a separate flow.

#### Scenario: Successful edit
- **WHEN** ADMIN submits valid changes at `/staff/[id]/edit`
- **THEN** the Staff record is updated, a success toast "Staff updated successfully" is shown, and the admin is redirected to `/staff`

#### Scenario: resignedAt disables isActive
- **WHEN** the admin sets a `resignedAt` date
- **THEN** the UI automatically sets `isActive` to `false` and disables the toggle with a tooltip

#### Scenario: Future resignation accepted
- **WHEN** the admin submits a future `resignedAt`
- **THEN** the server stores the value without deriving additional state

---

### Requirement: Provision a system account for an existing staff member
The system SHALL allow users with `STAFF_MANAGE` permission to create a login account for a Staff member who does not yet have one.

This action is triggered from the staff table via a "Create Account" modal (3 fields: accountEmail, password, role).

Required fields:
- `accountEmail`
- `password`
- `role`

The password SHALL be hashed before storage. It SHALL never be returned in any API response.

#### Scenario: Successful account creation
- **WHEN** ADMIN submits valid account details for a staff member with no account
- **THEN** a new `User` is created, linked to the Staff via `userId`, and a success toast is shown

#### Scenario: Account already exists
- **WHEN** the "Create Account" action is triggered for a staff member who already has an account
- **THEN** the action is not available (hidden in the UI; server returns 400)

#### Scenario: Duplicate login email
- **WHEN** the submitted `accountEmail` already exists in the system
- **THEN** the API returns HTTP 409 `STAFF_ACCOUNT_EMAIL_TAKEN` and the form shows a field-level error

#### Scenario: ADMIN role guard
- **WHEN** the submitted role is `ADMIN` and the caller is not an ADMIN
- **THEN** the API returns HTTP 403

#### Scenario: contactEmail defaults to accountEmail
- **WHEN** `Staff.contactEmail` is null at the time of account creation
- **THEN** the server sets `Staff.contactEmail` to the submitted `accountEmail`

---

### Requirement: Deactivate staff member
The system SHALL allow users with `STAFF_MANAGE` permission to soft-deactivate a staff member. The system SHALL prevent deactivation of the currently authenticated user.

Deactivation sets `Staff.isActive = false`. If a linked account exists, it also sets `User.isActive = false`.

#### Scenario: Deactivate staff with account
- **WHEN** ADMIN confirms deactivation of a staff member who has a linked account
- **THEN** both `Staff.isActive` and `User.isActive` are set to `false`

#### Scenario: Deactivate staff without account
- **WHEN** ADMIN confirms deactivation of a staff member with no linked account
- **THEN** only `Staff.isActive` is set to `false`

#### Scenario: Self-deactivation blocked in the UI
- **WHEN** the logged-in user views their own row
- **THEN** the deactivate action is hidden

#### Scenario: Self-deactivation blocked on the server
- **WHEN** the API receives `DELETE /api/staff/[id]` and the target staff's `userId` matches the caller's JWT `sub`
- **THEN** the API returns HTTP 400 and does not deactivate

---

### Requirement: Reset staff account password
The system SHALL allow users with `STAFF_MANAGE` permission to set a new password for a staff member's account.

This action is only available if the staff member has a linked account. The action is hidden (and the server returns 400) if no account exists.

#### Scenario: Successful password reset
- **WHEN** ADMIN submits a valid new password for a staff member who has an account
- **THEN** `User.passwordHash` is updated and a success toast is shown

#### Scenario: No account — action unavailable
- **WHEN** a staff member has no linked account
- **THEN** the "Reset Password" action is not shown in the table

#### Scenario: Self-reset blocked
- **WHEN** the reset target's `userId` matches the caller's own `sub`
- **THEN** the API returns HTTP 400

---

### Requirement: Manage staff avatar and documents
The system SHALL allow users with `STAFF_MANAGE` permission to upload and remove staff avatar and HR documents on the staff edit page.

#### Scenario: Upload avatar
- **WHEN** ADMIN uploads an avatar on the edit page
- **THEN** `Staff.avatarUrl` is updated and the previous avatar file is replaced

#### Scenario: Upload document
- **WHEN** ADMIN uploads a document with an optional type
- **THEN** a `StaffDocument` record is created linked to the Staff member

#### Scenario: Delete document
- **WHEN** ADMIN deletes a document
- **THEN** the `StaffDocument` record and the underlying file are removed from disk

---

### Requirement: Contact email separation
The system SHALL distinguish between the login/account email and the HR contact email.

- `User.email` — login email (set at account creation, not editable via staff profile)
- `Staff.contactEmail` — HR contact email (editable on the staff profile form at any time)

#### Scenario: Contact email editable independently
- **WHEN** ADMIN edits a staff profile and changes `contactEmail`
- **THEN** `Staff.contactEmail` is updated without affecting `User.email`

#### Scenario: Contact email defaults on account creation
- **WHEN** ADMIN provisions an account and `Staff.contactEmail` is null
- **THEN** the server sets `Staff.contactEmail` to the submitted `accountEmail`
