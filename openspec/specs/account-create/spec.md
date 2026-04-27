## ADDED Requirements

### Requirement: Create Account modal uses a staff-picker filtered to unlinked staff
The Create Account modal SHALL present a searchable dropdown of staff members who do not yet have a linked account, preventing duplicate account creation.

#### Scenario: Staff-picker shows only staff without accounts
- **WHEN** the Create Account modal opens
- **THEN** the staff picker dropdown lists only staff where `hasAccount: false` and `isActive: true`
- **THEN** each option displays the staff member's name (and contact email if available)

#### Scenario: Staff-picker is searchable by name
- **WHEN** admin types a name into the staff picker
- **THEN** the list filters to matching staff members

#### Scenario: Successfully create account
- **WHEN** admin selects a staff member, enters a valid email, password, and role, then submits
- **THEN** `POST /api/staff/[id]/account` is called with `{ accountEmail, password, role }`
- **THEN** the accounts list refreshes and the new account appears in the table
- **THEN** a success toast is displayed and the modal closes

#### Scenario: Staff-picker is empty when all staff have accounts
- **WHEN** every active staff member already has a linked account
- **THEN** the dropdown shows an empty state message ("All staff members already have accounts")
- **THEN** the submit button is disabled

#### Scenario: Duplicate login email rejected
- **WHEN** admin submits a Create Account form with an email already in use
- **THEN** the API returns `409 Conflict` with code `STAFF_ACCOUNT_EMAIL_TAKEN`
- **THEN** the modal shows an error on the email field and remains open

#### Scenario: All fields are required
- **WHEN** admin submits the form with any required field empty (staff, email, password, role)
- **THEN** client-side validation shows field errors and the form is not submitted
