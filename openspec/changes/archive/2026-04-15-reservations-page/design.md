## Context

The reservations page (`/[locale]/reservations`) renders a `ReservationTable` driven by `useReservations`. The existing `GET /api/bookings` endpoint only handles two of the needed filters (`bookingStatusId`, `search`); `checkInFrom`, `checkInTo`, and `roomTypeId` are not yet implemented despite being present in the `BookingFilters` type. The `PUT /api/bookings/[id]` endpoint accepts partial updates but does not re-validate room overlap. No stats endpoint exists. No `xlsx` package is installed.

**Module boundary — reservations-page vs room-map vs detail page:**

| Concern | Owner |
|---|---|
| Creating a new booking (room-centric, fast) | `room-map` |
| Check-in / Check-out / Room status transitions | `room-map` (primary) + `/reservations/[id]` page (secondary) |
| Adding / removing services | `/reservations/[id]` detail page |
| Searching, filtering, and browsing all reservations | `reservations-page` |
| Quick booking summary and management actions (edit, cancel) | `reservations-page` — `ReservationDetailModal` |
| Current reservation mix at a glance | `reservations-page` — `ReservationSummary` |
| Bulk export of the filtered list | `reservations-page` |

The `ReservationDetailModal` is a new component in `modules/reservations/`. It does **not** reuse `RoomDetailModal` or `useRoomModalActions` — it shares visual language (Ant Design `Modal`, `Descriptions`, `StatusBadge`) but has its own business logic scoped to reservation management.

## Goals / Non-Goals

**Goals:**
- Filter bar on `ReservationTable` — status, check-in date range, room type, and search text wired to `useReservations`
- `BookingEditModal` — an edit-only modal for safe metadata fields on an existing booking, using a modal pattern consistent with the Room Map UI
- Fix detail page compliance: `App.useApp()` toasts, `<PriceDisplay>`, and i18n for hard-coded labels
- `ReservationDetailModal` — quick-view modal with Edit and Cancel actions
- `ReservationSummary` — global stat cards above the table (by status, by room type)
- Excel export of the filtered list
- Payment status and note columns in the reservations table

**Non-Goals:**
- Creating new bookings from the reservations page
- Online bookings without an assigned room (separate future change)
- Editing room assignment or stay dates — `PUT /api/bookings/[id]` does not re-run overlap validation; exposing these fields would allow silent double-bookings
- Check-in, check-out, add-service, remove-service (operational — stay on the detail page)
- Audit log / booking change history (no `BookingHistory` table in the current schema)
- Stats scoped to the active filter bar state (stats use an independent time scope, not the list filters)
- Server-side xlsx generation
- Timeline / Gantt view (placeholder stays)

## Decisions

### D1: `ReservationDetailModal` — separate from `RoomDetailModal`
The reservation detail modal is a new standalone component. It shares visual patterns (Ant Design `Modal`, `Descriptions`, `Tag`, action buttons) but owns no room-map logic. The Room Map modal is room-centric (shows room status, allows check-in/out); the reservation modal is booking-centric (shows booking data, allows edit/cancel). Coupling them would entangle two distinct concerns across two modules.

**Alternative considered:** Extend `RoomDetailModal` with a "reservation management" tab. Rejected — the modals have different entry points, different data sources, and different allowed actions. Shared code would be a leaky abstraction.

### D2: `BookingEditModal` triggered from `ReservationDetailModal`
Edit is a secondary action, not a primary table action. The flow is: click row → see detail → click Edit → edit modal opens (detail modal stays mounted but visually replaced). This matches the Room Map pattern where modals stack for secondary actions.

**Alternative considered:** Direct edit icon on each table row. Rejected — skipping the detail view loses context; staff are more likely to edit after reviewing the current state.

### D3: Cancel booking — pre-check-in rule, update status via existing PUT endpoint
**Rule:** Cancellation means the reservation is deleted/voided before the stay begins. A booking can only be cancelled when it is in a pre-check-in state: **PENDING** (awaiting confirmation) or **CONFIRMED** (confirmed but not started). Once a booking reaches CHECKED_IN the stay has begun and cancellation is no longer permitted. CHECKED_OUT (stay completed) and CANCELLED (already cancelled) are also ineligible. This rule is enforced client-side in the UI (the Cancel button is not rendered for ineligible statuses). The API does not enforce it for this phase.

Cancel sets `bookingStatusId` to the CANCELLED status ID looked up from `useMasterData().bookingStatuses` (the `code === "CANCELLED"` entry). No new API endpoint is needed.

**Alternative considered:** Dedicated `POST /api/bookings/[id]/cancel` endpoint with server-side status validation. Rejected for this phase — unnecessary overhead; backend enforcement is deferred.

### D4: Stats endpoint — time-scoped, all statuses, independent of filter bar
`GET /api/bookings/stats?scope=day|week|month|year` returns counts grouped by booking status and by room type for all bookings whose `checkInDate` falls within the selected time window. All booking statuses are included — PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, and CANCELLED. This is reporting data; excluding terminal statuses would undercount the true reservation volume.

**Time windows (relative to the current server date):**
- `day` — today's date
- `week` — Monday through Sunday of the current week
- `month` — first through last day of the current month
- `year` — January 1 through December 31 of the current year

Default scope is `month`. Staff switches scope via a Segmented control (`day / week / month / year`) rendered inside `ReservationSummary`. Changing the scope refetches `useBookingStats`. Stats are independent of the filter bar state — they always reflect the chosen time window across all bookings.

**Date field:** `checkInDate` is used as the anchor. This gives front-desk staff a forward-looking picture of which bookings are arriving in the selected period, regardless of when the bookings were created.

**Alternative considered:** Stats scoped to the current filter bar state. Rejected — conflating the summary scope with the list filter is confusing for staff; the summary is an overview panel, not a filter reflection.

### D5: Client-side Excel export — export=1 parameter bypasses pagination
The export must reflect the exact filters currently applied on the reservations page and must include **all matching records**, not just the visible page. The mechanism: extend `GET /api/bookings` to accept an `export=1` query parameter. When present, the route handler skips `skip`/`take` (pagination) and returns all records matching the current `where` clause. The client calls this endpoint with the same `BookingFilters` it uses for the list, passes `export=1`, awaits the full response, then generates the `.xlsx` file using the `xlsx` package and triggers a browser download.

This approach has no new endpoint to maintain, is consistent with the existing filter implementation, and is correct for hotel-scale data (hundreds to low thousands of records).

**Exported columns (in order):** Booking #, Guest Name, Room Number, Room Type, Floor, Check-in Date, Check-out Date, Nights, Adults, Children, Booking Status, Charge Type, Base Rate (VND), Total Amount (VND), Payment Status, Source, Note. Dates formatted `YYYY-MM-DD`; monetary values are plain numbers. Filename: `reservations-YYYY-MM-DD.xlsx`.

**Alternative considered:** Server-side streaming export endpoint. Deferred — adds backend complexity with no current benefit at hotel scale.

### D6: Filter state owned by the page, not `ReservationTable`
Because both the export button (page-level) and the filter bar (table-level) need to share the active filter state, the filter state is lifted to the page component. `ReservationTable` and the export button receive filters as props. This is a change from the previous design where filters were colocated inside the table.

### D7: Implement missing API filters in `GET /api/bookings`
`checkInFrom`, `checkInTo` (already in `BookingFilters` type but not implemented server-side), and the new `roomTypeId` filter all need to be wired in the route handler. This is a required backend task. The Prisma `where` clause extensions: `checkInDate: { gte: checkInFrom }`, `checkOutDate: { lte: checkInTo }` (note: using `checkInDate` range, not `checkOutDate`), and `room: { roomTypeId }`.

### D8: Payment status derivation (client-side)
The bookings list already includes `invoices` in the response. Payment status is derived in the table column render: no invoice → `—`, invoice with `isPaid: true` → Paid (green), invoice with `isPaid: false` → Unpaid (orange). No API change needed.

### D9: All categorized display values use master data — no hard-coded labels
Any field that maps to a master data record must display that record's `name` (and `color` where applicable) rather than a hard-coded string. Concretely:
- **Booking status** — use `booking.bookingStatus.name` and `booking.bookingStatus.color` via `StatusBadge`. Never render the status `code` directly.
- **Room type** — use `booking.room.roomType.name` from the included relation.
- **Floor** — use `booking.room.floor.name`.
- **Charge type** — `chargeType` is a plain string field (`"nightly"` / `"hourly"`), not a master data table; labels are i18n keys (`booking.nightly`, `booking.hourly`).
- **Payment status** — `isPaid` is a boolean with no master data table; labels are i18n keys (`booking.paid`, `booking.unpaid`, `booking.noInvoice`). This is the only categorized display field that cannot be backed by master data.

This rule applies to the modal, table columns, export column values, and the summary section.

## Risks / Trade-offs

- [Room / date editing blocked by missing overlap validation] → Mitigated by read-only labels in the edit modal. Documented as deferred; fix requires adding overlap logic to `PUT /api/bookings/[id]`.
- [Cancel is client-side guarded only] → Staff with direct API access could cancel a CHECKED_IN booking via the API. Low risk in a controlled hotel environment; server-side status validation is deferred.
- [Export `export=1` returns unbounded results] → For hotel-scale data (hundreds to low thousands) this is fine. If the dataset grows large the route should add a hard cap or be replaced with a streaming endpoint.
- [Stats refetch on scope change] → Each Segmented control switch triggers a new API call; use `staleTime: 30_000` per scope key so rapid toggling does not hammer the endpoint.
- [Stats `checkInDate` window may exclude walk-ins created and checked in same-day if the booking is created with a past check-in date] → Acceptable; front-desk walk-ins via room-map will have today's check-in date so they appear in the `day` scope correctly.
- [i18n keys] → New keys must land in both `messages/en.json` and `messages/vi.json` in the same task.
