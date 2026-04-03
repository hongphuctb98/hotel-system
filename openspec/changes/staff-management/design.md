## Context

The current implementation treats `Staff` (HR entity) and `User` (auth entity) as inseparable — creating a staff member always creates a login account atomically. The `Staff.userId` field is non-nullable, which enforces this coupling at the database level.

The business requirement has shifted: HR records and system accounts have different lifecycles. A staff member may be onboarded into the HR system before IT provisions their login. Accounts may be revoked without deleting the HR record. The current schema and API cannot express these states.

Additionally, the drawer form pattern (used in Rooms) is too constrained for staff profiles which have significantly more fields across multiple sections.

## Goals / Non-Goals

**Goals:**
- Make `Staff.userId` nullable so a staff profile can exist without a login account
- Separate the account-provisioning action from staff profile creation
- Replace the staff drawer form with dedicated full-page create/edit routes
- Update the staff list to communicate account presence and offer context-aware actions
- Keep the existing `Staff` HR fields, avatar/document upload, and two-email model intact
- Keep permissions unchanged: `STAFF_VIEW` (ADMIN + MANAGER), `STAFF_MANAGE` (ADMIN only)

**Non-Goals:**
- No self-service account management for staff
- No email-based account invite flow
- No audit log
- No change to avatar or document upload endpoints
- No change to the two-email model (`User.email` vs `Staff.contactEmail`)

## Decisions

### 1. `Staff.userId` becomes nullable

```prisma
model Staff {
  userId String? @unique   // null = no account provisioned yet
  user   User?   @relation(fields: [userId], references: [id])
  ...
}
```

The `@unique` constraint is kept so the 1-to-1 invariant is preserved once a link exists. A nullable unique FK is the standard pattern for an optional 1-to-1 relationship in Prisma.

*Alternative considered:* Keep a separate `StaffAccount` join table. Rejected — adds unnecessary indirection for a simple optional relationship.

### 2. `POST /api/staff` creates Staff only

The create payload no longer accepts `password`, `accountEmail`, or `role`. It accepts only HR profile fields:

```ts
{
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  position?: string | null;
  department?: string | null;
  joinedAt?: string | null;
  resignedAt?: string | null;
  note?: string | null;
  isActive?: boolean;
}
```

The response includes `userId: null` and `hasAccount: false`.

*Alternative considered:* Keep the combined create but make account optional via a flag. Rejected — a flag-based API blurs the domain boundary and makes the intent unclear.

### 3. New endpoint: `POST /api/staff/[id]/account`

Provisions a `User` and links it to the `Staff` record in a single transaction:

```ts
// Request body
{
  accountEmail: string;
  password: string;
  role: UserRole;
}
```

Guards:
- Returns 400 if the staff member already has an account
- Returns 409 `STAFF_ACCOUNT_EMAIL_TAKEN` if `accountEmail` already exists on another User
- Returns 403 if caller tries to assign `ADMIN` role without being ADMIN

The response is the updated `StaffMember` DTO with `hasAccount: true`.

### 4. `DELETE /api/staff/[id]` handles optional account

If `Staff.userId` is null, soft-deletes only `Staff.isActive = false`. If a linked User exists, also sets `User.isActive = false`. No error if no account.

### 5. `POST /api/staff/[id]/reset-password` guards account presence

Returns `400 "No account linked to this staff member"` if `Staff.userId` is null. Prevents confusion when an admin tries to reset a password that doesn't exist.

### 6. Staff create/edit use full-page forms, not a drawer

**Routes:**
- `/staff/new` — `app/[locale]/(main)/staff/new/page.tsx`
- `/staff/[id]/edit` — `app/[locale]/(main)/staff/[id]/edit/page.tsx`

Both pages are `"use client"` (form interactions, uploads). They compose a single `StaffProfileForm` component shared between create and edit.

**Sections in the form (rendered as a vertical stepped layout or sectioned card page, not tabs):**
- Basic Info: name, contactEmail, phone, address, position, department, note
- Employment: joinedAt, resignedAt, isActive toggle (with resignedAt → isActive coupling)
- Media & Documents: avatar upload, document list with upload/delete

On submit, the form calls `POST /api/staff` (create) or `PUT /api/staff/[id]` (edit). On success, redirect to `/staff`.

*Alternative considered:* Keep the drawer but make it wider/scrollable. Rejected — the constraint of a drawer creates a poor experience for a form with 12+ fields, file uploads, and a document list. Full pages also allow future expansion (e.g., employment history) without redesign.

### 7. Staff table shows account status

New `hasAccount` computed field on the `StaffMember` DTO (derived server-side: `hasAccount = staff.userId !== null`).

Table column "Account" shows:
- `Tag color="success"` "Active" — account exists and `User.isActive = true`
- `Tag color="default"` "Inactive" — account exists but `User.isActive = false`
- `Tag color="warning"` "No account" — `userId` is null

Actions column is context-aware:
- Always: "Edit Staff" (navigates to `/staff/[id]/edit`)
- If no account: "Create Account" (opens a small modal with accountEmail, password, role)
- If account exists and not self: "Reset Password" (opens ResetPasswordModal)
- If account active and not self: "Deactivate" (confirm dialog)

*Alternative considered:* Show account actions inline in the edit page. Rejected — the table is where admins manage status day-to-day; requiring navigation to the edit page for a one-click action is friction.

### 8. "Create Account" modal stays a modal (not a full page)

Account provisioning is a short, 3-field action (email, password, role). A modal is appropriate here. Only the large staff profile form moves to a full page.

### 9. `StaffMember` DTO shape

```ts
type StaffMember = {
  id: string;
  userId: string | null;       // null = no account
  hasAccount: boolean;         // derived: userId !== null
  accountEmail: string | null; // null when no account
  accountIsActive: boolean | null; // null when no account
  role: UserRole | null;       // null when no account
  name: string;
  avatarUrl: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  joinedAt: string | null;
  resignedAt: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  documents: StaffDocument[];
};
```

Fields that are null when no account (`accountEmail`, `accountIsActive`, `role`) are clearly typed as nullable so UI components can guard on `hasAccount` before rendering them.

### 10. Migration: make `Staff.userId` nullable

```sql
-- Make userId nullable (remove NOT NULL constraint)
ALTER TABLE "staffs" ALTER COLUMN "userId" DROP NOT NULL;
```

No data needs to be migrated; all existing staff records already have a linked userId from the earlier migration. The constraint change is purely schema-level.

### 11. Page routing: `staff/[id]/edit` — `[id]` is `Staff.id`

Consistent with all other staff routes. The edit page receives `Staff.id` as the route param, fetches `GET /api/staff/[id]`, and pre-fills the form.

## Risks / Trade-offs

- **Nullable FK adds nullable handling throughout the UI** — every place that renders `accountEmail` or `role` must now guard on `hasAccount`. Mitigation: the DTO's explicit `hasAccount: boolean` field makes the guard unambiguous.
- **Account creation modal vs page** — keeping account provisioning in a modal (3 fields) while staff editing uses a full page may feel inconsistent to some users. Accepted as a deliberate trade-off: brevity of the action justifies the modal.
- **Existing staff rows all have accounts** — after the migration, all current Staff records have `userId` set. The "No account" state is only reachable for new staff created through the new API. No data cleanup needed.
- **`StaffFormDrawer` removed** — any code referencing it will need to be updated. Covered in tasks.

## Migration Plan

1. Update `prisma/schema.prisma` — `Staff.userId String? @unique`, `user User? @relation(...)`
2. Write migration SQL — `ALTER TABLE staffs ALTER COLUMN "userId" DROP NOT NULL`
3. Run `npm run db:generate` + `npm run db:migrate`
4. Update API routes — strip account fields from `POST /api/staff`, add `POST /api/staff/[id]/account`, update `DELETE` and `reset-password`
5. Update `StaffMember` DTO and `types/staff.types.ts`
6. Create full-page form components and routes
7. Update `StaffTable` — account status column + context-aware actions + "Create Account" modal
8. Remove `StaffFormDrawer`
9. Run `npm run build` — verify no TypeScript errors
