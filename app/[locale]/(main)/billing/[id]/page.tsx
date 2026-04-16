"use client";

import { Button, Descriptions, Spin, Table, Tag, Divider } from "antd";
import { IconArrowLeft, IconCreditCard, IconPrinter } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppCard from "@/common/components/ui/AppCard";
import { useInvoice } from "@/modules/billing/hooks/useInvoice";
import { useHotelSettings } from "@/common/hooks/useHotelSettings";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import PaymentModal from "@/modules/billing/components/PaymentModal";
import InvoicePrintTemplate from "@/modules/billing/components/InvoicePrintTemplate";
import type { Payment } from "@/types/booking.types";
import type { BookingService } from "@/types/booking.types";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: hotelSettings } = useHotelSettings();
  const payModal = useDisclosure();
  const { format, formatDate, formatDateTime } = useLocaleCurrency();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) return null;

  const booking = invoice.booking;

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const outstanding = Math.max(0, Number(invoice.totalAmount) - totalPaid);

  const paymentColumns = [
    {
      key: "paidAt",
      dataIndex: "paidAt",
      title: t("billing.issuedAt"),
      render: (v: string) => formatDateTime(v),
      width: 160,
    },
    {
      key: "method",
      title: t("billing.methodLabel"),
      render: (_: unknown, r: Payment) => r.paymentMethod.name,
    },
    {
      key: "reference",
      dataIndex: "reference",
      title: t("billing.reference"),
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "amount",
      dataIndex: "amount",
      title: t("billing.amount"),
      render: (v: number) => format(v),
      width: 130,
      align: "right" as const,
    },
  ];

  const serviceColumns = [
    {
      key: "name",
      title: t("billing.description"),
      render: (_: unknown, r: BookingService) => r.serviceItem.name,
    },
    {
      key: "serviceDate",
      dataIndex: "serviceDate",
      title: t("billing.issuedAt"),
      render: (v: string) => formatDate(v),
      width: 110,
    },
    {
      key: "quantity",
      dataIndex: "quantity",
      title: t("billing.qty"),
      width: 60,
    },
    {
      key: "unitPrice",
      dataIndex: "unitPrice",
      title: t("billing.unitPrice"),
      render: (v: number) => format(v),
      width: 120,
      align: "right" as const,
    },
    {
      key: "totalPrice",
      dataIndex: "totalPrice",
      title: t("billing.total"),
      render: (v: number) => format(v),
      width: 120,
      align: "right" as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Screen-only chrome: header + action buttons */}
      <div className="print:hidden">
        <AppPageHeader
          title={`Invoice #${invoice.invoiceNumber}`}
          translateTitle={false}
          extra={
            <div className="flex gap-2">
              <Button
                icon={<IconArrowLeft size={16} />}
                onClick={() => router.push(`/${locale}/billing`)}
              >
                {t("billing.back")}
              </Button>
              <Button icon={<IconPrinter size={16} />} onClick={() => window.print()}>
                {t("billing.print")}
              </Button>
              {!invoice.isPaid && outstanding > 0 && (
                <Button
                  type="primary"
                  icon={<IconCreditCard size={16} />}
                  onClick={payModal.open}
                >
                  {t("billing.payNow")}
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
        <div className="lg:col-span-2 space-y-4">
          <AppCard title={t("billing.invoiceDetails")}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t("billing.invoiceNumber")}>
                {invoice.invoiceNumber}
              </Descriptions.Item>
              <Descriptions.Item label={t("common.status")}>
                <Tag color={invoice.isPaid ? "success" : "warning"}>
                  {invoice.isPaid ? t("billing.paid") : t("billing.unpaid")}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("billing.issuedAt")}>
                {formatDateTime(invoice.issuedAt)}
              </Descriptions.Item>
              {booking && (
                <>
                  <Descriptions.Item label={t("booking.bookingNumber")}>
                    <Button
                      type="link"
                      size="small"
                      className="p-0 h-auto"
                      onClick={() =>
                        router.push(`/${locale}/reservations/${booking.id}`)
                      }
                    >
                      {booking.bookingNumber}
                    </Button>
                  </Descriptions.Item>
                  <Descriptions.Item label={t("booking.guest")}>
                    {booking.guest.firstName} {booking.guest.lastName}
                  </Descriptions.Item>
                  <Descriptions.Item label={t("booking.room")}>
                    {booking.room.number} · {booking.room.roomType.name}
                  </Descriptions.Item>
                  <Descriptions.Item label={t("billing.stay")}>
                    {formatDate(booking.checkInDate)} →{" "}
                    {formatDate(booking.checkOutDate)}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </AppCard>

          {booking?.services && booking.services.length > 0 && (
            <AppCard title={t("booking.servicesSection")}>
              <Table
                columns={serviceColumns}
                dataSource={booking.services}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </AppCard>
          )}

          <AppCard title={t("billing.paymentHistory")}>
            {invoice.payments.length === 0 ? (
              <p className="text-gray-400 text-sm">{t("billing.noPayments")}</p>
            ) : (
              <Table
                columns={paymentColumns}
                dataSource={invoice.payments}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </AppCard>
        </div>

        <div className="space-y-4">
          <AppCard title={t("billing.summary")}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("billing.subtotal")}</span>
                <span>{format(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("billing.tax")}</span>
                <span>{format(Number(invoice.taxAmount))}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("billing.discount")}</span>
                  <span>-{format(Number(invoice.discountAmount))}</span>
                </div>
              )}
              <Divider className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>{t("billing.total")}</span>
                <span>{format(Number(invoice.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>{t("billing.paid")}</span>
                <span>{format(totalPaid)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between font-semibold text-red-500 border-t pt-2">
                  <span>{t("billing.outstanding")}</span>
                  <span>{format(outstanding)}</span>
                </div>
              )}
            </div>

            {!invoice.isPaid && outstanding > 0 && (
              <Button
                type="primary"
                block
                className="mt-4"
                icon={<IconCreditCard size={16} />}
                onClick={payModal.open}
              >
                {t("billing.payNow")}
              </Button>
            )}
          </AppCard>
        </div>
      </div>

      {/* Print-only template */}
      <InvoicePrintTemplate invoice={invoice} hotelSettings={hotelSettings} />

      <PaymentModal
        invoiceId={id}
        outstanding={outstanding}
        open={payModal.isOpen}
        onClose={payModal.close}
      />
    </div>
  );
}
