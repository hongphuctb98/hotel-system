## ADDED Requirements

### Requirement: Admin can view and update the hotel timezone from the Settings page
The system SHALL provide a Settings page (accessible only to users with ADMIN role) at `/[locale]/settings`. It SHALL display the current hotel timezone and allow the admin to change it by selecting a valid IANA timezone from a searchable Select control. The page SHALL call `GET /api/settings` to load the current value and `PUT /api/settings` with `{ timezone: string }` to save a new value. Only valid IANA timezone strings SHALL be accepted.

#### Scenario: Settings page loads current timezone
- **WHEN** an admin navigates to the Settings page
- **THEN** the page calls `GET /api/settings` and displays the current `timezone` value pre-selected in the Select control

#### Scenario: Admin selects a new timezone and saves
- **WHEN** admin selects a different timezone from the Select and clicks Save
- **THEN** `PUT /api/settings` is called with the new `{ timezone }` payload, a success toast is shown, and the new timezone is reflected in the Select control

#### Scenario: Settings page is not accessible to non-admin roles
- **WHEN** a non-admin user (MANAGER, RECEPTIONIST, HOUSEKEEPING) navigates to `/[locale]/settings`
- **THEN** the page is not rendered (guarded by the permission system) or a 403 response is returned

#### Scenario: Invalid timezone is rejected
- **WHEN** an invalid or unsupported IANA timezone string is submitted to `PUT /api/settings`
- **THEN** the API returns HTTP 400 and the UI shows an error message

### Requirement: GET /api/settings returns current hotel settings
The `GET /api/settings` route SHALL return the current hotel settings object including `timezone`. When no settings row exists in the database, it SHALL fall back to the `HOTEL_TIMEZONE` environment variable (default: `Asia/Ho_Chi_Minh`). This endpoint SHALL NOT require authentication.

#### Scenario: Settings row exists
- **WHEN** `GET /api/settings` is called and the `HotelSettings` singleton row exists
- **THEN** the response is `{ data: { timezone: "<iana-string>" } }` with HTTP 200

#### Scenario: Settings row does not exist (first run)
- **WHEN** `GET /api/settings` is called and no settings row exists in the database
- **THEN** the response returns the fallback timezone from `HOTEL_TIMEZONE` env (or `Asia/Ho_Chi_Minh`) with HTTP 200

### Requirement: PUT /api/settings persists hotel settings
The `PUT /api/settings` route SHALL accept `{ timezone: string }` and upsert the `HotelSettings` singleton row. It SHALL validate that the provided timezone is a valid IANA timezone string. It SHALL require ADMIN role (verified via JWT, not cookie).

#### Scenario: Valid timezone is persisted
- **WHEN** an authenticated ADMIN calls `PUT /api/settings` with a valid IANA timezone (e.g., `Europe/Paris`)
- **THEN** the settings row is upserted, and the response is `{ data: { timezone: "Europe/Paris" } }` with HTTP 200

#### Scenario: Non-admin is rejected
- **WHEN** a non-admin user calls `PUT /api/settings`
- **THEN** the API returns HTTP 403

#### Scenario: Invalid timezone string is rejected
- **WHEN** `PUT /api/settings` is called with `{ timezone: "Not/A_Timezone" }`
- **THEN** the API returns HTTP 400 with a descriptive error message
