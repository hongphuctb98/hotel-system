"use client";

import { Form, Button } from "antd";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import CurrencyField from "@/common/components/form/CurrencyField";
import { apiClient } from "@/common/services/apiClient";
import type { ServiceItem } from "@/types/master.types";

interface ServiceItemFormProps {
  initialValues?: ServiceItem | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function ServiceItemForm({
  initialValues,
  onSuccess,
  endpoint,
}: ServiceItemFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();

  const handleSubmit = async (values: Partial<ServiceItem>) => {
    if (initialValues?.id) {
      await apiClient.put(`${endpoint}/${initialValues.id}`, values);
    } else {
      await apiClient.post(endpoint, values);
    }
    onSuccess();
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues ?? {}} onFinish={handleSubmit}>
      <TextField name="code" label="masterData.code" rules={[{ required: true }]} />
      <TextField name="name" label="masterData.name" rules={[{ required: true }]} />
      <CurrencyField name="unitPrice" label="masterData.unitPrice" rules={[{ required: true }]} />
      <TextField name="unit" label="masterData.unit" />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">{t("common.save")}</Button>
      </div>
    </Form>
  );
}
