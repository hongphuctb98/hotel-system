## ADDED Requirements

### Requirement: GET /api/staff accepts a hasAccount filter
The `GET /api/staff` route SHALL accept an optional `hasAccount` query parameter (`"true"` or `"false"`) to filter results to staff members with or without a linked login account.

#### Scenario: Filter to staff with accounts
- **WHEN** `GET /api/staff?hasAccount=true` is called
- **THEN** the response includes only staff where `userId IS NOT NULL`

#### Scenario: Filter to staff without accounts
- **WHEN** `GET /api/staff?hasAccount=false` is called
- **THEN** the response includes only staff where `userId IS NULL`

#### Scenario: No hasAccount param — behavior unchanged
- **WHEN** `GET /api/staff` is called without `hasAccount`
- **THEN** the response returns all staff matching existing filters (no change to current behavior)

#### Scenario: hasAccount filter composes with showInactive filter
- **WHEN** `GET /api/staff?hasAccount=false&showInactive=false` is called
- **THEN** the response includes only active staff members without linked accounts
