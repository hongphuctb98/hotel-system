"use client";

import { Form, Button, Input, DatePicker, InputNumber, Space, App, Row, Col, Typography } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppDrawer from "@/common/components/ui/AppDrawer";
import { useCreateRatePlan, useUpdateRatePlan } from "../hooks/useRatePlans";
import { useFeeItems } from "../hooks/useFeeItems";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

const UNIT_STYLE: React.CSSProperties = { width: "auto", minWidth: 72, textAlign: "center", cursor: "default" };

interface RatePlanFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editPlan?: Record<string, unknown> | null;
}

export default function RatePlanFormDrawer({ open, onClose, editPlan }: RatePlanFormDrawerProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createPlan = useCreateRatePlan();
  const updatePlan = useUpdateRatePlan();
  const { data: feeItemData } = useFeeItems({ showInactive: false });
  const allFeeItems = (feeItemData?.data as Record<string, unknown>[]) ?? [];

  const isEdit = !!editPlan;
  const isPending = createPlan.isPending || updatePlan.isPending;

  function handleOpen() {
    if (editPlan) {
      const planItems = (editPlan.items as Record<string, unknown>[]) ?? [];
      const itemPrices: Record<string, number> = {};
      for (const pi of planItems) {
        itemPrices[`price_${pi.feeItemId}`] = pi.unitPrice as number;
      }
      form.setFieldsValue({
        label: editPlan.label,
        effectiveFrom: dayjs(editPlan.effectiveFrom as string),
        ...itemPrices,
      });
    } else {
      form.resetFields();
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      const items = allFeeItems
        .filter((fi) => values[`price_${fi.id}`] != null && values[`price_${fi.id}`] !== "")
        .map((fi) => ({ feeItemId: fi.id, unitPrice: Number(values[`price_${fi.id}`]) }));

      const payload = {
        label: values.label,
        effectiveFrom: (values.effectiveFrom as dayjs.Dayjs).toISOString(),
        items,
      };

      if (isEdit) {
        await updatePlan.mutateAsync({ id: editPlan!.id as string, data: payload });
        message.success(t("longTerm.ratePlan.updateSuccess"));
      } else {
        await createPlan.mutateAsync(payload);
        message.success(t("longTerm.ratePlan.createSuccess"));
      }
      onClose();
      form.resetFields();
    } catch (err) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? t("longTerm.ratePlan.editTitle") : t("longTerm.ratePlan.createTitle")}
      width={480}
      afterOpenChange={(v) => v && handleOpen()}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={isPending} onClick={form.submit}>
            {isEdit ? t("longTerm.ratePlan.updateAction") : t("longTerm.ratePlan.createAction")}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={14}>
            <Form.Item name="label" label={t("longTerm.ratePlan.label")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name="effectiveFrom" label={t("longTerm.ratePlan.effectiveFrom")} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
          {t("longTerm.ratePlan.items")}
        </Typography.Text>

        {allFeeItems.map((fi) => (
          <Form.Item key={fi.id as string} label={`${fi.name} (${fi.unit || "—"})`}>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item name={`price_${fi.id}`} noStyle>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="—"
                  formatter={(v) => formatNumberInput(v, {})}
                  parser={(v) => parseNumberInput(v) as unknown as 0}
                />
              </Form.Item>
              <Input readOnly value="VND" style={UNIT_STYLE} tabIndex={-1} />
            </Space.Compact>
          </Form.Item>
        ))}
      </Form>
    </AppDrawer>
  );
}
