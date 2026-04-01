"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useBilling } from "@/modules/billing/hooks/useBilling";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Invoice } from "@/types/booking.types";

export default function BillingPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, pagination } = useBilling();
  const { format, formatDate } = useLocaleCurrency();

  const columns = [
    {
      key: "invoiceNumber",
      dataIndex: "invoiceNumber",
      title: t("billing.invoiceNumber"),
      width: 180,
    },
    {
      key: "booking",
      title: t("booking.guest"),
      render: (_: unknown, r: Invoice) =>
        r.booking
          ? `${r.booking.guest.firstName} ${r.booking.guest.lastName}`
          : "—",
    },
    {
      key: "room",
      title: t("booking.room"),
      render: (_: unknown, r: Invoice) =>
        r.booking?.room?.number ?? "—",
      width: 100,
    },
    {
      key: "issuedAt",
      dataIndex: "issuedAt",
      title: "Issued",
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("billing.total"),
      render: (v: number) => format(v),
      width: 140,
    },
    {
      key: "isPaid",
      dataIndex: "isPaid",
      title: t("common.status"),
      render: (v: boolean) => (
        <StatusBadge
          color={v ? "#52c41a" : "#fa8c16"}
          label={v ? t("billing.paid") : t("billing.unpaid")}
        />
      ),
      width: 120,
    },
  ];

  return (
    <div className="space-y-4">
      <AppPageHeader title="billing.title" />
      <AppTable
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowKey="id"
        onRow={(r) => ({
          onClick: () => router.push(`/${locale}/billing/${r.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}
