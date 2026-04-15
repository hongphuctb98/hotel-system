## ADDED Requirements

### Requirement: Client-safe timezone utilities are centralized in common/utils/clientTimezone.ts
The system SHALL provide `common/utils/clientTimezone.ts` — a module safe to import in both Server and Client Components — that registers `dayjs/plugin/utc` and `dayjs/plugin/timezone` and exports the following helpers:

- `toHotelDayjs(date: string | Date | null | undefined, tz: string): dayjs.Dayjs | null` — parses a UTC ISO string or `Date` object and returns a dayjs instance in the given hotel timezone, or `null` if the input is nullish.
- `fromHotelDayjs(d: dayjs.Dayjs | null | undefined, tz: string): string | null` — converts a hotel-timezone dayjs value (as produced by a DatePicker) to a UTC ISO string, or `null` if the input is nullish.
- `formatInTimezone(date: string | Date | null | undefined, tz: string, fmt?: string): string` — formats a UTC date in the hotel timezone using the given format (default: `DD/MM/YYYY HH:mm`), returning `"-"` for nullish input.
- `todayInTimezone(tz: string): dayjs.Dayjs` — returns a dayjs object representing the current date in the hotel timezone, used to compute `disabledDate` constraints.

These utilities SHALL NOT import `process.env` or any Node.js-only module.

#### Scenario: toHotelDayjs converts a UTC ISO string to hotel-local time
- **WHEN** `toHotelDayjs("2026-04-13T17:00:00.000Z", "Asia/Ho_Chi_Minh")` is called
- **THEN** the returned dayjs value represents `2026-04-14 00:00` in `Asia/Ho_Chi_Minh`

#### Scenario: fromHotelDayjs converts a hotel-local datepicker value to UTC ISO
- **WHEN** `fromHotelDayjs(dayjs.tz("2026-04-14 00:00", "Asia/Ho_Chi_Minh"), "Asia/Ho_Chi_Minh")` is called
- **THEN** the returned ISO string is `"2026-04-13T17:00:00.000Z"`

#### Scenario: formatInTimezone formats a stored UTC timestamp in hotel-local time
- **WHEN** `formatInTimezone("2026-04-13T17:00:00.000Z", "Asia/Ho_Chi_Minh")` is called
- **THEN** the returned string is `"14/04/2026 00:00"`

#### Scenario: Null/undefined inputs return safe fallbacks
- **WHEN** `toHotelDayjs(null, tz)` or `formatInTimezone(undefined, tz)` is called
- **THEN** `toHotelDayjs` returns `null` and `formatInTimezone` returns `"-"`

### Requirement: Server-side hotelDate utilities read timezone from DB
The `common/utils/hotelDate.ts` module SHALL update `getHotelTimezone()` to be an async function that reads the configured timezone from the `HotelSettings` singleton DB row and falls back to `process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh"` when no DB row exists. All exported functions that depend on timezone (`buildLocalDayBoundsUTC`, `hotelLocalDate`) SHALL be updated to accept an explicit `tz` parameter or become async (fetching it internally), maintaining backward compatibility with all existing call sites.

#### Scenario: getHotelTimezone returns DB-configured timezone
- **WHEN** a `HotelSettings` row with `timezone: "Europe/Paris"` exists
- **THEN** `await getHotelTimezone()` returns `"Europe/Paris"`

#### Scenario: getHotelTimezone falls back to env when no DB row exists
- **WHEN** no `HotelSettings` row exists and `HOTEL_TIMEZONE=Asia/Tokyo` is set
- **THEN** `await getHotelTimezone()` returns `"Asia/Tokyo"`
