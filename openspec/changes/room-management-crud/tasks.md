## 1. Schema Migration

- [x] 1.1 Add `basePrice Decimal? @db.Decimal(12,2)` field to the `Room` model in `prisma/schema.prisma`
- [x] 1.2 Add `RoomImage` model to `prisma/schema.prisma` with fields: `id` (cuid), `roomId` (String), `url` (String), `order` (Int, default 0), `createdAt`; add `images RoomImage[]` relation to `Room`; add `@@map("room_images")`
- [x] 1.3 Run `npm run db:generate` to regenerate the Prisma client
- [x] 1.4 Run `npm run db:migrate` to apply the migration (name it `add_room_base_price_and_images`)

## 2. Wiring (Permissions, Routes, Navigation, i18n)

- [x] 2.1 Add `ROOMS_VIEW` (`rooms:view`) and `ROOMS_MANAGE` (`rooms:manage`) to `PERMISSIONS` in `common/constants/permissions.ts`
- [x] 2.2 Assign `ROOMS_VIEW` to ADMIN, MANAGER, RECEPTIONIST and `ROOMS_MANAGE` to ADMIN and MANAGER in `ROLE_PERMISSIONS`
- [x] 2.3 Add `ROOMS: "/rooms"` to `ROUTES` in `common/constants/routes.ts`
- [x] 2.4 Add a "Rooms" nav entry (after `room-map`) in `configs/navigation.config.ts` using `ROUTES.ROOMS` and `PERMISSIONS.ROOMS_VIEW`
- [x] 2.5 Add i18n keys for the rooms page to `messages/en.json` (page title, column headers: number/floor/type/status/price/amenities/note; form labels including basePrice and images; action labels; confirm messages; "Show inactive rooms" toggle label)
- [x] 2.6 Add matching i18n keys to `messages/vi.json`

## 3. Types

- [x] 3.1 Add `basePrice?: string | null` and `images: { id: string; url: string; order: number }[]` to the `Room` type in `types/room.types.ts`

## 4. API: Fix Amenity Handling + Inactive Filter + Image Endpoints

- [x] 4.1 Update `GET /api/rooms` (`app/api/rooms/route.ts`) to: (a) accept `showInactive` query param — when `"true"`, omit the `isActive: true` filter; (b) add `images: true` to `roomInclude`
- [x] 4.2 Update `POST /api/rooms` (`app/api/rooms/route.ts`) to accept `amenityIds: string[]` and connect them via `prisma.roomAmenity.createMany` after room creation; also accept and persist `basePrice`
- [x] 4.3 Update `PUT /api/rooms/[id]` (`app/api/rooms/[id]/route.ts`) to: (a) accept `amenityIds?: string[]` and replace amenities using `deleteMany` + `createMany` in a transaction when present; (b) accept and persist `basePrice`; (c) add `images: true` to `roomInclude`
- [x] 4.4 Create `app/api/rooms/[id]/images/route.ts` — `POST` handler: parse `multipart/form-data` using `request.formData()`; write file to `public/uploads/rooms/[roomId]/[uuid].[ext]` using `fs/promises`; create `prisma.roomImage` record; return the new record
- [x] 4.5 Create `app/api/rooms/[id]/images/[imageId]/route.ts` — `DELETE` handler: load `RoomImage` by `imageId`, delete the file from disk with `fs/promises.unlink`, delete the DB record; return `ok({ id: imageId })`

## 5. Service Layer

- [x] 5.1 Add `uploadImage(roomId: string, file: File): Promise<ApiResponse<RoomImage>>` and `deleteImage(roomId: string, imageId: string): Promise<ApiResponse<{ id: string }>>` to `common/services/roomService.ts` using `apiClient` with `FormData` for upload

## 6. React Query Hooks

- [x] 6.1 Create `modules/rooms/hooks/useRooms.ts` — list hook using `useTableQuery` with `floorId`, `roomTypeId`, `statusId`, `showInactive` filters; query key `["rooms"]`
- [x] 6.2 Create `modules/rooms/hooks/useRoom.ts` — single-room hook using `useQuery` calling `roomService.findById`
- [x] 6.3 Create `modules/rooms/hooks/useRoomMutations.ts` — `useCreateRoom`, `useUpdateRoom`, `useDeleteRoom`, `useUploadRoomImage`, `useDeleteRoomImage` mutations. Cache invalidation: all hooks invalidate `["rooms"]`; `useUpdateRoom`, `useUploadRoomImage`, `useDeleteRoomImage` also invalidate `["rooms", id]`; `useDeleteRoom` calls `removeQueries(["rooms", id])`. `handleSubmit` in the drawer additionally calls `invalidateQueries(["rooms", roomId])` after the manual upload loop. Deactivate feedback (`message.success`/`error`) is passed as `onSuccess`/`onError` to `mutate()` at the call site in `RoomTable`, not inside the hook.

## 7. UI Components

- [x] 7.1 Create `modules/rooms/components/RoomFormDrawer.tsx` — Ant Design `Drawer` wrapping a `Form` with fields: room number (`Input`), floor (`Select`), room type (`Select`), room status (`Select`), base price (`InputNumber`, optional), amenities (`Select mode="multiple"`), note (`TextArea`), images (`Upload listType="picture-card"`, calls upload endpoint after room save and delete endpoint on file removal); floor/type/status/amenity options from `useMasterData()`; accepts `room` prop for edit pre-fill; uses `variant="outlined"` not `bordered`. Image handling rules: distinguish pending vs existing via `originFileObj`; optimistically update `fileList` on delete; show `message.success`/`message.error` for delete; invalidate `["rooms"]` after upload loop in `handleSubmit`.
- [x] 7.2 Create `modules/rooms/components/RoomTable.tsx` — uses `App.useApp()` for `message`; deactivate action passes `onSuccess`/`onError` callbacks to `deleteRoom.mutate()` for toast feedback; i18n keys `room.deactivateSuccess` / `room.deactivateFailed` added. — `AppTable` with columns: number, floor, room type, status (`StatusBadge`), price (display `basePrice ?? roomType.defaultPrice` via `useLocaleCurrency`), amenities (`Tag` list), actions (Edit + Deactivate); filter bar above table: Floor/RoomType/RoomStatus selects + "Show inactive" `Switch`; inactive rows visually dimmed via `rowClassName`; edit opens `RoomFormDrawer`; deactivate calls `useConfirm` then delete mutation
- [x] 7.4 Add "Create Room" primary button (with `IconPlus`) at top-right of `RoomTable` filter bar; read `user_role` cookie via `useMemo` and show button only when user has `ROOMS_MANAGE`; clicking opens the existing `RoomFormDrawer` in create mode (`room={null}`); remove the page-level create button and `RoomFormDrawer` from `rooms/page.tsx`
- [x] 7.3 Ensure `RoomTable.tsx` and `RoomFormDrawer.tsx` carry `"use client"` directive

## 8. Page

- [x] 8.1 Create `app/[locale]/(main)/rooms/page.tsx` with `"use client"` directive; compose `AppPageHeader` (with create button guarded by `usePermission(PERMISSIONS.ROOMS_MANAGE)`) and `RoomTable`; manage drawer open/close and selected room state with `useDisclosure`
