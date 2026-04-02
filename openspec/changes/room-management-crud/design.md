## Context

The API layer (`app/api/rooms/`) and service layer (`common/services/roomService.ts`) already exist with full CRUD. The `Room` type is defined in `types/room.types.ts`. What is missing is the UI layer: the `modules/rooms/` module, the `app/[locale]/(main)/rooms/page.tsx` page, and the supporting wiring (permissions, routes, navigation, i18n).

Two gaps in the existing API also need fixing before the UI can use them:
- `POST /api/rooms` does not connect amenities on create
- `PUT /api/rooms/[id]` does not update amenities

Three new requirements have also been added post-initial-proposal:
- Price display fallback: show `room.basePrice` if set, else `room.roomType.defaultPrice`

A further correction: the "Create Room" button was initially placed in the page header behind a `getRoleFromCookie()` call that defaults to `"RECEPTIONIST"` on first render, making it invisible. The button must be moved inside `RoomTable`'s filter bar to be reliable and correctly placed.
- Inactive room toggle filter on the table
- Multi-image support: new `RoomImage` model + upload/delete API + upload UI in the drawer

## Goals / Non-Goals

**Goals:**
- Build the `modules/rooms/` UI module following the same structure as `modules/guests/`
- Fix the API amenity gaps so create/update fully persist `RoomAmenity` records
- Wire permissions, route constant, navigation entry, and i18n keys
- Produce a page that is free of hydration mismatches and Ant Design v6 deprecation warnings

**Non-Goals:**
- No bulk import/export of rooms
- No room availability calendar (belongs to room-map feature)
- No external CDN or cloud storage for images (local filesystem only)
- No changes to the room-map module

## Decisions

### 1. Page must be `"use client"`
The `modules/rooms/` components contain column `render` functions, `onRow` handlers, and `FormComponent` references. Passing these from a Server Component to a Client Component violates Next.js 16's stricter server/client boundary. The page file (`app/[locale]/(main)/rooms/page.tsx`) must carry `"use client"`.

*Alternative considered:* move all config into a Client Component wrapper and keep the page as a Server Component. Rejected — adds a pointless wrapper with no benefit since the page has no server-only data needs.

### 2. Amenity update strategy: replace-all
On create and update, amenities are managed with a delete-then-create transaction:
```
prisma.$transaction([
  prisma.roomAmenity.deleteMany({ where: { roomId: id } }),
  prisma.roomAmenity.createMany({ data: amenityIds.map(amenityId => ({ roomId: id, amenityId })) }),
])
```
*Alternative considered:* diff-based upsert. Rejected — amenity lists are short (< 20 items), and the replace-all approach keeps the API handler simple and idempotent.

### 3. Edit via Drawer, not Modal
Consistent with the `AppDrawer` component already in `common/components/ui/`. Drawers are used across the project for entity editing. Modals are reserved for confirmations.

### 4. New permissions: `ROOMS_VIEW` and `ROOMS_MANAGE`
The existing `PERMISSIONS` object has no room-management entries. Two new constants are added:
- `ROOMS_VIEW` (`rooms:view`) — read-only access; given to ADMIN, MANAGER, RECEPTIONIST
- `ROOMS_MANAGE` (`rooms:manage`) — create/edit/delete; given to ADMIN and MANAGER only
Housekeeping staff do not need access to the management page (they use room-map and housekeeping task views).

### 5. Filter bar uses `useMasterData()`
Floor, RoomType, and RoomStatus selects in the filter bar all use the `useMasterData()` hook (`staleTime: Infinity`). No extra API calls needed.

### 6. Create Room button lives in `RoomTable`, not the page header
The "Create Room" button is placed at the top-right of `RoomTable`'s filter/action bar. This keeps create and edit drawer state co-located in one component and avoids a separate page-level `RoomFormDrawer` instance.

The `user_role` cookie is read client-side via `document.cookie` inside `RoomTable` using `useMemo` so the permission check is evaluated after hydration. The page header (`AppPageHeader`) carries no create action.

*Previous approach:* Button was in `AppPageHeader` with a `getRoleFromCookie()` called during render, which returned `"RECEPTIONIST"` on first render (before `document` is available), hiding the button for all users. Rejected — unreliable; confusing UX placement.

### 7. Delete is soft (existing behavior preserved)
The existing DELETE handler sets `isActive: false`. The UI confirmation dialog must communicate this is a deactivation, not a permanent erasure.

### 7. Base price display fallback
The `Room` model gains a nullable `basePrice` field. The table price column renders `room.basePrice ?? room.roomType.defaultPrice`. The `roomType` relation is already included in the `roomInclude` object used by all API handlers, so no extra query is needed. The `Room` TypeScript type in `types/room.types.ts` must be updated to add `basePrice?: Decimal | null`.

*Alternative considered:* compute effective price server-side and return it as a synthetic field. Rejected — adds unnecessary transformation logic; the client has all it needs via the existing include.

### 8. Inactive room toggle filter
The `GET /api/rooms` handler currently hard-codes `where.isActive = true`. The filter is changed to: when the `showInactive=true` query param is present, omit the `isActive` filter entirely (return all rooms). Default behaviour (no param or `showInactive=false`) stays as-is. The `useRooms` hook adds a `showInactive: boolean` filter field. The UI renders a Toggle/Switch above the table labeled "Show inactive rooms".

### 9. Room image storage: local filesystem
Images are written to `public/uploads/rooms/[roomId]/[filename]` using the Node.js `fs` module inside the API route handler. The stored URL is `/uploads/rooms/[roomId]/[filename]` — relative to the Next.js static asset root. The `RoomImage` model stores `url` (the relative path), `order` (integer for display ordering), and `roomId`.

Upload endpoint: `POST /api/rooms/[id]/images` — accepts `multipart/form-data` with a single `file` field; writes to disk; creates a `RoomImage` record; returns the new record.

Delete endpoint: `DELETE /api/rooms/[id]/images/[imageId]` — deletes the `RoomImage` record and the file from disk.

The Ant Design `Upload` component (`listType="picture-card"`) is used in the drawer. It operates in a two-phase flow: after the room is saved (create or update), a separate upload call is made per new file. Existing images are shown as the initial file list; removing one calls the delete endpoint immediately.

**Image state management rules:**
- Pending files (not yet saved) are distinguished from existing DB images by the presence of `originFileObj` on the `UploadFile` entry.
- On removal of an existing image: the delete API is called, `fileList` state is updated optimistically on success, and a success/error `message` is shown.
- On removal of a pending file: both `fileList` and `pendingFiles` are updated locally without any API call.
- After the room save + image upload loop, `queryClient.invalidateQueries({ queryKey: ["rooms"] })` is called explicitly to ensure the room list and detail caches reflect the newly uploaded images.

**UX feedback standard (applies to all API-interacting actions):**
- Display a loading state during the request (mutation `isPending` wired to button `loading` prop).
- Show `message.success` / `message.error` (via `App.useApp()`) on completion. Always use `App.useApp()` — never the static `message` import.
- Trigger `queryClient.invalidateQueries` for **all** affected query keys on success:
  - List query `["entity"]` — always
  - Detail query `["entity", id]` — on update, upload, image delete; use `removeQueries` on delete
- **Submit button label and success message must be mode-aware:** use a distinct label ("Create X" vs "Update X") and a distinct success string ("X created successfully" vs "X updated successfully"). Never reuse generic labels like "Save" for both modes — the label must reflect the action being taken. Add both strings as i18n keys scoped to the feature namespace (e.g., `room.createAction`, `room.updateAction`, `room.createSuccess`, `room.updateSuccess`).
- **Soft delete / deactivate actions** must also show feedback: pass `onSuccess`/`onError` callbacks to `mutate()` at the call site (not in the hook), since the hook does not have access to `message`. i18n keys follow the pattern `entity.deactivateSuccess` / `entity.deactivateFailed`.

*Alternative considered:* Buffer all uploads in-memory and commit them in the same transaction as the room save. Rejected — Next.js Route Handlers do not support streaming multipart in a transaction-friendly way; two-phase (save room first, then upload images) is simpler and idiomatic for file uploads.

### 10. Soft-delete conflict: "Reactivate instead of Duplicate" strategy
Room numbers are globally unique (`@@unique` on `number`). When a user tries to create a room with a number that belongs to an inactive (soft-deleted) room, a DB unique-constraint violation would surface as a silent 500.

Instead, the `POST /api/rooms` handler performs a pre-flight `findUnique` lookup before inserting:
- **Inactive duplicate** → HTTP 409 with `code: "ROOM_INACTIVE_EXISTS"` and `data: { id }` of the existing record
- **Active duplicate** → HTTP 409 with `code: "ROOM_NUMBER_TAKEN"`

The `conflict()` response helper in `lib/response.ts` sends these as structured errors. `ApiResponse<T>` carries an optional `code` field. `ApiError` (exported from `apiClient.ts`) extends `Error` with `code` and `data` so callers can do `instanceof ApiError` checks.

**UI handling in `RoomFormDrawer`:**
- `ROOM_NUMBER_TAKEN` → `form.setFields([{ name: "number", errors: [...] }])` shows a field-level validation error
- `ROOM_INACTIVE_EXISTS` → `modal.confirm` offers "Reactivate" which calls `PUT /api/rooms/{id}` with `{ isActive: true }`. No new record is created — the existing one is restored.

*Alternative considered:* Auto-reactivate without confirmation. Rejected — destructive to do silently; the user should consciously choose to restore the deactivated record.

## Risks / Trade-offs

- **Amenity replace-all on concurrent edits**: If two users edit the same room simultaneously, the last write wins on amenities. Acceptable for this context (hotel ops, low concurrency).
- **Image orphan on failed room create**: If the room POST fails after the `RoomImage` upload, the file is left on disk with no DB record. Mitigation: run image uploads only after the room is successfully created (two-phase flow).
- **Local filesystem images not portable**: Images stored in `public/uploads/` are not replicated across instances. Acceptable for single-server dev/staging; a future change can swap in S3 by changing only the image API handlers.
- **No PATCH on the existing PUT handler**: The `PUT /api/rooms/[id]` uses partial field updates via spread. Adding amenity handling to the same handler keeps the endpoint simple but means any PUT without `amenityIds` will wipe amenities. The handler must default to preserving existing amenities when `amenityIds` is absent — handle with an explicit `if (body.amenityIds !== undefined)` guard.
- **i18n**: All new UI strings must be added to both `messages/en.json` and `messages/vi.json`. Missing Vietnamese translations will fall back to the key name — acceptable short-term but should be filled in.

## Migration Plan

No database migration needed. Deploy steps:
1. Apply API handler changes (amenity support in POST/PUT)
2. Deploy UI module and page
3. No rollback complexity — all changes are additive
