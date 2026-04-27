## Why

The hotel system manages staff login accounts (`User`) from within the general Staff page, mixing HR profile management with access control. Admins need a dedicated Account Management section where they can see all login accounts at a glance, create accounts for staff who don't have one yet (with a staff-picker so they can't accidentally duplicate), edit roles, toggle account access, and reset passwords — without navigating through individual staff profiles.

## What Changes

- New **Account Management** page in the sidebar navigation (ADMIN only)
- **Account list table** showing all staff members who have linked login accounts, with their name, email, role tag, account status, and actions
- **Create Account modal** with a searchable staff-picker that only lists staff members without an existing account, plus email, password, and role fields
- **Edit Account modal** to change an existing account's role and active status
- **Reset Password** action accessible inline from the accounts table
- Staff API gains a `hasAccount` query filter to power both the accounts list and the staff-picker

## Capabilities

### New Capabilities

- `account-list`: Dedicated page listing all accounts (staff with `hasAccount: true`), with search and role filter
- `account-create`: Create an account by picking an unlinked staff member from a searchable dropdown, then setting email, password, and role
- `account-edit`: Edit an existing account's role and active status via a modal

### Modified Capabilities

- `staff-api-filter`: The `GET /api/staff` route gains a `hasAccount` boolean query param to support both the accounts list and the staff-picker

## Impact

- **New page**: `app/[locale]/(main)/accounts/page.tsx`
- **New module**: `modules/accounts/` (components + hooks)
- **New API routes**: none — reuses `POST /api/staff/[id]/account`, adds `PATCH /api/staff/[id]/account`
- **Modified API**: `GET /api/staff` gains `hasAccount` filter param
- **Navigation**: New `accounts` entry in `configs/navigation.config.ts` with `STAFF_MANAGE` permission and `roles: ["ADMIN"]`
- **Route constant**: Add `ACCOUNTS: "/accounts"` to `common/constants/routes.ts`
- **No schema changes**: `User` already has `role`, `isActive`; `Staff` already has `userId`
