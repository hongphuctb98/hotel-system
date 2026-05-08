## Context

The long-term rental module currently has a flat meter readings list (`GET /api/long-term/meter-readings`) that returns one record per `(leaseId, feeItemId, readingMonth)` triple. The UI renders one table row per record, so a lease with 3 metered fee items produces 3 separate rows for the same month — making the list hard to scan and hiding the invoice state for each period.

The `TenantBill` model already carries a `status` field (`DRAFT | PENDING | PARTIAL | PAID`) linked to `(leaseId, billingMonth)`. The lease model carries `status` (`ACTIVE | EXPIRED | TERMINATED`). Neither is surfaced on the readings list today.

Numbers are stored as `Decimal(10,3)` in the DB and displayed with `.toFixed(3)` in the UI. The business only requires 1 decimal place in practice.

## Goals / Non-Goals

**Goals:**
- Group the readings list to one row per `(leaseId, readingMonth)`, showing all fee-item readings inline.
- Show lease status and bill status on every row so staff know whether a period is invoiced/paid before editing.
- Replace the single-item create form with a multi-row form that submits all fee items for a period at once.
- Round display and input to 1 decimal place consistently.
- Improve per-file upload progress and error isolation in `LeaseFormDrawer`.

**Non-Goals:**
- No changes to the DB schema.
- No changes to the existing `POST /PUT /api/long-term/meter-readings` business logic.
- No changes to the bill generation or payment flows.
- No mobile-specific layout changes beyond the existing responsive defaults.

## Decisions

### 1. New summary endpoint instead of client-side grouping

**Decision:** Add `GET /api/long-term/meter-readings/summary` that returns data grouped by `(leaseId, readingMonth)`, with `readings[]`, lease info, and a joined `bill` object (nullable).

**Why:** Client-side grouping would require loading all records up front (no pagination) or doing multi-step fetches with impedance mismatch. A server-side group is a single query with a simple Prisma `groupBy` + `findMany` + bill join. The existing flat endpoint is unchanged so other callers are unaffected.

**Alternative considered:** Add `?grouped=true` to the existing endpoint — rejected because it mixes two very different response shapes in one route, complicating typing and documentation.

**Response shape:**
```ts
type SummaryRow = {
  leaseId: string;
  readingMonth: string;
  lease: { id: string; status: string; room: { number: string }; guest: { firstName: string; lastName: string } };
  readings: {
    id: string; feeItemId: string;
    feeItem: { name: string; unit: string | null };
    previousReading: number; currentReading: number; consumption: number;
  }[];
  bill: { id: string; status: string; totalAmount: number; dueDate: string } | null;
};
```

Pagination: same `{ total, page, limit, totalPages }` meta on count of unique `(leaseId, readingMonth)` pairs.

### 2. Multi-row form submits sequential individual API calls

**Decision:** The create/edit form collects all fee-item rows for one `(leaseId, readingMonth)` and submits them as sequential `POST` (create) or `PUT` (update) calls to the existing individual endpoints.

**Why:** The existing endpoints already handle validation (feeItem type check, duplicate check, bill lock check, bill-line update side-effect). Adding a bulk endpoint would duplicate all that logic. Sequential calls are acceptable because meter readings are submitted at most once a month per lease, and the number of metered fee items is small (2–5).

**Duplicate detection:** When creating, the form warns if a reading for that `(leaseId, feeItemId, readingMonth)` already exists (the server returns 409 `READING_DUPLICATE`). The form shows a per-row error and continues submitting other rows.

### 3. Rounding: 1 decimal in UI, 3 stored in DB

**Decision:** All InputNumbers use `precision={1}` and `step={0.1}`. Display uses `.toFixed(1)`. The value sent to the server is rounded to 1 decimal (`Math.round(v * 10) / 10`) before submit. The DB continues to store Decimal(10,3); extra precision is simply unused.

**Why:** Rounding at the input layer avoids floating-point surprises when reading back values. Keeping DB precision at 3 preserves future flexibility without a migration.

### 4. Lease form: per-file upload with individual error handling

**Decision:** Refactor the sequential `for...of` file loop in `handleSubmit` to use `Promise.allSettled` instead of sequential `await`. After all uploads complete, show a summary: "N files uploaded successfully, M failed". The overall form submit still succeeds as long as the lease was saved; file upload failures are non-fatal.

**Why:** Current implementation fails fast — a single upload error causes all subsequent files to be skipped. `Promise.allSettled` uploads all files in parallel and surfaces individual errors without blocking the others.

## Risks / Trade-offs

- **Sequential multi-row submit latency:** Submitting 3 fee-item readings = 3 sequential API round-trips. For the expected 2–5 items this is ~0.3–0.8 s on local network. Acceptable. → Could be parallelised with `Promise.allSettled` in a future iteration if needed.
- **Summary endpoint pagination accuracy:** Grouping by `(leaseId, readingMonth)` requires a separate count query (`SELECT COUNT(DISTINCT leaseId, readingMonth) FROM long_term_meter_readings`). Prisma does not natively support `COUNT(DISTINCT ...)` — use `prisma.$queryRaw` for the count, or over-approximate by counting all records and dividing (less accurate). → Use raw SQL count for correctness.
- **Edit form loads from summary row:** The edit form receives a `SummaryRow` (all readings for a period). It pre-fills all rows. If some readings were created individually via the old form and some are missing, the form shows only the existing ones; new fee items can be added. → Acceptable behaviour; no data integrity risk.

## Migration Plan

1. Deploy new `summary` endpoint — additive, no breaking change.
2. Deploy updated UI components (MeterReadingTable, MeterReadingFormDrawer) — purely frontend; no data migration.
3. No rollback complexity: old flat endpoint is untouched; reverting UI just means re-deploying the previous version.

## Open Questions

- Should the summary endpoint filter out lease+month pairs with zero readings (i.e., only show months where at least one reading exists)? → Yes (simplest: group only existing reading records; months with no readings won't appear).
- Should editing a period's readings be blocked in the UI if the bill is PAID? → Yes: show the row as read-only / hide the edit button when `bill.status === "PAID"`. Matching backend enforcement already exists on the PUT endpoint.
