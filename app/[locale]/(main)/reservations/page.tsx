"use client";

import { useState } from "react";
import { Button, App } from "antd";
import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import ReservationSummary from "@/modules/reservations/components/ReservationSummary";
import ReservationTable from "@/modules/reservations/components/ReservationTable";
import { bookingService } from "@/common/services/bookingService";
import { getBookingStatusLabel } from "@/common/utils/bookingStatusLabel";
import type { BookingFilters } from "@/modules/reservations/hooks/useReservations";
import type { Booking } from "@/types/booking.types";

export default function ReservationsPage() {
  const t = useTranslations();
  const { message } = App.useApp();
  const [filters, setFilters] = useState<BookingFilters>({});
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await bookingService.findAll({ ...filters, export: "1" } as Record<string, unknown>);
      const bookings: Booking[] = res.data ?? [];

      const rows = bookings.map((b) => {
        const nights = dayjs(b.checkOutDate).diff(dayjs(b.checkInDate), "day") || 1;
        const inv = b.invoices?.[0];
        const paymentStatus = !inv
          ? t("booking.noInvoice")
          : inv.isPaid
          ? t("booking.paid")
          : t("booking.unpaid");

        return {
          [t("booking.bookingNumber")]: b.bookingNumber,
          [t("booking.guest")]: `${b.guest.firstName} ${b.guest.lastName}`,
          [t("booking.room")]: b.room.number,
          [t("room.roomType")]: b.room.roomType.name,
          [t("room.floor")]: b.room.floor.name,
          [t("booking.checkIn")]: dayjs(b.checkInDate).format("YYYY-MM-DD"),
          [t("booking.checkOut")]: dayjs(b.checkOutDate).format("YYYY-MM-DD"),
          [t("booking.nights")]: nights,
          [t("booking.adults")]: b.adults,
          [t("booking.children")]: b.children,
          [t("booking.status")]: getBookingStatusLabel(b.bookingStatus, t),
          [t("booking.chargeType")]: b.chargeType === "hourly" ? t("booking.hourly") : t("booking.nightly"),
          [`${t("booking.baseRate")} (VND)`]: Number(b.baseRate),
          [`${t("booking.total")} (VND)`]: Number(b.totalAmount),
          [t("booking.paymentStatus")]: paymentStatus,
          [t("booking.source")]: b.source ?? "",
          [t("booking.note")]: b.note ?? "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t("booking.exportSheetName"));
      const filename = `${t("booking.exportFilename")}-${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch {
      message.error(t("booking.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="nav.reservations"
        extra={
          <Button
            icon={<IconDownload size={16} />}
            loading={exporting}
            onClick={handleExport}
          >
            {t("common.export")}
          </Button>
        }
      />

      <ReservationSummary checkInFrom={filters.checkInFrom} checkInTo={filters.checkInTo} />

      <ReservationTable
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
