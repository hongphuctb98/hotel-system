"use client";

import { Form, Button, ColorPicker, Switch, App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import type { RoomStatus } from "@/types/master.types";
import { invalidateMasterDataQueries } from "../utils/queryKeys";

interface RoomStatusFormProps {
  initialValues?: RoomStatus | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function RoomStatusForm({
  initialValues,
  onSuccess,
  endpoint,
}: RoomStatusFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const handleSubmit = async (values: Partial<RoomStatus>) => {
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
      <Form.Item name="color" label={t("masterData.color")}>
        <ColorPicker format="hex" />
      </Form.Item>
      <Form.Item name="isSellable" label={t("masterData.isSellable")} valuePropName="checked">
        <Switch />
      </Form.Item>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
