## ADDED Requirements

### Requirement: Room-map modal pricing summary shows a computed stay price line
The pricing summary in the room-map modal SHALL include a "Stay Price" line that displays the result of `calculateStayPrice(...)` computed live from the current form values. This replaces the static `ratePerNight` room-price display in `ServiceItemsSection`.

#### Scenario: Nightly stay price updates when checkout date changes
- **WHEN** `chargeType = "nightly"` and the user changes `checkOutDate` in the form
- **THEN** the Stay Price line immediately reflects `ratePerNight × newNightCount`

#### Scenario: Daily stay price shows flat rate
- **WHEN** `chargeType = "daily"`
- **THEN** the Stay Price line shows `ratePerNight` regardless of dates

#### Scenario: Hourly stay price updates when hours-stayed changes
- **WHEN** `chargeType = "hourly"` and the user changes the Hours Stayed input
- **THEN** the Stay Price line immediately reflects the block+overage+cap calculation

### Requirement: Stay price feeds into total payable calculation
The `totalPayable` value displayed in the modal SHALL equal `stayPrice + serviceTotal + surcharge - discount`. The stay price is the computed value from `calculateStayPrice`, not the raw `ratePerNight`.

#### Scenario: Total payable uses computed stay price for nightly booking
- **WHEN** `chargeType = "nightly"`, `ratePerNight = 500000`, `nights = 2`, `serviceTotal = 100000`, `surcharge = 0`, `discount = 0`
- **THEN** `totalPayable = 1000000 + 100000 = 1100000`

#### Scenario: Total payable uses flat rate for daily booking
- **WHEN** `chargeType = "daily"`, `ratePerNight = 300000`, `serviceTotal = 50000`, `surcharge = 0`, `discount = 0`
- **THEN** `totalPayable = 300000 + 50000 = 350000`

### Requirement: Stay price label distinguishes charge type
The "Stay Price" label in the pricing summary SHALL include a parenthetical suffix indicating the charge type and basis: `(N nights)` for nightly, `(day use)` for daily, `(N hrs)` for hourly.

#### Scenario: Nightly label shows night count
- **WHEN** `chargeType = "nightly"` and `nights = 3`
- **THEN** the label reads "Stay Price (3 nights)" (or locale equivalent)

#### Scenario: Daily label shows day-use
- **WHEN** `chargeType = "daily"`
- **THEN** the label reads "Stay Price (day use)"

#### Scenario: Hourly label shows hours
- **WHEN** `chargeType = "hourly"` and `hoursStayed = 5`
- **THEN** the label reads "Stay Price (5 hrs)"
