## ADDED Requirements

### Requirement: Summary API endpoint groups readings by lease and month
The system SHALL expose `GET /api/long-term/meter-readings/summary` that returns meter readings pre-grouped by `(leaseId, readingMonth)`. Each result row SHALL include all fee-item readings for that period, the lease status, and the associated TenantBill status (nullable when no bill exists for the period).

#### Scenario: Summary returns grouped data with bill status
- **WHEN** a GET request is made to `/api/long-term/meter-readings/summary?readingMonth=2025-04`
- **THEN** the response SHALL contain one entry per unique `(leaseId, readingMonth)` pair found in that month
- **AND** each entry SHALL include `readings[]` array with all fee-item readings for that lease × month
- **AND** each entry SHALL include `lease` with `{ id, status, room: { number }, guest: { firstName, lastName } }`
- **AND** each entry SHALL include `bill` object if a TenantBill exists for `(leaseId, billingMonth)`, or `null` if none exists
- **AND** the response SHALL include pagination meta `{ total, page, limit, totalPages }` where `total` is the count of unique `(leaseId, readingMonth)` pairs

#### Scenario: Summary filters by leaseId
- **WHEN** a GET request includes `?leaseId=<id>`
- **THEN** only entries for that lease SHALL be returned

#### Scenario: Summary with no readings for a period
- **WHEN** a month is requested but no readings exist for any lease
- **THEN** the response SHALL return an empty `data` array with `total: 0`

### Requirement: Meter readings list groups by lease and month
The meter readings table SHALL display one row per `(leaseId, readingMonth)` pair, not one row per individual reading record.

#### Scenario: Multiple fee items shown in one row
- **WHEN** a lease has 2 metered fee items with readings in the same month
- **THEN** the table SHALL show ONE row for that lease × month
- **AND** both fee-item readings SHALL be visible within that single row (inline list or expandable detail)

#### Scenario: Lease status displayed per row
- **WHEN** a row is rendered
- **THEN** the lease status (ACTIVE, EXPIRED, TERMINATED) SHALL be shown as a colored badge

#### Scenario: Bill status displayed per row when bill exists
- **WHEN** a TenantBill exists for the lease × month
- **THEN** the bill status (DRAFT, PENDING, PARTIAL, PAID) SHALL be shown as a colored badge on that row

#### Scenario: No bill status shown when no bill exists
- **WHEN** no TenantBill exists for the lease × month
- **THEN** the row SHALL display a "No bill" indicator (muted text or badge) so staff know readings exist but billing has not been generated

### Requirement: Edit button hidden for paid periods
The system SHALL prevent editing readings for a period whose bill status is PAID.

#### Scenario: Edit hidden when bill is PAID
- **WHEN** `bill.status === "PAID"` for a given lease × month row
- **THEN** the Edit button for that row SHALL NOT be rendered

#### Scenario: Edit available when bill is DRAFT or PENDING
- **WHEN** `bill.status` is `DRAFT` or `PENDING` (or bill is null)
- **THEN** the Edit button SHALL be visible and functional
