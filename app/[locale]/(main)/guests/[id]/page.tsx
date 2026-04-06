"use client";

import {
  App,
  Button,
  Descriptions,
  Spin,
  Table,
  Form,
  Input,
  Select,
  Drawer,
  Tag,
} from "antd";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppCard from "@/common/components/ui/AppCard";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useGuest, useGuestActions } from "@/modules/guests/hooks/useGuest";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { Booking } from "@/types/booking.types";

export default function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: guest, isLoading } = useGuest(id);
  const { update } = useGuestActions(id);
  const editDrawer = useDisclosure();
  const [form] = Form.useForm();
  const { format, formatDate } = useLocaleCurrency();
  const { guestTypes } = useMasterData();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!guest) return null;

  const bookings = (guest as unknown as { bookings?: Booking[] }).bookings ?? [];

  const totalSpending = bookings.reduce(
    (sum, b) => sum + Number(b.totalAmount),
    0
  );

  const bookingColumns = [
    {
      key: "bookingNumber",
      dataIndex: "bookingNumber",
      title: t("booking.bookingNumber"),
      width: 160,
    },
    {
      key: "room",
      title: t("booking.room"),
      render: (_: unknown, r: Booking) =>
        `${r.room.number} · ${r.room.roomType.name}`,
    },
    {
      key: "checkInDate",
      dataIndex: "checkInDate",
      title: t("booking.checkIn"),
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "checkOutDate",
      dataIndex: "checkOutDate",
      title: t("booking.checkOut"),
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "status",
      title: t("booking.status"),
      render: (_: unknown, r: Booking) => (
        <StatusBadge
          color={r.bookingStatus.color}
          label={r.bookingStatus.name}
        />
      ),
      width: 140,
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("booking.total"),
      render: (v: number) => format(v),
      width: 130,
    },
  ];

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      await update.mutateAsync(values);
      message.success("Guest updated");
      editDrawer.close();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update guest";
      message.error(errorMessage);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={`${guest.lastName} ${guest.firstName}`}
        translateTitle={false}
        extra={
          <div className="flex gap-2">
            <Button
              icon={<IconArrowLeft size={16} />}
              onClick={() => router.push(`/${locale}/guests`)}
            >
              Back
            </Button>
            <Button
              icon={<IconEdit size={16} />}
              onClick={() => {
                form.setFieldsValue(guest);
                editDrawer.open();
              }}
            >
              {t("common.edit")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <AppCard title="Profile">
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t("guest.guestType")}>
                <StatusBadge
                  color={guest.guestType.color}
                  label={guest.guestType.name}
                />
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.email")}>
                {guest.email ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.phone")}>
                {guest.phone ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.idNumber")}>
                {guest.idNumber ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.nationality")}>
                {guest.nationality ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.dateOfBirth")}>
                {guest.dateOfBirth ? formatDate(guest.dateOfBirth) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.address")}>
                {guest.address ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.tags")}>
                {guest.tags.length > 0
                  ? guest.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </AppCard>

          <AppCard title="Stats">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Total Stays">
                {bookings.length}
              </Descriptions.Item>
              <Descriptions.Item label={t("guest.totalSpending")}>
                {format(totalSpending)}
              </Descriptions.Item>
            </Descriptions>
          </AppCard>
        </div>

        <div className="lg:col-span-2">
          <AppCard title={t("guest.stayHistory")}>
            <Table
              columns={bookingColumns}
              dataSource={bookings}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              childrenColumnName="__children"
              onRow={(r) => ({
                onClick: () =>
                  router.push(`/${locale}/reservations/${r.id}`),
                style: { cursor: "pointer" },
              })}
            />
          </AppCard>
        </div>
      </div>

      <Drawer
        title={t("common.edit")}
        open={editDrawer.isOpen}
        onClose={editDrawer.close}
        size={480}
        extra={
          <Button
            type="primary"
            loading={update.isPending}
            onClick={handleEditSubmit}
          >
            {t("common.save")}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="guestTypeId" label={t("guest.guestType")}>
            <Select
              options={guestTypes.map((gt) => ({
                value: gt.id,
                label: gt.name,
              }))}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="lastName" label={t("guest.lastName")}>
              <Input />
            </Form.Item>
            <Form.Item name="firstName" label={t("guest.firstName")}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="email" label={t("guest.email")}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label={t("guest.phone")}>
            <Input />
          </Form.Item>
          <Form.Item name="idNumber" label={t("guest.idNumber")}>
            <Input />
          </Form.Item>
          <Form.Item name="nationality" label={t("guest.nationality")}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t("guest.address")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="note" label={t("guest.note")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
