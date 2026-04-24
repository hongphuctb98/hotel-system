"use client";

import { Button, Switch, Select } from "antd";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppTable from "@/common/components/ui/AppTable";
import AppModal from "@/common/components/ui/AppModal";
import { booleanSorter } from "@/common/components/ui/table/sorters";
import { useMasterDataCrud } from "../hooks/useMasterDataCrud";
import type { MasterDataConfig } from "@/types/master.types";

interface MasterDataTableProps<T extends { id: string; isActive: boolean }> {
  config: MasterDataConfig<T>;
  tableType?: "category" | "product";
}

export default function MasterDataTable<
  T extends { id: string; isActive: boolean }
>({ config, tableType }: MasterDataTableProps<T>) {
  const t = useTranslations();
  const {
    data,
    isLoading,
    pagination,
    modalState,
    openCreate,
    openEdit,
    closeModal,
    handleToggleActive,
    handleDelete,
    isActiveFilter,
    setIsActiveFilter,
  } = useMasterDataCrud<T>(config.endpoint);

  const filterOptions = [
    { value: "", label: t("common.all") },
    { value: "true", label: t("common.active") },
    { value: "false", label: t("common.inactive") },
  ];

  const columns = [
    ...config.columns,
    {
      key: "isActive",
      title: t("common.status"),
      dataIndex: "isActive",
      width: 100,
      sorter: booleanSorter<T>((record) => record.isActive),
      render: (val: boolean, record: T) => (
        <Switch
          checked={val}
          size="small"
          onChange={() => handleToggleActive(record.id, !val)}
        />
      ),
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: T) => (
        <div className="flex gap-2">
          <Button
            type="text"
            size="small"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<IconTrash size={14} />}
            onClick={() => handleDelete(record.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AppPageHeader
        title={config.titleKey}
        extra={
          <>
            <Select
              style={{ width: 120 }}
              size="small"
              options={filterOptions}
              value={isActiveFilter}
              onChange={(v) => setIsActiveFilter(v as "" | "true" | "false")}
            />
            <Button type="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
              {t("common.add")}
            </Button>
          </>
        }
      />
      <AppTable
        columns={columns as never}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowKey="id"
        maxHeight={tableType === "category" ? 180 : tableType === "product" ? 300 : undefined}
      />
      <AppModal
        open={modalState.open}
        title={modalState.record ? t("common.edit") : t("common.add")}
        onClose={closeModal}
      >
        <config.FormComponent
          initialValues={modalState.record}
          onSuccess={closeModal}
          endpoint={config.endpoint}
        />
      </AppModal>
    </>
  );
}
