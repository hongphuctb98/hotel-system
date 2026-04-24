"use client";

import { Form, Button, App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { invalidateMasterDataQueries } from "../utils/queryKeys";
import type { ProductCategory } from "@/types/master.types";

interface ProductCategoryFormProps {
  initialValues?: ProductCategory | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function ProductCategoryForm({ initialValues, onSuccess, endpoint }: ProductCategoryFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();

  const handleSubmit = async (values: { name: string }) => {
    try {
      if (initialValues?.id) {
        await apiClient.put(`${endpoint}/${initialValues.id}`, values);
      } else {
        await apiClient.post(endpoint, values);
      }
      await invalidateMasterDataQueries(queryClient, endpoint);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRODUCT_CATEGORY_INACTIVE_EXISTS") {
        const data = err.data as { id: string };
        modal.confirm({
          title: t("productCategories.reactivateTitle"),
          content: t("productCategories.reactivateContent"),
          onOk: async () => {
            await apiClient.put(`${endpoint}/${data.id}`, { isActive: true });
            await invalidateMasterDataQueries(queryClient, endpoint);
            onSuccess();
          },
        });
      } else if (err instanceof ApiError && err.code === "PRODUCT_CATEGORY_NAME_TAKEN") {
        form.setFields([{ name: "name", errors: [t("productCategories.nameTaken")] }]);
      } else {
        throw err;
      }
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues ?? {}} onFinish={handleSubmit}>
      <TextField
        name="name"
        label="productCategories.name"
        rules={[{ required: true }]}
        placeholder={t("productCategories.namePlaceholder")}
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
