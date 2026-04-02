"use client";

import { useState, useEffect } from "react";
import { App, Button, Select, Space, Switch, Tag } from "antd";
import { IconEdit, IconPlus, IconPower, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useConfirm } from "@/common/hooks/useConfirm";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import { useRooms } from "../hooks/useRooms";
import { useDeleteRoom } from "../hooks/useRoomMutations";
import RoomFormDrawer from "./RoomFormDrawer";
import type { Room } from "@/types/room.types";

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "RECEPTIONIST";
  const match = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
  return match ? match[1] : "RECEPTIONIST";
}

export default function RoomTable() {
  const t = useTranslations();
  const { message } = App.useApp();
  const { format } = useLocaleCurrency();
  const { floors, roomTypes, roomStatuses } = useMasterData();
  const { data, isLoading, pagination, filters, setFilters } = useRooms();
  const deleteRoom = useDeleteRoom();
  const { confirm } = useConfirm();

  const [role, setRole] = useState<string>("RECEPTIONIST");
  useEffect(() => { setRole(getRoleFromCookie()); }, []);
  const { hasPermission } = usePermission(role);
  const canManage = hasPermission(PERMISSIONS.ROOMS_MANAGE);

  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCreate = () => {
    setEditRoom(null);
    setDrawerOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditRoom(room);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditRoom(null);
  };

  const handleDeactivate = (room: Room) => {
    confirm({
      title: t("room.deactivateTitle"),
      content: t("room.deactivateConfirm"),
      danger: true,
      onOk: () =>
        deleteRoom.mutate(room.id, {
          onSuccess: () => message.success(t("room.deactivateSuccess")),
          onError: () => message.error(t("room.deactivateFailed")),
        }),
    });
  };

  const columns = [
    {
      key: "number",
      dataIndex: "number",
      title: t("room.number"),
      width: 100,
    },
    {
      key: "floor",
      title: t("room.floor"),
      render: (_: unknown, r: Room) => r.floor.name,
      width: 100,
    },
    {
      key: "roomType",
      title: t("room.roomType"),
      render: (_: unknown, r: Room) => r.roomType.name,
      width: 120,
    },
    {
      key: "status",
      title: t("room.status"),
      render: (_: unknown, r: Room) => (
        <StatusBadge color={r.roomStatus.color} label={r.roomStatus.name} />
      ),
      width: 130,
    },
    {
      key: "price",
      title: t("room.effectivePrice"),
      render: (_: unknown, r: Room) => {
        const price =
          r.basePrice != null ? Number(r.basePrice) : Number(r.roomType.defaultPrice);
        return format(price);
      },
      width: 130,
    },
    {
      key: "amenities",
      title: t("room.amenities"),
      render: (_: unknown, r: Room) =>
        r.amenities.length > 0
          ? r.amenities.map((a) => <Tag key={a.amenity.id}>{a.amenity.name}</Tag>)
          : "—",
    },
    {
      key: "note",
      dataIndex: "note",
      title: t("room.note"),
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 100,
      render: (_: unknown, r: Room) => (
        <Space size={4}>
          {canManage && (
            <Button
              type="text"
              size="small"
              icon={<IconEdit size={14} />}
              onClick={() => handleEdit(r)}
            />
          )}
          {canManage && r.isActive && (
            <Button
              type="text"
              size="small"
              danger
              icon={<IconTrash size={14} />}
              onClick={() => handleDeactivate(r)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <Space wrap>
          <Select
            allowClear
            placeholder={t("room.floor")}
            style={{ width: 150 }}
            options={floors.map((f) => ({ value: f.id, label: f.name }))}
            onChange={(v) => setFilters((prev) => ({ ...prev, floorId: v }))}
            value={filters.floorId}
          />
          <Select
            allowClear
            placeholder={t("room.roomType")}
            style={{ width: 160 }}
            options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
            onChange={(v) => setFilters((prev) => ({ ...prev, roomTypeId: v }))}
            value={filters.roomTypeId}
          />
          <Select
            allowClear
            placeholder={t("room.status")}
            style={{ width: 160 }}
            options={roomStatuses.map((rs) => ({ value: rs.id, label: rs.name }))}
            onChange={(v) => setFilters((prev) => ({ ...prev, statusId: v }))}
            value={filters.statusId}
          />
          <Space size={8}>
            <Switch
              size="small"
              checked={!!filters.showInactive}
              onChange={(checked) =>
                setFilters((prev) => ({ ...prev, showInactive: checked }))
              }
            />
            <span style={{ fontSize: 13 }}>{t("room.showInactive")}</span>
          </Space>
        </Space>

        {canManage && (
          <Button type="primary" icon={<IconPlus size={16} />} onClick={handleCreate}>
            {t("room.createTitle")}
          </Button>
        )}
      </div>

      <AppTable
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={pagination}
        rowClassName={(r: Room) => (!r.isActive ? "opacity-50" : "")}
      />

      <RoomFormDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        room={editRoom}
      />
    </>
  );
}
