## Context

The room-map is expected to support same-day room turnover:

```
AVAILABLE → (booking/check-in) → CHECKED_IN → (checkout) → CLEANING → (mark done) → AVAILABLE → next booking
```

Two bugs prevent this:

**Bug 1 — Checkout does not change room status.**
After a guest checks out, the checkout API only transitions `booking.bookingStatus` to CHECKED_OUT. `room.roomStatus` is unchanged (stays AVAILABLE). This means the system cannot distinguish:
- "just checked out, needs cleaning" (room=AVAILABLE, booking=checked_out)
- "cleaned and re-available" (room=AVAILABLE, booking=checked_out from earlier in the day)

Both states are represented by identical data. The date-overlap query keeps CHECKED_OUT bookings in the results so that the day's history remains visible — but this means a same-morning checked-out booking stays attached to the room for the whole day, making the second state indistinguishable from the first.

**Bug 2 — `resolveStayMode` and `RoomCard.resolveDisplayState` ignore the re-available signal.**
After the room is marked AVAILABLE again (post-cleaning), `bookingState === "checked_out"` still returns `stayMode = "checked_out"`. The card shows "Đã trả phòng" and the modal shows a stale booking form with a "Clean Room" button — which, if clicked, sends the room back into a spurious CLEANING cycle.

## Root Cause

The room-status and booking-state signals are two independent sources that can conflict. The only way to make the "just checked out" and "cleaned and re-available" states distinguishable without schema changes is to **move room status at checkout time**. Checkout is the one event that creates the ambiguity; fixing it at the source removes the need for fragile client-side heuristics.

## Goals / Non-Goals

**Goals:**
- Full same-day turnover cycle works without manual workarounds.
- Room-map card and modal show consistent, correct state at every step of the cycle.
- "Clean Room" button is only shown when the room genuinely needs cleaning.
- After marking AVAILABLE, the room immediately shows as vacant and accepts new bookings.

**Non-Goals:**
- No schema changes — all 6 room status codes remain; no new status is added.
- Check-in does not auto-change room status (checked-in rooms already display correctly via `bookingState === "checked_in"` which beats `roomStatus` in the priority rule).
- No changes to the reservations module or billing flow.

## Decisions

### D1: Checkout API auto-sets room status to CLEANING

**Decision:** The checkout route (`POST /api/bookings/[id]/checkout`) updates `room.roomStatusId` to the CLEANING status in the same DB operation as the booking status update.

**Why CLEANING, not OCCUPIED or a custom status:**
- CLEANING is the physically correct state — the room needs cleaning before the next guest.
- CLEANING is already `isSellable: false`, so `resolveModalMode` returns "operational" immediately after checkout. The receptionist sees the operational modal with "Mark Available" — no extra "Clean Room" step required.
- Using OCCUPIED would require adding "Clean Room" to the operational footer for OCCUPIED; it would also display "Đang có khách" (has guests) which is misleading post-checkout.
- No new DB status code is needed.

**Guard:** Only override room status if it is currently a sellable status (AVAILABLE, RESERVED). Rooms already in MAINTENANCE or OUT_OF_SERVICE stay in those statuses — the checkout should not override an intentional operational lock set by facilities staff.

**Effect on the lifecycle:**
```
checkout → room=CLEANING + booking=CHECKED_OUT → card: CLEANING · modal: operational → "Mark Available"
```

### D2: `resolveStayMode` — AVAILABLE overrides stale `checked_out`

**Decision:** Add a guard: `if (bs === "checked_out" && room.roomStatus.code !== "AVAILABLE") return "checked_out"`. When the room is AVAILABLE (has been cleaned), fall through to "vacant".

**Rationale:** After D1, the only way a room reaches AVAILABLE with a stale CHECKED_OUT booking is after the full cleaning cycle — the room genuinely is available. AVAILABLE is the explicit staff signal that cleaning is done. `checked_out` from an earlier booking must not override it.

This also eliminates the infinite-loop risk where a re-available room's stale "Clean Room" button re-triggers a spurious CLEANING cycle.

### D3: `RoomCard.resolveDisplayState` — AVAILABLE overrides stale `checked_out`

**Decision:** Insert a check for `room.roomStatus.code === "AVAILABLE"` before the `checked_out` branch. Returns the operational status badge (label=AVAILABLE, green) when the room is explicitly available.

**Priority order (final):**
```
1. checked_in  → "Có khách"        (active occupied — highest priority)
2. reserved    → "Đã đặt"          (upcoming booking)
3. !isSellable → operational badge (CLEANING / MAINTENANCE / OCCUPIED lock)
4. AVAILABLE   → "Trống" (green)   (explicit available — overrides stale checked_out)
5. checked_out → "Đã trả phòng"   (only reachable if sellable non-AVAILABLE: edge case)
6. fallback    → operational badge
```

### D4: `stayMode === "checked_out"` stays in place as edge-case fallback

The `stayMode === "checked_out"` branch (modal form + "Clean Room" button) is kept. Under normal flow post-D1 it is unreachable (room is CLEANING = non-sellable = operational mode). It handles edge cases: rooms whose status was manually patched back to a sellable state while retaining a CHECKED_OUT booking.

## Affected Files

| File | Change |
|---|---|
| `app/api/bookings/[id]/checkout/route.ts` | Auto-set room to CLEANING (guarded by current sellable status) |
| `modules/room-map/utils/roomModalMode.ts` | `resolveStayMode`: AVAILABLE guard for checked_out |
| `modules/room-map/components/RoomCard.tsx` | `resolveDisplayState`: AVAILABLE check before checked_out |

## Lifecycle Trace (post-fix)

| Event | roomStatus | bookingState | Card | Modal |
|---|---|---|---|---|
| Room idle | AVAILABLE | none | Trống (green) | vacant → Book Room |
| Booking confirmed | AVAILABLE | reserved | Đã đặt (purple) | reserved → Check In |
| Check-in | AVAILABLE | checked_in | Có khách (green) | checked_in → Check Out |
| Check-out | CLEANING (auto) | checked_out | Đang dọn phòng (orange) | operational → Mark Available |
| Mark Available | AVAILABLE | checked_out (stale) | Trống (green) | vacant → Book Room |
| New same-day booking | AVAILABLE | reserved (new, wins by createdAt) | Đã đặt (purple) | reserved → Check In |
