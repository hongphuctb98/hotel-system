"use client";

import { useState, useEffect } from "react";
import { Form, Button, App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import AppDrawer from "@/common/components/ui/AppDrawer";
import TypeSelector from "./TypeSelector";
import DocumentHeaderFields from "./DocumentHeaderFields";
import ServiceLinesEditor from "./ServiceLinesEditor";
import InventoryLinesEditor from "./InventoryLinesEditor";
import DocumentTotalFooter from "./DocumentTotalFooter";
import { useExpenseDocumentMutations } from "../hooks/useExpenseDocumentMutations";
import { ApiError } from "@/common/services/apiClient";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";
import type { ExpenseDocumentType, ExpenseDocument } from "@/common/services/expenseDocumentService";
import type { ServiceLine } from "./ServiceLinesEditor";
import type { InventoryLine } from "./InventoryLinesEditor";

export type DrawerPreset = {
  type?: ExpenseDocumentType;
  accountingMonth?: string;
  vendorName?: string;
  paymentMethodId?: string;
  serviceLines?: ServiceLine[];
  inventoryLines?: InventoryLine[];
};

interface ExpenseDocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  editRecord?: ExpenseDocument | null;
  isEditLoading?: boolean;
  preset?: DrawerPreset | null;
  onStockConflict?: (products: Array<{ productId: string; productName: string; currentQty: number; shortfall: number }>) => void;
}

const EMPTY_SERVICE_LINES: ServiceLine[] = [{ expenseItemId: "", amount: 0 }];
const EMPTY_INVENTORY_LINES: InventoryLine[] = [{ productId: "", quantity: 0, unitPrice: 0 }];

export default function ExpenseDocumentDrawer({
  open,
  onClose,
  editRecord,
  isEditLoading,
  preset,
  onStockConflict,
}: ExpenseDocumentDrawerProps) {
  const t = useTranslations("expenses");
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { createMutation, updateMutation } = useExpenseDocumentMutations();

  const isEditing = !!editRecord;
  const [type, setType] = useState<ExpenseDocumentType>("SERVICE");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(EMPTY_SERVICE_LINES);
  const [inventoryLines, setInventoryLines] = useState<InventoryLine[]>(EMPTY_INVENTORY_LINES);
  const [accountingMonth, setAccountingMonth] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<string[]>([]);

  // Reset local state when drawer closes.
  // form.resetFields() is intentionally omitted — AppDrawer uses destroyOnHidden,
  // so the Form element is already unmounted by the time this effect runs.
  useEffect(() => {
    if (!open) {
      setType("SERVICE");
      setServiceLines(EMPTY_SERVICE_LINES);
      setInventoryLines(EMPTY_INVENTORY_LINES);
      setAccountingMonth(null);
      setPendingFiles([]);
      setDeletingAttachmentIds([]);
    }
  }, [open]);

  // Hydrate form when edit record loads or preset changes
  useEffect(() => {
    if (!open) return;

    if (editRecord) {
      setType(editRecord.type);
      form.resetFields();
      form.setFieldsValue({
        documentDate: dayjs(editRecord.documentDate),
        accountingMonth: dayjs(editRecord.accountingMonth),
        vendorName: editRecord.vendorName ?? undefined,
        paymentMethodId: editRecord.paymentMethodId ?? undefined,
        referenceNumber: editRecord.referenceNumber ?? undefined,
        note: editRecord.note ?? undefined,
        isPaid: editRecord.isPaid,
        paidAt: editRecord.paidAt ? dayjs(editRecord.paidAt) : undefined,
      });
      setAccountingMonth(dayjs(editRecord.accountingMonth).format("YYYY-MM"));
      if (editRecord.type === "SERVICE") {
        setServiceLines(
          editRecord.serviceLines.map((l) => ({ expenseItemId: l.expenseItemId, amount: l.amount }))
        );
        setInventoryLines(EMPTY_INVENTORY_LINES);
      } else {
        setInventoryLines(
          editRecord.inventoryLines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: l.unitPrice,
          }))
        );
        setServiceLines(EMPTY_SERVICE_LINES);
      }
    } else if (preset) {
      const docType = preset.type ?? "SERVICE";
      setType(docType);
      const month = preset.accountingMonth ?? dayjs().format("YYYY-MM");
      setAccountingMonth(month);
      form.resetFields();
      form.setFieldsValue({
        documentDate: dayjs(),
        accountingMonth: dayjs(month, "YYYY-MM"),
        vendorName: preset.vendorName,
        paymentMethodId: preset.paymentMethodId,
        isPaid: false,
      });
      setServiceLines(preset.serviceLines ?? EMPTY_SERVICE_LINES);
      setInventoryLines(preset.inventoryLines ?? EMPTY_INVENTORY_LINES);
    } else {
      // Fresh create — clear all stale values then set defaults
      form.resetFields();
      setAccountingMonth(dayjs().format("YYYY-MM"));
      form.setFieldsValue({
        documentDate: dayjs(),
        accountingMonth: dayjs(),
        isPaid: false,
      });
    }
  }, [open, editRecord, preset, form]);

  const handleTypeChange = (newType: ExpenseDocumentType) => {
    const hasLines =
      (type === "SERVICE" && serviceLines.some((l) => l.expenseItemId)) ||
      (type !== "SERVICE" && inventoryLines.some((l) => l.productId));

    if (hasLines) {
      modal.confirm({
        title: t("typeSwitchConfirmTitle"),
        content: t("typeSwitchConfirm"),
        onOk: () => {
          setType(newType);
          setServiceLines(EMPTY_SERVICE_LINES);
          setInventoryLines(EMPTY_INVENTORY_LINES);
        },
      });
    } else {
      setType(newType);
    }
  };

  const computeTotal = () => {
    if (type === "SERVICE") {
      return serviceLines.reduce((s, l) => s + (l.amount || 0), 0);
    }
    return inventoryLines.reduce((s, l) => s + Math.round((l.quantity || 0) * (l.unitPrice || 0)), 0);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const accountingMonthStr = dayjs(values.accountingMonth).format("YYYY-MM");
    const documentDateStr = dayjs(values.documentDate).toISOString();

    const lines = type === "SERVICE"
      ? serviceLines.filter((l) => l.expenseItemId).map((l) => ({ expenseItemId: l.expenseItemId, amount: l.amount }))
      : inventoryLines.filter((l) => l.productId).map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice }));

    if (lines.length === 0) {
      message.error(t("lines.minOneLine"));
      return;
    }

    const body = {
      type,
      documentDate: documentDateStr,
      accountingMonth: accountingMonthStr,
      vendorName: values.vendorName || undefined,
      paymentMethodId: values.paymentMethodId || undefined,
      referenceNumber: values.referenceNumber || undefined,
      note: values.note || undefined,
      isPaid: values.isPaid ?? false,
      paidAt: values.isPaid && values.paidAt ? dayjs(values.paidAt).toISOString() : null,
      lines,
    };

    try {
      let savedDocId: string;
      if (isEditing && editRecord) {
        await updateMutation.mutateAsync({ id: editRecord.id, body });
        savedDocId = editRecord.id;
        message.success(t("updateSuccess"));
      } else {
        const result = await createMutation.mutateAsync(body as Parameters<typeof createMutation.mutateAsync>[0]);
        savedDocId = result.data!.id;
        message.success(t("createSuccess"));
      }
      const hasAttachmentChanges = deletingAttachmentIds.length > 0 || pendingFiles.length > 0;
      for (const attachmentId of deletingAttachmentIds) {
        await expenseDocumentService.deleteAttachment(savedDocId, attachmentId);
      }
      for (const file of pendingFiles) {
        await expenseDocumentService.uploadAttachment(savedDocId, file);
      }
      if (hasAttachmentChanges) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["expenseDocument", savedDocId] }),
          queryClient.invalidateQueries({ queryKey: ["expenseDocuments"] }),
        ]);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "STOCK_ALREADY_CONSUMED") {
        const data = err.data as { products: Array<{ productId: string; productName: string; currentQty: number; shortfall: number }> };
        onStockConflict?.(data.products);
      } else if (err instanceof ApiError && err.code === "ADJUSTMENT_IMMUTABLE") {
        message.error(t("errors.adjustmentImmutable"));
      } else {
        message.error(isEditing ? t("updateFailed") : t("createFailed"));
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const drawerSize = type === "SERVICE" ? 600 : 690;
  const showLoading = !!isEditLoading;

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? t("updateAction") : t("createAction")}
      size={drawerSize}
      extra={
        !showLoading ? (
          <Button type="primary" loading={isPending} onClick={handleSubmit}>
            {isEditing ? t("updateAction") : t("createAction")}
          </Button>
        ) : null
      }
    >
      {showLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spin size="large" />
        </div>
      ) : (
        <TypeSelector value={type} onChange={handleTypeChange} disabled={isEditing} />
      )}
      {/* Form must always be rendered to keep the useForm instance connected */}
      <Form
        form={form}
        layout="horizontal"
        onValuesChange={(changed) => {
          if (changed.accountingMonth) {
            setAccountingMonth(dayjs(changed.accountingMonth).format("YYYY-MM"));
          }
        }}
      >
        {!showLoading && (
          <DocumentHeaderFields
            type={type}
            accountingMonth={accountingMonth}
            existingAttachments={editRecord?.attachments ?? []}
            deletingAttachmentIds={deletingAttachmentIds}
            pendingFiles={pendingFiles}
            onAddFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
            onRemovePendingFile={(idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
            onDeleteExistingAttachment={(id) => setDeletingAttachmentIds((prev) => [...prev, id])}
          />
        )}
      </Form>
      {!showLoading && (
        <>
          <div className="mt-4">
            {type === "SERVICE" ? (
              <ServiceLinesEditor lines={serviceLines} onChange={setServiceLines} />
            ) : (
              <InventoryLinesEditor lines={inventoryLines} onChange={setInventoryLines} type={type} />
            )}
          </div>
          <DocumentTotalFooter total={computeTotal()} />
        </>
      )}
    </AppDrawer>
  );
}
