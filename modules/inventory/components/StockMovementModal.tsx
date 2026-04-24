"use client";

import { useState } from "react";
import { Modal, Form, Segmented, InputNumber, Select, Input, Typography, App } from "antd";
import { useTranslations } from "next-intl";
import { ApiError } from "@/common/services/apiClient";
import { useStockMovementMutation } from "../hooks/useStockMovementMutation";
import type { InventoryItem } from "@/common/services/inventoryService";

interface StockMovementModalProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

const REASON_BY_TYPE: Record<string, string[]> = {
  IN: ["PURCHASE", "MANUAL", "STOCKTAKE"],
  OUT: ["MANUAL", "STOCKTAKE"],
  ADJUST: ["MANUAL", "STOCKTAKE"],
};

export default function StockMovementModal({ open, item, onClose }: StockMovementModalProps) {
  const t = useTranslations("inventory");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [insufficientError, setInsufficientError] = useState<string | null>(null);
  const mutation = useStockMovementMutation(item?.productId ?? "");

  const modalTitles = { IN: t("movementModal.titleIn"), OUT: t("movementModal.titleOut"), ADJUST: t("movementModal.titleAdjust") };
  const isAdjust = type === "ADJUST";

  const handleTypeChange = (v: string | number) => {
    setType(v as "IN" | "OUT" | "ADJUST");
    setInsufficientError(null);
    form.resetFields(["quantity", "reason"]);
    // Pre-fill ADJUST with current stock so user sees starting point
    if (v === "ADJUST" && item) {
      form.setFieldValue("quantity", item.quantity);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setInsufficientError(null);
    try {
      await mutation.mutateAsync({ type, quantity: values.quantity, reason: values.reason, note: values.note });
      message.success(`${modalTitles[type]} recorded`);
      form.resetFields();
      setType("IN");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_STOCK") {
        const data = err.data as { available: number };
        setInsufficientError(
          t("movementModal.insufficientStock", { n: data?.available ?? 0, unit: item?.product.unit ?? "" })
        );
      } else {
        message.error("Failed to record movement");
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setType("IN");
    setInsufficientError(null);
    onClose();
  };

  const reasonLabels: Record<string, string> = {
    PURCHASE: t("movementReasons.PURCHASE"),
    MANUAL: t("movementReasons.MANUAL"),
    STOCKTAKE: t("movementReasons.STOCKTAKE"),
    BOOKING_SERVICE: t("movementReasons.BOOKING_SERVICE"),
    HOUSEKEEPING: t("movementReasons.HOUSEKEEPING"),
  };
  const reasonOptions = REASON_BY_TYPE[type].map((r) => ({
    value: r,
    label: reasonLabels[r] ?? r,
  }));

  const quantityLabel = isAdjust ? t("movementModal.quantityAdjust") : t("movementModal.quantity");
  const quantityMin = isAdjust ? 0 : 1;
  const quantityRule = isAdjust
    ? [{ required: true, message: t("movementModal.quantityRequired") }, { type: "number" as const, min: 0, message: t("movementModal.quantityAdjustMin") }]
    : [{ required: true, message: t("movementModal.quantityRequired") }, { type: "number" as const, min: 1, message: t("movementModal.quantityRequired") }];

  return (
    <Modal
      open={open}
      title={modalTitles[type]}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={t("movementModal.submit")}
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      {item && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="font-medium">{item.product.name}</div>
          <div className="text-sm text-gray-500">
            {t("movementModal.currentStock")}: <strong>{item.quantity}</strong> {item.product.unit}
          </div>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item label={t("movementModal.type")}>
          <Segmented
            value={type}
            onChange={handleTypeChange}
            options={[
              { value: "IN", label: t("movementTypes.IN") },
              { value: "OUT", label: t("movementTypes.OUT") },
              { value: "ADJUST", label: t("movementTypes.ADJUST") },
            ]}
            block
          />
        </Form.Item>
        <Form.Item name="quantity" label={quantityLabel} rules={quantityRule}>
          <InputNumber
            min={quantityMin}
            precision={0}
            style={{ width: "100%" }}
            placeholder={isAdjust ? t("movementModal.quantityAdjustPlaceholder") : t("movementModal.quantityPlaceholder")}
          />
        </Form.Item>
        {isAdjust && item && (
          <Typography.Text type="secondary" className="block -mt-3 mb-3 text-xs">
            {t("movementModal.adjustHint", { current: item.quantity, unit: item.product.unit })}
          </Typography.Text>
        )}
        <Form.Item
          name="reason"
          label={t("movementModal.reason")}
          rules={[{ required: true, message: t("movementModal.reasonRequired") }]}
        >
          <Select options={reasonOptions} placeholder={t("movementModal.reason")} />
        </Form.Item>
        <Form.Item name="note" label={t("movementModal.note")}>
          <Input.TextArea rows={2} placeholder={t("movementModal.notePlaceholder")} />
        </Form.Item>
        {insufficientError && (
          <Typography.Text type="danger">{insufficientError}</Typography.Text>
        )}
      </Form>
    </Modal>
  );
}
