"use client";

import { Form, Input, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import AppModal from "@/common/components/ui/AppModal";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { resolveStatusDisplayWithMasterData } from "@/common/utils/roomDisplayStatus";
import GuestSearchSection from "./GuestSearchSection";
import ServiceItemsSection from "./ServiceItemsSection";
import RoomDetailModalFooter from "./RoomDetailModalFooter";
import { useRoomModalForm } from "../hooks/useRoomModalForm";
import { useRoomModalActions } from "../hooks/useRoomModalActions";
import { resolveModalMode, resolveStayMode } from "../utils/roomModalMode";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { Room, BookingState } from "@/types/room.types";

interface RoomDetailModalProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
}

export default function RoomDetailModal({ open, room, onClose }: RoomDetailModalProps) {
  const t = useTranslations("roomMap");
  const { serviceItems, roomStatuses } = useMasterData();


  const mode      = room ? resolveModalMode(room) : "stay";
  const stayMode  = room ? resolveStayMode(room)  : "vacant";
  const booking   = room?.currentBooking ?? null;
  const bookingState: BookingState = booking?.bookingState ?? "none";
  const { label: statusLabel, color: statusColor } = room
    ? resolveStatusDisplayWithMasterData(room, roomStatuses)
    : { label: "", color: "" };

  const {
    form,
    chargeType,
    stayPrice,
    baseRate,
    hourlyRatePerHour,
    nightsStayed,
    daysStayed,
    hoursStayed,
    serviceTotal,
    subtotalBeforeTax,
    taxAmount,
    totalPayable,
    remaining,
    discount,
    surcharge,
    prepaid,
    guestFieldsDisabled,
    checkOutDateDisabled,
    servicesDisabled,
    noteDisabled,
  } = useRoomModalForm(open, room, stayMode, serviceItems);

  const stayPriceLabel = (() => {
    if (chargeType === "daily") return `${t("stayPrice")} (${t("dayUseSuffix")})`;
    if (chargeType === "hourly") return `${t("stayPrice")} (${hoursStayed} ${t("hrsSuffix")})`;
    return t("stayPrice");
  })();

  const actions = useRoomModalActions({
    room,
    mode,
    stayMode,
    form,
    baseRate,
    onClose,
  });

  if (!room) return null;

  return (
    <AppModal
      open={open}
      onClose={actions.handleClose}
      width="min(920px, 95vw)"
      styles={{
        header: { paddingBottom: 8 },
        body:   { padding: "0 8px 4px", overflowY: "auto", maxHeight: "calc(90vh - 110px)" },
        footer: { padding: "8px 16px" },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {t("roomNumber", { number: room.number })}
          </span>
          <span style={{ color: "#8c8c8c", fontSize: 12, fontWeight: 400 }}>
            {room.floor.name} · {room.roomType.name}
          </span>
          <Tag color={statusColor} style={{ margin: 0, fontSize: 11 }}>
            {statusLabel}
          </Tag>
          {(bookingState === "reserved" || bookingState === "checked_in") && (
            <BookingStateTag bookingState={bookingState} booking={booking} t={t} />
          )}
        </div>
      }
      footer={
        <RoomDetailModalFooter
          mode={mode}
          stayMode={stayMode}
          room={room}
          isSavingStay={actions.isSavingStay}
          isMarkingAvailable={actions.isMarkingAvailable}
          isCleaningRoom={actions.isCleaningRoom}
          isCancellingBooking={actions.isCancellingBooking}
          isPending={actions.isPending}
          onMarkAvailable={actions.handleMarkAvailable}
          onCleanRoom={actions.handleCleanRoom}
          onCancelBooking={actions.handleCancelBooking}
          onCheckOut={actions.handleCheckOut}
          onSubmitCheckIn={actions.handleSubmitCheckIn}
          onSaveStay={actions.handleSaveStay}
          onSaveReservation={actions.handleSaveReservation}
          onViewReservation={actions.handleViewReservation}
          onViewBilling={actions.handleViewBilling}
          onClose={actions.handleClose}
        />
      }
    >
      {/* ── Room info bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          12,
          background:   "#fafafa",
          border:       "1px solid #f0f0f0",
          borderRadius: 5,
          padding:      "5px 10px",
          marginBottom: 10,
          fontSize:     12,
          flexWrap:     "wrap",
        }}
      >
        <InfoPill label={t("floor")}    value={room.floor.name} />
        <Sep />
        <InfoPill label={t("roomType")} value={room.roomType.name} />
        {mode !== "operational" && (
          <>
            <Sep />
            <span style={{ color: "#8c8c8c" }}>{t("stayPrice")}:</span>
            <PriceDisplay amount={stayPrice} />
          </>
        )}
      </div>

      {/* ── Operational mode (CLEANING / MAINTENANCE) ──────────────────────── */}
      {mode === "operational" && (
        <OperationalModeBody room={room} roomStatusLabel={statusLabel} />
      )}

      {/* ── Unified stay form ──────────────────────────────────────────────── */}
      {mode === "stay" && (
        <Form
          form={form}
          layout="vertical"
          size="small"
          initialValues={{
            adults: 1,
            children: 0,
            chargeType: "nightly",
            discount:   0,
            surcharge:  0,
            prepaid:    0,
            services:   [],
          }}
        >
          <SectionHeader title={t("guestInfo")} />
          <GuestSearchSection
            form={form}
            disabled={guestFieldsDisabled}
            checkOutDateDisabled={checkOutDateDisabled}
          />

          <SectionHeader title={t("pricingServices")} />
          <ServiceItemsSection
            serviceItems={serviceItems}
            serviceTotal={serviceTotal}
            stayPrice={stayPrice}
            stayPriceLabel={stayPriceLabel}
            chargeType={chargeType}
            baseRate={baseRate}
            hourlyRatePerHour={hourlyRatePerHour}
            nightsStayed={nightsStayed}
            daysStayed={daysStayed}
            subtotalBeforeTax={subtotalBeforeTax}
            taxAmount={taxAmount}
            totalPayable={totalPayable}
            remaining={remaining}
            discount={discount}
            surcharge={surcharge}
            prepaid={prepaid}
            hoursStayed={hoursStayed}
            disabled={servicesDisabled}
            prepaidDisabled={room?.currentBooking?.hasDepositPayment ?? false}
          />

          <SectionHeader title={t("note")} style={{ marginTop: 10 }} />
          <Form.Item name="note" style={{ marginBottom: 4 }}>
            <Input.TextArea rows={2} disabled={noteDisabled} />
          </Form.Item>
        </Form>
      )}
    </AppModal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OperationalModeBody({
  room,
  roomStatusLabel,
}: {
  room: Room;
  roomStatusLabel: string;
}) {
  const t = useTranslations("roomMap");
  return (
    <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
      <div style={{ marginBottom: 12 }}>
        <Tag color={room.roomStatus.color} style={{ fontSize: 14, padding: "4px 16px" }}>
          {roomStatusLabel}
        </Tag>
      </div>
      {room.note && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
          <span style={{ color: "#8c8c8c" }}>{t("note")}: </span>
          {room.note}
        </Typography.Text>
      )}
    </div>
  );
}

function BookingStateTag({
  bookingState,
  booking,
  t,
}: {
  bookingState: BookingState;
  booking: Room["currentBooking"];
  t: ReturnType<typeof useTranslations<"roomMap">>;
}) {
  if (bookingState === "none") return null;
  if (bookingState === "reserved") {
    return (
      <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
        {t("reserved")} · {booking!.bookingNumber}
      </Tag>
    );
  }
  if (bookingState === "checked_in") {
    return (
      <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
        {t("checkedIn")} · {booking!.bookingNumber} · {booking!.guest.firstName}{" "}
        {booking!.guest.lastName}
      </Tag>
    );
  }
  return (
    <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
      {t("checkedOut")} · {booking!.bookingNumber}
    </Tag>
  );
}

function SectionHeader({ title, style }: { title: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize:      11,
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color:         "#8c8c8c",
        marginBottom:  6,
        marginTop:     10,
        paddingBottom: 3,
        borderBottom:  "1px solid #f0f0f0",
        ...style,
      }}
    >
      {title}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span style={{ color: "#8c8c8c" }}>{label}: </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </span>
  );
}

function Sep() {
  return <span style={{ color: "#d9d9d9" }}>|</span>;
}
