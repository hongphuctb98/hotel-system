## Context

HotelOS already has partial timezone support: `common/utils/hotelDate.ts` provides server-side utilities (`buildLocalDayBoundsUTC`, `hotelLocalDate`) that read `HOTEL_TIMEZONE` from the environment and are used by booking/room API routes. However:

- The timezone is env-var-only — it cannot be changed without a server redeploy.
- The client side is entirely unaware of the hotel timezone — `common/utils/date.ts` calls `dayjs(date)` which interprets timestamps in browser-local time.
- All datepickers (booking form in room-map, reservation filters) run in browser timezone.
- There is no settings page, no settings API, and no `HotelSettings` DB table.

The goal is to promote the hotel timezone from a static environment variable to a DB-persisted setting, expose it to both server and client code, and wire every booking-related date input and display through it.

## Goals / Non-Goals

**Goals:**
- Admin can view and change the hotel timezone from the Settings page.
- All booking-related datepickers interpret user input in the configured hotel timezone.
- All check-in/check-out date displays use the configured hotel timezone.
- Server-side date logic reads timezone from DB (with env fallback for backwards compatibility and seeding).
- A single client-side context provides the hotel timezone to all React components without prop-drilling.
- No new npm packages required — `dayjs/plugin/utc` and `dayjs/plugin/timezone` are already bundled with `dayjs`.

**Non-Goals:**
- Per-user or per-session timezone preferences.
- Migrating historical data or recalculating stored UTC timestamps.
- Supporting multiple timezones simultaneously (one hotel, one timezone).
- Audit logging of timezone changes.
- The `HOTEL_TIMEZONE` env var is not removed — it remains as a fallback seed value used during first-run migration.

## Decisions

### 1. DB storage: singleton `HotelSettings` table

**Decision**: Add a new `HotelSettings` Prisma model with an `id` of `"singleton"` (fixed string PK). Settings are upserted by ID. Only `timezone` (IANA string) to start; the table is extensible for future settings (e.g., currency, hotel name).

**Alternative considered**: Store timezone as a row in an existing `master` table. Rejected — master data is user-enumerable lookup lists, not global config.

**Why**: A dedicated model is explicit, type-safe, and avoids polluting master data. The singleton pattern (fixed PK) makes reads cheap (`findUnique` with known ID) and write code simple (always upsert).

### 2. Server-side: async DB read with env fallback

**Decision**: Update `common/utils/hotelDate.ts` to export an async `getHotelTimezone(): Promise<string>` that calls `prisma.hotelSettings.findUnique({ where: { id: "singleton" } })` and falls back to `process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh"` when the row is absent.

All four call sites (`bookings/route.ts`, `bookings/matrix/route.ts`, `rooms/route.ts`, `rooms/[id]/route.ts`, `rooms/_utils.ts`) already `await` the functions that use timezone — making `getHotelTimezone` async is a safe mechanical change.

**Why not keep env-only for server**: The DB must be the source of truth; env falls back for initial seed and test environments only.

### 3. Client-side: React context loaded once on app mount

**Decision**: Add `providers/HotelTimezoneProvider.tsx` that calls `GET /api/settings` in a `useEffect` on mount, caches the result in React state, and exposes it via `useHotelTimezone()`. The provider is inserted into the provider tree in `app/[locale]/layout.tsx`, inside `QueryProvider`. Renders children immediately (no loading gate) using a default of `"Asia/Ho_Chi_Minh"` until the fetch resolves.

**Alternative considered**: Include timezone in the initial page payload via a Server Component and pass it as a prop. Rejected — this crosses the server/client boundary awkwardly (passing primitive props through `layout.tsx` to all client pages) and doesn't generalize well to future settings.

**Alternative considered**: Use React Query to fetch and cache `GET /api/settings`. Rejected — the timezone is needed before any query runs (it informs query params), and the context pattern is simpler for a single-value global.

**Why**: Context is the idiomatic solution for "value available everywhere without prop drilling". A one-time fetch on mount with a sane default means no loading spinner required.

### 4. Client-side date utilities: new `common/utils/clientTimezone.ts`

**Decision**: Create `common/utils/clientTimezone.ts` (safe to import in Client Components) that extends dayjs with `utc` and `timezone` plugins and exports helpers:
- `toHotelDayjs(utcDate, tz)` — parse a UTC Date/ISO string as a dayjs in the given hotel timezone (for display/datepicker `value`)
- `fromHotelDayjs(dayjsObj, tz)` — convert a hotel-timezone dayjs back to a UTC ISO string (for form `onChange` → API payload)
- `formatInTimezone(date, tz, fmt)` — format a UTC date for display in the hotel timezone

**Why separate from `hotelDate.ts`**: `hotelDate.ts` imports `process.env` and is server-only. The new util is pure dayjs with no Node.js globals, safe for client bundles.

**Why not extend `date.ts`**: `date.ts` is locale-focused. Timezone is a separate concern; mixing them would create a large, multi-concern utility.

### 5. Datepicker integration: value/onChange conversion (no custom picker)

**Decision**: Wrap Ant Design `DatePicker` instances in booking forms with conversion shims: convert the stored UTC value to a hotel-timezone dayjs for the `value` prop, and convert the picker's dayjs output back to UTC ISO in `onChange`. This is done in the form component (not by wrapping `DatePicker` itself) using `toHotelDayjs` / `fromHotelDayjs`.

**Alternative considered**: Ant Design's `generatePicker` with a timezone-aware dayjs instance. Rejected — requires custom locale adapters and is poorly documented in Ant Design v6.

**Why**: The conversion approach is transparent, requires no Ant Design internals, and keeps the form's internal value in UTC (consistent with server expectations).

### 6. Settings API: `GET /api/settings` and `PUT /api/settings`

**Decision**: New route at `app/api/settings/route.ts`. `GET` is public (no auth required — the client needs the timezone before the user is authenticated for the timezone default to apply correctly on the login page). `PUT` requires ADMIN role.

**Why GET is unauthenticated**: The timezone is not sensitive. The datepicker default on booking forms must apply immediately; requiring auth on this endpoint would add latency or a chicken-and-egg problem.

## Risks / Trade-offs

- **Race condition on first render**: Datepickers may briefly render in the fallback timezone before `GET /api/settings` resolves. This is acceptable — the window is typically <100ms on LAN and the fallback is the hotel's own timezone (the env default).

  → Mitigation: Use `React.startTransition` or set the default to the env var baked into the initial HTML if this becomes a UX problem. Not addressed in V1.

- **DB round-trip on every API call**: `getHotelTimezone()` now hits the DB on each API request that needs timezone.

  → Mitigation: The DB call is a `findUnique` on a singleton PK — it is a primary-key lookup, effectively O(1) and cached by the connection pool. Monitor if it becomes a bottleneck. A simple module-level cache (1-min TTL) can be added later.

- **Timezone string validation**: An admin entering an invalid IANA string (e.g., `America/Fake_City`) will break all date calculations silently.

  → Mitigation: Validate with `Intl.supportedValuesOf('timeZone').includes(tz)` (or dayjs `.tz()` try/catch) on the PUT endpoint and return a 400. The UI uses a Select component (not free-text) populated from a curated list, preventing typos.

## Migration Plan

1. Add `HotelSettings` model to Prisma schema.
2. Run `npm run db:migrate` — creates the table.
3. Seed the singleton row from `HOTEL_TIMEZONE` env (add to `db:seed` script or create a separate migration seed).
4. Deploy new `GET /api/settings` and `PUT /api/settings` routes.
5. Update `hotelDate.ts` — all existing API behaviour is unchanged (same timezone value, just DB-sourced).
6. Add `HotelTimezoneProvider` to the layout — no visible change until datepickers are wired.
7. Wire datepickers and display components one-by-one — each is independently releasable.

**Rollback**: Drop the `HotelSettings` table migration, remove the provider from layout, and revert `hotelDate.ts`. No stored data is affected since UTC storage is unchanged.

## Open Questions

- Should the Settings page expose other hotel-level config in the future (hotel name, currency, language defaults)? The table is designed to be extensible, but the API shape (flat object vs. key-value pairs) should be decided before V2 adds more fields.
- Should timezone change history be logged? Not in V1; an admin audit log is a separate feature.
