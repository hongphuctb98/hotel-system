# Product Roadmap

> **Status:** Active — last updated 2026-04-21
> **Owner:** Ngô Hồng Phúc

This document tracks the 5 large initiatives currently in scope for the hotel management system. Each initiative lists its current status, key architectural decisions, dependencies, and links to the OpenSpec change folder if one exists.

---

## 1. Recommended Sequence

```
Phase 0 (continuous) ─ Responsive design standard
                        │
                        ▼ applied to every module below
Phase 1 ──► Housekeeping module
Phase 2 ──► Inventory / Stock management    (prerequisite of Phase 3 goods flow)
Phase 3 ──► Expense module                  (spec ALREADY WRITTEN — see below)
Phase 4 ──► Monthly Rental extension        (biggest architectural change)
```

**Sequencing rationale:**

- **Responsive** is a cross-cutting standard, not a phase. Establish tokens and audit early so later modules don't need rework.
- **Housekeeping** is the most independent module (DB schema already exists) and is the best testbed for mobile-first patterns.
- **Inventory before Expense:** goods-purchase expense documents must feed stock movements. Reversing this order creates historical-data rework.
- **Monthly Rental last:** it touches Booking/Invoice/Payment core; depends on Inventory + Expense for tenant utility billing.

---

## 2. Initiatives

### Initiative A — Responsive Design Standard

- **Status:** Not started
- **Type:** Cross-cutting standard (continuous)
- **OpenSpec change:** _none yet — needs one_
- **Scope (VN):** Thiết kế responsive cho mobile, tablet, PC.

**Key decisions to make:**
- Breakpoint strategy (AntD `Grid.useBreakpoint()` tokens vs. Tailwind breakpoints — pick one as primary).
- `AppTable` mobile behavior: horizontal scroll vs. card-list view vs. hidden secondary columns.
- `AppDrawer` mobile behavior: full-screen on `xs/sm`.
- Sidebar pattern on mobile: hamburger vs. bottom-nav.
- Mobile-first targets: housekeeping staff, receptionist on tablet.
- Desktop-first targets: admin reports, manager dashboards.

**Deliverables:**
- `openspec/responsive-standards.md` (mirrors `ui-standards.md`)
- Audit of existing pages with prioritized remediation list
- Shared responsive utility hooks/components in `common/`

---

### Initiative B — Housekeeping Module

- **Status:** Not started (DB model `HousekeepingTask` exists in `prisma/schema.prisma`)
- **OpenSpec change:** _none yet — needs one_
- **Scope (VN):** Housekeeping module đầy đủ.

**Key scope:**
- Auto-create task on booking checkout.
- Assignment UI (manual or auto round-robin per floor/zone).
- Status transitions: `PENDING → IN_PROGRESS → DONE → VERIFIED`.
- Trigger `RoomStatus` transitions (`DIRTY → CLEANING → CLEAN`).
- Mobile-first UI (staff using phones).
- Per-`RoomType` cleaning checklists (future enhancement).
- Before/after photo uploads (future enhancement).
- Integration point with Inventory (future): auto-deduct consumables per clean.

**Risks:**
- Concurrent task state updates (two staff marking same room).
- Offline support for staff on weak wifi.

**Dependencies:** Responsive standard (Initiative A) should land first so mobile patterns are consistent.

---

### Initiative C — Inventory / Stock Management

- **Status:** Not started
- **OpenSpec change:** _none yet — needs one_
- **Scope (VN):** Quản lý kho — khi khách dùng trừ trong kho đi, khi hàng nhập tới tăng số lượng, kiểm kê định kỳ.

**Proposed domain model:**

```
InventoryItem          (towels, toothbrush, water, beer, ...)
  - sku, name, unit, reorderLevel, currentStock (cached)
  - linkedServiceItemId?  (FK → existing ServiceItem for auto-deduct)

StockMovement          (immutable ledger — INSERT only, never UPDATE)
  - itemId, type (IN | OUT | ADJUST)
  - quantity (signed)
  - reason (PURCHASE | BOOKING_SERVICE | STOCKTAKE | WASTE | MANUAL)
  - refType, refId   (back-ref to ExpenseDocument, BookingService, Stocktake)
  - occurredAt, createdBy

Stocktake              (periodic physical count)
  - periodDate, status (DRAFT | CONFIRMED)
  - lines: { itemId, systemQty, countedQty, varianceQty, note }
  - On confirm → emit StockMovement (type=ADJUST) for each variance line
```

**Key decisions:**
- **Event-sourced ledger:** `currentStock` is a derived cache; truth is `SUM(StockMovement.quantity)`. Do not allow mutation of past movements.
- **Idempotent BookingService integration:** edit/cancel of a BookingService must emit a reversing movement, not rewrite history.
- **Race conditions:** two staff adding the same scarce item simultaneously — need transaction boundary + either optimistic lock on `InventoryItem.currentStock` or accept-negative-with-alert policy.
- **Integration with Expense (Initiative D):** `ExpenseDocument` of type `INVENTORY` must, on create, emit `StockMovement` type=IN per `InventoryReceiptLine`.

**Dependency:** Blocks Expense goods-flow. Must ship before Initiative D lands in production, OR Expense's `InventoryReceiptLine` must be stub-only until Inventory arrives.

---

### Initiative D — Expense Module

- **Status:** **Fully spec'd — ready to implement**
- **OpenSpec change:** [`openspec/changes/hotel-expense-module/`](changes/hotel-expense-module/)
- **Scope (VN):** Module quản lý chi tiêu — hóa đơn điện nước, hóa đơn hàng hóa tổng (khăn, bàn chải, nước, bia…).

**What's already designed:**
- `ExpenseDocument` header with type (`SERVICE` | `INVENTORY`), accounting-month-aware entry.
- `ServiceExpenseLine` for utility/operational/personnel costs.
- `InventoryReceiptLine` for goods purchases (qty, unit price, line total).
- Two-level master data: `ExpenseCategory` → `ExpenseItem`.
- API routes under `/api/expense-documents` + `/api/master/expense-{categories,items}`.
- `modules/expenses/` + `modules/finance/` UI modules.
- `NetProfitCard` dashboard widget.
- Full tasks list in `openspec/changes/hotel-expense-module/tasks.md`.

**Open questions before implementation:**
- Should `InventoryReceiptLine` emit a `StockMovement` to Inventory (Initiative C) on create? → Yes, but depends on Inventory shipping first OR feature-flagged.
- Should utility bills capture meter readings (prev/current) to enable per-room allocation for Monthly Rental (Initiative E) later? → Recommend adding `meterReadingPrev`, `meterReadingCurr`, `consumption` optional fields now to avoid migration later.

---

### Initiative E — Monthly Rental Extension (Nhà trọ)

- **Status:** Not started — **needs architecture spec BEFORE code**
- **OpenSpec change:** _none yet — needs one, high priority_
- **Scope (VN):** Tích hợp mở rộng hệ thống hotel hiện tại để cho thuê theo tháng dạng nhà trọ.

**Domain comparison:**

| Aspect | Hotel | Monthly Rental (Nhà trọ) |
|---|---|---|
| Billing cycle | Per night | Monthly |
| Contract | Informal | Formal (3–12 months), deposit required |
| Utilities | Bundled in room rate | Metered per room (electric + water meter) |
| Check-in/out | Daily turnover | Rare (move-in / move-out) |
| Guest entity | `Guest` | `Tenant` (may reuse Guest + tenancy link) |
| Invoice trigger | On checkout | Scheduled job, monthly |

**Two architectural options:**

**Option 1 — Extend existing `Booking`:** add `bookingType`, `contractEndDate`, `depositAmount`.
- Pros: minimal schema change, maximal reuse.
- Cons: Booking aggregate bloats; business rules fork into `if monthly else nightly` throughout the codebase. Technical debt compounds.

**Option 2 (RECOMMENDED) — Separate `Tenancy` aggregate:**
- `Room.usageType: HOTEL | MONTHLY_RENTAL | HYBRID` decides which flow a room belongs to.
- New aggregate: `Tenancy { tenantId, roomId, startDate, endDate, monthlyRent, deposit, status }`.
- New: `RoomMeterReading { roomId, type (ELECTRIC | WATER), readingDate, value }`.
- New: `TenancyInvoice` auto-generated monthly by scheduled job (rent + metered utilities + extras).
- Reuses: `Payment`, `Expense`, `Inventory`.
- Keeps: `Booking` unchanged for hotel flow.

**DDD justification:** Hotel booking and monthly tenancy are two bounded contexts with different lifecycles, pricing rules, and invariants. Forcing them into one aggregate violates cohesion.

**Dependencies:**
- Initiative C (Inventory) — optional (tenants often self-supply, but useful if hotel provides linen etc.).
- Initiative D (Expense) — **required**: utility bills must capture meter readings to support per-room allocation.
- Deposit handling — may require extending `Payment` or introducing `DepositTransaction`.

**Risks:**
- DB migration in production with existing bookings.
- Feature flag per-instance rollout recommended.
- RBAC: tenants vs. guests may need different staff permissions.

---

## 3. Cross-Cutting Concerns (apply to every initiative)

- **RBAC:** Each new module must extend `common/constants/permissions.ts` and `ROLE_PERMISSIONS`. Approval flows (who confirms stocktake, who approves expense over threshold) must be role-gated.
- **i18n:** All user-facing strings in `messages/en.json` and `messages/vi.json`.
- **Navigation:** New pages registered in `configs/navigation.config.ts` with `permission` + `roles`.
- **UX standards:** Follow `openspec/ui-standards.md` — loading states, toast feedback, cache invalidation, mode-aware submit labels, soft-delete reactivation flow.
- **Responsive:** Every new screen must pass the audit defined in Initiative A.

---

## 4. Next Actions

1. Create `openspec/changes/responsive-design-standard/` (Initiative A) — proposal + design.
2. Create `openspec/changes/housekeeping-module/` (Initiative B) — proposal + design + tasks.
3. Create `openspec/changes/inventory-module/` (Initiative C) — proposal + design + tasks (highest design-risk item).
4. Review and implement `openspec/changes/hotel-expense-module/` (Initiative D — already spec'd). Add optional `meterReading*` fields to `ServiceExpenseLine` for future tenant utility allocation.
5. Create `openspec/changes/monthly-rental-extension/` (Initiative E) — proposal + design only; do not start tasks until Initiatives C and D are in production.
