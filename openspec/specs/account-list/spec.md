## ADDED Requirements

### Requirement: Dedicated Accounts page lists all login accounts
The system SHALL provide a standalone `/accounts` page accessible only to `ADMIN` users, displaying all staff members who have a linked login account.

#### Scenario: Page loads with accounts table
- **WHEN** an ADMIN navigates to `/accounts`
- **THEN** the page renders a table of staff members where `hasAccount: true`
- **THEN** each row shows: staff name, login email, role tag, account active status badge, and action buttons (Edit, Reset Password)

#### Scenario: Page is not accessible to non-ADMIN roles
- **WHEN** a non-ADMIN user navigates to `/accounts`
- **THEN** the page is not visible in the sidebar navigation
- **THEN** direct navigation is blocked by the permission guard

#### Scenario: Accounts page shows correct account active status
- **WHEN** an account has `accountIsActive: false`
- **THEN** the row renders an "Inactive" status badge

#### Scenario: Empty state when no accounts exist
- **WHEN** no staff members have linked accounts
- **THEN** the table shows an empty state message

#### Scenario: "Create Account" button opens the Create Account modal
- **WHEN** admin clicks the "Create Account" button on the Accounts page
- **THEN** the Create Account modal opens

#### Scenario: Reset Password action is accessible inline
- **WHEN** admin clicks the Reset Password action on a row
- **THEN** the ResetPasswordModal opens for that staff member
