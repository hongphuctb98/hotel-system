"use client";

import { Form, Button, ColorPicker, App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { invalidateMasterDataQueries } from "../utils/queryKeys";

interface SimpleCodeNameFormProps {
  initialValues?: { id?: string; code?: string; name?: string; color?: string } | null;
  onSuccess: () => void;
  endpoint: string;
  showColor?: boolean;
}

export default function SimpleCodeNameForm({
  initialValues,
  onSuccess,
  endpoint,
  showColor = false,
}: SimpleCodeNameFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (initialValues?.id) {
        await apiClient.put(`${endpoint}/${initialValues.id}`, values);
      } else {
        await apiClient.post(endpoint, values);
      }
      await invalidateMasterDataQueries(queryClient, endpoint);
      message.success(t("common.saveSuccess"));
      onSuccess();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : t("common.error"));
    }
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
      {showColor && (
        <Form.Item name="color" label={t("masterData.color")}>
          <ColorPicker format="hex" />
        </Form.Item>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
