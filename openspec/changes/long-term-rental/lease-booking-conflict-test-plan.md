# Lease–Booking Conflict Manual Test Plan

## Setup
- Room: any available room (e.g. "101")
- Lease: leaseStartDate = 2025-06-01, status = ACTIVE

## Test Cases

### (a) Booking blocked by active lease
- Create booking: checkIn = 2025-06-05, checkOut = 2025-06-10
- Expected: 409 ROOM_HAS_LEASE

### (b) Booking blocked by 14-day buffer
- Lease: startDate = 2025-06-01 (PENDING or ACTIVE)
- Create booking: checkIn = 2025-05-10, checkOut = 2025-05-25
  (checkOut 2025-05-25 > leaseStart 2025-06-01 − 14d = 2025-05-18 → BLOCKED)
- Expected: 409 ROOM_HAS_LEASE

### (c) Booking allowed when checkout ≤ startDate − 14 days
- Lease: startDate = 2025-06-01
- Create booking: checkIn = 2025-05-01, checkOut = 2025-05-15
  (checkOut 2025-05-15 ≤ 2025-05-18 — allowed)
- Expected: 201 Created

### (d) Booking update that extends into conflict is also blocked
- Existing booking: room "101", checkIn = 2025-05-01, checkOut = 2025-05-15
- Update: extend checkOut to 2025-05-25
  (checkOut 2025-05-25 > 2025-05-18 → BLOCKED)
- Expected: 409 ROOM_HAS_LEASE
