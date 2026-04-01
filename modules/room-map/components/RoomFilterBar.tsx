"use client";

import { Select, Space } from "antd";
import { useTranslations } from "next-intl";
import { useMasterData } from "@/common/hooks/useMasterData";

type Filters = {
  floorId?: string;
  roomTypeId?: string;
  statusId?: string;
};

interface RoomFilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function RoomFilterBar({ filters, onChange }: RoomFilterBarProps) {
  const t = useTranslations();
  const { floors, roomTypes, roomStatuses } = useMasterData();

  return (
    <Space wrap>
      <Select
        allowClear
        placeholder={t("room.floor")}
        style={{ width: 140 }}
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
      <Select
        allowClear
        placeholder={t("room.status")}
        style={{ width: 160 }}
        value={filters.statusId}
        onChange={(v) => onChange({ ...filters, statusId: v })}
        options={roomStatuses.map((s) => ({ value: s.id, label: s.name }))}
      />
    </Space>
  );
}
