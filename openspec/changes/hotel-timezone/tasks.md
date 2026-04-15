## 1. Data Layer — Prisma Schema & Migration

- [x] 1.1 Add `HotelSettings` model to `prisma/schema.prisma` with fields `id String @id @default("singleton")`, `timezone String`, `updatedAt DateTime @updatedAt`
- [x] 1.2 Run `npm run db:generate` then `npm run db:migrate` to create the migration and regenerate the Prisma client
- [x] 1.3 Add a seed step in `prisma/seed.ts` that upserts the singleton row with `timezone` from `process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh"`

## 2. Settings API

- [x] 2.1 Create `app/api/settings/route.ts` with `GET` handler: reads `HotelSettings` singleton, falls back to `process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh"`, returns `ok({ timezone })`
- [x] 2.2 Add `PUT` handler to `app/api/settings/route.ts`: validates IANA timezone with `Intl.supportedValuesOf('timeZone')`, verifies ADMIN role via `getAuthUser()`, upserts the singleton row, returns `ok({ timezone })`
- [x] 2.3 Add `settingsService.ts` in `common/services/` with `getSettings()` and `updateSettings(timezone)` calling `GET /api/settings` and `PUT /api/settings`

## 3. Server-Side Timezone Utilities Update

- [x] 3.1 Update `common/utils/hotelDate.ts`: change `getHotelTimezone()` to `async` — query `prisma.hotelSettings.findUnique({ where: { id: "singleton" } })` and fall back to env
- [x] 3.2 Update `buildLocalDayBoundsUTC` and `hotelLocalDate` to `async` (they await `getHotelTimezone()` internally)
- [x] 3.3 Update all call sites to `await` the now-async functions: `app/api/bookings/route.ts`, `app/api/bookings/matrix/route.ts`, `app/api/rooms/route.ts`, `app/api/rooms/[id]/route.ts`, `app/api/rooms/_utils.ts`

## 4. Client-Side Timezone Utilities

- [x] 4.1 Create `common/utils/clientTimezone.ts`: register `dayjs/plugin/utc` and `dayjs/plugin/timezone`, export `toHotelDayjs`, `fromHotelDayjs`, `formatInTimezone`, and `todayInTimezone`
- [x] 4.2 Verify `dayjs/plugin/utc` and `dayjs/plugin/timezone` are importable (they ship with dayjs — no new package needed)

## 5. HotelTimezoneProvider Context

- [x] 5.1 Create `providers/HotelTimezoneProvider.tsx`: fetch `GET /api/settings` in `useEffect`, hold timezone in state with default `"Asia/Ho_Chi_Minh"`, expose `HotelTimezoneContext` and `useHotelTimezone()` hook
- [x] 5.2 Mount `<HotelTimezoneProvider>` in `app/[locale]/layout.tsx` inside the existing provider tree (after `AntdProvider`)

## 6. Settings Page (Admin UI)

- [x] 6.1 Create `modules/settings/components/TimezoneSettingsCard.tsx`: `useHotelTimezone()` for current value, searchable Select populated from a curated IANA timezone list, Save button wired to `settingsService.updateSettings`, success/error toasts via `App.useApp()`
- [x] 6.2 Create `app/[locale]/(main)/settings/page.tsx` as a `"use client"` page that renders `TimezoneSettingsCard`, guarded by `usePermission` (ADMIN only)
- [x] 6.3 Add Settings entry to `configs/navigation.config.ts` with `permission: PERMISSIONS.MANAGE_SETTINGS` and `roles: ["ADMIN"]`
- [x] 6.4 Add `MANAGE_SETTINGS` to `common/constants/permissions.ts` and grant it to `ADMIN` in `ROLE_PERMISSIONS`
- [x] 6.5 Add i18n keys for the settings page in `messages/en.json` and `messages/vi.json` (`settings.title`, `settings.timezone`, `settings.saveSuccess`, `settings.saveError`, etc.)

## 7. Booking Form Datepickers (room-map)

- [x] 7.1 Update `modules/room-map/components/GuestSearchSection.tsx` to call `useHotelTimezone()` and wrap check-in/check-out `DatePicker` fields with `toHotelDayjs` (value) and `fromHotelDayjs` (onChange) conversions
- [x] 7.2 Add `disabledDate` prop to both DatePicker instances using `todayInTimezone(hotelTz)` so "past" is computed in hotel timezone, not browser timezone
- [x] 7.3 Verify that existing form validation logic comparing check-in/check-out still works after the conversion (both values are dayjs objects in the same timezone)

## 8. Reservation List Filter Date Range

- [x] 8.1 Update the check-in date range `RangePicker` in the reservations filter bar (`modules/reservations/`) to use hotel-timezone context — the picker sends `YYYY-MM-DD` strings derived from hotel-local dates (no conversion needed if the picker already stores date strings; verify and document)
- [x] 8.2 Confirm `buildLocalDayBoundsUTC` (now async, step 3.2) is correctly applied server-side in `GET /api/bookings` for `checkInFrom`/`checkInTo` params

## 9. Reservation Detail Modal Date Display

- [x] 9.1 Update `modules/reservations/components/ReservationDetailModal.tsx` to call `useHotelTimezone()` and replace any `formatDate`/`formatDateTime` calls for check-in/check-out fields with `formatInTimezone` from `common/utils/clientTimezone.ts`
- [x] 9.2 Update check-in/check-out display in `modules/reservations/components/ReservationTable.tsx` (column render functions) to use `formatInTimezone` with hotel timezone

## 10. Reservation Detail Page Date Display

- [x] 10.1 Update `app/[locale]/(main)/reservations/[id]/page.tsx` check-in/check-out displays to use `formatInTimezone` with hotel timezone (or pass timezone through from a server-side `GET /api/settings` call if the page is a Server Component)
