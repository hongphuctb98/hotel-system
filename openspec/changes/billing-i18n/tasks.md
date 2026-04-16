## 1. Add i18n keys to message files

- [x] 1.1 Add the following 16 keys to `messages/en.json` under `"billing"`: `"issuedAt": "Issued"`, `"back": "Back"`, `"invoiceDetails": "Invoice Details"`, `"paymentHistory": "Payment History"`, `"summary": "Summary"`, `"outstanding": "Outstanding"`, `"noPayments": "No payments recorded yet."`, `"paymentRecorded": "Payment recorded"`, `"amount": "Amount"`, `"reference": "Reference"`, `"referenceNote": "Reference / Note"`, `"description": "Description"`, `"qty": "Qty"`, `"methodLabel": "Method"`, `"stay": "Stay"`, `"hotelNameFallback": "Hotel Name"`
- [x] 1.2 Add matching Vietnamese translations for all 16 keys to `messages/vi.json` under `"billing"`: `"issuedAt": "Ngày xuất"`, `"back": "Quay lại"`, `"invoiceDetails": "Chi tiết hóa đơn"`, `"paymentHistory": "Lịch sử thanh toán"`, `"summary": "Tổng kết"`, `"outstanding": "Còn lại"`, `"noPayments": "Chưa có thanh toán nào."`, `"paymentRecorded": "Đã ghi nhận thanh toán"`, `"amount": "Số tiền"`, `"reference": "Tham chiếu"`, `"referenceNote": "Tham chiếu / Ghi chú"`, `"description": "Mô tả dịch vụ"`, `"qty": "SL"`, `"methodLabel": "Phương thức"`, `"stay": "Thời gian lưu trú"`, `"hotelNameFallback": "Tên khách sạn"`

## 2. Billing list page (`app/[locale]/(main)/billing/page.tsx`)

- [x] 2.1 Replace hardcoded `title: "Issued"` in the `issuedAt` column with `t("billing.issuedAt")`

## 3. Invoice detail page (`app/[locale]/(main)/billing/[id]/page.tsx`)

- [x] 3.1 Replace payment column titles: `"Date"` → `t("billing.issuedAt")`, `"Method"` → `t("billing.methodLabel")`, `"Reference"` → `t("billing.reference")`, `"Amount"` → `t("billing.amount")`
- [x] 3.2 Replace service column titles: `"Description"` → `t("billing.description")`, `"Date"` → `t("billing.issuedAt")`, `"Qty"` → `t("billing.qty")`, `"Unit Price"` → `t("billing.unitPrice")` (already exists), `"Total"` → `t("billing.total")` (already exists)
- [x] 3.3 Replace AppCard titles: `"Invoice Details"` → `t("billing.invoiceDetails")`, `"Services"` → `t("booking.servicesSection")`, `"Payment History"` → `t("billing.paymentHistory")`, `"Summary"` → `t("billing.summary")`
- [x] 3.4 Replace Descriptions.Item labels: `"Invoice #"` → `t("billing.invoiceNumber")`, `"Status"` → `t("common.status")`, `"Issued"` → `t("billing.issuedAt")`, `"Booking #"` → `t("booking.bookingNumber")`, `"Guest"` → `t("booking.guest")`, `"Room"` → `t("booking.room")`, `"Stay"` → `t("billing.stay")`
- [x] 3.5 Replace `"Back"` button text with `t("billing.back")`
- [x] 3.6 Replace `"No payments recorded yet."` with `t("billing.noPayments")`
- [x] 3.7 Replace `"Paid"` inline label with `t("billing.paid")` (key already exists) and `"Outstanding"` inline label with `t("billing.outstanding")`

## 4. Payment modal (`modules/billing/components/PaymentModal.tsx`)

- [x] 4.1 Replace `message.success("Payment recorded")` with `message.success(t("billing.paymentRecorded"))`
- [x] 4.2 Replace `label="Amount"` on the amount field with `label={t("billing.amount")}`
- [x] 4.3 Replace `label="Reference / Note"` with `label={t("billing.referenceNote")}`

## 5. Invoice print template (`modules/billing/components/InvoicePrintTemplate.tsx`)

- [x] 5.1 Replace service table `<Th>` strings: `"Description"` → `t("description")`, `"Date"` → `t("issuedAt")`, `"Qty"` → `t("qty")`, `"Unit Price"` → `t("unitPrice")`, `"Total"` → `t("total")`
- [x] 5.2 Replace payment table `<Th>` strings: `"Date"` → `t("issuedAt")`, `"Method"` → `t("methodLabel")`, `"Reference"` → `t("reference")`, `"Amount"` → `t("amount")`
- [x] 5.3 Replace the hardcoded `"Hotel Name"` fallback with `t("hotelNameFallback")`
