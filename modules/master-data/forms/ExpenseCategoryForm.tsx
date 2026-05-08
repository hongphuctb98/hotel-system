"use client";

import { Form, Button, App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { invalidateMasterDataQueries } from "../utils/queryKeys";
import type { ExpenseCategory } from "@/types/master.types";

interface ExpenseCategoryFormProps {
  initialValues?: ExpenseCategory | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function ExpenseCategoryForm({ initialValues, onSuccess, endpoint }: ExpenseCategoryFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();

  const handleSubmit = async (values: { name: string; description?: string }) => {
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
      if (err instanceof ApiError && err.code === "EXPENSE_CATEGORY_INACTIVE_EXISTS") {
        const data = err.data as { id: string };
        modal.confirm({
          title: t("expenseCategories.reactivateTitle"),
          content: t("expenseCategories.reactivateContent"),
          onOk: async () => {
            await apiClient.put(`${endpoint}/${data.id}`, { isActive: true });
            await invalidateMasterDataQueries(queryClient, endpoint);
            message.success(t("common.saveSuccess"));
            onSuccess();
          },
        });
      } else if (err instanceof ApiError && err.code === "EXPENSE_CATEGORY_NAME_TAKEN") {
        form.setFields([{ name: "name", errors: [t("expenseCategories.nameTaken")] }]);
      } else {
        message.error(err instanceof ApiError ? err.message : t("common.error"));
      }
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues ?? {}} onFinish={handleSubmit}>
      <TextField
        name="name"
        label="expenseCategories.name"
        rules={[{ required: true }]}
        placeholder={t("expenseCategories.namePlaceholder")}
      />
      <TextField
        name="description"
        label="expenseCategories.description"
        placeholder={t("expenseCategories.descriptionPlaceholder")}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
