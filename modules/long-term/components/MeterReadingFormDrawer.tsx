"use client";

import { Form, Button, Select, InputNumber, Row, Col, App } from "antd";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppDrawer from "@/common/components/ui/AppDrawer";
import { useCreateMeterReading, useUpdateMeterReading } from "../hooks/useMeterReadings";
import { useFeeItems } from "../hooks/useFeeItems";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";
import { ApiError } from "@/common/services/apiClient";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";

const round1 = (v: number) => Math.round(v * 10) / 10;

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return { value: `${y}-${m}`, label: `${m}/${y}` };
});

type SummaryReading = {
  id: string;
  feeItemId: string;
  feeItem: { name: string; unit: string | null };
  previousReading: number;
  currentReading: number;
  consumption: number;
};

type SummaryRow = {
  leaseId: string;
  readingMonth: string;
  lease: { id: string; room: { number: string }; guest: { firstName: string; lastName: string } } | null;
  readings: SummaryReading[];
  bill: { status: string } | null;
};

interface MeterReadingFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editRow?: SummaryRow | null;
  leases: { id: string; room: { number: string }; guest: { firstName: string; lastName: string } }[];
}

type RowValue = {
  _readingId?: string;
  feeItemId: string;
  previousReading: number | null;
  currentReading: number | null;
};

// ---------- per-row sub-component so Form.useWatch works correctly ----------

type ReadingRowProps = {
  field: { key: number; name: number };
  isEdit: boolean;
  form: ReturnType<typeof Form.useForm>[0];
  meteredItems: Record<string, unknown>[];
  usedFeeItemIds: Set<unknown>;
  isOnlyRow: boolean;
  onRemove: () => void;
  t: ReturnType<typeof useTranslations>;
};

function ReadingRow({ field, isEdit, form, meteredItems, usedFeeItemIds, isOnlyRow, onRemove, t }: ReadingRowProps) {
  const rowFeeItemId = Form.useWatch(["rows", field.name, "feeItemId"], form);
  const feeItem = meteredItems.find((fi) => fi.id === rowFeeItemId);
  const unit = (feeItem?.unit as string) || "";

  const rowOptions = meteredItems.map((fi) => ({
    value: fi.id as string,
    label: `${fi.name}${fi.unit ? ` (${fi.unit})` : ""}` as string,
    disabled: usedFeeItemIds.has(fi.id as string) && fi.id !== rowFeeItemId,
  }));

  const readCol = isEdit ? 8 : 6;

  return (
    <div className="border border-gray-200 rounded p-3">
      <Row gutter={[8, 0]} align="bottom">
        <Col xs={24} sm={10}>
          <Form.Item
            name={[field.name, "feeItemId"]}
            label={t("longTerm.meterReading.feeItem")}
            rules={[{ required: true, message: t("common.required") }]}
          >
            <Select disabled={isEdit} options={rowOptions} />
          </Form.Item>
        </Col>

        <Col xs={24} sm={readCol}>
          <Form.Item
            name={[field.name, "previousReading"]}
            label={t("longTerm.meterReading.previousReading")}
            rules={[{ required: true, message: t("common.required") }]}
          >
            <InputNumber
              suffix={unit}
              style={{ width: "100%" }}
              step={0.1}
              precision={1}
              formatter={(v) => formatNumberInput(v, {})}
              parser={(v) => parseNumberInput(v)}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={readCol}>
          <Form.Item
            name={[field.name, "currentReading"]}
            label={t("longTerm.meterReading.currentReading")}
            dependencies={[["rows", field.name, "previousReading"]]}
            rules={[
              { required: true, message: t("common.required") },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ({ getFieldValue }: any) => ({
                validator(_: unknown, value: number) {
                  const prev = getFieldValue(["rows", field.name, "previousReading"]);
                  if (value != null && prev != null && value < prev) {
                    return Promise.reject(new Error(t("longTerm.errors.READING_CURRENT_LESS_THAN_PREV")));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber
              suffix={unit}
              style={{ width: "100%" }}
              step={0.1}
              precision={1}
              formatter={(v) => formatNumberInput(v, {})}
              parser={(v) => parseNumberInput(v)}
            />
          </Form.Item>
        </Col>

        {!isEdit && (
          <Col xs={24} sm={2} style={{ paddingBottom: 24 }}>
            <Button
              type="text"
              danger
              block
              icon={<IconTrash size={16} />}
              onClick={onRemove}
              disabled={isOnlyRow}
            />
          </Col>
        )}
      </Row>
    </div>
  );
}

// ---------- main drawer ----------

export default function MeterReadingFormDrawer({ open, onClose, editRow, leases }: MeterReadingFormDrawerProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createReading = useCreateMeterReading();
  const updateReading = useUpdateMeterReading();
  const { data: feeItemData } = useFeeItems({ type: "METERED", showInactive: false });
  const meteredItems = (feeItemData?.data as Record<string, unknown>[]) ?? [];

  const isEdit = !!editRow;
  const isPending = createReading.isPending || updateReading.isPending;

  // Reactive watch for deduplication across rows
  const allRows: RowValue[] = Form.useWatch("rows", form) ?? [];
  const usedFeeItemIds = new Set(allRows.map((r) => r?.feeItemId).filter(Boolean));

  function handleOpen() {
    if (editRow) {
      form.setFieldsValue({
        leaseId: editRow.leaseId,
        readingMonth: editRow.readingMonth,
        rows: editRow.readings.map((r) => ({
          _readingId: r.id,
          feeItemId: r.feeItemId,
          previousReading: round1(r.previousReading),
          currentReading: round1(r.currentReading),
        })),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ rows: [{ feeItemId: undefined, previousReading: null, currentReading: null }] });
    }
  }

  async function handleSubmit(values: { leaseId: string; readingMonth: string; rows: RowValue[] }) {
    const { leaseId, readingMonth, rows } = values;
    const validRows = rows.filter((r) => r.feeItemId && r.previousReading != null && r.currentReading != null);

    if (validRows.length === 0) {
      message.error(t("common.required"));
      return;
    }

    let successCount = 0;
    const errors: string[] = [];

    if (isEdit) {
      for (const row of validRows) {
        if (!row._readingId) continue;
        try {
          await updateReading.mutateAsync({
            id: row._readingId,
            data: {
              previousReading: round1(row.previousReading!),
              currentReading: round1(row.currentReading!),
            },
          });
          successCount++;
        } catch (err) {
          const fi = meteredItems.find((f) => f.id === row.feeItemId);
          errors.push(`${fi?.name ?? row.feeItemId}: ${getLongTermApiErrorMessage(err, t)}`);
        }
      }
    } else {
      for (const row of validRows) {
        try {
          await createReading.mutateAsync({
            leaseId,
            readingMonth,
            feeItemId: row.feeItemId,
            previousReading: round1(row.previousReading!),
            currentReading: round1(row.currentReading!),
          });
          successCount++;
        } catch (err) {
          const fi = meteredItems.find((f) => f.id === row.feeItemId);
          const code = err instanceof ApiError ? err.code : undefined;
          if (code === "READING_DUPLICATE") {
            errors.push(`${fi?.name ?? row.feeItemId}: ${t("longTerm.errors.READING_DUPLICATE")}`);
          } else {
            errors.push(`${fi?.name ?? row.feeItemId}: ${getLongTermApiErrorMessage(err, t)}`);
          }
        }
      }
    }

    if (successCount > 0) {
      message.success(isEdit ? t("longTerm.meterReading.updateSuccess") : t("longTerm.meterReading.createSuccess"));
    }
    if (errors.length > 0) {
      message.error(errors.join(" | "));
    }
    if (successCount > 0) {
      onClose();
      form.resetFields();
    }
  }

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? t("longTerm.meterReading.editTitle") : t("longTerm.meterReading.createTitle")}
      width={680}
      afterOpenChange={(v) => v && handleOpen()}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={isPending} onClick={form.submit}>
            {isEdit ? t("longTerm.meterReading.updateAction") : t("longTerm.meterReading.createAction")}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={16}>
            <Form.Item
              name="leaseId"
              label={t("longTerm.lease.title")}
              rules={[{ required: true, message: t("common.required") }]}
            >
              <Select
                disabled={isEdit}
                showSearch
                filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={leases.map((l) => ({
                  value: l.id,
                  label: `${l.room.number} · ${l.guest.firstName} ${l.guest.lastName}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="readingMonth"
              label={t("longTerm.meterReading.readingMonth")}
              rules={[{ required: true, message: t("common.required") }]}
            >
              <Select disabled={isEdit} options={monthOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Form.List name="rows">
          {(fields, { add, remove }) => (
            <div className="space-y-3">
              {fields.map((field) => (
                <ReadingRow
                  key={field.key}
                  field={field}
                  isEdit={isEdit}
                  form={form}
                  meteredItems={meteredItems}
                  usedFeeItemIds={usedFeeItemIds}
                  isOnlyRow={fields.length === 1}
                  onRemove={() => remove(field.name)}
                  t={t}
                />
              ))}

              {!isEdit && (
                <Button
                  type="dashed"
                  icon={<IconPlus size={14} />}
                  onClick={() => add({ feeItemId: undefined, previousReading: null, currentReading: null })}
                  disabled={fields.length >= meteredItems.length}
                  block
                >
                  {t("longTerm.meterReading.addRow")}
                </Button>
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </AppDrawer>
  );
}
