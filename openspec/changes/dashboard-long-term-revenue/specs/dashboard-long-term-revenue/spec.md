## ADDED Requirements

### Requirement: Dashboard tổng hợp doanh thu dài hạn vào KPI doanh thu kỳ

`GET /api/dashboard/stats` SHALL cộng tổng `TenantBillPayment.amount` có `paymentDate` trong window `[periodStart, todayEnd]` vào `periodRevenue` và `revenueByDay`.

#### Scenario: Có TenantBillPayment trong kỳ

- **WHEN** có `TenantBillPayment` với `paymentDate` trong khoảng `[periodStart, todayEnd]`
- **THEN** `periodRevenue` bằng tổng `Payment.amount` + tổng `TenantBillPayment.amount` trong kỳ

#### Scenario: TenantBillPayment trong ngày hôm nay

- **WHEN** có `TenantBillPayment` với `paymentDate` trong ngày hôm nay (theo timezone khách sạn)
- **THEN** `todayCollected` bao gồm cả `TenantBillPayment.amount` thanh toán hôm nay

#### Scenario: Không có TenantBillPayment trong kỳ

- **WHEN** không có `TenantBillPayment` nào trong khoảng thời gian được lọc
- **THEN** `periodRevenue` và `revenueByDay` giữ nguyên giá trị từ `Payment` (ngắn hạn)

---

### Requirement: Dashboard tổng hợp doanh thu dài hạn vào biểu đồ revenue tháng

`GET /api/dashboard/charts` SHALL cộng `TenantBillPayment.amount` có `paymentDate` trong tháng hiện tại vào `monthlyRevenueVsExpense[].revenue` theo từng ngày.

#### Scenario: Có TenantBillPayment trong tháng

- **WHEN** có `TenantBillPayment` với `paymentDate` trong tháng hiện tại
- **THEN** `monthlyRevenueVsExpense` mỗi ngày có `revenue` = `Payment` ngắn hạn + `TenantBillPayment` trong ngày đó

#### Scenario: TenantBillPayment và Payment ngắn hạn cùng ngày

- **WHEN** cùng một ngày có cả `Payment` và `TenantBillPayment`
- **THEN** `revenue` của ngày đó bằng tổng cộng cả hai nguồn

---

### Requirement: Dashboard tổng hợp doanh thu dài hạn vào breakdown phương thức thanh toán

`GET /api/dashboard/charts` SHALL cộng `TenantBillPayment` vào `paymentMethodBreakdown` theo `paymentMethodId`, gộp vào cùng entry với `Payment` ngắn hạn nếu cùng phương thức.

#### Scenario: TenantBillPayment dùng phương thức đã có

- **WHEN** `TenantBillPayment.paymentMethodId` trùng với phương thức đã có từ `Payment` ngắn hạn
- **THEN** entry đó có `amount` và `count` cộng dồn cả hai nguồn

#### Scenario: TenantBillPayment dùng phương thức chưa có

- **WHEN** `TenantBillPayment.paymentMethodId` chưa xuất hiện trong `Payment` ngắn hạn của kỳ
- **THEN** một entry mới được thêm vào `paymentMethodBreakdown` cho phương thức đó

---

### Requirement: Chỉ tính TenantBillPayment đã thực thu

Hệ thống SHALL tính tất cả `TenantBillPayment` records trong window thời gian mà không filter thêm theo `TenantBill.status`, vì mỗi `TenantBillPayment` là tiền thật đã thu.

#### Scenario: Bill ở trạng thái PARTIAL có payment

- **WHEN** `TenantBill.status = "PARTIAL"` và có `TenantBillPayment` liên kết
- **THEN** `TenantBillPayment.amount` vẫn được tính vào doanh thu dashboard

#### Scenario: Bill ở trạng thái PAID

- **WHEN** `TenantBill.status = "PAID"` và có nhiều `TenantBillPayment`
- **THEN** tổng tất cả `TenantBillPayment.amount` của bill đó được tính vào doanh thu
