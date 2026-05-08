"use client";

import { Button, Flex, Space, Tag, App, Form, Input, Select } from "antd";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import AppDrawer from "@/common/components/ui/AppDrawer";
import { useFeeItems, useCreateFeeItem, useUpdateFeeItem, useDeleteFeeItem } from "../hooks/useFeeItems";
import { usePagination } from "@/common/hooks/usePagination";
import { useState } from "react";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";
import { useConfirm } from "@/common/hooks/useConfirm";

export default function FeeItemTable() {
  const t = useTranslations();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const { page, limit, setPage } = usePagination(1, 20);
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useFeeItems({ page, limit, showInactive });
  const createItem = useCreateFeeItem();
  const updateItem = useUpdateFeeItem();
  const deleteItem = useDeleteFeeItem();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const items = (data?.data as Record<string, unknown>[]) ?? [];
  const total = (data?.meta as { total?: number })?.total ?? 0;

  function handleAdd() {
    setEditItem(null);
    setDrawerOpen(true);
  }

  function handleEdit(r: Record<string, unknown>) {
    setEditItem(r);
    setDrawerOpen(true);
  }

  function handleDelete(r: Record<string, unknown>) {
    confirm({
      onOk: async () => {
        try {
          await deleteItem.mutateAsync(r.id as string);
          message.success(t("longTerm.feeItem.deleteSuccess"));
        } catch (err) {
          message.error(getLongTermApiErrorMessage(err, t));
        }
      },
    });
  }

  function handleDrawerOpen(v: boolean) {
    if (v) {
      if (editItem) {
        form.setFieldsValue({ code: editItem.code, name: editItem.name, type: editItem.type, unit: editItem.unit ?? "" });
      } else {
        form.resetFields();
      }
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      if (editItem) {
        await updateItem.mutateAsync({ id: editItem.id as string, data: values });
        message.success(t("longTerm.feeItem.updateSuccess"));
      } else {
        await createItem.mutateAsync(values);
        message.success(t("longTerm.feeItem.createSuccess"));
      }
      setDrawerOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  const columns = [
    { key: "code", dataIndex: "code", title: t("longTerm.feeItem.code") },
    { key: "name", dataIndex: "name", title: t("longTerm.feeItem.name") },
    {
      key: "type",
      dataIndex: "type",
      title: t("longTerm.feeItem.type"),
      render: (v: string) => (
        <Tag color={v === "METERED" ? "blue" : "purple"}>
          {v === "METERED" ? t("longTerm.feeItem.typeMETERED") : t("longTerm.feeItem.typeFIXED")}
        </Tag>
      ),
    },
    { key: "unit", dataIndex: "unit", title: t("longTerm.feeItem.unit"), render: (v: string) => v || "—" },
    {
      key: "isActive",
      dataIndex: "isActive",
      title: t("common.status"),
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? t("common.active") : t("common.inactive")}</Tag>,
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 120,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space size="small">
          <Button size="small" onClick={() => handleEdit(r)}>{t("common.edit")}</Button>
          {!!r.isActive && (
            <Button size="small" danger onClick={() => handleDelete(r)}>{t("common.delete")}</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" style={{ marginBottom: 12 }}>
        <Button onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? t("common.active") : t("longTerm.feeItem.showInactive")}
        </Button>
        <Button type="primary" onClick={handleAdd}>
          {t("longTerm.feeItem.createAction")}
        </Button>
      </Flex>
      <AppTable
        rowKey="id"
        dataSource={items}
        columns={columns}
        loading={isLoading}
        pagination={{ current: page, pageSize: limit, total, onChange: setPage }}
      />
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? t("longTerm.feeItem.editTitle") : t("longTerm.feeItem.createTitle")}
        width={400}
        afterOpenChange={handleDrawerOpen}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDrawerOpen(false)}>{t("common.cancel")}</Button>
            <Button type="primary" loading={createItem.isPending || updateItem.isPending} onClick={form.submit}>
              {editItem ? t("longTerm.feeItem.updateAction") : t("longTerm.feeItem.createAction")}
            </Button>
          </Flex>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label={t("longTerm.feeItem.code")} rules={[{ required: true }]}>
            <Input disabled={!!editItem} placeholder="ELECTRICITY" />
          </Form.Item>
          <Form.Item name="name" label={t("longTerm.feeItem.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t("longTerm.feeItem.type")} rules={[{ required: true }]}>
            <Select
              disabled={!!editItem}
              options={[
                { value: "METERED", label: t("longTerm.feeItem.typeMETERED") },
                { value: "FIXED", label: t("longTerm.feeItem.typeFIXED") },
              ]}
            />
          </Form.Item>
          <Form.Item name="unit" label={t("longTerm.feeItem.unit")}>
            <Input placeholder="kWh, m³, month…" />
          </Form.Item>
        </Form>
      </AppDrawer>
    </>
  );
}
