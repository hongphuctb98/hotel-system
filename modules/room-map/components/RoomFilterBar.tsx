"use client";

import { Select, Space, DatePicker } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { RoomMapFilters } from "../hooks/useRoomMap";

interface RoomFilterBarProps {
  filters: RoomMapFilters;
  onChange: (filters: RoomMapFilters) => void;
}

export default function RoomFilterBar({ filters, onChange }: RoomFilterBarProps) {
  const t = useTranslations();
  const { floors, roomTypes, roomStatuses } = useMasterData();

  const bookingStateOptions = [
    { value: "all",         label: t("roomMap.bookingStateAll") },
    { value: "none",        label: t("roomMap.bookingStateNone") },
    { value: "reserved",    label: t("roomMap.reserved") },
    { value: "checked_in",  label: t("roomMap.checkedIn") },
    { value: "checked_out", label: t("roomMap.checkedOut") },
  ];

  return (
    <Space wrap>
      <DatePicker
        format="DD/MM/YYYY"
        
        value={filters.date ? dayjs(filters.date) : dayjs()}
        onChange={(d) =>
          onChange({ ...filters, date: d ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD") })
        }
        allowClear={false}
        placeholder={t("roomMap.date")}
      />
      <Select
        allowClear
        placeholder={t("room.floor")}
        style={{ width: 160 }}
        value={filters.floorId}
        onChange={(v) => onChange({ ...filters, floorId: v })}
        options={floors.map((f) => ({ value: f.id, label: f.name }))}
      />
      <Select
        allowClear
        placeholder={t("room.type")}
        style={{ width: 160 }}
        value={filters.roomTypeId}
        onChange={(v) => onChange({ ...filters, roomTypeId: v })}
        options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
      />
      {/* Operational status filter — useful for CLEANING / MAINTENANCE / OUT_OF_SERVICE */}
      <Select
        allowClear
        placeholder={t("room.status")}
        style={{ width: 160 }}
        value={filters.statusId}
        onChange={(v) => onChange({ ...filters, statusId: v })}
        options={roomStatuses.map((s) => ({ value: s.id, label: s.name }))}
      />
      {/* Booking occupancy state filter — derived from booking data, applied client-side */}
      <Select
        style={{ width: 160 }}
        value={filters.bookingState ?? "all"}
        onChange={(v) => onChange({ ...filters, bookingState: v })}
        options={bookingStateOptions}
      />
    </Space>
  );
}
