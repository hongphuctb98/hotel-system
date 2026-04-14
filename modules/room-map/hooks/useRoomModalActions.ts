"use client";

import { useState } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/common/services/bookingService";
import { guestService } from "@/common/services/guestService";
import { roomService } from "@/common/services/roomService";
import { ApiError } from "@/common/services/apiClient";
import { useConfirm } from "@/common/hooks/useConfirm";
import { useMasterData } from "@/common/hooks/useMasterData";
import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";
import { useCheckInFlow } from "./useCheckInFlow";
import type { Room } from "@/types/room.types";
import type { FormInstance } from "antd";
import type { StayMode, ModalMode, FormValues } from "../utils/roomModalMode";

interface UseRoomModalActionsOptions {
  room:      Room | null;
  mode:      ModalMode;
  stayMode:  StayMode;
  form:      FormInstance<FormValues>;
  baseRate: number;
  onClose:   () => void;
}

export function useRoomModalActions({
  room,
  stayMode,
  form,
  baseRate,
  onClose,
}: UseRoomModalActionsOptions) {
  const t            = useTranslations("roomMap");
  const locale       = useLocale();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { message }  = App.useApp();
  const { confirm }  = useConfirm();

  const { serviceItems, roomStatuses, bookingStatuses } = useMasterData();
  const booking = room?.currentBooking ?? null;

  const [isSavingStay,         setIsSavingStay]         = useState(false);
  const [isMarkingAvailable,   setIsMarkingAvailable]   = useState(false);
  const [isCleaningRoom,       setIsCleaningRoom]       = useState(false);
  const [isCancellingBooking,  setIsCancellingBooking]  = useState(false);

  const { handleCheckIn, isPending } = useCheckInFlow(room, () => {
    message.success(t("checkInSuccess"));
    onClose();
  });

  /** OPERATIONAL: set room back to AVAILABLE, close modal. */
  const handleMarkAvailable = async () => {
    if (!room) return;
    const availableStatus = roomStatuses.find((s) => s.code === "AVAILABLE");
    if (!availableStatus) return;
    setIsMarkingAvailable(true);
    try {
      await roomService.update(room.id, { roomStatusId: availableStatus.id });
      queryClient.invalidateQueries({ queryKey: ["room-map"] });
      message.success(t("markAvailableSuccess"));
      onClose();
    } catch {
      message.error(t("checkInFailed"));
    } finally {
      setIsMarkingAvailable(false);
    }
  };

  /** CHECKED_OUT: queue the room for cleaning by setting status to CLEANING. */
  const handleCleanRoom = async () => {
    if (!room) return;
    const cleaningStatus = roomStatuses.find((s) => s.code === ROOM_STATUS_CODES.CLEANING);
    if (!cleaningStatus) return;
    setIsCleaningRoom(true);
    try {
      await roomService.update(room.id, { roomStatusId: cleaningStatus.id });
      queryClient.invalidateQueries({ queryKey: ["room-map"] });
      message.success(t("cleanRoomSuccess"));
      onClose();
    } catch {
      message.error(t("checkInFailed"));
    } finally {
      setIsCleaningRoom(false);
    }
  };

  /** RESERVED: cancel the booking. */
  const handleCancelBooking = () => {
    if (!booking) return;
    const cancelledStatus = bookingStatuses.find((s) => s.code === "CANCELLED");
    if (!cancelledStatus) return;
    confirm({
      title:   t("cancelBookingTitle"),
      content: t("cancelBookingContent"),
      danger:  true,
      onOk: async () => {
        setIsCancellingBooking(true);
        try {
          await bookingService.update(booking.id, { bookingStatusId: cancelledStatus.id });
          queryClient.invalidateQueries({ queryKey: ["room-map"] });
          message.success(t("cancelBookingSuccess"));
          onClose();
        } catch {
          message.error(t("checkInFailed"));
        } finally {
          setIsCancellingBooking(false);
        }
      },
    });
  };

  const handleCheckOut = () => {
    if (!booking) return;
    confirm({
      title:   t("confirmCheckOut"),
      content: t("confirmCheckOutContent"),
      danger:  true,
      onOk: async () => {
        try {
          await bookingService.checkOut(booking.id);
          queryClient.invalidateQueries({ queryKey: ["room-map"] });
          message.success(t("checkOutSuccess"));
          onClose();
        } catch {
          message.error(t("checkOutFailed"));
        }
      },
    });
  };

  const handleSubmitCheckIn = async () => {
    try {
      const values = await form.validateFields();
      await handleCheckIn(
        {
          ...values,
          checkInDate:       values.checkInDate!.toISOString(),
          checkOutDate:      values.checkOutDate!.toISOString(),
          baseRate,
          hourlyBlockHours:  values.hourlyBlockHours,
          hourlyRatePerHour: values.hourlyRatePerHour,
          services: (values.services ?? []).map((row) => {
            const item = serviceItems.find((s) => s.id === row.serviceItemId);
            return { ...row, unitPrice: item?.unitPrice ?? 0 };
          }),
        },
        stayMode === "reserved" ? booking?.id : undefined
      );
    } catch (err) {
      if (err instanceof ApiError) message.error(apiErrorMessage(err, t));
      else if (err && typeof err === "object" && "errorFields" in err) {
        // form.validateFields rejection — Ant Design handles field-level display; no toast needed
      } else {
        message.error(t("checkInFailed"));
      }
    }
  };

  /** CHECKED_IN: save form edits (checkout date + pricing + services) without checking out. */
  const handleSaveStay = async () => {
    if (!booking) return;
    const raw = form.getFieldsValue() as Partial<FormValues>;
    setIsSavingStay(true);
    try {
      const updates: Record<string, unknown> = {
        chargeType:        raw.chargeType     ?? "nightly",
        baseRate:          raw.baseRate,
        discountAmount:    raw.discount       ?? 0,
        surchargeAmount:   raw.surcharge      ?? 0,
        depositAmount:     Number(raw.prepaid ?? 0),
        hourlyBlockHours:  raw.hourlyBlockHours  ?? null,
        hourlyRatePerHour: raw.hourlyRatePerHour ?? null,
      };
      if (raw.checkOutDate)         updates.checkOutDate = raw.checkOutDate.toISOString();
      if (raw.note !== undefined)   updates.note         = raw.note;
      await bookingService.update(booking.id, updates);

      await bookingService.syncServices(
        booking.id,
        (raw.services ?? [])
          .filter(r => r?.serviceItemId)
          .map(r => ({ id: r.id, serviceItemId: r.serviceItemId, quantity: r.quantity ?? 1 }))
      );

      queryClient.invalidateQueries({ queryKey: ["room-map"] });
      queryClient.invalidateQueries({ queryKey: ["booking-services", booking.id] });
      message.success(t("saveChangesSuccess"));
    } catch (err) {
      message.error(err instanceof ApiError ? apiErrorMessage(err, t) : t("errors.saveFailed"));
    } finally {
      setIsSavingStay(false);
    }
  };

  /** RESERVED: persist form edits (guest info + booking dates + services) without checking in. */
  const handleSaveReservation = async () => {
    if (!booking) return;
    const values = form.getFieldsValue() as Partial<FormValues>;
    setIsSavingStay(true);
    try {
      const nameParts = (values.customerName ?? "").trim().split(/\s+/);
      const lastName  = nameParts.pop() ?? "";
      const firstName = nameParts.join(" ") || lastName;
      await guestService.update(booking.guestId, {
        firstName,
        lastName,
        phone:    values.phone    || undefined,
        idNumber: values.idNumber || undefined,
      });

      const updates: Record<string, unknown> = {
        chargeType:        values.chargeType     ?? "nightly",
        baseRate:          values.baseRate,
        discountAmount:    values.discount       ?? 0,
        surchargeAmount:   values.surcharge      ?? 0,
        depositAmount:     Number(values.prepaid ?? 0),
        source:            values.source         ?? null,
        hourlyBlockHours:  values.hourlyBlockHours  ?? null,
        hourlyRatePerHour: values.hourlyRatePerHour ?? null,
      };
      if (values.checkInDate)        updates.checkInDate  = values.checkInDate.toISOString();
      if (values.checkOutDate)       updates.checkOutDate = values.checkOutDate.toISOString();
      if (values.note !== undefined) updates.note         = values.note;
      await bookingService.update(booking.id, updates);

      await bookingService.syncServices(
        booking.id,
        (values.services ?? [])
          .filter(r => r?.serviceItemId)
          .map(r => ({ id: r.id, serviceItemId: r.serviceItemId, quantity: r.quantity ?? 1 }))
      );

      queryClient.invalidateQueries({ queryKey: ["room-map"] });
      queryClient.invalidateQueries({ queryKey: ["booking-services", booking.id] });
      message.success(t("saveChangesSuccess"));
    } catch (err) {
      message.error(err instanceof ApiError ? apiErrorMessage(err, t) : t("errors.saveFailed"));
    } finally {
      setIsSavingStay(false);
    }
  };

  const handleViewReservation = () => {
    if (!booking) return;
    router.push(`/${locale}/reservations/${booking.id}`);
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return {
    handleMarkAvailable,
    handleCleanRoom,
    handleCancelBooking,
    handleCheckOut,
    handleSubmitCheckIn,
    handleSaveStay,
    handleSaveReservation,
    handleViewReservation,
    handleClose,
    isSavingStay,
    isMarkingAvailable,
    isCleaningRoom,
    isCancellingBooking,
    isPending,
  };
}

/**
 * Map a structured API error code to a translated user-facing message.
 * Falls back to a generic "check-in failed" message for unrecognised codes.
 */
function apiErrorMessage(
  err: ApiError,
  t: ReturnType<typeof useTranslations<"roomMap">>
): string {
  switch (err.code) {
    case "BOOKING_OVERLAP":        return t("errors.bookingOverlap");
    case "BOOKING_NOT_CONFIRMED":  return t("errors.bookingNotConfirmed");
    case "BOOKING_NOT_CHECKED_IN": return t("errors.bookingNotCheckedIn");
    case "ROOM_NOT_READY":         return t("errors.roomNotReady");
    default:                       return t("checkInFailed");
  }
}
