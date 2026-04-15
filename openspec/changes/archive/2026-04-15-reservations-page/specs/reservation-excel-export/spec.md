## ADDED Requirements

### Requirement: Staff can export the filtered reservation list to Excel
The reservations page SHALL provide an Export button that generates and downloads an `.xlsx` file containing the currently filtered list of reservations. The export SHALL reflect all active filters exactly (status, date range, room type, search) and SHALL include **all matching records** regardless of the current page.

**How all rows are fetched:** The export calls `GET /api/bookings` with the same filter parameters currently active on the page, plus an `export=1` parameter. When `export=1` is present the API skips pagination (`skip` / `take`) and returns all records matching the `where` clause. This is not a separate endpoint — it is a mode flag on the existing list endpoint.

Export is generated client-side using the `xlsx` package. The download is triggered via a browser Blob URL.

**Exported columns (in order):** Booking #, Guest Name, Room Number, Room Type, Floor, Check-in Date, Check-out Date, Nights, Adults, Children, Booking Status (name from master data), Charge Type, Base Rate (VND), Total Amount (VND), Payment Status, Source, Note.

Dates are formatted as `YYYY-MM-DD`. Monetary values are plain numbers (no currency symbol). Booking Status in the export uses `bookingStatus.name` from the master record (not the `code`). The filename is `reservations-YYYY-MM-DD.xlsx` using the export date.

#### Scenario: Export button triggers download
- **WHEN** staff clicks the Export button
- **THEN** an `.xlsx` file is downloaded with the filename `reservations-<today's-date>.xlsx`

#### Scenario: Export reflects current filters exactly
- **WHEN** a filter is active (e.g., status = CONFIRMED, check-in range = Apr 2026)
- **THEN** the exported file contains only the bookings matching that exact filter combination

#### Scenario: Export includes all matching records across all pages
- **WHEN** the filtered list spans multiple pages
- **THEN** the exported file contains every matching record, fetched via the `export=1` parameter that bypasses pagination

#### Scenario: Loading state during export fetch
- **WHEN** the export fetch is in flight (API call + xlsx generation)
- **THEN** the Export button shows a loading spinner and is disabled until the download is ready

#### Scenario: Booking status uses master-data name
- **WHEN** the export file is opened
- **THEN** the Booking Status column shows the human-readable status name (e.g., "Confirmed") not the system code (e.g., "CONFIRMED")

#### Scenario: Monetary values are plain numbers
- **WHEN** the export file is opened in Excel
- **THEN** Base Rate and Total Amount cells contain numeric values so they can be summed and sorted natively
