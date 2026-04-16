"use client";

import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Invoice, Payment, BookingService } from "@/types/booking.types";
import type { HotelSettings } from "@/common/hooks/useHotelSettings";
import { Flex } from "antd";

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  hotelSettings: HotelSettings | undefined;
}

export default function InvoicePrintTemplate({
  invoice,
  hotelSettings,
}: InvoicePrintTemplateProps) {
  const t = useTranslations("billing");
  const { format, formatDate, formatDateTime } = useLocaleCurrency();

  const booking = invoice.booking;

  // ── Derived values ────────────────────────────────────────────────────────
  const chargeType: string = (booking.chargeType ?? "nightly").toLowerCase();
  const roomTotal = Number(booking.totalAmount);
  const surcharge = Number(booking.surchargeAmount ?? 0);
  const servicesTotal = booking.services.reduce(
    (sum, s: BookingService) => sum + Number(s.totalPrice),
    0
  );
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(0, Number(invoice.totalAmount) - totalPaid);

  // ── Room stay duration ────────────────────────────────────────────────────
  const checkIn  = dayjs(booking.checkInDate);
  const checkOut = dayjs(booking.checkOutDate);

  let durationLabel = "";
  let rateLabel = "";

  if (chargeType === "nightly") {
    const nights = Math.max(1, checkOut.diff(checkIn, "day"));
    durationLabel = `${nights} ${nights === 1 ? t("printNight") : t("printNights")}`;
    rateLabel = `${format(Number(booking.baseRate))} / ${t("printNight")}`;
  } else if (chargeType === "blockhours" || chargeType === "blockHours") {
    const blockHours = booking.hourlyBlockHours ?? 0;
    durationLabel = `${blockHours} ${t("printBlockHours")}`;
    rateLabel = `${format(Number(booking.baseRate))} / ${t("printBlock")}`;
  } else {
    // hourly
    const hours = Math.max(1, checkOut.diff(checkIn, "hour"));
    const rate = booking.hourlyRatePerHour ?? booking.baseRate;
    durationLabel = `${hours} ${t("printHours")}`;
    rateLabel = `${format(Number(rate))} / ${t("printHour")}`;
  }

  const hotelName = hotelSettings?.hotelName ?? t("hotelNameFallback");
  const address   = hotelSettings?.address   ?? null;
  const phone     = hotelSettings?.phone     ?? null;
  const email     = hotelSettings?.email     ?? null;

  return (
    <div
      className="hidden print:block"
      aria-hidden="true"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12, color: "#000", background: "#fff" }}
    >
      {/* ── Header: Hotel info + Invoice title ─────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #000" }}>
        <Flex gap ={12} align="start">
          <div style={{ marginBottom: 4 }}>
            <img src="https://www.bing.com/th/id/OIP.f4HQmH-0buCH5-bUJJ7eUQHaHa?w=193&h=193&c=8&rs=1&qlt=90&o=6&pid=3.1&rm=2" alt="Hotel Logo" style={{ maxHeight: 60 }} />
          </div>
         <div>
           <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{hotelName}</div>
          {address && <div style={{ color: "#555" }}>{address}</div>}
          {phone   && <div style={{ color: "#555" }}>Tel: {phone}</div>}
          {email   && <div style={{ color: "#555" }}>{email}</div>}
         </div>
        </Flex>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>
            {t("printInvoice")}
          </div>
          <div style={{ marginBottom: 2 }}>
            <span style={{ color: "#555" }}># </span>
            <strong>{invoice.invoiceNumber}</strong>
          </div>
          <div style={{ marginBottom: 2, color: "#555" }}>
            {t("printIssuedAt")}: {formatDateTime(invoice.issuedAt)}
          </div>
          <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: invoice.isPaid ? "#d4edda" : "#fff3cd", color: invoice.isPaid ? "#155724" : "#856404", border: `1px solid ${invoice.isPaid ? "#c3e6cb" : "#ffeeba"}` }}>
            {invoice.isPaid ? t("paid").toUpperCase() : t("unpaid").toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Guest + Booking details ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 40, marginBottom: 12, paddingBottom: 16, borderBottom: "1px solid #ddd" }}>
        <div style={{ flex: 1 }}>
          <SectionLabel>{t("printGuest")}</SectionLabel>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {booking.guest.firstName} {booking.guest.lastName}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <SectionLabel>{t("printBooking")}</SectionLabel>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              <DetailRow label={`${t("printBooking")} #`} value={booking.bookingNumber} />
              <DetailRow label={t("printRoom")} value={`${booking.room.number} · ${booking.room.roomType.name}`} />
              <DetailRow label={t("printStay")} value={`${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)}`} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Room charges ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionLabel>{t("printRoomCharges")}</SectionLabel>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            <DetailRow label={t("printChargeType")} value={t(`printChargeType_${chargeType === "blockhours" ? "blockHours" : chargeType}`)} />
            <DetailRow label={t("printRate")}        value={rateLabel} />
            <DetailRow label={t("printDuration")}    value={durationLabel} />
          </tbody>
        </table>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              <SummaryRow label={t("printRoomSubtotal")} value={format(roomTotal)} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Services ────────────────────────────────────────────────────── */}
      {booking.services && booking.services.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{t("printServices")}</SectionLabel>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <Th align="left">{t("description")}</Th>
                <Th align="left">{t("issuedAt")}</Th>
                <Th align="center">{t("qty")}</Th>
                <Th align="right">{t("unitPrice")}</Th>
                <Th align="right">{t("total")}</Th>
              </tr>
            </thead>
            <tbody>
              {booking.services.map((s: BookingService) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Td align="left">{s.serviceItem.name}</Td>
                  <Td align="left">{formatDate(s.serviceDate)}</Td>
                  <Td align="center">{s.quantity}</Td>
                  <Td align="right">{format(Number(s.unitPrice))}</Td>
                  <Td align="right">{format(Number(s.totalPrice))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <SummaryRow label={t("printServicesTotal")} value={format(servicesTotal)} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charges summary ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12, paddingTop: 8, borderTop: "1px solid #ddd" }}>
        <SectionLabel>{t("printChargesSummary")}</SectionLabel>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 320 }}>
            <tbody>
              <SummaryRow label={t("printRoomSubtotal")} value={format(roomTotal)} />
              {servicesTotal > 0 && (
                <SummaryRow label={t("printServicesTotal")} value={format(servicesTotal)} />
              )}
              {surcharge > 0 && (
                <SummaryRow label={t("printSurcharge")} value={format(surcharge)} />
              )}
              {/* divider before tax */}
              <DividerRow />
              <SummaryRow label={t("subtotal")} value={format(Number(invoice.subtotal))} />
              <SummaryRow label={t("printTax")} value={format(Number(invoice.taxAmount))} />
              {Number(invoice.discountAmount) > 0 && (
                <SummaryRow label={t("discount")} value={`-${format(Number(invoice.discountAmount))}`} color="#2e7d32" />
              )}
              {/* divider before total */}
              <DividerRow bold />
              <SummaryRow label={t("total")} value={format(Number(invoice.totalAmount))} bold />
              <SummaryRow label={t("paid")} value={format(totalPaid)} color="#2e7d32" />
              {outstanding > 0 && (
                <SummaryRow label={t("printOutstanding")} value={format(outstanding)} color="#c62828" bold />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment history ─────────────────────────────────────────────── */}
      {invoice.payments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{t("printPaymentHistory")}</SectionLabel>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <Th align="left">{t("issuedAt")}</Th>
                <Th align="left">{t("methodLabel")}</Th>
                <Th align="left">{t("reference")}</Th>
                <Th align="right">{t("amount")}</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p: Payment) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Td align="left">{formatDateTime(p.paidAt)}</Td>
                  <Td align="left">{p.paymentMethod.name}</Td>
                  <Td align="left">{p.reference ?? "—"}</Td>
                  <Td align="right">{format(Number(p.amount))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", borderTop: "1px solid #ddd", paddingTop: 16, color: "#777", fontSize: 11, fontStyle: "italic" }}>
        {t("printThankYou")}
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#777", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "center" | "right" }) {
  return (
    <th style={{ padding: "6px 8px", textAlign: align, fontWeight: 700, fontSize: 11, borderBottom: "2px solid #000" }}>
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align: "left" | "center" | "right" }) {
  return (
    <td style={{ padding: "5px 8px", textAlign: align, verticalAlign: "top" }}>
      {children}
    </td>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "2px 0", color: "#777", fontSize: 11, width: "40%", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "2px 0", fontWeight: 500, verticalAlign: "top" }}>{value}</td>
    </tr>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <tr>
      <td style={{ padding: "4px 8px", color: color ?? "#333", fontWeight: bold ? 700 : 400, fontSize: bold ? 13 : 12 }}>
        {label}
      </td>
      <td style={{ padding: "4px 8px", textAlign: "right", color: color ?? "#000", fontWeight: bold ? 700 : 400, fontSize: bold ? 13 : 12, minWidth: 120 }}>
        {value}
      </td>
    </tr>
  );
}

function DividerRow({ bold }: { bold?: boolean }) {
  return (
    <tr>
      <td colSpan={2} style={{ padding: "2px 8px" }}>
        <div style={{ borderTop: bold ? "2px solid #000" : "1px solid #ccc", margin: "4px 0" }} />
      </td>
    </tr>
  );
}
