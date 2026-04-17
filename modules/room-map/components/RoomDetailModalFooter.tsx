"use client";

import { Button, Flex, Space } from "antd";
import { useTranslations } from "next-intl";
import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";
import type { Room } from "@/types/room.types";
import type { ModalMode, StayMode } from "../utils/roomModalMode";

interface RoomDetailModalFooterProps {
  mode: ModalMode;
  stayMode: StayMode;
  room: Room;
  // loading states
  isSavingStay: boolean;
  isMarkingAvailable: boolean;
  isCleaningRoom: boolean;
  isCancellingBooking: boolean;
  isPending: boolean;
  // handlers
  onMarkAvailable: () => void;
  onCleanRoom: () => void;
  onCancelBooking: () => void;
  onCheckOut: () => void;
  onSubmitCheckIn: () => void;
  onSaveStay: () => void;
  onSaveReservation: () => void;
  onViewReservation: () => void;
  onViewBilling: () => void;
  onClose: () => void;
}

export default function RoomDetailModalFooter({
  mode,
  stayMode,
  room,
  isSavingStay,
  isMarkingAvailable,
  isCleaningRoom,
  isCancellingBooking,
  isPending,
  onMarkAvailable,
  onCleanRoom,
  onCancelBooking,
  onCheckOut,
  onSubmitCheckIn,
  onSaveStay,
  onSaveReservation,
  onViewReservation,
  onViewBilling,
  onClose,
}: RoomDetailModalFooterProps) {
  const t = useTranslations("roomMap");

  if (mode === "operational") {
    // OCCUPIED = just checked out, awaiting cleaning — only "Clean Room" makes sense.
    if (room.roomStatus.code === ROOM_STATUS_CODES.OCCUPIED) {
      return (
        <Space>
          <Button type="primary" loading={isCleaningRoom} onClick={onCleanRoom}>
            {t("cleanRoom")}
          </Button>
          <Button onClick={onClose}>{t("close")}</Button>
        </Space>
      );
    }
    return (
      <Space>
        <Button
          type="primary"
          loading={isMarkingAvailable}
          onClick={onMarkAvailable}
        >
          {room.roomStatus.code === ROOM_STATUS_CODES.CLEANING
            ? t("cleaningDone")
            : t("markAvailable")}
        </Button>
        <Button onClick={onClose}>{t("close")}</Button>
      </Space>
    );
  }

  return (
    <Flex justify="space-between">
      <div>
        {" "}
        {stayMode === "reserved" && (
          <Button
            danger
            loading={isCancellingBooking}
            onClick={onCancelBooking}
            variant="solid"
          >
            {t("cancelBooking")}
          </Button>
        )}
      </div>
      <Flex gap={8}>
        {" "}
        {stayMode === "reserved" && (
          <Button
            loading={isSavingStay}
            onClick={onSaveReservation}
            color="orange"
          >
            {t("saveChanges")}
          </Button>
        )}
        {(stayMode === "vacant" || stayMode === "reserved") && (
          <Button type="primary" loading={isPending} onClick={onSubmitCheckIn}>
            {stayMode === "vacant" ? t("bookRoom") : t("checkIn")}
          </Button>
        )}
        {stayMode === "checked_in" && (
          <>
            <Button loading={isSavingStay} onClick={onSaveStay}>
              {t("saveChanges")}
            </Button>
            <Button type="primary" danger onClick={onCheckOut}>
              {t("checkOut")}
            </Button>
          </>
        )}
        {stayMode === "checked_out" && (
          <Button
            loading={isCleaningRoom}
            onClick={onCleanRoom}
            color="orange"
            variant="outlined"
          >
            {t("cleanRoom")}
          </Button>
        )}
        {/* {stayMode !== "vacant" && (
          <Button onClick={onViewReservation} variant="outlined" color="blue">
            {t("viewReservation")}
          </Button>
        )} */}
        {(stayMode === "reserved" ||
          stayMode === "checked_in" ||
          stayMode === "checked_out") && (
          <Button onClick={onViewBilling} variant="outlined" color="green">
            {t("viewBilling")}
          </Button>
        )}
        <Button onClick={onClose} color="danger" variant="outlined">
          {t("close")}
        </Button>
      </Flex>
    </Flex>
  );
}
