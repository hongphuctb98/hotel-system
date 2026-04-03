## Why

The current staff-management spec conflates two distinct domains — the HR personnel record (`Staff`) and the system login account (`User`) — and forces them to be created together in a single drawer form. This does not match the actual business workflow: HR staff records often need to exist before a login account is issued, and the creation of a system account is a separate admin decision that may happen days or weeks later. Additionally, the drawer/popup form pattern is too constrained for the volume of staff profile data, making the UI awkward for admins.

## What Changes

- **Staff can exist without a linked User account** — `Staff.userId` becomes nullable; staff can be created without an account and one can be provisioned later
- **BREAKING: `POST /api/staff` no longer creates a User** — it creates only the Staff profile
- **New endpoint: `POST /api/staff/[id]/account`** — provisions a login account for an existing Staff member (sets email, password, role on a new `User` record and links it)
- **Password reset restricted** — `POST /api/staff/[id]/reset-password` is only valid when an account already exists
- **Deactivate targets the account** — `DELETE /api/staff/[id]` soft-deletes both Staff and the linked User (if any)
- **Staff create/edit use full pages, not drawers** — new routes `/staff/new` and `/staff/[id]/edit`
- **Staff list shows account presence** — table column indicates whether a login account exists; "Create Account" action appears when none does
- **Two-email model preserved** — `User.email` (login) vs `Staff.contactEmail` (HR contact)

## Capabilities

### New Capabilities

- `staff-profile`: Create and edit a Staff HR profile as a standalone entity, independent of any system account. Full-page form at `/staff/new` and `/staff/[id]/edit`.
- `staff-account`: Provision, view, and deactivate the system login account attached to a Staff member. Includes account creation (`POST /api/staff/[id]/account`), password reset, and deactivation.

### Modified Capabilities

- `staff-crud`: The original combined create-staff-with-account flow is replaced by the two separate capabilities above. The staff list, filtering, and deactivation behaviors remain but are updated to reflect account presence.

## Impact

- `prisma/schema.prisma` — `Staff.userId` becomes `String?` (nullable); migration required
- `app/api/staff/route.ts` — `POST` no longer creates `User`; removes password/role/accountEmail from create payload
- `app/api/staff/[id]/route.ts` — `DELETE` deactivates linked User only if one exists
- `app/api/staff/[id]/account/route.ts` — **new**: `POST` provisions a User and links it to Staff
- `app/api/staff/[id]/reset-password/route.ts` — returns 400 if no account is linked
- `modules/staff/components/StaffFormDrawer.tsx` — **removed**: replaced by full-page forms
- `app/[locale]/(main)/staff/new/page.tsx` — **new**: staff creation page
- `app/[locale]/(main)/staff/[id]/edit/page.tsx` — **new**: staff edit page
- `modules/staff/components/StaffTable.tsx` — updated to show account status column and context-aware actions
- `types/staff.types.ts` — `StaffMember.userId` becomes nullable; add `hasAccount: boolean`
- No changes to the avatar/document upload endpoints
