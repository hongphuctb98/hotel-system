## 1. API — Staff Filter & Account PATCH

- [x] 1.1 Add `hasAccount` query param to `GET /api/staff` in `app/api/staff/route.ts`: when `"true"`, filter `where.userId = { not: null }`; when `"false"`, filter `where.userId = null`
- [x] 1.2 Add `PATCH` handler to `app/api/staff/[id]/account/route.ts` accepting `{ role?, isActive? }`
- [x] 1.3 PATCH guard: return `403` if caller is unauthenticated
- [x] 1.4 PATCH guard: return `403` if `role === "ADMIN"` and caller is not ADMIN
- [x] 1.5 PATCH guard: return `403` if `isActive === false` and `caller.id === staff.userId` (self-deactivation)
- [x] 1.6 PATCH guard: return `400` if staff has no linked account (`userId === null`)
- [x] 1.7 PATCH guard: return `404` if staff record not found
- [x] 1.8 Apply partial update to `User` record and return updated staff DTO

## 2. Route Constant & Navigation

- [x] 2.1 Add `ACCOUNTS: "/accounts"` to `common/constants/routes.ts`
- [x] 2.2 Add `accounts` nav item to `configs/navigation.config.ts` with `href: ROUTES.ACCOUNTS`, `permission: PERMISSIONS.STAFF_MANAGE`, `roles: ["ADMIN"]`
- [x] 2.3 Add i18n key `nav.accounts` to `messages/en.json` and `messages/vi.json`

## 3. Accounts Module — Hooks

- [x] 3.1 Create `modules/accounts/hooks/useAccounts.ts` — fetches `GET /api/staff?hasAccount=true` with pagination and role filter
- [x] 3.2 Create `modules/accounts/hooks/useUnlinkedStaff.ts` — fetches `GET /api/staff?hasAccount=false&showInactive=false` (used by staff-picker; full list, no pagination)
- [x] 3.3 Create `modules/accounts/hooks/useAccountMutations.ts` with:
  - `useCreateAccount(staffId)` — calls `POST /api/staff/[id]/account`; invalidates `["accounts"]` and `["staff"]`
  - `useUpdateAccount(staffId)` — calls `PATCH /api/staff/[id]/account`; invalidates `["accounts"]` and `["staff"]`

## 4. CreateAccountModal Component

- [x] 4.1 Create `modules/accounts/components/CreateAccountModal.tsx` with a Form containing:
  - Staff picker: `Select` with `showSearch` and `filterOption` populated from `useUnlinkedStaff`
  - `accountEmail` input (email type, required)
  - `password` input (password type, required, min 8 chars)
  - `role` Select with the four `UserRole` options
- [x] 4.2 Show empty-state message in staff picker when all staff are already linked; disable submit
- [x] 4.3 Handle `STAFF_ACCOUNT_EMAIL_TAKEN` conflict: set form field error on `accountEmail`
- [x] 4.4 On success: show `message.success`, close modal, reset form

## 5. EditAccountModal Component

- [x] 5.1 Create `modules/accounts/components/EditAccountModal.tsx` with a Form containing:
  - `role` Select pre-populated from the target staff's current role
  - `isActive` Switch pre-populated from `accountIsActive`
- [x] 5.2 Wire submit to `useUpdateAccount`; show `message.success` on success, `message.error` on failure
- [x] 5.3 Close modal and reset form on success

## 6. AccountsTable Component

- [x] 6.1 Create `modules/accounts/components/AccountsTable.tsx` using `AppTable` with columns: Name, Login Email, Role (tag), Account Status (badge), Actions
- [x] 6.2 Actions column: Edit button (opens `EditAccountModal`), Reset Password button (opens existing `ResetPasswordModal` from `modules/staff/components/`)
- [x] 6.3 Add role filter (Select) and search by name/email above the table
- [x] 6.4 Wire to `useAccounts` hook for data and pagination

## 7. Accounts Page

- [x] 7.1 Create `app/[locale]/(main)/accounts/page.tsx` as a `"use client"` page
- [x] 7.2 Render `AppPageHeader` with title and "Create Account" button
- [x] 7.3 Render `AccountsTable`
- [x] 7.4 Mount `CreateAccountModal` and `EditAccountModal` with open/target state managed in the page

## 8. i18n Strings

- [x] 8.1 Add `accounts` namespace to `messages/en.json`: `title`, `createAccount`, `editAccount`, `createSuccess`, `editSuccess`, `resetPassword`, `role`, `accountStatus`, `noUnlinkedStaff`, `staffPlaceholder`
- [x] 8.2 Mirror same keys in `messages/vi.json`
