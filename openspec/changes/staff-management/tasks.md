## 1. Schema: Make Staff.userId nullable

- [x] 1.1 Update `prisma/schema.prisma`
  change `Staff.userId String @unique` → `Staff.userId String? @unique`
  change `user User @relation(...)` → `user User? @relation(...)`
- [x] 1.2 Write migration SQL in `prisma/migrations/YYYYMMDD_staff_nullable_userid/migration.sql`
  `ALTER TABLE "staffs" ALTER COLUMN "userId" DROP NOT NULL;`
- [x] 1.3 Run `npm run db:generate` then `npm run db:migrate`
- [x] 1.4 Update `prisma/seed.ts` — no change needed to seeded data; confirm seed still runs cleanly

## 2. Types

- [x] 2.1 Update `types/staff.types.ts`
  - `StaffMember.userId` → `string | null`
  - Add `StaffMember.hasAccount: boolean`
  - Add `StaffMember.accountEmail: string | null`
  - Add `StaffMember.accountIsActive: boolean | null`
  - `StaffMember.role` → `UserRole | null`
  - Update `CreateStaffPayload` — remove `accountEmail`, `password`, `role`
  - Add `CreateAccountPayload` — `{ accountEmail: string; password: string; role: UserRole }`

## 3. API Routes

- [x] 3.1 Update `app/api/staff/route.ts` — `POST`
  remove `accountEmail`, `password`, `role` from body; create only `Staff` (no User transaction);
  set `userId: null`; respond with updated `StaffMember` DTO
- [x] 3.2 Update `app/api/staff/[id]/route.ts` — `DELETE`
  if `staff.userId` is null, set only `Staff.isActive = false`;
  if `staff.userId` exists, set both `Staff.isActive` and `User.isActive = false`
- [x] 3.3 Update `app/api/staff/[id]/reset-password/route.ts`
  return `400 "No account linked to this staff member"` if `staff.userId` is null
- [x] 3.4 Create `app/api/staff/[id]/account/route.ts`
  `POST`: validate no account exists (400 if already linked); check for duplicate `accountEmail` (409 `STAFF_ACCOUNT_EMAIL_TAKEN`); guard ADMIN role assignment (403);
  transaction: create `User`, update `Staff.userId`, backfill `Staff.contactEmail` if null;
  respond with updated `StaffMember` DTO
- [x] 3.5 Update `toStaffDTO` helper (used in both route files)
  derive `hasAccount`, `accountEmail`, `accountIsActive` from the joined User (or null if no user)

## 4. Service Layer

- [x] 4.1 Update `common/services/staffService.ts`
  update `create` signature to remove account fields
  add `createAccount(id: string, data: CreateAccountPayload)` method calling `POST /api/staff/[id]/account`
  update `StaffMember` usage throughout to account for nullable `userId`/`role`/`accountEmail`

## 5. React Query Hooks

- [x] 5.1 Update `modules/staff/hooks/useStaffMutations.ts`
  update `useCreateStaff` to use new payload shape (no account fields)
  add `useCreateStaffAccount` mutation that calls `staffService.createAccount`; invalidates `["staff"]` and `["staff", id]` on success

## 6. Remove StaffFormDrawer

- [x] 6.1 Delete `modules/staff/components/StaffFormDrawer.tsx`
- [x] 6.2 Verify no remaining imports reference `StaffFormDrawer`

## 7. Full-Page Staff Profile Form

- [x] 7.1 Create `modules/staff/components/StaffProfileForm.tsx`
  shared form component used by both create and edit pages;
  sections (rendered as cards or dividers, not tabs):
  - **Basic Info**: name, contactEmail, phone, address, position, department, note
  - **Employment**: joinedAt, resignedAt (DatePicker); resignedAt sets isActive=false and disables toggle
  - **Media & Documents**: avatar upload (picture-card), document list with upload + delete
  on submit calls `onSave(values)` callback; submit button shows "Create Staff" or "Update Staff" based on `mode` prop
- [x] 7.2 Create `app/[locale]/(main)/staff/new/page.tsx`
  `"use client"` directive; renders `AppPageHeader` ("Add Staff Member") + `StaffProfileForm` in create mode;
  on save calls `useCreateStaff`, on success redirects to `/staff` using `useRouter`
- [x] 7.3 Create `app/[locale]/(main)/staff/[id]/edit/page.tsx`
  `"use client"` directive; fetches staff via `useStaffMember(id)`; renders `AppPageHeader` ("Edit Staff Member") + `StaffProfileForm` in edit mode pre-filled with current data;
  on save calls `useUpdateStaff`, then runs pending avatar/document uploads, on success redirects to `/staff`
- [x] 7.4 Update `StaffTable` — replace "Edit Staff" button click handler from opening a drawer to `router.push(\`/staff/\${id}/edit\`)`

## 8. Create Account Modal

- [x] 8.1 Create `modules/staff/components/CreateAccountModal.tsx`
  `AppModal` with 3 fields: `accountEmail` (Input, required, email), `password` (Input.Password, required, min 6), `role` (Select of UserRole values);
  calls `useCreateStaffAccount`; on 409 `STAFF_ACCOUNT_EMAIL_TAKEN` shows field-level error on accountEmail via `form.setFields`;
  shows success/error toast; disabled for staff who already have an account

## 9. Update StaffTable

- [x] 9.1 Add "Account" column showing account status badge:
  - `Tag color="success"` "Active" when `hasAccount && accountIsActive`
  - `Tag color="default"` "Inactive" when `hasAccount && !accountIsActive`
  - `Tag color="warning"` "No account" when `!hasAccount`
- [x] 9.2 Update actions column to be context-aware:
  - "Edit" always visible (navigates to `/staff/[id]/edit`)
  - "Create Account" visible when `!hasAccount`
  - "Reset Password" visible when `hasAccount && !isSelf`
  - "Deactivate" visible when `isActive && !isSelf`
- [x] 9.3 Wire "Create Account" button to open `CreateAccountModal` with the target staff member
- [x] 9.4 Remove any remaining reference to `StaffFormDrawer` in `StaffTable`

## 10. i18n

- [x] 10.1 Add missing keys to `messages/en.json` under `staff.*`:
  `createAccountTitle`, `createAccountAction`, `createAccountSuccess`, `createAccountFailed`, `accountStatus`, `accountActive`, `accountInactive`, `noAccount`
- [x] 10.2 Add matching keys to `messages/vi.json`

## 11. Navigation — "Add Staff" button

- [x] 11.1 Update the "Add Staff Member" button in `StaffTable` to navigate to `/staff/new` using `router.push` instead of opening a drawer

## 12. Verification

- [x] 12.1 Run `npm run build` — no TypeScript errors
- [ ] 12.2 Verify staff can be created without a login account
- [ ] 12.3 Verify "Create Account" modal provisions a User and links it to Staff
- [ ] 12.4 Verify staff with no account shows "No account" badge and "Create Account" action
- [ ] 12.5 Verify staff with an account shows "Reset Password" and "Deactivate" actions
- [ ] 12.6 Verify full-page create/edit forms at `/staff/new` and `/staff/[id]/edit`
- [ ] 12.7 Verify self-deactivation and self-reset are blocked on client and server
- [ ] 12.8 Verify `contactEmail` backfills from `accountEmail` on account creation when null
