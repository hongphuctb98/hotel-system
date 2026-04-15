## ADDED Requirements

### Requirement: HotelTimezoneProvider supplies hotel timezone to the entire client app
The system SHALL include a `HotelTimezoneProvider` React context provider that fetches the hotel timezone once from `GET /api/settings` on mount and makes it available to all descendant components via the `useHotelTimezone()` hook. The provider SHALL be mounted inside `app/[locale]/layout.tsx` (within the provider tree, after `AntdProvider`). Before the fetch resolves, the provider SHALL supply a default value equal to the `NEXT_PUBLIC_HOTEL_TIMEZONE` environment variable or `Asia/Ho_Chi_Minh` so that components render immediately without a loading state.

#### Scenario: Provider supplies resolved timezone after fetch
- **WHEN** the app mounts and `GET /api/settings` responds successfully
- **THEN** `useHotelTimezone()` returns the IANA timezone string from the server

#### Scenario: Provider supplies fallback timezone before fetch resolves
- **WHEN** a component calls `useHotelTimezone()` before `GET /api/settings` has responded
- **THEN** the hook returns the fallback value (`Asia/Ho_Chi_Minh` or the env default) without throwing or suspending

#### Scenario: Provider supplies fallback on fetch failure
- **WHEN** `GET /api/settings` returns an error or network failure
- **THEN** `useHotelTimezone()` continues to return the fallback value and no unhandled error is thrown

### Requirement: useHotelTimezone hook is usable in any Client Component
The `useHotelTimezone()` hook SHALL be exported from `providers/HotelTimezoneProvider.tsx`. It SHALL return a non-empty IANA timezone string at all times. Calling it outside a `HotelTimezoneProvider` tree SHALL throw a descriptive error in development.

#### Scenario: Hook returns timezone string in a client component
- **WHEN** a Client Component calls `useHotelTimezone()`
- **THEN** it receives a non-empty string usable as a dayjs timezone argument

#### Scenario: Hook throws when used outside provider
- **WHEN** `useHotelTimezone()` is called in a component that is not a descendant of `HotelTimezoneProvider`
- **THEN** an error is thrown with the message "useHotelTimezone must be used within HotelTimezoneProvider"
