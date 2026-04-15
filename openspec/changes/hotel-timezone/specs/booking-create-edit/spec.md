## ADDED Requirements

### Requirement: Booking form datepickers operate in the hotel timezone
The check-in and check-out `DatePicker` fields in `GuestSearchSection` SHALL display and accept dates in the configured hotel timezone, not the browser's local timezone. The form SHALL use `useHotelTimezone()` to obtain the timezone and apply `toHotelDayjs` / `fromHotelDayjs` from `common/utils/clientTimezone.ts` to convert between stored UTC ISO strings and hotel-local dayjs values. The datepicker `value` prop SHALL always reflect hotel-local time. The `onChange` handler SHALL convert the picked hotel-local dayjs to a UTC ISO string before storing it in the form state.

#### Scenario: Existing booking opens with check-in displayed in hotel timezone
- **WHEN** the booking edit form loads with an existing booking's UTC check-in date
- **THEN** the DatePicker displays the date and time in hotel-local timezone (e.g., a UTC midnight stored as `2026-04-13T17:00Z` shows `14/04/2026 00:00` in `Asia/Ho_Chi_Minh`)

#### Scenario: Staff selects a new check-in date via the picker
- **WHEN** staff picks `14/04/2026 14:00` in the hotel-timezone DatePicker
- **THEN** the form stores the equivalent UTC ISO string (`2026-04-14T07:00:00.000Z` for `Asia/Ho_Chi_Minh`) to be submitted to the API

#### Scenario: Check-out validation compares dates in hotel timezone
- **WHEN** staff selects a check-out date before or equal to the check-in date in hotel-local time
- **THEN** the form validation rejects the value with the appropriate error message

#### Scenario: Date constraint (disabledDate) is computed in hotel timezone
- **WHEN** the DatePicker evaluates which days to disable
- **THEN** "today" is determined using `todayInTimezone(hotelTz)`, not the browser's `new Date()`
