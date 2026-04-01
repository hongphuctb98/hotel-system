"use client";

import { Form, Button } from "antd";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import NumberField from "@/common/components/form/NumberField";
import CurrencyField from "@/common/components/form/CurrencyField";
import TextAreaField from "@/common/components/form/TextAreaField";
import { apiClient } from "@/common/services/apiClient";
import type { RoomType } from "@/types/master.types";

interface RoomTypeFormProps {
  initialValues?: RoomType | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function RoomTypeForm({
  initialValues,
  onSuccess,
  endpoint,
}: RoomTypeFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();

  const handleSubmit = async (values: Partial<RoomType>) => {
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
      <TextField name="code" label="masterData.code" rules={[{ required: true }]} />
      <TextField name="name" label="masterData.name" rules={[{ required: true }]} />
      <NumberField name="capacity" label="masterData.capacity" min={1} />
      <CurrencyField name="defaultPrice" label="masterData.defaultPrice" rules={[{ required: true }]} />
      <TextAreaField name="description" label="masterData.description" />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
