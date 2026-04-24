"use client";

import {
  Form,
  DatePicker,
  AutoComplete,
  Alert,
  Switch,
  Upload,
  Button,
} from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import {
  IconUpload,
  IconTrash,
  IconPhoto,
  IconFileTypePdf,
} from "@tabler/icons-react";
import TextField from "@/common/components/form/TextField";
import SelectField from "@/common/components/form/SelectField";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useVendorSuggestions } from "../hooks/useVendorSuggestions";
import type {
  ExpenseDocumentType,
  ExpenseDocumentAttachment,
} from "@/common/services/expenseDocumentService";
import TextAreaField from "@/common/components/form/TextAreaField";

interface DocumentHeaderFieldsProps {
  type: ExpenseDocumentType;
  accountingMonth: string | null;
  existingAttachments: ExpenseDocumentAttachment[];
  deletingAttachmentIds: string[];
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemovePendingFile: (index: number) => void;
  onDeleteExistingAttachment: (id: string) => void;
}

function isPdf(nameOrUrl: string) {
  return nameOrUrl.toLowerCase().endsWith(".pdf");
}

function AttachmentRow({
  name,
  url,
  onRemove,
}: {
  name: string;
  url?: string;
  onRemove: () => void;
}) {
  const content = url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 flex-1 min-w-0"
    >
      {isPdf(name) ? (
        <IconFileTypePdf size={28} style={{ flexShrink: 0 }} />
      ) : (
        <img
          src={url}
          alt={name}
          style={{
            width: 36,
            height: 36,
            objectFit: "cover",
            borderRadius: 4,
            border: "1px solid #d9d9d9",
            flexShrink: 0,
          }}
        />
      )}
      <span className="text-sm truncate">{name}</span>
    </a>
  ) : (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {isPdf(name) ? (
        <IconFileTypePdf size={20} style={{ flexShrink: 0 }} />
      ) : (
        <IconPhoto size={20} style={{ flexShrink: 0 }} />
      )}
      <span className="text-sm truncate">{name}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded border border-dashed">
      {content}
      <Button
        size="small"
        danger
        type="text"
        icon={<IconTrash size={14} />}
        onClick={onRemove}
      />
    </div>
  );
}

export default function DocumentHeaderFields({
  type,
  accountingMonth,
  existingAttachments,
  deletingAttachmentIds,
  pendingFiles,
  onAddFiles,
  onRemovePendingFile,
  onDeleteExistingAttachment,
}: DocumentHeaderFieldsProps) {
  const t = useTranslations("expenses");
  const { paymentMethods } = useMasterData();
  const { data: vendorsData } = useVendorSuggestions();

  const paymentMethodOptions = paymentMethods.map((pm) => ({
    value: pm.id,
    label: pm.name,
  }));
  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v,
    label: v,
  }));

  const hint =
    type === "SERVICE"
      ? t("accountingMonthHintService")
      : t("accountingMonthHintInventory");

  const currentMonth = dayjs().format("YYYY-MM");
  const showWarning =
    accountingMonth != null && accountingMonth !== currentMonth;

  const visibleExisting = existingAttachments.filter(
    (a) => !deletingAttachmentIds.includes(a.id),
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 mt-3">
        <Form.Item
          name="documentDate"
          label={t("documentDate")}
          rules={[{ required: true }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="accountingMonth"
          label={t("accountingMonth")}
          tooltip={hint}
          rules={[{ required: true }]}
        >
          <DatePicker
            picker="month"
            format="MM/YYYY"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </div>
      {showWarning && (
        <Alert
          type="warning"
          title={t("accountingMonthWarning", { month: accountingMonth })}
          className="mb-4"
        />
      )}
      <Form.Item name="vendorName" label={t("vendor")}>
        <AutoComplete
          options={vendorOptions}
          placeholder={t("vendor")}
          filterOption={(input, option) =>
            (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-4 items-start">
        <SelectField
          name="paymentMethodId"
          label={t("paymentMethod")}
          translateLabel={false}
          options={paymentMethodOptions}
          placeholder={t("paymentMethod")}
          allowClear
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 items-start">
        <Form.Item name="isPaid" label={t("isPaid")} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.isPaid !== curr.isPaid}
        >
          {({ getFieldValue }) =>
            getFieldValue("isPaid") ? (
              <Form.Item
                name="paidAt"
                label={t("paidAt")}
                rules={[{ required: true }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </div>

      <TextField name="referenceNumber" label={"expenses.reference"} />
      <TextAreaField  name="note" label={"expenses.note"} />
      <Form.Item label={t("receiptImage")}>
        <div className="flex flex-col gap-1">
          {visibleExisting.map((a) => (
            <AttachmentRow
              key={a.id}
              name={a.name}
              url={a.url}
              onRemove={() => onDeleteExistingAttachment(a.id)}
            />
          ))}
          {pendingFiles.map((file, idx) => (
            <AttachmentRow
              key={idx}
              name={file.name}
              onRemove={() => onRemovePendingFile(idx)}
            />
          ))}
          <Upload
            showUploadList={false}
            accept="image/*,.pdf"
            multiple
            beforeUpload={(_, fileList) => {
              onAddFiles(fileList as unknown as File[]);
              return false;
            }}
          >
            <Button icon={<IconUpload size={14} />} size="small">
              {t("receiptImageUploadHint")}
            </Button>
          </Upload>
        </div>
      </Form.Item>
    </>
  );
}
