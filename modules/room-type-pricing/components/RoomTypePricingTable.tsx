"use client";

import { useState } from "react";
import { Table, InputNumber, Button, App } from "antd";
import { useTranslations } from "next-intl";
import { useRoomTypePricing } from "../hooks/useRoomTypePricing";
import type { RoomTypePricing } from "@/types/master.types";
import AppPageHeader from "@/common/components/ui/AppPageHeader";

type Row = RoomTypePricing & { roomType: { id: string; code: string; name: string } };

type FieldEdits = {
  nightlyPrice?: number | null;
  dailyPrice?: number | null;
  hourlyBlockHours?: number | null;
  hourlyBlockPrice?: number | null;
  hourlyExtraPrice?: number | null;
};

export default function RoomTypePricingTable() {
  const t = useTranslations("roomTypePricing");
  const { message } = App.useApp();
  const { records, isLoading, upsert, isUpserting } = useRoomTypePricing();

  // Track per-row edits: roomTypeId → field overrides
  const [edits, setEdits] = useState<Record<string, FieldEdits>>({});
  // Track which row is currently saving
  const [savingId, setSavingId] = useState<string | null>(null);

  function getVal(row: Row, field: keyof FieldEdits): number | null {
    const override = edits[row.roomTypeId];
    if (override && field in override) return override[field] ?? null;
    return (row[field] as number | null) ?? null;
  }

  function setVal(roomTypeId: string, field: keyof FieldEdits, value: number | null) {
    setEdits(prev => ({
      ...prev,
      [roomTypeId]: { ...prev[roomTypeId], [field]: value },
    }));
  }

  async function handleSave(row: Row) {
    const override = edits[row.roomTypeId] ?? {};
    const payload: FieldEdits = {
      nightlyPrice:     "nightlyPrice"     in override ? override.nightlyPrice     : (row.nightlyPrice     ?? null),
      dailyPrice:       "dailyPrice"       in override ? override.dailyPrice       : (row.dailyPrice       ?? null),
      hourlyBlockHours: "hourlyBlockHours" in override ? override.hourlyBlockHours : (row.hourlyBlockHours ?? null),
      hourlyBlockPrice: "hourlyBlockPrice" in override ? override.hourlyBlockPrice : (row.hourlyBlockPrice ?? null),
      hourlyExtraPrice: "hourlyExtraPrice" in override ? override.hourlyExtraPrice : (row.hourlyExtraPrice ?? null),
    };
    setSavingId(row.roomTypeId);
    try {
      await upsert(row.roomTypeId, payload);
      // Clear edits for this row after successful save
      setEdits(prev => { const next = { ...prev }; delete next[row.roomTypeId]; return next; });
      message.success(t("saveSuccess"));
    } catch {
      message.error(t("saveError"));
    } finally {
      setSavingId(null);
    }
  }

  const columns = [
    {
      title: "Room Type",
      key: "roomType",
      width: 160,
      render: (_: unknown, row: Row) => (
        <span style={{ fontWeight: 500 }}>
          {row.roomType.name}
          <span style={{ color: "#8c8c8c", marginLeft: 4, fontSize: 11 }}>({row.roomType.code})</span>
        </span>
      ),
    },
    {
      title: t("nightlyPrice"),
      key: "nightlyPrice",
      width: 140,
      render: (_: unknown, row: Row) => (
        <InputNumber
          value={getVal(row, "nightlyPrice") ?? undefined}
          min={0}
          style={{ width: "100%" }}
          onChange={v => setVal(row.roomTypeId, "nightlyPrice", v)}
        />
      ),
    },
    {
      title: t("dailyPrice"),
      key: "dailyPrice",
      width: 140,
      render: (_: unknown, row: Row) => (
        <InputNumber
          value={getVal(row, "dailyPrice") ?? undefined}
          min={0}
          style={{ width: "100%" }}
          onChange={v => setVal(row.roomTypeId, "dailyPrice", v)}
        />
      ),
    },
    {
      title: t("hourlyBlockHours"),
      key: "hourlyBlockHours",
      width: 120,
      render: (_: unknown, row: Row) => (
        <InputNumber
          value={getVal(row, "hourlyBlockHours") ?? undefined}
          min={0}
          precision={0}
          style={{ width: "100%" }}
          onChange={v => setVal(row.roomTypeId, "hourlyBlockHours", v)}
        />
      ),
    },
    {
      title: t("hourlyBlockPrice"),
      key: "hourlyBlockPrice",
      width: 140,
      render: (_: unknown, row: Row) => (
        <InputNumber
          value={getVal(row, "hourlyBlockPrice") ?? undefined}
          min={0}
          style={{ width: "100%" }}
          onChange={v => setVal(row.roomTypeId, "hourlyBlockPrice", v)}
        />
      ),
    },
    {
      title: t("hourlyExtraPrice"),
      key: "hourlyExtraPrice",
      width: 140,
      render: (_: unknown, row: Row) => (
        <InputNumber
          value={getVal(row, "hourlyExtraPrice") ?? undefined}
          min={0}
          style={{ width: "100%" }}
          onChange={v => setVal(row.roomTypeId, "hourlyExtraPrice", v)}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, row: Row) => (
        <Button
          type="primary"
          size="small"
          loading={savingId === row.roomTypeId && isUpserting}
          onClick={() => handleSave(row)}
        >
          Save
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader title={t("title")} translateTitle={false} />
      <Table
        rowKey="roomTypeId"
        dataSource={records}
        columns={columns}
        loading={isLoading}
        pagination={false}
        size="small"
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
