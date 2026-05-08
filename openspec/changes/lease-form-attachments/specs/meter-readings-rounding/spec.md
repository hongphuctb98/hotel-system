## ADDED Requirements

### Requirement: Meter reading values are displayed and entered with 1 decimal place
All meter reading values (previousReading, currentReading, consumption) SHALL be shown with exactly 1 decimal place in the UI and input fields shall use 1 decimal precision. The DB continues to store Decimal(10,3); this requirement governs UI and API submission values only.

#### Scenario: Table displays values with 1 decimal place
- **WHEN** a reading value such as `12.345` is stored in the DB
- **THEN** the grouped list table SHALL render it as `12.3`
- **AND** a value of `12.36` SHALL render as `12.4` (standard rounding)

#### Scenario: InputNumber precision is 1 decimal
- **WHEN** the user opens the create or edit form
- **THEN** all previousReading and currentReading InputNumber fields SHALL use `precision={1}` and `step={0.1}`

#### Scenario: Submitted value is rounded to 1 decimal
- **WHEN** the user enters `12.36` in a reading field and submits
- **THEN** the value sent to `POST /api/long-term/meter-readings` SHALL be `12.4` (rounded to 1 decimal place before submit)
- **AND** the computation `Math.round(v * 10) / 10` SHALL be applied client-side before API call
