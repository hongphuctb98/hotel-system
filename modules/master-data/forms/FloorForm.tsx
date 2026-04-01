"use client";

import { Form, Button } from "antd";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import NumberField from "@/common/components/form/NumberField";
import TextAreaField from "@/common/components/form/TextAreaField";
import { apiClient } from "@/common/services/apiClient";
import type { Floor } from "@/types/master.types";

interface FloorFormProps {
  initialValues?: Floor | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function FloorForm({ initialValues, onSuccess, endpoint }: FloorFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();

  const handleSubmit = async (values: Partial<Floor>) => {
    if (initialValues?.id) {
      await apiClient.put(`${endpoint}/${initialValues.id}`, values);
    } else {
      await apiClient.post(endpoint, values);
    }
    onSuccess();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues ?? {}}
      onFinish={handleSubmit}
    >
      <TextField
        name="code"
        label="masterData.code"
        rules={[{ required: true }]}
      />
      <TextField
        name="name"
        label="masterData.name"
        rules={[{ required: true }]}
      />
      <NumberField name="displayOrder" label="masterData.displayOrder" min={0} />
      <TextAreaField name="note" label="masterData.note" />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
