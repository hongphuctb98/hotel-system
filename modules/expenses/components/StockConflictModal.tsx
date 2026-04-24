"use client";

import { Modal, Table } from "antd";
import { useTranslations } from "next-intl";

export type ConflictProduct = {
  productId: string;
  productName: string;
  currentQty: number;
  shortfall: number;
};

interface StockConflictModalProps {
  open: boolean;
  products: ConflictProduct[];
  onClose: () => void;
  onCreateAdjustment: (products: ConflictProduct[]) => void;
}

export default function StockConflictModal({ open, products, onClose, onCreateAdjustment }: StockConflictModalProps) {
  const t = useTranslations("expenses.errors");

  const columns = [
    { key: "name", dataIndex: "productName", title: t("product") },
    { key: "current", dataIndex: "currentQty", title: t("currentStock") },
    { key: "shortfall", dataIndex: "shortfall", title: t("shortfall") },
  ];

  return (
    <Modal
      open={open}
      title={t("stockAlreadyConsumedTitle")}
      onCancel={onClose}
      okText={t("createAdjustmentAction")}
      cancelText={t("close")}
      onOk={() => onCreateAdjustment(products)}
    >
      <p className="mb-3 text-sm">{t("stockAlreadyConsumedDesc")}</p>
      <Table
        columns={columns}
        dataSource={products}
        rowKey="productId"
        pagination={false}
        size="small"
      />
    </Modal>
  );
}
