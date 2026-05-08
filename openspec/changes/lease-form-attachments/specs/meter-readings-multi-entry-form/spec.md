## ADDED Requirements

### Requirement: Create form accepts multiple fee-item rows for one lease × month
The meter reading create form SHALL allow entering readings for multiple METERED fee items in a single submission for one selected lease and one selected month.

#### Scenario: Form shows dynamic rows for fee items
- **WHEN** the create drawer is opened
- **THEN** the form SHALL contain a dynamic row list where each row has: fee-item selector, previousReading input, currentReading input
- **AND** the user SHALL be able to add rows (up to the number of active METERED fee items) and remove rows

#### Scenario: Form submits all rows as individual API calls
- **WHEN** the user submits the form with N valid rows
- **THEN** the system SHALL call `POST /api/long-term/meter-readings` once per row
- **AND** rows that succeed SHALL be reported as created
- **AND** rows that fail (e.g., 409 `READING_DUPLICATE`) SHALL show a per-row error message without aborting other rows

#### Scenario: Duplicate fee item within the same form
- **WHEN** the user selects the same fee item in two different rows for the same lease × month
- **THEN** the form SHALL display a validation error on the duplicate row before submitting
- **AND** submission SHALL be blocked until duplicates are resolved

### Requirement: Edit form pre-fills all existing readings for a period
When editing an existing lease × month group, the form SHALL load all readings for that period and allow editing each one.

#### Scenario: Edit form opens with all readings pre-filled
- **WHEN** the user clicks Edit on a grouped row (lease × month)
- **THEN** the form SHALL open with one row per existing reading, pre-filled with `previousReading` and `currentReading`
- **AND** lease and month selectors SHALL be disabled (cannot change context)

#### Scenario: Edit submits changed readings via PUT
- **WHEN** the user modifies a reading and submits
- **THEN** the system SHALL call `PUT /api/long-term/meter-readings/[id]` for each changed row
- **AND** unchanged rows SHALL NOT trigger an API call

#### Scenario: Edit blocked for PAID periods
- **WHEN** the bill status for the period is PAID
- **THEN** the Edit button SHALL NOT be rendered on the grouped row (enforced at the list level; see grouped-view spec)

### Requirement: Form validation
The form SHALL enforce the following validation rules before submission.

#### Scenario: Lease required
- **WHEN** the user submits without selecting a lease
- **THEN** the form SHALL display a required field error on the lease selector

#### Scenario: Month required
- **WHEN** the user submits without selecting a month
- **THEN** the form SHALL display a required field error on the month selector

#### Scenario: Fee item required per row
- **WHEN** a row exists but no fee item is selected
- **THEN** the form SHALL display a required field error on that row's fee-item selector

#### Scenario: Current reading must not be less than previous reading
- **WHEN** `currentReading < previousReading` in any row
- **THEN** the form SHALL display a per-row validation error
- **AND** submission SHALL be blocked
