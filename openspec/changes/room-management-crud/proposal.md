## Why

The hotel management system has no room management UI. Rooms are a core entity — they underpin bookings, housekeeping, and billing — but staff cannot create, view, update, or delete rooms through the application today.

## What Changes

- New `/rooms` page with a paginated table of all rooms; toggle to show/hide inactive rooms
- Create/edit room drawer with fields: number, floor, room type, status, base price (nullable), amenities (multi-select), note, and image uploads
- Price display in table: show `room.basePrice` if set, otherwise fall back to `roomType.defaultPrice`
- Delete room with confirmation dialog (soft delete)
- `GET/POST /api/rooms` and `GET/PATCH/DELETE /api/rooms/[id]` route handlers (amenity + image management)
- `POST /api/rooms/[id]/images` and `DELETE /api/rooms/[id]/images/[imageId]` for image lifecycle
- Room service layer (`common/services/roomService.ts`) with full CRUD + image methods
- React Query hooks in `modules/rooms/hooks/` for list, detail, create, update, delete, image upload/delete
- Navigation entry added to `configs/navigation.config.ts`
- **Prisma schema migration**: add `basePrice` (nullable Decimal) to `Room`; add new `RoomImage` model with one-to-many relation to `Room`

## Capabilities

### New Capabilities

- `room-crud`: Full create, read, update, delete lifecycle for Room entities, including relations to Floor, RoomType, RoomStatus, and Amenity

### Modified Capabilities

*(none)*

## Impact

- **API**: New route handlers at `app/api/rooms/` and `app/api/rooms/[id]/`
- **Service**: `common/services/roomService.ts` (new file)
- **Modules**: `modules/rooms/` directory with components and hooks
- **Pages**: `app/[locale]/(main)/rooms/page.tsx`
- **Navigation**: `configs/navigation.config.ts` — new entry for Rooms
- **Permissions**: `common/constants/permissions.ts` — `ROOMS_*` permission constants required
- **Dependencies**: No new packages; relies on existing Prisma, React Query, Ant Design, next-intl
- **Prisma migration required**: Add `basePrice Decimal? @db.Decimal(12,2)` to `Room`; create new `RoomImage` model (`id`, `roomId`, `url`, `order`, `createdAt`) with `Room` relation
- **Image storage**: Room images stored under `public/uploads/rooms/[roomId]/` and served as static assets; URL saved in `RoomImage.url`
