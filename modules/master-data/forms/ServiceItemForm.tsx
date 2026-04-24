"use client";

import { Form, Button, Typography } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import TextField from "@/common/components/form/TextField";
import CurrencyField from "@/common/components/form/CurrencyField";
import SelectField from "@/common/components/form/SelectField";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { ServiceItem } from "@/types/master.types";
import { invalidateMasterDataQueries } from "../utils/queryKeys";

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
  const queryClient = useQueryClient();
  const { products } = useMasterData();

  const linkedProductId = Form.useWatch("linkedProductId", form);
  const linkedProduct = products.find((p) => p.id === linkedProductId);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.sku ? `${p.name} (${p.sku})` : p.name,
  }));

  const handleSubmit = async (values: Partial<ServiceItem & { linkedProductId: string }>) => {
    try {
      const payload = { ...values, linkedProductId: values.linkedProductId || null };
      if (initialValues?.id) {
        await apiClient.put(`${endpoint}/${initialValues.id}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      await invalidateMasterDataQueries(queryClient, endpoint);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRODUCT_ALREADY_LINKED") {
        form.setFields([{ name: "linkedProductId", errors: [t("products.serviceItemAlreadyLinked")] }]);
      } else {
        throw err;
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ ...initialValues, linkedProductId: initialValues?.linkedProduct?.id ?? initialValues?.linkedProductId }}
      onFinish={handleSubmit}
    >
      <TextField name="code" label="masterData.code" rules={[{ required: true }]} />
      <TextField name="name" label="masterData.name" rules={[{ required: true }]} />
      <CurrencyField name="unitPrice" label="masterData.unitPrice" rules={[{ required: true }]} />
      <TextField name="unit" label="masterData.unit" />
      <SelectField
        name="linkedProductId"
        label="products.linkedService"
        options={productOptions}
        placeholder={t("products.linkedServicePlaceholder")}
        translateLabel={false}
      />
      {linkedProduct?.inventory && (
        <Typography.Text type="secondary" className="block -mt-3 mb-3 text-xs">
          {t("products.linkedServiceHint", {
            quantity: linkedProduct.inventory.quantity,
            unit: linkedProduct.unit,
          })}
        </Typography.Text>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">{t("common.save")}</Button>
      </div>
    </Form>
  );
}
