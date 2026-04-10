## 1. Types

- [x] 1.1 Add `CheckInFormValues` type to `types/room.types.ts` (or a new `types/check-in.types.ts`):
  ```ts
  export type ServiceRow = { serviceItemId: string; quantity: number; unitPrice: number };
  export type CheckInFormValues = {
    guestId?: string;          // set when a guest is selected from search
    customerName: string;
    phone?: string;
    idNumber?: string;         // CCCD
    source?: string;
    chargeType: "nightly" | "hourly" | "daily";
    checkInDate: string;
    checkOutDate: string;
    ratePerNight: number;
    services: ServiceRow[];
    discount: number;
    surcharge: number;
    prepaid: number;
    paymentMethodId?: string;
    note?: string;
  };
  ```
- [x] 1.2 Extend `CurrentBooking` in `types/room.types.ts` to include `id` (already present), `bookingNumber`, `checkInDate`, `checkOutDate`, and guest `firstName` + `lastName` — confirm these are already present and add any missing fields needed for Check Out

## 2. Component: RoomDetailModal (shell)

- [x] 2.1 Create `modules/room-map/components/RoomDetailModal.tsx`:
  - `"use client"` component
  - Props: `open: boolean`, `room: Room | null`, `onClose: () => void`
  - Uses Ant Design `Modal` with `width="min(950px, 95vw)"`, `centered`, `footer={null}` (custom footer inside), `destroyOnHidden` (so form resets between opens)
  - Header: room number as title, floor + room type as subtitle, status Tag using the hardcoded color map (Available=#52c41a, Occupied=#1677ff, Reserved=#722ed1, Cleaning=#fa8c16, Maintenance=#f5222d) matched case-insensitively against `room.roomStatus.name`
  - Body: renders `<GuestSearchSection>`, `<ServiceItemsSection>`, `<PaymentSummarySection>` and a Note textarea, all wrapped in an Ant Design `Form` instance
  - Determines `isViewOnly` when status name contains "Cleaning" or "Maintenance"
  - Footer: conditionally renders buttons based on `room.roomStatus.name` keyword:
    - Available → primary "Check In" button (calls `handleCheckIn`) + "Close"
    - Occupied → "Check Out" (calls `handleCheckOut`) + "Edit" (navigates to `/reservations/[bookingId]/edit`) + "Close"
    - Reserved → "View" + primary "Check In" + "Close"
    - Cleaning/Maintenance → "Close" only
  - `handleCheckOut`: calls `useConfirm`, on confirm calls `bookingService.checkOut(room.currentBooking.id)`, then `queryClient.invalidateQueries({ queryKey: ["room-map"] })`, then `onClose()`; shows `message.success`/`message.error`
  - Re-uses `useMasterData()` for `serviceItems` and `paymentMethods` and passes them as props to child sections

## 3. Component: GuestSearchSection

- [x] 3.1 Create `modules/room-map/components/GuestSearchSection.tsx`:
  - `"use client"` component
  - Props: `form: FormInstance`, `disabled?: boolean`
  - Renders `Form.Item` fields: Customer Name (AutoComplete), Phone (Input), CCCD/ID Number (Input), Booking Source (Input), Rental/Charge Type (Select: Nightly/Hourly/Daily), Check-in Time (DatePicker showTime), Check-out Time (DatePicker showTime)
  - AutoComplete `onSearch`: debounce 300 ms, calls `guestService.findAll({ search: value, limit: 10 })`, maps results to `{ value: guest.id, label: \`${guest.firstName} ${guest.lastName} – ${guest.phone ?? ""}\` }`
  - AutoComplete `onSelect(guestId)`: set hidden `guestId` form field, set `customerName`, `phone`, `idNumber` via `form.setFieldsValue()`; store selected guest in local state for dedup-skip logic; disable phone/CCCD fields
  - Add a "Clear selection" link that resets `guestId` field, re-enables phone/CCCD, and clears local guest state
  - Required validation on: `customerName` (name → "Customer Name is required"), `checkInDate`, `checkOutDate`
  - Pass `disabled` prop to all inputs/selects/date-pickers when view-only

## 4. Component: ServiceItemsSection

- [x] 4.1 Create `modules/room-map/components/ServiceItemsSection.tsx`:
  - `"use client"` component
  - Props: `serviceItems: ServiceItem[]`, `value: ServiceRow[]`, `onChange: (rows: ServiceRow[]) => void`, `roomPrice: number`, `discount: number`, `surcharge: number`, `prepaid: number`, `onDiscountChange`, `onSurchargeChange`, `onPrepaidChange`, `disabled?: boolean`
  - Renders a list of service rows; each row:
    - Select for `serviceItemId` (options from `serviceItems` prop)
    - InputNumber for `quantity` (min 1, default 1)
    - Read-only Unit Price (from selected `serviceItem.price`, formatted with `<PriceDisplay>`)
    - Read-only Line Total = unitPrice × quantity, formatted with `<PriceDisplay>`
    - Delete button (hidden when `disabled`)
  - "Add Service" button below the list (hidden when `disabled`)
  - When a service item is selected: auto-fill `unitPrice` from `serviceItems.find(s => s.id === id).price`
  - Summary block below rows:
    - Room Price: `<PriceDisplay amount={roomPrice} />`
    - Service Total: `<PriceDisplay amount={serviceTotal} />` (sum of all line totals)
    - Discount: `<InputNumber>` bound to `discount` (hidden label shows subtracted amount)
    - Surcharge: `<InputNumber>` bound to `surcharge`
    - **Total Payable**: Room Price + Service Total + Surcharge − Discount, `<PriceDisplay>`, bold
    - Prepaid Amount: `<InputNumber>` bound to `prepaid`
    - **Remaining Amount**: Total Payable − Prepaid, `<PriceDisplay>`, colored red if > 0

## 5. Component: PaymentSummarySection

- [x] 5.1 Create `modules/room-map/components/PaymentSummarySection.tsx`:
  - `"use client"` component
  - Props: `paymentMethods: PaymentMethod[]`, `form: FormInstance`, `totalPayable: number`, `prepaid: number`, `disabled?: boolean`
  - Fields: Payment Status (Select: Unpaid / Partial / Paid), Payment Method (Select from `paymentMethods`)
  - Read-only display: Total Payable, Prepaid Amount, Remaining Amount (all `<PriceDisplay>`)
  - All inputs respect `disabled` prop

## 6. Hook: useCheckInFlow

- [x] 6.1 Create `modules/room-map/hooks/useCheckInFlow.ts`:
  - Exports `useCheckInFlow(room: Room | null, onSuccess: () => void)`
  - Returns `{ handleCheckIn: (values: CheckInFormValues) => Promise<void>; isPending: boolean }`
  - Implementation:
    1. Resolve guest:
       - If `values.guestId` is set → use it directly
       - Else if `values.idNumber` non-empty → call `guestService.findAll({ idNumber: values.idNumber })`, use first match if found
       - Else call `guestService.findAll({ search: values.customerName })`, find record where `idNumber === values.idNumber` (both non-empty match)
       - If still no match → `guestService.create({ firstName, lastName (split name), phone, idNumber })`; use new guest `id`
    2. Get `bookingStatusId` for "Confirmed" status from `useMasterData().bookingStatuses` (status where name contains "Confirmed" case-insensitive)
    3. `bookingService.create({ guestId, roomId: room.id, bookingStatusId, checkInDate, checkOutDate, ratePerNight, depositAmount: values.prepaid, adults: 1, children: 0, source: values.source, note: buildNote(values) })`
       where `buildNote` serialises `chargeType`, `surcharge`, `discount` into the note string prefixed with `[META]` for interim storage
    4. For each `values.services` row: `bookingService.addService(bookingId, { serviceItemId, quantity, unitPrice })`
    5. `bookingService.checkIn(bookingId)`
    6. `queryClient.invalidateQueries({ queryKey: ["room-map"] })`
    7. Call `onSuccess()`
  - Wrap entire flow in try/catch; re-throw so `RoomDetailModal` can show `message.error`
  - Set `isPending` state during async operations

## 7. i18n Keys

- [x] 7.1 Add keys to `messages/en.json` under `roomMap`:
  ```json
  "roomMap": {
    "checkIn": "Check In",
    "checkOut": "Check Out",
    "edit": "Edit",
    "view": "View",
    "close": "Close",
    "roomInfo": "Room Information",
    "guestInfo": "Guest / Check-in Information",
    "pricingServices": "Pricing & Services",
    "payment": "Payment",
    "note": "Note",
    "customerName": "Customer Name",
    "phone": "Phone Number",
    "idNumber": "CCCD / ID Number",
    "source": "Booking Source",
    "chargeType": "Charge Type",
    "chargeNightly": "Nightly",
    "chargeHourly": "Hourly",
    "chargeDaily": "Daily",
    "checkInTime": "Check-in Time",
    "checkOutTime": "Check-out Time",
    "searchGuest": "Search by name, phone, or CCCD",
    "clearGuest": "Clear selection",
    "addService": "Add Service",
    "service": "Service",
    "quantity": "Qty",
    "unitPrice": "Unit Price",
    "lineTotal": "Total",
    "roomPrice": "Room Price",
    "serviceTotal": "Service Total",
    "discount": "Discount",
    "surcharge": "Surcharge",
    "totalPayable": "Total Payable",
    "prepaid": "Prepaid Amount",
    "remaining": "Remaining Amount",
    "paymentStatus": "Payment Status",
    "paymentMethod": "Payment Method",
    "statusUnpaid": "Unpaid",
    "statusPartial": "Partial",
    "statusPaid": "Paid",
    "checkInSuccess": "Check-in completed successfully",
    "checkInFailed": "Check-in failed. Please try again.",
    "checkOutSuccess": "Check-out completed successfully",
    "checkOutFailed": "Check-out failed. Please try again.",
    "confirmCheckOut": "Confirm Check Out",
    "confirmCheckOutContent": "Are you sure you want to check out this guest?",
    "viewOnly": "This room is not available for check-in"
  }
  ```
- [x] 7.2 Add matching keys to `messages/vi.json` with Vietnamese translations

## 8. Update Room Map Page

- [x] 8.1 Update `app/[locale]/(main)/room-map/page.tsx`:
  - Replace `import RoomActionDrawer` with `import RoomDetailModal`
  - Replace `<RoomActionDrawer open={...} room={...} onClose={...} />` with `<RoomDetailModal open={...} room={...} onClose={...} />`
  - Rename `drawer` variable to `modal` (or keep as-is for minimal diff) — the `useDisclosure` hook call stays the same

## 9. Remove Deprecated Drawer

- [x] 9.1 Grep the codebase for any remaining imports of `RoomActionDrawer` — confirm only `room-map/page.tsx` (already replaced in task 8.1) referenced it
- [x] 9.2 Delete `modules/room-map/components/RoomActionDrawer.tsx` once no file imports it

## 10. Verification

- [x] 10.1 Run `npm run build` — no TypeScript errors
- [x] 10.2 Verify clicking a room card opens a centered modal (not a side drawer)
- [x] 10.3 Verify header badges show correct colors for each room status
- [x] 10.4 Verify guest search typeahead returns results and auto-fills fields on selection
- [x] 10.5 Verify service rows: add row, select service auto-fills unit price, change quantity updates line total and totals summary
- [x] 10.6 Verify Check In flow: manual guest with CCCD deduplication, booking created, room status updates to Occupied, map refreshes
- [x] 10.7 Verify Check Out flow: confirmation dialog, booking checked out, map refreshes
- [x] 10.8 Verify Cleaning/Maintenance rooms show view-only modal (all inputs disabled, only Close button in footer)
- [x] 10.9 Verify Remaining Amount = Total Payable − Prepaid recalculates live
