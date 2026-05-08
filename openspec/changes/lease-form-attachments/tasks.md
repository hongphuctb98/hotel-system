## 1. Summary API Endpoint

- [x] 1.1 Create `app/api/long-term/meter-readings/summary/route.ts` — `GET` handler that fetches distinct `(leaseId, readingMonth)` pairs from `longTermMeterReading`, paginates using raw SQL count, then fetches grouped readings with `include: { feeItem: true, lease: { include: { room: true, guest: true } } }`, and joins the matching `TenantBill` (nullable) for each pair
- [x] 1.2 Return response shape `SummaryRow[]` with `{ leaseId, readingMonth, lease, readings[], bill | null }` and standard `{ total, page, limit, totalPages }` meta; support `?leaseId` and `?readingMonth` filters

## 2. Service and Hook

- [x] 2.1 Add `summary(params)` function to `common/services/meterReadingService.ts` — calls `GET /api/long-term/meter-readings/summary`
- [x] 2.2 Add `useMeterReadingsSummary(params)` hook to `modules/long-term/hooks/useMeterReadings.ts` — React Query hook with `queryKey: ["meter-readings-summary", params]`; invalidate on meter-reading mutations

## 3. Grouped List Table

- [x] 3.1 Rewrite `modules/long-term/components/MeterReadingTable.tsx` to use `useMeterReadingsSummary` instead of `useMeterReadings`; change `rowKey` to `leaseId + readingMonth`
- [x] 3.2 Update table columns: (1) Lease — room number + guest name; (2) Month — `MM/YYYY`; (3) Readings — render inline list of `feeName: prev → curr (consumption unit)` for each reading in the group; (4) Lease status badge; (5) Bill status badge (or "No bill" muted text); (6) Actions
- [x] 3.3 Hide Edit button when `bill?.status === "PAID"`
- [x] 3.4 Add i18n keys for bill status labels and "no bill" state: `longTerm.meterReading.billStatusNone`, and reuse existing `longTerm.bill.status*` keys where available

## 4. Multi-Row Create/Edit Form

- [x] 4.1 Rewrite `modules/long-term/components/MeterReadingFormDrawer.tsx` — form fields: lease Select (top), month Select (top), dynamic rows list; each row has: fee-item Select, previousReading InputNumber, currentReading InputNumber, remove-row button; Add Row button at bottom
- [x] 4.2 Populate the fee-item Select options from `useFeeItems({ type: "METERED", showInactive: false })`; each row's fee-item Select filters out fee items already chosen by other rows (deduplication)
- [x] 4.3 Add row-level validator: `currentReading >= previousReading`; use `t("longTerm.errors.READING_CURRENT_LESS_THAN_PREV")`
- [x] 4.4 On create submit: for each row with data, call `createReading.mutateAsync({ leaseId, readingMonth, feeItemId, previousReading: round1(prev), currentReading: round1(curr) })`; collect per-row errors (409 `READING_DUPLICATE` → show inline row error); show summary success/error via `message`
- [x] 4.5 On edit open: receive `summaryRow` prop (the full grouped SummaryRow); pre-fill one form row per existing reading; disable lease and month selectors; on submit call `updateReading.mutateAsync` for each changed row
- [x] 4.6 Apply `round1 = (v: number) => Math.round(v * 10) / 10` before submitting to API; set `precision={1}` and `step={0.1}` on all reading InputNumbers
- [x] 4.7 Update `MeterReadingTable` to pass `summaryRow` to `MeterReadingFormDrawer` on edit (replacing old single-record `editReading`)

## 5. Rounding Display

- [x] 5.1 Update all `.toFixed(3)` calls in `MeterReadingTable.tsx` to `.toFixed(1)`
- [x] 5.2 Ensure the readings inline display in the grouped row also uses 1 decimal (feeName: `prev.toFixed(1)` → `curr.toFixed(1)` (`consumption.toFixed(1)` unit))

## 6. Lease Form Attachment UX

- [x] 6.1 Replace the sequential `for...of` upload loop in `LeaseFormDrawer.handleSubmit` with `Promise.allSettled` parallel uploads; after all settle, collect failures and show `message.error` listing failed filenames if any; do not abort the overall submit for upload failures
- [x] 6.2 Add per-file size display in the staged file list (show `(X MB)` next to each filename before upload)
