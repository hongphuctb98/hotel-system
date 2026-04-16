## ADDED Requirements

### Requirement: Hotel settings stores hotel identity fields
The `HotelSettings` record SHALL support four optional identity fields: `hotelName`, `address`, `phone`, and `email`. All four SHALL be nullable strings with no default value.

#### Scenario: Fields persist after save
- **WHEN** an admin saves `hotelName`, `address`, `phone`, and `email` via the settings API
- **THEN** subsequent reads of `GET /api/settings` SHALL return the saved values

#### Scenario: Null fields return null in API response
- **WHEN** one or more identity fields have not been set
- **THEN** `GET /api/settings` SHALL return `null` for those fields (not omit them from the response)

---

### Requirement: Settings API returns hotel identity fields
`GET /api/settings` SHALL include `hotelName`, `address`, `phone`, and `email` in its response payload alongside the existing `timezone` field.

#### Scenario: Response shape includes all identity fields
- **WHEN** `GET /api/settings` is called
- **THEN** the response data SHALL contain `timezone`, `hotelName`, `address`, `phone`, and `email`
