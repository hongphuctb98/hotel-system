"use client";

import { Form, Button, App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import SelectField from "@/common/components/form/SelectField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { useMasterData } from "@/common/hooks/useMasterData";
import { invalidateMasterDataQueries } from "../utils/queryKeys";
import type { Product } from "@/types/master.types";

interface ProductFormProps {
  initialValues?: Product | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function ProductForm({ initialValues, onSuccess, endpoint }: ProductFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();
  const { productCategories } = useMasterData();

  const categoryOptions = productCategories.map((c) => ({ value: c.id, label: c.name }));

  const handleSubmit = async (values: { name: string; sku?: string; unit: string; categoryId?: string }) => {
    try {
      const payload = {
        name: values.name,
        sku: values.sku || null,
        unit: values.unit,
        categoryId: values.categoryId || null,
      };
      if (initialValues?.id) {
        await apiClient.put(`${endpoint}/${initialValues.id}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      await invalidateMasterDataQueries(queryClient, endpoint);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRODUCT_SKU_INACTIVE_EXISTS") {
        const data = err.data as { id: string };
        modal.confirm({
          title: t("products.reactivateTitle"),
          content: t("products.reactivateContent"),
          onOk: async () => {
            await apiClient.put(`${endpoint}/${data.id}`, { isActive: true });
            await invalidateMasterDataQueries(queryClient, endpoint);
            onSuccess();
          },
        });
      } else if (err instanceof ApiError && err.code === "PRODUCT_SKU_TAKEN") {
        form.setFields([{ name: "sku", errors: [t("products.skuTaken")] }]);
      } else {
        throw err;
      }
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues ?? {}} onFinish={handleSubmit}>
      <TextField name="name" label="products.name" rules={[{ required: true }]} placeholder={t("products.namePlaceholder")} />
      <TextField name="sku" label="products.skuOptional" placeholder={t("products.skuPlaceholder")} />
      <TextField name="unit" label="products.unit" rules={[{ required: true }]} placeholder={t("products.unitPlaceholder")} />
      <SelectField
        name="categoryId"
        label="products.category"
        options={categoryOptions}
        placeholder={t("products.categoryPlaceholder")}
        translateLabel={false}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">{t("common.save")}</Button>
      </div>
    </Form>
  );
}
