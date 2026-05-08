## 1. API — /api/dashboard/stats

- [x] 1.1 Thêm query `prisma.tenantBillPayment.findMany` vào `Promise.all` với filter `paymentDate` trong `[periodStart, todayEnd]`, select `paymentDate` và `amount`
- [x] 1.2 Sau khi build `revenueMap` từ `Payment`, lặp thêm `tenantBillPayments` và cộng `amount` vào cùng `revenueMap[dayKey]`
- [x] 1.3 Cập nhật `periodRevenue` để cộng thêm tổng `tenantBillPayments.amount`

## 2. API — /api/dashboard/charts (monthlyRevenueVsExpense)

- [x] 2.1 Thêm query `prisma.tenantBillPayment.findMany` vào `Promise.all` với filter `paymentDate` trong `[monthStart, todayEnd]`, select `paymentDate` và `amount`
- [x] 2.2 Sau khi build `monthRevMap` từ `monthPayments`, lặp thêm `monthTenantBillPayments` và cộng `amount` vào cùng `monthRevMap[dayKey]`

## 3. API — /api/dashboard/charts (paymentMethodBreakdown)

- [x] 3.1 Thêm query `prisma.tenantBillPayment.findMany` vào `Promise.all` (cùng window 30 ngày), include `paymentMethod { code, name }`
- [x] 3.2 Sau khi build `methodAmount`/`methodCount` từ `paymentMethodPayments`, lặp thêm `tenantBillPayments` và merge vào cùng map theo `paymentMethod.name` và `paymentMethod.code` (required, không cần fallback null)
