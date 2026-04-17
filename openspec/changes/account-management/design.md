## Context

Staff login accounts are created and managed from within `modules/staff/`. The `Staff` model has an optional `userId` FK; staff with `userId != null` have login accounts. The existing `GET /api/staff` route returns a `hasAccount` boolean in its DTO but offers no filter for it. Account creation (`POST /api/staff/[id]/account`) and password reset (`POST /api/staff/[id]/reset-password`) already exist. Account editing (role, isActive) does not.

The new Accounts page is a standalone admin-only section that surfaces account operations without requiring the admin to navigate staff profiles.

## Goals / Non-Goals

**Goals:**
- Dedicated `/accounts` page with full account CRUD (excluding email change)
- Staff-picker in Create Account modal filters to only staff without accounts
- Edit account: change role and toggle `user.isActive`
- Reset password action inline in the accounts table
- ADMIN-only access via navigation and permission guard

**Non-Goals:**
- Changing a login email (risk of breaking active sessions; out of scope)
- Removing account management actions from the Staff page (leave existing UX intact; accounts page is additive)
- Bulk operations

## Decisions

**1. Reuse `/api/staff` with a `hasAccount` filter rather than a new `/api/accounts` route.**

The staff DTO already contains all account fields (`accountEmail`, `role`, `accountIsActive`, `hasAccount`). Adding `?hasAccount=true` to the existing route avoids duplicating auth guards and response shaping. For the staff-picker, `?hasAccount=false&showInactive=false` returns only eligible candidates.

*Alternative*: New `GET /api/accounts` endpoint. Rejected — the data is fully covered by the staff DTO.

**2. Reuse `POST /api/staff/[id]/account` for creation; add `PATCH /api/staff/[id]/account` for editing.**

Account is a sub-resource of staff — the existing URL convention is correct. The staff-picker resolves the staff `id`, so the endpoint signature is natural.

**3. New `modules/accounts/` module (not extending `modules/staff/`).**

The accounts page has distinct hooks, components, and query keys from staff management. Putting it in `modules/staff/` would conflate two separate concerns. New module keeps separation clean.

**4. Staff-picker implemented as an Ant Design `Select` with `showSearch` and `filterOption`, populated from `GET /api/staff?hasAccount=false&showInactive=false`.**

The list of unlinked staff is small enough to fetch in full on modal open (no server-side search needed). `filterOption` handles client-side name/email search.

**5. Permission: `STAFF_MANAGE` with `roles: ["ADMIN"]` in nav config.**

`STAFF_MANAGE` is already ADMIN-exclusive in `ROLE_PERMISSIONS`. Adding `roles: ["ADMIN"]` to the nav item makes the intent explicit and consistent with `settings`.

**6. Server-side self-deactivation guard on `PATCH /api/staff/[id]/account`.**

If `isActive: false` is requested and `caller.id === staff.userId`, the API returns `403`. This prevents an admin from locking themselves out via the accounts page.

## Risks / Trade-offs

- **Active JWT not invalidated on `isActive = false`**: The deactivated account can still use an existing token until it expires (24h access token TTL). Acceptable for internal hotel tooling; a force-logout mechanism is a future concern.
- **Role change takes effect on next login**: The `user_role` cookie reflects the old role until the user re-authenticates. Same known limitation as above.
- **Staff-picker fetches all unlinked staff on modal open**: For hotels with hundreds of staff, this is still a small dataset. Acceptable.

## Migration Plan

No database migrations. Deployment is additive: new page, new module, one new API handler, one filter param added to existing route.

## Open Questions

- Should the accounts page also allow resetting passwords inline, or link back to the Staff page for that? Current design: yes, inline `ResetPasswordModal` reused directly.
