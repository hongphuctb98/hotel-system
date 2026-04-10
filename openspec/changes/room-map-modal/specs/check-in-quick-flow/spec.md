## ADDED Requirements

### Requirement: Check In validates required fields before submitting
The Check In action SHALL validate all required fields and block submission if any are missing.

#### Scenario: Validation blocks submission
- **WHEN** the user clicks Check In with Customer Name, Check-in Time, or Check-out Time empty
- **THEN** the form shows inline validation errors and does NOT call any API

#### Scenario: Validation passes
- **WHEN** all required fields are filled
- **THEN** the Check In flow proceeds to guest deduplication

---

### Requirement: Guest deduplication by CCCD priority
If the user entered guest data manually (no guest selected from search), the system SHALL check for a duplicate guest before creating a new record, prioritising CCCD/ID Number over name.

#### Scenario: Match found by CCCD
- **WHEN** the user entered a non-empty CCCD and a guest with that `idNumber` exists in the system
- **THEN** the existing guest record is used (no new guest is created)

#### Scenario: Match found by Name + CCCD fallback
- **WHEN** the CCCD field is empty or no match is found by CCCD
- **AND** a guest with the same name AND idNumber combination exists
- **THEN** the existing guest record is used

#### Scenario: No match — new guest created
- **WHEN** no existing guest matches by CCCD or by Name + CCCD
- **THEN** the system calls `POST /api/guests` with the entered name, phone, CCCD, and proceeds with the new guest id

#### Scenario: Guest selected from search
- **WHEN** the user selected a guest from the typeahead dropdown
- **THEN** the deduplication step is skipped and the selected guest's id is used directly

---

### Requirement: Booking record created on Check In
The system SHALL create a booking record linking the guest, room, dates, services, and payment data when Check In is confirmed.

#### Scenario: Booking created with all fields
- **WHEN** Check In completes successfully
- **THEN** a `POST /api/bookings` call is made with `roomId`, `guestId`, `checkInDate`, `checkOutDate`, `chargeType`, `ratePerNight` (from room's basePrice or manual input), `services` (list of serviceItemId + quantity), `discountAmount`, `surcharge`, `depositAmount` (= prepaid amount), `paymentMethodId`, `source`, and `note`

#### Scenario: Check-in status transition
- **WHEN** the booking is created
- **THEN** a `POST /api/bookings/[id]/check-in` call is made immediately to transition the booking status to Checked-In

---

### Requirement: Room status updated to Occupied only after successful booking
The room's status SHALL be updated to Occupied only after guest resolution and booking creation have both completed successfully. The room status update MUST NOT be triggered before the booking exists, to prevent inconsistent state where a room appears Occupied but has no linked booking.

#### Scenario: Correct update ordering
- **WHEN** Check In is submitted
- **THEN** the system resolves the guest first, then creates the booking, then transitions the booking to Checked-In (which updates the room status) — the room status is never updated independently before these steps succeed

#### Scenario: Room Map refreshes after Check In
- **WHEN** all steps complete without error (guest resolved, booking created, check-in transition done)
- **THEN** `queryClient.invalidateQueries({ queryKey: ["room-map"] })` is called, the modal closes, and the room card on the map shows the Occupied status badge

#### Scenario: Error during guest resolution or booking creation
- **WHEN** guest resolution or booking creation returns an error
- **THEN** a `message.error` toast is shown, the modal stays open, the room status is NOT changed, and no partial booking record remains

#### Scenario: Error during check-in transition
- **WHEN** the booking is created successfully but `POST /api/bookings/[id]/check-in` returns an error
- **THEN** a `message.error` toast is shown and the modal stays open; the booking record exists but the room status has not been updated — the receptionist can retry

---

### Requirement: Check Out from modal
The Check Out action SHALL confirm intent and then trigger the check-out API, then refresh the map.

#### Scenario: Check Out confirmation
- **WHEN** the user clicks Check Out in the modal footer
- **THEN** a `useConfirm` dialog appears asking for confirmation

#### Scenario: Check Out confirmed
- **WHEN** the user confirms the dialog
- **THEN** `POST /api/bookings/[id]/check-out` is called, the modal closes, and the Room Map refreshes with the updated room status

#### Scenario: Check Out cancelled
- **WHEN** the user cancels the confirmation dialog
- **THEN** nothing happens and the modal remains open

---

### Requirement: Loading states during async operations
All async operations in the Check In / Check Out flow SHALL show loading indicators to prevent duplicate submissions.

#### Scenario: Check In button loading
- **WHEN** the Check In flow is in progress (API calls pending)
- **THEN** the Check In button shows a loading spinner and is disabled

#### Scenario: Check Out button loading
- **WHEN** the Check Out API call is pending
- **THEN** the Check Out button shows a loading spinner and is disabled
