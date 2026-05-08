## Why

Dashboard hiện tại chỉ tổng hợp doanh thu từ mảng thuê ngắn hạn (`Payment → Invoice → Booking`). Doanh thu từ thuê dài hạn (`TenantBillPayment`) hoàn toàn bị bỏ sót, khiến các chỉ số tổng doanh thu, biểu đồ doanh thu/chi phí, và breakdown theo phương thức thanh toán phản ánh sai thực tế kinh doanh của khách sạn.

## What Changes

- Cộng thêm `TenantBillPayment` vào tổng doanh thu kỳ (`periodRevenue`) và doanh thu ngày (`revenueByDay`) trên `/api/dashboard/stats`
- Cộng thêm `TenantBillPayment` vào biểu đồ revenue vs expense tháng hiện tại (`monthlyRevenueVsExpense`) trên `/api/dashboard/charts`
- Cộng thêm `TenantBillPayment` vào breakdown theo phương thức thanh toán (`paymentMethodBreakdown`) trên `/api/dashboard/charts`
- Frontend hiển thị nhãn/tooltip phân biệt nguồn doanh thu (ngắn hạn vs dài hạn) nếu cần

## Capabilities

### New Capabilities

- `dashboard-long-term-revenue`: Tổng hợp `TenantBillPayment` vào các chỉ số doanh thu trên dashboard — doanh thu kỳ, doanh thu ngày, revenue vs expense, breakdown phương thức thanh toán. Không thay đổi giao diện hiện tại, chỉ làm giàu thêm dữ liệu.

### Modified Capabilities

*(Không có thay đổi spec-level với các capability hiện tại)*

## Impact

- `app/api/dashboard/stats/route.ts` — thêm query `TenantBillPayment`, cộng vào `periodRevenue` và `revenueByDay`
- `app/api/dashboard/charts/route.ts` — thêm query `TenantBillPayment`, cộng vào `monthlyRevenueVsExpense` và `paymentMethodBreakdown`
- Không thay đổi schema Prisma
- Không thay đổi frontend components (dữ liệu trả về cùng shape, chỉ con số thay đổi)
