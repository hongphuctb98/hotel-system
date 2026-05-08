interface BillLine {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface TenantBillApprovedParams {
  tenantName: string;
  billingMonth: string;
  leaseId: string;
  lines: BillLine[];
  totalAmount: number;
  dueDate: Date;
}

function formatVND(amount: number): string {
  return amount.toLocaleString("en-US") + " VND";
}

export function buildTenantBillApprovedHtml(params: TenantBillApprovedParams): string {
  const { tenantName, billingMonth, leaseId, lines, totalAmount, dueDate } = params;

  const lineRows = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border:1px solid #e8e8e8">${l.label}</td>
        <td style="padding:8px;border:1px solid #e8e8e8;text-align:right">${l.quantity}</td>
        <td style="padding:8px;border:1px solid #e8e8e8;text-align:right">${formatVND(l.unitPrice)}</td>
        <td style="padding:8px;border:1px solid #e8e8e8;text-align:right">${formatVND(l.amount)}</td>
      </tr>`
    )
    .join("");

  const dueDateStr = dueDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1677ff">Hóa đơn tháng ${billingMonth}</h2>
  <p>Kính gửi <strong>${tenantName}</strong>,</p>
  <p>Hóa đơn thuê phòng tháng <strong>${billingMonth}</strong> của bạn đã được xác nhận.</p>
  <p><strong>Mã hợp đồng:</strong> ${leaseId}</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="padding:8px;border:1px solid #e8e8e8;text-align:left">Khoản mục</th>
        <th style="padding:8px;border:1px solid #e8e8e8;text-align:right">Số lượng</th>
        <th style="padding:8px;border:1px solid #e8e8e8;text-align:right">Đơn giá</th>
        <th style="padding:8px;border:1px solid #e8e8e8;text-align:right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
    <tfoot>
      <tr style="font-weight:bold;background:#fafafa">
        <td colspan="3" style="padding:8px;border:1px solid #e8e8e8;text-align:right">Tổng cộng</td>
        <td style="padding:8px;border:1px solid #e8e8e8;text-align:right">${formatVND(totalAmount)}</td>
      </tr>
    </tfoot>
  </table>

  <p><strong>Hạn thanh toán:</strong> ${dueDateStr}</p>
  <p>Vui lòng thanh toán trước ngày hạn để tránh phát sinh phí trễ hạn. Liên hệ lễ tân nếu cần hỗ trợ.</p>

  <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0">
  <p style="color:#999;font-size:12px">Email này được gửi tự động từ hệ thống quản lý khách sạn.</p>
</body>
</html>`;
}
