## Context

The application has ~8 API route handlers that perform state-changing operations with no audit trail. The room history page was the trigger, but the underlying need is a general-purpose event log that can answer "who did what, to which entity, and when" across the whole system.

The `prisma/schema.prisma` currently has no audit model. All key mutation routes live under `app/api/bookings/`, `app/api/bookings/[id]/cancel|checkin|checkout`, `app/api/invoices/[id]/payments`, and `app/api/rooms/[id]`.

## Goals / Non-Goals

**Goals:**
- Single `AuditLog` table that records the actor, action, entity, and a JSON diff of values
- `writeAudit()` utility callable from any route handler with no coupling to business logic
- `GET /api/audit-log` endpoint queryable by `entityType` + `entityId` (paginated)
- Room history page powered by audit records (entity_type = BOOKING where room matches, plus entity_type = ROOM)
- Foundation that future views (booking timeline, invoice history, user activity) can reuse without schema changes

**Non-Goals:**
- Real-time streaming or websocket push of audit events
- Audit log UI outside the room history page (future work)
- Immutable / append-only enforcement at the DB level (acceptable for hotel scale)

## Decisions

**1. Schema — flat vs. event-sourced**

A full event-sourcing approach (reconstitute state from events) is overkill for a hotel PMS. A simple append-only log table is the right trade-off: easy to query, easy to write, easy to understand.

**Decision: flat `AuditLog` table with JSON `oldValues`/`newValues` diff columns.**

**2. Schema fields**

```
AuditLog
  id          cuid (PK)
  userId      String?        -- nullable: system-initiated actions (migrations, cron) have no user
  action      String         -- CREATE | UPDATE | DELETE | CHECK_IN | CHECK_OUT | CANCEL | PAYMENT
  entityType  String         -- BOOKING | ROOM | INVOICE | PAYMENT | SERVICE
  entityId    String         -- UUID of the affected record
  roomId      String?        -- denormalised: set for booking/room events to enable fast room-scoped queries
  oldValues   Json?          -- snapshot before change (null for CREATE)
  newValues   Json?          -- snapshot after change (null for DELETE)
  ipAddress   String?
  createdAt   DateTime       @default(now())
  
  user  User? @relation(fields: [userId], references: [id])
```

**Why `roomId` as a denormalised column?** Without it, querying "all audit events for room X" requires a subquery through the Booking table (`WHERE entityId IN (SELECT id FROM bookings WHERE roomId = X)`). Denormalising `roomId` into the audit row gives a simple indexed lookup on a single column, at the cost of one extra write per booking-related event. At hotel volumes this is the right trade-off.

**3. Where to get the actor (userId)**

Route handlers already call `getAuthUser()` from `lib/auth.ts` in the `(main)` layout but individual API routes don't currently verify the session. Options:
- Read the `access_token` cookie in `writeAudit()` itself (decoupled, no handler changes)
- Pass `userId` explicitly from each call site (explicit, testable)

**Decision: pass `userId` explicitly from each call site.** The handler already knows the entity it mutated; passing `userId` is one extra line and avoids a hidden dependency on cookie state inside the utility.

For now, `userId` is `null` until the route handlers add session verification. The column is nullable so this is safe — audit records will simply show no actor until that work is done. (Adding session verification to route handlers is explicitly out of scope for this change.)

**4. `writeAudit()` failure mode**

If the audit write fails (DB error, connection timeout), the primary operation has already succeeded. The audit write must never roll back the business transaction.

**Decision: `writeAudit()` catches its own errors and logs them via `console.error` — it never re-throws.** This means the audit log is "best effort" for now, acceptable for the current scale.

**5. `GET /api/audit-log` query shape**

```
GET /api/audit-log?entityType=BOOKING&entityId=<id>&page=1&limit=20
GET /api/audit-log?roomId=<id>&page=1&limit=20   ← room history shortcut
```

The `roomId` shortcut queries `WHERE roomId = ?` directly (using the denormalised column from decision 2).

**6. Room history page data source**

The page queries `GET /api/audit-log?roomId=<id>` instead of `GET /api/bookings?roomId=<id>`. This gives a richer timeline — not just "what bookings existed" but "what happened to each booking and to the room itself".

The already-implemented `roomId` filter on `GET /api/bookings` is still useful for the reservations/billing modules and can stay.

## Risks / Trade-offs

- **Retroactive history**: Events that happened before this feature is deployed will not appear in the audit log. The room history page will show an empty state for rooms with no post-deploy events. Mitigation: document this clearly in the UI ("History recorded from [date]").
- **JSON diff size**: Storing full entity snapshots in `oldValues`/`newValues` can grow large for bookings with many services. Mitigation: only store the fields that changed (a diff), not the full entity. Keep snapshots small (primitive fields only, no nested relations).
- **`userId` is null initially**: Until route handlers verify sessions, all audit records will have `userId = null`. Acceptable for now — the action and entity are the most important fields.

## Migration Plan

1. Add `AuditLog` model to `prisma/schema.prisma`
2. `npm run db:migrate` → creates `audit_logs` table
3. `npm run db:generate` → regenerates Prisma client
4. Restart dev server
5. Add `writeAudit()` utility at `lib/audit.ts`
6. Add `GET /api/audit-log` route handler
7. Instrument each route handler (fire-and-forget, no business logic changes)
8. Rewrite room history content component to consume audit API
