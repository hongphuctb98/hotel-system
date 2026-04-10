## ADDED Requirements

### Requirement: Nightly charge type calculates price by number of nights
The system SHALL compute the stay price for `chargeType = "nightly"` as `ratePerNight × numberOfNights`, where `numberOfNights` is the number of calendar days between `checkInDate` and `checkOutDate` (minimum 1).

#### Scenario: Single-night stay
- **WHEN** `chargeType = "nightly"`, `checkInDate = "2026-04-10"`, `checkOutDate = "2026-04-11"`, `ratePerNight = 500000`
- **THEN** stay price = 500000

#### Scenario: Multi-night stay
- **WHEN** `chargeType = "nightly"`, `checkInDate = "2026-04-10"`, `checkOutDate = "2026-04-13"`, `ratePerNight = 500000`
- **THEN** stay price = 1500000

#### Scenario: Same-day check-in and check-out treated as one night minimum
- **WHEN** `chargeType = "nightly"`, `checkInDate = "2026-04-10"`, `checkOutDate = "2026-04-10"`, `ratePerNight = 500000`
- **THEN** stay price = 500000 (1 night minimum applied)

### Requirement: Daily charge type charges a flat rate regardless of duration
The system SHALL compute the stay price for `chargeType = "daily"` as exactly `ratePerNight × 1` (a flat day-use rate, no multiplier). `ratePerNight` stores the daily rate for day-use stays.

#### Scenario: Day-use stay
- **WHEN** `chargeType = "daily"`, `checkInDate = "2026-04-10"`, `checkOutDate = "2026-04-10"`, `ratePerNight = 300000`
- **THEN** stay price = 300000

#### Scenario: Daily charge type always returns flat rate regardless of dates
- **WHEN** `chargeType = "daily"`, `ratePerNight = 300000`, any check-in/out dates
- **THEN** stay price = 300000

### Requirement: Hourly charge type uses a block-plus-overage model capped at the nightly rate
The system SHALL compute the stay price for `chargeType = "hourly"` as:
`min(blockPrice + max(0, hoursStayed - blockHours) × ratePerHour, nightlyCap)`
where `nightlyCap = ratePerNight` (the nightly rate stored on the booking). All inputs are non-negative integers or decimals. The result SHALL never exceed `nightlyCap`.

#### Scenario: Stay within block hours — block price only
- **WHEN** `chargeType = "hourly"`, `blockHours = 4`, `blockPrice = 200000`, `ratePerHour = 50000`, `hoursStayed = 3`, `nightlyCap = 500000`
- **THEN** stay price = 200000

#### Scenario: Stay exactly at block hours — block price only
- **WHEN** `chargeType = "hourly"`, `blockHours = 4`, `blockPrice = 200000`, `ratePerHour = 50000`, `hoursStayed = 4`, `nightlyCap = 500000`
- **THEN** stay price = 200000

#### Scenario: Stay exceeds block hours — block plus overage
- **WHEN** `chargeType = "hourly"`, `blockHours = 4`, `blockPrice = 200000`, `ratePerHour = 50000`, `hoursStayed = 6`, `nightlyCap = 500000`
- **THEN** stay price = 200000 + 2 × 50000 = 300000

#### Scenario: Overage causes total to exceed nightly cap — cap applied
- **WHEN** `chargeType = "hourly"`, `blockHours = 4`, `blockPrice = 200000`, `ratePerHour = 100000`, `hoursStayed = 12`, `nightlyCap = 500000`
- **THEN** stay price = 500000 (capped; uncapped would be 200000 + 8×100000 = 1000000)

### Requirement: Stay price calculation is a pure utility function
The stay price calculation SHALL be implemented as a pure function `calculateStayPrice` in `common/utils/stayPricing.ts` with no side effects, accepting a discriminated union input keyed on `chargeType`. The function SHALL be importable in both client components and server-side route handlers.

#### Scenario: Function called with nightly input returns correct price
- **WHEN** `calculateStayPrice({ chargeType: "nightly", ratePerNight: 500000, nights: 3 })` is called
- **THEN** it returns `1500000`

#### Scenario: Function called with hourly input at cap returns nightlyCap
- **WHEN** `calculateStayPrice({ chargeType: "hourly", blockHours: 2, blockPrice: 100000, ratePerHour: 200000, hoursStayed: 10, nightlyCap: 400000 })` is called
- **THEN** it returns `400000`
