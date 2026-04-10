## Context

The Room Map (`modules/room-map/`) currently opens a right-side `AppDrawer` when a room card is clicked. The drawer shows a minimal `Descriptions` table (floor, type, status) and, if a booking exists, the guest name and dates plus Check In / Check Out buttons. No guest search, service management, or payment summary is available in-line.

Receptionists need a single view to: see all room details, search for or enter a guest, add services, set payment info, and complete a check-in — without navigating to the full Reservations module. A centered modal with multiple organized sections fulfils this need within the Room Map context.

Existing relevant APIs:
- `GET /api/rooms` — returns `Room` with `currentBooking` (guest name + dates only)
- `GET /api/guests?search=` — full-text search on `firstName`, `lastName`, `phone`, `idNumber`
- `POST /api/bookings` — creates a booking; accepts `guestId`, `roomId`, `bookingStatusId`, `checkInDate`, `checkOutDate`, `ratePerNight`, `depositAmount`, `source`, `note`
- `POST /api/bookings/[id]/check-in` and `.../check-out` — status transitions
- `GET /api/master/service-items`, `GET /api/master/payment-methods` — master data

Current `Booking` type already has `services: BookingService[]`, `ratePerNight`, `depositAmount`. Missing fields needed: `chargeType` (hourly/nightly/daily), `surcharge`.

## Goals / Non-Goals

**Goals:**
- Replace `RoomActionDrawer` with `RoomDetailModal` (centered, 800–950 px, dark overlay)
- Five-section modal: Room Info, Guest / Check-in, Pricing & Services, Payment, Note
- Guest typeahead (search by name / phone / CCCD), auto-fill, and deduplication on check-in
- Dynamic service rows with unit price and line total derived from master data
- Calculated payment summary (Service Total, Total Payable, Remaining Amount)
- Footer actions driven by room status; view-only mode for Cleaning/Maintenance
- On check-in success: create booking, update room status to Occupied, refresh map

**Non-Goals:**
- Full booking management (that lives in the Reservations module)
- Editing an existing booking's services post-check-in (handled in Billing/Reservations)
- Invoice generation from the modal
- Changes to Room Map grid, filter bar, or navigation

## Decisions

### 1. Modal over Drawer
**Decision**: Centered `Modal` (Ant Design `Modal`) replacing `AppDrawer`.  
**Rationale**: A drawer is appropriate for quick, non-blocking side panels. This interaction requires focused attention (form validation, confirmation) and benefits from an overlay that blocks the map while the operation is in progress. Width 800–950 px accommodates multi-column form layout on desktop without scrolling.  
**Alternative considered**: Keep the drawer but widen it — rejected because drawers always anchor to an edge and cannot center content at arbitrary widths across all breakpoints.

### 2. Component split
**Decision**: Four child components + the modal shell:
- `RoomDetailModal` — modal shell, header badges, section layout, footer buttons
- `GuestSearchSection` — AutoComplete typeahead + manual input fields
- `ServiceItemsSection` — dynamic service rows + subtotal display
- `PaymentSummarySection` — payment fields + calculated totals

**Rationale**: Keeps each file under ~200 lines, separates concerns, makes individual sections independently testable. All components are co-located in `modules/room-map/components/`.

### 3. Guest deduplication strategy
**Decision**: On Check In submit, if the user typed guest info manually (no guest selected from search):
1. If `idNumber` (CCCD) is non-empty: query `GET /api/guests?idNumber=<value>` — exact match takes priority.
2. If no match by CCCD: query `GET /api/guests?search=<name>` and compare `idNumber` in results.
3. If a match is found: use the existing guest record.
4. If no match: `POST /api/guests` to create a new record, then proceed.

**Rationale**: Names are not unique; CCCD is a national ID and should be unique per person. Combining both steps handles cases where CCCD was left blank (foreign guests or data entry gaps).  
**Alternative considered**: Always create a new guest — rejected because it pollutes the guest master with duplicates.

### 4. Booking creation on Check In
**Decision**: `POST /api/bookings` with all fields, then immediately `POST /api/bookings/[id]/check-in` (status transition). Room status updates to Occupied via the existing check-in endpoint (which already handles this).

If `chargeType` and `surcharge` are not yet columns on the `Booking` model, the modal stores them in `note` as a structured prefix for now, until a schema migration is added in a follow-up. This keeps the modal unblocked.

**Rationale**: Avoids a blocking schema migration while still shipping the UX. The design notes where data flows so the migration path is clear.

### 5. Status badge colors
**Decision**: Hardcoded color map in the modal header based on status name keywords, not `roomStatus.color` from DB.  
**Rationale**: The proposal specifies exact brand colors (green/blue/purple/orange/red) per status. The DB stores hex colors that may drift. The modal header uses a static map; the `RoomCard` and status legend continue to use `roomStatus.color`.  
**Color map**: `Available` → `#52c41a`, `Occupied` → `#1677ff`, `Reserved` → `#722ed1`, `Cleaning` → `#fa8c16`, `Maintenance` → `#f5222d`.

### 6. View-only mode
**Decision**: When `roomStatus.name` contains "Cleaning" or "Maintenance" (case-insensitive), all form inputs are disabled (`disabled` prop), and the footer shows only a Close button.  
**Rationale**: Staff should not be able to accidentally start a check-in on a room under maintenance.

### 7. Master data source
**Decision**: Re-use the existing `useMasterData()` hook (already used project-wide) to fetch `serviceItems` and `paymentMethods`. Pass as props into child components.  
**Rationale**: `staleTime: Infinity` avoids redundant fetches; consistent with project conventions.

## Risks / Trade-offs

- **Missing `chargeType`/`surcharge` schema fields** → Mitigated by serialising to `note` as interim; proposal documents migration path explicitly.
- **Modal form state on unmount** — Ant Design `Form` instance must be reset on modal close to prevent stale data when reopening → use `form.resetFields()` in `afterClose` handler.
- **Guest search debounce** — Typing fast will fire many requests → debounce `AutoComplete` `onSearch` by 300 ms using `useDebounce` pattern (lodash or inline `setTimeout`).
- **Room Map stale after action** — `queryClient.invalidateQueries({ queryKey: ["room-map"] })` called on success; the 30 s `refetchInterval` in `useRoomMap` acts as a safety net.
- **Wide modal on mobile** — `width: "min(950px, 95vw)"` ensures the modal never overflows on small screens; sections stack vertically.

## Migration Plan

1. Treat `RoomActionDrawer.tsx` as deprecated. Remove all references to it in the Room Map flow (page and any other consumers) and replace with `RoomDetailModal`. Once no file imports `RoomActionDrawer`, delete the file.
2. Create new components in `modules/room-map/components/`.
3. Update `app/[locale]/(main)/room-map/page.tsx` to import and render `RoomDetailModal` in place of `RoomActionDrawer`.
4. Extend `Booking` type with optional `chargeType?: string | null` and `surcharge?: number | null` (frontend only, stored in `note` for now).
5. Add i18n keys to `en.json` / `vi.json`.
6. Run `npm run build` to confirm no TS errors.

No database migration is required for the initial ship. A follow-up change adds `chargeType` and `surcharge` columns to the `Booking` schema.

## Open Questions

- Should Check Out from this modal trigger the same confirmation dialog as the current drawer, or show a summary first? (Assumed: use `useConfirm` same as current, no summary.)
- Should "Edit" (for Occupied rooms) open the full Reservations edit page, or an inline edit mode? (Assumed: navigate to `/reservations/[bookingId]` with `router.push`.)
- Is `chargeType` an enum (hourly/nightly) or free text? (Assumed: select with options Nightly / Hourly / Daily; stored as string.)
