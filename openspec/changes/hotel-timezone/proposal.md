## Why

HotelOS has no authoritative hotel timezone. Date input and display depend on the browser's local timezone, so staff in different countries or on different devices see different check-in and check-out times for the same booking. This causes scheduling errors and makes the system unreliable for multi-location or remote access. The hotel must own one configured timezone that all booking logic defers to.

## What Changes

- A hotel timezone setting is stored in the system and configurable by admins.
- All booking date input (datepickers) is interpreted in the hotel timezone, not the browser timezone.
- All booking date display (tables, modals, detail pages) is rendered in the hotel timezone.
- Dates continue to be stored in UTC; the hotel timezone governs how they are read and written, not what is stored.
- The hotel timezone is available to both server-side logic and client-side UI without each component resolving it independently.

## Capabilities

### New Capabilities

- `hotel-timezone-setting`: Admin-facing setting to view and update the hotel's configured timezone. Includes the backing API to persist and retrieve it.
- `hotel-timezone-provider`: A mechanism for client-side UI components to access the configured hotel timezone without per-component fetching or prop drilling.
- `booking-date-utils`: Shared date utilities that interpret and format dates in a given timezone, used consistently across all booking-related UI.

### Modified Capabilities

- `booking-create-edit`: Check-in and check-out datepickers must interpret selected dates in the hotel timezone, not the browser timezone.
- `reservation-list-filters`: The check-in date range filter must match bookings against hotel-timezone calendar dates, not UTC day boundaries.
- `reservation-detail-modal`: Check-in and check-out timestamps must be displayed in the hotel timezone.

## Impact

- **New API**: Hotel settings endpoint for reading and writing the configured timezone.
- **New storage**: The hotel timezone is persisted in the database so it survives restarts and is consistent across all server instances.
- **Affected modules**: room-map (booking form datepickers), reservations (filters, table, detail modal, detail page).
- **Affected layer**: server-side date utilities that currently read timezone from environment must read from the database instead.
