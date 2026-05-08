## Context

Dashboard có 2 API route:
- `GET /api/dashboard/stats` — KPI cards (doanh thu kỳ, doanh thu hôm nay, tỷ lệ lấp phòng, check-in/out hôm nay)
- `GET /api/dashboard/charts` — Biểu đồ (checkin/checkout trend, revenue by room type, payment method breakdown, occupancy by week, monthly revenue vs expense)

Mô hình thanh toán ngắn hạn: `Booking → Invoice → Payment` — đã được tổng hợp đầy đủ.
Mô hình thanh toán dài hạn: `LeaseContract → TenantBill → TenantBillPayment` — hiện bị bỏ qua hoàn toàn.

`TenantBillPayment` có các field: `id`, `billId`, `amount` (Int, VND), `paymentDate` (DateTime), `paymentMethodId` (required), `notes`.
`TenantBill` có `status`: `DRAFT | PENDING | PARTIAL | PAID`.

Constraint hiện tại từ project: tất cả tiền đều lưu VND (Int). Timezone của khách sạn được đọc qua `getHotelTimezone()`.

## Goals / Non-Goals

**Goals:**
- Cộng `TenantBillPayment` vào `periodRevenue` và `revenueByDay` trong `/api/dashboard/stats`
- Cộng `TenantBillPayment` vào `monthlyRevenueVsExpense` trong `/api/dashboard/charts`
- Cộng `TenantBillPayment` vào `paymentMethodBreakdown` trong `/api/dashboard/charts`
- Không thay đổi response shape — frontend không cần sửa

**Non-Goals:**
- Không tách biệt doanh thu ngắn hạn vs dài hạn thành 2 line riêng trên chart (giữ nguyên shape `{ revenue, expense }` per day)
- Không thêm KPI card mới về thuê dài hạn
- Không thay đổi biểu đồ revenue by room type (TenantBillPayment không gắn với room type)
- Không thay đổi occupancy trend (concept này không áp dụng cho dài hạn)

## Decisions

### D1 — Chỉ tính TenantBillPayment đã thực tế thu tiền

**Quyết định:** Chỉ tổng hợp `TenantBillPayment` records, không filter theo `TenantBill.status`.

**Lý do:** `TenantBillPayment` là bản ghi thanh toán thực tế — mỗi record đã là tiền thật thu được, tương tự `Payment` của ngắn hạn. Bill status (`PARTIAL`, `PAID`) là kết quả tổng hợp từ các payment, không phải điều kiện lọc. Lọc theo `bill.status = PAID` sẽ bỏ sót các payment hợp lệ trong bill đang `PARTIAL`.

**Thay thế đã cân nhắc:** Filter theo `bill.status IN (PARTIAL, PAID)` — bị loại vì bỏ sót partial payments trên bill chưa đủ paid.

---

### D2 — Thêm query song song vào Promise.all hiện tại

**Quyết định:** Thêm `prisma.tenantBillPayment.findMany(...)` vào `Promise.all` hiện có trong cả 2 route, sau đó cộng kết quả vào các map đã tính.

**Lý do:** Pattern `Promise.all` đã được dùng nhất quán trong cả 2 route. Thêm vào đây đảm bảo không tăng số round-trip DB, không ảnh hưởng latency.

---

### D3 — Payment method breakdown: merge TenantBillPayment vào cùng map

**Quyết định:** Sau khi tổng hợp `paymentMethodPayments` (ngắn hạn), lặp thêm `tenantBillPayments` (dài hạn) vào cùng `methodAmount` / `methodCount` map.

**Lý do:** Cả 2 loại dùng chung bảng `PaymentMethod` — cùng `paymentMethodId` FK. Merge vào cùng map giúp UI hiển thị tổng theo phương thức thanh toán mà không cần thêm series mới.

---

### D4 — Không thêm revenue by room type cho dài hạn

**Quyết định:** Biểu đồ `revenueAndBookingsByRoomType` giữ nguyên, không cộng `TenantBillPayment`.

**Lý do:** `TenantBillPayment` không đi qua `room.roomType` — lease có room nhưng bill payment không link trực tiếp. Join thêm sẽ tăng query complexity không cần thiết cho v1. Có thể thêm sau nếu cần.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| TenantBillPayment amount là `Int` còn Payment amount là `Decimal` | Dùng `Number(p.amount)` cho cả hai — đã nhất quán với code hiện tại |
| Số lượng TenantBillPayment lớn làm chậm query | Cùng window time filter (periodStart → todayEnd) giới hạn tập kết quả |

## Migration Plan

1. Sửa 2 route handler (backend only) — không cần migration DB, không cần seed
2. Deploy — không có breaking change, response shape giữ nguyên
3. Không cần rollback plan đặc biệt — revert file là đủ
