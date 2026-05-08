## Why

The meter readings screen currently displays one flat row per lease × fee-item × month, forcing staff to scroll through many repeated rows for the same contract period. Bill status is invisible from the readings list, so staff cannot tell at a glance whether a period is already invoiced or paid. Additionally, all meter values are shown with 3 decimal places while the business only needs 1. Both issues cause friction in the monthly billing workflow.

## What Changes

- **Meter readings list** — grouped view: one row per lease × month (not per fee-item); each row shows all readings for that period inline, plus lease status and bill status badges.
- **Meter readings create/edit form** — redesigned to enter all fee items for a lease × month in one form (dynamic rows), replacing the current one-item-at-a-time form.
- **New backend summary endpoint** — `GET /api/long-term/meter-readings/summary` returns data pre-grouped by lease × month with TenantBill status joined; used exclusively by the new list view.
- **Decimal rounding** — all meter values (previous, current, consumption) rounded to 1 decimal place in both UI display and InputNumber precision; no change to DB storage (Decimal 10,3).
- **Lease form attachment UX** — improve the upload section in `LeaseFormDrawer`: show per-file upload progress, handle individual file errors without aborting the whole submission, and prevent duplicate file names.

## Capabilities

### New Capabilities

- `meter-readings-grouped-view`: Grouped meter readings list (lease × month rows) with inline fee-item readings, lease status, bill status badges, and a new summary API endpoint.
- `meter-readings-multi-entry-form`: Single form to create/edit all fee-item readings for one lease × month in one operation using dynamic rows.

### Modified Capabilities

- `meter-readings-rounding`: Change display and input precision from 3 to 1 decimal place across MeterReadingTable, MeterReadingFormDrawer, and the summary API.

## Impact

- **New API route**: `app/api/long-term/meter-readings/summary/route.ts`
- **Modified components**: `modules/long-term/components/MeterReadingTable.tsx`, `modules/long-term/components/MeterReadingFormDrawer.tsx`
- **Modified hooks**: `modules/long-term/hooks/useMeterReadings.ts` (add `useMeterReadingsSummary`)
- **Modified service**: `common/services/meterReadingService.ts` (add `summary()`)
- **Minor fix**: `modules/long-term/components/LeaseFormDrawer.tsx` — per-file upload progress, individual error handling
- **i18n**: New keys for bill status display in meter readings list
- No DB schema changes; no changes to existing `POST /PUT /api/long-term/meter-readings` routes
