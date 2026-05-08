"use client";

import { useState } from "react";
import { Form, Button, DatePicker, Select, Checkbox, InputNumber, Input, Row, Col, App, Upload } from "antd";
import type { UploadFile } from "antd";
import { IconUpload, IconTrash, IconFile } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import AppDrawer from "@/common/components/ui/AppDrawer";
import CurrencyField from "@/common/components/form/CurrencyField";
import { useCreateLease, useUpdateLease, useLease } from "../hooks/useLeases";
import { leaseService } from "@/common/services/leaseService";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

interface LeaseFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editLease?: Record<string, unknown> | null;
  rooms: { id: string; number: string; roomType?: { name: string } }[];
  guests: { id: string; firstName: string; lastName: string }[];
}

export default function LeaseFormDrawer({ open, onClose, editLease, rooms, guests }: LeaseFormDrawerProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const [stagedFiles, setStagedFiles] = useState<UploadFile[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!editLease;
  const leaseId = editLease?.id as string | undefined;

  const { data: leaseDetailData } = useLease(leaseId ?? "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingDocs: Record<string, unknown>[] = (leaseDetailData?.data as any)?.documents ?? [];

  function handleOpen() {
    setStagedFiles([]);
    if (editLease) {
      form.setFieldsValue({
        roomId: editLease.roomId,
        guestId: editLease.guestId,
        startDate: editLease.startDate ? dayjs(editLease.startDate as string) : null,
        endDate: editLease.endDate ? dayjs(editLease.endDate as string) : null,
        monthlyRent: editLease.monthlyRent,
        depositAmount: editLease.depositAmount,
        depositPaid: editLease.depositPaid,
        paymentDueDay: editLease.paymentDueDay,
        occupants: editLease.occupants ?? 1,
        notes: editLease.notes,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ paymentDueDay: 10, depositPaid: false, occupants: 1 });
    }
  }

  async function handleDeleteDoc(docId: string) {
    try {
      setDeletingDocId(docId);
      await leaseService.deleteDocument(leaseId!, docId);
      queryClient.invalidateQueries({ queryKey: ["leases", leaseId] });
      message.success(t("common.deleteSuccess"));
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        startDate: (values.startDate as dayjs.Dayjs)?.toISOString(),
        endDate: (values.endDate as dayjs.Dayjs)?.toISOString() ?? null,
      };

      let targetLeaseId: string;

      if (isEdit) {
        await updateLease.mutateAsync({ id: editLease!.id as string, data: payload });
        targetLeaseId = editLease!.id as string;
      } else {
        const res = await createLease.mutateAsync(payload);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        targetLeaseId = (res.data as any).id;
      }

      const uploadResults = await Promise.allSettled(
        stagedFiles
          .filter((f) => f.originFileObj)
          .map((f) => leaseService.uploadDocument(targetLeaseId, f.originFileObj!))
      );
      const failedUploads = uploadResults
        .map((r, i) => (r.status === "rejected" ? stagedFiles[i]?.name : null))
        .filter(Boolean) as string[];

      message.success(isEdit ? t("longTerm.lease.updateSuccess") : t("longTerm.lease.createSuccess"));
      if (failedUploads.length > 0) {
        message.error(`Upload failed: ${failedUploads.join(", ")}`);
      }
      onClose();
      form.resetFields();
      setStagedFiles([]);
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? t("longTerm.lease.editTitle") : t("longTerm.lease.createTitle")}
      width={520}
      afterOpenChange={(v) => v && handleOpen()}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={submitting} onClick={form.submit}>
            {isEdit ? t("longTerm.lease.updateAction") : t("longTerm.lease.createAction")}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={12}>
          <Col xs={8} sm={8}>
            <Form.Item name="roomId" label={t("longTerm.lease.room")} rules={[{ required: true }]}>
              <Select
                showSearch
                disabled={isEdit}
                filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={rooms.map((r) => ({ value: r.id, label: `${r.number}${r.roomType ? ` · ${r.roomType.name}` : ""}` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={16} sm={16}>
            <Form.Item name="guestId" label={t("longTerm.lease.tenant")} rules={[{ required: true }]}>
              <Select
                showSearch
                disabled={isEdit}
                filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={guests.map((g) => ({ value: g.id, label: `${g.firstName} ${g.lastName}` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item name="startDate" label={t("longTerm.lease.startDate")} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item name="endDate" label={t("longTerm.lease.endDate")}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <CurrencyField
              name="monthlyRent"
              label={t("longTerm.lease.monthlyRent")}
              translateLabel={false}
              rules={[{ required: true }]}
            />
          </Col>
          <Col xs={12} sm={12}>
            <CurrencyField
              name="depositAmount"
              label={t("longTerm.lease.depositAmount")}
              translateLabel={false}
              rules={[{ required: true }]}
            />
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item name="paymentDueDay" label={t("longTerm.lease.paymentDueDay")}>
              <InputNumber style={{ width: "100%" }} min={1} max={28} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={12}>
            <Form.Item name="occupants" label={t("longTerm.lease.occupants")}>
              <InputNumber style={{ width: "100%" }} min={1} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="depositPaid" valuePropName="checked" >
              <Checkbox>{t("longTerm.lease.depositPaid")}</Checkbox>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="notes" label={t("longTerm.lease.notes")}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <div className="mb-1 font-medium">{t("longTerm.lease.documents")}</div>
            {isEdit && existingDocs.length > 0 && (
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
            <Upload
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              fileList={stagedFiles}
              beforeUpload={(file) => {
                if (file.size / 1024 / 1024 > 10) {
                  message.error(`${file.name}: file must be smaller than 10 MB`);
                  return Upload.LIST_IGNORE;
                }
                const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                setStagedFiles((prev) => [
                  ...prev,
                  { uid: file.uid, name: `${file.name} (${sizeMB} MB)`, status: "done", originFileObj: file },
                ]);
                return false;
              }}
              onRemove={(file) => setStagedFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
            >
              <Button icon={<IconUpload size={14} />}>{t("longTerm.lease.uploadDocuments")}</Button>
            </Upload>
            <div className="text-xs text-gray-400 mt-1">{t("longTerm.lease.uploadDocumentsHint")}</div>
          </Col>
        </Row>
      </Form>
    </AppDrawer>
  );
}
