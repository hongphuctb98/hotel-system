## ADDED Requirements

### Requirement: Audit log schema
The system SHALL have an `AuditLog` table that persists a record for every instrumented state-changing operation. Each record SHALL capture: a unique ID, an optional actor user ID (`userId`), an action label (`action`), the type of entity affected (`entityType`), the ID of the affected entity (`entityId`), an optional denormalised `roomId` for room-scoped queries, an optional JSON snapshot of values before the change (`oldValues`), an optional JSON snapshot of values after the change (`newValues`), an optional IP address, and a creation timestamp.

#### Scenario: Audit record created on booking creation
- **WHEN** a new booking is created via `POST /api/bookings`
- **THEN** an `AuditLog` record is created with `action = "CREATE"`, `entityType = "BOOKING"`, `entityId = booking.id`, `roomId = booking.roomId`, `newValues` containing the booking's key fields, and `oldValues = null`

#### Scenario: Audit record created on booking status transition
- **WHEN** a booking is checked in, checked out, or cancelled
- **THEN** an `AuditLog` record is created with the appropriate `action` (CHECK_IN / CHECK_OUT / CANCEL), `entityType = "BOOKING"`, `entityId = booking.id`, and `roomId = booking.roomId`

#### Scenario: Audit record created on payment
- **WHEN** a payment is recorded against an invoice
- **THEN** an `AuditLog` record is created with `action = "PAYMENT"`, `entityType = "PAYMENT"`, `entityId = payment.id`, and `newValues` containing the payment amount and method

#### Scenario: Audit record created on room status change
- **WHEN** a room's status is changed (clean, mark available, mark maintenance)
- **THEN** an `AuditLog` record is created with `action = "UPDATE"`, `entityType = "ROOM"`, `entityId = room.id`, `roomId = room.id`, `oldValues` containing the previous status, and `newValues` containing the new status

### Requirement: Audit log write utility
The system SHALL provide a `writeAudit(params)` server-side utility function that persists an `AuditLog` record. The function SHALL catch and log its own errors without re-throwing, so that a failure to write an audit record never causes the primary business operation to fail.

#### Scenario: Audit write failure does not affect primary operation
- **WHEN** the database is temporarily unavailable during an audit write
- **THEN** the primary API response (e.g. booking creation) succeeds and the error is logged to the console

### Requirement: Audit log read API
The system SHALL provide a `GET /api/audit-log` endpoint that returns a paginated list of `AuditLog` records. The endpoint SHALL support the following query parameters: `entityType`, `entityId`, `roomId`, `page`, `limit`. Records SHALL be returned sorted newest-first (`createdAt DESC`). The endpoint SHALL return standard `ApiResponse<AuditLog[]>` with pagination metadata.

#### Scenario: Query by entityType and entityId
- **WHEN** `GET /api/audit-log?entityType=BOOKING&entityId=<id>` is called
- **THEN** only audit records for that specific booking are returned, paginated

#### Scenario: Query by roomId
- **WHEN** `GET /api/audit-log?roomId=<id>&page=1&limit=20` is called
- **THEN** all audit records with `roomId` matching are returned, newest-first, paginated

#### Scenario: No matching records returns empty list
- **WHEN** the query matches no audit records
- **THEN** the response has an empty `data` array and `meta.total = 0`

### Requirement: Room history page powered by audit log
The system SHALL display a room history page at `/rooms/[id]/history` that shows audit records for the given room (queried via `GET /api/audit-log?roomId=<id>`). The page SHALL show: timestamp, action label, entity type, a human-readable summary of what changed (`newValues`), and the actor user ID if available. The page SHALL be read-only and paginated.

#### Scenario: Room history shows audit events in reverse chronological order
- **WHEN** user navigates to `/rooms/[id]/history`
- **THEN** audit records with `roomId` equal to that room are listed newest-first

#### Scenario: Empty state when no audit events exist
- **WHEN** a room has no audit records (e.g. pre-dates the feature)
- **THEN** the page shows an empty-state message explaining that history is recorded from the point the feature was enabled

### Requirement: History icon in rooms table
The system SHALL display a history icon button in the actions column of the rooms table (`/rooms` page) for every room row. Clicking the button SHALL navigate to `/rooms/[id]/history`. The button SHALL be visible to all authenticated roles.

#### Scenario: History icon navigates to the room history page
- **WHEN** user clicks the history icon for a room in the rooms table
- **THEN** the browser navigates to `/[locale]/rooms/[id]/history`
