"use client";

import { Button, Tag, Badge, Tooltip, App } from "antd";
import { IconEdit, IconTrash, IconCopy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppTable from "@/common/components/ui/AppTable";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { useExpenseDocuments } from "../hooks/useExpenseDocuments";
import { useExpenseDocumentMutations } from "../hooks/useExpenseDocumentMutations";
import { ApiError } from "@/common/services/apiClient";
import type { ExpenseDocumentListItem, ExpenseDocumentType } from "@/common/services/expenseDocumentService";
import type { ExpenseFiltersState } from "./ExpenseDocumentFilters";

interface ExpenseDocumentTableProps {
  filters: ExpenseFiltersState;
  onEdit: (doc: ExpenseDocumentListItem) => void;
  onDuplicate: (doc: ExpenseDocumentListItem) => void;
}

const TYPE_COLORS: Record<ExpenseDocumentType, string> = {
  SERVICE: "blue",
  INVENTORY: "green",
  INVENTORY_ADJUSTMENT: "orange",
};

export default function ExpenseDocumentTable({ filters, onEdit, onDuplicate }: ExpenseDocumentTableProps) {
  const t = useTranslations("expenses");
  const { message } = App.useApp();
  const { deleteMutation } = useExpenseDocumentMutations();

  const apiFilters = {
    type: filters.type,
    accountingMonth: filters.accountingMonthRange
      ? filters.accountingMonthRange[0].format("YYYY-MM")
      : undefined,
    categoryId: filters.categoryId,
  };

  const { data, isLoading } = useExpenseDocuments(apiFilters);
  const docs = data?.data ?? [];

  const handleDelete = async (doc: ExpenseDocumentListItem) => {
    if (doc.type === "INVENTORY_ADJUSTMENT") {
      message.error(t("errors.adjustmentImmutable"));
      return;
    }
    message.loading({ content: t("deleting"), key: "delete" });
    try {
      await deleteMutation.mutateAsync(doc.id);
      message.success({ content: t("deleteSuccess"), key: "delete" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "ADJUSTMENT_IMMUTABLE") {
        message.error({ content: t("errors.adjustmentImmutable"), key: "delete" });
      } else if (err instanceof ApiError && err.code === "STOCK_ALREADY_CONSUMED") {
        message.error({ content: t("errors.stockAlreadyConsumedTitle"), key: "delete" });
      } else {
        message.error({ content: t("deleteFailed"), key: "delete" });
      }
    }
  };

  const columns = [
    {
      key: "documentDate",
      title: t("documentDate"),
      dataIndex: "documentDate",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
      sorter: (a: ExpenseDocumentListItem, b: ExpenseDocumentListItem) =>
        dayjs(a.documentDate).valueOf() - dayjs(b.documentDate).valueOf(),
    },
    {
      key: "accountingMonth",
      title: t("accountingMonth"),
      dataIndex: "accountingMonth",
      width: 130,
      render: (v: string) => dayjs(v).format("MM/YYYY"),
    },
    {
      key: "type",
      title: t("type"),
      dataIndex: "type",
      width: 160,
      render: (v: ExpenseDocumentType) => (
        <Tag color={TYPE_COLORS[v]}>{t(`types.${v}`)}</Tag>
      ),
    },
    {
      key: "items",
      title: t("items"),
      ellipsis: true,
      render: (_: unknown, record: ExpenseDocumentListItem) => {
        const names = record.itemNames;
        if (!names.length) return "—";
        const fullProduct = names.join(", ");
        return fullProduct;
      },
    },
    {
      key: "vendor",
      title: t("vendor"),
      dataIndex: "vendorName",
      width: 140,
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "total",
      title: t("total"),
      dataIndex: "totalAmount",
      width: 150,
      align: "right" as const,
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
      sorter: (a: ExpenseDocumentListItem, b: ExpenseDocumentListItem) =>
        a.totalAmount - b.totalAmount,
    },
    {
      key: "isPaid",
      title: t("isPaid"),
      dataIndex: "isPaid",
      width: 120,
      align: "center" as const,
      render: (v: boolean) => (
        <Badge status={v ? "success" : "default"} text={v ? t("isPaid") : "—"} />
      ),
    },
    {
      key: "actions",
      title: t("actions.title"),
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: ExpenseDocumentListItem) => (
        <div className="flex gap-1">
          <Button
            type="text"
            size="small"
            icon={<IconEdit size={14} />}
            onClick={() => {
              if (record.type === "INVENTORY_ADJUSTMENT") {
                message.error(t("errors.adjustmentImmutable"));
                return;
              }
              onEdit(record);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<IconCopy size={14} />}
            onClick={() => onDuplicate(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<IconTrash size={14} />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <AppTable
      columns={columns}
      dataSource={docs}
      rowKey="id"
      loading={isLoading}
    />
  );
}
