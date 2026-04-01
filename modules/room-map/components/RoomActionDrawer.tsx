"use client";

import { Button, Descriptions, Space, Divider } from "antd";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import AppDrawer from "@/common/components/ui/AppDrawer";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useConfirm } from "@/common/hooks/useConfirm";
import { bookingService } from "@/common/services/bookingService";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Room } from "@/types/room.types";

interface RoomActionDrawerProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
}

export default function RoomActionDrawer({
  open,
  room,
  onClose,
}: RoomActionDrawerProps) {
  const t = useTranslations();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const { formatDate } = useLocaleCurrency();

  const handleCheckIn = () => {
    if (!room?.currentBooking) return;
    confirm({
      title: t("booking.doCheckIn"),
      onOk: async () => {
        await bookingService.checkIn(room.currentBooking!.id);
        queryClient.invalidateQueries({ queryKey: ["room-map"] });
        onClose();
      },
    });
  };

  const handleCheckOut = () => {
    if (!room?.currentBooking) return;
    confirm({
      title: t("booking.doCheckOut"),
      danger: true,
      onOk: async () => {
        await bookingService.checkOut(room.currentBooking!.id);
        queryClient.invalidateQueries({ queryKey: ["room-map"] });
        onClose();
      },
    });
  };

  if (!room) return null;

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={`${t("room.number")} ${room.number}`}
    >
      <div className="space-y-4">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t("room.floor")}>
            {room.floor.name}
          </Descriptions.Item>
          <Descriptions.Item label={t("room.type")}>
            {room.roomType.name}
          </Descriptions.Item>
          <Descriptions.Item label={t("room.status")}>
            <StatusBadge
              color={room.roomStatus.color}
              label={room.roomStatus.name}
            />
          </Descriptions.Item>
        </Descriptions>

        {room.currentBooking && (
          <>
            <Divider>{t("booking.guest")}</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t("guest.firstName")}>
                {room.currentBooking.guest.firstName}{" "}
                {room.currentBooking.guest.lastName}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkIn")}>
                {formatDate(room.currentBooking.checkInDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkOut")}>
                {formatDate(room.currentBooking.checkOutDate)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Divider />
        <Space direction="vertical" className="w-full">
          {room.currentBooking && (
            <>
              <Button type="primary" block onClick={handleCheckIn}>
                {t("booking.doCheckIn")}
              </Button>
              <Button danger block onClick={handleCheckOut}>
                {t("booking.doCheckOut")}
              </Button>
            </>
          )}
        </Space>
      </div>
    </AppDrawer>
  );
}
