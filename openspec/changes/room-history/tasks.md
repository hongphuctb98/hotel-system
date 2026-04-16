## 1. Schema — AuditLog model

- [x] 1.1 Add `AuditLog` model to `prisma/schema.prisma` with fields: `id` (cuid PK), `userId` (String?, relation to User), `action` (String), `entityType` (String), `entityId` (String), `roomId` (String?), `oldValues` (Json?), `newValues` (Json?), `ipAddress` (String?), `createdAt` (DateTime @default(now())); map to `@@map("audit_logs")`; add index on `(entityType, entityId)` and index on `roomId`
- [x] 1.2 Run `npm run db:migrate` to create the `audit_logs` table
- [x] 1.3 Run `npm run db:generate` to regenerate the Prisma client, then restart the dev server

## 2. Write Utility

- [x] 2.1 Create `lib/audit.ts` — export `writeAudit(params: { userId?: string | null; action: string; entityType: string; entityId: string; roomId?: string | null; oldValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null; ipAddress?: string | null; })` that calls `prisma.auditLog.create(...)` inside a `try/catch` that only `console.error`s on failure (never re-throws)

## 3. Read API

- [x] 3.1 Create `app/api/audit-log/route.ts` — `GET` handler that reads `entityType`, `entityId`, `roomId`, `page`, `limit` from query params; builds a Prisma `where` clause; returns `ok(records, { total, page, limit, totalPages })` sorted by `createdAt desc`

## 4. Instrument Route Handlers

- [x] 4.1 `app/api/bookings/route.ts` `POST` — after `booking` is created, call `writeAudit({ action: "CREATE", entityType: "BOOKING", entityId: booking.id, roomId: booking.roomId, newValues: { bookingNumber, checkInDate, checkOutDate, chargeType, baseRate } })`
- [x] 4.2 `app/api/bookings/[id]/cancel/route.ts` — after cancel transaction, call `writeAudit({ action: "CANCEL", entityType: "BOOKING", entityId: id, roomId: booking.roomId })`
- [x] 4.3 `app/api/bookings/[id]/checkin/route.ts` — after status update, call `writeAudit({ action: "CHECK_IN", entityType: "BOOKING", entityId: id, roomId: booking.roomId })`
- [x] 4.4 `app/api/bookings/[id]/checkout/route.ts` — after status update, call `writeAudit({ action: "CHECK_OUT", entityType: "BOOKING", entityId: id, roomId: booking.roomId })`
- [x] 4.5 `app/api/invoices/[id]/payments/route.ts` (or wherever payments are created) — after payment is created, call `writeAudit({ action: "PAYMENT", entityType: "PAYMENT", entityId: payment.id, newValues: { amount, paymentMethodId } })`
- [x] 4.6 `app/api/rooms/[id]/route.ts` `PUT` — after room status update (when `roomStatusId` changes), call `writeAudit({ action: "UPDATE", entityType: "ROOM", entityId: id, roomId: id, oldValues: { roomStatusId: prev }, newValues: { roomStatusId: next } })`

## 5. Room History Page — Rewrite to use Audit API

- [x] 5.1 Rewrite `modules/rooms/components/RoomHistoryContent.tsx` to fetch from `GET /api/audit-log?roomId=<id>` instead of `GET /api/bookings?roomId=<id>`; columns: Timestamp, Action, Entity Type, Summary (render `newValues` as a compact description), Actor
- [x] 5.2 Update the empty-state message to note that history is only available from the point the feature was enabled

## 6. Already-done tasks (kept from prior scope)

- [x] 6.1 `app/api/bookings/route.ts` — `roomId` filter added to GET handler
- [x] 6.2 `common/constants/routes.ts` — `ROOM_HISTORY` helper added
- [x] 6.3 `app/[locale]/(main)/rooms/[id]/history/page.tsx` — page created (shell is still valid)
- [x] 6.4 `modules/rooms/components/RoomTable.tsx` — `IconHistory` button added, navigates to history page
- [x] 6.5 `messages/en.json` + `messages/vi.json` — room history i18n keys added
