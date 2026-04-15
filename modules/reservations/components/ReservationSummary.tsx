"use client";

import { Table, Skeleton, theme } from "antd";
import type { ColumnType } from "antd/es/table";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useReservationMatrix } from "../hooks/useReservationMatrix";

type Props = {
  checkInFrom?: string;
  checkInTo?: string;
};

type RowData = {
  key: string;
  statusId: string;
  statusName: string;
  statusColor: string;
  counts: Record<string, number>; // roomTypeId → count
  total: number;
};

export default function ReservationSummary({ checkInFrom, checkInTo }: Props) {
  const { token } = theme.useToken();
  const { bookingStatuses, roomTypes } = useMasterData();
  const { data: matrix, isLoading } = useReservationMatrix({ checkInFrom, checkInTo });

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton.Button key={i} active style={{ width: 120, height: 36 }} />
        ))}
      </div>
    );
  }

  const cells = matrix?.cells ?? [];

  // Build a lookup: statusId+roomTypeId → count
  const cellMap = new Map<string, number>();
  for (const c of cells) {
    cellMap.set(`${c.bookingStatusId}::${c.roomTypeId}`, c.count);
  }

  // Determine which room types have at least one non-zero cell
  const activeRoomTypeIds = new Set(cells.map((c) => c.roomTypeId));
  const activeRoomTypes = roomTypes.filter((rt) => activeRoomTypeIds.has(rt.id));

  // Build row data
  const rows: RowData[] = bookingStatuses.map((status) => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const rt of activeRoomTypes) {
      const count = cellMap.get(`${status.id}::${rt.id}`) ?? 0;
      counts[rt.id] = count;
      total += count;
    }
    return {
      key: status.id,
      statusId: status.id,
      statusName: status.name,
      statusColor: status.color,
      counts,
      total,
    };
  });

  // Filter out rows where total === 0
  const visibleRows = rows.filter((r) => r.total > 0);

  // Total row values
  const totalCounts: Record<string, number> = {};
  for (const rt of activeRoomTypes) {
    totalCounts[rt.id] = visibleRows.reduce((sum, r) => sum + (r.counts[rt.id] ?? 0), 0);
  }
  const grandTotal = visibleRows.reduce((sum, r) => sum + r.total, 0);

  // Build columns
  const columns: ColumnType<RowData>[] = [
    {
      key: "status",
      title: <span style={{ fontSize: 12, fontWeight: 600 }}>Status</span>,
      dataIndex: "statusName",
      width: 128,
      render: (_: unknown, row: RowData) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 20,
            paddingLeft: 6,
            borderLeft: `3px solid ${row.statusColor}`,
            color: token.colorText,
            fontWeight: 500,
            fontSize: 12,
            lineHeight: 1.2,
          }}
        >
          {row.statusName}
        </span>
      ),
    },
    ...activeRoomTypes.map<ColumnType<RowData>>((rt) => ({
      key: rt.id,
      title: (
        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>
          {rt.name}
        </span>
      ),
      align: "center" as const,
      width: 76,
      render: (_: unknown, row: RowData) => {
        const count = row.counts[rt.id] ?? 0;
        return count === 0 ? (
          <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>
        ) : (
          <span style={{ fontWeight: 600, fontSize: 12 }}>{count}</span>
        );
      },
    })),
    {
      key: "total",
      title: <span style={{ fontSize: 12, fontWeight: 600 }}>Total</span>,
      dataIndex: "total",
      align: "center" as const,
      width: 72,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: token.colorPrimary, fontSize: 12 }}>
          {v}
        </span>
      ),
    },
  ];

  // Total summary row (appended as a plain data row with a special key)
  const totalRow: RowData = {
    key: "__total__",
    statusId: "",
    statusName: "Total",
    statusColor: token.colorBorderSecondary,
    counts: totalCounts,
    total: grandTotal,
  };

  const dataSource = visibleRows.length > 0 ? [...visibleRows, totalRow] : [];

  if (dataSource.length === 0) {
    return (
      <div
        className="text-sm text-center py-4"
        style={{ color: token.colorTextSecondary }}
      >
        No reservations in the selected date range.
      </div>
    );
  }

  return (
    <>
      <div className="w-full lg:w-1/2 lg:max-w-[760px]">
        <Table<RowData>
          className="reservation-summary-table"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          rowClassName={(row) =>
            row.key === "__total__" ? "font-semibold bg-gray-50" : ""
          }
          style={{ fontSize: 12 }}
        />
      </div>
      <style jsx global>{`
        .reservation-summary-table .ant-table {
          font-size: 12px;
        }

        .reservation-summary-table .ant-table-thead > tr > th {
          padding: 8px 10px;
          white-space: nowrap;
        }

        .reservation-summary-table .ant-table-tbody > tr > td {
          padding: 7px 10px;
        }

        .reservation-summary-table .ant-table-cell {
          line-height: 1.2;
        }
      `}</style>
    </>
  );
}
