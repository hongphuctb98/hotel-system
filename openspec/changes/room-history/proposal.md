## Why

The application has no record of *who changed what and when*. Room history was requested as the immediate need, but every operational surface — bookings, invoices, payments, room status transitions — shares the same gap. Building a narrow "room history" from the Booking table solves one symptom while leaving the rest unaddressed. A single audit log table solves them all.

## What Changes

- Add an `AuditLog` table to the database to record important create / update / delete / status-transition events across the application
- Add a `writeAudit()` server utility that route handlers call to persist audit records
- Instrument the key API routes: booking lifecycle (create, update, cancel, check-in, check-out), payment recorded, invoice created, room status changed
- Add `GET /api/audit-log` endpoint to query audit records by entity type and entity ID, with pagination
- Build a room history page (`/rooms/[id]/history`) that displays audit records associated with that room and its bookings — sourced from the audit log, not directly from the Booking table
- The same audit API can power future history views for bookings, invoices, and users

## Capabilities

### New Capabilities

- `audit-log`: Persistent audit trail — schema, write utility, read API, and the first history view (room history page) powered by audit records

### Modified Capabilities

*(none — no existing specs change their requirements)*

## Impact

- **Schema**: New `AuditLog` model in `prisma/schema.prisma`; requires `db:migrate` + `db:generate` + dev-server restart
- **API**: New `GET /api/audit-log` route; instrumentation added to ~8 existing route handlers
- **UI**: Room history page (`/rooms/[id]/history`) rewritten to consume audit records; history icon in `RoomTable` remains unchanged
- **No breaking changes** to existing API contracts — audit writes are fire-and-forget side effects
