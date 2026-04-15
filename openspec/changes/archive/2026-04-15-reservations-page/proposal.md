## Why

The reservations page is the management screen for existing bookings, but it is currently not useful: there are no filters so staff cannot find a specific reservation, clicking the eye icon navigates away from the page instead of showing a quick summary, there is no way to act on a booking without loading a separate page, there is no summary of the current reservation mix, and there is no way to export the list. Five new capabilities close these gaps while maintaining the clear boundary with `room-map` (operational, room-centric) and the existing detail page (full operational view).

## What Changes

- Add a **reservation detail modal** that opens when a row is clicked — shows booking info and exposes Edit and Cancel actions without navigating away
- Add a **reservation summary section** above the table — counts grouped by booking status and room type so staff can read the current mix at a glance
- Add a **filter bar** — status, check-in date range, room type, and guest name / booking number search
- Add an **Excel export** button that downloads the currently filtered list
- Add **payment status** and **note** columns to the reservations table
- Keep the **edit booking** flow (safe metadata fields only) accessible from within the detail modal
- Fix the **reservation detail page** compliance issues (`App.useApp()`, `<PriceDisplay>`, i18n)
- Remove the non-functional **"New Booking" button** from the page header

## Capabilities

### New Capabilities

- `reservation-detail-modal`: A `Modal` component that opens when a table row or eye icon is clicked. Displays booking summary (room, guest, dates, occupancy, pricing, payment status, note). Provides two management actions: **Edit** (opens `BookingEditModal`) and **Cancel Reservation** (confirm dialog → sets CANCELLED status via `PUT /api/bookings/[id]`). Cancel is only available for reservations that have not yet started check-in (PENDING and CONFIRMED statuses only). Includes a "View full details" link to the existing `/reservations/[id]` page for operational actions.
- `reservation-summary`: A summary area above the table with stat cards showing reservation counts grouped by booking status and by room type. Counts cover **all** bookings within a selected time scope (day / week / month / year) including CANCELLED and CHECKED_OUT, backed by a new `GET /api/bookings/stats` endpoint. Staff switches the time scope via a Segmented control. Stats are not tied to the filter bar state.
- `reservation-excel-export`: An Export button on the reservations page that downloads the currently filtered list as an `.xlsx` file. The export reflects all active filters and includes **all matching records** (not just the current page), fetched by extending `GET /api/bookings` with an `export=1` parameter that bypasses pagination. Uses the `xlsx` package (client-side). Columns defined in design.

### Updated Capabilities

- `reservation-list-filters`: Filter bar updated to include **room type** in addition to status, check-in date range, and search. Requires `roomTypeId` filter support to be added to `GET /api/bookings`.
- `booking-edit`: Renamed from drawer to modal (`BookingEditModal`). Triggered from within `ReservationDetailModal` (not directly from the table row). Same safe-metadata field set. Room and date fields remain read-only.

### Modified Capabilities

*(none — no existing spec-level requirements are changing)*

## Assumptions

- Booking creation remains in `room-map` for this phase.
- The stats endpoint shows global counts independent of the filter bar (not scoped to current filter state).
- Cancel booking is implemented by updating `bookingStatusId` to the CANCELLED status via the existing `PUT /api/bookings/[id]` endpoint. No dedicated cancel endpoint is required. Cancellation is only permitted for bookings whose stay has not yet started — PENDING and CONFIRMED statuses only. CHECKED_IN, CHECKED_OUT, and already-CANCELLED bookings cannot be cancelled.
- The existing `/reservations/[id]` detail page remains unchanged in structure; it continues to be the surface for check-in, check-out, and service management. The detail modal links to it.
- No audit-log / booking-history table exists in the current schema; no history UI is added.

## Deferred

- Creating bookings from the reservations page
- Editing room assignment or stay dates (requires overlap re-validation in `PUT /api/bookings/[id]`)
- Scoping stats to match the current filter bar state
- Server-side Excel export endpoint (current design uses client-side xlsx)

## Impact

- **New API:** `GET /api/bookings/stats` — counts grouped by status and room type
- **Updated API:** `GET /api/bookings` — add `checkInFrom`, `checkInTo`, `roomTypeId` filter support
- `modules/reservations/components/` — new `ReservationDetailModal.tsx`, `BookingEditModal.tsx`, `ReservationSummary.tsx`; updated `ReservationTable.tsx` (new columns, row click handler, export button)
- `modules/reservations/hooks/` — new `useUpdateBooking.ts`, `useCancelBooking.ts`, `useBookingStats.ts`
- `app/[locale]/(main)/reservations/page.tsx` — compose summary + filters + table + modals, remove New Booking button
- `app/[locale]/(main)/reservations/[id]/page.tsx` — `App.useApp()` toasts, `<PriceDisplay>`, i18n
- `messages/en.json` + `messages/vi.json` — new keys for modal sections, actions, summary labels, export
- **New dependency:** `xlsx` package
