"use client";

import { Button, Tag, Descriptions, Typography, App, Table, Space, Upload, Input, InputNumber, Tooltip, Flex } from "antd";
import type { UploadFile } from "antd";
import { IconPencil, IconCheck, IconX, IconFile, IconTrash, IconUpload, IconMail } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import AppDrawer from "@/common/components/ui/AppDrawer";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import TenantBillPaymentModal from "./TenantBillPaymentModal";
import { useApproveBill, useTenantBill, useUpdateBill, useSendBillEmail } from "../hooks/useTenantBills";
import { tenantBillService } from "@/common/services/tenantBillService";
import { PERMISSIONS } from "@/common/constants/permissions";
import { usePermission } from "@/common/hooks/usePermission";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

const BILL_STATUS_COLORS: Record<string, string> = {
  DRAFT: "default",
  PENDING: "orange",
  PARTIAL: "blue",
  PAID: "green",
  OVERDUE: "red",
};

interface TenantBillDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  billId: string | null;
}

export default function TenantBillDetailDrawer({ open, onClose, billId }: TenantBillDetailDrawerProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const canApprove = hasPermission(PERMISSIONS.LONG_TERM_BILL_APPROVE);
  const canPay = hasPermission(PERMISSIONS.LONG_TERM_BILL_PAY);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [linesDirty, setLinesDirty] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const approveBill = useApproveBill();
  const updateBill = useUpdateBill();
  const sendEmail = useSendBillEmail();
  const { data, isLoading } = useTenantBill(billId ?? "");

  const bill = data?.data as Record<string, unknown> | null;
  const lines = (bill?.lines as Record<string, unknown>[]) ?? [];
  const payments = (bill?.payments as Record<string, unknown>[]) ?? [];
  const existingDocs: Record<string, unknown>[] = (bill?.documents as Record<string, unknown>[]) ?? [];
  const outstanding = bill ? (bill.totalAmount as number) - (bill.totalPaid as number) : 0;
  const displayStatus = bill?.isOverdue ? "OVERDUE" : (bill?.status as string);
  const isDraft = bill?.status === "DRAFT";
  const isPayable = bill?.status === "PENDING" || bill?.status === "PARTIAL" || !!bill?.isOverdue;
  const isSendable = bill?.status === "PENDING" || bill?.status === "PARTIAL" || !!bill?.isOverdue;

  async function handleApprove() {
    if (!bill) return;
    try {
      const result = await approveBill.mutateAsync(bill.id as string);
      const rd = result.data as { approved: boolean; emailSent: boolean };
      message.success(rd.emailSent ? t("longTerm.bill.approveSuccess") : t("longTerm.bill.approveSuccessNoEmail"));
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  async function handleSendEmail() {
    if (!bill) return;
    try {
      const result = await sendEmail.mutateAsync(bill.id as string);
      const rd = result.data as { sent: boolean; error?: string };
      if (rd.sent) {
        message.success(t("longTerm.bill.sendEmailSuccess"));
      } else if (rd.error === "NO_EMAIL_ADDRESS") {
        message.warning(t("longTerm.bill.sendEmailNoAddress"));
      } else {
        message.error(t("longTerm.bill.sendEmailError"));
      }
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  async function handleSaveLine() {
    if (!bill || !editingLineId) return;
    try {
      await updateBill.mutateAsync({
        id: bill.id as string,
        data: { updateLines: [{ id: editingLineId, amount: editingAmount }] },
      });
      setEditingLineId(null);
      setLinesDirty(false);
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  async function handleUploadDocs() {
    if (!bill || stagedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const f of stagedFiles) {
        if (f.originFileObj) {
          await tenantBillService.uploadDocument(bill.id as string, f.originFileObj);
        }
      }
      setStagedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", billId] });
      message.success(t("common.saveSuccess"));
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!bill) return;
    try {
      setDeletingDocId(docId);
      await tenantBillService.deleteDocument(bill.id as string, docId);
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", billId] });
      message.success(t("common.deleteSuccess"));
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    } finally {
      setDeletingDocId(null);
    }
  }

  const emailSentAt = bill?.emailSentAt as string | null;
  const sendEmailTooltip = emailSentAt
    ? t("longTerm.bill.emailLastSent", { date: dayjs(emailSentAt).format("DD/MM/YYYY HH:mm") })
    : t("longTerm.bill.emailNotSent");

  const lineColumns = [
    {
      title: t("longTerm.bill.billLines"),
      render: (_: unknown, r: Record<string, unknown>) => {
        if (r.label) return r.label as string;
        // fallback for legacy bill lines that predate the fee-item migration
        return String(r.type ?? "");
      },
    },
    { dataIndex: "quantity", title: "SL", width: 50 },
    {
      dataIndex: "unitPrice",
      title: t("longTerm.bill.totalAmount"),
      width: 120,
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "amount",
      title: t("longTerm.bill.remaining"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const lineId = r.id as string;
        const isEditing = editingLineId === lineId;
        const isOther = r.category === "OTHER" || (r.category == null && r.type === "OTHER");
        return (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <InputNumber
                  size="small"
                  value={editingAmount}
                  onChange={(v) => setEditingAmount(v ?? 0)}
                  formatter={(v) => formatNumberInput(v, {})}
                  parser={(v) => parseNumberInput(v) as number}
                  min={0}
                  style={{ width: 130 }}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<IconCheck size={13} />}
                  loading={updateBill.isPending}
                  onClick={handleSaveLine}
                />
                <Button
                  size="small"
                  icon={<IconX size={13} />}
                  onClick={() => setEditingLineId(null)}
                />
              </>
            ) : (
              <>
                <span style={{ color: r.isPending ? "#faad14" : undefined }}>
                  <PriceDisplay amount={r.amount as number} isFallback={false} />
                  {!!r.isPending && (
                    <Tag color="warning" style={{ marginLeft: 4, fontSize: 11 }}>
                      {t("longTerm.bill.pendingReadingWarning")}
                    </Tag>
                  )}
                </span>
                {isDraft && isOther && (
                  <Button
                    type="text"
                    size="small"
                    icon={<IconPencil size={13} />}
                    title={t("longTerm.bill.editLine")}
                    onClick={() => {
                      setEditingLineId(lineId);
                      setEditingAmount(r.amount as number);
                      setLinesDirty(true);
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  const paymentColumns = [
    {
      dataIndex: "paymentDate",
      title: t("longTerm.bill.paymentDate"),
      width: 100,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      dataIndex: "amount",
      title: t("longTerm.bill.totalAmount"),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "method",
      title: t("longTerm.bill.paymentMethod"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const pm = r.paymentMethod as Record<string, unknown>;
        return pm?.name as string;
      },
    },
    { dataIndex: "notes", title: t("longTerm.bill.paymentNotes") },
  ];

  const footerButtons = (
    <Flex justify="flex-end" gap={8} wrap="wrap">
      <Button onClick={onClose}>{t("common.cancel")}</Button>
      {isDraft && linesDirty && (
        <Button loading={updateBill.isPending} onClick={handleSaveLine}>
          {t("longTerm.bill.saveLines")}
        </Button>
      )}
      {isDraft && canApprove && (
        <Button type="primary" loading={approveBill.isPending} onClick={handleApprove}>
          {t("longTerm.bill.approveAction")}
        </Button>
      )}
      {isSendable && canApprove && (
        <Tooltip title={sendEmailTooltip}>
          <Button
            icon={<IconMail size={15} />}
            loading={sendEmail.isPending}
            onClick={handleSendEmail}
          >
            {t("longTerm.bill.sendEmailAction")}
          </Button>
        </Tooltip>
      )}
      {isPayable && canPay && (
        <Button type="primary" onClick={() => setPaymentModalOpen(true)}>
          {bill?.status === "PARTIAL"
            ? t("longTerm.bill.addMorePaymentAction")
            : t("longTerm.bill.addPaymentAction")}
        </Button>
      )}
    </Flex>
  );

  return (
    <>
      <AppDrawer
        open={open}
        onClose={onClose}
        title={bill ? `${t("longTerm.bill.title")} ${bill.billingMonth as string}` : t("longTerm.bill.title")}
        width={680}
        footer={footerButtons}
      >
        {!isLoading && bill && (
          <div className="space-y-6">
            {/* Bill Summary */}
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label={t("longTerm.bill.billingMonth")}>{bill.billingMonth as string}</Descriptions.Item>
              <Descriptions.Item label={t("common.status")}>
                <Tag color={BILL_STATUS_COLORS[displayStatus] ?? "default"}>
                  {t(`longTerm.bill.status${displayStatus}` as Parameters<typeof t>[0])}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("longTerm.bill.totalAmount")}>
                <PriceDisplay amount={bill.totalAmount as number} isFallback={false} />
              </Descriptions.Item>
              <Descriptions.Item label={t("longTerm.bill.totalPaid")}>
                <PriceDisplay amount={bill.totalPaid as number} isFallback={false} />
              </Descriptions.Item>
              <Descriptions.Item label={t("longTerm.bill.remaining")}>
                <Typography.Text strong type={outstanding > 0 ? (bill.isOverdue ? "danger" : "warning") : "success"}>
                  <PriceDisplay amount={outstanding} isFallback={false} />
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={t("longTerm.bill.dueDate")}>
                {dayjs(bill.dueDate as string).format("DD/MM/YYYY")}
              </Descriptions.Item>
            </Descriptions>

            {/* Bill Lines */}
            <div>
              <Typography.Title level={5} style={{ marginBottom: 8 }}>
                {t("longTerm.bill.billLines")}
                {isDraft && lines.some((l) => l.isPending) && (
                  <Tag color="warning" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
                    {t("longTerm.bill.pendingReadingWarning")}
                  </Tag>
                )}
              </Typography.Title>
              <Table
                size="small"
                rowKey="id"
                dataSource={lines}
                columns={lineColumns}
                pagination={false}
                bordered
              />
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div>
                <Typography.Title level={5} style={{ marginBottom: 8 }}>{t("longTerm.bill.paymentHistory")}</Typography.Title>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={payments}
                  columns={paymentColumns}
                  pagination={false}
                  bordered
                />
              </div>
            )}

            {/* Documents */}
            <div>
              <Typography.Title level={5} style={{ marginBottom: 8 }}>{t("longTerm.bill.documents")}</Typography.Title>
              {existingDocs.length > 0 && (
                <div className="mb-3 space-y-1">
                  {existingDocs.map((doc) => (
                    <div key={doc.id as string} className="flex items-center gap-2">
                      <IconFile size={16} className="shrink-0 text-gray-400" />
                      <a
                        href={doc.url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-sm"
                      >
                        {doc.name as string}
                      </a>
                      <Button
                        type="text"
                        danger
                        size="small"
                        loading={deletingDocId === (doc.id as string)}
                        icon={<IconTrash size={14} />}
                        onClick={() => handleDeleteDoc(doc.id as string)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <Space>
                <Upload
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  fileList={stagedFiles}
                  beforeUpload={(file) => {
                    if (file.size / 1024 / 1024 > 10) {
                      message.error(`${file.name}: file must be smaller than 10 MB`);
                      return Upload.LIST_IGNORE;
                    }
                    setStagedFiles((prev) => [
                      ...prev,
                      { uid: file.uid, name: file.name, status: "done", originFileObj: file },
                    ]);
                    return false;
                  }}
                  onRemove={(file) => setStagedFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
                >
                  <Button icon={<IconUpload size={14} />}>{t("longTerm.bill.uploadDocuments")}</Button>
                </Upload>
                {stagedFiles.length > 0 && (
                  <Button type="primary" size="small" loading={uploading} onClick={handleUploadDocs}>
                    {t("common.save")}
                  </Button>
                )}
              </Space>
              <div className="text-xs text-gray-400 mt-1">{t("longTerm.bill.uploadDocumentsHint")}</div>
            </div>
          </div>
        )}
      </AppDrawer>
      <TenantBillPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        bill={bill}
      />
    </>
  );
}
